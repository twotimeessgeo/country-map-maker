const topics = {
  korea: [["population","인구"],["urban","도시"],["industry","산업"],["agriculture","농업"],["energy","에너지와 자원"],["transport","교통"],["multicultural","다문화"],["region","지역"],["climate","기후"]],
  world: [["religion","종교"],["population","인구와 이주"],["urban","도시화"],["food","식량"],["energy","에너지"],["region","지역"],["climate","기후"]],
};
const regionDefs = {
  korea: [["capital","수도권"],["north","북한"]],
  world: [["monsoon","몬순 아시아와 오세아니아"],["dry","건조 아시아와 북부 아프리카"],["europe-america","유럽과 북부 아메리카"],["africa-latin","사하라 이남 아프리카와 중·남부 아메리카"]],
};
const slugNames = {
  "k-4-01":"city-rank-province","k-4-02":"city-rank-region","k-4-07":"daytime-seoul","k-4-08":"daytime-busan",
  "k-x-02":"final-energy","k-5-07":"farm-households","k-5-17":"manufacturing","k-5-25":"grdp",
  "k-5-02":"primary-supply","k-5-03":"primary-production","k-5-04":"generation-mix","k-5-05":"renewable-production",
  "k-5-06":"renewable-production-region","k-5-09":"cultivated-area","k-5-18":"manufacturing-shipments",
  "k-5-19":"manufacturing-region","k-5-20":"manufacturing-sectors","k-6-04":"age-structure-region","k-6-05":"sex-ratio",
  "w-3-34":"global-primary-energy","w-3-35":"primary-energy-rank",
  "w-3-01":"religion-continents","w-3-02":"religion-distribution","w-3-03":"religion-rank",
  "w-3-23":"world-crops","w-3-24":"crop-yield-trade","w-3-26":"crop-continents",
  "w-3-27":"crop-trade-continents","w-3-28":"crop-trade-rank","w-3-33":"livestock-continents",
  "k-6-01":"population","k-6-03":"age-structure","k-6-06":"net-migration","k-6-07":"city-growth",
  "k-x-03":"births-deaths","k-6-08":"foreign-residents","k-6-09":"city-foreign-share","k-x-04":"foreign-types","k-7-05":"capital-share",
  "w-3-04":"religion-asia","w-3-05":"religion-africa","w-3-06":"population-history","w-3-07":"birth-death",
  "w-3-09":"population-growth","w-3-10":"migration-rate-history","w-3-11":"migration-history",
  "w-3-13":"population","w-3-14":"birth-death-country","w-3-16":"net-migration",
  "w-3-18":"urbanization-history","w-3-19":"urban-rural","w-3-20":"urban-growth","w-3-21":"rural-growth",
  "w-3-22":"urbanization-continents","w-x-01":"urbanization","w-3-25":"crop-use","w-3-29":"crop-rank",
  "w-3-30":"crops","w-3-31":"livestock","w-3-32":"livestock-rank","w-3-38":"nuclear",
  "w-3-39":"primary-energy","w-3-42":"generation-basic","w-x-02":"generation-mix",
  "w-4-02":"monsoon-industry","w-4-04":"monsoon-crops","w-5-03":"dry-industry","w-5-05":"dry-crops","w-x-04":"africa-latin-industry",
};
const titles = {
  "k-4-01":"인구 상위 도시","k-4-02":"인구 상위 도시","k-4-07":"상주인구와 주간인구","k-4-08":"상주인구와 주간인구",
  "k-x-02":"최종에너지와 전력","k-5-07":"농가 수","k-5-17":"제조업","k-5-25":"지역 내 총생산",
  "k-6-01":"총인구","k-6-03":"연령 구조","k-6-06":"인구 순이동","k-6-07":"시군 인구 증가율",
  "k-x-03":"출생과 사망","k-6-08":"외국인주민","k-6-09":"시군 외국인주민 비율","k-x-04":"외국인주민 유형",
  "k-7-05":"수도권 주요 지표","w-3-04":"종교 구성","w-3-05":"종교 구성",
  "w-3-13":"총인구","w-3-14":"출생률과 사망률","w-3-16":"순이동",
  "w-3-22":"도시화율","w-x-01":"도시화율","w-3-29":"생산 상위 국가",
  "w-3-32":"사육 두수 상위 국가","w-3-42":"발전원 구성","w-x-02":"발전원 구성",
  "w-4-02":"산업 구조","w-4-04":"작물 생산","w-5-03":"산업 구조","w-5-05":"작물 생산","w-x-04":"산업 구조",
};
export function topicFor(subject,id) {
  if (subject==="world") {
    if (/^w-3-0[1-5]$/.test(id)) return "religion";
    if (/^w-3-(0[6-9]|1[0-7])$/.test(id)) return "population";
    if (/^w-3-(1[8-9]|2[0-2])$/.test(id)||id==="w-x-01") return "urban";
    if (/^w-3-(2[3-9]|3[0-3])$/.test(id)) return "food";
    if (/^w-3-(3[4-9]|4[0-2])$/.test(id)||id==="w-x-02") return "energy";
    return "region";
  }
  if (/^k-4-/.test(id)||id==="k-x-01") return "urban";
  if (/^k-5-0[1-6]$/.test(id)||id==="k-x-02") return "energy";
  if (/^k-5-(0[7-9]|1[0-6])$/.test(id)) return "agriculture";
  if (/^k-5-(1[7-9]|2[0-5])$/.test(id)) return "industry";
  if (/^k-5-2[67]$/.test(id)) return "transport";
  if (/^k-6-0[1-7]$/.test(id)||id==="k-x-03") return "population";
  if (/^k-6-0[89]$/.test(id)||id==="k-x-04") return "multicultural";
  return "region";
}
function regionFor(id) {
  if (/^w-4-/.test(id)) return "monsoon";
  if (/^w-5-/.test(id)) return "dry";
  if (/^w-6-/.test(id)||id==="w-x-03") return "europe-america";
  if (/^w-7-/.test(id)||id==="w-x-04") return "africa-latin";
  return /^k-7-0[1-4]$/.test(id) ? "north" : "capital";
}
export function slugFor(subject,id) {
  return (subject==="korea" ? "korea-" : "world-") + (slugNames[id] || topicFor(subject,id)+"-"+id.slice(2).replace(/[^a-z0-9]+/g,"-"));
}
export function formatYear(value) {
  if (!value) return null;
  const text=String(value).trim();
  if (/^\d{4}$/.test(text)) return text+"년";
  let m=text.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?$/);
  if(m) return m[1]+"년 "+Number(m[2])+"월 "+Number(m[3])+"일";
  m=text.match(/^(\d{4})\.(\d{1,2})$/);
  if(m) return m[1]+"년 "+Number(m[2])+"월";
  m=text.match(/^(\d{4})\.01[–-](\d{2})$/);
  if(m) return m[1]+"년 1~"+Number(m[2])+"월";
  m=text.match(/^(\d{4})\.2\/2$/);
  if(m) return m[1]+"년 하반기";
  if (/^\d{4}[–-]\d{4}$/.test(text)) return null;
  return text;
}
function sourceName(id,table) {
  const original=table.source?.name||"";
  if(["k-4-01","k-4-02","k-6-01"].includes(id)) return "행정안전부 주민등록인구통계";
  if(["k-4-07","k-4-08"].includes(id)) return "국가데이터처 인구총조사";
  if(id==="k-5-07") return "국가데이터처 농림어업조사";
  if(id==="k-5-17") return "국가데이터처 광업·제조업조사";
  if(["k-5-18","k-5-19","k-5-20","k-5-21","k-5-22"].includes(id)) return "국가데이터처 광업·제조업조사";
  if(["k-5-02","k-5-03"].includes(id)) return "에너지경제연구원 지역에너지통계연보";
  if(["k-5-05","k-5-06"].includes(id)) return "한국에너지공단 신재생에너지 보급통계";
  if(id==="k-5-04"||["w-3-34","w-3-35","w-3-36"].includes(id)) return "Energy Institute 세계에너지통계";
  if(id==="k-5-09") return "국가데이터처 경지면적조사";
  if(id==="k-5-25") return "국가데이터처 지역소득";
  if(id==="k-x-02") return "에너지경제연구원 지역에너지통계연보, 한국전력공사 전력통계";
  if(["k-6-03","k-6-04","k-6-05","k-6-06"].includes(id)) return "행정안전부 주민등록인구통계";
  if(id==="k-x-03") return "국가데이터처 인구동향조사";
  if(id==="k-6-07") return "행정안전부 주민등록인구통계";
  if(id==="k-7-05") return "국가데이터처 e-지방지표";
  if(["k-6-08","k-6-09","k-x-04"].includes(id)) return "행정안전부 지방자치단체 외국인주민 현황";
  if(original.includes("Pew")) return "Pew Research Center (Our World in Data)";
  if(original.includes("UN") && ["w-3-18","w-3-19","w-3-20","w-3-21","w-3-22","w-x-01"].includes(id)) return "UN 세계도시화전망";
  if(original.includes("UN")) return "UN 세계인구전망 2024";
  if(original.includes("FAOSTAT")) return "FAOSTAT";
  if(original.includes("World Bank")) return "World Bank WDI";
  if(original.includes("Our World in Data") && ["w-3-38","w-3-42","w-x-02"].includes(id)) return "Ember (Our World in Data)";
  if(original.includes("Our World in Data")) return "Energy Institute 세계에너지통계 (Our World in Data)";
  return original.replace(/\s*·\s*/g," ").trim();
}
function unitFor(label,overall) {
  if(/출생률|사망률|순이동률/.test(label)) return "‰";
  if(/비중|비율|증가율|도시화율/.test(label)) return "%";
  if(/지수/.test(label)) return "지수";
  if(/^\d{4}$/.test(label)) return overall||"";
  if(/순위|기준/.test(label)) return "";
  if(/합계출산율/.test(label)) return "명";
  if(/자연적 증가/.test(label)) return "명";
  if(/사업체/.test(label)) return "개";
  if(/농가/.test(label)) return "가구";
  if(/사육/.test(label)) return "마리";
  if(/전력 판매/.test(label)) return "MWh";
  if(/최종에너지/.test(label)) return "천 toe";
  if(/인구|주민|출생아|사망자|순이동|종사자|근로자|유학생|이민자|외국국적동포/.test(label)) return overall?.includes("천 명")?"천 명":"명";
  if(/1인당/.test(label)) return "천 원";
  if(/총생산/.test(label)) return overall?.includes("십억")?"십억 원":"원";
  if(/생산량/.test(label)) return overall?.includes("TWh")?"TWh":overall?.includes("천 명")?"천 명":"t";
  if(["%","‰","명","천 명","t","TWh"].includes(overall)) return overall;
  return "";
}
function normalizedRows(rows,oldColumns) {
  return rows.map(r=>{
    const values=r.values.map((value,i)=>{
      if(value==="—"||value===null||value===undefined) return null;
      if(oldColumns[i]?.label==="기준") return formatYear(value);
      if(typeof value==="string") {
        const rank=value.match(/^(.+?)\s+([\d,]+)$/);
        if(rank && /^\d위$/.test(oldColumns[i]?.label||"")) return {name:rank[1],value:Number(rank[2].replaceAll(",",""))};
      }
      return value;
    });
    const out={label:r.label,values};
    if(r.group) out.group=r.group;
    if(r.continent) out.continent=r.continent;
    return out;
  });
}
function viewFrom(subject,id,table,label,viewId,variant) {
  const raw=variant||table;
  const oldCols=raw.columns||table.columns;
  const columns=oldCols.map(c=>({label:/^\d{4}(?:\.|$)/.test(c.label)?formatYear(c.label):c.label,unit:c.unit||unitFor(c.label,raw.unit||table.unit),...(c.year?{year:formatYear(c.year)}:{})}));
  const out={id:viewId,label,rowLabel:raw.rowLabel||table.rowLabel,columns,rows:normalizedRows(raw.rows||table.rows,oldCols),
    source:{name:sourceName(id,table),url:table.source?.url||""}};
  const year=formatYear(raw.year||table.year);
  const columnYears=[...new Set(columns.map(c=>c.year).filter(Boolean))];
  if(year && !columnYears.length) out.year=year;
  if(year && columnYears.length===1 && columnYears[0]===year) out.year=year;
  const note=raw.note||table.note;if(note) out.note=note;
  return out;
}
function tableFrom(subject,entry) {
  const {target,table}=entry,id=target.id;
  const views=table.variants?.length
    ? table.variants.map((v,i)=>viewFrom(subject,id,table,v.label,v.id||String(i),{...v,columns:table.columns}))
    : [viewFrom(subject,id,table,"기본","default")];
  return {id:slugFor(subject,id),title:titles[id]||table.title.replace(/^(도별|시도별|대륙별|주요국)\s*/,""),views};
}
function compare(id,title,views) {return views.length?{id,title,comparison:true,views}:null;}
function combine(subject,topic,entries) {
  const map=new Map(entries.map(e=>[e.target.id,tableFrom(subject,e)]));
  const out=[];
  const get=(id,label)=>{const t=map.get(id);map.delete(id);return t?{...t.views[0],id:label,label}:null;};
  const add=(id,title,pairs)=>{const t=compare(id,title,pairs.map(p=>get(p[0],p[1])).filter(Boolean));if(t)out.push(t);};
  if(subject==="korea"&&topic==="population") add("korea-population-compare","인구 비교",[["k-6-01","규모"],["k-6-03","연령"],["k-x-03","출생과 사망"],["k-6-06","이동"]]);
  if(subject==="korea"&&topic==="multicultural") {
    const scale=get("k-6-08","규모"),types=map.get("k-x-04");map.delete("k-x-04");
    const views=[scale,types&&{...types.views[0],id:"types",label:"유형",subviews:types.views}].filter(Boolean);
    const t=compare("korea-multicultural-compare","다문화 비교",views);if(t)out.push(t);
  }
  if(subject==="korea"&&topic==="industry") add("korea-industry-compare","산업 비교",[["k-5-17","제조업"],["k-5-25","생산"],["k-5-24","취업 구조"]]);
  if(subject==="korea"&&topic==="industry") map.delete("k-5-18");
  if(subject==="korea"&&topic==="urban") {
    add("korea-daytime-compare","상주인구와 주간인구",[["k-4-07","서울"],["k-4-08","부산"]]);
    const ranks=[get("k-4-01","도별"),get("k-4-02","권역별")].filter(Boolean);
    if(ranks.length)out.push({id:"korea-city-rank",title:"인구 상위 도시",views:ranks});
  }
  if(subject==="korea"&&topic==="agriculture") add("korea-agriculture-compare","농업 비교",[["k-5-07","농가"],["k-5-09","경지"],["k-5-15","생산"]]);
  if(subject==="korea"&&topic==="energy") add("korea-energy-compare","에너지 비교",[["k-x-02","소비와 판매"],["k-5-02","공급"],["k-5-03","생산"]]);
  if(subject==="world"&&topic==="religion") add("world-religion-compare","종교 비교",[["w-3-01","대륙"],["w-3-04","아시아"],["w-3-05","아프리카"]]);
  if(subject==="world"&&topic==="population") add("world-population-compare","인구와 이주 비교",[["w-3-13","규모"],["w-3-14","출생과 사망"],["w-3-16","이동"]]);
  if(subject==="world"&&topic==="urban") {
    add("world-urban-compare","도시화 비교",[["w-x-01","도시화율"],["w-3-19","도시와 촌락"],["w-3-20","도시 증가"],["w-3-21","촌락 증가"]]);
    map.delete("w-3-22");
  }
  if(subject==="world"&&topic==="food") add("world-food-compare","식량 비교",[["w-3-30","작물"],["w-3-31","가축"]]);
  if(subject==="world"&&topic==="energy") {
    add("world-energy-compare","에너지 비교",[["w-3-39","1차 에너지"],["w-x-02","발전"],["w-3-38","원자력"]]);
    map.delete("w-3-42");
  }
  if(subject==="world"&&topic==="region") {
    const ids=[...map.keys()];
    const region=ids.some(id=>id.startsWith("w-4-"))?"monsoon":
      ids.some(id=>id.startsWith("w-5-"))?"dry":ids.some(id=>id.startsWith("w-6-")||id==="w-x-03")?"europe-america":"africa-latin";
    const pairs=region==="monsoon"?[["w-4-02","산업 구조"],["w-4-03","수출 구성"],["w-4-04","작물"],["w-4-05","자원"]]:
      region==="dry"?[["w-5-03","산업 구조"],["w-5-02","수출 구성"],["w-5-05","작물"],["w-5-04","자원"]]:
      region==="europe-america"?[["w-x-03","산업 구조"]]:
      [["w-x-04","산업 구조"],["w-7-02","수출 구성"],["w-7-03","자원"]];
    add("world-"+region+"-compare","지역 비교",pairs);
  }
  if(subject==="korea"&&topic==="region") {
    add("korea-region-compare","지역 비교",[["k-7-05","수도권"],["k-7-01","북한"]]);
  }
  out.push(...map.values());
  return out;
}
export function compose(rawTables,gaps) {
  const subjects={};
  for(const subject of ["korea","world"]) {
    const subjectTopics=topics[subject].map(([id,title])=>{
      if(id==="climate")return{id,title,climate:true};
      const entries=rawTables.filter(e=>e.subject===subject&&topicFor(subject,e.target.id)===id);
      if(id==="region")return{id,title,regions:regionDefs[subject].map(([regionId,regionTitle])=>({id:regionId,title:regionTitle,tables:combine(subject,id,entries.filter(e=>regionFor(e.target.id)===regionId))}))};
      return{id,title,tables:combine(subject,id,entries)};
    }).filter(t=>t.climate||(t.regions?t.regions.some(r=>r.tables.length):t.tables.length));
    subjects[subject]={topics:subjectTopics};
  }
  const tableCount=Object.fromEntries(Object.entries(subjects).map(([s,v])=>[s,v.topics.reduce((n,t)=>n+(t.regions?t.regions.reduce((a,r)=>a+r.tables.length,0):t.tables?.length||0),0)]));
  return {meta:{schemaVersion:2,builtAt:"2026-09-24",sources:["data/korea-stats.js","data/country-stats.js","data-sources/stats"],tableCount,gapCount:gaps.length},subjects};
}
export {topics as topicDefinitions,regionDefs as regionDefinitions,regionFor};
