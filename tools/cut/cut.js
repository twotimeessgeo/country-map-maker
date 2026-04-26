const MODEL_URL = "./data/geo_cut_model.json";
const EBSI_URL = "./data/ebsi_geo_data.json";
const GRADE_Z = {
  "1": 1.7506860712521692,
  "2": 1.2265281200366105,
  "3": 0.7388468491852137,
};

const elements = {
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
  emptyResult: document.querySelector("#emptyResult"),
  resultPanel: document.querySelector("#resultPanel"),
  cutCardGrid: document.querySelector("#cutCardGrid"),
  meanMetric: document.querySelector("#meanMetric"),
  rateMetric: document.querySelector("#rateMetric"),
  warningText: document.querySelector("#warningText"),
  scoreTable: document.querySelector("#scoreTable"),
  historyTable: document.querySelector("#historyTable"),
  rateTable: document.querySelector("#rateTable"),
};

let model = null;
let ebsiPayload = null;
let historicalExams = [];
let lastLoadedHistoryId = null;

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

function setBusy(isBusy) {
  elements.form.querySelectorAll("button, input, select, textarea").forEach((control) => {
    control.disabled = isBusy;
  });
  if (isBusy) setStatus("계산 중", true);
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} 로드 실패`);
  return response.json();
}

function historicalExamId(record) {
  return `${record.exam_year}-${String(record.month).padStart(2, "0")}-${record.subject}`;
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
  if (!exam) return;
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
  runPrediction();
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

function renderResult(data) {
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
      { label: "재종 환산", value: (row) => row.academy_rate_label, width: "1fr" },
    ],
    data.conversion_rows,
  );
  setStatus("완료", true);
  refreshIcons();
}

function runPrediction(event = null) {
  if (event) event.preventDefault();
  if (!model || !ebsiPayload) return false;
  setBusy(true);
  try {
    const payload = collectPayload();
    const data = predictCut(payload.subject, payload.rates, payload.points, payload.mode);
    renderResult(data);
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

async function initialize() {
  renderCutRows();
  refreshIcons();
  try {
    [model, ebsiPayload] = await Promise.all([loadJson(MODEL_URL), loadJson(EBSI_URL)]);
    historicalExams = buildHistoricalExams();
    fillDefaultPoints();
    updateRelation();
    renderHistorySelect();
    setModelBadge(`${model.training_records.total}개 학습`, true);
    setStatus(`${historicalExams.length}개 시험`, true);
    const latest = historicalExams.find((exam) => exam.subject === elements.subject.value);
    if (latest) loadHistoryExam(latest.id);
  } catch (error) {
    setModelBadge("로드 실패");
    setStatus("오류");
    elements.relation.textContent = error.message;
  }
}

elements.subject.addEventListener("change", () => {
  fillDefaultPoints();
  updateRelation();
  renderHistorySelect();
});
elements.mode.addEventListener("change", updateRelation);
elements.loadHistory.addEventListener("click", () => loadHistoryExam());
elements.applyPaste.addEventListener("click", applyPasteValues);
elements.defaultPoints.addEventListener("click", fillDefaultPoints);
elements.form.addEventListener("submit", runPrediction);

window.GeoCut = {
  predictCut,
  featureValues,
  convertAcademyToNational,
  convertNationalToAcademy,
};

initialize();
