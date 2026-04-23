#!/usr/bin/env python3
from __future__ import annotations

import csv
import io
import json
import re
import sys
import zipfile
from datetime import datetime
from http.cookiejar import CookieJar
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, Request, build_opener


ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT_DIR / "data" / "korea-stats.js"
CACHE_DIR = ROOT_DIR / ".cache" / "kosis-mass"

MASS_LIST_URL = "https://kosis.kr/statisticsList/mass/mass_list.jsp"
MASS_SEQ_URL = "https://kosis.kr/statisticsList/mass/mass_down_seq.jsp"
MASS_DOWNLOAD_URL = "https://kosis.kr/file_mass/file_down.jsp"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

OLD_CENSUS_TABLE_ID = "DT_1IN0001_05"
NEW_CENSUS_TABLE_ID = "DT_1IN1502"
NEW_CENSUS_LIST_ID = "A11_2015_1_10_10"
BASE_BOUNDARY_VERSION = "20201001"
METRIC_KEY = "population-census-linked-2020"
METRO_PARENT_CODES = {"11", "26", "27", "28", "29", "30", "31"}
NON_METRO_PARENT_CODES = {"36", "41", "42", "43", "44", "45", "46", "47", "48", "50", "51", "52"}
CURRENT_CODE_PREFIX_BY_2020_PREFIX = {"42": "51", "45": "52"}
TARGET_VERSION_BY_YEAR = {
    1975: "19751231",
    1980: "19801231",
    1985: "19851231",
    1990: "19901231",
    1995: "19951231",
    2000: "20001231",
    2005: "20051231",
    2010: "20101231",
    2015: "20151231",
    2016: "20160201",
    2017: "20171016",
    2018: "20181106",
    2019: "20191231",
    2020: "20201001",
    2021: "20210701",
    2022: "20221001",
    2023: "20231231",
    2024: "20241231",
}


def require_geo_dependencies():
    try:
        import admdongkor as adk  # type: ignore
        import geopandas as gpd  # noqa: F401
    except ImportError as error:
        raise SystemExit(
            "This script needs admdongkor/geopandas. Install into your active Python, "
            "for example: python -m pip install admdongkor"
        ) from error
    return adk


def fetch_text(url: str, data: dict[str, str] | None = None, opener=None, referer: str = "") -> str:
    payload = urlencode(data).encode("utf-8") if data else None
    headers = {"User-Agent": USER_AGENT}
    if referer:
        headers["Referer"] = referer
    if payload:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    request = Request(url, data=payload, headers=headers)
    active_opener = opener or build_opener(HTTPCookieProcessor(CookieJar()))
    with active_opener.open(request, timeout=60) as response:
        return response.read().decode("utf-8", "ignore")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def safe_text(value) -> str:
    if value is None:
        return ""
    if str(value) == "<NA>":
        return ""
    return str(value)


def normalize_region_name(value: str) -> str:
    normalized = normalize_space(safe_text(value)).replace(" ", "")
    normalized = normalized.replace("（", "(").replace("）", ")")
    replacements = {
        "강원특별자치도": "강원도",
        "전북특별자치도": "전라북도",
        "전라북도특별자치도": "전라북도",
        "제주특별자치도": "제주도",
        "세종특별자치시": "세종시",
        "서울특별시": "서울시",
        "부산광역시": "부산시",
        "대구광역시": "대구시",
        "인천광역시": "인천시",
        "광주광역시": "광주시",
        "대전광역시": "대전시",
        "울산광역시": "울산시",
        "원주(원성)군": "원성군",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return normalized


def alternate_region_names(value: str) -> set[str]:
    normalized = normalize_region_name(value)
    names = {normalized}
    match = re.match(r"^(.+)\((.+)\)([시군구])$", normalized)
    if match:
        names.add(f"{match.group(1)}{match.group(3)}")
        names.add(f"{match.group(2)}{match.group(3)}")
    return {name for name in names if name}


def mass_list_url(table_id: str, list_id: str = "", vw_cd: str = "") -> str:
    return (
        f"{MASS_LIST_URL}?list_id={list_id}&org_id=101&process=statHtml"
        f"&tbl_id={table_id}&vw_cd={vw_cd}"
    )


def fetch_mass_catalog(table_id: str, list_id: str = "", vw_cd: str = "") -> dict[int, tuple[str, str]]:
    url = mass_list_url(table_id, list_id, vw_cd)
    text = fetch_text(url)
    catalog: dict[int, tuple[str, str]] = {}
    for match in re.finditer(r"file_data_\d+[^>]*value=[\"']([^\"']+)", text):
        file_no, filename = match.group(1).split("/", 1)
        year_match = re.search(r"_(\d{4})$", filename)
        if not year_match:
            continue
        catalog[int(year_match.group(1))] = (file_no, filename)
    return catalog


def download_mass_csv(table_id: str, file_no: str, filename: str, list_id: str = "", vw_cd: str = "") -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = CACHE_DIR / f"{filename}.csv"
    if cache_path.exists():
        return cache_path.read_text(encoding="cp949")

    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    referer = mass_list_url(table_id, list_id, vw_cd)
    opener.open(Request(referer, headers={"User-Agent": USER_AGENT}), timeout=60).read()
    seq_text = fetch_text(MASS_SEQ_URL, opener=opener, referer=referer)
    seq_match = re.search(r"setDownNo\('([^']+)'", seq_text)
    if not seq_match:
        raise RuntimeError(f"Could not obtain KOSIS download sequence for {filename}")

    post_data = {
        "tbl_id": table_id,
        "org_id": "101",
        "filename": filename,
        "file_no": file_no,
        "file_type": "ONE",
        "vw_cd": vw_cd,
        "list_id": list_id,
        "usrId": "null",
        "usrName": "null",
        "down_cnt": "1",
        "use_no": seq_match.group(1),
        "page": "kosis",
    }
    payload = urlencode(post_data).encode("utf-8")
    request = Request(
        MASS_DOWNLOAD_URL,
        data=payload,
        headers={
            "User-Agent": USER_AGENT,
            "Referer": referer,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with opener.open(request, timeout=120) as response:
        raw = response.read()
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        csv_name = archive.namelist()[0]
        text = archive.read(csv_name).decode("cp949")
    cache_path.write_text(text, encoding="cp949")
    return text


def iter_csv_records(text: str) -> list[dict[str, str]]:
    lines = [
        line
        for line in text.splitlines()
        if line.strip() and not line.startswith('"총조사') and not line.startswith('"인구,')
    ]
    return list(csv.DictReader(lines))


def parse_population_records(text: str, *, old_table: bool) -> tuple[dict[tuple[str, str], float], float | None]:
    rows = iter_csv_records(text)
    if not rows:
        return {}, None

    code_col = next(key for key in rows[0] if key.startswith("C행정구역"))
    name_col = next(key for key in rows[0] if key.startswith("행정구역"))
    value_col = "인구 (명)" if old_table else "총인구 (명)"

    population_by_key: dict[tuple[str, str], float] = {}
    national_value: float | None = None
    current_sido = ""
    for row in rows:
        if old_table and normalize_region_name(row.get("연령별", "")) != "계":
            continue
        code = str(row.get(code_col) or "").strip().lstrip("'")
        name = normalize_space(row.get(name_col) or "")
        value_text = str(row.get(value_col) or "").replace(",", "")
        if not value_text:
            continue
        try:
            value = float(value_text)
        except ValueError:
            continue

        if code == "00":
            national_value = value
            continue
        if len(code) == 2 and code.isdigit():
            current_sido = name
            continue
        if len(code) != 5 or not code.isdigit() or not current_sido:
            continue

        sido_key = normalize_region_name(current_sido)
        for region_name in alternate_region_names(name):
            population_by_key[(sido_key, region_name)] = value
    return population_by_key, national_value


def read_stat_json_variables() -> dict[str, object]:
    variables: dict[str, object] = {}
    for line in DATA_PATH.read_text(encoding="utf-8").splitlines():
        match = re.match(r"window\.(KOREA_GEO_STATS_[A-Z_]+) = (.*);$", line)
        if not match:
            continue
        variables[match.group(1)] = json.loads(match.group(2))
    return variables


def write_stat_json_variables(variables: dict[str, object]) -> None:
    content = (
        "window.KOREA_GEO_STATS_META = "
        + json.dumps(variables["KOREA_GEO_STATS_META"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        + "window.KOREA_GEO_STATS_REGION_ORDER = "
        + json.dumps(variables["KOREA_GEO_STATS_REGION_ORDER"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        + "window.KOREA_GEO_STATS_REGIONS = "
        + json.dumps(variables["KOREA_GEO_STATS_REGIONS"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
        + "window.KOREA_GEO_STATS_METRICS = "
        + json.dumps(variables["KOREA_GEO_STATS_METRICS"], ensure_ascii=False, separators=(",", ":"))
        + ";\n"
    )
    DATA_PATH.write_text(content, encoding="utf-8")


def to_current_city_code(app_code_2020: str) -> str:
    prefix = CURRENT_CODE_PREFIX_BY_2020_PREFIX.get(app_code_2020[:2])
    return f"{prefix}{app_code_2020[2:]}" if prefix else app_code_2020


def derive_app_city_from_sgg(row) -> tuple[str, str] | None:
    sidocd = str(row["sidocd"])
    sggcd = str(row["sggcd"])
    sggnm = normalize_region_name(str(row["sggnm"]))
    if sidocd not in NON_METRO_PARENT_CODES or not sggcd or sggcd == "<NA>":
        return None
    if sidocd == "36":
        return "36110", "세종시"
    if "시" in sggnm and sggnm.endswith("구"):
        city_label = sggnm[: sggnm.index("시") + 1]
        return f"{sggcd[:4]}0", city_label
    return sggcd, sggnm


def build_base_city_geometries(adk, city_order: list[str]):
    sgg = adk.get(BASE_BOUNDARY_VERSION, "sgg").rename_geometry("geometry")
    rows = []
    city_order_set = set(city_order)
    for _, row in sgg.iterrows():
        derived = derive_app_city_from_sgg(row)
        if not derived:
            continue
        app_code_2020, app_label = derived
        app_code = to_current_city_code(app_code_2020)
        if app_code not in city_order_set:
            continue
        rows.append(
            {
                "appCode": app_code,
                "appLabel": app_label,
                "geometry": row.geometry,
            }
        )
    if not rows:
        raise RuntimeError("No 2020 base city geometries were produced")
    import geopandas as gpd

    base = gpd.GeoDataFrame(rows, crs=sgg.crs)
    return base.dissolve(by="appCode", as_index=False, aggfunc="first")


def load_target_sgg_geometries(adk, version: str, population_by_key: dict[tuple[str, str], float]):
    target = adk.get(version, "sgg").rename_geometry("geometry")
    target = target.copy()
    target[["populationSidoKey", "populationRegionKey"]] = target.apply(
        lambda row: derive_population_unit_key(row),
        axis=1,
        result_type="expand",
    )
    target_units = target.dissolve(
        by=["populationSidoKey", "populationRegionKey"],
        as_index=False,
        aggfunc="first",
    )
    target_units["targetArea"] = target_units.geometry.area
    target_units["population"] = target_units.apply(
        lambda row: population_by_key.get((row["populationSidoKey"], row["populationRegionKey"])),
        axis=1,
    )
    return target_units[target_units["population"].notna() & (target_units["targetArea"] > 0)].copy()


def build_city_values_for_year(base_cities, target_sgg):
    if target_sgg.empty:
        return {}
    import geopandas as gpd

    intersections = gpd.overlay(
        target_sgg[["population", "targetArea", "geometry"]],
        base_cities[["appCode", "geometry"]],
        how="intersection",
        keep_geom_type=False,
    )
    if intersections.empty:
        return {}
    intersections["weightedPopulation"] = (
        intersections["population"] * intersections.geometry.area / intersections["targetArea"]
    )
    grouped = intersections.groupby("appCode")["weightedPopulation"].sum()
    return {str(code): int(round(value)) for code, value in grouped.items() if value > 0}


def derive_population_unit_key(row) -> tuple[str, str]:
    sidonm = normalize_region_name(row.get("sidonm"))
    sidocd = safe_text(row.get("sidocd"))
    sggnm = normalize_region_name(row.get("sggnm"))
    if sidocd in NON_METRO_PARENT_CODES and "시" in sggnm and sggnm.endswith("구"):
        sggnm = sggnm[: sggnm.index("시") + 1]
    return sidonm, sggnm


def build_metric_payload(series_by_region: dict[str, list[dict[str, object]]], national_series):
    latest_by_region = {
        region_code: series[-1]
        for region_code, series in series_by_region.items()
        if series
    }
    return {
        "key": METRIC_KEY,
        "label": "총조사인구(2020 시군 경계)",
        "category": "demography",
        "categoryLabel": "인구 구조·이동",
        "formatter": "count",
        "allowRelative": True,
        "canBeNegative": False,
        "unit": "명",
        "decimals": 0,
        "description": "KOSIS 인구총조사 시군구 원표를 2020년 시·군 경계에 면적가중으로 재집계한 장기 인구 시계열입니다.",
        "sourceText": "국가데이터처,「인구총조사」; admdongkor 2020 시군 경계 면적가중 재구성",
        "sourceName": "국가데이터처·admdongkor 재구성",
        "pageUrl": "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1IN1502",
        "statTableUrl": "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1IN0001_05",
        "statTableId": f"{OLD_CENSUS_TABLE_ID}, {NEW_CENSUS_TABLE_ID}",
        "ownerCyclSe": "Y",
        "stdIdctId": "",
        "unitySrvcId": "",
        "supportsCity": True,
        "nationalSeries": national_series,
        "nationalLatest": national_series[-1] if national_series else None,
        "seriesByRegion": series_by_region,
        "latestByRegion": latest_by_region,
    }


def build_linked_population_metric():
    adk = require_geo_dependencies()
    variables = read_stat_json_variables()
    city_order = list(variables["KOREA_GEO_STATS_REGION_ORDER"]["cities"])
    series_by_region: dict[str, list[dict[str, object]]] = {code: [] for code in city_order}
    national_series: list[dict[str, object]] = []

    old_catalog = fetch_mass_catalog(OLD_CENSUS_TABLE_ID)
    new_catalog = fetch_mass_catalog(NEW_CENSUS_TABLE_ID, NEW_CENSUS_LIST_ID, "MT_ZTITLE")
    base_cities = build_base_city_geometries(adk, city_order)

    for year, version in sorted(TARGET_VERSION_BY_YEAR.items()):
        if year <= 2010:
            catalog = old_catalog
            table_id = OLD_CENSUS_TABLE_ID
            list_id = ""
            vw_cd = ""
            old_table = True
        else:
            catalog = new_catalog
            table_id = NEW_CENSUS_TABLE_ID
            list_id = NEW_CENSUS_LIST_ID
            vw_cd = "MT_ZTITLE"
            old_table = False
        if year not in catalog:
            print(f"Skipping {year}: no KOSIS mass file")
            continue

        file_no, filename = catalog[year]
        print(f"Building {year} from {filename} against {version}...")
        csv_text = download_mass_csv(table_id, file_no, filename, list_id, vw_cd)
        population_by_key, national_value = parse_population_records(csv_text, old_table=old_table)
        target_sgg = load_target_sgg_geometries(adk, version, population_by_key)
        city_values = build_city_values_for_year(base_cities, target_sgg)
        period_key = str(year)
        if national_value is not None:
            national_series.append(
                {
                    "periodKey": period_key,
                    "periodLabel": period_key,
                    "value": int(round(national_value)),
                    "displayValue": f"{int(round(national_value)):,}",
                }
            )
        for region_code in city_order:
            value = city_values.get(region_code)
            if value is None:
                continue
            series_by_region[region_code].append(
                {
                    "periodKey": period_key,
                    "periodLabel": period_key,
                    "value": value,
                    "displayValue": f"{value:,}",
                }
            )

    series_by_region = {
        region_code: series
        for region_code, series in series_by_region.items()
        if series
    }
    if not series_by_region:
        raise RuntimeError("No linked population city series were produced")

    metric = build_metric_payload(series_by_region, national_series)
    variables["KOREA_GEO_STATS_METRICS"]["cities"][METRIC_KEY] = metric
    categories = variables["KOREA_GEO_STATS_META"].setdefault("categories", {})
    categories["demography"] = "인구 구조·이동"
    variables["KOREA_GEO_STATS_META"]["generatedAt"] = datetime.now().isoformat(timespec="seconds")
    write_stat_json_variables(variables)

    coverage = [
        (region_code, series[0]["periodKey"], series[-1]["periodKey"], len(series))
        for region_code, series in series_by_region.items()
    ]
    first_year = min(int(first) for _, first, _, _ in coverage)
    last_year = max(int(last) for _, _, last, _ in coverage)
    print(
        f"Wrote {METRIC_KEY}: {len(series_by_region)} regions, "
        f"{first_year}-{last_year}, {DATA_PATH}"
    )


def main() -> None:
    try:
        build_linked_population_metric()
    except Exception as error:
        print(f"Failed to build linked population metric: {error}", file=sys.stderr)
        raise


if __name__ == "__main__":
    main()
