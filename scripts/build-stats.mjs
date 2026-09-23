import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { subjects as inventory } from "../tools/stats/spec/tables.mjs";
import { compose, slugFor, topicFor } from "../tools/stats/spec/compose.mjs";
import { majorCountryRows, busanDistrictRows } from "../tools/stats/spec/major-country-rows.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "tools/stats/data/stats.json");
const gapsOutput = path.join(root, "tools/stats/GAPS.md");
const check = process.argv.includes("--check");
const context = vm.createContext({ window: {} });
for (const file of ["data/korea-stats.js", "data/country-stats.js", "data/exam-country-catalog.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const data = context.window;
const km = data.KOREA_GEO_STATS_METRICS;
const kr = data.KOREA_GEO_STATS_REGIONS;
const allCountries = Object.values(data.COUNTRY_STATS_BY_ID);
const countries = allCountries.filter((country) => data.EXAM_COUNTRY_CATALOG[country.iso3]);
const names = data.EXAM_COUNTRY_CATALOG;
const countrySources = data.COUNTRY_STATS_META.sources;
const supplemental = JSON.parse(fs.readFileSync(path.join(root, "data/supplemental-stats.json"), "utf8"));
const local = Object.fromEntries([
  "kosis_age_sex_202412", "kosis_manufacturing_2024", "keei_regional_energy_2024",
  "knrec_regional_renewable_2024", "ei_energy_2024", "kosis_cultivated_area_2025",
].map((name) => [name, JSON.parse(fs.readFileSync(path.join(root, "data-sources/stats", name + ".json"), "utf8"))]));
const regionSets = {
  monsoon: majorCountryRows.monsoon,
  dry: majorCountryRows.dry,
};
const continentNames = {
  Africa: "아프리카", Asia: "아시아", Europe: "유럽",
  "North America": "앵글로아메리카", "South America": "중·남부 아메리카", Oceania: "오세아니아",
};
const cropNames = { wheat: "밀", rice: "쌀", maize: "옥수수" };
const animalNames = { cattle: "소", pigs: "돼지", sheep: "양" };
const keyForAnimal = { cattle: "Cattle", sheep: "Sheep", pigs: "Swine / pigs" };
const f = (value) => typeof value === "number" && Number.isFinite(value);
const round = (value, digits = 1) => Number(value.toFixed(digits));
const cName = (country) => names[country.iso3]?.nameKo || country.atlasName;
const source = (name, url) => ({ name, url });
const sourceFromMetric = (metric) => source(String(metric.sourceName || metric.sourceText || "KOSIS").replace(/\s*·\s*/g, ", "), metric.statTableUrl || metric.pageUrl || data.KOREA_GEO_STATS_META.sourceBaseUrl);
const countrySourceNames = {
  religion: "Pew Research Center", population: "UN DESA", populationRates: "UN DESA",
  worldBankMigration: "World Bank", urbanization: "World Bank", faostatProduction: "FAOSTAT",
  faostatFoodBalance: "FAOSTAT", primaryEnergy: "Our World in Data", electricityMix: "Our World in Data",
  worldBankIndustry: "World Bank",
};
const sourceFromCountry = (key) => source(countrySourceNames[key] || countrySources[key].label,
  key === "worldBankMigration" ? "https://data.worldbank.org/indicator/SM.POP.NETM" : countrySources[key].url);
const table = (target, unit, year, sourceValue, columns, rows, extras = {}) =>
  ({ id: target.id, title: target.title, unit, year: String(year), source: sourceValue, ...(target.extra ? { extra: true } : {}),
    rowLabel: typeof columns[0] === "string" ? columns[0] : columns[0].label,
    columns: columns.slice(1).map((label) => typeof label === "string" ? { label } : label), rows, ...extras });
const row = (label, values) => ({ label, values });
const provinceOrder = Object.values(kr.provinces).map((value) => value.shortLabel);
const ageCode = { 강원: "51", 전북: "52" };
const ageByProvince = (name) => {
  const code = ageCode[name] || Object.entries(kr.provinces).find(([, value]) => value.shortLabel === name)?.[0];
  return local.kosis_age_sex_202412[code];
};
const ageParts = (record) => [record.youth, record.working, record.elderly].map((value) => round(value / record.total * 100, 1));
const industryAll = Object.values(local.kosis_manufacturing_2024);
const industryCodeByProvince = Object.fromEntries(provinceOrder.map((name,index)=>[name,["11","21","22","23","24","25","26","29","31","32","33","34","35","36","37","38","39"][index]]));
const industryByProvince = (name) => local.kosis_manufacturing_2024[industryCodeByProvince[name]];
const industryGroups = {
  수도권: ["서울", "인천", "경기"], 강원권: ["강원"], 충청권: ["대전", "세종", "충북", "충남"],
  호남권: ["광주", "전북", "전남"], 영남권: ["부산", "대구", "울산", "경북", "경남"], 제주권: ["제주"],
};
const keeiSource = source("에너지경제연구원 지역에너지통계연보", "https://www.keei.re.kr/board.es?mid=a10306000000&bid=0015");
const knrecSource = source("한국에너지공단 신재생에너지 보급통계", "https://www.knrec.or.kr/biz/pds/statistic/list.do");
const eiSource = source("Energy Institute 세계에너지통계", "https://www.energyinst.org/statistical-review");
const kosisIndustrySource = source("국가데이터처 광업·제조업조사", "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1FS1101");
const kosisAgeSource = source("행정안전부 주민등록인구통계", "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B04005N");
const eiNames = { USA: "US", KOR: "South Korea", IRN: "Iran", RUS: "Russian Federation", TUR: "Turkey", TWN: "Taiwan", VEN: "Venezuela", VNM: "Vietnam" };
const eiRecord = (country, key) => local.ei_energy_2024[key][eiNames[country.iso3] || country.atlasName];

function provinceRows(metricKey) {
  const metric = km.provinces[metricKey];
  const records = Object.entries(kr.provinces).map(([code, region]) => {
    const value = metric.latestByRegion[code];
    return value && f(value.value) ? { code, label: region.shortLabel, value: value.value, year: value.periodLabel } : null;
  }).filter(Boolean);
  const years = [...new Set(records.map((record) => record.year))];
  if (!records.length || years.length !== 1) return null;
  return { metric, records, year: years[0] };
}
function provinceSingle(target, metricKey) {
  const result = provinceRows(metricKey);
  if (!result) return null;
  return table(target, result.metric.unit || "%", result.year, sourceFromMetric(result.metric),
    ["지역", result.metric.label.replace(/\(시도\)/g, "")], result.records.map((r) => row(r.label, [r.value])));
}
function worldRows(isos, getter) {
  return countries.filter((country) => !isos || isos.includes(country.iso3))
    .map((country) => ({ country, value: getter(country) }))
    .filter(({ value }) => value !== null && value !== undefined);
}
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(current);
      current = "";
    } else current += character;
  }
  fields.push(current);
  return fields;
}
function readCsv(filename) {
  const lines = fs.readFileSync(path.join(root, "data-sources/stats", filename), "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}
const wppRows = readCsv("wpp2024_2025_and_continent_history.csv");
const wupRows = readCsv("wup2025_urban_selected.csv");
const wppCountry = new Map(wppRows.filter((item) => item.iso3 && item.year === "2025").map((item) => [item.iso3, item]));
const wupCountry = new Map(wupRows.filter((item) => item.iso3 && item.year === "2025").map((item) => [item.iso3, item]));
const wppLocations = {
  Africa: "Africa", Asia: "Asia", Europe: "Europe", "North America": "Northern America",
  "South America": "Latin America and the Caribbean", Oceania: "Oceania",
};
const wupLocations = Object.fromEntries(Object.entries(wppLocations).map(([key, value]) => [key, value.toUpperCase()]));
const wppContinent = (continent, year = "2025") => wppRows.find((item) =>
  item.location_type === "Geographic region" && item.location === wppLocations[continent] && item.year === year);
const wupContinent = (continent, year = "2025") => wupRows.find((item) =>
  item.location_type === "Geographic region" && item.location === wupLocations[continent] && item.year === year);
const wppSource = source("UN DESA", "https://population.un.org/wpp/");
const wupSource = source("UN DESA", "https://population.un.org/wup/downloads");
const continentOrder = ["Asia", "Europe", "Africa", "North America", "South America", "Oceania"];
const continentLabels = {
  Asia: "아시아", Europe: "유럽", Africa: "아프리카",
  "North America": "앵글로아메리카", "South America": "라틴 아메리카", Oceania: "오세아니아",
};
const countryByLabel = new Map(countries.map((country) => [cName(country), country]));
function belongsToContinent(country, continent) {
  const name = country.continent?.name;
  if (continent === "North America") return name === "North America" && ["USA", "CAN"].includes(country.iso3);
  if (continent === "South America") return name === "South America" || (name === "North America" && !["USA", "CAN"].includes(country.iso3));
  return name === continent;
}
function continentLabelFor(country) {
  const name = continentOrder.find((candidate) => country && belongsToContinent(country, candidate));
  return continentLabels[name] || "";
}
function continentValues(continent, kind) {
  const eligible = allCountries.filter((country) => belongsToContinent(country, continent));
  const add = (key, getter) => eligible.reduce((sum, country) => sum + Number(getter(country)?.[key] || 0), 0);
  if (kind.startsWith("religion-")) {
    const records = eligible.map((country) => country.religion2020).filter((value) => value?.year === 2020 && f(value.totalPopulation));
    const total = records.reduce((sum, value) => sum + value.totalPopulation, 0);
    if (!total) return null;
    return ["christians", "muslims", "hindus", "buddhists"].map((key) =>
      round(records.reduce((sum, value) => sum + Number(value.counts[key] || 0), 0) / total * 100, 2));
  }
  if (kind === "world-population") {
    const value = wppContinent(continent);
    return value ? [Math.round(Number(value.population_thousands) * 1000)] : null;
  }
  if (kind === "world-rates") {
    const value = wppContinent(continent);
    return value ? [round(Number(value.birth_rate_per_1000), 2), round(Number(value.death_rate_per_1000), 2)] : null;
  }
  if (kind === "world-migration") {
    const value = wppContinent(continent);
    return value ? [Math.round(Number(value.net_migration_thousands) * 1000)] : null;
  }
  if (kind === "urban-continent") {
    const value = wupContinent(continent);
    return value ? [round(Number(value.urban_share), 2)] : null;
  }
  if (kind === "crop-countries") {
    const records = eligible.map((country) => ["wheat", "rice", "maize"].map((key) => country.agriculture?.crops?.production?.[key]?.latest))
      .filter((values) => values.every((value) => value?.year === 2024 && f(value.value)));
    return records.length ? [0, 1, 2].map((index) => round(records.reduce((sum, values) => sum + values[index].value, 0), 1)) : null;
  }
  if (kind === "livestock-countries") {
    const records = eligible.map((country) => {
      const values = ["cattle", "pigs", "sheep"].map((key) => country.agriculture?.livestock?.stocks?.[key]?.latest);
      values.push(country.agriculture?.livestock?.meat?.cattle?.latest);
      return values;
    }).filter((values) => values.every((value) => value?.year === 2024 && f(value.value)));
    return records.length ? [0, 1, 2, 3].map((index) => round(records.reduce((sum, values) => sum + values[index].value, 0), 1)) : null;
  }
  if (kind === "nuclear-countries" || kind === "electricity-countries") {
    const records = eligible.map((country) => country.energy?.electricity?.latest)
      .filter((value) => value?.year === 2025 && f(value.totalTWh));
    const total = records.reduce((sum, value) => sum + value.totalTWh, 0);
    if (!total) return null;
    const sum = (key) => records.reduce((amount, value) => amount + Number(value.amountBreakdownTWh[key] || 0), 0);
    const nuclear = sum("nuclear");
    if (kind === "nuclear-countries") return [round(nuclear, 2), round(nuclear / total * 100, 2)];
    const renewable = records.reduce((amount, value) => amount + Number(value.summaryAmountsTWh?.renewables || 0), 0);
    return [sum("coal"), sum("oil"), sum("gas"), nuclear, renewable].map((value) => round(value / total * 100, 2));
  }
  if (kind === "energy-countries") {
    const records = eligible.map((country) => country.energy?.consumption?.latest)
      .filter((value) => value?.year === 2024 && f(value.totalTWh));
    const total = records.reduce((sum, value) => sum + value.totalTWh, 0);
    if (!total) return null;
    const sum = (key) => records.reduce((amount, value) => amount + Number(value.amountBreakdownTWh[key] || 0), 0);
    const renewable = records.reduce((amount, value) => amount + Number(value.summaryAmountsTWh?.renewables || 0), 0);
    return [round(total, 1), ...[sum("coal"), sum("oil"), sum("gas"), sum("nuclear"), renewable].map((value) => round(value / total * 100, 2))];
  }
  return null;
}
function withContinentRows(built, kind) {
  const countryRows = (rows) => rows.map((value) => ({ ...value, group: "country",
    continent: continentLabelFor(countryByLabel.get(value.label)) })).sort((left, right) => {
    const a = countryByLabel.get(left.label);
    const b = countryByLabel.get(right.label);
    const groupA = continentOrder.findIndex((name) => a && belongsToContinent(a, name));
    const groupB = continentOrder.findIndex((name) => b && belongsToContinent(b, name));
    return groupA - groupB;
  });
  if (kind === "urban-continent" && built.variants) {
    built.variants = built.variants.map((variant) => {
      const continent = continentOrder.find((name) => name.toLowerCase().replaceAll(" ", "-") === variant.id);
      const values = continentValues(continent, kind);
      return { ...variant, rows: values ? [{ ...row(continentLabels[continent], values), group: "continent" }, ...countryRows(variant.rows)] : countryRows(variant.rows) };
    });
    built.rows = built.variants[0].rows;
  } else {
    const groups = kind === "religion-asia" ? ["Asia"] : kind === "religion-africa" ? ["Africa"] : continentOrder;
    const continentRows = groups.map((name) => {
      const values = continentValues(name, kind);
      return values ? { ...row(continentLabels[name], values), group: "continent" } : null;
    }).filter(Boolean);
    built.rows = [...continentRows, ...countryRows(built.rows)];
  }
  if (!["world-population", "world-rates", "world-migration", "urban-continent"].includes(kind)) {
    built.note = built.note ? built.note + "; 국가 합산" : "국가 합산";
  }
  return built;
}
function make(target) {
  const [kind, arg] = (target.kind || "").split(":");
  if (!kind) return null;
  if (kind === "kosis-age" || kind === "kosis-sex") {
    const rows = provinceOrder.map((name) => {
      const a = ageByProvince(name);
      const values = kind === "kosis-age"
        ? [...ageParts(a), round(a.elderly / a.youth * 100, 1)]
        : [round(a.male / a.female * 100, 1), round(a.young_male / a.young_female * 100, 1)];
      return row(name, values);
    });
    return table(target, "%", "2024.12", kosisAgeSource,
      kind === "kosis-age" ? ["시도", {label:"유소년",unit:"%"}, {label:"청장년",unit:"%"}, {label:"노년",unit:"%"}, {label:"노령화지수",unit:"지수"}]
        : ["시도", {label:"성비",unit:"여성 100명당 남성"}, {label:"20~39세 성비",unit:"여성 100명당 남성"}], rows,
      {note:"5세 구간 주민등록인구 원수로 계산"});
  }
  if (kind === "kosis-age-region") {
    const rows = Object.entries(industryGroups).map(([label,names]) => {
      const sums = {total:0,youth:0,working:0,elderly:0};
      for(const name of names) for(const key of Object.keys(sums)) sums[key] += ageByProvince(name)[key];
      return row(label,[...ageParts(sums),round(sums.elderly/sums.youth*100,1)]);
    });
    return table(target,"%","2024.12",kosisAgeSource,["권역",{label:"유소년",unit:"%"},{label:"청장년",unit:"%"},{label:"노년",unit:"%"},{label:"노령화지수",unit:"지수"}],rows,{note:"시도별 5세 구간 주민등록인구 합산"});
  }
  if (kind === "kosis-manufacturing" || kind === "kosis-manufacturing-shipments") {
    const rows = provinceOrder.map((name)=>{
      const value=industryByProvince(name).C;
      return row(name,[value.establishments,value.employees,round(value.shipments_million_krw/1000,1)]);
    });
    return table(target,"개, 명, 십억 원","2024",kosisIndustrySource,["시도",{label:"사업체",unit:"개"},{label:"종사자",unit:"명"},{label:"출하액",unit:"십억 원"}],rows,{note:"종사자 10명 이상 제조업 사업체"});
  }
  if (kind === "kosis-manufacturing-region") {
    const rows = Object.entries(industryGroups).map(([label,names])=>{
      const values=names.map((name)=>industryByProvince(name).C);
      return row(label,[values.reduce((s,v)=>s+v.establishments,0),values.reduce((s,v)=>s+v.employees,0),round(values.reduce((s,v)=>s+v.shipments_million_krw,0)/1000,1)]);
    });
    return table(target,"개, 명, 십억 원","2024",kosisIndustrySource,["권역",{label:"사업체",unit:"개"},{label:"종사자",unit:"명"},{label:"출하액",unit:"십억 원"}],rows,{note:"시도 합산, 종사자 10명 이상 제조업 사업체"});
  }
  if (kind === "kosis-manufacturing-sector") {
    const national=local.kosis_manufacturing_2024['00'];
    const rows=Object.entries(national).filter(([key,v])=>/^C\d\d$/.test(key)&&v.shipments_million_krw!==null)
      .sort((a,b)=>b[1].shipments_million_krw-a[1].shipments_million_krw)
      .map(([,v])=>row(v.sector,[v.establishments,v.employees,round(v.shipments_million_krw/1000,1)]));
    return table(target,"개, 명, 십억 원","2024",kosisIndustrySource,["업종",{label:"사업체",unit:"개"},{label:"종사자",unit:"명"},{label:"출하액",unit:"십억 원"}],rows,{note:"종사자 10명 이상 제조업 사업체; 비공개 업종 제외"});
  }
  if (kind === "keei-supply" || kind === "keei-production") {
    const key=kind==="keei-supply"?"supply":"production";
    const fields=key==="supply"?["석탄","석유","천연가스","수력","원자력","신재생 및 기타1"]:["석탄","수력","원자력","신재생 및 기타1"];
    const rows=provinceOrder.map((name)=>{const a=local.keei_regional_energy_2024[key][name];return row(name,[round(a.total,1),...fields.map((f)=>round(a[f]/a.total*100,1))]);});
    return table(target,"천 toe, %","2024",keeiSource,["시도",{label:key==="supply"?"1차 에너지 공급":"1차 에너지 생산",unit:"천 toe"},...fields.map((f)=>({label:f.replace("1", ""),unit:"%"}))],rows,{note:"2024년 잠정치; 지역 내 에너지원별 비중"});
  }
  if (kind === "knrec-province" || kind === "knrec-region") {
    const amounts=local.knrec_regional_renewable_2024.production_toe;
    const rows=kind==="knrec-province"
      ? provinceOrder.map((name)=>row(name,[round(amounts[name]/1000,1),round(amounts[name]/amounts['전국']*100,1)]))
      : Object.entries(industryGroups).map(([label,names])=>row(label,[round(names.reduce((sum,name)=>sum+amounts[name],0)/1000,1),round(names.reduce((sum,name)=>sum+amounts[name],0)/amounts['전국']*100,1)]));
    return table(target,"천 toe, %","2024",knrecSource,[kind==="knrec-province"?"시도":"권역",{label:"생산",unit:"천 toe"},{label:"전국 비중",unit:"%"}],rows,kind==="knrec-region"?{note:"시도 합산"}:{});
  }
  if (kind === "ei-korea-generation") {
    const a=local.ei_energy_2024.generation_twh['South Korea'];
    const fields=["Coal","Oil","Natural Gas","Nuclear energy","Hydro electric","Renewables","Other#"];
    return table(target,"%","2024",eiSource,["국가",...fields.map((field)=>({label:({Coal:"석탄",Oil:"석유","Natural Gas":"천연가스","Nuclear energy":"원자력","Hydro electric":"수력",Renewables:"재생", "Other#":"기타"})[field],unit:"%"}))],
      [row("한국",fields.map((field)=>round(a[field]/a.Total*100,1)))],{note:"총발전량 625.4 TWh 기준"});
  }
  if (kind === "kosis-land-area") {
    return table(target,"ha","2025",source("국가데이터처 경지면적조사","https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1EB001"),
      ["시도",{label:"경지 면적",unit:"ha"}],provinceOrder.map((name)=>row(name,[local.kosis_cultivated_area_2025[name]])));
  }
  if (kind === "ei-world-mix") {
    const a=local.ei_energy_2024.supply_ej['Total World'];
    const fields=["Oil","Natural Gas","Coal","Nuclear energy","Hydro electric","Renewables"];
    return table(target,"EJ, %","2024",eiSource,["범위",{label:"총공급",unit:"EJ"},...fields.map((field)=>({label:({Oil:"석유","Natural Gas":"천연가스",Coal:"석탄","Nuclear energy":"원자력","Hydro electric":"수력",Renewables:"재생"})[field],unit:"%"}))],
      [row("세계",[round(a.Total,1),...fields.map((field)=>round(a[field]/a.Total*100,1))])]);
  }
  if (kind === "ei-world-rank") {
    const englishToKorean = new Map(countries.map((country)=>[eiNames[country.iso3] || country.atlasName,cName(country)]));
    const records=Object.entries(local.ei_energy_2024.supply_ej).filter(([name])=>!/^Total |^Other |^of which:|Non-OECD|European Union/.test(name)&&name.trim()!=="Non-OECD")
      .sort((a,b)=>b[1].Total-a[1].Total).slice(0,10).map(([name,v])=>row(englishToKorean.get(name)||name,[round(v.Total,1)]));
    return table(target,"EJ","2024",eiSource,["국가",{label:"1차 에너지 공급",unit:"EJ"}],records,{note:"Energy Institute가 개별 국가로 수록한 범위의 상위 10개국"});
  }
  if (kind === "ei-world-regions") {
    const a=local.ei_energy_2024.supply_ej;
    const regions=[["앵글로아메리카",["US","Canada"]],["중·남부 아메리카",["Mexico","Total S. & Cent. America"]],["유럽",["Total Europe"]],["아프리카",["Total Africa"]],["아시아",["Total CIS","Total Middle East","Total Asia Pacific"]],["오세아니아",["Australia","New Zealand"]]];
    const rows=regions.map(([name,keys])=>row(name,[round(keys.reduce((sum,key)=>sum+a[key].Total,0),1)]));
    return table(target,"EJ","2024",eiSource,["권역",{label:"1차 에너지 공급",unit:"EJ"}],rows,{note:"Energy Institute 집계 권역을 재구성한 참고값; 아시아에는 일부 CIS 지역과 중동, 아시아태평양 전체가 포함되어 오세아니아와 중복됨"});
  }
  if (kind === "province-single") {
    const built = provinceSingle(target, arg);
    if (built && target.id === "k-5-07") built.rows = built.rows.filter((record) =>
      ["경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"].includes(record.label));
    return built;
  }
  if (kind === "city-rank-province" || kind === "city-rank-region") {
    const populations = new Map(readCsv("kosis_resident_population_202512.csv")
      .map((record) => [record.code, Number(record.population)]));
    const areaGroups = {
      "수도권": ["11", "28", "41"], "영남권": ["26", "27", "31", "47", "48"],
      "충청권": ["30", "36", "43", "44"], "호남권": ["29", "45", "46"],
      "강원권": ["42"], "제주권": ["50"],
    };
    const groups = new Map();
    for (const [code, city] of Object.entries(kr.cities)) {
      const current = populations.get(code);
      if (!f(current)) continue;
      const parentCode = city.parentCode === "51" ? "42" : city.parentCode === "52" ? "45" : city.parentCode;
      const group = kind === "city-rank-province"
        ? parentCode : Object.entries(areaGroups).find(([, codes]) => codes.includes(parentCode))?.[0];
      if (!group) continue;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push({ label: city.shortLabel, value: current });
    }
    if (kind === "city-rank-region") {
      for (const [group, codes] of Object.entries(areaGroups)) {
        if (!groups.has(group)) groups.set(group, []);
        for (const code of codes) {
          if (["11", "26", "27", "28", "29", "30", "31", "36"].includes(code)) {
            const value = populations.get(code);
            if (f(value)) groups.get(group).push({ label: kr.provinces[code].shortLabel, value });
          }
        }
      }
    }
    const order = kind === "city-rank-province"
      ? ["41", "48", "43", "44", "45", "47", "46", "42", "50"]
      : ["수도권", "영남권", "충청권", "호남권", "강원권", "제주권"];
    const rows = order.map((key) => {
      const values = (groups.get(key) || []).sort((a, b) => b.value - a.value).slice(0, 3)
        .map((city) => city.label + " " + Math.round(city.value).toLocaleString("ko-KR"));
      while (values.length < 3) values.push("—");
      const label = kind === "city-rank-province" ? kr.provinces[key].shortLabel : key;
      if (kind === "city-rank-province") return row(label, values);
      const total = areaGroups[key].reduce((sum, code) => sum + Number(populations.get(code === "42" ? "51" : code === "45" ? "52" : code) || 0), 0);
      return row(label, [total, ...values]);
    });
    return table(target, "명", "2025.12", source("국가데이터처", "https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1B04006"),
      kind === "city-rank-province" ? ["도", "1위", "2위", "3위"] : ["권역", "총인구", "1위", "2위", "3위"], rows);
  }
  if (kind === "district-seoul" || kind === "district-busan") {
    const parentCode = kind === "district-seoul" ? "11" : "26";
    const keys = ["resident-night-population", "daytime-population", "daytime-population-index"];
    const metrics = keys.map((key) => km.metroDistricts[key]);
    const rows = Object.entries(kr.metroDistricts).filter(([, district]) => district.parentCode === parentCode && (parentCode !== "26" || busanDistrictRows.includes(district.shortLabel)))
      .map(([code, district]) => row(district.shortLabel, metrics.map((metric) => metric.latestByRegion[code]?.value)))
      .filter((r) => r.values.every(f));
    return rows.length ? table(target, "명, 지수", "2020", sourceFromMetric(metrics[0]),
      ["구", "상주인구", "주간인구", "주간인구지수"], rows) : null;
  }
  if (kind === "kpx-generation") {
    const records = readCsv("korea_generation_by_energy_source_2014_2024.csv");
    const latest = records.at(-1);
    const keys = [["원자력", "nuclear_gwh"], ["석탄", "coal_gwh"], ["석유", "oil_gwh"], ["신재생", "new_renewable_gwh"]];
    // This local CSV omits gas and hydropower. Do not present four-source shares as the complete electricity mix.
    return null;
  }
  if (kind === "province-manufacturing") {
    const a = provinceRows("manufacturing-businesses");
    const b = provinceRows("manufacturing-employees");
    if (!a || !b || a.year !== b.year) return null;
    return table(target, "개, 명", a.year, sourceFromMetric(a.metric), ["시도", "사업체", "종사자"],
      a.records.map((r) => row(r.label, [r.value, b.metric.latestByRegion[r.code]?.value])).filter((r) => r.values.every(f)));
  }
  if (kind === "province-grdp") {
    const a = provinceRows("grdp");
    const b = provinceRows("grdp-per-capita");
    if (!a || !b || a.year !== b.year) return null;
    return table(target, "십억 원, 천 원", a.year, sourceFromMetric(a.metric), ["시도", "지역 내 총생산", "1인당"],
      a.records.map((r) => row(r.label, [r.value, b.metric.latestByRegion[r.code]?.value])).filter((r) => r.values.every(f)));
  }
  if (kind === "province-age") {
    const youth = provinceRows("youth-population-share");
    const working = provinceRows("working-age-population-share");
    const elderly = provinceRows("elderly-share");
    if (!youth || !working || !elderly) return null;
    return table(target, "%", "2026", source("국가데이터처, 행정안전부", sourceFromMetric(elderly.metric).url),
      ["시도", { label: "유소년", year: youth.year }, { label: "청장년", year: working.year }, { label: "노년", year: elderly.year }],
      youth.records.map((r) => row(r.label, [
        r.value, working.metric.latestByRegion[r.code]?.value, elderly.metric.latestByRegion[r.code]?.value,
      ])).filter((r) => r.values.every(f)),
      { note: "유소년·청장년 비중은 고령인구비율과 노령화지수로 계산" });
  }
  if (kind === "province-migration") {
    const metric = km.provinces["net-migration"];
    const periods = [["2024", "2024"], ["2025", "2025"], ["2026.01–05", "2026"]];
    const rows = Object.entries(kr.provinces).map(([code, region]) => {
      const series = metric.seriesByRegion[code] || [];
      const values = periods.map(([, prefix]) => series.filter((point) => point.periodKey.startsWith(prefix))
        .reduce((sum, point) => sum + Number(point.value || 0), 0));
      return row(region.shortLabel, values);
    });
    return table(target, "명", "2026.05", sourceFromMetric(metric), ["시도", ...periods.map(([label]) => ({ label, year: label }))], rows);
  }
  if (kind === "city-growth") {
    const metric = km.cities["population-growth-rate"];
    const rows = Object.entries(kr.cities).map(([code, city]) => {
      const value = metric.latestByRegion[code];
      return value && f(value.value) ? row(city.shortLabel, [value.value]) : null;
    }).filter(Boolean).sort((a, b) => b.values[0] - a.values[0]).slice(0, 25);
    return rows.length ? table(target, "%", "2024", sourceFromMetric(metric), ["시군", "증가율"], rows) : null;
  }
  if (kind === "province-foreign") {
    const a = provinceRows("mois-foreign-residents-total");
    const b = provinceRows("mois-foreign-resident-share");
    if (!a || !b) return null;
    return table(target, "명, %", a.year, source("행정안전부", data.KOREA_GEO_STATS_META.supplementalSources.moisForeignResidents2024.sourceUrl),
      ["시도", "외국인주민", "비중"], a.records.map((r) => row(r.label, [r.value, round(b.metric.latestByRegion[r.code]?.value, 2)])));
  }
  if (kind === "city-foreign") {
    const metric = km.cities["mois-foreign-resident-share"];
    const rows = Object.entries(kr.cities).map(([code, city]) => {
      const value = metric.latestByRegion[code];
      return value && f(value.value) ? row(city.shortLabel, [round(value.value, 2)]) : null;
    }).filter(Boolean).sort((a, b) => b.values[0] - a.values[0]).slice(0, 25);
    return rows.length ? table(target, "%", "2024.11.1", source("행정안전부", data.KOREA_GEO_STATS_META.supplementalSources.moisForeignResidents2024.sourceUrl),
      ["시군", "외국인주민 비중"], rows) : null;
  }
  if (kind === "capital-share") {
    const codes = ["11", "28", "41"];
    const keys = [["인구", "resident-population"], ["농가", "farm-households"], ["지역 내 총생산", "grdp"]];
    const rows = keys.map(([label, key]) => {
      const metric = km.provinces[key];
      const national = metric.nationalLatest?.value;
      const capital = codes.reduce((sum, code) => sum + Number(metric.latestByRegion[code]?.value || 0), 0);
      return f(national) && national > 0 ? row(label, [capital, round(capital / national * 100, 1), metric.nationalLatest.periodLabel]) : null;
    }).filter(Boolean);
    return rows.length ? table(target, "명, 가구, 십억 원, %", "2024–2026", source("국가데이터처, 행정안전부", data.KOREA_GEO_STATS_META.sourceBaseUrl),
      ["지표", "수도권", "전국 비중", "기준"], rows, { note: "시도 합산" }) : null;
  }
  if (kind === "religion-asia" || kind === "religion-africa") {
    const isos = kind === "religion-asia"
      ? majorCountryRows.religionAsia
      : majorCountryRows.religionAfrica;
    const rows = worldRows(isos, (c) => c.religion2020?.year === 2020 ? c.religion2020.shares : null)
      .map(({ country, value }) => row(cName(country), [value.christians, value.muslims, value.hindus, value.buddhists]))
      .filter((r) => r.values.every(f));
    return rows.length ? table(target, "%", "2020", sourceFromCountry("religion"),
      ["국가", "기독교", "이슬람교", "힌두교", "불교"], rows) : null;
  }
  if (kind === "wpp-history" || kind === "wpp-rates" || kind === "wpp-growth") {
    const years = kind === "wpp-history" ? ["1950", "1970", "1990", "2010", "2020", "2025"] : ["2025"];
    const rows = continentOrder.map((continent) => {
      const values = years.map((year) => wppContinent(continent, year));
      if (values.some((value) => !value)) return null;
      if (kind === "wpp-history") return row(continentLabels[continent], values.map((value) =>
        arg === "population_thousands" || arg === "net_migration_thousands"
          ? round(Number(value[arg]), 1) : round(Number(value[arg]), 2)));
      const latest = values[0];
      return row(continentLabels[continent], kind === "wpp-rates"
        ? [round(Number(latest.birth_rate_per_1000), 2), round(Number(latest.death_rate_per_1000), 2)]
        : [round(Number(latest.growth_percent), 2)]);
    }).filter(Boolean);
    const unit = kind === "wpp-rates" || arg === "net_migration_rate_per_1000" ? "‰"
      : arg === "population_thousands" || arg === "net_migration_thousands" ? "천 명" : "%";
    const columns = kind === "wpp-history" ? ["대륙", ...years.map((year) => ({ label: year, year }))]
      : kind === "wpp-rates" ? ["대륙", "출생률", "사망률"] : ["대륙", "증가율"];
    return rows.length === 6 ? table(target, unit, "2025", wppSource, columns, rows) : null;
  }
  if (kind === "wup-history" || kind === "wup-population") {
    const years = kind === "wup-history" ? ["1950", "1970", "1990", "2010", "2020", "2025"] : ["2025"];
    const rows = continentOrder.map((continent) => {
      const values = years.map((year) => wupContinent(continent, year));
      if (values.some((value) => !value)) return null;
      return row(continentLabels[continent], kind === "wup-history"
        ? values.map((value) => round(Number(value[arg]), 2))
        : [round(Number(values[0].urban_population), 1), round(Number(values[0].rural_population), 1)]);
    }).filter(Boolean);
    const unit = kind === "wup-population" ? "천 명" : "%";
    const columns = kind === "wup-history" ? ["대륙", ...years.map((year) => ({ label: year, year }))]
      : ["대륙", "도시 인구", "촌락 인구"];
    return rows.length === 6 ? table(target, unit, "2025", wupSource, columns, rows) : null;
  }
  if (kind === "world-population") {
    const rows = worldRows(majorCountryRows.population, (country) => wppCountry.get(country.iso3))
      .map(({ country, value }) => row(cName(country), [Math.round(Number(value.population_thousands) * 1000)]))
      .sort((a, b) => b.values[0] - a.values[0]);
    return rows.length ? table(target, "명", "2025", wppSource, ["국가", "총인구"], rows) : null;
  }
  if (kind === "world-rates") {
    const rows = worldRows(majorCountryRows.rates, (country) => wppCountry.get(country.iso3))
      .map(({ country, value }) => row(cName(country), [round(Number(value.birth_rate_per_1000), 2), round(Number(value.death_rate_per_1000), 2)]));
    return rows.length ? table(target, "‰", "2025", wppSource, ["국가", "출생률", "사망률"], rows) : null;
  }
  if (kind === "world-migration") {
    const rows = worldRows(majorCountryRows.migration, (country) => wppCountry.get(country.iso3))
      .map(({ country, value }) => row(cName(country), [Math.round(Number(value.net_migration_thousands) * 1000)]));
    return rows.length ? table(target, "명", "2025", wppSource, ["국가", "순이동"], rows) : null;
  }
  if (kind === "urban-continent") {
    const variants = Object.entries(continentNames).map(([continent, label]) => {
      const rows = worldRows(majorCountryRows.urban[continent], (country) => wupCountry.get(country.iso3))
        .filter(({ value }) => f(Number(value.urban_share)))
        .sort((a, b) => Number(b.value.urban_share) - Number(a.value.urban_share))
        .map(({ country, value }) => row(cName(country), [round(Number(value.urban_share), 2)]));
      return { id: continent.toLowerCase().replaceAll(" ", "-"), label, rows };
    }).filter((variant) => variant.rows.length);
    return variants.length ? table(target, "%", "2025", wupSource,
      ["국가", "도시화율"], variants[0].rows, { variants }) : null;
  }
  if (kind === "crop-use") {
    const records = data.COUNTRY_STATS_META.referenceSummaries.cropUse;
    const rows = Object.entries(cropNames).map(([key, label]) => {
      const value = records[key];
      return row(label, ["food", "feed", "bioenergy", "other"].map((k) => value.shares[k] || 0));
    });
    return table(target, "%", "2023", sourceFromCountry("faostatFoodBalance"),
      ["작물", "식용", "사료용", "바이오에너지", "기타"], rows);
  }
  if (kind === "crop-top3") {
    const variants = Object.entries(cropNames).map(([key,label]) => {
      const rows = allCountries.map((country) => ({country,value:country.agriculture?.crops?.production?.[key]?.latest}))
        .filter(({value}) => value?.year === 2024 && f(value.value))
        .sort((a,b) => b.value.value-a.value.value).slice(0,5)
        .map(({country,value},index) => row(cName(country),[index+1,Math.round(value.value)]));
      return {id:key,label,rows};
    });
    return table(target,"t","2024",source("FAOSTAT","https://www.fao.org/faostat/en/#data/QCL"),
      ["국가","순위","생산량"],variants[0].rows,{variants});
  }
  if (kind === "crop-countries" || kind === "region-crops") {
    const isos = kind === "region-crops" ? regionSets[arg] : majorCountryRows.crops;
    const rows = worldRows(isos, (c) => {
      const crop = c.agriculture?.crops?.production;
      const values = ["wheat", "rice", "maize"].map((k) => crop?.[k]?.latest);
      return values.every((v) => v?.year === 2024 && f(v.value)) ? values.map((v) => v.value) : null;
    }).map(({ country, value }) => row(cName(country), value));
    return rows.length ? table(target, "t", "2024", sourceFromCountry("faostatProduction"),
      ["국가", "밀", "쌀", "옥수수"], rows) : null;
  }
  if (kind === "livestock-countries") {
    const rows = worldRows(majorCountryRows.livestock, (c) => {
      const stocks = c.agriculture?.livestock?.stocks;
      const meats = c.agriculture?.livestock?.meat;
      const values = ["cattle", "pigs", "sheep"].map((k) => stocks?.[k]?.latest);
      const meat = meats?.cattle?.latest;
      return values.every((v) => v?.year === 2024 && f(v.value)) && meat?.year === 2024 && f(meat.value)
        ? [...values.map((v) => v.value), meat.value] : null;
    }).map(({ country, value }) => row(cName(country), value));
    return rows.length ? table(target, "마리, t", "2024", sourceFromCountry("faostatProduction"),
      ["국가", "소", "돼지", "양", "소고기"], rows) : null;
  }
  if (kind === "livestock-top3") {
    const variants = Object.entries(animalNames).map(([key,label]) => {
      const rows = allCountries.map((country) => ({country,value:country.agriculture?.livestock?.stocks?.[key]?.latest}))
        .filter(({value}) => value?.year === 2024 && f(value.value))
        .sort((a,b) => b.value.value-a.value.value).slice(0,5)
        .map(({country,value},index) => row(cName(country),[index+1,Math.round(value.value)]));
      return {id:key,label,rows};
    });
    return table(target,"마리","2024",source("FAOSTAT","https://www.fao.org/faostat/en/#data/QCL"),
      ["국가","순위","사육 두수"],variants[0].rows,{variants});
  }
  if (kind === "nuclear-countries") {
    const rows = worldRows(majorCountryRows.energy, (c) => c.energy?.electricity?.latest)
      .filter(({ value }) => value.year === 2025 && f(value.amountBreakdownTWh?.nuclear) && value.amountBreakdownTWh.nuclear > 0)
      .sort((a, b) => b.value.amountBreakdownTWh.nuclear - a.value.amountBreakdownTWh.nuclear).map(({ country, value }) => row(cName(country), [
        round(value.amountBreakdownTWh.nuclear, 2), round(value.shareBreakdown.nuclear, 2),
      ]));
    return rows.length ? table(target, "TWh, %", "2025", sourceFromCountry("electricityMix"),
      ["국가", "원자력 발전량", "발전 비율"], rows) : null;
  }
  if (kind === "energy-countries") {
    const rows = worldRows(majorCountryRows.energy, (c) => c.energy?.consumption?.latest)
      .filter(({ value }) => value.year === 2024 && f(value.totalTWh) && f(value.shareBreakdown?.coal))
      .sort((a, b) => b.value.totalTWh - a.value.totalTWh)
      .map(({ country, value }) => row(cName(country), [
        round(value.totalTWh, 1), value.shareBreakdown.coal, value.shareBreakdown.oil,
        value.shareBreakdown.gas, value.shareBreakdown.nuclear, round(value.summaryShares.renewables, 2),
      ]));
    return rows.length ? table(target, "TWh, %", "2024", sourceFromCountry("primaryEnergy"),
      ["국가", "총소비", "석탄", "석유", "천연가스", "원자력", "재생"], rows,
      {}) : null;
  }
  if (kind === "electricity-countries") {
    const rows = worldRows(majorCountryRows.energy, (c) => c.energy?.electricity?.latest)
      .filter(({ value }) => value.year === 2025 && f(value.totalTWh))
      .sort((a, b) => b.value.totalTWh - a.value.totalTWh)
      .map(({ country, value }) => row(cName(country), [
        value.shareBreakdown.coal, value.shareBreakdown.oil, value.shareBreakdown.gas,
        value.shareBreakdown.nuclear, round(value.summaryShares.renewables, 2),
      ]));
    return rows.length ? table(target, "%", "2025", sourceFromCountry("electricityMix"),
      ["국가", "석탄", "석유", "천연가스", "원자력", "재생"], rows,
      {}) : null;
  }
  if (kind === "extra-energy") {
    const energy = provinceRows("final-energy-consumption");
    const power = provinceRows("electricity-sales");
    if (!energy || !power) return null;
    const rows = energy.records.map((record) => row(record.label, [record.value, power.metric.latestByRegion[record.code]?.value]))
      .filter((record) => record.values.every(f));
    return table(target, "천 toe, MWh", energy.year + "–" + power.year,
      source("에너지경제연구원, 한국전력공사", sourceFromMetric(energy.metric).url),
      ["시도", { label: "최종에너지 소비", year: energy.year }, { label: "전력 판매", year: power.year }], rows);
  }
  if (kind === "extra-fertility") {
    const fertility = provinceRows("fertility-rate");
    if (!fertility) return null;
    const births = km.provinces.births;
    const deaths = km.provinces.deaths;
    const rows = fertility.records.map((record) => {
      const annual = (metric) => {
        const points = (metric.seriesByRegion[record.code] || []).filter((point) => /^2024\d{2}$/.test(point.periodKey));
        return points.length === 12 ? points.reduce((sum, point) => sum + Number(point.value || 0), 0) : null;
      };
      const b = annual(births);
      const d = annual(deaths);
      return f(b) && f(d) ? row(record.label, [record.value, b, d, b - d]) : null;
    }).filter(Boolean);
    return rows.length === 17 ? table(target, "명, 가임여성 1명당 명", "2024",
      source("국가데이터처", sourceFromMetric(fertility.metric).url),
      ["시도", "합계출산율", "출생아", "사망자", "자연적 증가"], rows,
      { note: "출생·사망은 월별 합산" }) : null;
  }
  if (kind === "extra-foreign-types") {
    const keys = ["mois-foreign-workers", "mois-marriage-immigrants", "mois-international-students",
      "mois-foreign-nationality-koreans", "mois-other-foreigners", "mois-non-citizen-residents"];
    const records = keys.map((key) => provinceRows(key));
    if (records.some((record) => !record || record.year !== "2024.11.1.")) return null;
    const counts = records[0].records.map((record) => row(record.label,
      records.map((entry) => entry.metric.latestByRegion[record.code]?.value)));
    if (counts.some((record) => !record.values.every(f) || record.values.slice(0, 5).reduce((sum, value) => sum + value, 0) !== record.values[5])) return null;
    const shares = counts.map((record) => row(record.label,
      record.values.slice(0, 5).map((value) => round(value / record.values[5] * 100, 2)).concat(100)));
    return table(target, "명", "2024.11.1", source("행정안전부", data.KOREA_GEO_STATS_META.supplementalSources.moisForeignResidents2024.sourceUrl),
      ["시도", "근로자", "결혼이민자", "유학생", "외국국적동포", "기타", "계"], counts,
      { variants: [{ id: "count", label: "명", rows: counts }, { id: "share", label: "%", rows: shares }], note: "계는 한국 국적 미취득자" });
  }
  if (kind === "extra-urban") {
    const isos = ["CHN", "IND", "FRA", "NGA", "USA", "BRA", "AUS", "NZL"];
    const continentRows = continentOrder.map((name) => {
      const values = continentValues(name, "urban-continent");
      return values ? { ...row(continentLabels[name], values), group: "continent" } : null;
    }).filter(Boolean);
    const countryRows = worldRows(isos, (country) => wupCountry.get(country.iso3))
      .filter(({ value }) => f(Number(value.urban_share)))
      .map(({ country, value }) => ({ ...row(cName(country), [round(Number(value.urban_share), 2)]), group: "country", continent: continentLabelFor(country) }));
    countryRows.sort((a, b) => continentOrder.findIndex((name) => belongsToContinent(countryByLabel.get(a.label), name)) -
      continentOrder.findIndex((name) => belongsToContinent(countryByLabel.get(b.label), name)));
    return table(target, "%", "2025", wupSource,
      ["대륙·국가", "도시화율"], [...continentRows, ...countryRows]);
  }
  if (kind === "extra-electricity") {
    const electricityValues = (records) => {
      const valid = records.filter((value) => value?.year === 2025 && f(value.totalTWh));
      const total = valid.reduce((sum, value) => sum + value.totalTWh, 0);
      if (!total) return null;
      const sum = (key) => valid.reduce((amount, value) => amount + Number(value.amountBreakdownTWh?.[key] || 0), 0);
      const amounts = [sum("coal"), sum("oil"), sum("gas"), sum("nuclear"), sum("hydropower"),
        sum("solar") + sum("wind") + sum("bioenergy") + sum("otherRenewables")];
      amounts.push(Math.max(0, total - amounts.reduce((amount, value) => amount + value, 0)));
      return amounts.map((value) => round(value / total * 100, 2));
    };
    const continentRows = continentOrder.map((name) => {
      const values = electricityValues(allCountries.filter((country) => belongsToContinent(country, name))
        .map((country) => country.energy?.electricity?.latest));
      return values ? { ...row(continentLabels[name], values), group: "continent" } : null;
    }).filter(Boolean);
    const countryRows = worldRows(majorCountryRows.energy, (country) => country.energy?.electricity?.latest)
      .filter(({ value }) => value.year === 2025)
      .map(({ country, value }) => ({ ...row(cName(country), electricityValues([value])), group: "country", continent: continentLabelFor(country) }))
      .filter((record) => record.values);
    countryRows.sort((a, b) => continentOrder.findIndex((name) => belongsToContinent(countryByLabel.get(a.label), name)) -
      continentOrder.findIndex((name) => belongsToContinent(countryByLabel.get(b.label), name)));
    return table(target, "%", "2025", sourceFromCountry("electricityMix"),
      ["대륙·국가", "석탄", "석유", "천연가스", "원자력", "수력", "신재생", "기타"],
      [...continentRows, ...countryRows], { note: "국가 합산; 신재생은 수력 제외" });
  }
  if (kind === "extra-industry") {
    if (arg === "europeAmerica") {
      const rows = worldRows(majorCountryRows.europeAmerica, (country) => {
        const industry = country.economy?.industry;
        return industry?.latest || (industry?.year ? industry : null);
      }).filter(({value}) => ["agriculture","industry","services"].every((key) => f(value.shares?.[key])))
        .map(({country,value}) => row(cName(country),[
          value.shares.agriculture,value.shares.industry,value.shares.services,String(value.year),
        ]));
      return rows.length ? table(target,"GDP 대비 %","2021–2025",sourceFromCountry("worldBankIndustry"),
        ["국가","농업","광공업","서비스업","기준"],rows) : null;
    }
    const rows = worldRows(majorCountryRows.africaLatin, (country) => country.economy?.industry?.latest)
      .filter(({value}) => value.year === 2025 && ["agriculture","industry","services"].every((key) => f(value.shares?.[key])))
      .map(({country,value}) => row(cName(country),[value.shares.agriculture,value.shares.industry,value.shares.services]));
    return rows.length ? table(target,"GDP 대비 %","2025",sourceFromCountry("worldBankIndustry"),
      ["국가","농업","광공업","서비스업"],rows) : null;
  }
  if (kind === "region-industry") {
    const rows = worldRows(regionSets[arg], (c) => c.economy?.industry?.latest)
      .filter(({ value }) => value.year === 2025 && ["agriculture", "industry", "services"].every((k) => f(value.shares?.[k])))
      .map(({ country, value }) => row(cName(country), [value.shares.agriculture, value.shares.industry, value.shares.services]));
    return rows.length ? table(target, "GDP 대비 %", "2025", sourceFromCountry("worldBankIndustry"),
      ["국가", "농림어업", "공업", "서비스업"], rows) : null;
  }
  return null;
}

const gaps = [];
const rawTables = [];
for (const [subject, definition] of Object.entries(inventory)) {
  for (const unitDef of definition.units) {
    for (const chapterDef of unitDef.chapters) {
      for (const target of chapterDef.targets) {
        let built = null;
        try { built = make(target); } catch (error) {
          gaps.push({ subject, target, reason: "변환 실패: " + error.message });
          continue;
        }
        if (built?.rows?.length && subject === "world" && unitDef.id === "III" && [
          "religion-asia", "religion-africa", "world-population", "world-rates", "world-migration",
          "urban-continent", "crop-countries", "livestock-countries", "nuclear-countries", "energy-countries", "electricity-countries",
        ].includes(target.kind)) built = withContinentRows(built, target.kind);
        if (built?.rows?.length) rawTables.push({ subject, target, table: built });
        else gaps.push({ subject, target, reason: target.need || "같은 정의와 시점의 완전한 값을 확인하지 못함" });
      }
    }
  }
}
const result = compose(rawTables, gaps);
const json = JSON.stringify(result, null, 2) + "\n";
const gapAttempts = {
  "k-5-04": "data_downloads/kpx 발전량 CSV는 네 전원만 포함; 전체 전원 표 추가 확인 필요",
  "k-x-01": "data/korea-stats.js의 시군 취업자 통근 비율에는 광역시가 없음; KOSIS DT_1PA2021은 통근통학 혼합",
  "w-x-03": "data/country-stats.js 미국 값은 2021년; World Bank API NV.AGR.TOTL.ZS 최신 2021년",
};
const gapLine = ({ subject, target, reason }) => [
  slugFor(subject, target.id), subject === "korea" ? "한국 " + topicFor(subject, target.id) : "세계 " + topicFor(subject, target.id),
  target.title, reason,
  gapAttempts[target.id] || "data/korea-stats.js, data/country-stats.js, data/supplemental-stats.json; data_downloads 카탈로그",
].map((value) => String(value).replaceAll("|", "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |");
const gapMarkdown = [
  "# Statistics 미수록 표", "",
  "값이나 정의를 확인하지 못한 표입니다. 확인한 원천과 누락 사유를 기록합니다.", "",
  "| ID | 주제 | 표 | 필요한 원천 또는 사유 | 확인한 경로 |",
  "| --- | --- | --- | --- | --- |",
  ...gaps.map(gapLine), "",
].join("\n");
if (check) {
  for (const [filename, expected] of [[output, json], [gapsOutput, gapMarkdown]]) {
    if (!fs.existsSync(filename) || fs.readFileSync(filename, "utf8") !== expected) {
      throw new Error(path.relative(root, filename) + "을 다시 생성해 주세요");
    }
  }
} else {
  fs.writeFileSync(output, json);
  fs.writeFileSync(gapsOutput, gapMarkdown);
}
console.log("Statistics: 한국 " + result.meta.tableCount.korea + "표, 세계 " + result.meta.tableCount.world + "표, GAPS " + gaps.length + "건");
