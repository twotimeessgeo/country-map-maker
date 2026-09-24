# Statistics 미수록 표

값이나 정의를 확인하지 못한 표입니다. `data_downloads/`는 `~/Documents/New project 8/data_downloads/`를 가리킵니다. 각 행에 직접 확인한 파일과 누락된 열·범위를 기록했습니다.

| ID | 주제 | 표 | 필요한 원천 또는 사유 | 확인한 경로 |
| --- | --- | --- | --- | --- |
| korea-urban-x-01 | 한국 urban | 주요 시군 거주지 내 취업과 타지역 통근 비율 | 시군 취업자 지표에는 광역시가 없고 2020년 원표는 통근·통학 인구를 합쳐 취업자만의 통근 비율을 계산할 수 없음 | data/korea-stats.js; data_downloads/kosis/raw/DT_1PA2021/101_DT_1PA2021_F_2020.csv |
| korea-energy-5-01 | 한국 energy | 주요 광물 지역별 생산량 | 에너지 생산 시트의 석탄은 toe이며 광물별 물리 생산량이 아님; 광업·제조업조사는 출하액(백만원)만 수록 | data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx Ⅰ-2; data_downloads/kosis/raw/DT_1FS1101/101_DT_1FS1101_Y_2024.csv |
| korea-food-5-15 | 한국 food | 주요 작물 도별 생산량 | 작물 셀 원천에는 2025년 시도별 재배면적(ha)만 있고 수확 생산량(t) 열이 없음; 농식품 PDF의 생산량은 전국 합계 | data_downloads/kosis/browser_extract/crop_area_2025_20260920/source_cells.json; data_downloads/mafra/2025_agriculture_food_main_statistics.pdf |
| korea-food-5-16 | 한국 food | 시군별 주요 작물 재배 면적 비율 | 작물 셀 원천의 행은 전국·17개 시도만 포함; 시군별 여러 작물 면적은 없음 | data_downloads/kosis/browser_extract/crop_area_2025_20260920/source_cells.json; data/korea-stats.js cities.paddy-field-area |
| korea-industry-5-23 | 한국 industry | 시도별 소매 업태 상위 지역 | 사업체 원표는 산업분류별 사업체수·종사자수이며 백화점·편의점 등 소매 업태별 판매액 열이 없음 | data_downloads/kosis/raw/DT_1K52F01/101_DT_1K52F01_Y_2024.csv |
| korea-transport-5-26 | 한국 transport | 교통수단별 여객 수송 분담률 | 지역 연보의 영업자동차 수송은 단양군 범위; 전국 교통수단별 여객 수송량 분모와 같은 연도 원표가 없음 | data_downloads/danyang/yearbook/extracted/11. 교통_관광.xlsx; data/korea-stats.js |
| korea-transport-5-27 | 한국 transport | 교통수단별 화물 수송 분담률 | 지역 연보의 운수 자료는 단양군 범위; 전국 철도·도로·해운·항공 화물량을 같은 단위로 집계한 원표가 없음 | data_downloads/danyang/yearbook/extracted/11. 교통_관광.xlsx; data/korea-stats.js |
| korea-region-7-03 | 한국 region | 남북한 1차 에너지원별 공급량 | 남북한 통계 PDF의 확인한 농업표 574~577쪽에는 1차 에너지원별 북한 공급량이 없음; KEEI 시트는 남한만 포함 | data_downloads/mafra/2025_agriculture_food_main_statistics.pdf; data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx Ⅰ-3 |
| korea-region-7-04 | 한국 region | 남북한 발전량과 발전 설비 용량 | KEEI Ⅴ-1은 남한 지역별 발전량만 수록하고 북한 발전량·설비용량은 없음 | data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx Ⅴ-1; data_downloads/kpx/korea_generation_by_energy_source_2014_2024.csv |
| world-energy-3-36 | 세계 energy | 대륙별 1차 에너지 소비 비중 | EI 2024 공급 시트는 북아메리카·CIS·중동·아시아태평양 같은 자체 권역만 제공해 여섯 대륙의 세계 총량 비중으로 직접 변환할 수 없음 | data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx TES by fuel |
| world-energy-3-41 | 세계 energy | 주요국 신재생 에너지 공급 구조 | EI 공급 시트는 재생 전체와 수력만 분리하며 태양광·풍력·바이오 공급량은 없음; KNREC 원표는 한국 지역만 수록 | data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx TES by fuel; data_downloads/knrec/2024_신재생에너지보급통계_통계표1_연도별지역별현황.xlsx |
| world-region-4-03 | 세계 region | 주요국 상품별 수출액 비율 | 저장된 WITS 2023 상품군 원본은 튀르키예·카자흐스탄·UAE·튀니지뿐이며 몬순 주요국의 같은 분류 수출 구성이 없음 | data_downloads/wits/export_summarytext_2023/TUR_2023_summarytext.txt; data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv |
| world-region-4-05 | 세계 region | 주요국 기타 자원 생산량 | 확인한 EI 시트는 석유·가스·석탄, FAOSTAT 추출은 식량작물·가축으로 한정되어 해당 지역의 기타 광물·자원 항목을 같은 정의로 채울 수 없음 | data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx; data_downloads/faostat/raw/Production_Crops_Livestock_E_All_Data_Normalized_20251231.zip |
| world-region-7-01 | 세계 region | 중·남부 아메리카 국가별 인종 비율 | 로컬 4개국 값의 조사 연도가 2003·2010·2011로 다르고 인종·민족 범주도 일치하지 않아 비교용 최신 통일 표를 만들 수 없음 | data_downloads/cia_world_factbook/ethnic_composition_jm_co_br_uy.json |
| world-region-7-02 | 세계 region | 중·남부 아메리카 품목별 수출액 비율과 총수출액 | WITS 총수출액·상품군 원본은 건조 지역 4개국만 있으며 중·남부 아메리카 국가 행이 없음 | data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv; data_downloads/wits/export_summarytext_2023/TUR_2023_summarytext.txt |
| world-region-7-04 | 세계 region | 중·남부 아메리카 주요국 상품 수출액 비율 | WTO 추출값은 아프리카 4개국, WITS 원본은 건조 지역 4개국이므로 중·남부 아메리카 상품군 행이 없음 | data_downloads/wto/trade_profiles_2023/africa_export_commodity_groups_2021.csv; data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv |

## 부분 수록 범위

- 작물 단위 면적 생산량: 쌀 수출 비율은 FAOSTAT의 도정미 환산 교역량과 벼 생산량 정의가 달라 빈값으로 둠.
- 화석연료 생산과 소비: 생산−소비는 수급 차이이며 실제 순수출입은 아님.
- 경지율: 2025년 경지면적을 2024년 12월 말 지적 면적으로 나눈 참고값임.
- 전·겸업 농가: 공식 PDF는 특·광역시를 하나로 묶어 17개 시도 개별 비율을 제공하지 않음.
- 건조 지역 수출 구성: 저장된 WITS 원본 중 비교 대상인 튀르키예·카자흐스탄만 수록함.
- 아프리카 수출 구성: WTO 2023 프로필의 상품군 기준 연도는 2021년이고 수록 국가는 4개임.
