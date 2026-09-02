/* ══════════════════ قفل الهدف، الهزيمة، الحفظ، خريطة الحملة، المهام (m_meta) ══════════════════ */
const META = Object.assign({ maps:0, quests:{}, best:{}, runs:0 }, (()=>{ try{ return JSON.parse(localStorage.getItem("dk_meta")||"{}"); }catch(e){ return {}; } })());
function saveMeta(){ try{ localStorage.setItem("dk_meta", JSON.stringify(META)); }catch(e){} }

/* ── قفل الهدف (بند 42): ضغط مطوّل على عدو ── */
function enemyAt(p, rad){
  let best=null, bd=rad;
  for(let i=0;i<G.enemies.length;i++){ const e=G.enemies[i]; if(e.hp<=0) continue; const d=dist2(p.x,p.z,e.x,e.z)-(E[e.t].boss?4:0); if(d<bd){ bd=d; best=e; } }
  return best;
}
/* نثبّت المرشّح لحظة لمس الشاشة لأن العدو يتحرك أثناء الضغط المطوّل */
let lockCand=null;
glc.addEventListener("pointerdown", e=>{ if(G.state==="COMBAT"){ const p=pickGround(e); lockCand=p?enemyAt(p,9):null; } else lockCand=null; });
HOOKS.longPress.push(function(p){
  if(G.lpUsed){ G.lpUsed=false; return; }
  if(G.pointOrder || !p) return;
  let best=(lockCand && lockCand.hp>0 && G.enemies.indexOf(lockCand)>=0)?lockCand:enemyAt(p,9);
  lockCand=null;
  if(!best) return;
  if(G.lock===best){ G.lock=null; log("أُلغي قفل الهدف."); }
  else { G.lock=best; log(`هدف مقفول: ${E[best.t].n}`); }
});
HOOKS.tick.push(function(){ if(G.lock && (G.lock.hp<=0 || G.enemies.indexOf(G.lock)<0)) G.lock=null; });
HOOKS.draw.push(function(ctx){
  const e=G.lock; if(!e) return;
  const D=E[e.t], p=project(e.x, terrainY(e.x,e.z)+(D.hh||5)+(D.fly?8:0)+1.2, e.z); if(!p.vis) return;
  const r=D.boss?16:11, k=G.t*4;
  ctx.strokeStyle="#F5C25B"; ctx.lineWidth=2.5;
  for(let i=0;i<4;i++){ const a=k+i*Math.PI/2; ctx.beginPath(); ctx.arc(p.x,p.y,r,a,a+.7); ctx.stroke(); }
  ctx.fillStyle="#F5C25B"; ctx.beginPath(); ctx.moveTo(p.x,p.y-r-9); ctx.lineTo(p.x-4,p.y-r-16); ctx.lineTo(p.x+4,p.y-r-16); ctx.closePath(); ctx.fill();
});

/* ── المهام (بند 83): خمس لكل خريطة ── */
const QUEST_W = { ash:"sword", iron:"spear", storm:"bow" }, QUEST_S = { ash:20000, iron:26000, storm:32000 };
function questsFor(id){ const wn=WEAPONS[QUEST_W[id]]?WEAPONS[QUEST_W[id]].name:QUEST_W[id];
  return [ {n:"أكمل الخريطة", ok:()=>true},
    {n:`أكملها بـ${wn}`, ok:()=>LOADOUT.weapon===QUEST_W[id]},
    {n:"أكملها بلا أبراج", ok:()=>!G.builtTower},
    {n:"أكملها بمعدِّل واحد على الأقل", ok:()=>(LOADOUT.mutators||[]).length>0},
    {n:`نتيجة ${QUEST_S[id].toLocaleString("ar-EG")} أو أكثر`, ok:()=>scoreOf().total>=QUEST_S[id]} ]; }
HOOKS.build.push(function(b){ if(b && (b.type==="tower"||b.type==="fire")) G.builtTower=true; });
const _mBuildStage=buildStage;
buildStage=function(i){ _mBuildStage(i); G.builtTower=false; G.retried=false; };
const _mStageCleared=stageCleared;
stageCleared=function(){
  const id=STAGES[G.stage].id, qs=questsFor(id), done=(META.quests[id]||[false,false,false,false,false]).slice();
  const newly=[]; qs.forEach((q,i)=>{ if(!done[i]&&q.ok()){ done[i]=true; newly.push(q.n); } });
  META.quests[id]=done; META.maps=Math.max(META.maps,G.stage+1);
  const sc=scoreOf().total; if(!META.best[id]||sc>META.best[id]) META.best[id]=sc;
  saveMeta(); try{ localStorage.removeItem("dk_save"); }catch(e){}
  _mStageCleared();
  const card=document.getElementById("overlayCard");
  const unl=Object.values(WEAPONS).filter(w=>(w.unlockMap||0)===G.stage+1).map(w=>w.name);
  if(card) card.querySelector("p").insertAdjacentHTML("afterend",
    `<p class="sub" style="color:var(--amber)">${unl.length?`فُتح: <b>${unl.join("، ")}</b> · `:""}النتيجة ${sc.toLocaleString("ar-EG")}${newly.length?` · مهام أُنجزت: ${newly.join("، ")}`:""}</p>`);
};

/* ── الحفظ والاستئناف (بند 133) ── */
function snapshot(){
  return { v:1, stage:G.stage, wave:G.wave, silver:Math.floor(G.silver), castleHp:G.castleHp, castleMax:G.castleMax, castleLv:G.castleLv,
    boons:Object.assign({},G.boons), lightPool:G.lightPool, lights:LANES.map(L=>L.light), hero:{hp:G.hero.hp},
    buildings:G.buildings.map(b=>({type:b.type,lv:b.lv,branch:b.branch,slot:SLOTS.indexOf(b.slot),hp:b.hp})),
    walls:G.walls.map(w=>({type:w.type,idx:w.idx,lv:w.lv,hp:w.hp})),
    loadout:JSON.parse(JSON.stringify(LOADOUT)), stat:Object.assign({},G.stat), builtTower:!!G.builtTower, retried:!!G.retried };
}
function restore(s){
  if(!s) return false;
  G.over=null; G.paused=false; G.pending=null; G.lock=null;
  document.getElementById("overlay").classList.remove("show");
  G.stage=s.stage-1; nextStage();
  G.wave=s.wave; G.silver=s.silver; G.castleLv=s.castleLv||1; G.castleMax=s.castleMax; G.castleHp=Math.min(s.castleHp,s.castleMax);
  G.boons=s.boons||{}; if(has("light")) G.lightPool++;
  LANES.forEach((L,i)=>{ L.light=(s.lights&&s.lights[i]!==undefined)?s.lights[i]:1; });
  Object.assign(LOADOUT, s.loadout||{}); applyLoadout();
  G.hero.hp=Math.min(G.hero.max, s.hero?s.hero.hp:G.hero.max);
  for(const b of s.buildings||[]){ const slot=SLOTS[b.slot]; if(!slot||slot.b||!B[b.type]) continue;
    const o={type:b.type,x:slot.x,z:slot.z,lv:b.lv,branch:b.branch,cd:0,hp:0,max:0,slot,alert:0,flash:0};
    o.max=maxHp(o); o.hp=Math.min(b.hp,o.max);
    o.obj=mkBuilding(o.type,o.lv,o.branch); o.obj.position.set(slot.x,terrainY(slot.x,slot.z),slot.z); o.obj.rotation.y=Math.atan2(-slot.x,-slot.z);
    world.add(o.obj); freeze(o.obj); slot.b=o; G.buildings.push(o);
    if(o.type==="beacon") G.lightPool++; if(o.type==="barracks") spawnSquad(o); }
  for(const w of s.walls||[]){ const node=WALLS[w.idx]; if(!node||node.b) continue;
    const o={type:w.type||"wall",x:node.x,z:node.z,lv:w.lv||1,hp:0,max:0,node,alert:0,idx:node.idx};
    o.max=maxHp(o); o.hp=Math.min(w.hp,o.max);
    o.obj=o.type==="wall"?mkWall(o.lv):mkBarrier(); o.obj.position.set(node.x,terrainY(node.x,node.z),node.z); o.obj.rotation.y=-node.a-Math.PI/2;
    world.add(o.obj); freeze(o.obj); node.b=o; G.walls.push(o); }
  const u=G.castleObj&&G.castleObj.userData; if(u){ if(u.towersA) u.towersA.visible=G.castleLv>=2; if(u.towersB) u.towersB.visible=G.castleLv>=3; }
  if(s.stat) G.stat=Object.assign(G.stat,s.stat); G.builtTower=!!s.builtTower; G.retried=!!s.retried;
  setState("BUILD"); refresh(); sync();
  return true;
}
function saveGame(){ try{ localStorage.setItem("dk_save", JSON.stringify(snapshot())); }catch(e){} }
function hasSave(){ try{ return !!localStorage.getItem("dk_save"); }catch(e){ return false; } }
function loadSave(){ try{ return JSON.parse(localStorage.getItem("dk_save")||"null"); }catch(e){ return null; } }
HOOKS.dawn.push(function(){ setTimeout(()=>{ if(G.state==="DAWN_REPORT"||G.state==="BUILD") saveGame(); },50); });
const _mStartNight=startNight;
startNight=function(){ if(G.state==="BUILD"){ G.nightSnap=snapshot(); saveGame(); } _mStartNight(); };
document.addEventListener("visibilitychange",()=>{ if(document.hidden && G.state==="BUILD" && !G.over) saveGame(); });
const _mShowOverlay=showOverlay;
showOverlay=function(o){
  _mShowOverlay(o);
  if(o && o.title==="مملكة الرماد" && hasSave()){
    const card=document.getElementById("overlayCard"), b=document.createElement("button");
    b.className="ghost"; b.id="resumeBtn"; b.textContent="متابعة الحملة المحفوظة"; b.style.marginInlineStart="8px";
    b.onclick=()=>{ const s=loadSave(); if(s&&restore(s)){ document.getElementById("overlay").classList.remove("show"); log(`استُؤنفت ${STAGES[G.stage].name} عند الليلة ${G.wave}.`); } };
    card.appendChild(b);
  }
};

/* ── الهزيمة (بند 135) والنصر (بند 136) ── */
const _mFinish=finish;
finish=function(won){
  try{ localStorage.removeItem("dk_save"); }catch(e){}
  if(won){ _mFinish(won); META.runs++; saveMeta(); return; }
  G.over="lose"; setState("DEFEAT"); SFX.lose();
  const sc=scoreOf();
  const c={}; for(const e of G.enemies) c[e.t]=(c[e.t]||0)+(E[e.t].wv||1);
  let big=null,bv=0; for(const k in c) if(c[k]>bv){bv=c[k];big=k;}
  const canRetry = LOADOUT.diff===1 && !G.retried && !!G.nightSnap;
  showOverlay({ title:`سقط الحصن في الليلة ${G.wave}`,
    body:`<b>السبب:</b> دُمّرت قلعة الحكم في ${STAGES[G.stage].name}.<br><b>أكبر تهديد:</b> ${big?E[big].n:"—"}.
      <table class="rep"><tr><td>بقاء القلعة</td><td>+${sc.castle}</td></tr><tr><td>الأعداء</td><td>+${sc.kills}</td></tr><tr><td>الاقتصاد</td><td>+${sc.econ}</td></tr><tr><th>النتيجة</th><th>${sc.total.toLocaleString("ar-EG")}</th></tr></table>`,
    btn:"إعادة الليلة", after:()=>{ if(canRetry) retryNight(); } });
  const card=document.getElementById("overlayCard"), ob=document.getElementById("ovBtn");
  if(!canRetry){ ob.disabled=true; ob.title="متاح في الصعوبة العادية مرة واحدة لكل خريطة"; ob.style.opacity=.45; }
  const row=document.createElement("div"); row.className="ghostbtns"; row.style.marginTop="8px";
  const b1=document.createElement("button"); b1.className="ghost"; b1.textContent="إعادة المرحلة"; b1.onclick=()=>{ document.getElementById("overlay").classList.remove("show"); metaRestart(false); };
  const b2=document.createElement("button"); b2.className="ghost"; b2.textContent="تغيير التجهيز"; b2.onclick=()=>{ document.getElementById("overlay").classList.remove("show"); metaRestart(true); };
  row.append(b1,b2); card.appendChild(row);
};
function metaRestart(loadout){
  G.over=null; G.pending=null; G.paused=false; G.lock=null;
  G.stage=Math.max(0,G.stage)-1; nextStage(); G.silver=220; G.retried=false;
  if(loadout && typeof openLoadout==="function"){ setState("INTRO"); openLoadout(); }
  else { applyLoadout(); refresh(); sync(); }
}
function retryNight(){
  const s=G.nightSnap; if(!s) return;
  restore(s); G.retried=true; G.nightSnap=null;
  log("أُعيدت الليلة من آخر فجر. فرصة واحدة لكل خريطة.");
}

/* ── خريطة الحملة (بند 80) ── */
function openCampaign(){
  let el=document.getElementById("campaign");
  if(!el){ document.getElementById("stageBox").insertAdjacentHTML("beforeend",`<div class="panel" id="campaign" hidden></div>`); el=document.getElementById("campaign"); }
  const env={ash:"رماد وكهرمان", iron:"سهول خضراء", storm:"مرتفعات باردة"};
  el.innerHTML=`<div class="ph"><h2>خريطة الحملة</h2><span>مملكة الرماد · ${META.maps}/${STAGES.length} خرائط</span></div>
    <div class="pb"><div class="opts">${STAGES.map((m,i)=>{ const st=i<META.maps?"cleared":i===META.maps?"open":"locked";
      const qs=(META.quests[m.id]||[]).filter(Boolean).length;
      return `<button class="opt" data-map="${i}" ${st==="locked"?"disabled":""} style="min-width:200px;max-width:260px">
        <b>${i+1}. ${m.name}</b><small>${env[m.id]||""} · ${m.nights} ليالٍ · الزعيم: ${E[m.boss].n}</small>
        <em>${st==="cleared"?"✓ أُنجزت":st==="open"?"متاحة":"🔒 أنهِ الخريطة السابقة"} · مهام ${qs}/5${META.best[m.id]?` · أفضل ${META.best[m.id].toLocaleString("ar-EG")}`:""}</em>
        <div class="det" style="display:block">${questsFor(m.id).map((q,k)=>`${(META.quests[m.id]||[])[k]?"✓":"○"} ${q.n}`).join("<br>")}</div></button>`; }).join("")}</div></div>
    <div class="pf"><button class="ghost" id="cpClose">إغلاق</button></div>`;
  el.querySelectorAll("[data-map]").forEach(b=>b.onclick=()=>{ el.hidden=true; startMap(+b.dataset.map); });
  el.querySelector("#cpClose").onclick=()=>{ el.hidden=true; };
  el.hidden=false;
}
function startMap(i){
  G.over=null; G.pending=null; G.paused=false; G.lock=null;
  document.getElementById("overlay").classList.remove("show");
  G.stage=i-1; nextStage(); G.silver=220;
  if(typeof openLoadout==="function"){ setState("INTRO"); openLoadout(); } else { applyLoadout(); refresh(); sync(); }
}
(()=>{ const icons=document.querySelector(".icons"); if(!icons) return;
  icons.insertAdjacentHTML("beforeend",`<button class="icon" id="campBtn" title="خريطة الحملة">🗺</button>`);
  document.getElementById("campBtn").onclick=()=>{ if(G.state==="BUILD"||G.state==="INTRO"||G.over) openCampaign(); else log("خريطة الحملة متاحة نهاراً."); };
})();
setTimeout(()=>{ if(window.__d){ window.__d.lock=()=>!!G.lock; window.__d.snap=()=>snapshot(); window.__d.restore=(s)=>restore(s); window.__d.lose=()=>finish(false); window.__d.meta=()=>META; window.__d.campaign=()=>openCampaign(); } },0);
