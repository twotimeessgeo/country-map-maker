// Explicit semantic matches. Row/column overlap alone also matches unrelated rank lists.
export const duplicateResolutions = [
  // Korea · population and cities
  ["korea","korea-book-2-9","korea-population-compare",{label:"기간별 순 이동"}],
  ["korea","korea-book-2-10","korea-population-compare",{replace:"인구 변화"}],
  ["korea","korea-book-2-11","korea-population-compare",{label:"노년층 비율 변화"}],
  ["korea","korea-book-2-12","korea-population-compare",{label:"합계 출산율 변화"}],
  ["korea","korea-book-2-5","korea-city-rank",{labels:["권역·도 인구","권역·도 1위 도시","권역·도 2위 도시","권역·도 3위 도시"]}],
  ["korea","korea-book-3-6","korea-city-rank",{label:"도별 상위 세 도시"}],
  ["korea","korea-book-3-4","korea-daytime-compare",{labels:["서울 자치구 인구와 지가","서울 자치구 비율"]}],
  ["korea","korea-book-3-7","korea-daytime-compare",{discard:"부산 구별 상주·주간 인구는 기존 7행이 통계집 5행보다 넓음"}],
  ["korea","korea-book-2-7","korea-city-foreign-share",{labels:["상위 시군구","외국인 근로자 비율","결혼 이민자 비율","유학생 비율"]}],
  // Korea · crops, energy, industry
  ["korea","korea-crop-area","korea-crop-share-national",{label:"재배 면적 상세"}],
  ["korea","korea-book-4-6","korea-crop-share-national",{labels:["작물별 재배 면적","지역 내 비율","전국 대비 비율"],dropTargetViews:["전국 대비","지역 내"],title:"시도별 작물 재배 면적 구성"}],
  ["korea","korea-book-4-11","korea-generation-mix",{label:"시도별 발전량"}],
  ["korea","korea-book-4-15","korea-generation-mix",{label:"발전량 비율 변화"}],
  ["korea","korea-renewable-production-region","korea-renewable-production",{label:"권역별 생산량"}],
  ["korea","korea-book-4-28","korea-energy-compare",{label:"시도별 공급 비율"}],
  ["korea","korea-manufacturing-region","korea-industry-compare",{label:"권역별 제조업"}],
  ["korea","korea-book-4-21","korea-industry-compare",{label:"지역 내 총생산 비율 변화"}],
  ["korea","korea-book-4-22","korea-industry-compare",{label:"제조업 출하액 비율 변화"}],
  ["korea","korea-book-4-3","korea-manufacturing-sectors-province",{label:"출하액 상위 업종"}],
  ["korea","korea-book-4-4","korea-manufacturing-sectors-province",{label:"주요 업종 출하액 비율"}],
  ["korea","korea-book-4-19","korea-manufacturing-sectors",{label:"사업체·종사자·출하액"}],
  // World · religion, population and cities
  ["world","world-book-3-3","world-religion-distribution",{replace:"기본",title:"종교별 신자의 대륙별 분포"}],
  ["world","world-book-3-4","world-religion-rank",{replaceAll:true,title:"종교별 신자 수 상위 국가"}],
  ["world","world-birth-death","world-population-compare",{discard:"대륙 출생·사망은 비교 표에 이미 있고 비교 표의 국가 행이 더 많음"}],
  ["world","world-book-4-2","world-population-history",{label:"대륙별 장기 변화"}],
  ["world","world-book-4-7","world-migration-history",{prefix:"대륙별"}],
  ["world","world-book-4-6","world-population-compare",{label:"국제 인구 이동"}],
  ["world","world-book-2-2","world-urbanization-history",{label:"주요 국가"}],
  ["world","world-book-2-3","world-urban-compare",{discard:"도시·촌락 인구는 기존 비교 표와 같은 범위·연도"}],
  ["world","world-book-2-4","world-urban-compare",{labels:["대륙별 도시 인구 증가율","대륙별 촌락 인구 증가율"]}],
  // World · food and energy
  ["world","world-crop-continents","world-food-compare",{label:"대륙별 곡물"}],
  ["world","world-livestock-continents","world-food-compare",{label:"대륙별 가축"}],
  ["world","world-book-5-3","world-crop-rank",{replaceAll:true,title:"주요 식량 작물 생산 상위 국가"}],
  ["world","world-book-5-8","world-livestock-rank",{replaceAll:true,title:"가축 사육 두수 상위 국가"}],
  ["world","world-book-5-5","world-crop-trade-rank",{replaceAll:true,title:"곡물 수출입 상위 국가",rename:{"밀 비율":"밀 수출 비율","쌀 비율":"쌀 수출 비율","옥수수 비율":"옥수수 수출 비율"}}],
  ["world","world-book-5-6","world-crop-trade-rank",{rename:{"밀 비율":"밀 수입 비율","쌀 비율":"쌀 수입 비율","옥수수 비율":"옥수수 수입 비율"}}],
  ["world","world-book-5-4","world-crop-trade-continents",{labels:["밀 수출입 상세","쌀 수출입 상세","옥수수 수출입 상세"]}],
  ["world","world-book-6-2","world-global-primary-energy",{label:"소비 구조 변화",title:"세계 1차 에너지 공급과 소비"}],
  ["world","world-book-6-4","world-fossil-energy-balance",{label:"주요국 석유"}],
  ["world","world-book-6-5","world-fossil-energy-balance",{label:"주요국 천연가스"}],
  ["world","world-book-6-6","world-fossil-energy-balance",{label:"주요국 석탄"}],
  ["world","world-book-6-17","world-renewable-generation-rank",{dropTargetViews:["풍력","태양광"],title:"신·재생 에너지원별 발전량 상위 국가"}],
  // Regional subject tables with identical concepts and disjoint country sets
  ["world","world-book-8-6","world-book-7-9",{prefix:"아프리카·중남미"}],
  ["world","world-book-9-6","world-book-7-9",{prefix:"몬순 아시아·오세아니아"}],
  ["world","world-book-10-6","world-book-7-9",{prefix:"건조 아시아·북부 아프리카",title:"주요 국가의 품목별 무역 구조"}],
  ["world","world-book-8-2","world-book-7-2",{prefix:"아프리카·중남미"}],
  ["world","world-book-9-2","world-book-7-2",{prefix:"몬순 아시아·오세아니아"}],
  ["world","world-book-10-2","world-book-7-2",{prefix:"건조 아시아·북부 아프리카",title:"주요 국가의 산업 구조"}],
];

const normalizeCopy = text => String(text).replaceAll("비중","비율").replaceAll("순이동","순 이동")
  .replaceAll("주요국","주요 국가").replaceAll("이주민","이주자");
const viewNames = {
  "korea-city-foreign-share": {"기본":"시군 비율"},
  "korea-industry-compare": {"지역 내 총생산과 산업 구조 기본":"지역 내 총생산",
    "지역 내 총생산과 산업 구조 생산액 비율":"생산액 비율","지역 내 총생산과 산업 구조 취업자 비율":"취업자 비율"},
  "korea-generation-mix": {"기본":"에너지원별 비율"},
  "korea-renewable-production": {"기본":"시도별 생산량"},
  "world-book-3-5": {"기본":"대륙별"},
  "world-global-primary-energy": {"기본":"공급"},
  "world-urbanization-history": {"기본":"대륙별"},
  "world-population-compare": {"대륙과 주요 국가 인구":"주요 국가"},
};
const key = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "view";
function tablesFor(topic) { return topic.regions ? topic.regions.flatMap(region => region.tables) : topic.tables || []; }
function find(subject, id) {
  for (const topic of subject.topics) {
    if (topic.regions) for (const region of topic.regions) {
      const index=region.tables.findIndex(table=>table.id===id);
      if(index>=0)return {table:region.tables[index],list:region.tables,index};
    }
    else {
      const index=(topic.tables||[]).findIndex(table=>table.id===id);
      if(index>=0)return {table:topic.tables[index],list:topic.tables,index};
    }
  }
  return null;
}
function copiedView(view,source,number,label) {
  return {...view,id:`merged-${source.id}-${key(view.id||number)}`,label};
}
export function dedupeStatistics(result) {
  const report=[];
  for(const [subjectName,fromId,intoId,config] of duplicateResolutions) {
    const subject=result.subjects[subjectName],from=find(subject,fromId),into=find(subject,intoId);
    if(!from||!into||from.table===into.table)throw new Error(`중복 병합 대상 누락: ${subjectName} ${fromId} → ${intoId}`);
    const source=from.table,target=into.table;
    if(config.discard) report.push({subject:subjectName,from:fromId,into:intoId,action:"삭제",reason:config.discard});
    else if(config.replaceAll) {
      target.views=source.views.map((view,index)=>copiedView(view,source,index,config.rename?.[view.label]||view.label));
      target.rank=source.rank||target.rank;
      report.push({subject:subjectName,from:fromId,into:intoId,action:"교체",reason:"통계집의 행·항목이 더 많음"});
    } else if(config.replace) {
      const index=target.views.findIndex(view=>view.label===config.replace);
      if(index<0)throw new Error(`교체할 보기 없음: ${intoId}/${config.replace}`);
      const old=target.views[index],candidate=source.views[0];
      if(candidate.rows.length<old.rows.length||candidate.columns.length<old.columns.length)
        throw new Error(`교체 후보 범위가 좁음: ${fromId}`);
      target.views[index]={...candidate,id:old.id,label:old.label};
      report.push({subject:subjectName,from:fromId,into:intoId,action:"교체",reason:"행·기간이 더 넓음"});
    } else {
      if(config.dropTargetViews)target.views=target.views.filter(view=>!config.dropTargetViews.includes(view.label));
      const existing=new Set(target.views.map(view=>view.label));
      for(const [index,view] of source.views.entries()) {
        const explicit=config.labels?.[index]||config.rename?.[view.label]||(source.views.length===1?config.label:null);
        const raw=explicit||(config.prefix?`${config.prefix} ${view.label==="기본"?"":view.label}`.trim():view.label);
        let label=raw;
        if(existing.has(label))label=`${raw} (${source.title})`;
        existing.add(label);
        target.views.push(copiedView(view,source,index,label));
      }
      report.push({subject:subjectName,from:fromId,into:intoId,action:"보기 병합",reason:"별도 행·열·기간 보존"});
    }
    if(config.title)target.title=config.title;
    from.list.splice(from.index,1);
  }
  for(const [subjectName,subject] of Object.entries(result.subjects)) {
    for(const topic of subject.topics)for(const table of tablesFor(topic)) {
      table.title=normalizeCopy(table.title);
      for(const view of table.views) {
        view.label=normalizeCopy(viewNames[table.id]?.[view.label]||view.label);
        for(const item of [view,...(view.subviews||[])]) {
          item.rowLabel=normalizeCopy(item.rowLabel);
          for(const column of item.columns)column.label=normalizeCopy(column.label);
        }
      }
    }
    result.meta.tableCount[subjectName]=subject.topics.reduce((sum,topic)=>sum+tablesFor(topic).length,0);
  }
  result.meta.duplicateMerges=report.length;
  return {result,report};
}
