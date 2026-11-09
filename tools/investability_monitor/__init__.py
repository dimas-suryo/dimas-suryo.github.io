"""Investability Monitor: free float, ownership concentration and trading quality on IDX.

Measures, neutrally and repeatably, the problems MSCI named when it opened its
consultation on moving Indonesia from Emerging to Standalone Market status
(15 Oct 2026; feedback closes 30 Apr 2027, decision by 30 Jun 2027).

Data comes from two IDX JSON endpoints (see idx_client.py) and the monthly
IDX/KSEI register of shareholders above 1%. Raw files stay out of this public
repo; only derived numbers without holder names are published.
"""
