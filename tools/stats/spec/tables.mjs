// Internal source-coverage inventory for Statistics.
// A missing recipe is kept in GAPS.md; it never becomes an empty public table.
const t = (id, title, kind = null, need = "") => ({ id, title, kind, need });
const extra = (id, title, kind = null, need = "") => ({ ...t(id, title, kind, need), extra: true });
const chapter = (no, title, targets) => ({ no, title, targets });
const unit = (id, title, chapters = [], climate = false) => ({ id, title, chapters, climate });

export const subjects = {
  korea: {
    units: [
      unit("III", "기후 환경과 인간 생활", [], true),
      unit("IV", "거주 공간의 변화와 지역 개발", [
        chapter("08", "촌락의 변화와 도시 발달", [
          t("k-4-01", "도별 인구 상위 도시", "city-rank-province"),
          t("k-4-02", "권역별 인구 상위 도시", "city-rank-region"),
          t("k-4-03", "수도권과 강원 주요 도시 인구 변화 지수", "city-change-index:capital", "KOSIS DT_1YL20651E 도시별 장기 시계열과 비교 대상 도시"),
          t("k-4-04", "영남 주요 도시 인구 변화 지수", "city-change-index:yeongnam", "KOSIS 도시별 장기 시계열과 비교 대상 도시"),
          t("k-4-05", "충청 주요 도시 인구 변화 지수", "city-change-index:chungcheong", "KOSIS 도시별 장기 시계열과 비교 대상 도시"),
          t("k-4-06", "호남과 제주 주요 도시 인구 변화 지수", "city-change-index:honam", "KOSIS 도시별 장기 시계열과 비교 대상 도시"),
        ]),
        chapter("09", "도시 구조와 대도시권", [
          t("k-4-07", "서울 구별 상주인구와 주간인구", "district-seoul"),
          t("k-4-08", "부산 구별 상주인구와 주간인구", "district-busan"),
          extra("k-x-01", "주요 시군 거주지 내 취업과 타지역 통근 비율", null, "KOSIS INH_1ES3A11S 같은 반기 광역시·주변 시군 취업자 통근 원표"),
        ]),
      ]),
      unit("V", "생산과 소비의 공간", [
        chapter("11", "자원의 의미와 자원 문제", [
          t("k-5-01", "주요 광물 지역별 생산량", null, "KOSIS 광업 통계 원표"),
          t("k-5-02", "시도별 1차 에너지 공급 비중", "keei-supply", "에너지경제연구원 2025 지역에너지통계연보의 공급 표"),
          t("k-5-03", "시도별 1차 에너지 생산 비율", "keei-production", "에너지경제연구원 2025 지역에너지통계연보의 생산 표"),
          t("k-5-04", "에너지원별 발전량 비율", "ei-korea-generation", "EPSIS 전원별 전체 발전량(석탄·석유·천연가스·원자력·수력·신재생) 같은 연도 원표"),
          t("k-5-05", "도별 신재생 에너지 생산 비율", "knrec-province", "한국에너지공단 2024 신재생에너지 보급통계 지역별 생산량"),
          t("k-5-06", "권역별 신재생 에너지 생산량", "knrec-region", "한국에너지공단 2024 신재생에너지 보급통계 지역별 생산량"),
          extra("k-x-02", "시도별 최종에너지 소비량과 전력 판매량", "extra-energy"),
        ]),
        chapter("12", "농업의 변화와 공업 발달", [
          t("k-5-07", "도별 농가 수", "province-single:farm-households"),
          t("k-5-08", "도별 전업농가와 겸업농가 비율", "farm-types", "국가데이터처 농림어업총조사 경영형태 원표"),
          t("k-5-09", "도별 경지 면적과 경지율", "kosis-land-area", "KOSIS korea_land_farm_2024 전체 경지 면적 및 면적 분모"),
          t("k-5-10", "도별 논과 밭 비율", "kosis-paddy-field", "KOSIS korea_land_farm_2024 논·밭 원표"),
          t("k-5-11", "도별 작물 재배 면적과 시설 작물 면적", "kosis-crop-area", "KOSIS 농업면적조사 재배 면적과 시설 재배 원표"),
          t("k-5-12", "0.5ha 미만 농가", "farm-small", "농림어업총조사 경영 규모 원표"),
          t("k-5-13", "주요 작물 도별 재배 면적 비율", "kosis-crop-share-national", "KOSIS 작물별 시도 재배 면적 원표"),
          t("k-5-14", "주요 작물 지역 내 재배 면적 비율", "kosis-crop-share-region", "KOSIS 작물별 시도 재배 면적 원표"),
          t("k-5-15", "주요 작물 도별 생산량", null, "KOSIS 농작물 생산조사 시도 원표"),
          t("k-5-16", "시군별 주요 작물 재배 면적 비율", null, "KOSIS 시군별 작물 재배 면적 원표"),
          t("k-5-17", "시도별 제조업 사업체와 종사자", "kosis-manufacturing"),
          t("k-5-18", "시도별 제조업 출하액", "kosis-manufacturing-shipments", "KOSIS DT_1FS1101 2024 출하액 원표"),
          t("k-5-19", "권역별 제조업 사업체와 종사자 및 출하액", "kosis-manufacturing-region", "KOSIS DT_1FS1101 권역 합산 가능 원표"),
          t("k-5-20", "주요 제조업 전국 사업체와 종사자 및 출하액", "kosis-manufacturing-sector", "KOSIS DT_1FS1101 업종별 전국 원표"),
          t("k-5-21", "시도별 제조업별 출하액과 종사자", "kosis-manufacturing-province-sectors", "KOSIS DT_1FS1101 시도·업종 교차 원표"),
          t("k-5-22", "권역별 제조업별 출하액 비율", "kosis-manufacturing-region-sectors", "KOSIS DT_1FS1101 시도·업종 교차 원표"),
        ]),
        chapter("13", "교통과 서비스업의 변화", [
          t("k-5-23", "시도별 소매 업태 상위 지역", null, "KOSIS 서비스업조사 소매 업태별 시도 원표"),
          t("k-5-24", "시도별 취업자 수와 산업 구조", "kosis-employment", "KOSIS 지역별 고용조사 산업별 취업자 원표"),
          t("k-5-25", "시도별 지역 내 총생산", "province-grdp"),
          t("k-5-26", "교통수단별 여객 수송 분담률", null, "국토교통부 국가교통조사 여객 수송 분담률 원표"),
          t("k-5-27", "교통수단별 화물 수송 분담률", null, "국토교통부 국가교통조사 화물 수송 분담률 원표"),
        ]),
      ]),
      unit("VI", "인구 변화와 다문화 공간", [
        chapter("14", "인구 분포와 인구 구조의 변화", [
          t("k-6-01", "시도별 총인구", "province-single:resident-population"),
          t("k-6-02", "시도별 인구 밀도", "kosis-population-density", "KOSIS 시도 면적과 같은 시점의 인구 원표"),
          t("k-6-03", "시도별 인구 구조", "kosis-age"),
          t("k-6-04", "권역별 인구 구조", "kosis-age-region", "동일 시점 시도별 연령층 인구 원수"),
          t("k-6-05", "시도별 성비와 청장년층 성비", "kosis-sex", "KOSIS DT_1B04005N 2024 성별·연령별 주민등록인구"),
          t("k-6-06", "시도별 기간별 인구 순이동", "province-migration"),
          t("k-6-07", "주요 시군 인구 증가율", "city-growth"),
          extra("k-x-03", "시도별 합계출산율과 자연적 증가", "extra-fertility"),
        ]),
        chapter("15", "인구 문제와 다문화 공간의 확대", [
          t("k-6-08", "시도별 외국인 현황", "province-foreign"),
          t("k-6-09", "주요 시군 외국인 비중", "city-foreign"),
          extra("k-x-04", "시도별 외국인주민 유형별 구성", "extra-foreign-types"),
        ]),
      ]),
      unit("VII", "우리나라의 지역 이해", [
        chapter("16", "지역의 의미와 북한 지역", [
          t("k-7-01", "남북한 경지와 논·밭 면적", "mafra-north-land", "KOSIS 북한통계 토지 이용 원표"),
          t("k-7-02", "남북한 식량 작물별 생산량", "mafra-north-crops", "KOSIS 북한통계 식량 작물 원표"),
          t("k-7-03", "남북한 1차 에너지원별 공급량", null, "KOSIS 북한통계 에너지 공급 원표"),
          t("k-7-04", "남북한 발전량과 발전 설비 용량", null, "KOSIS 북한통계 발전량·설비 원표"),
        ]),
        chapter("17", "수도권과 강원 지방", [
          t("k-7-05", "수도권 주요 지표의 전국 비중", "capital-share"),
          t("k-7-06", "수도권 주요 지역 토지 이용 비중", "gyeonggi-land-use", "KOSIS 수도권 시군구 토지 이용 원표"),
          t("k-7-07", "수도권 주요 지역 경지 현황", "gyeonggi-farmland", "KOSIS 수도권 시군구 경지 원표"),
        ]),
      ]),
    ],
  },
  world: {
    units: [
      unit("II", "세계의 자연환경과 인간 생활", [], true),
      unit("III", "세계의 인문 환경과 인문 경관", [
        chapter("06", "주요 종교", [
          t("w-3-01", "대륙별 종교 신자 비중", "religion-continent", "Pew Research Center 2020 대륙별 종교 원표"),
          t("w-3-02", "종교별 대륙 신자 비중", "religion-distribution", "Pew Research Center 2020 종교·대륙 교차 원표"),
          t("w-3-03", "보편 종교별 신자 수 상위 국가", "religion-rank", "Pew Research Center 2020 세계 전체 국가 원표"),
          t("w-3-04", "남부와 동남아시아 주요국 종교", "religion-asia"),
          t("w-3-05", "아프리카 주요국 종교", "religion-africa"),
        ]),
        chapter("07", "인구 변천과 인구 이주", [
          t("w-3-06", "대륙별 인구 변화", "wpp-history:population_thousands"),
          t("w-3-07", "대륙별 출생률과 사망률", "wpp-rates"),
          t("w-3-08", "대륙별 인구 구조", "wpp-continent-age", "UN WPP 대륙별 연령 인구 원표"),
          t("w-3-09", "대륙별 인구 증가율", "wpp-growth"),
          t("w-3-10", "대륙별 순이동률 변화", "wpp-history:net_migration_rate_per_1000"),
          t("w-3-11", "대륙별 순이동 변화", "wpp-history:net_migration_thousands"),
          t("w-3-12", "이주자 도착 지역 비율", "un-migrant-destinations", "UN DESA International Migrant Stock 지역별 원표"),
          t("w-3-13", "주요국 총인구", "world-population"),
          t("w-3-14", "주요국 출생률과 사망률", "world-rates"),
          t("w-3-15", "국가별 순이동률 변화", "wpp-country-migration-rate", "World Bank 연도별 순이동률 원표"),
          t("w-3-16", "주요국 순이동", "world-migration"),
          t("w-3-17", "국가별 유입 이주자 출신국", "un-migrant-origins", "UN DESA 국제이주 양자 행렬 원표"),
        ]),
        chapter("08", "도시화와 세계 도시 체계", [
          t("w-3-18", "대륙별 도시화율 변화", "wup-history:urban_share"),
          t("w-3-19", "대륙별 도시와 촌락 인구", "wup-population"),
          t("w-3-20", "대륙별 도시 인구 증가율", "wup-history:urban_growth"),
          t("w-3-21", "대륙별 촌락 인구 증가율", "wup-history:rural_growth"),
          t("w-3-22", "대륙별 주요국 도시화율", "urban-continent"),
          extra("w-x-01", "대륙과 주요국 도시화율", "extra-urban"),
        ]),
        chapter("09", "식량 자원과 국제 이동", [
          t("w-3-23", "3대 식량 작물 생산량과 재배 면적", "fa-world-crops"),
          t("w-3-24", "3대 식량 작물 단위 면적 생산량과 수출 비중", "fa-world-yield-trade", "FAOSTAT 생산·수확면적·수출 동일 연도 원표"),
          t("w-3-25", "3대 식량 작물 용도별 소비 구조", "crop-use"),
          t("w-3-26", "3대 식량 작물 대륙별 생산 비율", "fa-continent-crops", "FAOSTAT 대륙별 생산량 원표"),
          t("w-3-27", "3대 식량 작물 대륙별 수출입", "fa-continent-trade", "FAOSTAT 대륙별 교역 원표"),
          t("w-3-28", "3대 식량 작물 수출입 상위 국가", "fa-trade-rank", "FAOSTAT 2024 교역 전체 국가 원표"),
          t("w-3-29", "작물별 생산 상위 국가", "crop-top3"),
          t("w-3-30", "주요국 식량 작물 생산", "crop-countries"),
          t("w-3-31", "주요 가축 사육 두수와 육류 생산량", "livestock-countries"),
          t("w-3-32", "가축별 사육 두수 상위 국가", "livestock-top3"),
          t("w-3-33", "대륙별 소·돼지·양 사육 두수", "fa-continent-livestock", "FAOSTAT 대륙별 가축 원표"),
        ]),
        chapter("10", "에너지 자원과 국제 이동", [
          t("w-3-34", "세계 1차 에너지 소비 구조", "ei-world-mix", "Energy Institute 세계 1차 에너지 소비 원표"),
          t("w-3-35", "1차 에너지 소비 상위 국가", "ei-world-rank", "Energy Institute 전체 국가 소비 원표"),
          t("w-3-36", "대륙별 1차 에너지 소비 비중", null, "Energy Institute 대륙별 소비 원표"),
          t("w-3-37", "화석 에너지 생산과 소비 및 순수출입", "ei-fossil-balance", "Energy Institute 석탄·석유·가스 생산·소비·교역 동일 연도 원표"),
          t("w-3-38", "주요국 원자력 소비와 발전 비율", "nuclear-countries"),
          t("w-3-39", "주요국 1차 에너지 소비 구조", "energy-countries"),
          t("w-3-40", "신재생 에너지원별 발전 비율 상위 국가", "ei-renewable-rank", "Energy Institute 국가별 재생 발전 전체 원표"),
          t("w-3-41", "주요국 신재생 에너지 공급 구조", null, "IRENA 국가별 재생에너지 공급 원표"),
          t("w-3-42", "주요국 발전 구조", "electricity-countries"),
          extra("w-x-02", "대륙과 주요국 발전 구조", "extra-electricity"),
        ]),
      ]),
      unit("IV", "몬순 아시아와 오세아니아", [
        chapter("11", "몬순 아시아와 오세아니아", [
          t("w-4-01", "주요국 GDP와 1인당 GDP", "region-gdp:monsoon"),
          t("w-4-02", "주요국 산업 구조", "region-industry:monsoon"),
          t("w-4-03", "주요국 상품별 수출액 비율", null, "WITS 국가별 상품군 수출 비율 원표"),
          t("w-4-04", "주요국 작물별 생산량", "region-crops:monsoon"),
          t("w-4-05", "주요국 기타 자원 생산량", null, "FAOSTAT·Energy Institute 자원별 생산 원표"),
        ]),
      ]),
      unit("V", "건조 아시아와 북부 아프리카", [
        chapter("12", "건조 아시아와 북부 아프리카", [
          t("w-5-01", "주요국 GDP와 1인당 GDP", "region-gdp:dry"),
          t("w-5-02", "품목별 수출액 비율과 총수출액", "wits-export-groups", "WITS 품목별 수출액과 총수출액 동일 연도 원표"),
          t("w-5-03", "주요국 산업 구조", "region-industry:dry"),
          t("w-5-04", "주요국 화석 에너지 생산량", "ei-fossil-production", "Energy Institute 국가별 화석 에너지 생산 원표"),
          t("w-5-05", "주요국 작물별 생산량", "region-crops:dry"),
        ]),
      ]),
      unit("VI", "유럽과 북부 아메리카", [
        chapter("13", "유럽과 북부 아메리카", [
          t("w-6-01", "미국 주별 제조업 출하액 상위 업종", "aies-state-manufacturing", "U.S. Census AIES 2023 주별 NAICS 출하액 원표"),
          extra("w-x-03", "유럽과 북부 아메리카 산업 구조", "extra-industry:europeAmerica", "World Bank WDI 미국 산업 구조 세 부문 동년 값(로컬·공식 API 농업 최신값은 2021)"),
        ]),
      ]),
      unit("VII", "사하라 이남 아프리카와 중·남부 아메리카", [
        chapter("14", "사하라 이남 아프리카와 중·남부 아메리카", [
          t("w-7-01", "중·남부 아메리카 국가별 인종 비율", null, "CIA World Factbook 국가별 서로 다른 조사 연도와 범주 원표"),
          t("w-7-02", "중·남부 아메리카 품목별 수출액 비율과 총수출액", null, "WITS 수출 상품군과 총수출액 동일 연도 원표"),
          t("w-7-03", "사하라 이남 아프리카 주요국 상품 수출액 비율", "wto-africa-exports", "WTO 또는 WITS 국가별 상품군 수출 원표"),
          t("w-7-04", "중·남부 아메리카 주요국 상품 수출액 비율", null, "WITS 국가별 상품군 수출 원표"),
          extra("w-x-04", "사하라 이남 아프리카와 중·남부 아메리카 산업 구조", "extra-industry:africaLatin"),
        ]),
      ]),
    ],
  },
};
