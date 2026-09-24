import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "data/world-atlas.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);
const topology = context.window.WORLD_ATLAS_TOPOLOGY;
if (!topology?.objects?.land) throw new Error("world-atlas land geometry missing");

const [sx, sy] = topology.transform.scale;
const [tx, ty] = topology.transform.translate;
const decode = index => {
  const points = topology.arcs[index < 0 ? ~index : index];
  let x = 0, y = 0;
  const result = points.map(([dx, dy]) => {
    x += dx; y += dy;
    return [x * sx + tx, y * sy + ty];
  });
  return index < 0 ? result.reverse() : result;
};
const distance = (p, a, b) => {
  const vx = b[0] - a[0], vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy);
};
function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const keep = new Set([0, points.length - 1]);
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = tolerance, at = -1;
    for (let i = a + 1; i < b; i++) {
      const value = distance(points[i], points[a], points[b]);
      if (value > best) { best = value; at = i; }
    }
    if (at > 0) { keep.add(at); stack.push([a, at], [at, b]); }
  }
  return [...keep].sort((a, b) => a - b).map(i => points[i]);
}

const geometry = topology.objects.land.geometries[0];
const rings = (geometry.type === "MultiPolygon" ? geometry.arcs.flat() : geometry.arcs)
  .map(arcIds => arcIds.flatMap((id, index) => decode(id).slice(index ? 1 : 0)))
  .filter(points => points.length >= 4)
  .filter(points => {
    const lons = points.map(p => p[0]), lats = points.map(p => p[1]);
    return (Math.max(...lons) - Math.min(...lons)) * (Math.max(...lats) - Math.min(...lats)) > 1.4;
  })
  .map(points => simplify(points, .8).flatMap(([lon, lat]) => [Math.round(lon * 10), Math.round(lat * 10)]));
const output = JSON.stringify(rings);
const target = path.join(root, "ds/globe-land.json");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8").trim() !== output) throw new Error("globe-land.json is stale");
} else {
  fs.writeFileSync(target, `${output}\n`);
}
console.log(`globe land: ${rings.length} rings, ${Math.round(output.length / 1024)} KB`);
