/* Optional DS 3.1 coordinates and current-month dot; both default off. */
(() => {
  const query = new URLSearchParams(location.search);
  if (query.get('fx-season') === '1') document.documentElement.dataset.fxSeason = 'on';
  if (query.get('fx-coords') !== '1' || document.body.dataset.appMode !== 'world') return;
  document.documentElement.dataset.fxCoords = 'on';
  const stage = document.querySelector('.world-stage');
  if (!stage) return;
  const indicator = document.createElement('span');
  indicator.className = 'fx-coords';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.hidden = true;
  stage.append(indicator);
  const format = (value, positive, negative) => `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;
  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || innerWidth < 720 || !event.target.closest('.world-map-frame')) { indicator.hidden = true; return; }
    const svg = stage.querySelector('.world-map-svg');
    const projection = window.buildMapProjection?.();
    const matrix = svg?.getScreenCTM();
    if (!svg || !projection?.invert || !matrix) { indicator.hidden = true; return; }
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const coordinates = projection.invert([local.x, local.y]);
    if (!coordinates || !coordinates.every(Number.isFinite) || Math.abs(coordinates[1]) > 90) { indicator.hidden = true; return; }
    indicator.textContent = `${format(coordinates[1], 'N', 'S')} ${format(coordinates[0], 'E', 'W')}`;
    indicator.hidden = false;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { indicator.hidden = true; });
})();
