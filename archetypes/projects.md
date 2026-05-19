---
title: '{{ replace .File.ContentBaseName "-" " " | title }}'
date: {{ .Date }}
draft: true
summary: ""
# external_url: ISI kalau card harus LANGSUNG buka tool (skip writeup page).
#               KOSONGKAN/HAPUS kalau mau card masuk ke writeup page ini dulu.
external_url: ""
# repo: opsional — link GitHub. Muncul sebagai tombol di writeup page.
repo: ""
# live_url: opsional — kalau ada writeup TAPI tetap mau tombol "Launch tool".
live_url: ""
status: "live"   # live | wip | archived
stack: []        # mis. ["Python", "Streamlit", "DuckDB"]
---

Tulis writeup gaya blog di sini: apa ini, kenapa dibangun, gimana cara kerjanya,
keputusan desain, dan lessons. (Bagian ini cuma kepakai kalau external_url kosong.)
