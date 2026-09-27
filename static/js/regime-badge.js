/* Homepage line for Regime Radar: reads index.json (about 2 KB, no Plotly)
 * and writes one sentence about the selected ticker. Any failure leaves the
 * element hidden. */
(function () {
  "use strict";

  const TREND = {
    up: { phrase: "in an uptrend", color: "#16a34a" },
    sideways: { phrase: "moving sideways", color: "#94a3b8" },
    down: { phrase: "in a downtrend", color: "#dc2626" },
  };
  const VOL = { low: "low volatility", mid: "volatility in its middle band", high: "high volatility" };
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MAX_AGE_DAYS = 21;

  const fmtDate = (iso) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };
  const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso + "T00:00:00Z")) / 86400000);

  function render(el, entry) {
    const l = entry && entry.latest;
    if (!l || !l.date || !TREND[l.trend_regime] || !VOL[l.vol_regime]) return;
    if (daysAgo(l.date) > MAX_AGE_DAYS) return;

    const t = TREND[l.trend_regime];
    const span = typeof l.trend_days === "number"
      ? ` for ${l.trend_days} trading day${l.trend_days === 1 ? "" : "s"}`
      : "";
    const dot = document.createElement("span");
    dot.className = "regime-badge__dot";
    dot.style.background = t.color;
    el.textContent = "";
    el.appendChild(dot);
    // The move since the label began, so "downtrend" is not read as "falling".
    const x = l.trend_change_since;
    const move = typeof x === "number" && span
      ? (Math.abs(x) < 0.0005 ? " and is roughly unchanged since then" : ` and is ${x > 0 ? "up" : "down"} ${Math.abs(x * 100).toFixed(1)}% since then`)
      : "";
    el.appendChild(document.createTextNode(
      `${entry.display_name || entry.symbol} has been ${t.phrase}${span}${move}, with ${VOL[l.vol_regime]} (close of ${fmtDate(l.date)}).`
    ));
    el.hidden = false;
  }

  function init() {
    document.querySelectorAll(".regime-badge").forEach((el) => {
      const base = el.getAttribute("data-base") || "/data/regime-radar/";
      const want = el.getAttribute("data-ticker") || "^JKSE";
      fetch(base + "index.json", { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .then((idx) => {
          const list = (idx && Array.isArray(idx.tickers)) ? idx.tickers : [];
          render(el, list.find((e) => e.symbol === want));
        })
        .catch(() => {});
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
