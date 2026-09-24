(() => {
  "use strict";
  const SHADES=["#0d0d0d","#5d5d5d","#8f8f8f","#b4b4b4","#d4d4d4","#ebebeb"];
  const DASHES=["","6 4","2 3","10 4 2 4","1 3","12 4 4 4"];
  const MARKERS=["circle","square-o","triangle","diamond-o","circle-o","square"];
  const FONT="TWK Lausanne, Pretendard Variable, Pretendard, sans-serif";
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const finite=value=>typeof value==="number"&&Number.isFinite(value);
  const num=(value,digits=1)=>new Intl.NumberFormat("ko-KR",{maximumFractionDigits:digits,minimumFractionDigits:digits})
    .format(value).replaceAll("-","−");
  const digitsFor=column=>column.digits??(/^(명|개|가구|마리|t|ha|MWh|천 toe)$/.test(column.unit||"")?0:1);
  const timeColumns=view=>view.columns.length>=2&&view.columns.every(column=>/^(?:19|20)\d{2}(?:[.~-]\d+)*(?:년)?$/.test(column.label));
  const allRows=groups=>[...groups.continent,...groups.country,...groups.ordinary];

  function type(table,view,groups,rankCards) {
    const rows=allRows(groups);
    if(rankCards||rows.length<4)return null;
    if(timeColumns(view))return "line";
    const parts=view.columns.map((column,index)=>column.unit==="%"?index:-1).filter(index=>index>=0);
    if(parts.length>=2&&rows.every(row=>parts.every(index=>finite(row.values[index]))&&
      Math.abs(parts.reduce((sum,index)=>sum+row.values[index],0)-100)<=1))return "stacked";
    if(view.columns.some((column,index)=>rows.some(row=>finite(row.values[index]))))return "bar";
    return null;
  }

  function sections(groups) {
    const out=[];
    if(groups.continent.length)out.push({label:groups.country.length?"대륙":"",rows:groups.continent});
    if(groups.country.length) {
      const names=[...new Set(groups.country.map(row=>row.continent||"국가"))];
      for(const name of names)out.push({label:name,rows:groups.country.filter(row=>(row.continent||"국가")===name)});
    }
    if(groups.ordinary.length)out.push({label:"",rows:groups.ordinary});
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
    const {table,view,groups,sort,bar:comparisonBar}=model;
    const rows=allRows(groups);
    const chosen=comparisonBar?.index??(sort?.index>0&&rows.some(row=>finite(row.values[sort.index-1]))?sort.index-1:
      view.columns.findIndex((column,index)=>rows.some(row=>finite(row.values[index]))));
    if(chosen<0)return "";
    const unit=view.columns[chosen].unit||"";
    const values=rows.map(row=>row.values[chosen]).filter(finite);
    const s=scale(values),left=Math.min(138,Math.max(96,Math.round(width*.27))),right=Math.min(90,Math.max(63,Math.round(width*.2)));
    const plotW=width-left-right-12;
    const x=value=>left+(value-s.lo)/(s.hi-s.lo)*plotW;
    const {entries,bottom}=layoutRows(groups,46,35),height=bottom+12;
    let body=`<text x="${left}" y="17" fill="#5d5d5d" font-size="11">${esc(unit)}</text>`;
    for(const tick of s.ticks){const tx=x(tick),stroke=tick===0?"#5d5d5d":"#e2e2e2";
      body+=`<line x1="${tx}" y1="31" x2="${tx}" y2="${height-8}" stroke="${stroke}" stroke-width="${tick===0?1.2:1}"/>`;
      body+=`<text x="${tx}" y="29" text-anchor="middle" fill="#737373" font-size="11">${num(tick,Number.isInteger(tick)?0:1)}</text>`;
    }
    for(const entry of entries) {
      if(entry.type==="section") {body+=`<text x="4" y="${entry.y}" fill="#737373" font-size="11">${esc(entry.label)}</text>`;continue;}
      const {row,y}=entry,value=row.values[chosen],name=row.label+(row.aggregateMark?"*":"");
      body+=`<g data-row-key="${rowKey(row)}"><text x="4" y="${y+22}" fill="#0d0d0d" font-size="12">${esc(labelText(name,width<450?12:20))}</text>`;
      if(finite(value)) {
        const x0=x(0),x1=x(value),start=Math.min(x0,x1),barW=Math.max(1,Math.abs(x1-x0));
        body+=`<g data-tooltip="${esc(`${row.label}  ${num(value,digitsFor(view.columns[chosen]))}${unit}`)}" tabindex="0" aria-label="${esc(`${row.label} ${num(value,digitsFor(view.columns[chosen]))}${unit}`)}"><rect x="${start}" y="${y+11}" width="${barW}" height="13" rx="2" fill="#0d0d0d"/></g>`;
        body+=`<text x="${width-4}" y="${y+22}" text-anchor="end" fill="#0d0d0d" font-size="11">${num(value,digitsFor(view.columns[chosen]))}</text>`;
      }
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
      legend+=`<rect x="${legendX}" y="${legendY-10}" width="9" height="9" fill="${SHADES[index]}" stroke="#aaa"/><text x="${legendX+13}" y="${legendY-2}" font-size="11" fill="#5d5d5d">${esc(name)}</text>`;
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
        body+=`<g data-tooltip="${esc(`${row.label}  ${names[index]}  ${num(value)}%`)}" tabindex="0"><rect x="${x}" y="${y+8}" width="${w}" height="20" fill="${SHADES[index]}" stroke="#fff" stroke-width=".5"/>`+
          (value>=5&&w>=28?`<text x="${x+w/2}" y="${y+22}" text-anchor="middle" fill="${index<2?"#fff":"#111"}" font-size="11">${num(value,0)}%</text>`:"")+"</g>";
      });
      body+="</g>";
    }
    return frame(width,height,body,`${table.title} 구성비`);
  }

  function marker(kind,x,y) {
    const open=kind.endsWith("-o"),shape=kind.replace("-o",""),fill=open?"#fff":"#0d0d0d";
    if(shape==="square")return `<rect x="${x-3}" y="${y-3}" width="6" height="6" fill="${fill}" stroke="#0d0d0d"/>`;
    if(shape==="triangle")return `<path d="M${x},${y-4}L${x+4},${y+3}L${x-4},${y+3}Z" fill="${fill}" stroke="#0d0d0d"/>`;
    if(shape==="diamond")return `<path d="M${x},${y-4}L${x+4},${y}L${x},${y+4}L${x-4},${y}Z" fill="${fill}" stroke="#0d0d0d"/>`;
    return `<circle cx="${x}" cy="${y}" r="3.3" fill="${fill}" stroke="#0d0d0d"/>`;
  }

  function line(model,width) {
    const {table,view,groups}=model,rows=allRows(groups),unit=view.columns[0].unit||"";
    const values=rows.flatMap(row=>row.values).filter(finite);
    let lo=Math.min(...values),hi=Math.max(...values);
    if(lo<0)lo=Math.min(lo,0);
    if(table.id==="korea-city-change"&&view.label==="지수") {lo=Math.min(lo,100);hi=Math.max(hi,100);}
    if(lo===hi)hi=lo+1;
    const step=niceStep((hi-lo)/4);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
    const left=Math.max(width<450?49:62,Math.min(106,num(Math.max(Math.abs(lo),Math.abs(hi)),0).length*7+12)),right=14,top=33,plotH=230,plotW=width-left-right;
    const x=index=>left+plotW*index/(view.columns.length-1),y=value=>top+plotH-(value-lo)/(hi-lo)*plotH;
    let body=`<text x="${left}" y="16" fill="#5d5d5d" font-size="11">${esc(unit)}</text>`;
    for(let tick=lo;tick<=hi+step/1000;tick+=step){const yy=y(tick),baseline=tick===0||table.id==="korea-city-change"&&view.label==="지수"&&tick===100;
      body+=`<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}" stroke="${baseline?"#5d5d5d":"#e2e2e2"}" stroke-width="${baseline?1.3:1}"/>`;
      body+=`<text x="${left-7}" y="${yy+4}" text-anchor="end" fill="#737373" font-size="11">${num(tick,Number.isInteger(tick)?0:1)}</text>`;
    }
    if(table.id==="korea-city-change"&&view.label==="지수"&&100>=lo&&100<=hi&&!(Math.abs((100-lo)/step-Math.round((100-lo)/step))<1e-8))
      body+=`<line x1="${left}" y1="${y(100)}" x2="${width-right}" y2="${y(100)}" stroke="#5d5d5d" stroke-width="1.3"/>`;
    body+=`<line x1="${left}" y1="${top+plotH}" x2="${width-right}" y2="${top+plotH}" stroke="#0d0d0d" stroke-width="1.2"/>`;
    view.columns.forEach((column,index)=>body+=`<text x="${x(index)}" y="${top+plotH+17}" text-anchor="middle" fill="#737373" font-size="12">${esc(column.label.replace(/년$/, ""))}</text>`);
    const many=rows.length>=7;
    rows.forEach((row,index)=>{
      const points=row.values.map((value,i)=>finite(value)?{x:x(i),y:y(value),value,label:view.columns[i].label}:null).filter(Boolean);
      if(!points.length)return;
      const dash=DASHES[index%DASHES.length],shape=MARKERS[index%MARKERS.length];
      body+=`<g class="stats-line-series${many?" is-muted":""}" data-series-index="${index}" data-row-key="${rowKey(row)}"><polyline fill="none" stroke="#0d0d0d" stroke-width="1.7" stroke-dasharray="${dash}" stroke-linejoin="round" points="${points.map(point=>`${point.x},${point.y}`).join(" ")}"/>`;
      for(const point of points)body+=`<g data-tooltip="${esc(`${row.label}  ${point.label}  ${num(point.value,digitsFor(view.columns[0]))}${unit}`)}" tabindex="0">${marker(shape,point.x,point.y)}</g>`;
      body+="</g>";
    });
    let legendY=top+plotH+43,legendX=4;
    const groupSections=sections(groups);
    let index=0;
    for(const section of groupSections) {
      if(section.label){legendY+=16;legendX=4;body+=`<text x="4" y="${legendY-5}" font-size="11" fill="#737373">${esc(section.label)}</text>`;}
      for(const row of section.rows) {
        const name=row.label+(row.aggregateMark?"*":""),itemW=Math.min(160,Math.max(77,name.length*12+32));
        if(legendX+itemW>width-4){legendX=4;legendY+=21;}
        const dash=DASHES[index%DASHES.length],shape=MARKERS[index%MARKERS.length];
        body+=`<g class="stats-line-legend" data-chart-legend="${index}" role="button" tabindex="0" aria-label="${esc(name)} 강조" aria-pressed="false"><line x1="${legendX}" y1="${legendY-4}" x2="${legendX+20}" y2="${legendY-4}" stroke="#0d0d0d" stroke-width="1.6" stroke-dasharray="${dash}"/>${marker(shape,legendX+10,legendY-4)}<text x="${legendX+26}" y="${legendY}" font-size="11" fill="#0d0d0d">${esc(name)}</text></g>`;
        legendX+=itemW;index+=1;
      }
      legendY+=section.label?23:0;
    }
    return frame(width,legendY+16,body,`${table.title} 시계열`);
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
