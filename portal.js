const LAST_TOOL_STORAGE_KEY = "promenade-geography-last-tool-v1";

const toolCatalog = {
  map: { href: "./map.html", label: "지도 편집기" },
  climate: { href: "./tools/climate/index.html", label: "기후 자료" },
  exam: { href: "./tools/cut/index.html", label: "기출·등급컷" },
};

const shortcutToolIds = { 1: "map", 2: "climate", 3: "exam" };
const continueTool = document.querySelector("#continueTool");
const continueKicker = document.querySelector("#continueKicker");
const continueLabel = document.querySelector("#continueLabel");

const lastToolId = readLastToolId() ?? inferReferrerToolId();
if (lastToolId) {
  rememberTool(lastToolId);
  renderContinueTool(lastToolId);
}

document.querySelectorAll("a[data-tool-id]").forEach((link) => {
  link.addEventListener("click", () => rememberTool(link.dataset.toolId));
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

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
  window.location.assign(toolCatalog[toolId].href);
});

function renderContinueTool(toolId) {
  const tool = toolCatalog[toolId];
  if (!tool || !continueTool) return;

  continueTool.href = tool.href;
  continueTool.dataset.toolId = toolId;
  if (continueKicker) continueKicker.textContent = "최근 작업";
  if (continueLabel) continueLabel.textContent = tool.label;
}

function readLastToolId() {
  try {
    const value = window.localStorage.getItem(LAST_TOOL_STORAGE_KEY);
    return toolCatalog[value] ? value : null;
  } catch {
    return null;
  }
}

function rememberTool(toolId) {
  if (!toolCatalog[toolId]) return;

  try {
    window.localStorage.setItem(LAST_TOOL_STORAGE_KEY, toolId);
  } catch {
    // Storage is optional; navigation still works without it.
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
  } catch {
    return null;
  }

  return null;
}
