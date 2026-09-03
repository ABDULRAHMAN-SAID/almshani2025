/* ═══════════ معاينة عالم Unity في Three.js — نفس البيانات ونفس القواعد ═══════════ */
const SEED=3;
terGenerate(SEED);
const N=TER.N, s=TER.step, h=TER.h;
const routes = terRoutes(N, s, h, [0.35, 0.35+Math.PI*2/3, 0.35+Math.PI*4/3]);
terGrade(N, s, h, routes);
const CASTLE_LEVEL = terTerrace(N, s, h, 0, 0, 190, 330);   // مصطبة الحصن
terAO(N, s, h);
const ao=TER.ao, flow=TER.flow, rd=TER.rdist, lake=TER.lake;
const RW = RIVER ? RIVER.w : 0;

/* حقل مسافة الطريق */
const FEATH=26, CORE=9;
const roadD=new Float32Array(N*N).fill(1e9);
for(const R of routes){
  const P=R.path.filter((q,i)=>i%3===0||i===R.path.length-1);
  for(let q=0;q<P.length-1;q++){
    const a=P[q], b=P[q+1];
    const i0=Math.max(1,Math.floor((Math.min(a.x,b.x)-FEATH+WORLD/2)/s)), i1=Math.min(N-2,Math.ceil((Math.max(a.x,b.x)+FEATH+WORLD/2)/s));
    const j0=Math.max(1,Math.floor((Math.min(a.z,b.z)-FEATH+WORLD/2)/s)), j1=Math.min(N-2,Math.ceil((Math.max(a.z,b.z)+FEATH+WORLD/2)/s));
    const dx=b.x-a.x, dz=b.z-a.z, L2=(dx*dx+dz*dz)||1;
    for(let j=j0;j<=j1;j++){ const z=terWX(j);
      for(let i=i0;i<=i1;i++){ const x=terWX(i);
        let t=((x-a.x)*dx+(z-a.z)*dz)/L2; t=t<0?0:t>1?1:t;
        const d=Math.hypot(x-(a.x+dx*t), z-(a.z+dz*t)), k=j*N+i;
        if(d<roadD[k]) roadD[k]=d; } }
  }
}

let LOW=1e9, HIGH=-1e9; for(const v of h){ if(v<LOW)LOW=v; if(v>HIGH)HIGH=v; }
const SPAN=Math.max(1,HIGH-LOW);
const slopeAt=(i,j)=>{ const im=Math.max(i-1,0), ip=Math.min(i+1,N-1), jm=Math.max(j-1,0), jp=Math.min(j+1,N-1);
  const dx=(h[j*N+ip]-h[j*N+im])/((ip-im)*s), dz=(h[jp*N+i]-h[jm*N+i])/((jp-jm)*s); return Math.hypot(dx,dz); };

/* الرطوبة */
const MOIST=new Float32Array(N*N);
for(let j=0;j<N;j++) for(let i=0;i<N;i++){ const k=j*N+i;
  const channel=clamp(Math.log(1+flow[k])/9,0,1);
  const nearRiver = RW>0 ? clamp(1-(rd[k]/(RW*7)),0,1) : 0;
  let nearLake=0;
  if(LAKE){ const d=Math.hypot(terWX(i)-LAKE.x, terWX(j)-LAKE.z); nearLake=clamp(1-((d-LAKE.r)/(LAKE.r*2.6+220)),0,1); }
  const alt=clamp((h[k]-LOW)/SPAN,0,1), sl=clamp(slopeAt(i,j),0,1);
  MOIST[k]=clamp(channel*.46+nearRiver*.34+nearLake*.28+(1-alt)*.34-sl*.30,0,1);
}
function splatAt(i,j){
  const k=j*N+i, sl=slopeAt(i,j), m=MOIST[k], alt=(h[k]-LOW)/SPAN;
  const wx=terWX(i), wz=terWX(j);
  // تبقيع: بدونه تتحوّل الأرض إلى مناطق ملساء متدرّجة تبدو طيناً
  const spotA=fbm(wx*0.026+11, wz*0.026-7, 3)-0.5;
  const spotB=fbm(wx*0.085-3, wz*0.085+19, 2)-0.5;
  const sm=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  let rockAdd=0;
  let rock=sm(0.36,0.80,sl)+sm(0.62,0.92,alt)*0.55;
  let gravel=0;
  if(RW>0) gravel+=clamp(1-(rd[k]/(RW*1.9)),0,1);
  if(roadD[k]<FEATH) gravel+=clamp(1-(roadD[k]/FEATH),0,1)*1.35;
  if(lake && lake[k]) gravel+=0.9;
  let grass=clamp((m+0.22+spotA*0.30)*1.9,0,1)*clamp(1-sl*1.7,0,1);
  let soil=clamp((0.42-m-spotA*0.34+spotB*0.16)*1.8,0,1)*0.9+clamp((sl-0.24)*1.8,0,1);
  rockAdd = clamp(spotB*0.5,0,1)*clamp((sl-0.30)*2.2,0,1);
  rock=Math.max(rock+rockAdd,0); gravel=Math.max(gravel,0); soil=Math.max(soil,0.04); grass=Math.max(grass,0);
  const sum=grass+soil+rock+gravel||1;
  return [grass/sum, soil/sum, rock/sum, gravel/sum];
}

/* ═══ Three.js ═══ */
const renderer=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.10;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 1.2, 6000);
scene.fog=new THREE.FogExp2(0x9db2c4, 0.00040);

/* سماء متدرّجة */
const sky=new THREE.Mesh(new THREE.SphereGeometry(4600, 24, 16), new THREE.ShaderMaterial({
  side:THREE.BackSide, depthWrite:false,
  uniforms:{ top:{value:new THREE.Color(0x3f6fae)}, mid:{value:new THREE.Color(0xa8c0d4)}, bot:{value:new THREE.Color(0xe6cfa8)} },
  vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`varying vec3 vP; uniform vec3 top, mid, bot;
    void main(){ float t=normalize(vP).y;
      vec3 c = t>0.0 ? mix(mid, top, pow(t,0.62)) : mix(mid, bot, pow(-t,0.5));
      gl_FragColor=vec4(c,1.0); }`
}));
scene.add(sky);

const sun=new THREE.DirectionalLight(0xffdfae, 2.15);
sun.position.set(-780, 900, 640);
sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);
sun.shadow.camera.near=10; sun.shadow.camera.far=3400;
sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.9;
scene.add(sun); scene.add(sun.target);
scene.add(new THREE.HemisphereLight(0x9dbbe0, 0x6b5946, 0.80));
scene.add(new THREE.AmbientLight(0xffe9cf, 0.13));

/* ═══ خامات الأرض ═══ */
function dataTex(arr, size, srgb){
  const t=new THREE.DataTexture(arr, size, size, THREE.RGBAFormat);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter;
  t.generateMipmaps=true; t.anisotropy=4;
  if(srgb) t.encoding=THREE.sRGBEncoding;
  t.needsUpdate=true; return t;
}
// خامات مرسومة: أعواد وحصى وشقوق فعلية بدل ضجيج سحابي مموّه
const TSIZE=512, SURF={};
const DRAW={grass:[drawGrassGround,20260101,1.5], soil:[drawSoilGround,20260202,2.4],
            rock:[drawRockGround,20260303,2.6], gravel:[drawGravelGround,20260404,2.4],
            bark:[drawBarkTexture,20260505,2.2]};
for(const name of Object.keys(DRAW)){
  const [fn,sd,st]=DRAW[name], cv=fn(TSIZE, sd);
  SURF[name]={ alb:dataTex(canvasToAlbedo(cv),TSIZE,true), nrm:dataTex(canvasToNormal(cv,st),TSIZE,false) };
}
const grassTex=dataTex(grassClump(256, 20260606, [0.204,0.259,0.145], [0.545,0.573,0.322]), 256, true);
grassTex.wrapS=grassTex.wrapT=THREE.ClampToEdgeWrapping;
const leafTex=dataTex(leafCluster(256, 20260707, [0.129,0.208,0.114], [0.400,0.502,0.235], false), 256, true);
leafTex.wrapS=leafTex.wrapT=THREE.ClampToEdgeWrapping;
const needleTex=dataTex(leafCluster(256, 20260808, [0.086,0.161,0.129], [0.271,0.376,0.243], true), 256, true);
needleTex.wrapS=needleTex.wrapT=THREE.ClampToEdgeWrapping;

/* خريطة الطبقات + الانحجاب */
const SP=1024;
const splatData=new Uint8ClampedArray(SP*SP*4), aoData=new Uint8ClampedArray(SP*SP*4);
for(let y=0;y<SP;y++){ const j=Math.min(N-1, Math.round(y/(SP-1)*(N-1)));
  for(let x=0;x<SP;x++){ const i=Math.min(N-1, Math.round(x/(SP-1)*(N-1)));
    const w=splatAt(i,j), o=(y*SP+x)*4;
    splatData[o]=w[0]*255; splatData[o+1]=w[1]*255; splatData[o+2]=w[2]*255; splatData[o+3]=w[3]*255;
    const a=ao[j*N+i]*255; aoData[o]=a; aoData[o+1]=a; aoData[o+2]=a; aoData[o+3]=255;
  } }
const splatTex=dataTex(splatData, SP, false); splatTex.wrapS=splatTex.wrapT=THREE.ClampToEdgeWrapping;
const aoTex=dataTex(aoData, SP, false); aoTex.wrapS=aoTex.wrapT=THREE.ClampToEdgeWrapping;

/* ═══ شبكة التضاريس: دقّة أعلى من المحاكاة برفع Catmull-Rom ناعم + نتوء دقيق ═══ */
const TN=1025, MICRO=0.55, SC=0.60;   // SC: مقياس العالم — 3600 وحدة توليد ← 2160 متر لعب
function cubic(a,b,c,d,t){ const t2=t*t;
  return b + 0.5*t*(c-a) + t2*(a-2.5*b+2*c-0.5*d) + t2*t*(0.5*(d-a)+1.5*(b-c)); }
function cubicRow(f,i,j,t){ const row=j*N, cl=v=>Math.min(N-1,Math.max(0,v));
  return cubic(f[row+cl(i-1)], f[row+cl(i)], f[row+cl(i+1)], f[row+cl(i+2)], t); }
function sampleSmooth(f,x,z){
  const fx=Math.min(N-1.0001,Math.max(0,(x+WORLD/2)/s)), fz=Math.min(N-1.0001,Math.max(0,(z+WORLD/2)/s));
  const i=Math.floor(fx), j=Math.floor(fz), tx=fx-i, tz=fz-j, cl=v=>Math.min(N-1,Math.max(0,v));
  return cubic(cubicRow(f,i,cl(j-1),tx), cubicRow(f,i,cl(j),tx), cubicRow(f,i,cl(j+1),tx), cubicRow(f,i,cl(j+2),tx), tz);
}
function groundY(x,z){ return sampleSmooth(h,x,z) + (fbm(x*0.042, z*0.042, 3)-0.5)*2*MICRO + (fbm(x*0.105+7, z*0.105-3, 2)-0.5)*2*(MICRO*0.55); }
const pos=new Float32Array(TN*TN*3), uvs=new Float32Array(TN*TN*2);
for(let j=0;j<TN;j++){ const wz=j/(TN-1)*WORLD-WORLD/2;
  for(let i=0;i<TN;i++){ const wx=i/(TN-1)*WORLD-WORLD/2, k=j*TN+i;
    pos[k*3]=wx*SC; pos[k*3+1]=groundY(wx,wz)*SC; pos[k*3+2]=wz*SC;
    uvs[k*2]=i/(TN-1); uvs[k*2+1]=j/(TN-1);
  } }
const idx=new Uint32Array((TN-1)*(TN-1)*6); let ii=0;
for(let j=0;j<TN-1;j++) for(let i=0;i<TN-1;i++){
  const a=j*TN+i, b=a+1, c=a+TN+1, d=a+TN;
  idx[ii++]=a; idx[ii++]=d; idx[ii++]=c; idx[ii++]=a; idx[ii++]=c; idx[ii++]=b;
}
const terGeo=new THREE.BufferGeometry();
terGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
terGeo.setAttribute('uv', new THREE.BufferAttribute(uvs,2));
terGeo.setIndex(new THREE.BufferAttribute(idx,1));
terGeo.computeVertexNormals();

const terMat=new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.95, metalness:0.0});
terMat.onBeforeCompile = sh => {
  sh.uniforms.uSplat={value:splatTex}; sh.uniforms.uAO={value:aoTex};
  sh.uniforms.uT0={value:SURF.grass.alb}; sh.uniforms.uT1={value:SURF.soil.alb};
  sh.uniforms.uT2={value:SURF.rock.alb};  sh.uniforms.uT3={value:SURF.gravel.alb};
  sh.uniforms.uN0={value:SURF.grass.nrm}; sh.uniforms.uN1={value:SURF.soil.nrm};
  sh.uniforms.uN2={value:SURF.rock.nrm};  sh.uniforms.uN3={value:SURF.gravel.nrm};
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec2 vSUv;')
    .replace('#include <project_vertex>', 'vWP=(modelMatrix*vec4(transformed,1.0)).xyz;\nvSUv=uv;\n#include <project_vertex>');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec2 vSUv;
      uniform sampler2D uSplat, uAO, uT0,uT1,uT2,uT3, uN0,uN1,uN2,uN3;
      vec4 dkWeights(){ vec4 w=texture2D(uSplat, vSUv); return w/max(w.r+w.g+w.b+w.a, 1e-4); }`)
    .replace('#include <map_fragment>', `#include <map_fragment>
      vec4 dw = dkWeights();
      vec3 dkCol = texture2D(uT0, vWP.xz/26.0).rgb*dw.r
                 + texture2D(uT1, vWP.xz/30.0).rgb*dw.g
                 + texture2D(uT2, vWP.xz/34.0).rgb*dw.b
                 + texture2D(uT3, vWP.xz/14.0).rgb*dw.a;
      dkCol *= texture2D(uAO, vSUv).r;
      // القراءة اليدوية لا تمرّ بفكّ ترميز sRGB الذي يضيفه Three للخانة map — نفكّه هنا
      diffuseColor.rgb = pow(dkCol, vec3(2.2));`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec4 nw = dkWeights();
      vec3 dkN = (texture2D(uN0, vWP.xz/26.0).xyz*2.0-1.0)*nw.r
               + (texture2D(uN1, vWP.xz/30.0).xyz*2.0-1.0)*nw.g
               + (texture2D(uN2, vWP.xz/34.0).xyz*2.0-1.0)*nw.b
               + (texture2D(uN3, vWP.xz/14.0).xyz*2.0-1.0)*nw.a;
      // الإسقاط على المستوى المماسّ يمنع انقلاب المُسوّي على الجروف شبه العمودية
      vec3 dkPert = vec3(dkN.x, 0.0, dkN.y)*0.70;
      dkPert -= normal * dot(dkPert, normal);
      normal = normalize(normal + dkPert*1.55);`);
};
const terrain=new THREE.Mesh(terGeo, terMat);
terrain.receiveShadow=true; terrain.castShadow=true;
scene.add(terrain);

/* ═══ الماء ═══ */
const waterUniforms={
  uTime:{value:0},
  uShallow:{value:new THREE.Color(0.36,0.60,0.58)},
  uDeep:{value:new THREE.Color(0.045,0.145,0.185)},
  uFoam:{value:new THREE.Color(0.92,0.96,0.97)},
  uSky:{value:new THREE.Color(0.58,0.72,0.88)},
  uSunDir:{value:new THREE.Vector3(0.4,0.6,0.5)},
  uSunCol:{value:new THREE.Color(1.0,0.94,0.82)},
  fogColor:{value:new THREE.Color(0x9db2c4)},
  fogDensity:{value:0.0004}
};
const waterMat=new THREE.ShaderMaterial({
  transparent:true, side:THREE.DoubleSide, depthWrite:true,
  uniforms:waterUniforms,
  vertexShader:`
    attribute vec2 uv2;
    varying float vDepth; varying vec3 vWPos;
    uniform float uTime;
    float wv(vec2 p, float t){
      return sin(p.x*0.085 + t*0.9)*0.55
           + sin((p.x*0.6+p.y*0.8)*0.062 - t*0.71)*0.45
           + sin((p.y*0.9-p.x*0.4)*0.23 + t*1.6)*0.14;
    }
    void main(){
      vDepth = uv2.x;
      vec3 wp = (modelMatrix*vec4(position,1.0)).xyz;
      float amp = clamp(vDepth*0.55, 0.05, 0.42);
      wp.y += wv(wp.xz, uTime)*amp;
      vWPos = wp;
      gl_Position = projectionMatrix * viewMatrix * vec4(wp,1.0);
    }`,
  fragmentShader:`
    precision highp float;
    varying float vDepth; varying vec3 vWPos;
    uniform float uTime;
    uniform vec3 uShallow, uDeep, uFoam, uSky, uSunDir, uSunCol, fogColor;
    uniform float fogDensity;
    float wv(vec2 p, float t){
      return sin(p.x*0.085 + t*0.9)*0.55
           + sin((p.x*0.6+p.y*0.8)*0.062 - t*0.71)*0.45
           + sin((p.y*0.9-p.x*0.4)*0.23 + t*1.6)*0.14;
    }
    vec3 waveNormal(vec2 p, float t, float amp){
      float e=0.55;
      float hL=wv(p-vec2(e,0.0),t), hR=wv(p+vec2(e,0.0),t);
      float hD=wv(p-vec2(0.0,e),t), hU=wv(p+vec2(0.0,e),t);
      return normalize(vec3((hL-hR)*amp, 2.0*e, (hD-hU)*amp));
    }
    void main(){
      float amp = clamp(vDepth*0.55, 0.05, 0.42);
      vec3 n  = waveNormal(vWPos.xz, uTime, amp*2.2);
      vec3 n2 = waveNormal(vWPos.xz*3.7+vec2(31.0,17.0), uTime*1.7, amp*0.8);
      n = normalize(n + (n2-vec3(0.0,1.0,0.0))*0.55);
      vec3 view = normalize(cameraPosition - vWPos);
      float fres = pow(clamp(1.0 - max(dot(n,view),0.0), 0.0, 1.0), 4.0);
      float dt = clamp(vDepth/5.0, 0.0, 1.0);
      dt = dt*dt*(3.0-2.0*dt);
      vec3 body = mix(uShallow, uDeep, dt);
      float ndl = max(dot(n, normalize(uSunDir)), 0.0);
      body *= 0.55 + 0.55*ndl;
      vec3 col = mix(body, uSky, fres*0.72);
      vec3 h = normalize(normalize(uSunDir) + view);
      col += uSunCol * pow(max(dot(n,h),0.0), 300.0) * 1.9;
      // زبد الشاطئ: شريط يتموّج مع الموج
      float edge = 1.0 - smoothstep(0.0, 0.85, vDepth);
      float ripple = 0.55 + 0.45*sin(vWPos.x*0.55 + vWPos.z*0.42 + uTime*1.5 + wv(vWPos.xz,uTime)*3.0);
      float foam = clamp(edge*ripple*1.05, 0.0, 1.0);
      col = mix(col, uFoam, foam*0.72);
      float alpha = mix(0.42, 0.97, dt);
      alpha = max(alpha, foam*0.9);
      float fd = fogDensity * length(cameraPosition - vWPos);
      col = mix(col, fogColor, 1.0 - exp(-fd*fd));
      gl_FragColor = vec4(col, alpha);
    }`
});

/* ═══ أسطح الماء: عمق حقيقي مخزّن في كل رأس ═══ */
if(LAKE && lake){
  const vp=[], vu=[], vd=[], ti=[], map=new Map();
  const vert=k=>{ if(map.has(k)) return map.get(k);
    const x=terWX(k%N), z=terWX((k/N)|0), id=vp.length/3;
    const depth=Math.max(0, (LAKE.level - sampleSmooth(h,x,z))*SC);
    vp.push(x*SC, LAKE.level*SC, z*SC); vu.push(x*SC/22, z*SC/22); vd.push(depth, 0);
    map.set(k,id); return id; };
  for(let j=0;j<N-1;j++) for(let i=0;i<N-1;i++){
    const a=j*N+i, b=a+1, c=a+N+1, d=a+N;
    if(!lake[a]&&!lake[b]&&!lake[c]&&!lake[d]) continue;
    const va=vert(a), vb=vert(b), vc=vert(c), vd2=vert(d);
    ti.push(va,vd2,vc, va,vc,vb);
  }
  if(ti.length){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vp,3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(vu,2));
    g.setAttribute('uv2', new THREE.Float32BufferAttribute(vd,2));
    g.setIndex(ti); g.computeVertexNormals();
    const mesh=new THREE.Mesh(g, waterMat); mesh.renderOrder=2; scene.add(mesh);
  }
}
if(RIVER && RIVER.pts.length>1){
  const P=RIVER.pts, cnt=P.length, hw=RW*0.94, fill=22*0.52;
  const ys=[];
  for(let i=0;i<cnt;i++){
    const pr=P[Math.max(i-1,0)], nx=P[Math.min(i+1,cnt-1)];
    let dx=nx.x-pr.x, dz=nx.z-pr.z; const dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl;
    const bx=-dz*hw, bz=dx*hw;
    const center=sampleSmooth(h,P[i].x,P[i].z);
    const bankA=sampleSmooth(h,P[i].x-bx,P[i].z-bz);
    const bankB=sampleSmooth(h,P[i].x+bx,P[i].z+bz);
    ys.push(Math.min(center+fill, bankA-0.6, bankB-0.6));
  }
  for(let pass=0;pass<3;pass++)
    for(let i=1;i<cnt-1;i++) ys[i]=(ys[i-1]+ys[i]*2+ys[i+1])*0.25;
  // ثلاثة رؤوس عرضاً: الضفّتان بعمق صفر والوسط بالعمق الحقيقي — فيبقى الزبد على الحافّة
  const vp=[], vu=[], vd=[], ti=[]; let travel=0;
  for(let i=0;i<cnt;i++){
    const pr=P[Math.max(i-1,0)], nx=P[Math.min(i+1,cnt-1)];
    let dx=nx.x-pr.x, dz=nx.z-pr.z; const dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl;
    const sx=-dz*hw, sz=dx*hw;
    if(i>0) travel+=Math.hypot(P[i].x-P[i-1].x, P[i].z-P[i-1].z);
    const dC=Math.max(0,(ys[i]-sampleSmooth(h,P[i].x,P[i].z))*SC);
    vp.push((P[i].x-sx)*SC, ys[i]*SC, (P[i].z-sz)*SC,
            P[i].x*SC,      ys[i]*SC, P[i].z*SC,
            (P[i].x+sx)*SC, ys[i]*SC, (P[i].z+sz)*SC);
    vu.push(0, travel*SC/22, 0.5, travel*SC/22, 1, travel*SC/22);
    vd.push(0.05,0, dC,0, 0.05,0);
  }
  for(let i=0;i<cnt-1;i++){ const a=i*3;
    ti.push(a,a+3,a+4, a,a+4,a+1);
    ti.push(a+1,a+4,a+5, a+1,a+5,a+2); }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vp,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(vu,2));
  g.setAttribute('uv2', new THREE.Float32BufferAttribute(vd,2));
  g.setIndex(ti); g.computeVertexNormals();
  const mesh=new THREE.Mesh(g, waterMat); mesh.renderOrder=2; scene.add(mesh);
}

/* ═══ خامات البناء ═══ */
const BUILD={};
{
  const defs={ stone:[drawStoneWall,7001,2.4], plaster:[drawPlaster,7003,2.0],
               timber:[drawTimber,7004,2.0], thatch:[drawThatch,7006,1.8] };
  for(const k2 of Object.keys(defs)){
    const [fn,sd,st]=defs[k2], cv=fn(512, sd);
    BUILD[k2]={ alb:dataTex(canvasToAlbedo(cv),512,true), nrm:dataTex(canvasToNormal(cv,st),512,false) };
  }
  const t1=drawRoofTile(512, 7002, [0.494,0.290,0.196]);
  BUILD.tile={ alb:dataTex(canvasToAlbedo(t1),512,true), nrm:dataTex(canvasToNormal(t1,2.2),512,false) };
  const t2=drawRoofTile(512, 7005, [0.235,0.318,0.408]);
  BUILD.tileBlue={ alb:dataTex(canvasToAlbedo(t2),512,true), nrm:dataTex(canvasToNormal(t2,2.2),512,false) };
}
const stdMat=(t,rough)=>new THREE.MeshStandardMaterial({map:t.alb, normalMap:t.nrm, roughness:rough, metalness:0.0});
const MAT={ stone:stdMat(BUILD.stone,0.93), plaster:stdMat(BUILD.plaster,0.90),
            timber:stdMat(BUILD.timber,0.86), thatch:stdMat(BUILD.thatch,0.95),
            tile:stdMat(BUILD.tile,0.78), tileBlue:stdMat(BUILD.tileBlue,0.62) };

/* ═══ الأشجار ═══ */
const barkMat=new THREE.MeshStandardMaterial({map:SURF.bark.alb, normalMap:SURF.bark.nrm, roughness:0.9, metalness:0.0});
barkMat.map.repeat.set(1,1);
/* الورقة ليست سطحاً صلباً: الضوء ينفذ من خلفها — نقرّب ذلك بإضاءة ملفوفة كما في شادر Unity */
function translucent(mat, amount){
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace(
      'vec3 irradiance = getLightIrradiance( directLight, geometry );',
      'vec3 irradiance = getLightIrradiance( directLight, geometry );');
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <lights_fragment_end>',
      'reflectedLight.indirectDiffuse += diffuseColor.rgb * ' + amount.toFixed(2) + ';\n#include <lights_fragment_end>');
  };
  return mat;
}
const leafMat=translucent(new THREE.MeshStandardMaterial({map:leafTex, transparent:false, alphaTest:0.42, side:THREE.DoubleSide, roughness:0.88, metalness:0.0, vertexColors:true}), 0.46);
const needleMat=translucent(new THREE.MeshStandardMaterial({map:needleTex, transparent:false, alphaTest:0.40, side:THREE.DoubleSide, roughness:0.90, metalness:0.0, vertexColors:true}), 0.34);
const TREES=[];
for(let v=0;v<3;v++) TREES.push({...buildBroadleaf(4110000+v*977, 11+v*2.6), conifer:false});
for(let v=0;v<3;v++) TREES.push({...buildConifer(5220000+v*977, 14+v*3.1), conifer:true});

const TMAXS=0.42, TMINM=0.22, TARGET=2600;
const treePool=[];
{
  const rnd=rngFrom(SEED*31+17);
  const grid=Math.ceil(Math.sqrt(TARGET*18)), cell=WORLD/grid;
  for(let gy=0;gy<grid;gy++) for(let gx=0;gx<grid;gx++){
    const wx=(gx+0.15+rnd()*0.7)*cell-WORLD/2, wz=(gy+0.15+rnd()*0.7)*cell-WORLD/2;
    const i=Math.min(N-1,Math.max(0,Math.round((wx+WORLD/2)/s))), j=Math.min(N-1,Math.max(0,Math.round((wz+WORLD/2)/s)));
    const k=j*N+i;
    if(lake && lake[k]) continue;
    if(RW>0 && rd[k]<RW*1.35) continue;
    if(roadD[k]<62) continue;
    if(wx*wx+wz*wz < 300*300) continue;
    const sl=slopeAt(i,j); if(sl>TMAXS) continue;
    const m=MOIST[k]; if(m<TMINM) continue;
    const clumpN=fbm(wx*0.0016+41, wz*0.0016-17, 4);
    const chance=clamp((m-TMINM)*2.2,0,1)*clamp((clumpN-0.30)*3.4,0,1)*clamp(1-(sl/TMAXS),0,1);
    if(rnd()>chance) continue;
    const alt=(h[k]-LOW)/SPAN;
    const conifer = alt>0.34 || m<0.42;
    const pool=[0,1,2].map(q=>q+(conifer?3:0));
    const sc=0.78+rnd()*0.55;
    const warm=0.86+rnd()*0.30, cool=0.86+rnd()*0.26;
    treePool.push({x:wx, z:wz, y:groundY(wx,wz), v:pool[(rnd()*3)|0], s:sc, r:rnd()*Math.PI*2,
                   tr:warm*(0.92+rnd()*0.20), tg:cool, tb:0.80+rnd()*0.34});
  }
}

/* ═══ الصخور ═══ */
const rockMat=new THREE.MeshStandardMaterial({map:SURF.rock.alb, normalMap:SURF.rock.nrm, roughness:0.93, metalness:0.02});
rockMat.map.repeat.set(1.6,1.6);
const ROCKS=[buildBoulder(6330000,1.4), buildBoulder(6330613,2.2), buildOutcrop(6331226,6.1), buildOutcrop(6331839,7.7)];
const rockPool=[];
{
  const rnd=rngFrom(SEED*977+5), grid=90, cell=WORLD/grid;
  for(let gy=0;gy<grid;gy++) for(let gx=0;gx<grid;gx++){
    const wx=(gx+rnd())*cell-WORLD/2, wz=(gy+rnd())*cell-WORLD/2;
    const i=Math.min(N-1,Math.max(0,Math.round((wx+WORLD/2)/s))), j=Math.min(N-1,Math.max(0,Math.round((wz+WORLD/2)/s)));
    const k=j*N+i;
    if(lake && lake[k]) continue;
    const sl=slopeAt(i,j), bank = RW>0 && rd[k]<RW*2.2;
    const chance = bank ? 0.22 : clamp((sl-0.42)*1.7,0,1);
    if(rnd()>chance) continue;
    if(rockPool.length>=520) break;
    rockPool.push({x:wx, z:wz, y:groundY(wx,wz)-(0.35+rnd()*0.5),
                   v:(rnd()*4)|0, s:0.7+rnd()*1.1, sy:0.8+rnd()*0.5, r:rnd()*Math.PI*2,
                   tx:(rnd()-0.5)*0.32, tz:(rnd()-0.5)*0.32});
  }
}

/* ═══ العشب ═══ */
const grassMat=new THREE.MeshStandardMaterial({map:grassTex, alphaTest:0.35, side:THREE.DoubleSide, roughness:0.94, metalness:0.0, vertexColors:true});
const bladeGeo=(()=>{
  const mb=new MB();
  mb.card([0,0.30,0],[1,0,0],[0,1,0], 0.92, 0.66, 1, 0);
  mb.card([0,0.30,0],[0,0,1],[0,1,0], 0.92, 0.66, 1, 0);
  mb.card([0,0.28,0],[0.7,0,0.7],[0,1,0], 0.84, 0.60, 1, 0);
  return mb.geo(false);
})();

/* ═══ المملكة: قلعة على المصطبة وقرية على الطريق ═══ */
const groundScene=(x,z)=>groundY(x/SC, z/SC)*SC;
const GATE_ANGLE = routes[0] ? routes[0].a : 0;
{
  const rng=rngFrom(90210);
  const K=buildKingdom(groundScene, rng, { radius: 150*SC, cx:0, cz:0, gateAngle: GATE_ANGLE });

  // قرية على أوّل الطريق خارج السور
  const road=routes[0] ? routes[0].path : [];
  let placed=0;
  for(let i=0;i<road.length && placed<16;i++){
    const p=road[i];
    const r=Math.hypot(p.x,p.z);
    if(r < 240 || r > 620) continue;
    if(i%3) continue;
    for(const side of [-1,1]){
      if(placed>=16) break;
      const q=road[Math.min(i+2, road.length-1)];
      let dx=q.x-p.x, dz=q.z-p.z; const dl=Math.hypot(dx,dz)||1; dx/=dl; dz/=dl;
      const off=(26+rng()*16)*side;
      const hx=(p.x - dz*off)*SC, hz=(p.z + dx*off)*SC;
      if(Math.abs(hx)>WORLD*SC/2-40 || Math.abs(hz)>WORLD*SC/2-40) continue;
      buildHouse(K, hx, hz, groundScene(hx,hz), Math.atan2(dx,dz)+(side<0?Math.PI:0), rng,
                 {w:8.5, d:6.5, thatch:true});
      placed++;
    }
  }

  const kingdom=new THREE.Group();
  const addPart=(mb, mat)=>{ if(!mb.p.length) return;
    const m=new THREE.Mesh(mb.geo(false), mat); m.castShadow=true; m.receiveShadow=true; kingdom.add(m); };
  addPart(K.stone, MAT.stone);
  addPart(K.plaster, MAT.plaster);
  addPart(K.timber, MAT.timber);
  addPart(K.thatch, MAT.thatch);
  addPart(K.tile, MAT.tile);
  scene.add(kingdom);
}

/* ═══ إدارة النسخ حسب اللقطة ═══ */
let live=[];
function clearLive(){ for(const o of live){ scene.remove(o); o.geometry && o.dispose && 0; } live=[]; }
function addInstanced(geo, mat, list, build, shadow, tint){
  if(!list.length) return;
  const im=new THREE.InstancedMesh(geo, mat, list.length);
  if(tint){ const col=new THREE.Color();
    list.forEach((it,n)=>{ col.setRGB(it.tr||1, it.tg||1, it.tb||1); im.setColorAt(n, col); });
    if(im.instanceColor) im.instanceColor.needsUpdate=true; }
  const m=new THREE.Matrix4(), q=new THREE.Quaternion(), p=new THREE.Vector3(), sc=new THREE.Vector3(), e=new THREE.Euler();
  list.forEach((it,n)=>{ build(it,p,e,sc); q.setFromEuler(e); m.compose(p,q,sc); im.setMatrixAt(n,m); });
  im.instanceMatrix.needsUpdate=true;
  im.castShadow=!!shadow; im.receiveShadow=true;
  im.frustumCulled=false;
  scene.add(im); live.push(im);
}
function populate(cx, cz, treeR, rockR, grassR, grassN){
  treeR/=SC; rockR/=SC; grassR/=SC;
  clearLive();
  const near=(a,b,R)=>{ const dx=a-cx, dz=b-cz; return dx*dx+dz*dz < R*R; };
  for(let v=0;v<TREES.length;v++){
    const list=treePool.filter(t=>t.v===v && near(t.x,t.z,treeR));
    const T=TREES[v];
    addInstanced(T.trunk, barkMat, list, (it,p,e,sc)=>{ p.set(it.x*SC,it.y*SC,it.z*SC); e.set(0,it.r,0); sc.set(it.s,it.s,it.s); }, true);
    addInstanced(T.canopy, T.conifer?needleMat:leafMat, list, (it,p,e,sc)=>{ p.set(it.x*SC,it.y*SC,it.z*SC); e.set(0,it.r,0); sc.set(it.s,it.s,it.s); }, true, true);
  }
  for(let v=0;v<ROCKS.length;v++){
    const list=rockPool.filter(r=>r.v===v && near(r.x,r.z,rockR));
    addInstanced(ROCKS[v], rockMat, list, (it,p,e,sc)=>{ p.set(it.x*SC,it.y*SC,it.z*SC); e.set(it.tx,it.r,it.tz); sc.set(it.s,it.s*it.sy,it.s); }, true);
  }
  if(grassR>0){
    const rnd=rngFrom(4242), list=[];
    let tries=0;
    while(list.length<grassN && tries++<grassN*14){
      const a=rnd()*Math.PI*2, r=Math.sqrt(rnd())*grassR;
      const wx=cx+Math.cos(a)*r, wz=cz+Math.sin(a)*r;
      if(Math.abs(wx)>WORLD/2-10||Math.abs(wz)>WORLD/2-10) continue;
      const i=Math.min(N-1,Math.max(0,Math.round((wx+WORLD/2)/s))), j=Math.min(N-1,Math.max(0,Math.round((wz+WORLD/2)/s)));
      const k=j*N+i;
      if(lake && lake[k]) continue;
      if(RW>0 && rd[k]<RW*1.1) continue;
      if(roadD[k]<CORE*1.2) continue;
      const sl=slopeAt(i,j); if(sl>0.5) continue;
      const fert=clamp(MOIST[k]*1.5,0,1)*clamp(1-(sl/0.5),0,1)*clamp((fbm(wx*0.0075, wz*0.0075,3)-0.28)*2.4,0,1);
      if(fert<=0.03 || rnd()>fert*1.35) continue;
      const g1=0.80+rnd()*0.42;
      list.push({x:wx, z:wz, y:groundY(wx,wz)-0.06, r:rnd()*Math.PI, s:0.72+rnd()*0.55,
                 tr:g1*(0.86+rnd()*0.26), tg:g1, tb:g1*(0.66+rnd()*0.34)});
    }
    addInstanced(bladeGeo, grassMat, list, (it,p,e,sc)=>{ p.set(it.x*SC,it.y*SC,it.z*SC); e.set(0,it.r,0); sc.set(it.s,it.s*(0.8+it.s*0.3),it.s); }, false, true);
  }
}

/* ═══ اللقطات ═══ */
function look(target, dist, yawDeg, pitchDeg, lift, camLift){
  const yaw=yawDeg*Math.PI/180, pitch=pitchDeg*Math.PI/180;
  const ty=groundY(target[0],target[1])*SC;
  const t=new THREE.Vector3(target[0]*SC, ty+3.2+(lift||0), target[1]*SC);
  const off=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(dist);
  camera.position.copy(t).add(off);
  if(camLift) camera.position.y += camLift;
  camera.lookAt(t);
  sun.target.position.copy(t);
  // الشمس مائلة على يسار الكاميرا: الضوء الزاحف هو ما يُظهر النتوء والملمس
  const yawR=yaw + 2.30;
  const dist2=1000;
  sun.position.copy(t).add(new THREE.Vector3(Math.sin(yawR)*dist2, 420, Math.cos(yawR)*dist2));
  const span = Math.max(180, Math.min(1500, dist*1.5));
  sun.shadow.camera.left=-span; sun.shadow.camera.right=span;
  sun.shadow.camera.top=span; sun.shadow.camera.bottom=-span;
  sun.shadow.camera.far=span*4+900;
  sun.shadow.camera.updateProjectionMatrix();
  waterUniforms.uSunDir.value.copy(sun.position).sub(t).normalize();
  waterUniforms.uTime.value = 11.3;
}
const riverMid = RIVER ? RIVER.pts[Math.floor(RIVER.pts.length*0.62)] : {x:0,z:0};
const roadMid  = routes[0] ? routes[0].path[Math.floor(routes[0].path.length*0.55)] : {x:0,z:0};
const lakePt   = LAKE ? {x:LAKE.x, z:LAKE.z} : {x:0,z:0};

const gateP = [Math.cos(GATE_ANGLE)*250, Math.sin(GATE_ANGLE)*250];
const villP = routes[0] ? (()=>{ const r=routes[0].path.find(p=>Math.hypot(p.x,p.z)>380 && Math.hypot(p.x,p.z)<520);
                                 return r?[r.x,r.z]:[400,0]; })() : [400,0];
const GA = GATE_ANGLE*180/Math.PI;
// موضع البوّابة بإحداثيات التوليد (القلعة نصف قطرها 150 وحدة توليد)
const GATE_R = 150;
const gatePos = [Math.cos(GATE_ANGLE)*GATE_R*0.98, Math.sin(GATE_ANGLE)*GATE_R*0.98];
const YAW_OUT = 90 - GA;          // الكاميرا خارج البوّابة تنظر إلى الداخل
const SHOTS={
  ground: ()=>{ populate(-260, 420, 420, 320, 150, 26000);
                look([-260, 420], 34, 300, 5); scene.fog.density=0.00060; },
  // زوايا مؤطَّرة: منخفضة وقريبة عند البوّابة، علوية ثلاثية الأرباع للمجمّع
  hero:   ()=>{ populate(0,0, 700, 560, 330, 18000);
                look(gatePos, 46, YAW_OUT, 1, 16, -3); scene.fog.density=0.00048; },
  aerial: ()=>{ populate(0,0, 1000, 800, 340, 15000);
                look([0,0], 265, YAW_OUT+28, 24, 8); scene.fog.density=0.00040; },
  tower:  ()=>{ populate(0,0, 600, 480, 300, 16000);
                look([Math.cos(GATE_ANGLE+0.62)*GATE_R*0.95, Math.sin(GATE_ANGLE+0.62)*GATE_R*0.95],
                     34, (GATE_ANGLE+0.62)*180/Math.PI*-1+90, 4, 14, -2); scene.fog.density=0.00050; },
  through:()=>{ populate(0,0, 700, 560, 320, 16000);
                look([Math.cos(GATE_ANGLE)*GATE_R*0.45, Math.sin(GATE_ANGLE)*GATE_R*0.45],
                     46, YAW_OUT+180, 3, 5, 0); scene.fog.density=0.00050; },
  gate:   ()=>{ populate(0,0, 700, 560, 330, 17000);
                look(gatePos, 52, YAW_OUT, 5); scene.fog.density=0.00050; },
  castle: ()=>{ populate(0,0, 900, 700, 340, 15000);
                look([0,0], 250, YAW_OUT, 15); scene.fog.density=0.00042; },
  keep:   ()=>{ populate(0,0, 700, 560, 330, 15000);
                look([0,0], 130, YAW_OUT+40, 16); scene.fog.density=0.00046; },
  village:()=>{ populate(villP[0], villP[1], 700, 520, 280, 17000);
                look(villP, 95, YAW_OUT-70, 13); scene.fog.density=0.00050; },
  valley: ()=>{ populate(150,-260, 900, 700, 220, 12000);
                look([150,-260], 330, 200, 18); scene.fog.density=0.00050; },
  lake:   ()=>{ populate(lakePt.x, lakePt.z, 950, 720, 230, 13000);
                look([lakePt.x, lakePt.z], 330, 145, 8); scene.fog.density=0.00048; },
  far:    ()=>{ populate(0,0, 1700, 1700, 0, 0);
                look([120,60], 1150, 208, 26); scene.fog.density=0.00030; },
};
let ready=false;
function render(){ waterUniforms.fogDensity.value = scene.fog.density; renderer.render(scene, camera); }
window.__d = {
  shot(name){ (SHOTS[name]||SHOTS.far)(); render(); render(); return true; },
  info(){ return { N, trees:treePool.length, rocks:rockPool.length,
                   lake: LAKE?{r:Math.round(LAKE.r), level:+LAKE.level.toFixed(1)}:null,
                   river: RIVER?{pts:RIVER.pts.length, w:+RIVER.w.toFixed(1)}:null,
                   roads: routes.length, range:+(HIGH-LOW).toFixed(0) }; },
  ready(){ return ready; }
};
SHOTS.far(); render(); ready=true;
document.title='ready';
