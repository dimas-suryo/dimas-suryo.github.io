"""Dated IDX rulebook: price limits, ticks, halts, free float rules and notations since 2020.

Every number the monitor needs to judge a trading day or a free float figure is
stored here as data, next to the document that set it. Nothing is fetched at
run time and nothing outside the standard library is imported.

Tables
    PRICE_LIMIT_RULES      auto-rejection limits (ARA up, ARB down) by board and price band
    FIRST_DAY_RULES        multiplier on those limits for a stock's first trading day
    TICK_RULES             tick sizes (fraksi harga) by price band
    ROUNDING_RULES         how a limit price is put on the tick grid
    REFERENCE_PRICE_RULES  which price the limits are computed from
    HALT_RULES             market-wide trading halt and suspension thresholds (IHSG)
    FREE_FLOAT_RULES       Peraturan I-A free float minimum and definition
    FREE_FLOAT_TIERS       2026 transition schedule by market cap and free float
    IPO_FREE_FLOAT_TIERS   free float required at listing
    NOTATIONS              special notation letters shown after a stock code
    EVENTS                 dated chart markers up to RULEBOOK_CHECKED
    SCHEDULED              announced dates after RULEBOOK_CHECKED (not used by lookups)

Functions
    tick_size(on, price)                      tick in rupiah
    price_limits(on, prev_close, board)       (lower, upper) as IDX rounds them
    free_float_deadline(cap, ratio, as_of)    next Peraturan I-A deadline, or None
    free_float_status(...)                    the same with target, tier and overdue flag
    plus lookups (price_limit_rule, tick_rule, halt_rule, ...), unconfirmed() and manifest()

Conventions
    Dates are Jakarta dates. effective_from and effective_to are inclusive, and
    effective_to=None means still in force when the sources were last checked
    (RULEBOOK_CHECKED). A rule already in force on 1 Jan 2020 whose start date
    was not checked starts at RULEBOOK_START, and its note says so.
    confirmed=True means the value was read in an official document or in two
    independent reputable reports. Otherwise confirmed=False and `note` says
    what is missing. A note on a confirmed entry is extra context.
    Source.doc is the document number; Source.url is the page the value was
    taken from (read directly or through a search result), Source.also lists
    pages that agree. idx.co.id itself was not fetched (it sits behind
    Cloudflare); an IDX address appears only where a search result showed it.
    Boards use remarks.py's labels: main, development, new_economy,
    acceleration, special_monitoring.

Lookups raise RuleGapError for a date no rule covers, including dates after a
rule's announced end with no known successor: the 7% lower limit ends on 31 Dec
2026 and nothing confirmed follows it yet. A build that hits the error should
stop rather than guess, because limit-hit rates feed the pre-registered verdict.
"""
from __future__ import annotations

import datetime as dt
import math
import numbers
from dataclasses import dataclass, fields, is_dataclass
from decimal import Decimal
from fractions import Fraction
from typing import Any

__all__ = [
    "RULEBOOK_START", "RULEBOOK_CHECKED", "BOARDS", "REGULAR_BOARDS", "RuleGapError",
    "Source", "Limit", "Band", "PriceLimitRule", "FirstDayRule", "TickRule", "RoundingRule",
    "ReferencePriceRule", "HaltStep", "HaltRule", "FreeFloatRule", "FreeFloatTier",
    "IpoFreeFloatTier", "NotationCode", "Event", "FreeFloatStatus",
    "PRICE_LIMIT_RULES", "SCHEDULED_PRICE_LIMIT_RULES", "FIRST_DAY_RULES", "TICK_RULES",
    "ROUNDING_RULES", "REFERENCE_PRICE_RULES", "HALT_RULES", "FREE_FLOAT_RULES",
    "FREE_FLOAT_TIERS", "IPO_FREE_FLOAT_TIERS", "FREE_FLOAT_CLASSIFICATION_DATE", "NOTATIONS",
    "EVENTS", "SCHEDULED", "TABLES",
    "tick_size", "price_limits", "free_float_deadline", "free_float_status",
    "price_limit_rule", "first_day_multiplier", "tick_rule", "reference_price_rule",
    "halt_rule", "free_float_rule", "notations_in_force", "notation_shown",
    "unconfirmed", "manifest",
]

RULEBOOK_START = dt.date(2020, 1, 1)
RULEBOOK_CHECKED = dt.date(2026, 11, 9)  # last day the sources below were checked

REGULAR_BOARDS = frozenset({"main", "development", "new_economy"})
BOARDS = REGULAR_BOARDS | {"acceleration", "special_monitoring"}
_BOARD_ALIASES = {
    "utama": "main",
    "pengembangan": "development",
    "ekonomi_baru": "new_economy",
    "akselerasi": "acceleration",
    "pemantauan_khusus": "special_monitoring",
    "full_call_auction": "special_monitoring",
    "fca": "special_monitoring",
}


class RuleGapError(LookupError):
    """No rule in the rulebook covers the date asked for."""


# --------------------------------------------------------------------------
# Record types
# --------------------------------------------------------------------------


@dataclass(frozen=True)
class Source:
    doc: str  # document number, e.g. "Kep-00157/BEI/10-2026"
    url: str  # where the value was read
    also: tuple[str, ...] = ()  # other pages that agree


@dataclass(frozen=True)
class Limit:
    """One side of a price band: a share of the reference price, or a fixed rupiah step."""

    pct: Fraction | None = None
    rupiah: int | None = None

    def __post_init__(self) -> None:
        if (self.pct is None) == (self.rupiah is None):
            raise ValueError("a Limit is either a percentage or a rupiah amount")


def _pct(p: int | str) -> Limit:
    return Limit(pct=Fraction(p) / 100)


def _rp(n: int) -> Limit:
    return Limit(rupiah=n)


@dataclass(frozen=True)
class Band:
    up_to: int | None  # inclusive upper bound on the reference price; None = no bound
    upper: Limit
    lower: Limit


@dataclass(frozen=True)
class PriceLimitRule:
    boards: frozenset[str]
    effective_from: dt.date
    effective_to: dt.date | None
    bands: tuple[Band, ...]  # ascending by up_to, last one unbounded
    min_price: int  # lowest price an order may carry
    source: Source
    confirmed: bool
    note: str = ""

    def band_for(self, ref: Fraction) -> Band:
        for band in self.bands:
            if band.up_to is None or ref <= band.up_to:
                return band
        raise AssertionError("the last band must be unbounded")  # pragma: no cover


@dataclass(frozen=True)
class FirstDayRule:
    boards: frozenset[str]
    effective_from: dt.date
    effective_to: dt.date | None
    multiplier: int  # applied to the band's percentages on a stock's first trading day
    source: Source
    confirmed: bool
    note: str = ""


@dataclass(frozen=True)
class TickRule:
    effective_from: dt.date
    effective_to: dt.date | None
    bands: tuple[tuple[int, int], ...]  # (price from, inclusive; tick), ascending
    source: Source
    confirmed: bool
    note: str = ""
    max_step_ticks: int = 10  # jenjang maksimum: an order may move at most this many ticks

    def tick_for(self, price: Fraction | int) -> int:
        tick = self.bands[0][1]
        for start, size in self.bands:
            if price >= start:
                tick = size
        return tick


@dataclass(frozen=True)
class RoundingRule:
    effective_from: dt.date
    effective_to: dt.date | None
    text: str
    source: Source
    confirmed: bool
    note: str = ""


@dataclass(frozen=True)
class ReferencePriceRule:
    effective_from: dt.date
    effective_to: dt.date | None
    basis: str  # "previous_close" or "opening_price_if_preopening"
    text: str
    source: Source
    confirmed: bool
    note: str = ""


@dataclass(frozen=True)
class HaltStep:
    decline: Fraction  # IHSG fall from the previous close that triggers the step ("more than")
    action: str  # "halt" or "suspend"
    minutes: int | None  # halt length; None for a suspension (end of session or longer)


@dataclass(frozen=True)
class HaltRule:
    effective_from: dt.date
    effective_to: dt.date | None
    steps: tuple[HaltStep, ...]
    source: Source
    confirmed: bool
    note: str = ""
    index: str = "IHSG"


@dataclass(frozen=True)
class FreeFloatRule:
    effective_from: dt.date
    effective_to: dt.date | None
    min_ratio: Fraction  # of listed shares, for continued listing
    min_shares: int  # free float shares, for continued listing
    excluded: tuple[str, ...]  # what does not count as free float ("" when not checked)
    source: Source
    confirmed: bool
    note: str = ""
    acceleration_min_ratio: Fraction | None = None


@dataclass(frozen=True)
class FreeFloatTier:
    effective_from: dt.date
    effective_to: dt.date | None
    name: str
    min_cap: int  # market cap on the classification date, inclusive
    max_cap: int | None  # exclusive; None = no bound
    min_float: Fraction  # free float on the classification date, inclusive
    max_float: Fraction  # exclusive
    steps: tuple[tuple[dt.date, Fraction], ...]  # (deadline, free float to reach by then)
    source: Source
    confirmed: bool
    note: str = ""


@dataclass(frozen=True)
class IpoFreeFloatTier:
    effective_from: dt.date
    effective_to: dt.date | None
    basis: str  # "market_cap" (before listing) or "equity"
    lo: int  # inclusive
    hi: int | None  # inclusive; None = no bound
    min_ratio: Fraction
    source: Source
    confirmed: bool
    note: str = ""


@dataclass(frozen=True)
class NotationCode:
    code: str
    meaning: str
    effective_from: dt.date
    effective_to: dt.date | None
    source: Source
    confirmed: bool
    note: str = ""
    shown_from: tuple[tuple[str, dt.date], ...] = ()  # (board, date) when display is phased in
    ended_by: Source | None = None


@dataclass(frozen=True)
class Event:
    on: dt.date  # first Jakarta trading day the event could move prices, or the data date
    label: str  # one line, for a chart marker
    kind: str  # "msci", "rule", "data", "index" or "halt"
    source: Source
    confirmed: bool
    note: str = ""
    announced: dt.date | None = None  # publisher's date, when it differs from `on`


@dataclass(frozen=True)
class FreeFloatStatus:
    deadline: dt.date | None
    target: Fraction | None
    tier: str | None
    overdue: bool


_D = dt.date


def _S(doc: str, url: str, *also: str) -> Source:
    return Source(doc, url, tuple(also))


# --------------------------------------------------------------------------
# Pages the values were taken from
# --------------------------------------------------------------------------

BAREKSA_2016_AR = "https://www.bareksa.com/berita/pasar-modal/2016-12-14/aturan-baru-auto-rejection-bursa-berlaku-3-januari-2017"
BISNIS_2016_TICKS = "https://market.bisnis.com/read/20160502/190/543637/bei-berlakukan-fraksi-harga-baru-mulai-hari-ini-simak-rincian-perubahannya"
KONTAN_2016_TICK_PLAN = "https://investasi.kontan.co.id/news/aturan-auto-rejection-fraksi-harga-belum-berubah"
KONTAN_2020_03_09 = "https://investasi.kontan.co.id/news/ihsg-jatuh-658-bei-ubah-batasan-auto-rejection-dan-ini-rinciannya"
CNBC_2020_03_12 = "https://www.cnbcindonesia.com/market/20200312100134-17-144276/saham-drop-10-kok-belum-kena-auto-reject-ini-penjelasan-bei"
BISNIS_2020_03_12_REF = "https://market.bisnis.com/read/20200312/7/1212339/katanya-arb-10-persen-kok-banyak-yang-lewat-ini-penjelasan-bei"
BISNIS_2020_03_12_ARB7 = "https://market.bisnis.com/read/20200312/7/1212729/redam-gejolak-batas-auto-reject-bawah-diubah-jadi-7-persen"
BISNIS_2020_03_12_HALT = "https://market.bisnis.com/read/20200312/7/1212483/pukul-15.33-wib-perdagangan-bei-mengalami-suspensi-anjlok-5-persen"
KONTAN_2020_03_13 = "https://investasi.kontan.co.id/news/mulai-hari-ini-auto-rejection-bawah-makin-kecil-dan-tak-ada-transaksi-pra-pembukaan"
SUARA_2020_03_13 = "https://www.suara.com/bisnis/2020/03/13/103607/ihsg-terus-ambles-bei-ubah-auto-rejection-jadi-7-persen"
CNBC_2020_03_13_PREOPEN = "https://www.cnbcindonesia.com/market/20200313080637-17-144547/perhatian-investor-tak-ada-pre-opening-pagi-ini"
KONTAN_2020_03_10 = "https://investasi.kontan.co.id/news/mulai-rabu-jika-ihsg-turun-5-ojk-perintahkan-bei-lakukan-trading-halt-30-menit"
KATADATA_2020_03_11 = "https://katadata.co.id/amp/finansial/bursa/5e9a42159bac0/mulai-hari-ini-bursa-setop-perdagangan-30-menit-jika-ihsg-turun-5"
BISNIS_2020_09_06 = "https://market.bisnis.com/read/20200906/7/1287822/ingat-sesi-pre-opening-indeks-lq45-mulai-berlaku-besok-7-september-2020"
KONTAN_2020_09_07 = "https://investasi.kontan.co.id/news/mulai-hari-ini-senin-79-bei-gelar-sesi-pre-opening-jam-perdagangan-belum-berubah"
IDXCHANNEL_2024_PREOPEN = "https://www.idxchannel.com/market-news/mulai-pekan-depan-bei-resmi-perluas-saham-pre-opening-dan-pre-closing/all"
KONTAN_2023_05_31 = "https://investasi.kontan.co.id/news/arb-15-berlaku-pada-perdagangan-senin-56-pekan-depan-begini-rinciannya"
CNBC_2023_06_05 = "https://www.cnbcindonesia.com/market/20230605063207-17-442870/ingat-mulai-hari-ini-berlaku-auto-rejection-bawah--arb--15"
BAREKSA_2023_08_31 = "https://www.bareksa.com/berita/saham/2023-08-31/bei-aturan-baru-batasan-persentase-auto-rejection-simetris-berlaku-mulai-4-september-2023"
KATADATA_2023_08 = "https://katadata.co.id/finansial/bursa/64eef397456f3/bei-kembalikan-aturan-saham-auto-reject-bawah-35-mulai-pekan-depan"
CNBC_2025_04_08 = "https://www.cnbcindonesia.com/market/20250408084106-17-624101/bei-ubah-kebijakan-arb-ini-aturan-terbarunya"
KONTAN_2025_04_08 = "https://momsmoney.kontan.co.id/news/bei-tetapkan-auto-rejection-bawah-arb-hanya-15-dan-mengubah-batas-trading-halt-8"
HUKUMONLINE_2026_09 = "https://www.hukumonline.com/berita/a/bei-berlakukan-batasan-harga-minimum-rp1-dan-penyesuaian-auto-rejection-lt6aba102e29b53/"
KONTAN_2026_09 = "https://investasi.kontan.co.id/news/mengenal-kebijakan-baru-bei-soal-harga-minimum-saham-rp1-beserta-batas-ara-arb"
IDXCHANNEL_2026_09_27 = "https://www.idxchannel.com/market-news/auto-rejection-kembali-simetris-analis-soroti-potensi-normalisasi-oleh-msci"
MAYBANK_ARB = "https://www.maybanktrade.co.id/produk/kamus-investasi/auto-reject-bawah/"
MAYBANK_ARA = "https://www.maybanktrade.co.id/produk/kamus-investasi/auto-reject-atas/"
MAYBANK_TICKS = "https://www.maybanktrade.co.id/produk/kamus-investasi/fraksi-harga/"
CALCUID = "https://calcuid.com/saham/ara-arb/"
BISNIS_2026_10_19 = "https://market.bisnis.com/read/20261019/7/2013651/bei-pangkas-batas-auto-rejection-bawah-arb-jadi-asimetris-7"
ECONOPOST_2026_10_19 = "https://www.theeconopost.com/bei-pangkas-batas-arb-jadi-7-mulai-19-oktober-2026-antisipasi-volatilitas-pasar/"
REPUBLIKA_2026_10_19 = "https://ekonomi.republika.co.id/berita/tn4kd5370/jaga-stabilitas-pasar-bei-sesuaikan-aturan-auto-reject-bawah-saham-jadi-7-persen"
BAREKSA_2026_10_20 = "https://www.bareksa.com/berita/saham/2026-10-20/bei-ubah-lagi-aturan-arb-mulai-20-oktober-saham-rp11rp14-dibatasi-turun-rp1"
CNBC_2026_10_20 = "https://www.cnbcindonesia.com/market/20261020071245-17-777677/bei-ubah-lagi-aturan-arb-saham-harga-rp11-rp14-kini-bisa-turun-rp1"
VIVA_2026_10_20 = "https://www.viva.co.id/bisnis/1937194-bei-ubah-aturan-arb-saham-murah-harga-rp11-rp14-kini-bisa-turun-rp1"
PASARDANA_2019_ACCEL = "https://pasardana.id/news/2019/5/28/papan-akselerasi-mungkinkan-investor-beli-saham-rp-1/"
STOCKBIT_2019_ACCEL = "https://stockbit.com/post/3046432"
STOCKBIT_ACCEL = "https://snips.stockbit.com/investasi/tag/Papan+Akselerasi"
BISNIS_2023_06_12_PPK = "https://market.bisnis.com/read/20230612/7/1664654/berlakukan-papan-pemantauan-khusus-bursa-klaim-demi-lindungi-investor"
IDXCHANNEL_2023_PPK = "https://www.idxchannel.com/market-news/papan-pemantauan-khusus-fase-hybrid-resmi-terbit-cuma-untuk-saham-ini/all"
KONTAN_2023_PPK_PLAN = "https://investasi.kontan.co.id/news/bei-akan-luncurkan-papan-pemantauan-khusus-tahap-pertama-pada-juni-2023"
ANTARA_2024_FCA = "https://www.antaranews.com/berita/4021404/bei-terapkan-full-call-auction-di-papan-pemantauan-khusus-pada-25-maret"
KONTAN_2024_FCA = "https://investasi.kontan.co.id/news/bei-implementasikan-papan-pemantauan-khusus-full-call-auction-pada-25-maret-2024"
INVESTOR_2026_09_PPK = "https://investor.id/market/455591/92-emiten-keluar-papan-pemantauan-khusus-fca"
FEASTIN_2026_09_PPK = "https://www.feastin.id/bei-perbarui-aturan-papan-pemantauan-khusus-full-call-auction/"
KATADATA_2026_09_29 = "https://katadata.co.id/finansial/bursa/6abb5e58440ef/mengenal-aturan-fca-di-pasar-saham-dan-mekanisme-perdagangannya-apa-yang-baru"
STABILITAS_2026_07 = "https://www.stabilitas.id/bei-siapkan-penyempurnaan-mekanisme-fca-batas-auto-rejection-diperluas-jadi-4-kelompok/"
INVESTORTRUST_HALTS = "https://investortrust.id/market/60121/bei-ternyata-pernah-6-kali-lakukan-trading-halt-cek-dasar-hukum-fungsi-dan-sejarahnya"
KATADATA_2025_03_18 = "https://katadata.co.id/amp/finansial/bursa/67d8fafa1013f/ihsg-rontok-5-02-bei-berlakukan-trading-halt-bekukan-perdagangan-saham/"
CNBC_2026_10_16_HALTS = "https://www.cnbcindonesia.com/research/20261016095125-128-776739/perdagangan-bursa-sempat-alami-trading-halt-ini-aturan-sejarahnya"
BISNIS_2026_10_16_HALTS = "https://market.bisnis.com/read/20261016/7/2013167/apa-itu-trading-halt-ini-penyebab-dan-catatan-kejadiannya-di-indonesia"
LIPUTAN6_2026_10_16 = "https://www.liputan6.com/saham/read/8314503/ihsg-trading-halt-hari-ini-simak-aturan-penghentian-perdagangan-saham-di-bei"
RAJAHTANN_2026_04 = "https://www.rajahtannasia.com/viewpoints/idxs-reform-of-listing-rules-stricter-free-float-share-pool-and-other-key-changes/"
ABNR_2026_05 = "https://www.abnrlaw.com/news/indonesia-overhauls-listing-requirements-under-regulation-i-a-increased-free-float-new-eligibility-metrics-and-governance-enhancements"
LEXONE_2026 = "https://www.lexone.id/artikel-hukum/aturan-bei-free-float-15-persen-saham-emiten/"
EMITENNEWS_2026_10_09 = "https://emitennews.com/news/revisi-terbaru-peraturan-pencatatan-saham-dan-ipo-di-bei-ini-poinnya"
AHP_2026_11 = "https://www.ahp.id/idx-amends-regulation-no-i-a-on-listing-changes-to-ipo-eligibility-shareholder-requirements-and-ipo-documentation/"
IDX_IA_2026_PDF = "https://www.idx.co.id/Media/0ivoa0qb/signed_peraturan_i_a_pencatatan_saham_dan_efek_bersifat_ekuitas_selain_saham.pdf"
KAF_2026_10 = "https://www.kafsekuritas.co.id/id/post/daftar-saham-free-float-di-bawah-15-terbaru-oktober-2026-data-tenggat-dan-risikonya"
KONTAN_2022_04_FF = "https://investasi.kontan.co.id/news/sejumlah-emiten-masih-belum-memenuhi-free-float"
AHP_2022_04 = "https://id.rajahtannasia.com/media/4836/ahpclientupdate-19april2022.pdf"
BAREKSA_2018_NOTATIONS = "https://www.bareksa.com/berita/pasar-modal/2018-12-28/demi-lindungi-investor-bei-terapkan-notasi-untuk-emiten-bermasalah"
LIPUTAN6_2021_NOTATIONS = "https://www.liputan6.com/saham/read/4491722/simak-arti-13-tato-untuk-emiten-di-bei"
BISNIS_2023_09_NOTATIONS = "https://market.bisnis.com/read/20230928/7/1699137/17-kode-huruf-notasi-bursa-bagi-saham-yang-dipantau-khusus"
KONTAN_2026_08_NOTATIONS = "https://investasi.kontan.co.id/news/mulai-hari-ini-bei-terapkan-notasi-khusus-baru-pada-kode-saham-ini-penjelasannya"
BITTIME_2026_08_NOTATIONS = "https://www.bittime.com/en/blog/pembaruan-notasi-saham-bei"
REPUBLIKA_2026_08_NOTATIONS = "https://ekonomi.republika.co.id/berita/tj89p4490/bei-tambah-notasi-khusus-untuk-emiten-yang-belum-penuhi-aturan-free-float"
TEMPO_2026_01 = "https://en.tempo.co/read/2083426/msci-freezes-indonesia-stock-index-rebalancing-amid-market-concerns"
BCAS_2026_01 = "https://bcasekuritas.co.id/en/research/bca-vista/msci-froze-index-changes-for-indonesian-securities-over-free-float-concerns"
RRI_2026_01 = "https://rri.co.id/en/business/2139686/ihsg-plunges-as-msci-freezes-indonesia-index-rebalancing"
MSCI_2026_04 = "https://app2.msci.com/webapp/index_ann/DocGet?pub_key=L%2FzT8OMvlCI%3D&lang=en&format=html"
TEMPO_2026_04 = "https://en.tempo.co/read/2099673/msci-extends-indonesia-index-suspension-ojk-responds"
OJK_2026_06 = "https://ojk.go.id/en/berita-dan-kegiatan/siaran-pers/Pages/MSCI-Acknowledges-Indonesia-Capital-Market-Reform-Emerging-Market-Status-Retained.aspx"
STAR_2026_06 = "https://www.thestar.com.my/business/business-news/2026/06/24/indonesia-clings-to-emerging-markets-mantle-as-msci-extends-review"
MSCI_2026_10 = "https://ir.msci.com/news-releases/news-release-details/msci-launches-consultation-proposal-reclassify-indonesia"
JAKPOST_2026_10 = "https://www.thejakartapost.com/business/2026/10/16/msci-weighs-downgrading-indonesia-to-standalone-market-status"
EURONEWS_2026_10 = "https://www.euronews.com/2026/10/16/indonesian-stocks-plunge-11-as-msci-proposes-emerging-market-downgrade"
KSEI_2026_03 = "https://www.ksei.co.id/storage/208238/Press-Release-BEI-dan-KSEI-Umumkan-Informasi-Kepemilikan-Saham.pdf"
BISNIS_2026_03_03 = "https://market.bisnis.com/read/20260303/7/1957396/bei-dan-ksei-resmi-buka-data-pemegang-saham-di-atas-1"
LIPUTAN6_2026_11_05 = "https://www.liputan6.com/saham/read/8328722/bei-ksei-buka-data-pengendali-hingga-afiliasi-saham-emiten-di-atas-1"
KONTAN_2026_11_CONTROLLERS = "https://investasi.kontan.co.id/news/bei-tambah-informasi-status-investor-di-data-pemegang-saham-1-ini-panduan-ceknya"
BISNIS_2026_10_22_HSC = "https://market.bisnis.com/read/20261022/7/2014729/bei-saham-hsc-resmi-keluar-dari-ihsg-mulai-2-november"
CNBC_2026_10_26_HSC = "https://www.cnbcindonesia.com/market/20261026103427-17-779390/saham-hsc-bakal-dikeluarkan-ihsg-bakal-terdilusi-ini-penjelasan-bei"
KUMPARAN_2026_10_HSC = "https://kumparan.com/kumparanbisnis/bei-saham-hsc-dikeluarkan-dari-hitungan-ihsg-mulai-2-november-2026-28QKeGPg1Po"

# --------------------------------------------------------------------------
# Auto-rejection limits
# --------------------------------------------------------------------------
#
# A band applies when the reference price is at or below its up_to: "Rp50-200"
# means a reference of at most Rp200, ">Rp200-5,000" at most Rp5,000. The band is
# chosen by the reference price, the tick by the limit price (see ROUNDING_RULES).


def _three_bands(lower: tuple[int, int, int], upper: tuple[int, int, int] = (35, 25, 20)) -> tuple[Band, ...]:
    return tuple(Band(up_to, _pct(u), _pct(lo)) for up_to, u, lo in zip((200, 5000, None), upper, lower))


_RP1_BAND = Band(10, _rp(1), _rp(1))

PRICE_LIMIT_RULES: tuple[PriceLimitRule, ...] = (
    # --- Main, development and new economy boards --------------------------
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2017, 1, 3),
        effective_to=_D(2020, 3, 9),
        bands=_three_bands(lower=(35, 25, 20)),
        min_price=50,
        source=_S("Kep-00113/BEI/12-2016", BAREKSA_2016_AR, KONTAN_2020_03_09),
        confirmed=True,
        note="Symmetric limits since 3 Jan 2017; in force on 1 Jan 2020. Kontan (9 Mar 2020) reports the March 2020 change as a move from symmetric to asymmetric.",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2020, 3, 10),
        effective_to=_D(2020, 3, 12),
        bands=_three_bands(lower=(10, 10, 10)),
        min_price=50,
        source=_S("Kep-00023/BEI/03-2020", KONTAN_2020_03_09, CNBC_2020_03_12),
        confirmed=True,
        note="COVID step 1, ordered by OJK letter S-273/PM.21/2020 (9 Mar 2020). Stocks traded in pre-opening had their limits computed from the opening price (REFERENCE_PRICE_RULES).",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2020, 3, 13),
        effective_to=_D(2023, 6, 4),
        bands=_three_bands(lower=(7, 7, 7)),
        min_price=50,
        source=_S("Kep-00025/BEI/03-2020", KONTAN_2020_03_13, BISNIS_2020_03_12_ARB7, SUARA_2020_03_13),
        confirmed=True,
        note="COVID step 2 (decree dated 12 Mar 2020). The same change cut the first-day multiplier to 1 and emptied the pre-opening session.",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2023, 6, 5),
        effective_to=_D(2023, 9, 3),
        bands=_three_bands(lower=(15, 15, 15)),
        min_price=50,
        source=_S("Kep-00055/BEI/03-2023", CNBC_2023_06_05, KONTAN_2023_05_31),
        confirmed=True,
        note="Normalisation phase I (decree issued 30 Mar 2023).",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2023, 9, 4),
        effective_to=_D(2025, 4, 7),
        bands=_three_bands(lower=(35, 25, 20)),
        min_price=50,
        source=_S("Kep-00055/BEI/03-2023", BAREKSA_2023_08_31, CNBC_2023_06_05, KATADATA_2023_08),
        confirmed=True,
        note="Normalisation phase II: symmetric again. II-A was amended once more by Kep-00196/BEI/12-2024, which no report ties to a change in limits.",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2025, 4, 8),
        effective_to=_D(2026, 9, 27),
        bands=_three_bands(lower=(15, 15, 15)),
        min_price=50,
        source=_S("Kep-00003/BEI/04-2025", CNBC_2025_04_08, KONTAN_2025_04_08),
        confirmed=True,
        note="Also covers ETFs and DIRE. Issued with Kep-00002/BEI/04-2025 (halt thresholds), both effective 8 Apr 2025. Revoked by Kep-00136/BEI/09-2026.",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2026, 9, 28),
        effective_to=_D(2026, 10, 18),
        bands=(_RP1_BAND,) + _three_bands(lower=(15, 15, 15)),
        min_price=1,
        source=_S("Kep-00136/BEI/09-2026", HUKUMONLINE_2026_09, KONTAN_2026_09, MAYBANK_ARB, MAYBANK_ARA),
        confirmed=True,
        note="Decree dated 21 Sep 2026. Minimum price cut from Rp50 to Rp1 on the regular and cash markets; references of Rp1-10 may move Rp1 either way. It scheduled symmetric limits from 1 Jan 2027 (SCHEDULED_PRICE_LIMIT_RULES) before Kep-00157 replaced it.",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2026, 10, 19),
        effective_to=_D(2026, 10, 19),
        bands=(_RP1_BAND,) + _three_bands(lower=(7, 7, 7)),
        min_price=1,
        source=_S("Kep-00157/BEI/10-2026", ECONOPOST_2026_10_19, BISNIS_2026_10_19, REPUBLIKA_2026_10_19, BAREKSA_2026_10_20),
        confirmed=True,
        note="Announced to run to 31 Dec 2026, upper limits unchanged; replaced the next day. Republika's text names only Rp11-200, but the tables in TheEconoPost and in the Kep-00158 reports show 7% for every band above Rp10. If IDX rounds the lower limit up (ROUNDING_RULES), 7% of a Rp11-14 reference is less than one tick, so those stocks could not fall that day, which is what Kep-00158 fixed.",
    ),
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2026, 10, 20),
        effective_to=_D(2026, 12, 31),
        bands=(
            _RP1_BAND,
            Band(14, _pct(35), _rp(1)),
            Band(200, _pct(35), _pct(7)),
            Band(5000, _pct(25), _pct(7)),
            Band(None, _pct(20), _pct(7)),
        ),
        min_price=1,
        source=_S("Kep-00158/BEI/10-2026", BAREKSA_2026_10_20, CNBC_2026_10_20, VIVA_2026_10_20),
        confirmed=True,
        note="Replaced Kep-00157. References of Rp11-14 may fall Rp1. Runs to 31 Dec 2026 and is then to be evaluated; no rule for 2027 has been confirmed.",
    ),
    # --- Acceleration board ------------------------------------------------
    PriceLimitRule(
        boards=frozenset({"acceleration"}),
        effective_from=RULEBOOK_START,
        effective_to=_D(2020, 3, 12),
        bands=(_RP1_BAND, Band(None, _pct(10), _pct(10))),
        min_price=1,
        source=_S("Kep-00084/BEI/10-2019 (Peraturan II-V)", CALCUID, STOCKBIT_2019_ACCEL, PASARDANA_2019_ACCEL),
        confirmed=True,
        note="Board opened in July 2019; in force on 1 Jan 2020. Calcuid cites II-V points II.1.2.2.1-2; a 2019 Stockbit post quotes IDX's trading director on the same Rp1 and 10% limits.",
    ),
    PriceLimitRule(
        boards=frozenset({"acceleration"}),
        effective_from=_D(2020, 3, 13),
        effective_to=_D(2023, 6, 4),
        bands=(_RP1_BAND, Band(None, _pct(10), _pct(10))),
        min_price=1,
        source=_S("Kep-00084/BEI/10-2019 (Peraturan II-V)", CALCUID, KONTAN_2023_05_31),
        confirmed=False,
        note="Not confirmed. The COVID decrees amended II-A, not II-V, so the 10% lower limit is assumed to have stayed. But Kontan (31 May 2023) says stocks on IDX's monitoring list went from a 7% to a 10% lower limit on 5 Jun 2023; if that meant this board, its lower limit was 7% here.",
    ),
    PriceLimitRule(
        boards=frozenset({"acceleration"}),
        effective_from=_D(2023, 6, 5),
        effective_to=None,
        bands=(_RP1_BAND, Band(None, _pct(10), _pct(10))),
        min_price=1,
        source=_S("Kep-00084/BEI/10-2019 (Peraturan II-V)", CALCUID, STOCKBIT_ACCEL, BAREKSA_2026_10_20),
        confirmed=True,
        note="Stockbit contrasts the board's symmetric 10% with the regular boards' flat 15% lower limit (2025-26); the 2025 and 2026 decrees name only the main, development and new economy boards, and IDX said in Oct 2026 that this board keeps its own limits.",
    ),
    # --- Special monitoring board ------------------------------------------
    PriceLimitRule(
        boards=frozenset({"special_monitoring"}),
        effective_from=_D(2023, 6, 12),
        effective_to=_D(2024, 3, 24),
        bands=(_RP1_BAND, Band(None, _pct(10), _pct(10))),
        min_price=1,
        source=_S("Peraturan II-X (June 2023)", IDXCHANNEL_2023_PPK, BISNIS_2023_06_12_PPK, KONTAN_2023_PPK_PLAN),
        confirmed=True,
        note="Phase I (hybrid): call auction for stocks placed on liquidity grounds, continuous auction for the rest. A pre-launch Kontan report gave Rp50, not Rp1, as the minimum price for the continuous-auction group; launch-day reports say Rp1.",
    ),
    PriceLimitRule(
        boards=frozenset({"special_monitoring"}),
        effective_from=_D(2024, 3, 25),
        effective_to=_D(2026, 9, 27),
        bands=(_RP1_BAND, Band(None, _pct(10), _pct(10))),
        min_price=1,
        source=_S("Kep-00316/BEI/11-2023 (Peraturan II-X)", ANTARA_2024_FCA, KONTAN_2024_FCA, CALCUID),
        confirmed=True,
        note="Phase II: full call auction for every stock on the board (IDX press release 018/BEI.SPR/03-2024). Limits are 10% of the previous close.",
    ),
    PriceLimitRule(
        boards=frozenset({"special_monitoring"}),
        effective_from=_D(2026, 9, 28),
        effective_to=None,
        bands=(_RP1_BAND, Band(None, _pct(10), _pct(10))),
        min_price=1,
        source=_S("Peraturan I-X and II-X (revised, effective 28 Sep 2026)", INVESTOR_2026_09_PPK, CALCUID, STABILITAS_2026_07, KATADATA_2026_09_29, FEASTIN_2026_09_PPK),
        confirmed=False,
        note="Not confirmed. The board's rules were revised on 28 Sep 2026 (criteria 1, 6, 7 and 10 dropped, about 92 stocks left, non-cancellation period added). IDX had proposed in July 2026 to replace the flat 10% with 35/25/20% bands. Calcuid still lists 10%; Katadata (29 Sep 2026) shows 35/25/20% up and 15% down until 31 Dec 2026, but may be describing the regular boards. The last confirmed value, 10%, is kept.",
    ),
)

# Announced but not in force on any date the lookups accept. Kept so the next
# rule can be activated in one move once IDX confirms it.
SCHEDULED_PRICE_LIMIT_RULES: tuple[PriceLimitRule, ...] = (
    PriceLimitRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2027, 1, 1),
        effective_to=None,
        bands=(_RP1_BAND,) + _three_bands(lower=(35, 25, 20)),
        min_price=1,
        source=_S("Kep-00136/BEI/09-2026 (Lampiran VI.7.1.1, deferred to 1 Jan 2027)", MAYBANK_ARA, CALCUID, KONTAN_2026_09, IDXCHANNEL_2026_09_27),
        confirmed=False,
        note="Not confirmed. Scheduled by Kep-00136, which Kep-00157 replaced on 19 Oct 2026; the Kep-00157/00158 reports only say the 7% limit runs to 31 Dec 2026 and will then be evaluated.",
    ),
)

FIRST_DAY_RULES: tuple[FirstDayRule, ...] = (
    FirstDayRule(
        boards=REGULAR_BOARDS,
        effective_from=RULEBOOK_START,
        effective_to=_D(2020, 3, 12),
        multiplier=2,
        source=_S("Peraturan II-A before Kep-00025/BEI/03-2020", KONTAN_2020_03_13, SUARA_2020_03_13),
        confirmed=False,
        note="Not confirmed for the lower limit. Two reports confirm that a new listing's first-day limits were twice the normal percentage until 12 Mar 2020; they do not say whether the lower limit was doubled too, which this entry assumes. Start date not checked.",
    ),
    FirstDayRule(
        boards=REGULAR_BOARDS,
        effective_from=_D(2020, 3, 13),
        effective_to=None,
        multiplier=1,
        source=_S("Kep-00025/BEI/03-2020", KONTAN_2020_03_13, SUARA_2020_03_13, MAYBANK_ARA),
        confirmed=True,
        note="First-day limits equal the normal ones, computed from the offer price (Maybank Sekuritas, 2026).",
    ),
)

# --------------------------------------------------------------------------
# Ticks, rounding and the reference price
# --------------------------------------------------------------------------

_TICKS = ((0, 1), (200, 2), (500, 5), (2000, 10), (5000, 25))

TICK_RULES: tuple[TickRule, ...] = (
    TickRule(
        effective_from=_D(2016, 5, 2),
        effective_to=_D(2026, 9, 27),
        bands=_TICKS,
        source=_S("Kep-00023/BEI/04-2016, restated in Kep-00113/BEI/12-2016", BISNIS_2016_TICKS, KONTAN_2016_TICK_PLAN, BAREKSA_2016_AR, MAYBANK_TICKS),
        confirmed=True,
        note="Five bands since 2 May 2016: under Rp200 Rp1, Rp200-<500 Rp2, Rp500-<2,000 Rp5, Rp2,000-<5,000 Rp10, Rp5,000 and up Rp25. The 2016 table and IDX's 2026 table are identical and no change in between was reported. Applies to the regular and cash markets; the two special boards are assumed to use it too.",
    ),
    TickRule(
        effective_from=_D(2026, 9, 28),
        effective_to=None,
        bands=_TICKS,
        source=_S("Kep-00136/BEI/09-2026", MAYBANK_TICKS, CALCUID),
        confirmed=True,
        note="Same ticks, restated with the Rp1 minimum price. ETFs, DIRE and DINFRA use a flat Rp1 tick (not covered here).",
    ),
)

ROUNDING_RULES: tuple[RoundingRule, ...] = (
    RoundingRule(
        effective_from=RULEBOOK_START,
        effective_to=None,
        text=(
            "Upper limit: the highest valid price at or below reference x (1 + upper %). "
            "Lower limit: the lowest valid price at or above reference x (1 - lower %), and never below the "
            "board's minimum price. A valid price is a multiple of the tick that applies at that price, not at the "
            "reference. Rupiah limits (Rp1 bands) are added to or subtracted from the reference."
        ),
        source=_S("Peraturan II-A (reading of the auto-rejection and tick provisions)", CALCUID, BAREKSA_2026_10_20, MAYBANK_ARA),
        confirmed=False,
        note=(
            "Not confirmed from an official text. Calcuid states this reading of II-A as its own interpretation "
            "(example: reference Rp1,250 gives Rp1,560 and Rp1,065). Kep-00158/BEI/10-2026 is strong indirect "
            "evidence for the lower side: if IDX rounded the lower limit down, 7% of a Rp11-14 reference would "
            "already allow a Rp1 fall and Kep-00158 would have changed nothing. IDX's own examples "
            "(Rp1,000 -> Rp1,250) need no rounding."
        ),
    ),
)

REFERENCE_PRICE_RULES: tuple[ReferencePriceRule, ...] = (
    ReferencePriceRule(
        effective_from=RULEBOOK_START,
        effective_to=_D(2020, 3, 12),
        basis="opening_price_if_preopening",
        text="Stocks on the pre-opening list (which included the LQ45): limits for the regular session computed from the opening price formed in pre-opening. Other stocks: previous close.",
        source=_S("Peraturan II-A (as in force early 2020)", CNBC_2020_03_12, BISNIS_2020_03_12_REF, BISNIS_2020_09_06),
        confirmed=True,
        note="IDX's trading director explained on 12 Mar 2020 that the 10% limit counted from the opening; Bisnis (Sep 2020) describes the switch from opening price to previous close. Limits from the previous close are therefore approximate for pre-opening stocks on these dates. Start date not checked.",
    ),
    ReferencePriceRule(
        effective_from=_D(2020, 3, 13),
        effective_to=_D(2020, 9, 6),
        basis="previous_close",
        text="No pre-opening session: every stock's limits computed from the previous close.",
        source=_S("Kep-00025/BEI/03-2020", KONTAN_2020_03_13, CNBC_2020_03_13_PREOPEN),
        confirmed=True,
    ),
    ReferencePriceRule(
        effective_from=_D(2020, 9, 7),
        effective_to=None,
        basis="previous_close",
        text="Pre-opening back (LQ45 from 7 Sep 2020; main, development and new economy boards from 9 Dec 2024), with limits computed from the previous close in every session.",
        source=_S("Peraturan II-A (Sep 2020 change)", BISNIS_2020_09_06, KONTAN_2020_09_07, IDXCHANNEL_2024_PREOPEN, MAYBANK_ARA),
        confirmed=True,
        note="Exceptions: the theoretical price on a corporate action's ex-date and the offer price on a listing day.",
    ),
)

# --------------------------------------------------------------------------
# Market-wide halts and suspensions
# --------------------------------------------------------------------------

HALT_RULES: tuple[HaltRule, ...] = (
    HaltRule(
        effective_from=RULEBOOK_START,
        effective_to=_D(2020, 3, 10),
        steps=(HaltStep(Fraction(10, 100), "halt", 30), HaltStep(Fraction(15, 100), "suspend", None)),
        source=_S("Kep-00366/BEI/05-2012", KONTAN_2020_03_10, KATADATA_2020_03_11),
        confirmed=True,
        note="In force on 1 Jan 2020; start date not checked. A suspension lasts to the end of the session or longer, with OJK approval.",
    ),
    HaltRule(
        effective_from=_D(2020, 3, 11),
        effective_to=_D(2025, 4, 7),
        steps=(
            HaltStep(Fraction(5, 100), "halt", 30),
            HaltStep(Fraction(10, 100), "halt", 30),
            HaltStep(Fraction(15, 100), "suspend", None),
        ),
        source=_S("Kep-00024/BEI/03-2020", KATADATA_2020_03_11, KONTAN_2020_03_10, INVESTORTRUST_HALTS),
        confirmed=True,
        note="Decree dated 10 Mar 2020, ordered by OJK letter S-274/PM.21/2020.",
    ),
    HaltRule(
        effective_from=_D(2025, 4, 8),
        effective_to=None,
        steps=(
            HaltStep(Fraction(8, 100), "halt", 30),
            HaltStep(Fraction(15, 100), "halt", 30),
            HaltStep(Fraction(20, 100), "suspend", None),
        ),
        source=_S("Kep-00002/BEI/04-2025", CNBC_2025_04_08, CNBC_2026_10_16_HALTS, LIPUTAN6_2026_10_16),
        confirmed=True,
        note="Still cited as current in October 2026. IDX said the 7% lower limit of Oct 2026 left these thresholds unchanged.",
    ),
)

# --------------------------------------------------------------------------
# Peraturan I-A: free float
# --------------------------------------------------------------------------

FREE_FLOAT_CLASSIFICATION_DATE = _D(2026, 3, 31)  # transition tiers use market cap and float on this date
_CAP_5T = 5_000_000_000_000
_CAP_50T = 50_000_000_000_000
_CAP_500B = 500_000_000_000
_CAP_2T = 2_000_000_000_000

_EXCLUDED_2026 = (
    "shares of holders with 5% or more of listed shares",
    "shares of the controlling shareholder and its affiliates",
    "shares of members of the boards of directors and commissioners",
    "treasury shares",
    "shares under transfer restrictions: legal or corporate-action lock-ups, venture capital and private equity holdings of any size, shares seized or blocked by authorities, ESOP/ESA shares under voluntary lock-up",
    "shares that are not scripless or not listed",
)

FREE_FLOAT_RULES: tuple[FreeFloatRule, ...] = (
    FreeFloatRule(
        effective_from=RULEBOOK_START,
        effective_to=_D(2021, 12, 20),
        min_ratio=Fraction(75, 1000),
        min_shares=50_000_000,
        excluded=(),
        source=_S("Kep-00183/BEI/12-2018 (Peraturan I-A 2018)", KONTAN_2022_04_FF, AHP_2022_04),
        confirmed=False,
        note="Not confirmed. The decree number is from memory and was not checked; the 7.5% and 50 million share minimum is assumed to be the one Kep-00101 carried over. Definition not checked.",
    ),
    FreeFloatRule(
        effective_from=_D(2021, 12, 21),
        effective_to=_D(2026, 3, 30),
        min_ratio=Fraction(75, 1000),
        min_shares=50_000_000,
        excluded=(),
        source=_S("Kep-00101/BEI/12-2021", KONTAN_2022_04_FF, RAJAHTANN_2026_04, ABNR_2026_05),
        confirmed=True,
        note="At least 7.5% of listed shares and 50 million shares (Ketentuan V.1), plus 300 SID holders. In force from December 2021; the day (21 Dec) comes from search results. IDX allowed two years, to December 2023, to comply. The definition of this version was not checked.",
    ),
    FreeFloatRule(
        effective_from=_D(2026, 3, 31),
        effective_to=_D(2026, 10, 8),
        min_ratio=Fraction(15, 100),
        min_shares=50_000_000,
        excluded=_EXCLUDED_2026,
        acceleration_min_ratio=Fraction(75, 1000),
        source=_S("Kep-00045/BEI/03-2026", RAJAHTANN_2026_04, ABNR_2026_05, LEXONE_2026),
        confirmed=True,
        note="Effective 31 Mar 2026 with circular SE-00004/BEI/03-2026 and OJK approval S-78/PM.01/2026. IDX may, on a listed company's petition, count named holders as free float. The acceleration board's 7.5% comes from one report (Lexone).",
    ),
    FreeFloatRule(
        effective_from=_D(2026, 10, 9),
        effective_to=None,
        min_ratio=Fraction(15, 100),
        min_shares=50_000_000,
        excluded=_EXCLUDED_2026,
        acceleration_min_ratio=Fraction(75, 1000),
        source=_S("Kep-00152/BEI/10-2026", EMITENNEWS_2026_10_09, AHP_2026_11, IDX_IA_2026_PDF),
        confirmed=True,
        note="Issued 7 Oct 2026, effective 9 Oct 2026, replacing Kep-00045. Keeps the 15% minimum and the transition; extends the petition to IPO applicants, drops the Rp100 minimum IPO price, and requires more than 1,000 SID holders (and, per EmitenNews, a free float market cap above Rp200 billion) to stay on the main board. No change to the definition was reported.",
    ),
)


def _transition_tiers(src: Source, start: dt.date, end: dt.date | None, mid_confirmed: bool, mid_note: str) -> tuple[FreeFloatTier, ...]:
    return (
        FreeFloatTier(
            effective_from=start,
            effective_to=end,
            name="large_below_12_5",
            min_cap=_CAP_5T,
            max_cap=None,
            min_float=Fraction(0),
            max_float=Fraction(125, 1000),
            steps=((_D(2027, 3, 31), Fraction(125, 1000)), (_D(2028, 3, 31), Fraction(15, 100))),
            source=src,
            confirmed=True,
            note="Market cap of Rp5 trillion or more and free float under 12.5% on 31 Mar 2026: 12.5% by 31 Mar 2027, 15% by 31 Mar 2028.",
        ),
        FreeFloatTier(
            effective_from=start,
            effective_to=end,
            name="large_12_5_to_15",
            min_cap=_CAP_5T,
            max_cap=None,
            min_float=Fraction(125, 1000),
            max_float=Fraction(15, 100),
            steps=((_D(2027, 3, 31), Fraction(15, 100)),),
            source=src,
            confirmed=mid_confirmed,
            note=mid_note,
        ),
        FreeFloatTier(
            effective_from=start,
            effective_to=end,
            name="small",
            min_cap=0,
            max_cap=_CAP_5T,
            min_float=Fraction(0),
            max_float=Fraction(15, 100),
            steps=((_D(2029, 3, 31), Fraction(15, 100)),),
            source=src,
            confirmed=True,
            note="Market cap under Rp5 trillion on 31 Mar 2026: 15% by 31 Mar 2029. IDX may adjust the timelines with OJK approval.",
        ),
    )


FREE_FLOAT_TIERS: tuple[FreeFloatTier, ...] = _transition_tiers(
    _S("Kep-00045/BEI/03-2026", RAJAHTANN_2026_04, ABNR_2026_05, LEXONE_2026),
    _D(2026, 3, 31),
    _D(2026, 10, 8),
    True,
    "Market cap of Rp5 trillion or more and free float of 12.5% to under 15% on 31 Mar 2026: 15% by 31 Mar 2027, no interim step.",
) + _transition_tiers(
    _S("Kep-00152/BEI/10-2026", EMITENNEWS_2026_10_09, IDX_IA_2026_PDF, KAF_2026_10, AHP_2026_11),
    _D(2026, 10, 9),
    None,
    False,
    "Not confirmed for Kep-00152: carried over from Kep-00045. The reports on Kep-00152 restate the other two tiers but not this one; none reports a change.",
)

IPO_FREE_FLOAT_TIERS: tuple[IpoFreeFloatTier, ...] = tuple(
    IpoFreeFloatTier(
        effective_from=RULEBOOK_START,
        effective_to=_D(2026, 3, 30),
        basis="equity",
        lo=lo,
        hi=hi,
        min_ratio=Fraction(r, 100),
        source=_S("Kep-00183/BEI/12-2018 and Kep-00101/BEI/12-2021 (Peraturan I-A)", LEXONE_2026, RAJAHTANN_2026_04),
        confirmed=False,
        note="Not confirmed. Lexone says the 2026 tiers replaced a 10-20% requirement based on equity; the Rp500 billion and Rp2 trillion cut-offs are from memory. Shares not held by controllers or main shareholders, measured after the offering.",
    )
    for lo, hi, r in ((0, _CAP_500B - 1, 20), (_CAP_500B, _CAP_2T, 15), (_CAP_2T + 1, None, 10))
) + tuple(
    IpoFreeFloatTier(
        effective_from=start,
        effective_to=end,
        basis="market_cap",
        lo=lo,
        hi=hi,
        min_ratio=Fraction(r, 100),
        source=src,
        confirmed=ok,
        note=note,
    )
    for start, end, src, ok, note in (
        (
            _D(2026, 3, 31),
            _D(2026, 10, 8),
            _S("Kep-00045/BEI/03-2026", RAJAHTANN_2026_04, ABNR_2026_05),
            True,
            "Market cap before listing; main and development boards. Also at least 300 million (main) or 150 million (development) free float shares, kept for a year. IDX may set another level for offerings of Rp30 trillion or more.",
        ),
        (
            _D(2026, 10, 9),
            None,
            _S("Kep-00152/BEI/10-2026", AHP_2026_11, EMITENNEWS_2026_10_09),
            False,
            "Not confirmed for Kep-00152: carried over from Kep-00045. AHP's summary of the changes (4 Nov 2026) lists none to these tiers.",
        ),
    )
    for lo, hi, r in ((0, _CAP_5T - 1, 25), (_CAP_5T, _CAP_50T, 20), (_CAP_50T + 1, None, 15))
)

# --------------------------------------------------------------------------
# Special notations (the letters after a stock code)
# --------------------------------------------------------------------------

_NOTATIONS_2018 = _S("IDX notation circular (Dec 2018)", BAREKSA_2018_NOTATIONS, LIPUTAN6_2021_NOTATIONS)
_NOTATIONS_2021 = _S("SE-00002/BEI/01-2021", LIPUTAN6_2021_NOTATIONS)
_NOTATIONS_2023 = _S("SE-00006/BEI/05-2023", KONTAN_2026_08_NOTATIONS, BISNIS_2023_09_NOTATIONS, BISNIS_2023_06_12_PPK)
_NOTATIONS_2026 = _S("SE-00009/BEI/07-2026", KONTAN_2026_08_NOTATIONS, BITTIME_2026_08_NOTATIONS, REPUBLIKA_2026_08_NOTATIONS)
_REMOVED_2026 = _D(2026, 11, 29)  # E, D, A and S are shown up to this day

_NOTE_2018 = "Shown since 27 Dec 2018; in force on 1 Jan 2020. The circular's number was not found."
_NOTE_REMOVED = "Removed after the transition ending 30 Nov 2026 (SE-00009/BEI/07-2026): the same facts now feed the special monitoring board's criteria."
_NOTE_2021 = "Not confirmed: circular dated 18 Jan 2021 per search results; the first day the letter was shown was not checked."
_NOTE_2023 = "Not confirmed: SE-00006/BEI/05-2023 (May 2023) added it; the first day it was shown was not checked and is set to the special monitoring board's launch."

NOTATIONS: tuple[NotationCode, ...] = (
    NotationCode("B", "bankruptcy petition, annulment of a composition, or declared bankrupt", RULEBOOK_START, None, _NOTATIONS_2018, True, _NOTE_2018),
    NotationCode("M", "petition for suspension of debt payments (PKPU)", RULEBOOK_START, None, _NOTATIONS_2018, True, _NOTE_2018),
    NotationCode("E", "latest financial statements show negative equity", RULEBOOK_START, _REMOVED_2026, _NOTATIONS_2018, True, f"{_NOTE_2018} {_NOTE_REMOVED}", ended_by=_NOTATIONS_2026),
    NotationCode("S", "latest financial statements show no operating revenue", RULEBOOK_START, _REMOVED_2026, _NOTATIONS_2018, True, f"{_NOTE_2018} {_NOTE_REMOVED}", ended_by=_NOTATIONS_2026),
    NotationCode("A", "adverse audit opinion", RULEBOOK_START, _REMOVED_2026, _NOTATIONS_2018, True, f"{_NOTE_2018} {_NOTE_REMOVED}", ended_by=_NOTATIONS_2026),
    NotationCode("D", "disclaimer of audit opinion", RULEBOOK_START, _REMOVED_2026, _NOTATIONS_2018, True, f"{_NOTE_2018} {_NOTE_REMOVED}", ended_by=_NOTATIONS_2026),
    NotationCode("L", "financial statements not submitted on time", RULEBOOK_START, None, _NOTATIONS_2018, True, _NOTE_2018),
    NotationCode("C", "material legal case involving the company, a subsidiary, or its directors or commissioners", _D(2021, 1, 18), None, _NOTATIONS_2021, False, _NOTE_2021),
    NotationCode("Q", "business activities restricted by a regulator", _D(2021, 1, 18), None, _NOTATIONS_2021, False, _NOTE_2021),
    NotationCode("Y", "no annual general meeting within six months of the financial year end", _D(2021, 1, 18), None, _NOTATIONS_2021, False, _NOTE_2021),
    NotationCode("F", "light OJK administrative sanction or written order", _D(2021, 1, 18), None, _NOTATIONS_2021, False, _NOTE_2021),
    NotationCode("G", "moderate OJK administrative sanction or written order", _D(2021, 1, 18), None, _NOTATIONS_2021, False, _NOTE_2021),
    NotationCode("V", "heavy OJK administrative sanction or written order", _D(2021, 1, 18), None, _NOTATIONS_2021, False, _NOTE_2021),
    NotationCode("N", "multiple voting shares, not on the new economy board", _D(2023, 6, 12), None, _NOTATIONS_2023, False, _NOTE_2023),
    NotationCode("K", "multiple voting shares, on the new economy board", _D(2023, 6, 12), None, _NOTATIONS_2023, False, _NOTE_2023),
    NotationCode("I", "no multiple voting shares, on the new economy board", _D(2023, 6, 12), None, _NOTATIONS_2023, False, _NOTE_2023),
    NotationCode(
        "X",
        "placed on the special monitoring board",
        _D(2023, 6, 12),
        None,
        _NOTATIONS_2023,
        False,
        "Not confirmed: start set to the board's launch (12 Jun 2023). IDX's monitoring list took effect on 5 Jun 2023, so the letter may predate the board by a week. remarks.py checks X against board code 4.",
    ),
    NotationCode(
        "P",
        "free float requirement not met (Peraturan I-A, or I-V for the acceleration board)",
        _D(2026, 8, 3),
        None,
        _NOTATIONS_2026,
        True,
        "The circular took effect on 3 Aug 2026 (issued 31 Jul 2026, replacing SE-00006/BEI/05-2023), but P is shown only from 30 Nov 2026 on the acceleration board and 30 Apr 2027 on the main and development boards. Before then, no P does not mean compliance. The new economy board's date was not reported. Companion circular SE-00010/BEI/07-2026 changed the JATS Remarks display the same day.",
        shown_from=(("acceleration", _D(2026, 11, 30)), ("main", _D(2027, 4, 30)), ("development", _D(2027, 4, 30))),
    ),
)

# --------------------------------------------------------------------------
# Chart markers
# --------------------------------------------------------------------------

EVENTS: tuple[Event, ...] = (
    Event(_D(2020, 3, 10), "Lower price limit cut to 10%", "rule", _S("Kep-00023/BEI/03-2020", KONTAN_2020_03_09, CNBC_2020_03_12), True),
    Event(_D(2020, 3, 11), "Market-wide halt now triggered by a 5% IHSG fall", "rule", _S("Kep-00024/BEI/03-2020", KATADATA_2020_03_11, KONTAN_2020_03_10), True),
    Event(_D(2020, 3, 12), "Trading halt: IHSG down 5.01% at 15:33", "halt", _S("Kep-00024/BEI/03-2020", KONTAN_2020_03_13, BISNIS_2020_03_12_HALT), True),
    Event(_D(2020, 3, 13), "Lower limit cut to 7%, pre-opening suspended, first-day limits no longer doubled", "rule", _S("Kep-00025/BEI/03-2020", KONTAN_2020_03_13, SUARA_2020_03_13), True),
    Event(_D(2020, 9, 7), "Pre-opening back for LQ45; limits counted from the previous close", "rule", _S("Peraturan II-A (Sep 2020 change)", BISNIS_2020_09_06, KONTAN_2020_09_07), True),
    Event(
        _D(2021, 12, 21),
        "Peraturan I-A reissued; free float minimum stays 7.5%",
        "rule",
        _S("Kep-00101/BEI/12-2021", KONTAN_2022_04_FF, AHP_2022_04),
        False,
        "Not confirmed: IDX says the rule took effect in December 2021; the day comes from search results.",
    ),
    Event(_D(2023, 6, 5), "Lower price limit raised to 15%", "rule", _S("Kep-00055/BEI/03-2023", CNBC_2023_06_05, KONTAN_2023_05_31), True),
    Event(_D(2023, 6, 12), "Special monitoring board opens (phase I, hybrid auction)", "rule", _S("Peraturan I-X and II-X (June 2023)", BISNIS_2023_06_12_PPK, IDXCHANNEL_2023_PPK), True),
    Event(_D(2023, 9, 4), "Symmetric price limits restored (35/25/20%)", "rule", _S("Kep-00055/BEI/03-2023", BAREKSA_2023_08_31, CNBC_2023_06_05), True),
    Event(_D(2024, 3, 25), "Special monitoring board moves to full call auction", "rule", _S("Kep-00316/BEI/11-2023 (Peraturan II-X)", ANTARA_2024_FCA, KONTAN_2024_FCA), True),
    Event(_D(2025, 3, 18), "Trading halt: IHSG down 5% at 11:19", "halt", _S("Kep-00024/BEI/03-2020", INVESTORTRUST_HALTS, KATADATA_2025_03_18), True),
    Event(_D(2025, 4, 8), "Lower limit 15%; halt thresholds raised to 8/15/20%", "rule", _S("Kep-00002/BEI/04-2025 and Kep-00003/BEI/04-2025", CNBC_2025_04_08, KONTAN_2025_04_08), True),
    Event(_D(2025, 4, 8), "Trading halt: IHSG down more than 8% at the open", "halt", _S("Kep-00002/BEI/04-2025", CNBC_2026_10_16_HALTS, BISNIS_2026_10_16_HALTS), True, "CNBC Indonesia puts the fall at more than 9% at the open."),
    Event(
        _D(2026, 1, 28),
        "MSCI freezes index increases for Indonesian stocks over free float concerns",
        "msci",
        _S("MSCI announcement of 27 Jan 2026 on the free float assessment of Indonesian securities", TEMPO_2026_01, BCAS_2026_01, RRI_2026_01, MSCI_2026_04),
        True,
        "IHSG fell 7.35% that day. MSCI's own text was not read; its 20 Apr 2026 notice confirms the 27 Jan date.",
        announced=_D(2026, 1, 27),
    ),
    Event(_D(2026, 1, 28), "Trading halt: IHSG down more than 8%", "halt", _S("Kep-00002/BEI/04-2025", CNBC_2026_10_16_HALTS, BISNIS_2026_10_16_HALTS), True),
    Event(_D(2026, 1, 29), "Trading halt: IHSG down more than 8% again", "halt", _S("Kep-00002/BEI/04-2025", CNBC_2026_10_16_HALTS, BISNIS_2026_10_16_HALTS), True),
    Event(
        _D(2026, 3, 3),
        "IDX and KSEI publish every shareholder above 1% (data as of 27 Feb 2026)",
        "data",
        _S("IDX-KSEI joint press release, 3 Mar 2026", KSEI_2026_03, BISNIS_2026_03_03),
        True,
        "Monthly from then on. Before, only holdings of 5% or more were public.",
    ),
    Event(_D(2026, 3, 31), "Peraturan I-A: free float minimum raised to 15%", "rule", _S("Kep-00045/BEI/03-2026", RAJAHTANN_2026_04, ABNR_2026_05), True),
    Event(
        _D(2026, 4, 21),
        "MSCI keeps the freeze for the May 2026 review, will drop High Shareholding Concentration stocks",
        "msci",
        _S("MSCI, Update on free float assessment of Indonesian securities (20 Apr 2026)", MSCI_2026_04, TEMPO_2026_04),
        True,
        "Released 20 Apr 2026 at 20:04 GMT, after the Jakarta close. MSCI also said it may use the 1% data to adjust free float.",
        announced=_D(2026, 4, 20),
    ),
    Event(
        _D(2026, 6, 24),
        "MSCI keeps Indonesia as Emerging, sets the November 2026 review as the deadline for progress",
        "msci",
        _S("MSCI 2026 Market Classification Review", OJK_2026_06, STAR_2026_06),
        True,
        "Released 23 Jun 2026 (US time). The accessibility review of 18 Jun 2026 cut Indonesia's information flow rating to negative. MSCI's own text was not read.",
        announced=_D(2026, 6, 23),
    ),
    Event(_D(2026, 8, 3), "Notation P added; E, D, A and S to go; JATS Remarks display changed", "rule", _S("SE-00009/BEI/07-2026 and SE-00010/BEI/07-2026", KONTAN_2026_08_NOTATIONS, BITTIME_2026_08_NOTATIONS), True),
    Event(
        _D(2026, 9, 28),
        "Minimum price cut to Rp1; special monitoring board criteria revised",
        "rule",
        _S("Kep-00136/BEI/09-2026 and Peraturan I-X", HUKUMONLINE_2026_09, KONTAN_2026_09, INVESTOR_2026_09_PPK),
        True,
        "About 92 stocks left the special monitoring board the same day.",
    ),
    Event(_D(2026, 10, 9), "Peraturan I-A revised (second stage)", "rule", _S("Kep-00152/BEI/10-2026", EMITENNEWS_2026_10_09, AHP_2026_11), True),
    Event(
        _D(2026, 10, 16),
        "MSCI consults on moving Indonesia from Emerging to Standalone status",
        "msci",
        _S("MSCI consultation, 15 Oct 2026", MSCI_2026_10, JAKPOST_2026_10, EURONEWS_2026_10),
        True,
        "Released 15 Oct 2026 (US time). Feedback closes 30 Apr 2027; decision on or before 30 Jun 2027. The freeze continues until further notice.",
        announced=_D(2026, 10, 15),
    ),
    Event(
        _D(2026, 10, 16),
        "Trading halt: IHSG down 8.01% at the open",
        "halt",
        _S("Kep-00002/BEI/04-2025", LIPUTAN6_2026_10_16, CNBC_2026_10_16_HALTS),
        True,
        "Euronews reports a fall of more than 11% on the day.",
    ),
    Event(_D(2026, 10, 19), "Lower price limit cut to 7% until 31 Dec 2026", "rule", _S("Kep-00157/BEI/10-2026", BISNIS_2026_10_19, ECONOPOST_2026_10_19, REPUBLIKA_2026_10_19), True),
    Event(_D(2026, 10, 20), "Stocks at Rp11-14 may fall Rp1", "rule", _S("Kep-00158/BEI/10-2026", BAREKSA_2026_10_20, CNBC_2026_10_20), True),
    Event(
        _D(2026, 10, 30),
        "First 1% register flagging controllers and their affiliates (data as of 30 Oct 2026)",
        "data",
        _S("Kep-00160/BEI/11-2026", LIPUTAN6_2026_11_05, KONTAN_2026_11_CONTROLLERS),
        True,
        "Decree dated 2 Nov 2026; the flags come from companies' monthly LBRE reports. The marker sits on the data date; publication was in early November.",
    ),
    Event(
        _D(2026, 11, 2),
        "High Shareholding Concentration stocks leave IHSG",
        "index",
        _S("Peng-00201/BEI.POP/10-2026", BISNIS_2026_10_22_HSC, CNBC_2026_10_26_HSC, KUMPARAN_2026_10_HSC),
        True,
        "80 stocks per IDX's 13 Oct 2026 list, about 18% of IHSG's weight per IDX; acceleration board stocks left too. Breaks the index's composition.",
    ),
)

SCHEDULED: tuple[Event, ...] = (
    Event(_D(2026, 11, 30), "Notations E, D, A and S removed; P shown on the acceleration board", "rule", _NOTATIONS_2026, True),
    Event(_D(2026, 12, 31), "Last day of the 7% lower limit", "rule", _S("Kep-00158/BEI/10-2026", BAREKSA_2026_10_20, CNBC_2026_10_20), True),
    Event(
        _D(2027, 1, 1),
        "Symmetric price limits were scheduled from this date",
        "rule",
        _S("Kep-00136/BEI/09-2026", MAYBANK_ARA, CALCUID),
        False,
        "Not confirmed: scheduled by Kep-00136 before Kep-00157 replaced it.",
    ),
    Event(_D(2027, 3, 31), "First free float deadline (12.5% or 15% for large caps)", "rule", _S("Kep-00152/BEI/10-2026", EMITENNEWS_2026_10_09, RAJAHTANN_2026_04), True),
    Event(_D(2027, 4, 30), "Notation P shown on the main and development boards", "rule", _NOTATIONS_2026, True),
    Event(_D(2027, 4, 30), "MSCI consultation feedback closes", "msci", _S("MSCI consultation, 15 Oct 2026", MSCI_2026_10, JAKPOST_2026_10), True),
    Event(_D(2027, 6, 30), "MSCI decision on Standalone status due (on or before)", "msci", _S("MSCI consultation, 15 Oct 2026", MSCI_2026_10, JAKPOST_2026_10), True),
    Event(_D(2028, 3, 31), "Free float deadline: 15% for large caps that were under 12.5%", "rule", _S("Kep-00152/BEI/10-2026", EMITENNEWS_2026_10_09, RAJAHTANN_2026_04), True),
    Event(_D(2029, 3, 31), "Free float deadline: 15% for companies under Rp5 trillion", "rule", _S("Kep-00152/BEI/10-2026", EMITENNEWS_2026_10_09, RAJAHTANN_2026_04), True),
)

TABLES: dict[str, tuple[Any, ...]] = {
    "price_limits": PRICE_LIMIT_RULES,
    "scheduled_price_limits": SCHEDULED_PRICE_LIMIT_RULES,
    "first_day": FIRST_DAY_RULES,
    "ticks": TICK_RULES,
    "rounding": ROUNDING_RULES,
    "reference_price": REFERENCE_PRICE_RULES,
    "halts": HALT_RULES,
    "free_float": FREE_FLOAT_RULES,
    "free_float_tiers": FREE_FLOAT_TIERS,
    "ipo_free_float_tiers": IPO_FREE_FLOAT_TIERS,
    "notations": NOTATIONS,
    "events": EVENTS,
    "scheduled": SCHEDULED,
}

# --------------------------------------------------------------------------
# Lookups
# --------------------------------------------------------------------------


def _as_date(on: dt.date | dt.datetime | str) -> dt.date:
    if isinstance(on, dt.datetime):
        return on.date()
    if isinstance(on, dt.date):
        return on
    if isinstance(on, str):
        return dt.date.fromisoformat(on)
    raise TypeError(f"expected a date, got {type(on).__name__}")


def _exact(x: Any, name: str = "value") -> Fraction:
    """Exact value of a price or ratio, so 1000 x 0.93 is 930 and not 929.999..."""
    if isinstance(x, Fraction):
        return x
    if isinstance(x, bool):
        raise TypeError(f"{name} must be a number")
    if isinstance(x, numbers.Integral):
        return Fraction(int(x))
    if isinstance(x, Decimal):
        if not x.is_finite():
            raise ValueError(f"{name} must be finite")
        return Fraction(x)
    f = float(x)
    if not math.isfinite(f):
        raise ValueError(f"{name} must be finite")
    return Fraction(repr(f))  # the shortest decimal that round-trips, e.g. 0.15 -> 3/20


def _board(board: str) -> str:
    key = str(board).strip().lower().replace("-", "_").replace(" ", "_")
    key = _BOARD_ALIASES.get(key, key)
    if key not in BOARDS:
        raise ValueError(f"unknown board {board!r}; expected one of {sorted(BOARDS)}")
    return key


def _in_force(entry: Any, on: dt.date) -> bool:
    return entry.effective_from <= on and (entry.effective_to is None or on <= entry.effective_to)


def _pick(entries: tuple[Any, ...], on: dt.date, what: str) -> Any:
    if on < RULEBOOK_START:
        raise RuleGapError(f"the rulebook starts on {RULEBOOK_START}; no {what} for {on}")
    hits = [e for e in entries if _in_force(e, on)]
    if not hits:
        ended = [e for e in entries if e.effective_to is not None and e.effective_to < on]
        hint = ""
        if ended:
            last = max(ended, key=lambda e: e.effective_to)
            hint = f"; the last one ({last.source.doc}) ended on {last.effective_to}"
        elif entries:
            hint = f"; the first one starts on {min(e.effective_from for e in entries)}"
        raise RuleGapError(f"no {what} for {on}{hint}. Check IDX's current rule and add it to rules.py.")
    if len(hits) > 1:  # pragma: no cover - test_rules checks the tables for overlaps
        raise AssertionError(f"overlapping {what} entries for {on}: {[h.source.doc for h in hits]}")
    return hits[0]


def price_limit_rule(on: dt.date | str, board: str = "main") -> PriceLimitRule:
    """The auto-rejection rule for a board on a date."""
    b = _board(board)
    rules = tuple(r for r in PRICE_LIMIT_RULES if b in r.boards)
    return _pick(rules, _as_date(on), f"{b} board price-limit rule")


def first_day_multiplier(on: dt.date | str, board: str = "main") -> int:
    """Multiplier on the percentage limits for a stock's first trading day (1 where none is known)."""
    b = _board(board)
    rules = tuple(r for r in FIRST_DAY_RULES if b in r.boards)
    if not rules:
        return 1
    return _pick(rules, _as_date(on), "first-day rule").multiplier


def tick_rule(on: dt.date | str) -> TickRule:
    return _pick(TICK_RULES, _as_date(on), "tick rule")


def tick_size(on: dt.date | str, price: float) -> int:
    """Tick (fraksi harga) in rupiah for a price on a date, regular market."""
    p = _exact(price, "price")
    if p <= 0:
        raise ValueError("price must be positive")
    return tick_rule(on).tick_for(p)


def reference_price_rule(on: dt.date | str) -> ReferencePriceRule:
    return _pick(REFERENCE_PRICE_RULES, _as_date(on), "reference price rule")


def halt_rule(on: dt.date | str) -> HaltRule:
    return _pick(HALT_RULES, _as_date(on), "halt rule")


def free_float_rule(on: dt.date | str) -> FreeFloatRule:
    return _pick(FREE_FLOAT_RULES, _as_date(on), "free float rule")


def _round_down(raw: Fraction, ticks: TickRule) -> Fraction:
    size = ticks.tick_for(raw)
    return Fraction((raw // size) * size)


def _round_up(raw: Fraction, ticks: TickRule) -> Fraction:
    size = ticks.tick_for(raw)
    return Fraction(-((-raw) // size) * size)


def _move(ref: Fraction, limit: Limit, sign: int, multiplier: int) -> Fraction:
    if limit.pct is not None:
        return ref * (1 + sign * limit.pct * multiplier)
    return ref + sign * limit.rupiah * multiplier


def price_limits(on: dt.date | str, prev_close: float, board: str = "main", *, first_day: bool = False) -> tuple[float, float]:
    """(lower, upper): the lowest and highest price an order may carry that day.

    prev_close is the reference price: the previous close, or the offer price on
    a listing day (pass first_day=True), or the theoretical price on an ex-date.
    Rounded as in ROUNDING_RULES: the upper limit down and the lower limit up to
    the tick that applies at the limit price, and the lower limit never below
    the board's minimum price (so a Rp50 stock before 28 Sep 2026 could not fall).
    For 1 Jan to 12 Mar 2020, IDX computed the limits of stocks traded in
    pre-opening from the opening price, so for those the result is approximate.
    """
    day = _as_date(on)
    b = _board(board)
    rule = price_limit_rule(day, b)
    ref = _exact(prev_close, "prev_close")
    if ref < rule.min_price:
        raise ValueError(f"reference price {ref} is below the {b} board minimum of Rp{rule.min_price} on {day}")
    band = rule.band_for(ref)
    multiplier = first_day_multiplier(day, b) if first_day else 1
    ticks = tick_rule(day)
    upper = _round_down(_move(ref, band.upper, +1, multiplier), ticks)
    raw_lower = _move(ref, band.lower, -1, multiplier)
    lower = _round_up(raw_lower, ticks) if raw_lower > 0 else Fraction(rule.min_price)
    lower = max(lower, Fraction(rule.min_price))
    return float(lower), float(upper)


# --------------------------------------------------------------------------
# Free float deadlines
# --------------------------------------------------------------------------


def _ratio(x: Any, name: str) -> Fraction:
    r = _exact(x, name)
    if not 0 <= r <= 1:
        raise ValueError(f"{name} must be between 0 and 1, got {x}")
    return r


def free_float_status(
    market_cap_idr: float,
    float_ratio: float,
    as_of: dt.date | str,
    *,
    base_float_ratio: float | None = None,
) -> FreeFloatStatus:
    """Where a company stands against the Peraturan I-A free float transition on as_of.

    market_cap_idr    market capitalisation on 31 Mar 2026, which fixes the tier
    float_ratio       free float / listed shares on as_of
    base_float_ratio  free float ratio on 31 Mar 2026, which also fixes the tier;
                      defaults to float_ratio. Pass it when the float has since
                      crossed 12.5%: a large cap at 10% then and 13% now owes 15%
                      by 31 Mar 2028, not 31 Mar 2027.

    The deadline is the next step whose target the company has not reached yet,
    or the step it missed (overdue=True when as_of is past it). None when the
    float is already at the 15% minimum, or when no transition schedule was in
    force on as_of (before 31 Mar 2026 the 7.5% minimum had none). A company
    that was at 15% or more on 31 Mar 2026 and has fallen below it gets the date
    the 15% minimum took effect, overdue.

    Main, development and new economy boards only: the acceleration board keeps
    its own 7.5% minimum with no transition.
    """
    day = _as_date(as_of)
    cap = _exact(market_cap_idr, "market_cap_idr")
    if cap < 0:
        raise ValueError("market_cap_idr must not be negative")
    now = _ratio(float_ratio, "float_ratio")
    base = now if base_float_ratio is None else _ratio(base_float_ratio, "base_float_ratio")
    rule = free_float_rule(day)
    tiers = [t for t in FREE_FLOAT_TIERS if _in_force(t, day)]
    if not tiers or now >= rule.min_ratio:
        return FreeFloatStatus(None, None, None, False)
    for tier in tiers:
        cap_ok = cap >= tier.min_cap and (tier.max_cap is None or cap < tier.max_cap)
        if cap_ok and tier.min_float <= base < tier.max_float:
            for deadline, target in tier.steps:
                if now < target:
                    return FreeFloatStatus(deadline, target, tier.name, day > deadline)
    started = min(r.effective_from for r in FREE_FLOAT_RULES if r.min_ratio == rule.min_ratio)
    return FreeFloatStatus(started, rule.min_ratio, None, day > started)


def free_float_deadline(market_cap_idr: float, float_ratio: float, as_of: dt.date | str, **kwargs: Any) -> dt.date | None:
    """The Peraturan I-A free float deadline that applies, or None. See free_float_status."""
    return free_float_status(market_cap_idr, float_ratio, as_of, **kwargs).deadline


# --------------------------------------------------------------------------
# Notations
# --------------------------------------------------------------------------


def notations_in_force(on: dt.date | str) -> dict[str, str]:
    """Letter -> meaning for every notation defined on a date."""
    day = _as_date(on)
    if day < RULEBOOK_START:
        raise RuleGapError(f"the rulebook starts on {RULEBOOK_START}")
    return {n.code: n.meaning for n in NOTATIONS if _in_force(n, day)}


def notation_shown(code: str, on: dt.date | str, board: str = "main") -> bool:
    """Whether IDX shows a letter for stocks on this board on this date (P is phased in by board)."""
    day = _as_date(on)
    b = _board(board)
    for n in NOTATIONS:
        if n.code == code and _in_force(n, day):
            if not n.shown_from:
                return True
            starts = dict(n.shown_from)
            return b in starts and day >= starts[b]
    return False


# --------------------------------------------------------------------------
# Provenance
# --------------------------------------------------------------------------


def unconfirmed() -> list[tuple[str, Any]]:
    """(table, entry) for every entry not confirmed by an official text or two reports."""
    return [(name, e) for name, table in TABLES.items() for e in table if not e.confirmed]


def _jsonable(x: Any) -> Any:
    if is_dataclass(x) and not isinstance(x, type):
        return {f.name: _jsonable(getattr(x, f.name)) for f in fields(x)}
    if isinstance(x, Fraction):
        return float(x)
    if isinstance(x, dt.date):
        return x.isoformat()
    if isinstance(x, (frozenset, set)):
        return sorted(_jsonable(v) for v in x)
    if isinstance(x, (tuple, list)):
        return [_jsonable(v) for v in x]
    return x


def manifest() -> dict[str, Any]:
    """Every table as plain JSON-ready data, to copy into a build's meta block."""
    return {
        "start": RULEBOOK_START.isoformat(),
        "checked": RULEBOOK_CHECKED.isoformat(),
        "tables": {name: _jsonable(table) for name, table in TABLES.items()},
    }
