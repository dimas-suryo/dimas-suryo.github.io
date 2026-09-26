"""Atom feeds of regime changes: one entry each time a confirmed label switches.

Built from the payload files on disk, like index.json, so a ticker that failed
today still keeps its history in the feed. The output has no build timestamp:
the files only change when a new switch appears (or old data gets corrected),
so the daily workflow does not commit an identical feed every morning.

Files, next to the payloads:
    feed.xml            every tracked asset
    feed-<SYMBOL>.xml   one asset, e.g. feed-_JKSE.xml for IHSG

Entries describe what already happened. They are worded so that a
notification reading "trend changed to down" is not mistaken for advice.
"""
from __future__ import annotations

import json
import tomllib
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

from .universe import Ticker, safe_filename

ATOM_NS = "http://www.w3.org/2005/Atom"
MAX_ENTRIES = 40  # about a year of switches across three assets
DEFAULT_SITE = "https://dimassuryo.com/"
PAGE_PATH = "projects/regime-radar/"
DATA_PATH = "data/regime-radar/"
DISCLAIMER = "Regime labels describe what already happened. They are not a forecast and not investment advice."

SIGNAL_NAMES = {"trend": "trend", "vol": "volatility"}
WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven"}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def site_meta(hugo_toml: Path = Path("hugo.toml")) -> tuple[str, str]:
    """(baseURL with trailing slash, site title) from the Hugo config, with fallbacks."""
    try:
        cfg = tomllib.loads(hugo_toml.read_text())
        base = cfg.get("baseURL") or DEFAULT_SITE
        title = cfg.get("title") or "Dimas Suryo"
    except (OSError, tomllib.TOMLDecodeError):
        base, title = DEFAULT_SITE, "Dimas Suryo"
    return (base if base.endswith("/") else base + "/"), title


def _date(iso: str) -> str:
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def _num(x: float | None, nd: int = 2) -> str:
    return "n/a" if x is None else f"{x:,.{nd}f}"


def _pct(x: float | None) -> str:
    return "n/a" if x is None else f"{x * 100:.1f}%"


def switches(payload: dict) -> list[dict]:
    """Every confirmed label change in a payload, oldest first."""
    s = payload["series"]
    dates = s["date"]
    out = []
    for signal in ("trend", "vol"):
        labels = s[f"{signal}_regime"]
        for i in range(1, len(labels)):
            if labels[i] != labels[i - 1] and labels[i] is not None and labels[i - 1] is not None:
                out.append(
                    {
                        "symbol": payload["meta"]["symbol"],
                        "name": payload["meta"].get("display_name") or payload["meta"]["symbol"],
                        "signal": signal,
                        "date": dates[i],
                        "old": labels[i - 1],
                        "new": labels[i],
                        "close": s["close"][i],
                        "ma_short": (s.get("ma_short") or [None] * len(dates))[i],
                        "ma_long": (s.get("ma_long") or [None] * len(dates))[i],
                        "realized_vol": s["realized_vol"][i],
                        "vol_lo": (s.get("vol_lo") or [None] * len(dates))[i],
                        "vol_hi": (s.get("vol_hi") or [None] * len(dates))[i],
                        "confirm_days": payload["meta"].get("params", {}).get("confirm_days", 1),
                        "params": payload["meta"].get("params", {}),
                    }
                )
    return sorted(out, key=lambda x: x["date"])


def entry_text(sw: dict) -> str:
    sig = SIGNAL_NAMES[sw["signal"]]
    n = sw["confirm_days"]
    held = f", after {WORDS.get(n, str(n))} trading days of {sw['new']} readings" if n > 1 else ""
    first = f"On {_date(sw['date'])} the {sw['name']} {sig} label changed from {sw['old']} to {sw['new']}{held}."
    p = sw["params"]
    if sw["signal"] == "trend":
        detail = (
            f"Close {_num(sw['close'])}, {p.get('trend_short', 50)}-day average {_num(sw['ma_short'])}, "
            f"{p.get('trend_long', 200)}-day average {_num(sw['ma_long'])}."
        )
    else:
        window = p.get("vol_window", 21)
        band = {
            "low": f"below the low cut of {_pct(sw['vol_lo'])}",
            "mid": f"inside the middle band of {_pct(sw['vol_lo'])} to {_pct(sw['vol_hi'])}",
            "high": f"above the high cut of {_pct(sw['vol_hi'])}",
        }.get(sw["new"], "")
        detail = f"Realized volatility over the last {window} trading days was {_pct(sw['realized_vol'])} a year, {band}."
    return f"{first} {detail} {DISCLAIMER}"


def build_feed(
    payloads: list[dict], base: str, site_title: str, feed_file: str, title: str,
    max_entries: int = MAX_ENTRIES,
) -> str:
    """Atom XML for the given payloads. Same input, same output, byte for byte."""
    host = urlparse(base).netloc or "dimassuryo.com"
    page_url = base + PAGE_PATH
    feed_url = base + DATA_PATH + feed_file

    order = {p["meta"]["symbol"]: i for i, p in enumerate(payloads)}
    all_sw = [sw for p in payloads for sw in switches(p)]
    all_sw.sort(key=lambda x: (x["date"], -order[x["symbol"]], x["signal"] == "trend"), reverse=True)
    entries = all_sw[:max_entries]

    ET.register_namespace("", ATOM_NS)
    q = lambda tag: f"{{{ATOM_NS}}}{tag}"  # noqa: E731
    feed = ET.Element(q("feed"))
    ET.SubElement(feed, q("title")).text = title
    ET.SubElement(feed, q("subtitle")).text = (
        "One entry each time a Regime Radar trend or volatility label switches. " + DISCLAIMER
    )
    ET.SubElement(feed, q("id")).text = f"tag:{host},2026:regime-radar/{feed_file}"
    ET.SubElement(feed, q("link"), rel="self", type="application/atom+xml", href=feed_url)
    ET.SubElement(feed, q("link"), rel="alternate", type="text/html", href=page_url)
    ET.SubElement(feed, q("updated")).text = (entries[0]["date"] if entries else "2026-01-01") + "T00:00:00Z"
    author = ET.SubElement(feed, q("author"))
    ET.SubElement(author, q("name")).text = site_title

    for sw in entries:
        e = ET.SubElement(feed, q("entry"))
        sig = SIGNAL_NAMES[sw["signal"]]
        ET.SubElement(e, q("title")).text = f"{sw['name']} {sig} changed from {sw['old']} to {sw['new']}"
        ET.SubElement(e, q("id")).text = (
            f"tag:{host},2026:regime-radar/{safe_filename(sw['symbol'])}/{sw['signal']}/{sw['date']}"
        )
        ET.SubElement(e, q("link"), rel="alternate", type="text/html", href=page_url)
        ET.SubElement(e, q("updated")).text = sw["date"] + "T00:00:00Z"
        ET.SubElement(e, q("category"), term=sw["signal"])
        ET.SubElement(e, q("summary"), type="text").text = entry_text(sw)

    ET.indent(feed)
    return '<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(feed, encoding="unicode") + "\n"


def write_feeds(out_dir: Path, universe: list[Ticker], hugo_toml: Path = Path("hugo.toml")) -> list[Path]:
    """feed.xml for everything plus feed-<SYMBOL>.xml per asset, from the files on disk."""
    base, site_title = site_meta(hugo_toml)
    payloads = []
    for t in universe:
        f = out_dir / (safe_filename(t.symbol) + ".json")
        if f.exists():
            payloads.append(json.loads(f.read_text()))

    written = []

    def _write(name: str, xml: str) -> None:
        path = out_dir / name
        if not path.exists() or path.read_text() != xml:
            path.write_text(xml)
        written.append(path)

    _write("feed.xml", build_feed(payloads, base, site_title, "feed.xml", "Regime Radar: regime changes"))
    for p in payloads:
        name = f"feed-{safe_filename(p['meta']['symbol'])}.xml"
        label = p["meta"].get("display_name") or p["meta"]["symbol"]
        _write(name, build_feed([p], base, site_title, name, f"Regime Radar: {label} regime changes"))
    return written
