# PROMENADE Geography 통계 데이터 카탈로그

이 문서는 저장소 안의 통계·기후·시험 데이터 파일을 LLM용 "통계머신"에 넣기 좋게 정리한 목록입니다. 원본 수치 데이터는 중복 복사하지 않고, 어떤 파일을 읽어야 하는지와 각 파일의 구조, 조인 키, 출처 처리 원칙을 설명합니다.

## LLM 입력 원칙

- 데이터나 출처를 임의로 보완하지 않는다. 파일 안에 출처가 없으면 `출처 정보 확인 필요`로 표시한다.
- `*.js` 데이터 파일은 브라우저 전역 변수(`window.*`)에 데이터를 주입하는 형태다. Node.js에서 읽을 때는 `vm`으로 실행한 뒤 `context.window`에서 꺼낸다.
- `*.json` 파일은 그대로 파싱해도 된다.
- 같은 데이터가 `json`과 `js`에 함께 있으면 `json`을 우선한다. `js`는 정적 사이트에서 fetch 실패를 대비하는 내장 번들로 보면 된다.
- 지도 모양, 폰트, vendor 라이브러리는 통계 질의용 LLM에는 우선순위가 낮다. 지도 렌더링까지 만들 때만 함께 넣는다.

## 바로 먹일 핵심 파일

| 우선순위 | 파일 | 성격 | 비고 |
| --- | --- | --- | --- |
| 1 | `data/country-stats.js` | 세계 국가별 인문·경제·농업·에너지 통계 | 국가 통계머신의 핵심 원천 |
| 1 | `data/korea-stats.js` | 한국 시도·시군·서울/부산 구군 공식 통계 | 한국지리 통계머신의 핵심 원천 |
| 1 | `tools/climate/data/climate-data.json` | 세계 주요 지역 월별 기후 통계 | 세계지리 기후 그래프 원천 |
| 1 | `tools/climate/data/korea-climate-data.json` | 한국·북한 기후 평년값 | 한국지리 기후 그래프 원천 |
| 1 | `tools/cut/data/ebsi_geo_data.json` | EBSi 기반 지리 기출 정답률·등급컷 | Exam Database의 실제 시험 데이터 |
| 2 | `tools/cut/data/geo_cut_model.json` | 컷 추정 모델과 학습 메타데이터 | 예측/컷 보기 로직에 필요 |
| 2 | `tools/cut/data/question-image-manifest.json` | 문항 이미지 매니페스트 | 문항 이미지 연결용 |
| 2 | `tools/climate/data/exam-climate-statements.js` | 기후 문항 진술/태그/메트릭 | 기후 문항 생성 보조 |
| 3 | `data/korea-routes.js` | 한국 주요 노선 오버레이 | 지도 문항 제작 보조 |

## 중복 또는 보조 파일

| 파일 | 처리 |
| --- | --- |
| `tools/climate/data/climate-data.js` | `climate-data.json`의 브라우저 번들로 취급 |
| `tools/climate/data/korea-climate-data.js` | `korea-climate-data.json`의 브라우저 번들로 취급 |
| `tools/cut/data/cut-data.js` | `ebsi_geo_data.json`, `geo_cut_model.json`, `question-image-manifest.json`을 합친 브라우저 번들 |
| `data/korea-admin.js` | 한국 행정구역 지오메트리/지역명 보조 데이터 |
| `data/world-atlas.js`, `data/world-atlas-variants.js`, `data/world-lakes.js` | 세계 지도 토폴로지/호수 지오메트리 |
| `tools/climate/data/world-countries-110m.json`, `tools/climate/data/world-countries-50m.json` | 세계지도 TopoJSON |
| `tools/climate/data/korea-peninsula-geo.js` | 한반도 GeoJSON |
| `data/embedded-font.js`, `vendor/*.js`, `tools/climate/data/vendor-*.js` | 통계 데이터 아님 |

## 세계 국가 통계

파일: `data/country-stats.js`

전역 변수:

- `COUNTRY_STATS_META`
- `COUNTRY_STATS_BY_ID`

규모와 기준:

- 국가 통계 객체 244개
- 지도 기준 국가 수 252개, ISO3 매칭 250개
- 통계가 없는 주요 미매칭 이름: `Northern Cyprus`, `Somaliland`
- 기준 연도: 인구 2023, 농업 2023, 에너지 2023, 인구 구조 2023, 난민 2024

조인 키:

- 객체 키: 세계 지도 atlas numeric id
- 국가 내부 키: `atlasName`, `iso3`

주요 범주:

- `population`: 총인구, 도시/촌락 인구, 도시화율, 출생률, 사망률, 자연증가율
- `agriculture`: 곡물·가축 생산, 경지 면적, 단위 면적당 생산량, 무역, 용도
- `religion2020`: 종교별 비중과 인구
- `economy`: 수출액, GDP 대비 수출 비중, 산업 구조
- `populationStructure`: 연령 구조, 부양비, 인구 밀도
- `migration`: 이주민 비중/총수, 순이동, 난민 송출/수용
- `energy`: 1차 에너지 소비, 전력 생산, 화석연료 생산·무역

농업 세부 키:

- 작물: `maize`, `rice`, `wheat`
- 작물 지표: `production`, `areaHarvested`, `yield`, `trade`, `use`
- 가축: `cattle`, `pigs`, `sheep`
- 가축 지표: `stocks`, `meat`

출처 메타데이터:

- `COUNTRY_STATS_META.sources`에 UN WPP/OWID, World Bank, FAOSTAT, Energy Institute, Ember, UNHCR 등 출처 라벨과 URL이 들어 있다.
- 실제 응답을 만들 때는 각 항목의 `label`, `url`, `year`, `unit`을 우선 사용한다.

## 한국지리 공식 통계

파일: `data/korea-stats.js`

전역 변수:

- `KOREA_GEO_STATS_META`
- `KOREA_GEO_STATS_REGION_ORDER`
- `KOREA_GEO_STATS_REGIONS`
- `KOREA_GEO_STATS_METRICS`

메타:

- 생성 시각: `2026-04-23T18:41:48`
- 공급자: KOSIS e-지방지표
- 기본 URL: `https://kosis.kr/visual/eRegionIndex/index.do`
- 파일 note에 따르면 2027 수능특강 한국지리에서 반복 활용되는 지표 중심으로 정리됨

지역 레벨:

| 레벨 | 의미 | 지역 수 | 지표 수 |
| --- | --- | ---: | ---: |
| `provinces` | 도/광역시 | 17 | 50 |
| `cities` | 시/군 | 154 | 32 |
| `metroDistricts` | 서울·부산 구/군 | 41 | 6 |

공통 스키마:

- 지역: `code`, `name` 계열 필드가 `KOREA_GEO_STATS_REGIONS[level]`에 저장된다.
- 지표: `key`, `label`, `category`, `categoryLabel`, `unit`, `decimals`, `canBeNegative`, `sourceText`, `sourceName`, `pageUrl`, `statTableUrl`, `seriesByRegion`, `latestByRegion`
- 시계열 값: `periodKey`, `periodLabel`, `value`, `displayValue`

주요 지표군:

- 인구 구조·이동: 추계인구, 주민등록인구, 인구증가율, 노령화지수, 고령인구비율, 출생아수, 사망자수, 합계출산율, 전입/전출/순이동, 외국인
- 도시·정주: 가구수, 도시지역면적, 1인당 도시지역면적, 주택보급률, 주택수, 노후주택비율, 통근, 주간인구
- 농업·촌락: 농가수, 농가인구, 논경지면적, 농가비율
- 공업·서비스: GRDP, 사업체수, 종사자수, 제조업/서비스업 사업체와 종사자, 수출입, 무역수지
- 기후·에너지: 최종에너지소비량, 전력판매량, 기온, 강수량

음수 가능 지표:

- 인구증가율, 순이동인구, 자연적증가, 무역수지, 주간 순유입인구 등은 `canBeNegative: true`를 따른다.
- 그래프 축을 만들 때 0 아래 값이 있을 수 있으므로 최솟값을 0으로 고정하지 않는다.

## 세계 기후 통계

파일: `tools/climate/data/climate-data.json`

규모:

- 지역 129개
- 월 12개
- 모든 기본 지역은 Open-Meteo 기반으로 정리됨

주요 필드:

- `name`, `englishName`, `aliases`
- `continent`, `country`
- `climateCode`, `climateGroup`
- `months`
- `monthlyTemperatureC`
- `monthlyPrecipitationMm`
- `annualMeanTemperatureC`
- `annualPrecipitationMm`
- `coordinates.latitude`, `coordinates.longitude`
- `source.type`, `source.label`, `source.url`, `source.apiUrl`, `source.model`, `source.period`, `source.note`
- `hemisphere`, `id`

기후군 분포:

- `Af` 8, `Am` 3, `Aw` 20, `BS` 7, `Bw` 11
- `Cfa` 13, `Cfb` 17, `Cs` 12, `Cw` 3
- `Df` 12, `Dw` 9, `EF` 2, `ET` 4, `H` 8

출처:

- Open-Meteo Historical Weather API
- Open-Meteo Geocoding API
- Natural Earth Downloads

## 한국 기후 통계

파일: `tools/climate/data/korea-climate-data.json`

규모와 기준:

- 지역 69개
- 남한 42개, 북한 27개
- 월 12개
- 기준: 기상청 기후평년값 / 지점정보, 1991-2020

주요 필드:

- `id`, `stationId`, `name`, `officialName`, `aliases`
- `nation`, `zone`
- `months`
- `coordinates.latitude`, `coordinates.longitude`
- `elevationM`
- `monthlyTemperatureC`
- `monthlyPrecipitationMm`
- `monthlyColdDaysBelowZero`
- `monthlyHotDaysAboveTwentyFiveMin`
- `annualMeanTemperatureC`
- `annualPrecipitationMm`
- `annualColdDaysBelowZero`
- `annualHotDaysAboveTwentyFiveMin`
- `source.type`, `source.label`, `source.period`, `source.note`

지역권:

- 수도권·서해 6, 강원 영서 4, 강원 영동 4, 충청 5, 호남 8, 영남 11, 제주 4
- 북서부 6, 북동부 7, 북중부 8, 북남부 6

비교 기간:

- 1월
- 8월
- 겨울(12~2월)
- 여름(6~8월)

## 기후 문항 진술 데이터

파일: `tools/climate/data/exam-climate-statements.js`

전역 변수:

- `EXAM_CLIMATE_STATEMENTS`

규모:

- 진술 58개

주요 필드:

- `id`
- `source`
- `kind`: `comparison-source`, `region-feature`
- `text`
- `tags`
- `metric`

메트릭 예:

- 계절별 평균 기온/강수량
- 밤 길이/낮 길이
- 기온 연교차
- 1월·7월 강수량 차이
- 7월 평균 기온
- 연 강수량
- 겨울 강수 집중률
- 적도/회귀선 거리
- 반구

## EBSi 기출·정답률·등급컷 데이터

파일: `tools/cut/data/ebsi_geo_data.json`

규모:

- 시험 record 154개
- 한국지리 77개, 세계지리 77개
- 주요 기간: 2026년 3월부터 과거 회차까지 포함

출처:

- `source`: EBSi 역대 등급컷/오답률
- `source_url`: `https://www.ebsi.co.kr/ebs/xip/xipa/retrievePastGrdCutWrongAnswerRate.ebs?tab=1`
- `fetched_at`: `2026-04-25T23:21:55`

record 주요 필드:

- `source`
- `school_year`
- `exam_year`
- `month`
- `subject`
- `national_mean`
- `national_sd`
- `raw1`, `raw2`, `raw3`
- `std1`, `std2`, `std3`
- `items`
- `wrong_top15`

문항 필드:

- `items[].question`
- `items[].points`
- `items[].national_rate`
- `items[].source`

오답 상위 문항 필드:

- `wrong_top15[].rank`
- `wrong_top15[].question`
- `wrong_top15[].wrong_rate`
- `wrong_top15[].correct_rate`
- `wrong_top15[].points`
- `wrong_top15[].answer`
- `wrong_top15[].choices`

주의:

- 쉬운 문항 중 누락 정답률 보정 방식은 `easy_missing_rate_method`에 적혀 있다.
- 실제 시행 시험은 예측값이 아니라 저장된 실제 등급컷·정답률을 우선 사용한다.

## 컷 모델 데이터

파일: `tools/cut/data/geo_cut_model.json`

모델 메타:

- `version`: `geo-cut-v8-easy-midpoint-imputation`
- `built_at`: `2026-04-26T17:03:15`
- 과목: 한국지리, 세계지리
- 학습 anchor: 66개
- training record: 5개

주요 필드:

- `cuts`
- `features`
- `sd_features`
- `ridge_alpha`
- `sd_model`
- `cut_models`
- `academy_to_national_rate`
- `item_rate_mapping`
- `historical_anchors`
- `runtime_corrections`
- `default_points`
- `training_records`

모델 입력 feature:

- `mean`
- `nat_sd`
- `hard15_rate`
- `hard15_sd`
- `under40_points`
- `easy5_rate`

표준편차 모델 feature:

- `mean`
- `hard15_rate`
- `hard15_sd`
- `under40_points`
- `under50_points`
- `easy5_rate`

## 문항 이미지 매니페스트

파일: `tools/cut/data/question-image-manifest.json`

규모:

- 이미지 항목 879개
- `source_count`: 879
- `generated_at`: `2026-04-26`

주요 필드:

- `id`
- `subject`
- `exam_year`
- `school_year`
- `month`
- `question`
- `url`
- `variant`
- `source_label`

## 한국 지도 노선 데이터

파일: `data/korea-routes.js`

전역 변수:

- `KOREA_ROUTE_DATA`

규모:

- routes 4개
- waterways 0개

성격:

- 통계 원천은 아니지만 교통축·지역 비교 문항 제작에 유용한 지도 오버레이다.
- 각 route는 `id`, `name`, `color`, `dashArray`, `width`, `description`, `coordinates`를 가진다.

## 지도/지오메트리 보조 데이터

아래 파일은 통계 질의 자체보다는 지도 렌더링, 지역 매칭, 공간 시각화에 필요하다.

| 파일 | 전역 변수 또는 구조 | 용도 |
| --- | --- | --- |
| `data/korea-admin.js` | `KOREA_ADMIN_DATA` | 한국 시도·시군·구군 경계와 행정구역 정보 |
| `data/world-atlas.js` | `WORLD_ATLAS_TOPOLOGY`, `WORLD_COUNTRY_NAMES_TSV` | 세계 지도와 국가명 매칭 |
| `data/world-atlas-variants.js` | `WORLD_ATLAS_VARIANTS` | 110m/10m 세계지도 변형 |
| `data/world-lakes.js` | `WORLD_LAKES_VARIANTS` | 110m/50m/10m 호수 지오메트리 |
| `tools/climate/data/world-countries-110m.json` | TopoJSON | 세계 기후 지도 fallback |
| `tools/climate/data/world-countries-50m.json` | TopoJSON | 세계 기후 지도 기본 |
| `tools/climate/data/korea-peninsula-geo.js` | `KOREA_PENINSULA_GEOJSON` | 한국 기후 지도 |

## Node.js 로딩 예시

```js
const fs = require("fs");
const vm = require("vm");

function loadBrowserData(file) {
  const code = fs.readFileSync(file, "utf8");
  const context = { window: {}, self: {}, console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: file });
  return context.window;
}

const { COUNTRY_STATS_META, COUNTRY_STATS_BY_ID } = loadBrowserData("data/country-stats.js");
const worldClimate = JSON.parse(fs.readFileSync("tools/climate/data/climate-data.json", "utf8"));
```

## LLM용 시스템 지시문 초안

```text
너는 PROMENADE Geography의 지리 통계머신이다.
저장소의 통계 원천 파일만 근거로 답한다.
값, 기준 연도, 출처가 파일에 없으면 추정하지 말고 "출처 정보 확인 필요"라고 답한다.
세계 국가 통계는 data/country-stats.js의 COUNTRY_STATS_BY_ID와 COUNTRY_STATS_META를 우선한다.
한국 지역 통계는 data/korea-stats.js의 KOREA_GEO_STATS_*를 우선한다.
세계 기후는 tools/climate/data/climate-data.json, 한국 기후는 tools/climate/data/korea-climate-data.json을 우선한다.
시험/컷 데이터는 tools/cut/data/ebsi_geo_data.json과 tools/cut/data/geo_cut_model.json을 구분해서 사용한다.
실제 시행 시험은 저장된 실제 결과를 우선하고, 모델 예측값과 섞어 말하지 않는다.
질문에 필요한 조인 키, 단위, 기준 연도, 출처를 함께 표시한다.
```
