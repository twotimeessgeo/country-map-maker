/* Notes cover motion pauses outside the viewport or while the tab is hidden. */
(() => {
  const covers = [...document.querySelectorAll('.notes-cover')];
  if (!covers.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const refresh = () => covers.forEach(cover => cover.classList.toggle('is-visual-active', !document.hidden && !reduced.matches && visible.has(cover)));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
      refresh();
    }, { threshold: 0 });
    covers.forEach(cover => observer.observe(cover));
  } else covers.forEach(cover => visible.add(cover));
  document.addEventListener('visibilitychange', refresh);
  reduced.addEventListener?.('change', refresh);
  refresh();
})();
