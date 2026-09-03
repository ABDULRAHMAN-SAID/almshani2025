/* ═══════════ عمارة المملكة: قلعة وقرية وجسر ═══════════
   كل ما هنا مولّد بالكود — مقاسات ونِسَب معمارية، لا نسخ من أي لعبة.        */

/* صندوق بإحداثيات نسيج بمقياس العالم فتتساوى كثافة الخامة على كل الأوجه */
MB.prototype.box=function(cx,cy,cz, sx,sy,sz, rotY, uvS){
  const co=Math.cos(rotY||0), si=Math.sin(rotY||0);
  const R=(x,z)=>[x*co - z*si, x*si + z*co];
  const hx=sx/2, hy=sy/2, hz=sz/2, U=uvS||0.25;
  const faces=[
    {n:[0,0,1],  p:[[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]], u:[sx,sy]},
    {n:[0,0,-1], p:[[hx,-hy,-hz],[-hx,-hy,-hz],[-hx,hy,-hz],[hx,hy,-hz]], u:[sx,sy]},
    {n:[1,0,0],  p:[[hx,-hy,hz],[hx,-hy,-hz],[hx,hy,-hz],[hx,hy,hz]], u:[sz,sy]},
    {n:[-1,0,0], p:[[-hx,-hy,-hz],[-hx,-hy,hz],[-hx,hy,hz],[-hx,hy,-hz]], u:[sz,sy]},
    {n:[0,1,0],  p:[[-hx,hy,hz],[hx,hy,hz],[hx,hy,-hz],[-hx,hy,-hz]], u:[sx,sz]},
    {n:[0,-1,0], p:[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,-hy,hz],[-hx,-hy,hz]], u:[sx,sz]},
  ];
  for(const f of faces){
    const nr=R(f.n[0],f.n[2]);
    const st=this.p.length/3;
    const uv=[[0,0],[f.u[0]*U,0],[f.u[0]*U,f.u[1]*U],[0,f.u[1]*U]];
    f.p.forEach((pt,i)=>{ const rp=R(pt[0],pt[2]);
      this.v(cx+rp[0], cy+pt[1], cz+rp[1], nr[0],f.n[1],nr[1], uv[i][0],uv[i][1], 0,0); });
    this.quad(st,st+1,st+2,st+3);
  }
};
/* أسطوانة (برج) */
MB.prototype.cyl=function(cx,cy,cz, r0,r1,hgt, segs, uvS, cap){
  const st=this.p.length/3, U=uvS||0.25;
  for(let ring=0;ring<2;ring++){
    const y=cy+(ring?hgt:0), r=ring?r1:r0;
    for(let i=0;i<=segs;i++){
      const a=i/segs*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
      this.v(cx+ca*r, y, cz+sa*r, ca,0,sa, i/segs*2*Math.PI*((r0+r1)/2)*U, (ring?hgt:0)*U, 0,0);
    }
  }
  const stride=segs+1;
  for(let i=0;i<segs;i++) this.quad(st+i, st+i+1, st+stride+i+1, st+stride+i);
  if(cap){
    const cst=this.p.length/3;
    this.v(cx, cy+hgt, cz, 0,1,0, 0,0, 0,0);
    for(let i=0;i<=segs;i++){ const a=i/segs*Math.PI*2;
      this.v(cx+Math.cos(a)*r1, cy+hgt, cz+Math.sin(a)*r1, 0,1,0, Math.cos(a)*r1*U, Math.sin(a)*r1*U, 0,0); }
    for(let i=0;i<segs;i++) this.t.push(cst, cst+1+i, cst+2+i);
  }
};
/* سقف جملوني: منحدران وواجهتان مثلّثتان */
MB.prototype.gable=function(cx,cy,cz, w,d,h, rotY, uvS, over){
  const co=Math.cos(rotY||0), si=Math.sin(rotY||0), U=uvS||0.25;
  const R=(x,z)=>[cx + x*co - z*si, cz + x*si + z*co];
  const hw=w/2+(over||0), hd=d/2+(over||0);
  const slope=Math.hypot(hw,h);
  const A=R(-hw,-hd), B=R(hw,-hd), C=R(hw,hd), D=R(-hw,hd);
  const rid0=R(0,-hd), rid1=R(0,hd);
  const push=(x,y,z,nx,ny,nz,u,v)=>{ this.v(x,y,z,nx,ny,nz,u,v,0,0); return (this.p.length/3)-1; };
  // منحدر يسار
  let nL=[-h/slope,hw/slope,0], nR=[h/slope,hw/slope,0];
  const rot=(n)=>[n[0]*co-n[2]*si, n[1], n[0]*si+n[2]*co];
  nL=rot(nL); nR=rot(nR);
  let a=push(A[0],cy,A[1], nL[0],nL[1],nL[2], 0,0);
  let b=push(D[0],cy,D[1], nL[0],nL[1],nL[2], d*U,0);
  let c=push(rid1[0],cy+h,rid1[1], nL[0],nL[1],nL[2], d*U, slope*U);
  let e=push(rid0[0],cy+h,rid0[1], nL[0],nL[1],nL[2], 0, slope*U);
  this.quad(a,b,c,e);
  a=push(C[0],cy,C[1], nR[0],nR[1],nR[2], 0,0);
  b=push(B[0],cy,B[1], nR[0],nR[1],nR[2], d*U,0);
  c=push(rid0[0],cy+h,rid0[1], nR[0],nR[1],nR[2], d*U, slope*U);
  e=push(rid1[0],cy+h,rid1[1], nR[0],nR[1],nR[2], 0, slope*U);
  this.quad(a,b,c,e);
};
/* واجهة مثلّثة تسدّ طرف الجملون */
MB.prototype.gableEnd=function(cx,cy,cz, w,h, rotY, z0, uvS){
  const co=Math.cos(rotY||0), si=Math.sin(rotY||0), U=uvS||0.25;
  const R=(x,z)=>[cx + x*co - z*si, cz + x*si + z*co];
  const n=[si*Math.sign(z0), 0, co*Math.sign(z0)];
  const P=[[-w/2,0],[w/2,0],[0,h]];
  const st=this.p.length/3;
  P.forEach(pt=>{ const rp=R(pt[0], z0);
    this.v(rp[0], cy+pt[1], rp[1], n[0],n[1],n[2], (pt[0]+w/2)*U, pt[1]*U, 0,0); });
  this.t.push(st, st+1, st+2);
};

/* ═══ بيت قروي: قاعدة حجرية، طابق مجصّص بإطار خشبي، سقف قرميد، مدخنة ═══ */
function buildHouse(M, x, z, groundY, rot, rng, opts){
  const w=(opts.w||9)*(0.85+rng()*0.35), d=(opts.d||7)*(0.85+rng()*0.35);
  const stoneH=1.5+rng()*1.1, wallH=3.4+rng()*1.4, roofH=2.4+rng()*1.3;
  const y=groundY-0.5;
  // قاعدة حجرية
  M.stone.box(x, y+stoneH/2, z, w+0.5, stoneH, d+0.5, rot, 0.42);
  // الجدار المجصّص
  M.plaster.box(x, y+stoneH+wallH/2, z, w, wallH, d, rot, 0.42);
  // إطار خشبي: قوائم رفيعة وعوارض ومساند مائلة حقيقية (لا ألواح تغطّي الجدار)
  const co=Math.cos(rot), si=Math.sin(rot);
  const P=(lx,lz)=>[x+lx*co-lz*si, z+lx*si+lz*co];
  const beam=0.20, jut=0.05;
  const faces=[[d/2+jut, 0], [-d/2-jut, Math.PI]];
  for(const [lz, extra] of faces){
    const posts=Math.max(3, Math.round(w/1.7));
    for(let i=0;i<=posts;i++){
      const p=P(-w/2+w*i/posts, lz);
      M.timber.box(p[0], y+stoneH+wallH/2, p[1], beam, wallH, beam*0.7, rot, 0.6);
    }
    for(const ly of [beam/2, wallH*0.55, wallH-beam/2]){
      const p=P(0,lz);
      M.timber.box(p[0], y+stoneH+ly, p[1], w, beam, beam*0.7, rot, 0.6);
    }
    // مساند مائلة داخل الحقول العلوية
    for(let i=0;i<posts;i++){
      if(i%2) continue;
      const cellW=w/posts, cellH=wallH*0.45;
      const cx2=-w/2+cellW*(i+0.5), cy2=wallH*0.775;
      const p=P(cx2, lz);
      const len=Math.hypot(cellW, cellH)*0.94;
      const ang=Math.atan2(cellH, cellW)*(i%4?1:-1);
      // لوح مائل: نبنيه من قطع صغيرة كي يبقى الميل صحيحاً بلا دوران مركّب
      const seg=7;
      for(let q=0;q<seg;q++){
        const t=(q+0.5)/seg-0.5;
        const ox=Math.cos(ang)*len*t, oy=Math.sin(ang)*len*t;
        const pp=P(cx2+ox, lz);
        M.timber.box(pp[0], y+stoneH+cy2+oy, pp[1], len/seg*1.25, beam, beam*0.7, rot, 0.6);
      }
    }
  }
  for(const lx of [w/2+jut, -w/2-jut]){
    for(let i=0;i<=2;i++){
      const p=P(lx, -d/2+d*i/2);
      M.timber.box(p[0], y+stoneH+wallH/2, p[1], beam*0.7, wallH, beam, rot, 0.6);
    }
    for(const ly of [beam/2, wallH-beam/2]){
      const p=P(lx,0);
      M.timber.box(p[0], y+stoneH+ly, p[1], beam*0.7, beam, d, rot, 0.6);
    }
  }
  // السقف
  const ry=y+stoneH+wallH;
  const thatched = opts.thatch && rng()<0.45;
  const RM = thatched ? M.thatch : M.tile;
  RM.gable(x, ry, z, w, d, roofH, rot, 0.52, 0.55);
  M.plaster.gableEnd(x, ry, z, w, roofH, rot,  d/2, 0.16);
  M.plaster.gableEnd(x, ry, z, w, roofH, rot, -d/2, 0.16);
  // مدخنة
  const cp=P(w*0.28, d*0.12);
  M.stone.box(cp[0], ry+roofH*0.55, cp[1], 0.9, roofH*1.5, 0.9, rot, 0.55);
  // باب ونافذتان
  const dp=P(0, d/2+0.12);
  M.timber.box(dp[0], y+stoneH+0.95, dp[1], 1.05, 1.95, 0.14, rot, 0.6);
  M.stone.box(dp[0], y+stoneH+0.06, dp[1], 1.7, 0.28, 0.9, rot, 0.5);      // عتبة
  for(const s2 of [-1,1]){
    for(const lz of [d/2+0.12, -d/2-0.12]){
      const wp=P(s2*w*0.28, lz);
      M.timber.box(wp[0], y+stoneH+wallH*0.60, wp[1], 0.72, 0.62, 0.12, rot, 0.7);
      M.timber.box(wp[0], y+stoneH+wallH*0.60, wp[1], 0.62, 0.10, 0.16, rot, 0.7);
      M.timber.box(wp[0], y+stoneH+wallH*0.60, wp[1], 0.10, 0.52, 0.16, rot, 0.7);
    }
  }
  return {w, d, h: stoneH+wallH+roofH};
}

/* ═══ برج بسقف مخروطي ═══ */
function buildTower(M, x, z, baseY, r, h, rng){
  M.stone.cyl(x, baseY-2, z, r*1.12, r, h, 14, 0.40, false);
  // شرفات
  const merlons=Math.max(8, Math.round(r*2.2));
  for(let i=0;i<merlons;i++){
    const a=i/merlons*Math.PI*2;
    M.stone.box(x+Math.cos(a)*(r*0.94), baseY-2+h+0.9, z+Math.sin(a)*(r*0.94),
                r*0.42, 1.8, r*0.30, a, 0.55);
  }
  M.stone.cyl(x, baseY-2+h, z, r*1.06, r*1.06, 0.55, 14, 0.5, true);
  // سقف مخروطي
  M.tile.cyl(x, baseY-2+h+2.0, z, r*1.10, 0.10, r*1.5, 14, 0.55, false);
}

/* ═══ سور بشرفات يتبع مضلّعاً ═══ */
function buildWall(M, pts, groundAt, height, thick){
  for(let i=0;i<pts.length;i++){
    const a=pts[i], b=pts[(i+1)%pts.length];
    const dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz);
    if(len<0.5) continue;
    const rot=Math.atan2(dz,dx);
    const segs=Math.max(1, Math.round(len/6));
    for(let q=0;q<segs;q++){
      const t0=q/segs, t1=(q+1)/segs, tm=(t0+t1)/2;
      const mx=a[0]+dx*tm, mz=a[1]+dz*tm, slen=len/segs;
      const gy=Math.min(groundAt(a[0]+dx*t0, a[1]+dz*t0), groundAt(a[0]+dx*t1, a[1]+dz*t1));
      const base=gy-4;
      // القاعدة أعرض (بَطّة) ثم الجسم ثم إفريز — لا لوح مسطّح واحد
      M.stone.box(mx, base+1.4, mz, slen*1.02, 2.8, thick*1.28, rot, 0.42);
      M.stone.box(mx, base+2.8+(height-2.8)/2, mz, slen*1.02, height-2.8, thick, rot, 0.42);
      M.stone.box(mx, base+height-1.1, mz, slen*1.02, 0.42, thick*1.14, rot, 0.5);   // إفريز
      // ممشى
      M.stone.box(mx, base+height+0.35, mz, slen*1.02, 0.7, thick*1.30, rot, 0.5);
      // دعامة كل مقطعين
      if(q%2===0){
        M.stone.box(mx - Math.sin(rot)*(thick*0.62), base+(height-1)/2, mz + Math.cos(rot)*(thick*0.62),
                    1.9, height-1, thick*0.55, rot, 0.42);
      }
      // شرفات
      const mer=Math.max(1, Math.round(slen/3.0));
      for(let m=0;m<mer;m++){
        const tt=(m+0.5)/mer;
        const px=a[0]+dx*(t0+(t1-t0)*tt), pz=a[1]+dz*(t0+(t1-t0)*tt);
        const off=thick*0.42;
        M.stone.box(px - Math.sin(rot)*off*-1, base+height+1.6, pz + Math.cos(rot)*off*-1,
                    slen/mer*0.55, 1.9, thick*0.34, rot, 0.55);
      }
    }
  }
}

/* ═══ المجمّع كاملاً ═══ */
function buildKingdom(groundAt, rng, opts){
  const M={ stone:new MB(), tile:new MB(), plaster:new MB(), timber:new MB(), thatch:new MB() };
  const R=opts.radius, cx=opts.cx||0, cz=opts.cz||0;
  const gateAngle=opts.gateAngle||0;

  // مضلّع السور: غير منتظم كما تُبنى الحصون على تضاريس
  const sides=11, pts=[];
  for(let i=0;i<sides;i++){
    const a=i/sides*Math.PI*2;
    const rr=R*(0.88+0.22*Math.sin(a*2.3+1.1)+rng()*0.06);
    pts.push([cx+Math.cos(a)*rr, cz+Math.sin(a)*rr, a, rr]);
  }
  buildWall(M, pts.map(p=>[p[0],p[1]]), groundAt, 11, 3.4);
  // أبراج على رؤوس متناوبة
  for(let i=0;i<sides;i++){
    if(i%2 && i!==0) continue;
    const p=pts[i];
    buildTower(M, p[0], p[1], groundAt(p[0],p[1]), 4.2+rng()*1.2, 15+rng()*5, rng);
  }
  // بوّابة: برجان وقوس
  const gx=cx+Math.cos(gateAngle)*R*0.98, gz=cz+Math.sin(gateAngle)*R*0.98;
  const gy=groundAt(gx,gz);
  for(const s2 of [-1,1]){
    const px=gx - Math.sin(gateAngle)*s2*5.6, pz=gz + Math.cos(gateAngle)*s2*5.6;
    buildTower(M, px, pz, groundAt(px,pz), 4.0, 19, rng);
  }
  // جسم البوّابة: أعلى من السور، بإفريز بارز وشرفات
  M.stone.box(gx, gy-4+8.5, gz, 13.5, 17, 6.5, gateAngle+Math.PI/2, 0.42);
  M.stone.box(gx, gy-4+17.4, gz, 15.2, 1.2, 8.2, gateAngle+Math.PI/2, 0.5);
  for(let i=0;i<6;i++){
    const t=(i+0.5)/6-0.5;
    M.stone.box(gx - Math.sin(gateAngle)*t*13.0, gy-4+19.0, gz + Math.cos(gateAngle)*t*13.0,
                1.5, 1.9, 8.0, gateAngle+Math.PI/2, 0.55);
  }
  // فتحة القوس: أعمدة بارتفاع متدرّج تحفر القوس في الكتلة
  for(let i=0;i<9;i++){
    const t=(i+0.5)/9, a=Math.PI*t, h2=Math.sin(a)*4.6;
    M.stone.box(gx - Math.sin(gateAngle)*(t-0.5)*9.6, gy-4+9.0+h2*0.5+2.0, gz + Math.cos(gateAngle)*(t-0.5)*9.6,
                1.1, 12.0-h2, 6.8, gateAngle+Math.PI/2, 0.5);
  }

  // الحصن الداخلي: كتلة مشرّفة بأبراج ركنية وسقف حادّ
  const ky=groundAt(cx,cz);
  const KW=19, KD=15, KH=21, kr=0.35;
  M.stone.box(cx, ky-3+KH/2, cz, KW, KH, KD, kr, 0.42);
  // إفريز بارز (مَشيقولة)
  M.stone.box(cx, ky-3+KH+0.55, cz, KW+1.6, 1.1, KD+1.6, kr, 0.2);
  // شرفات حول السطح
  {
    const co=Math.cos(kr), si=Math.sin(kr);
    const P=(lx,lz)=>[cx+lx*co-lz*si, cz+lx*si+lz*co];
    const mx=Math.round((KW+1.6)/2.6), mz=Math.round((KD+1.6)/2.6);
    for(let i=0;i<mx;i++){ const lx=-(KW+1.6)/2+(i+0.5)*(KW+1.6)/mx;
      for(const lz of [(KD+1.6)/2-0.5, -(KD+1.6)/2+0.5]){ const p=P(lx,lz);
        M.stone.box(p[0], ky-3+KH+2.0, p[1], (KW+1.6)/mx*0.55, 1.8, 0.9, kr, 0.55); } }
    for(let i=0;i<mz;i++){ const lz=-(KD+1.6)/2+(i+0.5)*(KD+1.6)/mz;
      for(const lx of [(KW+1.6)/2-0.5, -(KW+1.6)/2+0.5]){ const p=P(lx,lz);
        M.stone.box(p[0], ky-3+KH+2.0, p[1], 0.9, 1.8, (KD+1.6)/mz*0.55, kr, 0.55); } }
  }
  // سقف حادّ داخل الشرفات
  M.tile.gable(cx, ky-3+KH+1.2, cz, KW-2.4, KD-2.4, 8.5, kr, 0.52, 0.3);
  M.stone.gableEnd(cx, ky-3+KH+1.2, cz, KW-2.4, 8.5, kr,  (KD-2.4)/2, 0.16);
  M.stone.gableEnd(cx, ky-3+KH+1.2, cz, KW-2.4, 8.5, kr, -(KD-2.4)/2, 0.16);
  // أبراج ركنية
  {
    const co=Math.cos(kr), si=Math.sin(kr);
    for(const [lx,lz] of [[-KW/2,-KD/2],[KW/2,-KD/2],[KW/2,KD/2],[-KW/2,KD/2]]){
      const px=cx+lx*co-lz*si, pz=cz+lx*si+lz*co;
      buildTower(M, px, pz, ky, 3.2, KH+4, rng);
    }
  }
  // نوافذ مقوّسة على الواجهة
  {
    const co=Math.cos(kr), si=Math.sin(kr);
    for(let i=0;i<3;i++) for(let lvl=0;lvl<2;lvl++){
      const lx=-KW*0.28+i*KW*0.28, lz=KD/2+0.1;
      const px=cx+lx*co-lz*si, pz=cz+lx*si+lz*co;
      M.timber.box(px, ky-3+6+lvl*7, pz, 1.1, 2.2, 0.25, kr, 0.5);
    }
  }
  // قاعات داخلية
  for(let i=0;i<5;i++){
    const a=gateAngle+Math.PI*0.5+i*0.72, rr=R*(0.50+rng()*0.14);
    const hx=cx+Math.cos(a)*rr, hz=cz+Math.sin(a)*rr;
    buildHouse(M, hx, hz, groundAt(hx,hz), a+Math.PI/2, rng, {w:12, d:8.5});
  }

  // باب خشبي مدعّم في فتحة البوّابة
  {
    const dy=groundAt(gx,gz);
    M.timber.box(gx, dy+3.4, gz, 8.4, 6.8, 0.5, gateAngle+Math.PI/2, 0.45);
    for(let i=0;i<5;i++)
      M.timber.box(gx - Math.sin(gateAngle)*(i-2)*1.6, dy+3.4, gz + Math.cos(gateAngle)*(i-2)*1.6,
                   0.34, 6.8, 0.72, gateAngle+Math.PI/2, 0.6);
    for(const yy of [1.2, 5.6])
      M.timber.box(gx, dy+yy, gz, 8.4, 0.55, 0.75, gateAngle+Math.PI/2, 0.6);
  }

  // ممرّ مرصوف من البوّابة إلى الحصن
  {
    const steps=16;
    for(let i=0;i<steps;i++){
      const t=i/(steps-1);
      const px=gx+(cx-gx)*t, pz=gz+(cz-gz)*t;
      const gy2=groundAt(px,pz);
      M.stone.box(px, gy2+0.10, pz, 7.5, 0.7, R*2/steps*1.2, gateAngle+Math.PI/2, 0.45);
    }
  }

  // سلالم إلى ممشى السور
  for(let i=0;i<2;i++){
    const a=gateAngle+(i? 2.2 : -2.2), rr=R*0.86;
    const sx=cx+Math.cos(a)*rr, sz=cz+Math.sin(a)*rr, sy=groundAt(sx,sz);
    for(let q=0;q<9;q++){
      const t=q/9;
      M.stone.box(sx+Math.cos(a)*t*7, sy+q*1.2+0.6, sz+Math.sin(a)*t*7, 3.2, 1.3, 7/9*1.4, a+Math.PI/2, 0.5);
    }
  }

  // بئر الساحة
  {
    const wx=cx+Math.cos(gateAngle+2.1)*R*0.34, wz=cz+Math.sin(gateAngle+2.1)*R*0.34;
    const wy=groundAt(wx,wz);
    M.stone.cyl(wx, wy-0.4, wz, 2.1, 1.9, 1.5, 12, 0.55, false);
    for(const s2 of [-1,1]) M.timber.box(wx+s2*1.7, wy+1.9, wz, 0.28, 2.6, 0.28, 0, 0.6);
    M.timber.box(wx, wy+3.3, wz, 4.4, 0.35, 2.6, 0, 0.4);
    M.tile.gable(wx, wy+3.3, wz, 4.4, 2.8, 1.0, 0, 0.6, 0.25);
  }

  // براميل وصناديق متناثرة
  for(let i=0;i<14;i++){
    const a=rng()*Math.PI*2, rr=R*(0.25+rng()*0.5);
    const bx=cx+Math.cos(a)*rr, bz=cz+Math.sin(a)*rr, by=groundAt(bx,bz);
    if(rng()<0.5) M.timber.cyl(bx, by, bz, 0.55, 0.5, 1.15, 9, 0.7, true);
    else M.timber.box(bx, by+0.45, bz, 1.1, 0.9, 0.9, rng()*3.14, 0.7);
  }

  // رايات على الأبراج
  for(let i=0;i<sides;i+=2){
    const p=pts[i], py=groundAt(p[0],p[1]);
    M.timber.box(p[0], py+22, p[1], 0.18, 8, 0.18, 0, 0.8);
    M.thatch.box(p[0]+1.3, py+24.5, p[1], 2.6, 2.0, 0.10, 0, 0.6);
  }

  return M;
}
