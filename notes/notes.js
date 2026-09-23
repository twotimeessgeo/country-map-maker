(() => {
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
