"""Crop the 2027 June and September KICE geography question sheets."""

import json
import re
from pathlib import Path

import fitz
from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data-sources" / "kice"
OUTPUT = ROOT / "tools" / "cut" / "question-images"
MANIFEST = ROOT / "tools" / "cut" / "data" / "question-image-manifest.json"
CONTACT = ROOT / "tmp" / "kice-2027-contact.png"
GROUPS = [(subject, month) for month in ("06", "09") for subject in ("korea", "world")]
SUBJECT_NAMES = {"korea": "한국지리", "world": "세계지리"}
QUESTION_RE = re.compile(r"(?:[1-9]|1[0-9]|20)\.")


def crop_group(subject, month):
    path = SOURCE / f"{subject}-2026-{month}.pdf"
    document = fitz.open(path)
    assert len(document) == 4, f"Unexpected page count: {path}"
    output = {}
    for page in document:
        words = page.get_text("words")
        for column in (0, 1):
            starts = sorted(
                [(int(word[4][:-1]), word[1]) for word in words
                 if QUESTION_RE.fullmatch(word[4]) and (word[0] >= 420) == bool(column)],
                key=lambda item: item[1],
            )
            x0, x1 = (84, 414) if column == 0 else (433, 763)
            for index, (number, y) in enumerate(starts):
                next_y = starts[index + 1][1] if index + 1 < len(starts) else 1080
                clip = fitz.Rect(x0, y - 5, x1, next_y - 8)
                zoom = 620 / clip.width
                pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip, alpha=False)
                image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                if image.width != 620:
                    image = image.resize((620, round(image.height * 620 / image.width)), Image.Resampling.LANCZOS)
                gray = image.convert("L")
                for row in range(image.height - 1, 0, -1):
                    dark = sum(value < 200 for value in gray.crop((0, row, image.width, row + 1)).getdata())
                    if dark >= 2:
                        image = image.crop((0, 0, image.width, min(image.height, row + 17)))
                        break
                name = f"{subject}-2026-{month}-{number:02d}.webp"
                image.save(OUTPUT / name, "WEBP", quality=88, method=6)
                assert number not in output, f"Duplicate question {number}: {path}"
                output[number] = OUTPUT / name
    assert sorted(output) == list(range(1, 21)), f"Missing question in {path}: {sorted(output)}"
    return output


def write_contact(groups):
    cell_w, cell_h = 310, 420
    sheet = Image.new("RGB", (cell_w * 8, cell_h * 10), "white")
    draw = ImageDraw.Draw(sheet)
    for group_index, (subject, month, files) in enumerate(groups):
        for number in range(1, 21):
            index = group_index * 20 + number - 1
            x, y = (index % 8) * cell_w, (index // 8) * cell_h
            image = Image.open(files[number]).convert("RGB")
            thumb = ImageOps.contain(image, (294, 382), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x + (cell_w - thumb.width) // 2, y + 8))
            draw.rectangle((x, y, x + cell_w - 1, y + cell_h - 1), outline="#bbbbbb")
            draw.text((x + 10, y + 397), f"{subject} {month} {number:02d}", fill="black")
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(CONTACT)


def update_manifest(groups):
    manifest = json.loads(MANIFEST.read_text())
    additions = []
    for subject, month, files in groups:
        for number in sorted(files):
            name = files[number].name
            additions.append({
                "id": name.removesuffix(".webp"),
                "subject": SUBJECT_NAMES[subject],
                "exam_year": 2026,
                "school_year": 2027,
                "month": month,
                "question": number,
                "url": f"./question-images/{name}",
                "variant": "문항",
                "source_label": "27학년도 사진",
            })
    manifest["items"] = [item for item in manifest["items"] if item["exam_year"] != 2026] + additions
    manifest["count"] = manifest["source_count"] = len(manifest["items"])
    manifest["generated_at"] = "2026-09-24"
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    groups = [(subject, month, crop_group(subject, month)) for subject, month in GROUPS]
    write_contact(groups)
    update_manifest(groups)
    print(f"{sum(len(files) for _, _, files in groups)} images; contact sheet: {CONTACT}")
