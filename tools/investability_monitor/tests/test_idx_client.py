"""Tests for the IDX client. No network: every response comes from a fake session."""
from __future__ import annotations

import datetime as dt

import pandas as pd
import pytest

from tools.investability_monitor.idx_client import (
    ANNOUNCEMENT_PATH,
    RETRY_BACKOFF_S,
    STOCK_SUMMARY_PATH,
    SUMMARY_FIELDS,
    USER_AGENT,
    BlockedError,
    BudgetExceededError,
    ChallengeError,
    IdxClient,
    RateLimitedError,
    SchemaError,
    UnexpectedResponseError,
    parse_announcements,
    parse_stock_summary,
)

from .fakes import (
    CHALLENGE_HTML,
    DAY,
    TODAY,
    FakeClock,
    FakeResponse,
    FakeSession,
    announcement_payload,
    announcement_reply,
    summary_payload,
    summary_row,
)


def make_client(session: FakeSession, cache_dir=None, **kw) -> tuple[IdxClient, FakeClock]:
    clock = FakeClock()
    kw.setdefault("min_interval_s", 30.0)
    client = IdxClient(cache_dir, session=session, clock=clock, sleep=clock.sleep, today=lambda: TODAY, **kw)
    return client, clock


def ok(payload=None) -> FakeResponse:
    return FakeResponse(200, payload if payload is not None else summary_payload())


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


class TestParseStockSummary:
    def test_columns_types_and_order(self):
        df = parse_stock_summary(summary_payload(), DAY)
        assert list(df.columns) == list(SUMMARY_FIELDS.values())
        assert list(df["code"]) == ["AAAA", "BBBB"]  # sorted by code
        assert (df["date"] == pd.Timestamp(DAY)).all()
        assert df["tradable_shares"].dtype == float  # from IDX's "TradebleShares"
        assert df.loc[1, "close"] == 50.0 and df.loc[1, "prev_close"] == 54.0
        assert df.loc[0, "index_shares"] == 2_000_000_000.0

    def test_remarks_kept_verbatim(self):
        raw = " -X--P------"
        df = parse_stock_summary(summary_payload([summary_row(Remarks=raw)]), DAY)
        assert df.loc[0, "remarks"] == raw

    def test_missing_field_fails_loudly(self):
        row = summary_row("CCCC")
        del row["WeightForIndex"]
        with pytest.raises(SchemaError, match="WeightForIndex"):
            parse_stock_summary(summary_payload([summary_row(), row]), DAY)

    def test_truncated_payload_fails(self):
        with pytest.raises(SchemaError, match="paging"):
            parse_stock_summary(summary_payload(total=5), DAY)

    def test_rows_for_another_day_fail(self):
        rows = [summary_row(day=DAY - dt.timedelta(days=1))]
        with pytest.raises(SchemaError, match="2026-11-05"):
            parse_stock_summary(summary_payload(rows), DAY)

    def test_duplicate_codes_fail(self):
        with pytest.raises(SchemaError, match="duplicate"):
            parse_stock_summary(summary_payload([summary_row("AAAA"), summary_row("AAAA")]), DAY)

    def test_empty_day_gives_empty_frame_with_columns(self):
        df = parse_stock_summary(summary_payload([]), DAY)
        assert df.empty and list(df.columns) == list(SUMMARY_FIELDS.values())

    @pytest.mark.parametrize("payload", [None, [], {"rows": []}, {"data": None}])
    def test_not_a_summary(self, payload):
        with pytest.raises(SchemaError):
            parse_stock_summary(payload, DAY)


class TestParseAnnouncements:
    def test_fields(self):
        payload = announcement_payload([announcement_reply(), announcement_reply(issuer="BBCA ", attachments=0)])
        a, b = parse_announcements(payload)
        assert a.published == dt.datetime(2026, 6, 2, 11, 50, 22)
        assert a.title == "Pemegang Saham di atas 1% (KSEI)"
        assert a.issuer == ""  # "Semua Emiten Saham" means all issuers
        assert [x.url.rsplit("/", 1)[-1] for x in a.attachments] == ["0000.pdf", "0001.pdf"]
        assert b.issuer == "BBCA" and b.attachments == ()

    def test_bad_payload(self):
        with pytest.raises(SchemaError):
            parse_announcements({"ResultCount": 0})
        with pytest.raises(SchemaError, match="date or title"):
            parse_announcements(announcement_payload([{"pengumuman": {"JudulPengumuman": "x"}}]))


# ---------------------------------------------------------------------------
# Fetching and caching
# ---------------------------------------------------------------------------


class TestStockSummaryFetching:
    def test_request_shape(self):
        session = FakeSession(ok())
        client, _ = make_client(session)
        client.stock_summary(DAY)
        (call,) = session.calls
        assert call["url"].endswith(STOCK_SUMMARY_PATH)
        assert call["params"]["date"] == "20261106"
        assert call["params"]["length"] >= 2000  # about 960 stocks in 2026, one page
        assert call["headers"]["User-Agent"] == USER_AGENT

    def test_cache_round_trip(self, tmp_path):
        client, _ = make_client(FakeSession(ok()), tmp_path)
        first = client.stock_summary(DAY)
        assert (tmp_path / "stock-summary" / "2026" / "2026-11-06.json.gz").exists()

        offline, _ = make_client(FakeSession(), tmp_path)  # any request would fail the test
        pd.testing.assert_frame_equal(offline.stock_summary(DAY), first)
        assert offline.requests_made == 0

    def test_cache_file_is_deterministic(self, tmp_path):
        a, b = tmp_path / "a", tmp_path / "b"
        make_client(FakeSession(ok()), a)[0].stock_summary(DAY)
        make_client(FakeSession(ok()), b)[0].stock_summary(DAY)
        rel = "stock-summary/2026/2026-11-06.json.gz"
        assert (a / rel).read_bytes() == (b / rel).read_bytes()

    def test_empty_past_day_is_cached(self, tmp_path):
        client, _ = make_client(FakeSession(ok(summary_payload([]))), tmp_path)
        assert client.stock_summary(DAY).empty
        assert (tmp_path / "stock-summary" / "2026" / "2026-11-06.json.gz").exists()

    def test_empty_today_is_not_cached(self, tmp_path):
        client, _ = make_client(FakeSession(ok(summary_payload([]))), tmp_path)
        assert client.stock_summary(TODAY).empty
        assert not (tmp_path / "stock-summary" / "2026" / "2026-11-09.json.gz").exists()

    def test_invalid_payload_is_not_cached(self, tmp_path):
        bad = summary_row()
        del bad["Close"]
        client, _ = make_client(FakeSession(ok(summary_payload([bad]))), tmp_path)
        with pytest.raises(SchemaError):
            client.stock_summary(DAY)
        assert not list(tmp_path.rglob("*.json.gz"))


class TestAnnouncementPaging:
    def test_stops_at_result_count(self):
        page1 = announcement_payload([announcement_reply(), announcement_reply()], total=3)
        page2 = announcement_payload([announcement_reply()], total=3)
        session = FakeSession(ok(page1), ok(page2))
        client, _ = make_client(session)
        got = client.announcements("KSEI", dt.date(2026, 1, 1), DAY, page_size=2, max_pages=5)
        assert len(got) == 3
        assert [c["params"]["indexFrom"] for c in session.calls] == [0, 2]
        assert all(c["url"].endswith(ANNOUNCEMENT_PATH) for c in session.calls)
        assert session.calls[0]["params"]["dateFrom"] == "20260101"

    def test_respects_max_pages(self):
        page = announcement_payload([announcement_reply()], total=100)
        session = FakeSession(ok(page), ok(page))
        client, _ = make_client(session)
        assert len(client.announcements("KSEI", DAY, DAY, page_size=1, max_pages=2)) == 2
        assert len(session.calls) == 2


# ---------------------------------------------------------------------------
# Politeness: spacing, budget, honest identification
# ---------------------------------------------------------------------------


class TestPoliteness:
    def test_requests_are_spaced(self):
        client, clock = make_client(FakeSession(ok(), ok(summary_payload([summary_row(day=DAY - dt.timedelta(days=1))]))))
        client.stock_summary(DAY)
        client.stock_summary(DAY - dt.timedelta(days=1))
        assert clock.sleeps == [30.0]

    def test_no_wait_when_enough_time_passed(self):
        client, clock = make_client(FakeSession(ok(), ok(summary_payload([summary_row(day=DAY - dt.timedelta(days=1))]))))
        client.stock_summary(DAY)
        clock.t += 31
        client.stock_summary(DAY - dt.timedelta(days=1))
        assert clock.sleeps == []

    def test_budget_is_hard(self):
        session = FakeSession(ok(), ok())
        client, _ = make_client(session, max_requests=1)
        client.stock_summary(DAY)
        with pytest.raises(BudgetExceededError):
            client.stock_summary(DAY - dt.timedelta(days=1))
        assert len(session.calls) == 1

    def test_user_agent_is_honest(self):
        # The ground rules forbid browser impersonation. This pins it.
        assert "Mozilla" not in USER_AGENT and "Chrome" not in USER_AGENT
        assert "dimassuryo.com" in USER_AGENT


# ---------------------------------------------------------------------------
# Refusals and errors
# ---------------------------------------------------------------------------


class TestRefusals:
    def test_challenge_page_stops_without_retry(self):
        session = FakeSession(FakeResponse(403, text=CHALLENGE_HTML))
        client, clock = make_client(session)
        with pytest.raises(ChallengeError):
            client.stock_summary(DAY)
        assert len(session.calls) == 1 and clock.sleeps == []

    def test_challenge_served_with_200(self):
        client, _ = make_client(FakeSession(FakeResponse(200, text=CHALLENGE_HTML)))
        with pytest.raises(ChallengeError):
            client.stock_summary(DAY)

    def test_cf_mitigated_header(self):
        client, _ = make_client(FakeSession(FakeResponse(403, text="", headers={"cf-mitigated": "challenge"})))
        with pytest.raises(ChallengeError, match="cf-mitigated"):
            client.stock_summary(DAY)

    def test_rate_limit(self):
        client, _ = make_client(FakeSession(FakeResponse(429, text="slow down")))
        with pytest.raises(RateLimitedError):
            client.stock_summary(DAY)

    def test_bare_403_is_blocked_but_not_a_challenge(self):
        client, _ = make_client(FakeSession(FakeResponse(403, text="Forbidden")))
        with pytest.raises(BlockedError) as e:
            client.stock_summary(DAY)
        assert not isinstance(e.value, ChallengeError)

    def test_no_more_requests_after_a_refusal(self):
        session = FakeSession(FakeResponse(403, text=CHALLENGE_HTML), ok())
        client, _ = make_client(session)
        with pytest.raises(ChallengeError):
            client.stock_summary(DAY)
        with pytest.raises(BlockedError, match="refused earlier"):
            client.announcements("KSEI", DAY, DAY)
        assert len(session.calls) == 1

    def test_server_error_is_retried_after_backoff(self):
        session = FakeSession(FakeResponse(503, text="Service Unavailable"), ok())
        client, clock = make_client(session)
        assert len(client.stock_summary(DAY)) == 2
        assert clock.sleeps == [RETRY_BACKOFF_S[0]]  # the backoff already covers the spacing
        assert len(session.calls) == 2

    def test_network_error_is_retried(self):
        session = FakeSession(ConnectionError("reset by peer"), ok())
        client, clock = make_client(session)
        assert len(client.stock_summary(DAY)) == 2
        assert clock.sleeps == [RETRY_BACKOFF_S[0]]

    def test_gives_up_after_retries(self):
        session = FakeSession(*(FakeResponse(502, text="Bad Gateway") for _ in range(3)))
        client, clock = make_client(session)
        with pytest.raises(UnexpectedResponseError, match="502"):
            client.stock_summary(DAY)
        assert clock.sleeps == list(RETRY_BACKOFF_S)
        assert len(session.calls) == 3

    def test_retries_count_against_the_budget(self):
        session = FakeSession(FakeResponse(503, text="x"), FakeResponse(503, text="x"))
        client, _ = make_client(session, max_requests=2)
        with pytest.raises(BudgetExceededError):
            client.stock_summary(DAY)
        assert len(session.calls) == 2

    def test_200_that_is_not_json(self):
        client, _ = make_client(FakeSession(FakeResponse(200, text="<html>maintenance</html>")))
        with pytest.raises(UnexpectedResponseError, match="not JSON"):
            client.stock_summary(DAY)

    def test_other_status(self):
        client, _ = make_client(FakeSession(FakeResponse(404, text="Not Found")))
        with pytest.raises(UnexpectedResponseError, match="404"):
            client.stock_summary(DAY)
