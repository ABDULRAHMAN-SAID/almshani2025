/* ══════════════════ الأسلحة والبركات والمعدِّلات (m_weapons) ══════════════════ */
/* WeaponDefinition: هجوم سلبي آلي (القائد يضرب وحده عندما يقترب خصم) + قدرة نشطة على زر «نداء» / مسافة.
   كل أرقام التوازن هنا في الجداول لا في الكود. */
WEAPONS.sword = { id:"sword", name:"سيف الحرب", d:"ضربات واسعة تصيب عدة أعداء", unlockMap:0,
  passive:{ name:"الضربة الواسعة", d:"ضربة بطيئة تصيب حتى ثلاثة أعداء", range:9, cd:.75, dmg:46, cleave:{ n:2, r:5, k:.6 } },
  active:{ name:"الدوّامة", d:"دورة كاملة تصعق كل من حولك", cd:14, dmg:95, r:11, stun:.6 } };
WEAPONS.spear = { id:"spear", name:"رمح الصياد", d:"طعنات سريعة تمزّق السريعين", unlockMap:1,
  passive:{ name:"الطعنة", d:"طعن سريع، أقوى ضد السريعين", range:10, cd:.34, dmg:21, fastMul:1.6 },
  active:{ name:"الاندفاعة", d:"اندفاع يجرح ويبطئ من في طريقك", cd:10, dmg:60, len:18, r:5.5, slow:3 } };
WEAPONS.bow = { id:"bow", name:"قوس الحارس", d:"رمي بعيد من مسافة آمنة", unlockMap:2,
  passive:{ name:"الرمية", d:"سهم بعيد المدى", range:40, cd:.55, dmg:27, shotSp:90 },
  active:{ name:"سهم الاختراق", d:"سهم يخترق صفاً كاملاً", cd:12, dmg:120, len:40, r:4 } };

/* PerkDefinition: apply(MOD) يعدّل المعدِّلات عند applyLoadout() */
PERKS.accountant = { id:"accountant", name:"محاسب المملكة", d:"+12 ذهباً إضافياً عند كل فجر", apply:(M)=>{} };
PERKS.arrows     = { id:"arrows",     name:"السهام المحسنة", d:"+15% مدى الأبراج", apply:(M)=>{ M.towerRange*=1.15; } };
PERKS.warrior    = { id:"warrior",    name:"الملك المحارب", d:"+35% ضرر القائد، −10% ضرر الأبراج", apply:(M)=>{ M.heroDmg*=1.35; M.towerDmg*=.9; } };
PERKS.captain    = { id:"captain",    name:"قائد الصفوف", d:"الجنود أسرع 25% وأقوى 10%", apply:(M)=>{ M.unitSpeed*=1.25; M.unitDmg*=1.1; } };
PERKS.architect  = { id:"architect",  name:"المعماري", d:"+40% صلابة الأسوار", apply:(M)=>{ M.wallHp*=1.4; } };
PERKS.dawn       = { id:"dawn",       name:"بركة الفجر", d:"الحصن يستعيد حياةً عند كل فجر", apply:(M)=>{ M.dawnHeal=140; } };

/* MutatorDefinition: score يضربه applyLoadout() في MOD.score تلقائياً */
MUTATORS.double  = { id:"double",  name:"ليلة مزدوجة", d:"أعداء أكثر بـ40% كل ليلة", score:1.5,  apply:(M)=>{ M.waveMul*=1.4; } };
MUTATORS.nowalls = { id:"nowalls", name:"لا جدران",     d:"ممنوع بناء الأسوار",        score:1.35, apply:(M)=>{ M.noWalls=true; } };
MUTATORS.fast    = { id:"fast",    name:"الأعداء أسرع", d:"سرعة الأعداء +25%",          score:1.3,  apply:(M)=>{ M.enemySpeed*=1.25; } };

const WP_FAST = (e)=> e.t==="runner" || !!E[e.t].fly;
function wpWeapon(){ return WEAPONS[LOADOUT.weapon] || WEAPONS.sword; }
function wpHeroMul(){ return MOD.heroDmg*(has("hero")?1.4:1); }

/* إبطاء: النواة تحسب الحركة من e.sp مباشرة، فنُخزّن الأصل في e.spBase ونُنصّف e.sp ما دام e.slow>0 */
function wpSlow(e, sec){
  if(!(e.slow>0)){ e.spBase=e.sp; e.sp=e.sp*.5; e.slow=sec; }
  else if(e.slow<sec) e.slow=sec;
}
HOOKS.tick.push(function(dt){
  const es=G.enemies;
  for(let i=0;i<es.length;i++){
    const e=es[i]; if(!(e.slow>0)) continue;
    e.slow-=dt;
    if(e.slow<=0){ e.slow=0; e.sp=e.spBase; }
    else if(e.sp!==e.spBase*.5) e.spBase=e.sp*2;   // غيّر غيرنا e.sp (طور الزعيم مثلاً) — نحافظ على النسبة
  }
});
/* محاسب المملكة: +12 ذهباً ثابتة عند كل فجر ما دامت البركة مجهّزة */
HOOKS.dawn.push(function(){
  if(!LOADOUT.perks || !LOADOUT.perks.includes("accountant")) return;
  dropGold(0,12,12); G.night.income+=12; G.stat.gold+=12;
});

/* الهجوم السلبي للقائد — بديل كامل لهجوم النواة */
function heroCombat(h, dt){
  const W=wpWeapon(), P=W.passive;
  let lock=G.lock;
  if(lock && (lock.hp<=0 || !G.enemies.includes(lock))){ G.lock=null; lock=null; }
  if(h.atkCd>0) return;
  let tgt=null;
  if(lock && dist2(h.x,h.z,lock.x,lock.z)<P.range) tgt=lock;
  else {
    let bd = SET.autoTarget ? P.range : Math.min(P.range,4);
    const es=G.enemies;
    for(let i=0;i<es.length;i++){ const e=es[i], d=dist2(h.x,h.z,e.x,e.z); if(d<bd){ bd=d; tgt=e; } }
  }
  if(!tgt) return;
  if(!h.moving) h.dir=Math.atan2(tgt.x-h.x, tgt.z-h.z);
  h.atkCd=P.cd; h.swing=1;
  const mul=wpHeroMul();
  if(W.id==="bow"){
    G.shots.push({ x:h.x, y:terrainY(h.x,h.z)+4, z:h.z, tx:tgt.x, tz:tgt.z, e:tgt, dmg:P.dmg*mul, sp:P.shotSp });
    SFX.shoot(); return;
  }
  let dm=P.dmg*mul;
  if(P.fastMul && WP_FAST(tgt)) dm*=P.fastMul;
  hurt(tgt,dm); poof(tgt.x,tgt.z,0x8FE3C8,2); SFX.hit();
  if(P.cleave){
    const es=G.enemies; let n=0;
    for(let i=0;i<es.length && n<P.cleave.n;i++){
      const e=es[i]; if(e===tgt) continue;
      if(dist2(e.x,e.z,tgt.x,tgt.z)<P.cleave.r){ hurt(e,P.dmg*mul*P.cleave.k); poof(e.x,e.z,0x8FE3C8,1); n++; }
    }
  }
}

/* القدرة النشطة — زر «نداء» أو مسافة (النواة تتحقق من h.ab قبل النداء) */
function weaponActive(h){
  const W=wpWeapon(), A=W.active, es=G.enemies, mul=wpHeroMul();
  const dx=Math.sin(h.dir), dz=Math.cos(h.dir);
  h.ab=A.cd; h.swing=1; SFX.ability();
  if(W.id==="sword"){
    for(let i=0;i<es.length;i++){ const e=es[i];
      if(dist2(h.x,h.z,e.x,e.z)<A.r){ hurt(e,A.dmg*mul); if(e.stun<A.stun) e.stun=A.stun; poof(e.x,e.z,0xF5C25B,4); } }
    G.fx.push({ring:true,x:h.x,z:h.z,age:0,life:.6});
    G.shake=reduced?0:.35;
    log("الدوّامة: دورة كاملة تصعق كل من حولك.");
  } else if(W.id==="spear"){
    const R=A.len, ox=h.x, oz=h.z;
    h.x+=dx*R; h.z+=dz*R; keepIn(h);
    for(let i=0;i<es.length;i++){ const e=es[i];
      const t=clamp(((e.x-ox)*dx+(e.z-oz)*dz)/R,0,1), px=ox+dx*R*t, pz=oz+dz*R*t;
      if(dist2(e.x,e.z,px,pz)<A.r){ hurt(e,A.dmg*mul); wpSlow(e,A.slow); poof(e.x,e.z,0x8FE3C8,3); } }
    for(let i=0;i<7;i++) poof(ox+dx*R*(i/7), oz+dz*R*(i/7), 0xF5C25B, 2);
    log("الاندفاعة: اندفاع يجرح ويبطئ كل من في طريقك.");
  } else {
    const R=A.len, ox=h.x, oz=h.z;
    for(let i=0;i<es.length;i++){ const e=es[i];
      const t=clamp(((e.x-ox)*dx+(e.z-oz)*dz)/R,0,1), px=ox+dx*R*t, pz=oz+dz*R*t;
      if(dist2(e.x,e.z,px,pz)<A.r){ hurt(e,A.dmg*mul); poof(e.x,e.z,0xF5C25B,3); } }
    for(let i=1;i<=7;i++) poof(ox+dx*R*(i/7), oz+dz*R*(i/7), 0xF5C25B, 2);
    SFX.shoot();
    log("سهم الاختراق: سهم يخترق الصف كاملاً.");
  }
}

/* هيكل القائد حسب السلاح — يُبنى مرة واحدة لكل سلاح ويُعاد استخدامه */
const WP_RIGS={};
function wpBuildRig(id){
  const o={ h:5.6, cloth:0x2A4E86, cloth2:0x22406E, skin:0xE8B98C, beard:0x4A2E1A, metal:0xA3ADBB, metal2:0x5C6672,
    accent:0xC4483B, armored:true, helm:true, plume:true, cape:0x2E63A8, emblem:true, tabard:0x1E3A6E };
  if(id==="bow") o.bow=true;
  else { o.weapon = id==="spear" ? "spear" : "sword"; if(id==="sword") o.shield="round"; }
  const rig=makeRig(o);
  if(id==="bow") rig.userData.rig.bowPose=true;
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.28,30),
    new THREE.MeshBasicMaterial({color:0xF5C25B, transparent:true, opacity:.8, side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.y=.06; rig.add(ring);
  rig.userData.weaponId=id;
  return rig;
}
function wpLabel(W){
  const b=document.querySelector("#abil1 b"), btn=document.getElementById("abil1");
  if(b && b.textContent!==W.active.name) b.textContent=W.active.name;
  if(btn){ const t=`${W.active.name} — ${W.active.d} (مسافة)`; if(btn.title!==t) btn.title=t; }
}
function onLoadoutApplied(){
  if(!WEAPONS[LOADOUT.weapon]) LOADOUT.weapon="sword";
  const W=wpWeapon();
  if(G.heroObj){
    const old=G.heroObj;
    if(!old.userData.weaponId){ old.userData.weaponId="sword"; WP_RIGS.sword=old; }   // هيكل الإقلاع (mkHumanoid("hero")) يحمل سيفاً
    if(old.userData.weaponId!==W.id){
      const rig=WP_RIGS[W.id]||(WP_RIGS[W.id]=wpBuildRig(W.id));
      world.remove(old);
      rig.position.copy(old.position); rig.rotation.y=old.rotation.y; rig.visible=old.visible;
      G.heroObj=rig; world.add(rig);
    }
  }
  wpLabel(W);
}
/* تهيئة: نمط الزر (اسم القدرة قد يمتد سطرين داخل الدائرة) + الاسم الافتراضي */
document.getElementById("stageBox").insertAdjacentHTML("beforeend",
  `<style>#abil1 b{font-size:11.5px;line-height:1.15;padding:0 4px;white-space:normal;text-align:center;max-width:100%}</style>`);
wpLabel(wpWeapon());
