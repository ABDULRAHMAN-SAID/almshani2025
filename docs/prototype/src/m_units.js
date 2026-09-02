/* ═══════════ m_units.js — الوحدات والأوامر والمجموعات (§33–38، §91) ═══════════
   يُدرَج داخل IIFE اللعبة. يعرّف UNITS، فروع الثكنة، unitStats، soldierBehavior،
   renderOrders (مجموعات + أوامر)، أوامر النقطة/الدفاع بالضغط المطوّل، وunitSummary للقائمة. */

/* ── جدول الوحدات ── */
UNITS.guard   = { id:"guard",   name:"حرس",   d:"مدرّع متوازن يثبت في الصف",    hp:150, dmg:20, rate:.7,  range:3.4, speed:16.5,   tags:["melee","armored"], counters:[],                 cmul:1 };
UNITS.spear   = { id:"spear",   name:"رمّاح", d:"رمح طويل يصيد السريع والطائر", hp:100, dmg:16, rate:.55, range:4.8, speed:17, tags:["melee","reach"],   counters:["runner","flyer"], cmul:1.8, reach:true };
UNITS.archer  = { id:"archer",  name:"رماة",  d:"سهام بعيدة ويتجنّب الاشتباك",  hp:70,  dmg:15, rate:.8,  range:38,  speed:16, tags:["ranged"],          counters:[],                 cmul:1,   ranged:true };
UNITS.berserk = { id:"berserk", name:"هائج",  d:"فأس ثقيلة تحطّم المدرّعين",    hp:85,  dmg:34, rate:.6,  range:3.2, speed:19.5,   tags:["melee","fast"],    counters:["brute"],          cmul:1.3 };

/* فروع الثكنة في المستوى الثالث (النواة تعرضها بطاقاتٍ عند الترقية) */
B.barracks.branches = [
  { n:"رمّاح",  d:"رماح طويلة تصيد الناهبين والخفافيش" },
  { n:"رماة",   d:"سهام من بعيد ويبتعدون عن الاشتباك" },
  { n:"هائجون", d:"فؤوس ثقيلة تحطّم المدرّعين — سريعون وهشّون" }
];

/* حالة الوحدة (مسمّاة UN لتفادي التصادم مع وحدات أخرى) */
const UN = {
  ct:0, stage:0, chips:null, cnt:{all:-1,inf:-1,rng:-1}, mark:{inf:null,rng:null},
  pool:{ spear:[], archer:[], berserk:[] },
  GIDS:["inf","rng"],
  GROUPS:[ {id:"all",n:"الكل",t:"كل الفرق"}, {id:"inf",n:"مشاة",t:"الحرس والرمّاحون والهائجون"}, {id:"rng",n:"رماة",t:"الرماة فقط"} ],
  ORDERS:[
    { id:"follow",  n:"اتبعني", t:"اتبعني — الفريق يتحرك معك ويقاتل حولك", key:"1" },
    { id:"hold",    n:"اثبت",   t:"اثبت هنا — يثبت الفريق في موضعه الحالي", key:"2" },
    { id:"point",   n:"اذهب",   t:"اذهب إلى النقطة — ثم اضغط مطوّلاً على الأرض" },
    { id:"defend",  n:"دافع",   t:"دافع عن المبنى — ثم اضغط مطوّلاً على مبنى" },
    { id:"retreat", n:"تراجع",  t:"تراجع — يتجمّع الفريق في فناء القلعة" },
    { id:"guard",   n:"عودة",   t:"عودة — يعود الفريق إلى ثكنته", key:"3" }
  ],
  BRANCH:{ "رمّاح":"spear", "رماة":"archer", "هائجون":"berserk" },
  /* هيئات مميّزة لكل صنف (الحرس = هيئة النواة الافتراضية: رمح + ترس مستدير + خوذة) */
  RIG:{
    spear:  { h:4.8, cloth:0x40639C, cloth2:0x33507E, skin:0xDFAC7E, metal:0xA6AEBA, metal2:0x6E7684, accent:0x9AA8C4, armored:true, helm:true, weapon:"spear" },
    archer: { h:4.4, cloth:0x35507E, cloth2:0x2A4066, skin:0xE8B98C, accent:0x9AA8C4, hood:true, bow:true, skirt:true },
    berserk:{ h:4.7, bulk:1.15, cloth:0x6E3A2A, cloth2:0x4E2A1E, skin:0xDFAC7E, beard:0x4A2E1A, accent:0xC4483B, armored:false, weapon:"axe", skirt:true }
  }
};

document.head.insertAdjacentHTML("beforeend", `<style>
  #orderRow button.ghost{background:rgba(20,15,32,.62);color:var(--parch);min-height:36px}
  #orderRow button.grp{color:var(--muted)}
  #orderRow button.grp[aria-pressed="true"]{background:rgba(245,194,91,.16);color:var(--amber)}
  #orderRow button.armed{color:#FFD98A;border-color:#FFD98A;box-shadow:0 0 0 2px rgba(245,194,91,.28)}
  #orderRow .sep{width:1px;height:24px;background:var(--line);margin:0 3px;display:inline-block}
  #orderRow .ohint{font-size:12px;color:#FFD98A;background:rgba(20,15,32,.7);border:1px solid rgba(245,194,91,.4);border-radius:99px;padding:4px 10px}
  @media (max-width:900px),(pointer:coarse){ #orderRow button.ghost{min-height:44px;min-width:44px} }
</style>`);

/* ── إحصاءات الثكنة (نقطة استبدال تقرؤها النواة عبر stats(b)) ── */
function unitKind(b){ return (b.lv>=3 && UN.BRANCH[b.branch]) || "guard"; }
function unitStats(b){
  const m = b.lv===1?1 : b.lv===2?1.55 : 2.15, k=unitKind(b), U=UNITS[k];
  const n = (b.lv===1?3 : b.lv===2?4 : 5) + (has("troop")?1:0);
  return { n, hp:U.hp*m, dmg:U.dmg*m*MOD.unitDmg, sp:U.speed*MOD.unitSpeed, kind:k, rate:U.rate, range:U.range, name:U.name };
}
function unGrpOf(s){ return s.grp || (unitKind(s.home)==="archer" ? "rng" : "inf"); }

/* ── الهيئات: تبديل النموذج عند تغيّر الصنف مع تجمّعات لكل صنف ── */
function unReleaseRig(o){
  const ck=o.userData.ukind;
  if(!ck||ck==="guard") freeSoldierRig(o);
  else { world.remove(o); UN.pool[ck].push(o); }
}
function unTakeRig(k){
  if(k==="guard"){
    // تجمّع النواة قد يعيد هيئة صنف آخر (بعد هدم ثكنة) — نحوّلها إلى تجمّعنا ونطلب غيرها
    for(let i=0;i<32;i++){ const o=getSoldierRig(); const ck=o.userData.ukind; if(!ck||ck==="guard") return o; world.remove(o); UN.pool[ck].push(o); }
    return mkHumanoid();
  }
  const p=UN.pool[k];
  if(p.length){ const o=p.pop(); o.visible=true; return o; }
  const o=makeRig(UN.RIG[k]); o.userData.ukind=k;
  if(k==="archer") o.userData.rig.bowPose=true;
  return o;
}
function unEnsureRig(s,k){
  const o=s.obj, cur=o.userData.ukind||"guard";
  if(cur===k){ s.rigKind=k; return; }
  unReleaseRig(o);
  const n=unTakeRig(k);
  n.position.copy(o.position); n.rotation.y=o.rotation.y; n.visible=true;
  world.add(n); s.obj=n; s.rigKind=k;
}
function unApplyKind(s,k){ s.kind=k; s.grp=(k==="archer")?"rng":"inf"; unEnsureRig(s,k); }

/* ── الأوامر لكل مجموعة ── */
function unInitOrders(){
  const m=(G.order==="follow"||G.order==="hold")?G.order:"guard";
  G.orders={ inf:{mode:m,at:G.holdAt||null}, rng:{mode:m,at:G.holdAt||null} };
  if(!G.group) G.group="all";
  return G.orders;
}
function unCentroid(id){
  let n=0,x=0,z=0; const sl=G.soldiers;
  for(let i=0;i<sl.length;i++){ const s=sl[i]; if(s.dead>0||unGrpOf(s)!==id) continue; n++; x+=s.x; z+=s.z; }
  return n ? {x:x/n, z:z/n} : {x:G.hero.x, z:G.hero.z};
}
function unMarker(g){
  let m=UN.mark[g];
  if(!m){
    m=new THREE.Mesh(new THREE.RingGeometry(1.7,2.3,28),
      new THREE.MeshBasicMaterial({color:g==="inf"?0xF5C25B:0x7FD6C0, transparent:true, opacity:.7, side:THREE.DoubleSide, depthWrite:false}));
    m.rotation.x=-Math.PI/2; m.visible=false; UN.mark[g]=m;
  }
  return m;
}
function unPlaceMarkers(){
  const O=G.orders; if(!O) return;
  for(let i=0;i<UN.GIDS.length;i++){
    const g=UN.GIDS[i], od=O[g], m=unMarker(g);
    let x=0, z=0, on=false;
    if((od.mode==="point"||od.mode==="hold")&&od.at){ x=od.at.x; z=od.at.z; on=true; }
    else if(od.mode==="defend"&&od.at&&G.buildings.indexOf(od.at)>=0){ x=od.at.x; z=od.at.z; on=true; }
    if(!on){ m.visible=false; continue; }
    if(m.parent!==world) world.add(m);
    m.position.set(x, terrainY(x,z)+.5, z); m.visible=true;
  }
}
function unGroupName(){ const g=G.group||"all"; return g==="inf"?"المشاة":g==="rng"?"الرماة":"كل الجنود"; }
function unApplyOrder(mode, at){
  const O=G.orders||unInitOrders(), g=G.group||"all";
  for(let i=0;i<UN.GIDS.length;i++){
    const id=UN.GIDS[i]; if(g!=="all"&&g!==id) continue;
    const od=O[id]; od.mode=mode;
    od.at = mode==="hold" ? unCentroid(id) : (mode==="point"||mode==="defend") ? at : null;
  }
  if(mode==="follow"||mode==="hold"||mode==="guard") G.order=mode;
  unPlaceMarkers();
}
function unArmPoint(v){
  const po = v==="point" ? "move" : "defend";
  if(G.pointOrder===po){ G.pointOrder=null; log("أُلغي تحديد النقطة."); refresh(); return; }
  G.pointOrder=po;
  log(po==="move" ? "اضغط مطوّلاً على النقطة التي يذهب إليها الفريق." : "اضغط مطوّلاً على المبنى الذي يدافع عنه الفريق.");
  refresh();
}
/* تغليف setOrder في النواة: المفاتيح 1/2/3 تطبّق على المجموعة المختارة */
const unCoreSetOrder = setOrder;
setOrder = function(v){
  if(v==="point"||v==="defend"){ unArmPoint(v); return; }
  if(v!=="follow"&&v!=="hold"&&v!=="guard"&&v!=="retreat"){ unCoreSetOrder(v); return; }
  G.pointOrder=null;
  if(v==="hold") G.holdAt={x:G.hero.x, z:G.hero.z};
  unApplyOrder(v, null);
  log(unGroupName()+" "+(v==="follow"?"يتبعونك.":v==="hold"?"ثبتوا في مواضعهم.":v==="retreat"?"يتراجعون إلى فناء القلعة.":"عادوا إلى ثكناتهم."));
  refresh();
};
/* الضغط المطوّل: يستهلك النقطة فقط إن كان أمر نقطة/دفاع مسلَّحاً — وإلا لا يفعل شيئاً */
HOOKS.longPress.push(function(p){
  const po=G.pointOrder; if(!po) return;
  G.pointOrder=null; G.lpUsed=true;
  if(!p){ log("لم تُحدَّد نقطة صالحة."); refresh(); return; }
  if(po==="defend"){
    let best=null, bd=8;
    for(let i=0;i<G.buildings.length;i++){ const b=G.buildings[i]; const d=dist2(p.x,p.z,b.x,b.z); if(d<bd){ bd=d; best=b; } }
    if(best){ unApplyOrder("defend", best); log(unGroupName()+" يدافعون عن "+B[best.type].name+"."); }
    else if(dist2(p.x,p.z,0,0)<36){ unApplyOrder("retreat", null); log(unGroupName()+" يدافعون عن القلعة من فنائها."); }
    else { unApplyOrder("defend", null); log("لا مبنى هنا — "+unGroupName()+" يدافعون عن أقرب مبنى."); }
  } else {
    unApplyOrder("point", {x:p.x, z:p.z});
    log(unGroupName()+" يتجهون إلى النقطة.");
  }
  refresh();
});

/* ── هدف الدفاع: المبنى المختار أو أقرب مبنى (يُعاد التقييم كل ثانيتين) ── */
function unDefendTarget(s, od, dt){
  const at=od.at;
  if(at && G.buildings.indexOf(at)>=0) return at;
  s.dT=(s.dT||0)-dt;
  if(s.dT<=0 || !s.dB || G.buildings.indexOf(s.dB)<0){
    s.dT=2; let best=s.home, bd=1e9; const bl=G.buildings;
    for(let i=0;i<bl.length;i++){ const b=bl[i]; const d=dist2(s.x,s.z,b.x,b.z); if(d<bd){ bd=d; best=b; } }
    s.dB=best;
  }
  return s.dB;
}

/* ── سلوك الجندي (يتولّى كل شيء ويعيد true) — بلا تخصيص ذاكرة في الإطار ── */
function soldierBehavior(s, dt, h){
  const b=s.home, k=unitKind(b);
  if(s.kind!==k) unApplyKind(s,k);
  else if((s.obj.userData.ukind||"guard")!==k) unEnsureRig(s,k);
  const U=UNITS[k], O=G.orders||unInitOrders(), od=O[s.grp], mode=od.mode;
  const ci=Math.cos(s.i*2.1), si=Math.sin(s.i*2.1);
  let tx, tz, leash;
  if(mode==="follow"){ tx=h.x+ci*(U.ranged?9.6:8); tz=h.z+si*(U.ranged?8.6:7.2); leash=999; }
  else if((mode==="hold"||mode==="point")&&od.at){ tx=od.at.x+ci*7.5; tz=od.at.z+si*6.8; leash=38; }
  else if(mode==="defend"){ const db=unDefendTarget(s,od,dt), a=G.t*.3+s.i*2.1; tx=db.x+Math.cos(a)*8; tz=db.z+Math.sin(a)*8; leash=38; }
  else if(mode==="retreat"){ const a=Math.atan2(b.z,b.x)+(s.i-2)*.4; tx=Math.cos(a)*30; tz=Math.sin(a)*30; leash=32; }
  else { tx=b.x+ci*7.2; tz=b.z+6+si*4.4; leash=48; }

  /* اختيار الهدف: أقرب عدو إلى الجندي ضمن مقود المرساة؛ المشاة لا تطارد الطائر (إلا الرمّاح) */
  const melee=!U.ranged, reach=!!U.reach, en=G.enemies;
  let tgt=null, tb=1e9, ne=null, nd=1e9;
  for(let i=0;i<en.length;i++){
    const e=en[i]; if(e.hp<=0) continue;
    const ds=dist2(s.x,s.z,e.x,e.z); if(ds<nd){ nd=ds; ne=e; }
    if(melee && !reach && E[e.t].fly) continue;
    if(ds<tb && dist2(tx,tz,e.x,e.z)<leash){ tb=ds; tgt=e; }
  }
  let mul=1;
  if(tgt){ const C=U.counters; for(let i=0;i<C.length;i++) if(C[i]===tgt.t){ mul=U.cmul; break; } }
  const rally=(has("rally") && dist2(s.x,s.z,h.x,h.z)<9) ? 1.3 : 1;
  let moving=false;
  s.atk-=dt;
  if(melee){
    let gx=tx, gz=tz, stop=1.2;
    if(tgt){ gx=tgt.x; gz=tgt.z; stop=Math.max(1.2, U.range-.8+tgt.r); }
    const d=dist2(s.x,s.z,gx,gz);
    if(d>stop){ const kk=Math.min(1, s.sp*dt/d); s.x+=(gx-s.x)*kk; s.z+=(gz-s.z)*kk; moving=true; s.obj.rotation.y=Math.atan2(gx-s.x,gz-s.z); }
    else if(tgt) s.obj.rotation.y=Math.atan2(gx-s.x,gz-s.z);
    if(tgt && s.atk<=0 && tb<U.range+tgt.r+.3){
      s.atk=U.rate; s.swing=1; hurt(tgt, s.dmg*mul*rally); poof(tgt.x,tgt.z,0xBFD8FF,1);
    }
  } else {
    if(ne && nd<7){   // رامٍ: ابتعد عن أقرب عدو
      const al=nd||1; s.x+=(s.x-ne.x)/al*s.sp*dt; s.z+=(s.z-ne.z)/al*s.sp*dt; moving=true;
      s.obj.rotation.y=Math.atan2(ne.x-s.x,ne.z-s.z);
    } else if(tgt){
      if(tb>U.range*.92){ const kk=Math.min(1, s.sp*dt/tb); s.x+=(tgt.x-s.x)*kk; s.z+=(tgt.z-s.z)*kk; moving=true; }
      s.obj.rotation.y=Math.atan2(tgt.x-s.x,tgt.z-s.z);
    } else {
      const d=dist2(s.x,s.z,tx,tz);
      if(d>1.2){ const kk=Math.min(1, s.sp*dt/d); s.x+=(tx-s.x)*kk; s.z+=(tz-s.z)*kk; moving=true; s.obj.rotation.y=Math.atan2(tx-s.x,tz-s.z); }
    }
    if(tgt && s.atk<=0 && tb<U.range+tgt.r){
      s.atk=U.rate; s.swing=1;
      G.shots.push({ x:s.x, y:terrainY(s.x,s.z)+3.4, z:s.z, tx:tgt.x, tz:tgt.z, e:tgt, dmg:s.dmg*mul*rally, sp:58 });
      SFX.shoot();
    }
  }
  if(moving) keepIn(s);
  s.moving=moving;
  s.obj.position.set(s.x, terrainY(s.x,s.z), s.z);
  s.swing=Math.max(0,(s.swing||0)-dt*3.2);
  poseRig(s.obj, G.t+s.i*.7, moving, s.swing);
  return true;
}

/* ── شريط الأوامر: رقائق المجموعات + أزرار الأوامر (يُبنى عند refresh فقط) ── */
function renderOrders(el){
  UN.chips=null;
  if(!G.soldiers.length) return;
  const O=G.orders||unInitOrders(), g=G.group||(G.group="all");
  let all=0, inf=0, rng=0;
  for(let i=0;i<G.soldiers.length;i++){ const s=G.soldiers[i]; if(s.dead>0) continue; all++; if(unGrpOf(s)==="rng") rng++; else inf++; }
  UN.cnt.all=all; UN.cnt.inf=inf; UN.cnt.rng=rng; UN.chips={};
  for(const gd of UN.GROUPS){
    const bt=document.createElement("button"); bt.className="ghost grp"; bt.title=gd.t;
    bt.textContent=gd.n+" "+UN.cnt[gd.id];
    bt.setAttribute("aria-pressed", g===gd.id);
    bt.onclick=()=>{ G.group=gd.id; G.pointOrder=null; refresh(); };
    el.appendChild(bt); UN.chips[gd.id]=bt;
  }
  const sep=document.createElement("span"); sep.className="sep"; el.appendChild(sep);
  const cur = g==="all" ? (O.inf.mode===O.rng.mode ? O.inf.mode : "") : O[g].mode;
  for(const o of UN.ORDERS){
    const bt=document.createElement("button"); bt.className="ghost ord"; bt.title=o.t;
    bt.textContent=(o.key&&!MOBILE) ? `${o.n} (${o.key})` : o.n;
    bt.setAttribute("aria-pressed", cur===o.id);
    if((o.id==="point"&&G.pointOrder==="move")||(o.id==="defend"&&G.pointOrder==="defend")) bt.classList.add("armed");
    bt.onclick=()=>setOrder(o.id);
    el.appendChild(bt);
  }
  if(G.pointOrder){
    const hint=document.createElement("span"); hint.className="ohint";
    hint.textContent = G.pointOrder==="move" ? "اضغط مطوّلاً على الأرض" : "اضغط مطوّلاً على مبنى";
    el.appendChild(hint);
  }
}

/* ── نبضة: أعداد الرقائق (كتابة DOM عند التغيّر فقط)، صلاحية هدف الدفاع، تصفير الأوامر عند تغيّر المرحلة ── */
HOOKS.tick.push(function(dt){
  UN.ct+=dt; if(UN.ct<.3) return; UN.ct=0;
  if(UN.stage!==G.stage){
    UN.stage=G.stage; G.pointOrder=null;
    if(G.orders){ for(let i=0;i<UN.GIDS.length;i++){ const od=G.orders[UN.GIDS[i]]; od.mode="guard"; od.at=null; } unPlaceMarkers(); }
  }
  const O=G.orders;
  if(O){
    let dirty=false;
    for(let i=0;i<UN.GIDS.length;i++){ const od=O[UN.GIDS[i]]; if(od.mode==="defend"&&od.at&&G.buildings.indexOf(od.at)<0){ od.at=null; dirty=true; } }
    if(dirty) unPlaceMarkers();
  }
  const ch=UN.chips; if(!ch) return;
  let all=0, inf=0, rng=0; const sl=G.soldiers;
  for(let i=0;i<sl.length;i++){ const s=sl[i]; if(s.dead>0) continue; all++; if(unGrpOf(s)==="rng") rng++; else inf++; }
  if(all!==UN.cnt.all){ UN.cnt.all=all; ch.all.textContent="الكل "+all; }
  if(inf!==UN.cnt.inf){ UN.cnt.inf=inf; ch.inf.textContent="مشاة "+inf; }
  if(rng!==UN.cnt.rng){ UN.cnt.rng=rng; ch.rng.textContent="رماة "+rng; }
});

/* ── ملخّص الوحدات لقائمة الإيقاف (تستهلكه وحدة الواجهة) ── */
function unitSummary(){
  const out=[], idx={};
  for(let i=0;i<G.soldiers.length;i++){
    const s=G.soldiers[i], k=s.kind||unitKind(s.home), U=UNITS[k];
    let r=idx[k];
    if(!r){ r={ id:k, name:U.name, alive:0, total:0, hp:0, dmg:0, range:U.range, rate:U.rate }; idx[k]=r; out.push(r); }
    r.total++; if(s.dead<=0) r.alive++;
    if(Math.round(s.max)>r.hp) r.hp=Math.round(s.max);
    if(Math.round(s.dmg)>r.dmg) r.dmg=Math.round(s.dmg);
  }
  return out;
}

/* ── أدوات فحص (ملفات الاختبار فقط: window.__d يُعرَّف بعد الوحدات، لذا نؤجّل) ── */
setTimeout(function(){
  if(typeof window==="undefined" || !window.__d) return;
  window.__d.units = {
    makeBarracks:(i)=>{
      const sel=SLOTS[i]; if(!sel||sel.b||sel.kind==="castle") return -1;
      const b={ type:"barracks", x:sel.x, z:sel.z, lv:1, branch:null, cd:0, hp:0, max:0, slot:sel, alert:0, flash:0 };
      b.max=maxHp(b); b.hp=b.max;
      b.obj=mkBuilding("barracks",1,null); b.obj.position.set(sel.x,terrainY(sel.x,sel.z),sel.z);
      b.obj.rotation.y=Math.atan2(-sel.x,-sel.z);
      world.add(b.obj); freeze(b.obj); sel.b=b; G.buildings.push(b); spawnSquad(b);
      G.stat.built++; for(const f of HOOKS.build) f(b); refresh(); return G.buildings.length-1;
    },
    upgrade:(i,branch)=>{ if(G.silver<1000) G.silver=1000; upgrade(G.buildings[i],branch); },
    orders:()=>{ const O=G.orders; if(!O) return null; const cp=(od)=>({ mode:od.mode, at: od.at ? (od.at.type ? {b:G.buildings.indexOf(od.at), type:od.at.type} : {x:od.at.x, z:od.at.z}) : null });
      return { inf:cp(O.inf), rng:cp(O.rng), group:G.group||"all", point:G.pointOrder||null, order:G.order }; },
    group:(g)=>{ G.group=g; refresh(); },
    stats:(i)=>unitStats(G.buildings[i]),
    summary:()=>unitSummary(),
    soldiers:()=>G.soldiers.map(s=>({ kind:s.kind||null, rig:s.obj.userData.ukind||"guard", x:s.x, z:s.z, hp:s.hp, dead:s.dead, home:G.buildings.indexOf(s.home), grp:s.grp||null })),
    enemies:()=>G.enemies.map(e=>({ t:e.t, hp:e.hp, max:e.max, x:e.x, z:e.z })),
    shots:()=>G.shots.length,
    slotWorld:(i)=>({ x:SLOTS[i].x, z:SLOTS[i].z, kind:SLOTS[i].kind, taken:!!SLOTS[i].b }),
    proj:(x,z)=>{ const p=project(x,terrainY(x,z),z); return { x:p.x, y:p.y, vis:p.vis }; },
    longPress:(x,z)=>{ for(const f of HOOKS.longPress) f({x, y:0, z}, null); },
    branches:()=>B.barracks.branches.map(b=>b.n),
    units:()=>Object.keys(UNITS)
  };
}, 0);
