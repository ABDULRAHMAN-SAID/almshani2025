const clamp=(v,a,b)=>v<a?a:v>b?b:v;
/* ═══ ضجيج تدرّجي (Perlin) بتَبْيين خماسي ودوران لكل طبقة ═══
   الضجيج القيمي على شبكة محاذية للمحاور يترك نقشاً ماسيّاً ظاهراً في التضاريس —
   وهو ما كان يجعل الجبال تبدو منقوشة بنسيج متكرّر. التدرّجي يزيله تماماً،
   ودوران المجال بين الطبقات يمنع اصطفاف الطبقات على نفس المحاور. */
function _h2(a,b){ const v=Math.sin(a*127.1+b*311.7)*43758.5453; return v-Math.floor(v); }
function pnoise(x,z){
  const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi;
  const u=xf*xf*xf*(xf*(xf*6-15)+10), v=zf*zf*zf*(zf*(zf*6-15)+10);
  const g=(ix,iz,dx,dz)=>{ const a=_h2(ix,iz)*6.28318530718; return Math.cos(a)*dx + Math.sin(a)*dz; };
  const n00=g(xi,zi,xf,zf), n10=g(xi+1,zi,xf-1,zf);
  const n01=g(xi,zi+1,xf,zf-1), n11=g(xi+1,zi+1,xf-1,zf-1);
  const a=n00*(1-u)+n10*u, b=n01*(1-u)+n11*u;
  return (a*(1-v)+b*v)*0.72+0.5;
}
function vnoise(x,z){ return pnoise(x,z); }
const _FC=Math.cos(0.6180339), _FS=Math.sin(0.6180339);
function fbm(x,z,oct){
  let a=.5,s=0,n=0;
  for(let i=0;i<oct;i++){
    s+=pnoise(x,z)*a; n+=a; a*=.5;
    const nx=(x*_FC - z*_FS)*2.03+17.1, nz=(x*_FS + z*_FC)*2.11+9.7;
    x=nx; z=nz;
  }
  return s/n;
}
const WORLD=3600, EDGE_R=1300;
let KNOLL=52, LAKE=null, RIVER=null;
let THERMAL_ITERS=32, TALUS=0.82, THERMAL_RATE=0.45, ROCK_DETAIL=104;
let BOWL_D=560, BOWL_H=58, BOWL_R=192, BOWL_AT=null;
const MOBILE=false;
const TER = { N:0, step:0, h:null, flow:null, ao:null, down:null, rdist:null, lakeLv:-1e9 };
function terSample(f, x, z){
  const N=TER.N, s=TER.step;
  const fx=clamp((x+WORLD*.5)/s, 0, N-1.0001), fz=clamp((z+WORLD*.5)/s, 0, N-1.0001);
  const i=fx|0, j=fz|0, tx=fx-i, tz=fz-j, k=j*N+i;
  return (f[k]*(1-tx)+f[k+1]*tx)*(1-tz) + (f[k+N]*(1-tx)+f[k+N+1]*tx)*tz;
}
const terWX = i => i*TER.step - WORLD*.5;
const terCell = (x,z) => {
  const N=TER.N;
  const i=clamp(Math.round((x+WORLD*.5)/TER.step),1,N-2), j=clamp(Math.round((z+WORLD*.5)/TER.step),1,N-2);
  return j*N+i;
};

/* كومة ثنائية صغيرة لأقصر الطرق وملء المنخفضات */
function TerHeap(cap){ this.k=new Int32Array(cap); this.v=new Float32Array(cap); this.n=0; }
TerHeap.prototype.push=function(k,v){
  if(this.n>=this.k.length){ const nk=new Int32Array(this.n*2), nv=new Float32Array(this.n*2); nk.set(this.k); nv.set(this.v); this.k=nk; this.v=nv; }
  let i=this.n++; this.k[i]=k; this.v[i]=v;
  while(i>0){ const p=(i-1)>>1; if(this.v[p]<=this.v[i]) break;
    const tk=this.k[p], tv=this.v[p]; this.k[p]=this.k[i]; this.v[p]=this.v[i]; this.k[i]=tk; this.v[i]=tv; i=p; }
};
TerHeap.prototype.pop=function(){
  const top=this.k[0]; this.n--;
  if(this.n>0){ this.k[0]=this.k[this.n]; this.v[0]=this.v[this.n];
    let i=0; for(;;){ const l=i*2+1, r=l+1; let m=i;
      if(l<this.n && this.v[l]<this.v[m]) m=l;
      if(r<this.n && this.v[r]<this.v[m]) m=r;
      if(m===i) break;
      const tk=this.k[m], tv=this.v[m]; this.k[m]=this.k[i]; this.v[m]=this.v[i]; this.k[i]=tk; this.v[i]=tv; i=m; } }
  return top;
};
function terShape(seed, N, s, h){
  const a=seed*2.3+1.1, tilt=seed*1.9+.7;
  TER.drainA=tilt;
  const tcx=Math.cos(tilt), tcz=Math.sin(tilt);
  for(let j=0;j<N;j++){
    const z=j*s-WORLD*.5;
    for(let i=0;i<N;i++){
      const x=i*s-WORLD*.5, r=Math.hypot(x,z);
      let y = (fbm(x*.0013+a, z*.0013-a, 5)-.45)*2*78          // تلال كبيرة
            + (fbm(x*.0042-a, z*.0042+a, 4)-.5)*2*38             // تلال متوسطة
            + (fbm(x*.0105+a*2, z*.0105-a*2, 3)-.5)*2*10;         // خشونة
      y -= (x*tcx+z*tcz)*.019;                                   // ميل عام: للحوض مصبّ واحد
      const e = clamp((r-EDGE_R*.80)/470, 0, 1);
      if(e>0){
        const wx = x + (fbm(x*.0012+3, z*.0012-2, 2)-.5)*820;    // تشويه المجال: سلاسل متعرّجة لا حلقة
        const wz = z + (fbm(x*.0012-5, z*.0012+7, 2)-.5)*820;
        const rg = 1-Math.abs(fbm(wx*.0024-a*2, wz*.0024+a*2, 5)*2-1);
        let rise = Math.pow(e,1.7)*(150+rg*rg*440);
        const ga = Math.atan2(z,x)-tilt;                          // مضيق المصبّ: فجوة واحدة في الطوق
        const gd = Math.abs(((ga+Math.PI*3)%(Math.PI*2))-Math.PI);
        rise *= 1 - .86*Math.exp(-(gd*gd)/.05);
        y += rise;
      }
      y += KNOLL*Math.exp(-(r*r)/(236*236));                      // ربوة القلعة نتوء طبيعي في القلب
      h[j*N+i] = y;
    }
  }
}

/* ── 2) التعرية المائية: القطرة تجرف حيث تسرع وترسّب حيث تبطؤ ── */
function terErode(seed, N, s, h){
  const R=(x=>()=>{ x|=0; x=x+0x6D2B79F5|0; let t=Math.imul(x^x>>>15,1|x); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; })(seed*7919+31);
  const DROPS = MOBILE ? 22000 : 48000, LIFE = 30;
  const inertia=.055, capF=5.4, minSlope=.011, erodeSp=.36, depoSp=.16, evap=.016, grav=6;
  const br=[], bw=[]; let wsum=0;
  for(let dj=-2;dj<=2;dj++) for(let di=-2;di<=2;di++){
    const d=Math.hypot(di,dj); if(d>2.3) continue;
    br.push(dj*N+di); const w=1-d/2.5; bw.push(w); wsum+=w;
  }
  for(let b=0;b<bw.length;b++) bw[b]/=wsum;
  const LEN=h.length;
  for(let d=0;d<DROPS;d++){
    let px=3+R()*(N-7), pz=3+R()*(N-7);
    let dx=0, dz=0, speed=1, water=1, sed=0;
    for(let l=0;l<LIFE;l++){
      const i=px|0, j=pz|0;
      if(i<1||j<1||i>=N-2||j>=N-2) break;
      const fx=px-i, fz=pz-j, k=j*N+i;
      const h00=h[k], h10=h[k+1], h01=h[k+N], h11=h[k+N+1];
      const gx=(h10-h00)*(1-fz)+(h11-h01)*fz;
      const gz=(h01-h00)*(1-fx)+(h11-h10)*fx;
      const hh=h00*(1-fx)*(1-fz)+h10*fx*(1-fz)+h01*(1-fx)*fz+h11*fx*fz;
      dx = dx*inertia - gx*(1-inertia);
      dz = dz*inertia - gz*(1-inertia);
      const dl=Math.hypot(dx,dz); if(dl<1e-6) break;
      dx/=dl; dz/=dl; px+=dx; pz+=dz;
      const ni=px|0, nj=pz|0;
      if(ni<1||nj<1||ni>=N-2||nj>=N-2) break;
      const nfx=px-ni, nfz=pz-nj, nk=nj*N+ni;
      const nh=h[nk]*(1-nfx)*(1-nfz)+h[nk+1]*nfx*(1-nfz)+h[nk+N]*(1-nfx)*nfz+h[nk+N+1]*nfx*nfz;
      const dh=nh-hh;
      const cap=Math.max(-dh, minSlope)*speed*water*capF;
      if(sed>cap || dh>0){
        const dep=(dh>0)?Math.min(dh,sed):(sed-cap)*depoSp;
        sed-=dep;
        h[k]+=dep*(1-fx)*(1-fz); h[k+1]+=dep*fx*(1-fz);
        h[k+N]+=dep*(1-fx)*fz;   h[k+N+1]+=dep*fx*fz;
      } else {
        const er=Math.min((cap-sed)*erodeSp, -dh);
        for(let b=0;b<br.length;b++){ const kk=k+br[b]; if(kk<0||kk>=LEN) continue; h[kk]-=er*bw[b]; }
        sed+=er;
      }
      speed=Math.sqrt(Math.max(0, speed*speed + (-dh)*grav));
      water*=(1-evap);
    }
  }
}

/* ── 3أ) ملء المنخفضات (Priority-Flood): بدونه يتوقّف الماء في كل حفرة حفرتها التعرية.
       النسخة المملوءة تُستعمل لتوجيه الجريان فقط — والأرض تبقى بحفرها. ── */
function terFill(N, h){
  const hf=new Float32Array(h), seen=new Uint8Array(N*N), hp=new TerHeap(1<<14);
  for(let i=0;i<N;i++) for(const k of [i, (N-1)*N+i, i*N, i*N+N-1])
    if(!seen[k]){ seen[k]=1; hp.push(k, hf[k]); }
  const NB=[-1,1,-N,N];
  while(hp.n>0){
    const k=hp.pop(), i=k%N;
    for(let n=0;n<4;n++){
      const kk=k+NB[n];
      if(kk<0||kk>=N*N||seen[kk]) continue;
      if(n<2 && Math.abs((kk%N)-i)!==1) continue;                 // لا يلتفّ الصفّ على الصفّ التالي
      seen[kk]=1;
      if(hf[kk] < hf[k]+1e-3) hf[kk]=hf[k]+1e-3;                  // ارفعه إلى مستوى الفيض
      hp.push(kk, hf[kk]);
    }
  }
  return hf;
}

/* ── 3ب) تراكم الجريان على السطح المملوء: شبكة تصريف متّصلة حتى الحافة ── */
function terFlow(N, hf){
  const flow=TER.flow=new Float32Array(N*N);
  const down=TER.down=new Int32Array(N*N).fill(-1);
  const ord=new Int32Array(N*N);
  for(let i=0;i<N*N;i++){ ord[i]=i; flow[i]=1; }
  ord.sort((p,q)=>hf[q]-hf[p]);
  const NB=[-1,1,-N,N,-N-1,-N+1,N-1,N+1];
  for(let t=0;t<ord.length;t++){
    const k=ord[t], i=k%N, j=(k/N)|0;
    if(i<1||j<1||i>=N-1||j>=N-1) continue;
    let bk=-1, bh=hf[k];
    for(let n=0;n<8;n++){ const kk=k+NB[n]; if(hf[kk]<bh){ bh=hf[kk]; bk=kk; } }
    if(bk>=0){ flow[bk]+=flow[k]; down[k]=bk; }
  }
}

/* ── 4) البحيرة = المنخفض الذي ملأه الفيض: مستواها هو مستوى الفيض وشاطئها خطّ كنتور ── */
function terLake(N, s, h, hf){
  const lakeM=TER.lake=new Uint8Array(N*N);
  const seen=new Uint8Array(N*N);
  let best=null;
  const stack=new Int32Array(N*N);
  const NB=[-1,1,-N,N];
  for(let j=2;j<N-2;j++) for(let i=2;i<N-2;i++){
    const k0=j*N+i;
    if(seen[k0] || hf[k0]-h[k0] < 1.2) continue;
    // منطقة متّصلة من الخلايا المغمورة
    let sp=0, area=0, cx=0, cz=0, lvl=0, ok=true;
    stack[sp++]=k0; seen[k0]=1;
    const cells=[];
    while(sp>0){
      const k=stack[--sp], ii=k%N, jj=(k/N)|0;
      const x=terWX(ii), z=terWX(jj), r=Math.hypot(x,z);
      if(r<300 || r>EDGE_R*1.02 || ii<2 || jj<2 || ii>=N-2 || jj>=N-2){ ok=false; }
      cells.push(k); area++; cx+=x; cz+=z; lvl+=hf[k];
      if(area>52000){ ok=false; }
      for(let n=0;n<4;n++){
        const kk=k+NB[n];
        if(kk<0||kk>=N*N||seen[kk]) continue;
        if(n<2 && Math.abs((kk%N)-ii)!==1) continue;
        if(hf[kk]-h[kk] < 0.8) continue;
        seen[kk]=1; stack[sp++]=kk;
      }
    }
    if(!ok || area<45) continue;
    if(!best || area>best.area) best={cells, area, x:cx/area, z:cz/area, level:lvl/area};
  }
  if(!best){ LAKE=null; TER.lakeLv=-1e9; return; }
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const k of best.cells){ lakeM[k]=1; const x=terWX(k%N), z=terWX((k/N)|0); if(x<x0)x0=x; if(x>x1)x1=x; if(z<z0)z0=z; if(z>z1)z1=z; }
  TER.lakeLv=best.level;
  LAKE={ x:best.x, z:best.z, r:Math.sqrt(best.area*s*s/Math.PI), level:best.level, x0:x0-s, x1:x1+s, z0:z0-s, z1:z1+s };
}

/* ── 5) النهر: المجرى الرئيس يُقرأ من شبكة التصريف ── */
function terRiver(N, s, h, idx){
  const flow=TER.flow, down=TER.down;
  let main=-1, bf=0;
  for(let j=3;j<N-3;j++) for(let i=3;i<N-3;i++){
    const x=terWX(i), z=terWX(j), r=Math.hypot(x,z);
    if(r<260 || r>900) continue;                       // المجرى الرئيس يمرّ بالمملكة لا بأطرافها
    const k=j*N+i; if(flow[k]>bf){ bf=flow[k]; main=k; }
  }
  if(main<0){ RIVER=null; return; }
  const NB=[-1,1,-N,N,-N-1,-N+1,N-1,N+1];
  // أعلى المجرى: اتبع أكبر رافد صاعداً
  const up=[]; let k=main, guard=0;
  while(guard++<N*2){
    up.push(k);
    let bk=-1, bfl=0;
    for(let n=0;n<8;n++){ const kk=k+NB[n]; if(down[kk]===k && flow[kk]>bfl){ bfl=flow[kk]; bk=kk; } }
    if(bk<0 || bfl<bf*.018) break;
    k=bk;
  }
  up.reverse();
  // أسفل المجرى: اتبع الانحدار حتى البحيرة أو خارج الساحة
  const dn=[]; k=main; guard=0;
  while(guard++<N*2){
    const nk=down[k]; if(nk<0) break;
    dn.push(nk);
    const i=nk%N, j=(nk/N)|0, r=Math.hypot(terWX(i),terWX(j));
    if(r>EDGE_R*1.28) break;
    if(TER.lake && TER.lake[nk]) break;
    k=nk;
  }
  const cells=up.concat(dn);
  if(cells.length<8){ RIVER=null; return; }
  // تنعيم وإعادة توزيع
  const raw=cells.map(c=>({x:terWX(c%N), z:terWX((c/N)|0)}));
  const sm=[];
  for(let i=0;i<raw.length;i++){
    let sx=0, sz=0, n=0;
    for(let d=-3;d<=3;d++){ const q=raw[i+d]; if(!q) continue; sx+=q.x; sz+=q.z; n++; }
    sm.push({x:sx/n, z:sz/n});
  }
  const pts=[]; let acc=1e9;
  for(let i=0;i<sm.length;i++){
    if(i===0 || i===sm.length-1){ pts.push(sm[i]); acc=0; continue; }
    acc += Math.hypot(sm[i].x-sm[i-1].x, sm[i].z-sm[i-1].z);
    if(acc>34){ pts.push(sm[i]); acc=0; }
  }
  const w = clamp(Math.sqrt(bf)*.62, 26, 52);
  RIVER = { pts, w, nx:1, nz:0, D0:0, ang:0 };
  // حقل مسافة النهر (يستعمله كل شيء بدل حساب المسافة إلى المضلّع مراراً)
  const rd=TER.rdist=new Float32Array(N*N).fill(1e9);
  for(let p=0;p<pts.length-1;p++){
    const a=pts[p], b=pts[p+1];
    const i0=clamp(Math.floor((Math.min(a.x,b.x)+WORLD*.5)/s)-9, 0, N-1);
    const i1=clamp(Math.ceil ((Math.max(a.x,b.x)+WORLD*.5)/s)+9, 0, N-1);
    const j0=clamp(Math.floor((Math.min(a.z,b.z)+WORLD*.5)/s)-9, 0, N-1);
    const j1=clamp(Math.ceil ((Math.max(a.z,b.z)+WORLD*.5)/s)+9, 0, N-1);
    const dx=b.x-a.x, dz=b.z-a.z, L2=dx*dx+dz*dz||1;
    for(let j=j0;j<=j1;j++){ const z=terWX(j);
      for(let i=i0;i<=i1;i++){ const x=terWX(i);
        let t=((x-a.x)*dx+(z-a.z)*dz)/L2; t=t<0?0:t>1?1:t;
        const d=Math.hypot(x-(a.x+dx*t), z-(a.z+dz*t));
        const kk=j*N+i; if(d<rd[kk]) rd[kk]=d;
      } }
  }
  // نحت المجرى: قناة على شكل V مع ضفتين
  for(let kk=0;kk<N*N;kk++){
    const d=rd[kk]; if(d>w*2.4) continue;
    if(d<w) h[kk] -= Math.pow(1-d/w, 1.25)*22;
    else h[kk] += Math.pow(1-(d-w)/(w*1.4), 2)*4.5;
  }
}

/* ── 6) الطرق: أقل كلفة صعود من فجوة الجبل إلى ربوة القلعة ── */
function terRoutes(N, s, h, angles){
  const cost=new Float32Array(N*N).fill(Infinity);
  const prev=new Int32Array(N*N).fill(-1);
  const done=new Uint8Array(N*N);
  const rd=TER.rdist, lake=TER.lake, rw=RIVER?RIVER.w:0;
  const start=terCell(0,0);
  cost[start]=0;
  const hp=new TerHeap(1<<15); hp.push(start,0);
  const NB=[-1,1,-N,N,-N-1,-N+1,N-1,N+1];
  const NBD=[s,s,s,s,s*1.4142,s*1.4142,s*1.4142,s*1.4142];
  while(hp.n>0){
    const k=hp.pop(); if(done[k]) continue; done[k]=1;
    const i=k%N, j=(k/N)|0;
    if(i<1||j<1||i>=N-1||j>=N-1) continue;
    const c0=cost[k], h0=h[k];
    for(let n=0;n<8;n++){
      const kk=k+NB[n]; if(done[kk]) continue;
      const d=NBD[n], grade=Math.abs(h[kk]-h0)/d;
      let c = d*(1 + 40*grade*grade);
      if(grade>.34) c += d*26;                                   // الطريق لا يتسلّق الجرف
      if(rd && rd[kk]<rw*1.25) c += 1400;                        // العبور مكلف: يختار أضيق موضع
      if(lake && lake[kk]) c += 9000;
      const nc=c0+c;
      if(nc<cost[kk]){ cost[kk]=nc; prev[kk]=k; hp.push(kk,nc); }
    }
  }
  const out=[];
  for(const a0 of angles){
    // الفجوة: الاتجاه الذي يبلغ فيه الطوق أوطأ ارتفاع
    let bestA=a0, bestH=1e9;
    for(let da=-.62; da<=.62; da+=.022){
      const A=a0+da; let mx=-1e9;
      for(let r=EDGE_R*.86; r<=EDGE_R*1.34; r+=26)
        mx=Math.max(mx, terSample(h, Math.cos(A)*r, Math.sin(A)*r));
      if(mx<bestH){ bestH=mx; bestA=A; }
    }
    const far=terCell(Math.cos(bestA)*EDGE_R*1.30, Math.sin(bestA)*EDGE_R*1.30);
    const path=[]; let k=far, guard=0;
    while(k>=0 && guard++<N*4){ path.push(k); k=prev[k]; }
    if(path.length<6) continue;
    const pts=path.map(c=>({x:terWX(c%N), z:terWX((c/N)|0)}));
    // تنعيم: الطريق منحنٍ لا مسنّن
    const sm=pts.map((p,i)=>{
      let sx=0, sz=0, n=0;
      for(let d=-3;d<=3;d++){ const q=pts[i+d]; if(!q) continue; sx+=q.x; sz+=q.z; n++; }
      return {x:sx/n, z:sz/n};
    });
    out.push({ a:bestA, path:sm });
  }
  return out;
}

/* ── 7) تسوية ممرّ الطريق: حفر وردم كما تُشقّ الطرق فعلاً ── */
function terGrade(N, s, h, routes){
  const prof=[];
  for(const R of routes){
    const P=R.path.filter((q,i)=>i%3===0||i===R.path.length-1), ys=P.map(p=>terSample(h,p.x,p.z));
    for(let it=0; it<8; it++)                                     // ملف ارتفاع ناعم: ميول لطيفة
      for(let i=1;i<ys.length-1;i++) ys[i]=(ys[i-1]+ys[i]*2+ys[i+1])*.25;
    prof.push({P, ys});
  }
  const CORE=9, FEATH=26;
  for(let j=1;j<N-1;j++){ const z=terWX(j);
    for(let i=1;i<N-1;i++){ const x=terWX(i);
      let bd=1e9, by=0;
      for(const {P,ys} of prof){
        for(let p=0;p<P.length-1;p++){
          const a=P[p], b=P[p+1], dx=b.x-a.x, dz=b.z-a.z, L2=dx*dx+dz*dz||1;
          let t=((x-a.x)*dx+(z-a.z)*dz)/L2; t=t<0?0:t>1?1:t;
          const d=Math.hypot(x-(a.x+dx*t), z-(a.z+dz*t));
          if(d<bd){ bd=d; by=ys[p]+(ys[p+1]-ys[p])*t; }
        }
      }
      if(bd>FEATH) continue;
      const k=1-clamp((bd-CORE)/(FEATH-CORE),0,1);
      const kk=j*N+i; h[kk]=h[kk]*(1-k)+by*k;
    } }
}

/* ── 8) انحجاب محيط تقريبي: الأودية أغمق والأعراف أفتح ── */
function terAO(N, s, h){
  const ao=TER.ao=new Float32Array(N*N).fill(1);
  const RS=[2,5,9];
  for(let j=1;j<N-1;j++) for(let i=1;i<N-1;i++){
    const k=j*N+i, h0=h[k]; let occ=0;
    for(const R of RS){
      let mx=-1e9;
      for(let n=0;n<8;n++){
        const a=n/8*Math.PI*2;
        const ii=clamp(i+Math.round(Math.cos(a)*R),0,N-1), jj=clamp(j+Math.round(Math.sin(a)*R),0,N-1);
        mx=Math.max(mx, (h[jj*N+ii]-h0)/(R*s));
      }
      occ += clamp(mx,0,1)/RS.length;
    }
    ao[k]=clamp(1-occ*.52, .66, 1);
  }
}


/* تعرية حرارية: المنحدر الذي يتجاوز زاوية الاستقرار ينهار ويتراكم عند سفحه.
   بدونها تُخلّف تعرية القطرات على الجرف أخاديد متوازية تشبه الأنياب لا الجبال. */
function terThermal(N, s, h, iters, talusAngle, rate){
  const talus = talusAngle * s;
  const NB=[-1,1,-N,N,-N-1,-N+1,N-1,N+1];
  const NBD=[1,1,1,1,1.4142,1.4142,1.4142,1.4142];
  const delta=new Float32Array(N*N);
  const dh=new Float32Array(8);
  for(let it=0; it<iters; it++){
    delta.fill(0);
    for(let j=1;j<N-1;j++) for(let i=1;i<N-1;i++){
      const k=j*N+i, h0=h[k];
      let total=0, dmax=0;
      for(let n=0;n<8;n++){
        const d = h0 - h[k+NB[n]] - talus*NBD[n];
        dh[n] = d>0 ? d : 0;
        if(d>0){ total+=d; if(d>dmax) dmax=d; }
      }
      if(total<=0) continue;
      const move = dmax*0.5*rate;
      delta[k]-=move;
      for(let n=0;n<8;n++) if(dh[n]>0) delta[k+NB[n]] += move*(dh[n]/total);
    }
    for(let k=0;k<h.length;k++) h[k]+=delta[k];
  }
}


/* تسوية موقع القلعة: كل حصن يُقام على مصطبة مسوّاة، لا على نتوء متعرّج.
   القرص الداخلي يستوي تماماً ثم يتلاشى إلى الأرض الطبيعية. */
function terTerrace(N, s, h, cx, cz, rInner, rOuter){
  let sum=0, n=0;
  for(let j=1;j<N-1;j++){ const z=terWX(j);
    for(let i=1;i<N-1;i++){ const x=terWX(i);
      if(Math.hypot(x-cx,z-cz)<=rInner){ sum+=h[j*N+i]; n++; } } }
  if(!n) return 0;
  const level=sum/n;
  for(let j=1;j<N-1;j++){ const z=terWX(j);
    for(let i=1;i<N-1;i++){ const x=terWX(i);
      const d=Math.hypot(x-cx,z-cz);
      if(d>rOuter) continue;
      let k=1;
      if(d>rInner){ const t=(d-rInner)/(rOuter-rInner); k=1-(t*t*(3-2*t)); }
      const idx=j*N+i;
      h[idx]=h[idx]*(1-k)+level*k;
    } }
  return level;
}


/* تفصيل الصخر: أعراف ثانوية وأخاديد دقيقة على الميول الحادّة العالية.
   التعرية الحرارية تُنعّم الجبل حتى يصير كتلة صمّاء — هذا يعيد له حدّته. */
function terRockDetail(N, s, h, seed, amp){
  const src=Float32Array.from(h);
  const slopeOf=(i,j)=>{
    const im=Math.max(i-1,0), ip=Math.min(i+1,N-1), jm=Math.max(j-1,0), jp=Math.min(j+1,N-1);
    const dx=(src[j*N+ip]-src[j*N+im])/((ip-im)*s), dz=(src[jp*N+i]-src[jm*N+i])/((jp-jm)*s);
    return Math.hypot(dx,dz);
  };
  let lo=1e9, hi=-1e9; for(const v of src){ if(v<lo)lo=v; if(v>hi)hi=v; }
  const span=Math.max(1,hi-lo);
  for(let j=1;j<N-1;j++) for(let i=1;i<N-1;i++){
    const k=j*N+i, x=terWX(i), z=terWX(j);
    const sl=slopeOf(i,j), alt=(src[k]-lo)/span;
    const w=clamp((sl-0.22)/0.42,0,1)*clamp((alt-0.16)/0.30,0,1);
    if(w<=0.01) continue;
    // ضجيج مطويّ: يعطي أعرافاً حادّة لا نتوءات مستديرة
    // بدون تشويه المجال تخرج الأضلاع متوازية منتظمة كتضليع صناعي
    const qx=x+(fbm(x*0.0011+7, z*0.0011-3, 2)-0.5)*760;
    const qz=z+(fbm(x*0.0011-9, z*0.0011+5, 2)-0.5)*760;
    const r0=1-Math.abs(fbm(qx*0.0026-seed*3, qz*0.0026+seed*3, 4)*2-1);
    const r1=1-Math.abs(fbm(x*0.0062+seed, z*0.0062-seed, 4)*2-1);
    const r2=1-Math.abs(fbm(x*0.0155-seed*2, z*0.0155+seed*2, 3)*2-1);
    h[k] += (Math.pow(r0,1.4)*0.46 + Math.pow(r1,1.5)*0.36 + Math.pow(r2,1.7)*0.18 - 0.34) * amp * w;
  }
}

/* شقّ المصبّ: مجرى يُحفر على **أقلّ المسارات ارتفاعاً** من أعمق نقطة في الوادي
   إلى حافّة الخريطة.

   المشكلة: الوادي كلّه منخفض مغلق — حلّ التصريف يملأه بعمق 452 وحدة، فلا يميّز
   مستخرج البحيرات بحيرةً من غرقٍ عامّ، فتخرج الخريطة بلا ماء.

   ولا ينفع اتّباع `down` على السطح المملوء: السطح المملوء **مستوٍ تماماً**، فلا
   جار أخفض لأي خليّة، فتخرج `down = -1` ويتوقّف المشي عند أول خطوة (وهذا ما حدث).
   ولا ينفع نحت مضيق مستقيم في الطوق: أخفض نقطة قد تكون بعيدة عنه فيبقى الماء
   محبوساً دونه.

   الحلّ: مسار «الأدنى-أعلى» (minimax) — نبدأ من حافّة الخريطة ونزحف بأولوية
   أقلّ ارتفاع بلغناه، فيكون لكل خليّة أوطأ سرج يفصلها عن الخارج. ثم نتتبّع
   المسار من أعمق نقطة إلى الحافّة ونحفر على طوله قاعاً هابطاً. */
function terBreach(N, s, h){
  // تمريرة واحدة تصرّف أعمق منخفض وحده، وفي الوادي منخفضات عدّة: بعضها يبقى
  // مغلقاً فيتّصل بحوض البحيرة عند الفيض، فيرفض المستخرج المنطقة كلّها.
  // نكرّر حتى يجفّ ميدان اللعب.
  const carved=new Uint8Array(N*N);
  for(let pass=0; pass<5; pass++){
    if(!terBreachOnce(N, s, h, carved)) break;
  }
  // تنعيم المجرى: القطع بشرط `min` يترك حدّاً حادّاً كالسكّين على الضفاف.
  // تمريرتا تنعيم على الخلايا المحفورة وحدها تحوّلانه إلى وادٍ منحوت.
  const tmp=new Float32Array(N*N);
  for(let it=0; it<2; it++){
    tmp.set(h);
    for(let j=1;j<N-1;j++) for(let i=1;i<N-1;i++){
      const k=j*N+i;
      if(!carved[k]) continue;
      h[k] = (tmp[k]*4 + tmp[k-1]+tmp[k+1]+tmp[k-N]+tmp[k+N]
              + (tmp[k-N-1]+tmp[k-N+1]+tmp[k+N-1]+tmp[k+N+1])*0.5) / 10;
    }
  }
}
function terBreachOnce(N, s, h, carved){
  const hf = terFill(N, h);
  let deepest=-1, dmax=0;
  // البحث داخل ميدان اللعب وحده: منخفضات الأركان خارج الطوق لا تعني اللاعب
  for(let k=0;k<N*N;k++){
    const x=terWX(k%N), z=terWX((k/N)|0);
    if(x*x+z*z > EDGE_R*EDGE_R*1.14) continue;
    const d=hf[k]-h[k]; if(d>dmax){ dmax=d; deepest=k; }
  }
  if(deepest<0 || dmax<24) return false;

  // زحف أولوية من الحافّة: barrier[k] = أوطأ «أعلى ارتفاع» على مسار إلى الخارج
  const barrier=new Float32Array(N*N).fill(Infinity);
  const parent=new Int32Array(N*N).fill(-1);
  const done=new Uint8Array(N*N);
  const hp=new TerHeap(N*8);
  for(let i=0;i<N;i++) for(const k of [i, (N-1)*N+i, i*N, i*N+N-1]){
    if(barrier[k]===Infinity){ barrier[k]=h[k]; hp.push(k, h[k]); }
  }
  const NB=[-1,1,-N,N];
  while(hp.n>0){
    const k=hp.pop();
    if(done[k]) continue;
    done[k]=1;
    if(k===deepest) break;
    const i=k%N;
    for(let n=0;n<4;n++){
      const kk=k+NB[n];
      if(kk<0||kk>=N*N||done[kk]) continue;
      if(n<2 && Math.abs((kk%N)-i)!==1) continue;
      const cand=Math.max(barrier[k], h[kk]);
      if(cand<barrier[kk]){ barrier[kk]=cand; parent[kk]=k; hp.push(kk, cand); }
    }
  }
  if(parent[deepest]<0) return false;

  // الحفر على طول المسار: القاع ينزل مع كل خطوة فلا يبقى فيه مطبّ
  const HALF=112;
  let k=deepest, bed=h[deepest]-3, guard=0;
  while(k>=0 && guard++ < N*8){
    const cx=terWX(k%N), cz=terWX((k/N)|0);
    // الحدّ الأدنى صفر لا واحد: حصر الحفر داخل الإطار كان يترك صفّ الحافّة مرتفعاً
    // فيقف المجرى على بُعد خليّة واحدة من المخرج ويبقى الوادي مغلقاً كما كان.
    const i0=Math.max(0,Math.floor((cx-HALF+WORLD/2)/s)), i1=Math.min(N-1,Math.ceil((cx+HALF+WORLD/2)/s));
    const j0=Math.max(0,Math.floor((cz-HALF+WORLD/2)/s)), j1=Math.min(N-1,Math.ceil((cz+HALF+WORLD/2)/s));
    for(let j=j0;j<=j1;j++){ const z=terWX(j);
      for(let i=i0;i<=i1;i++){ const x=terWX(i);
        const d=Math.hypot(x-cx, z-cz);
        if(d>HALF) continue;
        const kk=j*N+i;
        // قاع مستوٍ ثم ضفّتان ترتفعان: مجرى لا خندق بجدارين عموديين
        const t=Math.max(0,(d-HALF*0.26)/(HALF*0.74));
        const target = bed + t*t*46;
        if(h[kk]>target){ h[kk]=target; carved[kk]=1; }
      } }
    const nk=parent[k];
    if(nk<0) break;
    bed -= Math.hypot(terWX(nk%N)-cx, terWX((nk/N)|0)-cz) * 0.030;
    k=nk;
  }
  return true;
}

/* حوض البحيرة: منخفض **مغلق** يُنحت عمداً بعد التعرية.
   ترك البحيرة لمصادفة التضاريس يعني خريطة بلا ماء في أغلب البذور — وقد حدث.
   ولا يكفي حفر قعر ورفع حافّة: ميل الوادي العامّ (0.019) يهبط عبر قطر الحوض
   أكثر ممّا ترفعه الحافّة، فيتسرّب الماء من الجهة المنخفضة. الصواب أن يُقاس
   **أوطأ نقطة في حلقة الحافّة** ثم يُحفر القعر تحتها كلّه — عندها يكون
   الانغلاق مضموناً هندسياً لا مرجوّاً. */
function terLakeBasin(N, s, h, seed){
  const ringLo=BOWL_D*1.16, ringHi=BOWL_D*1.48, outA=TER.drainA;
  let bx=0, bz=0, bestH=1e9, found=false;
  for(let t=0;t<720;t++){
    const a=(t/720)*Math.PI*2;
    // لا يُحفر في اتجاه المصبّ: هناك ينفتح الطوق فلا تنغلق حافّة
    const da=Math.abs(((a-outA+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(da<0.95) continue;
    for(let r=ringLo; r<=ringHi; r+=s*1.5){
      const x=Math.cos(a)*r, z=Math.sin(a)*r;
      if(Math.hypot(x,z) < 620) continue;                 // ساحة القلعة وحرمها يبقيان يابسين
      const y=h[terCell(x,z)];
      if(y<bestH){ bestH=y; bx=x; bz=z; found=true; }
    }
  }
  if(!found) return;

  const R=BOWL_R, RIM=R*1.54, D=BOWL_H;
  // 1) أوطأ نقطة في حلقة الحافّة: هي التي يتسرّب منها الماء لو تجاهلناها
  let rimMin=1e9;
  for(let t=0;t<1440;t++){
    const a=(t/1440)*Math.PI*2;
    for(let r=R; r<=RIM; r+=s){
      const y=h[terCell(bx+Math.cos(a)*r, bz+Math.sin(a)*r)];
      if(y<rimMin) rimMin=y;
    }
  }
  // 2) القعر يُخفض تحت تلك النقطة كلّه، بعمق يتلاشى نحو الشاطئ
  for(let j=1;j<N-1;j++){ const z=terWX(j);
    for(let i=1;i<N-1;i++){ const x=terWX(i);
      const d=Math.hypot(x-bx, z-bz);
      if(d>RIM) continue;
      const k=j*N+i;
      if(d<=R){
        const t=d/R;
        const target = rimMin - 1.2 - D*Math.pow(1-t*t, 1.10);
        if(h[k]>target) h[k]=target;
      }
      // لا تُرفع حلقة الحافّة أبداً: رفعها يقيم سدّاً عرضياً في الوادي يحبس
      // النهر فيغرق الحوض الأعلى كلّه — وقد حدث: 43 ألف خليّة غارقة بعمق 451.
      // الانغلاق مضمون أصلاً لأن القعر كلّه تحت أوطأ نقطة في الحافّة الطبيعية.
    } }
  BOWL_AT=[bx,bz];
}

/* ── التوليد الكامل ── */
function terGenerate(seed){
  const N = TER.N = MOBILE ? 193 : 257;
  const s = TER.step = WORLD/(N-1);
  const h = TER.h = new Float32Array(N*N);
  terShape(seed, N, s, h);
  terErode(seed, N, s, h);
  terThermal(N, s, h, THERMAL_ITERS, TALUS, THERMAL_RATE);
  terRockDetail(N, s, h, seed, ROCK_DETAIL);
  terBreach(N, s, h);
  terLakeBasin(N, s, h, seed);
  const hf = terFill(N, h);
  terFlow(N, hf);
  terLake(N, s, h, hf);
  terRiver(N, s, h, seed);
}
/* عمق الغمر عند نقطة — محدود بجوار البحيرة وحده.
   بدون هذا الحدّ يصير كل ما هو أوطأ من مستوى بحيرة مرتفعة «تحت الماء» في كل الخريطة. */
function lakeNear(x,z){
  if(!LAKE || !TER.lake) return false;
  if(x<LAKE.x0||x>LAKE.x1||z<LAKE.z0||z>LAKE.z1) return false;
  const N=TER.N, k=terCell(x,z), i=k%N, j=(k/N)|0, L=TER.lake;
  for(let dj=-1;dj<=1;dj++){ const jj=j+dj; if(jj<0||jj>=N) continue;
    for(let di=-1;di<=1;di++){ const ii=i+di; if(ii<0||ii>=N) continue; if(L[jj*N+ii]) return true; } }
  return false;
}
function lakeDepth(x,z){ return lakeNear(x,z) ? LAKE.level - terrainYExactRaw(x,z) : -1e9; }
