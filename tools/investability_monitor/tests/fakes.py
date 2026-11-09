"""Test doubles and synthetic payloads.

The payloads copy the exact shape the IDX endpoints returned on 9 Nov 2026
(field names, types, nesting). The stocks and numbers are made up, so no IDX
data is committed to this public repo.
"""
from __future__ import annotations

import datetime as dt
import json
from typing import Any

DAY = dt.date(2026, 11, 6)  # a Friday
TODAY = dt.date(2026, 11, 9)  # the Monday after

# Shortened, but with the markers a real Cloudflare interstitial carries.
CHALLENGE_HTML = (
    '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title></head>'
    "<body><script>(function(){window._cf_chl_opt={cType:'managed'};"
    "var a=document.createElement('script');a.src='/cdn-cgi/challenge-platform/h/g/orchestrate/chl_page/v1';"
    "}());</script></body></html>"
)


def summary_row(code: str = "AAAA", *, day: dt.date = DAY, close: float = 1000.0, prev: float = 1010.0, **over: Any) -> dict:
    row = {
        "No": 1,
        "IDStockSummary": 1,
        "Date": f"{day:%Y-%m-%d}T00:00:00",
        "StockCode": code,
        "StockName": f"{code} Synthetic Tbk.",
        "Remarks": "--M---------------------------",
        "Previous": prev,
        "OpenPrice": prev,
        "FirstTrade": prev,
        "High": max(prev, close),
        "Low": min(prev, close),
        "Close": close,
        "Change": close - prev,
        "Volume": 1_000_000.0,
        "Value": close * 1_000_000.0,
        "Frequency": 500.0,
        "IndexIndividual": 100.0,
        "Offer": close + 5,
        "OfferVolume": 10_000.0,
        "Bid": close,
        "BidVolume": 20_000.0,
        "ListedShares": 10_000_000_000.0,
        "TradebleShares": 10_000_000_000.0,
        "WeightForIndex": 2_000_000_000.0,
        "ForeignSell": 100_000.0,
        "ForeignBuy": 150_000.0,
        "DelistingDate": "",
        "NonRegularVolume": 0.0,
        "NonRegularValue": 0.0,
        "NonRegularFrequency": 0.0,
        "persen": None,
        "percentage": None,
    }
    row.update(over)
    return row


def summary_payload(rows: list[dict] | None = None, *, total: int | None = None) -> dict:
    if rows is None:
        rows = [summary_row("BBBB", close=50.0, prev=54.0), summary_row("AAAA")]
    n = len(rows) if total is None else total
    return {"draw": 0, "recordsTotal": n, "recordsFiltered": n, "data": rows}


def announcement_reply(
    title: str = "Pemegang Saham di atas 1% (KSEI)",
    published: str = "2026-06-02T11:50:22",
    issuer: str = "Semua Emiten Saham                  ",
    attachments: int = 2,
) -> dict:
    return {
        "pengumuman": {
            "Id2": "202606021150220000",
            "TglPengumuman": published,
            "JudulPengumuman": title,
            "Kode_Emiten": issuer,
        },
        "attachments": [
            {
                "OriginalFilename": f"20260602_Pengumuman Bursa_{i}.pdf",
                "FullSavePath": f"https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_EREP/202606/{i:04d}.pdf",
            }
            for i in range(attachments)
        ],
    }


def announcement_payload(replies: list[dict], *, total: int | None = None) -> dict:
    return {
        "ResultCount": len(replies) if total is None else total,
        "SearchParams": {"Query": "KSEI", "indexfrom": 0, "pagesize": 50},
        "Replies": replies,
    }


class FakeResponse:
    def __init__(self, status_code: int = 200, payload: Any = None, text: str | None = None, headers: dict | None = None):
        self.status_code = status_code
        self._payload = payload
        self.text = text if text is not None else ("" if payload is None else json.dumps(payload))
        self.headers = headers or {}

    def json(self) -> Any:
        if self._payload is None:
            raise ValueError("not JSON")
        return self._payload


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
