(() => {
  const fx = new URLSearchParams(location.search);
  if (fx.get("fx-notes-thumb") === "1") document.documentElement.dataset.fxNotesThumb = "on";
  if (fx.get("fx-progress") === "1") document.documentElement.dataset.fxProgress = "on";
  if (document.querySelector(".notes-progress") && document.documentElement.dataset.fxProgress === "on") {
    let scheduled = false;
    const updateProgress = () => {
      scheduled = false;
      const length = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      document.documentElement.style.setProperty("--read-progress", `${Math.min(100, Math.max(0, scrollY / length * 100))}%`);
    };
    const scheduleProgress = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } };
    addEventListener("scroll", scheduleProgress, { passive: true });
    addEventListener("resize", scheduleProgress, { passive: true });
    scheduleProgress();
  }
  const filters = document.querySelector(".notes-filters");
  if (filters) {
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-subject]");
      if (!button) return;
      for (const option of filters.querySelectorAll("button[data-subject]")) option.setAttribute("aria-pressed", String(option === button));
      for (const row of document.querySelectorAll(".notes-list-row")) row.hidden = button.dataset.subject !== "all" && row.dataset.subject !== button.dataset.subject;
    });
  }

  const revealItems = [...document.querySelectorAll(".tw-reveal")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    for (const item of revealItems) item.classList.add("is-visible");
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.01, rootMargin: "0px 0px 100px 0px" });
    for (const item of revealItems) revealObserver.observe(item);
  }

  const sections = [...document.querySelectorAll(".notes-section[id]")];
  const desktopToc = document.querySelector(".notes-desktop-toc nav");
  const desktopLinks = [...document.querySelectorAll(".notes-desktop-toc a")];
  const mobileStrip = document.querySelector(".notes-mobile-strip");
  const mobileLinks = [...document.querySelectorAll(".notes-mobile-strip a")];
  if (mobileStrip) {
    const syncStripHeight = () => document.documentElement.style.setProperty("--notes-strip-h", `${Math.ceil(mobileStrip.getBoundingClientRect().height)}px`);
    syncStripHeight();
    if ("ResizeObserver" in window) new ResizeObserver(syncStripHeight).observe(mobileStrip);
  }
  let activeAnchor = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  let anchorScheduled = false;
  function alignAnchor() {
    if (!activeAnchor || anchorScheduled) return;
    anchorScheduled = true;
    requestAnimationFrame(() => {
      anchorScheduled = false;
      if (activeAnchor?.isConnected) activeAnchor.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  if (activeAnchor) {
    alignAnchor();
    addEventListener("load", alignAnchor, { once: true });
    document.fonts?.ready.then(alignAnchor);
  }
  if ("ResizeObserver" in window) new ResizeObserver(alignAnchor).observe(document.body);
  addEventListener("hashchange", () => {
    activeAnchor = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    alignAnchor();
  });
  document.addEventListener("click", (event) => {
    const href = event.target.closest?.('a[href^="#"]')?.getAttribute("href");
    if (href) {
      activeAnchor = document.getElementById(decodeURIComponent(href.slice(1)));
      alignAnchor();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.('a[href^="#"]')) activeAnchor = null;
  }, { passive: true });
  addEventListener("wheel", () => { activeAnchor = null; }, { passive: true });
  addEventListener("touchmove", () => { activeAnchor = null; }, { passive: true });
  addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) activeAnchor = null;
  });

  const overviewItems = [...document.querySelectorAll(".notes-overview-item")];
  const overviewUnits = [...document.querySelectorAll(".notes-overview-units span")].map((unit) => ({
    start: Number(unit.style.gridColumnStart),
    end: Number(unit.style.gridColumnStart) + Number(unit.style.gridColumnEnd.replace("span ", "")) - 1,
    name: unit.title,
  }));
  function syncOverviewTooltips() {
    const narrow = innerWidth < 480;
    overviewItems.forEach((item, index) => {
      if (!item.dataset.baseTooltip) item.dataset.baseTooltip = item.dataset.tooltip;
      const unit = overviewUnits.find((entry) => index + 1 >= entry.start && index + 1 <= entry.end);
      const text = narrow && unit ? `${item.dataset.baseTooltip} ${unit.name}` : item.dataset.baseTooltip;
      item.dataset.tooltip = text;
      item.setAttribute("aria-label", text);
    });
  }
  syncOverviewTooltips();
  addEventListener("resize", syncOverviewTooltips);
  let currentSection = "";
  function updateToc() {
    if (!sections.length) return;
    const current = sections.findLast((section) => section.getBoundingClientRect().top <= innerHeight * .35)?.id || sections[0].id;
    if (current === currentSection) return;
    currentSection = current;
    for (const link of [...desktopLinks, ...mobileLinks]) {
      const selected = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("is-active", selected);
      if (selected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
    const desktopCurrent = desktopLinks.find((link) => link.getAttribute("href") === `#${current}`);
    const indicator = desktopToc?.querySelector(".notes-toc-indicator");
    if (desktopCurrent && indicator) {
      indicator.style.transform = `translateY(${desktopCurrent.offsetTop}px)`;
      indicator.style.height = `${desktopCurrent.offsetHeight}px`;
      if (desktopToc.scrollHeight > desktopToc.clientHeight) {
        const container = desktopToc.getBoundingClientRect();
        const item = desktopCurrent.getBoundingClientRect();
        if (item.top < container.top) desktopToc.scrollTop += item.top - container.top;
        else if (item.bottom > container.bottom) desktopToc.scrollTop += item.bottom - container.bottom;
      }
    }
    const mobileCurrent = mobileLinks.find((link) => link.getAttribute("href") === `#${current}`);
    if (mobileCurrent && mobileStrip && getComputedStyle(mobileStrip).display !== "none") {
      mobileStrip.scrollTo({ left: mobileCurrent.offsetLeft - (mobileStrip.clientWidth - mobileCurrent.clientWidth) / 2, behavior: reducedMotion ? "instant" : "smooth" });
    }
  }
  if (sections.length) {
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(updateToc, { rootMargin: "-10% 0px -65% 0px" });
      for (const section of sections) observer.observe(section);
    }
    let scheduled = false;
    addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; updateToc(); });
    }, { passive: true });
    addEventListener("resize", updateToc);
    updateToc();
  }

  const dialog = document.querySelector("#notesLightbox");
  if (dialog) {
    const picture = dialog.querySelector("#notesLightboxImage");
    const caption = dialog.querySelector("#notesLightboxCaption");
    const prev = dialog.querySelector("#notesLightboxPrev");
    const next = dialog.querySelector("#notesLightboxNext");
    let group = [];
    let index = 0;
    const update = () => {
      const button = group[index];
      if (!button) return;
      picture.src = button.dataset.lightboxSrc;
      picture.alt = button.dataset.lightboxCaption;
      caption.textContent = button.dataset.lightboxCaption;
      prev.disabled = index === 0;
      next.disabled = index === group.length - 1;
    };
    const move = (direction) => {
      const target = index + direction;
      if (target < 0 || target >= group.length) return;
      index = target;
      update();
    };
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lightbox-src]");
      if (!button) return;
      const figure = button.closest(".notes-figure");
      const question = figure?.dataset.question;
      group = question ? [...document.querySelectorAll(`.notes-figure[data-question="${question}"] .notes-image-button`)] : [button];
      index = Math.max(0, group.indexOf(button));
      update();
      dialog.showModal();
      if (!reducedMotion) {
        const first = figure.getBoundingClientRect();
        const last = dialog.getBoundingClientRect();
        dialog.animate([
          { transformOrigin: "top left", transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${Math.max(0.12, first.width / last.width)}, ${Math.max(0.12, first.height / last.height)})`, opacity: 0.72 },
          { transformOrigin: "top left", transform: "none", opacity: 1 },
        ], { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      }
    });
    prev.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
    dialog.querySelector("#notesLightboxClose").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { picture.removeAttribute("src"); });
  }
})();
