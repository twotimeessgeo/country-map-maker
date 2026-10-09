(() => {
  "use strict";
  // Random drill on a deck of cards, in three modes.
  //   연습 (practice): endless. Each statement carries a box: every right answer moves it up one, a miss sends it back
  //     to zero. New and missed statements are drawn far more often than ones already answered right, and a missed
  //     statement is brought back twice on purpose, a few cards later and then a little further on.
  //   타임어택 (attack): 60 seconds, shuffled, count of statements answered right on the first try. Best score is kept.
  //   오답 (review): only the statements missed before. Answering one right here takes it off the list.
  // The board under the deck has one dot per statement: filled once its latest answer was right, a ring after a miss.
  //
  // Progress lives in this browser only. Statements are keyed by a hash of their text, so reordering or renumbering the
  // data keeps what the visitor has done; an edited statement simply counts as new.
  const STORE_KEY = "promenade.ox.v1";
  const BOX = 3; // low two bits: 0 to 3 right answers in a row
  const SEEN = 4;
  const NOTED = 8; // missed at some point and not yet answered right in 오답
  const WEIGHT_NEW = 20;
  const WEIGHT_MISSED = 30;
  const WEIGHT_BOX = [0, 3, 1, 0.3];
  const RECENT = 8; // statements shown this recently are not drawn again
  const RETRY_SOON = [3, 5]; // a missed statement returns after this many others
  const RETRY_LATER = [10, 16]; // and once more after this many
  const RIPPLE_EVERY = 10;
  const ATTACK_SECONDS = 60;
  const ARM_MS = 3500;
  const TRACK = "./audio/bgm.mp3?v=2";
  const TRACK_LOOP = [15.461202, 64.872971]; // seconds, one pass of the tune apart to the sample: the intro plays once, then the track goes round between them
  const VOLUME = 0.55;
  const FADE = 0.5;
  const SIDE = { O: -1, X: 1 }; // O leaves to the left, X to the right, matching the buttons and the arrow keys
  const SHAPES = {
    O: '<circle cx="12" cy="12" r="8" pathLength="1"/>',
    X: '<path d="M5 5 19 19" pathLength="1"/><path d="M19 5 5 19" pathLength="1"/>',
  };
  const shape = (answer, name) => '<svg class="' + name + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + SHAPES[answer] + "</svg>";
  const icon = (name) => '<svg class="tw-icon" aria-hidden="true" focusable="false"><use href="../../ds/icons.svg#i-' + name + '"></use></svg>';

  const el = {};
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let data = null;
  let extraData = null;
  let extraRequest = null;
  let store = loadStore();
  let view = null;
  let viewVersion = 0;
  let base = []; // every statement in the chosen subject and range
  let pool = []; // what this mode draws from
  let dots = new Map();
  let current = null;
  let card = null;
  let waiting = false;
  let streak = 0;
  let step = 0;
  let retry = [];
  let stage = new Map(); // 1 after a miss, 2 once it has come back and been answered right
  let recent = [];
  let drag = null;
  let hint = null;
  let run = null; // 타임어택: { state: "ready" | "running" | "done", end, score, trail, missed, queue }
  let review = { total: 0, done: 0 };
  let sound = null; // { context, gain, ready }, built on the first press
  let soundSleep = 0;
  let toastTimer = 0;
  let armTimer = 0;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    for (const id of ["oxSubject", "oxScope", "oxMode", "oxNoteCount", "oxTimer", "oxTimerFill", "oxTimerCount", "oxDeck", "oxEcho", "oxAnswers",
      "oxField", "oxCount", "oxRight", "oxTotal", "oxBest", "oxBestCount", "oxStreak", "oxStreakCount", "oxMissed", "oxSound", "oxReset", "oxStatus",
      "oxToast", "oxExpand"]) el[id] = document.getElementById(id);
    el.answers = [...el.oxAnswers.querySelectorAll("[data-answer]")];
    try {
      const response = await fetch("./data/ox.json?v=1", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      data = await response.json();
      if (window.TwCodec) data = window.TwCodec.unwrap(data);
      prepare(data);
      if (new URLSearchParams(location.search).get("expand") === "1") {
        try {
          await loadExtra();
        } catch (error) {
          const url = new URL(location.href);
          url.searchParams.delete("expand");
          history.replaceState(null, "", url);
          toast("확장 문장을 불러오지 못했습니다");
        }
      }
      bind();
      start();
      el.oxExpand.disabled = false;
    } catch (error) {
      el.oxDeck.innerHTML = '<p class="ox-empty">문장을 불러오지 못했습니다</p>';
      console.error("OX load failed", error);
    }
  }

  function prepare(dataset, extra = false) {
    for (const subject of Object.values(dataset.subjects)) {
      subject.items = [];
      subject.regional = [];
      for (const chapter of subject.chapters) {
        for (const group of chapter.groups) {
          for (const item of group.items) {
            item.id = hash(item.t);
            if (extra) item.extra = true;
            subject.items.push(item);
            if (chapter.regional) subject.regional.push(item);
          }
        }
      }
    }
  }

  // The original bank and its progress keys stay intact. Extra statements are fetched only after opting in.
  async function loadExtra() {
    if (extraData) return;
    if (extraRequest) return extraRequest;
    extraRequest = (async () => {
      const response = await fetch("./data/ox-extra.json?v=1", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      let loaded = await response.json();
      if (window.TwCodec) loaded = window.TwCodec.unwrap(loaded);
      prepare(loaded, true);
      for (const key of Object.keys(data.subjects)) {
        const items = loaded.subjects[key]?.items;
        const keys = new Set(data.subjects[key].items.map((item) => item.id));
        if (!items?.length || items.length !== loaded.meta?.count?.[key]) throw new Error("Invalid extension bank");
        for (const item of items) {
          if (!item.t || !["O", "X"].includes(item.a) || (item.a === "X" && !item.f) || keys.has(item.id)) throw new Error("Invalid extension statement");
          keys.add(item.id);
        }
      }
      extraData = loaded;
    })();
    try {
      await extraRequest;
    } finally {
      extraRequest = null;
    }
  }

  async function toggleExtra(event) {
    if (event?.detail) el.oxExpand.blur(); // after a mouse or touch press, Space should move on after a miss, not press this again
    if (view.expand) {
      navigate({ expand: null });
      return;
    }
    el.oxExpand.disabled = true;
    el.oxExpand.setAttribute("aria-busy", "true");
    const requestedView = viewVersion;
    try {
      await loadExtra();
      // A later navigation or time-attack start supersedes this pending opt-in.
      if (viewVersion === requestedView) {
        navigate({ expand: "1" });
        if (view.expand) toast("확장 문장 " + extraData.subjects[view.subject].items.length + "개를 더했습니다");
      }
    } catch (error) {
      toast("확장 문장을 불러오지 못했습니다");
    } finally {
      el.oxExpand.disabled = false;
      el.oxExpand.removeAttribute("aria-busy");
    }
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619) >>> 0;
    }
    return value.toString(36);
  }

  function loadStore() {
    const empty = { v: 1, subject: null, s: {}, best: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!saved || saved.v !== 1 || typeof saved.s !== "object" || !saved.s) return empty;
      return { v: 1, subject: saved.subject || null, s: saved.s, best: saved.best && typeof saved.best === "object" ? saved.best : {}, sound: saved.sound };
    } catch (error) {
      return empty;
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (error) {
      /* Private mode or a full quota: the quiz still runs, it just is not remembered. */
    }
  }

  const codes = () => (store.s[view.subject] ||= {});
  const codeOf = (item) => codes()[item.id] || 0;
  const between = ([low, high]) => low + Math.floor(Math.random() * (high - low + 1));
  const bestKey = () => view.subject + ":" + view.scope + (view.expand ? ":expanded" : "");

  function shuffled(items) {
    const list = [...items];
    for (let index = list.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [list[index], list[other]] = [list[other], list[index]];
    }
    return list;
  }

  function readView() {
    const params = new URLSearchParams(location.search);
    const asked = params.get("subject");
    const subject = data.subjects[asked] ? asked : data.subjects[store.subject] ? store.subject : Object.keys(data.subjects)[0];
    const scope = params.get("scope") === "region" && data.subjects[subject].regional.length ? "region" : "all";
    const mode = ["attack", "review"].includes(params.get("mode")) ? params.get("mode") : "practice";
    // The extra bank adds nothing to 지역성, so the switch only counts in 전 범위.
    const expand = params.get("expand") === "1" && !!extraData && scope === "all";
    return { subject, scope, mode, expand };
  }

  function navigate(updates) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    history.pushState(null, "", url);
    start();
  }

  function start() {
    viewVersion += 1;
    endHint();
    if (run) cancelAnimationFrame(run.frame);
    view = readView();
    if (store.subject !== view.subject) {
      store.subject = view.subject;
      save();
    }
    const subject = data.subjects[view.subject];
    base = view.scope === "region" ? subject.regional : subject.items;
    const extraSubject = extraData?.subjects[view.subject];
    const extras = extraSubject ? (view.scope === "region" ? extraSubject.regional : extraSubject.items) : [];
    if (view.expand) base = base.concat(extras);
    el.oxExpand.setAttribute("aria-pressed", String(view.expand));
    el.oxExpand.hidden = view.scope === "region";
    retry = [];
    stage = new Map();
    recent = [];
    waiting = false;
    current = null;
    card = null;
    drag = null;
    run = null;
    el.oxSubject.value = view.subject;
    // A subject without a regional block has one range, so the switch has nothing to offer.
    el.oxScope.hidden = !subject.regional.length;
    for (const button of el.oxScope.querySelectorAll("[data-scope]")) button.setAttribute("aria-pressed", String(button.dataset.scope === view.scope));
    for (const button of el.oxMode.querySelectorAll("[data-mode]")) button.setAttribute("aria-pressed", String(button.dataset.mode === view.mode));
    el.oxDeck.replaceChildren();
    el.oxEcho.textContent = "";
    el.oxMissed.hidden = true;
    el.oxTimer.hidden = view.mode !== "attack";
    el.oxField.classList.toggle("is-trail", view.mode === "attack");

    if (view.mode === "attack") {
      pool = base;
      run = { state: "ready" };
      el.oxField.replaceChildren();
      dots = new Map();
      renderTimer(ATTACK_SECONDS * 1000);
      showPanel(panelHtml(ATTACK_SECONDS, "초", [["start", "play", "시작", true]]), 0);
    } else if (view.mode === "review") {
      pool = base.filter((item) => codeOf(item) & NOTED);
      review = { total: pool.length, done: 0 };
      buildField();
      if (pool.length) deal(0);
      else showPanel('<p class="ox-panel-note">오답이 없습니다</p>', 0);
    } else {
      pool = base;
      buildField();
      deal(0);
      if (!Object.keys(codes()).length) showHint();
    }
    renderAnswers();
    renderStats();
  }

  // First visit: the card leans left to O and right to X once, to show which way each answer goes.
  function showHint() {
    if (reducedMotion.matches || !card.animate) return;
    const lean = (side) => "translateX(" + side * 44 + "px) rotate(" + side * 1.6 + "deg)";
    const motion = card.animate(
      [{ transform: "none", offset: 0 }, { transform: lean(-1), offset: 0.22 }, { transform: lean(-1), offset: 0.38 },
        { transform: lean(1), offset: 0.66 }, { transform: lean(1), offset: 0.82 }, { transform: "none", offset: 1 }],
      { duration: 2000, delay: 700, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
    );
    const target = card;
    const timers = [
      setTimeout(() => stamp(target, "O"), 900),
      setTimeout(() => stamp(target, "X"), 1850),
      setTimeout(() => endHint(), 2700),
    ];
    hint = { motion, timers, target };
  }

  function endHint() {
    if (!hint) return;
    hint.motion.cancel();
    hint.timers.forEach(clearTimeout);
    const mark = hint.target.querySelector(".ox-mark");
    if (hint.target === card && !waiting && mark) {
      mark.classList.remove("is-drawn");
      mark.style.setProperty("--draw", 0);
    }
    hint = null;
  }

  function weightOf(item) {
    const code = codeOf(item);
    if (!(code & SEEN)) return WEIGHT_NEW;
    return code & BOX ? WEIGHT_BOX[code & BOX] : WEIGHT_MISSED;
  }

  function draw() {
    if (view.mode === "attack") {
      if (!run.queue.length) run.queue = shuffled(pool);
      return run.queue.pop();
    }
    step += 1;
    const due = retry.findIndex((entry) => entry.due <= step);
    if (due >= 0) return retry.splice(due, 1)[0].item;
    const held = new Set(recent);
    for (const entry of retry) held.add(entry.item);
    let total = 0;
    const weights = pool.map((item) => {
      const weight = held.has(item) ? 0 : weightOf(item);
      total += weight;
      return weight;
    });
    if (!total) return pool[Math.floor(Math.random() * pool.length)];
    let roll = Math.random() * total;
    for (let index = 0; index < pool.length; index += 1) {
      roll -= weights[index];
      if (roll < 0) return pool[index];
    }
    return pool[pool.length - 1];
  }

  // Put a new card on the deck, sending the one on top off to a side (0: it sinks back instead).
  function place(next, side) {
    const leaving = card;
    card = next;
    el.oxDeck.prepend(card); // under the card that is leaving
    if (!leaving) return;
    card.classList.add("is-rising");
    el.oxDeck.classList.remove("is-shifting");
    void el.oxDeck.offsetWidth;
    el.oxDeck.classList.add("is-shifting");
    leaving.classList.add("is-leaving");
    leaving.setAttribute("aria-hidden", "true");
    if (reducedMotion.matches || !leaving.animate) {
      leaving.remove();
      return;
    }
    const from = leaving.style.transform || "translateX(0) rotate(0deg)";
    const to = side ? "translateX(" + side * 115 + "%) rotate(" + side * 10 + "deg)" : "translateY(14px) scale(0.95)";
    leaving.style.transition = "none";
    const flight = leaving.animate([{ transform: from, opacity: 1 }, { transform: to, opacity: 0 }],
      { duration: side ? 320 : 220, easing: "cubic-bezier(0.4, 0, 0.9, 0.6)", fill: "forwards" });
    flight.onfinish = () => leaving.remove();
    setTimeout(() => leaving.remove(), 600);
  }

  function deal(side) {
    waiting = false;
    dots.get(current)?.classList.remove("is-current");
    current = draw();
    recent.push(current);
    if (recent.length > Math.min(RECENT, Math.floor(pool.length / 2))) recent.shift();
    const next = document.createElement("article");
    next.className = "ox-card";
    next.innerHTML = (current.extra ? '<span class="ox-card-pack">확장</span>' : "") +
      '<span class="ox-mark"></span><div class="ox-card-body"><p class="ox-statement"><span>' + escapeHtml(current.t) + "</span></p></div>";
    place(next, side);
    dots.get(current)?.classList.add("is-current");
    renderAnswers();
    renderStats();
  }

  // A card that is not a statement: the start and result of 타임어택, or a short notice.
  function showPanel(html, side) {
    waiting = false;
    dots.get(current)?.classList.remove("is-current");
    current = null;
    const next = document.createElement("article");
    next.className = "ox-card is-panel";
    next.innerHTML = '<div class="ox-panel">' + html + "</div>";
    place(next, side);
    renderAnswers();
    renderStats();
  }

  function panelHtml(number, unit, actions, badge) {
    return (badge ? '<span class="tw-badge is-ink">' + badge + "</span>" : "") +
      '<p class="ox-big"><b lang="en">' + number + "</b><span>" + unit + '</span></p><div class="ox-panel-actions">' +
      actions.map(([action, glyph, label, primary]) => '<button class="ox-round' + (primary ? " is-primary" : "") + '" type="button" data-action="' +
        action + '" aria-label="' + label + '" data-tooltip="' + label + '">' + icon(glyph) + "</button>").join("") + "</div>";
  }

  // Draw O or X behind the text. With a progress value the shape is drawn that far (used while dragging).
  function stamp(target, answer, progress) {
    const mark = target.querySelector(".ox-mark");
    if (!mark) return;
    if (mark.dataset.shape !== answer) {
      mark.dataset.shape = answer;
      mark.innerHTML = shape(answer, "");
    }
    mark.classList.toggle("is-drawn", progress === undefined);
    mark.style.setProperty("--draw", progress === undefined ? 1 : progress);
  }

  function answer(choice, fromDrag) {
    if (!current) return;
    endHint();
    const side = SIDE[choice];
    if (waiting) {
      // After a miss the right answer is the way on.
      if (choice === current.a) deal(side);
      else settle();
      return;
    }
    const book = codes();
    const code = book[current.id] || 0;
    press(choice);
    if (choice === current.a) {
      const kept = view.mode === "review" ? 0 : code & NOTED;
      book[current.id] = SEEN | kept | Math.min(BOX, (code & BOX) + 1);
      streak += 1;
      if (view.mode === "attack") {
        run.score += 1;
        trail(true);
      } else {
        // First comeback after a miss: bring it back once more, further on (not in 오답, where it is now off the list).
        if (stage.get(current) === 1 && view.mode === "practice") {
          retry.push({ item: current, due: step + between(RETRY_LATER) });
          stage.set(current, 2);
        } else {
          stage.delete(current);
        }
        paintDot(current, true);
        if (streak % RIPPLE_EVERY === 0) ripple();
        // A false statement spotted correctly: leave what it should have said under the deck.
        el.oxEcho.innerHTML = current.f ? fixHtml(current.f) : "";
      }
      save();
      stamp(card, choice);
      el.oxStatus.textContent = "정답";
      if (view.mode === "review") {
        review.done += 1;
        pool = pool.filter((item) => item !== current);
        retry = retry.filter((entry) => entry.item !== current);
        if (!pool.length) {
          showPanel('<p class="ox-panel-note">모두 맞혔습니다</p>', side);
          return;
        }
      }
      deal(side);
      return;
    }
    book[current.id] = SEEN | NOTED;
    streak = 0;
    if (view.mode === "attack") {
      run.missed.push(current);
      trail(false);
    } else {
      retry = retry.filter((entry) => entry.item !== current);
      retry.push({ item: current, due: step + between(RETRY_SOON) });
      stage.set(current, 1);
      paintDot(current, false);
    }
    save();
    waiting = true;
    card.style.transform = "";
    el.oxEcho.textContent = "";
    reveal();
    if (fromDrag) settle();
    else recoil(side);
    // A focused button that is about to be switched off would swallow the next key press; hand focus to the right answer.
    const focused = document.activeElement;
    renderAnswers();
    if (el.answers.includes(focused) && focused.disabled) el.answers.find((entry) => !entry.disabled).focus({ preventScroll: true });
    renderStats();
    el.oxStatus.textContent = "오답. " + (current.f ? current.f.replace(/[[\]]/g, "") : "옳은 문장입니다");
  }

  // The card stays: draw the right answer behind the text, and for a false statement strike it and show the correction.
  function reveal() {
    stamp(card, current.a);
    card.classList.add("is-missed");
    if (!current.f) return;
    const statement = card.querySelector(".ox-statement");
    const before = statement.getBoundingClientRect().top;
    card.classList.add("is-false");
    const fix = document.createElement("p");
    fix.className = "ox-fix";
    fix.innerHTML = fixHtml(current.f);
    card.querySelector(".ox-card-body").append(fix);
    const shift = before - statement.getBoundingClientRect().top;
    if (shift && statement.animate && !reducedMotion.matches) {
      statement.animate([{ transform: "translateY(" + shift + "px)" }, { transform: "none" }], { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    }
  }

  // A wrong answer from a button or key: the card leans the way it was pushed and comes back.
  function recoil(side) {
    if (reducedMotion.matches || !card.animate) return;
    card.animate(
      [{ transform: "none" }, { transform: "translateX(" + side * 18 + "px) rotate(" + side * 1.6 + "deg)", offset: 0.3 }, { transform: "none" }],
      { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }

  function settle() {
    card.style.transition = "";
    card.style.transform = "";
    if (waiting) stamp(card, current.a);
    else card.querySelector(".ox-mark")?.style.setProperty("--draw", 0);
  }

  function press(choice) {
    const button = el.answers.find((entry) => entry.dataset.answer === choice);
    button.classList.remove("is-pressed");
    void button.offsetWidth;
    button.classList.add("is-pressed");
  }

  /* ───────── 타임어택 ───────── */

  function startAttack() {
    viewVersion += 1;
    cancelAnimationFrame(run?.frame);
    run = { state: "running", end: performance.now() + ATTACK_SECONDS * 1000, score: 0, trail: [], missed: [], queue: shuffled(pool), frame: 0 };
    el.oxField.replaceChildren();
    el.oxMissed.hidden = true;
    deal(0);
    tick();
    if (store.sound !== false) setSound(true, false); // music comes with the game unless it was switched off
  }

  function tick() {
    if (!run || run.state !== "running") return;
    const left = run.end - performance.now();
    if (left <= 0) {
      finishAttack();
      return;
    }
    renderTimer(left);
    run.frame = requestAnimationFrame(tick);
  }

  function renderTimer(left) {
    el.oxTimerFill.style.transform = "scaleX(" + Math.max(0, left / (ATTACK_SECONDS * 1000)) + ")";
    const second=Math.ceil(left/1000);
    const previous=el.oxTimerCount.dataset.value;
    roll(el.oxTimerCount, second);
    if(run?.state==='running'&&second>0&&second<=5&&String(second)!==previous&&!reducedMotion.matches) {
      const css=getComputedStyle(document.documentElement);
      el.oxTimerCount.animate([{transform:'scale(1)'},{transform:'scale(1.08)'},{transform:'scale(1)'}],{duration:parseFloat(css.getPropertyValue('--tw-dur-2')),easing:css.getPropertyValue('--tw-ease-out').trim()});
    }
  }

  function finishAttack() {
    run.state = "done";
    renderTimer(0);
    const best = store.best[bestKey()] || 0;
    const record = run.score > best;
    if (record) {
      store.best[bestKey()] = run.score;
      save();
    }
    el.oxEcho.textContent = "";
    showPanel(panelHtml(run.score, "문장", [["start", "refresh", "다시", true], ["share", "copy", "결과 복사", false]], record && best ? "최고 기록" : ""), 0);
    el.oxMissed.innerHTML = run.missed.map((item) => "<li>" + shape(item.a, "ox-shape") + "<p>" + (item.f ? fixHtml(item.f) : escapeHtml(item.t)) + "</p></li>").join("");
    el.oxMissed.hidden = !run.missed.length;
    el.oxStatus.textContent = ATTACK_SECONDS + "초 " + run.score + "문장";
  }

  function trail(right) {
    run.trail.push(right);
    const dot = document.createElement("i");
    dot.className = (right ? "is-right" : "is-missed") + " is-landing";
    el.oxField.append(dot);
  }

  async function share() {
    const subject = data.subjects[view.subject];
    const text = "Promenade OX " + subject.title + (view.scope === "region" ? " 지역성" : "") + (view.expand ? " 확장" : "") + " 타임어택\n" + ATTACK_SECONDS + "초 " + run.score +
      "문장\n" + run.trail.map((right) => (right ? "●" : "○")).join("") + "\n" + location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const area = Object.assign(document.createElement("textarea"), { value: text });
      area.style.cssText = "position:fixed;opacity:0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast("복사했습니다");
  }

  function toast(message, lasts = 1800) {
    el.oxToast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.oxToast.textContent = ""; }, lasts);
  }

  /* ───────── 초기화 ───────── */

  // Wipes this subject's progress, missed list and best scores. It takes two presses, the second within a few seconds.
  function bindReset() {
    const disarm = () => {
      clearTimeout(armTimer);
      el.oxReset.removeAttribute("data-armed");
    };
    el.oxReset.addEventListener("click", () => {
      if (!el.oxReset.dataset.armed) {
        el.oxReset.dataset.armed = "true";
        toast("한 번 더 누르면 " + data.subjects[view.subject].title + " 기록을 모두 지웁니다", ARM_MS);
        armTimer = setTimeout(disarm, ARM_MS);
        return;
      }
      disarm();
      el.oxReset.blur();
      delete store.s[view.subject];
      for (const key of Object.keys(store.best)) if (key.startsWith(view.subject + ":")) delete store.best[key];
      save();
      streak = 0;
      start();
      toast("초기화했습니다");
    });
    el.oxReset.addEventListener("blur", disarm);
  }

  /* ───────── 배경 음악 ───────── */

  function setSound(on, remember) {
    if (remember) {
      store.sound = on;
      save();
    }
    el.oxSound.setAttribute("aria-pressed", String(on));
    clearTimeout(soundSleep);
    if (on) {
      if (!sound) sound = openSound();
      if (!sound) {
        el.oxSound.setAttribute("aria-pressed", "false");
        return;
      }
      const opened = sound;
      opened.context.resume();
      opened.ready.then(() => {
        if (sound === opened && el.oxSound.getAttribute("aria-pressed") === "true") fade(VOLUME);
      }, () => {
        if (sound !== opened) return;
        sound = null; // the next press tries again
        opened.context.close();
        el.oxSound.setAttribute("aria-pressed", "false");
        toast("음악을 불러오지 못했습니다");
      });
    } else if (sound) {
      fade(0);
      const { context } = sound;
      soundSleep = setTimeout(() => context.suspend(), FADE * 1000 + 60); // suspended, the track keeps its place
    }
  }

  // The track is decoded into memory and looped by the audio clock. A media element with loop set
  // can only go back to the very start, and leaves a gap when it does.
  function openSound() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    const context = new Context();
    if (navigator.audioSession) navigator.audioSession.type = "playback"; // iOS: keep playing with the ringer switch off
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    const ready = fetch(TRACK)
      .then((response) => {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.arrayBuffer();
      })
      .then((bytes) => new Promise((resolve, reject) => context.decodeAudioData(bytes, resolve, reject)))
      .then((buffer) => {
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        [source.loopStart, source.loopEnd] = TRACK_LOOP;
        source.connect(gain);
        source.start();
      });
    return { context, gain, ready };
  }

  function fade(to) {
    const { context, gain } = sound;
    const now = context.currentTime;
    const level = gain.gain.value;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(level, now);
    gain.gain.linearRampToValueAtTime(to, now + FADE);
  }

  function bindSound() {
    el.oxSound.addEventListener("click", () => setSound(el.oxSound.getAttribute("aria-pressed") !== "true", true));
    // Left on last time: browsers only allow sound after a first touch or key, so start it then.
    if (store.sound === true) {
      const begin = (event) => {
        removeEventListener("pointerdown", begin, true);
        removeEventListener("keydown", begin, true);
        if (!el.oxSound.contains(event.target) && store.sound === true) setSound(true, false);
      };
      addEventListener("pointerdown", begin, true);
      addEventListener("keydown", begin, true);
    }
    document.addEventListener("visibilitychange", () => {
      if (!sound) return;
      clearTimeout(soundSleep);
      if (document.hidden) sound.context.suspend();
      else if (el.oxSound.getAttribute("aria-pressed") === "true") sound.context.resume();
    });
  }

  /* ───────── 입력 ───────── */

  function bind() {
    el.oxExpand.addEventListener("click", toggleExtra);
    el.oxSubject.addEventListener("change", () => {
      el.oxSubject.blur(); // so the O and X keys answer again instead of typing into the menu
      navigate({ subject: el.oxSubject.value, scope: null });
    });
    el.oxScope.addEventListener("click", (event) => {
      const button = event.target.closest("[data-scope]");
      if (button && button.dataset.scope !== view.scope) navigate({ scope: button.dataset.scope === "region" ? "region" : null });
    });
    el.oxMode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]");
      if (button && button.dataset.mode !== view.mode) navigate({ mode: button.dataset.mode === "practice" ? null : button.dataset.mode });
    });
    el.oxAnswers.addEventListener("click", (event) => {
      const button = event.target.closest("[data-answer]");
      if (button) answer(button.dataset.answer);
    });
    el.oxDeck.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "start" && run && run.state !== "running") startAttack();
      if (action === "share" && run && run.state === "done") {
        event.target.closest("[data-action]").blur(); // so Space starts the next run
        share();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const focused = document.activeElement;
      if (focused && (["INPUT", "TEXTAREA", "SELECT"].includes(focused.tagName) || focused.isContentEditable)) return;
      if (event.code === "Space" || event.code === "Enter") {
        // A focused control keeps its own Space and Enter, except a range or mode button that is already chosen:
        // that is where focus sits right after picking 타임어택, and pressing it again would do nothing.
        const idle = focused && (el.oxMode.contains(focused) || el.oxScope.contains(focused)) && focused.getAttribute("aria-pressed") === "true";
        if (focused && focused !== document.body && !idle) return;
        if (event.code === "Space") event.preventDefault(); // a stray Space must not scroll the deck out of view
        if (run && run.state !== "running") {
          event.preventDefault();
          startAttack();
        } else if (waiting) {
          event.preventDefault();
          answer(current.a);
        }
        return;
      }
      // event.code, not event.key: with a Korean keyboard layout the O and X keys type ㅐ and ㅌ.
      if (event.code === "KeyO" || event.code === "ArrowLeft") {
        event.preventDefault();
        answer("O");
      } else if (event.code === "KeyX" || event.code === "ArrowRight") {
        event.preventDefault();
        answer("X");
      }
    });
    bindDrag();
    bindSound();
    bindReset();
    window.addEventListener("popstate", start);
  }

  // Drag the top card left for O or right for X. The answer draws itself behind the text as the card moves.
  function bindDrag() {
    const hover=matchMedia('(hover: hover)');
    el.oxDeck.addEventListener('pointermove',event=>{
      if(!hover.matches||reducedMotion.matches||drag||waiting||hint||!current||!card||card.classList.contains('is-leaving'))return;
      const side=event.clientX<card.getBoundingClientRect().left+card.clientWidth/2?-1:1;
      card.style.transform=`rotate(${side}deg) translateX(${side*4}px)`;
    });
    el.oxDeck.addEventListener('pointerleave',()=>{if(!drag&&!waiting&&card)card.style.transform='';});
    const threshold = () => Math.min(120, el.oxDeck.clientWidth * 0.24);
    el.oxDeck.addEventListener("pointerdown", (event) => {
      if (!current || !card.contains(event.target) || (event.pointerType === "mouse" && event.button !== 0)) return;
      endHint();
      card.style.transform="";
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, active: false, target: card };
    });
    window.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.id || drag.target !== card) return;
      drag.dx = event.clientX - drag.x;
      if (!drag.active) {
        if (Math.abs(drag.dx) < 8 || Math.abs(drag.dx) < Math.abs(event.clientY - drag.y)) return;
        drag.active = true;
        card.classList.add("is-dragging");
        card.setPointerCapture?.(drag.id);
      }
      card.style.transition = "none";
      card.style.transform = "translateX(" + drag.dx + "px) rotate(" + drag.dx / 28 + "deg)";
      if (!waiting) stamp(card, drag.dx < 0 ? "O" : "X", Math.min(1, Math.abs(drag.dx) / threshold()));
    });
    const release = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { dx, active, target } = drag;
      drag = null;
      if (!active || target !== card) return;
      card.classList.remove("is-dragging");
      if (event.type === "pointerup" && Math.abs(dx) >= threshold()) answer(dx < 0 ? "O" : "X", true);
      else settle();
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  /* ───────── 그리기 ───────── */

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  // A corrected sentence marks what changed in [brackets].
  const fixHtml = (text) => escapeHtml(text).replace(/\[([^\]]*)\]/g, "<b>$1</b>");

  function buildField() {
    dots = new Map();
    const fragment = document.createDocumentFragment();
    pool.forEach((item, index) => {
      const dot = document.createElement("i");
      const code = codeOf(item);
      if (code & SEEN) dot.className = code & BOX ? "is-right" : "is-missed";
      dot.style.setProperty("--i", index);
      dots.set(item, dot);
      fragment.append(dot);
    });
    el.oxField.replaceChildren(fragment);
    el.oxField.classList.remove("is-entering", "is-rippling");
    void el.oxField.offsetWidth;
    el.oxField.classList.add("is-entering");
  }

  function ripple() {
    el.oxField.classList.remove("is-entering", "is-rippling");
    void el.oxField.offsetWidth;
    el.oxField.classList.add("is-rippling");
    clearTimeout(ripple.timer);
    ripple.timer = setTimeout(() => el.oxField.classList.remove("is-rippling"), pool.length * 1.1 + 600);
  }

  function paintDot(item, right) {
    const dot = dots.get(item);
    if (!dot) return;
    dot.classList.remove("is-right", "is-missed", "is-landing");
    void dot.offsetWidth;
    dot.classList.add(right ? "is-right" : "is-missed", "is-landing");
  }

  function renderAnswers() {
    for (const button of el.answers) {
      const isAnswer = waiting && button.dataset.answer === current.a;
      button.disabled = !current || (waiting && !isAnswer);
      button.classList.toggle("is-go", isAnswer);
      button.setAttribute("aria-label", button.dataset.answer + (isAnswer ? ", 다음 문장" : ""));
    }
  }

  function renderStats() {
    const noted = base.reduce((total, item) => total + (codeOf(item) & NOTED ? 1 : 0), 0);
    el.oxNoteCount.textContent = noted;
    el.oxNoteCount.hidden = !noted;

    const attack = view.mode === "attack";
    const best = store.best[bestKey()] || 0;
    el.oxBest.hidden = !attack || !best;
    el.oxBestCount.textContent = best;
    el.oxStreak.hidden = attack || streak < 2;
    roll(el.oxStreakCount, streak);
    el.oxCount.hidden = attack && run.state !== "running"; // before the start there is no score; after, it is on the card
    if (attack) {
      roll(el.oxRight, run.score || 0);
      el.oxTotal.textContent = "문장";
      el.oxCount.removeAttribute("data-tooltip");
    } else if (view.mode === "review") {
      roll(el.oxRight, review.done);
      el.oxTotal.textContent = " / " + review.total;
      el.oxCount.dataset.tooltip = "맞힌 오답";
    } else {
      roll(el.oxRight, pool.reduce((total, item) => total + (codeOf(item) & BOX ? 1 : 0), 0));
      el.oxTotal.textContent = " / " + pool.length;
      el.oxCount.dataset.tooltip = "맞힌 문장";
    }
  }

  // Numbers change one digit at a time: the old digit slides out as the new one slides in.
  function roll(target, value) {
    const previous=target.dataset.value;
    window.TwMotion.rollDigits(target,String(value),Number(value)>=Number(previous||0)?1:-1);
  }
})();
