"""Tests for the three-request probe."""
from __future__ import annotations

import io
import json

import pytest

from tools.sbn_ledger.djppr import API_BASE, DjpprClient
from tools.sbn_ledger.probe import ISSUANCE_SLUG, OWNERSHIP_SLUG, STEPS, main

from .fakes import (
    CHALLENGE_HTML,
    GUID_A,
    GUID_B,
    FakeClock,
    FakeResponse,
    FakeSession,
    announcement_row,
    file_response,
    file_row,
    html_response,
    page_response,
)

OWNERSHIP_ROWS = [file_row("Kepemilikan SBN Domestik 2026", "Data Harian s.d. 10 November 2026", GUID_B)]


def run(session: FakeSession) -> tuple[int, dict]:
    out = io.StringIO()
    clock = FakeClock()
    code = main(
        [],
        client_factory=lambda: DjpprClient(session=session, max_requests=len(STEPS), clock=clock, sleep=clock.sleep),
        out=out,
    )
    return code, json.loads(out.getvalue())


@pytest.fixture(autouse=True)
def _local(monkeypatch):
    monkeypatch.delenv("GITHUB_STEP_SUMMARY", raising=False)
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)


def test_all_three_answered():
    session = FakeSession(page_response(), file_response(), page_response(OWNERSHIP_ROWS))
    code, result = run(session)
    assert code == 0 and result["status"] == "ok" and result["requests"] == 3
    assert result["where"] == "local"
    assert [s["status"] for s in result["steps"]] == ["ok", "ok", "ok"]
    assert [s["step"] for s in result["steps"]] == list(STEPS)
    assert "2 files" in result["steps"][0]["detail"]
    assert result["steps"][1]["detail"].startswith("pdf, sha256 ")
    assert "10 November 2026" in result["steps"][2]["detail"]
    assert all(s["http_status"] == 200 and s["bytes"] > 0 for s in result["steps"])


def test_asks_for_the_lists_and_the_newest_file_in_order():
    session = FakeSession(page_response(), file_response(), page_response(OWNERSHIP_ROWS))
    run(session)
    assert [(c["url"], c["params"]) for c in session.calls] == [
        (API_BASE + "/page", {"url": ISSUANCE_SLUG}),
        (f"{API_BASE}/media/{GUID_A}", {}),
        (API_BASE + "/page", {"url": OWNERSHIP_SLUG}),
    ]


def test_refused_at_once_exits_2_and_asks_nothing_more():
    session = FakeSession(html_response(403, CHALLENGE_HTML))
    code, result = run(session)
    assert code == 2 and result["status"] == "blocked" and result["requests"] == 1
    assert [s["status"] for s in result["steps"]] == ["blocked", "skipped", "skipped"]
    assert result["steps"][0]["http_status"] == 403
    assert len(session.calls) == 1


def test_refused_on_the_file_exits_2():
    session = FakeSession(page_response(), FakeResponse(429, text="slow down"))
    code, result = run(session)
    assert code == 2 and [s["status"] for s in result["steps"]] == ["ok", "blocked", "skipped"]


def test_list_without_files_is_an_error():
    rows = [announcement_row("Rencana Lelang", "10 November 2026", "/rencanalelang")]
    code, result = run(FakeSession(page_response(rows)))
    assert code == 1 and result["status"] == "error"
    assert "without any file links" in result["steps"][0]["detail"]
    assert result["steps"][1]["status"] == "skipped"


def test_a_page_dressed_as_a_file_is_an_error():
    session = FakeSession(page_response(), file_response(content=b"<html>maintenance</html>"))
    code, result = run(session)
    assert code == 1 and "neither a PDF nor a workbook" in result["steps"][1]["detail"]


def test_server_error_exits_1():
    code, result = run(FakeSession(FakeResponse(502, text="Bad Gateway")))
    assert code == 1 and result["steps"][0]["status"] == "error" and result["steps"][0]["http_status"] == 502


def test_writes_step_summary(tmp_path, monkeypatch):
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    code, result = run(FakeSession(page_response(), file_response(), page_response(OWNERSHIP_ROWS)))
    text = summary.read_text(encoding="utf-8")
    assert code == 0 and result["where"] == "github-actions"
    assert "### DJPPR probe" in text and "**ok** (3 requests)" in text
    assert text.count("| ok |") == 3


def test_summary_survives_pipes_in_titles(tmp_path, monkeypatch):
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    rows = [file_row("Ringkasan | 2026", "", GUID_A)]
    run(FakeSession(page_response(rows), file_response(), page_response(OWNERSHIP_ROWS)))
    table = [line for line in summary.read_text(encoding="utf-8").splitlines() if line.startswith("| issuance list")]
    assert len(table) == 1 and table[0].count("|") == 7  # six cells, no extra column


def test_rejects_unknown_arguments():
    with pytest.raises(SystemExit):
        main(["--date", "2026-11-10"], client_factory=lambda: DjpprClient(session=FakeSession()))
