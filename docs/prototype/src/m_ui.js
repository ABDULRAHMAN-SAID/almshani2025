/* ══════════════════ الواجهة: التجهيز، الإيقاف بتبويبات، الإعدادات، صوت مقنّن، تكبير (m_ui) ══════════════════ */
document.getElementById("stageBox").insertAdjacentHTML("beforeend", `<style>
  .panel{position:absolute;inset:0;z-index:7;display:flex;flex-direction:column;background:rgba(12,8,20,.93);backdrop-filter:blur(5px);color:var(--parch);direction:rtl}
  .panel[hidden]{display:none}
  .panel .ph{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--line);flex:none}
  .panel .ph h2{font-family:"Amiri",Georgia,serif;margin:0;font-size:22px;color:var(--amber)}
  .panel .ph span{color:var(--muted);font-size:12.5px;flex:1}
  .panel .pb{flex:1;min-height:0;overflow:auto;padding:10px 16px;display:flex;flex-direction:column;gap:10px}
  .panel .pf{display:flex;gap:10px;align-items:center;justify-content:flex-start;padding:10px 16px;border-top:1px solid var(--line);flex:none;flex-wrap:wrap}
  .sec h4{margin:0 0 6px;font-size:13px;color:var(--muted);letter-spacing:.04em}
  .sec h4 b{color:var(--amber);font-variant-numeric:tabular-nums}
  .opts{display:flex;gap:7px;flex-wrap:wrap}
  .opt{background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:8px 11px;min-width:150px;max-width:220px;text-align:right;
    color:var(--parch);font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:3px;min-height:44px;position:relative}
  .opt b{font-size:13.5px}
  .opt small{font-size:11px;color:var(--muted);line-height:1.45}
  .opt em{font-style:normal;font-size:10.5px;color:var(--amber)}
  .opt[aria-pressed="true"]{border-color:var(--amber);box-shadow:0 0 0 1px var(--amber) inset}
  .opt:disabled{opacity:.42;cursor:not-allowed}
  .opt .lock{display:block;font-size:11px;color:var(--muted);margin-top:4px}
  .opt .info{position:absolute;left:6px;bottom:6px;width:22px;height:22px;display:inline-grid;place-items:center;border-radius:50%;border:1px solid var(--line);background:#161022;color:var(--muted);font-size:11px;font-family:inherit;cursor:pointer}
  .opt .det{display:none;font-size:10.5px;color:var(--parch);border-top:1px dashed var(--line);padding-top:4px;margin-top:2px;line-height:1.5}
  .opt.show .det{display:block}
  .tabs{display:flex;gap:6px;flex-wrap:wrap}
  .tabs button{font-family:inherit;font-size:12.5px;cursor:pointer;background:transparent;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:9px 12px;min-height:40px}
  .tabs button[aria-pressed="true"]{color:var(--amber);border-color:var(--amber)}
  table.tab{border-collapse:collapse;font-size:12.5px;width:100%;max-width:640px}
  table.tab td,table.tab th{padding:5px 8px;border-bottom:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums}
  table.tab th{color:var(--muted);font-weight:500;font-size:11.5px}
  .setrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);min-height:44px}
  .setrow span{font-size:13px}
  .setrow small{display:block;color:var(--muted);font-size:11px}
  .sw{width:46px;height:26px;border-radius:99px;background:#161022;border:1px solid var(--line);position:relative;cursor:pointer;flex:none}
  .sw i{position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:var(--muted);transition:right .15s,background .15s}
  .sw[aria-checked="true"]{border-color:var(--amber)} .sw[aria-checked="true"] i{right:23px;background:var(--amber)}
  .seg{display:flex;gap:4px} .seg button{font-family:inherit;font-size:12px;cursor:pointer;background:#161022;color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:6px 10px;min-height:36px}
  .seg button[aria-pressed="true"]{color:var(--amber);border-color:var(--amber)}
  @media (max-width:900px),(pointer:coarse){ .panel .ph h2{font-size:18px} .opt{min-width:132px;max-width:170px;padding:7px 9px} .panel .pb{padding:8px 12px} }
</style>
<div class="panel" id="loadout" hidden></div>
<div class="panel" id="pausePanel" hidden></div>`);

const UI = { pauseTab:"wave", metaMaps:()=> (typeof META!=="undefined" && META && META.maps) ? META.maps : 0 };
const uiEsc = s => String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ── شاشة التجهيز (بنود 53–59، 137–140) ── */
let LO = { weapon:"sword", armor:null, banner:null, perks:[], mutators:[], diff:1 };
function openLoadout(onDone){
  const el=document.getElementById("loadout"), cfg=STAGES[G.stage];
  LO = { weapon:LOADOUT.weapon||"sword", armor:LOADOUT.armor||null, banner:LOADOUT.banner||null,
    perks:(LOADOUT.perks||[]).slice(0,3), mutators:(LOADOUT.mutators||[]).slice(), diff:LOADOUT.diff||1 };
  if(!WEAPONS[LO.weapon]) LO.weapon=Object.keys(WEAPONS)[0]||"sword";
  const maps=UI.metaMaps();
  const render=()=>{
    const wp=Object.values(WEAPONS), pk=Object.values(PERKS), mu=Object.values(MUTATORS), eq=(typeof EQUIP!=="undefined")?Object.values(EQUIP):[];
    let mult=1; for(const id of LO.mutators) if(MUTATORS[id]) mult*=MUTATORS[id].score||1;
    const df=DIFFS.find(d=>d.id===LO.diff)||DIFFS[0]; mult*=df.score;
    el.innerHTML=`<div class="ph"><h2>التجهيز</h2><span>${uiEsc(cfg.name)} · ${cfg.nights} ليالٍ · الزعيم: ${uiEsc(E[cfg.boss].n)}</span></div>
    <div class="pb">
      <div class="sec"><h4>السلاح <b>1/1</b></h4><div class="opts">${wp.length?wp.map(w=>{
        const locked=(w.unlockMap||0)>maps;
        return `<button class="opt" data-w="${w.id}" aria-pressed="${LO.weapon===w.id}" ${locked?"disabled":""}>
          <b>${uiEsc(w.name)}</b><small>${uiEsc(w.d)}</small>
          <em>سلبي: ${uiEsc(w.passive.name)} · نشط: ${uiEsc(w.active.name)}</em>
          ${locked?`<span class="lock">🔒 يُفتح بعد الخريطة ${w.unlockMap}</span>`:`<span class="info" role="button" tabindex="0" data-info="${w.id}" title="تفاصيل">ⓘ</span>`}
          <div class="det">ضرر ${w.passive.dmg} · مدى ${w.passive.range} · كل ${w.passive.cd}ث<br>${uiEsc(w.active.d)} · تبريد ${w.active.cd}ث</div></button>`; }).join(""):"<small>—</small>"}</div></div>
      ${eq.length?`<div class="sec"><h4>الدرع/التعويذة والراية <b>2 خانتان</b></h4><div class="opts">${["armor","banner"].map(slot=>
        `<button class="opt" data-eq="${slot}" data-id="" aria-pressed="${!LO[slot]}"><b>بلا ${slot==="armor"?"درع":"راية"}</b><small>القائد كما هو</small></button>`+
        eq.filter(q=>q.slot===slot).map(q=>`<button class="opt" data-eq="${slot}" data-id="${q.id}" aria-pressed="${LO[slot]===q.id}"><b>${uiEsc(q.name)}</b><small>${uiEsc(q.d)}</small></button>`).join("")).join("")}</div></div>`:""}
      <div class="sec"><h4>البركات <b>${LO.perks.length}/3</b></h4><div class="opts">${pk.length?pk.map(p=>
        `<button class="opt" data-p="${p.id}" aria-pressed="${LO.perks.includes(p.id)}"><b>${uiEsc(p.name)}</b><small>${uiEsc(p.d)}</small></button>`).join(""):"<small>—</small>"}</div></div>
      <div class="sec"><h4>المعدِّلات <b>×${mult.toFixed(2)} على النتيجة</b></h4><div class="opts">${mu.length?mu.map(m=>
        `<button class="opt" data-m="${m.id}" aria-pressed="${LO.mutators.includes(m.id)}"><b>${uiEsc(m.name)}</b><small>${uiEsc(m.d)}</small><em>×${(m.score||1).toFixed(2)}</em></button>`).join(""):"<small>—</small>"}</div></div>
      <div class="sec"><h4>الصعوبة</h4><div class="opts">${DIFFS.map(d=>
        `<button class="opt" data-d="${d.id}" aria-pressed="${LO.diff===d.id}"><b>${uiEsc(d.name)}</b><small>حياة الأعداء ×${d.hp} · ضررهم ×${d.dmg}</small><em>×${d.score} على النتيجة</em></button>`).join("")}</div></div>
    </div>
    <div class="pf"><button class="primary" id="loStart">ابدأ ▶</button><span style="color:var(--muted);font-size:12px">سلاح واحد لا يتغيّر داخل الخريطة</span></div>`;
    el.querySelectorAll("[data-w]").forEach(b=>b.onclick=e=>{ if(e.target.dataset.info){ b.classList.toggle("show"); return; } LO.weapon=b.dataset.w; render(); });
    el.querySelectorAll("[data-eq]").forEach(b=>b.onclick=()=>{ LO[b.dataset.eq]=b.dataset.id||null; render(); });
    el.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{ const id=b.dataset.p, i=LO.perks.indexOf(id);
      if(i>=0) LO.perks.splice(i,1); else if(LO.perks.length<3) LO.perks.push(id); else log("ثلاث بركات فقط — أزل واحدة أولاً."); render(); });
    el.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{ const id=b.dataset.m, i=LO.mutators.indexOf(id); if(i>=0) LO.mutators.splice(i,1); else LO.mutators.push(id); render(); });
    el.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{ LO.diff=+b.dataset.d; render(); });
    el.querySelector("#loStart").onclick=()=>{
      Object.assign(LOADOUT,{ weapon:LO.weapon, armor:LO.armor, banner:LO.banner, perks:LO.perks.slice(), mutators:LO.mutators.slice(), diff:LO.diff });
      try{ localStorage.setItem("dk_loadout", JSON.stringify(LOADOUT)); }catch(e){}
      el.hidden=true; applyLoadout(); setState("BUILD"); refresh(); sync();
      log(`تجهّزت بـ${WEAPONS[LOADOUT.weapon]?WEAPONS[LOADOUT.weapon].name:"سلاح"} و${LOADOUT.perks.length} بركات.`);
      if(onDone) onDone();
    };
  };
  try{ const s=JSON.parse(localStorage.getItem("dk_loadout")||"null"); if(s&&!LOADOUT.perks.length){ Object.assign(LO,{weapon:s.weapon||LO.weapon,armor:s.armor||null,banner:s.banner||null,perks:(s.perks||[]).slice(0,3),mutators:s.mutators||[],diff:s.diff||1}); if(!WEAPONS[LO.weapon]) LO.weapon="sword"; } }catch(e){}
  render(); el.hidden=false;
}

/* ── قائمة الإيقاف بتبويبات (بنود 97–98) ── */
function openPause(){
  if(G.over) return;
  G.paused=true;
  const el=document.getElementById("pausePanel");
  const render=()=>{
    const t=UI.pauseTab;
    let body="";
    if(t==="wave"){
      const night=G.state==="COMBAT"||G.state==="NIGHT_START";
      const counts={}; let rows="";
      if(night){ for(const e of G.enemies) counts[e.t]=(counts[e.t]||0)+1; for(const s of G.queue) counts[s.t]=(counts[s.t]||0)+1;
        rows=Object.keys(counts).map(k=>`<tr><td>${uiEsc(E[k].n)}</td><td>${counts[k]}</td><td>${E[k].boss?"زعيم":E[k].fly?"يطير فوق الأسوار":E[k].sieger?"يحاصر المباني":E[k].prio&&E[k].prio[0]==="ECONOMY"?"يقصد الاقتصاد":"يقصد القلعة"}</td></tr>`).join("");
        body=`<p>في الميدان <b>${G.enemies.length}</b> · في الطريق <b>${G.queue.length}</b></p><table class="tab"><tr><th>النوع</th><th>العدد</th><th>الهدف</th></tr>${rows}</table>`;
      } else if(G.wave<STAGES[G.stage].nights){
        const pv=wavePreview(G.stage,G.wave+1);
        rows=Object.keys(pv.counts).map(k=>`<tr><td>${uiEsc(E[k].n)}</td><td>${pv.counts[k]}</td><td>${E[k].prio?uiEsc({CASTLE:"القلعة",ECONOMY:"الاقتصاد",WALL:"الأسوار",TOWER:"الأبراج",UNIT:"الوحدات"}[E[k].prio[0]]||"القلعة"):"القلعة"}</td></tr>`).join("");
        body=`<p>الليلة <b>${G.wave+1}</b> — ${LANES.map((L,i)=>`${uiEsc(L.name.replace("ممر ",""))} ${"★".repeat(pv.lanes[i])||"—"}`).join(" · ")}</p><table class="tab"><tr><th>النوع</th><th>العدد</th><th>الأولوية</th></tr>${rows}</table>`;
      } else body="<p>لا موجات باقية في هذه الخريطة.</p>";
    } else if(t==="units"){
      let rows;
      if(typeof unitSummary==="function") rows=unitSummary().map(u=>`<tr><td>${uiEsc(u.name)}</td><td>${u.alive}/${u.total}</td><td>${Math.round(u.hp)}</td><td>${Math.round(u.dmg)}</td><td>${Math.round(u.range)}</td></tr>`).join("");
      else { const alive=G.soldiers.filter(s=>s.dead<=0).length; rows=`<tr><td>جنود</td><td>${alive}/${G.soldiers.length}</td><td>—</td><td>—</td><td>—</td></tr>`; }
      body=rows?`<table class="tab"><tr><th>الوحدة</th><th>أحياء</th><th>حياة</th><th>ضرر</th><th>مدى</th></tr>${rows}</table>`:"<p>لا قوات بعد — ابنِ ثكنة على ساحة تدريب.</p>";
      body+=`<p class="sub" style="color:var(--muted);font-size:12px">القائد: حياة ${Math.round(G.hero.hp)}/${G.hero.max} · السلاح: ${WEAPONS[LOADOUT.weapon]?uiEsc(WEAPONS[LOADOUT.weapon].name):"—"}</p>`;
    } else if(t==="towers"){
      const rows=G.buildings.filter(b=>B[b.type].cat==="def").map(b=>{ const st=stats(b);
        return `<tr><td>${uiEsc(B[b.type].name)}${b.branch?" ("+uiEsc(b.branch)+")":""}</td><td>${b.lv}</td><td>${st.dmg?Math.round(st.dmg):st.dps?Math.round(st.dps)+"/ث":"—"}</td><td>${st.range?Math.round(st.range):b.type==="beacon"?Math.round(lightRadius(b)):"—"}</td><td>${Math.round(b.hp)}/${b.max}</td></tr>`; }).join("");
      body=rows?`<table class="tab"><tr><th>البرج</th><th>م</th><th>ضرر</th><th>مدى</th><th>حياة</th></tr>${rows}</table>`:"<p>لا أبراج بعد.</p>";
    } else {
      const sw=(k,lbl,sub)=>`<div class="setrow"><span>${lbl}${sub?`<small>${sub}</small>`:""}</span><button class="sw" data-set="${k}" role="switch" aria-checked="${!!SET[k]}"><i></i></button></div>`;
      body=`<div class="sec"><h4>اللعب</h4>${sw("dmgNums","أرقام الضرر","مطفأة افتراضياً كي لا تغرق الخريطة")}${sw("ranges","إظهار مدى الأبراج نهاراً")}${sw("hpBars","شرائط الصحة عند التضرر","الزعماء دائماً")}${sw("autoTarget","الهجوم الآلي لأقرب عدو","وإلا فالهدف المقفول فقط")}${sw("shake","اهتزاز الشاشة")}</div>
      <div class="sec"><h4>الرسوم</h4><div class="setrow"><span>الجودة<small>دقة العرض</small></span><div class="seg">${["low","auto","high"].map(v=>`<button data-q="${v}" aria-pressed="${SET.quality===v}">${v==="low"?"منخفضة":v==="auto"?"تلقائي":"عالية"}</button>`).join("")}</div></div>${sw("shadows","الظلال")}${sw("motion","الحركات الزخرفية","اليراعات وتموّج الماء")}</div>
      <div class="sec"><h4>إتاحة</h4>${sw("cb","تباين أعلى للألوان","للتمييز بين الأصدقاء والأعداء")}</div>`;
    }
    el.innerHTML=`<div class="ph"><h2>إيقاف</h2><span>${uiEsc(STAGES[G.stage].name)} · الليلة ${G.wave}/${STAGES[G.stage].nights}</span>
      <div class="tabs">${[["wave","موجة الليلة"],["units","قواتي"],["towers","الأبراج"],["set","الإعدادات"]].map(([k,n])=>`<button data-tab="${k}" aria-pressed="${t===k}">${n}</button>`).join("")}</div></div>
      <div class="pb">${body}</div>
      <div class="pf"><button class="primary" id="pResume">استئناف</button><button class="ghost" id="pRestart">إعادة المرحلة</button><button class="ghost" id="pExit">الخروج</button></div>`;
    el.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{ UI.pauseTab=b.dataset.tab; render(); });
    el.querySelectorAll("[data-set]").forEach(b=>b.onclick=()=>{ const k=b.dataset.set; SET[k]=!SET[k]; saveSet(); uiApplySet(k); render(); });
    el.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{ SET.quality=b.dataset.q; saveSet(); uiApplySet("quality"); render(); });
    el.querySelector("#pResume").onclick=closePause;
    el.querySelector("#pRestart").onclick=()=>{ closePause(); restartStage(); };
    el.querySelector("#pExit").onclick=()=>{ closePause(); resetAll(); };
  };
  render(); el.hidden=false;
}
function closePause(){ G.paused=false; document.getElementById("pausePanel").hidden=true; }
function restartStage(){
  G.over=null; G.pending=null; G.paused=false;
  document.getElementById("overlay").classList.remove("show");
  G.stage=Math.max(0,G.stage)-1; nextStage(); G.silver=220; G.retried=false;
  applyLoadout(); refresh(); sync();
  log(`أعيدت ${STAGES[G.stage].name} من البداية.`);
}
function uiApplySet(k){
  if(k==="quality"){ const pr=SET.quality==="low"?1:SET.quality==="high"?Math.min(2,devicePixelRatio||1):Math.min(MOBILE?1.6:2,devicePixelRatio||1); renderer.setPixelRatio(pr); resize(); }
  if(k==="shadows"){ renderer.shadowMap.enabled=!!SET.shadows; scene.traverse(o=>{ if(o.material) o.material.needsUpdate=true; }); }
  if(k==="cb"){ document.documentElement.style.setProperty("--amber", SET.cb?"#FFD23F":"#F5C25B"); }
}
uiApplySet("quality"); uiApplySet("shadows"); uiApplySet("cb");
addEventListener("keydown",e=>{ if(e.key==="Escape"){ if(G.paused) closePause(); else if(!document.getElementById("loadout").hidden){} else if(G.state==="BUILD"||G.state==="COMBAT"||G.state==="NIGHT_START") openPause(); } });

/* ── أرقام الضرر (بند 102): مطفأة افتراضياً، بلا تخصيص لكل ضربة ── */
const DN=[]; for(let i=0;i<24;i++) DN.push({on:false,x:0,z:0,y:0,n:0,age:0});
let dnI=0;
HOOKS.hurt.push(function(e,dm){
  if(!SET.dmgNums || dm<1) return;
  const d=DN[dnI]; dnI=(dnI+1)%DN.length;
  d.on=true; d.x=e.x; d.z=e.z; d.y=(E[e.t].hh||5)+(E[e.t].fly?8:0); d.n=Math.round(dm); d.age=0;
});
HOOKS.tick.push(function(dt){ for(let i=0;i<DN.length;i++){ const d=DN[i]; if(!d.on) continue; d.age+=dt; if(d.age>.8) d.on=false; } });
HOOKS.draw.push(function(ctx){
  if(!SET.dmgNums) return;
  ctx.font="700 13px Tajawal,sans-serif"; ctx.textAlign="center";
  for(let i=0;i<DN.length;i++){ const d=DN[i]; if(!d.on) continue;
    const p=project(d.x, terrainY(d.x,d.z)+d.y+d.age*6, d.z); if(!p.vis) continue;
    ctx.globalAlpha=1-d.age/.8; ctx.fillStyle="#FFE3A0"; ctx.strokeStyle="rgba(0,0,0,.7)"; ctx.lineWidth=3;
    ctx.strokeText(d.n,p.x,p.y); ctx.fillText(d.n,p.x,p.y); }
  ctx.globalAlpha=1;
});

/* ── تجمّع الصوت (بند 100): حدود لكل فئة في نافذة 250ms ── */
(()=>{ const LIM={shoot:5,hit:6,build:4,die:3}; const cnt={}, win={};
  for(const k in LIM){ const f=SFX[k]; if(typeof f!=="function") continue;
    SFX[k]=function(){ const now=performance.now(); if(!win[k]||now-win[k]>250){ win[k]=now; cnt[k]=0; } if(cnt[k]>=LIM[k]) return; cnt[k]++; return f.apply(this,arguments); }; }
})();

/* ── ثلاث حالات تكبير (بند 14) + نقرتان على القلعة (بند 13) ── */
(()=>{ const icons=document.querySelector(".icons"); if(!icons) return;
  icons.insertAdjacentHTML("afterbegin",`<button class="icon" id="zoomBtn" title="تكبير: تكتيكي / عادي / قتال">◎</button>`);
  const P=[1100, MOBILE?320:400, 170], N=["تكتيكي","عادي","قتال"];
  document.getElementById("zoomBtn").onclick=()=>{ let i=0, bd=1e9; for(let k=0;k<3;k++){ const d=Math.abs(camDist-P[k]); if(d<bd){bd=d;i=k;} }
    i=(i+1)%3; camDist=P[i]; camHigh=camDist*.66; clampPan(); log(`الكاميرا: ${N[i]}`); };
  let lastTap=0;
  glc.addEventListener("pointerup",e=>{ const now=performance.now(); if(now-lastTap<320){ const p=pickGround(e); if(p&&Math.hypot(p.x,p.z)<40){ G.cam.tx=0; G.cam.tz=0; } } lastTap=now; });
})();
setTimeout(()=>{ if(window.__d){ window.__d.paused=()=>!!G.paused; window.__d.lo=()=>({weapon:LOADOUT.weapon,perks:LOADOUT.perks,mutators:LOADOUT.mutators,diff:LOADOUT.diff,armor:LOADOUT.armor,banner:LOADOUT.banner}); } },0);
