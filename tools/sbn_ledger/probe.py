"""Three requests to DJPPR, to learn whether this machine is allowed to ask.

Milestone 0 of the plan runs this in GitHub Actions (sbn-ledger-probe.yaml) on
three different days before deciding where the daily build runs. The requests
are the ones the build will make, spaced three seconds apart:

    1. the list of yearly issuance summaries    GET /page?url=ringkasanhasilpenerbitan
    2. the newest file on that list              GET /media/<GUID>
    3. the list of ownership files               GET /page?url=kepemilikansbndomestikyangdapatdiperdagangkan

It stops at the first step that fails, prints one JSON line, and exits 0 when
all three came back with data, 2 when DJPPR refused (challenge page, firewall
rejection, rate limit, bare 403), and 1 on anything else. Nothing is saved.

    python -m tools.sbn_ledger.probe
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
from typing import Callable, TextIO

from .djppr import BlockedError, DjpprClient, DjpprError, Entry

ISSUANCE_SLUG = "ringkasanhasilpenerbitan"
OWNERSHIP_SLUG = "kepemilikansbndomestikyangdapatdiperdagangkan"
STEPS = ("issuance list", "newest issuance file", "ownership list")


def _files(entries: list[Entry], what: str) -> list[Entry]:
    files = [e for e in entries if e.guid]
    if not files:
        raise DjpprError(f"the {what} page came back without any file links; its layout may have changed")
    return files


def _count(n: int) -> str:
    return f"{n} file{'' if n == 1 else 's'}"


def _run_steps(client: DjpprClient) -> list[dict]:
    """One dict per step that was attempted. The first failure ends the list."""
    done: list[dict] = []
    newest: Entry | None = None

    def issuance() -> str:
        nonlocal newest
        files = _files(client.entries(ISSUANCE_SLUG), "issuance")
        newest = files[0]
        return f"{_count(len(files))}; newest: {newest.title}"

    def newest_file() -> str:
        assert newest is not None and newest.guid is not None
        f = client.media(newest.guid)
        if f.kind == "unknown":
            raise DjpprError(f"the file is neither a PDF nor a workbook (Content-Type {f.content_type or 'missing'})")
        return f"{f.kind}, sha256 {f.sha256[:12]}"

    def ownership() -> str:
        files = _files(client.entries(OWNERSHIP_SLUG), "ownership")
        return f"{_count(len(files))}; newest: {files[0].description or files[0].title}"

    for name, fn in zip(STEPS, (issuance, newest_file, ownership)):
        t0 = time.monotonic()
        step: dict = {"step": name}
        try:
            step.update(status="ok", detail=fn())
        except BlockedError as e:
            step.update(status="blocked", detail=str(e))
        except DjpprError as e:
            step.update(status="error", detail=f"{type(e).__name__}: {e}")
        step.update(http_status=client.last_status, bytes=client.last_bytes, elapsed_s=round(time.monotonic() - t0, 2))
        done.append(step)
        if step["status"] != "ok":
            break
    return done


def _cell(x: object) -> str:
    return "" if x is None else str(x).replace("|", "/").replace("\n", " ")


def _summary_markdown(r: dict) -> str:
    out = (
        "### DJPPR probe\n\n"
        f"{r['checked_at']} UTC, from {r['where']}: **{r['status']}** "
        f"({r['requests']} request{'s' if r['requests'] != 1 else ''})\n\n"
        "| step | result | HTTP | bytes | seconds | detail |\n"
        "|---|---|---|---|---|---|\n"
    )
    for s in r["steps"]:
        cells = [s["step"], s["status"], s.get("http_status"), s.get("bytes"), s.get("elapsed_s"), s.get("detail")]
        out += "| " + " | ".join(_cell(c) for c in cells) + " |\n"
    return out


def main(
    argv: list[str] | None = None,
    *,
    client_factory: Callable[[], DjpprClient] | None = None,
    out: TextIO = sys.stdout,
) -> int:
    ap = argparse.ArgumentParser(description="Make three spaced requests to DJPPR and report whether they were answered.")
    ap.parse_args(argv)

    client = client_factory() if client_factory else DjpprClient(max_requests=len(STEPS))
    steps = _run_steps(client)
    for name in STEPS[len(steps):]:
        steps.append({"step": name, "status": "skipped"})

    statuses = [s["status"] for s in steps]
    if "blocked" in statuses:
        status, code = "blocked", 2
    elif "error" in statuses:
        status, code = "error", 1
    else:
        status, code = "ok", 0

    result = {
        "checked_at": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M"),
        "where": "github-actions" if os.environ.get("GITHUB_ACTIONS") == "true" else "local",
        "status": status,
        "requests": client.requests_made,
        "steps": steps,
    }
    print(json.dumps(result, ensure_ascii=False), file=out)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(_summary_markdown(result))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
