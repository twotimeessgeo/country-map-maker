import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const notesDir = path.join(root, "notes");
const postsDir = path.join(notesDir, "posts");
const cutData = JSON.parse(fs.readFileSync(path.join(root, "tools/cut/data/ebsi_geo_data.json"), "utf8"));
const posts = fs.readdirSync(postsDir).filter((name) => name.endsWith(".md"))
  .map((name) => readPost(path.join(postsDir, name)))
  .sort((a, b) => b.date.localeCompare(a.date));

for (const post of posts) {
  const directory = path.join(notesDir, post.slug);
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  const { html, headings, images } = renderMarkdown(post.body, post.slug);
  const record = cutData.records.find((entry) => entry.subject === subjectName(post.subject)
    && `${entry.school_year}-${String(entry.month).padStart(2, "0")}` === post.exam);
  const article = renderArticle(post, html, headings, record);
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
      meta[listKey] = key[2] ? key[2].trim() : [];
    } else if (item && Array.isArray(meta[listKey])) {
      meta[listKey].push(item[1].trim());
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

function renderMarkdown(markdown, slug) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
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
          figures.push(renderFigure(match, slug, firstImage));
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
      output.push(renderFigure(image, slug, firstImage));
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
        headings.push({ id, title });
        output.push(`<section class="notes-section tw-reveal" id="${escapeHtml(id)}"><h2>${inline(title)}</h2>${currentQuestion ? `<!--QUESTION_META_${currentQuestion}-->` : ""}`);
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

function renderFigure(match, slug, first) {
  const [, caption, imagePath] = match;
  const fullPath = path.join(notesDir, slug, imagePath);
  if (!fs.existsSync(fullPath)) throw new Error(`그림을 찾지 못했습니다: ${fullPath}`);
  const { width, height } = webpDimensions(fullPath);
  const label = caption ? `${caption} 크게 보기` : "그림 크게 보기";
  return `<figure class="notes-figure"><button class="notes-image-button" type="button" data-lightbox-src="${escapeHtml(imagePath)}" data-lightbox-caption="${escapeHtml(caption)}" aria-label="${escapeHtml(label)}"><img src="${escapeHtml(imagePath)}" alt="${escapeHtml(caption)}" width="${width}" height="${height}" loading="${first ? "eager" : "lazy"}" decoding="async"></button>${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`;
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
function questionMeta(record, number) {
  const item = record?.items?.find((entry) => Number(entry.question) === number);
  if (!item) return "";
  const cells = [];
  if (hasNumber(item.points)) cells.push(`<span>배점 ${escapeHtml(item.points)}점</span>`);
  if (hasNumber(item.national_rate)) cells.push(`<span>정답률 ${escapeHtml(item.national_rate)}%</span>`);
  return cells.length ? `<div class="tw-meta-list notes-question-meta">${cells.join("")}</div>` : "";
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
function head(title, depth) {
  const prefix = "../".repeat(depth);
  return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Promenade Geography</title><meta name="theme-color" content="#ffffff"><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css"><link rel="stylesheet" href="${prefix}ds/fonts.css"><link rel="stylesheet" href="${prefix}ds/tokens.css"><link rel="stylesheet" href="${prefix}ds/base.css"><link rel="stylesheet" href="${prefix}ds/components.css"><link rel="stylesheet" href="${prefix}ds/patterns.css"><link rel="stylesheet" href="${prefix}notes/notes.css"></head><body>`;
}
function renderArticle(post, rawHtml, headings, record) {
  let article = rawHtml.replace(/<!--QUESTION_META_(\d+)-->/g, (_, number) => questionMeta(record, Number(number)));
  article = article.replace(/(<section class="notes-section tw-reveal" id="intro">[\s\S]*?<\/section>)/, (section) => section + examSummary(record));
  const toc = headings.map(({ id, title }) => `<a href="#${escapeHtml(id)}">${escapeHtml(title)}</a>`).join("");
  const sources = post.sources.map((url, index) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${index === 0 ? "상" : index === 1 ? "하" : `원문 ${index + 1}`}</a>`).join(" ");
  return `${head(post.title, 2)}${nav(2, true)}<div class="notes-layout"><header class="notes-article-head"><div class="tw-meta-list notes-overline"><span>${subjectName(post.subject)}</span><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time></div><h1>${escapeHtml(post.title)}</h1><details class="tw-disclosure notes-mobile-toc"><summary>목차</summary><nav aria-label="목차">${toc}</nav></details></header><aside class="notes-desktop-toc"><nav aria-label="목차">${toc}</nav></aside><main class="notes-article">${article}<footer class="notes-article-footer"><span>원문 ${sources}</span><span>문항 출처 한국교육과정평가원</span></footer></main></div><dialog id="notesLightbox" class="notes-lightbox" aria-label="그림 크게 보기"><div class="notes-lightbox-bar"><span id="notesLightboxCaption"></span><button type="button" class="tw-button is-ghost is-sm" id="notesLightboxClose">닫기</button></div><img id="notesLightboxImage" alt=""></dialog><script src="../notes.js" defer></script></body></html>`;
}
function renderList(posts) {
  const subjects = [...new Set(posts.map((post) => post.subject))];
  const filters = subjects.length > 1 ? `<nav class="tw-segmented notes-filters" aria-label="과목"><button type="button" data-subject="all" aria-pressed="true">전체</button><button type="button" data-subject="korea" aria-pressed="false">한국지리</button><button type="button" data-subject="world" aria-pressed="false">세계지리</button></nav>` : "";
  const rows = posts.map((post) => `<a class="notes-list-row" href="./${encodeURIComponent(post.slug)}/index.html" data-subject="${escapeHtml(post.subject)}"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time><span>${escapeHtml(post.title)}</span><span>${subjectName(post.subject)}</span></a>`).join("\n");
  return `${head("Notes", 1)}${nav(1, true)}<main class="notes-index tw-page"><header class="notes-index-head"><h1 class="tw-display" lang="en">Notes</h1>${filters}</header><div class="notes-list">${rows}</div></main><script src="./notes.js" defer></script></body></html>`;
}
