const EBSI_URL = "./data/ebsi_geo_data.json";
const QUESTION_IMAGE_MANIFEST_URL = "./data/question-image-manifest.json";
const SUPPORTED_SUBJECTS = ["한국지리", "세계지리"];
const GRADE_KEYS = ["1", "2", "3"];
const QUESTION_NUMBERS = Array.from({ length: 20 }, (_, index) => index + 1);
const CIRCLED_CHOICES = ["", "①", "②", "③", "④", "⑤"];

const elements = {
  form: document.querySelector("#cutLookupForm"),
  subject: document.querySelector("#subjectSelect"),
  year: document.querySelector("#yearSelect"),
  exam: document.querySelector("#examSelect"),
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
  historyCount: document.querySelector("#historyCount"),
  historyBody: document.querySelector("#historyTableBody"),
};

let payload = null;
let records = [];
let questionImageByKey = new Map();

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
  return `${record.exam_year}-${String(record.month).padStart(2, "0")}`;
}

function recordTitle(record) {
  return `${record.school_year}학년도 ${monthLabel(record.month)}`;
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
    && GRADE_KEYS.some((grade) => isFiniteNumber(record?.[`raw${grade}`]))
  );
}

function selectedRecords() {
  return records.filter((record) => (
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
    records
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

function renderGradeCards(record) {
  const fragment = document.createDocumentFragment();

  for (const grade of GRADE_KEYS) {
    const card = document.createElement("article");
    card.className = "cut-grade-card";

    const label = document.createElement("span");
    label.className = "cut-grade-label";
    label.textContent = `${grade}등급`;

    const score = document.createElement("strong");
    score.className = "cut-grade-score";
    score.textContent = formatNumber(record[`raw${grade}`], 0);

    const unit = document.createElement("span");
    unit.className = "cut-grade-unit";
    unit.textContent = isFiniteNumber(record[`raw${grade}`]) ? "원점수" : "자료 없음";

    const standard = document.createElement("span");
    standard.className = "cut-standard-score";
    standard.textContent = isFiniteNumber(record[`std${grade}`])
      ? `표준점수 ${formatNumber(record[`std${grade}`], 0)}`
      : "표준점수 -";

    card.append(label, score, unit, standard);
    fragment.appendChild(card);
  }

  elements.gradeGrid.replaceChildren(fragment);
}

function renderResult(record) {
  if (!record) {
    elements.resultSubject.textContent = "-";
    elements.resultTitle.textContent = "시험을 선택하세요";
    elements.gradeGrid.replaceChildren();
    elements.mean.textContent = "-";
    elements.standardDeviation.textContent = "-";
    elements.examYear.textContent = "-";
    return;
  }

  elements.resultSubject.textContent = record.subject;
  elements.resultTitle.textContent = recordTitle(record);
  elements.mean.textContent = formatNumber(record.national_mean);
  elements.standardDeviation.textContent = formatNumber(record.national_sd);
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
  if (!imageData?.url) return createEmptyQuestionImage();

  const link = document.createElement("a");
  link.className = "cut-question-image-frame";
  link.href = imageData.url;
  link.target = "_blank";
  link.rel = "noreferrer";
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
  if (!record) {
    elements.questionGrid.replaceChildren();
    elements.questionGrid.classList.remove("is-rate-only");
    elements.questionCount.textContent = "0문항";
    return;
  }

  const itemByQuestion = new Map(
    (record.items || []).map((item) => [Number(item.question), item]),
  );
  const fragment = document.createDocumentFragment();
  const imageCount = QUESTION_NUMBERS.filter((question) => questionImageByKey.has(
    questionImageKey(record.subject, record.exam_year, record.month, question),
  )).length;
  const choiceRateCount = QUESTION_NUMBERS.filter((question) => questionChoiceRates(record, question)).length;
  elements.questionGrid.classList.toggle("is-rate-only", imageCount === 0);

  for (const question of QUESTION_NUMBERS) {
    const item = itemByQuestion.get(question) || {};
    const correctRate = isFiniteNumber(item.national_rate)
      ? Number(item.national_rate)
      : null;
    const wrongRate = correctRate === null ? null : 100 - correctRate;
    const answer = correctChoice(record, question);
    const choiceRates = questionChoiceRates(record, question);
    const imageData = questionImageByKey.get(
      questionImageKey(record.subject, record.exam_year, record.month, question),
    );

    const card = document.createElement("article");
    card.className = "cut-question-card";
    card.setAttribute(
      "aria-label",
      `${question}번 ${formatNumber(item.points, 0)}점, 오답률 ${formatPercent(wrongRate)}, 정답률 ${formatPercent(correctRate)}`,
    );

    if (imageCount > 0) {
      card.appendChild(createQuestionImage(record, question, imageData));
    } else {
      card.classList.add("is-rate-only");
    }

    const body = document.createElement("div");
    body.className = "cut-question-body";

    const heading = document.createElement("div");
    heading.className = "cut-question-card-heading";
    const number = document.createElement("strong");
    number.textContent = `${question}번`;
    const points = document.createElement("span");
    points.textContent = isFiniteNumber(item.points) ? `${formatNumber(item.points, 0)}점` : "배점 -";
    heading.append(number, points);

    if (String(item.source || "").includes("inferred")) {
      const inferred = document.createElement("span");
      inferred.className = "cut-question-inferred";
      inferred.textContent = "추정";
      inferred.title = "EBSi 오답률 상위 문항 밖의 보완값";
      heading.appendChild(inferred);
    }

    const rates = document.createElement("div");
    rates.className = "cut-question-rates";
    const wrong = document.createElement("strong");
    wrong.textContent = `오답률 ${formatPercent(wrongRate)}`;
    const correct = document.createElement("span");
    correct.textContent = `정답률 ${formatPercent(correctRate)}`;
    rates.append(wrong, correct);

    const rateBar = document.createElement("span");
    rateBar.className = "cut-question-rate-bar";
    rateBar.setAttribute("aria-hidden", "true");
    if (wrongRate !== null) {
      rateBar.style.setProperty("--wrong-rate", `${Math.max(0, Math.min(100, wrongRate))}%`);
    }

    body.append(heading, rates, rateBar);

    if (answer !== null) {
      const answerLabel = document.createElement("span");
      answerLabel.className = "cut-question-answer";
      answerLabel.textContent = `정답 ${CIRCLED_CHOICES[answer]}`;
      body.appendChild(answerLabel);
    }

    if (choiceRates) {
      body.appendChild(createChoiceDistribution(choiceRates, answer));
    }

    card.appendChild(body);
    fragment.appendChild(card);
  }

  elements.questionGrid.replaceChildren(fragment);
  const imageSummary = imageCount > 0 ? `이미지 ${imageCount}장` : "사진 없음";
  elements.questionCount.textContent = `20문항 · ${imageSummary} · 선택률 ${choiceRateCount}문항`;
}

function createHistoryCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderHistory(activeRecord) {
  const subjectRecords = records
    .filter((record) => record.subject === elements.subject.value)
    .sort(sortRecords);
  const activeKey = activeRecord
    ? `${activeRecord.subject}-${recordKey(activeRecord)}`
    : "";
  const fragment = document.createDocumentFragment();

  for (const record of subjectRecords) {
    const row = document.createElement("tr");
    const key = `${record.subject}-${recordKey(record)}`;
    if (key === activeKey) row.classList.add("is-selected");

    const examCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cut-history-select";
    button.dataset.recordKey = key;
    button.textContent = recordTitle(record);
    button.setAttribute("aria-label", `${recordTitle(record)} ${record.subject} 등급컷 보기`);
    if (key === activeKey) button.setAttribute("aria-current", "true");
    examCell.appendChild(button);

    row.append(
      examCell,
      createHistoryCell(formatNumber(record.raw1, 0)),
      createHistoryCell(formatNumber(record.raw2, 0)),
      createHistoryCell(formatNumber(record.raw3, 0)),
      createHistoryCell(formatNumber(record.national_mean)),
    );
    fragment.appendChild(row);
  }

  elements.historyBody.replaceChildren(fragment);
  elements.historyCount.textContent = `${subjectRecords.length}개 시험`;
}

function syncUrl(record) {
  if (!record || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.set("subject", record.subject);
  url.searchParams.set("year", String(record.school_year));
  url.searchParams.set("month", String(record.month).padStart(2, "0"));
  window.history.replaceState(null, "", url);
}

function renderSelection() {
  const record = selectedRecord();
  renderResult(record);
  renderQuestionAnalysis(record);
  renderHistory(record);
  syncUrl(record);
}

function selectHistoryRecord(key) {
  const record = records.find((item) => `${item.subject}-${recordKey(item)}` === key);
  if (!record) return;
  elements.subject.value = record.subject;
  populateYears(record.school_year);
  populateExams(recordKey(record));
  renderSelection();
}

function setLoadingState(isLoading) {
  elements.form.querySelectorAll("select").forEach((select) => {
    select.disabled = isLoading;
  });
}

async function loadData() {
  const response = await fetch(EBSI_URL);
  if (!response.ok) {
    throw new Error(`자료를 불러오지 못했습니다. (${response.status})`);
  }
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
  const year = params.get("year");
  const month = params.get("month");
  if (SUPPORTED_SUBJECTS.includes(subject)) elements.subject.value = subject;
  return { year, month };
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
    populateYears(initial.year);

    const matchingMonthRecord = records.find((record) => (
      record.subject === elements.subject.value
      && Number(record.school_year) === Number(elements.year.value)
      && String(record.month).padStart(2, "0") === String(initial.month).padStart(2, "0")
    ));
    populateExams(matchingMonthRecord ? recordKey(matchingMonthRecord) : "");

    elements.recordCount.textContent = `${records.length} records`;
    elements.status.textContent = "EBSi 실제 시행 자료";
    if (payload.source_url) elements.sourceLink.href = payload.source_url;
    renderSelection();
  } catch (error) {
    elements.recordCount.textContent = "Load failed";
    elements.status.textContent = error instanceof Error ? error.message : "자료를 불러오지 못했습니다.";
    renderResult(null);
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

elements.historyBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-record-key]");
  if (button) selectHistoryRecord(button.dataset.recordKey);
});

initialize();
