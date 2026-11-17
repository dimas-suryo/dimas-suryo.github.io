"""Tests for the DJPPR client: parsing, politeness and refusal handling. All offline."""
from __future__ import annotations

import hashlib
import json

import pytest

from tools.sbn_ledger.djppr import (
    API_BASE,
    USER_AGENT,
    BlockedError,
    BudgetExceededError,
    ChallengeError,
    DjpprClient,
    RateLimitedError,
    SchemaError,
    UnexpectedResponseError,
    blocked_reason,
    file_kind,
    parse_entries,
)

from .fakes import (
    CHALLENGE_HTML,
    GUID_A,
    GUID_B,
    PDF_BYTES,
    REJECTED_HTML,
    XLSX_BYTES,
    FakeClock,
    FakeResponse,
    FakeSession,
    announcement_row,
    file_response,
    file_row,
    html_response,
    page_payload,
    page_response,
)


def client(session: FakeSession, clock: FakeClock | None = None, **kw) -> DjpprClient:
    clock = clock or FakeClock()
    return DjpprClient(session=session, clock=clock, sleep=clock.sleep, **kw)


class TestParseEntries:
    def test_file_list_in_page_order(self):
        entries = parse_entries(page_payload())
        assert [e.guid for e in entries] == [GUID_A, GUID_B]
        assert entries[0].title == "Ringkasan Hasil Penerbitan SBN Tahun 2026"
        assert entries[0].description == "s.d. Juli 2026"
        assert entries[0].date == "" and entries[0].slug is None

    def test_announcements_carry_a_slug_whatever_the_key_order(self):
        rows = [announcement_row("Hasil Lelang Surat Utang Negara", "10 November 2026", "/hasillelang,tanggal10november2026")]
        (e,) = parse_entries(page_payload(rows))
        assert e.slug == "hasillelang,tanggal10november2026" and e.guid is None
        assert e.date == "10 November 2026" and e.description == ""

    def test_guid_is_upper_cased(self):
        (e,) = parse_entries(page_payload([file_row("t", "d", GUID_A.lower())]))
        assert e.guid == GUID_A

    def test_rows_without_a_usable_link_are_skipped(self):
        rows = [
            {"@judul": "no link"},
            {"@judul": "placeholder", "@link": "#"},
            {"@judul": "blank", "@link": "  "},
            file_row("kept", "", GUID_A),
        ]
        assert [e.title for e in parse_entries(page_payload(rows))] == ["kept"]

    def test_a_link_to_another_site_is_neither_file_nor_slug(self):
        (e,) = parse_entries(page_payload([{"@judul": "elsewhere", "@link": "//example.org/x"}]))
        assert e.guid is None and e.slug is None

    def test_page_without_lists_gives_nothing(self):
        assert parse_entries(page_payload([])) == []

    @pytest.mark.parametrize(
        "payload",
        [
            None,
            [],
            {"Data": None},
            {"Data": {"PageContentLive": None}},
            {"Data": {"PageContentLive": "   "}},
            {"Data": {"PageContentLive": "{not json"}},
        ],
    )
    def test_surprises_raise_schema_error(self, payload):
        with pytest.raises(SchemaError):
            parse_entries(payload)


class TestRequests:
    def test_page_request_is_what_the_site_itself_sends(self):
        session = FakeSession(page_response())
        entries = client(session).entries("ringkasanhasilpenerbitan")
        assert len(entries) == 2
        call = session.calls[0]
        assert call["url"] == API_BASE + "/page"
        assert call["params"] == {"url": "ringkasanhasilpenerbitan"}
        assert call["headers"]["User-Agent"] == USER_AGENT

    def test_slug_from_a_site_path_is_accepted(self):
        session = FakeSession(page_response())
        client(session).page("/hasillelang,tanggal10november2026")
        assert session.calls[0]["params"] == {"url": "hasillelang,tanggal10november2026"}

    @pytest.mark.parametrize("slug", ["", "  ", "a b", "a/b", "https://example.org/x"])
    def test_bad_slug_never_reaches_the_network(self, slug):
        session = FakeSession()
        with pytest.raises(ValueError):
            client(session).page(slug)
        assert session.calls == []

    def test_requests_are_spaced(self):
        clock = FakeClock()
        c = client(FakeSession(page_response(), page_response(), page_response()), clock, min_interval_s=3.0)
        c.page("a")
        c.page("b")
        clock.t += 10  # time passed on its own: no wait needed
        c.page("c")
        assert clock.sleeps == [3.0]

    def test_budget_is_enforced_before_asking(self):
        session = FakeSession(page_response(), page_response())
        c = client(session, max_requests=2)
        c.page("a")
        c.page("b")
        with pytest.raises(BudgetExceededError):
            c.page("c")
        assert len(session.calls) == 2 and c.requests_made == 2

    def test_no_retry_on_a_network_error(self):
        session = FakeSession(ConnectionError("reset"))
        with pytest.raises(UnexpectedResponseError, match="network error"):
            client(session).page("a")
        assert len(session.calls) == 1

    def test_other_status_is_an_error_not_a_refusal(self):
        c = client(FakeSession(FakeResponse(500, text="oops"), page_response()))
        with pytest.raises(UnexpectedResponseError, match="HTTP 500"):
            c.page("a")
        assert c.last_status == 500
        c.page("b")  # an error does not end the run; a refusal does

    def test_200_that_is_not_json(self):
        with pytest.raises(UnexpectedResponseError, match="not JSON"):
            client(FakeSession(FakeResponse(200, text="<html></html>"))).page("a")

    def test_unknown_slug_envelope(self):
        resp = FakeResponse(200, {"Data": None, "StatusCode": 404, "Message": "not found"})
        with pytest.raises(SchemaError):
            client(FakeSession(resp)).page("nosuchpage")

    def test_user_agent_is_honest(self):
        # The ground rules forbid browser impersonation. This pins it.
        assert "Mozilla" not in USER_AGENT and "Chrome" not in USER_AGENT
        assert "dimassuryo.com" in USER_AGENT


class TestRefusals:
    @pytest.mark.parametrize(
        "resp, kind",
        [
            (html_response(403, CHALLENGE_HTML), ChallengeError),
            (html_response(403, "", {"cf-mitigated": "challenge"}), ChallengeError),
            (html_response(200, REJECTED_HTML), ChallengeError),  # firewall pages arrive with 200
            (FakeResponse(429, text="slow down"), RateLimitedError),
            (FakeResponse(403, text="Forbidden"), BlockedError),
        ],
    )
    def test_refusal_is_recognised(self, resp, kind):
        assert type(blocked_reason(resp)) is kind

    def test_data_is_not_a_refusal(self):
        assert blocked_reason(page_response()) is None
        assert blocked_reason(file_response()) is None

    def test_a_file_that_mentions_a_marker_is_still_a_file(self):
        # Refusal pages are HTML. A PDF's bytes are never searched for markers.
        resp = file_response(content=PDF_BYTES + b"<title>Request Rejected</title>")
        assert blocked_reason(resp) is None

    def test_header_lookup_ignores_case(self):
        resp = FakeResponse(200, text=REJECTED_HTML, headers={"content-type": "TEXT/HTML; charset=utf-8"})
        assert isinstance(blocked_reason(resp), ChallengeError)

    def test_first_refusal_ends_the_run(self):
        session = FakeSession(html_response(403, CHALLENGE_HTML), page_response())
        c = client(session)
        with pytest.raises(ChallengeError):
            c.page("a")
        with pytest.raises(BlockedError, match="not asking again"):
            c.page("b")
        with pytest.raises(BlockedError, match="not asking again"):
            c.media(GUID_A)
        assert len(session.calls) == 1  # the queued good answer was never asked for


class TestMedia:
    def test_file_comes_back_with_hash_name_and_kind(self):
        session = FakeSession(file_response(PDF_BYTES, "SBN Ownership Daily 2026_November 10.pdf"))
        c = client(session)
        f = c.media(GUID_A.lower())
        assert session.calls[0]["url"] == f"{API_BASE}/media/{GUID_A}"
        assert f.guid == GUID_A and f.kind == "pdf" and f.content == PDF_BYTES
        assert f.sha256 == hashlib.sha256(PDF_BYTES).hexdigest()
        assert f.filename == "SBN Ownership Daily 2026_November 10.pdf"
        assert f.content_type == "application/pdf" and c.last_bytes == len(PDF_BYTES)

    def test_unquoted_filename(self):
        resp = FakeResponse(
            200,
            content=XLSX_BYTES,
            headers={"Content-Type": "application/octet-stream", "Content-Disposition": "inline; filename=Realisasi_2026_vf.xlsx"},
        )
        f = client(FakeSession(resp)).media(GUID_B)
        assert f.filename == "Realisasi_2026_vf.xlsx" and f.kind == "xlsx"

    def test_missing_content_disposition(self):
        f = client(FakeSession(FakeResponse(200, content=PDF_BYTES, headers={}))).media(GUID_A)
        assert f.filename == "" and f.kind == "pdf"

    def test_kind_comes_from_the_bytes_not_the_label(self):
        # A page served with a PDF content type is still not a PDF.
        f = client(FakeSession(file_response(content=b"<html>maintenance</html>"))).media(GUID_A)
        assert f.kind == "unknown"

    @pytest.mark.parametrize("content, kind", [(PDF_BYTES, "pdf"), (XLSX_BYTES, "xlsx"), (b"\xd0\xcf\x11\xe0\xa1", "xls"), (b"", "unknown")])
    def test_file_kind(self, content, kind):
        assert file_kind(content) == kind

    def test_empty_file_is_an_error(self):
        with pytest.raises(UnexpectedResponseError, match="empty file"):
            client(FakeSession(FakeResponse(200, content=b"", headers={"Content-Type": "application/pdf"}))).media(GUID_A)

    @pytest.mark.parametrize("guid", ["", "not-a-guid", GUID_A + "/../x", f"{GUID_A}?x=1", None])
    def test_bad_guid_never_reaches_the_network(self, guid):
        session = FakeSession()
        with pytest.raises(ValueError):
            client(session).media(guid)
        assert session.calls == []


def test_fixture_matches_the_real_envelope():
    """The synthetic page keeps the two properties the parser relies on."""
    p = page_payload()
    assert set(p) >= {"Data", "StatusCode"} and isinstance(p["Data"]["PageContentLive"], str)
    assert json.loads(p["Data"]["PageContentLive"])[0]["widgetType"] == "section"
