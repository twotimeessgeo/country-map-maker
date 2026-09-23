const EBSI_URL = "./data/ebsi_geo_data.json?v=52";
const QUESTION_IMAGE_MANIFEST_URL = "./data/question-image-manifest.json?v=20260924";
const SUPPORTED_SUBJECTS = ["한국지리", "세계지리"];
const GRADE_KEYS = ["1", "2", "3"];
const QUESTION_NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);

const elements = {
  form: document.querySelector("#cutLookupForm"),
  subject: document.querySelector("#subjectSelect"),
  subjectChips: document.querySelector("#subjectChips"),
  year: document.querySelector("#yearSelect"),
  yearChips: document.querySelector("#yearChips"),
  exam: document.querySelector("#examSelect"),
  examChips: document.querySelector("#examChips"),
  examPicker: document.querySelector("#cutExamPicker"),
  prevExam: document.querySelector("#cutPrevExam"),
  nextExam: document.querySelector("#cutNextExam"),
  currentExam: document.querySelector("#cutCurrentExam"),
  scopeChips: document.querySelector("#scopeChips"),
  status: document.querySelector("#lookupStatus"),
  resultSubject: document.querySelector("#resultSubject"),
  resultTitle: document.querySelector("#resultTitle"),
  gradeGrid: document.querySelector("#gradeCutGrid"),
  gradeWrap: document.querySelector("#cutGradeWrap"),
  gradeUnpublished: document.querySelector("#cutGradeUnpublished"),
  examMeta: document.querySelector("#examMeta"),
  mean: document.querySelector("#meanValue"),
  standardDeviation: document.querySelector("#sdValue"),
  sourceLink: document.querySelector("#sourceLink"),
  questionCount: document.querySelector("#questionAnalysisCount"),
  notesAnalysisLink: document.querySelector("#notesAnalysisLink"),
  questionGrid: document.querySelector("#questionAnalysisGrid"),
  questionTableWrap: document.querySelector("#questionTableWrap"),
  questionPhotoGrid: document.querySelector("#questionPhotoGrid"),
  questionSort: document.querySelector("#questionSort"),
  questionView: document.querySelector("#questionView"),
  unpublished: document.querySelector("#questionUnpublished"),
  trend: document.querySelector("#cutTrendChart"),
  trendRange: document.querySelector("#trendRange"),
  trendDisclosure: document.querySelector("#trendDisclosure"),
  historyDisclosure: document.querySelector("#historyDisclosure"),
  historyMore: document.querySelector("#historyMore"),
  historyCount: document.querySelector("#historyCount"),
  historyBody: document.querySelector("#historyTableBody"),
  collectionDate: document.querySelector("#collectionDate"),
  lightbox: document.querySelector("#cutLightbox"),
  lightboxTitle: document.querySelector("#cutLightboxTitle"),
  lightboxPosition: document.querySelector("#cutLightboxPosition"),
  lightboxImage: document.querySelector("#cutLightboxImage"),
  lightboxEmpty: document.querySelector("#cutLightboxEmpty"),
  lightboxRate: document.querySelector("#cutLightboxRate"),
  lightboxPoints: document.querySelector("#cutLightboxPoints"),
  lightboxPrev: document.querySelector("#cutLightboxPrev"),
  lightboxNext: document.querySelector("#cutLightboxNext"),
  lightboxClose: document.querySelector("#cutLightboxClose"),
};

let payload = null;
let records = [];
let questionImageByKey = new Map();
let scope = "evaluation";
let lightboxQuestion = 1;
function readQuestionPreference(key, fallback, allowed) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch { return fallback; }
}

function saveQuestionPreferences() {
  try {
    localStorage.setItem("cut-question-sort", questionSort);
    localStorage.setItem("cut-question-direction", questionSortDirection);
    localStorage.setItem("cut-question-view", questionView);
  } catch { /* Archive remains usable without storage. */ }
}

let questionSort = readQuestionPreference("cut-question-sort", "wrong", ["number", "wrong"]);
let questionSortDirection = readQuestionPreference("cut-question-direction", "desc", ["asc", "desc"]);
let questionView = readQuestionPreference("cut-question-view", "table", ["table", "photo"]);
let trendRange = "recent";
let historyExpanded = false;

function isEvaluation(record) {
  return ["06", "09", "11"].includes(String(record.month).padStart(2, "0"));
}

function scopeRecords() {
  return records.filter((record) => scope === "all" || isEvaluation(record));
}

function isFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function formatNumber(value, digits = 1) {
  if (!isFiniteNumber(value)) return "-";
  const number = Number(value);
  return (Number.isInteger(number) ? String(number) : number.toFixed(digits)).replace(/^-/, "−");
}

function monthLabel(month) {
  const normalized = String(month).padStart(2, "0");
  return normalized === "11" ? "수능" : `${Number(normalized)}월`;
}

function recordKey(record) {
  return `${record.school_year}-${String(record.month).padStart(2, "0")}`;
}

function recordTitle(record) {
  const month = String(record.month).padStart(2, "0");
  const suffix = isEvaluation(record) ? "" : " 학평";
  return `${record.school_year} ${monthLabel(month)}${suffix}`;
}

function questionImageKey(subject, examYear, month, question) {
  return [subject, examYear, String(month).padStart(2, "0"), question].join("|");
}

function sortRecords(left, right) {
  return (
    Number(right.school_year) - Number(left.school_year)
    || Number(right.month) - Number(left.month)
    || String(left.subject).localeCompare(String(right.subject), "ko")
  );
}

function usableRecord(record) {
  return (
    SUPPORTED_SUBJECTS.includes(record?.subject)
    && isFiniteNumber(record?.school_year)
    && (GRADE_KEYS.some((grade) => isFiniteNumber(record?.[`raw${grade}`]))
      || (record?.wrong_top15 || []).length > 0)
  );
}

function selectedRecords() {
  return scopeRecords().filter((record) => (
    record.subject === elements.subject.value
    && Number(record.school_year) === Number(elements.year.value)
  ));
}

function selectedRecord() {
  const key = elements.exam.value;
  return selectedRecords().find((record) => recordKey(record) === key) || null;
}

function replaceOptions(select, options, preferredValue) {
  select.replaceChildren();
  for (const optionData of options) {
    const option = document.createElement("option");
    option.value = String(optionData.value);
    option.textContent = optionData.label;
    select.appendChild(option);
  }

  const preferred = String(preferredValue ?? "");
  if (options.some((option) => String(option.value) === preferred)) {
    select.value = preferred;
  }
  select.disabled = options.length === 0;
}

function populateYears(preferredYear = elements.year.value) {
  const years = [...new Set(
    scopeRecords()
      .filter((record) => record.subject === elements.subject.value)
      .map((record) => Number(record.school_year)),
  )].sort((left, right) => right - left);

  replaceOptions(
    elements.year,
    years.map((year) => ({ value: year, label: `${year}학년도` })),
    preferredYear,
  );
}

function populateExams(preferredKey = elements.exam.value) {
  const exams = selectedRecords().sort(sortRecords);
  replaceOptions(
    elements.exam,
    exams.map((record) => ({ value: recordKey(record), label: monthLabel(record.month) })),
    preferredKey,
  );
}

function renderChipGroup(container, select, options, className) {
  const fragment = document.createDocumentFragment();
  for (const { value, label } of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.dataset.value = String(value);
    button.setAttribute("aria-pressed", String(String(value) === select.value));
    if (String(value) === select.value) button.classList.add("is-active");
    button.addEventListener("click", () => {
      if (select.value === String(value)) return;
      select.value = String(value);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    fragment.appendChild(button);
  }
  container.replaceChildren(fragment);
}

function renderFilterChips() {
  renderChipGroup(elements.subjectChips, elements.subject, SUPPORTED_SUBJECTS.map((value) => ({ value, label: value })), "cut-subject-chip");
  renderChipGroup(elements.yearChips, elements.year, [...elements.year.options].map(({ value, textContent }) => ({ value, label: textContent })), "tw-chip cut-year-chip");
  renderChipGroup(elements.examChips, elements.exam, [...elements.exam.options].map(({ value, textContent }) => ({ value, label: textContent })), "tw-chip cut-exam-chip");
  elements.scopeChips.querySelectorAll("[data-scope]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scope === scope));
  });
}

function availableExams() {
  const byKey = new Map();
  scopeRecords().filter((record) => record.subject === elements.subject.value).forEach((record) => {
    byKey.set(recordKey(record), record);
  });
  return [...byKey.values()].sort(sortRecords);
}

function renderExamNavigation(record) {
  const exams = availableExams();
  const activeIndex = record ? exams.findIndex((exam) => recordKey(exam) === recordKey(record)) : -1;
  elements.currentExam.textContent = record ? recordTitle(record) : "시험 선택";
  elements.prevExam.disabled = activeIndex < 0 || activeIndex >= exams.length - 1;
  elements.nextExam.disabled = activeIndex <= 0;
  elements.examPicker.replaceChildren();
  const groups = new Map();
  for (const exam of exams) {
    const year = Number(exam.school_year);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(exam);
  }
  for (const [year, entries] of groups) {
    const group = document.createElement("optgroup");
    group.label = `${year}학년도`;
    for (const exam of entries) {
      const option = document.createElement("option");
      option.value = recordKey(exam);
      option.textContent = recordTitle(exam);
      group.appendChild(option);
    }
    elements.examPicker.appendChild(group);
  }
  if (record) elements.examPicker.value = recordKey(record);
  elements.examPicker.disabled = !exams.length;
}

function selectExamByKey(key) {
  const record = availableExams().find((exam) => recordKey(exam) === key);
  if (!record) return;
  populateYears(record.school_year);
  populateExams(key);
  renderSelection();
}

function shiftExam(direction) {
  const exams = availableExams();
  const index = exams.findIndex((exam) => recordKey(exam) === elements.exam.value);
  const next = exams[index + direction];
  if (next) selectExamByKey(recordKey(next));
}

function renderGradeCards(record) {
  const fragment = document.createDocumentFragment();
  const hasCuts = GRADE_KEYS.some((grade) => isFiniteNumber(record[`raw${grade}`]));

  for (const grade of GRADE_KEYS) {
    const card = document.createElement("tr");
    card.className = "cut-grade-card";
    if (!hasCuts) card.classList.add("is-unpublished");

    const label = document.createElement("td");
    label.className = "cut-grade-label";
    label.textContent = `${grade}등급`;

    const score = document.createElement("td");
    score.className = "cut-grade-score";
    score.textContent = isFiniteNumber(record[`raw${grade}`])
      ? formatNumber(record[`raw${grade}`], 0)
      : hasCuts ? "없음" : "미발표";

    const unit = document.createElement("span");
    unit.className = "cut-grade-unit tw-sr-only";
    unit.textContent = "원점수";
    score.appendChild(unit);

    const standard = document.createElement("td");
    standard.className = "cut-standard-score";
    standard.textContent = isFiniteNumber(record[`std${grade}`])
      ? formatNumber(record[`std${grade}`], 0)
      : hasCuts ? "-" : "미발표";

    const percentile = document.createElement("td");
    percentile.className = "cut-percentile-score";
    percentile.textContent = isFiniteNumber(record[`pct${grade}`])
      ? formatNumber(record[`pct${grade}`], 0)
      : hasCuts ? "-" : "미발표";

    card.append(label, score, standard, percentile);
    fragment.appendChild(card);
  }

  elements.gradeGrid.replaceChildren(fragment);
}

function renderResult(record) {
  if (!record) {
    elements.resultSubject.textContent = "-";
    elements.resultTitle.textContent = "시험을 선택해 주세요";
    elements.gradeGrid.replaceChildren();
    elements.mean.textContent = "-";
    elements.standardDeviation.textContent = "-";
    elements.gradeWrap.hidden = true;
    elements.gradeUnpublished.hidden = false;
    elements.examMeta.hidden = true;
    return;
  }

  const hasCuts = GRADE_KEYS.some((grade) => isFiniteNumber(record[`raw${grade}`]));
  elements.resultSubject.textContent = record.subject;
  elements.resultTitle.textContent = recordTitle(record);
  elements.gradeWrap.hidden = !hasCuts;
  elements.gradeUnpublished.hidden = hasCuts;
  elements.examMeta.hidden = !hasCuts;
  elements.mean.textContent = isFiniteNumber(record.national_mean) ? formatNumber(record.national_mean) : "미발표";
  elements.standardDeviation.textContent = isFiniteNumber(record.national_sd) ? formatNumber(record.national_sd) : "미발표";
  if (hasCuts) renderGradeCards(record);
  else elements.gradeGrid.replaceChildren();
}

function formatPercent(value) {
  return isFiniteNumber(value) ? `${formatNumber(value)}%` : "-";
}

function correctChoice(record, question) {
  const row = (record.wrong_top15 || []).find(
    (item) => Number(item.question) === Number(question),
  );
  const answer = Number(row?.answer);
  return answer >= 1 && answer <= 5 ? answer : null;
}

function questionChoiceRates(record, question) {
  const row = (record.wrong_top15 || []).find(
    (item) => Number(item.question) === Number(question),
  );
  if (!Array.isArray(row?.choices) || row.choices.length !== 5) return null;

  const rates = row.choices.map((value) => Number(value));
  return rates.every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    ? rates
    : null;
}

function missingRateLabel(record) {
  const published = (record?.items || []).filter((item) =>
    item.source === "ebsi_wrong_top15" && isFiniteNumber(item.national_rate)).length;
  return published === 15 ? "오답률 하위 5문항" : "오답률 미발표";
}

function orderedQuestionNumbers(record) {
  const byNumber = new Map((record?.items || []).map((item) => [Number(item.question), item]));
  return [...QUESTION_NUMBERS].sort((left, right) => {
    if (questionSort === "number") return left - right;
    const leftRate = byNumber.get(left)?.national_rate;
    const rightRate = byNumber.get(right)?.national_rate;
    const leftKnown = isFiniteNumber(leftRate);
    const rightKnown = isFiniteNumber(rightRate);
    if (leftKnown !== rightKnown) return leftKnown ? -1 : 1;
    if (!leftKnown) return left - right;
    const difference = Number(rightRate) - Number(leftRate);
    return (questionSortDirection === "desc" ? -difference : difference) || left - right;
  });
}

function renderQuestionPhotos(record, order) {
  elements.questionPhotoGrid.replaceChildren();
  if (!record) return;
  const byNumber = new Map((record.items || []).map((item) => [Number(item.question), item]));
  const fragment = document.createDocumentFragment();
  for (const question of order) {
    const item = byNumber.get(question);
    const image = questionImageByKey.get(questionImageKey(record.subject, record.exam_year, record.month, question));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cut-photo-card";
    button.dataset.question = String(question);
    const visual = image?.url ? document.createElement("img") : document.createElement("span");
    if (image?.url) {
      visual.src = image.url;
      visual.alt = "";
      visual.loading = "lazy";
    } else {
      visual.className = "cut-photo-missing";
      visual.textContent = "사진 없음";
    }
    const caption = document.createElement("span");
    caption.className = "cut-photo-caption tw-meta-list";
    const rate = isFiniteNumber(item?.national_rate)
      ? `오답률 ${formatPercent(100 - Number(item.national_rate))}` : missingRateLabel(record);
    for (const text of [`${question}번`, rate, isFiniteNumber(item?.points) ? `${formatNumber(item.points, 0)}점` : ""]) {
      if (!text) continue;
      const part = document.createElement("span");
      part.textContent = text;
      caption.appendChild(part);
    }
    button.setAttribute("aria-label", `${question}번, ${rate}, 문항 크게 보기`);
    button.append(visual, caption);
    fragment.appendChild(button);
  }
  elements.questionPhotoGrid.appendChild(fragment);
}

function renderQuestionAnalysis(record) {
  elements.notesAnalysisLink.hidden = !(record?.subject === "세계지리" && recordKey(record) === "2027-09");
  elements.questionGrid.replaceChildren();
  elements.questionPhotoGrid.replaceChildren();
  elements.unpublished.replaceChildren();
  elements.unpublished.hidden = true;
  elements.questionTableWrap.hidden = questionView !== "table";
  elements.questionPhotoGrid.hidden = questionView !== "photo";
  elements.questionSort.querySelectorAll("[data-question-sort]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.questionSort === questionSort));
    if (button.dataset.questionSort === "wrong") button.textContent = `오답률순 ${questionSortDirection === "desc" ? "↓" : "↑"}`;
  });
  elements.questionView.querySelectorAll("[data-question-view]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.questionView === questionView));
  });
  if (!record) return;

  const order = orderedQuestionNumbers(record);
  const observedByNumber = new Map((record.items || [])
    .filter((item) => isFiniteNumber(item.national_rate) && item.source === "ebsi_wrong_top15")
    .map((item) => [Number(item.question), item]));
  const observed = order.map((question) => observedByNumber.get(question)).filter(Boolean);
  const observedNumbers = new Set(observed.map((item) => Number(item.question)));
  const unpublished = QUESTION_NUMBERS.filter((question) => !observedNumbers.has(question));
  const fragment = document.createDocumentFragment();

  for (const item of observed) {
    const question = Number(item.question);
    const wrongRate = 100 - Number(item.national_rate);
    const answer = correctChoice(record, question);
    const choiceRates = questionChoiceRates(record, question);
    const row = document.createElement("tr");
    row.className = "cut-question-row";
    row.dataset.question = String(question);
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `${question}번, 오답률 ${formatPercent(wrongRate)}, 문항 크게 보기`);

    const number = document.createElement("th");
    number.scope = "row";
    number.textContent = String(question);
    const points = document.createElement("td");
    points.textContent = isFiniteNumber(item.points) ? `${formatNumber(item.points, 0)}점` : "";
    const wrong = document.createElement("td");
    const wrongDisplay = document.createElement("span");
    wrongDisplay.className = "cut-wrong-display";
    const bar = document.createElement("span");
    bar.className = "cut-question-rate-bar";
    bar.style.setProperty("--wrong-rate", `${Math.max(0, Math.min(100, wrongRate))}%`);
    const value = document.createElement("span");
    value.textContent = formatPercent(wrongRate);
    wrongDisplay.append(bar, value);
    wrong.appendChild(wrongDisplay);
    row.append(number, points, wrong);

    for (let choice = 1; choice <= 5; choice += 1) {
      const cell = document.createElement("td");
      cell.className = "cut-choice-cell";
      if (choice === answer) cell.classList.add("is-answer");
      const rateText = choiceRates ? formatPercent(choiceRates[choice - 1]) : "–";
      if (choice === answer) {
        const value = document.createElement("strong");
        value.textContent = rateText;
        const tag = document.createElement("small");
        tag.textContent = "정답";
        cell.append(value, tag);
      } else cell.textContent = rateText;
      cell.setAttribute("aria-label", `${choice}번 ${rateText}${choice === answer ? ", 정답" : ""}`);
      row.appendChild(cell);
    }
    fragment.appendChild(row);
  }

  if (!observed.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent = "오답률이 발표되지 않았습니다";
    row.appendChild(cell);
    fragment.appendChild(row);
  }
  elements.questionGrid.replaceChildren(fragment);
  renderQuestionPhotos(record, order);

  if (questionView === "table" && observed.length && unpublished.length) {
    const title = document.createElement("strong");
    title.textContent = unpublished.length === 5
      ? "오답률 하위 5문항"
      : "오답률 미공개 " + unpublished.length + "문항";
    const list = document.createElement("span");
    list.className = "tw-meta-list";
    unpublished.forEach((question) => {
      const number = document.createElement("span");
      number.textContent = String(question);
      list.appendChild(number);
    });
    elements.unpublished.append(title, list);
    elements.unpublished.hidden = false;
  }
  elements.questionCount.textContent = "";
}

function renderTrend(activeRecord) {
  elements.trend.replaceChildren();
  if (!activeRecord) return;
  const grouped = new Map();
  scopeRecords().filter(isEvaluation).forEach((record) => {
    const key = recordKey(record);
    if (!grouped.has(key)) grouped.set(key, { key, sample: record, bySubject: {} });
    grouped.get(key).bySubject[record.subject] = record;
  });
  const allExams = [...grouped.values()].sort((left, right) => sortRecords(left.sample, right.sample));
  if (trendRange === "recent" && !allExams.slice(0, 10).some((exam) => exam.key === recordKey(activeRecord))) {
    trendRange = "all";
  }
  elements.trendRange.querySelectorAll("[data-trend-range]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.trendRange === trendRange));
  });
  const exams = (trendRange === "recent" ? allExams.slice(0, 10) : allExams).reverse();
  if (!exams.length) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const width = Math.max(800, exams.length * 58);
  const height = 280;
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "1등급 원점수 컷 추이");
  svg.classList.add("cut-trend-svg");
  const add = (tag, attrs, content) => {
    const node = document.createElementNS(svgNS, tag);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (content !== undefined) node.textContent = content;
    svg.appendChild(node);
    return node;
  };
  const values = exams.flatMap((exam) => SUPPORTED_SUBJECTS.map((subject) => {
    const cut = exam.bySubject[subject]?.raw1;
    return isFiniteNumber(cut) ? Number(cut) : NaN;
  })).filter(Number.isFinite);
  const low = Math.max(0, Math.floor((Math.min(...values, 30) - 3) / 5) * 5);
  const high = Math.min(50, Math.ceil((Math.max(...values, 45) + 3) / 5) * 5);
  const x0 = 56, x1 = width - 24, y0 = 30, y1 = 207;
  const x = (index) => x0 + (x1 - x0) * index / Math.max(exams.length - 1, 1);
  const y = (value) => y1 - (value - low) / Math.max(high - low, 1) * (y1 - y0);

  add("text", {x: x0, y: 15, fill: "#5d5d5d", "font-size": 11}, "원점수");
  for (let tick = low; tick <= high; tick += 5) {
    const yy = y(tick);
    add("line", {x1: x0, y1: yy, x2: x1, y2: yy,
      stroke: tick === low ? "rgba(0,0,0,.32)" : "rgba(0,0,0,.08)"});
    add("text", {x: x0 - 10, y: yy + 4, "text-anchor": "end",
      fill: "#5d5d5d", "font-size": 11}, String(tick));
  }
  exams.forEach((exam, index) => {
    const xx = x(index);
    if (exam.key === recordKey(activeRecord)) {
      add("line", {x1: xx, y1: y0, x2: xx, y2: y1, stroke: "rgba(0,0,0,.32)", class: "cut-trend-current-line"});
    }
    add("text", {x: xx, y: 238, "text-anchor": "middle", fill: "#5d5d5d", "font-size": 10}, monthLabel(exam.sample.month));
    if (index === 0 || exams[index - 1].sample.school_year !== exam.sample.school_year) {
      add("text", {x: xx, y: 261, "text-anchor": "middle", fill: "#737373", "font-size": 10}, String(exam.sample.school_year));
    }
  });
  SUPPORTED_SUBJECTS.forEach((subject, seriesIndex) => {
    const points = exams.map((exam, index) => ({
      x: x(index),
      value: isFiniteNumber(exam.bySubject[subject]?.raw1) ? Number(exam.bySubject[subject].raw1) : NaN,
      record: exam.bySubject[subject],
      key: exam.key,
    }));
    const published = points.filter((point) => Number.isFinite(point.value));
    if (published.length) {
      add("polyline", {
        points: published.map((point) => `${point.x},${y(point.value)}`).join(" "),
        fill: "none", stroke: seriesIndex ? "#5d5d5d" : "#0d0d0d", "stroke-width": 1.8,
        ...(seriesIndex ? {"stroke-dasharray": "6 4"} : {}),
      });
    }
    points.forEach((point) => {
      const selected = point.key === recordKey(activeRecord);
      const published = Number.isFinite(point.value);
      const yy = published ? y(point.value) : y1 - seriesIndex * 9;
      const marker = add(seriesIndex && published ? "rect" : "circle", seriesIndex && published
        ? {x: point.x - (selected ? 5 : 3), y: yy - (selected ? 5 : 3),
          width: selected ? 10 : 6, height: selected ? 10 : 6,
          fill: selected ? "#0d0d0d" : "#ffffff", stroke: "#0d0d0d", "stroke-width": 1.5}
        : {cx: point.x, cy: yy, r: selected ? 5 : 3.5,
          fill: published && selected ? "#0d0d0d" : "#ffffff", stroke: "#0d0d0d", "stroke-width": 1.5});
      const score = published ? `원점수 ${formatNumber(point.value, 0)}점` : "원점수 미발표";
      const standard = isFiniteNumber(point.record?.std1)
        ? `표준점수 ${formatNumber(point.record.std1, 0)}점` : "표준점수 미발표";
      const tip = `${subject} ${recordTitle(point.record || {school_year: exams.find((exam) => exam.key === point.key).sample.school_year, month: exams.find((exam) => exam.key === point.key).sample.month})} ${score} ${standard}`;
      marker.dataset.tooltip = tip;
      marker.setAttribute("aria-label", tip);
      marker.setAttribute("tabindex", "0");
      marker.classList.add("cut-trend-point");
    });
  });
  const scroll = document.createElement("div");
  scroll.className = "cut-trend-scroll";
  scroll.appendChild(svg);
  const legend = document.createElement("div");
  legend.className = "tw-meta-list cut-trend-legend";
  SUPPORTED_SUBJECTS.forEach((subject, index) => {
    const item = document.createElement("span");
    item.className = index ? "cut-trend-world" : "cut-trend-korea";
    item.textContent = subject;
    legend.appendChild(item);
  });
  elements.trend.append(scroll, legend);
  const selectedIndex = exams.findIndex((exam) => exam.key === recordKey(activeRecord));
  if (selectedIndex >= 0) {
    requestAnimationFrame(() => {
      scroll.scrollLeft = Math.max(0, x(selectedIndex) - scroll.clientWidth * 0.72);
    });
  }
}

function renderHistory(activeRecord) {
  const exams = scopeRecords()
    .filter((record) => record.subject === elements.subject.value)
    .sort(sortRecords);
  const visible = historyExpanded ? exams : exams.slice(0, 12);
  const fragment = document.createDocumentFragment();
  for (const record of visible) {
    const row = document.createElement("tr");
    row.className = "cut-history-row";
    row.dataset.recordKey = recordKey(record);
    row.dataset.subject = record.subject;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `${recordTitle(record)} 선택`);
    if (activeRecord && recordKey(record) === recordKey(activeRecord)) row.classList.add("is-selected");
    const title = document.createElement("th");
    title.scope = "row";
    title.className = "cut-history-exam";
    title.textContent = recordTitle(record);
    row.appendChild(title);
    const observed = new Map((record.items || [])
      .filter((item) => isFiniteNumber(item.national_rate))
      .map((item) => [Number(item.question), 100 - Number(item.national_rate)]));
    QUESTION_NUMBERS.forEach((question) => {
      const td = document.createElement("td");
      const cell = document.createElement("span");
      cell.className = "cut-history-cell";
      if (observed.has(question)) {
        const wrongRate = observed.get(question);
        const shade = Math.round(15 + wrongRate * 0.8);
        cell.style.setProperty("--shade", `${Math.min(95, Math.max(15, shade))}%`);
        cell.dataset.tooltip = `${question}번 오답률 ${formatPercent(wrongRate)}`;
      } else if (observed.size) {
        cell.classList.add("is-unpublished");
        cell.dataset.tooltip = `${question}번 ${missingRateLabel(record)}`;
      } else {
        cell.classList.add("is-empty");
        cell.dataset.tooltip = `${question}번 오답률 미발표`;
      }
      cell.setAttribute("aria-label", cell.dataset.tooltip);
      cell.tabIndex = 0;
      td.appendChild(cell);
      row.appendChild(td);
    });
    fragment.appendChild(row);
  }
  elements.historyBody.replaceChildren(fragment);
  elements.historyCount.textContent = `${exams.length}회`;
  elements.historyMore.hidden = exams.length <= 12;
  elements.historyMore.textContent = historyExpanded ? "접기" : "더 보기";
}

function syncUrl(record) {
  if (!record || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.set("subject", record.subject);
  url.searchParams.set("exam", recordKey(record));
  url.searchParams.set("scope", scope);
  url.searchParams.delete("year");
  url.searchParams.delete("month");
  window.history.replaceState(null, "", url);
}

function renderSelection() {
  const record = selectedRecord();
  renderFilterChips();
  renderExamNavigation(record);
  renderResult(record);
  renderTrend(record);
  renderQuestionAnalysis(record);
  renderHistory(record);
  syncUrl(record);
}

function transitionSelection(update) {
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.startViewTransition(update);
  } else {
    update();
  }
}

function selectHistoryRecord(key, subject) {
  const record = scopeRecords().find((item) =>
    item.subject === subject && recordKey(item) === key);
  if (!record) return;
  elements.subject.value = record.subject;
  populateYears(record.school_year);
  populateExams(key);
  renderSelection();
  document.querySelector(".cut-result-panel")?.scrollIntoView({behavior: "smooth"});
}

function setLoadingState(isLoading) {
  elements.form.querySelectorAll("select").forEach((select) => {
    select.disabled = isLoading;
  });
  for (const control of [elements.examPicker, elements.prevExam, elements.nextExam]) control.disabled = isLoading;
  if (!isLoading) renderExamNavigation(selectedRecord());
}

async function loadData() {
  const response = await fetch(EBSI_URL);
  if (!response.ok) throw new Error("Archive data: " + response.status);
  return response.json();
}

async function loadQuestionImageManifest() {
  const response = await fetch(QUESTION_IMAGE_MANIFEST_URL);
  if (!response.ok) return { items: [] };
  return response.json();
}

function initialSelectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const subject = ({ world: "세계지리", korea: "한국지리" })[params.get("subject")] || params.get("subject");
  if (SUPPORTED_SUBJECTS.includes(subject)) elements.subject.value = subject;
  scope = params.get("scope") === "all" ? "all" : "evaluation";
  const exam = params.get("exam") ||
    (params.get("year") && params.get("month")
      ? params.get("year") + "-" + String(params.get("month")).padStart(2, "0")
      : "");
  const latestPublished = records.find((record) =>
    record.subject === elements.subject.value && isEvaluation(record) && isFiniteNumber(record.raw1));
  return { exam: exam || (latestPublished ? recordKey(latestPublished) : "") };
}

function readDisclosureState(key) {
  try { return localStorage.getItem(key) !== "closed"; }
  catch { return true; }
}

function bindDisclosureState(element, key) {
  element.open = readDisclosureState(key);
  element.addEventListener("toggle", () => {
    try { localStorage.setItem(key, element.open ? "open" : "closed"); }
    catch { /* Storage may be unavailable. */ }
  });
}

function updateLightbox() {
  const record = selectedRecord();
  if (!record) return;
  const question = lightboxQuestion;
  const order = orderedQuestionNumbers(record);
  const position = order.indexOf(question);
  const item = (record.items || []).find((entry) => Number(entry.question) === question);
  const imageData = questionImageByKey.get(
    questionImageKey(record.subject, record.exam_year, record.month, question),
  );
  elements.lightboxTitle.textContent = recordTitle(record) + "  " + question + "번";
  elements.lightboxPosition.textContent = `${position + 1} / ${order.length}`;
  elements.lightboxImage.hidden = !imageData?.url;
  elements.lightboxEmpty.hidden = Boolean(imageData?.url);
  elements.lightboxImage.src = imageData?.url || "";
  elements.lightboxImage.alt = imageData?.url ? recordTitle(record) + " " + question + "번 문항" : "";
  const rate = isFiniteNumber(item?.national_rate)
    ? 100 - Number(item.national_rate) : null;
  elements.lightboxRate.textContent = rate === null ? missingRateLabel(record) : "오답률 " + formatPercent(rate);
  elements.lightboxPoints.textContent = isFiniteNumber(item?.points)
    ? "배점 " + formatNumber(item.points, 0) + "점" : "";
  elements.lightboxPrev.disabled = position <= 0;
  elements.lightboxNext.disabled = position >= order.length - 1;
}

function navigateLightbox(delta) {
  const record = selectedRecord();
  if (!record) return;
  const order = orderedQuestionNumbers(record);
  const next = Math.max(0, Math.min(order.length - 1, order.indexOf(lightboxQuestion) + delta));
  lightboxQuestion = order[next];
  updateLightbox();
}

function openLightbox(question) {
  lightboxQuestion = Math.max(1, Math.min(20, Number(question)));
  updateLightbox();
  if (!elements.lightbox.open) elements.lightbox.showModal();
}

async function initialize() {
  setLoadingState(true);
  try {
    const [loadedPayload, imageManifest] = await Promise.all([
      loadData(),
      loadQuestionImageManifest().catch(() => ({ items: [] })),
    ]);
    payload = loadedPayload;
    questionImageByKey = new Map(
      (imageManifest.items || []).map((item) => [
        questionImageKey(item.subject, item.exam_year, item.month, item.question),
        item,
      ]),
    );
    records = (payload.records || []).filter(usableRecord).sort(sortRecords);
    const initial = initialSelectionFromUrl();
    const requestedYear = Number(String(initial.exam).split("-")[0]) || undefined;
    populateYears(requestedYear);
    populateExams(initial.exam);
    elements.status.textContent = "";
    elements.status.hidden = true;
    if (payload.source_url) elements.sourceLink.href = payload.source_url;
    if (payload.fetched_at) {
      elements.collectionDate.textContent = String(payload.fetched_at).slice(0, 10).replaceAll("-", ".");
    }
    bindDisclosureState(elements.trendDisclosure, "cut-trend-disclosure");
    bindDisclosureState(elements.historyDisclosure, "cut-history-disclosure");
    renderSelection();
  } catch (error) {
    console.warn("Archive data load failed:", error);
    elements.status.textContent = "자료를 불러오지 못했습니다";
    elements.status.hidden = false;
    renderResult(null);
    renderTrend(null);
    renderQuestionAnalysis(null);
    renderHistory(null);
  } finally {
    setLoadingState(false);
  }
}

elements.subject.addEventListener("change", () => {
  transitionSelection(() => {
    populateYears();
    populateExams();
    renderSelection();
  });
});
elements.year.addEventListener("change", () => {
  populateExams();
  renderSelection();
});
elements.exam.addEventListener("change", renderSelection);
elements.examPicker.addEventListener("change", (event) => selectExamByKey(event.target.value));
elements.prevExam.addEventListener("click", () => shiftExam(1));
elements.nextExam.addEventListener("click", () => shiftExam(-1));
document.addEventListener("keydown", (event) => {
  if (elements.lightbox.open || !["ArrowLeft", "ArrowRight"].includes(event.key) ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "")) return;
  event.preventDefault();
  shiftExam(event.key === "ArrowLeft" ? 1 : -1);
});
elements.scopeChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-scope]");
  if (!button || !records.length || button.dataset.scope === scope) return;
  transitionSelection(() => {
    scope = button.dataset.scope;
    populateYears(elements.year.value);
    populateExams(elements.exam.value);
    renderSelection();
  });
});
elements.questionSort.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-sort]");
  if (!button) return;
  if (button.dataset.questionSort === "wrong" && questionSort === "wrong") {
    questionSortDirection = questionSortDirection === "desc" ? "asc" : "desc";
  } else if (questionSort !== button.dataset.questionSort) {
    questionSort = button.dataset.questionSort;
    if (questionSort === "wrong") questionSortDirection = "desc";
  } else return;
  saveQuestionPreferences();
  renderQuestionAnalysis(selectedRecord());
});
elements.questionView.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-view]");
  if (!button || button.dataset.questionView === questionView) return;
  questionView = button.dataset.questionView;
  saveQuestionPreferences();
  renderQuestionAnalysis(selectedRecord());
});
elements.questionGrid.addEventListener("click", (event) => {
  const row = event.target.closest("[data-question]");
  if (row) openLightbox(row.dataset.question);
});
elements.questionPhotoGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-question]");
  if (card) openLightbox(card.dataset.question);
});
elements.questionGrid.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const row = event.target.closest("[data-question]");
  if (!row) return;
  event.preventDefault();
  openLightbox(row.dataset.question);
});
elements.trendRange.addEventListener("click", (event) => {
  const button = event.target.closest("[data-trend-range]");
  if (!button || trendRange === button.dataset.trendRange) return;
  trendRange = button.dataset.trendRange;
  renderTrend(selectedRecord());
});
elements.historyMore.addEventListener("click", () => {
  historyExpanded = !historyExpanded;
  renderHistory(selectedRecord());
});
elements.historyBody.addEventListener("click", (event) => {
  const row = event.target.closest("[data-record-key]");
  if (row) selectHistoryRecord(row.dataset.recordKey, row.dataset.subject);
});
elements.historyBody.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const row = event.target.closest("[data-record-key]");
  if (!row) return;
  event.preventDefault();
  selectHistoryRecord(row.dataset.recordKey, row.dataset.subject);
});
elements.lightboxClose.addEventListener("click", () => elements.lightbox.close());
elements.lightboxPrev.addEventListener("click", () => {
  navigateLightbox(-1);
});
elements.lightboxNext.addEventListener("click", () => {
  navigateLightbox(1);
});
elements.lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateLightbox(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateLightbox(1);
  }
});

initialize();
