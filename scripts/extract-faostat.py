import csv
import io
import json
import sys
import zipfile
from pathlib import Path

source = Path.home() / 'Documents/New project 8/data_downloads/faostat/raw'
output = Path(sys.argv[1])
items = {'15': 'Wheat', '27': 'Rice', '30': 'Rice; paddy (rice milled equivalent)', '56': 'Maize (corn)', '866': 'Cattle', '976': 'Sheep', '1034': 'Swine / pigs'}
for file, key, elements in [
    ('Production_Crops_Livestock_E_All_Data_Normalized_20251231.zip', 'production', {'Production', 'Area harvested', 'Stocks'}),
    ('Trade_CropsLivestock_E_All_Data_Normalized_20260724.zip', 'trade', {'Export quantity', 'Import quantity'}),
]:
    archive = zipfile.ZipFile(source / file)
    member = next(name for name in archive.namelist() if 'Normalized).csv' in name)
    records = []
    with io.TextIOWrapper(archive.open(member), encoding='utf-8-sig') as handle:
        for row in csv.DictReader(handle):
            if row['Year'] != '2024' or row['Item Code'] not in items or row['Element'] not in elements or row['Unit'] not in {'t', 'ha', 'An'} or not row['Value']:
                continue
            records.append({'area_code': row['Area Code'], 'area': row['Area'], 'item': row['Item'], 'element': row['Element'], 'unit': row['Unit'], 'value': float(row['Value']), 'flag': row['Flag']})
    (output / f'faostat_{key}_2024.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(key, len(records), file)
