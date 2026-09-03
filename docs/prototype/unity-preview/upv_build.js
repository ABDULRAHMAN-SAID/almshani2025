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

/* ═══ برج: مقطع مخروط يدور — قاعدة، بَطّة، مَشْط بارز، ستارة، سقف بأفاريز ═══ */
function buildTower(M, x, z, baseY, r, h, rng){
  const y0=baseY-3;
  const prof=[
    [r*1.30, 0.0], [r*1.30, 1.1], [r*1.16, 1.9], [r*1.10, 2.6],
    [r*1.00, h*0.55], [r*0.96, h*0.92],
    [r*1.13, h*0.96], [r*1.20, h*1.00], [r*1.16, h*1.05],   // مَشْط بارز
    [r*1.06, h*1.07]
  ];
  M.stone.lathe(x, y0, z, prof, 20, 0.40, false);
  const topY=y0+h*1.07, R=r*1.06;
  // ستارة وشرفات على شكل موشور مشطوف لا صندوق
  const merlons=Math.max(9, Math.round(r*2.6));
  for(let i=0;i<merlons;i++){
    const a=i/merlons*Math.PI*2, w=R*2*Math.PI/merlons*0.55, t=R*0.30;
    const ca=Math.cos(a), sa=Math.sin(a), px=-sa, pz=ca;
    const poly=[];
    for(const [du,dv] of [[-w/2,-t/2],[w/2,-t/2],[w/2,t/2],[-w/2,t/2]])
      poly.push([x+ca*(R-t*0.1)+px*du+ca*dv, z+sa*(R-t*0.1)+pz*du+sa*dv]);
    M.stone.prism(poly, topY, 2.1, 0.16, 0.55);
  }
  // حلقة الستارة بين الشرفات
  M.stone.lathe(x, topY, z, [[R,0],[R,0.55],[R*0.94,0.75]], 20, 0.5, false);
  // سقف مخروطي بأفاريز مرفرفة
  const ry=topY+2.1;
  M.tile.lathe(x, ry, z, [[R*1.02,-0.35],[R*1.22,-0.05],[R*1.10,0.35],[R*0.72,r*0.85],[0.06,r*1.85]], 20, 0.55, false);
  M.stone.lathe(x, ry+r*1.85, z, [[0.30,0],[0.16,0.5],[0.05,0.9]], 8, 0.6, true);
}

/* ═══ سور: مقطع معماري واحد يُكنس على المضلّع ═══
   قاعدة بارزة ← انحسار ← بَطّة مائلة ← إفريز بارز ← ممشى ← ستارة بشرفات.
   جسم متّصل لا صناديق مرصوصة.                                              */
const WALL_PROFILE=[
  [ 2.30, 0.00], [ 2.30, 0.95], [ 1.92, 1.55], [ 1.74, 2.15],
  [ 1.58, 8.40], [ 1.94, 8.90], [ 2.04, 9.30], [ 1.66, 9.78],
  [ 1.66, 11.35], [ 1.40, 11.62],
  [ 0.96, 11.62], [ 0.96, 10.15],
  [-2.12, 10.15], [-2.48,  9.72], [-2.06,  9.34], [-1.56,  8.60],
  [-1.50, 2.15], [-1.74, 1.55], [-2.12, 0.95], [-2.12, 0.00]
];
function buildWall(M, pts, groundAt, height, thick, closed){
  // تُتبع الأرض: كل عقدة تنزل إلى أوطأ نقطة قريبة كي لا يطفو السور
  const base=(x,z)=>{
    let m=groundAt(x,z);
    for(const [dx,dz] of [[6,0],[-6,0],[0,6],[0,-6]]) m=Math.min(m, groundAt(x+dx,z+dz));
    return m-3.2;
  };
  M.stone.sweepProfile(pts, WALL_PROFILE, base, 0.40, !!closed, true);
  // شرفات: مواشير مشطوفة على حافّة الستارة
  const segs = closed ? pts.length : pts.length-1;
  for(let i=0;i<segs;i++){
    const a=pts[i], b=pts[(i+1)%pts.length];
    const dx=b[0]-a[0], dz=b[1]-a[1], len=Math.hypot(dx,dz);
    if(len<1) continue;
    const ux=dx/len, uz=dz/len, px=uz, pz=-ux;
    const n=Math.max(1, Math.round(len/2.9));
    for(let q=0;q<n;q++){
      const t=(q+0.35)/n, w=len/n*0.52;
      const cx=a[0]+dx*t, cz=a[1]+dz*t;
      const off=1.30;
      const poly=[];
      for(const [du,dv] of [[-w/2,-0.36],[w/2,-0.36],[w/2,0.36],[-w/2,0.36]])
        poly.push([cx+ux*du+px*(off+dv), cz+uz*du+pz*(off+dv)]);
      M.stone.prism(poly, base(cx,cz)+11.62, 1.95, 0.14, 0.55);
    }
  }
}

/* ═══ المجمّع كاملاً ═══ */
function buildKingdom(groundAt, rng, opts){
  const M={ stone:new MB(), tile:new MB(), plaster:new MB(), timber:new MB(), thatch:new MB() };
  const R=opts.radius, cx=opts.cx||0, cz=opts.cz||0;
  const gateAngle=opts.gateAngle||0;

  // مضلّع السور: رأسه الأول عند البوّابة تماماً، والسور يُفتح عندها فتصير فتحة حقيقية
  const sides=11, pts=[];
  for(let i=0;i<sides;i++){
    const a=gateAngle + i/sides*Math.PI*2;
    const rr=R*(0.88+0.22*Math.sin(a*2.3+1.1)+rng()*0.06);
    pts.push([cx+Math.cos(a)*rr, cz+Math.sin(a)*rr, a, rr]);
  }
  const GAP=9.2;                                  // نصف عرض فتحة البوّابة
  const nrm=(a,b)=>{ const dx=b[0]-a[0], dz=b[1]-a[1], d=Math.hypot(dx,dz)||1; return [dx/d, dz/d]; };
  const dIn=nrm(pts[0], pts[1]), dOut=nrm(pts[0], pts[sides-1]);
  const wallPath=[[pts[0][0]+dIn[0]*GAP, pts[0][1]+dIn[1]*GAP]];
  for(let i=1;i<sides;i++) wallPath.push([pts[i][0], pts[i][1]]);
  wallPath.push([pts[0][0]+dOut[0]*GAP, pts[0][1]+dOut[1]*GAP]);
  buildWall(M, wallPath, groundAt, 11, 3.4, false);

  // أبراج على رؤوس متناوبة (لا على رأس البوّابة — له برجاه)
  for(let i=1;i<sides;i++){
    if(i%2===0) continue;
    const p=pts[i];
    buildTower(M, p[0], p[1], groundAt(p[0],p[1]), 4.2+rng()*1.2, 15+rng()*5, rng);
  }

  // ═══ البوّابة: بُرجان، دِعامتان، قوس بأحجار شعاعية، ومَشيقولة على أكتاف ═══
  const gx=pts[0][0], gz=pts[0][1];
  const gy=groundAt(gx,gz)-3.2;
  const gux=Math.cos(gateAngle), guz=Math.sin(gateAngle);      // للخارج
  const gpx=-guz, gpz=gux;                                      // عرضاً
  const GP=(a,b)=>[gx+gpx*a+gux*b, gz+gpz*a+guz*b];            // a عرضاً، b عمقاً

  for(const s2 of [-1,1]){ const tp=GP(s2*8.6,0); buildTower(M, tp[0], tp[1], groundAt(tp[0],tp[1]), 4.3, 21, rng); }

  const AR=3.6, PIER=2.6, DEPTH=7.8;
  const SPRING=8.4;
  // دِعامتان جانبيتان بمقطع مشطوف
  for(const s2 of [-1,1]){
    const c0=GP(s2*(AR+PIER/2), 0);
    const poly=[];
    for(const [a,b] of [[-PIER/2,-DEPTH/2],[PIER/2,-DEPTH/2],[PIER/2,DEPTH/2],[-PIER/2,DEPTH/2]])
      poly.push([c0[0]+gpx*a+gux*b, c0[1]+gpz*a+guz*b]);
    M.stone.prism(poly, gy, SPRING, 0.28, 0.42);
  }
  // القوس نفسه
  M.stone.voussoirArch(gx, gy+SPRING, gz, gateAngle+Math.PI/2, AR, DEPTH, 1.35, 15, 0.42, 0.10);
  // حشوة الكَتِفين وما فوق القوس: مداميك أفقية تلتفّ حول القوس — لا شرائح رأسية مخطّطة
  {
    const W=AR*2+PIER*2, RO=AR+1.35, springY=gy+SPRING, topY=springY+RO+5.8;
    const dh=0.62;
    for(let y=springY; y<topY-0.01; y+=dh){
      const ym=Math.min(y+dh, topY), mid=(y+ym)/2 - springY;
      const half = mid<RO ? Math.sqrt(Math.max(0,RO*RO-mid*mid)) : 0;
      const spans = half>0.05 ? [[-W/2, -half], [half, W/2]] : [[-W/2, W/2]];
      for(const [a0,a1] of spans){
        if(a1-a0 < 0.05) continue;
        const pp=[];
        for(const [aa,bb] of [[a0,-DEPTH/2],[a1,-DEPTH/2],[a1,DEPTH/2],[a0,DEPTH/2]])
          pp.push([gx+gpx*aa+gux*bb, gz+gpz*aa+guz*bb]);
        M.stone.prism(pp, y, ym-y, 0.0, 0.42, (a0+W/2)+ (y-springY)*0.0);
      }
    }
  }
  // أكتاف المَشيقولة: كوابيل بارزة ثم ستارة معلّقة
  {
    const W=AR*2+PIER*2, top=gy+SPRING+AR+1.35+5.8;
    for(const face of [-1,1]){
      const n=Math.round(W/1.6);
      for(let i=0;i<n;i++){
        const a=-W/2+(i+0.5)*W/n;
        for(let k2=0;k2<3;k2++){
          const outw=0.55+k2*0.42, wdt=1.0-k2*0.12;
          const pp=[];
          for(const [aa,bb] of [[a-wdt/2, face*(DEPTH/2+outw-0.42)],[a+wdt/2, face*(DEPTH/2+outw-0.42)],
                                 [a+wdt/2, face*(DEPTH/2+outw)],[a-wdt/2, face*(DEPTH/2+outw)]])
            pp.push([gx+gpx*aa+gux*bb, gz+gpz*aa+guz*bb]);
          M.stone.prism(pp, top-1.2+k2*0.40, 0.44, 0.06, 0.55);
        }
      }
    }
    // ستارة البوّابة وشرفاتها
    const path=[GP(-W/2, 0), GP(W/2, 0)];
    const par=[[ DEPTH/2+1.5, 0],[ DEPTH/2+1.5, 2.4],[ DEPTH/2+1.2, 2.7],
               [-DEPTH/2-1.2, 2.7],[-DEPTH/2-1.5, 2.4],[-DEPTH/2-1.5, 0]];
    M.stone.sweepProfile(path, par, top, 0.45, false, true);
    const mn=Math.round(W/2.9);
    for(let i=0;i<mn;i++){
      const a=-W/2+(i+0.4)*W/mn, w2=W/mn*0.5;
      for(const face of [-1,1]){
        const pp=[];
        for(const [aa,bb] of [[a-w2/2, face*(DEPTH/2+0.85)],[a+w2/2, face*(DEPTH/2+0.85)],
                               [a+w2/2, face*(DEPTH/2+1.5)],[a-w2/2, face*(DEPTH/2+1.5)]])
          pp.push([gx+gpx*aa+gux*bb, gz+gpz*aa+guz*bb]);
        M.stone.prism(pp, top+2.7, 2.0, 0.14, 0.55);
      }
    }
  }

  // ═══ الحصن: كتلة مشطوفة الحواف بأربعة أبراج ركنية ومَشيقولة وسقف بأفاريز ═══
  const ky=groundAt(cx,cz)-3;
  const KW=19, KD=15, KH=22, kr=0.35;
  const kco=Math.cos(kr), ksi=Math.sin(kr);
  const KP=(lx,lz)=>[cx+lx*kco-lz*ksi, cz+lx*ksi+lz*kco];
  const kpoly=[KP(-KW/2,-KD/2), KP(KW/2,-KD/2), KP(KW/2,KD/2), KP(-KW/2,KD/2)];
  M.stone.prism(kpoly, ky, KH, 0.55, 0.42);
  // سطر إفريز في منتصف الارتفاع
  {
    const e=0.45, wide=kpoly.map(p=>[p[0],p[1]]);
    M.stone.prism(wide.map((p,i)=>{
      const c2=[(kpoly[0][0]+kpoly[2][0])/2,(kpoly[0][1]+kpoly[2][1])/2];
      const dx=p[0]-c2[0], dz=p[1]-c2[1], d=Math.hypot(dx,dz);
      return [p[0]+dx/d*e, p[1]+dz/d*e];
    }), ky+KH*0.52, 0.55, 0.16, 0.5);
  }
  // مَشيقولة: كوابيل ثم ستارة
  {
    const c2=[cx,cz];
    const outer=kpoly.map(p=>{ const dx=p[0]-c2[0], dz=p[1]-c2[1], d=Math.hypot(dx,dz);
      return [p[0]+dx/d*1.45, p[1]+dz/d*1.45]; });
    for(let e=0;e<4;e++){
      const a=kpoly[e], b=kpoly[(e+1)%4];
      const len=Math.hypot(b[0]-a[0], b[1]-a[1]), n=Math.max(2,Math.round(len/1.7));
      const ux=(b[0]-a[0])/len, uz=(b[1]-a[1])/len, px2=uz, pz2=-ux;
      for(let i=0;i<n;i++){
        const t=(i+0.5)/n, mx2=a[0]+(b[0]-a[0])*t, mz2=a[1]+(b[1]-a[1])*t;
        for(let k2=0;k2<3;k2++){
          const outw=0.35+k2*0.40, wdt=1.0-k2*0.14;
          const pp=[];
          for(const [du,dv] of [[-wdt/2,outw-0.40],[wdt/2,outw-0.40],[wdt/2,outw],[-wdt/2,outw]])
            pp.push([mx2+ux*du+px2*dv, mz2+uz*du+pz2*dv]);
          M.stone.prism(pp, ky+KH-1.3+k2*0.40, 0.42, 0.06, 0.55);
        }
      }
    }
    M.stone.sweepProfile(outer, [[0.30,0],[0.30,2.5],[0.05,2.8],[-0.65,2.8],[-0.65,0]], ky+KH, 0.45, true, false);
    // شرفات السطح
    for(let e=0;e<4;e++){
      const a=outer[e], b=outer[(e+1)%4];
      const len=Math.hypot(b[0]-a[0], b[1]-a[1]), n=Math.max(2,Math.round(len/2.7));
      const ux=(b[0]-a[0])/len, uz=(b[1]-a[1])/len, px2=uz, pz2=-ux;
      for(let i=0;i<n;i++){
        const t=(i+0.35)/n, mx2=a[0]+(b[0]-a[0])*t, mz2=a[1]+(b[1]-a[1])*t, w2=len/n*0.52;
        const pp=[];
        for(const [du,dv] of [[-w2/2,-0.30],[w2/2,-0.30],[w2/2,0.30],[-w2/2,0.30]])
          pp.push([mx2+ux*du+px2*dv, mz2+uz*du+pz2*dv]);
        M.stone.prism(pp, ky+KH+2.8, 1.9, 0.12, 0.55);
      }
    }
  }
  // سقف حادّ بأفاريز داخل الشرفات
  M.tile.gable(cx, ky+KH+2.4, cz, KW-3.0, KD-3.0, 9.5, kr, 0.52, 0.85);
  M.stone.gableEnd(cx, ky+KH+2.4, cz, KW-3.0, 9.5, kr,  (KD-3.0)/2, 0.42);
  M.stone.gableEnd(cx, ky+KH+2.4, cz, KW-3.0, 9.5, kr, -(KD-3.0)/2, 0.42);
  // أبراج ركنية
  for(const [lx,lz] of [[-KW/2,-KD/2],[KW/2,-KD/2],[KW/2,KD/2],[-KW/2,KD/2]]){
    const p=KP(lx,lz);
    buildTower(M, p[0], p[1], groundAt(p[0],p[1]), 3.1, KH+3, rng);
  }
  // نوافذ مقوّسة غائرة على الواجهات
  for(const face of [1,-1]){
    for(let i=0;i<3;i++) for(let lvl=0;lvl<2;lvl++){
      const lx=-KW*0.28+i*KW*0.28, lz=face*(KD/2+0.06);
      const p=KP(lx,lz);
      M.stone.voussoirArch(p[0], ky+6.4+lvl*7.2, p[1], kr+(face>0?0:Math.PI), 0.72, 0.6, 0.34, 7, 0.55);
      M.timber.box(p[0], ky+5.2+lvl*7.2, p[1], 1.30, 2.4, 0.22, kr, 0.7);
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
