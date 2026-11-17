"""Test doubles and synthetic payloads.

The payloads copy the shape DJPPR's API returned on 16 Nov 2026: a page
definition whose layout is a JSON string, with list rows inside "repeater"
widgets. The GUIDs, titles and file bytes are made up, so no DJPPR file is
committed to this public repo.
"""
from __future__ import annotations

import json
from typing import Any

API = "https://api-djppr.kemenkeu.go.id/web/api/v1"
GUID_A = "0A0A0A0A-1111-4222-8333-444444444444"
GUID_B = "0B0B0B0B-1111-4222-8333-555555555555"

PDF_BYTES = b"%PDF-1.7\n% synthetic, not a DJPPR file\n"
XLSX_BYTES = b"PK\x03\x04 synthetic, not a DJPPR file"

# Shortened, but with the markers the real pages carry.
CHALLENGE_HTML = (
    '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title></head>'
    "<body><script>(function(){window._cf_chl_opt={cType:'managed'};}());</script></body></html>"
)
REJECTED_HTML = (
    "<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. "
    "Please consult with your administrator.<br><br>Your support ID is: 123</body></html>"
)


def file_row(title: str, description: str, guid: str) -> dict:
    """A row of a file list. The odd last key is in DJPPR's real payloads."""
    return {
        "@judul": title,
        "@deskripsi": description,
        "@link": f"{API}/media/{guid}",
        "[object Object]": "undefined_copy_copy",
    }


def announcement_row(title: str, date: str, path: str) -> dict:
    """A row of the announcements list. DJPPR's key order varies, so this one is shuffled."""
    return {"@link": path, "@judul": title, "@tanggal": date, "@foto": ""}


def page_payload(rows: list[dict] | None = None, *, title: str = "Synthetic page") -> dict:
    if rows is None:
        rows = [
            file_row("Ringkasan Hasil Penerbitan SBN Tahun 2026", "s.d. Juli 2026", GUID_A),
            file_row("Ringkasan Hasil Penerbitan SBN Tahun 2025", "s.d. Desember 2025", GUID_B),
        ]
    layout = [
        {
            "widgetId": 1,
            "widgetType": "section",
            "rows": [
                {
                    "widgetType": "row",
                    "cols": [
                        {
                            "widgetType": "col",
                            "modules": [
                                {"widgetType": "text", "text": "File Terlampir"},
                                {"widgetType": "repeater", "propertyJSON": {"loadSize": 10}, "data": rows},
                            ],
                        }
                    ],
                }
            ],
        }
    ]
    return {
        "Data": {"Id": 0, "Title": title, "PageContentLive": json.dumps(layout), "PageId": 1201},
        "Version": "1.0.0",
        "StatusCode": 200,
        "Message": "",
    }


class FakeResponse:
    def __init__(
        self,
        status_code: int = 200,
        payload: Any = None,
        *,
        text: str | None = None,
        content: bytes | None = None,
        headers: dict | None = None,
    ):
        self.status_code = status_code
        self._payload = payload
        if content is not None:
            self.content = content
            self.text = text if text is not None else content.decode("latin-1")
        else:
            self.text = text if text is not None else ("" if payload is None else json.dumps(payload))
            self.content = self.text.encode("utf-8")
        if headers is None:
            headers = {"Content-Type": "application/json; charset=utf-8"} if payload is not None else {}
        self.headers = headers

    def json(self) -> Any:
        if self._payload is None:
            raise ValueError("not JSON")
        return self._payload


def page_response(rows: list[dict] | None = None) -> FakeResponse:
    return FakeResponse(200, page_payload(rows))


def file_response(content: bytes = PDF_BYTES, filename: str = "Synthetic file 2026.pdf", content_type: str = "application/pdf") -> FakeResponse:
    return FakeResponse(
        200,
        content=content,
        headers={"Content-Type": content_type, "Content-Disposition": f'inline; filename="{filename}"'},
    )


def html_response(status_code: int, html: str, headers: dict | None = None) -> FakeResponse:
    return FakeResponse(status_code, text=html, headers={"Content-Type": "text/html", **(headers or {})})


class FakeSession:
    """Answers requests from a queue; an exception in the queue is raised instead."""

    def __init__(self, *responses: Any):
        self.responses = list(responses)
        self.calls: list[dict] = []

    def get(self, url: str, *, params: dict, headers: dict, timeout: float) -> FakeResponse:
        self.calls.append({"url": url, "params": dict(params), "headers": dict(headers), "timeout": timeout})
        if not self.responses:
            raise AssertionError(f"unexpected request to {url} with {params}")
        r = self.responses.pop(0)
        if isinstance(r, BaseException):
            raise r
        return r


class FakeClock:
    """Monotonic clock that only moves when something sleeps (or a test advances it)."""

    def __init__(self, start: float = 1000.0):
        self.t = start
        self.sleeps: list[float] = []

    def __call__(self) -> float:
        return self.t

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(seconds)
        self.t += seconds
