(() => {
  "use strict";
  const el = {};
  const states = new Map();
  let data = null;
  let search = "";
  let highlight = "";
  let toastTimer = null;

  document.addEventListener("DOMContentLoaded", init);
  async function init() {
    for (const id of ["statsToolbar","statsSearch","statsSearchResults","topicList","statsContent","statsToast","statsStickyOverlay"]) el[id] = document.getElementById(id);
    bind();
    try {
      const response = await fetch("./data/stats.json");
      if (!response.ok) throw new Error("HTTP " + response.status);
      data = await response.json();
      render();
      measureSticky();
      new ResizeObserver(measureSticky).observe(el.statsToolbar);
    } catch (error) {
      el.statsContent.innerHTML = '<p class="stats-empty">통계표를 불러오지 못했습니다</p>';
      console.error("Statistics load failed", error);
    }
  }
  function bind() {
    document.querySelector(".stats-subject").addEventListener("click", event => {
      const link = event.target.closest("[data-subject]");
      if (!link) return;
      event.preventDefault();
      navigate({subject:link.dataset.subject,topic:null,region:null},"");
    });
    el.topicList.addEventListener("click", event => {
      const link = event.target.closest("[data-topic]");
      if (!link) return;
      event.preventDefault();
      if (link.dataset.climate) { location.href = link.href; return; }
      navigate({topic:link.dataset.topic,region:null},"");
    });
    el.statsContent.addEventListener("click", async event => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.region) { navigate({region:button.dataset.region},""); return; }
      const table = findTable(button.dataset.table);
      if (!table) return;
      const state = stateFor(table.id);
      if (button.dataset.view !== undefined) {
        state.view = Number(button.dataset.view); state.subview = 0; state.sort = null;
        renderContent(); return;
      }
      if (button.dataset.subview !== undefined) {
        state.subview = Number(button.dataset.subview); state.sort = null;
        renderContent(); return;
      }
      if (button.dataset.scope) { state.scope = button.dataset.scope; renderContent(); return; }
      if (button.dataset.sort !== undefined) {
        const index = Number(button.dataset.sort);
        if (!state.sort || state.sort.index !== index) state.sort = {index,direction:"desc"};
        else if (state.sort.direction === "desc") state.sort.direction = "asc";
        else state.sort = null;
        renderContent(); return;
      }
      if (button.dataset.action === "copy" || button.dataset.action === "csv") {
        const matrix = exportMatrix(table,state);
        if (button.dataset.action === "csv") {
          const csv = matrix.map(row => row.map(csvEscape).join(",")).join("\r\n");
          const blob = new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");link.href=url;link.download=table.id+".csv";link.click();
          setTimeout(()=>URL.revokeObjectURL(url),2000);
          return;
        }
        await copyText(matrix.map(row=>row.join("\t")).join("\n"),"복사했습니다.");
        return;
      }
      if (button.dataset.action === "link") {
        const url = new URL(location.href);
        url.searchParams.set("subject",selected().subject);
        url.searchParams.set("topic",selected().topic.id);
        if (selected().region) url.searchParams.set("region",selected().region.id);
        url.hash=table.id;
        await copyText(url.href,"링크를 복사했습니다.");
      }
    });
    el.statsSearch.addEventListener("input", () => {
      search=normalize(el.statsSearch.value);highlight=search;renderResults();
      if (!search) renderContent();
    });
    el.statsSearch.addEventListener("keydown", event => {
      if (event.key === "Escape") { el.statsSearch.value="";search="";highlight="";el.statsSearchResults.hidden=true;renderContent(); }
      if (event.key === "Enter" && search) {
        const result=searchMatches()[0];
        if (result) {event.preventDefault();selectResult(result);}
      }
    });
    el.statsSearchResults.addEventListener("click", event => {
      const target=event.target.closest("[data-result]");
      if (!target) return;
      const result=searchMatches()[Number(target.dataset.result)];
      if (result) selectResult(result);
    });
    document.addEventListener("keydown", event => {
      if (event.key!=="/" || event.altKey || event.ctrlKey || event.metaKey) return;
      if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
      event.preventDefault();el.statsSearch.focus();
    });
    document.addEventListener("click", event => {
      if (!el.statsToolbar.contains(event.target)) el.statsSearchResults.hidden=true;
    });
    el.statsStickyOverlay.addEventListener("click", event => {
      const button = event.target.closest("[data-sort]");
      if (!button) return;
      el.statsContent.querySelector('[data-table="'+button.dataset.table+'"][data-sort="'+button.dataset.sort+'"]')?.click();
    });
    el.statsContent.addEventListener("scroll",updateStickyHeader,true);
    window.addEventListener("popstate",render);
    window.addEventListener("resize",measureSticky);
    window.addEventListener("scroll",updateStickyHeader,{passive:true});
  }
  function normalize(value) {return String(value||"").trim().toLocaleLowerCase("ko");}
  function escapeHtml(value) {return String(value??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function csvEscape(value) {const text=String(value??"");return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;}
  function stateFor(id) {
    if(!states.has(id)) states.set(id,{view:0,subview:0,scope:"all",sort:null});
    return states.get(id);
  }
  function selected() {
    const params=new URLSearchParams(location.search);
    const subject=params.get("subject")==="world"?"world":"korea";
    const topics=data.subjects[subject].topics;
    const topic=topics.find(t=>t.id===params.get("topic"))||topics.find(t=>!t.climate);
    const region=topic.regions?.find(r=>r.id===params.get("region"))||topic.regions?.find(r=>r.tables.length)||null;
    return {subject,topic,region};
  }
  function navigate(updates,hash) {
    const url=new URL(location.href);
    for(const [key,value] of Object.entries(updates)) value===null?url.searchParams.delete(key):url.searchParams.set(key,value);
    url.hash=hash||"";
    history.pushState(null,"",url);render();
  }
  function allTargets() {
    const targets=[];
    for(const [subject,value] of Object.entries(data.subjects))for(const topic of value.topics) {
      if(topic.climate)continue;
      if(topic.regions)for(const region of topic.regions)for(const table of region.tables)targets.push({subject,topic,region,table});
      else for(const table of topic.tables)targets.push({subject,topic,region:null,table});
    }
    return targets;
  }
  function findTable(id) {return allTargets().find(target=>target.table.id===id)?.table||null;}
  function searchMatches() {
    if(!search||!data)return[];
    return allTargets().filter(({topic,region,table}) => {
      if(normalize(topic.title+" "+(region?.title||"")+" "+table.title).includes(search))return true;
      return table.views.some(view => [...view.rows,...(view.subviews||[]).flatMap(sub=>sub.rows)]
        .some(row=>normalize(row.label).includes(search)));
    });
  }
  function renderResults() {
    if(!search){el.statsSearchResults.hidden=true;return;}
    const matches=searchMatches();
    el.statsSearchResults.hidden=false;
    el.statsSearchResults.innerHTML=matches.length ? matches.slice(0,30).map((item,index)=>
      '<button type="button" class="stats-result" data-result="'+index+'">'+escapeHtml(item.table.title)+
      '<small>'+escapeHtml((item.subject==="korea"?"한국지리":"세계지리")+" / "+item.topic.title+(item.region?" / "+item.region.title:""))+'</small></button>').join("")
      : '<p class="stats-search-empty">찾는 표가 없습니다.</p>';
  }
  function selectResult(result) {
    highlight=search;el.statsSearchResults.hidden=true;
    const targetState=stateFor(result.table.id);
    for(let index=0;index<result.table.views.length;index+=1) {
      const view=result.table.views[index];
      if(view.rows.some(row=>normalize(row.label).includes(search))) {
        targetState.view=index;targetState.subview=0;break;
      }
      const subindex=(view.subviews||[]).findIndex(sub=>sub.rows.some(row=>normalize(row.label).includes(search)));
      if(subindex>=0){targetState.view=index;targetState.subview=subindex;break;}
    }
    const updates={subject:result.subject,topic:result.topic.id,region:result.region?.id||null};
    navigate(updates,result.table.id);
    requestAnimationFrame(()=>document.getElementById(result.table.id)?.scrollIntoView({block:"start"}));
  }
  function render() {
    if(!data)return;
    const state=selected();
    document.querySelectorAll(".stats-subject [data-subject]").forEach(link=>{
      const active=link.dataset.subject===state.subject;
      link.classList.toggle("is-active",active);
      if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
    });
    const topicList=data.subjects[state.subject].topics;
    el.topicList.innerHTML=topicList.map(topic=>{
      const climate=topic.climate;
      const href=climate?(state.subject==="korea"?"../climate/korea.html":"../climate/index.html")
        : "?subject="+state.subject+"&topic="+topic.id;
      const active=!climate&&topic.id===state.topic.id;
      return '<a class="stats-topic-link'+(active?" is-active":"")+(climate?" is-climate":"")+
        '" href="'+href+'" data-topic="'+topic.id+'"'+(climate?' data-climate="true"':'')+
        (active?' aria-current="page"':'')+'>'+escapeHtml(topic.title)+
        (climate?'<span class="stats-outlink" aria-hidden="true">↗</span>':'')+'</a>';
    }).join("");
    renderContent(state);
    measureSticky();
    if(location.hash)requestAnimationFrame(()=>document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block:"start"}));
  }
  function renderContent(state=selected()) {
    if(!data)return;
    const topic=state.topic;
    const switcher=topic.regions ? '<nav class="tw-segmented stats-region-switch" aria-label="지역">'+topic.regions.map(region=>
      '<button type="button" data-region="'+region.id+'" class="'+(region.id===state.region?.id?"is-active":"")+
      '" aria-pressed="'+(region.id===state.region?.id)+'">'+escapeHtml(region.title)+'</button>').join("")+'</nav>' : "";
    const tables=topic.regions?(state.region?.tables||[]):topic.tables||[];
    el.statsContent.innerHTML=switcher+(tables.length?tables.map(renderTable).join(""):'<p class="stats-empty">표가 없습니다.</p>');
    requestAnimationFrame(()=>{measureSticky();updateStickyHeader();});
  }
  function activeView(table,state) {
    const base=table.views[Math.min(state.view,table.views.length-1)];
    return base.subviews?.[state.subview]||base;
  }
  function segmented(klass,label,items,active,attribute,tableId) {
    return '<nav class="tw-segmented '+klass+'" aria-label="'+escapeHtml(label)+'">'+items.map((item,index)=>
      '<button type="button" data-table="'+tableId+'" data-'+attribute+'="'+index+'" class="'+(active===index?"is-active":"")+
      '" aria-pressed="'+(active===index)+'">'+escapeHtml(item.label)+'</button>').join("")+'</nav>';
  }
  function groupRows(rows,state) {
    const groups={continent:rows.filter(r=>r.group==="continent"),country:rows.filter(r=>r.group==="country"),ordinary:rows.filter(r=>!r.group)};
    const sort=state.sort;
    if(!sort)return groups;
    const compare=(a,b)=>{
      const x=sort.index===0?a.label:a.values[sort.index-1];
      const y=sort.index===0?b.label:b.values[sort.index-1];
      const aValue=typeof x==="object"&&x?x.value:x,bValue=typeof y==="object"&&y?y.value:y;
      const result=typeof aValue==="number"&&typeof bValue==="number"?aValue-bValue:String(aValue).localeCompare(String(bValue),"ko");
      return sort.direction==="desc"?-result:result;
    };
    groups.continent.sort(compare);
    groups.ordinary.sort(compare);
    const order=[...new Set(groups.country.map(row=>row.continent||""))];
    groups.country=order.flatMap(name=>groups.country.filter(row=>(row.continent||"")===name).sort(compare));
    return groups;
  }
  function visibleRows(view,state) {
    const groups=groupRows(view.rows,state);
    if(groups.continent.length&&groups.country.length&&groups.continent.length>1) {
      if(state.scope==="continent")groups.country=[];
      if(state.scope==="country")groups.continent=[];
    }
    return groups;
  }
  function formatNumber(value,unit) {
    if(value===null||value===undefined||value==="")return "–";
    if(typeof value!=="number")return String(value);
    const digits=["%","‰","지수"].includes(unit)?1:/^(명|개|가구|마리|t|천 명|만 t|MWh|천 toe)$/.test(unit)?0:1;
    return new Intl.NumberFormat("ko-KR",{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value).replaceAll("-","−");
  }
  function cellHtml(value,column,max) {
    if(value===null||value===undefined)return '<span class="stats-missing">–</span>';
    if(typeof value==="object"&&value.name) return '<span class="stats-rank-cell"><strong>'+escapeHtml(value.name)+'</strong><small>'+escapeHtml(formatNumber(value.value,"명"))+'</small></span>';
    const display=escapeHtml(formatNumber(value,column.unit));
    if(typeof value!=="number")return display;
    const bar=column.unit==="%"&&value>=0&&max>0?'<span class="stats-bar" style="--bar-width:'+Math.min(100,value/max*100).toFixed(1)+'%"></span>':"";
    return '<span class="stats-value">'+bar+'<span class="stats-value-number">'+display+'</span></span>';
  }
  function rowMarkup(row,view,max) {
    const matched=highlight&&normalize(row.label).includes(highlight);
    const aggregate=row.group==="continent"||row.group==="national"||row.group==="region";
    const marker=view.note?.includes("국가 합산")&&aggregate||view.note?.includes("시도 합산")?"*":"";
    return '<tr class="'+(matched?"is-match ":"")+(aggregate?"is-aggregate":"")+'"><th scope="row">'+escapeHtml(row.label)+marker+'</th>'+
      row.values.map((value,index)=>'<td>'+cellHtml(value,view.columns[index],max[index])+'</td>').join("")+'</tr>';
  }
  function tbodyMarkup(view,groups,max) {
    const colspan=view.columns.length+1;
    const label=name=>'<tr class="is-group-label"><th colspan="'+colspan+'">'+name+'</th></tr>';
    const countryRows=(suppressSubgroup=false)=>{
      let last="";
      return groups.country.map(row=>{
        const heading=!suppressSubgroup&&row.continent&&row.continent!==last?'<tr class="is-subgroup"><th colspan="'+colspan+'">'+escapeHtml(row.continent)+'</th></tr>':"";
        last=row.continent||last;return heading+rowMarkup(row,view,max);
      }).join("");
    };
    if(groups.continent.length&&groups.country.length&&groups.continent.length===1)
      return '<tbody class="stats-continent">'+groups.continent.map(row=>rowMarkup(row,view,max)).join("")+'</tbody>'+
        '<tbody class="stats-country">'+countryRows(true)+'</tbody>';
    if(groups.continent.length||groups.country.length)
      return (groups.continent.length?'<tbody class="stats-continent">'+label("대륙")+groups.continent.map(row=>rowMarkup(row,view,max)).join("")+'</tbody>':"")+
        (groups.country.length?'<tbody class="stats-country">'+label("국가")+countryRows()+'</tbody>':"");
    return '<tbody>'+groups.ordinary.map(row=>rowMarkup(row,view,max)).join("")+'</tbody>';
  }
  function renderTable(table) {
    const state=stateFor(table.id),base=table.views[Math.min(state.view,table.views.length-1)],view=activeView(table,state);
    const groups=visibleRows(view,state);
    const rows=[...groups.continent,...groups.country,...groups.ordinary];
    const max=view.columns.map((_,index)=>Math.max(0,...rows.map(row=>Number(row.values[index])).filter(Number.isFinite)));
    const hasBoth=groupRows(view.rows,{sort:null}).continent.length>1&&groupRows(view.rows,{sort:null}).country.length>0;
    const viewNav=table.views.length>1?segmented("stats-views",table.title+" 지표",table.views,state.view,"view",table.id):"";
    const subNav=base.subviews?.length>1?segmented("stats-subviews",table.title+" 단위",base.subviews,state.subview,"subview",table.id):"";
    const scopeNav=table.comparison&&hasBoth?'<nav class="tw-segmented stats-scope" aria-label="행 범위">'+
      [["all","모두"],["continent","대륙"],["country","국가"]].map(([id,label])=>'<button type="button" data-table="'+table.id+'" data-scope="'+id+
      '" class="'+(state.scope===id?"is-active":"")+'" aria-pressed="'+(state.scope===id)+'">'+label+'</button>').join("")+'</nav>':"";
    const actions=[["copy","⧉","복사"],["csv","↓","CSV"],["link","↗","링크"]].map(([action,icon,label])=>
      '<button type="button" class="tw-button is-ghost is-sm stats-icon-button" data-table="'+table.id+'" data-action="'+action+
      '" aria-label="'+label+'" title="'+label+'">'+icon+'</button>').join("");
    const headers='<th scope="col" aria-sort="'+(state.sort?.index===0?(state.sort.direction==="desc"?"descending":"ascending"):"none")+
      '"><button type="button" class="stats-sort" data-table="'+table.id+'" data-sort="0"><span class="stats-sort-main">'+escapeHtml(view.rowLabel)+
      (state.sort?.index===0?'<span class="stats-sort-arrow">'+(state.sort.direction==="desc"?"↓":"↑")+'</span>':"")+'</span></button></th>'+
      view.columns.map((column,index)=>{
        const active=state.sort?.index===index+1;
        return '<th scope="col" aria-sort="'+(active?(state.sort.direction==="desc"?"descending":"ascending"):"none")+
          '"><button type="button" class="stats-sort" data-table="'+table.id+'" data-sort="'+(index+1)+'"><span class="stats-sort-main">'+
          escapeHtml(column.label)+(active?'<span class="stats-sort-arrow">'+(state.sort.direction==="desc"?"↓":"↑")+'</span>':"")+
          '</span><span class="stats-sort-unit">'+escapeHtml([column.unit,column.year].filter(Boolean).join("  "))+'</span></button></th>';
      }).join("");
    const meta='<div class="tw-meta-list stats-table-meta"><span>출처 <a href="'+escapeHtml(view.source.url||"#")+
      '" target="_blank" rel="noopener noreferrer">'+escapeHtml(view.source.name)+'</a></span>'+
      (view.year?'<span>기준 '+escapeHtml(view.year)+'</span>':"")+'</div>';
    const note=view.note?'<p class="stats-note">'+(view.note.includes("국가 합산")?"* ":"")+escapeHtml(view.note.replace(/^국가 합산;\s*/,"국가 합산, "))+'</p>':"";
    return '<section class="stats-table-section" id="'+escapeHtml(table.id)+'"><div class="stats-table-top"><h2 class="stats-table-title"><a href="#'+
      escapeHtml(table.id)+'">'+escapeHtml(table.title)+'</a></h2><div class="stats-actions">'+actions+'</div></div>'+
      viewNav+subNav+scopeNav+'<div class="tw-table-wrap stats-table-wrap"><table class="tw-table stats-table"><thead><tr>'+
      headers+'</tr></thead>'+tbodyMarkup(view,groups,max)+'</table></div>'+meta+note+'</section>';
  }
  function exportMatrix(table,state) {
    const view=activeView(table,state),groups=visibleRows(view,state);
    const result=[[view.rowLabel,...view.columns.map(c=>c.label+(c.unit?" ("+c.unit+")":""))]];
    const append=row=>result.push([row.label,...row.values.map((value,index)=>value&&typeof value==="object"?value.name+" "+value.value:
      typeof value==="number"?formatNumber(value,view.columns[index].unit).replaceAll(",","").replaceAll("−","-"):value??"–")]);
    if(groups.continent.length) {result.push(["대륙"]);groups.continent.forEach(append);}
    if(groups.country.length) {
      result.push(["국가"]);
      const single=view.rows.filter(row=>row.group==="continent").length===1;
      let last="";
      for(const row of groups.country){
        if(!single&&row.continent&&row.continent!==last)result.push([row.continent]);
        last=row.continent||last;append(row);
      }
    }
    groups.ordinary.forEach(append);
    return result;
  }
  async function copyText(value,message) {
    try {await navigator.clipboard.writeText(value);toast(message);}
    catch(error){console.error("Clipboard write failed",error);toast("복사하지 못했습니다.");}
  }
  function toast(message) {
    el.statsToast.textContent=message;clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{el.statsToast.textContent="";},2400);
  }
  function measureSticky() {
    if(!el.statsToolbar)return;
    const toolbar=el.statsToolbar.getBoundingClientRect().height;
    const aside=matchMedia("(max-width: 760px)").matches?document.querySelector(".stats-aside")?.getBoundingClientRect().height||0:0;
    document.documentElement.style.setProperty("--stats-toolbar-h",Math.ceil(toolbar)+"px");
    document.documentElement.style.setProperty("--stats-subnav-h",Math.ceil(toolbar+aside)+"px");
    document.querySelectorAll(".stats-table-wrap").forEach(w=>w.classList.toggle("has-overflow",w.scrollWidth>w.clientWidth+1));
  }
  function updateStickyHeader() {
    if(!el.statsStickyOverlay)return;
    const top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stats-subnav-h"))||64;
    const wraps=[...el.statsContent.querySelectorAll(".stats-table-wrap")];
    const active=wraps.find(w=>{
      const rect=w.getBoundingClientRect();
      const head=w.querySelector("thead")?.getBoundingClientRect();
      return head && rect.top<top && rect.bottom>top+head.height+8;
    });
    if(!active){el.statsStickyOverlay.hidden=true;return;}
    const rect=active.getBoundingClientRect();
    const original=active.querySelector("table"),header=original.querySelector("thead");
    const headerCells=[...header.querySelectorAll("th")];
    const colgroup="<colgroup>"+headerCells.map(cell=>'<col style="width:'+cell.getBoundingClientRect().width+'px">').join("")+"</colgroup>";
    el.statsStickyOverlay.style.left=Math.max(0,rect.left)+"px";
    el.statsStickyOverlay.style.width=rect.width+"px";
    el.statsStickyOverlay.innerHTML='<table class="tw-table stats-table" style="width:'+original.getBoundingClientRect().width+'px; transform:translateX('+(-active.scrollLeft)+'px)">'+colgroup+header.outerHTML+'</table>';
    el.statsStickyOverlay.hidden=false;
  }

})();

