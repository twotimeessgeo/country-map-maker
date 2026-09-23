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
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-lightbox-src]");
      if (!button) return;
      picture.src = button.dataset.lightboxSrc;
      picture.alt = button.dataset.lightboxCaption;
      caption.textContent = button.dataset.lightboxCaption;
      dialog.showModal();
    });
    dialog.querySelector("#notesLightboxClose").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => { picture.removeAttribute("src"); });
  }
})();
