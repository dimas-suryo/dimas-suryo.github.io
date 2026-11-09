"""Tests for the Remarks decoder. The codes are synthetic but follow the 2026 layout."""
from __future__ import annotations

import pandas as pd
import pytest

from tools.investability_monitor.remarks import check_layout, decode, decode_frame, has_notation


def code(*, ca: str = "--", pos2: str = "M", cont: str = "O", board: str = "1", flags: str = "000000000",
         ic: str = "A121", notes: dict[int, str] | None = None) -> str:
    tail = ["-"] * 12
    for pos, letter in (notes or {}).items():
        tail[pos - 18] = letter
    s = ca + pos2 + cont + board + flags + ic + "".join(tail)
    assert len(s) == 30
    return s


MAIN = code()
WATCH = code(pos2="U", cont="-", board="4", notes={29: "X"})
TROUBLED = code(pos2="U", board="2", ic="E743", notes={18: "M", 19: "E", 21: "L", 25: "Y"})
EX_BONUS = code(ca="XB", pos2="U", cont="-", board="3", ic="K211")


class TestDecode:
    def test_plain_main_board(self):
        r = decode(MAIN)
        assert r.version == "v30" and r.board == "main" and r.continuous is True
        assert r.idx_ic == "A121" and r.notations == frozenset()
        assert r.ca_phase is None and r.ca_kind is None
        assert r.unknown == "M000000000"

    def test_special_monitoring(self):
        r = decode(WATCH)
        assert r.board == "special_monitoring" and r.continuous is False and r.notations == {"X"}

    def test_notations_from_several_positions(self):
        assert decode(TROUBLED).notations == {"M", "E", "L", "Y"}

    @pytest.mark.parametrize("ca, phase, kind", [("CD", "cum", "dividend"), ("XD", "ex", "dividend"),
                                                 ("CR", "cum", "rights"), ("XB", "ex", "bonus")])
    def test_corporate_actions(self, ca, phase, kind):
        r = decode(code(ca=ca))
        assert (r.ca_phase, r.ca_kind) == (phase, kind)

    def test_a_new_notation_is_still_captured(self):
        # Notation P (free float below the rule) had not appeared yet on 6 Nov 2026.
        assert "P" in decode(code(notes={24: "P"})).notations

    def test_unknown_board_keeps_its_code(self):
        r = decode(code(board="7"))
        assert r.board is None and r.board_code == "7"

    def test_bad_industry_code(self):
        assert decode(code(ic="Z999")).idx_ic is None

    @pytest.mark.parametrize("raw", ["--S1K--1", "", None])
    def test_legacy_and_empty(self, raw):
        r = decode(raw)
        assert r.version == "legacy" and r.board is None and r.notations == frozenset()
        assert r.raw == (raw or "")


class TestDecodeFrame:
    def test_matches_scalar_decode(self):
        raws = [MAIN, WATCH, TROUBLED, EX_BONUS, "--S1K--1"]
        out = decode_frame(pd.DataFrame({"remarks": raws}))
        for raw, (_, row) in zip(raws, out.iterrows()):
            r = decode(raw)
            assert row["remarks_version"] == r.version
            assert row["notations"] == "".join(sorted(r.notations))
            if r.version == "v30":
                assert row["board"] == r.board and row["idx_ic"] == r.idx_ic
                assert bool(row["continuous"]) == r.continuous
                assert row["ca_phase"] == r.ca_phase and row["ca_kind"] == r.ca_kind
            else:
                assert pd.isna(row["board_code"]) and pd.isna(row["continuous"])

    def test_has_notation(self):
        out = decode_frame(pd.DataFrame({"remarks": [MAIN, WATCH, TROUBLED]}))
        assert list(has_notation(out, "X")) == [False, True, False]
        assert list(has_notation(out, "L")) == [False, False, True]


class TestCheckLayout:
    def test_consistent_day_has_no_problems(self):
        assert check_layout(decode_frame(pd.DataFrame({"remarks": [MAIN, WATCH, TROUBLED, EX_BONUS]}))) == []

    def test_x_off_the_watchlist_board_is_reported(self):
        odd = code(notes={29: "X"})  # board 1 but notation X
        problems = check_layout(decode_frame(pd.DataFrame({"remarks": [MAIN, odd]})))
        assert any("notation X" in p for p in problems)

    def test_new_economy_board_lines_up_with_notations_i_and_k(self):
        ok = [code(board="5", ic="I111", notes={28: "I"}), code(board="5", notes={28: "K"}), MAIN]
        assert check_layout(decode_frame(pd.DataFrame({"remarks": ok}))) == []
        odd = [code(board="5"), code(board="2", notes={28: "I"})]
        problems = check_layout(decode_frame(pd.DataFrame({"remarks": odd})))
        assert any("I/K" in p and "2 stocks" in p for p in problems)

    def test_format_drift_is_reported(self):
        problems = check_layout(decode_frame(pd.DataFrame({"remarks": [MAIN, code(board="7"), "--S1K--1"]})))
        assert any("unknown board" in p for p in problems)
        assert any("not 30 characters" in p for p in problems)

    def test_half_a_corporate_action(self):
        problems = check_layout(decode_frame(pd.DataFrame({"remarks": [code(ca="C-")]})))
        assert any("pair" in p for p in problems)
