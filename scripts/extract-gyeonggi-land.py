import json
import sys
from pathlib import Path

import openpyxl

source = Path.home() / 'Documents/New project 8/data_downloads/kosis/korea_land_farm_2024/raw/molit_cadastral_yearbook_2024_12/41_gyeonggi_2024_12_1.xlsx'
book = openpyxl.load_workbook(source, read_only=True, data_only=True)
sheet = book['6.시군구별 지목별 면적 현황']
selected = ['수원시','성남시','고양시','용인시','화성시','평택시','시흥시','안산시','남양주시','파주시']
records = {}
for line in sheet.iter_rows(min_row=5, values_only=True):
    name = line[0].replace('(계)','') if isinstance(line[0], str) else None
    if name in selected:
        records[name] = dict(zip(['total_km2','dry_field_km2','paddy_km2','forest_km2','building_km2','road_km2','river_km2','other_km2'], [float(value) for value in line[1:9]]))
assert len(records) == len(selected)
for record in records.values():
    assert abs(sum(value for key, value in record.items() if key != 'total_km2') - record['total_km2']) < 0.001
Path(sys.argv[1]).write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
