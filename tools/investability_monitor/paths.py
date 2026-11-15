"""Where data lives.

Raw and manual data are never under static/ and never committed. Locally the
default is .data/investability-monitor/ at the repo root, which is gitignored.
GitHub Actions caches the Yahoo folder between runs. INVESTABILITY_DATA
overrides the location.

    <data dir>/yahoo/YYYY/YYYY-MM.csv.gz     daily prices from Yahoo, one file per month
    <data dir>/manual/ownership/             the monthly >1% workbooks and their .SOURCE.txt
    <data dir>/manual/investor-type/         the monthly investor-type files

Public, hand-kept lists (board membership, HSC stocks) are committed under
tools/investability_monitor/reference/, each row with its source.
"""
from __future__ import annotations

import os
from pathlib import Path

ENV_VAR = "INVESTABILITY_DATA"
DEFAULT = Path(".data") / "investability-monitor"
REFERENCE = Path(__file__).resolve().parent / "reference"


def data_dir() -> Path:
    return Path(os.environ.get(ENV_VAR) or DEFAULT)


def yahoo_dir(root: Path | None = None) -> Path:
    return (root if root is not None else data_dir()) / "yahoo"


def manual_dir(root: Path | None = None) -> Path:
    return (root if root is not None else data_dir()) / "manual"


def reference_dir() -> Path:
    return REFERENCE
