// Public Statistics copy and unit normalization. Source notes stay in build-stats.mjs.
const titles = {
  "korea-daytime-compare": "상주 인구와 주간 인구",
  "korea-manufacturing-sectors": "주요 제조업",
  "korea-farm-types": "전업농가와 겸업농가",
  "korea-small-farms": "경지 0.5ha 미만 농가",
  "korea-renewable-production": "시도별 신재생 에너지 생산량",
  "world-migrant-destinations": "국제 이주민 도착 지역",
  "world-migrant-origins": "이주민 출신국",
  "world-crop-use": "용도별 소비 비중",
  "world-renewable-generation-rank": "신재생 발전 비율 상위 국가",
};
const labels = new Map(Object.entries({
  "주민등록인구": "인구",
  "유소년": "유소년층", "청장년": "청장년층", "노년": "노년층",
  "자연적 증가": "자연 증가",
  "상주인구": "상주 인구", "주간인구": "주간 인구", "주간인구지수": "주간 인구 지수",
  "사업체": "사업체 수", "종사자": "종사자 수", "1인당": "1인당 지역 내 총생산",
  "서비스업 등": "서비스업", "농가수": "농가 수", "노지 과수": "과수",
  "작물재배면적": "재배 면적", "시설 작물 면적": "시설 재배 면적", "시설 비율": "시설 재배 비율",
  "0.5ha 미만": "농가 수", "전체 농가 비율": "비율",
  "최종에너지 소비": "최종 에너지 소비량", "전력 판매": "전력 판매량",
  "신재생 및 기타": "신재생 등", "근로자": "외국인 근로자", "계": "합계",
  "전·답": "경지 면적", "수록 인구": "인구", "수록 신자": "신자 수",
  "국제 이주자": "국제 이주민", "세계 비율": "비중",
  "수확 면적": "재배 면적", "단위 면적 생산": "단위 면적당 생산량",
  "수출량/생산량": "수출 비중", "총소비": "소비량",
  "재생": "신재생", "재생에너지": "신재생",
  "농업": "농림어업", "공업": "광공업",
}));
const noUnit = new Set(["주간 인구 지수", "2011", "2015", "2020", "2025", "2026.6"]);
const romanYears = new Map([
  ["2011년 12월", "2011"], ["2015년 12월", "2015"], ["2020년 12월", "2020"],
  ["2025년 12월", "2025"], ["2026년 6월", "2026.6"],
]);
const industryNames = new Map([
  ["화학물질 및 화학제품 제조업; 의약품 제외", "화학물질 및 화학제품 제조업(의약품 제외)"],
  ["금속가공제품 제조업; 기계 및 가구 제외", "금속가공제품 제조업(기계 및 가구 제외)"],
  ["섬유제품 제조업; 의복제외", "섬유제품 제조업(의복 제외)"],
  ["목재 및 나무제품 제조업; 가구 제외", "목재 및 나무제품 제조업(가구 제외)"],
]);
const provinceShort = new Map(Object.entries({
  서울특별시:"서울", 부산광역시:"부산", 대구광역시:"대구", 인천광역시:"인천",
  광주광역시:"광주", 대전광역시:"대전", 울산광역시:"울산", 세종특별자치시:"세종",
  경기도:"경기", 강원특별자치도:"강원", 충청북도:"충북", 충청남도:"충남",
  전북특별자치도:"전북", 전라남도:"전남", 경상북도:"경북", 경상남도:"경남",
  제주특별자치도:"제주",
}));
function cleanLabel(value) {
  return labels.get(value) || value;
}
function polishView(table,view) {
  const originalNote=view.note || "";
  const aggregate=originalNote.includes("수록 국가 합산");
  delete view.internalNote;
  delete view.note;
  if (aggregate && view.rows.some(row=>row.group==="continent")) {
    for (const row of view.rows) if(row.group==="continent")row.aggregateMark=true;
    view.note="* 국가 합산";
  } else if (["종사자 10명 이상 사업체","2011년 = 100","잠정"].includes(originalNote)) view.note=originalNote;

  view.label=cleanLabel(view.label);
  if(view.label==="취업 구조")view.label="산업 구조";
  if(table.id==="korea-population-compare"&&view.label==="이동")view.label="순이동";
  if(table.id==="world-urban-compare"&&view.label==="도시 증가")view.label="도시 인구 증가율";
  if(table.id==="world-urban-compare"&&view.label==="촌락 증가")view.label="촌락 인구 증가율";
  view.rowLabel=["대륙·국가","지역·국가"].includes(view.rowLabel)?"지역":cleanLabel(view.rowLabel);
  if(table.id==="korea-capital-compare"&&view.rowLabel==="경기 시군")view.rowLabel="시군";
  if(view.rowLabel==="연도")view.rows.sort((a,b)=>Number.parseInt(a.label,10)-Number.parseInt(b.label,10));

  for(const column of view.columns) {
    if(table.id==="korea-city-change")column.label=romanYears.get(column.label)||column.label;
    if(table.id==="korea-population-compare"&&view.label==="순이동") {
      if(column.label==="2024년")column.label="2024";
      if(column.label==="2025년")column.label="2025";
      if(column.label==="2026년 1~5월")column.label="2026.1~5";
    }
    column.label=cleanLabel(column.label);
    if(noUnit.has(column.label))column.unit="";
  }
  if(table.id==="world-monsoon-compare"||table.id==="world-dry-compare"||table.id==="world-europe-america-compare"||table.id==="world-africa-latin-compare") {
    if(view.label==="산업 구조")for(const column of view.columns)if(["농림어업","광공업","서비스업"].includes(column.label))column.unit="%";
  }
  if(table.id==="korea-renewable-production"&&view.columns[0])view.columns[0].label="생산량";
  if(table.id==="world-energy-compare"&&view.label==="1차 에너지"&&view.columns[0]) {
    view.columns[0].unit="EJ";
    for(const row of view.rows)if(typeof row.values[0]==="number")row.values[0]=Math.round(row.values[0]*0.0036*10)/10;
    for(const column of view.columns.slice(1))column.unit="%";
  }
  if(table.id==="world-food-compare"&&view.label==="가축") {
    view.columns=view.columns.slice(0,3);
    for(const column of view.columns)column.unit="백만 마리";
    for(const row of view.rows)row.values=row.values.slice(0,3).map(value=>typeof value==="number"?Math.round(value/1e6*10)/10:value);
  }
  if(table.id.startsWith("world-"))for(let index=0;index<view.columns.length;index+=1) {
    if(view.columns[index].unit!=="t")continue;
    view.columns[index].unit="만 t";
    for(const row of view.rows)if(typeof row.values[index]==="number")row.values[index]=Math.round(row.values[index]/1000)/10;
  }
  if(table.id==="world-europe-america-compare"&&view.label==="산업 구조") {
    const basis=view.columns.findIndex(column=>column.label==="기준");
    if(basis>=0){view.columns.splice(basis,1);for(const row of view.rows)row.values.splice(basis,1);}
  }
  if(table.id==="korea-capital-compare"&&view.label==="주요 지표") {
    const basis=view.columns.findIndex(column=>column.label==="기준");
    if(basis>=0){view.columns.splice(basis,1);for(const row of view.rows)row.values.splice(basis,1);}
    view.columns[0].barEligible=false;
    const units={"인구":"명","농가":"가구","지역 내 총생산":"십억 원"};
    view.rows.forEach((row,index)=>{row.valueUnit=units[row.label]||"";row.order=index;});
  }
  if(table.id==="world-africa-latin-compare"&&view.label==="자원")view.label="수출 구성";
  if(table.id==="korea-small-farms")for(const row of view.rows)row.label=provinceShort.get(row.label)||row.label;
  for(const row of view.rows)row.label=industryNames.get(row.label)||row.label;
  for(const sub of view.subviews||[])polishView(table,sub);
}
export function polishStatisticsCopy(result) {
  const yearColumns=view=>view.columns.length>=2&&view.columns.every(column=>/^(?:19|20)\d{2}(?:[.~-]\d+)*(?:년)?$/.test(column.label));
  for(const subject of Object.values(result.subjects))for(const topic of subject.topics) {
    const tables=topic.regions?topic.regions.flatMap(region=>region.tables):topic.tables||[];
    for(const table of tables) {
      table.title=titles[table.id]||table.title;
      if(table.id==="world-religion-rank")for(const view of table.views)view.columns[0].label="신자 수";
      if(table.id==="world-migrant-origins")for(const view of table.views)view.columns[0].label="이주민 수";
      if(table.id==="world-crop-trade-rank")for(const view of table.views)view.columns[0].label="물량";
      if(table.id==="world-crop-rank")for(const view of table.views)view.columns[0].label="생산량";
      if(table.id==="world-livestock-rank")for(const view of table.views)view.columns[0].label="사육 두수";
      if(table.id==="world-renewable-generation-rank")for(const view of table.views)view.columns[0].label="발전 비율";
      for(const view of table.views)polishView(table,view);
      table.defaultSort=/\-rank$/.test(table.id)||table.views.some(view=>view.rowLabel==="순위")?{mode:"rank"}:
        table.views.every(view=>/^연도$/.test(view.rowLabel))?{mode:"year",direction:"asc"}:
        table.views.every(view=>view.rows.length&&view.rows.every(row=>/^(?:유소년층|청장년층|노년층|0~14세|15~64세|65세 이상)$/.test(row.label)))?{mode:"intrinsic"}:
        table.views.some(view=>yearColumns(view)||(view.subviews||[]).some(yearColumns))?{mode:"latestYearOrFirstNumeric",direction:"desc"}:
        {mode:"firstNumeric",direction:"desc"};
    }
  }
  return result;
}
