"""Instruments tracked by Regime Radar.

Adding an instrument means adding one line to UNIVERSE. Nothing else in the
pipeline or the page needs to change: the build writes one JSON file per entry
and index.json lists them for the page.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Ticker:
    """One tracked instrument. Symbols follow Yahoo Finance conventions."""

    symbol: str  # Yahoo symbol, e.g. "^JKSE", "BBCA.JK", "IDR=X"
    display_name: str  # Shown on the page
    kind: str  # "index" | "fx" | "stock"
    tz: str | None = None  # Exchange time zone, used to drop an unfinished daily bar
    close_time: str | None = None  # Local time ("HH:MM") after which today's bar is final
    stooq: str | None = None  # Stooq symbol when it differs from symbol.lower()
    note: str = ""  # One sentence shown under the status line


UNIVERSE: list[Ticker] = [
    Ticker(
        symbol="^JKSE",
        display_name="IHSG",
        kind="index",
        tz="Asia/Jakarta",
        close_time="16:30",
        note="IDX Composite, the broad Indonesian stock market index.",
    ),
    Ticker(
        symbol="^GSPC",
        display_name="S&P 500",
        kind="index",
        tz="America/New_York",
        close_time="16:30",
        stooq="^spx",
        note="Large-cap US stocks, the usual reference for global risk appetite.",
    ),
    Ticker(
        symbol="IDR=X",
        display_name="USD/IDR",
        kind="fx",
        stooq="usdidr",
        note="Rupiah per dollar, so an uptrend here means the rupiah is weakening.",
    ),
    # LQ45 names go here once the page can handle a longer list, e.g.
    # Ticker("BBCA.JK", "BCA", "stock", tz="Asia/Jakarta", close_time="16:30"),
]


def safe_filename(symbol: str) -> str:
    """Yahoo symbol to a file-safe stem: ^JKSE -> _JKSE, BBCA.JK -> BBCA_JK, IDR=X -> IDR_X."""
    return symbol.replace("^", "_").replace(".", "_").replace("=", "_")
