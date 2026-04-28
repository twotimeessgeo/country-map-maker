const MODEL_URL = "./data/geo_cut_model.json";
const EBSI_URL = "./data/ebsi_geo_data.json";
const IMAGE_MANIFEST_URL = "./data/question-image-manifest.json";
const GRADE_Z = {
  "1": 1.7506860712521692,
  "2": 1.2265281200366105,
  "3": 0.7388468491852137,
};

const elements = {
  toolTabs: Array.from(document.querySelectorAll("[data-tool-tab]")),
  toolPanels: Array.from(document.querySelectorAll("[data-tool-panel]")),
  form: document.querySelector("#cutForm"),
  subject: document.querySelector("#subjectSelect"),
  mode: document.querySelector("#modeSelect"),
  relation: document.querySelector("#relationText"),
  history: document.querySelector("#historySelect"),
  loadHistory: document.querySelector("#loadHistoryButton"),
  paste: document.querySelector("#ratePaste"),
  applyPaste: document.querySelector("#applyPasteButton"),
  defaultPoints: document.querySelector("#defaultPointsButton"),
  inputGrid: document.querySelector("#inputGrid"),
  modelBadge: document.querySelector("#modelBadge"),
  statusBadge: document.querySelector("#statusBadge"),
  resultTitle: document.querySelector("#resultTitle"),
  emptyResult: document.querySelector("#emptyResult"),
  emptyResultText: document.querySelector("#emptyResultText"),
  resultPanel: document.querySelector("#resultPanel"),
  cutCardGrid: document.querySelector("#cutCardGrid"),
  meanMetric: document.querySelector("#meanMetric"),
  rateMetric: document.querySelector("#rateMetric"),
  warningText: document.querySelector("#warningText"),
  scoreTable: document.querySelector("#scoreTable"),
  historyTable: document.querySelector("#historyTable"),
  rateTable: document.querySelector("#rateTable"),
  modelMeta: document.querySelector("#modelMeta"),
  questionForm: document.querySelector("#questionSearchForm"),
  questionBankBadge: document.querySelector("#questionBankBadge"),
  questionSubject: document.querySelector("#questionSearchSubject"),
  questionExam: document.querySelector("#questionExamSelect"),
  questionYearFrom: document.querySelector("#questionYearFrom"),
  questionYearTo: document.querySelector("#questionYearTo"),
  questionMonth: document.querySelector("#questionSearchMonth"),
  questionNumber: document.querySelector("#questionNumber"),
  questionDifficulty: document.querySelector("#questionDifficulty"),
  questionMatch: document.querySelector("#questionMatchStatus"),
  wrongRateMin: document.querySelector("#wrongRateMin"),
  wrongRateMax: document.querySelector("#wrongRateMax"),
  questionKeyword: document.querySelector("#questionKeyword"),
  questionSort: document.querySelector("#questionSearchSort"),
  questionReset: document.querySelector("#questionSearchResetButton"),
  questionPresetButtons: Array.from(document.querySelectorAll("[data-question-preset]")),
  questionSearchMeta: document.querySelector("#questionSearchMeta"),
  questionResultGrid: document.querySelector("#questionResultGrid"),
  solutionForm: document.querySelector("#solutionForm"),
  csvInput: document.querySelector("#csvInput"),
  csvLabel: document.querySelector("#csvLabel"),
  csvMeta: document.querySelector("#csvMeta"),
  solutionStatusBadge: document.querySelector("#solutionStatusBadge"),
  solutionMatchRow: document.querySelector("#solutionMatchRow"),
  solutionViewer: document.querySelector("#solutionViewer"),
  solutionOverviewTable: document.querySelector("#solutionOverviewTable"),
  solutionDetailGrid: document.querySelector("#solutionDetailGrid"),
  downloadCsvButton: document.querySelector("#downloadCsvButton"),
  downloadCsvTemplateButton: document.querySelector("#downloadCsvTemplateButton"),
  predictButton: document.querySelector("#cutForm [type=\"submit\"]"),
};

let model = null;
let ebsiPayload = null;
let historicalExams = [];
let lastLoadedHistoryId = null;
let isHistoryActualMode = false;
let historyActualModeLabel = "";
let questionBankItems = [];
let questionAvailableExams = [];
let questionImageById = new Map();
let currentSolutions = [];
let currentCsvHeaders = [];
let currentCsvFilename = "solutions.csv";
const DEFAULT_HISTORY_YEAR = 2026;
const CSV_TEMPLATE_HEADERS = [
  "문항 번호",
  "정답",
  "예상 정답률",
  "선택 비율 예상",
  "추정 변별도",
  "추정 타당도",
  "오류 가능성",
  "해설",
  "정답 풀이",
  "오답 풀이",
  "검토 메모(장점)",
  "검토 메모(약점)",
  "Comment 제목",
  "Comment 내용",
];

function ensureValueOrDefault(element, value) {
  if (!element) return;
  element.value = String(value);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function formatFixed(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "-";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

function erf(value) {
  const sign = value >= 0 ? 1 : -1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCdf(zScore) {
  return 0.5 * (1 + erf(zScore / Math.SQRT2));
}

function renderCutRows() {
  elements.inputGrid.innerHTML = "";
  for (let index = 0; index < 20; index += 1) {
    const row = document.createElement("div");
    row.className = "cut-row";
    row.innerHTML = `
      <span class="cut-number">${index + 1}</span>
      <label>
        <span>배점</span>
        <input data-point-input type="number" min="1" max="5" step="1" inputmode="numeric" />
      </label>
      <label>
        <span>정답률</span>
        <input data-rate-input type="number" min="0" max="100" step="0.1" inputmode="decimal" />
      </label>
    `;
    elements.inputGrid.appendChild(row);
  }
}

function pointInputs() {
  return Array.from(elements.inputGrid.querySelectorAll("[data-point-input]"));
}

function rateInputs() {
  return Array.from(elements.inputGrid.querySelectorAll("[data-rate-input]"));
}

function setStatus(text, solid = false) {
  elements.statusBadge.textContent = text;
  elements.statusBadge.classList.toggle("is-solid", solid);
}

function setModelBadge(text, solid = false) {
  elements.modelBadge.textContent = text;
  elements.modelBadge.classList.toggle("is-solid", solid);
}

function setToolTab(tabName, updateHash = false) {
  const nextTab = ["questions", "solutions"].includes(tabName) ? tabName : "predict";
  elements.toolTabs.forEach((button) => {
    const isActive = button.dataset.toolTab === nextTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  elements.toolPanels.forEach((panel) => {
    panel.hidden = panel.dataset.toolPanel !== nextTab;
  });
  if (updateHash && window.history?.replaceState) {
    const hashByTab = { predict: "#cut-predictor", questions: "#question-bank", solutions: "#csv-solutions" };
    window.history.replaceState(null, "", hashByTab[nextTab]);
  }
  if (nextTab === "questions" && questionBankItems.length) {
    renderQuestionSearchResults();
  }
}

function setBusy(isBusy) {
  elements.form.querySelectorAll("button, input, select, textarea").forEach((control) => {
    control.disabled = isBusy;
  });
  if (!isBusy && isHistoryActualMode) {
    setHistoryInputLock(true, historyActualModeLabel);
  }
  if (isBusy) setStatus("계산 중", true);
}

function setHistoryInputLock(isLocked, sourceLabel = "과거 시험 DB") {
  const pointControls = [...pointInputs(), ...rateInputs()];
  pointControls.forEach((input) => {
    input.readOnly = isLocked;
    input.disabled = isLocked;
  });

  if (elements.paste) {
    elements.paste.readOnly = isLocked;
    elements.paste.disabled = isLocked;
  }
  if (elements.applyPaste) {
    elements.applyPaste.disabled = isLocked;
  }
  if (elements.defaultPoints) {
    elements.defaultPoints.disabled = isLocked;
  }
  if (elements.mode) {
    elements.mode.disabled = isLocked;
  }
  if (elements.history) {
    elements.history.disabled = false;
  }
  if (elements.loadHistory) {
    elements.loadHistory.disabled = false;
  }
  if (elements.predictButton) {
    elements.predictButton.disabled = isLocked;
    elements.predictButton.setAttribute("aria-disabled", isLocked ? "true" : "false");
  }

  isHistoryActualMode = isLocked;
  historyActualModeLabel = isLocked ? sourceLabel : "";
}

function releaseHistoryInputLock() {
  setHistoryInputLock(false);
}

function buildJsonUrlCandidates(url) {
  const trimmed = String(url || "");
  const candidates = [trimmed];
  if (!trimmed.startsWith("./data/")) {
    return candidates;
  }

  const relativePath = trimmed.replace(/^\.\//, "");
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    const marker = "/tools/cut/";
    const markerIndex = window.location.pathname.lastIndexOf(marker);
    if (markerIndex >= 0) {
      const rootPath = window.location.pathname.slice(0, markerIndex);
      candidates.push(`${rootPath}${marker}${relativePath}`);
      candidates.push(`/tools/cut/${relativePath}`);
      candidates.push(`${window.location.origin}${rootPath}${marker}${relativePath}`);
    } else {
      candidates.push(`/tools/cut/${relativePath}`);
      candidates.push(`${window.location.origin}/tools/cut/${relativePath}`);
    }
  }

  return [...new Set(candidates)];
}

async function loadJson(url) {
  const candidates = buildJsonUrlCandidates(url);
  const failures = [];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        failures.push(`${candidate} (${response.status} ${response.statusText})`);
        continue;
      }
      return response.json();
    } catch (error) {
      failures.push(`${candidate} (${error instanceof Error ? error.message : "네트워크 오류"})`);
    }
  }

  throw new Error(`${url} 로드 실패: ${failures.join(", ")}`);
}

async function loadOptionalJson(url, fallback) {
  try {
    return await loadJson(url);
  } catch {
    return fallback;
  }
}

function historicalExamId(record) {
  return `${record.exam_year}-${String(record.month).padStart(2, "0")}-${record.subject}`;
}

function questionSubjectCode(subject) {
  return subject === "세계지리" ? "world" : "korea";
}

function supportedRecord(record) {
  if (!["한국지리", "세계지리"].includes(record?.subject)) return false;
  const items = record.items || [];
  if (items.length !== 20) return false;
  return items.every((item) => item.national_rate !== null && item.national_rate !== undefined && item.points !== null && item.points !== undefined);
}

function buildHistoricalExams() {
  const exams = [];
  for (const record of ebsiPayload.records || []) {
    if (!supportedRecord(record)) continue;
    const inferredItems = (record.items || []).filter((item) => {
      const source = String(item.source || "");
      return source.includes("inferred") || source.startsWith("easy_floor");
    });
    const cuts = {};
    for (const cut of ["1", "2", "3"]) {
      if (record[`raw${cut}`] !== null && record[`raw${cut}`] !== undefined) {
        cuts[cut] = Math.trunc(Number(record[`raw${cut}`]));
      }
    }
    exams.push({
      id: historicalExamId(record),
      subject: record.subject,
      exam_year: record.exam_year,
      school_year: record.school_year,
      month: String(record.month).padStart(2, "0"),
      label: `${record.exam_year}년 ${String(record.month).padStart(2, "0")}월 ${record.subject}`,
      mean: record.national_mean,
      nat_sd: record.national_sd,
      cuts,
      points: record.items.map((item) => Number(item.points)),
      rates: record.items.map((item) => Number(item.national_rate)),
      inferred_count: inferredItems.length,
    });
  }
  exams.sort((a, b) => (
    Number(b.exam_year) - Number(a.exam_year)
    || Number(b.month) - Number(a.month)
    || String(a.subject).localeCompare(String(b.subject), "ko")
  ));
  return exams;
}

function monthLabel(month) {
  const padded = String(month).padStart(2, "0");
  return padded === "11" ? "수능" : `${Number(padded)}월`;
}

function examShortLabel(record) {
  const schoolYear = record.school_year || Number(record.exam_year) + 1;
  return `${schoolYear} ${monthLabel(record.month)}`;
}

function examLabel(record) {
  const schoolYear = record.school_year || Number(record.exam_year) + 1;
  return `${schoolYear}학년도 ${monthLabel(record.month)} ${record.subject}`;
}

function rateSourceLabel(source) {
  const text = String(source || "");
  if (text.includes("inferred") || text.startsWith("easy_floor")) return "보충 데이터";
  if (text) return "EBSi";
  return "정보 없음";
}

function matchStatus(source, record) {
  if (!record) return ["unmatched", "정보 없음"];
  const text = String(source || "");
  if (text.includes("inferred") || text.startsWith("easy_floor")) return ["inferred", "보충 데이터"];
  if (text) return ["exact", "EBSi"];
  return ["unmatched", "정보 없음"];
}

function difficultyBand(wrongRate) {
  if (!Number.isFinite(wrongRate)) return ["unknown", "정보 없음"];
  if (wrongRate >= 60) return ["very_hard", "최고난도"];
  if (wrongRate >= 45) return ["hard", "고난도"];
  if (wrongRate >= 25) return ["normal", "보통"];
  return ["easy", "쉬움"];
}

function recordCuts(record) {
  const cuts = {};
  for (const cut of ["1", "2", "3"]) {
    if (record?.[`raw${cut}`] !== null && record?.[`raw${cut}`] !== undefined) {
      cuts[cut] = Math.trunc(Number(record[`raw${cut}`]));
    }
  }
  return cuts;
}

function choiceRatesFor(record, question) {
  for (const row of record.wrong_top15 || []) {
    if (Number(row.question) !== Number(question)) continue;
    const answer = Number(row.answer);
    return (row.choices || [])
      .map((rate, index) => ({
        choice: index + 1,
        rate: rate === null || rate === undefined ? null : Number(rate),
        is_answer: index + 1 === answer,
      }))
      .filter((choice) => Number.isFinite(choice.rate));
  }
  return [];
}

function buildQuestionBank() {
  const items = [];
  const examGroups = new Map();

  for (const record of ebsiPayload.records || []) {
    if (!["한국지리", "세계지리"].includes(record?.subject)) continue;
    const examKey = `${record.subject}|${record.exam_year}|${String(record.month).padStart(2, "0")}`;
    const cuts = recordCuts(record);
    const baseExam = {
      key: examKey,
      label: examLabel(record),
      short_label: examShortLabel(record),
      subject: record.subject,
      exam_year: Number(record.exam_year),
      school_year: record.school_year,
      month: String(record.month).padStart(2, "0"),
      count: 0,
      exact_count: 0,
      inferred_count: 0,
      unmatched_count: 0,
      cuts,
    };
    if (!examGroups.has(examKey)) examGroups.set(examKey, baseExam);

    for (const item of record.items || []) {
      const question = Number(item.question);
      if (!question) continue;
      const correctRate = item.national_rate === null || item.national_rate === undefined
        ? null
        : Number(item.national_rate);
      const wrongRate = Number.isFinite(correctRate) ? roundOne(100 - correctRate) : null;
      const [difficulty, difficultyLabel] = difficultyBand(wrongRate);
      const [status, statusLabel] = matchStatus(item.source, record);
      const label = `${baseExam.short_label} ${record.subject} ${question}번`;
      const imageId = `${questionSubjectCode(record.subject)}-${record.exam_year}-${baseExam.month}-${String(question).padStart(2, "0")}`;
      const image = questionImageById.get(imageId);
      const publicItem = {
        id: imageId,
        label,
        exam_key: examKey,
        exam_label: baseExam.label,
        exam_short_label: baseExam.short_label,
        subject: record.subject,
        exam_year: Number(record.exam_year),
        school_year: record.school_year,
        month: baseExam.month,
        question,
        points: item.points === null || item.points === undefined ? null : Number(item.points),
        correct_rate: Number.isFinite(correctRate) ? roundOne(correctRate) : null,
        wrong_rate: wrongRate,
        choice_rates: choiceRatesFor(record, question),
        match_status: status,
        match_label: statusLabel,
        difficulty,
        difficulty_label: difficultyLabel,
        rate_source: rateSourceLabel(item.source),
        image_url: image?.url || "",
        image_variant: image?.variant || "",
        image_source_label: image?.source_label || "",
        cuts,
        search_text: `${label} ${baseExam.label} ${statusLabel} ${difficultyLabel} ${rateSourceLabel(item.source)}`.toLowerCase(),
      };
      items.push(publicItem);

      const group = examGroups.get(examKey);
      group.count += 1;
      if (status === "exact") group.exact_count += 1;
      else if (status === "inferred") group.inferred_count += 1;
      else group.unmatched_count += 1;
    }
  }

  questionAvailableExams = Array.from(examGroups.values()).sort((a, b) => (
    b.exam_year - a.exam_year
    || Number(b.month) - Number(a.month)
    || String(a.subject).localeCompare(String(b.subject), "ko")
  ));
  return items.sort((a, b) => (
    b.exam_year - a.exam_year
    || Number(b.month) - Number(a.month)
    || String(a.subject).localeCompare(String(b.subject), "ko")
    || a.question - b.question
  ));
}

function roundOne(value) {
  return Math.round(Number(value) * 10) / 10;
}

function renderHistorySelect(selectedId = lastLoadedHistoryId) {
  const subjectExams = historicalExams.filter((exam) => exam.subject === elements.subject.value);
  elements.history.innerHTML = "";
  if (!subjectExams.length) {
    elements.history.disabled = true;
    elements.loadHistory.disabled = true;
    elements.history.innerHTML = '<option value="">시험 없음</option>';
    return;
  }

  elements.history.disabled = false;
  elements.loadHistory.disabled = false;
  for (const exam of subjectExams) {
    const inferred = exam.inferred_count ? ` · 보충 ${exam.inferred_count}문항` : "";
    const option = document.createElement("option");
    option.value = exam.id;
    option.textContent = `${exam.label} · ${exam.cuts["1"]}/${exam.cuts["2"]}/${exam.cuts["3"]}${inferred}`;
    elements.history.appendChild(option);
  }
  if (selectedId && subjectExams.some((exam) => exam.id === selectedId)) {
    elements.history.value = selectedId;
  }
}

function fillDefaultPoints() {
  const points = model?.default_points?.[elements.subject.value] || [];
  pointInputs().forEach((input, index) => {
    input.value = points[index] ?? "";
  });
}

function updateRelation() {
  if (!model) {
    elements.relation.textContent = "모델 준비 중";
    return;
  }
  const relation = model.academy_to_national_rate?.[elements.subject.value];
  if (!relation) {
    elements.relation.textContent = "환산식 없음";
    return;
  }
  const method = relation.method === "chance_floor_logit" ? "로짓 보정" : "선형 보정";
  elements.relation.textContent = `${method} · 기울기 ${formatFixed(relation.slope, 3)} · 절편 ${formatFixed(relation.intercept, 3)}`;
}

function selectedHistoryExam() {
  return historicalExams.find((exam) => exam.id === elements.history.value);
}

function loadHistoryExam(examId = elements.history.value) {
  const exam = historicalExams.find((item) => item.id === examId);
  if (!exam) {
    showWarning("과거 시험 정보를 찾을 수 없습니다.");
    elements.history.value = "";
    elements.paste.value = "";
    releaseHistoryLock();
    showPendingResultState("과거 시험을 선택해주세요");
    return;
  }
  lastLoadedHistoryId = exam.id;
  elements.subject.value = exam.subject;
  elements.mode.value = "national";
  renderHistorySelect(exam.id);
  updateRelation();
  pointInputs().forEach((input, index) => {
    input.value = exam.points[index] ?? "";
  });
  rateInputs().forEach((input, index) => {
    input.value = exam.rates[index] ?? "";
  });
  elements.paste.value = exam.rates.map((rate) => formatFixed(rate)).join(", ");
  setHistoryInputLock(true, `${exam.subject} ${exam.label || ""}`.trim());
  setToolTab("predict", true);
  try {
    renderHistoryActualResult(exam);
    showWarning("");
    setStatus("채점 완료");
  } catch (error) {
    releaseHistoryLock();
    showWarning(error instanceof Error ? error.message : "과거 시험 결과 렌더링에 실패했습니다.");
    showPendingResultState("과거 시험 결과를 불러오지 못했습니다");
  }
}

function releaseHistoryLock() {
  if (!isHistoryActualMode) return;
  lastLoadedHistoryId = null;
  setHistoryInputLock(false);
}

function renderHistoryActualResult(exam) {
  if (!exam) return;
  const points = exam.points.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const rates = exam.rates.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const featureValuesForHistory = featureValues(rates, points);
  const actualPredictions = {};
  const cutDiffs = {};

  for (const cut of ["1", "2", "3"]) {
    const rawCut = Number(exam.cuts?.[cut]);
    if (!Number.isFinite(rawCut)) {
      continue;
    }
    const roundedCut = Math.trunc(rawCut);
    actualPredictions[cut] = {
      predicted_cut: rawCut,
      suggested_cut: roundedCut,
      range_low: rawCut,
      range_high: rawCut,
      rmse: NaN,
      mae: NaN,
      historical_cap: rawCut,
      runtime_correction: NaN,
    };
    cutDiffs[cut] = 0;
  }

  const conversionRows = points.map((point, index) => ({
    question: index + 1,
    points: point,
    national_rate: rates[index] ?? "",
    academy_rate: rates[index] ?? "",
    academy_rate_label: `${formatFixed(rates[index], 1)}%`,
    academy_rate_is_upper_bound: false,
  }));

  const actualData = {
    subject: exam.subject,
    mode: "national",
    predictions: actualPredictions,
    estimated_national_rates: rates,
    estimated_academy_rates: rates,
    conversion_rows: conversionRows,
    score_table: [],
    historical_matches: [
      {
        id: exam.id,
        subject: exam.subject,
        exam_year: exam.exam_year,
        month: exam.month,
        mean: exam.mean,
        nat_sd: exam.nat_sd,
        cuts: exam.cuts ?? {},
        cut_diffs: cutDiffs,
        distance: 0,
      },
    ],
    features: {
      ...featureValuesForHistory,
      mean: Number.isFinite(exam.mean) ? exam.mean : featureValuesForHistory.mean,
      nat_sd: Number.isFinite(exam.nat_sd) ? exam.nat_sd : featureValuesForHistory.nat_sd,
    },
    warnings: ["과거 시험 데이터: 실제 컷/정답률입니다."],
    matched_historical_anchors: [],
  };

  renderResult(actualData, "actual");
}

function parsePasteValues() {
  return (elements.paste.value.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

function applyPasteValues() {
  const values = parsePasteValues();
  rateInputs().forEach((input, index) => {
    input.value = Number.isFinite(values[index]) ? values[index] : "";
  });
  if (values.length !== 20) {
    showWarning(`정답률 ${values.length}개를 찾았습니다. 20개가 필요합니다.`);
  } else {
    showWarning("");
  }
}

function normalizeNumbers(values, count, label) {
  const numbers = values.map((value) => Number(value));
  if (numbers.length !== count || numbers.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label}은 ${count}개 숫자가 필요합니다.`);
  }
  return numbers;
}

function possibleRawScores(points) {
  const intPoints = [];
  for (const point of points) {
    const rounded = Math.round(point);
    if (Math.abs(point - rounded) > 0.001) return null;
    intPoints.push(rounded);
  }
  let scores = new Set([0]);
  for (const point of intPoints) {
    const nextScores = new Set(scores);
    for (const score of scores) nextScores.add(score + point);
    scores = nextScores;
  }
  return Array.from(scores).sort((a, b) => a - b);
}

function nearestPossibleScore(value, possibleScores, totalPoints) {
  const clamped = clamp(value, 0, totalPoints);
  return possibleScores.reduce((best, score) => {
    const bestKey = [Math.abs(best - clamped), -best];
    const scoreKey = [Math.abs(score - clamped), -score];
    return scoreKey[0] < bestKey[0] || (scoreKey[0] === bestKey[0] && scoreKey[1] < bestKey[1]) ? score : best;
  }, possibleScores[0]);
}

function lowerPossibleScore(value, possibleScores, totalPoints) {
  const clamped = clamp(value, 0, totalPoints);
  const candidates = possibleScores.filter((score) => score <= clamped + 0.001);
  return candidates.length ? candidates[candidates.length - 1] : possibleScores[0];
}

function upperPossibleScore(value, possibleScores, totalPoints) {
  const clamped = clamp(value, 0, totalPoints);
  const candidates = possibleScores.filter((score) => score >= clamped - 0.001);
  return candidates.length ? candidates[0] : possibleScores[possibleScores.length - 1];
}

function percentile(sortedValues, value) {
  if (sortedValues.length <= 1) return 0;
  const left = sortedValues.findIndex((item) => item >= value);
  let rightIndex = -1;
  for (let index = sortedValues.length - 1; index >= 0; index -= 1) {
    if (sortedValues[index] <= value) {
      rightIndex = index;
      break;
    }
  }
  const leftRank = left === -1 ? sortedValues.length : left;
  const rightRank = rightIndex === -1 ? -1 : rightIndex;
  const rank = (leftRank + rightRank) / 2;
  return clamp(rank / (sortedValues.length - 1), 0, 1);
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  if (q <= 0) return sortedValues[0];
  if (q >= 1) return sortedValues[sortedValues.length - 1];
  const position = q * (sortedValues.length - 1);
  const low = Math.floor(position);
  const high = Math.min(low + 1, sortedValues.length - 1);
  const fraction = position - low;
  return sortedValues[low] * (1 - fraction) + sortedValues[high] * fraction;
}

function quantileMap(info, rate, source, target) {
  const sourceRates = info[`${source}_rates`] || [];
  const targetRates = info[`${target}_rates`] || [];
  if (!sourceRates.length || !targetRates.length) return null;
  return quantile(targetRates, percentile(sourceRates, rate));
}

function mapItemRates(subject, rates, source, target) {
  const mappings = model.item_rate_mapping || {};
  const mapping = mappings[subject];
  if (!mapping) return null;
  if (!mapping[`usable_for_runtime_${source}_conversion`]) return null;

  if (mapping.method === "empirical_quantile") {
    const mapped = rates.map((rate) => quantileMap(mapping, rate, source, target));
    return mapped.some((value) => value === null) ? null : mapped;
  }

  if (mapping.method === "pooled_empirical_quantile_with_subject_shrinkage") {
    const pooled = mappings._pooled || {};
    const subjectWeight = clamp(Number(mapping.subject_weight ?? 0.25), 0, 1);
    const mapped = [];
    for (const rate of rates) {
      const pooledValue = quantileMap(pooled, rate, source, target);
      const subjectValue = quantileMap(mapping, rate, source, target);
      if (pooledValue === null && subjectValue === null) return null;
      if (pooledValue === null) mapped.push(subjectValue);
      else if (subjectValue === null) mapped.push(pooledValue);
      else mapped.push((1 - subjectWeight) * pooledValue + subjectWeight * subjectValue);
    }
    return mapped;
  }

  return null;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function chanceFloorLogit(rate, floor) {
  const scaled = clamp((rate - floor) / (100 - floor), 0.005, 0.995);
  return Math.log(scaled / (1 - scaled));
}

function chanceFloorRate(value, floor) {
  return floor + (100 - floor) * sigmoid(value);
}

function convertAcademyToNational(subject, rates) {
  const mapped = mapItemRates(subject, rates, "academy", "national");
  if (mapped) return mapped.map((mappedRate, index) => Math.min(mappedRate, rates[index]));

  const relation = model.academy_to_national_rate[subject];
  const { intercept, slope } = relation;
  if (relation.method === "chance_floor_logit") {
    const floor = relation.chance_floor;
    return rates.map((rate) => chanceFloorRate(intercept + slope * chanceFloorLogit(rate, floor), floor));
  }
  if (relation.method === "linear_with_chance_floor") {
    const floor = relation.chance_floor;
    return rates.map((rate) => clamp(intercept + slope * rate, floor, 99.5));
  }
  return rates.map((rate) => clamp(intercept + slope * rate, 0.5, 99.5));
}

function convertNationalToAcademy(subject, rates) {
  const mapped = mapItemRates(subject, rates, "national", "academy");
  if (mapped) {
    return mapped.map((value, index) => ({
      value: clamp(Math.max(value, rates[index]), 0, 100),
      label: `${formatFixed(clamp(Math.max(value, rates[index]), 0, 100))}%`,
      is_upper_bound: false,
    }));
  }

  const relation = model.academy_to_national_rate[subject];
  const { intercept, slope } = relation;
  const converted = [];
  if (relation.method === "linear_with_chance_floor") {
    const floor = relation.chance_floor;
    const threshold = clamp((floor - intercept) / slope, 0, 100);
    const upperReachable = intercept + slope * 100;
    for (const rate of rates) {
      if (rate <= floor + 0.001) {
        converted.push({ value: threshold, label: `≤${formatFixed(threshold)}%`, is_upper_bound: true });
      } else if (rate >= upperReachable - 0.001) {
        converted.push({ value: 100, label: "≥100.0%", is_upper_bound: false });
      } else {
        const value = clamp((rate - intercept) / slope, 0, 100);
        converted.push({ value, label: `${formatFixed(value)}%`, is_upper_bound: false });
      }
    }
    return converted;
  }

  if (relation.method === "chance_floor_logit") {
    const floor = relation.chance_floor;
    for (const rate of rates) {
      const value = chanceFloorRate((chanceFloorLogit(rate, floor) - intercept) / slope, floor);
      converted.push({ value: clamp(value, 0, 100), label: `${formatFixed(clamp(value, 0, 100))}%`, is_upper_bound: false });
    }
    return converted;
  }

  return rates.map((rate) => {
    const value = clamp((rate - intercept) / slope, 0, 100);
    return { value, label: `${formatFixed(value)}%`, is_upper_bound: false };
  });
}

function hardItemFeatures(rates, points, count = 15) {
  const rankedItems = rates.map((rate, index) => [rate, points[index]]).sort((a, b) => a[0] - b[0]);
  const hardItems = rankedItems.slice(0, count);
  const easyItems = rankedItems.slice(count);
  const hardPoints = sum(hardItems.map(([, point]) => point));
  const hardRate = sum(hardItems.map(([rate, point]) => point * rate)) / hardPoints;
  const hardVariance = sum(hardItems.map(([rate, point]) => point * ((rate - hardRate) ** 2))) / hardPoints;
  const easyPoints = sum(easyItems.map(([, point]) => point));
  const easyRate = easyPoints ? sum(easyItems.map(([rate, point]) => point * rate)) / easyPoints : Math.max(...rates);
  return {
    hard15_rate: hardRate,
    hard15_sd: Math.sqrt(hardVariance),
    under40_points: sum(hardItems.filter(([rate]) => rate < 40).map(([, point]) => point)),
    under50_points: sum(hardItems.filter(([rate]) => rate < 50).map(([, point]) => point)),
    easy5_rate: easyRate,
  };
}

function featureValues(rates, points) {
  const totalPoints = sum(points);
  const probabilities = rates.map((rate) => rate / 100);
  const mean = sum(points.map((point, index) => point * probabilities[index]));
  const independentSd = Math.sqrt(sum(points.map((point, index) => point * point * probabilities[index] * (1 - probabilities[index]))));
  const weightedRate = mean / totalPoints * 100;
  const rateVariance = sum(points.map((point, index) => point * ((rates[index] - weightedRate) ** 2))) / totalPoints;
  return {
    mean,
    ind_sd: independentSd,
    rate_sd: Math.sqrt(rateVariance),
    weighted_rate: weightedRate,
    ...hardItemFeatures(rates, points),
  };
}

function applyLinearModel(coefficients, subject, features) {
  let value = coefficients.intercept;
  if (subject === "세계지리") value += coefficients.world_geography_offset;
  for (const [name, coefficient] of Object.entries(coefficients)) {
    if (name === "intercept" || name === "world_geography_offset") continue;
    value += coefficient * features[name];
  }
  return value;
}

function runtimeBiasCorrection(mode, subject, cut) {
  const correction = model.runtime_corrections?.[mode];
  if (!correction || correction.method !== "subject_cut_bias_subtraction") return 0;
  const subjectCorrections = correction.by_subject?.[subject] || {};
  if (cut in subjectCorrections) return Math.max(0, Number(subjectCorrections[cut]));
  return Math.max(0, Number(correction.by_cut?.[cut] || 0));
}

function historicalCutCaps(subject, features) {
  const caps = {};
  let latestNovemberAnchor = null;
  const matched = [];
  for (const anchor of model.historical_anchors || []) {
    if (anchor.subject !== subject) continue;
    if (anchor.mean === null || anchor.nat_sd === null || anchor.hard15_rate === null) continue;
    const anchorMean = Number(anchor.mean);
    const anchorRateMean = Number(anchor.rate_mean ?? anchorMean);
    const anchorSd = Math.max(0.1, Number(anchor.nat_sd));
    const anchorEasy5Rate = Number(anchor.easy5_rate ?? anchor.easiest_top15_rate);
    const noEasier = (
      features.mean <= anchorRateMean + 0.5
      && features.hard15_rate <= Number(anchor.hard15_rate) + 1
      && features.easy5_rate <= anchorEasy5Rate + 1
    );
    if (!noEasier) continue;

    if (String(anchor.month).padStart(2, "0") === "11" && (
      !latestNovemberAnchor || Number(anchor.exam_year || 0) > Number(latestNovemberAnchor.exam_year || 0)
    )) {
      latestNovemberAnchor = anchor;
    }

    matched.push({
      exam_year: anchor.exam_year,
      month: anchor.month,
      raw1: anchor.raw1,
      raw2: anchor.raw2,
      raw3: anchor.raw3,
    });

    for (const cut of ["1", "2", "3"]) {
      const rawCut = anchor[`raw${cut}`];
      if (rawCut === null || rawCut === undefined) continue;
      caps[cut] = Math.min(caps[cut] ?? Number(rawCut), Number(rawCut));
    }
  }

  if (latestNovemberAnchor) {
    const anchorMean = Number(latestNovemberAnchor.mean);
    const anchorSd = Math.max(0.1, Number(latestNovemberAnchor.nat_sd));
    for (const cut of ["1", "2", "3"]) {
      const rawCut = latestNovemberAnchor[`raw${cut}`];
      if (rawCut === null || rawCut === undefined) continue;
      const rawCutNumber = Number(rawCut);
      const anchorZ = (rawCutNumber - anchorMean) / anchorSd;
      let scaledCap = rawCutNumber + (features.mean - anchorMean);
      scaledCap += anchorZ * (features.nat_sd - anchorSd);
      caps[cut] = Math.min(caps[cut] ?? rawCutNumber, rawCutNumber, scaledCap);
    }
  }

  return [caps, matched];
}

function scoreScaleRows(possibleScores, totalPoints, mean, sd, predictions) {
  const scores = possibleScores ? [...possibleScores].sort((a, b) => b - a) : Array.from({ length: Math.floor(totalPoints) + 1 }, (_, index) => Math.floor(totalPoints) - index);
  const safeSd = Math.max(0.1, sd);
  const gradeAnchors = [];
  const cutLabels = new Map();
  for (const cut of ["1", "2", "3"]) {
    const prediction = predictions[cut];
    if (!prediction) continue;
    gradeAnchors.push([Number(prediction.predicted_cut), GRADE_Z[cut]]);
    const labelScore = Number(prediction.suggested_cut);
    cutLabels.set(labelScore, [...(cutLabels.get(labelScore) || []), `${cut}컷`]);
  }
  gradeAnchors.sort((a, b) => b[0] - a[0]);
  const uniqueAnchors = [];
  for (const anchor of gradeAnchors) {
    if (!uniqueAnchors.length || Math.abs(anchor[0] - uniqueAnchors[uniqueAnchors.length - 1][0]) > 0.001) {
      uniqueAnchors.push(anchor);
    }
  }

  function calibratedZScore(score) {
    if (uniqueAnchors.length < 2) return (score - mean) / safeSd;
    let highAnchor = uniqueAnchors[0];
    let lowAnchor = uniqueAnchors[1];
    if (score >= uniqueAnchors[0][0]) {
      [highAnchor, lowAnchor] = [uniqueAnchors[0], uniqueAnchors[1]];
    } else if (score <= uniqueAnchors[uniqueAnchors.length - 1][0]) {
      [highAnchor, lowAnchor] = [uniqueAnchors[uniqueAnchors.length - 2], uniqueAnchors[uniqueAnchors.length - 1]];
    } else {
      for (let index = 0; index < uniqueAnchors.length - 1; index += 1) {
        const candidateHigh = uniqueAnchors[index];
        const candidateLow = uniqueAnchors[index + 1];
        if (candidateHigh[0] >= score && score >= candidateLow[0]) {
          [highAnchor, lowAnchor] = [candidateHigh, candidateLow];
          break;
        }
      }
    }
    const rawSpan = highAnchor[0] - lowAnchor[0];
    if (Math.abs(rawSpan) <= 0.001) return (score - mean) / safeSd;
    const fraction = (score - lowAnchor[0]) / rawSpan;
    return lowAnchor[1] + fraction * (highAnchor[1] - lowAnchor[1]);
  }

  return scores.map((score) => {
    const standardZScore = (score - mean) / safeSd;
    const percentileZScore = calibratedZScore(score);
    const standardScore = 50 + 10 * standardZScore;
    const percentileValue = 100 * normalCdf(percentileZScore);
    return {
      raw_score: score,
      standard_score: roundHalfUp(standardScore),
      standard_score_exact: standardScore,
      percentile: clamp(roundHalfUp(percentileValue), 0, 100),
      percentile_exact: clamp(percentileValue, 0, 100),
      cut_label: (cutLabels.get(score) || []).join(" · "),
    };
  });
}

function historicalMatches(subject, features, predictions) {
  const matches = [];
  for (const record of ebsiPayload.records || []) {
    if (record.subject !== subject || !supportedRecord(record)) continue;
    if (record.national_mean === null || record.national_sd === null) continue;
    const rates = record.items.map((item) => Number(item.national_rate));
    const points = record.items.map((item) => Number(item.points));
    const anchorFeatures = featureValues(rates, points);
    anchorFeatures.nat_sd = clamp(applyLinearModel(model.sd_model.coefficients, subject, anchorFeatures), 0.1, 25);
    const meanDelta = features.mean - anchorFeatures.mean;
    const sdDelta = features.nat_sd - anchorFeatures.nat_sd;
    const hardDelta = features.hard15_rate - anchorFeatures.hard15_rate;
    const easyDelta = features.easy5_rate - anchorFeatures.easy5_rate;
    const under40Delta = features.under40_points - anchorFeatures.under40_points;
    const distance = Math.sqrt(
      (meanDelta / 3) ** 2
      + (sdDelta / 1.6) ** 2
      + (hardDelta / 8) ** 2
      + (easyDelta / 12) ** 2
      + (under40Delta / 8) ** 2
    );
    const cuts = {};
    const cutDiffs = {};
    for (const cut of ["1", "2", "3"]) {
      if (record[`raw${cut}`] === null || record[`raw${cut}`] === undefined) continue;
      cuts[cut] = Math.trunc(Number(record[`raw${cut}`]));
      if (predictions[cut]) cutDiffs[cut] = Math.trunc(predictions[cut].suggested_cut) - cuts[cut];
    }
    matches.push({
      id: historicalExamId(record),
      subject: record.subject,
      exam_year: record.exam_year,
      month: String(record.month).padStart(2, "0"),
      mean: record.national_mean,
      nat_sd: record.national_sd,
      cuts,
      cut_diffs: cutDiffs,
      distance,
    });
  }
  return matches.sort((a, b) => a.distance - b.distance).slice(0, 8);
}

function predictCut(subject, rates, points, mode) {
  if (!model.subjects.includes(subject)) throw new Error("지원 과목은 한국지리와 세계지리입니다.");
  const rawRates = normalizeNumbers(rates, 20, "정답률");
  const rawPoints = normalizeNumbers(points, 20, "배점");
  if (rawRates.some((rate) => rate < 0 || rate > 100)) throw new Error("정답률은 0부터 100 사이여야 합니다.");
  if (rawPoints.some((point) => point <= 0)) throw new Error("배점은 양수여야 합니다.");

  const totalPoints = sum(rawPoints);
  const warnings = [];
  if (Math.abs(totalPoints - 50) > 0.001) warnings.push(`배점 합이 ${formatFixed(totalPoints, 0)}점입니다. 탐구 표준인 50점과 다릅니다.`);
  const possibleScores = possibleRawScores(rawPoints);

  let nationalRates;
  let academyRates;
  if (mode === "academy") {
    academyRates = rawRates.map((rate) => ({ value: rate, label: `${formatFixed(rate)}%`, is_upper_bound: false }));
    nationalRates = convertAcademyToNational(subject, rawRates);
  } else if (mode === "national") {
    nationalRates = rawRates;
    academyRates = convertNationalToAcademy(subject, rawRates);
  } else {
    throw new Error("정답률 입력 모드를 확인해주세요.");
  }

  const features = featureValues(nationalRates, rawPoints);
  features.nat_sd = clamp(applyLinearModel(model.sd_model.coefficients, subject, features), 0.1, 25);
  const [cutCaps, matchedAnchors] = historicalCutCaps(subject, features);
  const predictions = {};

  for (const cut of model.cuts) {
    const cutModel = model.cut_models[cut];
    let prediction = applyLinearModel(cutModel.coefficients, subject, features);
    prediction = clamp(prediction, 0, totalPoints);
    const historicalCap = cutCaps[cut];
    if (historicalCap !== undefined) prediction = Math.min(prediction, historicalCap);
    const correction = runtimeBiasCorrection(mode, subject, cut);
    if (correction) prediction = clamp(prediction - correction, 0, totalPoints);
    const subjectCv = cutModel.cross_validation.by_subject?.[subject] || cutModel.cross_validation;
    const rmse = subjectCv.rmse;
    predictions[cut] = {
      predicted_cut: prediction,
      suggested_cut: possibleScores ? nearestPossibleScore(prediction, possibleScores, totalPoints) : Math.trunc(clamp(Math.round(prediction), 0, totalPoints)),
      range_low: possibleScores ? lowerPossibleScore(Math.floor(prediction - rmse), possibleScores, totalPoints) : Math.trunc(clamp(Math.floor(prediction - rmse), 0, totalPoints)),
      range_high: possibleScores ? upperPossibleScore(Math.ceil(prediction + rmse), possibleScores, totalPoints) : Math.trunc(clamp(Math.ceil(prediction + rmse), 0, totalPoints)),
      rmse,
      mae: subjectCv.mae,
      historical_cap: historicalCap,
      runtime_correction: correction,
    };
  }

  const conversionRows = rawPoints.map((point, index) => ({
    question: index + 1,
    points: point,
    national_rate: nationalRates[index],
    academy_rate: academyRates[index].value,
    academy_rate_label: academyRates[index].label,
    academy_rate_is_upper_bound: academyRates[index].is_upper_bound,
  }));

  return {
    subject,
    mode,
    predictions,
    estimated_national_rates: nationalRates,
    estimated_academy_rates: academyRates,
    conversion_rows: conversionRows,
    score_table: scoreScaleRows(possibleScores, totalPoints, features.mean, features.nat_sd, predictions),
    historical_matches: historicalMatches(subject, features, predictions),
    features,
    warnings,
    matched_historical_anchors: matchedAnchors.slice(0, 5),
  };
}

function collectPayload() {
  return {
    subject: elements.subject.value,
    mode: elements.mode.value,
    points: pointInputs().map((input) => input.value),
    rates: rateInputs().map((input) => input.value),
  };
}

function signed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number > 0 ? `+${number}` : String(number);
}

function renderTable(container, columns, rows, options = {}) {
  container.style.setProperty("--cut-table-template", columns.map((column) => column.width || "minmax(0, 1fr)").join(" "));
  container.style.setProperty("--cut-table-min-width", options.minWidth || "520px");
  container.innerHTML = `
    <div class="cut-table-row is-head">
      ${columns.map((column) => `<span>${escapeHtml(column.label)}</span>`).join("")}
    </div>
    ${rows.map((row) => `
      <div class="cut-table-row${row.className ? ` ${row.className}` : ""}">
        ${columns.map((column) => `<span>${escapeHtml(column.value(row))}</span>`).join("")}
      </div>
    `).join("")}
  `;
}

function showWarning(text) {
  elements.warningText.textContent = text;
  elements.warningText.hidden = !text;
}

function renderResult(data, resultMode = "prediction") {
  setResultTitle(resultMode);
  elements.emptyResult.hidden = true;
  elements.resultPanel.hidden = false;
  elements.cutCardGrid.innerHTML = model.cuts.map((cut) => {
    const item = data.predictions[cut];
    return `
      <article class="cut-card">
        <p class="cut-kicker">${cut} CUT</p>
        <strong>${item.suggested_cut}점</strong>
        <span>연속값 ${formatFixed(item.predicted_cut)}점</span>
        <span>범위 ${item.range_low}~${item.range_high}점</span>
        <span>RMSE ±${formatFixed(item.rmse)}점</span>
      </article>
    `;
  }).join("");

  elements.meanMetric.textContent = `전국 평균 ${formatFixed(data.features.mean)}점 · 표준편차 ${formatFixed(data.features.nat_sd)}점`;
  elements.rateMetric.textContent = `가중 정답률 ${formatFixed(data.features.weighted_rate)}%`;
  showWarning(data.warnings.join(" "));

  renderTable(
    elements.scoreTable,
    [
      { label: "원점수", value: (row) => `${row.raw_score}점`, width: "0.8fr" },
      { label: "표준점수", value: (row) => row.standard_score, width: "0.8fr" },
      { label: "백분위", value: (row) => row.percentile, width: "0.8fr" },
      { label: "구간", value: (row) => row.cut_label || "", width: "1fr" },
    ],
    data.score_table.map((row) => ({ ...row, className: row.cut_label ? "is-cut" : "" })),
  );

  renderTable(
    elements.historyTable,
    [
      { label: "시험", value: (row) => `${row.exam_year}.${row.month}`, width: "0.9fr" },
      { label: "평균·표편", value: (row) => `${formatFixed(row.mean)} · ${formatFixed(row.nat_sd)}`, width: "1fr" },
      { label: "실제 컷", value: (row) => `${row.cuts["1"] || "-"}/${row.cuts["2"] || "-"}/${row.cuts["3"] || "-"}`, width: "1fr" },
      { label: "현재-실제", value: (row) => `${signed(row.cut_diffs["1"])} / ${signed(row.cut_diffs["2"])} / ${signed(row.cut_diffs["3"])}`, width: "1fr" },
    ],
    data.historical_matches.map((row) => ({ ...row, className: row.id === lastLoadedHistoryId ? "is-cut" : "" })),
  );

  renderTable(
    elements.rateTable,
    [
      { label: "문항", value: (row) => row.question, width: "0.6fr" },
      { label: "배점", value: (row) => formatFixed(row.points, 0), width: "0.6fr" },
      { label: "전국", value: (row) => `${formatFixed(row.national_rate)}%`, width: "0.8fr" },
      { label: "시대인재N 환산", value: (row) => row.academy_rate_label, width: "1fr" },
    ],
    data.conversion_rows,
  );
  setStatus("완료", true);
  refreshIcons();
}

function runPrediction(event = null) {
  if (event) event.preventDefault();
  if (!model || !ebsiPayload) return false;
  if (isHistoryActualMode) {
    showWarning("과거 시험 데이터는 채점 결과로 표시됩니다.");
    setStatus("채점 완료", true);
    return false;
  }
  setBusy(true);
  try {
    const payload = collectPayload();
    const data = predictCut(payload.subject, payload.rates, payload.points, payload.mode);
    renderResult(data, "prediction");
    window.GeoCutLastResult = data;
    return true;
  } catch (error) {
    elements.emptyResult.hidden = true;
    elements.resultPanel.hidden = false;
    elements.cutCardGrid.innerHTML = "";
    elements.scoreTable.innerHTML = "";
    elements.historyTable.innerHTML = "";
    elements.rateTable.innerHTML = "";
    elements.meanMetric.textContent = "-";
    elements.rateMetric.textContent = "-";
    showWarning(error.message);
    setStatus("확인 필요");
    return false;
  } finally {
    setBusy(false);
  }
}

function fieldValue(element) {
  return String(element?.value || "").trim();
}

function renderQuestionExamSelect(selectedKey = elements.questionExam.value) {
  if (!elements.questionExam) return;
  const subject = fieldValue(elements.questionSubject);
  const exams = questionAvailableExams.filter((exam) => !subject || exam.subject === subject);
  elements.questionExam.innerHTML = '<option value="">시험 전체</option>';
  for (const exam of exams) {
    const inferred = exam.inferred_count ? ` · ${exam.inferred_count}보충` : "";
    const unmatched = exam.unmatched_count ? ` · ${exam.unmatched_count}정보없음` : "";
    const option = document.createElement("option");
    option.value = exam.key;
    option.textContent = `${exam.label} · ${exam.exact_count}실측${inferred}${unmatched}`;
    elements.questionExam.appendChild(option);
  }
  if (selectedKey && exams.some((exam) => exam.key === selectedKey)) {
    elements.questionExam.value = selectedKey;
  }
}

function numberFilter(value, fallback = null) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
}

function filteredQuestionItems() {
  const subject = fieldValue(elements.questionSubject);
  const examKey = fieldValue(elements.questionExam);
  const month = fieldValue(elements.questionMonth);
  const difficulty = fieldValue(elements.questionDifficulty);
  const match = fieldValue(elements.questionMatch);
  const query = fieldValue(elements.questionKeyword).toLowerCase();
  const question = numberFilter(elements.questionNumber.value);
  const yearFrom = numberFilter(elements.questionYearFrom.value);
  const yearTo = numberFilter(elements.questionYearTo.value);
  const wrongMin = numberFilter(elements.wrongRateMin.value);
  const wrongMax = numberFilter(elements.wrongRateMax.value);
  const sort = fieldValue(elements.questionSort) || "latest";

  const filtered = questionBankItems.filter((item) => {
    if (examKey) {
      if (item.exam_key !== examKey) return false;
    } else {
      if (subject && item.subject !== subject) return false;
      if (month && item.month !== month.padStart(2, "0")) return false;
      if (yearFrom !== null && item.exam_year < yearFrom) return false;
      if (yearTo !== null && item.exam_year > yearTo) return false;
    }
    if (question !== null && item.question !== question) return false;
    if (difficulty && item.difficulty !== difficulty) return false;
    if (match && item.match_status !== match) return false;
    if (wrongMin !== null && (!Number.isFinite(item.wrong_rate) || item.wrong_rate < wrongMin)) return false;
    if (wrongMax !== null && (!Number.isFinite(item.wrong_rate) || item.wrong_rate > wrongMax)) return false;
    if (query && !item.search_text.includes(query)) return false;
    return true;
  });

  const rateValue = (item, field, fallback) => Number.isFinite(item[field]) ? item[field] : fallback;
  if (sort === "wrong_desc") {
    filtered.sort((a, b) => rateValue(b, "wrong_rate", -1) - rateValue(a, "wrong_rate", -1) || b.exam_year - a.exam_year || Number(b.month) - Number(a.month) || a.question - b.question);
  } else if (sort === "correct_asc") {
    filtered.sort((a, b) => rateValue(a, "correct_rate", 101) - rateValue(b, "correct_rate", 101) || b.exam_year - a.exam_year || Number(b.month) - Number(a.month) || a.question - b.question);
  } else if (sort === "question") {
    filtered.sort((a, b) => String(a.subject).localeCompare(String(b.subject), "ko") || a.question - b.question || b.exam_year - a.exam_year || Number(b.month) - Number(a.month));
  } else {
    filtered.sort((a, b) => b.exam_year - a.exam_year || Number(b.month) - Number(a.month) || String(a.subject).localeCompare(String(b.subject), "ko") || a.question - b.question);
  }
  return filtered;
}

function formatPercentValue(value) {
  return Number.isFinite(Number(value)) ? `${formatFixed(value)}%` : "-";
}

function questionChoiceRatesHtml(item) {
  if (!item.choice_rates?.length) return "";
  return `
    <div class="question-choice-rates">
      <div class="question-choice-heading">
        <span>선지별 선택률</span>
        <span>정답 기준</span>
      </div>
      <div class="question-choice-bars">
        ${item.choice_rates.map((choice) => `
          <div class="question-choice-row${choice.is_answer ? " is-answer" : ""}" style="--rate: ${clamp(Number(choice.rate), 0, 100)}%;">
            <span class="question-choice-label">${choice.choice}번${choice.is_answer ? " 정답" : ""}</span>
            <span class="question-choice-track" aria-hidden="true"><span class="question-choice-fill"></span></span>
            <span class="question-choice-value">${formatPercentValue(choice.rate)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderQuestionSearchResults(event = null) {
  if (event) event.preventDefault();
  if (!questionBankItems.length) {
    elements.questionSearchMeta.textContent = "기출 DB를 아직 불러오지 못했습니다.";
    return;
  }
  renderQuestionExamSelect();
  const filtered = filteredQuestionItems();
  const shown = filtered.slice(0, 60);
  const matchSummary = filtered.reduce((acc, item) => {
    acc[item.match_status] = (acc[item.match_status] || 0) + 1;
    return acc;
  }, {});
  elements.questionBankBadge.textContent = `${questionBankItems.length}문항 DB`;
  elements.questionBankBadge.classList.add("is-solid");
  elements.questionSearchMeta.textContent = `${filtered.length}개 검색됨 · EBSi ${matchSummary.exact || 0}개 · 보충 ${matchSummary.inferred || 0}개 · 정보 없음 ${matchSummary.unmatched || 0}개 · 최대 ${shown.length}개 표시`;

  if (!shown.length) {
    elements.questionResultGrid.innerHTML = '<div class="question-card"><strong>검색 결과 없음</strong></div>';
    return;
  }

  elements.questionResultGrid.innerHTML = shown.map((item) => {
    const cutText = item.cuts?.["1"] ? `${item.cuts["1"]}/${item.cuts["2"]}/${item.cuts["3"]}` : "-";
    const imageHtml = item.image_url
      ? `<a class="question-image-frame" href="${escapeHtml(item.image_url)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.label)}" loading="lazy" />
        </a>`
      : `<div class="question-image-frame is-empty"><span>이미지 없음</span></div>`;
    return `
      <article class="question-card">
        ${imageHtml}
        <div class="question-card-title">
          <strong>${escapeHtml(item.subject)} ${item.question}번</strong>
          <span>${escapeHtml(item.exam_label)} · 시행 ${item.exam_year}.${item.month}</span>
        </div>
        <div class="question-card-badges">
          <span>${escapeHtml(item.match_label)}</span>
          <span>${escapeHtml(item.difficulty_label)}</span>
          <span class="is-strong">오답률 ${formatPercentValue(item.wrong_rate)}</span>
          <span>정답률 ${formatPercentValue(item.correct_rate)}</span>
          <span>${item.points ? formatFixed(item.points, 0) : "-"}점</span>
          <span>컷 ${cutText}</span>
          ${item.image_url ? `<span>${escapeHtml(item.image_source_label || item.image_variant || "문항 이미지")}</span>` : ""}
        </div>
        ${questionChoiceRatesHtml(item)}
      </article>
    `;
  }).join("");
  refreshIcons();
}

function resetQuestionSearch() {
  elements.questionForm.reset();
  renderQuestionExamSelect("");
  renderQuestionSearchResults();
}

function applyQuestionPreset(preset) {
  const currentSubject = fieldValue(elements.questionSubject);
  elements.questionForm.reset();
  elements.questionSubject.value = currentSubject;
  if (preset === "latest_exam") {
    elements.questionMonth.value = "11";
    ensureValueOrDefault(elements.questionYearFrom, DEFAULT_HISTORY_YEAR);
    ensureValueOrDefault(elements.questionYearTo, DEFAULT_HISTORY_YEAR);
    elements.questionSort.value = "latest";
  } else if (preset === "hard_exact") {
    elements.questionMatch.value = "exact";
    elements.wrongRateMin.value = "45";
    elements.questionSort.value = "wrong_desc";
  } else if (preset === "inferred") {
    elements.questionMatch.value = "inferred";
    elements.questionSort.value = "latest";
  }
  renderQuestionExamSelect();
  renderQuestionSearchResults();
}

function normalizeAnswerValue(value) {
  const text = String(value || "").trim();
  const symbols = { "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5" };
  for (const [symbol, digit] of Object.entries(symbols)) {
    if (text.includes(symbol)) return digit;
  }
  const match = text.match(/[1-5]/);
  return match ? match[0] : text;
}

function parseQuestionNumber(value, fallback) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : fallback;
}

function parseRatePercent(value) {
  const match = String(value || "").match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return number >= 0 && number <= 100 ? roundOne(number) : null;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => String(cell).trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => String(cell).trim())) rows.push(row);
  return rows;
}

async function readCsvFile(file) {
  const buffer = await file.arrayBuffer();
  const decoders = ["utf-8", "euc-kr"];
  for (const encoding of decoders) {
    try {
      const text = new TextDecoder(encoding, { fatal: encoding === "utf-8" }).decode(buffer);
      if (text.includes("문항") || text.includes(",")) return text;
    } catch {
      // Try the next decoder.
    }
  }
  return new TextDecoder("utf-8").decode(buffer);
}

function csvRowsToSolutions(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((cell) => String(cell || "").trim());
  currentCsvHeaders = headers;
  return rows.slice(1).map((cells, index) => {
    const fields = {};
    headers.forEach((header, cellIndex) => {
      fields[header] = String(cells[cellIndex] || "").trim();
    });
    const number = parseQuestionNumber(fields["문항 번호"] || fields["문항"] || fields["번호"], index + 1);
    if (fields["정답"]) fields["정답"] = normalizeAnswerValue(fields["정답"]);
    return {
      number,
      label: fields["문항 번호"] || String(number),
      fields,
    };
  }).filter((solution) => Number.isFinite(solution.number));
}

function solutionRate(solution) {
  const fields = solution.fields || {};
  return parseRatePercent(
    fields["예상 정답률"]
    || fields["정답률"]
    || fields["예상정답률"]
    || fields["전국 정답률"]
  );
}

function applySolutionsToCut() {
  releaseHistoryLock();
  const sorted = [...currentSolutions].sort((a, b) => a.number - b.number);
  const rates = sorted.map(solutionRate).filter((rate) => rate !== null);
  const expectedCount = 20;
  elements.paste.value = rates.map((rate) => formatFixed(rate)).join(", ");
  rateInputs().forEach((input, index) => {
    input.value = rates[index] ?? "";
  });
  setToolTab("predict", true);
  if (rates.length === expectedCount) {
    runPrediction();
  } else {
    setResultTitle("prediction");
    showPendingResultState(`정답률 ${rates.length}개 반영됨 (${expectedCount}개 필요)`);
  }
  return rates.length;
}

function renderSolutionMatch(text) {
  elements.solutionMatchRow.innerHTML = `<span>${escapeHtml(text)}</span>`;
  elements.solutionMatchRow.hidden = false;
}

function renderSolutions() {
  if (!currentSolutions.length) {
    elements.solutionViewer.hidden = true;
    elements.downloadCsvButton.disabled = true;
    return;
  }

  elements.solutionViewer.hidden = false;
  elements.downloadCsvButton.disabled = false;
  const sorted = [...currentSolutions].sort((a, b) => a.number - b.number);
  renderTable(
    elements.solutionOverviewTable,
    [
      { label: "문항", value: (row) => `${row.number}번`, width: "0.65fr" },
      { label: "정답", value: (row) => row.fields["정답"] || "-", width: "0.65fr" },
      { label: "예상 정답률", value: (row) => formatPercentValue(solutionRate(row)), width: "1fr" },
      { label: "변별도", value: (row) => row.fields["추정 변별도"] || "-", width: "0.8fr" },
      { label: "오류 가능성", value: (row) => row.fields["오류 가능성"] || "-", width: "0.9fr" },
    ],
    sorted,
    { minWidth: "620px" },
  );

  elements.solutionDetailGrid.innerHTML = sorted.map((solution) => {
    const fields = solution.fields || {};
    const detail = fields["해설"] || fields["정답 풀이"] || fields["Comment 내용"] || "";
    return `
      <article class="solution-card" data-solution-number="${solution.number}">
        <div class="solution-card-head">
          <strong>${solution.number}번</strong>
          <span class="tw-badge is-solid">정답 ${escapeHtml(fields["정답"] || "-")}</span>
        </div>
        <div class="solution-field-grid">
          <div class="solution-field"><span>예상 정답률</span><strong>${formatPercentValue(solutionRate(solution))}</strong></div>
          <div class="solution-field"><span>변별도</span><strong>${escapeHtml(fields["추정 변별도"] || "-")}</strong></div>
          <div class="solution-field"><span>타당도</span><strong>${escapeHtml(fields["추정 타당도"] || "-")}</strong></div>
          <div class="solution-field"><span>오류 가능성</span><strong>${escapeHtml(fields["오류 가능성"] || "-")}</strong></div>
        </div>
        <label class="tw-field">
          <span>해설</span>
          <textarea data-solution-detail>${escapeHtml(detail)}</textarea>
        </label>
      </article>
    `;
  }).join("");

  elements.solutionDetailGrid.querySelectorAll("[data-solution-number]").forEach((card) => {
    const number = Number(card.dataset.solutionNumber);
    const textarea = card.querySelector("[data-solution-detail]");
    textarea.addEventListener("input", () => {
      const solution = currentSolutions.find((item) => item.number === number);
      if (!solution) return;
      if ("해설" in solution.fields) solution.fields["해설"] = textarea.value;
      else if ("정답 풀이" in solution.fields) solution.fields["정답 풀이"] = textarea.value;
      else solution.fields["Comment 내용"] = textarea.value;
    });
  });
}

async function handleSolutionCsv(event) {
  event.preventDefault();
  const file = elements.csvInput.files?.[0];
  if (!file) {
    renderSolutionMatch("CSV 파일을 선택해주세요.");
    return;
  }
  currentCsvFilename = file.name || "solutions.csv";
  elements.csvLabel.textContent = currentCsvFilename;
  elements.csvMeta.textContent = `${formatFixed(file.size / 1024, 1)} KB`;
  try {
    const text = await readCsvFile(file);
    const rows = parseCsvRows(text);
    currentSolutions = csvRowsToSolutions(rows);
    const importedRates = applySolutionsToCut();
    renderSolutions();
    elements.solutionStatusBadge.textContent = `${currentSolutions.length}문항`;
    elements.solutionStatusBadge.classList.add("is-solid");
    renderSolutionMatch(`CSV ${currentSolutions.length}문항 적용 · 정답률 ${importedRates}개 반영`);
  } catch (error) {
    renderSolutionMatch(error.message);
  }
  refreshIcons();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadEditedCsv() {
  if (!currentSolutions.length) return;
  const headers = currentCsvHeaders.length
    ? currentCsvHeaders
    : Array.from(new Set(currentSolutions.flatMap((solution) => Object.keys(solution.fields || {}))));
  const lines = [
    headers.map(csvEscape).join(","),
    ...currentSolutions
      .sort((a, b) => a.number - b.number)
      .map((solution) => headers.map((header) => csvEscape(solution.fields?.[header] || "")).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = currentCsvFilename.replace(/\.csv$/i, "") + "-edited.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadCsvTemplate() {
  const rows = [
    CSV_TEMPLATE_HEADERS,
    ...Array.from({ length: 20 }, (_, index) => [
      `${index + 1}번`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  ];
  const blob = new Blob(["\ufeff" + rows.map((row) => row.map(csvEscape).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "gemini_solution_template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function setResultTitle(resultMode) {
  if (!elements.resultTitle) return;
  elements.resultTitle.textContent = resultMode === "actual" ? "채점 결과" : "예측 결과";
}

function showPendingResultState(message = "결과 준비 전") {
  if (isHistoryActualMode) return;
  if (elements.emptyResultText) {
    elements.emptyResultText.textContent = message;
  }
  elements.emptyResult.hidden = true;
  elements.resultPanel.hidden = true;
  elements.cutCardGrid.innerHTML = "";
  elements.scoreTable.innerHTML = "";
  elements.historyTable.innerHTML = "";
  elements.rateTable.innerHTML = "";
  elements.meanMetric.textContent = "-";
  elements.rateMetric.textContent = "-";
  showWarning(message);
  setStatus("확인 필요");
}

async function initialize() {
  renderCutRows();
  refreshIcons();
  try {
    const [loadedModel, loadedEbsiPayload, imageManifest] = await Promise.all([
      loadJson(MODEL_URL),
      loadJson(EBSI_URL),
      loadOptionalJson(IMAGE_MANIFEST_URL, { items: [] }),
    ]);
    model = loadedModel;
    ebsiPayload = loadedEbsiPayload;
    questionImageById = new Map((imageManifest.items || []).map((item) => [item.id, item]));
    historicalExams = buildHistoricalExams();
    questionBankItems = buildQuestionBank();
    fillDefaultPoints();
    updateRelation();
    renderHistorySelect();
    setModelBadge(`${model.training_records.total}개 학습`, true);
    if (elements.modelMeta) {
      elements.modelMeta.textContent = `${historicalExams.length}개 시험 · ${questionBankItems.length}문항 DB · 이미지 ${questionImageById.size}장 · ${model.version}`;
    }
    setStatus(`${historicalExams.length}개 시험`, true);
    elements.questionBankBadge.textContent = `${questionBankItems.length}문항 DB`;
    elements.questionBankBadge.classList.add("is-solid");
    renderQuestionExamSelect();
    ensureValueOrDefault(elements.questionYearFrom, DEFAULT_HISTORY_YEAR);
    ensureValueOrDefault(elements.questionYearTo, DEFAULT_HISTORY_YEAR);
    elements.questionMonth.value = "11";
    elements.questionSort.value = "latest";
    renderQuestionSearchResults();
    const latest = historicalExams.find((exam) => exam.subject === elements.subject.value);
    if (latest) {
      elements.history.value = latest.id;
      lastLoadedHistoryId = latest.id;
    }
  } catch (error) {
    setModelBadge("로드 실패");
    setStatus("오류");
    elements.relation.textContent = error.message;
  }
}

elements.toolTabs.forEach((button) => {
  button.addEventListener("click", () => setToolTab(button.dataset.toolTab, true));
});
elements.subject.addEventListener("change", () => {
  releaseHistoryLock();
  fillDefaultPoints();
  updateRelation();
  renderHistorySelect();
});
elements.mode.addEventListener("change", () => {
  releaseHistoryLock();
  updateRelation();
});
elements.loadHistory.addEventListener("click", () => loadHistoryExam());
elements.history.addEventListener("change", () => {
  releaseHistoryLock();
});
elements.applyPaste.addEventListener("click", applyPasteValues);
elements.defaultPoints.addEventListener("click", fillDefaultPoints);
elements.form.addEventListener("submit", runPrediction);
elements.questionForm.addEventListener("submit", renderQuestionSearchResults);
elements.inputGrid.addEventListener("input", releaseHistoryLock);
elements.paste?.addEventListener("input", releaseHistoryLock);
elements.questionSubject.addEventListener("change", () => renderQuestionExamSelect());
elements.questionReset.addEventListener("click", resetQuestionSearch);
elements.questionPresetButtons.forEach((button) => {
  button.addEventListener("click", () => applyQuestionPreset(button.dataset.questionPreset));
});
elements.solutionForm.addEventListener("submit", handleSolutionCsv);
elements.csvInput.addEventListener("change", () => {
  const file = elements.csvInput.files?.[0];
  elements.csvLabel.textContent = file?.name || "CSV 선택";
  elements.csvMeta.textContent = file ? `${formatFixed(file.size / 1024, 1)} KB` : "문항 번호와 예상 정답률을 읽어 컷 예측에 반영합니다";
  if (file) {
    void handleSolutionCsv(new Event("submit"));
  }
});
elements.downloadCsvButton.addEventListener("click", downloadEditedCsv);
elements.downloadCsvTemplateButton?.addEventListener("click", downloadCsvTemplate);

function setToolTabFromHash(hash = window.location.hash) {
  if (hash === "#csv-solutions") {
    setToolTab("solutions");
  } else if (hash === "#cut-predictor") {
    setToolTab("predict");
  } else {
    setToolTab("questions");
  }
}

setToolTabFromHash();
window.addEventListener("hashchange", () => setToolTabFromHash());

window.GeoCut = {
  predictCut,
  featureValues,
  convertAcademyToNational,
  convertNationalToAcademy,
  filteredQuestionItems,
};

initialize();
