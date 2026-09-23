import json
import sys
from pathlib import Path

import fitz

source = Path.home() / 'Documents/New project 8/data_downloads/kostat/2024_farm_households/2024_agriculture_forestry_fishery_survey_20250417.pdf'
document = fitz.open(source)
def lines(page):
    return [line.strip() for line in document[page - 1].get_text().splitlines() if line.strip()]
def integer(value):
    return None if value == '-' else int(value.replace(',', ''))

scale = lines(46)
start = scale.index('2024') + 9
rows = []
for index in range(17):
    block = scale[start + index * 9:start + (index + 1) * 9]
    assert len(block) == 9 and any(char.isalpha() for char in block[0])
    rows.append({'region': block[0], 'total': integer(block[1]), 'no_land': integer(block[2]), 'under_half_ha': integer(block[3])})
assert len(rows) == 17 and abs(sum(row['under_half_ha'] for row in rows) - 514739) <= 5

type_lines = lines(18)
start = type_lines.index('전 국')
types = []
for index in range(11):
    block = type_lines[start + index * 11:start + (index + 1) * 11]
    assert len(block) == 11
    types.append({'region': block[0].replace(' ', '').replace('*',''), 'total_thousands': integer(block[1]), 'fulltime_percent': float(block[7].strip('()')), 'parttime_percent': float(block[8].strip('()'))})
assert types[0]['fulltime_percent'] == 55.7

Path(sys.argv[1]).write_text(json.dumps({'under_half_ha': rows, 'occupation_types': types}, ensure_ascii=False, indent=2) + '\n')
