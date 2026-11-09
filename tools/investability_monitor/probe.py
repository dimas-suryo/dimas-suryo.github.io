"""One request to IDX, to learn whether this machine is allowed to ask.

Phase 0 of the plan runs this in GitHub Actions (investability-probe.yaml) on
three different days, and locally, before deciding where the daily build runs.
It skips the cache, makes exactly one request, prints one JSON line, and exits
0 when data came back, 2 when IDX refused (challenge, rate limit, bare 403),
and 1 on anything else.

    python -m tools.investability_monitor.probe
    python -m tools.investability_monitor.probe --date 2026-11-06
    python -m tools.investability_monitor.probe --endpoint announcements
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
from typing import Callable, TextIO

from .idx_client import BlockedError, IdxClient, IdxError, jakarta_today


def last_weekday_before(day: dt.date) -> dt.date:
    """The most recent Monday-to-Friday date strictly before `day` (holidays not considered)."""
    d = day - dt.timedelta(days=1)
    while d.weekday() >= 5:
        d -= dt.timedelta(days=1)
    return d


def _date_arg(s: str) -> dt.date:
    try:
        return dt.date.fromisoformat(s)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a YYYY-MM-DD date: {s!r}") from None


def _summary_markdown(r: dict) -> str:
    cells = [r["checked_at"], r["where"], r["endpoint"], r["date"], r["status"],
             str(r.get("http_status") or ""), str(r.get("rows", "")), str(r["elapsed_s"])]
    out = (
        "### IDX probe\n\n"
        "| checked at (UTC) | where | endpoint | date asked | result | HTTP | rows | seconds |\n"
        "|---|---|---|---|---|---|---|---|\n"
        f"| {' | '.join(cells)} |\n"
    )
    if r.get("detail"):
        out += f"\n{r['detail']}\n"
    return out


def main(
    argv: list[str] | None = None,
    *,
    client_factory: Callable[[], IdxClient] | None = None,
    out: TextIO = sys.stdout,
    today: Callable[[], dt.date] = jakarta_today,
) -> int:
    ap = argparse.ArgumentParser(description="Make one request to IDX and report whether it was answered.")
    ap.add_argument("--date", type=_date_arg, default=None,
                    help="trading date to ask for, YYYY-MM-DD (default: the last weekday before today in Jakarta)")
    ap.add_argument("--endpoint", choices=("summary", "announcements"), default="summary")
    args = ap.parse_args(argv)

    day = args.date or last_weekday_before(today())
    client = client_factory() if client_factory else IdxClient(cache_dir=None, max_requests=1, min_interval_s=0)
    result: dict = {
        "checked_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "where": "github-actions" if os.environ.get("GITHUB_ACTIONS") == "true" else "local",
        "endpoint": args.endpoint,
        "date": day.isoformat(),
    }
    t0 = time.monotonic()
    try:
        if args.endpoint == "summary":
            rows = len(client.stock_summary(day))
        else:
            rows = len(client.announcements("KSEI", day - dt.timedelta(days=30), day, page_size=5, max_pages=1))
        result.update(status="ok", rows=rows)
        code = 0
    except BlockedError as e:
        result.update(status="blocked", detail=str(e))
        code = 2
    except IdxError as e:
        result.update(status="error", detail=f"{type(e).__name__}: {e}")
        code = 1
    result.update(http_status=client.last_status, elapsed_s=round(time.monotonic() - t0, 2))

    print(json.dumps(result), file=out)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(_summary_markdown(result))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
