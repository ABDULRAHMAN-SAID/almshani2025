import re
import os as _o; D=_o.path.dirname(_o.path.abspath(__file__))+'/'
src=open(D+'../dawnkeep-3d.html',encoding='utf-8').read()
# ═══════ ملفات الاختبار ═══════
t=src.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
              '<script src="node_modules/three/build/three.min.js"></script>')
hook='''window.__d={
  slots:()=>SLOTS.map(s=>{const p=project(s.x,terrainY(s.x,s.z)+(s.kind==='castle'?10:0),s.z);return {x:p.x,y:p.y,taken:!!s.b,kind:s.kind};}),
  walls:()=>WALLS.map(w=>{const p=project(w.x,terrainY(w.x,w.z),w.z);return {x:p.x,y:p.y,taken:!!w.b,gate:!!w.gate};}),
  near:()=>{let n=null,bd=1e9;for(const e of G.enemies){const d=dist2(e.x,e.z,G.hero.x,G.hero.z);if(d<bd){bd=d;const p=project(e.x,terrainY(e.x,e.z),e.z);n={x:p.x,y:p.y};}}return n;},
  thumbs:()=>Object.keys(THUMBS).map(k=>k+":"+(THUMBS[k]||"").length),
  cam:(d,az,tx,tz)=>{ if(d) camDist=d; camHigh=camDist*.66; if(az!==undefined) camAz=az; if(tx!==undefined){G.cam.tx=tx;G.cam.tz=tz;} },
  spawnAll:(cx,cz,gap)=>{ const ts=Object.keys(E); ts.forEach((t,i)=>{ G.phase="night"; spawn(t); const e=G.enemies[G.enemies.length-1]; e.x=cx-gap*3.5+i*gap; e.z=cz; e.stun=999; e.obj.position.set(e.x,terrainY(e.x,e.z)+(E[t].fly?7:0),e.z); e.obj.rotation.y=0; if(e.obj.userData.rig) poseRig(e.obj,1.2,false,0); }); },
  rebuild:()=>{ const t0=performance.now(); buildStage(G.stage); world.add(G.heroObj); return Math.round(performance.now()-t0); },
  night:(on)=>{ G.phase=on?"night":"dawn"; for(let i=0;i<220;i++) updateLighting(); },
  hero:(x,z)=>{ G.hero.x=x; G.hero.z=z; },
  bridge:()=>{ const b=BRIDGES[0]; if(!b) return null; return {x:b.x,z:b.z,deck:b.deckY,ground:terrainYGrid(b.x,b.z),walk:terrainY(b.x,b.z),lane:b.lane,feats:LANES.map(L=>L.feat)}; },
  showcase:(what)=>{ const W2=560,H2=420; const rt=new THREE.WebGLRenderTarget(W2,H2,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const sc2=new THREE.Scene(); sc2.environment=scene.environment; const hl=new THREE.HemisphereLight(0xFFFFFF,0x555544,1.0); hl.color.convertSRGBToLinear(); sc2.add(hl);
    const dl=new THREE.DirectionalLight(0xFFF2DC,2.2); dl.color.convertSRGBToLinear(); dl.position.set(8,14,10); sc2.add(dl);
    const cam2=new THREE.PerspectiveCamera(30,W2/H2,.1,600); const buf=new Uint8Array(W2*H2*4); const cv2=document.createElement('canvas'); cv2.width=W2; cv2.height=H2; const cx2=cv2.getContext('2d'); const img=cx2.createImageData(W2,H2);
    const obj = what==='hero'?mkHero('sword'):what==='soldier'?mkHumanoid():what.startsWith('enemy:')?mkEnemy(what.slice(6)):mkBuilding(what,1,null);
    if(obj.userData.rig) poseRig(obj,1.3,false,0); if(obj.userData.horse) poseHorse(obj,1.3,false);
    sc2.add(obj); const box=new THREE.Box3().setFromObject(obj); const size=box.getSize(new THREE.Vector3()), ctr=box.getCenter(new THREE.Vector3());
    const d=Math.max(size.x,size.y,size.z)*(what==='face'?1:2.0); cam2.position.set(ctr.x+d*.55, ctr.y+d*.45, ctr.z+d*.95); cam2.lookAt(ctr.x, ctr.y-size.y*.02, ctr.z);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x4A5A6A,1); renderer.clear(); renderer.render(sc2,cam2); renderer.render(sc2,cam2); renderer.readRenderTargetPixels(rt,0,0,W2,H2,buf); renderer.setRenderTarget(null); renderer.setClearColor(0x000000,0);
    for(let y=0;y<H2;y++){ const s0=(H2-1-y)*W2*4, d0=y*W2*4; img.data.set(buf.subarray(s0,s0+W2*4), d0); } cx2.putImageData(img,0,0); sc2.remove(obj); dropLights(obj); rt.dispose(); return cv2.toDataURL('image/png'); },
  faceShot:(what)=>{ const W2=560,H2=420; const rt=new THREE.WebGLRenderTarget(W2,H2,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
    const sc2=new THREE.Scene(); sc2.environment=scene.environment; const hl=new THREE.HemisphereLight(0xFFFFFF,0x555544,1.0); hl.color.convertSRGBToLinear(); sc2.add(hl);
    const dl=new THREE.DirectionalLight(0xFFF2DC,2.2); dl.color.convertSRGBToLinear(); dl.position.set(4,10,12); sc2.add(dl);
    const cam2=new THREE.PerspectiveCamera(28,W2/H2,.1,600); const buf=new Uint8Array(W2*H2*4); const cv2=document.createElement('canvas'); cv2.width=W2; cv2.height=H2; const cx2=cv2.getContext('2d'); const img=cx2.createImageData(W2,H2);
    const obj = what==='hero'?mkHero('sword'):mkHumanoid(); if(obj.userData.rig) poseRig(obj,1.3,false,0); if(obj.userData.horse) poseHorse(obj,1.3,false);
    sc2.add(obj); obj.updateMatrixWorld(true); const hp=new THREE.Vector3(); obj.userData.rig.head.getWorldPosition(hp);
    cam2.position.set(hp.x+1.2, hp.y+.6, hp.z+3.2); cam2.lookAt(hp.x, hp.y+.1, hp.z);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x4A5A6A,1); renderer.clear(); renderer.render(sc2,cam2); renderer.render(sc2,cam2); renderer.readRenderTargetPixels(rt,0,0,W2,H2,buf); renderer.setRenderTarget(null); renderer.setClearColor(0x000000,0);
    for(let y=0;y<H2;y++){ const s0=(H2-1-y)*W2*4, d0=y*W2*4; img.data.set(buf.subarray(s0,s0+W2*4), d0); } cx2.putImageData(img,0,0); sc2.remove(obj); dropLights(obj); rt.dispose(); return cv2.toDataURL('image/png'); },
  heroInfo:()=>({x:Math.round(G.hero.x),z:Math.round(G.hero.z),hp:G.hero.hp,dead:G.hero.dead,cd:G.hero.atkCd,over:G.over,paused:!!G.paused,pending:!!G.pending,ov:document.getElementById('overlay').classList.contains('show'),lo:LOADOUT.weapon,auto:SET.autoTarget}),
  pickAt:(x,y)=>{ const r=glc.getBoundingClientRect(); const n=pickNode({clientX:r.left+x, clientY:r.top+y}); return n?(n.kind||'wall'):null; },
  sel:()=>G.selected?(G.selected.kind||'wall'):null,
  set:(w,s)=>{ G.wave=w; G.silver=s; refresh(); sync(); },
  info:()=>({lake:LAKE, lanes:LANES.map(L=>L.pts[0]), tri:renderer.info.render.triangles, calls:renderer.info.render.calls, fog:[scene.fog.near,scene.fog.far], camDist}),
  state:()=>({stage:G.stage,wave:G.wave,phase:G.phase,st:G.state,lv:G.castleLv,castle:Math.round(G.castleHp),silver:Math.floor(G.silver),
    n:G.enemies.length,q:G.queue.length,walls:G.walls.length,builds:G.buildings.length,ghost:!!G.ghost,sel:!!G.selected,
    overlay:document.getElementById("overlay").classList.contains("show"),
    boons:document.querySelectorAll("#overlay [data-boon]").length,
    head:(document.querySelector("#overlayCard h2")||{}).textContent||""})
};
let last=performance.now();'''
assert t.count('let last=performance.now();')==1
t=t.replace('let last=performance.now();',hook)
open(D+'t3d.html','w',encoding='utf-8').write(t)
m=re.search(r'<script>\n(\(\(\) => \{.*)</script>', t, re.S)
open(D+'game3d.js','w',encoding='utf-8').write(m.group(1))
f=t.replace("  const dt=Math.min(.05,(now-last)/1000); last=now;\n  update(dt); render();","  last=now;\n  for(let i=0;i<6;i++) update(.03); render();")
assert f!=t
f=f.replace("sun.shadow.mapSize.set(MOBILE?1024:2048, MOBILE?1024:2048);","sun.shadow.mapSize.set(512,512);")
f=f.replace("const SEG=MOBILE?200:330;","const SEG=150;").replace("const NT=MOBILE?2400:5200;","const NT=900;")
open(D+'t3dfast.html','w',encoding='utf-8').write(f)
# نسخة توربو للتوازن: 14 تحديثاً لكل إطار، ظلال مطفأة، تضاريس أخف
g=f.replace("for(let i=0;i<6;i++) update(.03); render();","for(let i=0;i<14;i++) update(.03); render();")
g=g.replace("sun.shadow.mapSize.set(512,512);","sun.shadow.mapSize.set(256,256);").replace("const SEG=150;","const SEG=80;").replace("const NT=900;","const NT=200;")
assert g!=f
open(D+'t3dturbo.html','w',encoding='utf-8').write(g)
print('tests ok')
