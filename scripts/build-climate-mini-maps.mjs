import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dataDir=path.join(root,"tools/climate/data");
const context=vm.createContext({window:{}});
for(const name of ["vendor-d3.min.js","vendor-topojson-client.min.js","korea-peninsula-geo.js"])
  vm.runInContext(fs.readFileSync(path.join(dataDir,name),"utf8"),context);
const d3=context.d3;
const worldTopology=JSON.parse(fs.readFileSync(path.join(dataDir,"world-countries-110m.json"),"utf8"));
const world=context.topojson.feature(worldTopology,worldTopology.objects.land);
const korea=context.window.KOREA_PENINSULA_GEOJSON;
const maps=[
  ["world-mini.svg",world,d3.geoEquirectangular().translate([32,17]).scale(64/(2*Math.PI))],
  ["korea-mini.svg",korea,d3.geoMercator().fitExtent([[2,2],[62,32]],korea)],
];
for(const [name,feature,projection] of maps) {
  const shape=d3.geoPath(projection).digits(1)(feature);
  const content=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="34" viewBox="0 0 64 34"><path d="${shape}" fill="#f4f4f4" stroke="#b4b4b4" stroke-width=".4"/></svg>\n`;
  const file=path.join(dataDir,name);
  if(process.argv.includes("--check")) {
    if(!fs.existsSync(file)||fs.readFileSync(file,"utf8")!==content)throw new Error(`${name} 생성본이 다릅니다`);
  } else fs.writeFileSync(file,content);
}
console.log("Climate 위치 지도 2개 검증 완료");
