/* ═══ منفذ MeshBuilder + TreeMeshFactory + RockMeshFactory إلى Three.js ═══ */
function MB(){ this.p=[]; this.n=[]; this.u=[]; this.c=[]; this.t=[]; }
MB.prototype.v=function(px,py,pz, nx,ny,nz, u,v, cr,ca){
  this.p.push(px,py,pz); this.n.push(nx,ny,nz); this.u.push(u,v); this.c.push(cr,0.5,0.5,ca);
  return (this.p.length/3)-1;
};
MB.prototype.quad=function(a,b,c,d){ this.t.push(a,b,c, a,c,d); };
MB.prototype.tube=function(from,to,r0,r1,sides,uvScale,sway0,sway1,phase){
  const ax=to[0]-from[0], ay=to[1]-from[1], az=to[2]-from[2];
  const len=Math.hypot(ax,ay,az); if(len<1e-4||sides<3) return;
  const dx=ax/len, dy=ay/len, dz=az/len;
  const hx=Math.abs(dy)>0.9?1:0, hy=Math.abs(dy)>0.9?0:1, hz=0;
  let sx=hy*dz-hz*dy, sy=hz*dx-hx*dz, sz=hx*dy-hy*dx;
  const sl=Math.hypot(sx,sy,sz)||1; sx/=sl; sy/=sl; sz/=sl;
  const ux=dy*sz-dz*sy, uy=dz*sx-dx*sz, uz=dx*sy-dy*sx;
  const start=this.p.length/3;
  for(let ring=0; ring<2; ring++){
    const cx=ring?to[0]:from[0], cy=ring?to[1]:from[1], cz=ring?to[2]:from[2];
    const r=ring?r1:r0, sw=ring?sway1:sway0;
    for(let i=0;i<=sides;i++){
      const a=i/sides*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a);
      const ox=sx*ca+ux*sa, oy=sy*ca+uy*sa, oz=sz*ca+uz*sa;
      this.v(cx+ox*r, cy+oy*r, cz+oz*r, ox,oy,oz, i/sides*uvScale, ring?len*uvScale*0.25:0, phase, sw);
    }
  }
  const stride=sides+1;
  for(let i=0;i<sides;i++) this.quad(start+i, start+i+1, start+stride+i+1, start+stride+i);
};
MB.prototype.card=function(c, right, up, w, h, sway, phase){
  const nx=right[1]*up[2]-right[2]*up[1], ny=right[2]*up[0]-right[0]*up[2], nz=right[0]*up[1]-right[1]*up[0];
  const nl=Math.hypot(nx,ny,nz)||1;
  const hw=[right[0]*w*0.5, right[1]*w*0.5, right[2]*w*0.5];
  const hh=[up[0]*h*0.5, up[1]*h*0.5, up[2]*h*0.5];
  const P=(sx,sy)=>[c[0]+hw[0]*sx+hh[0]*sy, c[1]+hw[1]*sx+hh[1]*sy, c[2]+hw[2]*sx+hh[2]*sy];
  const s=this.p.length/3;
  const q=[[-1,-1,0,0],[1,-1,1,0],[1,1,1,1],[-1,1,0,1]];
  for(const [sx,sy,u,v] of q){ const p=P(sx,sy); this.v(p[0],p[1],p[2], nx/nl,ny/nl,nz/nl, u,v, phase, sway); }
  this.quad(s,s+1,s+2,s+3);
  const b=this.p.length/3;
  const q2=[[-1,-1,1,0],[-1,1,1,1],[1,1,0,1],[1,-1,0,0]];
  for(const [sx,sy,u,v] of q2){ const p=P(sx,sy); this.v(p[0],p[1],p[2], -nx/nl,-ny/nl,-nz/nl, u,v, phase, sway); }
  this.quad(b,b+1,b+2,b+3);
};
MB.prototype.blob=function(c, radii, rings, segs, rough, seed){
  const start=this.p.length/3; let s=seed>>>0;
  const rnd=()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; };
  const off=[rnd()*10,rnd()*10,rnd()*10,rnd()*10];
  for(let r=0;r<=rings;r++){
    const v=r/rings, th=v*Math.PI, st=Math.sin(th), ct=Math.cos(th);
    for(let q=0;q<=segs;q++){
      const u=q/segs, ph=u*Math.PI*2;
      const ux=st*Math.cos(ph), uy=ct, uz=st*Math.sin(ph);
      const bump=1 + Math.sin(ux*3.1+off[0])*Math.cos(uz*2.7+off[1])*rough
                  + Math.sin(uy*5.3+off[2])*Math.cos(ux*4.1+off[3])*rough*0.5;
      this.v(c[0]+ux*radii[0]*bump, c[1]+uy*radii[1]*bump, c[2]+uz*radii[2]*bump, ux,uy,uz, u*2, v*2, 0, 0);
    }
  }
  const stride=segs+1;
  for(let r=0;r<rings;r++) for(let q=0;q<segs;q++){
    const a=start+r*stride+q; this.quad(a, a+1, a+stride+1, a+stride);
  }
};
MB.prototype.geo=function(recalc){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(this.p,3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u,2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(this.c,4));
  g.setIndex(this.t);
  if(recalc) g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
};
function rngFrom(seed){ let s=(seed>>>0)||1; return ()=>{ s=(s*1664525+1013904223)>>>0; return (s>>>8)/16777216; }; }
function leafCards(mb, rnd, c, size, count, sway, phase){
  for(let i=0;i<count;i++){
    const yaw=rnd()*Math.PI*2, pitch=(rnd()-0.5)*0.9;
    const right=[Math.cos(yaw),0,Math.sin(yaw)];
    const up=[-Math.sin(yaw)*Math.sin(pitch), Math.cos(pitch), Math.cos(yaw)*Math.sin(pitch)];
    const j=[(rnd()-0.5)*size*0.45,(rnd()-0.5)*size*0.35,(rnd()-0.5)*size*0.45];
    const sc=size*(0.75+rnd()*0.5);
    mb.card([c[0]+j[0],c[1]+j[1],c[2]+j[2]], right, up, sc, sc*0.82, sway, phase+rnd()*0.4);
  }
}
function buildBroadleaf(seed, height){
  const rnd=rngFrom(seed), trunk=new MB(), can=new MB();
  const br=height*0.065, phase=rnd();
  const lean=[(rnd()-0.5)*height*0.10, 0, (rnd()-0.5)*height*0.10];
  const top=[lean[0], height*0.48, lean[2]];
  trunk.tube([0,0,0], top, br, br*0.55, 8, 1.4, 0, 0.16, phase);
  const main=4+((rnd()*3)|0);
  for(let b=0;b<main;b++){
    const a=b/main*Math.PI*2+rnd()*0.7, spread=height*(0.16+rnd()*0.12), rise=height*(0.20+rnd()*0.14);
    const tip=[top[0]+Math.cos(a)*spread, top[1]+rise, top[2]+Math.sin(a)*spread];
    trunk.tube(top, tip, br*0.5, br*0.22, 6, 1.2, 0.16, 0.55, phase);
    const twigs=3+((rnd()*3)|0);
    for(let t=0;t<twigs;t++){
      const ta=a+(rnd()-0.5)*1.7, tl=height*(0.09+rnd()*0.09);
      const tt=[tip[0]+Math.cos(ta)*tl, tip[1]+height*(0.05+rnd()*0.10), tip[2]+Math.sin(ta)*tl];
      trunk.tube(tip, tt, br*0.2, br*0.08, 5, 1, 0.55, 0.9, phase);
      leafCards(can, rnd, tt, height*(0.30+rnd()*0.14), 4, 0.95, phase);
      const mid=[(tip[0]+tt[0])*0.5, (tip[1]+tt[1])*0.5, (tip[2]+tt[2])*0.5];
      leafCards(can, rnd, mid, height*0.26, 2, 0.85, phase);
    }
    leafCards(can, rnd, tip, height*0.34, 3, 0.75, phase);
  }
  return {trunk:trunk.geo(false), canopy:can.geo(false), height};
}
function buildConifer(seed, height){
  const rnd=rngFrom(seed), trunk=new MB(), can=new MB();
  const br=height*0.052, phase=rnd();
  const top=[(rnd()-0.5)*height*0.04, height, (rnd()-0.5)*height*0.04];
  trunk.tube([0,0,0], top, br, br*0.12, 8, 1.6, 0, 0.35, phase);
  const whorls=7+((rnd()*3)|0);
  for(let w=0;w<whorls;w++){
    const t=0.18+0.78*w/(whorls-1), y=height*t, radius=height*0.34*Math.pow(1-t,0.85);
    if(radius<height*0.03) continue;
    const arms=4+((rnd()*3)|0), sway=0.25+t*0.65;
    for(let a=0;a<arms;a++){
      const ang=a/arms*Math.PI*2 + w*0.9 + rnd()*0.3;
      const root=[top[0]*t, y, top[2]*t];
      const tip=[root[0]+Math.cos(ang)*radius, root[1]-height*0.03, root[2]+Math.sin(ang)*radius];
      trunk.tube(root, tip, br*0.16, br*0.05, 5, 1, sway*0.5, sway, phase);
      leafCards(can, rnd, [root[0]+(tip[0]-root[0])*0.62, root[1]+(tip[1]-root[1])*0.62, root[2]+(tip[2]-root[2])*0.62], radius*1.6, 3, sway, phase);
      leafCards(can, rnd, [root[0]+(tip[0]-root[0])*0.30, root[1]+(tip[1]-root[1])*0.30, root[2]+(tip[2]-root[2])*0.30], radius*1.1, 1, sway*0.8, phase);
    }
  }
  leafCards(can, rnd, [top[0], height*0.94, top[2]], height*0.14, 2, 0.95, phase);
  return {trunk:trunk.geo(false), canopy:can.geo(false), height};
}
function buildBoulder(seed, size){
  const rnd=rngFrom(seed), mb=new MB();
  const radii=[size*(0.85+rnd()*0.45), size*(0.55+rnd()*0.40), size*(0.85+rnd()*0.45)];
  mb.blob([0,radii[1]*0.72,0], radii, 10, 14, 0.16, seed);
  return mb.geo(true);
}
function buildOutcrop(seed, size){
  const rnd=rngFrom(seed), mb=new MB(), blocks=4+((rnd()*4)|0);
  for(let b=0;b<blocks;b++){
    const t=b/blocks, sc=size*(1-t*0.55)*(0.6+rnd()*0.6), a=rnd()*Math.PI*2, sp=size*0.55*rnd();
    mb.blob([Math.cos(a)*sp, sc*0.55+t*size*0.62, Math.sin(a)*sp],
            [sc*(0.75+rnd()*0.5), sc*(0.60+rnd()*0.7), sc*(0.75+rnd()*0.5)], 9, 12, 0.20, (seed+b*977)>>>0);
  }
  return mb.geo(true);
}
