/* Download gate: an image-CAPTCHA parody. Pick everyone who may NOT use the data; passing once per browser unlocks CSV and copy. */
(() => {
  "use strict";
  if (window.TwCaptcha) return;

  const STORE_KEY = "tw-captcha-pass";
  const EXAM_DAY = Date.parse("2026-11-19T00:00:00+09:00");
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const daysLeft = () => Math.max(0, Math.ceil((EXAM_DAY - Date.now()) / 86400000));
  const ALLOWED = [
    { icon: "📚", label: () => `수능 D-${daysLeft()} 고3`, reply: "고3은 써도 됩니다. 얼른 공부하러 가십시오." },
    { icon: "☕", label: () => "여섯 번째 수능 보는 N수생", reply: "N수생도 됩니다. 이번에는 꼭 붙으십시오." },
    { icon: "🧑‍🏫", label: () => "수업 준비하는 지리 선생님", reply: "선생님은 쓰셔도 됩니다. 출처만 밝혀 주십시오." },
    { icon: "✈️", label: () => "기후 그래프 보다가 여행 가고 싶어진 사람", reply: "여행 가고 싶은 분도 됩니다. 수능 끝나고 가십시오." },
    { icon: "🗺️", label: () => "과제하는 지리교육과 학생", reply: "예비 선생님은 당연히 됩니다." },
    { icon: "🤔", label: () => "탐구 선택과목 고민 중인 고2", reply: "고2도 됩니다. 세계지리를 고르십시오." },
    { icon: "🧭", label: () => "지도 보는 게 취미인 사람", reply: "지도 좋아하는 분은 언제나 환영입니다." },
  ];
  const BLOCKED = [
    { icon: "⏰", label: () => "교재 원고 마감 사흘 전인 사람" },
    { icon: "🏫", label: () => "“그대로 쓰면 되겠네” 하는 학원 실장님" },
    { icon: "💰", label: () => "유료 모의고사 파는 사장님" },
    { icon: "🤖", label: () => "“AI야 이 표 다 긁어” 한 출판사 직원" },
    { icon: "📱", label: () => "PDF로 묶어 단톡방에 파는 사람" },
    { icon: "🧽", label: () => "출처 지우는 게 취미인 사람" },
  ];

  let memoryPass = null;
  const readPass = () => {
    try { const value = localStorage.getItem(STORE_KEY); if (value) return Number(value); } catch {}
    return memoryPass;
  };
  const writePass = (time) => {
    memoryPass = time;
    try { localStorage.setItem(STORE_KEY, String(time)); } catch {}
  };

  const shuffle = (items) => {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };

  const CSS = `
.twc-dialog{padding:0;border:0;border-radius:4px;background:#fff;color:#0d0d0d;box-shadow:0 2px 6px rgba(0,0,0,.2),0 12px 40px rgba(0,0,0,.25);width:min(372px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;font-family:var(--tw-font-sans,sans-serif)}
.twc-dialog::backdrop{background:rgba(0,0,0,.45)}
.twc-dialog[open]{animation:twc-in 220ms var(--tw-ease-out,ease-out) both}
@keyframes twc-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.twc-shell{padding:8px}
.twc-head{padding:18px 18px 20px;background:#1a73e8;color:#fff}
.twc-head p{margin:0;font-size:14px;line-height:1.35}
.twc-head strong{display:block;margin:2px 0 4px;font-size:24px;font-weight:700;line-height:1.2}
.twc-head small{display:block;font-size:13px;opacity:.95}
.twc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:8px}
.twc-tile{position:relative;display:grid;grid-template-rows:1fr auto;align-items:center;justify-items:center;aspect-ratio:1;padding:8px 6px 7px;border:0;border-radius:0;background:#e9e9e9;color:#0d0d0d;font:inherit;cursor:pointer;transition:transform 180ms var(--tw-ease-out,ease-out),background-color 120ms}
.twc-tile:hover{background:#e0e0e0}
.twc-tile:focus-visible{outline:2px solid #1a73e8;outline-offset:-2px}
.twc-icon{font-size:34px;line-height:1;filter:grayscale(1) contrast(1.1)}
.twc-label{font-size:11px;line-height:1.3;text-align:center;word-break:keep-all;color:#3c3c3c}
.twc-tile[aria-pressed="true"]{transform:scale(.84)}
.twc-tile[aria-pressed="true"]::before{content:"";position:absolute;top:-8px;left:-8px;width:24px;height:24px;border-radius:50%;background:#1a73e8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6.5 12.5l3.5 3.5 7.5-8' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/18px no-repeat;transform:scale(1.19)}
.twc-message{min-height:20px;margin:8px 4px 0;color:#d93025;font-size:13px;line-height:1.4;word-break:keep-all}
.twc-message.is-ok{color:#188038}
.twc-message.is-note{color:#5d5d5d}
.twc-foot{display:flex;align-items:center;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid #dadce0}
.twc-icon-button{display:grid;place-items:center;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:none;color:#5f6368;cursor:pointer}
.twc-icon-button:hover{background:#f1f3f4}
.twc-icon-button svg{width:22px;height:22px}
.twc-honest{margin-left:6px;padding:0;border:0;background:none;color:#5f6368;font:inherit;font-size:12px;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.twc-verify{margin-left:auto;min-width:96px;height:38px;padding:0 18px;border:0;border-radius:2px;background:#1a73e8;color:#fff;font:inherit;font-size:14px;font-weight:600;letter-spacing:.02em;cursor:pointer}
.twc-verify:hover{background:#1765cc}
.twc-shake{animation:twc-shake 360ms ease-in-out}
@keyframes twc-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@media (prefers-reduced-motion: reduce){.twc-dialog[open],.twc-shake{animation:none}.twc-tile{transition:none}}
`;

  const ICONS = {
    reload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a8 8 0 1 0 1 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 3v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    audio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="13" width="5" height="7" rx="1.5" fill="currentColor"/><rect x="16" y="13" width="5" height="7" rx="1.5" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  let dialog = null;
  let round = [];
  let settle = null;

  function ensureDialog() {
    if (dialog) return dialog;
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    dialog = document.createElement("dialog");
    dialog.className = "twc-dialog";
    dialog.setAttribute("aria-label", "자료 이용 확인");
    dialog.innerHTML = `
      <div class="twc-shell">
        <div class="twc-head">
          <p>다음 중 이 자료를 쓸 수 없는 사람을</p>
          <strong>모두 고르십시오</strong>
          <small>더 이상 없으면 확인을 누르십시오.</small>
        </div>
        <div class="twc-grid" role="group" aria-label="사람 목록"></div>
        <p class="twc-message" role="status" aria-live="polite"></p>
        <div class="twc-foot">
          <button type="button" class="twc-icon-button" data-twc="reload" aria-label="새 문제" title="새 문제">${ICONS.reload}</button>
          <button type="button" class="twc-icon-button" data-twc="audio" aria-label="듣기 문제" title="듣기 문제">${ICONS.audio}</button>
          <button type="button" class="twc-icon-button" data-twc="info" aria-label="안내" title="안내">${ICONS.info}</button>
          <button type="button" class="twc-honest" data-twc="honest">고를 사람이 저입니다</button>
          <button type="button" class="twc-verify" data-twc="verify">확인</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("click", onClick);
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(false); });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) finish(false); });
    return dialog;
  }

  function newRound() {
    const blockedCount = 3 + Math.floor(Math.random() * 2);
    const picks = [
      ...shuffle(BLOCKED).slice(0, blockedCount).map((item) => ({ ...item, blocked: true })),
      ...shuffle(ALLOWED).slice(0, 9 - blockedCount).map((item) => ({ ...item, blocked: false })),
    ];
    round = shuffle(picks);
    const grid = dialog.querySelector(".twc-grid");
    grid.innerHTML = round.map((item, index) => {
      const label = item.label();
      return `<button type="button" class="twc-tile" data-twc-tile="${index}" aria-pressed="false" aria-label="${label}"><span class="twc-icon" aria-hidden="true">${item.icon}</span><span class="twc-label">${label}</span></button>`;
    }).join("");
    say("");
  }

  function say(text, tone = "") {
    const message = dialog.querySelector(".twc-message");
    message.textContent = text;
    message.className = `twc-message${tone ? ` is-${tone}` : ""}`;
  }

  function shake() {
    if (reduced()) return;
    const shell = dialog.querySelector(".twc-shell");
    shell.classList.remove("twc-shake");
    void shell.offsetWidth;
    shell.classList.add("twc-shake");
  }

  function verify() {
    const picked = round.filter((_, index) => dialog.querySelector(`[data-twc-tile="${index}"]`).getAttribute("aria-pressed") === "true");
    const wrongPick = picked.find((item) => !item.blocked);
    if (picked.length === 0) { say("아무도 고르지 않으셨습니다. 혹시 본인이 사장님이십니까?"); shake(); return; }
    if (wrongPick) { say(wrongPick.reply); shake(); return; }
    const missed = round.filter((item) => item.blocked).length - picked.length;
    if (missed > 0) { say("다시 시도하십시오. 아직 남아 있습니다."); shake(); return; }
    writePass(Date.now());
    say("확인되었습니다. 좋은 공부 되십시오.", "ok");
    // Resolve inside the click so the download or clipboard write keeps the user's activation; close a beat later.
    const resolve = settle;
    settle = null;
    resolve?.(true);
    setTimeout(() => { if (dialog?.open) dialog.close(); }, reduced() ? 0 : 700);
  }

  function onClick(event) {
    const tile = event.target.closest("[data-twc-tile]");
    if (tile) {
      tile.setAttribute("aria-pressed", tile.getAttribute("aria-pressed") === "true" ? "false" : "true");
      say("");
      return;
    }
    const action = event.target.closest("[data-twc]")?.dataset.twc;
    if (action === "reload") newRound();
    else if (action === "audio") say("듣기 문제는 영어 영역에서만 지원합니다.", "note");
    else if (action === "info") say("수험생과 선생님은 무료로 쓰실 수 있습니다. 영리 목적이라면 먼저 연락해 주십시오.", "note");
    else if (action === "honest") { say("솔직하셔서 감사합니다. 영리 목적의 이용은 따로 연락해 주십시오.", "note"); setTimeout(() => finish(false), 1800); }
    else if (action === "verify") verify();
  }

  function finish(result) {
    if (dialog?.open) dialog.close();
    const resolve = settle;
    settle = null;
    resolve?.(result);
  }

  function requirePass() {
    if (readPass()) return Promise.resolve(true);
    ensureDialog();
    if (settle) return new Promise((resolve) => { const previous = settle; settle = (value) => { previous(value); resolve(value); }; });
    newRound();
    dialog.showModal();
    dialog.querySelector(".twc-tile")?.focus({ preventScroll: true });
    return new Promise((resolve) => { settle = resolve; });
  }

  function stamp() {
    const time = readPass();
    if (!time) return "";
    const date = new Date(time);
    const text = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" }).format(date);
    return `이 파일을 받은 분은 ${text}에 이 자료를 써도 되는 사람임을 스스로 확인했습니다.`;
  }

  window.TwCaptcha = { require: requirePass, passed: () => Boolean(readPass()), stamp };
})();
