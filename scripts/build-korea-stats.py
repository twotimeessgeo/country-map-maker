#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
OUTPUT_PATH = DATA_DIR / "korea-stats.js"
KOREA_ADMIN_PATH = DATA_DIR / "korea-admin.js"

KOSIS_INDEX_URL = "https://kosis.kr/visual/eRegionIndex/index.do"
KOSIS_PAGE_URL_TEMPLATE = "https://kosis.kr/visual/eRegionIndex/eRegionWhole.do?unitySrvcId={unity_srvc_id}"
KOSIS_DETAIL_DATA_URL = "https://kosis.kr/visual/eRegionIndex/selectWholeDetailData.do"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

KOSIS_TO_APP_PROVINCE_CODE = {
    "11": "11",
    "21": "26",
    "22": "27",
    "23": "28",
    "24": "29",
    "25": "30",
    "26": "31",
    "29": "36",
    "31": "41",
    "32": "42",
    "33": "43",
    "34": "44",
    "35": "45",
    "36": "46",
    "37": "47",
    "38": "48",
    "39": "50",
}

APP_PROVINCE_INFO = {
    "11": {"label": "서울특별시", "shortLabel": "서울"},
    "26": {"label": "부산광역시", "shortLabel": "부산"},
    "27": {"label": "대구광역시", "shortLabel": "대구"},
    "28": {"label": "인천광역시", "shortLabel": "인천"},
    "29": {"label": "광주광역시", "shortLabel": "광주"},
    "30": {"label": "대전광역시", "shortLabel": "대전"},
    "31": {"label": "울산광역시", "shortLabel": "울산"},
    "36": {"label": "세종특별자치시", "shortLabel": "세종"},
    "41": {"label": "경기도", "shortLabel": "경기"},
    "42": {"label": "강원특별자치도", "shortLabel": "강원"},
    "43": {"label": "충청북도", "shortLabel": "충북"},
    "44": {"label": "충청남도", "shortLabel": "충남"},
    "45": {"label": "전북특별자치도", "shortLabel": "전북"},
    "46": {"label": "전라남도", "shortLabel": "전남"},
    "47": {"label": "경상북도", "shortLabel": "경북"},
    "48": {"label": "경상남도", "shortLabel": "경남"},
    "50": {"label": "제주특별자치도", "shortLabel": "제주"},
}

APP_PROVINCE_ORDER = [
    "11",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "36",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "50",
]

CITY_PARENT_KOSIS_CODES = ["29", "31", "32", "33", "34", "35", "36", "37", "38", "39"]

INDICATOR_CONFIGS = [
    {
        "key": "population-estimate",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "819",
        "cityUnitySrvcId": "1585",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "resident-population",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "816",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "population-growth-rate",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "810",
        "formatter": "percent",
        "allowRelative": False,
        "canBeNegative": True,
    },
    {
        "key": "aging-index",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "776",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "elderly-share",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "742",
        "formatter": "percent",
        "allowRelative": True,
    },
    {
        "key": "births",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "817",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "deaths",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "799",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "fertility-rate",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "818",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "in-migration",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "1247",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "out-migration",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "1248",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "net-migration",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "1436",
        "formatter": "count",
        "allowRelative": False,
        "canBeNegative": True,
    },
    {
        "key": "foreign-residents",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "unitySrvcId": "1251",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "household-count",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1566",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "urban-area",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1300",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "urban-area-per-capita",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1304",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "local-commuters",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1235",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "outbound-commuters",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1238",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "housing-supply-rate",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1263",
        "formatter": "percent",
        "allowRelative": True,
    },
    {
        "key": "housing-count",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1264",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "aged-housing-rate",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "unitySrvcId": "1305",
        "formatter": "percent",
        "allowRelative": True,
    },
    {
        "key": "farm-households",
        "category": "agriculture",
        "categoryLabel": "농업·촌락",
        "unitySrvcId": "946",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "farm-population",
        "category": "agriculture",
        "categoryLabel": "농업·촌락",
        "unitySrvcId": "824",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "paddy-field-area",
        "category": "agriculture",
        "categoryLabel": "농업·촌락",
        "unitySrvcId": "926",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "grdp",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "988",
        "cityUnitySrvcId": "989",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "grdp-per-capita",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "960",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "business-count",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "949",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "employees-total",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "954",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "manufacturing-businesses",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "941",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "manufacturing-employees",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "942",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "service-businesses",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "937",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "service-employees",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "938",
        "formatter": "count",
        "allowRelative": True,
    },
    {
        "key": "exports",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "929",
        "formatter": "plain",
        "allowRelative": True,
        "maxPoints": 60,
    },
    {
        "key": "imports",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "unitySrvcId": "931",
        "formatter": "plain",
        "allowRelative": True,
        "maxPoints": 60,
    },
    {
        "key": "final-energy-consumption",
        "category": "energy",
        "categoryLabel": "기후·에너지",
        "unitySrvcId": "914",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "electricity-sales",
        "category": "energy",
        "categoryLabel": "기후·에너지",
        "unitySrvcId": "911",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "temperature",
        "category": "energy",
        "categoryLabel": "기후·에너지",
        "unitySrvcId": "916",
        "formatter": "plain",
        "allowRelative": True,
    },
    {
        "key": "precipitation",
        "category": "energy",
        "categoryLabel": "기후·에너지",
        "unitySrvcId": "915",
        "formatter": "plain",
        "allowRelative": True,
    },
]

DERIVED_METRIC_CONFIGS = [
    {
        "key": "youth-population-share",
        "label": "유소년인구비율",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "periodKeyMode": "year",
        "dependencies": ["elderly-share", "aging-index"],
        "description": "고령인구비율과 노령화지수를 바탕으로 유소년(0~14세) 인구 비율을 재계산했습니다.",
    },
    {
        "key": "working-age-population-share",
        "label": "생산연령인구비율",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "periodKeyMode": "year",
        "dependencies": ["elderly-share", "aging-index"],
        "description": "고령인구비율과 노령화지수를 바탕으로 생산연령(15~64세) 인구 비율을 재계산했습니다.",
    },
    {
        "key": "youth-dependency-ratio",
        "label": "유소년부양비",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "plain",
        "allowRelative": True,
        "decimals": 1,
        "periodKeyMode": "year",
        "dependencies": ["elderly-share", "aging-index"],
        "description": "유소년 인구를 생산연령인구 100명당 값으로 환산한 지표입니다.",
    },
    {
        "key": "old-age-dependency-ratio",
        "label": "노년부양비",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "plain",
        "allowRelative": True,
        "decimals": 1,
        "periodKeyMode": "year",
        "dependencies": ["elderly-share", "aging-index"],
        "description": "노년 인구를 생산연령인구 100명당 값으로 환산한 지표입니다.",
    },
    {
        "key": "total-dependency-ratio",
        "label": "총부양비",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "plain",
        "allowRelative": True,
        "decimals": 1,
        "periodKeyMode": "year",
        "dependencies": ["elderly-share", "aging-index"],
        "description": "유소년·노년 인구를 생산연령인구 100명당 값으로 환산한 지표입니다.",
    },
    {
        "key": "natural-increase",
        "label": "자연적증가",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "count",
        "allowRelative": False,
        "canBeNegative": True,
        "decimals": 0,
        "dependencies": ["births", "deaths"],
        "description": "출생아수에서 사망자수를 뺀 값입니다.",
    },
    {
        "key": "foreign-resident-share",
        "label": "외국인비율",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["foreign-residents", "population-estimate"],
        "description": "추계인구 대비 등록외국인 비율입니다.",
    },
    {
        "key": "average-household-size",
        "label": "가구당인구",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "formatter": "plain",
        "allowRelative": True,
        "unit": "명/가구",
        "decimals": 2,
        "dependencies": ["population-estimate", "household-count"],
        "description": "추계인구를 가구수로 나눈 값입니다.",
    },
    {
        "key": "local-commute-share",
        "label": "거주지내취업비율",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["local-commuters", "outbound-commuters"],
        "description": "통근 취업자 중 거주지 안에서 일하는 취업자 비율입니다.",
    },
    {
        "key": "outbound-commute-share",
        "label": "타지역통근비율",
        "category": "urban",
        "categoryLabel": "도시·정주",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["local-commuters", "outbound-commuters"],
        "description": "통근 취업자 중 다른 시·군·구로 통근하는 취업자 비율입니다.",
    },
    {
        "key": "farm-household-share",
        "label": "농가비율",
        "category": "agriculture",
        "categoryLabel": "농업·촌락",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["farm-households", "household-count"],
        "description": "전체 가구수 대비 농가수 비율입니다.",
    },
    {
        "key": "farm-population-share",
        "label": "농가인구비율",
        "category": "agriculture",
        "categoryLabel": "농업·촌락",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["farm-population", "population-estimate"],
        "description": "추계인구 대비 농가인구 비율입니다.",
    },
    {
        "key": "manufacturing-business-share",
        "label": "제조업사업체비중",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["manufacturing-businesses", "business-count"],
        "description": "전체 사업체수 대비 제조업 사업체수 비중입니다.",
    },
    {
        "key": "service-business-share",
        "label": "서비스업사업체비중",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["service-businesses", "business-count"],
        "description": "전체 사업체수 대비 서비스업 사업체수 비중입니다.",
    },
    {
        "key": "manufacturing-employee-share",
        "label": "제조업종사자비중",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["manufacturing-employees", "employees-total"],
        "description": "전체 종사자수 대비 제조업 종사자수 비중입니다.",
    },
    {
        "key": "service-employee-share",
        "label": "서비스업종사자비중",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "formatter": "percent",
        "allowRelative": True,
        "decimals": 1,
        "dependencies": ["service-employees", "employees-total"],
        "description": "전체 종사자수 대비 서비스업 종사자수 비중입니다.",
    },
    {
        "key": "trade-balance",
        "label": "무역수지",
        "category": "industry",
        "categoryLabel": "공업·서비스",
        "formatter": "plain",
        "allowRelative": False,
        "canBeNegative": True,
        "decimals": 0,
        "dependencies": ["exports", "imports"],
        "description": "수출액에서 수입액을 뺀 값입니다.",
    },
]


def fetch_text(url: str, data: dict[str, str] | None = None) -> str:
    payload = None
    headers = {"User-Agent": USER_AGENT}
    if data is not None:
        payload = urllib.parse.urlencode(data).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
        headers["X-Requested-With"] = "XMLHttpRequest"
    request = urllib.request.Request(url, data=payload, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", "ignore")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def strip_tags(value: str) -> str:
    return normalize_space(re.sub(r"<[^>]+>", " ", value or ""))


def normalize_region_name(value: str) -> str:
    normalized = normalize_space(value).replace(" ", "")
    replacements = {
        "특별자치시": "시",
        "특별자치도": "도",
        "특별시": "시",
        "광역시": "시",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return normalized


def load_korea_admin_payload() -> dict[str, object]:
    text = KOREA_ADMIN_PATH.read_text(encoding="utf-8")
    payload_text = text.split("=", 1)[1].rsplit(";", 1)[0].strip()
    return json.loads(payload_text)


def build_city_region_bundle() -> tuple[list[str], dict[str, dict[str, str]], dict[tuple[str, str], str]]:
    payload = load_korea_admin_payload()
    geometries = (
        payload.get("cities", {})
        .get("objects", {})
        .get("c", {})
        .get("geometries", [])
    )

    region_order: list[str] = []
    regions: dict[str, dict[str, str]] = {}
    lookup: dict[tuple[str, str], str] = {}

    for geometry in geometries:
        code = str(geometry.get("id") or "")
        properties = geometry.get("properties", {})
        parent_code = str(properties.get("parentCode") or "")
        label = str(properties.get("name") or code)
        parent_label = str(properties.get("parentName") or parent_code)

        region_order.append(code)
        regions[code] = {
            "label": label,
            "shortLabel": label,
            "parentCode": parent_code,
            "parentLabel": parent_label,
        }

        normalized_name = normalize_region_name(label)
        lookup[(parent_code, normalized_name)] = code
        if label == "세종시":
            lookup[(parent_code, normalize_region_name("세종특별자치시"))] = code

    return region_order, regions, lookup


APP_CITY_ORDER, APP_CITY_INFO, APP_CITY_LOOKUP = build_city_region_bundle()


def extract_js_var(text: str, name: str, default: str = "") -> str:
    pattern = rf"var\s+{re.escape(name)}\s*=\s*'([^']*)'"
    match = re.search(pattern, text)
    return match.group(1) if match else default


def extract_js_split_list(text: str, name: str) -> list[str]:
    pattern = rf"var\s+{re.escape(name)}\s*=\s*'([^']*)'\.split\('\|'\)"
    match = re.search(pattern, text)
    if not match:
        return []
    return [value for value in (match.group(1) or "").split("|") if value]


def extract_indicator_page_meta(unity_srvc_id: str) -> dict[str, object]:
    page_url = KOSIS_PAGE_URL_TEMPLATE.format(unity_srvc_id=unity_srvc_id)
    page_text = fetch_text(page_url)

    header_match = re.search(
        r'<div class="info-header-wrap">\s*<h5>(.*?)</h5>\s*<span>(.*?)</span>',
        page_text,
        re.S,
    )
    source_match = re.search(r'<span class="source">출처:\s*(.*?)</span>', page_text, re.S)
    stat_match = re.search(r"fnGoToStat\('([^']+)','([^']+)'\)", page_text)

    source_text = strip_tags(source_match.group(1)) if source_match else ""
    org_id = stat_match.group(1) if stat_match else ""
    tbl_id = stat_match.group(2) if stat_match else ""
    srvc_levels = extract_js_split_list(page_text, "vSrvcLevelList")

    return {
        "pageUrl": page_url,
        "name": strip_tags(header_match.group(1)) if header_match else unity_srvc_id,
        "description": strip_tags(header_match.group(2)) if header_match else "",
        "sourceText": source_text,
        "sourceName": source_text.split("「")[0].rstrip(", ") if source_text else "",
        "statTableOrgId": org_id,
        "statTableId": tbl_id,
        "statTableUrl": (
            f"https://kosis.kr/statHtml/statHtml.do?orgId={org_id}&tblId={tbl_id}&conn_path=ZF"
            if org_id and tbl_id
            else ""
        ),
        "stdIdctId": extract_js_var(page_text, "vStdIdctId"),
        "ownerCyclSe": extract_js_var(page_text, "vOwnerCyclSe", "Y"),
        "ownerOtherGroupCd": extract_js_var(page_text, "vOwnerOtherGroupCd"),
        "ownerOtherCd": extract_js_var(page_text, "vOwnerOtherCd"),
        "clsfLevel": extract_js_var(page_text, "vClsfLevel", "1") or "1",
        "onlySigungu": extract_js_var(page_text, "vOnlySigungu"),
        "srvcLevels": srvc_levels,
        "supportsCity": "2" in srvc_levels,
    }


def parse_period_sort_key(period_key: str) -> int:
    digits = re.sub(r"\D", "", str(period_key or ""))
    return int(digits) if digits else -1


def is_current_or_past_period(period_key: str, cycle: str) -> bool:
    digits = re.sub(r"\D", "", str(period_key or ""))
    if not digits:
        return False

    now = datetime.now()
    cycle = (cycle or "").upper()

    if cycle == "M" and len(digits) >= 6:
        return int(digits[:6]) <= now.year * 100 + now.month

    if cycle == "Q" and len(digits) >= 5:
        current_quarter = (now.month - 1) // 3 + 1
        return int(digits[:5]) <= now.year * 10 + current_quarter

    if cycle == "H" and len(digits) >= 5:
        current_half = 1 if now.month <= 6 else 2
        return int(digits[:5]) <= now.year * 10 + current_half

    if cycle == "Y" and len(digits) >= 4:
        return int(digits[:4]) <= now.year

    return True


def pick_primary_other_code(rows: list[dict[str, object]], owner_other_cd: str) -> str:
    if owner_other_cd:
        return owner_other_cd

    if any((row.get("otherNm") or "") == "계" for row in rows):
        return next(str(row.get("otherCd") or "") for row in rows if (row.get("otherNm") or "") == "계")

    counts: dict[str, int] = {}
    for row in rows:
        other_cd = str(row.get("otherCd") or "")
        counts[other_cd] = counts.get(other_cd, 0) + 1

    if not counts:
        return ""
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def fetch_indicator_rows(
    unity_srvc_id: str,
    meta: dict[str, object],
    level_key: str,
) -> list[dict[str, object]]:
    request_data = {
        "unitySrvcId": unity_srvc_id,
        "stdIdctId": str(meta["stdIdctId"]),
        "clsfGroupCd": str(meta["ownerOtherGroupCd"]),
        "clsfCd": str(meta["ownerOtherCd"]),
        "cyclSe": str(meta["ownerCyclSe"]),
        "year": "",
    }

    if level_key == "provinces":
        response_text = fetch_text(
            KOSIS_DETAIL_DATA_URL,
            {
                **request_data,
                "clsfLevel": "1",
                "regionCd": "00",
            },
        )
        return list((json.loads(response_text).get("data") or []))

    rows: list[dict[str, object]] = []
    for parent_code in CITY_PARENT_KOSIS_CODES:
        response_text = fetch_text(
            KOSIS_DETAIL_DATA_URL,
            {
                **request_data,
                "clsfLevel": "2",
                "regionCd": parent_code,
            },
        )
        rows.extend(list((json.loads(response_text).get("data") or [])))
    return rows


def resolve_app_city_code(row: dict[str, object]) -> str:
    parent_kosis_code = str(row.get("regionUpCd") or "")
    parent_app_code = KOSIS_TO_APP_PROVINCE_CODE.get(parent_kosis_code, "")
    if not parent_app_code:
        return ""

    candidate_names = [
        normalize_region_name(str(row.get("regionNm") or "")),
        normalize_region_name(str(row.get("regionAdd") or "").split(" ")[-1]),
    ]
    for name in candidate_names:
        if not name:
            continue
        app_code = APP_CITY_LOOKUP.get((parent_app_code, name))
        if app_code:
            return app_code
    return ""


def fetch_indicator_series(
    unity_srvc_id: str,
    meta: dict[str, object],
    config: dict[str, object],
    level_key: str,
) -> dict[str, object]:
    rows = fetch_indicator_rows(unity_srvc_id, meta, level_key)
    if not rows:
        return {
            "nationalSeries": [],
            "nationalLatest": None,
            "seriesByRegion": {},
            "latestByRegion": {},
            "unit": "",
            "decimals": 0,
        }

    primary_other_code = pick_primary_other_code(rows, str(meta["ownerOtherCd"]))
    if primary_other_code:
        rows = [row for row in rows if str(row.get("otherCd") or "") == primary_other_code]

    rows = [
        row
        for row in rows
        if is_current_or_past_period(str(row.get("wrtPnttm") or ""), str(meta["ownerCyclSe"]))
    ]
    if not rows:
        return {
            "nationalSeries": [],
            "nationalLatest": None,
            "seriesByRegion": {},
            "latestByRegion": {},
            "unit": "",
            "decimals": 0,
        }

    def build_point(row: dict[str, object]) -> dict[str, object]:
        return {
            "periodKey": str(row.get("wrtPnttm") or ""),
            "periodLabel": str(row.get("wrtPnttmString") or row.get("wrtPnttm") or ""),
            "value": row.get("vl"),
            "displayValue": str(row.get("vlString") or ""),
        }

    max_points = int(config.get("maxPoints") or 0)
    series_by_region: dict[str, list[dict[str, object]]] = {}
    latest_by_region: dict[str, dict[str, object]] = {}

    if level_key == "provinces":
        national_rows = [row for row in rows if str(row.get("regionCd") or "") == "00"]
        regional_rows = [row for row in rows if str(row.get("regionCd") or "") in KOSIS_TO_APP_PROVINCE_CODE]
        grouped_by_region: dict[str, list[dict[str, object]]] = {code: [] for code in APP_PROVINCE_ORDER}
        for row in regional_rows:
            app_code = KOSIS_TO_APP_PROVINCE_CODE[str(row["regionCd"])]
            grouped_by_region.setdefault(app_code, []).append(row)
        region_order = APP_PROVINCE_ORDER
    else:
        national_rows = []
        grouped_by_region = {code: [] for code in APP_CITY_ORDER}
        for row in rows:
            app_code = resolve_app_city_code(row)
            if app_code:
                grouped_by_region.setdefault(app_code, []).append(row)
        region_order = APP_CITY_ORDER

    for app_code in region_order:
        region_rows = sorted(
            grouped_by_region.get(app_code) or [],
            key=lambda row: parse_period_sort_key(str(row.get("wrtPnttm") or "")),
        )
        if max_points and len(region_rows) > max_points:
            region_rows = region_rows[-max_points:]
        if not region_rows:
            continue
        series = [build_point(row) for row in region_rows if row.get("vl") not in (None, "")]
        if not series:
            continue
        series_by_region[app_code] = series
        latest_by_region[app_code] = series[-1]

    national_rows = sorted(
        national_rows,
        key=lambda row: parse_period_sort_key(str(row.get("wrtPnttm") or "")),
    )
    if max_points and len(national_rows) > max_points:
        national_rows = national_rows[-max_points:]
    national_series = [build_point(row) for row in national_rows if row.get("vl") not in (None, "")]

    sample_row = next((row for row in rows if row.get("vl") not in (None, "")), rows[0])

    return {
        "nationalSeries": national_series,
        "nationalLatest": national_series[-1] if national_series else None,
        "seriesByRegion": series_by_region,
        "latestByRegion": latest_by_region,
        "unit": str(sample_row.get("unit") or ""),
        "decimals": int(sample_row.get("dcpt") or 0),
    }


def build_metric_payload(
    config: dict[str, object],
    page_meta: dict[str, object],
    series_meta: dict[str, object],
    unity_srvc_id: str,
) -> dict[str, object]:
    return {
        "key": config["key"],
        "label": page_meta["name"],
        "category": config["category"],
        "categoryLabel": config["categoryLabel"],
        "formatter": config["formatter"],
        "allowRelative": bool(config.get("allowRelative", True)),
        "canBeNegative": bool(config.get("canBeNegative", False)),
        "unit": series_meta["unit"],
        "decimals": series_meta["decimals"],
        "description": page_meta["description"],
        "sourceText": page_meta["sourceText"],
        "sourceName": page_meta["sourceName"],
        "pageUrl": page_meta["pageUrl"],
        "statTableUrl": page_meta["statTableUrl"],
        "statTableId": page_meta["statTableId"],
        "ownerCyclSe": page_meta["ownerCyclSe"],
        "stdIdctId": page_meta["stdIdctId"],
        "unitySrvcId": unity_srvc_id,
        "supportsCity": bool(page_meta.get("supportsCity")),
        "nationalSeries": series_meta["nationalSeries"],
        "nationalLatest": series_meta["nationalLatest"],
        "seriesByRegion": series_meta["seriesByRegion"],
        "latestByRegion": series_meta["latestByRegion"],
    }


def format_derived_display_value(value: float, decimals: int) -> str:
    if decimals <= 0:
        return f"{round(value):,}"
    return f"{value:,.{decimals}f}"


def derive_age_structure(elderly_share: float, aging_index: float) -> tuple[float, float] | None:
    if aging_index <= 0:
        return None
    youth_share = elderly_share * 100 / aging_index
    working_share = 100 - elderly_share - youth_share
    if youth_share < 0 or working_share <= 0:
        return None
    return youth_share, working_share


def compute_derived_metric_value(metric_key: str, values: dict[str, float]) -> float | None:
    if metric_key in {
        "youth-population-share",
        "working-age-population-share",
        "youth-dependency-ratio",
        "old-age-dependency-ratio",
        "total-dependency-ratio",
    }:
        age_structure = derive_age_structure(values["elderly-share"], values["aging-index"])
        if age_structure is None:
            return None
        youth_share, working_share = age_structure
        if metric_key == "youth-population-share":
            return youth_share
        if metric_key == "working-age-population-share":
            return working_share
        if metric_key == "youth-dependency-ratio":
            return youth_share / working_share * 100
        if metric_key == "old-age-dependency-ratio":
            return values["elderly-share"] / working_share * 100
        return (youth_share + values["elderly-share"]) / working_share * 100

    if metric_key == "natural-increase":
        return values["births"] - values["deaths"]

    if metric_key == "foreign-resident-share":
        population = values["population-estimate"]
        return values["foreign-residents"] / population * 100 if population > 0 else None

    if metric_key == "average-household-size":
        households = values["household-count"]
        return values["population-estimate"] / households if households > 0 else None

    if metric_key == "local-commute-share":
        total = values["local-commuters"] + values["outbound-commuters"]
        return values["local-commuters"] / total * 100 if total > 0 else None

    if metric_key == "outbound-commute-share":
        total = values["local-commuters"] + values["outbound-commuters"]
        return values["outbound-commuters"] / total * 100 if total > 0 else None

    if metric_key == "farm-household-share":
        households = values["household-count"]
        return values["farm-households"] / households * 100 if households > 0 else None

    if metric_key == "farm-population-share":
        population = values["population-estimate"]
        return values["farm-population"] / population * 100 if population > 0 else None

    if metric_key == "manufacturing-business-share":
        total = values["business-count"]
        return values["manufacturing-businesses"] / total * 100 if total > 0 else None

    if metric_key == "service-business-share":
        total = values["business-count"]
        return values["service-businesses"] / total * 100 if total > 0 else None

    if metric_key == "manufacturing-employee-share":
        total = values["employees-total"]
        return values["manufacturing-employees"] / total * 100 if total > 0 else None

    if metric_key == "service-employee-share":
        total = values["employees-total"]
        return values["service-employees"] / total * 100 if total > 0 else None

    if metric_key == "trade-balance":
        return values["exports"] - values["imports"]

    return None


def build_derived_series(
    dependency_series: dict[str, list[dict[str, object]]],
    config: dict[str, object],
) -> list[dict[str, object]]:
    if not dependency_series:
        return []

    period_key_mode = str(config.get("periodKeyMode") or "exact")
    point_maps: dict[str, dict[str, dict[str, object]]] = {}
    for dependency_key, series in dependency_series.items():
        if not series:
            return []
        normalized_map: dict[str, dict[str, object]] = {}
        for point in series:
            raw_period_key = str(point.get("periodKey") or "")
            if not raw_period_key:
                continue
            normalized_period_key = raw_period_key[:4] if period_key_mode == "year" else raw_period_key
            existing_point = normalized_map.get(normalized_period_key)
            if existing_point is None or parse_period_sort_key(raw_period_key) >= parse_period_sort_key(
                str(existing_point.get("periodKey") or "")
            ):
                normalized_map[normalized_period_key] = {
                    **point,
                    "periodKey": normalized_period_key,
                    "periodLabel": normalized_period_key if period_key_mode == "year" else point.get("periodLabel"),
                }
        if not normalized_map:
            return []
        point_maps[dependency_key] = normalized_map

    period_keys = sorted(
        set.intersection(*(set(point_map.keys()) for point_map in point_maps.values())),
        key=parse_period_sort_key,
    )

    decimals = int(config.get("decimals") or 0)
    derived_series: list[dict[str, object]] = []
    for period_key in period_keys:
        values: dict[str, float] = {}
        period_label = ""
        is_valid = True
        for dependency_key, point_map in point_maps.items():
            point = point_map.get(period_key)
            numeric_value = point.get("value") if point else None
            if point is None or not isinstance(numeric_value, (int, float)):
                is_valid = False
                break
            values[dependency_key] = float(numeric_value)
            if not period_label:
                period_label = str(point.get("periodLabel") or period_key)
        if not is_valid:
            continue

        derived_value = compute_derived_metric_value(str(config["key"]), values)
        if derived_value is None:
            continue
        derived_series.append(
            {
                "periodKey": period_key,
                "periodLabel": period_label,
                "value": round(derived_value, decimals) if decimals > 0 else round(derived_value),
                "displayValue": format_derived_display_value(derived_value, decimals),
            }
        )

    return derived_series


def build_derived_metric_payload(
    config: dict[str, object],
    level_metrics: dict[str, dict[str, object]],
    level_key: str,
) -> dict[str, object] | None:
    dependency_keys = [str(key) for key in config["dependencies"]]
    if any(dependency_key not in level_metrics for dependency_key in dependency_keys):
        return None

    first_dependency = level_metrics[dependency_keys[0]]
    source_labels = [str(level_metrics[dependency_key]["label"]) for dependency_key in dependency_keys]
    national_dependency_series = {
        dependency_key: level_metrics[dependency_key]["nationalSeries"] for dependency_key in dependency_keys
    }
    national_series = build_derived_series(national_dependency_series, config)

    region_order = APP_PROVINCE_ORDER if level_key == "provinces" else APP_CITY_ORDER
    series_by_region: dict[str, list[dict[str, object]]] = {}
    latest_by_region: dict[str, dict[str, object]] = {}
    for region_code in region_order:
        region_dependency_series = {
            dependency_key: level_metrics[dependency_key]["seriesByRegion"].get(region_code, [])
            for dependency_key in dependency_keys
        }
        derived_series = build_derived_series(region_dependency_series, config)
        if not derived_series:
            continue
        series_by_region[region_code] = derived_series
        latest_by_region[region_code] = derived_series[-1]

    if not series_by_region:
        return None

    return {
        "key": config["key"],
        "label": config["label"],
        "category": config["category"],
        "categoryLabel": config["categoryLabel"],
        "formatter": config["formatter"],
        "allowRelative": bool(config.get("allowRelative", True)),
        "canBeNegative": bool(config.get("canBeNegative", False)),
        "unit": str(config.get("unit") or ""),
        "decimals": int(config.get("decimals") or 0),
        "description": config["description"],
        "sourceText": f"국가데이터처 최신 원지표({', '.join(source_labels)})를 조합해 재계산했습니다.",
        "sourceName": "국가데이터처 재구성",
        "pageUrl": str(first_dependency.get("pageUrl") or ""),
        "statTableUrl": "",
        "statTableId": "",
        "ownerCyclSe": str(first_dependency.get("ownerCyclSe") or ""),
        "stdIdctId": "",
        "unitySrvcId": "",
        "supportsCity": level_key == "cities",
        "nationalSeries": national_series,
        "nationalLatest": national_series[-1] if national_series else None,
        "seriesByRegion": series_by_region,
        "latestByRegion": latest_by_region,
    }


def build_bundle() -> dict[str, object]:
    metrics_by_level: dict[str, dict[str, object]] = {"provinces": {}, "cities": {}}
    categories: dict[str, str] = {}

    for config in INDICATOR_CONFIGS:
        province_unity_srvc_id = str(config["unitySrvcId"])
        print(f"Fetching KOSIS indicator {province_unity_srvc_id} ({config['key']})...")
        province_meta = extract_indicator_page_meta(province_unity_srvc_id)
        province_series = fetch_indicator_series(province_unity_srvc_id, province_meta, config, "provinces")

        if province_series["seriesByRegion"]:
            categories[str(config["category"])] = str(config["categoryLabel"])
            metrics_by_level["provinces"][str(config["key"])] = build_metric_payload(
                config,
                province_meta,
                province_series,
                province_unity_srvc_id,
            )
        else:
            print(f"  - skipped provinces: no provincial data for {config['key']}")

        city_unity_srvc_id = str(config.get("cityUnitySrvcId") or province_unity_srvc_id)
        city_meta = province_meta
        if city_unity_srvc_id == province_unity_srvc_id and not province_meta["supportsCity"]:
            print(f"  - skipped cities: no city service for {config['key']}")
            continue
        if city_unity_srvc_id != province_unity_srvc_id:
            print(f"  - fetching city variant {city_unity_srvc_id} for {config['key']}")
            city_meta = extract_indicator_page_meta(city_unity_srvc_id)

        city_series = fetch_indicator_series(city_unity_srvc_id, city_meta, config, "cities")
        if city_series["seriesByRegion"]:
            categories[str(config["category"])] = str(config["categoryLabel"])
            metrics_by_level["cities"][str(config["key"])] = build_metric_payload(
                config,
                city_meta,
                city_series,
                city_unity_srvc_id,
            )
        else:
            print(f"  - skipped cities: no city data for {config['key']}")

    for level_key, level_metrics in metrics_by_level.items():
        for config in DERIVED_METRIC_CONFIGS:
            derived_payload = build_derived_metric_payload(config, level_metrics, level_key)
            if not derived_payload:
                print(f"  - skipped {level_key} derived metric: no aligned data for {config['key']}")
                continue
            categories[str(config["category"])] = str(config["categoryLabel"])
            level_metrics[str(config["key"])] = derived_payload

    return {
        "meta": {
            "generatedAt": datetime.now().isoformat(timespec="seconds"),
            "provider": "KOSIS e-지방지표",
            "sourceBaseUrl": KOSIS_INDEX_URL,
            "note": "2027 수능특강 한국지리에서 반복적으로 활용되는 지표만 남기고, 값은 KOSIS e-지방지표 최신 공식 수치와 그 파생 지표로 다시 정리했습니다.",
            "categories": categories,
            "levels": {
                "provinces": "도/광역시",
                "cities": "시/군",
            },
        },
        "regionOrder": {
            "provinces": APP_PROVINCE_ORDER,
            "cities": APP_CITY_ORDER,
        },
        "regions": {
            "provinces": APP_PROVINCE_INFO,
            "cities": APP_CITY_INFO,
        },
        "metrics": metrics_by_level,
    }


def write_output(bundle: dict[str, object]) -> None:
    js_content = (
        "window.KOREA_GEO_STATS_META = "
        + json.dumps(bundle["meta"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        + "window.KOREA_GEO_STATS_REGION_ORDER = "
        + json.dumps(bundle["regionOrder"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        + "window.KOREA_GEO_STATS_REGIONS = "
        + json.dumps(bundle["regions"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        + "window.KOREA_GEO_STATS_METRICS = "
        + json.dumps(bundle["metrics"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    OUTPUT_PATH.write_text(js_content, encoding="utf-8")


def main() -> None:
    bundle = build_bundle()
    write_output(bundle)
    province_count = len(bundle["metrics"]["provinces"])
    city_count = len(bundle["metrics"]["cities"])
    print(
        f"Wrote {province_count} provincial metrics and {city_count} city metrics to {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
