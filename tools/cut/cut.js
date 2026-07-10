const EBSI_URL = "./data/ebsi_geo_data.json";
const SUPPORTED_SUBJECTS = ["한국지리", "세계지리"];
const GRADE_KEYS = ["1", "2", "3"];

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
  historyCount: document.querySelector("#historyCount"),
  historyBody: document.querySelector("#historyTableBody"),
};

let payload = null;
let records = [];

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
    payload = await loadData();
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
