import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { subjects as inventory } from "../tools/stats/spec/tables.mjs";
import { compose, slugFor, topicFor } from "../tools/stats/spec/compose.mjs";
import { polishStatisticsCopy } from "../tools/stats/spec/copy.mjs";
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
  "faostat_production_2024", "faostat_trade_2024", "kosis_employment_2025", "kostat_farm_households_2024",
  "kosis_crop_area_2025", "molit_province_area_2024",
  "wpp2024_continent_age_2025", "wpp2024_country_migration_rate_history", "un_migrant_stock_2020",
  "molit_gyeonggi_land_use_2024", "wits_export_groups_2023",
  "aies_state_manufacturing_2023",
  "mafra_north_south_2023_2024",
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
const employmentFullNames = ["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시","경기도","강원특별자치도","충청북도","충청남도","전북특별자치도","전라남도","경상북도","경상남도","제주특별자치도"];
const employmentByProvince = (name) => local.kosis_employment_2025[employmentFullNames[provinceOrder.indexOf(name)]];
const cropFullName = (name) => ({강원:"강원도",전북:"전라북도",제주:"제주도"}[name]||employmentFullNames[provinceOrder.indexOf(name)]);
const cropValue = (group,name) => local.kosis_crop_area_2025[group][group==="total_cultivated_area"?employmentFullNames[provinceOrder.indexOf(name)]:cropFullName(name)];
const landAreaByProvince = (name) => local.molit_province_area_2024[employmentFullNames[provinceOrder.indexOf(name)]];
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
const faCrop = [["Wheat","밀"],["Rice","쌀"],["Maize (corn)","옥수수"]];
const faAnimal = [["Cattle","소"],["Swine / pigs","돼지"],["Sheep","양"]];
const faArea = {Asia:"Asia",Europe:"Europe",Africa:"Africa","North America":"Northern America","South America":"Americas",Oceania:"Oceania"};
const faRecord = (dataset,area,item,element) => local[dataset].find((r)=>r.area===area&&r.item===item&&r.element===element)?.value ?? null;
const faContinent = (dataset,continent,item,element) => {
  if(continent!=="South America") return faRecord(dataset,faArea[continent],item,element);
  const americas=faRecord(dataset,"Americas",item,element),north=faRecord(dataset,"Northern America",item,element);
  return f(americas)&&f(north)?americas-north:null;
};
const faSource = source("FAOSTAT","https://www.fao.org/faostat/en/#data/QCL");
const faName = (name) => {
  const iso={"United States of America":"USA","Russian Federation":"RUS","Iran (Islamic Republic of)":"IRN","Viet Nam":"VNM","Republic of Korea":"KOR"}[name];
  const country=allCountries.find((value)=>value.iso3===iso||value.atlasName===name);
  return country?cName(country):name;
};
const faCountryRecord = (record) => Number(record.area_code)<5000 && !/^China,|^China \(/.test(record.area);
const farmSource = source("국가데이터처 농림어업조사","https://sri.kostat.go.kr/boardDownload.es?bid=226&list_no=436097&seq=3");
const migrantStockSource = source("UN International Migrant Stock 2020","https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2020_ims_stock_by_sex_destination_and_origin.xlsx");
const religionKeys = [["christians","크리스트교"],["muslims","이슬람교"],["hindus","힌두교"],["buddhists","불교"],["jews","유대교"],["noReligion","무종교"],["other","기타"]];
const religionByContinent = (continent) => {
  const values = Object.fromEntries(religionKeys.map(([key])=>[key,0]));
  let total=0;
  for(const country of allCountries.filter((c)=>belongsToContinent(c,continent)&&c.religion2020?.counts)) {
    total+=country.religion2020.totalPopulation;
    for(const [key] of religionKeys)values[key]+=Number(country.religion2020.counts[key]||0);
  }
  return {total,values};
};

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
  built.rowLabel = ["religion-asia","religion-africa"].includes(kind) ? "지역·국가" : "대륙·국가";
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
  if (kind === "city-change-index") {
    const groups={capital:["11","28","41","42","51"],yeongnam:["26","27","31","47","48"],chungcheong:["30","36","43","44"],honam:["29","45","46","50","52"]};
    const sourceMetric=km.cities["resident-population"];
    const rows=Object.entries(kr.cities).filter(([code,city])=>groups[arg].includes(city.parentCode))
      .map(([code,city])=>{
        const points=sourceMetric.seriesByRegion[code]||[];
        const at=(key)=>points.find((p)=>p.periodKey===key)?.value;
        const baseline=at("201112"),latest=at("202606");
        return baseline>0&&f(latest)?row(city.shortLabel||city.label,[100,...["201512","202012","202512","202606"].map((key)=>f(at(key))?round(at(key)/baseline*100,1):null)]):null;
      }).filter(Boolean).sort((a,b)=>b.values[4]-a.values[4]).slice(0,12);
    return rows.length?table(target,"지수","2026.06",sourceFromMetric(sourceMetric),["시군",{label:"2011년 12월",unit:"지수"},{label:"2015년 12월",unit:"지수"},{label:"2020년 12월",unit:"지수"},{label:"2025년 12월",unit:"지수"},{label:"2026년 6월",unit:"지수"}],rows,{note:"2011년 12월 = 100; 동일 행정구역 경계 비교에 유의"}):null;
  }
  if (kind === "kosis-employment") {
    const rows=provinceOrder.map((name)=>{
      const a=employmentByProvince(name);
      return row(name,[a.total,...["agriculture","mining_manufacturing","services"].map((field)=>round(a[field]/a.total*100,1))]);
    });
    return table(target,"천 명, %","2025",source("국가데이터처 경제활동인구조사","https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1DA7E33S_NEW"),["시도",{label:"취업자",unit:"천 명"},{label:"농림어업",unit:"%"},{label:"광공업",unit:"%"},{label:"서비스업 등",unit:"%"}],rows,{note:"서비스업 등은 사회간접자본 및 기타서비스업(D~U); 2025년 광주·전남 개별 행 사용"});
  }
  if (kind === "kosis-manufacturing-province-sectors") {
    const sectors=[["C10","식료품"],["C20","화학제품"],["C22","고무·플라스틱"],["C23","비금속광물"],["C25","금속가공"],["C26","전자·통신"],["C29","기계장비"],["C30","자동차"]];
    const rows=provinceOrder.map((name)=>{
      const sectorsByCode=industryByProvince(name);
      return row(name,sectors.map(([code])=>sectorsByCode[code]?.shipments_million_krw==null?null:round(sectorsByCode[code].shipments_million_krw/1000,1)));
    });
    const variants=[{id:"shipments",label:"출하액",rows}, {id:"employees",label:"종사자",unit:"명",columns:sectors.map(([,label])=>({label,unit:"명"})),rows:provinceOrder.map((name)=>{
      const sectorsByCode=industryByProvince(name);
      return row(name,sectors.map(([code])=>sectorsByCode[code]?.employees??null));
    })}];
    return table(target,"십억 원","2024",kosisIndustrySource,["시도",...sectors.map(([,label])=>({label,unit:"십억 원"}))],rows,{variants,note:"종사자 10명 이상 사업체; 비공개 X는 빈값"});
  }
  if (kind === "kosis-manufacturing-region-sectors") {
    const sectors=[["C10","식료품"],["C20","화학제품"],["C22","고무·플라스틱"],["C23","비금속광물"],["C25","금속가공"],["C26","전자·통신"],["C29","기계장비"],["C30","자동차"]];
    const rows=Object.entries(industryGroups).map(([label,names])=>{
      const total=names.reduce((sum,name)=>sum+industryByProvince(name).C.shipments_million_krw,0);
      return row(label,sectors.map(([code])=>{
        const cells=names.map((name)=>industryByProvince(name)[code]?.shipments_million_krw);
        return cells.every(f)?round(cells.reduce((a,b)=>a+b,0)/total*100,1):null;
      }));
    });
    return table(target,"%","2024",kosisIndustrySource,["권역",...sectors.map(([,label])=>({label,unit:"%"}))],rows,{note:"시도 합산, 종사자 10명 이상 사업체; 비공개 X가 있는 권역은 빈값"});
  }
  if (kind === "region-gdp") {
    const rows=worldRows(regionSets[arg],(country)=>{
      const gdp=country.economy?.gdp?.valueCurrentUsd?.latest;
      const population=wppCountry.get(country.iso3);
      return gdp?.year===2025&&f(gdp.value)&&f(Number(population?.population_thousands))?{gdp:gdp.value,pop:Number(population.population_thousands)*1000}:null;
    }).map(({country,value})=>row(cName(country),[round(value.gdp/1e9,1),Math.round(value.gdp/value.pop)]));
    return rows.length?table(target,"십억 달러, 달러","2025",source("World Bank WDI, UN 세계인구전망 2024","https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"),["국가",{label:"GDP",unit:"십억 달러"},{label:"1인당 GDP*",unit:"달러"}],rows,{note:"* GDP를 같은 해 UN WPP 인구로 나눈 참고값; World Bank의 공식 1인당 GDP 지표와 다를 수 있음"}):null;
  }
  if (kind === "farm-types") {
    const rows=local.kostat_farm_households_2024.occupation_types.map((record)=>row(record.region,[record.fulltime_percent,record.parttime_percent]));
    return table(target,"%","2024.12.1",farmSource,["지역",{label:"전업",unit:"%"},{label:"겸업",unit:"%"}],rows,{note:"특·광역시는 세종 포함 통합값; 도별 값은 2024년 농림어업조사 표 1-10"});
  }
  if (kind === "farm-small") {
    const rows=local.kostat_farm_households_2024.under_half_ha.map((record)=>row(record.region,[record.under_half_ha,round(record.under_half_ha/record.total*100,1)]));
    return table(target,"가구, %","2024.12.1",farmSource,["시도",{label:"0.5ha 미만",unit:"가구"},{label:"전체 농가 비율",unit:"%"}],rows,{note:"2024년 농림어업조사 46쪽 표 6; 시도 합계와 전국 추정치에 2가구 차이"});
  }
  if (kind === "ei-fossil-balance" || kind === "ei-fossil-production") {
    const fuels=[["oil","석유","백만 t","oil_production_mt","oil_consumption_mt"],["gas","천연가스","십억 m³","gas_production_bcm","gas_consumption_bcm"],["coal","석탄","EJ","coal_production_ej","coal_consumption_ej"]];
    const isos=kind==="ei-fossil-production"?regionSets.dry:[...new Set([...majorCountryRows.energy,...regionSets.dry,...regionSets.monsoon])];
    const variants=fuels.map(([id,label,unit,productionKey,consumptionKey])=>{
      const rows=worldRows(isos,(country)=>{
        const name=eiNames[country.iso3]||country.atlasName;
        const production=local.ei_energy_2024[productionKey][name];
        const consumption=local.ei_energy_2024[consumptionKey][name];
        return f(production)&&f(consumption)?{production,consumption}:null;
      }).map(({country,value})=>row(cName(country),kind==="ei-fossil-production"?[round(value.production,1)]:[round(value.production,1),round(value.consumption,1),round(value.production-value.consumption,1)]));
      return {id,label,unit,columns:kind==="ei-fossil-production"?[{label:"생산량",unit}]:[{label:"생산량",unit},{label:"소비량",unit},{label:"생산−소비",unit}],rows};
    });
    return table(target,"","2024",eiSource,["국가",...(kind==="ei-fossil-production"?[{label:"생산량",unit:"백만 t"}]:[{label:"생산량",unit:"백만 t"},{label:"소비량",unit:"백만 t"},{label:"생산−소비",unit:"백만 t"}])],variants[0].rows,{variants,note:"생산−소비는 수급 차이이며 순수출입과 동일하지 않음"});
  }
  if (kind === "ei-renewable-rank") {
    const englishToKorean=new Map(countries.map((country)=>[eiNames[country.iso3]||country.atlasName,cName(country)]));
    const fuels=[["Wind","풍력"],["Solar","태양광"],["Hydro","수력"],["Other renewables #","기타 재생"]];
    const records=local.ei_energy_2024.renewable_generation_twh;
    const totalGeneration=local.ei_energy_2024.generation_twh;
    const variants=fuels.map(([key,label])=>({id:key.replace(/[^a-z]/gi,"").toLowerCase(),label,rows:Object.entries(records)
      .filter(([name,value])=>totalGeneration[name]?.Total>=10&&f(value[key])&&!/^Total |^Other /.test(name))
      .map(([name,value])=>({name,value:round(value[key]/totalGeneration[name].Total*100,1),amount:round(value[key],1)}))
      .sort((a,b)=>b.value-a.value).slice(0,5).map((item,index)=>row(String(index+1)+"위",[{name:englishToKorean.get(item.name)||item.name,value:item.value}]))}));
    return table(target,"%","2024",eiSource,["순위",{label:"국가 · 총발전량 대비 비율",unit:"%"}],variants[0].rows,{variants,note:"Energy Institute 개별 국가 중 총발전량 10 TWh 이상, 에너지원별 상위 5개국"});
  }
  if (kind === "kosis-paddy-field") {
    const metric=km.provinces['paddy-field-area'];
    const rows=provinceOrder.map((name)=>{
      const code=Object.entries(kr.provinces).find(([,region])=>region.shortLabel===name)?.[0];
      const paddy=metric.latestByRegion[code]?.value,total=local.kosis_cultivated_area_2025[name];
      return row(name,[round(paddy,1),round(total-paddy,1),round(paddy/total*100,1),round((total-paddy)/total*100,1)]);
    });
    return table(target,"ha, %","2025",source("국가데이터처 경지면적조사",sourceFromMetric(metric).url),["시도",{label:"논",unit:"ha"},{label:"밭",unit:"ha"},{label:"논 비율",unit:"%"},{label:"밭 비율",unit:"%"}],rows,{note:"밭 면적은 전체 경지에서 논 면적을 뺀 값"});
  }
  if (kind === "kosis-crop-area") {
    const rows=provinceOrder.map((name)=>{
      const total=cropValue("total_cultivated_area",name),facility=cropValue("facility",name);
      return row(name,[total,facility,round(facility/total*100,1)]);
    });
    return table(target,"ha, %","2025",source("국가데이터처 농업면적조사","https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1ET0040"),["시도",{label:"작물재배면적",unit:"ha"},{label:"시설 작물 면적",unit:"ha"},{label:"시설 비율",unit:"%"}],rows,{note:"시설 면적은 KOSIS DT_1ET0017 선택 세부항목 합산; 시설 내 중복 재배 여부에 유의"});
  }
  if (kind === "kosis-crop-share-national" || kind === "kosis-crop-share-region") {
    const cropGroups=[["rice","벼"],["vegetables","채소"],["fruit","노지 과수"]];
    const totals=cropGroups.map(([key])=>local.kosis_crop_area_2025[key]['계']);
    const rows=provinceOrder.map((name)=>{
      const denominator=kind==="kosis-crop-share-region"?cropValue("total_cultivated_area",name):null;
      const values=cropGroups.map(([key],index)=>round(cropValue(key,name)/(denominator||totals[index])*100,1));
      return row(name,values);
    });
    return table(target,"%","2025",source("국가데이터처 농업면적조사","https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1ET0012"),["시도",...cropGroups.map(([,label])=>({label,unit:"%"}))],rows,{note:kind==="kosis-crop-share-region"?"지역 작물재배면적 대비 선택 작물 비중; 다른 작물이 있어 합계는 100%가 아님":"작물별 전국 재배면적 대비 시도 비중; 채소는 DT_1ET0013, 과수는 DT_1ET0014"});
  }
  if (kind === "kosis-population-density") {
    const rows=provinceOrder.map((name)=>{
      const area=landAreaByProvince(name),population=ageByProvince(name).total;
      return row(name,[round(area,1),population,round(population/area,1)]);
    });
    return table(target,"㎢, 명, 명/㎢","2024.12",source("국토교통부 지적통계, 행정안전부 주민등록인구통계","https://stat.molit.go.kr/portal/cate/statMetaView.do?hRsId=24"),["시도",{label:"면적",unit:"㎢"},{label:"인구",unit:"명"},{label:"인구 밀도",unit:"명/㎢"}],rows,{note:"2024년 12월 말 지적 면적과 주민등록인구로 계산"});
  }
  if (kind === "wpp-continent-age") {
    const values=local.wpp2024_continent_age_2025;
    const rows=continentOrder.map((continent)=>{
      const a=values[wppLocations[continent]],total=a.youth+a.working+a.elderly;
      return row(continentLabels[continent],[round(a.youth/total*100,1),round(a.working/total*100,1),round(a.elderly/total*100,1)]);
    });
    return table(target,"%","2025",wppSource,["대륙",{label:"0~14세",unit:"%"},{label:"15~64세",unit:"%"},{label:"65세 이상",unit:"%"}],rows,{note:"UN WPP 2024 중위 추계, 5세별 인구 원수 합산"});
  }
  if (kind === "un-migrant-destinations") {
    const values=local.un_migrant_stock_2020.destination_regions,total=Object.values(values).reduce((sum,value)=>sum+value.migrants,0);
    const keys={Africa:"903",Asia:"935",Europe:"908","North America":"905","South America":"904",Oceania:"909"};
    const rows=continentOrder.map((continent)=>row(continentLabels[continent],[round(values[keys[continent]].migrants/1e6,1),round(values[keys[continent]].migrants/total*100,1)]));
    return table(target,"백만 명, %","2020",migrantStockSource,["목적지",{label:"국제 이주자",unit:"백만 명"},{label:"세계 비율",unit:"%"}],rows,{note:"이주자 이동 유량이 아닌 해당 지역 거주 이주자 재고량"});
  }
  if (kind === "wpp-country-migration-rate") {
    const years=["1990","2000","2010","2020","2025"];
    const isos=[...new Set([...majorCountryRows.migration,...majorCountryRows.population])];
    const rows=worldRows(isos,(country)=>local.wpp2024_country_migration_rate_history[country.iso3])
      .filter(({value})=>years.every((year)=>f(value[year])))
      .map(({country,value})=>row(cName(country),years.map((year)=>round(value[year],1))));
    return table(target,"‰","2025",wppSource,["국가",...years.map((year)=>({label:year,year,unit:"‰"}))],rows,{note:"UN WPP 2024 중위 추계, 해당 연도 순이동률"});
  }
  if (kind === "un-migrant-origins") {
    const translations={India:"인도",Indonesia:"인도네시아",Pakistan:"파키스탄",Bangladesh:"방글라데시",Egypt:"이집트",Poland:"폴란드",Turkey:"튀르키예","Russian Federation":"러시아",Kazakhstan:"카자흐스탄","Syrian Arab Republic":"시리아",China:"중국",Philippines:"필리핀","United Kingdom":"영국","United States of America":"미국",Mexico:"멕시코","El Salvador":"엘살바도르","New Zealand":"뉴질랜드"};
    const variants=Object.entries(local.un_migrant_stock_2020.origin_rank).map(([destination,origins])=>({id:destination,label:destination,rows:origins.map((origin,index)=>row(String(index+1)+"위",[{name:translations[origin.country]||origin.country,value:round(origin.people/1e6,1)}]))}));
    return table(target,"백만 명","2020",migrantStockSource,["순위",{label:"출신국 · 이주자",unit:"백만 명"}],variants[0].rows,{variants,note:"국제 이주자 재고량, 목적지별 출신국 상위 5개국; 미국의 푸에르토리코 출신은 국내 이동으로 보아 제외"});
  }
  if (kind === "gyeonggi-land-use" || kind === "gyeonggi-farmland") {
    const sourceValue=source("국토교통부 지적통계","https://stat.molit.go.kr/portal/cate/statMetaView.do?hRsId=24");
    const rows=Object.entries(local.molit_gyeonggi_land_use_2024).map(([name,a])=>{
      if(kind==="gyeonggi-farmland") return row(name,[round(a.dry_field_km2+a.paddy_km2,1),round(a.dry_field_km2/(a.dry_field_km2+a.paddy_km2)*100,1),round(a.paddy_km2/(a.dry_field_km2+a.paddy_km2)*100,1)]);
      return row(name,["dry_field_km2","paddy_km2","forest_km2","building_km2","road_km2","river_km2","other_km2"].map((field)=>round(a[field]/a.total_km2*100,1)));
    });
    return kind==="gyeonggi-farmland"?table(target,"㎢, %","2024.12",sourceValue,["경기 시군",{label:"전·답",unit:"㎢"},{label:"밭 비율",unit:"%"},{label:"논 비율",unit:"%"}],rows,{note:"경기도 주요 10개 시군, 지목상 전·답의 합계"})
      :table(target,"%","2024.12",sourceValue,["경기 시군",...[["밭","dry_field_km2"],["논","paddy_km2"],["임야","forest_km2"],["대지","building_km2"],["도로","road_km2"],["하천","river_km2"],["기타","other_km2"]].map(([label])=>({label,unit:"%"}))],rows,{note:"경기도 주요 10개 시군, 전체 지적 면적 대비 지목별 비율"});
  }
  if (kind === "wits-export-groups") {
    const names=["튀르키예","카자흐스탄"];
    const fields=[["Fuels","연료"],["Metals","금속"],["Mach and Elec","기계·전자"],["Transportation","수송기계"],["Textiles and Clothing","섬유·의류"]];
    const rows=names.map((name)=>{
      const a=local.wits_export_groups_2023[name],shares=fields.map(([key])=>a.groups[key]);
      return row(name,[a.exports_million_usd,...shares,round(100-shares.reduce((sum,value)=>sum+value,0),1)]);
    });
    return table(target,"백만 달러, %","2023",source("World Bank WITS","https://wits.worldbank.org/CountryProfile/en/Country/TUR/Year/2023/Summarytext"),["국가",{label:"수출 총액",unit:"백만 달러"},...fields.map(([,label])=>({label,unit:"%"})),{label:"기타",unit:"%"}],rows,{note:"WITS에 저장된 튀르키예·카자흐스탄 2023년 상품군 구성; 다른 지역 주요국은 원천 미확보"});
  }
  if (kind === "aies-state-manufacturing") {
    const records=Object.values(local.aies_state_manufacturing_2023).sort((a,b)=>b.total_thousand_usd-a.total_thousand_usd);
    const rows=records.map((record)=>row(record.name,[round(record.total_thousand_usd/1e6,1),...record.industries.map((industry)=>({name:industry.name,value:round(industry.shipments_thousand_usd/1e6,1)}))]));
    return table(target,"십억 달러","2023",source("U.S. Census Bureau Annual Integrated Economic Survey","https://data.census.gov/table/AIESBASICTIMESERIES.AIES31BASIC02"),["주",{label:"제조업 총출하액",unit:"십억 달러"},{label:"1위 업종",unit:"십억 달러"},{label:"2위 업종",unit:"십억 달러"},{label:"3위 업종",unit:"십억 달러"}],rows,{note:"50개 주, 2017 NAICS 3자리 업종; 비공개 출하액은 순위에서 제외"});
  }
  if (kind === "wto-africa-exports") {
    const records=readCsv("wto_africa_export_groups_2021.csv");
    const rows=records.map((record)=>row(record.label,["agriculture","fuels_mining","manufactures","other"].map((field)=>Number(record[field]))));
    return table(target,"%","2021",source("WTO Trade Profiles 2023","https://www.wto.org/english/res_e/statis_e/daily_update_e/trade_profiles/ET_e.pdf"),["국가",{label:"농산물",unit:"%"},{label:"연료·광물",unit:"%"},{label:"제조품",unit:"%"},{label:"기타",unit:"%"}],rows,{note:"WTO 2023 프로필의 2021년 상품 수출 구성; DR콩고·에티오피아·남아공·보츠와나"});
  }
  if (kind === "mafra-north-land" || kind === "mafra-north-crops") {
    const sourceValue=source("농림축산식품부 농림축산식품 주요통계","https://kass.mafra.go.kr/newkass/cmm/fms/FileDown.do?atchFileId=FILE_000000000022023&fileSn=0");
    if(kind==="mafra-north-land") {
      const rows=Object.entries(local.mafra_north_south_2023_2024.land_2023).map(([name,value])=>row(name,[value.cultivated_thousand_ha,value.paddy_thousand_ha,value.dry_field_thousand_ha,value.food_crop_thousand_ha]));
      return table(target,"천 ha","2023",sourceValue,["지역",{label:"경지",unit:"천 ha"},{label:"논",unit:"천 ha"},{label:"밭",unit:"천 ha"},{label:"식량작물 재배",unit:"천 ha"}],rows,{note:"PDF 574~575쪽, 북한통계 원표 재수록; 북한 경지 구성의 최신 공표 연도"});
    }
    const rows=Object.entries(local.mafra_north_south_2023_2024.crop_production_2024).map(([name,value])=>row(name,[value.total_thousand_t,value.rice_thousand_t,value.maize_thousand_t]));
    return table(target,"천 t","2024",sourceValue,["지역",{label:"식량작물 합계",unit:"천 t"},{label:"쌀",unit:"천 t"},{label:"옥수수",unit:"천 t"}],rows,{note:"PDF 576~577쪽, 북한통계 원표 재수록; 쌀은 정곡 기준"});
  }
  if (kind === "religion-continent") {
    const rows=continentOrder.map((continent)=>{
      const {total,values}=religionByContinent(continent);
      return row(continentLabels[continent],[round(total/1e6,1),...religionKeys.map(([key])=>round(values[key]/total*100,1))]);
    });
    return table(target,"백만 명, %","2020",sourceFromCountry("religion"),["대륙",{label:"수록 인구",unit:"백만 명"},...religionKeys.map(([,label])=>({label,unit:"%"}))],rows,{note:"* 종교별 신자 수를 국가 단위로 합산; 수록 국가 범위"});
  }
  if (kind === "religion-distribution") {
    const continents=continentOrder.map((name)=>religionByContinent(name));
    const rows=religionKeys.map(([key,label])=>{
      const total=continents.reduce((sum,c)=>sum+c.values[key],0);
      return row(label,[round(total/1e6,1),...continents.map((c)=>round(c.values[key]/total*100,1))]);
    });
    return table(target,"백만 명, %","2020",sourceFromCountry("religion"),["종교",{label:"수록 신자",unit:"백만 명"},...continentOrder.map((name)=>({label:continentLabels[name],unit:"%"}))],rows,{note:"* 국가별 신자 수 합산; 수록 국가 범위"});
  }
  if (kind === "religion-rank") {
    const keys=[["christians","크리스트교"],["muslims","이슬람교"],["hindus","힌두교"],["buddhists","불교"]];
    const variants=keys.map(([key,label])=>({id:key,label,rows:allCountries.filter((c)=>c.religion2020?.counts?.[key]!=null)
      .sort((a,b)=>b.religion2020.counts[key]-a.religion2020.counts[key]).slice(0,5)
      .map((c,i)=>row(String(i+1)+"위",[{name:cName(c),value:round(c.religion2020.counts[key]/1e6,1)}]))}));
    return table(target,"백만 명","2020",sourceFromCountry("religion"),["순위",{label:"국가 · 신자",unit:"백만 명"}],variants[0].rows,{variants,note:"Pew Research Center 수록 국가 중 상위 5개국"});
  }
  if (kind === "fa-world-crops") {
    const rows=faCrop.map(([item,label])=>row(label,[round(faRecord("faostat_production_2024","World",item,"Production")/1e6,1),round(faRecord("faostat_production_2024","World",item,"Area harvested")/1e6,1)]));
    return table(target,"백만 t, 백만 ha","2024",faSource,["작물",{label:"생산량",unit:"백만 t"},{label:"수확 면적",unit:"백만 ha"}],rows);
  }
  if (kind === "fa-world-yield-trade") {
    const rows=faCrop.map(([item,label])=>{
      const production=faRecord("faostat_production_2024","World",item,"Production");
      const area=faRecord("faostat_production_2024","World",item,"Area harvested");
      const exportItem=item==="Rice"?"Rice, paddy (rice milled equivalent)":item;
      const exports=faRecord("faostat_trade_2024","World",exportItem,"Export quantity");
      return row(label,[round(production/area,1),item==="Rice"||exports===null?null:round(exports/production*100,1)]);
    });
    return table(target,"t/ha, %","2024",faSource,["작물",{label:"단위 면적 생산",unit:"t/ha"},{label:"수출량/생산량",unit:"%"}],rows,{note:"쌀 수출량은 FAOSTAT 도정미 환산량이므로 생산량과 정의가 달라 직접 비교 불가; 해당 값은 미표시"});
  }
  if (kind === "fa-continent-crops") {
    const rows=continentOrder.map((continent)=>{
      const values=faCrop.map(([item])=>{
        const part=faContinent("faostat_production_2024",continent,item,"Production");
        const all=faRecord("faostat_production_2024","World",item,"Production");
        return round(part/all*100,1);
      });
      return row(continentLabels[continent],values);
    });
    return table(target,"%","2024",faSource,["대륙",...faCrop.map(([,label])=>({label,unit:"%"}))],rows,{note:"중·남부 아메리카는 아메리카에서 앵글로아메리카를 뺀 값"});
  }
  if (kind === "fa-continent-trade") {
    const variants=faCrop.map(([item,label])=>({id:item.replace(/[^a-z]/gi,"").toLowerCase(),label,rows:continentOrder.map((continent)=>{
      const exportItem=item==="Rice"?"Rice, paddy (rice milled equivalent)":item;
      return row(continentLabels[continent],[round(faContinent("faostat_trade_2024",continent,exportItem,"Export quantity")/1e6,1),round(faContinent("faostat_trade_2024",continent,exportItem,"Import quantity")/1e6,1)]);
    })}));
    return table(target,"백만 t","2024",source("FAOSTAT","https://www.fao.org/faostat/en/#data/TCL"),["대륙",{label:"수출",unit:"백만 t"},{label:"수입",unit:"백만 t"}],variants[0].rows,{variants,note:"국가별 교역 합계(역내 교역 포함); 쌀은 도정미 환산량"});
  }
  if (kind === "fa-trade-rank") {
    const variants=faCrop.flatMap(([item,label])=>["Export quantity","Import quantity"].map((element)=>{
      const exportItem=item==="Rice"?"Rice, paddy (rice milled equivalent)":item;
      const rows=local.faostat_trade_2024.filter((r)=>r.item===exportItem&&r.element===element&&faCountryRecord(r))
        .sort((a,b)=>b.value-a.value).slice(0,5).map((r,i)=>row(String(i+1)+"위",[{name:faName(r.area),value:round(r.value/1e6,1)}]));
      return {id:(item+element).replace(/[^a-z]/gi,"").toLowerCase(),label:label+" "+(element==="Export quantity"?"수출":"수입"),rows};
    }));
    return table(target,"백만 t","2024",source("FAOSTAT","https://www.fao.org/faostat/en/#data/TCL"),["순위",{label:"국가 · 물량",unit:"백만 t"}],variants[0].rows,{variants,note:"FAOSTAT 수록 국가 상위 5개국; 쌀은 도정미 환산량"});
  }
  if (kind === "fa-continent-livestock") {
    const rows=continentOrder.map((continent)=>row(continentLabels[continent],faAnimal.map(([item])=>round(faContinent("faostat_production_2024",continent,item,"Stocks")/1e6,1))));
    return table(target,"백만 마리","2024",faSource,["대륙",...faAnimal.map(([,label])=>({label,unit:"백만 마리"}))],rows,{note:"중·남부 아메리카는 아메리카에서 앵글로아메리카를 뺀 값"});
  }
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
    const records=readCsv("korea_generation_by_energy_source_2014_2024.csv");
    const fields=[["석탄","coal_gwh"],["천연가스","gas_gwh"],["원자력","nuclear_gwh"],
      ["신재생","new_renewable_gwh"],["석유","oil_gwh"],["기타",null]];
    const rows=records.map((record)=>{
      const total=Number(record.total_gwh);
      const values=fields.map(([,key])=>key?Number(record[key]):Number(record.pumped_hydro_gwh)+Number(record.other_gwh));
      if(!Number.isFinite(total)||values.some(value=>!Number.isFinite(value))||Math.abs(values.reduce((sum,value)=>sum+value,0)-total)>1)
        throw new Error(`KPX 에너지원별 발전량 합계 불일치: ${record.year}`);
      return row(String(record.year),values.map(value=>round(value/total*100,1)));
    });
    return table(target,"%","2014–2024",source("한국전력거래소","https://new.kpx.or.kr/boardDownload.es?bid=0085&list_no=75637&seq=1"),
      ["연도",...fields.map(([label])=>({label,unit:"%"}))],rows);
  }
  if (kind === "kosis-land-area") {
    return table(target,"ha, %","2025",source("국가데이터처 경지면적조사, 국토교통부 지적통계","https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1EB001"),
      ["시도",{label:"경지 면적",unit:"ha",year:"2025"},{label:"경지율*",unit:"%",year:"2025"}],provinceOrder.map((name)=>row(name,[local.kosis_cultivated_area_2025[name],round(local.kosis_cultivated_area_2025[name]/(landAreaByProvince(name)*100)*100,1)])),
      {note:"* 2025년 경지면적을 2024년 12월 말 지적 면적으로 나눈 참고값"});
  }
  if (kind === "ei-world-mix") {
    const a=local.ei_energy_2024.supply_ej['Total World'];
    const fields=["Oil","Natural Gas","Coal","Nuclear energy","Hydro electric","Renewables"];
    const names={Oil:"석유","Natural Gas":"천연가스",Coal:"석탄","Nuclear energy":"원자력","Hydro electric":"수력",Renewables:"재생"};
    if(Math.abs(fields.reduce((sum,field)=>sum+a[field],0)-a.Total)>0.01)throw new Error("EI 세계 에너지원 합계 불일치");
    return table(target,"EJ, %","2024",eiSource,["에너지원",{label:"공급량",unit:"EJ"},{label:"비중",unit:"%"}],
      [...fields.map(field=>row(names[field],[round(a[field],1),round(a[field]/a.Total*100,1)])),row("합계",[round(a.Total,1),100])]);
  }
  if (kind === "ei-world-rank") {
    const englishToKorean = new Map(countries.map((country)=>[eiNames[country.iso3] || country.atlasName,cName(country)]));
    const ranked=Object.entries(local.ei_energy_2024.supply_ej).filter(([name])=>!/^Total |^Other |^of which:|Non-OECD|European Union/.test(name)&&name.trim()!=="Non-OECD")
      .sort((a,b)=>b[1].Total-a[1].Total);
    if(ranked.length<11||ranked.slice(0,10).some(([name,value],index)=>!englishToKorean.has(name)||!Number.isFinite(value.Total)||value.Total<ranked[index+1][1].Total))
      throw new Error("EI 1차 에너지 국가 순위 또는 국가명 누락");
    const records=ranked.slice(0,10).map(([name,v],index)=>row(englishToKorean.get(name),[index+1,round(v.Total,1)]));
    return table(target,"EJ","2024",eiSource,["국가",{label:"순위",unit:""},{label:"1차 에너지 공급",unit:"EJ"}],records,{note:"Energy Institute가 개별 국가로 수록한 범위의 상위 10개국"});
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
    // The year-by-year table above already covers this source without duplicating it.
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
      ["국가", "크리스트교", "이슬람교", "힌두교", "불교"], rows) : null;
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
      const item={wheat:"Wheat",rice:"Rice",maize:"Maize (corn)"}[key];
      const rows = local.faostat_production_2024.filter((record)=>record.item===item&&record.element==="Production"&&faCountryRecord(record))
        .sort((a,b)=>b.value-a.value).slice(0,5)
        .map((record,index) => row(String(index+1)+"위",[{name:faName(record.area),value:round(record.value/1e6,1)}]));
      return {id:key,label,rows};
    });
    return table(target,"백만 t","2024",source("FAOSTAT","https://www.fao.org/faostat/en/#data/QCL"),
      ["순위",{label:"국가 · 생산량",unit:"백만 t"}],variants[0].rows,{variants});
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
      const item={cattle:"Cattle",pigs:"Swine / pigs",sheep:"Sheep"}[key];
      const rows = local.faostat_production_2024.filter((record)=>record.item===item&&record.element==="Stocks"&&faCountryRecord(record))
        .sort((a,b)=>b.value-a.value).slice(0,5)
        .map((record,index) => row(String(index+1)+"위",[{name:faName(record.area),value:round(record.value/1e6,1)}]));
      return {id:key,label,rows};
    });
    return table(target,"백만 마리","2024",source("FAOSTAT","https://www.fao.org/faostat/en/#data/QCL"),
      ["순위",{label:"국가 · 사육 두수",unit:"백만 마리"}],variants[0].rows,{variants});
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
const result = polishStatisticsCopy(compose(rawTables, gaps));
const json = JSON.stringify(result, null, 2) + "\n";
const gapEvidence = {
  "k-x-01": ["시군 취업자 지표에는 광역시가 없고 2020년 원표는 통근·통학 인구를 합쳐 취업자만의 통근 비율을 계산할 수 없음", "data/korea-stats.js; data_downloads/kosis/raw/DT_1PA2021/101_DT_1PA2021_F_2020.csv"],
  "k-5-01": ["에너지 생산 시트의 석탄은 toe이며 광물별 물리 생산량이 아님; 광업·제조업조사는 출하액(백만원)만 수록", "data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx Ⅰ-2; data_downloads/kosis/raw/DT_1FS1101/101_DT_1FS1101_Y_2024.csv"],
  "k-5-15": ["작물 셀 원천에는 2025년 시도별 재배면적(ha)만 있고 수확 생산량(t) 열이 없음; 농식품 PDF의 생산량은 전국 합계", "data_downloads/kosis/browser_extract/crop_area_2025_20260920/source_cells.json; data_downloads/mafra/2025_agriculture_food_main_statistics.pdf"],
  "k-5-16": ["작물 셀 원천의 행은 전국·17개 시도만 포함; 시군별 여러 작물 면적은 없음", "data_downloads/kosis/browser_extract/crop_area_2025_20260920/source_cells.json; data/korea-stats.js cities.paddy-field-area"],
  "k-5-23": ["사업체 원표는 산업분류별 사업체수·종사자수이며 백화점·편의점 등 소매 업태별 판매액 열이 없음", "data_downloads/kosis/raw/DT_1K52F01/101_DT_1K52F01_Y_2024.csv"],
  "k-5-26": ["지역 연보의 영업자동차 수송은 단양군 범위; 전국 교통수단별 여객 수송량 분모와 같은 연도 원표가 없음", "data_downloads/danyang/yearbook/extracted/11. 교통_관광.xlsx; data/korea-stats.js"],
  "k-5-27": ["지역 연보의 운수 자료는 단양군 범위; 전국 철도·도로·해운·항공 화물량을 같은 단위로 집계한 원표가 없음", "data_downloads/danyang/yearbook/extracted/11. 교통_관광.xlsx; data/korea-stats.js"],
  "k-7-03": ["남북한 통계 PDF의 확인한 농업표 574~577쪽에는 1차 에너지원별 북한 공급량이 없음; KEEI 시트는 남한만 포함", "data_downloads/mafra/2025_agriculture_food_main_statistics.pdf; data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx Ⅰ-3"],
  "k-7-04": ["KEEI Ⅴ-1은 남한 지역별 발전량만 수록하고 북한 발전량·설비용량은 없음", "data_downloads/keei/2025_지역에너지통계연보_2024자료.xlsx Ⅴ-1; data_downloads/kpx/korea_generation_by_energy_source_2014_2024.csv"],
  "w-3-36": ["EI 2024 공급 시트는 북아메리카·CIS·중동·아시아태평양 같은 자체 권역만 제공해 여섯 대륙의 세계 총량 비중으로 직접 변환할 수 없음", "data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx TES by fuel"],
  "w-3-41": ["EI 공급 시트는 재생 전체와 수력만 분리하며 태양광·풍력·바이오 공급량은 없음; KNREC 원표는 한국 지역만 수록", "data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx TES by fuel; data_downloads/knrec/2024_신재생에너지보급통계_통계표1_연도별지역별현황.xlsx"],
  "w-4-03": ["저장된 WITS 2023 상품군 원본은 튀르키예·카자흐스탄·UAE·튀니지뿐이며 몬순 주요국의 같은 분류 수출 구성이 없음", "data_downloads/wits/export_summarytext_2023/TUR_2023_summarytext.txt; data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv"],
  "w-4-05": ["확인한 EI 시트는 석유·가스·석탄, FAOSTAT 추출은 식량작물·가축으로 한정되어 해당 지역의 기타 광물·자원 항목을 같은 정의로 채울 수 없음", "data_downloads/energy_institute/EI_Statistical_Review_2025_ALL_data.xlsx; data_downloads/faostat/raw/Production_Crops_Livestock_E_All_Data_Normalized_20251231.zip"],
  "w-7-01": ["로컬 4개국 값의 조사 연도가 2003·2010·2011로 다르고 인종·민족 범주도 일치하지 않아 비교용 최신 통일 표를 만들 수 없음", "data_downloads/cia_world_factbook/ethnic_composition_jm_co_br_uy.json"],
  "w-7-02": ["WITS 총수출액·상품군 원본은 건조 지역 4개국만 있으며 중·남부 아메리카 국가 행이 없음", "data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv; data_downloads/wits/export_summarytext_2023/TUR_2023_summarytext.txt"],
  "w-7-04": ["WTO 추출값은 아프리카 4개국, WITS 원본은 건조 지역 4개국이므로 중·남부 아메리카 상품군 행이 없음", "data_downloads/wto/trade_profiles_2023/africa_export_commodity_groups_2021.csv; data_downloads/wits/export_summarytext_2023/processed_export_groups_2023.csv"],
};
for (const gap of gaps) {
  if (!gapEvidence[gap.target.id]) throw new Error("GAPS 직접 확인 근거 누락: " + gap.target.id);
}
const gapLine = ({ subject, target, reason }) => [
  slugFor(subject, target.id), subject === "korea" ? "한국 " + topicFor(subject, target.id) : "세계 " + topicFor(subject, target.id),
  target.title, gapEvidence[target.id]?.[0] || reason,
  gapEvidence[target.id]?.[1] || "해당 원천 경로 미기록",
].map((value) => String(value).replaceAll("|", "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |");
const gapMarkdown = [
  "# Statistics 미수록 표", "",
  "값이나 정의를 확인하지 못한 표입니다. `data_downloads/`는 `~/Documents/New project 8/data_downloads/`를 가리킵니다. 각 행에 직접 확인한 파일과 누락된 열·범위를 기록했습니다.", "",
  "| ID | 주제 | 표 | 필요한 원천 또는 사유 | 확인한 경로 |",
  "| --- | --- | --- | --- | --- |",
  ...gaps.map(gapLine), "",
  "## 부분 수록 범위", "",
  "- 작물 단위 면적 생산량: 쌀 수출 비율은 FAOSTAT의 도정미 환산 교역량과 벼 생산량 정의가 달라 빈값으로 둠.",
  "- 화석연료 생산과 소비: 생산−소비는 수급 차이이며 실제 순수출입은 아님.",
  "- 경지율: 2025년 경지면적을 2024년 12월 말 지적 면적으로 나눈 참고값임.",
  "- 전·겸업 농가: 공식 PDF는 특·광역시를 하나로 묶어 17개 시도 개별 비율을 제공하지 않음.",
  "- 건조 지역 수출 구성: 저장된 WITS 원본 중 비교 대상인 튀르키예·카자흐스탄만 수록함.",
  "- 아프리카 수출 구성: WTO 2023 프로필의 상품군 기준 연도는 2021년이고 수록 국가는 4개임.",
  "",
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
