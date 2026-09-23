import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UNIT_NAMES = {
  I: "세계화와 지역 이해",
  II: "세계의 자연환경과 인간 생활",
  III: "세계의 인문 환경과 인문 경관",
  IV: "몬순 아시아와 오세아니아",
  V: "건조 아시아와 북부 아프리카",
  VI: "유럽과 북부 아메리카",
  VII: "사하라 이남 아프리카와 중·남부 아메리카",
  VIII: "평화와 공존의 세계",
};

const notesDir = path.join(root, "notes");
const postsDir = path.join(notesDir, "posts");
const cutData = JSON.parse(fs.readFileSync(path.join(root, "tools/cut/data/ebsi_geo_data.json"), "utf8"));
const posts = fs.readdirSync(postsDir).filter((name) => name.endsWith(".md"))
  .map((name) => readPost(path.join(postsDir, name)))
  .sort((a, b) => b.date.localeCompare(a.date));

for (const post of posts) {
  const directory = path.join(notesDir, post.slug);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  const { html, headings, images } = renderMarkdown(post);
  const record = cutData.records.find((entry) => entry.subject === subjectName(post.subject)
    && `${entry.school_year}-${String(entry.month).padStart(2, "0")}` === post.exam);
  const ogImage = renderOgImage(post, record, directory);
  const article = renderArticle(post, html, headings, record, posts, ogImage);
  fs.writeFileSync(path.join(directory, "index.html"), article);
  console.log(`${post.slug}: ${headings.length}개 머리말, ${images}개 그림`);
}
fs.writeFileSync(path.join(notesDir, "index.html"), renderList(posts));

function readPost(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`front matter가 없습니다: ${filename}`);
  const meta = {};
  let listKey = "";
  for (const line of match[1].split(/\r?\n/)) {
    const key = line.match(/^([a-z]+):\s*(.*)$/);
    const item = line.match(/^\s+-\s+(.+)$/);
    if (key) {
      listKey = key[1];
      meta[listKey] = key[2] ? parseMetaValue(key[2].trim()) : [];
    } else if (item && Array.isArray(meta[listKey])) {
      meta[listKey].push(parseMetaValue(item[1].trim()));
    } else if (line.trim()) throw new Error(`front matter 형식 오류: ${line}`);
  }
  for (const field of ["title", "date", "subject", "exam", "sources"]) {
    if (!meta[field]) throw new Error(`${filename}: ${field}가 없습니다`);
  }
  if (!Array.isArray(meta.sources) || !meta.sources.every((url) => /^https:\/\//.test(url))) {
    throw new Error(`${filename}: sources 형식 오류`);
  }
  return { ...meta, slug: path.basename(filename, ".md"), body: match[2] };
}

function parseMetaValue(value) {
  return /^[{[]/.test(value) ? JSON.parse(value) : value;
}

function renderMarkdown(post) {
  const { slug } = post;
  const lines = post.body.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  const headings = [];
  let imageCount = 0;
  let firstImage = true;
  let currentQuestion = null;
  const imagePattern = /^!\[([^\]]*)\]\((images\/[a-zA-Z0-9._-]+\.webp)\)$/;
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line === ":::figures") {
      const figures = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        if (lines[i].trim()) {
          const match = lines[i].trim().match(imagePattern);
          if (!match) throw new Error(`${slug}: 그림 묶음 형식 오류: ${lines[i]}`);
          figures.push(renderFigure(match, slug, firstImage, currentQuestion, post.exam));
          firstImage = false; imageCount++;
        }
        i++;
      }
      if (lines[i]?.trim() !== ":::") throw new Error(`${slug}: 그림 묶음 닫기 누락`);
      i++;
      output.push(`<div class="notes-figures">${figures.join("\n")}</div>`);
      continue;
    }
    const image = line.match(imagePattern);
    if (image) {
      output.push(renderFigure(image, slug, firstImage, currentQuestion, post.exam));
      firstImage = false; imageCount++; i++; continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const title = heading[2];
      if (level === 2) {
        const question = title.match(/^(\d{1,2})번$/);
        currentQuestion = question ? Number(question[1]) : null;
        const id = question ? `q${question[1]}` : title === "서두" ? "intro" : title === "맺음" ? "ending" : slugify(title);
        if (currentQuestion) headings.push({ id, title });
        output.push(`<section class="notes-section tw-reveal" id="${escapeHtml(id)}">${currentQuestion ? `<h2 class="notes-question-number" aria-label="${currentQuestion}번">${String(currentQuestion).padStart(2, "0")}</h2><!--QUESTION_META_${currentQuestion}--><!--LINEAGE_${currentQuestion}-->` : ""}`);
      } else output.push(`<h3>${inline(title)}</h3>`);
      // Close sections before opening the next section in the final pass.
      i++; continue;
    }
    if (line.startsWith("> ")) {
      const quoted = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) quoted.push(lines[i++].trim().slice(2));
      output.push(`<blockquote>${quoted.map((part) => inline(part)).join("<br>")}</blockquote>`);
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) items.push(`<li>${inline(lines[i++].trim().slice(2))}</li>`);
      output.push(`<ul>${items.join("")}</ul>`); continue;
    }
    if (line.startsWith("|") && lines[i + 1]?.trim().match(/^\|?[\s:|-]+\|?$/)) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => inline(cell.trim()));
      const header = cells(lines[i]); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = cells(lines[i++]);
        rows.push(`<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`);
      }
      output.push(`<div class="tw-table-wrap"><table class="tw-table"><thead><tr>${header.map((cell) => `<th scope="col">${cell}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`);
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(?:#{2,3} |!\[|:::figures|> |[-*] |\|)/.test(lines[i].trim())) paragraph.push(lines[i++].trim());
    if (!paragraph.length) throw new Error(`${slug}: 알 수 없는 마크다운: ${lines[i]}`);
    output.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
  let html = output.join("\n");
  html = html.replace(/<section class="notes-section tw-reveal"/g, "</section>\n<section class=\"notes-section tw-reveal\"");
  html = html.replace(/^<\/section>\n/, "") + "\n</section>";
  if (!headings.length) throw new Error(`${slug}: 머리말이 없습니다`);
  return { html, headings, images: imageCount };
}

function renderFigure(match, slug, first, question, exam) {
  const [, caption, imagePath] = match;
  const fullPath = path.join(notesDir, slug, imagePath);
  if (!fs.existsSync(fullPath)) throw new Error(`그림을 찾지 못했습니다: ${fullPath}`);
  const { width, height } = webpDimensions(fullPath);
  const label = caption ? `${caption} 크게 보기` : "그림 크게 보기";
  const figureId = `fig-${path.basename(imagePath, ".webp").replace("figure-", "")}`;
  const current = question && caption === `${exam.slice(0, 4)}학년도 ${Number(exam.slice(5))}월 ${question}번`;
  const past = /^20\d{2}학년도 (?:6월|9월|수능)/.test(caption);
  const pill = current ? "이번 문항" : past ? "기출" : "";
  return `<figure class="notes-figure" id="${figureId}"${question ? ` data-question="${question}"` : ""}><div class="notes-image-plate"><button class="notes-image-button" type="button" data-lightbox-src="${escapeHtml(imagePath)}" data-lightbox-caption="${escapeHtml(caption)}" aria-label="${escapeHtml(label)}"><img src="${escapeHtml(imagePath)}" alt="${escapeHtml(caption)}" width="${width}" height="${height}" loading="${first ? "eager" : "lazy"}" decoding="async"></button>${pill ? `<span class="notes-figure-pill${current ? " is-current" : ""}">${pill}</span>` : ""}</div>${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`;
}

function webpDimensions(filename) {
  const buffer = fs.readFileSync(filename);
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") throw new Error(`WebP 형식 오류: ${filename}`);
  const kind = buffer.toString("ascii", 12, 16);
  if (kind === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  if (kind === "VP8X") return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  if (kind === "VP8L") return { width: 1 + (((buffer[22] & 0x3f) << 8) | buffer[21]), height: 1 + (((buffer[24] & 0x0f) << 10) | (buffer[23] << 2) | ((buffer[22] & 0xc0) >> 6)) };
  throw new Error(`지원하지 않는 WebP: ${filename}`);
}

function inline(value) {
  return value.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part) => {
    const strong = part.match(/^\*\*(.+)\*\*$/);
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (strong) return `<strong>${escapeHtml(strong[1])}</strong>`;
    if (link) return `<a href="${escapeHtml(link[2])}">${escapeHtml(link[1])}</a>`;
    return escapeHtml(part);
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
function slugify(value) { return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, ""); }
function subjectName(value) { return value === "world" ? "세계지리" : value === "korea" ? "한국지리" : value; }
function formatDate(value) { const [y, m, d] = value.split("-"); return `${y}. ${Number(m)}. ${Number(d)}.`; }
function hasNumber(value) { return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)); }
function questionMeta(post, record, number) {
  const row = post.q?.find((entry) => Number(entry.n) === number);
  const item = record?.items?.find((entry) => Number(entry.question) === number);
  const cells = [];
  if (row?.unit) cells.push(`<span>${escapeHtml(UNIT_NAMES[row.unit] || row.unit)}</span>`);
  if (hasNumber(item?.points)) cells.push(`<span>배점 ${escapeHtml(item.points)}점</span>`);
  if (hasNumber(item?.national_rate)) cells.push(`<span>오답률 ${+(100 - Number(item.national_rate)).toFixed(1)}%</span>`);
  return cells.length ? `<div class="tw-meta-list notes-question-meta">${cells.join("")}</div>` : "";
}
function renderLineage(post, number) {
  const heading = new RegExp(`^## ${number}번$`, "m");
  const start = post.body.search(heading);
  if (start < 0) return "";
  const afterHeading = post.body.slice(start).indexOf("\n") + start + 1;
  const rest = post.body.slice(afterHeading);
  const next = rest.search(/^## (?:\d+번|맺음)$/m);
  const section = next < 0 ? rest : rest.slice(0, next);
  const figures = [...section.matchAll(/^!\[([^\]]+)\]\(images\/(figure-\d+\.webp)\)$/gm)]
    .map(([, caption, filename]) => ({ caption, filename, match: caption.match(/^(20\d{2})학년도 (6월|9월|수능) (\d+)번$/) }))
    .filter((item) => item.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]) || ({"6월":6,"9월":9,"수능":11}[a.match[2]] - {"6월":6,"9월":9,"수능":11}[b.match[2]]));
  const isCurrent = ({match}) => `${match[1]}-${match[2] === "수능" ? "11" : match[2] === "9월" ? "09" : "06"}` === post.exam && Number(match[3]) === number;
  if (!figures.some((figure) => !isCurrent(figure))) return "";
  const chips = figures.map((figure) => {
    const { filename, match } = figure;
    const current = isCurrent(figure);
    const label = `${match[1]} ${match[2]} ${match[3]}`;
    return `<a href="#fig-${filename.slice(7, -5)}" class="notes-lineage-chip${current ? " is-current" : ""}">${escapeHtml(label)}</a>`;
  }).join("");
  return `<nav class="notes-lineage" aria-label="${number}번 기출 계보">${chips}</nav>`;
}
function examSummary(record) {
  if (!record) return "";
  const cells = [];
  if (hasNumber(record.raw1)) cells.push(`<span>1등급 원점수 ${escapeHtml(record.raw1)}점</span>`);
  if (hasNumber(record.standard_score_max)) cells.push(`<span>표준점수 최고점 ${escapeHtml(record.standard_score_max)}점</span>`);
  if (!cells.length) return "";
  const url = `../../tools/cut/index.html?subject=${encodeURIComponent(record.subject)}&exam=${encodeURIComponent(`${record.school_year}-${String(record.month).padStart(2, "0")}`)}`;
  return `<div class="tw-meta-list notes-exam-summary">${cells.join("")}<a href="${url}">Archive에서 보기</a></div>`;
}
function nav(depth, current) {
  const prefix = "../".repeat(depth);
  const links = [
    ["Climate Atlas", `${prefix}tools/climate/index.html`, false],
    ["Archive", `${prefix}tools/cut/index.html`, false],
    ["Notes", `${prefix}notes/index.html`, current],
  ];
  return `<header class="tw-nav is-static"><nav class="tw-nav-inner" aria-label="Promenade Geography"><a class="tw-brand" href="${prefix}index.html" aria-label="Promenade Geography home"><span lang="en">Promenade</span></a><div class="tw-nav-links">${links.map(([label, href, active]) => `<a class="tw-nav-link" lang="en" href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</div><span class="tw-nav-spacer"></span><details class="tw-nav-menu"><summary aria-label="메뉴"><span class="tw-nav-menu-icon" aria-hidden="true"></span></summary><div class="tw-nav-menu-panel">${links.map(([label, href, active]) => `<a lang="en" href="${href}"${active ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</div></details></nav></header>`;
}
function head(title, depth, og = {}) {
  const prefix = "../".repeat(depth);
  return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Promenade Geography</title><meta name="theme-color" content="#ffffff">${og.image ? `<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:image" content="${escapeHtml(og.image)}">` : ""}<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css"><link rel="stylesheet" href="${prefix}ds/fonts.css"><link rel="stylesheet" href="${prefix}ds/tokens.css"><link rel="stylesheet" href="${prefix}ds/base.css?v=51"><link rel="stylesheet" href="${prefix}ds/components.css?v=51"><link rel="stylesheet" href="${prefix}ds/patterns.css"><link rel="stylesheet" href="${prefix}notes/notes.css?v=20260924d"></head><body>`;
}
function questionRows(post, record) {
  return Array.isArray(post.q) ? post.q.map((entry) => {
    const item = record?.items?.find((candidate) => Number(candidate.question) === Number(entry.n));
    return { ...entry, points: hasNumber(item?.points) ? Number(item.points) : null, wrongRate: hasNumber(item?.national_rate) ? +(100 - Number(item.national_rate)).toFixed(1) : null };
  }) : [];
}
function renderHeroChart(post, record) {
  const rows = questionRows(post, record);
  if (rows.length !== 20) return "";
  const bars = rows.map((row) => {
    const rate = row.wrongRate;
    const tooltip = rate === null ? `${row.n}번 오답률 하위 5문항` : `${row.n}번 오답률 ${rate}%${row.points ? ` ${row.points}점` : ""}`;
    return `<a href="#q${row.n}" class="notes-overview-item" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}"><span class="notes-overview-plot">${rate === null ? '<span class="notes-overview-tick"></span>' : `<span class="notes-overview-bar" style="height:${rate}%"></span>`}</span><span class="notes-overview-number">${row.n}</span></a>`;
  }).join("");
  const runs = [];
  for (const row of rows) {
    const previous = runs.at(-1);
    if (previous?.unit === row.unit) previous.count++;
    else runs.push({ unit: row.unit, start: row.n, count: 1 });
  }
  const units = runs.map((run) => `<span style="grid-column:${run.start} / span ${run.count}" title="${escapeHtml(UNIT_NAMES[run.unit] || run.unit)}">${escapeHtml(run.unit)}</span>`).join("");
  return `<section class="notes-overview" aria-label="문항별 오답률"><span class="notes-overview-label">문항별 오답률</span><div class="notes-overview-bars">${bars}</div><div class="notes-overview-units" aria-label="대단원">${units}</div></section>`;
}
function renderEndCards(post) {
  const archiveUrl = `../../tools/cut/index.html?subject=${encodeURIComponent(subjectName(post.subject))}&exam=${encodeURIComponent(post.exam)}`;
  const original = post.sources.map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${index === 0 ? "상" : index === 1 ? "하" : `원문 ${index + 1}`}</a>`).join("");
  return `<div class="notes-end-cards"><a class="tw-card is-soft notes-end-card" href="${archiveUrl}"><span>Archive</span><strong>${escapeHtml(post.exam.split("-")[0])}학년도 ${Number(post.exam.split("-")[1])}월 ${escapeHtml(subjectName(post.subject))}</strong><span aria-hidden="true">↗</span></a><div class="tw-card is-soft notes-end-card"><span>원문</span><div class="notes-source-links">${original}</div></div></div>`;
}
function adjacentPosts(post, posts) {
  if (posts.length < 2) return "";
  const index = posts.findIndex((entry) => entry.slug === post.slug);
  const older = posts[index + 1];
  const newer = posts[index - 1];
  return `<nav class="notes-adjacent" aria-label="다른 글">${older ? `<a href="../${encodeURIComponent(older.slug)}/index.html">이전 글 <span>${escapeHtml(older.title)}</span></a>` : ""}${newer ? `<a href="../${encodeURIComponent(newer.slug)}/index.html">다음 글 <span>${escapeHtml(newer.title)}</span></a>` : ""}</nav>`;
}
function renderOgImage(post, record, directory) {
  const rows = questionRows(post, record);
  if (rows.length !== 20) return null;
  const output = path.join(directory, "og.png");
  const bars = rows.map((row, index) => {
    const x = 128 + index * 47;
    const height = row.wrongRate === null ? 3 : Math.max(2, +(row.wrongRate * 1.45).toFixed(1));
    return `<rect x="${x}" y="${+(548 - height).toFixed(1)}" width="30" height="${height}" fill="${row.wrongRate === null ? "#b4b4b4" : "#0d0d0d"}"/>`;
  }).join("");
  const titleChars = [...post.title];
  const titleLine1 = escapeHtml(titleChars.slice(0, 11).join(""));
  const titleLine2 = escapeHtml(titleChars.slice(11).join(""));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#fff"/><text x="128" y="80" font-family="TWK Lausanne,Pretendard,Arial,sans-serif" font-size="24" fill="#5d5d5d">Promenade Geography / Notes</text><text x="128" y="206" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="62" font-weight="600" fill="#0d0d0d">${titleLine1}</text><text x="128" y="288" font-family="Pretendard,Apple SD Gothic Neo,sans-serif" font-size="62" font-weight="600" fill="#0d0d0d">${titleLine2}</text><text x="128" y="370" font-family="TWK Lausanne,Pretendard,Arial,sans-serif" font-size="24" fill="#5d5d5d">${formatDate(post.date)}   ${escapeHtml(subjectName(post.subject))}</text><line x1="128" x2="1080" y1="549" y2="549" stroke="#0d0d0d" stroke-width="2"/>${bars}<text x="128" y="590" font-family="TWK Lausanne,Pretendard,Arial,sans-serif" font-size="18" fill="#737373">01</text><text x="1040" y="590" font-family="TWK Lausanne,Pretendard,Arial,sans-serif" font-size="18" fill="#737373">20</text></svg>`;
  const checksum = createHash("sha256").update(svg).digest("hex");
  const checksumPath = path.join(postsDir, `${post.slug}.og.sha256`);
  const rendered = process.env.NOTES_SKIP_OG_CONVERT !== "1"
    ? spawnSync("python3", [path.join(root, "scripts/render-notes-og.py"), output], { input: svg, encoding: "utf8", timeout: 30000 }).status === 0
    : false;
  if (rendered) fs.writeFileSync(checksumPath, `${checksum}\n`);
  const verified = fs.existsSync(output) && fs.existsSync(checksumPath)
    && fs.readFileSync(checksumPath, "utf8").trim() === checksum;
  if (!verified) {
    console.log(`${post.slug}: PNG 변환 도구가 없거나 공유 이미지가 오래되어 og:image 생략`);
    return null;
  }
  const siteOrigin = process.env.NOTES_SITE_ORIGIN || "https://twotimeessgeo.github.io/country-map-maker/";
  return new URL(`notes/${encodeURIComponent(post.slug)}/og.png`, siteOrigin.endsWith("/") ? siteOrigin : `${siteOrigin}/`).href;
}
function renderArticle(post, rawHtml, headings, record, posts, ogImage) {
  let article = rawHtml.replace(/<!--QUESTION_META_(\d+)-->/g, (_, number) => questionMeta(post, record, Number(number)));
  article = article.replace(/<!--LINEAGE_(\d+)-->/g, (_, number) => renderLineage(post, Number(number)));
  article = article.replace(/(<section class="notes-section tw-reveal" id="intro">[\s\S]*?<\/section>)/, (section) => section + examSummary(record));
  const rows = new Map(questionRows(post, record).map((row) => [`q${row.n}`, row]));
  const toc = headings.map(({ id }) => {
    const row = rows.get(id);
    const bar = row?.wrongRate !== null && row?.wrongRate !== undefined ? `<span class="notes-toc-mini" aria-hidden="true"><i style="width:${(row.wrongRate * .32).toFixed(1)}px"></i></span>` : "";
    return `<a href="#${escapeHtml(id)}" data-question="${row.n}" aria-label="${row.n}번"><span class="notes-toc-number">${String(row.n).padStart(2, "0")}</span>${bar}</a>`;
  }).join("");
  const mobileToc = [...rows.values()].map((row) => `<a href="#q${row.n}" aria-label="${row.n}번">${String(row.n).padStart(2, "0")}</a>`).join("");
  return `${head(post.title, 2, { image: ogImage })}${nav(2, true)}<nav class="notes-mobile-strip" aria-label="문항 바로가기">${mobileToc}</nav><div class="notes-layout"><header class="notes-article-head"><div class="tw-meta-list notes-overline"><span>${subjectName(post.subject)}</span><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><span>twotimess</span></div><h1>${escapeHtml(post.title)}</h1></header>${renderHeroChart(post, record)}<aside class="notes-desktop-toc"><nav aria-label="목차"><span class="notes-toc-indicator" aria-hidden="true"></span>${toc}</nav></aside><main class="notes-article">${article}${renderEndCards(post)}${adjacentPosts(post, posts)}<footer class="notes-article-footer"><span>문항 출처 한국교육과정평가원</span></footer></main></div><dialog id="notesLightbox" class="notes-lightbox" aria-label="그림 크게 보기"><div class="notes-lightbox-bar"><span id="notesLightboxCaption"></span><button type="button" class="tw-button is-ghost is-sm" id="notesLightboxClose">닫기</button></div><img id="notesLightboxImage" alt=""><div class="notes-lightbox-actions"><button type="button" class="tw-button is-ghost is-sm" id="notesLightboxPrev" aria-label="이전 그림">←</button><button type="button" class="tw-button is-ghost is-sm" id="notesLightboxNext" aria-label="다음 그림">→</button></div></dialog><script src="../../ds/tooltip.js" defer></script><script src="../../ds/motion.js?v=51" defer></script><script src="../notes.js?v=20260924c" defer></script></body></html>`;
}
function renderSparkline(post) {
  const record = cutData.records.find((entry) => entry.subject === subjectName(post.subject)
    && `${entry.school_year}-${String(entry.month).padStart(2, "0")}` === post.exam);
  const rows = questionRows(post, record);
  if (!rows.length) return "";
  const shapes = rows.map((row, index) => {
    const x = index * 8 + 1;
    if (row.wrongRate === null) return `<rect x="${x + 2}" y="33" width="2" height="2" fill="var(--tw-ink-4)"/>`;
    const height = +(Math.max(1, Math.min(32, row.wrongRate * .32))).toFixed(1);
    return `<rect x="${x}" y="${+(35 - height).toFixed(1)}" width="6" height="${height}" fill="var(--tw-ink)"/>`;
  }).join("");
  return `<svg class="notes-list-spark" viewBox="0 0 160 40" width="160" height="40" aria-hidden="true"><path d="M0 35.5 H160" stroke="var(--tw-ink)" stroke-width="1"/>${shapes}</svg>`;
}
function renderList(posts) {
  const subjects = [...new Set(posts.map((post) => post.subject))];
  const filters = subjects.length > 1 ? `<nav class="tw-segmented notes-filters" aria-label="과목"><button type="button" data-subject="all" aria-pressed="true">전체</button><button type="button" data-subject="korea" aria-pressed="false">한국지리</button><button type="button" data-subject="world" aria-pressed="false">세계지리</button></nav>` : "";
  const rows = posts.map((post) => `<a class="notes-list-row" href="./${encodeURIComponent(post.slug)}/index.html" data-subject="${escapeHtml(post.subject)}"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><span class="notes-list-copy"><span class="notes-list-title">${escapeHtml(post.title)}</span><span class="notes-list-subject">${escapeHtml(subjectName(post.subject))}</span></span>${renderSparkline(post)}</a>`).join("\n");
  return `${head("Notes", 1)}${nav(1, true)}<main class="notes-index tw-page"><header class="notes-index-head"><h1 class="tw-display" lang="en">Notes</h1>${filters}</header><div class="notes-list">${rows}</div></main><script src="../ds/motion.js?v=51" defer></script><script src="./notes.js?v=20260924c" defer></script></body></html>`;
}
