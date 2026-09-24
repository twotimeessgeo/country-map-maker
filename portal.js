/* Centered home navigation: hover, click, keyboard, and a one-time hint. */
(() => {
  const header = document.querySelector("#homeHeader");
  const brand = document.querySelector("#homeBrand");
  const links = document.querySelector("#homeLinks");
  if (!header || !brand || !links) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width: 720px) and (hover: hover) and (pointer: fine)");
  let pinned = false, closeTimer = 0, hintStart = 0, hintEnd = 0, hintActive = false;
  const clearClose = () => { clearTimeout(closeTimer); closeTimer = 0; };
  function setOpen(open) {
    header.classList.toggle("is-open", open);
    brand.setAttribute("aria-expanded", String(open));
    links.inert = !open;
  }
  function stopHint() {
    clearTimeout(hintStart);
    clearTimeout(hintEnd);
    hintActive = false;
  }
  brand.addEventListener("click", () => {
    stopHint(); clearClose();
    const next = !pinned;
    pinned = next;
    setOpen(next);
  });
  header.addEventListener("pointerenter", event => {
    if (!desktop.matches || event.pointerType !== "mouse") return;
    clearClose();
    if (!pinned) { stopHint(); setOpen(true); }
  });
  header.addEventListener("pointerleave", event => {
    if (!desktop.matches || event.pointerType !== "mouse" || pinned) return;
    clearClose();
    closeTimer = setTimeout(() => {
      if (!header.contains(document.activeElement)) setOpen(false);
    }, 400);
  });
  header.addEventListener("focusin", event => {
    if (event.target === brand || links.contains(event.target)) clearClose();
    if (links.contains(event.target)) setOpen(true);
  });
  header.addEventListener("focusout", () => {
    if (pinned) return;
    queueMicrotask(() => { if (!header.contains(document.activeElement) && !header.matches(":hover")) setOpen(false); });
  });
  document.addEventListener("pointerdown", event => {
    if (header.contains(event.target)) return;
    stopHint(); clearClose(); pinned = false; setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!header.classList.contains("is-open")) return;
    stopHint(); clearClose(); pinned = false; setOpen(false); brand.focus();
  });
  if (!reduced.matches && !sessionStorage.getItem("tw-home-brand-intro")) {
    sessionStorage.setItem("tw-home-brand-intro", "1");
    brand.setAttribute("aria-label", "Promenade");
    brand.classList.add("is-intro");
    brand.innerHTML = [..."Promenade"].map((letter, index) => `<span aria-hidden="true"><span style="--letter-index:${index}">${letter}</span></span>`).join("");
    setTimeout(() => { brand.textContent = "Promenade"; brand.classList.remove("is-intro"); }, 1000);
  }
  if (!sessionStorage.getItem("tw-home-links-hint")) {
    sessionStorage.setItem("tw-home-links-hint", "1");
    hintStart = setTimeout(() => {
      hintActive = true;
      if (!pinned) setOpen(true);
      hintEnd = setTimeout(() => { if (hintActive && !pinned && !header.matches(":hover") && !header.contains(document.activeElement)) setOpen(false); hintActive = false; }, 1600);
    }, 600);
  }
})();
