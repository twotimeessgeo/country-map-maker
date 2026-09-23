import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

source = Path.home() / 'Documents/New project 8/data_downloads/aies2023/AIES31BASIC02.dat'
states = defaultdict(lambda: {'name': '', 'total_thousand_usd': None, 'industries': []})
with source.open(encoding='utf-8-sig') as handle:
    reader = csv.DictReader(handle, delimiter='|')
    reader.fieldnames[0] = reader.fieldnames[0].lstrip('#')
    for row in reader:
        if row['GEOTYPE'] != '02' or row['ST'] == '11' or row['YEAR'] != '2023':
            continue
        record = states[row['ST']]
        record['name'] = row['GEO_LABEL']
        if row['INDLEVEL'] == '2' and row['NAICS'] == '31-33' and row['RCPT_TOT_VAL'].isdigit() and not row['RCPT_TOT_VAL_F']:
            record['total_thousand_usd'] = int(row['RCPT_TOT_VAL'])
        if row['INDLEVEL'] == '3' and row['RCPT_TOT_VAL'].isdigit() and not row['RCPT_TOT_VAL_F']:
            record['industries'].append({'naics': row['NAICS'], 'name': row['NAICS_LABEL'], 'shipments_thousand_usd': int(row['RCPT_TOT_VAL'])})
assert len(states) == 50 and all(value['total_thousand_usd'] and len(value['industries']) >= 3 for value in states.values())
for record in states.values():
    record['industries'] = sorted(record['industries'], key=lambda item: -item['shipments_thousand_usd'])[:3]
Path(sys.argv[1]).write_text(json.dumps(dict(states), ensure_ascii=False, indent=2) + '\n')
