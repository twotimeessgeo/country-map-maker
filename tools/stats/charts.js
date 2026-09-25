(() => {
  "use strict";
  const SHADES=["#141414","#5a5a5a","#8c8c8c","#b4b4b4","#d6d6d6","#f0f0f0"];
  const DASHES=["","3 3"];
  const FONT="TWK Lausanne, Pretendard Variable, Pretendard, sans-serif";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const finite=value=>typeof value==="number"&&Number.isFinite(value);
  const numbers=window.TWStatsNumbers;
  const num=(value,digits=1)=>numbers.format(value,{unit:"",divisor:1,digits});
  const displayNum=(value,spec,digits)=>numbers.format(value,spec,digits);
  const timeColumns=view=>view.columns.length>=2&&view.columns.every(column=>/^(?:19|20)\d{2}(?:[.~-]\d+)*(?:년)?$/.test(column.label));
  const allRows=groups=>[...groups.continent,...groups.country,...groups.ordinary];

  function type(table,view,groups,rankCards,sort) {
    const rows=allRows(groups);
    if(rankCards||rows.length<4)return null;
    const numeric=view.columns.map((column,index)=>rows.some(row=>finite(row.values[index]))?index:-1).filter(index=>index>=0);
    if(!numeric.length||numeric.length<view.columns.length/2&&view.columns.length>=3)return null;
    const chosen=sort?.index>0&&numeric.includes(sort.index-1)?sort.index-1:
      timeColumns(view)?numeric.at(-1):numeric[0];
    const comparison=rows.filter(row=>row.group!=="national"&&!/^(전국|세계)$/.test(row.label))
      .map(row=>row.values[chosen]).filter(finite);
    if(comparison.some(value=>value<0)&&comparison.some(value=>value>0))return "diverging";
    if(timeColumns(view))return "line";
    const parts=view.columns.map((column,index)=>column.unit==="%"?index:-1).filter(index=>index>=0);
    if(parts.length>=2&&rows.every(row=>parts.every(index=>finite(row.values[index]))&&
      Math.abs(parts.reduce((sum,index)=>sum+row.values[index],0)-100)<=1))return "stacked";
    return "bar";
  }

  function sections(groups) {
    const out=[];
    if(groups.continent.length)out.push({label:groups.country.length?"대륙":"",rows:groups.continent});
    if(groups.country.length) {
      const names=[...new Set(groups.country.map(row=>row.continent||"국가"))];
      for(const name of names)out.push({label:name,rows:groups.country.filter(row=>(row.continent||"국가")===name)});
    }
    if(groups.ordinary.length) {
      const names=[...new Set(groups.ordinary.map(row=>row.section||""))];
      for(const name of names)out.push({label:name,rows:groups.ordinary.filter(row=>(row.section||"")===name)});
    }
    return out;
  }

  function layoutRows(groups,top=0,rowHeight=32) {
    let y=top;
    const entries=[];
    for(const section of sections(groups)) {
      if(section.label) {y+=16;entries.push({type:"section",label:section.label,y});y+=18;}
      for(const row of section.rows){entries.push({type:"row",row,y});y+=rowHeight;}
      if(section.label)y+=16;
    }
    return {entries,bottom:y};
  }

  function frame(width,height,body,label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" class="stats-plot" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}" font-family="${FONT}" font-size="11"><rect width="${width}" height="${height}" fill="#fff"/>${body}</svg>`;
  }
  function niceStep(value) {
    const power=10**Math.floor(Math.log10(Math.max(value,1e-9)));
    const n=value/power;
    return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*power;
  }
  function scale(values,tickCount=4) {
    let lo=Math.min(0,...values),hi=Math.max(0,...values);
    if(lo===hi)hi=lo+1;
    const step=niceStep((hi-lo)/tickCount);
    lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
    const ticks=[];
    for(let value=lo;value<=hi+step/1000;value+=step)ticks.push(Number(value.toFixed(8)));
    return {lo,hi,ticks};
  }
  function labelText(label,max=16) {return label.length>max?label.slice(0,max-1)+"…":label;}
  function rowKey(row) {return esc(row.label);}

  function bar(model,width) {
    const {table,view,groups,sort,bar:comparisonBar,display}=model;
    if(groups.continent.length&&groups.country.length) {
      const blocks=[
        ["대륙",{continent:groups.continent,country:[],ordinary:[]}],
        ["국가",{continent:[],country:groups.country,ordinary:[]}],
        ...(groups.ordinary.length?[["지역",{continent:[],country:[],ordinary:groups.ordinary}]]:[]),
      ];
      return blocks.map(([title,block])=>`<section class="stats-chart-block"><h3>${title}</h3>${bar({...model,groups:block},width)}</section>`).join("");
    }
    const rows=allRows(groups).filter(row=>row.group!=="national"&&!/^(전국|세계)$/.test(row.label));
    const plotted={continent:groups.continent.filter(row=>rows.includes(row)),country:groups.country.filter(row=>rows.includes(row)),
      ordinary:groups.ordinary.filter(row=>rows.includes(row))};
    const chosen=comparisonBar?.index??(sort?.index>0&&rows.some(row=>finite(row.values[sort.index-1]))?sort.index-1:
      view.columns.findIndex((column,index)=>rows.some(row=>finite(row.values[index]))));
    if(chosen<0)return "";
    const spec=display[chosen],unit=spec.unit;
    const values=rows.map(row=>row.values[chosen]).filter(finite);
    const s=scale(values),left=Math.min(170,Math.max(108,Math.round(width*.27))),right=Math.min(110,Math.max(78,Math.round(width*.2)));
    if(model.kind==="diverging") {
      const edge=Math.max(Math.abs(s.lo),Math.abs(s.hi));
      s.lo=-edge;s.hi=edge;s.ticks=[...new Set([-edge,-edge/2,0,edge/2,edge].map(value=>Number(value.toFixed(8))))];
    }
    const plotW=width-left-right-12;
    const x=value=>left+(value-s.lo)/(s.hi-s.lo)*plotW;
    const {entries,bottom}=layoutRows(plotted,46,35),height=bottom+12;
    let body=`<text x="${left}" y="17" fill="#5d5d5d" font-size="11">${esc(view.columns[chosen].label+(unit?` ${unit}`:""))}</text>`;
    for(const tick of s.ticks){const tx=x(tick),stroke=tick===0?"#5d5d5d":"#e2e2e2";
      body+=`<line x1="${tx}" y1="31" x2="${tx}" y2="${height-8}" stroke="${stroke}" stroke-width="${tick===0?1.2:1}"/>`;
      body+=`<text x="${tx}" y="29" text-anchor="middle" fill="#737373" font-size="11">${displayNum(tick,spec,Number.isInteger(tick)?0:1)}</text>`;
    }
    for(const entry of entries) {
      if(entry.type==="section") {body+=`<text x="4" y="${entry.y}" fill="#737373" font-size="11">${esc(entry.label)}</text>`;continue;}
      const {row,y}=entry,value=row.values[chosen],name=row.label+(row.aggregateMark?"*":"");
      body+=`<g data-row-key="${rowKey(row)}"><text x="4" y="${y+22}" fill="#0d0d0d" font-size="12">${esc(labelText(name,width<450?12:24))}</text>`;
      if(finite(value)) {
        const x0=x(0),x1=x(value),start=Math.min(x0,x1),barW=Math.max(1,Math.abs(x1-x0));
        body+=`<g data-tooltip="${esc(`${row.label}  ${displayNum(value,spec)}${unit}`)}" tabindex="0" aria-label="${esc(`${row.label} ${displayNum(value,spec)}${unit}`)}"><rect x="${start}" y="${y+11}" width="${barW}" height="13" rx="2" fill="#0d0d0d"/></g>`;
        body+=`<text x="${x1+(value<0?-4:4)}" y="${y+22}" text-anchor="${value<0?"end":"start"}" fill="#0d0d0d" font-size="11">${displayNum(value,spec)}</text>`;
      } else body+=`<text x="${x(0)+4}" y="${y+22}" fill="#737373" font-size="11">–</text>`;
      body+="</g>";
    }
    return frame(width,height,body,`${table.title} ${view.columns[chosen].label}`);
  }

  function stacked(model,width) {
    const {table,view,groups}=model,rows=allRows(groups);
    const indices=view.columns.map((column,index)=>column.unit==="%"?index:-1).filter(index=>index>=0);
    const ranked=[...indices].sort((a,b)=>rows.reduce((sum,row)=>sum+row.values[b],0)-rows.reduce((sum,row)=>sum+row.values[a],0));
    const hasOther=ranked.some(index=>/기타/.test(view.columns[index].label));
    const kept=indices.length>6?ranked.filter(index=>!/기타/.test(view.columns[index].label)).slice(0,5):indices;
    const parts=indices.length>6?[...kept,{other:true,indices:indices.filter(index=>!kept.includes(index))}]:
      indices.map(index=>({index}));
    const normalized=parts.map(part=>typeof part==="number"?{index:part}:part);
    if(hasOther&&indices.length>6&&normalized.at(-1).indices.length===0)normalized.pop();
    const names=normalized.map(part=>part.other?"기타":view.columns[part.index].label);
    const left=Math.min(138,Math.max(96,Math.round(width*.27))),plotW=width-left-8;
    let legendY=24,legendX=4,legend="";
    names.forEach((name,index)=>{const itemW=Math.min(145,Math.max(44,name.length*9+22));
      if(legendX+itemW>width-4){legendX=4;legendY+=20;}
      legend+=`<rect x="${legendX}" y="${legendY-10}" width="10" height="10" fill="${SHADES[index]}" stroke="#777" stroke-width=".5"/><text x="${legendX+15}" y="${legendY-1}" font-size="12" fill="#5d5d5d">${esc(name)}</text>`;
      legendX+=itemW;
    });
    const top=legendY+22,{entries,bottom}=layoutRows(groups,top,34),height=bottom+12;
    let body=legend+`<line x1="${left}" y1="${top-4}" x2="${width-8}" y2="${top-4}" stroke="#5d5d5d"/>`;
    for(const entry of entries) {
      if(entry.type==="section") {body+=`<text x="4" y="${entry.y}" fill="#737373" font-size="11">${esc(entry.label)}</text>`;continue;}
      const {row,y}=entry;
      body+=`<g data-row-key="${rowKey(row)}"><text x="4" y="${y+22}" fill="#0d0d0d" font-size="12">${esc(labelText(row.label+(row.aggregateMark?"*":""),width<450?12:20))}</text>`;
      let share=0;
      normalized.forEach((part,index)=>{
        const value=part.other?part.indices.reduce((sum,i)=>sum+row.values[i],0):row.values[part.index];
        const x=left+plotW*share/100,w=Math.max(0,plotW*value/100);share+=value;
        body+=`<g data-tooltip="${esc(`${row.label} ${names[index]} ${num(value)}%`)}" aria-label="${esc(`${row.label} ${names[index]} ${num(value)}%`)}" tabindex="0"><rect x="${x+.25}" y="${y+8}" width="${Math.max(0,w-.5)}" height="20" fill="${SHADES[index]}" stroke="#777" stroke-width=".5"/>`+
          (value>=8&&w>=28?`<text x="${x+w/2}" y="${y+22}" text-anchor="middle" fill="${index<3?"#fff":"#111"}" font-size="11">${num(value,0)}%</text>`:"")+"</g>";
      });
      body+="</g>";
    }
    return frame(width,height,body,`${table.title} 구성비`);
  }

  function marker(x,y) {return `<circle cx="${x}" cy="${y}" r="2.5" fill="#141414"/>`;}

  function lineBounds(model,rows) {
    const values=rows.flatMap(row=>row.values).filter(finite);
    const baseline=model.table.id==="korea-city-change"&&model.view.label==="지수"?100:0;
    const includeBaseline=rows.length>=7||baseline===100||values.some(value=>value<0);
    let lo=Math.min(...values,includeBaseline?baseline:Infinity),hi=Math.max(...values,includeBaseline?baseline:-Infinity);
    if(lo===hi)hi=lo+1;
    const step=niceStep((hi-lo)/4);
    lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
    const ticks=[];
    for(let tick=lo;tick<=hi+step/1000;tick+=step)ticks.push(Number(tick.toFixed(8)));
    return {lo,hi,step,ticks,baseline};
  }

  function linePoints(row,view,x,y) {
    return row.values.map((value,index)=>finite(value)?{x:x(index),y:y(value),value,label:view.columns[index].label}:null).filter(Boolean);
  }

  function smallMultiples(model,width,rows,bounds) {
    const {table,view,display}=model,spec=display[0];
    const columns=matchMedia("(max-width: 760px)").matches?2:4;
    const panelWidth=Math.max(130,Math.floor((width-(columns-1)*12)/columns)-18);
    const left=39,right=9,top=13,plotH=116,height=157,plotW=panelWidth-left-right;
    const x=index=>left+plotW*index/(view.columns.length-1);
    const y=value=>top+plotH-(value-bounds.lo)/(bounds.hi-bounds.lo)*plotH;
    const rowSections=sections(model.groups);
    return rowSections.map(section=>{
    const panels=section.rows.map((row,index)=>{
      const latest=[...row.values].reverse().find(finite);
      let body="";
      for(const tick of bounds.ticks) {
        const yy=y(tick),base=tick===bounds.baseline;
        body+=`<line x1="${left}" y1="${yy}" x2="${panelWidth-right}" y2="${yy}" stroke="${base?"#8f8f8f":"#ebebeb"}" stroke-width="1"/>`;
        if(index%columns===0)body+=`<text x="${left-4}" y="${yy+3}" text-anchor="end" fill="#737373" font-size="9">${displayNum(tick,spec,Number.isInteger(tick)?0:1)}</text>`;
      }
      if(bounds.baseline>=bounds.lo&&bounds.baseline<=bounds.hi&&!bounds.ticks.includes(bounds.baseline))
        body+=`<line x1="${left}" y1="${y(bounds.baseline)}" x2="${panelWidth-right}" y2="${y(bounds.baseline)}" stroke="#8f8f8f"/>`;
      for(const other of rows) {
        if(other===row)continue;
        const points=linePoints(other,view,x,y);
        if(points.length>1)body+=`<polyline fill="none" stroke="#0d0d0d" stroke-opacity=".1" stroke-width="1" points="${points.map(point=>`${point.x},${point.y}`).join(" ")}"/>`;
      }
      const points=linePoints(row,view,x,y);
      if(points.length>1)body+=`<polyline fill="none" stroke="#0d0d0d" stroke-width="1.8" stroke-linejoin="round" points="${points.map(point=>`${point.x},${point.y}`).join(" ")}"/>`;
      for(const point of points)body+=`<circle cx="${point.x}" cy="${point.y}" r="2.5" fill="#0d0d0d" tabindex="0" data-tooltip="${esc(`${row.label} ${point.label} ${displayNum(point.value,spec)}${spec.unit}`)}"/>`;
      body+=`<line x1="${left}" y1="${top+plotH}" x2="${panelWidth-right}" y2="${top+plotH}" stroke="#0d0d0d"/>`;
      for(const yearIndex of [0,view.columns.length-1]){
        const raw=view.columns[yearIndex].label.replace(/년$/, ""),year=raw.match(/^(?:19|20)\d{2}/)?.[0]||raw;
        body+=`<text x="${x(yearIndex)}" y="${height-8}" text-anchor="${yearIndex===0?"start":"end"}" fill="#737373" font-size="9">${esc(year)}</text>`;
      }
      const name=row.label+(row.aggregateMark?"*":"");
      return `<article class="stats-small-panel" data-row-key="${rowKey(row)}"><div class="stats-small-heading"><strong>${esc(name)}</strong><span>${finite(latest)?displayNum(latest,spec):"–"}${spec.unit&&spec.unit!=="지수"?`<small>${esc(spec.unit)}</small>`:""}</span></div>${frame(panelWidth,height,body,`${table.title} ${name}`)}</article>`;
    });
    return `<section class="stats-small-section">${section.label?`<h3>${esc(section.label)}</h3>`:""}<div class="stats-small-multiples">${panels.join("")}</div></section>`;
    }).join("");
  }

  function line(model,width) {
    const {table,view,groups,display}=model,rows=allRows(groups),spec=display[0];
    const bounds=lineBounds(model,rows);
    if(rows.length>=7)return smallMultiples(model,width,rows,bounds);
    const left=Math.max(width<450?49:62,Math.min(106,displayNum(Math.max(Math.abs(bounds.lo),Math.abs(bounds.hi)),spec,0).length*7+12));
    const right=Math.min(140,Math.max(82,width*.28)),top=33,plotH=230,plotW=width-left-right;
    const x=index=>left+plotW*index/(view.columns.length-1);
    const y=value=>top+plotH-(value-bounds.lo)/(bounds.hi-bounds.lo)*plotH;
    let body=`<text x="${left}" y="16" fill="#5d5d5d" font-size="11">${esc(spec.unit)}</text>`;
    for(const tick of bounds.ticks){const yy=y(tick),baseline=tick===bounds.baseline;
      body+=`<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="${baseline?"#5d5d5d":"#e2e2e2"}" stroke-width="${baseline?1.3:1}"/>`;
      body+=`<text x="${left-7}" y="${yy+4}" text-anchor="end" fill="#737373" font-size="11">${displayNum(tick,spec,Number.isInteger(tick)?0:1)}</text>`;
    }
    if(bounds.baseline>=bounds.lo&&bounds.baseline<=bounds.hi&&!bounds.ticks.includes(bounds.baseline))
      body+=`<line x1="${left}" y1="${y(bounds.baseline)}" x2="${width-right}" y2="${y(bounds.baseline)}" stroke="#5d5d5d" stroke-width="1.3"/>`;
    body+=`<line x1="${left}" y1="${top+plotH}" x2="${width-right}" y2="${top+plotH}" stroke="#0d0d0d" stroke-width="1.2"/>`;
    view.columns.forEach((column,index)=>body+=`<text x="${x(index)}" y="${top+plotH+17}" text-anchor="middle" fill="#737373" font-size="12">${esc(column.label.replace(/년$/, ""))}</text>`);
    const endpoints=[];
    rows.forEach((row,index)=>{
      const points=linePoints(row,view,x,y);
      if(!points.length)return;
      const dash=DASHES[index%DASHES.length];
      body+=`<g class="stats-line-series" data-series-index="${index}" data-row-key="${rowKey(row)}"><polyline fill="none" stroke="#0d0d0d" stroke-width="1.7" stroke-dasharray="${dash}" stroke-linejoin="round" points="${points.map(point=>`${point.x},${point.y}`).join(" ")}"/>`;
      for(const point of points)body+=`<g data-tooltip="${esc(`${row.label} ${point.label} ${displayNum(point.value,spec)}${spec.unit}`)}" tabindex="0">${marker(point.x,point.y)}</g>`;
      body+="</g>";
      endpoints.push({row,point:points.at(-1),labelY:points.at(-1).y});
    });
    endpoints.sort((a,b)=>a.labelY-b.labelY);
    const minY=top+5,maxY=top+plotH-5,gap=12;
    endpoints.forEach((item,index)=>item.labelY=Math.max(minY,index?endpoints[index-1].labelY+gap:item.labelY,item.labelY));
    for(let index=endpoints.length-1;index>=0;index--)endpoints[index].labelY=Math.min(endpoints[index].labelY,index===endpoints.length-1?maxY:endpoints[index+1].labelY-gap);
    for(const item of endpoints){const name=labelText(item.row.label+(item.row.aggregateMark?"*":""),width<450?8:16);
      body+=`<line x1="${item.point.x+4}" y1="${item.point.y}" x2="${width-right+4}" y2="${item.labelY}" stroke="#b4b4b4"/><text x="${width-right+7}" y="${item.labelY+4}" fill="#0d0d0d" font-size="11">${esc(name)}</text>`;
    }
    return frame(width,top+plotH+29,body,`${table.title} 시계열`);
  }

  function render(model,requestedWidth) {
    const width=Math.max(240,Math.floor(requestedWidth));
    if(model.kind==="line")return line(model,width);
    if(model.kind==="stacked")return stacked(model,width);
    return bar(model,width);
  }
  function bind(container) {
    const svg=container.querySelector("svg"),series=[...svg?.querySelectorAll(".stats-line-series")||[]];
    if(!series.length)return;
    let selected=null;
    const focus=index=>{
      for(const item of series)item.classList.toggle("is-focused",Number(item.dataset.seriesIndex)===index);
      for(const item of svg.querySelectorAll("[data-chart-legend]"))item.setAttribute("aria-pressed",String(Number(item.dataset.chartLegend)===index));
      if(index===null)for(const item of svg.querySelectorAll("[data-chart-legend]"))item.setAttribute("aria-pressed","false");
    };
    svg.addEventListener("pointerover",event=>{const item=event.target.closest("[data-series-index],[data-chart-legend]");if(item)focus(Number(item.dataset.seriesIndex??item.dataset.chartLegend));});
    svg.addEventListener("pointerout",()=>focus(selected));
    svg.addEventListener("click",event=>{const item=event.target.closest("[data-chart-legend]");if(!item)return;const index=Number(item.dataset.chartLegend);selected=selected===index?null:index;focus(selected);});
    svg.addEventListener("keydown",event=>{if(!["Enter"," "].includes(event.key))return;const item=event.target.closest("[data-chart-legend]");if(item){event.preventDefault();item.dispatchEvent(new MouseEvent("click",{bubbles:true}));}});
  }
  function download(svg,name) {
    const clone=svg.cloneNode(true);
    clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
    const content='<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
    const url=URL.createObjectURL(new Blob([content],{type:"image/svg+xml;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=name+".svg";link.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  window.TWStatsCharts={type,render,bind,download};
})();
