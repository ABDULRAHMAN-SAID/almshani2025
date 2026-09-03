/* ═══════════ هندسة معمارية لا صناديق ═══════════
   الصندوق المحاذي للمحاور هو سبب مظهر «ماين كرافت». البديل:
   • كنس مقطع عرضي على مسار  → سور بقاعدة مائلة وإفريز بارز وسطر تاج، بجسم واحد متّصل
   • خراطة مقطع حول محور     → برج بحلقات ومَشْط وتضييق تدريجي
   • بثق مضلّع                → كتل مشطوفة الحواف
   • قوس بأحجار شعاعية        → فتحات حقيقية لا مدرّجة                                */

/* كنس مقطع مغلق [u,v] على مسار [x,z].
   u = الإزاحة العمودية على المسار، v = الارتفاع. */
MB.prototype.sweepProfile=function(path, prof, baseY, uvS, closedPath, capEnds){
  const P=path, n=P.length; if(n<2) return;
  const m=prof.length;
  // طول القوس على المقطع لإحداثي v
  const arc=[0];
  for(let i=1;i<m;i++) arc.push(arc[i-1]+Math.hypot(prof[i][0]-prof[i-1][0], prof[i][1]-prof[i-1][1]));
  const start=this.p.length/3;
  let travelled=0;
  const rings=[];
  for(let i=0;i<n;i++){
    const prev=P[(i-1+n)%n], next=P[(i+1)%n], cur=P[i];
    let dx, dz;
    if(closedPath){ dx=next[0]-prev[0]; dz=next[1]-prev[1]; }
    else if(i===0){ dx=P[1][0]-P[0][0]; dz=P[1][1]-P[0][1]; }
    else if(i===n-1){ dx=P[n-1][0]-P[n-2][0]; dz=P[n-1][1]-P[n-2][1]; }
    else { dx=next[0]-prev[0]; dz=next[1]-prev[1]; }
    const dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl;
    const px=dz, pz=-dx;                                  // العمودي الأفقي (خارجاً لمسار عكس عقارب الساعة)
    if(i>0) travelled+=Math.hypot(cur[0]-P[i-1][0], cur[1]-P[i-1][1]);
    const by = (typeof baseY==='function') ? baseY(cur[0],cur[1]) : baseY;
    const ring=[];
    for(let q=0;q<m;q++){
      const u=prof[q][0], v=prof[q][1];
      ring.push([cur[0]+px*u, by+v, cur[1]+pz*u]);
    }
    rings.push({ring, travelled, px, pz});
  }
  // رؤوس + مثلثات
  for(let i=0;i<rings.length;i++){
    const R=rings[i];
    for(let q=0;q<m;q++){
      const a=R.ring[q], b=R.ring[(q+1)%m];
      // مُسوّي تقريبي من اتجاه المقطع
      let nu=prof[(q+1)%m][1]-prof[q][1], nv=-(prof[(q+1)%m][0]-prof[q][0]);
      const nl=Math.hypot(nu,nv)||1; nu/=nl; nv/=nl;
      this.v(a[0],a[1],a[2], R.px*nu, nv, R.pz*nu, R.travelled*uvS, arc[q]*uvS, 0,0);
    }
  }
  const lim = closedPath ? rings.length : rings.length-1;
  for(let i=0;i<lim;i++){
    const A=start+i*m, B=start+((i+1)%rings.length)*m;
    for(let q=0;q<m;q++){
      const q2=(q+1)%m;
      this.quad(A+q, A+q2, B+q2, B+q);
    }
  }
  if(capEnds && !closedPath){
    for(const [idx,flip] of [[0,true],[rings.length-1,false]]){
      const R=rings[idx], cst=this.p.length/3;
      let cx=0, cy=0, cz=0;
      for(const p of R.ring){ cx+=p[0]; cy+=p[1]; cz+=p[2]; }
      cx/=m; cy/=m; cz/=m;
      const nx=(flip?-1:1)*R.pz, nz=(flip?1:-1)*R.px;   // على امتداد المسار
      this.v(cx,cy,cz, nx,0,nz, 0,0, 0,0);
      for(let q=0;q<=m;q++){ const p=R.ring[q%m];
        this.v(p[0],p[1],p[2], nx,0,nz, prof[q%m][0]*uvS, prof[q%m][1]*uvS, 0,0); }
      for(let q=0;q<m;q++){
        if(flip) this.t.push(cst, cst+1+q, cst+2+q);
        else this.t.push(cst, cst+2+q, cst+1+q);
      }
    }
  }
};

/* خراطة: مقطع [r,y] يدور حول محور رأسي — أبراج ومَشْط وأعمدة */
MB.prototype.lathe=function(cx, cy, cz, prof, segs, uvS, capTop){
  const m=prof.length, start=this.p.length/3;
  const arc=[0];
  for(let i=1;i<m;i++) arc.push(arc[i-1]+Math.hypot(prof[i][0]-prof[i-1][0], prof[i][1]-prof[i-1][1]));
  for(let s=0;s<=segs;s++){
    const a=s/segs*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
    for(let q=0;q<m;q++){
      const r=prof[q][0], y=prof[q][1];
      // مُسوّي من ميل المقطع
      const qa=Math.max(0,q-1), qb=Math.min(m-1,q+1);
      let dr=prof[qb][0]-prof[qa][0], dy=prof[qb][1]-prof[qa][1];
      const dl=Math.hypot(dr,dy)||1; dr/=dl; dy/=dl;
      const nx=ca*dy, ny=-dr, nz=sa*dy;
      const nl=Math.hypot(nx,ny,nz)||1;
      this.v(cx+ca*r, cy+y, cz+sa*r, nx/nl, ny/nl, nz/nl,
             s/segs*Math.PI*2*Math.max(r,0.4)*uvS, arc[q]*uvS, 0,0);
    }
  }
  for(let s=0;s<segs;s++){
    const A=start+s*m, B=start+(s+1)*m;
    for(let q=0;q<m-1;q++) this.quad(A+q, A+q+1, B+q+1, B+q);
  }
  if(capTop){
    const cst=this.p.length/3, r=prof[m-1][0], y=prof[m-1][1];
    this.v(cx, cy+y, cz, 0,1,0, 0,0, 0,0);
    for(let s=0;s<=segs;s++){ const a=s/segs*Math.PI*2;
      this.v(cx+Math.cos(a)*r, cy+y, cz+Math.sin(a)*r, 0,1,0,
             Math.cos(a)*r*uvS, Math.sin(a)*r*uvS, 0,0); }
    for(let s=0;s<segs;s++) this.t.push(cst, cst+1+s, cst+2+s);
  }
};

/* بثق مضلّع بحواف مشطوفة: كتلة حجرية بحرف مكسور لا صندوق حادّ */
MB.prototype.prism=function(poly, y0, height, chamfer, uvS, uOff){
  const m=poly.length;
  const shrink=(k)=>{
    // تقليص المضلّع نحو مركزه بمقدار k
    let cx=0, cz=0; for(const p of poly){ cx+=p[0]; cz+=p[1]; } cx/=m; cz/=m;
    return poly.map(p=>{ const dx=p[0]-cx, dz=p[1]-cz, d=Math.hypot(dx,dz)||1;
      return [p[0]-dx/d*k, p[1]-dz/d*k]; });
  };
  const c=chamfer||0;
  const levels=[ {poly:shrink(c), y:y0}, {poly:poly, y:y0+c}, {poly:poly, y:y0+height-c}, {poly:shrink(c), y:y0+height} ];
  const start=this.p.length/3;
  let perim=[0];
  for(let i=1;i<=m;i++) perim.push(perim[i-1]+Math.hypot(poly[i%m][0]-poly[i-1][0], poly[i%m][1]-poly[i-1][1]));
  for(const L of levels){
    for(let i=0;i<=m;i++){
      const p=L.poly[i%m];
      const q=L.poly[(i+1)%m], r=L.poly[(i-1+m)%m];
      let nx=q[1]-r[1], nz=-(q[0]-r[0]); const nl=Math.hypot(nx,nz)||1;
      this.v(p[0], L.y, p[1], nx/nl, 0, nz/nl, (perim[i]+(uOff||0))*uvS, (L.y+(uOff||0)*0)*uvS, 0,0);
    }
  }
  const stride=m+1;
  for(let l=0;l<3;l++) for(let i=0;i<m;i++){
    const A=start+l*stride+i, B=start+(l+1)*stride+i;
    this.quad(A, B, B+1, A+1);
  }
  // غطاء علوي
  const top=levels[3], cst=this.p.length/3;
  let cx=0, cz=0; for(const p of top.poly){ cx+=p[0]; cz+=p[1]; } cx/=m; cz/=m;
  this.v(cx, top.y, cz, 0,1,0, 0,0, 0,0);
  for(let i=0;i<=m;i++){ const p=top.poly[i%m];
    this.v(p[0], top.y, p[1], 0,1,0, p[0]*uvS, p[1]*uvS, 0,0); }
  for(let i=0;i<m;i++) this.t.push(cst, cst+1+i, cst+2+i);
};

/* قوس بأحجار شعاعية (voussoirs): فتحة حقيقية لا مدرّجة */
MB.prototype.voussoirArch=function(cx, cy, cz, rot, radius, depth, ringThick, count, uvS, startFrac){
  const co=Math.cos(rot), si=Math.sin(rot);
  const sf=startFrac||0;
  for(let i=0;i<count;i++){
    const a0=Math.PI*(sf+(1-2*sf)*i/count), a1=Math.PI*(sf+(1-2*sf)*(i+1)/count);
    const am=(a0+a1)/2;
    const gap=0.012;
    const poly=[];
    // مقطع الحجر في مستوى القوس (x أفقي، y رأسي) ثم يُبثق على العمق
    const pts=[[Math.cos(a0+gap)*radius, Math.sin(a0+gap)*radius],
               [Math.cos(a0+gap)*(radius+ringThick), Math.sin(a0+gap)*(radius+ringThick)],
               [Math.cos(a1-gap)*(radius+ringThick), Math.sin(a1-gap)*(radius+ringThick)],
               [Math.cos(a1-gap)*radius, Math.sin(a1-gap)*radius]];
    const st=this.p.length/3;
    for(const dz of [-depth/2, depth/2]){
      for(const p of pts){
        const wx=cx + (p[0]*co - dz*si), wz=cz + (p[0]*si + dz*co);
        this.v(wx, cy+p[1], wz, Math.cos(am)*co, Math.sin(am), Math.cos(am)*si,
               (p[0]+radius)*uvS, (p[1])*uvS, 0,0);
      }
    }
    this.quad(st+0, st+1, st+2, st+3);          // الوجه الخلفي
    this.quad(st+7, st+6, st+5, st+4);          // الوجه الأمامي
    this.quad(st+1, st+5, st+6, st+2);          // الظهر (خارج القوس)
    this.quad(st+3, st+2, st+6, st+7);          // الجانب
    this.quad(st+4, st+5, st+1, st+0);          // الجانب
    this.quad(st+0, st+3, st+7, st+4);          // البطن (داخل القوس)
  }
};
