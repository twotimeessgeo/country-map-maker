// Merge a public, source-independent snapshot into the existing Statistics schema.
const newTopics = {
  korea: { disaster: "자연재해", service: "교통과 서비스업" },
  world: { industry: "산업", trade: "교통과 무역" },
};
const newRegions = {
  korea: { gangwon: "강원권", chungcheong: "충청권", honam: "호남권", yeongnam: "영남권", jeju: "제주권" },
};
const matches = {
  korea: {
    "2-2": { target: "korea-population-compare", skip: "사이트 인구가 2026년 6월로 더 최신" },
    // same rows and a newer year than the site's own views: the book view takes their place instead of sitting beside them
    "2-3": { target: "korea-population-compare", replaceView: "연령", year: "2025년" },
    "2-4": { target: "korea-population-compare", replaceView: "출생과 사망", year: "2025년" },
    "2-6": { target: "korea-multicultural-compare", replaceView: "규모", year: "2024년 11월 1일" },
    "4-1": { target: "korea-industry-compare", replaceView: "생산", year: "2024년", label: "지역 내 총생산과 산업 구조" },
    "4-2": { target: "korea-industry-compare", replaceView: "제조업" },
    // The site's land ratio uses 2025 cultivated area; the book's ratio uses 2024.
    "4-5": { target: "korea-agriculture-compare", replaceView: "농가와 경지", keepColumns: ["경지율"] },
    "4-13": { target: "korea-energy-compare", label: "에너지원별 공급" },
    "4-16": { target: "korea-renewable-production", label: "에너지원별 생산" },
    "5-11": { target: "korea-capital-compare", label: "시군 토지 이용" },
  },
  world: {
    "2-1": { target: "world-urbanization-history", replace: true },
    "3-1": { target: "world-religion-compare", replaceView: "대륙" },
    "3-2": { target: "world-religion-compare", label: "주요국 종교" },
    "4-1": { target: "world-population-compare", label: "대륙과 주요국 인구" },
    "4-4": { target: "world-population-compare", skip: "사이트 출생·사망 지표가 더 최신" },
    "5-1": { target: "world-food-compare", label: "곡물 생산" },
    "5-7": { target: "world-food-compare", label: "가축 사육" },
    "6-1": { target: "world-energy-compare", label: "1차 에너지 소비" },
    "6-7": { target: "world-energy-compare", label: "발전 구조" },
    "7-5": { target: "world-us-state-manufacturing", skip: "사이트가 미국 50개 주, 통계집은 일부 주" },
  },
};
const normalize = text => String(text).replaceAll("시·군·구", "시군구").replaceAll("시·도", "시도")
  .replaceAll("시·군", "시군").replaceAll("신재생", "신·재생");
const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "view";
function defaultSort(table) {
  if (table.type === "rank" || table.views.some(view => view.rowLabel === "순위")) return { mode: "rank" };
  if (table.views.every(view => view.rowLabel === "연도")) return { mode: "year", direction: "asc" };
  if (table.views.some(view => view.columns.length > 1 && view.columns.every(column => /^(?:19|20)\d{2}(?:년)?$/.test(column.label))))
    return { mode: "latestYearOrFirstNumeric", direction: "desc" };
  return { mode: "firstNumeric", direction: "desc" };
}
function countTables(subject) {
  return subject.topics.reduce((sum, topic) => sum + (topic.regions ? topic.regions.reduce((n, region) => n + region.tables.length, 0) : topic.tables?.length || 0), 0);
}
export function mergeBookStats(result, snapshot) {
  if (snapshot.schemaVersion !== 1) throw new Error("통계집 스냅숏 버전 오류");
  const report = { korea: { imported: 0, merged: 0, skipped: [] }, world: { imported: 0, merged: 0, skipped: [] } };
  for (const subject of ["korea", "world"]) {
    const topics = result.subjects[subject].topics;
    const findTable = id => topics.flatMap(topic => topic.regions ? topic.regions.flatMap(region => region.tables) : topic.tables || []).find(table => table.id === id);
    for (const book of snapshot.subjects[subject] || []) {
      const match = matches[subject][book.bookId];
      if (match?.skip) {
        report[subject].skipped.push({ id: book.bookId, reason: match.skip });
        continue;
      }
      if (match) {
        const target = findTable(match.target);
        if (!target) throw new Error(`병합 대상 표 없음: ${match.target}`);
        if (match.replaceView) {
          const index = target.views.findIndex(view => view.label === match.replaceView);
          if (index < 0) throw new Error(`교체할 보기 없음: ${match.target}/${match.replaceView}`);
          const old = target.views[index], candidate = book.views[0];
          if (candidate.rows.length < old.rows.length || candidate.columns.length < old.columns.length)
            throw new Error(`교체 후보 범위가 좁음: ${book.bookId}`);
          const replacement = { ...candidate, id: old.id, label: old.label, year: match.year || candidate.year,
            ...(candidate.note || old.note ? { note: candidate.note || old.note } : {}), bookSource: true };
          if (match.keepColumns) {
            const kept = match.keepColumns.map(label => {
              const column = old.columns.findIndex(item => item.label === label);
              if (column < 0) throw new Error(`보존할 열 없음: ${match.target}/${label}`);
              return column;
            });
            const oldRows = new Map(old.rows.map(row => [row.label, row]));
            if (old.rows.some(row => !candidate.rows.some(item => item.label === row.label)))
              throw new Error(`보존할 행 없음: ${match.target}`);
            // Column years are metadata, so include them in labels when retaining both periods.
            const dated = (column, year) => ({ ...column, label: `${column.label} (${column.year || year})` });
            replacement.columns = [
              ...candidate.columns.map(column => match.keepColumns.includes(column.label) ? dated(column, candidate.year) : column),
              ...kept.map(column => dated(old.columns[column], old.year)),
            ];
            replacement.rows = candidate.rows.map(row => ({ ...row,
              values: [...row.values, ...kept.map(column => oldRows.get(row.label)?.values[column] ?? null)] }));
            replacement.sources = [...new Map([...candidate.sources, ...old.sources]
              .map(source => [JSON.stringify(source), source])).values()];
          }
          target.views[index] = replacement;
          // Replace only the matching view; retain the book's distinct industry-structure views.
          for (const [extraIndex, view] of book.views.slice(1).entries()) {
            target.views.push({ ...view, id: `book-${book.bookId}-${slug(view.id || extraIndex + 1)}`,
              label: `${match.label} ${view.label}`, bookSource: true });
          }
        } else if (match.replace) {
          const old = target.views[0];
          const candidate = book.views[0];
          if (candidate.rows.length >= old.rows.length && candidate.columns.length > old.columns.length)
            target.views[0] = { ...candidate, id: old.id, label: old.label, bookSource: true };
          else report[subject].skipped.push({ id: book.bookId, reason: "사이트 표의 행·연도 범위가 더 넓음" });
        } else {
          for (const [index, view] of book.views.entries()) {
            const label = book.views.length === 1 ? match.label : `${match.label} ${view.label}`;
            target.views.push({ ...view, id: `book-${book.bookId}-${slug(view.id || index)}`, label, bookSource: true });
          }
        }
        if (!report[subject].skipped.some(item => item.id === book.bookId)) report[subject].merged++;
        continue;
      }
      let topic = topics.find(item => item.id === book.topic);
      if (!topic) {
        const title = newTopics[subject][book.topic];
        if (!title) throw new Error(`알 수 없는 주제: ${subject}/${book.topic}`);
        topic = { id: book.topic, title, tables: [] };
        const before = book.topic === "disaster" ? topics.findIndex(item => item.id === "climate") :
          book.topic === "service" ? topics.findIndex(item => item.id === "foreigners") :
          topics.findIndex(item => item.id === "region");
        topics.splice(before < 0 ? topics.length : before, 0, topic);
      }
      let tables = topic.tables;
      if (topic.regions) {
        let region = topic.regions.find(item => item.id === book.region);
        if (!region) {
          const title = newRegions[subject]?.[book.region];
          if (!title) throw new Error(`알 수 없는 권역: ${subject}/${book.region}`);
          region = { id: book.region, title, tables: [] };
          const north = topic.regions.findIndex(item => item.id === "north");
          topic.regions.splice(north < 0 ? topic.regions.length : north, 0, region);
        }
        tables = region.tables;
      }
      const title = normalize(book.title);
      const duplicate = tables.find(table => table.title === title);
      const uniqueTitle = duplicate ? `${title} — 세부 통계` : title;
      tables.push({ id: `${subject}-book-${book.bookId}`, title: uniqueTitle,
        views: book.views.map(view => ({ ...view, bookSource: true })), rank: book.type === "rank", defaultSort: defaultSort(book) });
      report[subject].imported++;
    }
    report[subject].skipped.unshift(...(snapshot.skipped[subject] || []));
    result.meta.tableCount[subject] = countTables(result.subjects[subject]);
  }
  result.meta.bookSync = Object.fromEntries(Object.entries(report).map(([subject, value]) =>
    [subject, { imported: value.imported, merged: value.merged, skipped: value.skipped.length }]));
  result.meta.sources.push("data/book-stats.json");
  return { result, report };
}
