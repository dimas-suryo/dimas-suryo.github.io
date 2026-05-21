"""Tickers yang di-track Regime Radar.

Untuk v0: hanya IDX Composite. Ekstensi nanti (mis. LQ45 constituents) cukup
tambah baris di UNIVERSE — semua kode lain agnostic terhadap jumlah ticker.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Ticker:
    """Satu instrumen yang di-track. Konvensi Yahoo Finance (.JK suffix untuk IDX stock)."""

    symbol: str  # Yahoo symbol, mis. "^JKSE", "BBCA.JK"
    display_name: str  # Untuk UI, mis. "IDX Composite", "BCA"
    kind: str  # "index" | "stock"


UNIVERSE: list[Ticker] = [
    Ticker(symbol="^JKSE", display_name="IDX Composite", kind="index"),
    # v1+: tambah LQ45 / IDX30 constituents di sini. Tidak perlu ubah file lain.
    # Ticker("BBCA.JK", "BCA", "stock"),
    # Ticker("BBRI.JK", "BRI", "stock"),
    # Ticker("TLKM.JK", "Telkom", "stock"),
]


def safe_filename(symbol: str) -> str:
    """Konversi Yahoo symbol → string aman buat nama file.

    ^JKSE   -> _JKSE
    BBCA.JK -> BBCA_JK
    """
    return symbol.replace("^", "_").replace(".", "_")
