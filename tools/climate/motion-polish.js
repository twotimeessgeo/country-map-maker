/* Climate Atlas selection and section motion. */
(() => {
  "use strict";
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const css=()=>getComputedStyle(document.documentElement);
  const timing=(token,fallback="--tw-dur-2")=>({
    duration:parseFloat(css().getPropertyValue(token))||parseFloat(css().getPropertyValue(fallback))||0,
    easing:css().getPropertyValue("--tw-ease-out").trim()||"ease-out",
  });
  function snapshot(container,selector,key) {
    if(!container||reduced.matches)return null;
    return new Map([...container.querySelectorAll(selector)].map(element=>[
      element.dataset[key],{rect:element.getBoundingClientRect(),clone:element.cloneNode(true)}]));
  }
  function ghost(entry,duration) {
    const element=entry.clone,rect=entry.rect;
    element.removeAttribute("data-tray-remove-id");
    element.removeAttribute("data-region-id");
    element.setAttribute("aria-hidden","true");
    element.style.cssText=`position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;overflow:hidden;z-index:80;pointer-events:none;margin:0`;
    document.body.appendChild(element);
    const animation=element.animate([{height:`${rect.height}px`,opacity:1,transform:"scale(1)"},
      {height:"0px",opacity:0,transform:"scale(.9)"}],duration);
    animation.finished.then(()=>element.remove(),()=>element.remove());
  }
  function snapshotTray(container) {return snapshot(container,"[data-tray-remove-id]","trayRemoveId");}
  function animateTray(container,previous) {
    if(!container||!previous||reduced.matches)return;
    const enter=timing("--tw-climate-chip-dur"),move=timing("--tw-dur-2"),live=new Set();
    for(const chip of container.querySelectorAll("[data-tray-remove-id]")) {
      const id=chip.dataset.trayRemoveId,old=previous.get(id);live.add(id);
      if(!old){chip.animate([{opacity:0,transform:"scale(.9)"},{opacity:1,transform:"scale(1)"}],enter);continue;}
      const next=chip.getBoundingClientRect(),dx=old.rect.left-next.left,dy=old.rect.top-next.top;
      if(Math.abs(dx)+Math.abs(dy)>.5)chip.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],move);
    }
    for(const [id,entry] of previous)if(!live.has(id))ghost(entry,enter);
  }
  function snapshotCards(container) {
    if(!container||reduced.matches)return null;
    if(!container.dataset.climateCardsReady){container.dataset.climateCardsReady="true";return null;}
    return snapshot(container,".region-card[data-region-id]","regionId");
  }
  function animateCards(container,previous,summary) {
    if(!container||!previous||reduced.matches)return;
    const duration=timing("--tw-dur-2"),live=new Set();
    let offscreenAdded=false;
    for(const card of container.querySelectorAll(".region-card[data-region-id]")) {
      const id=card.dataset.regionId,old=previous.get(id),next=card.getBoundingClientRect();live.add(id);
      if(!old) {
        card.style.overflow="hidden";
        const animation=card.animate([{height:"0px",opacity:0},{height:`${next.height}px`,opacity:1}],duration);
        animation.finished.then(()=>card.style.removeProperty("overflow"),()=>card.style.removeProperty("overflow"));
        if(next.top>=innerHeight||next.bottom<=0)offscreenAdded=true;
        continue;
      }
      const dx=old.rect.left-next.left,dy=old.rect.top-next.top;
      if(Math.abs(dx)+Math.abs(dy)>.5)card.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:"none"}],duration);
    }
    for(const [id,entry] of previous)if(!live.has(id))ghost(entry,duration);
    if(offscreenAdded&&summary)summary.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],duration);
  }
  function startAnchors() {
    const nav=document.querySelector(".atlas-toolbar .tw-subnav-links");
    if(!nav||!("IntersectionObserver" in window))return;
    const links=[...nav.querySelectorAll('a[href^="#"]')];
    const sections=links.map(link=>document.querySelector(link.getAttribute("href")));
    const setActive=index=>{
      const link=links[index];if(!link)return;
      links.forEach((item,i)=>item.classList.toggle("is-active",i===index));
      nav.style.setProperty("--atlas-anchor-x",`${link.offsetLeft}px`);
      nav.style.setProperty("--atlas-anchor-width",`${link.offsetWidth}px`);
    };
    const update=()=>{
      let current=0;
      sections.forEach((section,index)=>{if(section&&section.getBoundingClientRect().top<innerHeight*.48)current=index;});
      setActive(current);
    };
    const observer=new IntersectionObserver(update,{rootMargin:"-12% 0px -55% 0px"});
    sections.forEach(section=>{if(section)observer.observe(section);});
    nav.addEventListener("click",event=>{const index=links.indexOf(event.target.closest("a"));if(index>=0)setActive(index);});
    window.addEventListener("resize",update);
    update();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startAnchors,{once:true});
  else startAnchors();
  const hover=matchMedia("(hover: hover)");
  function regionId(element) {return element?.dataset.regionId || element?.dataset.regionCheckbox || element?.dataset.mapRegionId;}
  function related(selector,id) {return [...document.querySelectorAll(selector)].filter(element=>regionId(element)===id);}
  document.addEventListener("change",event=>{
    const input=event.target.closest?.('.region-option input');if(!input||!input.checked||reduced.matches)return;
    const id=regionId(input)||regionId(input.closest('.region-option'));
    requestAnimationFrame(()=>related('.map-marker',id).forEach(marker=>{
      marker.classList.remove('is-pulsing');void marker.offsetWidth;marker.classList.add('is-pulsing');
      marker.addEventListener('animationend',()=>marker.classList.remove('is-pulsing'),{once:true});
    }));
  },true);
  document.addEventListener("click",event=>{
    const marker=event.target.closest?.('.map-marker');if(!marker)return;
    const id=regionId(marker);
    requestAnimationFrame(()=>related('.region-option',id).forEach(row=>{
      row.scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});
      if(!reduced.matches)row.animate([{backgroundColor:'var(--tw-surface-2)'},{backgroundColor:'transparent'}],timing('--tw-dur-3'));
    }));
  });
  function highlight(event,on) {
    if(!hover.matches)return;
    const item=event.target.closest?.('.region-card, .map-marker');if(!item||item.contains(event.relatedTarget))return;
    related(item.matches('.region-card')?'.map-marker':'.region-card',regionId(item)).forEach(el=>el.classList.toggle('is-hot',on));
  }
  document.addEventListener('pointerover',event=>highlight(event,true));
  document.addEventListener('pointerout',event=>highlight(event,false));
  window.ClimateMotion={snapshotTray,animateTray,snapshotCards,animateCards};
})();
