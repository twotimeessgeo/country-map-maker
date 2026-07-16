#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT_DIR / "data" / "korea-stats.js"
SOURCE_PAGE_URL = (
    "https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do"
    "?bbsId=BBSMSTR_000000000014&nttId=121226"
)
PERIOD_KEY = "2024"
PERIOD_LABEL = "2024.11.1."

METRICS = [
    ("mois-foreign-resident-share", "외국인주민비율", "foreignResidentSharePct", "percent", "%", 2),
    ("mois-foreign-residents-total", "외국인주민", "foreignResidentsTotal", "count", "명", 0),
    ("mois-non-citizen-residents", "한국국적 미취득자", "nonCitizenResidents", "count", "명", 0),
    ("mois-foreign-workers", "외국인근로자", "foreignWorkers", "count", "명", 0),
    ("mois-marriage-immigrants", "결혼이민자", "marriageImmigrants", "count", "명", 0),
    ("mois-international-students", "유학생", "internationalStudents", "count", "명", 0),
    ("mois-foreign-nationality-koreans", "외국국적동포", "foreignNationalityKoreans", "count", "명", 0),
    ("mois-other-foreigners", "기타 외국인", "otherForeigners", "count", "명", 0),
    ("mois-naturalized-citizens", "한국국적 취득자", "naturalizedCitizens", "count", "명", 0),
    ("mois-foreign-resident-children", "외국인주민 자녀", "foreignResidentChildren", "count", "명", 0),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge MOIS 2024 foreign-resident tables into korea-stats.js")
    parser.add_argument("--sido-csv", type=Path, required=True)
    parser.add_argument("--sigungu-csv", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def load_bundle(path: Path) -> dict[str, object]:
    variables: dict[str, object] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"window\.(KOREA_GEO_STATS_[A-Z_]+) = (.*);$", line)
        if match:
            variables[match.group(1)] = json.loads(match.group(2))
    required = {
        "KOREA_GEO_STATS_META",
        "KOREA_GEO_STATS_REGION_ORDER",
        "KOREA_GEO_STATS_REGIONS",
        "KOREA_GEO_STATS_METRICS",
    }
    if not required.issubset(variables):
        raise RuntimeError(f"Unable to parse {path}")
    return variables


def write_bundle(path: Path, bundle: dict[str, object]) -> None:
    lines = [
        f"window.{name} = {json.dumps(bundle[name], ensure_ascii=False, separators=(',', ':'))};"
        for name in (
            "KOREA_GEO_STATS_META",
            "KOREA_GEO_STATS_REGION_ORDER",
            "KOREA_GEO_STATS_REGIONS",
            "KOREA_GEO_STATS_METRICS",
        )
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def normalize_name(value: str) -> str:
    value = re.sub(r"\s+", "", value or "")
    return (
        value.replace("강원특별자치도", "강원도")
        .replace("전북특별자치도", "전북도")
        .replace("전라북도", "전북도")
        .replace("세종특별자치시", "세종시")
    )


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def number(row: dict[str, str], column: str) -> float | int | None:
    raw = (row.get(column) or "").strip().replace(",", "")
    if not raw:
        return None
    value = float(raw)
    return value if column == "foreignResidentSharePct" else int(round(value))


def display(value: float | int | None, formatter: str, decimals: int) -> str:
    if value is None:
        return "-"
    if formatter == "percent":
        return f"{float(value):,.{decimals}f}%"
    return f"{int(value):,}"


def point(value: float | int | None, formatter: str, decimals: int) -> dict[str, object]:
    return {
        "periodKey": PERIOD_KEY,
        "periodLabel": PERIOD_LABEL,
        "value": value,
        "displayValue": display(value, formatter, decimals),
    }


def match_level_rows(
    level: str,
    regions: dict[str, dict[str, str]],
    province_rows: list[dict[str, str]],
    local_rows: list[dict[str, str]],
) -> dict[str, dict[str, str]]:
    if level == "provinces":
        lookup = {normalize_name(row["region"]): row for row in province_rows}
        matches = {code: lookup.get(normalize_name(info["label"])) for code, info in regions.items()}
    else:
        lookup = {
            (normalize_name(row["province"]), normalize_name(row["region"])): row
            for row in local_rows
        }
        matches = {
            code: lookup.get((normalize_name(info["parentLabel"]), normalize_name(info["label"])))
            for code, info in regions.items()
        }
    missing = [f"{code}:{regions[code]['label']}" for code, row in matches.items() if row is None]
    if missing:
        raise RuntimeError(f"MOIS row matching failed for {level}: {', '.join(missing)}")
    return {code: row for code, row in matches.items() if row is not None}


def build_metric(
    key: str,
    label: str,
    column: str,
    formatter: str,
    unit: str,
    decimals: int,
    level: str,
    matched_rows: dict[str, dict[str, str]],
    province_rows: list[dict[str, str]],
) -> dict[str, object]:
    missing_region_codes = [
        code for code, row in matched_rows.items() if number(row, column) is None
    ]
    series_by_region = {
        code: [point(number(row, column), formatter, decimals)]
        for code, row in matched_rows.items()
    }
    latest_by_region = {code: series[-1] for code, series in series_by_region.items()}

    national_value: float | int | None = None
    if level == "provinces":
        if column == "foreignResidentSharePct":
            total_population = sum(int(number(row, "totalPopulation") or 0) for row in province_rows)
            foreign_residents = sum(int(number(row, "foreignResidentsTotal") or 0) for row in province_rows)
            national_value = foreign_residents / total_population * 100 if total_population else None
        else:
            national_value = sum(int(number(row, column) or 0) for row in province_rows)
    national_series = [point(national_value, formatter, decimals)] if national_value is not None else []

    payload = {
        "key": key,
        "label": label,
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": formatter,
        "allowRelative": True,
        "canBeNegative": False,
        "unit": unit,
        "decimals": decimals,
        "description": "행정안전부 지방자치단체 외국인주민 현황의 2024년 11월 1일 기준 값입니다.",
        "sourceText": "행정안전부, 「2024 지방자치단체 외국인주민 현황」",
        "sourceName": "행정안전부",
        "pageUrl": SOURCE_PAGE_URL,
        "statTableUrl": "",
        "statTableId": "",
        "ownerCyclSe": "Y",
        "stdIdctId": "",
        "unitySrvcId": "",
        "supportsCity": level != "provinces",
        "nationalSeries": national_series,
        "nationalLatest": national_series[-1] if national_series else None,
        "seriesByRegion": series_by_region,
        "latestByRegion": latest_by_region,
    }
    if missing_region_codes:
        payload["missingValueCount"] = len(missing_region_codes)
        payload["missingValueNote"] = (
            "원천 표의 공란은 0으로 추정하지 않고 null로 보존했습니다."
        )
    return payload


def main() -> None:
    args = parse_args()
    bundle = load_bundle(args.output)
    province_rows = read_rows(args.sido_csv)
    local_rows = read_rows(args.sigungu_csv)
    regions_by_level = bundle["KOREA_GEO_STATS_REGIONS"]
    metrics_by_level = bundle["KOREA_GEO_STATS_METRICS"]

    coverage: dict[str, int] = {}
    for level in ("provinces", "cities", "metroDistricts"):
        regions = regions_by_level.get(level, {})
        if not regions:
            continue
        matched_rows = match_level_rows(level, regions, province_rows, local_rows)
        coverage[level] = len(matched_rows)
        level_metrics = metrics_by_level.setdefault(level, {})
        for definition in METRICS:
            payload = build_metric(*definition, level, matched_rows, province_rows)
            level_metrics[payload["key"]] = payload

    meta = bundle["KOREA_GEO_STATS_META"]
    meta.setdefault("categories", {})["demography"] = "인구 구조·이동"
    source_missing_values = {
        column: sum(1 for row in local_rows if number(row, column) is None)
        for _, _, column, _, _, _ in METRICS
    }
    source_missing_values = {
        column: count for column, count in source_missing_values.items() if count
    }
    meta["supplementalSources"] = {
        **meta.get("supplementalSources", {}),
        "moisForeignResidents2024": {
            "mergedAt": datetime.now().isoformat(timespec="seconds"),
            "referenceDate": "2024-11-01",
            "source": "행정안전부, 2024 지방자치단체 외국인주민 현황",
            "sourceUrl": SOURCE_PAGE_URL,
            "coverage": coverage,
            "missingValues": {
                "policy": "원천 표 공란은 0으로 대체하지 않고 null로 보존",
                "sourceRowsByColumn": source_missing_values,
            },
        },
    }
    write_bundle(args.output, bundle)
    print(f"Merged {len(METRICS)} MOIS metrics; coverage={coverage}; output={args.output}")


if __name__ == "__main__":
    main()
