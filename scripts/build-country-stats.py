#!/usr/bin/env python3
from __future__ import annotations

import csv
import io
import json
import re
import tempfile
import unicodedata
import urllib.request
import zipfile
from datetime import date
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
WORLD_ATLAS_PATH = DATA_DIR / "world-atlas.js"
OUTPUT_PATH = DATA_DIR / "country-stats.js"

FAOSTAT_PRODUCTION_CACHE_PATH = Path(tempfile.gettempdir()) / "faostat-production-crops-livestock.zip"
FAOSTAT_TRADE_CACHE_PATH = Path(tempfile.gettempdir()) / "faostat-trade-detailed-matrix.zip"
FAOSTAT_FOOD_BALANCE_CACHE_PATH = Path(tempfile.gettempdir()) / "faostat-food-balance-sheets.zip"

FAOSTAT_PRODUCTION_BULK_URL = (
    "https://fenixservices.fao.org/faostat/static/bulkdownloads/"
    "Production_Crops_Livestock_E_All_Data_(Normalized).zip"
)
FAOSTAT_TRADE_BULK_URL = (
    "https://bulks-faostat.fao.org/production/"
    "Trade_DetailedTradeMatrix_E_All_Data_(Normalized).zip"
)
FAOSTAT_FOOD_BALANCE_BULK_URL = (
    "https://fenixservices.fao.org/faostat/static/bulkdownloads/"
    "FoodBalanceSheets_E_All_Data_(Normalized).zip"
)
POPULATION_UN_WPP_URL = (
    "https://ourworldindata.org/grapher/population-unwpp.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
CRUDE_BIRTH_RATE_URL = (
    "https://ourworldindata.org/grapher/crude-birth-rate.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
CRUDE_DEATH_RATE_URL = (
    "https://ourworldindata.org/grapher/crude-death-rate.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
URBAN_SHARE_URL = (
    "https://ourworldindata.org/grapher/share-of-population-urban.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
PEW_RELIGION_URL = (
    "https://ourworldindata.org/grapher/share-of-population-by-religious-affiliation.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
PRIMARY_ENERGY_URL = (
    "https://ourworldindata.org/grapher/primary-sub-energy-source.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
ELECTRICITY_MIX_URL = (
    "https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
OIL_PRODUCTION_URL = (
    "https://ourworldindata.org/grapher/oil-production-by-country.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
GAS_PRODUCTION_URL = (
    "https://ourworldindata.org/grapher/gas-production-by-country.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
COAL_PRODUCTION_URL = (
    "https://ourworldindata.org/grapher/coal-production-by-country.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
CONTINENT_CLASSIFICATION_URL = (
    "https://ourworldindata.org/grapher/continents-according-to-our-world-in-data.csv"
    "?v=1&csvType=full&useColumnShortNames=false"
)
WORLD_BANK_API_URL_TEMPLATE = (
    "https://api.worldbank.org/v2/country/all/indicator/{indicator_code}"
    "?format=json&per_page=20000&mrv=5"
)
UNHCR_POPULATION_API_URL_TEMPLATE = (
    "https://api.unhcr.org/population/v1/population/"
    "?limit={limit}&page={page}&year={year}&{dimension}_all=true"
)

EXAM_REFERENCE_YEARS = {
    "population": 2023,
    "agriculture": 2023,
    "energy": 2023,
    "populationStructure": 2023,
    "refugees": 2024,
}

URBAN_REFERENCE_SUMMARIES = {
    "citySizeCounts": [
        {"sizeClass": "50~100만 명", "values": {"1975": 223, "2025": 659}},
        {"sizeClass": "100~500만 명", "values": {"1975": 145, "2025": 558}},
        {"sizeClass": "500~1,000만 명", "values": {"1975": 14, "2025": 58}},
        {"sizeClass": "1,000만 명 이상", "values": {"1975": 4, "2025": 37}},
    ],
    "megaCityRegionalShares": {
        "1975": {"asia": 50.0, "latinAmerica": 25.0, "northAmerica": 25.0},
        "2025": {"asia": 62.2, "latinAmerica": 16.2, "africa": 10.8, "northAmerica": 5.4, "europe": 5.4},
    },
    "oneToFiveMillionCityRegionalShares": {
        "1975": {
            "asia": 37.3,
            "europe": 24.1,
            "northAmerica": 19.3,
            "latinAmerica": 11.7,
            "africa": 5.5,
            "oceania": 2.1,
        },
        "2025": {
            "asia": 55.2,
            "africa": 13.1,
            "latinAmerica": 12.7,
            "europe": 9.7,
            "northAmerica": 8.6,
            "oceania": 0.7,
        },
    },
    "urbanPopulationIncreaseMillions": {
        "northAmerica": 140,
        "latinAmerica": 370,
        "europe": 120,
        "asia": 1990,
        "africa": 590,
    },
}

WORLD_BANK_EXPORT_INDICATORS = {
    "valueCurrentUsd": {
        "indicator_code": "NE.EXP.GNFS.CD",
        "label": "수출액",
        "unit": "current US$",
        "digits": 0,
    },
    "shareOfGdp": {
        "indicator_code": "NE.EXP.GNFS.ZS",
        "label": "수출 의존도",
        "unit": "% of GDP",
        "digits": 2,
    },
}

WORLD_BANK_INDUSTRY_INDICATORS = {
    "agriculture": {
        "indicator_code": "NV.AGR.TOTL.ZS",
        "label": "농림어업",
        "unit": "% of GDP",
        "digits": 2,
    },
    "industry": {
        "indicator_code": "NV.IND.TOTL.ZS",
        "label": "공업",
        "unit": "% of GDP",
        "digits": 2,
    },
    "services": {
        "indicator_code": "NV.SRV.TOTL.ZS",
        "label": "서비스업",
        "unit": "% of GDP",
        "digits": 2,
    },
}

WORLD_BANK_AGE_INDICATORS = {
    "age0To14": {
        "indicator_code": "SP.POP.0014.TO.ZS",
        "label": "0-14세",
        "unit": "% of population",
        "digits": 2,
    },
    "age15To64": {
        "indicator_code": "SP.POP.1564.TO.ZS",
        "label": "15-64세",
        "unit": "% of population",
        "digits": 2,
    },
    "age65Plus": {
        "indicator_code": "SP.POP.65UP.TO.ZS",
        "label": "65세 이상",
        "unit": "% of population",
        "digits": 2,
    },
}

WORLD_BANK_POPULATION_CONTEXT_INDICATORS = {
    "populationTotal": {
        "indicator_code": "SP.POP.TOTL",
        "label": "총인구",
        "unit": "people",
        "digits": 0,
    },
    "density": {
        "indicator_code": "EN.POP.DNST",
        "label": "인구 밀도",
        "unit": "people per sq. km of land area",
        "digits": 2,
    },
}

WORLD_BANK_MIGRATION_INDICATORS = {
    "migrantStockShare": {
        "indicator_code": "SM.POP.TOTL.ZS",
        "label": "국제이주민 비중",
        "unit": "% of population",
        "digits": 2,
    },
    "netMigration": {
        "indicator_code": "SM.POP.NETM",
        "label": "순이동",
        "unit": "people",
        "digits": 0,
    },
}

FAOSTAT_PRODUCTION_SERIES = {
    ("Wheat", "Production"): {"section": "crops", "metric": "production", "key": "wheat", "label": "밀"},
    ("Wheat", "Area harvested"): {"section": "crops", "metric": "areaHarvested", "key": "wheat", "label": "밀"},
    ("Wheat", "Yield"): {"section": "crops", "metric": "yield", "key": "wheat", "label": "밀"},
    ("Rice", "Production"): {"section": "crops", "metric": "production", "key": "rice", "label": "쌀"},
    ("Rice", "Area harvested"): {"section": "crops", "metric": "areaHarvested", "key": "rice", "label": "쌀"},
    ("Rice", "Yield"): {"section": "crops", "metric": "yield", "key": "rice", "label": "쌀"},
    ("Maize (corn)", "Production"): {"section": "crops", "metric": "production", "key": "maize", "label": "옥수수"},
    ("Maize (corn)", "Area harvested"): {"section": "crops", "metric": "areaHarvested", "key": "maize", "label": "옥수수"},
    ("Maize (corn)", "Yield"): {"section": "crops", "metric": "yield", "key": "maize", "label": "옥수수"},
    ("Cattle", "Stocks"): {"section": "livestock", "metric": "stocks", "key": "cattle", "label": "소"},
    ("Swine / pigs", "Stocks"): {"section": "livestock", "metric": "stocks", "key": "pigs", "label": "돼지"},
    ("Sheep", "Stocks"): {"section": "livestock", "metric": "stocks", "key": "sheep", "label": "양"},
    (
        "Meat of cattle with the bone, fresh or chilled",
        "Production",
    ): {"section": "livestock", "metric": "meat", "key": "cattle", "label": "소고기"},
    (
        "Meat of pig with the bone, fresh or chilled",
        "Production",
    ): {"section": "livestock", "metric": "meat", "key": "pigs", "label": "돼지고기"},
    (
        "Meat of sheep, fresh or chilled",
        "Production",
    ): {"section": "livestock", "metric": "meat", "key": "sheep", "label": "양고기"},
}

FAOSTAT_TRADE_ITEMS = {
    "Wheat": {"key": "wheat", "label": "밀"},
    "Rice, paddy (rice milled equivalent)": {"key": "rice", "label": "쌀"},
    "Maize (corn)": {"key": "maize", "label": "옥수수"},
}

FAOSTAT_TRADE_ELEMENT_MAP = {
    "import quantity": "import",
    "export quantity": "export",
}

FAOSTAT_FOOD_BALANCE_ITEMS = {
    "Wheat and products": {"key": "wheat", "label": "밀"},
    "Rice and products": {"key": "rice", "label": "쌀"},
    "Maize and products": {"key": "maize", "label": "옥수수"},
}

FAOSTAT_FOOD_BALANCE_USE_ELEMENTS = {
    "Food": "food",
    "Feed": "feed",
    "Other uses (non-food)": "bioenergy",
    "Processing": "other",
    "Seed": "other",
    "Losses": "other",
    "Residuals": "other",
    "Tourist consumption": "other",
}

FOSSIL_TRADE_SHARE_ENTRIES_2023 = {
    "coal": {
        "label": "석탄",
        "source": "EI",
        "exports": [
            ("IDN", "인도네시아", 28.2),
            ("AUS", "오스트레일리아", 25.4),
            ("RUS", "러시아", 15.2),
            ("USA", "미국", 7.0),
            ("MNG", "몽골", 5.5),
            ("ZAF", "남아프리카 공화국", 4.9),
        ],
        "imports": [
            ("CHN", "중국", 28.7),
            ("IND", "인도", 15.1),
            ("JPN", "일본", 12.4),
            ("KOR", "대한민국", 9.0),
        ],
    },
    "oil": {
        "label": "석유",
        "source": "EI",
        "exports": [
            ("USA", "미국", 13.4),
            ("SAU", "사우디아라비아", 12.2),
            ("RUS", "러시아", 9.9),
            ("CAN", "캐나다", 7.1),
        ],
        "imports": [
            ("CHN", "중국", 20.1),
            ("USA", "미국", 12.5),
            ("IND", "인도", 8.5),
            ("JPN", "일본", 4.9),
        ],
    },
    "gas": {
        "label": "천연가스",
        "source": "OPEC",
        "exports": [
            ("USA", "미국", 15.9),
            ("QAT", "카타르", 11.9),
            ("RUS", "러시아", 10.1),
            ("NOR", "노르웨이", 8.5),
            ("AUS", "오스트레일리아", 7.8),
            ("CAN", "캐나다", 6.1),
        ],
        "imports": [
            ("CHN", "중국", 12.6),
            ("DEU", "독일", 7.1),
            ("JPN", "일본", 6.8),
            ("USA", "미국", 6.4),
            ("MEX", "멕시코", 5.0),
            ("ITA", "이탈리아", 4.8),
        ],
    },
}

RELIGION_COLUMN_MAP = {
    "Christians": "christians",
    "Muslims": "muslims",
    "Hindus": "hindus",
    "Buddhists": "buddhists",
    "Jews": "jews",
    "Other": "other",
    "No religion": "noReligion",
}

PRIMARY_ENERGY_COLUMNS = {
    "coal": "Coal",
    "oil": "Oil",
    "gas": "Gas",
    "nuclear": "Nuclear",
    "hydropower": "Hydropower",
    "wind": "Wind",
    "solar": "Solar",
    "biofuels": "Biofuels",
    "otherRenewables": "Other renewables",
}

ELECTRICITY_COLUMNS = {
    "coal": "Coal",
    "oil": "Oil",
    "gas": "Gas",
    "nuclear": "Nuclear",
    "hydropower": "Hydropower",
    "wind": "Wind",
    "solar": "Solar",
    "bioenergy": "Bioenergy",
    "otherRenewables": "Other renewables",
}

FOSSIL_PRODUCTION_COLUMNS = {
    "oil": {"column": "Oil", "label": "석유", "url": OIL_PRODUCTION_URL},
    "gas": {"column": "Gas", "label": "가스", "url": GAS_PRODUCTION_URL},
    "coal": {"column": "Coal", "label": "석탄", "url": COAL_PRODUCTION_URL},
}

MANUAL_ISO3_BY_ATLAS_NAME = {
    "Anguilla": "AIA",
    "Åland Islands": "ALA",
    "Antarctica": "ATA",
    "Bonaire, Sint Eustatius and Saba": "BES",
    "Bolivia, Plurinational State of": "BOL",
    "Bouvet Island": "BVT",
    "British Indian Ocean Territory": "IOT",
    "Brunei Darussalam": "BRN",
    "Christmas Island": "CXR",
    "Cocos (Keeling) Islands": "CCK",
    "Congo, the Democratic Republic of the": "COD",
    "Cook Islands": "COK",
    "Côte d'Ivoire": "CIV",
    "Curaçao": "CUW",
    "Czech Republic": "CZE",
    "Falkland Islands (Malvinas)": "FLK",
    "French Southern Territories": "ATF",
    "Guernsey": "GGY",
    "Heard Island and McDonald Islands": "HMD",
    "Holy See (Vatican City State)": "VAT",
    "Iran, Islamic Republic of": "IRN",
    "Jersey": "JEY",
    "Kosovo": "XKX",
    "Korea, Democratic People's Republic of": "PRK",
    "Korea, Republic of": "KOR",
    "Lao People's Democratic Republic": "LAO",
    "Macedonia, the former Yugoslav Republic of": "MKD",
    "Micronesia, Federated States of": "FSM",
    "Moldova, Republic of": "MDA",
    "Montserrat": "MSR",
    "Niue": "NIU",
    "Norfolk Island": "NFK",
    "Palestinian Territory, Occupied": "PSE",
    "Pitcairn": "PCN",
    "Réunion": "REU",
    "Russian Federation": "RUS",
    "Saint Barthélemy": "BLM",
    "Saint Helena, Ascension and Tristan da Cunha": "SHN",
    "Saint Martin (French part)": "MAF",
    "Saint Pierre and Miquelon": "SPM",
    "South Georgia and the South Sandwich Islands": "SGS",
    "Swaziland": "SWZ",
    "Svalbard and Jan Mayen": "SJM",
    "Taiwan, Province of China": "TWN",
    "Tanzania, United Republic of": "TZA",
    "Timor-Leste": "TLS",
    "Tokelau": "TKL",
    "United States Minor Outlying Islands": "UMI",
    "Venezuela, Bolivarian Republic of": "VEN",
    "Viet Nam": "VNM",
    "Virgin Islands, British": "VGB",
    "Virgin Islands, U.S.": "VIR",
    "Wallis and Futuna": "WLF",
    "Syrian Arab Republic": "SYR",
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(character for character in normalized if not unicodedata.combining(character))
    normalized = normalized.lower().replace("&", "and")
    normalized = re.sub(r"[’']", "", normalized)
    normalized = re.sub(r"\([^)]*\)", " ", normalized)
    normalized = re.sub(r"[^\w]+", " ", normalized)
    return " ".join(normalized.split())


def parse_number(value: str | int | float | None) -> float | None:
    if value in (None, "", ".."):
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None


def compact_number(value: float | None, digits: int = 2) -> float | int | None:
    if value is None:
        return None
    rounded = round(value, digits)
    if abs(rounded - round(rounded)) < 10 ** (-(digits + 1)):
        return int(round(rounded))
    return rounded


def normalize_m49_code(value: str | None) -> str:
    digits = re.sub(r"\D+", "", value or "")
    if not digits:
        return ""
    return str(int(digits))


def fetch_text(url: str, user_agent: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read().decode("utf-8", "ignore")


def download_zip(url: str, cache_path: Path, minimum_size_bytes: int) -> Path:
    if cache_path.exists() and cache_path.stat().st_size > minimum_size_bytes:
        return cache_path

    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=300) as response, open(cache_path, "wb") as output_file:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output_file.write(chunk)

    return cache_path


def download_faostat_production_zip() -> Path:
    return download_zip(FAOSTAT_PRODUCTION_BULK_URL, FAOSTAT_PRODUCTION_CACHE_PATH, 10_000_000)


def download_faostat_trade_zip() -> Path:
    return download_zip(FAOSTAT_TRADE_BULK_URL, FAOSTAT_TRADE_CACHE_PATH, 100_000_000)


def download_faostat_food_balance_zip() -> Path:
    return download_zip(FAOSTAT_FOOD_BALANCE_BULK_URL, FAOSTAT_FOOD_BALANCE_CACHE_PATH, 10_000_000)


def fetch_json(url: str, user_agent: str) -> object:
    request = urllib.request.Request(url, headers={"User-Agent": user_agent})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8", "ignore"))


def read_atlas_country_rows() -> list[dict[str, str]]:
    script_text = WORLD_ATLAS_PATH.read_text(encoding="utf-8")
    match = re.search(r'window\.WORLD_COUNTRY_NAMES_TSV = "(.*?)";', script_text, re.S)
    if not match:
        raise RuntimeError("world-atlas.js에서 국가 이름 TSV를 찾지 못했습니다.")

    tsv_text = json.loads(f'"{match.group(1)}"')
    rows = []
    for raw_line in tsv_text.strip().splitlines()[1:]:
        country_id, country_name = raw_line.split("\t", 1)
        rows.append({"id": str(country_id), "name": country_name})
    return rows


def build_iso3_lookup(atlas_rows: list[dict[str, str]]) -> tuple[dict[str, str], list[str]]:
    owid_lookup: dict[str, str] = {}
    iso_sources = [
        POPULATION_UN_WPP_URL,
        URBAN_SHARE_URL,
        PEW_RELIGION_URL,
        PRIMARY_ENERGY_URL,
        ELECTRICITY_MIX_URL,
        OIL_PRODUCTION_URL,
        GAS_PRODUCTION_URL,
        COAL_PRODUCTION_URL,
    ]
    for url in iso_sources:
        text = fetch_text(url, "Country stats builder/1.0")
        for row in csv.DictReader(io.StringIO(text)):
            code = row.get("Code", "")
            if code and not code.startswith("OWID_"):
                owid_lookup.setdefault(normalize_text(row["Entity"]), code)

    unmatched_names: list[str] = []
    atlas_id_to_iso3: dict[str, str] = {}
    for atlas_row in atlas_rows:
        atlas_name = atlas_row["name"]
        atlas_id = atlas_row["id"]
        iso3_code = MANUAL_ISO3_BY_ATLAS_NAME.get(atlas_name)
        if not iso3_code:
            iso3_code = owid_lookup.get(normalize_text(atlas_name))

        if iso3_code:
            atlas_id_to_iso3[atlas_id] = iso3_code
        else:
            unmatched_names.append(atlas_name)

    return atlas_id_to_iso3, unmatched_names


def build_demography_series() -> dict[str, dict[str, dict[int, float]]]:
    series_by_iso3: dict[str, dict[str, dict[int, float]]] = {}

    population_text = fetch_text(POPULATION_UN_WPP_URL, "Country stats builder/1.0")
    for row in csv.DictReader(io.StringIO(population_text)):
        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        value = parse_number(row.get("Population (historical estimates)"))
        if value is None:
            continue

        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue

        country_series = series_by_iso3.setdefault(iso3_code, {})
        country_series.setdefault("populationTotal", {})[year] = value

    birth_rate_text = fetch_text(CRUDE_BIRTH_RATE_URL, "Country stats builder/1.0")
    for row in csv.DictReader(io.StringIO(birth_rate_text)):
        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        value = parse_number(row.get("Birth rate"))
        if value is None:
            continue

        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue

        country_series = series_by_iso3.setdefault(iso3_code, {})
        country_series.setdefault("birthRate", {})[year] = value

    death_rate_text = fetch_text(CRUDE_DEATH_RATE_URL, "Country stats builder/1.0")
    for row in csv.DictReader(io.StringIO(death_rate_text)):
        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        value = parse_number(row.get("Annual crude death rate"))
        if value is None:
            continue

        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue

        country_series = series_by_iso3.setdefault(iso3_code, {})
        country_series.setdefault("deathRate", {})[year] = value

    urban_share_text = fetch_text(URBAN_SHARE_URL, "Country stats builder/1.0")
    for row in csv.DictReader(io.StringIO(urban_share_text)):
        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        value = parse_number(row.get("Urban population (% of total population)"))
        if value is None:
            continue

        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue

        country_series = series_by_iso3.setdefault(iso3_code, {})
        country_series.setdefault("urbanPopulationShare", {})[year] = value

    for country_series in series_by_iso3.values():
        population_series = country_series.get("populationTotal", {})
        urban_share_series = country_series.get("urbanPopulationShare", {})
        urban_total_series = country_series.setdefault("urbanPopulationTotal", {})
        for year, population_value in population_series.items():
            urban_share = urban_share_series.get(year)
            if urban_share is None:
                continue
            urban_total_series[year] = population_value * urban_share / 100

        birth_rate_series = country_series.get("birthRate", {})
        death_rate_series = country_series.get("deathRate", {})
        natural_increase_series = country_series.setdefault("naturalIncreaseRate", {})
        for year in sorted(set(birth_rate_series) | set(death_rate_series)):
            birth_rate = birth_rate_series.get(year)
            death_rate = death_rate_series.get(year)
            if birth_rate is None or death_rate is None:
                continue
            natural_increase_series[year] = birth_rate - death_rate

    return series_by_iso3


def build_continent_entries() -> dict[str, dict[str, object]]:
    text = fetch_text(CONTINENT_CLASSIFICATION_URL, "Country stats builder/1.0")
    entries_by_iso3: dict[str, dict[str, object]] = {}

    for row in csv.DictReader(io.StringIO(text)):
        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        continent_name = row.get("World region according to OWID", "").strip()
        if not continent_name:
            continue

        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue

        entries_by_iso3[iso3_code] = {
            "year": year,
            "name": continent_name,
        }

    return entries_by_iso3


def fetch_world_bank_indicator_series(indicator_code: str) -> dict[str, dict[int, float]]:
    url = WORLD_BANK_API_URL_TEMPLATE.format(indicator_code=indicator_code)
    payload = fetch_json(url, "Country stats builder/1.0")
    if not isinstance(payload, list) or len(payload) < 2:
        return {}

    series_by_iso3: dict[str, dict[int, float]] = {}
    for row in payload[1]:
        iso3_code = row.get("countryiso3code", "")
        if not iso3_code:
            continue

        value = parse_number(row.get("value"))
        if value is None:
            continue

        try:
            year = int(row["date"])
        except (KeyError, TypeError, ValueError):
            continue

        country_series = series_by_iso3.setdefault(iso3_code, {})
        country_series[year] = value

    return series_by_iso3


def get_latest_series_entry(
    series: dict[int, float] | None,
    digits: int = 2,
    max_year: int | None = None,
) -> dict[str, object] | None:
    if not series:
        return None

    valid_years = [
        year
        for year, value in series.items()
        if value is not None and (max_year is None or year <= max_year)
    ]
    if not valid_years:
        return None

    latest_year = max(valid_years)
    return {
        "year": latest_year,
        "value": compact_number(series[latest_year], digits),
    }


def get_latest_series_value_at_or_before(series: dict[int, float] | None, year: int) -> float | None:
    if not series:
        return None

    valid_years = sorted(candidate_year for candidate_year, value in series.items() if value is not None and candidate_year <= year)
    if not valid_years:
        return None
    return series[valid_years[-1]]


def build_versioned_value_entry(
    series: dict[int, float] | None,
    *,
    label: str,
    unit: str,
    digits: int = 2,
    reference_year: int | None = None,
) -> dict[str, object] | None:
    reference_entry = get_latest_series_entry(series, digits=digits, max_year=reference_year)
    latest_entry = get_latest_series_entry(series, digits=digits)
    base_entry = reference_entry or latest_entry
    if not base_entry:
        return None

    entry = {
        **base_entry,
        "label": label,
        "unit": unit,
    }
    if latest_entry and (
        latest_entry.get("year") != entry.get("year")
        or latest_entry.get("value") != entry.get("value")
    ):
        entry["latest"] = {
            **latest_entry,
            "label": label,
            "unit": unit,
        }
    return entry


def attach_latest_payload(
    reference_payload: dict[str, object] | None,
    latest_payload: dict[str, object] | None,
) -> dict[str, object] | None:
    payload = reference_payload or latest_payload
    if not payload:
        return None
    if latest_payload and latest_payload.get("year") != payload.get("year"):
        payload = dict(payload)
        payload["latest"] = latest_payload
    return payload


def get_latest_structured_entry(
    series_map: dict[str, dict[str, dict[int, float]]],
    digits_map: dict[str, int],
    max_year: int | None = None,
) -> dict[str, dict[str, object]]:
    entries_by_iso3: dict[str, dict[str, object]] = {}
    all_iso3_codes = sorted({iso3_code for series_by_iso3 in series_map.values() for iso3_code in series_by_iso3})

    for iso3_code in all_iso3_codes:
        available_years = sorted(
            {
                year
                for series_by_iso3 in series_map.values()
                for year in series_by_iso3.get(iso3_code, {})
                if max_year is None or year <= max_year
            },
            reverse=True,
        )
        if not available_years:
            continue

        chosen_year = None
        chosen_values: dict[str, float] = {}
        for year in available_years:
            values = {
                key: series_by_iso3.get(iso3_code, {}).get(year)
                for key, series_by_iso3 in series_map.items()
            }
            if any(value is not None for value in values.values()):
                chosen_year = year
                chosen_values = {key: value for key, value in values.items() if value is not None}
                break

        if chosen_year is None or not chosen_values:
            continue

        entries_by_iso3[iso3_code] = {
            "year": chosen_year,
            "values": {
                key: compact_number(value, digits_map[key])
                for key, value in chosen_values.items()
            },
        }

    return entries_by_iso3


def build_population_entry(country_series: dict[str, dict[int, float]] | None) -> dict[str, object] | None:
    if not country_series:
        return None

    population_series = country_series.get("populationTotal", {})
    urban_total_series = country_series.get("urbanPopulationTotal", {})
    urban_share_series = country_series.get("urbanPopulationShare", {})
    birth_rate_series = country_series.get("birthRate", {})
    death_rate_series = country_series.get("deathRate", {})
    natural_increase_series = country_series.get("naturalIncreaseRate", {})
    available_years = sorted(set(population_series) | set(urban_total_series) | set(urban_share_series))
    available_rate_years = sorted(set(birth_rate_series) | set(death_rate_series) | set(natural_increase_series))

    if not available_years:
        return None

    latest_year = max(population_series or available_years)
    selected_years = sorted({year for year in available_years if year >= 1960 and year % 10 == 0} | {latest_year})
    selected_rate_years = sorted(
        {year for year in available_rate_years if year >= 1960 and year % 10 == 0}
        | ({max(available_rate_years)} if available_rate_years else set())
    )

    rows = []
    for year in selected_years:
        population = population_series.get(year)
        urban_total = urban_total_series.get(year)
        urban_share = urban_share_series.get(year)
        if population is None and urban_total is None and urban_share is None:
            continue

        rural_total = None
        if population is not None and urban_total is not None:
            rural_total = population - urban_total
        rural_share = 100 - urban_share if urban_share is not None else None

        rows.append(
            {
                "year": year,
                "population": compact_number(population, 0),
                "urbanPopulation": compact_number(urban_total, 0),
                "ruralPopulation": compact_number(rural_total, 0),
                "urbanShare": compact_number(urban_share, 2),
                "ruralShare": compact_number(rural_share, 2),
            }
        )

    if not rows:
        return None

    rate_rows = []
    for year in selected_rate_years:
        birth_rate = birth_rate_series.get(year)
        death_rate = death_rate_series.get(year)
        natural_increase_rate = natural_increase_series.get(year)
        if birth_rate is None and death_rate is None and natural_increase_rate is None:
            continue

        rate_rows.append(
            {
                "year": year,
                "birthRate": compact_number(birth_rate, 2),
                "deathRate": compact_number(death_rate, 2),
                "naturalIncreaseRate": compact_number(natural_increase_rate, 2),
            }
        )

    return {
        "latestYear": latest_year,
        "rows": rows,
        "rates": {
            "latestYear": max(available_rate_years) if available_rate_years else None,
            "rows": rate_rows,
        },
    }


def build_faostat_production_entries() -> dict[str, dict[str, object]]:
    cache_path = download_faostat_production_zip()
    series_by_area_id: dict[str, dict[str, object]] = {}

    with zipfile.ZipFile(cache_path) as archive:
        filename = "Production_Crops_Livestock_E_All_Data_(Normalized).csv"
        with archive.open(filename) as raw_file:
            reader = csv.DictReader(io.TextIOWrapper(raw_file, encoding="latin1", newline=""))

            for row in reader:
                target = FAOSTAT_PRODUCTION_SERIES.get((row["Item"], row["Element"]))
                if not target:
                    continue

                area_id = normalize_m49_code(row.get("Area Code (M49)", ""))
                value = parse_number(row.get("Value"))
                if not area_id or value is None:
                    continue

                try:
                    year = int(row["Year"])
                except (KeyError, TypeError, ValueError):
                    continue

                country_stats = series_by_area_id.setdefault(
                    area_id,
                    {
                        "crops": {"production": {}, "areaHarvested": {}, "yield": {}, "trade": {}},
                        "livestock": {"stocks": {}, "meat": {}},
                    },
                )
                bucket = country_stats[target["section"]][target["metric"]]
                series_entry = bucket.setdefault(target["key"], {
                    "label": target["label"],
                    "unit": row["Unit"],
                    "values": {},
                })
                series_entry["values"][year] = value

    stats_by_area_id: dict[str, dict[str, object]] = {}
    for area_id, country_stats in series_by_area_id.items():
        area_entry = {
            "crops": {"production": {}, "areaHarvested": {}, "yield": {}, "trade": {}},
            "livestock": {"stocks": {}, "meat": {}},
        }
        for section_key, section in country_stats.items():
            for metric_key, metric in section.items():
                for item_key, series_entry in metric.items():
                    entry = build_versioned_value_entry(
                        series_entry.get("values"),
                        label=series_entry["label"],
                        unit=series_entry["unit"],
                        digits=2,
                        reference_year=EXAM_REFERENCE_YEARS["agriculture"],
                    )
                    if entry:
                        area_entry[section_key][metric_key][item_key] = entry
        if any(
            area_entry["crops"][metric_key]
            for metric_key in ("production", "areaHarvested", "yield")
        ) or any(area_entry["livestock"][metric_key] for metric_key in ("stocks", "meat")):
            stats_by_area_id[area_id] = area_entry

    return stats_by_area_id


def build_faostat_trade_entries() -> dict[str, dict[str, object]]:
    cache_path = download_faostat_trade_zip()
    aggregated_by_area_id: dict[str, dict[str, dict[str, object]]] = {}

    with zipfile.ZipFile(cache_path) as archive:
        filename = "Trade_DetailedTradeMatrix_E_All_Data_(Normalized).csv"
        with archive.open(filename) as raw_file:
            reader = csv.DictReader(io.TextIOWrapper(raw_file, encoding="latin1", newline=""))

            for row in reader:
                target = FAOSTAT_TRADE_ITEMS.get(row["Item"])
                if not target:
                    continue

                element_key = FAOSTAT_TRADE_ELEMENT_MAP.get(row["Element"].strip().lower())
                if not element_key:
                    continue

                reporter_area_id = normalize_m49_code(row.get("Reporter Country Code (M49)", ""))
                partner_area_id = normalize_m49_code(row.get("Partner Country Code (M49)", ""))
                value = parse_number(row.get("Value"))
                if not reporter_area_id or value is None:
                    continue

                if partner_area_id and partner_area_id == reporter_area_id:
                    continue

                try:
                    year = int(row["Year"])
                except (KeyError, TypeError, ValueError):
                    continue

                country_bucket = aggregated_by_area_id.setdefault(reporter_area_id, {})
                item_bucket = country_bucket.setdefault(
                    target["key"],
                    {"label": target["label"], "import": {}, "export": {}},
                )
                yearly_totals = item_bucket[element_key]
                yearly_totals[year] = yearly_totals.get(year, 0.0) + value

    trade_entries_by_area_id: dict[str, dict[str, object]] = {}
    for area_id, country_bucket in aggregated_by_area_id.items():
        trade_bucket: dict[str, object] = {}
        for item_key, item_bucket in country_bucket.items():
            trade_entry = {"label": item_bucket["label"]}
            for element_key in ("import", "export"):
                yearly_totals = item_bucket[element_key]
                entry = build_versioned_value_entry(
                    {year: value for year, value in yearly_totals.items() if value > 0},
                    label=item_bucket["label"],
                    unit="t",
                    digits=2,
                    reference_year=EXAM_REFERENCE_YEARS["agriculture"],
                )
                if entry:
                    trade_entry[element_key] = entry
            if any(key in trade_entry for key in ("import", "export")):
                trade_bucket[item_key] = trade_entry

        if trade_bucket:
            trade_entries_by_area_id[area_id] = trade_bucket

    return trade_entries_by_area_id


def build_crop_use_payload(yearly_uses: dict[int, dict[str, float]], year: int, label: str) -> dict[str, object] | None:
    uses = {
        key: value
        for key, value in (yearly_uses.get(year) or {}).items()
        if value is not None and value > 0
    }
    total = sum(uses.values())
    if total <= 0:
        return None

    return {
        "label": label,
        "year": year,
        "total": compact_number(total, 2),
        "unit": "t",
        "amounts": {key: compact_number(value, 2) for key, value in uses.items()},
        "shares": {key: compact_number(value / total * 100, 2) for key, value in uses.items()},
    }


def build_faostat_crop_use_entries() -> dict[str, dict[str, object]]:
    cache_path = download_faostat_food_balance_zip()
    yearly_uses_by_area_id: dict[str, dict[str, dict[int, dict[str, float]]]] = {}

    with zipfile.ZipFile(cache_path) as archive:
        filename = "FoodBalanceSheets_E_All_Data_(Normalized).csv"
        with archive.open(filename) as raw_file:
            reader = csv.DictReader(io.TextIOWrapper(raw_file, encoding="latin1", newline=""))

            for row in reader:
                item = FAOSTAT_FOOD_BALANCE_ITEMS.get(row.get("Item", ""))
                use_key = FAOSTAT_FOOD_BALANCE_USE_ELEMENTS.get(row.get("Element", ""))
                if not item or not use_key:
                    continue

                area_id = normalize_m49_code(row.get("Area Code (M49)", ""))
                value = parse_number(row.get("Value"))
                if not area_id or value is None:
                    continue

                try:
                    year = int(row["Year"])
                except (KeyError, TypeError, ValueError):
                    continue

                # Food Balance Sheets values are in 1000 t; keep app-facing crop amounts in t.
                amount = value * 1000
                if amount <= 0:
                    continue

                country_bucket = yearly_uses_by_area_id.setdefault(area_id, {})
                crop_bucket = country_bucket.setdefault(item["key"], {})
                use_bucket = crop_bucket.setdefault(year, {})
                use_bucket[use_key] = use_bucket.get(use_key, 0.0) + amount

    entries_by_area_id: dict[str, dict[str, object]] = {}
    for area_id, country_bucket in yearly_uses_by_area_id.items():
        crop_entries: dict[str, object] = {}
        for crop_key, yearly_uses in country_bucket.items():
            item = next(config for config in FAOSTAT_FOOD_BALANCE_ITEMS.values() if config["key"] == crop_key)
            valid_years = sorted(year for year, uses in yearly_uses.items() if sum(uses.values()) > 0)
            if not valid_years:
                continue
            reference_years = [year for year in valid_years if year <= EXAM_REFERENCE_YEARS["agriculture"]]
            reference_year = max(reference_years) if reference_years else valid_years[-1]
            latest_year = valid_years[-1]
            reference_payload = build_crop_use_payload(yearly_uses, reference_year, item["label"])
            latest_payload = build_crop_use_payload(yearly_uses, latest_year, item["label"])
            payload = attach_latest_payload(reference_payload, latest_payload)
            if payload:
                crop_entries[crop_key] = payload
        if crop_entries:
            entries_by_area_id[area_id] = crop_entries

    return entries_by_area_id


def build_religion_entries(demography_series: dict[str, dict[str, dict[int, float]]]) -> dict[str, dict[str, object]]:
    text = fetch_text(PEW_RELIGION_URL, "Country stats builder/1.0")
    religion_by_iso3: dict[str, dict[str, object]] = {}
    for row in csv.DictReader(io.StringIO(text)):
        if row.get("Year") != "2020":
            continue

        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        shares = {
            key: compact_number(parse_number(row.get(column)), 2)
            for column, key in RELIGION_COLUMN_MAP.items()
        }
        population_2020 = demography_series.get(iso3_code, {}).get("populationTotal", {}).get(2020)
        counts = {
            key: compact_number((population_2020 * value / 100) if population_2020 is not None and value is not None else None, 0)
            for key, value in shares.items()
        }
        religion_by_iso3[iso3_code] = {
            "year": 2020,
            "totalPopulation": compact_number(population_2020, 0),
            "shares": shares,
            "counts": counts,
        }

    return religion_by_iso3


def build_energy_mix_entries(
    url: str,
    columns: dict[str, str],
    renewable_keys: set[str],
) -> dict[str, dict[str, object]]:
    text = fetch_text(url, "Country stats builder/1.0")
    reference_entries_by_iso3: dict[str, dict[str, object]] = {}
    latest_entries_by_iso3: dict[str, dict[str, object]] = {}

    for row in csv.DictReader(io.StringIO(text)):
        iso3_code = row.get("Code", "")
        if not iso3_code or iso3_code.startswith("OWID_"):
            continue

        values = {
            key: parse_number(row.get(column_name))
            for key, column_name in columns.items()
        }
        total = sum(value or 0 for value in values.values())
        if total <= 0:
            continue

        try:
            year = int(row["Year"])
        except (KeyError, TypeError, ValueError):
            continue

        fossil_amount = (values.get("coal") or 0) + (values.get("oil") or 0) + (values.get("gas") or 0)
        renewable_amount = sum((values.get(key) or 0) for key in renewable_keys)
        nuclear_amount = values.get("nuclear") or 0

        entry = {
            "year": year,
            "totalTWh": compact_number(total, 2),
            "summaryShares": {
                "fossil": compact_number(fossil_amount / total * 100, 2),
                "renewables": compact_number(renewable_amount / total * 100, 2),
                "nuclear": compact_number(nuclear_amount / total * 100, 2),
            },
            "summaryAmountsTWh": {
                "fossil": compact_number(fossil_amount, 2),
                "renewables": compact_number(renewable_amount, 2),
                "nuclear": compact_number(nuclear_amount, 2),
            },
            "shareBreakdown": {
                key: compact_number(((value or 0) / total) * 100, 2)
                for key, value in values.items()
                if value is not None
            },
            "amountBreakdownTWh": {
                key: compact_number(value, 2)
                for key, value in values.items()
                if value is not None
            },
        }

        latest_entry = latest_entries_by_iso3.get(iso3_code)
        if not latest_entry or year > latest_entry["year"]:
            latest_entries_by_iso3[iso3_code] = entry

        if year <= EXAM_REFERENCE_YEARS["energy"]:
            reference_entry = reference_entries_by_iso3.get(iso3_code)
            if not reference_entry or year > reference_entry["year"]:
                reference_entries_by_iso3[iso3_code] = entry

    entries_by_iso3: dict[str, dict[str, object]] = {}
    for iso3_code in sorted(set(reference_entries_by_iso3) | set(latest_entries_by_iso3)):
        payload = attach_latest_payload(
            reference_entries_by_iso3.get(iso3_code),
            latest_entries_by_iso3.get(iso3_code),
        )
        if payload:
            entries_by_iso3[iso3_code] = payload

    return entries_by_iso3


def build_fossil_production_entries() -> dict[str, dict[str, object]]:
    series_by_iso3: dict[str, dict[int, dict[str, float]]] = {}

    for key, config in FOSSIL_PRODUCTION_COLUMNS.items():
        text = fetch_text(config["url"], "Country stats builder/1.0")
        for row in csv.DictReader(io.StringIO(text)):
            iso3_code = row.get("Code", "")
            if not iso3_code or iso3_code.startswith("OWID_"):
                continue

            value = parse_number(row.get(config["column"]))
            if value is None:
                continue

            try:
                year = int(row["Year"])
            except (KeyError, TypeError, ValueError):
                continue

            yearly_values = series_by_iso3.setdefault(iso3_code, {}).setdefault(year, {})
            yearly_values[key] = value

    entries_by_iso3: dict[str, dict[str, object]] = {}
    for iso3_code, yearly_values in series_by_iso3.items():
        valid_years = sorted(year for year, values in yearly_values.items() if sum(values.values()) > 0)
        if not valid_years:
            continue

        reference_years = [year for year in valid_years if year <= EXAM_REFERENCE_YEARS["energy"]]
        reference_year = max(reference_years) if reference_years else valid_years[-1]
        latest_year = valid_years[-1]

        def build_payload(year: int) -> dict[str, object] | None:
            values = {
                key: yearly_values[year].get(key, 0.0)
                for key in FOSSIL_PRODUCTION_COLUMNS
            }
            total = sum(values.values())
            if total <= 0:
                return None
            return {
                "year": year,
                "totalTWh": compact_number(total, 2),
                "shareBreakdown": {
                    key: compact_number((value / total) * 100, 2)
                    for key, value in values.items()
                    if value > 0
                },
                "amountBreakdownTWh": {
                    key: compact_number(value, 2)
                    for key, value in values.items()
                    if value > 0
                },
            }

        payload = attach_latest_payload(build_payload(reference_year), build_payload(latest_year))
        if payload:
            entries_by_iso3[iso3_code] = payload

    return entries_by_iso3


def build_fossil_trade_entries() -> dict[str, dict[str, object]]:
    entries_by_iso3: dict[str, dict[str, object]] = {}

    for resource_key, resource in FOSSIL_TRADE_SHARE_ENTRIES_2023.items():
        for direction_key, label_suffix, unit in (
            ("exports", "수출 비율", "% of world exports"),
            ("imports", "수입 비율", "% of world imports"),
        ):
            for iso3_code, country_label, share in resource.get(direction_key, []):
                country_entry = entries_by_iso3.setdefault(iso3_code, {})
                resource_entry = country_entry.setdefault(resource_key, {"label": resource["label"]})
                resource_entry[direction_key[:-1]] = {
                    "year": 2023,
                    "value": share,
                    "label": f"{resource['label']} {label_suffix}",
                    "countryLabel": country_label,
                    "unit": unit,
                    "source": resource["source"],
                }

    return entries_by_iso3


def build_economy_entries() -> dict[str, dict[str, object]]:
    export_series = {
        key: fetch_world_bank_indicator_series(config["indicator_code"])
        for key, config in WORLD_BANK_EXPORT_INDICATORS.items()
    }
    industry_series = {
        key: fetch_world_bank_indicator_series(config["indicator_code"])
        for key, config in WORLD_BANK_INDUSTRY_INDICATORS.items()
    }
    industry_entries = get_latest_structured_entry(
        industry_series,
        digits_map={key: config["digits"] for key, config in WORLD_BANK_INDUSTRY_INDICATORS.items()},
    )

    entries_by_iso3: dict[str, dict[str, object]] = {}
    all_iso3_codes = sorted(
        set(industry_entries)
        | {
            iso3_code
            for series_by_iso3 in export_series.values()
            for iso3_code in series_by_iso3
        }
    )

    for iso3_code in all_iso3_codes:
        exports_entry = {}
        for key, config in WORLD_BANK_EXPORT_INDICATORS.items():
            latest_entry = get_latest_series_entry(export_series[key].get(iso3_code), digits=config["digits"])
            if latest_entry:
                exports_entry[key] = {
                    **latest_entry,
                    "label": config["label"],
                    "unit": config["unit"],
                }

        industry_entry = industry_entries.get(iso3_code)
        industry_payload = None
        if industry_entry:
            industry_payload = {
                "year": industry_entry["year"],
                "shares": industry_entry["values"],
            }

        if exports_entry or industry_payload:
            entries_by_iso3[iso3_code] = {
                "exports": exports_entry or None,
                "industry": industry_payload,
            }

    return entries_by_iso3


def build_population_structure_entries(
    demography_series: dict[str, dict[str, dict[int, float]]],
) -> dict[str, dict[str, object]]:
    age_series = {
        key: fetch_world_bank_indicator_series(config["indicator_code"])
        for key, config in WORLD_BANK_AGE_INDICATORS.items()
    }
    age_entries = get_latest_structured_entry(
        age_series,
        digits_map={key: config["digits"] for key, config in WORLD_BANK_AGE_INDICATORS.items()},
        max_year=EXAM_REFERENCE_YEARS["populationStructure"],
    )
    latest_age_entries = get_latest_structured_entry(
        age_series,
        digits_map={key: config["digits"] for key, config in WORLD_BANK_AGE_INDICATORS.items()},
    )
    population_context_series = {
        key: fetch_world_bank_indicator_series(config["indicator_code"])
        for key, config in WORLD_BANK_POPULATION_CONTEXT_INDICATORS.items()
    }

    entries_by_iso3: dict[str, dict[str, object]] = {}
    for iso3_code in sorted(set(age_entries) | set(latest_age_entries)):
        age_entry = age_entries.get(iso3_code) or latest_age_entries.get(iso3_code)
        if not age_entry:
            continue
        year = age_entry["year"]

        def build_structure_payload(structure_entry: dict[str, object]) -> dict[str, object]:
            structure_year = structure_entry["year"]
            total_population = (
                get_latest_series_value_at_or_before(population_context_series["populationTotal"].get(iso3_code), structure_year)
                or demography_series.get(iso3_code, {}).get("populationTotal", {}).get(structure_year)
            )
            working_age_share = structure_entry["values"].get("age15To64")
            dependency_ratios = None
            if working_age_share not in (None, 0):
                youth_share = structure_entry["values"].get("age0To14")
                old_age_share = structure_entry["values"].get("age65Plus")
                if youth_share is not None and old_age_share is not None:
                    youth_dependency = youth_share / working_age_share * 100
                    old_age_dependency = old_age_share / working_age_share * 100
                    dependency_ratios = {
                        "youth": compact_number(youth_dependency, 2),
                        "oldAge": compact_number(old_age_dependency, 2),
                        "total": compact_number(youth_dependency + old_age_dependency, 2),
                    }

            counts = {
                key: compact_number(total_population * value / 100, 0) if total_population is not None else None
                for key, value in structure_entry["values"].items()
            }
            return {
                "year": structure_year,
                "shares": structure_entry["values"],
                "counts": counts,
                "totalPopulation": compact_number(total_population, 0),
                "dependencyRatios": dependency_ratios,
            }

        payload = build_structure_payload(age_entry)
        latest_age_entry = latest_age_entries.get(iso3_code)
        if latest_age_entry and latest_age_entry.get("year") != payload.get("year"):
            payload["latest"] = build_structure_payload(latest_age_entry)

        density_entry = build_versioned_value_entry(
            population_context_series["density"].get(iso3_code),
            label=WORLD_BANK_POPULATION_CONTEXT_INDICATORS["density"]["label"],
            unit=WORLD_BANK_POPULATION_CONTEXT_INDICATORS["density"]["unit"],
            digits=WORLD_BANK_POPULATION_CONTEXT_INDICATORS["density"]["digits"],
            reference_year=EXAM_REFERENCE_YEARS["populationStructure"],
        )
        payload["density"] = (
                {
                    **density_entry,
                }
                if density_entry
                else None
            )
        entries_by_iso3[iso3_code] = payload

    return entries_by_iso3


def get_latest_unhcr_population_year(max_year: int | None = None) -> int | None:
    start_year = max_year or date.today().year
    for year in range(start_year, 2019, -1):
        try:
            payload = fetch_json(
                UNHCR_POPULATION_API_URL_TEMPLATE.format(limit=1, page=1, year=year, dimension="coo"),
                "Country stats builder/1.0",
            )
        except Exception:
            continue

        if not isinstance(payload, dict):
            continue
        items = payload.get("items")
        if not isinstance(items, list) or not items:
            continue
        if parse_number(items[0].get("refugees")) is None:
            continue
        return year
    return None


def fetch_unhcr_population_rows(year: int, dimension: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    page = 1
    limit = 1000

    while True:
        payload = fetch_json(
            UNHCR_POPULATION_API_URL_TEMPLATE.format(limit=limit, page=page, year=year, dimension=dimension),
            "Country stats builder/1.0",
        )
        if not isinstance(payload, dict):
            break

        items = payload.get("items")
        if not isinstance(items, list) or not items:
            break

        rows.extend(item for item in items if isinstance(item, dict))
        max_pages = int(payload.get("maxPages") or 1)
        if page >= max_pages:
            break
        page += 1

    return rows


def build_refugee_entries_for_year(latest_year: int) -> dict[str, dict[str, object]]:
    entries_by_iso3: dict[str, dict[str, object]] = {}

    for row in fetch_unhcr_population_rows(latest_year, "coo"):
        iso3_code = str(row.get("coo") or "").strip()
        if not iso3_code or iso3_code == "-":
            continue

        refugee_total = compact_number(parse_number(row.get("refugees")), 0)
        if refugee_total is None:
            continue

        entry = entries_by_iso3.setdefault(iso3_code, {})
        entry["refugeeOriginTotal"] = {
            "year": latest_year,
            "value": refugee_total,
            "label": "난민 발생 수",
            "unit": "people",
        }

    for row in fetch_unhcr_population_rows(latest_year, "coa"):
        iso3_code = str(row.get("coa") or "").strip()
        if not iso3_code or iso3_code == "-":
            continue

        refugee_total = compact_number(parse_number(row.get("refugees")), 0)
        if refugee_total is None:
            continue

        entry = entries_by_iso3.setdefault(iso3_code, {})
        entry["refugeeHostedTotal"] = {
            "year": latest_year,
            "value": refugee_total,
            "label": "난민 수용 수",
            "unit": "people",
        }

    return entries_by_iso3


def build_refugee_entries() -> dict[str, dict[str, object]]:
    reference_year = get_latest_unhcr_population_year(EXAM_REFERENCE_YEARS["refugees"])
    latest_year = get_latest_unhcr_population_year()
    if reference_year is None and latest_year is None:
        return {}

    reference_entries = build_refugee_entries_for_year(reference_year) if reference_year else {}
    latest_entries = (
        build_refugee_entries_for_year(latest_year)
        if latest_year and latest_year != reference_year
        else {}
    )

    entries_by_iso3: dict[str, dict[str, object]] = {}
    for iso3_code in sorted(set(reference_entries) | set(latest_entries)):
        entry = dict(reference_entries.get(iso3_code) or latest_entries.get(iso3_code) or {})
        latest_entry = latest_entries.get(iso3_code, {})
        for metric_key, latest_metric in latest_entry.items():
            if metric_key in entry:
                entry[metric_key] = dict(entry[metric_key])
                entry[metric_key]["latest"] = latest_metric
            else:
                entry[metric_key] = latest_metric
        if entry:
            entries_by_iso3[iso3_code] = entry

    return entries_by_iso3


def build_migration_entries(
    demography_series: dict[str, dict[str, dict[int, float]]],
) -> dict[str, dict[str, object]]:
    migration_series = {
        key: fetch_world_bank_indicator_series(config["indicator_code"])
        for key, config in WORLD_BANK_MIGRATION_INDICATORS.items()
    }
    world_bank_population_total_series = fetch_world_bank_indicator_series(
        WORLD_BANK_POPULATION_CONTEXT_INDICATORS["populationTotal"]["indicator_code"]
    )
    refugee_entries = build_refugee_entries()
    entries_by_iso3: dict[str, dict[str, object]] = {}
    all_iso3_codes = sorted(
        {iso3_code for series_by_iso3 in migration_series.values() for iso3_code in series_by_iso3}
        | set(refugee_entries)
    )

    for iso3_code in all_iso3_codes:
        country_entry: dict[str, object] = {}
        migrant_share_entry = get_latest_series_entry(
            migration_series["migrantStockShare"].get(iso3_code),
            digits=WORLD_BANK_MIGRATION_INDICATORS["migrantStockShare"]["digits"],
        )
        if migrant_share_entry:
            year = migrant_share_entry["year"]
            total_population = (
                get_latest_series_value_at_or_before(world_bank_population_total_series.get(iso3_code), year)
                or demography_series.get(iso3_code, {}).get("populationTotal", {}).get(year)
            )
            migrant_total = total_population * migrant_share_entry["value"] / 100 if total_population is not None else None
            country_entry["migrantStockShare"] = {
                **migrant_share_entry,
                "label": WORLD_BANK_MIGRATION_INDICATORS["migrantStockShare"]["label"],
                "unit": WORLD_BANK_MIGRATION_INDICATORS["migrantStockShare"]["unit"],
            }
            country_entry["migrantStockTotal"] = {
                "year": year,
                "value": compact_number(migrant_total, 0),
                "label": "국제이주민 수",
                "unit": "people",
            }

        net_migration_entry = get_latest_series_entry(
            migration_series["netMigration"].get(iso3_code),
            digits=WORLD_BANK_MIGRATION_INDICATORS["netMigration"]["digits"],
        )
        if net_migration_entry:
            country_entry["netMigration"] = {
                **net_migration_entry,
                "label": WORLD_BANK_MIGRATION_INDICATORS["netMigration"]["label"],
                "unit": WORLD_BANK_MIGRATION_INDICATORS["netMigration"]["unit"],
            }

        refugee_entry = refugee_entries.get(iso3_code)
        if refugee_entry:
            country_entry.update(refugee_entry)

        if country_entry:
            entries_by_iso3[iso3_code] = country_entry

    return entries_by_iso3


def merge_agriculture_entries(
    production_entry: dict[str, object] | None,
    trade_entry: dict[str, object] | None,
    crop_use_entry: dict[str, object] | None,
) -> dict[str, object] | None:
    crops_production = ((production_entry or {}).get("crops") or {}).get("production", {})
    crops_area_harvested = ((production_entry or {}).get("crops") or {}).get("areaHarvested", {})
    crops_yield = ((production_entry or {}).get("crops") or {}).get("yield", {})
    livestock_stocks = ((production_entry or {}).get("livestock") or {}).get("stocks", {})
    livestock_meat = ((production_entry or {}).get("livestock") or {}).get("meat", {})
    crops_trade = trade_entry or {}
    crops_use = crop_use_entry or {}

    if not any((crops_production, crops_area_harvested, crops_yield, crops_trade, crops_use, livestock_stocks, livestock_meat)):
        return None

    return {
        "crops": {
            "production": crops_production,
            "areaHarvested": crops_area_harvested,
            "yield": crops_yield,
            "trade": crops_trade,
            "use": crops_use,
        },
        "livestock": {
            "stocks": livestock_stocks,
            "meat": livestock_meat,
        },
    }


def build_country_stats_payload() -> tuple[dict[str, object], dict[str, object]]:
    atlas_rows = read_atlas_country_rows()
    atlas_id_to_iso3, unmatched_names = build_iso3_lookup(atlas_rows)
    demography_series = build_demography_series()
    continent_entries = build_continent_entries()
    faostat_production_entries = build_faostat_production_entries()
    faostat_trade_entries = build_faostat_trade_entries()
    faostat_crop_use_entries = build_faostat_crop_use_entries()
    religion_entries = build_religion_entries(demography_series)
    primary_energy_entries = build_energy_mix_entries(
        PRIMARY_ENERGY_URL,
        PRIMARY_ENERGY_COLUMNS,
        renewable_keys={"hydropower", "wind", "solar", "biofuels", "otherRenewables"},
    )
    electricity_entries = build_energy_mix_entries(
        ELECTRICITY_MIX_URL,
        ELECTRICITY_COLUMNS,
        renewable_keys={"hydropower", "wind", "solar", "bioenergy", "otherRenewables"},
    )
    fossil_production_entries = build_fossil_production_entries()
    fossil_trade_entries = build_fossil_trade_entries()
    economy_entries = build_economy_entries()
    population_structure_entries = build_population_structure_entries(demography_series)
    migration_entries = build_migration_entries(demography_series)

    country_stats_by_id: dict[str, object] = {}
    for atlas_row in atlas_rows:
        atlas_id = atlas_row["id"]
        atlas_name = atlas_row["name"]
        iso3_code = atlas_id_to_iso3.get(atlas_id)

        population_entry = build_population_entry(demography_series.get(iso3_code)) if iso3_code else None
        agriculture_entry = merge_agriculture_entries(
            faostat_production_entries.get(atlas_id),
            faostat_trade_entries.get(atlas_id),
            faostat_crop_use_entries.get(atlas_id),
        )
        religion_entry = religion_entries.get(iso3_code) if iso3_code else None
        primary_energy_entry = primary_energy_entries.get(iso3_code) if iso3_code else None
        electricity_entry = electricity_entries.get(iso3_code) if iso3_code else None
        fossil_production_entry = fossil_production_entries.get(iso3_code) if iso3_code else None
        fossil_trade_entry = fossil_trade_entries.get(iso3_code) if iso3_code else None
        continent_entry = continent_entries.get(iso3_code) if iso3_code else None
        economy_entry = economy_entries.get(iso3_code) if iso3_code else None
        population_structure_entry = population_structure_entries.get(iso3_code) if iso3_code else None
        migration_entry = migration_entries.get(iso3_code) if iso3_code else None

        if not any(
            (
                population_entry,
                agriculture_entry,
                religion_entry,
                primary_energy_entry,
                electricity_entry,
                fossil_production_entry,
                fossil_trade_entry,
                economy_entry,
                population_structure_entry,
                migration_entry,
                continent_entry,
            )
        ):
            continue

        country_stats_by_id[atlas_id] = {
            "atlasName": atlas_name,
            "iso3": iso3_code,
            "continent": continent_entry,
            "population": population_entry,
            "agriculture": agriculture_entry,
            "religion2020": religion_entry,
            "economy": economy_entry,
            "populationStructure": population_structure_entry,
            "migration": migration_entry,
            "energy": {
                "consumption": primary_energy_entry,
                "electricity": electricity_entry,
                "fossilProduction": fossil_production_entry,
                "fossilTrade": fossil_trade_entry,
            },
        }

    meta = {
        "generatedAt": date.today().isoformat(),
        "examReferenceYears": EXAM_REFERENCE_YEARS,
        "referenceSummaries": {
            "urbanization": URBAN_REFERENCE_SUMMARIES,
            "cropUse": faostat_crop_use_entries.get("1"),
            "fossilTrade": FOSSIL_TRADE_SHARE_ENTRIES_2023,
        },
        "coverage": {
            "atlasCountries": len(atlas_rows),
            "matchedIso3": len(atlas_id_to_iso3),
            "countriesWithAnyStats": len(country_stats_by_id),
            "unmatchedAtlasNames": unmatched_names,
        },
        "sources": {
            "population": {
                "label": "UN World Population Prospects 2024 총인구 (OWID CSV mirror)",
                "url": POPULATION_UN_WPP_URL,
            },
            "populationRates": {
                "label": "UN World Population Prospects 2024 출생·사망률 (OWID CSV mirror)",
                "url": CRUDE_BIRTH_RATE_URL,
            },
            "urbanization": {
                "label": "World Bank 도시화율 + UN 2018 도시화 전망 교재 요약",
                "url": URBAN_SHARE_URL,
            },
            "faostatProduction": {
                "label": "FAOSTAT Production Crops and Livestock bulk download, 수능특강 기준 2023년",
                "url": FAOSTAT_PRODUCTION_BULK_URL,
            },
            "faostatTrade": {
                "label": "FAOSTAT Trade Detailed Trade Matrix bulk download, 수능특강 기준 2023년",
                "url": FAOSTAT_TRADE_BULK_URL,
            },
            "faostatFoodBalance": {
                "label": "FAOSTAT Food Balance Sheets food/feed/other use, 수능특강 기준 2023년",
                "url": FAOSTAT_FOOD_BALANCE_BULK_URL,
            },
            "religion": {
                "label": "Pew Research Center 2020 종교 추정치 (OWID CSV mirror)",
                "url": PEW_RELIGION_URL,
            },
            "primaryEnergy": {
                "label": "Our World in Data primary energy by source, 수능특강 기준 2023년",
                "url": PRIMARY_ENERGY_URL,
            },
            "electricityMix": {
                "label": "Our World in Data electricity generation by source, 수능특강 기준 2023년",
                "url": ELECTRICITY_MIX_URL,
            },
            "fossilProduction": {
                "label": "Our World in Data fossil fuel production by source, 수능특강 기준 2023년",
                "url": OIL_PRODUCTION_URL,
            },
            "fossilTrade": {
                "label": "수능특강 2027 화석 에너지 수출입 비율 표(EI/OPEC 2023)",
                "url": "",
            },
            "continents": {
                "label": "Our World in Data continents by country",
                "url": CONTINENT_CLASSIFICATION_URL,
            },
            "worldBankExports": {
                "label": "World Bank WDI exports indicators API",
                "url": WORLD_BANK_API_URL_TEMPLATE.format(
                    indicator_code=WORLD_BANK_EXPORT_INDICATORS["valueCurrentUsd"]["indicator_code"]
                ),
            },
            "worldBankIndustry": {
                "label": "World Bank WDI industry structure indicators API",
                "url": WORLD_BANK_API_URL_TEMPLATE.format(
                    indicator_code=WORLD_BANK_INDUSTRY_INDICATORS["agriculture"]["indicator_code"]
                ),
            },
            "worldBankPopulationStructure": {
                "label": "World Bank WDI age structure indicators API, 수능특강 기준 2023년",
                "url": WORLD_BANK_API_URL_TEMPLATE.format(
                    indicator_code=WORLD_BANK_AGE_INDICATORS["age0To14"]["indicator_code"]
                ),
            },
            "worldBankPopulationContext": {
                "label": "World Bank WDI total population and density API",
                "url": WORLD_BANK_API_URL_TEMPLATE.format(
                    indicator_code=WORLD_BANK_POPULATION_CONTEXT_INDICATORS["density"]["indicator_code"]
                ),
            },
            "worldBankMigration": {
                "label": "World Bank WDI migration indicators API",
                "url": WORLD_BANK_API_URL_TEMPLATE.format(
                    indicator_code=WORLD_BANK_MIGRATION_INDICATORS["migrantStockShare"]["indicator_code"]
                ),
            },
            "unhcrRefugees": {
                "label": "UNHCR Refugee Data Finder population API, 수능특강 기준 2024년",
                "url": UNHCR_POPULATION_API_URL_TEMPLATE.format(
                    limit=1000,
                    page=1,
                    year=EXAM_REFERENCE_YEARS["refugees"],
                    dimension="coo",
                ),
            },
        },
    }

    return meta, country_stats_by_id


def write_output(meta: dict[str, object], country_stats_by_id: dict[str, object]) -> None:
    output_text = (
        "window.COUNTRY_STATS_META = "
        + json.dumps(meta, ensure_ascii=False, separators=(",", ":"))
        + ";\nwindow.COUNTRY_STATS_BY_ID = "
        + json.dumps(country_stats_by_id, ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    OUTPUT_PATH.write_text(output_text, encoding="utf-8")


def main() -> None:
    meta, country_stats_by_id = build_country_stats_payload()
    write_output(meta, country_stats_by_id)
    print(f"Wrote {OUTPUT_PATH}")
    print(
        f"Countries with any statistics: {meta['coverage']['countriesWithAnyStats']} / {meta['coverage']['atlasCountries']}"
    )
    unmatched = meta["coverage"]["unmatchedAtlasNames"]
    if unmatched:
        print(f"Unmatched atlas names ({len(unmatched)}): {', '.join(unmatched)}")


if __name__ == "__main__":
    main()
