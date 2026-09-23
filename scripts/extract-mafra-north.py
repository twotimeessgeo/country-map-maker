import json
import re
import sys
from pathlib import Path

import fitz

source = Path.home() / 'Documents/New project 8/data_downloads/mafra/2025_agriculture_food_main_statistics.pdf'
document = fitz.open(source)
texts = {page: document[page - 1].get_text() for page in (574, 575, 576, 577)}
assert re.search(r'23\s+764\s+50\.5\s+748\s+49\.5\s+525\s+27\.2\s+1,408', texts[574])
assert re.search(r'23\s+1,512\s+893\s+1,933\s+1,893', texts[575])
assert re.search(r'24\s+4,190\s+-2\.5\s+4,780', texts[576])
assert re.search(r'24\s+3,585\s+85\.6\s+94\s+2\.2\s+2,149\s+45\.0\s+1,610', texts[577])
data = {
    'land_2023': {
        '남한': {'cultivated_thousand_ha': 1512, 'paddy_thousand_ha': 764, 'dry_field_thousand_ha': 748, 'food_crop_thousand_ha': 893},
        '북한': {'cultivated_thousand_ha': 1933, 'paddy_thousand_ha': 525, 'dry_field_thousand_ha': 1408, 'food_crop_thousand_ha': 1893},
    },
    'crop_production_2024': {
        '남한': {'total_thousand_t': 4190, 'rice_thousand_t': 3585, 'maize_thousand_t': 94},
        '북한': {'total_thousand_t': 4780, 'rice_thousand_t': 2149, 'maize_thousand_t': 1610},
    },
}
Path(sys.argv[1]).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
