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
  const tocLinks = [...document.querySelectorAll('.notes-desktop-toc a, .notes-mobile-toc a')];
  if (sections.length && "IntersectionObserver" in window) {
    const active = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) active.add(entry.target.id);
        else active.delete(entry.target.id);
      }
      const current = sections.findLast((section) => section.getBoundingClientRect().top <= innerHeight * 0.35)?.id || sections[0].id;
      for (const link of tocLinks) link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
    }, { rootMargin: "-10% 0px -65% 0px" });
    for (const section of sections) observer.observe(section);
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
