/* Drag-copy guard for data tables. Until the visitor has passed the CAPTCHA, text copied out of a table pastes with every
   digit turned into ₩ and a note pointing to the copy button; after that it copies as is, with the source line attached.
   Nothing is silently altered: either the numbers are obviously fake or they are the real ones. */
(() => {
  "use strict";
  if (window.TwCopyGuard) return;
  const TABLE_SELECTOR = ".stats-table, .stats-rank-card, .stats-content table, .table-wrap, .region-card-table";
  const SOURCE = "출처: twotimess, Promenade Geography (https://twotimeessgeo.github.io/country-map-maker/), CC BY-NC-SA 4.0 비영리";
  const NOTE = "숫자가 전부 원화로 바뀌었습니다. 사장님이 아니시라면 표 오른쪽 위의 복사 버튼을 눌러 주십시오.";

  const inTable = (node) => {
    const element = node?.nodeType === 1 ? node : node?.parentElement;
    return Boolean(element?.closest(TABLE_SELECTOR));
  };

  document.addEventListener("copy", (event) => {
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) return;
    if (!inTable(selection.anchorNode) && !inTable(selection.focusNode)) return;
    const text = selection.toString();
    if (!/\d/.test(text) || !event.clipboardData) return;
    const passed = Boolean(window.TwCaptcha?.passed());
    const output = passed
      ? `${text.trimEnd()}\n\n${SOURCE}`
      : `${text.replace(/\d/g, "₩").trimEnd()}\n\n${NOTE}\n${SOURCE}`;
    event.clipboardData.setData("text/plain", output);
    event.preventDefault();
  });

  window.TwCopyGuard = true;
})();
