import json
import re
import sys
from pathlib import Path

source = Path.home() / 'Documents/New project 8/data_downloads/wits/export_summarytext_2023'
records = {}
for iso, korean in [('TUR','튀르키예'),('KAZ','카자흐스탄'),('ARE','아랍에미리트'),('TUN','튀니지')]:
    text = (source / f'{iso}_2023_summarytext.txt').read_text()
    total = re.search(r'The total value of exports \(FoB\) was ([\d,]+) million', text)
    start = text.index('SummaryTreechartData=')
    block = text[start:text.index('];',start)]
    pairs = re.findall(r"label:'([^']+)',value:'([^']+)',parent:' All Products',data:\{description:'Trade Value\(\$\):[^<]+</br>Share\(%\):([^']+)'",block)
    assert total and len(pairs)==16 and abs(sum(float(share) for _,_,share in pairs)-100)<0.05
    records[korean]={'iso3':iso,'exports_million_usd':int(total.group(1).replace(',','')),'groups':{label:float(share) for label,_,share in pairs}}
Path(sys.argv[1]).write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
