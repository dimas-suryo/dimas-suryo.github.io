---
title: "Regime Radar"
date: 2026-05-22
lastmod: 2026-09-26
draft: false
summary: "Daily trend and volatility regimes for IHSG, the S&P 500 and USD/IDR, from two plain rules you can check by hand."
status: "live"
stack: ["Python", "pandas", "yfinance", "GitHub Actions", "Plotly.js"]
repo: "https://github.com/dimas-suryo/dimas-suryo.github.io/tree/main/tools/regime_radar"
homepage_badge: "regime-radar"
feed: "/data/regime-radar/feed.xml"
---

Regime Radar answers one question: what kind of market are we in right now? It says nothing about tomorrow. Two rules sort every trading day into a trend label and a volatility label, and the chart shows how those labels have moved over the past two decades.

{{< regime-radar tickers="^JKSE,^GSPC,IDR=X" >}}

## How to read it

The trend label comes from price alone. A day is up when three things hold at once: the close is above its 200-day average, the 50-day average is above the 200-day average, and the 200-day average is higher than it was 60 trading days ago. A day is down when all three point the other way. Anything in between is sideways. There is nothing to fit or estimate, so you can check any day yourself in a spreadsheet.

The volatility label compares the last 21 trading days of realized volatility (the annualized standard deviation of daily log returns) with the previous five years. In the bottom third of that history it is low, in the top third it is high, and otherwise mid. The cut points for a given day only use data up to the day before, so today's reading is never part of its own yardstick.

Both labels then pass one more filter: a label only changes after the new reading has held for three trading days in a row. Before I added this, roughly 30% of all regime spells in the IHSG data lasted one or two days, mostly readings bouncing across a cut point. The cost is that a real switch shows up two days late. When today's reading disagrees with the label, the dashboard says so and counts the days.

Below the volatility panel, IHSG and the S&P 500 also get an experimental strip: the probability a two-state hidden Markov model gives to its turbulent state, as the model said it on each day at the time. It is a second opinion from a statistical model rather than a rule, refit every month on the data up to that point. It is left out for USD/IDR, where the model's turbulent state lasts only a few days, which makes it a detector of single jumps rather than a regime. The labels, the table and the feeds all come from the rules.

The table under the chart is the tool checking itself. For every labeled day it looks at what happened over the following 21 trading days, then groups those outcomes by the label the day had. A label that carries information should produce a row that looks different from the All days row. Volatility clusters (calm months tend to follow calm months, turbulent ones follow turbulent ones), so the volatility rows should separate clearly in the forward volatility column. Whether the trend rows separate is the more interesting question. As of September 2026 ([what that means](/blog/one-crisis-deep/)) they do not in the median return column in any of the three markets. On the S&P 500 the down rows are followed by clearly higher volatility, which fits a risk signal better than a return signal. Each cell carries a 95% interval from resampling whole episodes, and an asterisk marks a gap to All days that is outside its interval. Those intervals are still a little optimistic, because volatility clusters across episode boundaries and a forward window can spill into the next episode.

The obvious objection to any table like this is that the result might come from my choice of 50, 200 and 60. The repo includes a sensitivity script that reruns the same table with faster and slower averages, different cut points, no confirmation, a longer horizon, and each half of the history separately. If a result only shows up under one setting, I would not trust it.

The case for trend rules has never been a better typical month. Its proponents, with Faber (2007) as the usual reference, claim similar returns with smaller losses in the bad months. So the table has a 10th percentile column, which I added on 26 September 2026, after the median columns came up empty and before computing the new column on real data. The test is written into the code ahead of the answer: if IHSG's down row does not show a worse 10th percentile than All days, with an asterisk, the table cannot detect the effect, and the S&P 500 serves as the replication. A simulation run beforehand says the test is weak. With bear markets planted in synthetic prices it said yes in 1 of 12 runs, so a no would say more about how few downtrends twenty years contain than about the rule. The verdict is printed at the top of the sensitivity report, and the simulation is in the repo.

## Why rules and not a hidden Markov model

Hidden Markov models show up in most papers on regime detection. This section used to give three reasons against them. In September 2026 I finally tested all three on IHSG, and they held up less well than I had assumed:

1. The labels move when the model is refit. True, but it depends on the model. A two-state HMM refit every month relabeled a median of three past days out of thousands. A three-state one refit every six months relabeled a median of 61 days, and in one refit almost half of its history.
2. The states have no fixed meaning. True, and easy to fix: sort the states by volatility after each fit.
3. The probabilities look more precise than they are. Not supported. Within each state, IHSG returns are close to Gaussian, and when the real-time model was at least 90% sure of turbulence, its own later hindsight agreed every time.

What survives is simpler. A rule's label never changes after the fact, anyone can check it with a spreadsheet, and it can give three regimes without the instability that three HMM states bring. The price is that 50, 200 and 60 are conventions rather than estimates, and different choices would move some of the switch dates. I used the most common settings instead of tuning them to IHSG, and the table shows how they have done.

A two-state HMM run in real time is a reasonable alternative for telling calm from turbulent, which is why the dashboard now shows one as an experimental side panel, for the assets where the model finds lasting regimes.

## Limits

- It is not investment advice. A regime label is context and says nothing about what you should buy or sell.
- It describes what already happened. The volatility label summarizes the last 21 days and the trend label the last 200. The table shows what followed in the past, over a limited number of episodes in three markets.
- It is late by design. A 200-day average turns slowly and the confirmation rule adds two days on top, so the trend label calls a crash well after it started.
- The baseline drifts. The volatility cut points come from a rolling five-year window. If a market becomes permanently calmer or wilder, the labels take years to catch up.
- Cut points are sharp. 14.9% and 15.1% volatility can land in different bands although the difference is noise. Confirmation reduces the flicker this causes but does not make the line any less arbitrary.

## Parameters

| Parameter             | Value                                   | Why                                                                                               |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Volatility window     | 21 trading days                         | About one month                                                                                   |
| Volatility cut points | 33rd and 67th percentile                | Thirds of the baseline window                                                                     |
| Volatility baseline   | 1,260 trading days (5 years)            | Long enough to contain a full stress episode, short enough to adapt when a market changes         |
| Short average         | 50 days                                 | Common convention                                                                                 |
| Long average          | 200 days                                | The most widely used long-run trend filter; the 10-month average in Faber (2007) is about as long |
| Slope window          | 60 days                                 | About one quarter                                                                                 |
| Confirmation          | 3 days                                  | Removes one- and two-day flips; real switches show up two days late                               |
| History               | From 2000, or as far back as Yahoo goes | The first five years go into the volatility baseline, so labels start about five years later      |
| Refresh               | 05:30 WIB, Monday to Friday             | After the US close and before the IDX opens                                                       |

All of these live in the `PARAMS` dict in [`tools/regime_radar/build.py`](https://github.com/dimas-suryo/dimas-suryo.github.io/blob/main/tools/regime_radar/build.py), and every JSON file records the values that produced it. To test a different rule, fork the repo and change one number.

## Data

Prices come from `yfinance`, a community scraper for Yahoo Finance's internal endpoints rather than an official API. For daily closes it works most days and breaks once or twice a year when Yahoo changes something. When that happens the page keeps showing the last good file, and a banner appears once the latest close is more than ten days old. Stooq is wired in as a backup source, though I have not yet confirmed that it carries every series here.

Two cleaning steps run before any label is computed. If the build runs while a market is still open, today's intraday price is dropped, so no label is ever computed from a close that has not happened yet. Bad prints are removed: a close that sits far from the median of the surrounding month, with the bar raised in turbulent months so that real crash days survive. On the current history that removes a handful of USD/IDR quotes, mostly one wrong value that kept reappearing in late 2013, and nothing from IHSG or the S&P 500. Weekend bars, which Yahoo sometimes emits for FX, are dropped too. Every JSON file lists what was removed under `meta.cleaning`, and every monthly model behind the experimental strip is published in `hmm-<symbol>.json` next to it. Yahoo's USD/IDR history is still the least reliable of the three series.

If you would rather be told than check, there is an Atom feed of regime changes, with one entry each time a label switches: [all three assets](/data/regime-radar/feed.xml), or just [IHSG](/data/regime-radar/feed-_JKSE.xml), the [S&P 500](/data/regime-radar/feed-_GSPC.xml) or [USD/IDR](/data/regime-radar/feed-IDR_X.xml). Any feed reader works, and an RSS-to-email service can turn it into email. Each entry says what changed and why, and nothing about what to do.

Every series can be downloaded as CSV from the link under the chart. The raw files are at `/data/regime-radar/`, and `index.json` there lists each asset with its latest labels.

## Roadmap

Nothing big is planned. The dashboard is in maintenance mode: the daily build keeps running, and I rerun the sensitivity report once a year or after the next large drawdown, because the pre-registered test can only be settled by a history with more than one crisis in it.

Not planned: LQ45 constituents, or an LQ45 breadth signal such as the share of LQ45 stocks in an uptrend. It would be another trend-based signal, and the trend label has shown no information about IHSG's next-month return. Its history would also be biased upward, because building it from today's constituents leaves out the stocks that fell out of the index.

## Changes

- September 2026: history now goes back to 2000 (before, the chart started in December 2021, because half of the ten fetched years went into the baseline). Added the three-day confirmation rule, the S&P 500 and USD/IDR, today's rule inputs, the "what followed" table and CSV download. The chart now follows the site's light and dark theme without a reload. Later the same month: bootstrap intervals in the table, a sensitivity script, a pre-registered 10th percentile test, today's rows marked in the table, and feeds of regime changes. Then a test of the HMM claims in this page, which corrected two of them. Then the experimental HMM strip. Later still: the status line shows how far the price has moved since the trend label changed, and the roadmap says what is not planned.

Issues and pull requests are welcome on [GitHub](https://github.com/dimas-suryo/dimas-suryo.github.io/issues).
