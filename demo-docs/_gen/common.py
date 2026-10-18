"""Shared fictional values + NRIC/FIN checksum helpers for the Closing Copilot demo pack.
EVERYTHING HERE IS FICTIONAL."""

from datetime import date

OUT = "/Users/longson/Projects/pZy/demo-docs"

WEIGHTS = [2, 7, 6, 5, 4, 3, 2]
ST_LETTERS = "JZIHGFEDCBA"
FG_LETTERS = "XWUTRQPNMLK"
OFFSET = {"S": 0, "T": 4, "F": 0, "G": 4}


def checksum_detail(prefix: str, digits: str):
    prods = [int(d) * w for d, w in zip(digits, WEIGHTS)]
    total = sum(prods) + OFFSET[prefix]
    rem = total % 11
    table = ST_LETTERS if prefix in "ST" else FG_LETTERS
    return prods, total, rem, table[rem]


def make_id(prefix: str, digits: str) -> str:
    return prefix + digits + checksum_detail(prefix, digits)[3]


def is_valid(idno: str) -> bool:
    return make_id(idno[0], idno[1:8]) == idno


# ---------------- world ----------------
AGENCY = "Harbour Realty Pte Ltd"
AGENT = "Rachel Lim"
AGENT_CEA = "R061234Z"
DEVELOPER = "Aurelia Bay Development Pte Ltd"
DEVELOPER_UEN = "202312345K"
DEV_LICENCE = "C1234"
PROJECT = "Aurelia Bay Residences"
PROJECT_ADDR = "18 Marina Crest Road, Singapore 018947"
TENURE = "99-year leasehold from 1 August 2026"
SOLICITORS = "Chua & Partners LLP"
LOT = "Lot 01234X Mukim 99 (fictional)"

HERO_NAME = "TAN WEI MING"
HERO_DIGITS = "8807416"
HERO_NRIC = make_id("S", HERO_DIGITS)
# planted error: swap 3rd and 4th digits (0 <-> 7) but keep the printed check letter
_d = list(HERO_DIGITS)
_d[2], _d[3] = _d[3], _d[2]
HERO_NRIC_BAD = "S" + "".join(_d) + HERO_NRIC[-1]
HERO_NAME_BAD = "TAN WEI MIN"
HERO_DOB = "14 Mar 1988"
HERO_ADDR_1 = "Blk 123 Fictional Ave 4 #08-12"
HERO_ADDR_2 = "Singapore 560123"

SARAH_NAME = "ONG SHU HUI SARAH"
SARAH_DIGITS = "9263158"
SARAH_NRIC = make_id("S", SARAH_DIGITS)

UNIT = "#12-05"
UNIT_TYPE = "3-Bedroom, Type C2"
AREA_SQFT = 1130
AREA_SQM = 105.0
PRICE = 1_850_000
BOOKING_FEE = 92_500
DP15 = 277_500
OTP_DATE = date(2026, 10, 5)
SPA_DELIVERED = date(2026, 10, 15)
RECEIPT_DATE = date(2026, 11, 20)
TOP_DATE = date(2029, 6, 30)
CSC_DATE = date(2032, 6, 30)  # TOP + 3 years (latest date for legal completion)

SCHEDULE = [
    ("1", "Immediately upon grant of Option to Purchase (booking fee)", 5),
    ("1A", "Within 8 weeks from date of Option to Purchase (balance of downpayment)", 15),
    ("2", "Completion of foundation work", 10),
    ("3", "Completion of reinforced concrete framework of unit", 10),
    ("4", "Completion of partition walls of unit", 5),
    ("5", "Completion of roofing / ceiling of unit", 5),
    ("6", "Completion of electrical wiring (without fittings), internal plastering and plumbing (without fittings) of unit, and installation of door sub-frames / door frames, window frames, electrical wiring and plumbing", 5),
    ("7", "Completion of car park, roads and drains serving the housing project", 5),
    ("8", "Notice of vacant possession upon issue of Temporary Occupation Permit (TOP)", 25),
    ("9", "On completion of sale (upon issue of Certificate of Statutory Completion, CSC)", 15),
]


def money(n):
    return f"S${n:,.2f}"


def d(dt):
    return dt.strftime("%-d %B %Y")
