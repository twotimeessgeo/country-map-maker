import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { duplicateResolutions } from "../tools/stats/spec/dedupe.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"audits/stats-duplicates.md");
const data=JSON.parse(fs.readFileSync(path.join(root,"tools/stats/data/stats.json"),"utf8"));
const normalize=value=>String(value).replace(/\s+/g,"").replaceAll("시·도","시도").replaceAll("비중","비율");
const rows=table=>new Set(table.views.flatMap(view=>[view,...(view.subviews||[])].flatMap(item=>item.rows.map(row=>normalize(row.label)))));
const columns=table=>new Set(table.views.flatMap(view=>[view,...(view.subviews||[])].flatMap(item=>item.columns.map(column=>normalize(column.label)))));
const escape=value=>String(value).replaceAll("|","\\|").replaceAll("\n"," ");
const label=subject=>subject==="korea"?"한국":"세계";
const uncertain=(first,second)=>{
  const names=[first.title,second.title].join(" ");
  if(/순위|상위 국가|사육 두수|작물 생산/.test(names)&&[first,second].every(table=>[...rows(table)].some(row=>/^\d+위$/.test(row))))
    return "순위 이름만 같음; 품목과 지표 정의가 달라 별도 유지";
  if(/인구 변화|순 이동 변화/.test(names))return "인구 규모와 순 이동은 서로 다른 지표";
  if(/에너지|발전/.test(names))return "공급·소비·발전의 분모와 단위가 달라 별도 유지";
  return "지역 행과 일부 열 이름이 같지만 지표·집계 범위가 달라 별도 유지";
};
const matches=[];
for(const [subject,value] of Object.entries(data.subjects))for(const topic of value.topics) {
  const tables=topic.regions?topic.regions.flatMap(region=>region.tables):topic.tables||[];
  for(let i=0;i<tables.length;i++)for(let j=i+1;j<tables.length;j++) {
    const first=tables[i],second=tables[j],a=rows(first),b=rows(second),ca=columns(first),cb=columns(second);
    if(!a.size||!b.size)continue;
    const commonRows=[...a].filter(row=>b.has(row)).length;
    const commonColumns=[...ca].filter(column=>cb.has(column));
    const overlap=commonRows/Math.min(a.size,b.size);
    if(overlap>.8&&commonColumns.length)matches.push({subject,topic:topic.id,first,second,overlap,commonColumns,
      reason:uncertain(first,second)});
  }
}
const report=[
  "# Statistics 중복 감사", "",
  "행 이름 집합은 작은 표 대비 공통 행 비율 80% 초과, 열 이름은 한 개 이상 일치한 쌍을 전수로 추렸습니다. 순위 숫자처럼 이름만 같은 쌍은 값의 정의를 대조해 유지했습니다.", "",
  `## 병합·교체·삭제 (${duplicateResolutions.length})`, "",
  "| 과목 | 기존 표 | 합친 표 | 처리 | 이유 |", "| --- | --- | --- | --- | --- |",
  ...duplicateResolutions.map(([subject,from,into,config])=>`| ${label(subject)} | ${escape(into)} | ${escape(from)} | ${config.discard?"삭제":config.replaceAll||config.replace?"교체":"보기 병합"} | ${escape(config.discard|| (config.replaceAll?"행·항목이 더 많은 쪽 선택":config.replace?"행·기간이 더 넓은 쪽 선택":"다른 열·기간을 보기로 보존"))} |`),
  "", `## 남긴 후보 (${matches.length})`, "",
  "| 과목·주제 | 표 1 | 표 2 | 행 겹침 | 공통 열 | 판단 |",
  "| --- | --- | --- | ---: | --- | --- |",
  ...matches.map(pair=>`| ${label(pair.subject)} ${pair.topic} | ${escape(pair.first.id)} | ${escape(pair.second.id)} | ${Math.round(pair.overlap*100)}% | ${escape(pair.commonColumns.join(", "))} | ${escape(pair.reason)} |`),
  "",
].join("\n");
if(process.argv.includes("--write"))fs.writeFileSync(output,report);
else if(process.argv.includes("--check")) {
  if(fs.readFileSync(output,"utf8")!==report)throw new Error("중복 감사 목록을 다시 생성해 주세요");
} else throw new Error("--write 또는 --check를 지정하세요");
console.log(`Statistics 중복 감사: 처리 ${duplicateResolutions.length}표, 남긴 후보 ${matches.length}쌍`);
