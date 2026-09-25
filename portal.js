/* Home: the brand spells itself in once per session; the four links stay in view. */
(() => {
  const brand = document.querySelector("#homeBrand");
  if (!brand) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (!reduced.matches && !(() => { try { return sessionStorage.getItem("tw-home-brand-intro"); } catch { return "1"; } })()) {
    try { sessionStorage.setItem("tw-home-brand-intro", "1"); } catch {}
    brand.setAttribute("aria-label", "Promenade");
    brand.classList.add("is-intro");
    brand.innerHTML = [..."Promenade"].map((letter, index) => `<span aria-hidden="true"><span style="--letter-index:${index}">${letter}</span></span>`).join("");
    setTimeout(() => { brand.textContent = "Promenade"; brand.classList.remove("is-intro"); }, 1000);
  }
})();
