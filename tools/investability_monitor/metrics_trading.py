"""Trading-quality measures from daily prices, judged against the dated rulebook.

prepare(prices, boards) adds, per stock-day:
    prev_close    the stock's previous close in the data
    ret           close / prev_close - 1
    value         close x volume in rupiah (approximate: Yahoo has no traded value)
    board         from `boards` (code -> board label); "main" when a code is not listed
    lower, upper  that day's price limits from rules.price_limits; NaN when the rulebook
                  cannot price them (a reference below the board's minimum price)
    at_lower, at_upper  the close is within half a tick of a limit
    outside       the close is more than half a tick beyond a limit: a reference
                  price other than the previous close (ex-dates), or a bad print
    adjusted      a day before the stock's last split; Yahoo has rescaled its prices,
                  so they are off IDX's tick grid and its price bands
    usable        traded, has a previous close, not outside the limits
    limit_usable  usable, not adjusted, and the limits are known

A date that no rule covers (for example 2027 before IDX confirms the rule that
follows the temporary 7% lower limit) raises rules.RuleGapError. The build
stops rather than guess, because these rates feed the pre-registered verdict.

monthly(prepared, codes) aggregates per calendar month:
    stock_days      limit-usable stock-days
    limit_hit_rate  share of them closing at either limit; lower_ and upper_hit_rate
    amihud_median   median across stocks of the mean of |ret| / value in Rp billion,
                    for stocks with at least `min_days` usable days that month
    value_bn        value traded on usable days, Rp billion
turnover_share(prepared, codes) is the share of usable value traded in `codes`.

Board membership is a snapshot for now (a hand-kept list). For days a stock sat
on another board the limits are approximate; the `outside` flag catches the
worst of those.
"""
from __future__ import annotations

from typing import Iterable, Mapping

import numpy as np
import pandas as pd

from . import rules

MIN_DAYS = 10


def _limits(keys: pd.DataFrame) -> pd.DataFrame:
    """lower, upper and half-tick tolerances for rows of (date, prev_close, board).

    Rules change on a handful of dates, so limits are computed once per
    (rule in force, board, previous close) rather than once per row.
    """
    rule_of = {}
    for d, b in keys[["date", "board"]].drop_duplicates().itertuples(index=False):
        day = d.date()
        rule_of[(d, b)] = (id(rules.price_limit_rule(day, b)), id(rules.tick_rule(day)))
    keys = keys.assign(rule=[rule_of[(d, b)] for d, b in zip(keys["date"], keys["board"])])

    table = []
    for d, prev, b, rule in keys.drop_duplicates(["rule", "prev_close", "board"])[
        ["date", "prev_close", "board", "rule"]
    ].itertuples(index=False):
        day = d.date()
        try:
            lo, up = rules.price_limits(day, prev, b)
            tol_lo, tol_up = rules.tick_size(day, lo) / 2, rules.tick_size(day, up) / 2
        except ValueError:  # e.g. a split-adjusted reference below the board minimum
            lo = up = tol_lo = tol_up = np.nan
        table.append((rule, prev, b, lo, up, tol_lo, tol_up))
    table = pd.DataFrame(table, columns=["rule", "prev_close", "board", "lower", "upper", "tol_lo", "tol_up"])
    out = keys.reset_index().merge(table, on=["rule", "prev_close", "board"], how="left").set_index("index")
    return out[["lower", "upper", "tol_lo", "tol_up"]]


def prepare(prices: pd.DataFrame, boards: Mapping[str, str] | None = None) -> pd.DataFrame:
    """Per stock-day returns, value, limits and the flags the metrics filter on."""
    df = prices.sort_values(["code", "date"], kind="stable").reset_index(drop=True).copy()
    df["prev_close"] = df.groupby("code")["close"].shift(1)
    df["ret"] = df["close"] / df["prev_close"] - 1
    df["value"] = df["close"] * df["volume"]
    df["board"] = df["code"].map(dict(boards or {})).fillna("main")

    has_prev = df["prev_close"].notna() & (df["prev_close"] > 0)
    lim = _limits(df.loc[has_prev, ["date", "prev_close", "board"]])
    df = df.join(lim)

    df["at_lower"] = (df["close"] <= df["lower"] + df["tol_lo"]).fillna(False).astype(bool)
    df["at_upper"] = (df["close"] >= df["upper"] - df["tol_up"]).fillna(False).astype(bool)
    df["outside"] = (
        (df["close"] < df["lower"] - df["tol_lo"]) | (df["close"] > df["upper"] + df["tol_up"])
    ).fillna(False).astype(bool)

    last_split = df.loc[df["split"] != 0].groupby("code")["date"].max()
    df["adjusted"] = (df["date"] < df["code"].map(last_split)).fillna(False).astype(bool)

    df["usable"] = (df["volume"] > 0) & has_prev & ~df["outside"]
    df["limit_usable"] = df["usable"] & ~df["adjusted"] & df["lower"].notna()
    return df


def _subset(df: pd.DataFrame, codes: Iterable[str] | None) -> pd.DataFrame:
    return df if codes is None else df[df["code"].isin(set(codes))]


def monthly(df: pd.DataFrame, codes: Iterable[str] | None = None, *, min_days: int = MIN_DAYS) -> pd.DataFrame:
    """Monthly limit-hit rates, Amihud illiquidity and value traded, for all stocks or `codes`."""
    d = _subset(df, codes)

    lim = d[d["limit_usable"]]
    lm = lim["date"].dt.to_period("M")
    g = lim.groupby(lm)
    hits = pd.DataFrame(
        {
            "stock_days": g.size(),
            "limit_hit_rate": (lim["at_lower"] | lim["at_upper"]).groupby(lm).mean(),
            "lower_hit_rate": g["at_lower"].mean(),
            "upper_hit_rate": g["at_upper"].mean(),
        }
    )

    u = d[d["usable"] & (d["value"] > 0)]
    um = u["date"].dt.to_period("M")
    ratio = u["ret"].abs() / (u["value"] / 1e9)
    per_stock = ratio.groupby([um, u["code"]]).agg(["mean", "size"])
    per_stock = per_stock[per_stock["size"] >= min_days]
    liquidity = pd.DataFrame(
        {
            "amihud_median": per_stock["mean"].groupby(level=0).median(),
            "value_bn": u.groupby(um)["value"].sum() / 1e9,
        }
    )
    out = hits.join(liquidity, how="outer")
    out["stock_days"] = out["stock_days"].fillna(0).astype(int)
    out.index.name = "month"
    return out


def turnover_share(df: pd.DataFrame, codes: Iterable[str]) -> pd.Series:
    """Monthly share of usable value traded in `codes`."""
    u = df[df["usable"]]
    m = u["date"].dt.to_period("M")
    total = u.groupby(m)["value"].sum()
    part = u[u["code"].isin(set(codes))].groupby(m)["value"].sum().reindex(total.index, fill_value=0.0)
    share = (part / total.replace(0, np.nan)).rename("turnover_share")
    share.index.name = "month"
    return share
