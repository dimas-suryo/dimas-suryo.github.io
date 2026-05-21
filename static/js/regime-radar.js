/* Regime Radar — client-side renderer.
 *
 * Scans every `.regime-radar` root on the page, fetches the JSON payload(s)
 * for the ticker(s) listed in `data-tickers`, and renders:
 *   1. A "latest snapshot" panel (vol + trend badges, date, close, ann. vol)
 *   2. A two-panel time-series chart (close on top, realized vol on bottom)
 *      with regime-colored background bands per panel.
 * Plus a staleness banner if data is more than STALE_DAYS old.
 * If multiple tickers, also renders a <select>; failed tickers are excluded
 * with a footer note showing why.
 *
 * Deps: Plotly.js basic bundle (loaded by the Hugo shortcode).
 *
 * Known v0 limitations:
 *   - Theme (dark/light) is captured at render time. Toggling theme requires
 *     page reload for chart colors to update.
 *   - All JSON for the page's tickers is fetched up-front. Fine up to ~20.
 */
(function () {
  "use strict";

  const REGIME_COLORS = {
    up: "#16a34a", down: "#dc2626", sideways: "#94a3b8",
    low: "#3b82f6", mid: "#f59e0b", high: "#ef4444",
  };
  const STALE_DAYS = 7;
  const VERY_STALE_DAYS = 21;

  function getTheme() {
    const isLight = document.documentElement.classList.contains("light");
    return {
      isLight,
      bg: "rgba(0,0,0,0)",
      fg: isLight ? "#1f2937" : "#e2e8f0",
      grid: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)",
      line: isLight ? "#1f2937" : "#e2e8f0",
    };
  }

  function tickerSlug(symbol) {
    return symbol.replace(/\^/g, "_").replace(/\./g, "_");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function daysBetween(isoA, isoB) {
    return (new Date(isoB) - new Date(isoA)) / (1000 * 60 * 60 * 24);
  }

  function validatePayload(p) {
    if (!p || typeof p !== "object") {
      throw { kind: "malformed", reason: "payload bukan object" };
    }
    if (!p.meta || !p.series || !p.latest) {
      throw { kind: "malformed", reason: "kekurangan field meta/series/latest" };
    }
    const s = p.series;
    if (!Array.isArray(s.date) || s.date.length === 0) {
      throw { kind: "malformed", reason: "series.date kosong" };
    }
    const n = s.date.length;
    for (const k of ["close", "realized_vol", "vol_regime", "trend_regime"]) {
      if (!Array.isArray(s[k]) || s[k].length !== n) {
        throw {
          kind: "malformed",
          reason: `series.${k} length mismatch (${s[k] ? s[k].length : "missing"} vs ${n})`,
        };
      }
    }
    return p;
  }

  async function fetchPayload(base, symbol) {
    const url = base + tickerSlug(symbol) + ".json";
    let res;
    try {
      res = await fetch(url, { cache: "no-cache" });
    } catch (e) {
      throw { kind: "network", url, reason: e.message };
    }
    if (res.status === 404) throw { kind: "missing", url };
    if (!res.ok) throw { kind: "http", url, status: res.status };
    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw { kind: "malformed", url, reason: "JSON parse: " + e.message };
    }
    return validatePayload(json);
  }

  function formatError(err) {
    switch (err && err.kind) {
      case "missing":   return "data belum di-generate (file belum ada)";
      case "network":   return `network error: ${err.reason || "tidak bisa connect"}`;
      case "http":      return `HTTP ${err.status}`;
      case "malformed": return `data corrupt — ${err.reason || "shape salah"}`;
      default:          return String((err && (err.message || err.reason)) || err || "unknown");
    }
  }

  function buildBands(dates, labels, yref) {
    const shapes = [];
    let runStart = 0;
    for (let i = 1; i <= labels.length; i++) {
      if (i === labels.length || labels[i] !== labels[runStart]) {
        const lab = labels[runStart];
        if (lab && REGIME_COLORS[lab]) {
          shapes.push({
            type: "rect", xref: "x", yref,
            x0: dates[runStart], x1: dates[i - 1], y0: 0, y1: 1,
            fillcolor: REGIME_COLORS[lab], opacity: 0.14,
            line: { width: 0 }, layer: "below",
          });
        }
        runStart = i;
      }
    }
    return shapes;
  }

  function renderSnapshot(root, payload) {
    const m = payload.meta;
    const l = payload.latest;
    const generatedStr = new Date(m.generated_at).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
    root.querySelector(".regime-radar__generated").textContent = "Diperbarui " + generatedStr;

    const num = (x, d = 2) =>
      x == null || !isFinite(x)
        ? "—"
        : Number(x).toLocaleString(undefined, {
            minimumFractionDigits: d, maximumFractionDigits: d,
          });

    const safeLabel = (v) => REGIME_COLORS[v] ? v : "—";
    const safeDotClass = (v) =>
      REGIME_COLORS[v]
        ? `regime-radar__dot regime-radar__dot--${v}`
        : "regime-radar__dot";

    root.querySelector(".regime-radar__snapshot").innerHTML = `
      <div class="regime-radar__badge">
        <span class="regime-radar__badge-label">Vol regime</span>
        <span class="regime-radar__badge-value">
          <span class="${safeDotClass(l.vol_regime)}"></span>
          ${escapeHtml(safeLabel(l.vol_regime))}
        </span>
      </div>
      <div class="regime-radar__badge">
        <span class="regime-radar__badge-label">Trend regime</span>
        <span class="regime-radar__badge-value">
          <span class="${safeDotClass(l.trend_regime)}"></span>
          ${escapeHtml(safeLabel(l.trend_regime))}
        </span>
      </div>
      <div class="regime-radar__numbers">
        <span><span class="regime-radar__num-label">Tanggal</span>${escapeHtml(l.date || "—")}</span>
        <span><span class="regime-radar__num-label">Close</span>${num(l.close)}</span>
        <span><span class="regime-radar__num-label">Vol ann.</span>${num(l.realized_vol_annualized * 100, 1)}%</span>
      </div>
    `;
  }

  function renderStalenessBanner(root, payload) {
    const ageDays = daysBetween(payload.meta.generated_at, new Date().toISOString());
    const banner = root.querySelector(".regime-radar__staleness");
    if (!banner) return;
    if (ageDays > VERY_STALE_DAYS) {
      banner.className = "regime-radar__staleness regime-radar__staleness--error";
      banner.textContent =
        `⚠ Data berumur ${Math.round(ageDays)} hari — workflow harian kemungkinan stuck. Cek tab Actions.`;
      banner.hidden = false;
    } else if (ageDays > STALE_DAYS) {
      banner.className = "regime-radar__staleness regime-radar__staleness--warn";
      banner.textContent =
        `Data berumur ${Math.round(ageDays)} hari. Refresh terbaru mungkin gagal — workflow auto retry besok.`;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function renderChart(chartEl, payload) {
    const theme = getTheme();
    const s = payload.series;
    const dates = s.date;

    const closeTrace = {
      x: dates, y: s.close, type: "scatter", mode: "lines", name: "Close",
      line: { color: theme.line, width: 1.5 },
      hovertemplate: "%{x|%d %b %Y}<br>Close: %{y:,.2f}<extra></extra>",
      yaxis: "y",
    };
    const volTrace = {
      x: dates,
      y: s.realized_vol.map((v) => (v == null ? null : v * 100)),
      type: "scatter", mode: "lines", name: "Realized vol (ann %)",
      line: { color: theme.line, width: 1.2 },
      hovertemplate: "%{x|%d %b %Y}<br>Vol: %{y:.1f}%<extra></extra>",
      yaxis: "y2",
    };

    const layout = {
      paper_bgcolor: theme.bg, plot_bgcolor: theme.bg,
      font: { color: theme.fg, family: "Poppins, sans-serif", size: 11 },
      showlegend: false,
      margin: { l: 50, r: 16, t: 10, b: 36 },
      hovermode: "x unified",
      xaxis: {
        type: "date", gridcolor: theme.grid, showline: false, zeroline: false,
        domain: [0, 1], anchor: "y2",
      },
      yaxis: {
        title: { text: "Close", standoff: 8, font: { size: 10 } },
        gridcolor: theme.grid, showline: false, zeroline: false,
        domain: [0.55, 1.0],
      },
      yaxis2: {
        title: { text: "Vol (ann %)", standoff: 8, font: { size: 10 } },
        gridcolor: theme.grid, showline: false, zeroline: false,
        domain: [0.0, 0.42],
      },
      shapes: [
        ...buildBands(dates, s.trend_regime, "y"),
        ...buildBands(dates, s.vol_regime, "y2"),
      ],
    };

    window.Plotly.newPlot(
      chartEl, [closeTrace, volTrace], layout,
      { displayModeBar: false, responsive: true, doubleClick: "reset" },
    );
  }

  function renderFatalError(root, kind, msg) {
    root.innerHTML = `<div class="regime-radar__error">
      <strong>${escapeHtml(kind)}.</strong> ${escapeHtml(msg)}
    </div>`;
  }

  function buildScaffold(root, tickers, failedNotes) {
    const showSelector = tickers.length > 1;
    const failedBlock = failedNotes.length
      ? `<div class="regime-radar__partial-fail">
           Ticker tidak ter-load:
           ${failedNotes.map((n) => `<code>${escapeHtml(n.ticker)}</code> (${escapeHtml(n.reason)})`).join(", ")}
         </div>`
      : "";
    root.innerHTML = `
      <div class="regime-radar__header">
        ${showSelector
          ? `<select class="regime-radar__ticker" aria-label="Pilih ticker">
               ${tickers.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}
             </select>`
          : `<span class="regime-radar__ticker" aria-disabled="true">${escapeHtml(tickers[0])}</span>`}
        <span class="regime-radar__generated"></span>
      </div>
      <div class="regime-radar__staleness" hidden></div>
      <div class="regime-radar__snapshot"></div>
      <div class="regime-radar__chart"></div>
      ${failedBlock}
      <div class="regime-radar__footnote">
        Diperbarui harian via GitHub Actions. Label regime bersifat
        <em>deskriptif</em>, bukan prediktif — lihat methodology di bawah.
        Bukan saran investasi.
      </div>
    `;
  }

  async function initRoot(root) {
    const base = root.getAttribute("data-base") || "/data/regime-radar/";
    const tickers = (root.getAttribute("data-tickers") || "^JKSE")
      .split(",").map((s) => s.trim()).filter(Boolean);

    root.innerHTML = `<div class="regime-radar__loading">Loading regime data…</div>`;

    const results = await Promise.all(
      tickers.map(async (t) => {
        try {
          const p = await fetchPayload(base, t);
          return { ticker: t, ok: true, payload: p };
        } catch (e) {
          return { ticker: t, ok: false, error: e };
        }
      }),
    );

    const ok = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    if (ok.length === 0) {
      const kinds = new Set(failed.map((r) => r.error.kind));
      if (kinds.size === 1 && kinds.has("missing")) {
        renderFatalError(
          root, "Data belum tersedia",
          "Workflow harian kemungkinan belum jalan. Trigger manual dari tab GitHub Actions repo ini, atau tunggu cron berikutnya.",
        );
      } else if (kinds.size === 1 && kinds.has("network")) {
        renderFatalError(
          root, "Tidak bisa connect",
          "Cek koneksi internet, lalu reload halaman.",
        );
      } else {
        const msg = failed.map((r) => `${r.ticker}: ${formatError(r.error)}`).join("; ");
        renderFatalError(root, "Tidak bisa memuat data", msg);
      }
      return;
    }

    const failedNotes = failed.map((r) => ({
      ticker: r.ticker, reason: formatError(r.error),
    }));
    const usableTickers = ok.map((r) => r.ticker);
    const payloads = Object.fromEntries(ok.map((r) => [r.ticker, r.payload]));

    buildScaffold(root, usableTickers, failedNotes);

    const chartEl = root.querySelector(".regime-radar__chart");
    const draw = (t) => {
      const p = payloads[t];
      renderSnapshot(root, p);
      renderStalenessBanner(root, p);
      renderChart(chartEl, p);
    };
    draw(usableTickers[0]);

    const sel = root.querySelector("select.regime-radar__ticker");
    if (sel) sel.addEventListener("change", (e) => draw(e.target.value));
  }

  function init() {
    if (typeof window.Plotly === "undefined") {
      return void setTimeout(init, 60);
    }
    document.querySelectorAll(".regime-radar").forEach(initRoot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
