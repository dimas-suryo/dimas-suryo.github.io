"""Tests for the one-request probe."""
from __future__ import annotations

import datetime as dt
import io
import json

import pytest

from tools.investability_monitor.idx_client import IdxClient
from tools.investability_monitor.probe import last_weekday_before, main

from .fakes import CHALLENGE_HTML, TODAY, FakeResponse, FakeSession, summary_payload, summary_row


def run(session: FakeSession, argv: list[str] | None = None) -> tuple[int, dict]:
    out = io.StringIO()
    code = main(
        argv or [],
        client_factory=lambda: IdxClient(cache_dir=None, max_requests=1, min_interval_s=0, session=session),
        out=out,
        today=lambda: TODAY,
    )
    return code, json.loads(out.getvalue())


@pytest.fixture(autouse=True)
def _local(monkeypatch):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)


def test_data_came_back():
    session = FakeSession(FakeResponse(200, summary_payload()))
    code, result = run(session)
    assert code == 0
    assert result["status"] == "ok" and result["rows"] == 2 and result["http_status"] == 200
    assert result["where"] == "local"


def test_default_date_is_last_weekday():
    session = FakeSession(FakeResponse(200, summary_payload()))
    _, result = run(session)
    assert result["date"] == "2026-11-06"  # TODAY is a Monday
    assert session.calls[0]["params"]["date"] == "20261106"


def test_explicit_date():
    day = dt.date(2026, 11, 4)
    session = FakeSession(FakeResponse(200, summary_payload([summary_row(day=day)])))
    code, result = run(session, ["--date", "2026-11-04"])
    assert code == 0 and result["date"] == "2026-11-04"


def test_refused_exits_2():
    code, result = run(FakeSession(FakeResponse(403, text=CHALLENGE_HTML)))
    assert code == 2
    assert result["status"] == "blocked" and result["http_status"] == 403
    assert "challenge" in result["detail"].lower()


def test_other_failure_exits_1():
    code, result = run(FakeSession(FakeResponse(404, text="Not Found")))
    assert code == 1 and result["status"] == "error"


def test_announcements_endpoint():
    payload = {"ResultCount": 0, "SearchParams": {}, "Replies": []}
    session = FakeSession(FakeResponse(200, payload))
    code, result = run(session, ["--endpoint", "announcements"])
    assert code == 0 and result["rows"] == 0
    assert session.calls[0]["params"]["keyword"] == "KSEI"


def test_writes_step_summary(tmp_path, monkeypatch):
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    code, result = run(FakeSession(FakeResponse(200, summary_payload())))
    text = summary.read_text(encoding="utf-8")
    assert code == 0 and result["where"] == "github-actions"
    assert "### IDX probe" in text and "| ok |" in text


def test_rejects_bad_date():
    with pytest.raises(SystemExit):
        run(FakeSession(), ["--date", "06/11/2026"])


@pytest.mark.parametrize(
    "today, expected",
    [
        (dt.date(2026, 11, 9), dt.date(2026, 11, 6)),  # Monday -> Friday
        (dt.date(2026, 11, 8), dt.date(2026, 11, 6)),  # Sunday -> Friday
        (dt.date(2026, 11, 11), dt.date(2026, 11, 10)),  # Wednesday -> Tuesday
    ],
)
def test_last_weekday_before(today, expected):
    assert last_weekday_before(today) == expected
