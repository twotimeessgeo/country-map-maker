const LAST_TOOL_STORAGE_KEY = "promenade-geography-last-tool-v1";

const toolCatalog = {
  map: {
    href: "./map.html",
    label: "Map Editor 계속하기",
    meta: "마지막으로 열었던 지도 제작 작업대로 돌아갑니다.",
  },
  climate: {
    href: "./tools/climate/index.html",
    label: "Climate Database 계속하기",
    meta: "마지막으로 열었던 기후 비교 작업대로 돌아갑니다.",
  },
  exam: {
    href: "./tools/cut/index.html",
    label: "Exam Simulator 계속하기",
    meta: "마지막으로 열었던 기출·등급컷 작업대로 돌아갑니다.",
  },
};

const shortcutToolIds = {
  1: "map",
  2: "climate",
  3: "exam",
};

const continueTool = document.querySelector("#continueTool");
const continueKicker = document.querySelector("#continueKicker");
const continueLabel = document.querySelector("#continueLabel");
const continueMeta = document.querySelector("#continueMeta");
const shortcutStatus = document.querySelector("#shortcutStatus");
let shortcutStatusTimer = 0;

const lastToolId = readLastToolId() ?? inferReferrerToolId();
if (lastToolId) {
  rememberTool(lastToolId);
  renderContinueTool(lastToolId);
}

document.querySelectorAll("a[data-tool-id]").forEach((link) => {
  link.addEventListener("click", () => rememberTool(link.dataset.toolId));
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  ) {
    return;
  }

  const toolId = shortcutToolIds[event.key];
  if (!toolId) return;

  event.preventDefault();
  rememberTool(toolId);
  showShortcutStatus(`${event.key} · ${toolCatalog[toolId].label}`);
  window.location.assign(toolCatalog[toolId].href);
});

function renderContinueTool(toolId) {
  const tool = toolCatalog[toolId];
  if (!tool || !continueTool) return;

  continueTool.href = tool.href;
  continueTool.dataset.toolId = toolId;
  if (continueKicker) continueKicker.textContent = "LAST WORKSPACE";
  if (continueLabel) continueLabel.textContent = tool.label;
  if (continueMeta) continueMeta.textContent = tool.meta;
}

function readLastToolId() {
  try {
    const value = window.localStorage.getItem(LAST_TOOL_STORAGE_KEY);
    return toolCatalog[value] ? value : null;
  } catch (error) {
    console.warn("최근 도구 기록을 읽지 못했습니다.", error);
    return null;
  }
}

function rememberTool(toolId) {
  if (!toolCatalog[toolId]) return;

  try {
    window.localStorage.setItem(LAST_TOOL_STORAGE_KEY, toolId);
  } catch (error) {
    console.warn("최근 도구 기록을 저장하지 못했습니다.", error);
  }
}

function inferReferrerToolId() {
  if (!document.referrer) return null;

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) return null;
    if (/\/tools\/climate\/(?:index|korea)\.html$/.test(referrer.pathname)) return "climate";
    if (/\/tools\/cut\/index\.html$/.test(referrer.pathname)) return "exam";
    if (/\/map\.html$/.test(referrer.pathname)) return "map";
  } catch (error) {
    console.warn("이전 작업 경로를 확인하지 못했습니다.", error);
  }

  return null;
}

function showShortcutStatus(message) {
  if (!shortcutStatus) return;
  window.clearTimeout(shortcutStatusTimer);
  shortcutStatus.textContent = message;
  shortcutStatus.classList.add("is-visible");
  shortcutStatusTimer = window.setTimeout(() => {
    shortcutStatus.classList.remove("is-visible");
  }, 1600);
}
