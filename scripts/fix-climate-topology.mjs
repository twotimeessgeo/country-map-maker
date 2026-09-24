import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const file=path.join(root,"tools/climate/data/world-countries-10m.json");
const context=vm.createContext({});
for(const name of ["vendor-d3.min.js","vendor-topojson-client.min.js"])
  vm.runInContext(fs.readFileSync(path.join(root,"tools/climate/data",name),"utf8"),context);
const topology=JSON.parse(fs.readFileSync(file,"utf8"));
let changed=0;
for(const object of Object.values(topology.objects)) {
  const geometries=object.type==="GeometryCollection"?object.geometries:[object];
  for(const geometry of geometries) {
    const polygons=geometry.type==="MultiPolygon"?geometry.arcs:geometry.type==="Polygon"?[geometry.arcs]:[];
    for(const rings of polygons) {
      const feature=context.topojson.feature(topology,{type:"Polygon",arcs:rings});
      if(context.d3.geoArea(feature)<=2*Math.PI)continue;
      for(let index=0;index<rings.length;index+=1)
        rings[index]=rings[index].slice().reverse().map(arc=>~arc);
      if(context.d3.geoArea(context.topojson.feature(topology,{type:"Polygon",arcs:rings}))>2*Math.PI)
        throw new Error("10m 폴리곤 링 수정 실패");
      changed+=1;
    }
  }
}
if(changed)fs.writeFileSync(file,JSON.stringify(topology)+"\n");
console.log(`10m 지도 링 ${changed}개 수정`);
