"""SBN Ledger: who holds Indonesia's rupiah government bonds, what each auction cleared at, and where yields sit.

Everything comes from files the Ministry of Finance's debt office (DJPPR)
publishes: ownership of tradable SBN by holder group, the result of every
issuance and auction, and daily prices and yields of the benchmark series.
The raw files are DJPPR's and stay out of this public repo; only derived
tables are published, each with a link back to its source file.

The plan (17 Nov 2026) has the scope, the pre-registered tests and the
milestones. Milestone 0 is this client (djppr.py) and a three-request probe
(probe.py) that checks whether GitHub Actions is allowed to ask.
"""
