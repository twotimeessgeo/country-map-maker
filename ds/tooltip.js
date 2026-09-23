(function () {
  let tooltip;
  let anchor;
  let touchTimer;

  function hide() {
    if (tooltip) tooltip.hidden = true;
    anchor = null;
    clearTimeout(touchTimer);
  }

  function show(target, onTouch = false) {
    const content = target?.dataset.tooltip;
    if (!content) return;
    clearTimeout(touchTimer);
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "tw-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.hidden = true;
      document.body.append(tooltip);
    }
    anchor = target;
    tooltip.textContent = content;
    const box = target.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) {
      tooltip.hidden = true;
      return;
    }
    tooltip.hidden = false;
    const tip = tooltip.getBoundingClientRect();
    const center = Math.max(tip.width / 2 + 8, Math.min(innerWidth - tip.width / 2 - 8, box.left + box.width / 2));
    tooltip.style.left = `${center}px`;
    tooltip.style.top = `${Math.max(8, box.top - tip.height - 10)}px`;
    tooltip.classList.toggle("is-below", box.top < tip.height + 18);
    if (box.top < tip.height + 18) tooltip.style.top = `${box.bottom + 10}px`;
    if (onTouch) touchTimer = setTimeout(hide, 2400);
  }

  document.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const target = event.target.closest?.("[data-tooltip]");
    if (target && target !== anchor) show(target);
  });
  document.addEventListener("pointerout", (event) => {
    if (anchor && anchor.contains(event.relatedTarget)) return;
    hide();
  });
  document.addEventListener("focusin", (event) => show(event.target.closest?.("[data-tooltip]")));
  document.addEventListener("focusout", hide);
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") show(event.target.closest?.("[data-tooltip]"), true);
  });
  document.addEventListener("scroll", () => {
    if (anchor && anchor === document.activeElement) show(anchor);
    else hide();
  }, true);
  window.addEventListener("resize", hide);
})();
