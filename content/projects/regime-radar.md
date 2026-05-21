---
title: "Regime Radar"
date: 2026-05-19
draft: false
summary: "Dashboard regime pasar IDX Composite berbasis dua sinyal: volatility quantile dan trend rule, diperbarui harian via GitHub Actions. Sengaja simple supaya transparan."
repo: "https://github.com/dimas-suryo/dimas-suryo.github.io"
status: "live"
stack: ["Python", "pandas", "yfinance", "GitHub Actions", "Plotly.js"]
---

Pertanyaan yang regime detection mau jawab itu sederhana: **"pasar lagi dalam kondisi seperti apa hari ini?"** Bukan "akan ke mana besok" — itu pertanyaan beda yang model ini tidak coba jawab.

{{< regime-radar tickers="^JKSE" >}}

## Apa yang dilihat

Dua panel, dua sinyal independen yang sengaja aku pilih simple:

**Trend regime** (panel atas, berdasarkan price): klasifikasi closed-form pakai MA crossover + slope. Tanggal `t` ber-label _up_ kalau close di atas MA200, MA50 di atas MA200, dan slope MA200 selama 60 hari terakhir positif. _Down_ kalau ketiga kondisi negatif. Sisanya _sideways_. Tidak ada quantile, tidak ada fitting, tidak ada lookahead — pure rule.

**Vol regime** (panel bawah, berdasarkan realized volatility): realized vol = rolling std return 21 hari, di-annualisasi. Setiap tanggal di-label _low / mid / high_ berdasarkan quantile 33/67 dari trailing 5 tahun (di-shift 1 hari supaya label hari ini hanya melihat data sampai kemarin — strictly no lookahead).

Bands berwarna di belakang line bukan dekorasi — itu sinyal itu sendiri. Garis cuma referensi visual.

## Kenapa rule-based, bukan HMM

Pilihan filosofis, bukan teknis. HMM (hidden Markov model) untuk regime detection terdengar pintar dan banyak ada di paper, tapi punya beberapa masalah praktis yang sering tidak disebut:

1. **Label tidak stabil.** Re-fit dengan data tambahan 1 hari bisa flip seluruh history regime labeling. Reader yang baca chart kemarin akan bingung ketika chart hari ini bilang sebaliknya.
2. **Re-numbering antar fit.** "State 0" hari ini bisa menjadi "state 1" besok — semantic mapping ke "bull/bear" harus dilakukan post-hoc dengan rule manual.
3. **Overstated confidence.** Output probabilistik (mis. "82% high-vol regime") terdengar precise, padahal precision itu sebagian besar artifact dari model assumption (Gaussian, stationary transition matrix) yang tidak benar di pasar nyata.

Rule-based menukar "feels sophisticated" dengan "reproducible dan auditable". Setiap orang bisa verifikasi: ambil price IDX hari ini, hitung MA200 dan MA50, lihat slope. Sama hasilnya. Itu yang aku mau dari sinyal yang dipublikasikan.

HMM atau Markov-switching mungkin masuk sebagai panel ketiga di versi 2 — eksplisit di-frame sebagai eksperimen yang reader boleh percaya atau tidak.

## Yang ini BUKAN

Penting banget:

- **Bukan saran investasi.** Tidak ada di sini yang bilang "beli karena regime up" atau "jual karena vol high". Regime adalah konteks, bukan signal entry/exit.
- **Bukan prediktif.** Vol regime hari ini deskriptif soal vol _yang sudah terealisasi_ dalam 21 hari terakhir. Tidak ada klaim soal vol besok.
- **Bukan robust ke gap struktural.** Quantile baseline pakai trailing 5 tahun. Kalau volatility regime IDX shift permanen (misal karena perubahan struktural pasar), labeling akan lag.
- **Bukan presisi yang sebenarnya.** Categorical label (low/mid/high) sengaja menyembunyikan presisi palsu. Realized vol 14.9% vs 15.1% mungkin masuk regime beda, tapi perbedaannya within noise.

## Parameter & sumber

| Parameter             | Nilai                                     | Alasan                                                                             |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Vol window            | 21 hari (~1 bulan trading)                | Standar realized vol monthly                                                       |
| Vol quantile breaks   | 33%, 67%                                  | Tertile — kira-kira merata di baseline normal                                      |
| Vol quantile lookback | 252×5 hari (~5 tahun)                     | Cukup untuk capture full cycle, tidak terlalu panjang sampai miss structural shift |
| Trend short MA        | 50 hari                                   | Konvensi industri                                                                  |
| Trend long MA         | 200 hari                                  | Konvensi industri (Hindenburg, dst.)                                               |
| Trend slope window    | 60 hari                                   | ~kuartal                                                                           |
| Data                  | `^JKSE` daily close via yfinance          | Free, sufficient untuk daily index                                                 |
| Refresh               | 05:30 WIB weekday via GitHub Actions cron | Setelah US close, sebelum IDX buka                                                 |

Semua parameter ada di [`tools/regime_radar/build.py`](https://github.com/dimas-suryo/dimas-suryo.github.io/blob/main/tools/regime_radar/build.py) — `PARAMS` dict. Mau bandingkan dengan rule yang berbeda, fork dan ubah satu angka.

## Caveat data

`yfinance` adalah scraper community ke endpoint internal Yahoo Finance — bukan API resmi. Untuk daily close `^JKSE` ini battle-tested dan mayoritas hari berhasil, tapi pernah breakage 1-2 kali setahun saat Yahoo ubah sesuatu. Failure mode dashboard ini: page tetap nampilkan JSON terakhir yang sukses (mungkin kemarin atau 2 hari lalu), bukan crash. Recovery = upgrade yfinance dan re-run workflow.

## Roadmap

- **Universe LQ45**: pre-compute 45 large caps, dropdown selector. Same architecture, zero refactor di code.
- **Multi-asset panel**: tambah S&P 500, USDIDR, emas — biar bisa lihat "regime US apa, regime IDX apa" side-by-side.
- **Stooq fallback** di `data.py`: defensive layer kalau yfinance down.
- **HMM panel eksperimental**: re-implement forward-backward di NumPy murni (karena `hmmlearn` punya C-extension yang ribet di Pyodide), display dengan caveat eksplisit.
- **Regime statistics**: berapa lama rata-rata tiap regime bertahan, transition probability empiris.

## Source

Code di [github.com/dimas-suryo/dimas-suryo.github.io](https://github.com/dimas-suryo/dimas-suryo.github.io) — folder `tools/regime_radar/` (model) dan `static/js/regime-radar.js` (renderer). Workflow di `.github/workflows/regime-radar.yaml`.

Issue / PR / saran sangat welcome.
