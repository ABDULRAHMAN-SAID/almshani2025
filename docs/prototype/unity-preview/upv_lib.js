/* ═══ خبز الأسطح: منفذ حرفي لـ SurfaceBaker/SurfaceLibrary في C# ═══ */
function tNoise(freq, seed){
  const g=new Float32Array(freq*freq); let s=(seed>>>0)||1;
  for(let i=0;i<g.length;i++){ s=(s*1664525+1013904223)>>>0; g[i]=(s>>>8)/16777216; }
  const wrap=i=>{ const m=i%freq; return m<0?m+freq:m; };
  return (u,v)=>{
    const fx=u*freq, fy=v*freq;
    const i0=wrap(Math.floor(fx)), j0=wrap(Math.floor(fy)), i1=wrap(i0+1), j1=wrap(j0+1);
    let tx=fx-Math.floor(fx), ty=fy-Math.floor(fy);
    tx=tx*tx*(3-2*tx); ty=ty*ty*(3-2*ty);
    const a=g[j0*freq+i0]*(1-tx)+g[j0*freq+i1]*tx;
    const b=g[j1*freq+i0]*(1-tx)+g[j1*freq+i1]*tx;
    return a*(1-ty)+b*ty;
  };
}
function bakeHeightField(R, size){
  const oct=Math.max(1,Math.min(8,R.oct)), L=[];
  for(let o=0;o<oct;o++) L.push(tNoise(Math.max(2,R.base<<o), (R.seed+o*7919)>>>0));
  const wx=R.warp>0?tNoise(Math.max(2,R.base),(R.seed+104729)>>>0):null;
  const wy=R.warp>0?tNoise(Math.max(2,R.base),(R.seed+104743)>>>0):null;
  const gr=R.grain>0?tNoise(Math.max(2,R.gfreq||64),(R.seed+15485863)>>>0):null;
  const f=new Float32Array(size*size), st=Math.max(0.05,R.stretch||1);
  const frac=v=>v-Math.floor(v);
  for(let y=0;y<size;y++){ const v=(y+0.5)/size;
    for(let x=0;x<size;x++){ const u=(x+0.5)/size;
      let su=u, sv=v/st;
      if(wx){ su+=(wx(u,v)-0.5)*R.warp; sv+=(wy(u,v)-0.5)*R.warp; }
      let amp=0.5, sum=0, nrm=0;
      for(let o=0;o<oct;o++){ let n=L[o](frac(su),frac(sv));
        if(R.ridged) n=1-Math.abs(n*2-1);
        sum+=n*amp; nrm+=amp; amp*=0.5; }
      let val=sum/nrm;
      if(gr) val=val+(gr(u,v)-val)*(R.grain*0.35);
      val=Math.min(1,Math.max(0,0.5+(val-0.5)*R.contrast));
      f[y*size+x]=val;
    } }
  return f;
}
function bakeAlbedo(R, f, size){
  const patch=tNoise(Math.max(2,R.pfreq||3),(R.seed+32452843)>>>0);
  const d=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++){ const v=(y+0.5)/size;
    for(let x=0;x<size;x++){ const u=(x+0.5)/size, t=f[y*size+x];
      let r=R.lo[0]+(R.hi[0]-R.lo[0])*t, g=R.lo[1]+(R.hi[1]-R.lo[1])*t, b=R.lo[2]+(R.hi[2]-R.lo[2])*t;
      if(R.pamt>0){ const p=Math.min(1,Math.max(0,(patch(u,v)-0.5)*2.6+0.5))*R.pamt;
        r+=(R.pc[0]-r)*p; g+=(R.pc[1]-g)*p; b+=(R.pc[2]-b)*p; }
      const o=(y*size+x)*4; d[o]=r*255; d[o+1]=g*255; d[o+2]=b*255; d[o+3]=255;
    } }
  return d;
}
function bakeNormal(f, size, strength){
  const d=new Uint8ClampedArray(size*size*4);
  for(let y=0;y<size;y++){ const ym=(y-1+size)%size, yp=(y+1)%size;
    for(let x=0;x<size;x++){ const xm=(x-1+size)%size, xp=(x+1)%size;
      const dx=(f[y*size+xp]-f[y*size+xm])*strength*size*0.02;
      const dy=(f[yp*size+x]-f[ym*size+x])*strength*size*0.02;
      const l=Math.hypot(-dx,-dy,1), o=(y*size+x)*4;
      d[o]=(-dx/l*0.5+0.5)*255; d[o+1]=(-dy/l*0.5+0.5)*255; d[o+2]=(1/l*0.5+0.5)*255; d[o+3]=255;
    } }
  return d;
}
const RECIPES = {
  grass : {base:14,oct:6, seed:20260101, warp:0.06, ridged:false, stretch:1,   contrast:1.20,
           lo:[0.169,0.243,0.106], hi:[0.435,0.545,0.239], pc:[0.573,0.529,0.290], pamt:0.24, pfreq:6, nrm:1.1, grain:0.45, gfreq:96},
  soil  : {base:10,oct:6, seed:20260202, warp:0.12, ridged:false, stretch:1,   contrast:1.2,
           lo:[0.318,0.231,0.145], hi:[0.596,0.463,0.298], pc:[0.435,0.325,0.204], pamt:0.30, pfreq:4, nrm:1.5, grain:0.50, gfreq:110},
  rock  : {base:4, oct:7, seed:20260303, warp:0.18, ridged:true,  stretch:3.2, contrast:1.75,
           lo:[0.263,0.251,0.235], hi:[0.667,0.639,0.588], pc:[0.337,0.376,0.278], pamt:0.22, pfreq:3, nrm:2.6, grain:0.30, gfreq:128},
  gravel: {base:22,oct:4, seed:20260404, warp:0.05, ridged:false, stretch:1,   contrast:1.9,
           lo:[0.514,0.478,0.416], hi:[0.812,0.776,0.702], pc:[0.639,0.596,0.522], pamt:0.20, pfreq:5, nrm:2.2, grain:0.55, gfreq:150},
  bark  : {base:3, oct:6, seed:20260505, warp:0.07, ridged:true,  stretch:9,   contrast:1.5,
           lo:[0.161,0.129,0.102], hi:[0.376,0.310,0.243], pc:[0.243,0.243,0.196], pamt:0.18, pfreq:4, nrm:2.4, grain:0.30, gfreq:90},
};

/* ═══ خامات النبات الشفّافة: منفذ FoliageTextureBaker ═══ */
function fBlend(px, i, c, cover){
  const a=Math.min(1, px[i*4+3]/255 + cover), w=cover/Math.max(a,1e-4);
  px[i*4]   += (c[0]*255-px[i*4])*w;
  px[i*4+1] += (c[1]*255-px[i*4+1])*w;
  px[i*4+2] += (c[2]*255-px[i*4+2])*w;
  px[i*4+3] = a*255;
}
function fColumn(px, size, x, y, hw, c){
  const yi=Math.min(size-1,Math.max(0,Math.floor(y)));
  for(let xi=Math.floor(x-hw); xi<=Math.ceil(x+hw); xi++){
    if(xi<0||xi>=size) continue;
    const d=Math.abs(xi+0.5-x), cov=Math.min(1,Math.max(0,hw+0.5-d));
    if(cov>0) fBlend(px, yi*size+xi, c, cov);
  }
}
function grassClump(size, seed, base, tip){
  const px=new Float32Array(size*size*4); let s=seed>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; };
  const blades=Math.max(14, (size/7)|0);
  for(let b=0;b<blades;b++){
    const rootX=(0.10+rnd()*0.80)*size, height=(0.45+rnd()*0.50)*size;
    const lean=(rnd()-0.5)*0.55*size, hw0=(0.013+rnd()*0.017)*size, shade=0.72+rnd()*0.38;
    const steps=Math.ceil(height*1.5);
    for(let q=0;q<=steps;q++){
      const t=q/steps, x=rootX+lean*t*t, y=t*height;
      let w=hw0*Math.pow(1-t,0.65); if(w<0.35) w=0.35;
      const k=Math.pow(t,0.75);
      fColumn(px,size,x,y,w,[ (base[0]+(tip[0]-base[0])*k)*shade, (base[1]+(tip[1]-base[1])*k)*shade, (base[2]+(tip[2]-base[2])*k)*shade ]);
    }
  }
  return finishCutout(px,size);
}
function leafCluster(size, seed, deep, light, needles){
  const px=new Float32Array(size*size*4); let s=seed>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; };
  const cx0=size*0.5, cy0=size*0.48, k=size/256;
  if(needles){
    // رشّات إبر: كل رشّة ساق قصيرة تتفرّع منها إبر — الكثافة تأتي من عدد الرشّات لا من إبرة واحدة
    const sprays=Math.round(120*k*k);
    for(let c=0;c<sprays;c++){
      const a=rnd()*Math.PI*2, r=Math.pow(rnd(),0.62)*size*0.45;
      const sx=cx0+Math.cos(a)*r, sy=cy0+Math.sin(a)*r*0.90;
      const fall=1-Math.min(1,r/(size*0.52));
      const dir=a+(rnd()-0.5)*0.8, stem=(0.065+rnd()*0.075)*size;
      const dx=Math.cos(dir), dy=Math.sin(dir);
      const m0=(0.32+rnd()*0.58)*(0.58+fall*0.42);
      const tint=[deep[0]+(light[0]-deep[0])*m0, deep[1]+(light[1]-deep[1])*m0, deep[2]+(light[2]-deep[2])*m0];
      const steps=Math.ceil(stem*1.4);
      for(let q=0;q<=steps;q++) fColumn(px,size, sx+dx*stem*q/steps, sy+dy*stem*q/steps, 1.05*k, tint);
      const needlesPer=16;
      for(let nq=0;nq<needlesPer;nq++){
        const t=0.12+0.88*nq/needlesPer;
        const bx=sx+dx*stem*t, by=sy+dy*stem*t;
        for(const side of [-1,1]){
          const na=dir+side*(0.62+rnd()*0.55), nl=(0.018+rnd()*0.020)*size;
          const ndx=Math.cos(na), ndy=Math.sin(na), st2=Math.ceil(nl*1.6);
          const m=m0*(0.82+rnd()*0.36);
          const c2=[deep[0]+(light[0]-deep[0])*m, deep[1]+(light[1]-deep[1])*m, deep[2]+(light[2]-deep[2])*m];
          for(let q=0;q<=st2;q++){ const u=q/st2;
            fColumn(px,size, bx+ndx*nl*u, by+ndy*nl*u, (0.95-0.45*u)*k, c2); }
        }
      }
    }
  } else {
    const leaves=Math.round(1100*k*k);
    for(let c=0;c<leaves;c++){
      const a=rnd()*Math.PI*2, r=Math.pow(rnd(),0.58)*size*0.44;
      const cx=cx0+Math.cos(a)*r, cy=cy0+Math.sin(a)*r*0.88;
      const fall=1-Math.min(1,r/(size*0.50));
      const m=(0.34+rnd()*0.66)*(0.56+fall*0.44);
      const tint=[deep[0]+(light[0]-deep[0])*m, deep[1]+(light[1]-deep[1])*m, deep[2]+(light[2]-deep[2])*m];
      const rad=(0.020+rnd()*0.026)*size, rot=rnd()*Math.PI*2, co=Math.cos(rot), si=Math.sin(rot);
      const R=Math.ceil(rad)+1;
      for(let dy=-R;dy<=R;dy++){ const yi=Math.round(cy)+dy; if(yi<0||yi>=size) continue;
        for(let dx=-R;dx<=R;dx++){ const xi=Math.round(cx)+dx; if(xi<0||xi>=size) continue;
          const lx=(dx*co+dy*si)/rad, ly=((-dx*si+dy*co)/rad)*1.75, d=lx*lx+ly*ly;
          if(d>1) continue;
          // عرق الورقة أغمق قليلاً فلا تبدو بقعة صمّاء
          const vein=Math.abs(ly)<0.16 ? 0.80 : 1.0;
          fBlend(px, yi*size+xi, [tint[0]*vein,tint[1]*vein,tint[2]*vein], Math.min(1,(1-d)*3.0));
        } }
    }
  }
  return finishCutout(px,size);
}
function finishCutout(px, size){
  for(let pass=0;pass<3;pass++){
    const cp=px.slice();
    for(let y=0;y<size;y++) for(let x=0;x<size;x++){
      const k=y*size+x; if(cp[k*4+3]>5) continue;
      let r=0,g=0,b=0,n=0;
      for(let dy=-1;dy<=1;dy++){ const yy=y+dy; if(yy<0||yy>=size) continue;
        for(let dx=-1;dx<=1;dx++){ const xx=x+dx; if(xx<0||xx>=size) continue;
          const kk=(yy*size+xx)*4; if(cp[kk+3]<=5) continue;
          r+=cp[kk]; g+=cp[kk+1]; b+=cp[kk+2]; n++; } }
      if(n>0){ px[k*4]=r/n; px[k*4+1]=g/n; px[k*4+2]=b/n; }
    }
  }
  return new Uint8ClampedArray(px);
}
