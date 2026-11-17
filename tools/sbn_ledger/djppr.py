"""Polite client for the public API behind djppr.kemenkeu.go.id.

DJPPR's website is a single-page app that reads everything from one API:

    GET /page?url=<slug>   a page definition. File lists and announcement lists
                           sit inside it as "repeater" widgets, one entry per row.
    GET /media/<GUID>      one file (PDF or Excel). Its name is in Content-Disposition.

Pages this project reads:

    kepemilikansbndomestikyangdapatdiperdagangkan   ownership of tradable rupiah SBN
    ringkasanhasilpenerbitan                         every issuance and auction, by year
    pengumuman                                       announcements, with same-day auction results
    daftarkuotasihargasbnseribenchmarkmingguan       daily benchmark prices and yields

On 16 Nov 2026 the API answered 17 spaced requests from a plain script, and it
sits behind no bot protection. This client is written to keep it that way and
to behave if that changes: it sends an honest User-Agent, spaces requests out,
has a hard budget per run, never retries, and stops for the rest of the run at
the first refusal (challenge page, firewall rejection, rate limit, bare 403).
If DJPPR ever refuses automated clients, the fallback is running by hand, not
cleverness here.

Everything DJPPR sends is treated as data: a link from a page is only ever
used as a GUID or a slug on this one host.
"""
from __future__ import annotations

import hashlib
import json
import re
import time
from dataclasses import dataclass
from typing import Any, Callable, Protocol

API_BASE = "https://api-djppr.kemenkeu.go.id/web/api/v1"

# Who is asking, honestly. No browser string: see the module docstring.
USER_AGENT = "sbn-ledger/0.1 (+https://dimassuryo.com/projects/sbn-ledger/)"

DEFAULT_MIN_INTERVAL_S = 3.0
DEFAULT_MAX_REQUESTS = 12  # per client, which means per run; a normal day needs 4 lists and a few files
DEFAULT_TIMEOUT_S = 30.0

# Strings that only appear on refusal pages: Cloudflare's interstitial and the
# "Request Rejected" page of an F5 firewall (seen on another ministry's portal).
REFUSAL_MARKERS = (
    "__cf_chl",
    "_cf_chl_opt",
    "challenge-platform",
    "<title>Just a moment...</title>",
    "<title>Request Rejected</title>",
    "The requested URL was rejected",
)

GUID = re.compile(r"[0-9A-Fa-f]{8}-(?:[0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}")
_MEDIA_LINK = re.compile(r"/media/(" + GUID.pattern + r")/?$")
_FILENAME = re.compile(r"filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?", re.IGNORECASE)

# File type by leading bytes. The server's Content-Type is recorded too, but the
# bytes decide: a refusal page served as a "PDF" must not pass for one.
_MAGIC = ((b"%PDF", "pdf"), (b"PK\x03\x04", "xlsx"), (b"\xd0\xcf\x11\xe0", "xls"))


class DjpprError(RuntimeError):
    """Anything that went wrong talking to DJPPR."""


class BlockedError(DjpprError):
    """DJPPR refused to serve this client. Stop for this run."""


class ChallengeError(BlockedError):
    """A challenge or firewall rejection page came back instead of data."""


class RateLimitedError(BlockedError):
    """HTTP 429."""


class BudgetExceededError(DjpprError):
    """The client already made its maximum number of requests for this run."""


class SchemaError(DjpprError):
    """The payload does not look like what this module was written against."""


class UnexpectedResponseError(DjpprError):
    """A response that is neither data nor a recognizable refusal."""


class _Response(Protocol):
    status_code: int
    headers: Any
    text: str
    content: bytes

    def json(self) -> Any: ...


class _Session(Protocol):
    def get(self, url: str, *, params: dict, headers: dict, timeout: float) -> _Response: ...


@dataclass(frozen=True)
class Entry:
    """One row of a list on a DJPPR page, in DJPPR's own words."""

    title: str
    description: str  # e.g. "Data Harian s.d. 10 November 2026"; "" when the list has none
    date: str  # e.g. "10 November 2026" on announcements; "" on file lists
    link: str  # a media URL, or a site path such as "/hasillelang..."

    @property
    def guid(self) -> str | None:
        """The file's GUID when the link points at /media/<GUID>, else None."""
        m = _MEDIA_LINK.search(self.link)
        return m.group(1).upper() if m else None

    @property
    def slug(self) -> str | None:
        """The page slug when the link is a path on DJPPR's own site, else None."""
        if self.link.startswith("/") and not self.link.startswith("//"):
            return self.link.strip("/") or None
        return None


@dataclass(frozen=True)
class MediaFile:
    guid: str
    filename: str  # as DJPPR names it; for display only, never used as a path
    content_type: str
    kind: str  # "pdf", "xlsx", "xls" or "unknown", from the leading bytes
    sha256: str
    content: bytes


def _header(headers: Any, name: str) -> str:
    """Case-insensitive header lookup that also works on a plain dict."""
    if not headers:
        return ""
    for k, v in headers.items():
        if str(k).lower() == name.lower():
            return str(v)
    return ""


def blocked_reason(resp: _Response) -> BlockedError | None:
    """The refusal this response represents, or None if it is not one."""
    status = resp.status_code
    if status == 429:
        return RateLimitedError("HTTP 429 from DJPPR")
    if _header(resp.headers, "cf-mitigated").lower() == "challenge":
        return ChallengeError(f"Cloudflare challenge (HTTP {status}, cf-mitigated header)")
    # Refusal pages are HTML and can arrive with HTTP 200. Files and JSON are
    # never searched: a PDF is not text, and nothing in them is a refusal.
    if status >= 400 or _header(resp.headers, "content-type").lower().startswith("text/html"):
        head = (resp.text or "")[:50_000]
        if any(m in head for m in REFUSAL_MARKERS):
            return ChallengeError(f"challenge or firewall rejection page (HTTP {status})")
    if status == 403:
        return BlockedError("HTTP 403 from DJPPR without a challenge page")
    return None


def parse_entries(payload: Any) -> list[Entry]:
    """Every list row on a page, in page order (DJPPR lists newest first).

    The page definition keeps its layout as a JSON string in
    Data.PageContentLive. List rows are dicts whose keys start with "@":
    "@judul" (title), "@link", and sometimes "@deskripsi" or "@tanggal".
    """
    if not isinstance(payload, dict) or not isinstance(payload.get("Data"), dict):
        raise SchemaError("page payload has no 'Data' object")
    raw = payload["Data"].get("PageContentLive")
    if not isinstance(raw, str) or not raw.strip():
        raise SchemaError("page payload has no 'PageContentLive' text")
    try:
        content = json.loads(raw)
    except ValueError as e:
        raise SchemaError(f"'PageContentLive' is not JSON: {e}") from e

    out: list[Entry] = []

    def text(row: dict, key: str) -> str:
        v = row.get(key)
        return v.strip() if isinstance(v, str) else ""

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if isinstance(node.get("@link"), str) and isinstance(node.get("@judul"), str):
                link = node["@link"].strip()
                if link and link != "#":
                    out.append(Entry(text(node, "@judul"), text(node, "@deskripsi"), text(node, "@tanggal"), link))
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(content)
    return out


def file_kind(content: bytes) -> str:
    for magic, kind in _MAGIC:
        if content.startswith(magic):
            return kind
    return "unknown"


def _requests_session() -> _Session:
    import requests

    return requests.Session()


class DjpprClient:
    """Throttled, budgeted client. Make one per run.

    It keeps no cache: the build decides what it already has (by GUID) before
    asking, so every call here is a real request.
    """

    def __init__(
        self,
        *,
        min_interval_s: float = DEFAULT_MIN_INTERVAL_S,
        max_requests: int = DEFAULT_MAX_REQUESTS,
        timeout_s: float = DEFAULT_TIMEOUT_S,
        session: _Session | None = None,
        clock: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.min_interval_s = min_interval_s
        self.max_requests = max_requests
        self.timeout_s = timeout_s
        self.session = session if session is not None else _requests_session()
        self.clock = clock
        self.sleep = sleep
        self.requests_made = 0
        self.last_status: int | None = None
        self.last_bytes: int | None = None
        self._last_request_at: float | None = None
        self._blocked: BlockedError | None = None

    # -- public ---------------------------------------------------------------

    def page(self, slug: str) -> dict:
        """The raw page definition for `slug`. One request."""
        slug = slug.strip().strip("/")
        if not slug or any(c.isspace() for c in slug) or "/" in slug:
            raise ValueError(f"not a page slug: {slug!r}")
        resp = self._get("/page", {"url": slug}, "application/json")
        try:
            payload = resp.json()
        except ValueError as e:
            raise UnexpectedResponseError("DJPPR answered 200 with something that is not JSON") from e
        if not isinstance(payload, dict) or not isinstance(payload.get("Data"), dict):
            raise SchemaError(f"no page definition came back for {slug!r}")
        return payload

    def entries(self, slug: str) -> list[Entry]:
        """The list rows of page `slug`, newest first. One request."""
        return parse_entries(self.page(slug))

    def media(self, guid: str) -> MediaFile:
        """One file by GUID. One request."""
        if not GUID.fullmatch(guid or ""):
            raise ValueError(f"not a GUID: {guid!r}")
        guid = guid.upper()
        resp = self._get(f"/media/{guid}", {}, "*/*")
        content = resp.content or b""
        if not content:
            raise UnexpectedResponseError(f"DJPPR answered 200 with an empty file for {guid}")
        m = _FILENAME.search(_header(resp.headers, "content-disposition"))
        return MediaFile(
            guid=guid,
            filename=m.group(1).strip() if m else "",
            content_type=_header(resp.headers, "content-type"),
            kind=file_kind(content),
            sha256=hashlib.sha256(content).hexdigest(),
            content=content,
        )

    # -- requests -------------------------------------------------------------

    def _headers(self, accept: str) -> dict:
        return {"User-Agent": USER_AGENT, "Accept": accept}

    def _wait_turn(self) -> None:
        if self._last_request_at is None:
            return
        wait = self.min_interval_s - (self.clock() - self._last_request_at)
        if wait > 0:
            self.sleep(wait)

    def _get(self, path: str, params: dict, accept: str) -> _Response:
        """One request, no retries: a failed day is retried by tomorrow's run."""
        if self._blocked is not None:
            raise BlockedError(f"not asking again in this run; DJPPR refused earlier: {self._blocked}")
        if self.requests_made >= self.max_requests:
            raise BudgetExceededError(f"request budget of {self.max_requests} used up for this run")
        self._wait_turn()
        self.requests_made += 1
        self._last_request_at = self.clock()
        self.last_status = None
        self.last_bytes = None
        try:
            resp = self.session.get(API_BASE + path, params=params, headers=self._headers(accept), timeout=self.timeout_s)
        except OSError as e:  # requests' exceptions derive from OSError
            raise UnexpectedResponseError(f"network error: {e}") from e

        self.last_status = resp.status_code
        self.last_bytes = len(resp.content or b"")
        refusal = blocked_reason(resp)
        if refusal is not None:
            self._blocked = refusal
            raise refusal
        if resp.status_code != 200:
            raise UnexpectedResponseError(f"HTTP {resp.status_code}")
        return resp
