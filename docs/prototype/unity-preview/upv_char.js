/* ═══════════ أهل المملكة: بطل وجنود وقرويّون وخيل ═══════════
   كلّها مبنيّة إجرائياً من نفس أدوات البناء (أنبوب، كتلة، مِنشور، مِخرطة) —
   لا أصل مأخوذ من أي مصدر خارجي.

   القاعدة الحاكمة للشكل: على بُعد كاميرا الاستراتيجية لا تُقرأ التفاصيل
   التشريحية، بل **الصورة الظلّية**: الخوذة، والمنكبان، والدرع، والرمح، والعباءة.
   لذلك تُبنى هذه بارزةً واضحة، ويُترك الوجه والأصابع.

   الشخصية تُبنى بارتفاع 1.0 ثم تُقاس عند الوضع، فتُضبط الأحجام في مكان واحد. */

/* ═══ أرقام المفاصل ═══
   كل رأس يحمل رقم مفصله، والمُظلِّل يدير المفصل حول محوره فتتحرّك الشخصية على
   بطاقة الرسم. المفاصل الكرويّة تُسنَد إلى الطرف **الأب** فتبقى ثابتة وتغطّي
   الفجوة عند دوران الابن — بهذا لا تتمزّق الشبكة عند الكتف والركبة. */
const LIMB = {
  ROOT:0, CHEST:1, HEAD:2,
  ARM_LU:3, ARM_LL:4, ARM_RU:5, ARM_RL:6,
  LEG_LU:7, LEG_LL:8, LEG_RU:9, LEG_RL:10,
  CAPE:11
};
/* محاور الدوران بوحدات البناء (ارتفاع الشخصية 1.0) — واحدة لكل الأصناف
   لأنّها تُبنى بنفس النِّسَب، فتكفي جدولٌ ثابت في المُظلِّل. */
const LIMB_PIVOT = [
  [0,0,0], [0,0.52,0], [0,0.83,0],
  [-0.112,0.780,0], [-0.123,0.640,0.100],
  [ 0.112,0.780,0], [ 0.114,0.640,0.045],
  [-0.055,0.500,0], [-0.055,0.265,0.012],
  [ 0.055,0.500,0], [ 0.055,0.265,0.012],
  [0,0.830,-0.058]
];
/* الأب لكل مفصل: الساعد يتبع العضد، والعضد يتبع الصدر. -1 = لا أب. */
const LIMB_PARENT = [-1, -1, 1, 1, 3, 1, 5, -1, 7, -1, 9, 1];

const CH = {
  skin:[0.741,0.549,0.404], skinDark:[0.639,0.451,0.322],
  leather:[0.361,0.239,0.157], leatherDark:[0.259,0.169,0.110],
  wood:[0.451,0.318,0.196],
  steel:[0.639,0.663,0.694], steelDark:[0.478,0.502,0.533],
  gold:[0.788,0.627,0.271],
  cloth:[1,1,1]                 // القماش أبيض في الشبكة ويُصبغ بلون النسخة
};

/* مفصل ثم عظم: أنبوبان بينهما كتلة كرويّة فلا تنكسر الحافّة عند الركبة والمرفق */
function chLimb(M, a, b, c, r0, r1, r2, sides){
  M.tube(a, b, r0, r1, sides||7, 1, 0,0,0);
  M.blob(b, [r1*1.12, r1*1.12, r1*1.12], 4, sides||7, 0, 7);
  M.tube(b, c, r1, r2, sides||7, 1, 0,0,0);
}

/* جذع: مقطع بيضويّ يُكنس من الحوض إلى المنكبين فيتّسع عند الصدر */
function chTorso(M, hipY, shoulderY, hipW, chestW, depth){
  const start=M.p.length/3, RINGS=6, SEGS=12;
  for(let r=0;r<=RINGS;r++){
    const t=r/RINGS, y=hipY+(shoulderY-hipY)*t;
    // أعرض عند الصدر (t≈0.72) ثم يضيق قليلاً عند المنكبين
    const w = hipW + (chestW-hipW)*Math.sin(Math.min(1,t*1.25)*Math.PI*0.62);
    const d = depth*(0.86+0.24*Math.sin(t*Math.PI*0.9));
    for(let q=0;q<=SEGS;q++){
      const a=q/SEGS*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
      const px=ca*w, pz=sa*d;
      const nx=ca/Math.max(w,1e-4), nz=sa/Math.max(d,1e-4);
      const nl=Math.hypot(nx,nz)||1;
      M.v(px, y, pz, nx/nl, 0.12, nz/nl, q/SEGS*2.4, t*2.2, 0, 0);
    }
  }
  const stride=SEGS+1;
  for(let r=0;r<RINGS;r++) for(let q=0;q<SEGS;q++){
    const i=start+r*stride+q; M.quad(i, i+1, i+stride+1, i+stride);
  }
}

/* عباءة: شريحة تنسدل من المنكبين وتتّسع نحو الأسفل وتتموّج قليلاً */
function chCape(M, topY, botY, topW, botW, back, seed){
  const start=M.p.length/3, RINGS=7, SEGS=9;
  let s=seed>>>0; const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; };
  const wob=rnd()*6.28;
  for(let r=0;r<=RINGS;r++){
    const t=r/RINGS, y=topY+(botY-topY)*t;
    const w=topW+(botW-topW)*t;
    for(let q=0;q<=SEGS;q++){
      const u=q/SEGS, a=(u-0.5)*Math.PI*1.32;
      const fold=Math.sin(u*Math.PI*5+wob)*0.016*t;
      const px=Math.sin(a)*w;
      const pz=back + (1-Math.cos(a))*w*0.55 + fold;
      const nx=Math.sin(a)*0.4, nz=-Math.cos(a);
      const nl=Math.hypot(nx,nz)||1;
      M.v(px, y, pz, nx/nl, 0.10, nz/nl, u*1.6, t*2.0, 0, 0.22*t*t);
    }
  }
  const stride=SEGS+1;
  for(let r=0;r<RINGS;r++) for(let q=0;q<SEGS;q++){
    const i=start+r*stride+q; M.quad(i, i+stride, i+stride+1, i+1);
    M.quad(i, i+1, i+stride+1, i+stride);          // وجهان: تُرى من الجانبين
  }
}

/* خوذة: قبّة مخروطة بحافّة، وقناع أنف، وعُرف اختياري */
function chHelm(M, cy, r, style, crestColor){
  M.setColor(CH.steel[0], CH.steel[1], CH.steel[2]);
  if(style==='conical'){
    M.lathe(0, cy-r*0.9, 0, [[r*1.02,0],[r*1.05,r*0.24],[r*0.86,r*0.95],[r*0.42,r*1.5],[0,r*1.9]], 12, 1.4, false);
  } else if(style==='kettle'){
    M.lathe(0, cy-r*0.9, 0, [[r*1.34,0],[r*1.30,r*0.16],[r*1.02,r*0.30],[r*0.94,r*0.9],[r*0.5,r*1.28],[0,r*1.38]], 12, 1.4, false);
  } else if(style==='great'){    // خوذة البطل: أعلى وبقناع
    M.lathe(0, cy-r*1.0, 0, [[r*1.06,0],[r*1.10,r*0.30],[r*1.02,r*1.0],[r*0.66,r*1.62],[r*0.22,r*1.92],[0,r*1.98]], 14, 1.4, false);
    M.setColor(CH.steelDark[0], CH.steelDark[1], CH.steelDark[2]);
    M.tube([0, cy+r*0.10, r*0.86], [0, cy-r*0.55, r*0.98], r*0.13, r*0.09, 5, 1, 0,0,0);   // قناع الأنف
  } else { return; }
  M.setColor(CH.steelDark[0], CH.steelDark[1], CH.steelDark[2]);
  M.lathe(0, cy-r*0.92, 0, [[r*1.12,0],[r*1.16,r*0.14],[r*1.10,r*0.20]], 12, 1.4, false);  // حافّة
  if(crestColor){
    M.setColor(crestColor[0], crestColor[1], crestColor[2]);
    const top=cy+r*0.98;
    for(let i=0;i<9;i++){
      const t=i/8, x=0, y=top+Math.sin(t*Math.PI)*r*0.30, z=(t-0.5)*r*1.7;
      const y2=top+Math.sin(t*Math.PI)*r*0.62;
      M.tube([x,y,z], [x,y2,z-r*0.12], r*0.075, r*0.03, 4, 1, 0, 0.5, i*0.4);
    }
  }
}

/* درع: قرص أو طُرس (كايت) بحافّة معدنية وصُرّة وسط */
function chShield(B, C, cx, cy, cz, rot, r, kite, limb){
  const M=B;
  if(limb!==undefined) C.setLimb(limb);
  const ca=Math.cos(rot), sa=Math.sin(rot);
  // الدرع رأسي والمِنشور يعمل على مستوى XZ، فيُبنى يدوياً كقرص سميك
  const SEG=kite?9:16;
  const pts=[];
  for(let i=0;i<SEG;i++){
    const a=i/SEG*Math.PI*2;
    let rx=r, ry=r;
    if(kite){ const t=(Math.cos(a)+1)/2; ry=r*(0.55+0.75*t); rx=r*0.78; }
    pts.push([Math.cos(a)*rx, Math.sin(a)*ry]);
  }
  const th=r*0.10;
  C.setColor(1,1,1);
  for(const side of [-1,1]){
    const c0=C.p.length/3;
    C.v(cx, cy, cz+side*th, 0, 0, side, 0.5,0.5, 0,0);
    for(let i=0;i<=SEG;i++){
      const q=pts[i%SEG];
      const wx=q[0]*ca, wz=q[0]*sa;
      C.v(cx+wx, cy+q[1], cz+wz+side*th, 0,0,side, 0.5+q[0]/r*0.5, 0.5+q[1]/r*0.5, 0,0);
    }
    for(let i=0;i<SEG;i++){
      if(side>0) C.t.push(c0, c0+1+i, c0+2+i);
      else C.t.push(c0, c0+2+i, c0+1+i);
    }
  }
  M.setColor(CH.steelDark[0], CH.steelDark[1], CH.steelDark[2]);
  const rim=M.p.length/3;
  for(let i=0;i<=SEG;i++){
    const q=pts[i%SEG], wx=q[0]*ca, wz=q[0]*sa;
    const nl=Math.hypot(q[0],q[1])||1;
    M.v(cx+wx, cy+q[1], cz+wz-th, q[0]/nl*ca, q[1]/nl, q[0]/nl*sa, i/SEG*2, 0, 0,0);
    M.v(cx+wx, cy+q[1], cz+wz+th, q[0]/nl*ca, q[1]/nl, q[0]/nl*sa, i/SEG*2, 1, 0,0);
  }
  for(let i=0;i<SEG;i++){
    const a=rim+i*2; M.quad(a, a+2, a+3, a+1);
  }
  M.setColor(CH.steel[0], CH.steel[1], CH.steel[2]);
  M.blob([cx, cy, cz+th*1.2], [r*0.20, r*0.20, r*0.16], 5, 9, 0, 3);   // صُرّة
}

/* أسلحة */
function chSpear(M, gx, gy, gz, len, tilt){
  const st=Math.sin(tilt), ct=Math.cos(tilt);
  const a=[gx, gy-len*0.30*ct, gz+len*0.30*st];
  const b=[gx, gy+len*0.70*ct, gz-len*0.70*st];
  M.setColor(CH.wood[0]*0.78, CH.wood[1]*0.74, CH.wood[2]*0.70);
  M.tube(a, b, 0.021, 0.018, 6, 1, 0,0,0);
  M.setColor(CH.steel[0], CH.steel[1], CH.steel[2]);
  const tip=[b[0], b[1]+len*0.16*ct, b[2]-len*0.16*st];
  M.tube(b, [b[0]+(tip[0]-b[0])*0.35, b[1]+(tip[1]-b[1])*0.35, b[2]+(tip[2]-b[2])*0.35], 0.019, 0.036, 6, 1, 0,0,0);
  M.tube([b[0]+(tip[0]-b[0])*0.35, b[1]+(tip[1]-b[1])*0.35, b[2]+(tip[2]-b[2])*0.35], tip, 0.036, 0.005, 6, 1, 0,0,0);
}
function chSword(M, gx, gy, gz, len, tilt, gilded){
  const st=Math.sin(tilt), ct=Math.cos(tilt);
  const dir=[0, ct, -st];
  const grip0=[gx, gy-len*0.10, gz];
  const guard=[gx+dir[0]*len*0.10, gy+dir[1]*len*0.10, gz+dir[2]*len*0.10];
  M.setColor(CH.leatherDark[0], CH.leatherDark[1], CH.leatherDark[2]);
  M.tube(grip0, guard, 0.016, 0.015, 5, 1, 0,0,0);
  const pom=gilded?CH.gold:CH.steelDark;
  M.setColor(pom[0], pom[1], pom[2]);
  M.blob([grip0[0], grip0[1]-0.012, grip0[2]], [0.024,0.024,0.024], 4, 7, 0, 11);
  M.tube([guard[0]-0.075, guard[1], guard[2]], [guard[0]+0.075, guard[1], guard[2]], 0.012, 0.012, 5, 1, 0,0,0);
  M.setColor(CH.steel[0], CH.steel[1], CH.steel[2]);
  const tip=[guard[0]+dir[0]*len, guard[1]+dir[1]*len, guard[2]+dir[2]*len];
  // نصل مسطّح: أنبوب مضلّع رباعي مفلطح
  const bs=M.p.length/3, W=0.030, T=0.008;
  for(let e=0;e<2;e++){
    const c=e? tip : guard, w=e? W*0.25 : W, t=e? T*0.5 : T;
    for(const [ox,oz] of [[-w,-t],[w,-t],[w,t],[-w,t]])
      M.v(c[0]+ox, c[1], c[2]+oz, ox, 0.1, oz, (ox+w)/(2*w), e*2, 0,0);
  }
  for(let i=0;i<4;i++) M.quad(bs+i, bs+(i+1)%4, bs+4+(i+1)%4, bs+4+i);
}
function chBow(M, hx, hy, hz){
  M.setColor(CH.wood[0], CH.wood[1], CH.wood[2]);
  const N=9, prev=[];
  for(let i=0;i<=N;i++){
    const t=i/N, a=(t-0.5)*2.2;
    prev.push([hx+Math.sin(a)*0.055, hy+(t-0.5)*0.52, hz-0.02+Math.cos(a)*0.055-0.055]);
  }
  for(let i=0;i<N;i++) M.tube(prev[i], prev[i+1], 0.010, 0.010, 4, 1, 0,0,0);
  M.setColor(0.86,0.84,0.78);
  M.tube(prev[0], prev[N], 0.003, 0.003, 3, 1, 0,0,0);
}

/* ── بناء شخصية بشرية كاملة ──
   شبكتان لا واحدة: **البدن** (جلد وفولاذ وجلود وخشب) لا يُصبغ أبداً، و**القماش**
   (القميص والعباءة ووجه الدرع) أبيض في الشبكة فيأخذ لون الراية لكل نسخة.
   لو كانتا شبكةً واحدة لصبغ لونُ الراية الجلدَ والفولاذ معه — ويصير الجندي
   كتلة قرمزية بلا ملامح. */
function buildHuman(seed, kind){
  const B=new MB(), C=new MB();
  let s=(seed>>>0)||1;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; };

  const hero = kind==='hero';
  const civ  = kind==='villager';
  const hipY=0.50, shY=0.815, headY=0.915, headR=0.072;
  const stanceW = 0.052 + rnd()*0.012;
  const armour = !civ;
  C.setColor(1,1,1);

  // ── الساقان: حذاء ثم ساق ثم فخذ
  for(const side of [-1,1]){
    const hx=side*stanceW;
    const up = side<0 ? LIMB.LEG_LU : LIMB.LEG_RU;
    const lo = side<0 ? LIMB.LEG_LL : LIMB.LEG_RL;
    B.setColor(CH.leatherDark[0], CH.leatherDark[1], CH.leatherDark[2]);
    B.setLimb(lo);
    B.tube([hx,0.030,0.012], [hx,0.030,0.075], 0.036, 0.026, 6, 1, 0,0,0);
    B.tube([hx,0.0,0.0], [hx,0.055,0.0], 0.040, 0.034, 6, 1, 0,0,0);
    B.setColor(civ?0.318:CH.leather[0]*0.80, civ?0.267:CH.leather[1]*0.78, civ?0.208:CH.leather[2]*0.76);
    B.tube([hx,0.055,0.0], [hx,0.265,0.012], 0.034, 0.040, 6, 1, 0,0,0);   // الساق
    B.setLimb(up);
    // كرة الركبة تُسنَد إلى الفخذ (الأب) فتبقى تغطّي الفجوة عند ثني الركبة
    B.blob([hx,0.265,0.012], [0.045,0.045,0.045], 4, 6, 0, 7);
    B.tube([hx,0.265,0.012], [hx*1.06,hipY,0.0], 0.040, 0.056, 6, 1, 0,0,0);
  }
  B.setLimb(LIMB.ROOT);
  B.setColor(civ?0.416:CH.leather[0], civ?0.345:CH.leather[1], civ?0.263:CH.leather[2]);
  B.blob([0,hipY,0], [0.098,0.062,0.070], 5, 11, 0.03, seed+3);

  // ── الجذع: قميص القماش ثم درع الصدر
  C.setLimb(LIMB.CHEST);
  chTorso(C, hipY-0.02, shY, 0.092, 0.118, 0.068);
  if(armour){
    B.setLimb(LIMB.CHEST);
    B.setColor(CH.steelDark[0], CH.steelDark[1], CH.steelDark[2]);
    chTorso(B, hipY+0.10, shY-0.005, 0.100, 0.124, 0.074);
    B.setColor(CH.steel[0], CH.steel[1], CH.steel[2]);
    // المنكب يُسنَد إلى الصدر فيغطّي فجوة الكتف عند تأرجح الذراع
    for(const side of [-1,1])
      B.blob([side*0.128, shY-0.030, 0], [0.058,0.046,0.062], 5, 11, 0.04, seed+side*17);
  }
  B.setLimb(LIMB.CHEST);
  B.setColor(CH.leatherDark[0], CH.leatherDark[1], CH.leatherDark[2]);
  chTorso(B, hipY+0.055, hipY+0.088, 0.100, 0.104, 0.076);

  // ── الذراعان: كُمّ قماش ثم كفّ
  const armR=armour?0.030:0.027;
  for(const side of [-1,1]){
    const sx=side*0.112;
    const bend = side<0 ? 0.10 : 0.045;
    const up = side<0 ? LIMB.ARM_LU : LIMB.ARM_RU;
    const lo = side<0 ? LIMB.ARM_LL : LIMB.ARM_RL;
    C.setLimb(up);
    C.tube([sx, shY-0.035, 0], [sx*1.10, shY-0.175, bend], armR, armR*0.88, 6, 1, 0,0,0);
    C.blob([sx*1.10, shY-0.175, bend], [armR*0.99, armR*0.99, armR*0.99], 4, 6, 0, 7);  // المرفق على العضد
    C.setLimb(lo);
    C.tube([sx*1.10, shY-0.175, bend], [sx*1.02, shY-0.300, bend*1.9], armR*0.88, armR*0.80, 6, 1, 0,0,0);
    B.setLimb(lo);
    B.setColor(CH.skin[0], CH.skin[1], CH.skin[2]);
    B.blob([sx*1.02, shY-0.318, bend*2.0], [0.030,0.034,0.030], 4, 8, 0.05, seed+side*29);
  }

  // ── العنق والرأس
  B.setLimb(LIMB.CHEST);
  B.setColor(CH.skinDark[0], CH.skinDark[1], CH.skinDark[2]);
  B.tube([0,shY-0.010,0], [0,shY+0.042,0], 0.030, 0.027, 6, 1, 0,0,0);
  B.setLimb(LIMB.HEAD);
  B.setColor(CH.skin[0], CH.skin[1], CH.skin[2]);
  B.blob([0,headY,0.004], [headR*0.92, headR*1.06, headR*0.94], 6, 11, 0.03, seed+41);
  if(civ){
    B.setColor(0.216,0.169,0.129);
    B.blob([0,headY+0.020,-0.004], [headR*0.95, headR*0.80, headR*0.97], 5, 11, 0.05, seed+53);
    C.setLimb(LIMB.HEAD);
    C.lathe(0, headY+headR*0.55, 0, [[headR*1.5,0],[headR*1.35,0.012],[headR*0.9,0.030],[0,0.050]], 10, 1.4, false);
  }

  // ── العتاد بحسب الصنف
  if(kind==='spear' || kind==='spear2'){
    B.setLimb(LIMB.HEAD);
    chHelm(B, headY+headR*0.55, headR, 'conical', null);
    B.setLimb(LIMB.ARM_LL);            // الرمح في القبضة اليسرى فيتأرجح معها
    chSpear(B, -0.128, shY-0.31, 0.10, 1.42, 0.055);
    B.setLimb(LIMB.ARM_RL);
    chShield(B, C, 0.150, shY-0.20, 0.028, 0.35, 0.115, false, LIMB.ARM_RL);
  } else if(kind==='sword' || kind==='sword2'){
    B.setLimb(LIMB.HEAD);
    chHelm(B, headY+headR*0.55, headR, 'kettle', null);
    B.setLimb(LIMB.ARM_RL);
    chSword(B, 0.152, shY-0.30, 0.10, 0.36, 0.30, false);
    B.setLimb(LIMB.ARM_LL);
    chShield(B, C, -0.152, shY-0.19, 0.030, -0.42, 0.135, true, LIMB.ARM_LL);
  } else if(kind==='archer'){
    C.setLimb(LIMB.HEAD);
    C.blob([0,headY+0.016,-0.006], [headR*1.12, headR*1.02, headR*1.14], 5, 11, 0.06, seed+61);
    B.setLimb(LIMB.ARM_LL);
    chBow(B, -0.136, shY-0.16, 0.10);
    B.setLimb(LIMB.CHEST);
    B.setColor(CH.leather[0], CH.leather[1], CH.leather[2]);
    B.tube([0.075, shY-0.02, -0.075], [0.115, shY-0.30, -0.045], 0.030, 0.026, 6, 1, 0,0,0);
    B.setColor(0.86,0.84,0.78);
    for(let i=0;i<5;i++){
      const ox=(i-2)*0.011;
      B.tube([0.075+ox, shY+0.02, -0.075], [0.075+ox, shY+0.075, -0.082], 0.004, 0.004, 3, 1, 0,0,0);
    }
  } else if(hero){
    B.setLimb(LIMB.HEAD);
    chHelm(B, headY+headR*0.55, headR*1.04, 'great', null);
    C.setLimb(LIMB.HEAD);
    C.setColor(1,1,1);
    // العُرف من القماش فيأخذ لون الراية
    { const top=headY+headR*0.55+headR*1.02;
      for(let i=0;i<9;i++){
        const t=i/8, y=top+Math.sin(t*Math.PI)*headR*0.30, z=(t-0.5)*headR*1.7;
        C.tube([0,y,z], [0, top+Math.sin(t*Math.PI)*headR*0.62, z-headR*0.12], 0.0075, 0.003, 4, 1, 0, 0.5, i*0.4);
      } }
    C.setLimb(LIMB.CAPE);
    chCape(C, shY+0.02, 0.115, 0.128, 0.235, -0.058, seed+71);
    B.setLimb(LIMB.CHEST);
    B.setColor(CH.gold[0], CH.gold[1], CH.gold[2]);
    chTorso(B, shY-0.055, shY-0.030, 0.106, 0.130, 0.080);
    B.setLimb(LIMB.ARM_RL);
    chSword(B, 0.160, shY-0.24, 0.09, 0.46, -0.28, true);
    B.setLimb(LIMB.ARM_LL);
    chShield(B, C, -0.160, shY-0.20, 0.030, -0.40, 0.145, true, LIMB.ARM_LL);
  }
  return { body:B, cloth:C };
}

/* ── الحصان ── */
function buildHorse(seed, barded){
  const M=new MB(), C=new MB();
  C.setColor(1,1,1);
  let s=(seed>>>0)||1;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; };
  const coat=[[0.361,0.239,0.161],[0.212,0.176,0.157],[0.529,0.404,0.271],[0.318,0.286,0.271]][(rnd()*4)|0];
  const BODY_Y=0.62;

  M.setColor(coat[0], coat[1], coat[2]);
  M.blob([0, BODY_Y, 0], [0.185, 0.215, 0.560], 7, 13, 0.05, seed+2);     // الجذع
  M.blob([0, BODY_Y+0.03, -0.30], [0.165, 0.190, 0.230], 6, 11, 0.05, seed+5);  // الكفل

  // العنق والرأس
  const neck0=[0, BODY_Y+0.10, 0.42], neck1=[0, BODY_Y+0.36, 0.60];
  M.tube(neck0, neck1, 0.135, 0.088, 9, 1, 0,0,0);
  M.blob([0, BODY_Y+0.40, 0.655], [0.070, 0.082, 0.105], 6, 11, 0.04, seed+8);
  M.tube([0, BODY_Y+0.395, 0.70], [0, BODY_Y+0.335, 0.815], 0.062, 0.046, 7, 1, 0,0,0);   // الخطم
  M.setColor(coat[0]*0.6, coat[1]*0.6, coat[2]*0.6);
  for(const side of [-1,1])                                                // أذنان
    M.tube([side*0.038, BODY_Y+0.462, 0.618], [side*0.050, BODY_Y+0.520, 0.600], 0.016, 0.004, 4, 1, 0,0,0);

  // العُرف والذيل
  M.setColor(0.129,0.106,0.086);
  for(let i=0;i<10;i++){
    const t=i/9;
    const a=[0, BODY_Y+0.12+t*0.30, 0.44+t*0.17];
    const b=[(rnd()-0.5)*0.05, a[1]-0.075, a[2]-0.055];
    M.tube(a, b, 0.020, 0.008, 4, 1, 0, 0.35, i*0.5);
  }
  for(let i=0;i<8;i++){
    const a=[(rnd()-0.5)*0.03, BODY_Y+0.11, -0.53];
    const b=[a[0]*2.2, BODY_Y-0.22+rnd()*0.06, -0.60-rnd()*0.05];
    M.tube(a, b, 0.024, 0.009, 4, 1, 0.1, 0.6, i*0.7);
  }

  // القوائم الأربع: مفصل ثم وظيف ثم حافر
  M.setColor(coat[0], coat[1], coat[2]);
  const legs=[[-0.115,0.34],[0.115,0.34],[-0.120,-0.30],[0.120,-0.30]];
  for(let i=0;i<4;i++){
    const [lx,lz]=legs[i];
    const fore=i<2;
    const top=[lx, BODY_Y-0.10, lz];
    const knee=[lx, 0.30, lz + (fore?0.02:-0.03)];
    const fet=[lx, 0.085, lz + (fore?0.0:0.02)];
    chLimb(M, top, knee, fet, fore?0.072:0.082, 0.044, 0.032, 6);
    M.setColor(0.129,0.114,0.098);
    M.tube(fet, [lx, 0.0, fet[2]+0.012], 0.034, 0.040, 6, 1, 0,0,0);
    M.setColor(coat[0], coat[1], coat[2]);
  }

  // السرج واللجام
  M.setColor(CH.leather[0], CH.leather[1], CH.leather[2]);
  M.blob([0, BODY_Y+0.20, 0.06], [0.150, 0.062, 0.185], 5, 11, 0.05, seed+13);
  M.tube([0, BODY_Y+0.40, 0.70], [0, BODY_Y+0.42, 0.62], 0.058, 0.070, 7, 1, 0,0,0);
  M.setColor(CH.leatherDark[0], CH.leatherDark[1], CH.leatherDark[2]);
  for(const side of [-1,1])                                                 // ركاب
    M.tube([side*0.155, BODY_Y+0.17, 0.06], [side*0.170, BODY_Y-0.06, 0.06], 0.010, 0.010, 4, 1, 0,0,0);

  if(barded){                                                               // جُلّ الفارس
    for(const side of [-1,1]){
      const bs=C.p.length/3, RINGS=4, SEGS=6;
      for(let r=0;r<=RINGS;r++){
        const t=r/RINGS, y=BODY_Y+0.16-t*0.42;
        for(let q=0;q<=SEGS;q++){
          const u=q/SEGS, z=0.30-u*0.66;
          C.v(side*(0.196+t*0.020), y, z, side,0.1,0, u*1.4, t*1.4, 0, 0.10*t);
        }
      }
      const stride=SEGS+1;
      for(let r=0;r<RINGS;r++) for(let q=0;q<SEGS;q++){
        const i=bs+r*stride+q;
        if(side>0) C.quad(i, i+1, i+stride+1, i+stride);
        else C.quad(i, i+stride, i+stride+1, i+1);
      }
    }
  }
  return { body:M, cloth:C };
}
