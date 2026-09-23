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
  "k-4-03":"city-change-capital","k-4-04":"city-change-yeongnam","k-4-05":"city-change-chungcheong","k-4-06":"city-change-honam",
  "k-x-02":"final-energy","k-5-07":"farm-households","k-5-17":"manufacturing","k-5-25":"grdp",
  "k-5-02":"primary-supply","k-5-03":"primary-production","k-5-04":"generation-mix","k-5-05":"renewable-production",
  "k-5-06":"renewable-production-region","k-5-09":"cultivated-area","k-5-18":"manufacturing-shipments",
  "k-5-19":"manufacturing-region","k-5-20":"manufacturing-sectors","k-6-04":"age-structure-region","k-6-05":"sex-ratio",
  "w-3-34":"global-primary-energy","w-3-35":"primary-energy-rank",
  "w-3-01":"religion-continents","w-3-02":"religion-distribution","w-3-03":"religion-rank",
  "w-3-23":"world-crops","w-3-24":"crop-yield-trade","w-3-26":"crop-continents",
  "w-3-27":"crop-trade-continents","w-3-28":"crop-trade-rank","w-3-33":"livestock-continents",
  "k-5-08":"farm-types","k-5-12":"small-farms","k-5-21":"manufacturing-sectors-province","k-5-22":"manufacturing-sectors-region","k-5-24":"employment-structure",
  "w-3-37":"fossil-energy-balance","w-3-40":"renewable-generation-rank","w-4-01":"monsoon-gdp","w-5-01":"dry-gdp","w-5-04":"dry-fossil-production",
  "k-5-10":"paddy-field-share","k-5-11":"crop-area","k-5-13":"crop-share-national","k-5-14":"crop-share-region","k-6-02":"population-density",
  "w-3-08":"age-structure-continents","w-3-12":"migrant-destinations","w-3-15":"migration-rate-countries","w-3-17":"migrant-origins",
  "k-7-06":"capital-land-use","k-7-07":"capital-farmland","w-5-02":"dry-exports",
  "w-6-01":"us-state-manufacturing","w-7-03":"africa-export-groups",
  "k-7-01":"north-south-land","k-7-02":"north-south-crops",
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
  "k-5-08":"전·겸업 농가","k-5-12":"0.5ha 미만 농가","k-5-21":"제조업 업종","k-5-22":"제조업 업종 구성","k-5-24":"취업 구조",
  "k-5-19":"권역별 제조업","k-5-20":"업종별 제조업",
  "k-5-10":"논과 밭","k-5-11":"작물 재배 면적","k-5-13":"작물별 전국 비중","k-5-14":"작물별 지역 내 비중","k-6-02":"인구 밀도",
  "k-6-01":"총인구","k-6-03":"연령 구조","k-6-06":"인구 순이동","k-6-07":"시군 인구 증가율",
  "k-x-03":"출생과 사망","k-6-08":"외국인주민","k-6-09":"시군 외국인주민 비율","k-x-04":"외국인주민 유형",
  "k-7-05":"수도권 주요 지표","w-3-04":"종교 구성","w-3-05":"종교 구성",
  "w-3-13":"총인구","w-3-14":"출생률과 사망률","w-3-16":"순이동",
  "w-3-22":"도시화율","w-x-01":"도시화율","w-3-29":"생산 상위 국가",
  "w-3-32":"사육 두수 상위 국가","w-3-42":"발전원 구성","w-x-02":"발전원 구성",
  "w-3-03":"종교별 신자 수 상위 국가","w-3-23":"생산량과 재배 면적","w-3-24":"단위 면적 생산량과 수출 비중",
  "w-3-25":"용도별 소비","w-3-26":"대륙별 생산 비율","w-3-27":"대륙별 수출입","w-3-28":"수출입 상위 국가",
  "w-3-40":"재생에너지 발전 비율 상위 국가",
  "w-3-34":"세계 1차 에너지 공급","w-3-35":"1차 에너지 공급 상위 국가","w-3-37":"화석연료 생산과 소비",
  "w-3-08":"연령 구조","w-3-12":"이주자 목적지","w-3-15":"국가별 순이동률","w-3-17":"이주자 출신국",
  "k-7-06":"경기 주요 시군 토지 이용","k-7-07":"경기 주요 시군 경지","w-5-02":"수출 구성",
  "w-6-01":"미국 주별 제조업 출하액","w-7-03":"수출 상품군",
  "k-7-01":"남북한 경지","k-7-02":"남북한 식량작물 생산",
  "w-4-01":"GDP와 1인당 GDP","w-5-01":"GDP와 1인당 GDP","w-5-04":"화석연료 생산",
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
  if(["k-4-01","k-4-02","k-4-03","k-4-04","k-4-05","k-4-06","k-6-01"].includes(id)) return "행정안전부 주민등록인구통계";
  if(["k-4-07","k-4-08"].includes(id)) return "국가데이터처 인구총조사";
  if(id==="k-5-07") return "국가데이터처 농림어업조사";
  if(id==="k-5-17") return "국가데이터처 광업·제조업조사";
  if(["k-5-08","k-5-12"].includes(id)) return "국가데이터처 농림어업조사";
  if(["k-5-10"].includes(id)) return "국가데이터처 경지면적조사";
  if(["k-5-11","k-5-13","k-5-14"].includes(id)) return "국가데이터처 농업면적조사";
  if(id==="k-6-02") return "국토교통부 지적통계, 행정안전부 주민등록인구통계";
  if(id==="k-5-24") return "국가데이터처 경제활동인구조사";
  if(["k-5-18","k-5-19","k-5-20","k-5-21","k-5-22"].includes(id)) return "국가데이터처 광업·제조업조사";
  if(["k-5-02","k-5-03"].includes(id)) return "에너지경제연구원 지역에너지통계연보";
  if(["k-5-05","k-5-06"].includes(id)) return "한국에너지공단 신재생에너지 보급통계";
  if(id==="k-5-04"||["w-3-34","w-3-35","w-3-36","w-3-37","w-3-40","w-5-04"].includes(id)) return "Energy Institute 세계에너지통계";
  if(id==="k-5-09") return "국가데이터처 경지면적조사";
  if(id==="k-5-25") return "국가데이터처 지역소득";
  if(id==="k-x-02") return "에너지경제연구원 지역에너지통계연보, 한국전력공사 전력통계";
  if(["k-6-03","k-6-04","k-6-05","k-6-06"].includes(id)) return "행정안전부 주민등록인구통계";
  if(id==="k-x-03") return "국가데이터처 인구동향조사";
  if(id==="k-6-07") return "행정안전부 주민등록인구통계";
  if(id==="k-7-05") return "국가데이터처 e-지방지표";
  if(["k-7-06","k-7-07"].includes(id)) return "국토교통부 지적통계";
  if(["k-7-01","k-7-02"].includes(id)) return "농림축산식품부 농림축산식품 주요통계";
  if(id==="w-5-02") return "World Bank WITS";
  if(id==="w-6-01") return "U.S. Census Bureau Annual Integrated Economic Survey";
  if(id==="w-7-03") return "WTO Trade Profiles 2023";
  if(["k-6-08","k-6-09","k-x-04"].includes(id)) return "행정안전부 지방자치단체 외국인주민 현황";
  if(original.includes("Pew")) return "Pew Research Center (Our World in Data)";
  if(["w-3-12","w-3-17"].includes(id)) return "UN International Migrant Stock 2020";
  if(["w-4-01","w-5-01"].includes(id)) return "World Bank WDI, UN 세계인구전망 2024";
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
  if(/노령화지수|성비/.test(label)) return "";
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
const sourceLinks = {
  "행정안전부":"https://jumin.mois.go.kr/",
  "국토교통부":"https://stat.molit.go.kr/",
  "한국전력공사":"https://kosis.kr/statHtml/statHtml.do?orgId=101&tblId=DT_1YL4801E&conn_path=ZF",
  "UN":"https://population.un.org/wpp/",
};
function sourceItems(id,table,year,columns,rows) {
  const name=sourceName(id,table);
  const basisIndex=columns.findIndex(column=>column.label==="기준");
  const times=[year,...columns.map(column=>column.year),...(basisIndex<0?[]:rows.map(row=>row.values[basisIndex]))];
  const years=times.flatMap(value=>[...String(value||"").matchAll(/(?:19|20)\d{2}/g)].map(match=>match[0]));
  const latest=years.length?String(Math.max(...years.map(Number))):String(table.year||"").match(/\d{4}/)?.[0]||"2024";
  const item=(label,sourceYear,url)=>({name:label,year:sourceYear,url:url||sourceLinks[label]||table.source?.url||""});
  if(id==="k-6-02") return [item("행정안전부","2024"),item("국토교통부","2024")];
  if(id==="k-x-02") return [item("에너지경제연구원","2024"),item("한국전력공사","2025")];
  if(id==="k-5-09") return [item("국가데이터처","2025"),item("국토교통부","2024")];
  if(id==="k-5-04") return [item("한국전력거래소","2024")];
  if(["w-4-01","w-5-01"].includes(id)) return [item("World Bank",latest),item("UN",latest)];
  const label=name.includes("U.S. Census")?"U.S. Census Bureau":name.includes("WTO")?"WTO":
    name.includes("Pew")?"Pew Research Center":name.includes("Ember")?"Ember":name.includes("Energy Institute")?"Energy Institute":
    name.includes("FAOSTAT")?"FAOSTAT":name.includes("World Bank")?"World Bank":name.includes("UN")?"UN":
    name.includes("국토교통부")?"국토교통부":name.includes("농림축산식품부")?"농림축산식품부":
    name.includes("에너지경제연구원")?"에너지경제연구원":name.includes("한국에너지공단")?"한국에너지공단":
    name.includes("한국전력공사")?"한국전력공사":name.includes("행정안전부")?"행정안전부":"국가데이터처";
  return [item(label,latest)];
}
function publicNote(note) {
  if(!note) return null;
  if(note.includes("경지면적을 2024년")) return "경지 2025년·면적 2024년";
  if(note.includes("수력 제외")) return "수록 국가 합산·수력 제외";
  if(note.includes("국가 합산")||note.includes("국가별 신자 수")) return "수록 국가 합산";
  if(note.includes("2011년 12월 = 100")) return "2011년 = 100";
  if(note.includes("종사자 10명 이상")) return "종사자 10명 이상 사업체";
  if(note.includes("잠정")) return "잠정";
  if(note.includes("이주자 재고량") || note.includes("이동 유량이 아닌")) return "국제 이주자 재고량";
  if(note.includes("순수출입과 동일하지")) return "수급 차이, 순수출입 아님";
  if(note.includes("UN WPP 인구로 나눈")) return "UN 인구로 계산한 참고값";
  if(note.includes("중위 추계")) return "UN 중위 추계";
  if(note.includes("4개 에너지원 합계 대비")) return "4개 에너지원 합계 대비";
  return null;
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
  const columns=oldCols.map(c=>({label:/^\d{4}(?:\.|$)/.test(c.label)?formatYear(c.label):c.label.replace(/\*$/, ""),
    unit:/성비|노령화지수/.test(c.label)?"":c.unit||unitFor(c.label,raw.unit||table.unit),...(c.year?{year:formatYear(c.year)}:{})}));
  const out={id:viewId,label,rowLabel:raw.rowLabel||table.rowLabel,columns,rows:normalizedRows(raw.rows||table.rows,oldCols),
    sources:sourceItems(id,table,raw.year||table.year,columns,raw.rows||table.rows)};
  const year=formatYear(raw.year||table.year);
  const columnYears=[...new Set(columns.map(c=>c.year).filter(Boolean))];
  if(year && !columnYears.length) out.year=year;
  if(year && columnYears.length===1 && columnYears[0]===year) out.year=year;
  const note=raw.note||table.note;if(note) {out.internalNote=note;out.note=publicNote(note);if(!out.note)delete out.note;}
  return out;
}
function tableFrom(subject,entry) {
  const {target,table}=entry,id=target.id;
  const views=table.variants?.length
    ? table.variants.map((v,i)=>viewFrom(subject,id,table,v.label,v.id||String(i),{...v,columns:v.columns||table.columns}))
    : [viewFrom(subject,id,table,"기본","default")];
  return {id:slugFor(subject,id),title:titles[id]||table.title.replace(/^(도별|시도별|대륙별|주요국)\s*/,""),views};
}
function compare(id,title,views) {return views.length?{id,title,comparison:true,views}:null;}
function combine(subject,topic,entries) {
  const map=new Map(entries.map(e=>[e.target.id,tableFrom(subject,e)]));
  const out=[];
  const get=(id,label)=>{const t=map.get(id);map.delete(id);return t?{...t.views[0],id:label,label}:null;};
  const add=(id,title,pairs)=>{const t=compare(id,title,pairs.map(p=>get(p[0],p[1])).filter(Boolean));if(t)out.push(t);};
  const mergeViews=(firstId,secondId,title,firstLabel,secondLabel)=>{
    const first=map.get(firstId),second=map.get(secondId);
    if(!first||!second)return;
    map.delete(firstId);map.delete(secondId);
    out.push({id:first.id,title,views:[
      {...first.views[0],id:firstLabel,label:firstLabel,...(first.views.length>1?{subviews:first.views}:{} )},
      {...second.views[0],id:secondLabel,label:secondLabel,...(second.views.length>1?{subviews:second.views}:{} )},
    ]});
  };
  if(subject==="korea"&&topic==="population") {
    const scale=get("k-6-01","규모"),density=get("k-6-02","밀도"),sex=get("k-6-05","성비");
    if(scale&&density&&sex) {
      const densityByName=new Map(density.rows.map((r)=>[r.label,r]));
      const sexByName=new Map(sex.rows.map((r)=>[r.label,r]));
      scale.columns=[{...scale.columns[0],year:scale.year},
        {...density.columns[2],year:density.year},...sex.columns.map((column)=>({...column,year:sex.year}))];
      scale.rows=scale.rows.map((record)=>({label:record.label,values:[...record.values,densityByName.get(record.label)?.values[2]??null,...(sexByName.get(record.label)?.values||[null,null])]}));
      scale.sources=[{name:"행정안전부",year:"2026",url:sourceLinks["행정안전부"]},{name:"국토교통부",year:"2024",url:sourceLinks["국토교통부"]}];
      scale.internalNote=`인구는 ${scale.year}, 밀도와 성비는 ${density.year} 기준`;
      delete scale.year;
    }
    const views=[scale,get("k-6-03","연령"),get("k-x-03","출생과 사망"),get("k-6-06","이동")].filter(Boolean);
    const comparison=compare("korea-population-compare","시도별 인구",views);if(comparison)out.push(comparison);
  }
  if(subject==="korea"&&topic==="multicultural") {
    const scale=get("k-6-08","규모"),types=map.get("k-x-04");map.delete("k-x-04");
    const views=[scale,types&&{...types.views[0],id:"types",label:"유형",subviews:types.views}].filter(Boolean);
    const t=compare("korea-multicultural-compare","시도별 외국인주민",views);if(t)out.push(t);
  }
  if(subject==="korea"&&topic==="industry") add("korea-industry-compare","시도별 산업",[["k-5-17","제조업"],["k-5-25","생산"],["k-5-24","취업 구조"]]);
  if(subject==="korea"&&topic==="industry") map.delete("k-5-18");
  if(subject==="korea"&&topic==="industry") mergeViews("k-5-21","k-5-22","제조업 업종","시도","권역");
  if(subject==="korea"&&topic==="urban") {
    add("korea-daytime-compare","상주인구와 주간인구",[["k-4-07","서울"],["k-4-08","부산"]]);
    const ranks=[get("k-4-01","도별"),get("k-4-02","권역별")].filter(Boolean);
    if(ranks.length)out.push({id:"korea-city-rank",title:"인구 상위 도시",views:ranks});
    const changes=[["k-4-03","수도권·강원"],["k-4-04","영남"],["k-4-05","충청"],["k-4-06","호남·제주"]].map(([key,label])=>get(key,label)).filter(Boolean);
    if(changes.length)out.push({id:"korea-city-change",title:"도시 인구 변화 지수",views:changes});
  }
  if(subject==="korea"&&topic==="agriculture") {
    add("korea-agriculture-compare","시도별 농업",[["k-5-07","농가"],["k-5-09","경지"],["k-5-15","생산"]]);
    mergeViews("k-5-13","k-5-14","작물별 재배 면적 비율","전국 대비","지역 내");
  }
  if(subject==="korea"&&topic==="energy") add("korea-energy-compare","시도별 에너지",[["k-x-02","소비와 판매"],["k-5-02","공급"],["k-5-03","생산"]]);
  if(subject==="world"&&topic==="religion") add("world-religion-compare","대륙과 주요국 종교",[["w-3-01","대륙"],["w-3-04","아시아"],["w-3-05","아프리카"]]);
  if(subject==="world"&&topic==="population") {
    add("world-population-compare","대륙과 주요국 인구",[["w-3-13","규모"],["w-3-14","출생과 사망"],["w-3-16","이동"]]);
    mergeViews("w-3-06","w-3-09","인구 변화","수","비율");
    mergeViews("w-3-11","w-3-10","순이동 변화","수","비율");
  }
  if(subject==="world"&&topic==="urban") {
    add("world-urban-compare","대륙과 주요국 도시화",[["w-x-01","도시화율"],["w-3-19","도시와 촌락"],["w-3-20","도시 증가"],["w-3-21","촌락 증가"]]);
    map.delete("w-3-22");
  }
  if(subject==="world"&&topic==="food") add("world-food-compare","대륙과 주요국 식량",[["w-3-30","작물"],["w-3-31","가축"]]);
  if(subject==="world"&&topic==="energy") {
    add("world-energy-compare","대륙과 주요국 에너지",[["w-3-39","1차 에너지"],["w-x-02","발전"],["w-3-38","원자력"]]);
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
    add("world-"+region+"-compare","주요국 지표",pairs);
  }
  if(subject==="korea"&&topic==="region") {
    if([...map.keys()].some((key)=>/^k-7-0[1-4]$/.test(key)))
      add("korea-north-compare","남북한 경지와 식량",[["k-7-01","경지"],["k-7-02","식량"]]);
    else add("korea-capital-compare","주요 지표",[["k-7-05","주요 지표"],["k-7-06","토지 이용"],["k-7-07","경지"]]);
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
