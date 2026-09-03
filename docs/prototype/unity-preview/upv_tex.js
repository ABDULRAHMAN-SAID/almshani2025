/* ═══════════ خامات مرسومة لا ضجيج سحابي ═══════════
   الفرق بين «أرض تبدو مطموسة» و«أرض تبدو عشباً»: أن تُرسَم آلاف الأعواد
   والحصى والشقوق فعلاً، لا أن يُملأ السطح بضجيج مموّه.
   كل دالّة هنا تُقابل نظيرتها في C# حرفاً بحرف.                              */

function TexCanvas(size){
  this.n=size;
  this.r=new Float32Array(size*size);
  this.g=new Float32Array(size*size);
  this.b=new Float32Array(size*size);
  this.h=new Float32Array(size*size);   // ارتفاع لخريطة النتوء
}
TexCanvas.prototype.wrap=function(v){ const n=this.n; const m=v%n; return m<0?m+n:m; };
TexCanvas.prototype.put=function(x,y,r,g,b,a,dh){
  if(a<=0) return;
  if(a>1) a=1;
  const xi=this.wrap(Math.round(x)), yi=this.wrap(Math.round(y)), k=yi*this.n+xi;
  this.r[k]+=(r-this.r[k])*a; this.g[k]+=(g-this.g[k])*a; this.b[k]+=(b-this.b[k])*a;
  this.h[k]+=dh*a;
};
TexCanvas.prototype.get=function(x,y){
  const k=this.wrap(y)*this.n+this.wrap(x); return [this.r[k],this.g[k],this.b[k]];
};

/* مولّد عشوائي حتمي */
function texRng(seed){ let s=(seed>>>0)||1;
  return ()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; }; }

/* أرضية مبقّعة: الأساس الذي يظهر بين الأعواد والحصى */
function texBase(c, seed, lo, hi, hAmp){
  const n=c.n, N1=tNoise(5,seed), N2=tNoise(13,seed+77), N3=tNoise(37,seed+911);
  for(let y=0;y<n;y++){ const v=(y+0.5)/n;
    for(let x=0;x<n;x++){ const u=(x+0.5)/n;
      let t=N1(u,v)*0.55+N2(u,v)*0.30+N3(u,v)*0.15;
      t=Math.min(1,Math.max(0,(t-0.28)*1.9));
      const k=y*n+x;
      c.r[k]=lo[0]+(hi[0]-lo[0])*t; c.g[k]=lo[1]+(hi[1]-lo[1])*t; c.b[k]=lo[2]+(hi[2]-lo[2])*t;
      c.h[k]=(t-0.5)*hAmp;
    } }
}

/* عود عشب: خطّ مقوّس مدبّب بحافّة مضيئة */
function texBlade(c, x0, y0, angle, len, width, col, rng){
  const curve=(rng()-0.5)*0.9;
  const steps=Math.max(3, Math.ceil(len*1.35));
  for(let q=0;q<=steps;q++){
    const t=q/steps;
    const a=angle+curve*t*t;
    const x=x0+Math.cos(a)*len*t, y=y0+Math.sin(a)*len*t;
    const w=width*(1-t*0.92);
    const shade=0.78+0.44*t;                       // الطرف أفتح
    const r=col[0]*shade, g=col[1]*shade, b=col[2]*shade;
    const half=Math.max(0.5,w);
    const px=-Math.sin(a), py=Math.cos(a);
    for(let o=-Math.ceil(half); o<=Math.ceil(half); o++){
      const cov=Math.min(1,Math.max(0,half+0.5-Math.abs(o)));
      if(cov<=0) continue;
      const edge = Math.abs(o)>half-0.85 ? 0.86 : 1.0;   // حافّة أغمق قليلاً = حجم
      c.put(x+px*o, y+py*o, r*edge, g*edge, b*edge, cov, 0.55*cov*(1-t*0.5));
    }
  }
}

/* حصاة: قرص بيضوي مضاء من أعلى بظلّ تماس */
function texPebble(c, cx, cy, rx, ry, rot, col, rng){
  const co=Math.cos(rot), si=Math.sin(rot);
  const R=Math.ceil(Math.max(rx,ry))+2;
  const bumpy=0.12+rng()*0.22;
  const ph=rng()*6.28;
  for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){
    const lx=(dx*co+dy*si)/rx, ly=(-dx*si+dy*co)/ry;
    const ang=Math.atan2(ly,lx);
    const rr=1+Math.sin(ang*3+ph)*bumpy*0.35;       // حافّة غير دائرية
    const d=(lx*lx+ly*ly)/(rr*rr);
    if(d>1.25) continue;
    if(d>1){                                          // ظلّ التماس حول الحصاة
      const s=1-(d-1)/0.25;
      c.put(cx+dx, cy+dy, 0,0,0, 0.22*s, -0.08*s);
      continue;
    }
    const dome=Math.sqrt(Math.max(0,1-d));
    const lit=0.62+0.72*dome + (-ly)*0.30;            // إضاءة من الأعلى
    const grain=0.92+0.16*Math.sin((dx*2.7+dy*3.1+ph)*1.7);
    const a=Math.min(1,(1-d)*6+0.35);
    c.put(cx+dx, cy+dy, col[0]*lit*grain, col[1]*lit*grain, col[2]*lit*grain, a, dome*1.5);
  }
}

/* شقّ: خطّ متعرّج غائر بشفة مضيئة على جانب */
function texCrack(c, x0, y0, angle, len, depth, rng){
  let x=x0, y=y0, a=angle;
  const steps=Math.ceil(len);
  for(let q=0;q<steps;q++){
    a+=(rng()-0.5)*0.45;
    x+=Math.cos(a); y+=Math.sin(a);
    const w=depth*(0.6+0.8*Math.sin(q/steps*Math.PI));
    const px=-Math.sin(a), py=Math.cos(a);
    for(let o=-2;o<=2;o++){
      const t=Math.abs(o)/2.2;
      if(t>1) continue;
      const dark=1-0.78*(1-t);
      c.put(x+px*o, y+py*o, dark, dark, dark, (1-t)*0.85*Math.min(1,w), -(1-t)*1.6*w);
    }
    // شفة مضيئة
    c.put(x+px*2.2, y+py*2.2, 1.18,1.18,1.18, 0.20, 0.5*w);
    if(rng()<0.035){ texCrack(c, x, y, a+(rng()<0.5?1:-1)*(0.6+rng()*0.6), len*0.35, depth*0.7, rng); }
  }
}

/* شريط طبقة صخرية: حزام أفقي مموّج بلون مختلف */
function texStratum(c, y0, thickness, tone, warpAmp, seed){
  const n=c.n, W=tNoise(6,seed);
  for(let x=0;x<n;x++){
    const u=(x+0.5)/n;
    const off=(W(u,0.5)-0.5)*warpAmp + (W(u*2.3,0.17)-0.5)*warpAmp*0.4;
    for(let dy=-thickness; dy<=thickness; dy++){
      const t=1-Math.abs(dy)/thickness;
      if(t<=0) continue;
      const y=y0+off+dy;
      const k=c.wrap(Math.round(y))*n+x;
      const f=t*0.75;
      c.r[k]*= (1-f)+tone*f; c.g[k]*=(1-f)+tone*f; c.b[k]*=(1-f)+tone*f;
      c.h[k]+= (tone-1)*t*2.2;
    }
  }
}

/* ═══ الخامات النهائية ═══ */

function drawGrassGround(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.129,0.118,0.078], [0.243,0.220,0.129], 1.2);   // تربة تحت العشب
  // بقع تربة عارية تبقى ظاهرة
  const blades=Math.round(15000*k*k);
  const HUES=[[0.196,0.376,0.129],[0.259,0.447,0.157],[0.318,0.494,0.184],
              [0.145,0.302,0.106],[0.400,0.510,0.212],[0.482,0.522,0.243]];
  const Patch=tNoise(11, seed+313);
  for(let i=0;i<blades;i++){
    const x=rng()*size, y=rng()*size;
    if(Patch((x+0.5)/size,(y+0.5)/size) < 0.34 && rng()<0.55) continue;  // بقع جرداء صغيرة
    const col=HUES[(rng()*HUES.length)|0];
    const dry=rng()<0.09;
    const cc= dry ? [col[0]*1.25+0.10, col[1]*1.08+0.05, col[2]*0.85] : col;
    texBlade(c, x, y, -Math.PI/2+(rng()-0.5)*1.5, (7+rng()*15)*k, (0.9+rng()*1.0)*k, cc, rng);
  }
  // زهيرات صغيرة تكسر الرتابة
  for(let i=0;i<Math.round(90*k*k);i++){
    const x=rng()*size, y=rng()*size;
    const col= rng()<0.5 ? [0.92,0.90,0.72] : [0.86,0.80,0.86];
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++)
      if(Math.abs(dx)+Math.abs(dy)<2) c.put(x+dx,y+dy,col[0],col[1],col[2],0.85,0.6);
  }
  return c;
}

function drawSoilGround(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.239,0.176,0.114], [0.475,0.376,0.259], 1.6);
  for(let i=0;i<Math.round(26*k*k);i++)
    texCrack(c, rng()*size, rng()*size, rng()*6.28, (30+rng()*90)*k, 0.55+rng()*0.5, rng);
  const P=[[0.408,0.365,0.310],[0.502,0.451,0.380],[0.325,0.286,0.239],[0.565,0.494,0.404]];
  for(let i=0;i<Math.round(950*k*k);i++){
    const r=(1.2+rng()*3.6)*k;
    texPebble(c, rng()*size, rng()*size, r, r*(0.65+rng()*0.35), rng()*3.14, P[(rng()*P.length)|0], rng);
  }
  // جذور وأعواد يابسة
  for(let i=0;i<Math.round(140*k*k);i++)
    texBlade(c, rng()*size, rng()*size, rng()*6.28, (5+rng()*11)*k, (0.6+rng()*0.6)*k, [0.290,0.235,0.153], rng);
  return c;
}

function drawRockGround(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.243,0.231,0.212], [0.639,0.616,0.573], 2.6);
  // طبقات: ما يجعل الصخر صخراً لا رمادياً مموّهاً
  const bands=Math.round(14+rng()*8);
  for(let i=0;i<bands;i++)
    texStratum(c, rng()*size, (4+rng()*16)*k, 0.58+rng()*0.85, (14+rng()*34)*k, seed+i*57);
  for(let i=0;i<Math.round(58*k*k);i++)
    texCrack(c, rng()*size, rng()*size, (rng()<0.65? (rng()-0.5)*0.4 : rng()*6.28), (48+rng()*190)*k, 0.95+rng()*1.0, rng);
  // شظايا وحوافّ مكسورة
  for(let i=0;i<Math.round(420*k*k);i++){
    const r=(1.6+rng()*5.5)*k, tone=0.78+rng()*0.5;
    texPebble(c, rng()*size, rng()*size, r, r*(0.5+rng()*0.5), rng()*3.14,
      [0.478*tone,0.463*tone,0.435*tone], rng);
  }
  // أشنة تتجمّع في الشقوق والمنخفضات لا في بقع عشوائية
  const L=tNoise(9, seed+4242);
  let hmin=1e9, hmax=-1e9;
  for(let i=0;i<size*size;i++){ if(c.h[i]<hmin)hmin=c.h[i]; if(c.h[i]>hmax)hmax=c.h[i]; }
  const span=Math.max(1e-3,hmax-hmin);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const i=y*size+x;
    const low=1-Math.min(1,Math.max(0,(c.h[i]-hmin)/span));   // 1 في القاع
    const t=L((x+0.5)/size,(y+0.5)/size);
    const a=Math.min(0.42, Math.max(0,(t-0.55)*1.9) * low*low);
    if(a<=0.01) continue;
    c.put(x,y, 0.216,0.259,0.157, a, 0);
  }
  return c;
}

function drawGravelGround(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.361,0.329,0.278], [0.545,0.510,0.447], 1.0);
  const P=[[0.612,0.576,0.510],[0.729,0.694,0.624],[0.482,0.451,0.396],
           [0.663,0.612,0.522],[0.545,0.529,0.510]];
  // حصى متراكب: الكبير أولاً ثم الصغير يملأ الفجوات
  for(let pass=0; pass<3; pass++){
    const count=Math.round((190+pass*300)*k*k), scale=(13.0-pass*3.6);
    for(let i=0;i<count;i++){
      const r=(2.2+rng()*scale)*k;
      texPebble(c, rng()*size, rng()*size, r, r*(0.62+rng()*0.38), rng()*3.14, P[(rng()*P.length)|0], rng);
    }
  }
  return c;
}

function drawBarkTexture(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.161,0.129,0.094], [0.384,0.318,0.235], 1.4);
  // أخاديد رأسية: اللحاء شقوق طولية لا بقع
  for(let i=0;i<Math.round(230*k*k);i++){
    const x=rng()*size;
    let y=rng()*size;
    const len=(60+rng()*260)*k, depth=0.5+rng()*0.9;
    let xx=x;
    for(let q=0;q<len;q++){
      xx+=(rng()-0.5)*0.5;
      for(let o=-2;o<=2;o++){
        const t=Math.abs(o)/2.4; if(t>1) continue;
        const dark=1-0.62*(1-t)*depth;
        c.put(xx+o, y+q, dark,dark,dark, (1-t)*0.55, -(1-t)*1.5*depth);
      }
      c.put(xx+2.6, y+q, 1.22,1.20,1.16, 0.16, 0.6);
    }
  }
  for(let i=0;i<Math.round(260*k*k);i++){
    const r=(1+rng()*2.4)*k;
    texPebble(c, rng()*size, rng()*size, r, r*(1.4+rng()*1.6), (rng()-0.5)*0.3, [0.290,0.243,0.184], rng);
  }
  return c;
}

/* من اللوح المرسوم إلى خامات Three */
function canvasToAlbedo(c){
  const n=c.n, d=new Uint8ClampedArray(n*n*4);
  for(let i=0;i<n*n;i++){
    d[i*4]=Math.min(255,Math.max(0,c.r[i]*255));
    d[i*4+1]=Math.min(255,Math.max(0,c.g[i]*255));
    d[i*4+2]=Math.min(255,Math.max(0,c.b[i]*255));
    d[i*4+3]=255;
  }
  return d;
}
function canvasToNormal(c, strength){
  const n=c.n, d=new Uint8ClampedArray(n*n*4), W=v=>((v%n)+n)%n;
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const dx=(c.h[y*n+W(x+1)]-c.h[y*n+W(x-1)])*strength;
    const dy=(c.h[W(y+1)*n+x]-c.h[W(y-1)*n+x])*strength;
    const l=Math.hypot(-dx,-dy,1), o=(y*n+x)*4;
    d[o]=(-dx/l*0.5+0.5)*255; d[o+1]=(-dy/l*0.5+0.5)*255; d[o+2]=(1/l*0.5+0.5)*255; d[o+3]=255;
  }
  return d;
}

/* ═══════════ خامات البناء المرسومة ═══════════ */

/* حجر مُنَحَّت: مداميك بمونة وحوافّ متآكلة */
function drawStoneWall(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.220,0.196,0.165], [0.318,0.286,0.243], 0.6);   // مونة داكنة
  const courses=Math.round(7*k);
  const ch=size/courses;
  for(let row=0; row<courses; row++){
    const y0=row*ch;
    const offset=(row%2? ch*0.5 : 0)+rng()*ch*0.25;
    let x=offset - ch*1.2;
    while(x < size+ch){
      const bw=ch*(1.15+rng()*1.5), bh=ch*(0.78+rng()*0.16);
      const mortar=Math.max(1.4, ch*0.075);
      const tone=0.80+rng()*0.5;
      const base=[0.545*tone, 0.494*tone, 0.416*tone];
      const px0=x+mortar, px1=x+bw-mortar, py0=y0+mortar, py1=y0+bh-mortar;
      // وجه الحجر مع تعرّج طفيف على الحافّة
      for(let yy=Math.floor(py0); yy<=Math.ceil(py1); yy++){
        const ty=(yy-py0)/Math.max(1,(py1-py0));
        const wob=Math.sin(yy*0.7+tone*9)*ch*0.035;
        for(let xx=Math.floor(px0+wob); xx<=Math.ceil(px1+wob); xx++){
          const tx=(xx-px0-wob)/Math.max(1,(px1-px0));
          if(tx<0||tx>1) continue;
          const edge=Math.min(tx,1-tx,ty,1-ty);
          const bevel=Math.min(1, edge*Math.max(4,ch*0.30));
          const lit=0.72+0.42*bevel + (1-ty)*0.16;        // إضاءة من أعلى
          const grain=0.94+0.12*Math.sin((xx*1.7+yy*2.3+tone*13));
          c.put(xx, yy, base[0]*lit*grain, base[1]*lit*grain, base[2]*lit*grain, 1, bevel*2.2+0.6);
        }
      }
      // تآكل وبقع
      for(let i=0;i<3;i++){
        const r=(1+rng()*3.2)*k;
        texPebble(c, x+bw*rng(), y0+bh*rng(), r, r*(0.6+rng()*0.5), rng()*3.1,
          [base[0]*0.82, base[1]*0.82, base[2]*0.80], rng);
      }
      x+=bw;
    }
  }
  // أشنة في المونة
  const L=tNoise(8, seed+555);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const i=y*size+x, t=L((x+0.5)/size,(y+0.5)/size);
    if(t<0.60 || c.h[i]>1.2) continue;
    c.put(x,y, 0.235,0.259,0.169, Math.min(0.40,(t-0.60)*2.0), 0);
  }
  return c;
}

/* قرميد: صفوف مقوّسة متداخلة */
function drawRoofTile(size, seed, hue){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [hue[0]*0.45,hue[1]*0.45,hue[2]*0.45], [hue[0]*0.72,hue[1]*0.72,hue[2]*0.72], 0.5);
  const rows=Math.round(9*k), rh=size/rows;
  const cols=Math.round(15*k), cw=size/cols;
  for(let r=0;r<rows;r++){
    const y0=r*rh;
    const shift=(r%2)? cw*0.5 : 0;
    for(let q=-1;q<=cols;q++){
      const x0=q*cw+shift;
      const tone=0.86+rng()*0.34;
      for(let yy=0; yy<rh*1.35; yy++){
        const ty=yy/(rh*1.35);
        if(ty>1) break;
        for(let xx=0; xx<cw; xx++){
          const tx=xx/cw;
          // مقطع مقوّس: الوسط أعلى والحافّتان ظلّ
          const arch=Math.sin(tx*Math.PI);
          const lit=0.58+0.62*arch - ty*0.20;
          const edge=(tx<0.06||tx>0.94)?0.62:1.0;
          const a= ty>0.92 ? (1-(ty-0.92)/0.08)*0.9 : 1;
          c.put(x0+xx, y0+yy, hue[0]*tone*lit*edge, hue[1]*tone*lit*edge, hue[2]*tone*lit*edge,
                a, arch*2.4*(1-ty*0.5) - (ty>0.9?1.8:0));
        }
      }
    }
  }
  return c;
}

/* جصّ: جدار مُلَبَّس بشقوق شعرية */
function drawPlaster(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.702,0.671,0.596], [0.851,0.827,0.749], 0.8);
  for(let i=0;i<Math.round(26*k*k);i++)
    texCrack(c, rng()*size, rng()*size, rng()*6.28, (24+rng()*70)*k, 0.35+rng()*0.35, rng);
  for(let i=0;i<Math.round(220*k*k);i++){
    const r=(1+rng()*2.6)*k, t=0.86+rng()*0.22;
    texPebble(c, rng()*size, rng()*size, r, r*(0.7+rng()*0.4), rng()*3.1,
      [0.706*t,0.678*t,0.596*t], rng);
  }
  // بقع رطوبة عند الأسفل
  const L=tNoise(5, seed+31);
  for(let y=0;y<size;y++){ const dampen=Math.max(0,(y/size-0.55)/0.45);
    for(let x=0;x<size;x++){
      const t=L((x+0.5)/size,(y+0.5)/size);
      const a=Math.min(0.30, Math.max(0,(t-0.45))*dampen*1.6);
      if(a>0.01) c.put(x,y, 0.494,0.463,0.404, a, 0);
    } }
  return c;
}

/* خشب: عروق طولية وعقد */
function drawTimber(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.239,0.169,0.106], [0.400,0.298,0.196], 0.7);
  for(let i=0;i<Math.round(220*k*k);i++){
    const x=rng()*size, tone=0.72+rng()*0.6, w=(0.7+rng()*2.2)*k;
    for(let y=0;y<size;y++){
      const wob=Math.sin(y*0.035+x*0.11)*2.2*k;
      for(let o=-w;o<=w;o++){
        const t=Math.abs(o)/(w+0.5);
        c.put(x+wob+o, y, 0.286*tone,0.208*tone,0.133*tone, (1-t)*0.55, (1-t)*0.5*(tone-1));
      }
    }
  }
  for(let i=0;i<Math.round(9*k*k);i++){   // عقد
    const cx=rng()*size, cy=rng()*size, R=(5+rng()*9)*k;
    for(let dy=-R;dy<=R;dy++) for(let dx=-R;dx<=R;dx++){
      const d=Math.hypot(dx,dy)/R; if(d>1) continue;
      const ring=0.6+0.4*Math.sin(d*R*0.9);
      c.put(cx+dx, cy+dy, 0.184*ring,0.129*ring,0.086*ring, (1-d)*0.85, -(1-d)*1.2);
    }
  }
  return c;
}

/* قشّ للأسقف الريفية */
function drawThatch(size, seed){
  const c=new TexCanvas(size), rng=texRng(seed), k=size/512;
  texBase(c, seed, [0.325,0.263,0.157], [0.478,0.400,0.243], 0.8);
  for(let i=0;i<Math.round(9000*k*k);i++){
    const x=rng()*size, y=rng()*size, tone=0.72+rng()*0.62;
    texBlade(c, x, y, Math.PI/2+(rng()-0.5)*0.45, (10+rng()*22)*k, (0.8+rng()*0.9)*k,
      [0.545*tone,0.451*tone,0.263*tone], rng);
  }
  return c;
}
