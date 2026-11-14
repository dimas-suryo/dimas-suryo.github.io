"""Where raw and manual data live. Never under static/ and never committed.

Locally the default is .data/investability-monitor/ at the repo root, which is
gitignored. In GitHub Actions the private data repo is checked out and its path
goes in INVESTABILITY_DATA.

    <data dir>/yahoo/YYYY/YYYY-MM.csv.gz     daily prices from Yahoo, one file per month
    <data dir>/manual/ownership/             the monthly >1% workbooks, as downloaded from IDX
    <data dir>/manual/investor-type/         the monthly investor-type files, as downloaded
    <data dir>/reference/                    hand-kept lists (HSC stocks, board membership)
"""
from __future__ import annotations

import os
from pathlib import Path

ENV_VAR = "INVESTABILITY_DATA"
DEFAULT = Path(".data") / "investability-monitor"


def data_dir() -> Path:
    return Path(os.environ.get(ENV_VAR) or DEFAULT)


def yahoo_dir(root: Path | None = None) -> Path:
    return (root if root is not None else data_dir()) / "yahoo"


def manual_dir(root: Path | None = None) -> Path:
    return (root if root is not None else data_dir()) / "manual"


def reference_dir(root: Path | None = None) -> Path:
    return (root if root is not None else data_dir()) / "reference"
