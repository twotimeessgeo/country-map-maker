const EBSI_URL = "./data/ebsi_geo_data.json";
const QUESTION_IMAGE_MANIFEST_URL = "./data/question-image-manifest.json";
const SUPPORTED_SUBJECTS = ["한국지리", "세계지리"];
const GRADE_KEYS = ["1", "2", "3"];
const QUESTION_NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);
const CIRCLED_CHOICES = ["", "①", "②", "③", "④", "⑤"];

const elements = {
  form: document.querySelector("#cutLookupForm"),
  subject: document.querySelector("#subjectSelect"),
  subjectChips: document.querySelector("#subjectChips"),
  year: document.querySelector("#yearSelect"),
  yearChips: document.querySelector("#yearChips"),
  exam: document.querySelector("#examSelect"),
  examChips: document.querySelector("#examChips"),
  scopeChips: document.querySelector("#scopeChips"),
  recordCount: document.querySelector("#recordCount"),
  status: document.querySelector("#lookupStatus"),
  resultSubject: document.querySelector("#resultSubject"),
  resultTitle: document.querySelector("#resultTitle"),
  gradeGrid: document.querySelector("#gradeCutGrid"),
  mean: document.querySelector("#meanValue"),
  standardDeviation: document.querySelector("#sdValue"),
  examYear: document.querySelector("#examYearValue"),
  sourceLink: document.querySelector("#sourceLink"),
  questionCount: document.querySelector("#questionAnalysisCount"),
  questionGrid: document.querySelector("#questionAnalysisGrid"),
  unpublished: document.querySelector("#questionUnpublished"),
  trend: document.querySelector("#cutTrendChart"),
  historyCount: document.querySelector("#historyCount"),
  historyBody: document.querySelector("#historyTableBody"),
  collectionDate: document.querySelector("#collectionDate"),
  lightbox: document.querySelector("#cutLightbox"),
  lightboxTitle: document.querySelector("#cutLightboxTitle"),
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
  return Number.isInteger(number) ? String(number) : number.toFixed(digits);
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
    elements.resultTitle.textContent = "선택 없음";
    elements.gradeGrid.replaceChildren();
    elements.mean.textContent = "-";
    elements.standardDeviation.textContent = "-";
    elements.examYear.textContent = "-";
    return;
  }

  elements.resultSubject.textContent = record.subject;
  elements.resultTitle.textContent = recordTitle(record);
  elements.mean.textContent = isFiniteNumber(record.national_mean) ? formatNumber(record.national_mean) : "미발표";
  elements.standardDeviation.textContent = isFiniteNumber(record.national_sd) ? formatNumber(record.national_sd) : "미발표";
  elements.examYear.textContent = `${record.exam_year}년`;
  renderGradeCards(record);
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

function createChoiceDistribution(rates, answer) {
  const distribution = document.createElement("div");
  distribution.className = "cut-choice-distribution";
  distribution.setAttribute("role", "group");
  distribution.setAttribute(
    "aria-label",
    answer === null
      ? "선택지별 선택률"
      : `선택지별 선택률, 정답 ${answer}번`,
  );

  const title = document.createElement("span");
  title.className = "cut-choice-title";
  title.setAttribute("aria-hidden", "true");
  title.textContent = "선택률";

  const list = document.createElement("ul");
  list.className = "cut-choice-list";
  list.setAttribute("role", "list");

  rates.forEach((rate, index) => {
    const choice = index + 1;
    const isAnswer = choice === answer;
    const item = document.createElement("li");
    item.className = "cut-choice-item";
    if (isAnswer) item.classList.add("is-answer");
    item.setAttribute(
      "aria-label",
      `${choice}번 선택지 선택률 ${formatPercent(rate)}${isAnswer ? ", 정답" : ""}`,
    );

    const symbol = document.createElement("span");
    symbol.className = "cut-choice-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = CIRCLED_CHOICES[choice];

    const value = document.createElement("span");
    value.className = "cut-choice-value";
    value.setAttribute("aria-hidden", "true");
    value.textContent = formatPercent(rate);

    const bar = document.createElement("span");
    bar.className = "cut-choice-bar";
    bar.setAttribute("aria-hidden", "true");
    bar.style.setProperty("--choice-rate", `${Math.max(0, Math.min(100, rate))}%`);

    item.append(symbol, value, bar);
    list.appendChild(item);
  });

  distribution.append(title, list);
  return distribution;
}

function createEmptyQuestionImage() {
  const empty = document.createElement("div");
  empty.className = "cut-question-image-frame is-empty";
  const label = document.createElement("span");
  label.textContent = "문항 이미지 없음";
  empty.appendChild(label);
  return empty;
}

function createQuestionImage(record, question, imageData) {
  if (!imageData?.url) return null;

  const link = document.createElement("a");
  link.className = "cut-question-image-frame";
  link.href = imageData.url;
  link.dataset.question = String(question);
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openLightbox(question);
  });
  link.setAttribute(
    "aria-label",
    `${recordTitle(record)} ${record.subject} ${question}번 문항 원본 보기`,
  );

  const image = document.createElement("img");
  image.src = imageData.url;
  image.alt = `${recordTitle(record)} ${record.subject} ${question}번 문항`;
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    link.replaceWith(createEmptyQuestionImage());
  }, { once: true });
  link.appendChild(image);
  return link;
}

function renderQuestionAnalysis(record) {
  elements.questionGrid.replaceChildren();
  elements.unpublished.replaceChildren();
  elements.unpublished.hidden = true;
  if (!record) {
    elements.questionCount.textContent = "0문항";
    return;
  }

  const observed = (record.items || [])
    .filter((item) => isFiniteNumber(item.national_rate) && item.source === "ebsi_wrong_top15")
    .sort((left, right) => Number(left.national_rate) - Number(right.national_rate));
  const observedNumbers = new Set(observed.map((item) => Number(item.question)));
  const unpublished = QUESTION_NUMBERS.filter((question) => !observedNumbers.has(question));
  const fragment = document.createDocumentFragment();
  let imageCount = 0;

  for (const item of observed) {
    const question = Number(item.question);
    const correctRate = Number(item.national_rate);
    const wrongRate = 100 - correctRate;
    const answer = correctChoice(record, question);
    const choiceRates = questionChoiceRates(record, question);
    const imageData = questionImageByKey.get(
      questionImageKey(record.subject, record.exam_year, record.month, question),
    );
    const card = document.createElement("article");
    card.className = "cut-question-card";
    card.setAttribute("aria-label", question + "번 " + formatNumber(item.points, 0) +
      "점, 오답률 " + formatPercent(wrongRate));

    if (imageData?.url) {
      card.appendChild(createQuestionImage(record, question, imageData));
      imageCount += 1;
    } else {
      card.classList.add("is-rate-only");
    }

    const body = document.createElement("div");
    body.className = "cut-question-body";
    const heading = document.createElement("div");
    heading.className = "cut-question-card-heading";
    const number = document.createElement("strong");
    number.textContent = question + "번";
    const points = document.createElement("span");
    points.textContent = formatNumber(item.points, 0) + "점";
    heading.append(number, points);

    const rates = document.createElement("div");
    rates.className = "cut-question-rates";
    const wrong = document.createElement("strong");
    wrong.textContent = "오답률 " + formatPercent(wrongRate);
    const correct = document.createElement("span");
    correct.textContent = "정답률 " + formatPercent(correctRate);
    rates.append(wrong, correct);

    const rateBar = document.createElement("span");
    rateBar.className = "cut-question-rate-bar";
    rateBar.setAttribute("aria-hidden", "true");
    rateBar.style.setProperty("--wrong-rate", Math.max(0, Math.min(100, wrongRate)) + "%");
    body.append(heading, rates, rateBar);

    if (answer !== null) {
      const answerLabel = document.createElement("span");
      answerLabel.className = "cut-question-answer";
      answerLabel.textContent = "정답 " + CIRCLED_CHOICES[answer];
      body.appendChild(answerLabel);
    }
    if (choiceRates) body.appendChild(createChoiceDistribution(choiceRates, answer));
    card.appendChild(body);
    fragment.appendChild(card);
  }

  if (!observed.length) {
    const empty = document.createElement("div");
    empty.className = "tw-empty";
    empty.textContent = "오답률 미발표";
    fragment.appendChild(empty);
  }
  elements.questionGrid.classList.toggle("is-rate-only", imageCount === 0);
  elements.questionGrid.replaceChildren(fragment);

  if (observed.length && unpublished.length) {
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

  const summary = [observed.length + "문항"];
  if (imageCount) summary.push("이미지 " + imageCount + "장");
  elements.questionCount.replaceChildren(...summary.map((label) => {
    const node = document.createElement("span");
    node.textContent = label;
    return node;
  }));
}

function renderTrend(activeRecord) {
  elements.trend.replaceChildren();
  if (!activeRecord) return;
  const centerYear = Number(activeRecord.school_year);
  const grouped = new Map();
  scopeRecords().filter(isEvaluation).forEach((record) => {
    if (Number(record.school_year) < centerYear - 3 ||
        Number(record.school_year) > centerYear + 1) return;
    const key = recordKey(record);
    if (!grouped.has(key)) grouped.set(key, { key, sample: record, bySubject: {} });
    grouped.get(key).bySubject[record.subject] = record;
  });
  const exams = [...grouped.values()].sort((left, right) =>
    Number(left.sample.school_year) - Number(right.sample.school_year) ||
    Number(left.sample.month) - Number(right.sample.month));
  if (!exams.length) return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 800 256");
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
  const x0 = 52, x1 = 778, y0 = 32, y1 = 216;
  const x = (index) => x0 + (x1 - x0) * index / Math.max(exams.length - 1, 1);
  const y = (value) => y1 - (value - low) / Math.max(high - low, 1) * (y1 - y0);

  add("text", {x: x0, y: 16, fill: "#5d5d5d", "font-size": 11}, "원점수");
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
      add("line", {x1: xx, y1: y0, x2: xx, y2: y1, stroke: "rgba(0,0,0,.32)"});
      if (!isFiniteNumber(activeRecord.raw1)) {
        add("text", {x: xx - 4, y: y0 - 9, "text-anchor": "end",
          fill: "#5d5d5d", "font-size": 11}, "미발표");
      }
    }
    const label = String(exam.sample.school_year).slice(-2) + " " + monthLabel(exam.sample.month);
    add("text", {x: xx, y: 245, "text-anchor": "middle",
      fill: "#5d5d5d", "font-size": 10}, label);
  });
  SUPPORTED_SUBJECTS.forEach((subject, seriesIndex) => {
    const points = exams.map((exam, index) => ({
      x: x(index),
      value: isFiniteNumber(exam.bySubject[subject]?.raw1)
        ? Number(exam.bySubject[subject].raw1) : NaN,
      key: exam.key,
    })).filter((point) => Number.isFinite(point.value));
    if (points.length) {
      add("polyline", {
        points: points.map((point) => point.x + "," + y(point.value)).join(" "),
        fill: "none",
        stroke: seriesIndex ? "#5d5d5d" : "#0d0d0d",
        "stroke-width": 1.8,
        ...(seriesIndex ? {"stroke-dasharray": "6 4"} : {}),
      });
    }
    points.forEach((point) => {
      const selected = point.key === recordKey(activeRecord);
      const marker = add(seriesIndex ? "rect" : "circle", seriesIndex
        ? {x: point.x - (selected ? 5 : 3), y: y(point.value) - (selected ? 5 : 3),
          width: selected ? 10 : 6, height: selected ? 10 : 6,
          fill: selected ? "#0d0d0d" : "#ffffff", stroke: "#0d0d0d", "stroke-width": 1.5}
        : {cx: point.x, cy: y(point.value), r: selected ? 5 : 3.5,
          fill: selected ? "#0d0d0d" : "#ffffff", stroke: "#0d0d0d", "stroke-width": 1.5});
      const title = document.createElementNS(svgNS, "title");
      title.textContent = subject + " " + point.value + "점";
      marker.appendChild(title);
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
      const target = x(selectedIndex) / 800 * svg.getBoundingClientRect().width
        - scroll.clientWidth * 0.72;
      scroll.scrollLeft = Math.max(0, target);
    });
  }
}

function renderHistory(activeRecord) {
  const grouped = new Map();
  scopeRecords().forEach((record) => {
    const key = recordKey(record);
    if (!grouped.has(key)) grouped.set(key, { key, sample: record, bySubject: {} });
    grouped.get(key).bySubject[record.subject] = record;
  });
  const exams = [...grouped.values()].sort((left, right) => sortRecords(left.sample, right.sample));
  const fragment = document.createDocumentFragment();
  for (const exam of exams) {
    const row = document.createElement("tr");
    if (activeRecord && exam.key === recordKey(activeRecord)) row.classList.add("is-selected");
    const titleCell = document.createElement("td");
    titleCell.className = "cut-history-exam";
    titleCell.textContent = recordTitle(exam.sample);
    const previewCell = document.createElement("td");
    const lines = document.createElement("div");
    lines.className = "cut-history-lines";
    SUPPORTED_SUBJECTS.forEach((subject) => {
      const record = exam.bySubject[subject];
      if (!record) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cut-history-select";
      button.dataset.recordKey = exam.key;
      button.dataset.subject = subject;
      button.setAttribute("aria-label", subject + " " + recordTitle(record) + " 보기");
      if (activeRecord?.subject === subject && exam.key === recordKey(activeRecord))
        button.setAttribute("aria-current", "true");
      const label = document.createElement("span");
      label.className = "cut-history-subject";
      label.textContent = subject;
      const strip = document.createElement("span");
      strip.className = "cut-history-strip";
      strip.setAttribute("aria-hidden", "true");
      const observed = new Map((record.items || [])
        .filter((item) => isFiniteNumber(item.national_rate))
        .map((item) => [Number(item.question), 100 - Number(item.national_rate)]));
      QUESTION_NUMBERS.forEach((question) => {
        const cell = document.createElement("span");
        cell.className = "cut-history-cell";
        if (observed.has(question)) {
          const shade = Math.round(15 + observed.get(question) * 0.8);
          cell.style.setProperty("--shade", Math.min(95, Math.max(15, shade)) + "%");
        } else if (observed.size) {
          cell.classList.add("is-unpublished");
        } else {
          cell.classList.add("is-empty");
        }
        strip.appendChild(cell);
      });
      button.append(label, strip);
      lines.appendChild(button);
    });
    previewCell.appendChild(lines);
    row.append(titleCell, previewCell);
    fragment.appendChild(row);
  }
  elements.historyBody.replaceChildren(fragment);
  elements.historyCount.textContent = exams.length + "개 시험";
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
  renderResult(record);
  renderTrend(record);
  renderQuestionAnalysis(record);
  renderHistory(record);
  elements.recordCount.textContent = scopeRecords().length + " records";
  syncUrl(record);
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
}

async function loadData() {
  const response = await fetch(EBSI_URL);
  if (!response.ok) throw new Error("자료를 불러오지 못했습니다. (" + response.status + ")");
  return response.json();
}

async function loadQuestionImageManifest() {
  const response = await fetch(QUESTION_IMAGE_MANIFEST_URL);
  if (!response.ok) return { items: [] };
  return response.json();
}

function initialSelectionFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const subject = params.get("subject");
  if (SUPPORTED_SUBJECTS.includes(subject)) elements.subject.value = subject;
  scope = params.get("scope") === "all" ? "all" : "evaluation";
  const exam = params.get("exam") ||
    (params.get("year") && params.get("month")
      ? params.get("year") + "-" + String(params.get("month")).padStart(2, "0")
      : "");
  return { exam };
}

function updateLightbox() {
  const record = selectedRecord();
  if (!record) return;
  const question = lightboxQuestion;
  const item = (record.items || []).find((entry) => Number(entry.question) === question);
  const imageData = questionImageByKey.get(
    questionImageKey(record.subject, record.exam_year, record.month, question),
  );
  elements.lightboxTitle.textContent = recordTitle(record) + "  " + question + "번";
  elements.lightboxImage.hidden = !imageData?.url;
  elements.lightboxEmpty.hidden = Boolean(imageData?.url);
  elements.lightboxImage.src = imageData?.url || "";
  elements.lightboxImage.alt = imageData?.url ? recordTitle(record) + " " + question + "번 문항" : "";
  const rate = isFiniteNumber(item?.national_rate)
    ? 100 - Number(item.national_rate) : null;
  elements.lightboxRate.textContent = "오답률 " + (rate === null ? "-" : formatPercent(rate));
  elements.lightboxPoints.textContent = "배점 " + (isFiniteNumber(item?.points)
    ? formatNumber(item.points, 0) + "점" : "-");
  elements.lightboxPrev.disabled = question <= 1;
  elements.lightboxNext.disabled = question >= 20;
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
    elements.status.textContent = "자료 준비됨";
    if (payload.source_url) elements.sourceLink.href = payload.source_url;
    if (payload.fetched_at) {
      elements.collectionDate.textContent = String(payload.fetched_at).slice(0, 10).replaceAll("-", ".");
    }
    renderSelection();
  } catch (error) {
    elements.recordCount.textContent = "Load failed";
    elements.status.textContent = error instanceof Error ? error.message : "자료를 불러오지 못했습니다.";
    renderResult(null);
    renderTrend(null);
    renderQuestionAnalysis(null);
    renderHistory(null);
  } finally {
    setLoadingState(false);
  }
}

elements.subject.addEventListener("change", () => {
  populateYears();
  populateExams();
  renderSelection();
});
elements.year.addEventListener("change", () => {
  populateExams();
  renderSelection();
});
elements.exam.addEventListener("change", renderSelection);
elements.scopeChips.addEventListener("click", (event) => {
  const button = event.target.closest("[data-scope]");
  if (!button || !records.length || button.dataset.scope === scope) return;
  scope = button.dataset.scope;
  populateYears(elements.year.value);
  populateExams(elements.exam.value);
  renderSelection();
});
elements.historyBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-record-key]");
  if (button) selectHistoryRecord(button.dataset.recordKey, button.dataset.subject);
});
elements.lightboxClose.addEventListener("click", () => elements.lightbox.close());
elements.lightboxPrev.addEventListener("click", () => {
  lightboxQuestion = Math.max(1, lightboxQuestion - 1);
  updateLightbox();
});
elements.lightboxNext.addEventListener("click", () => {
  lightboxQuestion = Math.min(20, lightboxQuestion + 1);
  updateLightbox();
});
elements.lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    lightboxQuestion = Math.max(1, lightboxQuestion - 1);
    updateLightbox();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    lightboxQuestion = Math.min(20, lightboxQuestion + 1);
    updateLightbox();
  }
});

initialize();
