"""Tests for the Atom feeds of regime changes."""
from __future__ import annotations

import json
import xml.etree.ElementTree as ET

import numpy as np
import pandas as pd
import pytest

from tools.regime_radar.build import build_payload, main, write_payload
from tools.regime_radar.feed import MAX_ENTRIES, build_feed, site_meta, switches, write_feeds
from tools.regime_radar import build as build_mod
from tools.regime_radar.universe import Ticker

NS = {"a": "http://www.w3.org/2005/Atom"}


def _payload(symbol="^T", name="Test", seed=3, n=252 * 12):
    rng = np.random.default_rng(seed)
    c = 1000 * np.exp(np.cumsum(rng.normal(0.0003, 0.013, n)))
    px = pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0},
                      index=pd.bdate_range("2010-01-04", periods=n))
    return build_payload(Ticker(symbol, name, "index"), prices=px)


@pytest.fixture(scope="module")
def two():
    return [_payload("^A", "Alpha", seed=1), _payload("^B", "Beta", seed=2)]


def _parse(xml: str):
    return ET.fromstring(xml.encode())


class TestSwitches:
    def test_matches_label_changes(self, two):
        p = two[0]
        sw = switches(p)
        for sig in ("trend", "vol"):
            lab = p["series"][f"{sig}_regime"]
            expected = sum(1 for i in range(1, len(lab)) if lab[i] != lab[i - 1])
            assert sum(1 for x in sw if x["signal"] == sig) == expected
        assert all(x["old"] != x["new"] for x in sw)
        assert [x["date"] for x in sw] == sorted(x["date"] for x in sw)


class TestFeed:
    def test_is_valid_atom_with_required_elements(self, two):
        root = _parse(build_feed(two, "https://example.com/", "Site", "feed.xml", "T"))
        assert root.tag == "{http://www.w3.org/2005/Atom}feed"
        for tag in ("id", "title", "updated", "author"):
            assert root.find(f"a:{tag}", NS) is not None, tag
        entries = root.findall("a:entry", NS)
        assert 0 < len(entries) <= MAX_ENTRIES
        for e in entries:
            for tag in ("id", "title", "updated", "summary"):
                assert e.find(f"a:{tag}", NS) is not None, tag

    def test_newest_first_and_feed_updated_is_newest_entry(self, two):
        root = _parse(build_feed(two, "https://example.com/", "Site", "feed.xml", "T"))
        ups = [e.find("a:updated", NS).text for e in root.findall("a:entry", NS)]
        assert ups == sorted(ups, reverse=True)
        assert root.find("a:updated", NS).text == ups[0]

    def test_ids_unique_and_stable(self, two):
        a = build_feed(two, "https://example.com/", "Site", "feed.xml", "T")
        b = build_feed(two, "https://example.com/", "Site", "feed.xml", "T")
        assert a == b, "same input must give byte-identical output, or the bot commits every day"
        ids = [e.find("a:id", NS).text for e in _parse(a).findall("a:entry", NS)]
        assert len(ids) == len(set(ids))
        assert all(i.startswith("tag:example.com,2026:regime-radar/") for i in ids)

    def test_entry_text_is_descriptive_and_carries_disclaimer(self, two):
        root = _parse(build_feed(two, "https://example.com/", "Site", "feed.xml", "T"))
        for e in root.findall("a:entry", NS):
            text = e.find("a:summary", NS).text
            assert "not investment advice" in text
            assert "after three trading days" in text
            for word in ("buy", "sell", "should"):
                assert f" {word} " not in f" {text.lower()} "

    def test_vol_entry_names_the_right_band(self, two):
        root = _parse(build_feed(two, "https://example.com/", "Site", "feed.xml", "T", max_entries=500))
        for e in root.findall("a:entry", NS):
            title, text = e.find("a:title", NS).text, e.find("a:summary", NS).text
            if "volatility changed" in title:
                new = title.rsplit(" ", 1)[-1]
                phrase = {"low": "below the low cut", "mid": "inside the middle band", "high": "above the high cut"}[new]
                assert phrase in text

    def test_links_use_site_base(self, two):
        root = _parse(build_feed(two, "https://example.com/", "Site", "f.xml", "T"))
        hrefs = {l.get("rel"): l.get("href") for l in root.findall("a:link", NS)}
        assert hrefs["self"] == "https://example.com/data/regime-radar/f.xml"
        assert hrefs["alternate"] == "https://example.com/projects/regime-radar/"

    def test_empty_input_still_valid(self):
        root = _parse(build_feed([], "https://example.com/", "Site", "feed.xml", "T"))
        assert root.findall("a:entry", NS) == []


class TestSiteMeta:
    def test_reads_hugo_toml(self, tmp_path):
        f = tmp_path / "hugo.toml"
        f.write_text("baseURL = 'https://x.org'\ntitle = 'X'\n")
        assert site_meta(f) == ("https://x.org/", "X")

    def test_falls_back_when_missing(self, tmp_path):
        base, title = site_meta(tmp_path / "nope.toml")
        assert base.startswith("https://") and title


class TestWriteFeeds:
    def test_combined_and_per_asset_files(self, two, tmp_path):
        for p in two:
            write_payload(p, tmp_path)
        uni = [Ticker("^A", "Alpha", "index"), Ticker("^B", "Beta", "index"), Ticker("^C", "Gamma", "index")]
        names = sorted(p.name for p in write_feeds(tmp_path, uni))
        assert names == ["feed-_A.xml", "feed-_B.xml", "feed.xml"]  # ^C has no payload
        one = _parse((tmp_path / "feed-_A.xml").read_text())
        assert all(e.find("a:title", NS).text.startswith("Alpha ") for e in one.findall("a:entry", NS))

    def test_unchanged_feed_is_not_rewritten(self, two, tmp_path):
        write_payload(two[0], tmp_path)
        uni = [Ticker("^A", "Alpha", "index")]
        write_feeds(tmp_path, uni)
        before = (tmp_path / "feed.xml").stat().st_mtime_ns
        write_feeds(tmp_path, uni)
        assert (tmp_path / "feed.xml").stat().st_mtime_ns == before

    def test_build_main_writes_feeds(self, tmp_path, monkeypatch):
        rng = np.random.default_rng(1)
        c = 1000 * np.exp(np.cumsum(rng.normal(0.0003, 0.013, 252 * 8)))
        px = pd.DataFrame({"open": c, "high": c, "low": c, "close": c, "volume": 0},
                          index=pd.bdate_range("2010-01-04", periods=len(c)))
        monkeypatch.setattr(build_mod, "fetch_prices", lambda s, start, stooq_symbol=None: px)
        assert main(universe=[Ticker("^OK", "Ok", "index")], out_dir=tmp_path) == 0
        assert (tmp_path / "feed.xml").exists() and (tmp_path / "feed-_OK.xml").exists()
