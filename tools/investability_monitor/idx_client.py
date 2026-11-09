"""Polite client for two IDX JSON endpoints: the daily stock summary and announcements.

    GetStockSummary  every listed stock for one trading day: OHLC, previous close,
                     value, frequency, listed shares, index free-float shares,
                     foreign buy/sell, negotiated-market totals and a Remarks code.
                     History starts between Jan 2019 and Jan 2020.
    GetAnnouncement  announcement titles with links to their PDF attachments
                     (the monthly >1% register, investor-type ownership,
                     special-monitoring placements, suspensions).

IDX sits behind Cloudflare, and this client never tries to get past it: no
challenge solving, no browser impersonation, no rotating IPs. It sends an honest
User-Agent, spaces requests out, has a hard budget per run, fetches each date
once and caches it, and stops for the rest of the run at the first challenge,
rate limit or bare 403. If automated access turns out to be impossible, the
fallback is manual downloads (the plan's Phase 0 gate), not cleverness here.

On 9 Nov 2026, about 15 requests in a few minutes from one residential IP were
enough to get challenged, hence the conservative defaults.
"""
from __future__ import annotations

import datetime as dt
import gzip
import json
import os
import re
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Protocol

import pandas as pd

BASE_URL = "https://www.idx.co.id"
STOCK_SUMMARY_PATH = "/primary/TradingSummary/GetStockSummary"
ANNOUNCEMENT_PATH = "/primary/ListedCompany/GetAnnouncement"

# Who is asking, honestly. No browser string: see the module docstring.
USER_AGENT = "investability-monitor/0.1 (+https://dimassuryo.com/projects/investability-monitor/)"

# Jakarta has no daylight saving time, so a fixed offset is exact and needs no tzdata.
WIB = dt.timezone(dt.timedelta(hours=7), "WIB")

DEFAULT_MIN_INTERVAL_S = 30.0  # until Phase 0 measures a safe spacing
DEFAULT_MAX_REQUESTS = 5  # per client, which means per run
DEFAULT_TIMEOUT_S = 30.0
RETRY_BACKOFF_S = (60.0, 180.0)  # waits before the 1st and 2nd retry of a timeout or 5xx

# Strings that only appear on Cloudflare's interstitial pages.
CHALLENGE_MARKERS = ("__cf_chl", "_cf_chl_opt", "challenge-platform", "<title>Just a moment...</title>")

# IDX field -> our column. Every field must be present in every row: if IDX
# renames one, the build fails loudly instead of publishing a column of NaN.
SUMMARY_FIELDS = {
    "Date": "date",
    "StockCode": "code",
    "StockName": "name",
    "Remarks": "remarks",
    "Previous": "prev_close",
    "OpenPrice": "open",
    "FirstTrade": "first_trade",
    "High": "high",
    "Low": "low",
    "Close": "close",
    "Change": "change",
    "Volume": "volume",
    "Value": "value",
    "Frequency": "frequency",
    "Offer": "offer",
    "OfferVolume": "offer_volume",
    "Bid": "bid",
    "BidVolume": "bid_volume",
    "ListedShares": "listed_shares",
    "TradebleShares": "tradable_shares",  # sic, IDX's spelling
    "WeightForIndex": "index_shares",  # free-float shares used for index weights; Phase 0 verifies this
    "ForeignSell": "foreign_sell",
    "ForeignBuy": "foreign_buy",
    "NonRegularVolume": "nonreg_volume",
    "NonRegularValue": "nonreg_value",
    "NonRegularFrequency": "nonreg_frequency",
    "DelistingDate": "delisting_date",
}
TEXT_COLUMNS = ("code", "name", "remarks", "delisting_date")
STOCK_CODE = re.compile(r"^[A-Z]{4}$")


class IdxError(RuntimeError):
    """Anything that went wrong talking to IDX."""


class BlockedError(IdxError):
    """IDX refused to serve this client (challenge, rate limit, bare 403). Stop for this run."""


class ChallengeError(BlockedError):
    """Cloudflare answered with a challenge page instead of data."""


class RateLimitedError(BlockedError):
    """HTTP 429."""


class BudgetExceededError(IdxError):
    """The client already made its maximum number of requests for this run."""


class SchemaError(IdxError):
    """The payload does not look like what this module was written against."""


class UnexpectedResponseError(IdxError):
    """A response that is neither data nor a recognizable refusal."""


class _Response(Protocol):
    status_code: int
    headers: Any
    text: str

    def json(self) -> Any: ...


class _Session(Protocol):
    def get(self, url: str, *, params: dict, headers: dict, timeout: float) -> _Response: ...


@dataclass(frozen=True)
class Attachment:
    filename: str
    url: str


@dataclass(frozen=True)
class Announcement:
    published: dt.datetime  # as IDX reports it: Jakarta time, naive
    title: str
    issuer: str  # four-letter stock code, or "" for exchange-wide announcements
    attachments: tuple[Attachment, ...]


def jakarta_today() -> dt.date:
    return dt.datetime.now(WIB).date()


def _ymd(day: dt.date) -> str:
    return day.strftime("%Y%m%d")


def blocked_reason(resp: _Response) -> BlockedError | None:
    """The refusal this response represents, or None if it is not one."""
    status = resp.status_code
    if status == 429:
        return RateLimitedError("HTTP 429 from IDX")
    headers = resp.headers or {}
    if str(headers.get("cf-mitigated", "")).lower() == "challenge":
        return ChallengeError(f"Cloudflare challenge (HTTP {status}, cf-mitigated header)")
    head = (resp.text or "")[:50_000]
    if any(m in head for m in CHALLENGE_MARKERS):
        return ChallengeError(f"Cloudflare challenge page (HTTP {status})")
    if status == 403:
        return BlockedError("HTTP 403 from IDX without a challenge page")
    return None


def parse_stock_summary(payload: Any, day: dt.date) -> pd.DataFrame:
    """One row per stock for `day`, with our column names. SchemaError on any surprise."""
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
        raise SchemaError("stock summary payload has no 'data' list")
    rows = payload["data"]
    total = payload.get("recordsTotal")
    if isinstance(total, (int, float)) and total > len(rows):
        raise SchemaError(f"IDX reports {int(total)} stocks for {day} but sent {len(rows)}; the request needs paging")
    if not rows:
        return pd.DataFrame(columns=list(SUMMARY_FIELDS.values()))

    missing = sorted({f for r in rows for f in SUMMARY_FIELDS if f not in r})
    if missing:
        raise SchemaError(f"stock summary for {day} lacks fields: {', '.join(missing)}")

    df = pd.DataFrame([{col: r[f] for f, col in SUMMARY_FIELDS.items()} for r in rows])
    dates = pd.to_datetime(df["date"], errors="coerce").dt.normalize()
    if dates.isna().any() or (dates != pd.Timestamp(day)).any():
        other = sorted({str(d.date()) for d in dates.dropna() if d != pd.Timestamp(day)})
        raise SchemaError(f"asked IDX for {day}, got rows dated {other or 'that cannot be parsed'}")
    df["date"] = dates

    for col in df.columns:
        if col == "date":
            continue
        if col in TEXT_COLUMNS:
            s = df[col].fillna("").astype(str)
            # Remarks is positional (dashes are fillers), so it is kept verbatim.
            df[col] = s if col == "remarks" else s.str.strip()
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)

    if df["code"].eq("").any() or df["code"].duplicated().any():
        raise SchemaError(f"stock summary for {day} has blank or duplicate stock codes")
    return df.sort_values("code", kind="stable").reset_index(drop=True)


def parse_announcements(payload: Any) -> list[Announcement]:
    """Announcements in the order IDX sent them (newest first)."""
    if not isinstance(payload, dict) or not isinstance(payload.get("Replies"), list):
        raise SchemaError("announcement payload has no 'Replies' list")
    out = []
    for r in payload["Replies"]:
        p = r.get("pengumuman") or {}
        try:
            published = dt.datetime.fromisoformat(str(p["TglPengumuman"]))
            title = str(p["JudulPengumuman"]).strip()
        except (KeyError, ValueError) as e:
            raise SchemaError(f"announcement without a usable date or title: {e!r}") from e
        # Exchange-wide announcements carry "Semua Emiten Saham" or blanks here.
        code = str(p.get("Kode_Emiten") or "").strip()
        attachments = tuple(
            Attachment(str(a.get("OriginalFilename") or "").strip(), str(a["FullSavePath"]).strip())
            for a in (r.get("attachments") or [])
            if a.get("FullSavePath")
        )
        out.append(Announcement(published, title, code if STOCK_CODE.match(code) else "", attachments))
    return out


def _requests_session() -> _Session:
    import requests

    return requests.Session()


class IdxClient:
    """Throttled, budgeted, caching client. Make one per run.

    `cache_dir` holds the raw stock-summary payloads, one gzipped JSON file per
    day. It belongs in the private data repo or a local folder, never under
    static/. None disables caching (the probe uses that).
    """

    def __init__(
        self,
        cache_dir: Path | str | None = None,
        *,
        min_interval_s: float = DEFAULT_MIN_INTERVAL_S,
        max_requests: int = DEFAULT_MAX_REQUESTS,
        timeout_s: float = DEFAULT_TIMEOUT_S,
        session: _Session | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
        today: Callable[[], dt.date] = jakarta_today,
    ) -> None:
        self.cache_dir = Path(cache_dir) if cache_dir is not None else None
        self.min_interval_s = min_interval_s
        self.max_requests = max_requests
        self.timeout_s = timeout_s
        self.session = session if session is not None else _requests_session()
        self.clock = clock
        self.sleep = sleep
        self.today = today
        self.requests_made = 0
        self.last_status: int | None = None
        self._last_request_at: float | None = None
        self._blocked: BlockedError | None = None

    # -- public ---------------------------------------------------------------

    def stock_summary(self, day: dt.date) -> pd.DataFrame:
        """Every stock on `day`: from the cache when possible, otherwise one request."""
        cached = self._read_cache(day)
        if cached is not None:
            return parse_stock_summary(cached, day)
        payload = self._get_json(STOCK_SUMMARY_PATH, {"length": 9999, "start": 0, "date": _ymd(day)})
        df = parse_stock_summary(payload, day)  # validate before anything is cached
        # An empty answer for a past date is a weekend or holiday and stays empty.
        # For today it may only mean the data is not out yet, so it is not cached.
        if len(df) or day < self.today():
            self._write_cache(day, payload)
        return df

    def announcements(
        self,
        keyword: str,
        date_from: dt.date,
        date_to: dt.date,
        *,
        page_size: int = 50,
        max_pages: int = 3,
    ) -> list[Announcement]:
        """Announcements matching `keyword` (IDX's own title search), newest first.

        One request per page, not cached. indexFrom is treated as a row offset,
        which is what the 9 Nov 2026 probes suggested; Phase 0 confirms it.
        """
        out: list[Announcement] = []
        for page in range(max_pages):
            payload = self._get_json(
                ANNOUNCEMENT_PATH,
                {
                    "kodeEmiten": "",
                    "emitenType": "*",
                    "indexFrom": page * page_size,
                    "pageSize": page_size,
                    "dateFrom": _ymd(date_from),
                    "dateTo": _ymd(date_to),
                    "lang": "id",
                    "keyword": keyword,
                },
            )
            batch = parse_announcements(payload)
            out.extend(batch)
            total = payload.get("ResultCount")
            if not batch or not isinstance(total, int) or len(out) >= total:
                break
        return out

    # -- requests -------------------------------------------------------------

    def _headers(self) -> dict:
        return {"User-Agent": USER_AGENT, "Accept": "application/json"}

    def _wait_turn(self) -> None:
        if self._last_request_at is None:
            return
        wait = self.min_interval_s - (self.clock() - self._last_request_at)
        if wait > 0:
            self.sleep(wait)

    def _get_json(self, path: str, params: dict) -> Any:
        if self._blocked is not None:
            raise BlockedError(f"not asking again in this run; IDX refused earlier: {self._blocked}")
        retries = 0
        while True:
            if self.requests_made >= self.max_requests:
                raise BudgetExceededError(f"request budget of {self.max_requests} used up for this run")
            self._wait_turn()
            self.requests_made += 1
            self._last_request_at = self.clock()
            try:
                resp = self.session.get(BASE_URL + path, params=params, headers=self._headers(), timeout=self.timeout_s)
            except OSError as e:  # requests' exceptions derive from OSError
                if retries < len(RETRY_BACKOFF_S):
                    self.sleep(RETRY_BACKOFF_S[retries])
                    retries += 1
                    continue
                raise UnexpectedResponseError(f"network error after {retries} retries: {e}") from e

            self.last_status = resp.status_code
            refusal = blocked_reason(resp)
            if refusal is not None:
                self._blocked = refusal
                raise refusal
            if 500 <= resp.status_code < 600:
                if retries < len(RETRY_BACKOFF_S):
                    self.sleep(RETRY_BACKOFF_S[retries])
                    retries += 1
                    continue
                raise UnexpectedResponseError(f"HTTP {resp.status_code} after {retries} retries")
            if resp.status_code != 200:
                raise UnexpectedResponseError(f"HTTP {resp.status_code}")
            try:
                return resp.json()
            except ValueError as e:
                raise UnexpectedResponseError("IDX answered 200 with something that is not JSON") from e

    # -- cache ----------------------------------------------------------------

    def _cache_path(self, day: dt.date) -> Path | None:
        if self.cache_dir is None:
            return None
        return self.cache_dir / "stock-summary" / f"{day:%Y}" / f"{day:%Y-%m-%d}.json.gz"

    def _read_cache(self, day: dt.date) -> Any | None:
        path = self._cache_path(day)
        if path is None or not path.exists():
            return None
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return json.load(f)

    def _write_cache(self, day: dt.date, payload: Any) -> None:
        path = self._cache_path(day)
        if path is None:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp_", suffix=".json.gz")
        try:
            # mtime=0 and no file name in the header: the same payload always
            # gives the same bytes, so the data repo never sees a fake change.
            with os.fdopen(fd, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as gz:
                gz.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
            os.replace(tmp, path)
        except BaseException:
            try:
                os.unlink(tmp)
            except FileNotFoundError:
                pass
            raise
