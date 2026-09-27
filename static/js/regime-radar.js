/* Regime Radar, client-side renderer.
 *
 * For every .regime-radar element on the page:
 *   1. Loads index.json (latest reading of every ticker) to draw the asset tiles.
 *   2. Loads the selected ticker's full JSON on demand and caches it.
 *   3. Renders a status line, today's rule inputs, a two-panel chart with
 *      regime bands, a legend, and the "what followed" table.
 * The chart redraws when the site theme is toggled.
 *
 * Needs Plotly.js (basic bundle), loaded by the Hugo shortcode.
 */
(function () {
  "use strict";

  const TREND = {
    up: { name: "Up", color: "#16a34a", opacity: 0.16 },
    sideways: { name: "Sideways", color: "#94a3b8", opacity: 0.1 },
    down: { name: "Down", color: "#dc2626", opacity: 0.16 },
  };
  // Volatility is ordered (low < mid < high), so it gets one hue at three strengths.
  const VOL_RGB = "245, 158, 11";
  const VOL = {
    low: { name: "Low", band: 0.03, dot: 0 },
    mid: { name: "Mid", band: 0.12, dot: 0.6 },
    high: { name: "High", band: 0.26, dot: 1 },
  };
  // The model panel gets its own colour, so it never reads as one of the rule-based labels.
  const HMM_COLOR = "#8b5cf6";
  const RANGES = [["1Y", 1], ["5Y", 5], ["10Y", 10], ["All", null]];
  const DEFAULT_YEARS = 5;
  const STALE_DAYS = 10; // Lebaran closes the IDX for about a week, so 7 would cry wolf
  const VERY_STALE_DAYS = 21;
  const MAX_TILES = 6;
  const LOCALE = "en-US";

  // ---------- small helpers ----------

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const isNum = (x) => typeof x === "number" && isFinite(x);

  const fmtNum = (x, d = 2) =>
    isNum(x) ? x.toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }) : "n/a";

  // Rounds first so a value like -0.0004 prints as 0.0%, not -0.0%.
  const fmtPct = (x, d = 1) => {
    if (!isNum(x)) return "n/a";
    const v = Number((x * 100).toFixed(d));
    return (v === 0 ? 0 : v).toFixed(d) + "%";
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // "25 Sep 2026". Built by hand because en-GB prints "Sept" in newer browsers.
  const fmtDate = (iso) => {
    if (!iso) return "n/a";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  function fmtLocalTime(isoTs) {
    const t = new Date(isoTs);
    if (isNaN(t)) return "n/a";
    const pad = (n) => String(n).padStart(2, "0");
    const tz = (new Intl.DateTimeFormat(LOCALE, { timeZoneName: "short" })
      .formatToParts(t).find((x) => x.type === "timeZoneName") || {}).value || "";
    return `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}, ${pad(t.getHours())}:${pad(t.getMinutes())} ${tz}`.trim();
  }

  const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso + "T00:00:00Z")) / 86400000);

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const slug = (symbol) => symbol.replace(/\^/g, "_").replace(/\./g, "_").replace(/=/g, "_");

  const cssVar = (name, fallback) =>
    getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function theme() {
    const light = document.body.classList.contains("light");
    return {
      fg: cssVar("--text-color", light ? "#333333" : "#ffffff"),
      accent: cssVar("--link-color", light ? "#007acc" : "#1da1f2"),
      grid: light ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)",
      muted: light ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)",
    };
  }

  const trendDot = (lab) =>
    TREND[lab] ? `<span class="regime-radar__dot" style="background:${TREND[lab].color}"></span>` : "";

  // Low volatility is drawn as a ring, so it stays visible on a dark background.
  const volDot = (lab) =>
    VOL[lab]
      ? `<span class="regime-radar__dot" style="background:rgba(${VOL_RGB},${VOL[lab].dot});box-shadow:inset 0 0 0 1.5px rgb(${VOL_RGB})"></span>`
      : "";

  // ---------- data loading ----------

  async function fetchJSON(url) {
    let res;
    try {
      res = await fetch(url, { cache: "no-cache" });
    } catch (e) {
      throw { kind: "network", url };
    }
    if (res.status === 404) throw { kind: "missing", url };
    if (!res.ok) throw { kind: "http", url, status: res.status };
    try {
      return await res.json();
    } catch (e) {
      throw { kind: "malformed", url, reason: "not valid JSON" };
    }
  }

  function validatePayload(p) {
    if (!p || !p.meta || !p.series || !p.latest) {
      throw { kind: "malformed", reason: "missing meta, series or latest" };
    }
    const s = p.series;
    const n = Array.isArray(s.date) ? s.date.length : 0;
    if (!n) throw { kind: "malformed", reason: "empty series" };
    for (const k of ["close", "realized_vol", "vol_regime", "trend_regime"]) {
      if (!Array.isArray(s[k]) || s[k].length !== n) {
        throw { kind: "malformed", reason: `series.${k} does not match series.date` };
      }
    }
    return p;
  }

  function describeError(err) {
    switch (err && err.kind) {
      case "missing": return "The data file has not been generated yet.";
      case "network": return "Could not reach the server. Check your connection and reload.";
      case "http": return `The server answered with HTTP ${err.status}.`;
      case "malformed": return `The data file is damaged (${err.reason}).`;
      default: return String((err && (err.message || err.reason)) || err || "Unknown error.");
    }
  }

  // ---------- text blocks ----------

  // Price change since the current trend label began. Taken from the payload when
  // present, otherwise computed from the series, so older payloads still get it.
  function trendChange(p) {
    const l = p.latest;
    if (isNum(l.trend_change_since)) return l.trend_change_since;
    const s = p.series;
    const i = l.trend_since ? s.date.indexOf(l.trend_since) : -1;
    const a = i >= 0 ? s.close[i] : null;
    const b = s.close[s.close.length - 1];
    return isNum(a) && isNum(b) && a > 0 ? b / a - 1 : null;
  }

  const moveWords = (x) => {
    if (!isNum(x)) return "";
    if (Math.abs(x) < 0.0005) return "is roughly unchanged since then";
    return `is ${x > 0 ? "up" : "down"} ${Math.abs(x * 100).toFixed(1)}% since then`;
  };

  // A trend label compares the price with slow averages, so it can sit on a price
  // moving the other way for weeks. When that happens, say so next to the label.
  function lagHTML(p) {
    const l = p.latest;
    const x = trendChange(p);
    const longW = (p.meta.params || {}).trend_long || 200;
    const against = (l.trend_regime === "down" && x >= 0.01) || (l.trend_regime === "up" && x <= -0.01);
    if (!isNum(x) || !against) return "";
    return `The trend label compares the price with its ${longW}-day average, so it can lag a turn like this one for weeks.`;
  }

  function statusHTML(p) {
    const l = p.latest;
    const name = esc(p.meta.display_name || p.meta.symbol);
    const trendPhrase = { up: "in an uptrend", down: "in a downtrend", sideways: "moving sideways" }[l.trend_regime];
    const volPhrase = { low: "low", mid: "in its middle band", high: "high" }[l.vol_regime];

    let trend = "";
    if (trendPhrase) {
      const move = moveWords(trendChange(p));
      trend = isNum(l.trend_days)
        ? `${name} has been ${trendPhrase} for ${plural(l.trend_days, "trading day")}, since ${fmtDate(l.trend_since)}${move ? `, and ${move}` : ""}.`
        : `${name} is ${trendPhrase}.`;
    }
    let vol = "";
    if (volPhrase) {
      vol = l.vol_since
        ? ` Its volatility has been ${volPhrase} since ${fmtDate(l.vol_since)}.`
        : ` Its volatility is ${volPhrase}.`;
    }
    return trend + vol;
  }

  function pendingHTML(p) {
    const l = p.latest;
    const lines = [];
    const more = (pend) => {
      const left = pend.needed - pend.days;
      const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six"];
      const n = words[left] || String(left);
      return left === 1
        ? "One more day like it would switch the label."
        : `${n} more days like it would switch the label.`;
    };
    if (l.trend_pending && TREND[l.trend_pending.label]) {
      lines.push(`Today's trend reading is ${TREND[l.trend_pending.label].name.toLowerCase()}. ${more(l.trend_pending)}`);
    }
    if (l.vol_pending && VOL[l.vol_pending.label]) {
      lines.push(`Today's volatility reading is ${VOL[l.vol_pending.label].name.toLowerCase()}. ${more(l.vol_pending)}`);
    }
    return lines.map((t) => `<div>${esc(t)}</div>`).join("");
  }

  function staleInfo(p) {
    const age = daysAgo(p.latest.date);
    if (age <= STALE_DAYS) return null;
    return {
      cls: age > VERY_STALE_DAYS ? "regime-radar__stale regime-radar__stale--error" : "regime-radar__stale",
      text: `The latest close is from ${fmtDate(p.latest.date)}, ${age} days ago. Either the market has been closed or the daily update is failing.`,
    };
  }

  function inputsHTML(p) {
    const l = p.latest;
    const prm = p.meta.params || {};
    const shortW = prm.trend_short || 50;
    const longW = prm.trend_long || 200;
    const slopeW = prm.trend_slope_window || 60;
    const hasTrend = isNum(l.close) && isNum(l.ma_short) && isNum(l.ma_long) && isNum(l.ma_long_change);
    const hasVol = isNum(l.realized_vol_annualized) && isNum(l.vol_lo) && isNum(l.vol_hi);
    if (!hasTrend && !hasVol) return "";

    const check = (label, ok, detail) =>
      `<div class="regime-radar__row"><span>${esc(label)}</span><span><span class="${ok ? "is-yes" : "is-no"}">${ok ? "Yes" : "No"}</span>, ${esc(detail)}</span></div>`;
    const plain = (label, value) =>
      `<div class="regime-radar__row"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;

    let out = "";
    if (hasTrend) {
      const gapClose = l.close / l.ma_long - 1;
      const gapMA = l.ma_short / l.ma_long - 1;
      const slope = l.ma_long_change / (l.ma_long - l.ma_long_change);
      const side = (x) => `${Math.abs(x * 100).toFixed(1)}% ${x >= 0 ? "above" : "below"}`;
      out += `
        <div class="regime-radar__block">
          <div class="regime-radar__block-title">Trend rule on ${fmtDate(l.date)}</div>
          ${plain("Close", fmtNum(l.close))}
          ${check(`Close above ${longW}-day average`, gapClose > 0, side(gapClose))}
          ${check(`${shortW}-day above ${longW}-day average`, gapMA > 0, side(gapMA))}
          ${check(`${longW}-day average rising over ${slopeW} days`, slope > 0, `${slope >= 0 ? "up" : "down"} ${Math.abs(slope * 100).toFixed(1)}%`)}
          <div class="regime-radar__block-foot">Up needs three yes answers, down needs three no. Anything mixed is sideways.</div>
        </div>`;
    }
    if (hasVol) {
      const lookYears = Math.round((prm.vol_quantile_lookback || 1260) / 252);
      const q = prm.vol_quantile_breaks || [0.33, 0.67];
      out += `
        <div class="regime-radar__block">
          <div class="regime-radar__block-title">Volatility rule on ${fmtDate(l.date)}</div>
          ${plain(`Realized volatility, last ${prm.vol_window || 21} days`, fmtPct(l.realized_vol_annualized) + " a year")}
          ${plain("Low band ends at", fmtPct(l.vol_lo))}
          ${plain("High band starts at", fmtPct(l.vol_hi))}
          <div class="regime-radar__block-foot">The cut points are the ${Math.round(q[0] * 100)}th and ${Math.round(q[1] * 100)}th percentiles of the previous ${lookYears} years, so they drift slowly with the market.</div>
        </div>`;
    }
    return out;
  }

  // Only for volatility: it is the label with a result that holds up across
  // markets. The sentence says "not clearly different" when the row has no
  // asterisk, so it never claims more than the table shows.
  function todayVolHTML(p) {
    const st = p.stats;
    const lab = p.latest.vol_regime;
    const r = st && st.vol && st.vol.find((x) => x.label === lab);
    const base = st && st.all && st.all.median_vol;
    if (!r || !isNum(r.median_vol) || !isNum(base) || !VOL[lab]) return "";
    const h = st.horizon_days || 21;
    const gap = r.ci && r.ci.median_vol && r.ci.median_vol.gap_ci;
    const band = { low: "low", mid: "middle", high: "high" }[lab];
    let verb = "not clearly different from";
    if (gap && gap[0] > 0) verb = "higher than";
    else if (gap && gap[1] < 0) verb = "lower than";
    return `<div class="regime-radar__today-line">
      In the past, days in the ${band} volatility band were followed by a median volatility of
      ${fmtPct(r.median_vol)} over the next ${h} trading days, ${verb} ${fmtPct(base)} for all days.
    </div>`;
  }

  function tableHTML(p) {
    const st = p.stats;
    if (!st || !st.all || !st.trend || !st.vol) return "";
    const h = st.horizon_days || 21;
    const level = Math.round((st.ci_level || 0.95) * 100);
    const hasCI = !!(st.all.ci || st.trend.some((r) => r.ci) || st.vol.some((r) => r.ci));

    // One outcome cell: value, an asterisk if the gap to all days is outside
    // its interval, and the interval itself on a second line.
    const cell = (r, m, d, isBaseline) => {
      const c = r.ci && r.ci[m];
      const gap = c && c.gap_ci;
      const star = gap && (gap[0] > 0 || gap[1] < 0)
        ? `<span class="regime-radar__star" title="Gap to all days is outside its ${level}% interval">*</span>`
        : "";
      let band = "";
      if (c && c.ci) band = `<span class="regime-radar__ci">${fmtPct(c.ci[0], d)} to ${fmtPct(c.ci[1], d)}</span>`;
      else if (hasCI && !isBaseline) band = `<span class="regime-radar__ci">too few episodes</span>`;
      return `<td>${fmtPct(r[m], d)}${star}${band}</td>`;
    };
    const hasTail = st.all.p10_return !== undefined;
    const outcome = (r, isBaseline) =>
      cell(r, "median_return", 1, isBaseline) +
      (hasTail ? cell(r, "p10_return", 1, isBaseline) : "") +
      cell(r, "share_positive", 0, isBaseline) +
      cell(r, "median_vol", 1, isBaseline);
    const nOutcome = hasTail ? 4 : 3;

    // Rows matching today's labels are marked, so a visitor can find "days like today".
    const current = { trend: p.latest.trend_regime, vol: p.latest.vol_regime };
    const row = (r, dot, name, group) => {
      const now = current[group] === r.label;
      return `
      <tr${now ? ' class="is-current"' : ""}>
        <th scope="row">${dot}${esc(name)}${now ? '<span class="regime-radar__today">today</span>' : ""}</th>
        <td>${fmtPct(r.share, 0)}</td>
        <td>${r.episodes}</td>
        <td>${r.median_length == null ? "n/a" : plural(r.median_length, "day")}</td>
        ${r.days_with_future ? outcome(r, false) : `<td colspan="${nOutcome}" class="regime-radar__na">no history yet</td>`}
      </tr>`;
    };
    const group = (title) =>
      `<tr class="regime-radar__group"><th scope="rowgroup" colspan="${4 + nOutcome}">${esc(title)}</th></tr>`;

    const tailNote = hasTail
      ? ` The 10th percentile shows how bad a bad month was: one window in ten did worse.`
      : "";
    const note = hasCI
      ? `The ranges are ${level}% intervals from resampling whole episodes rather than days, because
         neighbouring days share most of their next ${h} days and are not independent evidence.
         An asterisk marks a gap to All days whose interval excludes zero. With this many cells, an
         asterisk or two can turn up by luck alone, so look for a pattern rather than a single star.
         Rows with fewer than five episodes get no range.${tailNote} This is the history of one
         market, not a forecast.`
      : `Neighbouring days share most of their next ${h} days, so the day counts overstate how much
         independent evidence there is; the episode count is closer to the real sample size. If a row
         looks like the All days row, that label told you nothing about what came next. This is the
         history of one market, not a forecast.`;

    return `
      <div class="regime-radar__table-title">What followed each regime</div>
      ${todayVolHTML(p)}
      <div class="regime-radar__table-intro">
        Every labeled day since ${fmtDate(st.first_date)}, grouped by its label, with what happened over the next ${h} trading days.
      </div>
      <div class="regime-radar__scroll">
        <table class="regime-radar__table">
          <thead>
            <tr>
              <th scope="col">Regime</th>
              <th scope="col">Time spent</th>
              <th scope="col">Episodes</th>
              <th scope="col">Median length</th>
              <th scope="col">Median return, next ${h}d</th>
              ${hasTail ? `<th scope="col">Bad month: 10th percentile, next ${h}d</th>` : ""}
              <th scope="col">Windows that ended up</th>
              <th scope="col">Median volatility, next ${h}d</th>
            </tr>
          </thead>
          <tbody>
            <tr class="regime-radar__baseline">
              <th scope="row">All days</th><td>100%</td><td></td><td></td>${outcome(st.all, true)}
            </tr>
            ${group("Trend")}
            ${st.trend.map((r) => row(r, trendDot(r.label), (TREND[r.label] || {}).name || r.label, "trend")).join("")}
            ${group("Volatility")}
            ${st.vol.map((r) => row(r, volDot(r.label), (VOL[r.label] || {}).name || r.label, "vol")).join("")}
          </tbody>
        </table>
      </div>
      <div class="regime-radar__table-note">${note}</div>`;
  }

  // ---------- chart ----------

  function bands(dates, labels, yref, fill) {
    const shapes = [];
    let start = 0;
    for (let i = 1; i <= labels.length; i++) {
      if (i === labels.length || labels[i] !== labels[start]) {
        const f = fill(labels[start]);
        if (f) {
          // Run the band up to the first day of the next run, so bands touch.
          shapes.push({
            type: "rect", xref: "x", yref, layer: "below",
            x0: dates[start], x1: dates[Math.min(i, labels.length - 1)], y0: 0, y1: 1,
            fillcolor: f, line: { width: 0 },
          });
        }
        start = i;
      }
    }
    return shapes;
  }

  // Plotly autorange looks at all data, not the visible window, so a 1Y view
  // would look flat. Compute the y ranges for the window by hand.
  function viewWindow(p, years, logScale) {
    const s = p.series;
    const dates = s.date;
    const n = dates.length;
    let i0 = 0;
    if (years) {
      const end = new Date(dates[n - 1] + "T00:00:00Z");
      const startIso = new Date(Date.UTC(end.getUTCFullYear() - years, end.getUTCMonth(), end.getUTCDate()))
        .toISOString().slice(0, 10);
      while (i0 < n - 1 && dates[i0] < startIso) i0++;
    }
    let lo = Infinity;
    let hi = -Infinity;
    let vhi = 0;
    for (let i = i0; i < n; i++) {
      for (const v of [s.close[i], s.ma_short && s.ma_short[i], s.ma_long && s.ma_long[i]]) {
        if (isNum(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      }
      for (const v of [s.realized_vol[i], s.vol_hi && s.vol_hi[i]]) {
        if (isNum(v)) vhi = Math.max(vhi, v * 100);
      }
    }
    let y;
    if (logScale && lo > 0) {
      const a = Math.log10(lo);
      const b = Math.log10(hi);
      const pad = (b - a) * 0.05 || 0.01;
      y = [a - pad, b + pad];
    } else {
      const pad = (hi - lo) * 0.05 || 1;
      y = [lo - pad, hi + pad];
    }
    return { x: [dates[i0], dates[n - 1]], y, y2: [0, vhi * 1.08 || 1] };
  }

  const hasHMM = (p) =>
    !!(p.hmm && p.hmm.shown && Array.isArray(p.series.hmm_p_turbulent) &&
      p.series.hmm_p_turbulent.length === p.series.date.length);

  function drawChart(el, p, years, logScale) {
    const t = theme();
    const s = p.series;
    const d = s.date;
    const prm = p.meta.params || {};
    const trendName = (v) => (TREND[v] ? TREND[v].name.toLowerCase() : "n/a");
    const volName = (v) => (VOL[v] ? VOL[v].name.toLowerCase() : "n/a");
    const pct = (arr) => (arr || []).map((v) => (isNum(v) ? v * 100 : null));
    const hasMA = Array.isArray(s.ma_short) && Array.isArray(s.ma_long);
    const hasCuts = Array.isArray(s.vol_lo) && Array.isArray(s.vol_hi);

    const traces = [
      {
        x: d, y: s.close, customdata: s.trend_regime.map(trendName), yaxis: "y",
        type: "scatter", mode: "lines", line: { color: t.fg, width: 1.4 },
        hovertemplate: "Close %{y:,.2f}, trend %{customdata}<extra></extra>",
      },
    ];
    if (hasMA) {
      traces.push(
        {
          x: d, y: s.ma_short, yaxis: "y", type: "scatter", mode: "lines",
          line: { color: t.muted, width: 1, dash: "dot" },
          hovertemplate: `${prm.trend_short || 50}-day avg %{y:,.2f}<extra></extra>`,
        },
        {
          x: d, y: s.ma_long, yaxis: "y", type: "scatter", mode: "lines",
          line: { color: t.accent, width: 1.2 },
          hovertemplate: `${prm.trend_long || 200}-day avg %{y:,.2f}<extra></extra>`,
        },
      );
    }
    if (hasCuts) {
      for (const k of ["vol_lo", "vol_hi"]) {
        traces.push({
          x: d, y: pct(s[k]), yaxis: "y2", type: "scatter", mode: "lines", hoverinfo: "skip",
          line: { color: t.muted, width: 1, dash: "dot" },
        });
      }
    }
    traces.push({
      x: d, y: pct(s.realized_vol), customdata: s.vol_regime.map(volName), yaxis: "y2",
      type: "scatter", mode: "lines", line: { color: t.fg, width: 1.2 },
      hovertemplate: "Volatility %{y:.1f}%, %{customdata}<extra></extra>",
    });

    const model = hasHMM(p);
    if (model) {
      traces.push({
        x: d, y: s.hmm_p_turbulent.map((v) => (v == null ? null : v * 100)), yaxis: "y3",
        type: "scatter", mode: "lines", connectgaps: false,
        line: { color: HMM_COLOR, width: 1 }, fill: "tozeroy", fillcolor: hexToRgba(HMM_COLOR, 0.28),
        hovertemplate: "Model P(turbulent) %{y:.0f}%<extra></extra>",
      });
    }
    el.classList.toggle("regime-radar__chart--tall", model);
    // Set the height explicitly from the CSS: Plotly would otherwise keep the height of
    // the previous asset, and switching from a chart with the model strip to one
    // without it leaves the plot overflowing onto the legend.
    const height = parseInt(getComputedStyle(el).minHeight, 10) || (model ? 580 : 460);

    const w = viewWindow(p, years, logScale);
    // fixedrange: no drag-to-zoom, so a finger on the chart scrolls the page on phones.
    const axis = { gridcolor: t.grid, showline: false, zeroline: false, fixedrange: true };
    const layout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: t.fg, family: "Poppins, sans-serif", size: 11 },
      showlegend: false,
      height,
      margin: { l: 56, r: 12, t: 8, b: 32 },
      hovermode: "x unified",
      hoverlabel: { font: { family: "Poppins, sans-serif", size: 11 } },
      xaxis: { ...axis, type: "date", domain: [0, 1], anchor: model ? "y3" : "y2", range: w.x, hoverformat: "%d %b %Y" },
      yaxis: {
        ...axis, domain: model ? [0.58, 1] : [0.5, 1], type: logScale ? "log" : "linear", range: w.y,
        title: { text: "Price", standoff: 6, font: { size: 10 } },
      },
      yaxis2: {
        ...axis, domain: model ? [0.27, 0.51] : [0, 0.4], range: w.y2, ticksuffix: "%",
        title: { text: "Volatility", standoff: 6, font: { size: 10 } },
      },
      shapes: [
        ...bands(d, s.trend_regime, "y domain", (v) => (TREND[v] ? hexToRgba(TREND[v].color, TREND[v].opacity) : null)),
        ...bands(d, s.vol_regime, "y2 domain", (v) => (VOL[v] ? `rgba(${VOL_RGB},${VOL[v].band})` : null)),
      ],
    };
    if (model) {
      layout.yaxis3 = {
        ...axis, domain: [0, 0.18], range: [0, 100], tickvals: [0, 50, 100], ticktext: ["0%", "50%", "100%"],
        title: { text: "Model", standoff: 6, font: { size: 10 } },
      };
      layout.shapes.push({
        type: "line", xref: "paper", yref: "y3", x0: 0, x1: 1, y0: 50, y1: 50,
        line: { color: t.muted, width: 1, dash: "dot" }, layer: "below",
      });
    }
    return window.Plotly.react(el, traces, layout, { displayModeBar: false, responsive: true });
  }

  // ---------- CSV ----------

  function downloadCSV(p) {
    const s = p.series;
    const prm = p.meta.params || {};
    const cols = [
      ["date", s.date],
      ["close", s.close],
      [`ma${prm.trend_short || 50}`, s.ma_short],
      [`ma${prm.trend_long || 200}`, s.ma_long],
      ["realized_vol", s.realized_vol],
      ["vol_low_cut", s.vol_lo],
      ["vol_high_cut", s.vol_hi],
      ["trend_regime", s.trend_regime],
      ["vol_regime", s.vol_regime],
      ["hmm_p_turbulent", s.hmm_p_turbulent],
    ].filter(([, arr]) => Array.isArray(arr));
    const lines = [cols.map(([h]) => h).join(",")];
    for (let i = 0; i < s.date.length; i++) {
      lines.push(cols.map(([, arr]) => (arr[i] == null ? "" : arr[i])).join(","));
    }
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `regime-radar${slug(p.meta.symbol)}_${p.latest.date}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  // ---------- page assembly ----------

  function scaffold(root) {
    root.innerHTML = `
      <div class="regime-radar__picker"></div>
      <div class="regime-radar__stale" hidden></div>
      <div class="regime-radar__status" aria-live="polite"></div>
      <div class="regime-radar__lag"></div>
      <div class="regime-radar__note"></div>
      <div class="regime-radar__pending"></div>
      <div class="regime-radar__inputs"></div>
      <div class="regime-radar__toolbar">
        <div class="regime-radar__ranges" role="group" aria-label="Chart range">
          ${RANGES.map(([label, yrs]) =>
            `<button type="button" class="regime-radar__btn" data-years="${yrs || ""}" aria-pressed="${yrs === DEFAULT_YEARS}">${label}</button>`).join("")}
        </div>
        <button type="button" class="regime-radar__btn regime-radar__log" aria-pressed="false">Log price</button>
      </div>
      <div class="regime-radar__chart"></div>
      <div class="regime-radar__legend"></div>
      <div class="regime-radar__hmm"></div>
      <div class="regime-radar__stats"></div>
      <div class="regime-radar__foot"></div>`;
  }

  function legendHTML(p) {
    const trendKey = Object.values(TREND)
      .map((v) => `<span class="regime-radar__key"><span class="regime-radar__swatch" style="background:${hexToRgba(v.color, 0.55)}"></span>${v.name}</span>`)
      .join("");
    const volKey = Object.values(VOL)
      .map((v) => `<span class="regime-radar__key"><span class="regime-radar__swatch" style="background:rgba(${VOL_RGB},${Math.min(1, v.band * 3)});box-shadow:inset 0 0 0 1px rgba(${VOL_RGB},0.8)"></span>${v.name}</span>`)
      .join("");
    const model = hasHMM(p);
    return `
      <div>
        <div><span class="regime-radar__legend-head">Top panel, trend</span>${trendKey}</div>
        <div class="regime-radar__legend-lines">Lines: close, 50-day average (dotted), 200-day average (blue).</div>
      </div>
      <div>
        <div><span class="regime-radar__legend-head">${model ? "Middle" : "Bottom"} panel, volatility</span>${volKey}</div>
        <div class="regime-radar__legend-lines">Lines: realized volatility and the two cut points (dotted).</div>
      </div>
      ${model ? `
      <div class="regime-radar__legend-model">
        <div><span class="regime-radar__legend-head">Bottom strip, model (experimental)</span><span class="regime-radar__key"><span class="regime-radar__swatch" style="background:${hexToRgba(HMM_COLOR, 0.6)}"></span>P(turbulent)</span></div>
        <div class="regime-radar__legend-lines">What a hidden Markov model said on each day, at the time. Explained below.</div>
      </div>` : ""}`;
  }

  // The model is a second opinion. Its numbers come from payload.hmm, and the text
  // says plainly what it is, how it was run, and where to read about its limits.
  function hmmHTML(p) {
    const h = p.hmm;
    if (!h || !Array.isArray(h.states) || h.states.length < 2) return "";
    const name = esc(p.meta.display_name || p.meta.symbol);
    const more = `<a href="#why-rules-and-not-a-hidden-markov-model">Why this is a side panel</a>`;
    if (!h.shown) {
      return `<div class="regime-radar__hmm-title">A second opinion from a model (experimental)</div>
        <div class="regime-radar__hmm-text">No model panel for ${name}. ${esc(h.reason || "")} ${more}.</div>`;
    }
    const [calm, turb] = h.states;
    const pct = (x) => (isNum(x) ? (x * 100).toFixed(1) + "%" : "n/a");
    const days = (x) => (isNum(x) ? `${Math.round(x)} trading days` : "n/a");
    const pNow = isNum(h.p_turbulent) ? Math.round(h.p_turbulent * 100) : null;
    return `<div class="regime-radar__hmm-title">A second opinion from a model (experimental)</div>
      <div class="regime-radar__hmm-text">
        A two-state hidden Markov model, fitted on ${name}'s returns through ${fmtDate(h.fitted_through)} and run
        forward one day at a time, put the probability that the market was in its turbulent state at
        <span class="regime-radar__hmm-p">${pNow == null ? "n/a" : pNow + "%"}</span> on ${fmtDate(h.p_date)}.
        Its calm state moves about ${pct(calm.daily_sd)} a day and lasts ${days(calm.expected_days)} on average;
        its turbulent state moves about ${pct(turb.daily_sd)} a day and lasts ${days(turb.expected_days)}.
        Over the past year it called ${isNum(h.turbulent_share_last_year) ? Math.round(h.turbulent_share_last_year * 100) + "%" : "n/a"} of days turbulent.
      </div>
      <div class="regime-radar__hmm-text regime-radar__hmm-fine">
        The strip at the bottom of the chart shows what the model said on each day at the time, never what it
        would say now with hindsight. It is refit at every month end, and the rule-based labels above remain the
        ones this page is built on. ${more}.
      </div>`;
  }

  function renderPicker(state) {
    const el = state.root.querySelector(".regime-radar__picker");
    const list = state.tickers;
    if (list.length < 2) {
      el.innerHTML = "";
      return;
    }
    if (list.length > MAX_TILES) {
      el.innerHTML = `<select class="regime-radar__select" aria-label="Choose an asset">
        ${list.map((t) => `<option value="${esc(t)}"${t === state.selected ? " selected" : ""}>${esc(state.names[t])}</option>`).join("")}
      </select>`;
      el.querySelector("select").addEventListener("change", (e) => select(state, e.target.value));
      return;
    }
    el.innerHTML = `<div class="regime-radar__tiles" role="group" aria-label="Choose an asset">
      ${list.map((t) => {
        const e = state.index[t];
        const l = e && e.latest;
        const lines = l
          ? `<span class="regime-radar__tile-line">${trendDot(l.trend_regime)}Trend ${esc(((TREND[l.trend_regime] || {}).name || "n/a").toLowerCase())}</span>
             <span class="regime-radar__tile-line">${volDot(l.vol_regime)}Volatility ${esc(((VOL[l.vol_regime] || {}).name || "n/a").toLowerCase())}</span>`
          : "";
        return `<button type="button" class="regime-radar__tile" data-ticker="${esc(t)}" aria-pressed="${t === state.selected}">
          <span class="regime-radar__tile-name">${esc(state.names[t])}</span>${lines}
        </button>`;
      }).join("")}
    </div>`;
    el.querySelectorAll(".regime-radar__tile").forEach((b) =>
      b.addEventListener("click", () => select(state, b.getAttribute("data-ticker"))));
  }

  function renderPayload(state, p) {
    const r = state.root;
    const stale = staleInfo(p);
    const staleEl = r.querySelector(".regime-radar__stale");
    if (stale) {
      staleEl.className = stale.cls;
      staleEl.textContent = stale.text;
      staleEl.hidden = false;
    } else {
      staleEl.hidden = true;
    }

    r.querySelector(".regime-radar__status").innerHTML = statusHTML(p);
    r.querySelector(".regime-radar__lag").textContent = lagHTML(p);
    r.querySelector(".regime-radar__note").textContent = p.meta.note || "";
    r.querySelector(".regime-radar__pending").innerHTML = pendingHTML(p);
    r.querySelector(".regime-radar__inputs").innerHTML = inputsHTML(p);
    r.querySelector(".regime-radar__stats").innerHTML = tableHTML(p);
    r.querySelector(".regime-radar__legend").innerHTML = legendHTML(p);
    r.querySelector(".regime-radar__hmm").innerHTML = hmmHTML(p);

    const built = fmtLocalTime(p.meta.generated_at);
    const foot = r.querySelector(".regime-radar__foot");
    foot.innerHTML = `
      Prices from Yahoo Finance, rebuilt every weekday before the IDX opens (last build ${esc(built)}).
      The labels describe what already happened. They are not a forecast and not investment advice.
      <span class="regime-radar__links">
        <button type="button" class="regime-radar__linkbtn">Download CSV</button>
        <a href="${esc(state.base + slug(p.meta.symbol) + ".json")}">Raw JSON</a>
        <a href="${esc(state.base + "feed-" + slug(p.meta.symbol) + ".xml")}">Feed of ${esc(p.meta.display_name || p.meta.symbol)} changes</a>
      </span>`;
    foot.querySelector("button").addEventListener("click", () => downloadCSV(p));

    redraw(state);
  }

  function redraw(state) {
    const p = state.cache[state.selected];
    if (!p || typeof window.Plotly === "undefined") return;
    drawChart(state.root.querySelector(".regime-radar__chart"), p, state.years, state.log);
  }

  function renderTickerError(state, ticker, err) {
    const r = state.root;
    r.querySelector(".regime-radar__status").innerHTML =
      `<span class="regime-radar__error-inline">Could not load ${esc(state.names[ticker] || ticker)}. ${esc(describeError(err))}</span>`;
    for (const k of ["note", "lag", "pending", "inputs", "stats", "foot", "legend", "hmm"]) {
      r.querySelector(".regime-radar__" + k).innerHTML = "";
    }
    r.querySelector(".regime-radar__stale").hidden = true;
    if (window.Plotly) window.Plotly.purge(r.querySelector(".regime-radar__chart"));
  }

  async function select(state, ticker) {
    state.selected = ticker;
    renderPicker(state);
    if (!state.cache[ticker]) {
      state.root.querySelector(".regime-radar__status").textContent = "Loading…";
      try {
        state.cache[ticker] = validatePayload(await fetchJSON(state.base + slug(ticker) + ".json"));
      } catch (err) {
        if (state.selected === ticker) renderTickerError(state, ticker, err);
        return;
      }
    }
    if (state.selected === ticker) renderPayload(state, state.cache[ticker]);
  }

  function wireToolbar(state) {
    const r = state.root;
    const rangeBtns = r.querySelectorAll(".regime-radar__ranges .regime-radar__btn");
    rangeBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const v = b.getAttribute("data-years");
        state.years = v ? Number(v) : null;
        rangeBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        redraw(state);
      });
    });
    const logBtn = r.querySelector(".regime-radar__log");
    logBtn.addEventListener("click", () => {
      state.log = !state.log;
      logBtn.setAttribute("aria-pressed", String(state.log));
      redraw(state);
    });
  }

  async function initRoot(root) {
    const base = root.getAttribute("data-base") || "/data/regime-radar/";
    const wanted = (root.getAttribute("data-tickers") || "^JKSE").split(",").map((s) => s.trim()).filter(Boolean);
    root.innerHTML = `<div class="regime-radar__loading">Loading regime data…</div>`;

    let index = null;
    try {
      index = await fetchJSON(base + "index.json");
    } catch (e) {
      index = null; // Deploys from before index.json existed: fall back to the shortcode's list.
    }
    const byTicker = {};
    if (index && Array.isArray(index.tickers)) for (const e of index.tickers) byTicker[e.symbol] = e;
    const tickers = index ? wanted.filter((t) => byTicker[t]) : wanted;

    if (!tickers.length) {
      root.innerHTML = `<div class="regime-radar__error">No data has been published yet. The daily build has probably not run.</div>`;
      return;
    }

    const state = {
      root, base, tickers, index: byTicker,
      names: Object.fromEntries(tickers.map((t) => [t, (byTicker[t] && byTicker[t].display_name) || t])),
      cache: {}, selected: tickers[0], years: DEFAULT_YEARS, log: false,
    };
    scaffold(root);
    wireToolbar(state);
    await select(state, state.selected);

    new MutationObserver(() => redraw(state)).observe(document.body, {
      attributes: true, attributeFilter: ["class"],
    });
  }

  function init() {
    if (typeof window.Plotly === "undefined") return void setTimeout(init, 60);
    document.querySelectorAll(".regime-radar").forEach(initRoot);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
