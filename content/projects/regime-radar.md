---
title: "Regime Radar"
date: 2025-05-20
draft: false
summary: "IDX Composite market regime dashboard based on two signals: volatility quantile and trend rule, updated daily via GitHub Actions."
status: "live"
stack: ["Python", "pandas", "yfinance", "GitHub Actions", "Plotly.js"]
---

The question regime detection aims to answer is simple: **"What market conditions are we in today?"** Not "where will it go tomorrow", that's a whole different topic from what this model is trying to answer.

{{< regime-radar tickers="^JKSE" >}}

## What we'll see

Two panels, two simple independent signals:

**Trend regime** (top panel, based on price): closed-form classification using MA crossover + slope. Date `t` is labeled _up_ if close is above MA200, MA50 is above MA200, and MA200 slope over the last 60 days is positive. _Down_ if all three conditions are negative. Everything else is _sideways_. No quantiles, no fitting, no lookahead, just pure rule.

**Vol regime** (bottom panel, based on realized volatility): realized vol = 21-day rolling std of returns, annualized. Each date is labeled _low / mid / high_ based on the 33/67 quantile from the trailing 5 years (shifted 1 day so today's label only sees data up to yesterday, strictly no lookahead).

The colored bands behind the line are not decoration, they are the signal itself. The line is just a visual reference.

## Why rule-based, not HMM

A philosophical choice, not a technical one. HMM (hidden Markov model) for regime detection sounds sophisticated and appears in many papers, but it has several practical problems that often go unmentioned:

1. **Labels are unstable.** Refitting with one extra day of data can flip the entire historical regime labeling. A reader who saw the chart yesterday will be confused when today's chart says the opposite.
2. **Re-numbering across fits.** "State 0" today can become "state 1" tomorrow, semantic mapping to "bull/bear" must be done post-hoc with manual rules.
3. **Overstated confidence.** Probabilistic output (e.g., "82% high-vol regime") sounds precise, but that precision is mostly an artifact of model assumptions (Gaussian, stationary transition matrix) that don't hold in real markets.

Rule-based trades "feels sophisticated" for "reproducible and auditable." Anyone can verify: take today's IDX price, calculate MA200 and MA50, check the slope. Same result every time. That's what I want from a published signal.

HMM or Markov-switching might go in as a third panel in v2, explicitly framed as an experiment that readers can choose to trust or not.

## What this is NOT

Important:

- **Not investment advice.** Nothing here says "buy because regime is up" or "sell because vol is high." Regime is context, not an entry/exit signal.
- **Not predictive.** Today's vol regime is descriptive of vol that has _already been realized_ over the last 21 days. There is no claim about tomorrow's vol.
- **Not robust to structural gaps.** The quantile baseline uses trailing 5 years. If IDX volatility regime shifts permanently (e.g., due to structural market changes), the labeling will lag.
- **Not real precision.** Categorical labels (low/mid/high) deliberately hide false precision. Realized vol of 14.9% vs 15.1% might fall in different regimes, but the difference is within noise.

## Parameters & source

| Parameter             | Value                                     | Rationale                                                              |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| Vol window            | 21 days (~1 month trading)                | Standard realized vol monthly                                          |
| Vol quantile breaks   | 33%, 67%                                  | Tertile — roughly evenly spaced on normal baseline                     |
| Vol quantile lookback | 252×5 days (~5 years)                     | Enough to capture full cycles, not so long as to miss structural shift |
| Trend short MA        | 50 days                                   | Industry convention                                                    |
| Trend long MA         | 200 days                                  | Industry convention (Hindenburg, etc.)                                 |
| Trend slope window    | 60 days                                   | ~quarter                                                               |
| Data                  | `^JKSE` daily close via yfinance          | Free, sufficient for daily index                                       |
| Refresh               | 05:30 WIB weekday via GitHub Actions cron | After US close, before IDX opens                                       |

All parameters are in [`tools/regime_radar/build.py`](https://github.com/dimas-suryo/dimas-suryo.github.io/blob/main/tools/regime_radar/build.py) — the `PARAMS` dict. Want to compare with different rules? Fork and change one number.

## Data caveat

`yfinance` is a community scraper to Yahoo Finance's internal endpoints — not an official API. For daily `^JKSE` close, it's battle-tested and works most days, but there's the occasional breakage 1–2 times a year when Yahoo changes something. The failure mode for this dashboard: the page will still display the last successful JSON (maybe yesterday or 2 days ago), not crash. Recovery = upgrade yfinance and re-run the workflow.

## Roadmap

- **Universe LQ45**: pre-compute 45 large caps, dropdown selector. Same architecture, zero code refactor.
- **Multi-asset panel**: add S&P 500, USDIDR, gold, to see "what's the US regime, what's the IDX regime" side-by-side.
- **Stooq fallback** in `data.py`: defensive layer if yfinance is down.
- **Experimental HMM panel**: re-implement forward-backward in pure NumPy (since `hmmlearn` has a C-extension that's awkward in Pyodide), display with explicit caveats.
- **Regime statistics**: average duration each regime lasts, empirical transition probabilities.

Issues / PRs / suggestions very welcome.
