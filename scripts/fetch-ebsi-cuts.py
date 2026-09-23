"""Refresh the 2027 geography archive from cached EBSi public responses."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "tools/cut/data/ebsi_geo_data.json"
CACHE = ROOT / "data/ebsi-cache/raw"
BASE = "https://www.ebsi.co.kr"
SOURCE = BASE + "/ebs/xip/xipa/retrievePastGrdCutWrongAnswerRate.ebs?tab=1"
SUBJECTS = ("한국지리", "세계지리")
SUBJECT_CODES = "4210,4209,4208,4207,4201,4202,4204,4205,4206"
YEAR = 2027


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def cache_request(name: str, data: dict[str, str], offline: bool) -> tuple[str, str]:
    route = f"/ebs/xip/xipa/{name}.ajax"
    key = hashlib.sha256(json.dumps([route, data], sort_keys=True).encode()).hexdigest()[:16]
    prefix = f"{name}_{key}"
    existing = sorted(CACHE.glob(f"{prefix}*.txt"), key=lambda path: path.stat().st_mtime, reverse=True)
    if offline:
        if not existing:
            raise RuntimeError(f"캐시가 없습니다: {name} {data}")
        return existing[0].read_text(encoding="utf-8-sig"), str(existing[0].relative_to(ROOT))

    request = urllib.request.Request(
        BASE + route,
        data=urllib.parse.urlencode(data).encode(),
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": SOURCE,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
    digest = hashlib.sha256(body).hexdigest()
    destination = CACHE / f"{prefix}_{digest[:12]}.txt"
    metadata_path = destination.with_suffix(".json")
    CACHE.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        destination.write_bytes(body)
    metadata = json.loads(metadata_path.read_text()) if metadata_path.exists() else {
        "url": BASE + route,
        "request": data,
        "retrieved_at": now(),
        "sha256": digest,
    }
    metadata["last_checked_at"] = now()
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    time.sleep(0.08)
    return body.decode("utf-8-sig"), str(destination.relative_to(ROOT))


def options(name: str, data: dict[str, str], offline: bool) -> tuple[list[dict], str]:
    body, cache_path = cache_request(name, data, offline)
    result = json.loads(body).get("result")
    if not isinstance(result, list):
        raise ValueError(f"EBSi 목록 형식이 달라졌습니다: {name}")
    return result, cache_path


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def numeric(value: str) -> float | None:
    value = value.strip()
    if value in ("", "-", "없음", "해당없음"):
        return None
    if not re.fullmatch(r"\d+(?:\.\d+)?", value):
        raise ValueError(f"EBSi 숫자 형식이 달라졌습니다: {value}")
    return float(value)


def parse_grade(markup: str) -> dict[str, dict]:
    result = {}
    for section in re.split(r'<div class="col_6">', markup):
        heading = re.search(r"<h3>(.*?)</h3>", section, re.S)
        if not heading:
            continue
        subject = clean_text(heading.group(1)).replace(" ", "")
        if subject not in SUBJECTS:
            continue
        mean = re.search(r"평균:\s*([0-9.]+)", section)
        sd = re.search(r"표준편차:\s*([0-9.]+)", section)
        if not mean or not sd:
            continue
        cuts = {}
        for row in re.findall(r"<tr[^>]*>(.*?)</tr>", section, re.S):
            cells = [clean_text(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
            if len(cells) < 4 or cells[0] not in ("1", "2", "3"):
                continue
            cuts[cells[0]] = {
                "raw": numeric(cells[1]),
                "standard": numeric(cells[2]),
                "percentile": numeric(cells[3]),
            }
        if set(cuts) == {"1", "2", "3"}:
            result[subject] = {
                "national_mean": float(mean.group(1)),
                "national_sd": float(sd.group(1)),
                "cuts": cuts,
            }
    return result


def parse_wrong(markup: str) -> list[dict]:
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", markup, re.S):
        cells = [clean_text(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
        if len(cells) < 10:
            continue
        values = [numeric(cell) for cell in cells[:10]]
        if any(value is None for value in values):
            raise ValueError("EBSi 오답률 행에 빈 숫자가 있습니다.")
        rank, question, wrong_rate, points, answer = values[:5]
        if not 1 <= question <= 20 or points not in (2, 3) or not 0 <= wrong_rate <= 100:
            raise ValueError("오답률 문항 범위가 달라졌습니다.")
        if any(value != int(value) for value in (rank, question, points, answer)):
            raise ValueError("오답률 정수 칸의 형식이 달라졌습니다.")
        rows.append({
            "rank": int(rank),
            "question": int(question),
            "wrong_rate": wrong_rate,
            "correct_rate": 100 - wrong_rate,
            "points": int(points),
            "answer": int(answer),
            "choices": values[5:],
        })
    rows.sort(key=lambda row: row["rank"])
    if len(rows) != 15 or len({row["question"] for row in rows}) != 15:
        raise ValueError(f"EBSi 공개 상위 15문항이 아닙니다: {len(rows)}행")
    return rows


def observed_items(top15: list[dict]) -> list[dict]:
    observed = {row["question"]: row for row in top15}
    return [
        {
            "question": question,
            "points": observed[question]["points"] if question in observed else None,
            "national_rate": observed[question]["correct_rate"] if question in observed else None,
            "source": "ebsi_wrong_top15" if question in observed else "ebsi_not_in_top15",
        }
        for question in range(1, 21)
    ]


def censor_old_items(record: dict) -> None:
    observed = {row["question"] for row in record.get("wrong_top15", [])}
    for item in record.get("items", []):
        if item["question"] not in observed:
            item["national_rate"] = None
            item["points"] = None
            item["source"] = "ebsi_not_in_top15"


def collect(offline: bool) -> None:
    payload = json.loads(DATA_PATH.read_text())
    grade_months, _ = options("retrievePastGrdCutMonthList", {"year": str(YEAR), "stdntGrd": "3"}, offline)
    wrong_months, _ = options("retrieveWrongAnswerRateMonthList", {"year": str(YEAR - 1), "targetCd": "D300"}, offline)
    grade_by_month = {entry["value"]: entry for entry in grade_months}
    wrong_by_month = {entry["value"]: entry for entry in wrong_months}
    new_records = []
    for month in sorted(set(grade_by_month) | set(wrong_by_month)):
        grades = {}
        grade_cache = None
        if month in grade_by_month:
            markup, grade_cache = cache_request("retrievePastGrdCutList", {
                "year": str(YEAR), "stdntGrd": "3", "month": grade_by_month[month]["code"],
                "subjCd": SUBJECT_CODES,
            }, offline)
            grades = parse_grade(markup)
        papers = {}
        if month in wrong_by_month:
            paper_list, _ = options("retrieveWrongAnswerRateSubjList", {
                "year": str(YEAR - 1), "targetCd": "D300",
                "irecord": wrong_by_month[month]["code"], "arOrd": "5",
            }, offline)
            papers = {entry["value"].replace(" ", ""): entry["code"] for entry in paper_list}

        for subject in SUBJECTS:
            grade = grades.get(subject)
            top15 = []
            wrong_cache = None
            if subject in papers:
                markup, wrong_cache = cache_request("retrieveWrongAnswerRateList", {"paperId": papers[subject]}, offline)
                top15 = parse_wrong(markup)
            if not grade and not top15:
                continue
            record = {
                "source": "EBSi",
                "school_year": YEAR,
                "exam_year": YEAR - 1,
                "month": month,
                "subject": subject,
                "national_mean": grade["national_mean"] if grade else None,
                "national_sd": grade["national_sd"] if grade else None,
            }
            for level in ("1", "2", "3"):
                cut = grade["cuts"][level] if grade else {}
                record[f"raw{level}"] = cut.get("raw")
                record[f"std{level}"] = cut.get("standard")
                record[f"pct{level}"] = cut.get("percentile")
            record["items"] = observed_items(top15) if top15 else []
            record["wrong_top15"] = top15
            record["source_cache"] = {"grade": grade_cache, "items": wrong_cache}
            if month in wrong_by_month:
                match = re.match(r"(\d{4})(\d{2})(\d{2})", wrong_by_month[month]["code"])
                if match:
                    record["administered_on"] = "-".join(match.groups())
            new_records.append(record)
        print(f"{YEAR} {month}: grade {len(grades)} / papers {sum(subject in papers for subject in SUBJECTS)}")

    if not new_records:
        raise RuntimeError("새 EBSi 기록이 없어 원본 데이터를 보존했습니다.")
    prior = [record for record in payload["records"] if int(record["school_year"]) != YEAR]
    for record in prior:
        censor_old_items(record)
    payload["records"] = sorted(prior + new_records, key=lambda record: (
        -int(record["school_year"]), -int(record["month"]), SUBJECTS.index(record["subject"])
    ))
    if not offline:
        payload["fetched_at"] = now()
    payload.pop("easy_missing_rate_method", None)
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"saved {len(payload['records'])} records; cache {CACHE.relative_to(ROOT)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="Use cached EBSi responses only")
    collect(parser.parse_args().offline)
