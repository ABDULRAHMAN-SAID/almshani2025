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
  const sm=(a,b,x)=>{ const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  // ثلاثة مقاييس من التبقيع: كبير يعطي تنوّع لون على مستوى الجبل، ودقيق يكسر التدرّج
  const macro=fbm(wx*0.0034+53, wz*0.0034-29, 4)-0.5;
  const spotA=fbm(wx*0.026+11, wz*0.026-7, 3)-0.5;
  const spotB=fbm(wx*0.085-3, wz*0.085+19, 2)-0.5;

  // جرف: الوجه المكشوف الحادّ العالي
  let cliff = sm(0.44,0.92,sl) * sm(0.15,0.42,alt);
  cliff *= 0.55 + 0.9*clamp(macro*2.2+0.5,0,1);
  // حطام السفح: ميل متوسّط تحت الجروف، وفي الأخاديد حيث يتجمّع الانهيار
  const flowN=clamp(Math.log(1+flow[k])/7,0,1);
  let scree = sm(0.22,0.50,sl)*(1-sm(0.72,1.10,sl)) * sm(0.22,0.52,alt);
  scree *= 0.45 + 1.0*clamp(-macro*2.2+0.5,0,1);
  scree += flowN*sm(0.30,0.70,sl)*sm(0.28,0.60,alt)*0.55;
  // صخر عام على المنحدرات الأدنى
  let rock = sm(0.36,0.80,sl)*(1-sm(0.30,0.62,alt)*0.75) + sm(0.62,0.95,alt)*0.30;
  rock += clamp(spotB*0.5,0,1)*clamp((sl-0.30)*2.2,0,1);
  // حصى: ضفاف وطرق وقاع البحيرة
  let gravel=0;
  if(RW>0) gravel+=clamp(1-(rd[k]/(RW*1.9)),0,1);
  if(roadD[k]<FEATH) gravel+=clamp(1-(roadD[k]/FEATH),0,1)*1.35;
  if(lake && lake[k]) gravel+=0.9;
  // عشب وتربة
  let grass=clamp((m+0.22+spotA*0.30)*1.9,0,1)*clamp(1-sl*1.7,0,1)*(1-sm(0.42,0.70,alt)*0.85);
  let soil=(clamp((0.42-m-spotA*0.34+spotB*0.16)*1.8,0,1)*0.9+0.14)*clamp(1-(sl-0.26)*2.4,0,1);
  soil *= 1-sm(0.38,0.66,alt)*0.9;

  // ثلج القمم: خطّ الثلج يتموّج مع التضاريس ولا يقطع الجبل بخطّ مسطرة،
  // ولا يثبت على الوجوه شبه العمودية لأنّه ينزلق عنها.
  const snowLine = 0.635 + macro*0.26 + spotA*0.10;
  let snow = sm(snowLine, snowLine+0.115, alt) * (1-sm(0.74,1.18,sl));
  snow = Math.max(snow,0);
  const keep = 1-snow*0.93;

  grass=Math.max(grass,0)*keep; soil=Math.max(soil,0.03)*keep;
  rock=Math.max(rock,0)*keep; gravel=Math.max(gravel,0)*keep;
  cliff=Math.max(cliff,0)*keep; scree=Math.max(scree,0)*keep;
  snow*=1.6;
  const sum=grass+soil+rock+gravel+cliff+scree+snow||1;
  return [grass/sum, soil/sum, rock/sum, gravel/sum, cliff/sum, scree/sum, snow/sum];
}

/* ═══ Three.js ═══ */
const renderer=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
// المشهد يُصيَّر خطّياً إلى هدف عالي المدى، ثم تتولّى تمريرة التدرّج اللوني
// التعريضَ والتباينَ والإشباعَ والتعيينَ النغمي والترميزَ إلى sRGB دفعةً واحدة.
// التعيين النغمي المباشر على ألوان ساطعة يغسلها إلى الأبيض — وهذا سبب «شحوب» المشهد.
renderer.outputEncoding=THREE.LinearEncoding;
renderer.toneMapping=THREE.NoToneMapping;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 1.2, 6000);
scene.fog=new THREE.FogExp2(0xb9a68d, 0.00028);

/* ═══ سماء الفجر: تدرّج + قرص شمس متوهّج + سحب ═══
   السماء المتدرّجة وحدها فارغة، والفراغ هو ما يجعل اللقطة تبدو «بلا جوّ». */
const skyUniforms={
  uZenith:{value:new THREE.Color(0.055,0.184,0.478)},
  uHorizon:{value:new THREE.Color(0.639,0.671,0.686)},
  uGround:{value:new THREE.Color(0.353,0.310,0.259)},
  uSunCol:{value:new THREE.Color(1.00,0.784,0.529)},
  uSunDir:{value:new THREE.Vector3(-0.6,0.35,0.7)},
  uCloud:{value:0.86}
};
const sky=new THREE.Mesh(new THREE.SphereGeometry(4600, 32, 20), new THREE.ShaderMaterial({
  side:THREE.BackSide, depthWrite:false, uniforms:skyUniforms,
  vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader:`varying vec3 vP;
    uniform vec3 uZenith, uHorizon, uGround, uSunCol, uSunDir;
    uniform float uCloud;
    float sh2(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float sn2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(sh2(i), sh2(i+vec2(1.0,0.0)), f.x),
                 mix(sh2(i+vec2(0.0,1.0)), sh2(i+vec2(1.0,1.0)), f.x), f.y); }
    float sfbm(vec2 p){ float a=0.5, s=0.0;
      for(int i=0;i<5;i++){ s+=sn2(p)*a; a*=0.5; p=p*2.07+vec2(17.3,9.1); } return s; }
    void main(){
      vec3 d = normalize(vP);
      float t = d.y;
      vec3 c = t>0.0 ? mix(uHorizon, uZenith, pow(t, 0.40))
                     : mix(uHorizon, uGround, pow(-t, 0.45));
      // انتثار أمامي حول الشمس: منه يأتي دفء الأفق
      vec3 sd3 = normalize(uSunDir);
      float sd = max(0.0, dot(d, sd3));
      c += uSunCol * pow(sd, 42.0) * 0.85;
      c += uSunCol * pow(sd, 6.0) * 0.22;
      c += uSunCol * pow(sd, 2.2) * 0.070 * smoothstep(-0.10, 0.34, t);
      // سحب مسقطة على مستوى أفقي فتتقارب عند الأفق كما تفعل حقيقةً
      if(t > 0.006){
        vec2 uv = d.xz / max(t, 0.006) * 0.34;
        float f = sfbm(uv * 0.62 + vec2(11.0, 7.0));
        float cov = smoothstep(0.46, 0.80, f);
        float edge = smoothstep(0.44, 0.98, f);
        float lit = pow(sd * 0.5 + 0.5, 2.6);
        vec3 cloudCol = mix(vec3(0.396,0.427,0.510), vec3(1.02,0.941,0.859), lit*0.50 + edge*0.50);
        float fade = smoothstep(0.006, 0.10, t);
        c = mix(c, cloudCol, cov * fade * uCloud);
      }
      gl_FragColor = vec4(c, 1.0);
    }`
}));
scene.add(sky);

const sun=new THREE.DirectionalLight(0xffc98a, 3.30);
sun.position.set(-950, 680, 780);
sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);
sun.shadow.camera.near=10; sun.shadow.camera.far=3400;
// normalBias بوحدات العالم: 0.9 تدفع نقطة الاستعلام تسعين سنتيمتراً على طول
// المُسوّي، فيُمحى ظلّ التلامس عند قاعدة كل جدار وبرج وشجرة — وهو الظلّ الذي
// يُجلس الجسم على الأرض. الرقم الصحيح كسر من ذلك.
sun.shadow.bias=-0.0012; sun.shadow.normalBias=0.50;
scene.add(sun); scene.add(sun.target);
// الفرق بين ضوء الشمس الدافئ وضوء السماء البارد هو ما يعطي الظلال لوناً.
// إضاءة محيطية بيضاء قويّة تُلغي هذا الفرق فتصير الظلال رمادية ميّتة.
scene.add(new THREE.HemisphereLight(0x6f93d6, 0x4e4438, 0.62));
scene.add(new THREE.AmbientLight(0x5d719e, 0.10));

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
            cliff:[drawCliffRock,20260909,3.0], scree:[drawScree,20261010,2.4],
            snow:[drawSnow,20261111,1.6], bark:[drawBarkTexture,20260505,2.2]};
for(const name of Object.keys(DRAW)){
  const [fn,sd,st]=DRAW[name], cv=fn(TSIZE, sd);
  SURF[name]={ alb:dataTex(canvasToAlbedo(cv),TSIZE,true), nrm:dataTex(canvasToNormal(cv,st),TSIZE,false) };
}
const grassTex=dataTex(grassClump(256, 20260606, [0.204,0.259,0.145], [0.545,0.573,0.322]), 256, true);
grassTex.wrapS=grassTex.wrapT=THREE.ClampToEdgeWrapping;
const leafTex=dataTex(leafCluster(256, 20260707, [0.098,0.169,0.094], [0.286,0.400,0.192], false), 256, true);
leafTex.wrapS=leafTex.wrapT=THREE.ClampToEdgeWrapping;
const needleTex=dataTex(leafCluster(256, 20260808, [0.071,0.133,0.110], [0.204,0.298,0.192], true), 256, true);
needleTex.wrapS=needleTex.wrapT=THREE.ClampToEdgeWrapping;

/* خريطة الطبقات + الانحجاب */
const SP=1024;
const splatData=new Uint8ClampedArray(SP*SP*4), splat2Data=new Uint8ClampedArray(SP*SP*4), aoData=new Uint8ClampedArray(SP*SP*4);
for(let y=0;y<SP;y++){ const j=Math.min(N-1, Math.round(y/(SP-1)*(N-1)));
  for(let x=0;x<SP;x++){ const i=Math.min(N-1, Math.round(x/(SP-1)*(N-1)));
    const w=splatAt(i,j), o=(y*SP+x)*4;
    splatData[o]=w[0]*255; splatData[o+1]=w[1]*255; splatData[o+2]=w[2]*255; splatData[o+3]=w[3]*255;
    splat2Data[o]=w[4]*255; splat2Data[o+1]=w[5]*255; splat2Data[o+2]=w[6]*255; splat2Data[o+3]=255;
    const a=ao[j*N+i]*255; aoData[o]=a; aoData[o+1]=a; aoData[o+2]=a; aoData[o+3]=255;
  } }
const MC=256, macroData=new Uint8ClampedArray(MC*MC*4);
for(let y=0;y<MC;y++){ const wz=(y+0.5)/MC*WORLD-WORLD/2;
  for(let x=0;x<MC;x++){ const wx=(x+0.5)/MC*WORLD-WORLD/2;
    const a=fbm(wx*0.0016+91, wz*0.0016-37, 4);
    const b=fbm(wx*0.0055-13, wz*0.0055+61, 3);
    const bright=0.80+0.40*a+0.12*(b-0.5);
    const warm=0.95+0.13*(b-0.5)*2;
    const o=(y*MC+x)*4;
    macroData[o]=Math.min(255,bright*warm*255);
    macroData[o+1]=Math.min(255,bright*255);
    macroData[o+2]=Math.min(255,bright*(2-warm)*255);
    macroData[o+3]=255;
  } }
const macroTex=dataTex(macroData, MC, false); macroTex.wrapS=macroTex.wrapT=THREE.ClampToEdgeWrapping;
const splatTex=dataTex(splatData, SP, false); splatTex.wrapS=splatTex.wrapT=THREE.ClampToEdgeWrapping;
const splat2Tex=dataTex(splat2Data, SP, false); splat2Tex.wrapS=splat2Tex.wrapT=THREE.ClampToEdgeWrapping;
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

let terShaderRef=null;
const terMat=new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.95, metalness:0.0});
terMat.onBeforeCompile = sh => {
  sh.uniforms.uSplat={value:splatTex}; sh.uniforms.uSplat2={value:splat2Tex}; sh.uniforms.uAO={value:aoTex};
  sh.uniforms.uMacro={value:macroTex};
  sh.uniforms.uAOAmt={value:1.0}; sh.uniforms.uNrmAmt={value:1.0}; terShaderRef=sh;
  sh.uniforms.uT0={value:SURF.grass.alb}; sh.uniforms.uT1={value:SURF.soil.alb};
  sh.uniforms.uT2={value:SURF.rock.alb};  sh.uniforms.uT3={value:SURF.gravel.alb};
  sh.uniforms.uN0={value:SURF.grass.nrm}; sh.uniforms.uN1={value:SURF.soil.nrm};
  sh.uniforms.uN2={value:SURF.rock.nrm};  sh.uniforms.uN3={value:SURF.gravel.nrm};
  sh.uniforms.uT4={value:SURF.cliff.alb}; sh.uniforms.uT5={value:SURF.scree.alb};
  sh.uniforms.uN4={value:SURF.cliff.nrm}; sh.uniforms.uN5={value:SURF.scree.nrm};
  sh.uniforms.uT6={value:SURF.snow.alb};  sh.uniforms.uN6={value:SURF.snow.nrm};
  sh.uniforms.uLow={value:LOW*SC}; sh.uniforms.uSpan={value:SPAN*SC};
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec2 vSUv;\nvarying vec3 vWN;')
    .replace('#include <project_vertex>', 'vWP=(modelMatrix*vec4(transformed,1.0)).xyz;\nvSUv=uv;\nvWN=normalize(mat3(modelMatrix)*objectNormal);\n#include <project_vertex>');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec2 vSUv;
      uniform sampler2D uSplat, uSplat2, uAO, uT0,uT1,uT2,uT3,uT4,uT5,uT6, uN0,uN1,uN2,uN3,uN4,uN5,uN6;
      uniform float uAOAmt, uNrmAmt, uLow, uSpan;
      uniform sampler2D uMacro;
      varying vec3 vWN;
      // إسقاط ثلاثي المحاور: بدونه يُمطّ النسيج على الوجوه الحادّة فيظهر نقش متكرّر
      // بلاطة واحدة تتكرّر مئات المرّات على جدار الجبل فتُقرأ كنقش حِراشف.
      // مزج المقياسين — قريب وبعيد بإزاحة — يُذيب التكرار.
      vec3 dkFlat(sampler2D t, vec2 p, float sc){
        return mix(texture2D(t, p/sc).rgb,
                   texture2D(t, p/(sc*3.9)+vec2(0.37,0.61)).rgb, 0.42);
      }
      vec3 dkTri(sampler2D t, vec3 wp, vec3 n, float sc){
        vec3 bw = abs(n); bw = bw*bw*bw*bw; bw /= max(bw.x+bw.y+bw.z, 1e-4);
        return dkFlat(t, wp.zy, sc)*bw.x + dkFlat(t, wp.xz, sc)*bw.y + dkFlat(t, wp.xy, sc)*bw.z;
      }
      vec4 dkW1; vec3 dkW2;
      void dkWeights(){
        vec4 a=texture2D(uSplat, vSUv); vec3 b=texture2D(uSplat2, vSUv).rgb;
        float s=max(a.r+a.g+a.b+a.a+b.r+b.g+b.b, 1e-4);
        dkW1=a/s; dkW2=b/s;
      }`)
    .replace('#include <map_fragment>', `#include <map_fragment>
      dkWeights();
      vec3 dkN3 = normalize(vWN);
      vec3 dkCol = dkFlat(uT0, vWP.xz, 10.0)*dkW1.r
                 + dkFlat(uT1, vWP.xz, 12.0)*dkW1.g
                 + dkTri(uT2, vWP, dkN3, 12.5)*dkW1.b
                 + dkFlat(uT3, vWP.xz, 6.5)*dkW1.a
                 + dkTri(uT4, vWP, dkN3, 13.0)*dkW2.r
                 + dkTri(uT5, vWP, dkN3, 8.0)*dkW2.g
                 + dkTri(uT6, vWP, dkN3, 11.0)*dkW2.b;
      dkCol *= mix(1.0, texture2D(uAO, vSUv).r, uAOAmt);
      dkCol *= texture2D(uMacro, vSUv).rgb * 0.94;
      // إشباع لون الأرض قبل الإضاءة: الخامات المرسومة رمادية بطبعها
      float dkLum = dot(dkCol, vec3(0.2126,0.7152,0.0722));
      dkCol = mix(vec3(dkLum), dkCol, 1.26);
      // تدرّج ارتفاعي: الوادي دافئ مخضرّ، السفح ترابي، القمّة رمادية باردة
      float dkAlt = clamp((vWP.y - uLow)/max(uSpan,1.0), 0.0, 1.0);
      dkCol *= mix(vec3(1.07,1.035,0.905), vec3(0.855,0.925,1.075),
                   smoothstep(0.22, 0.86, dkAlt));
      // طبقات جيولوجية بمقياس الجبل لا بمقياس البلاطة: لا تتكرّر فتصير شرائط
      float dkBand = sin(vWP.y*0.075 + sin(vWP.x*0.0035)*2.1 + cos(vWP.z*0.0031)*1.7)*0.62
                   + sin(vWP.y*0.021 + cos(vWP.x*0.0019)*1.4)*0.38;
      dkCol *= 1.0 + dkBand*0.105*smoothstep(0.24,0.58,dkAlt)*(dkW1.b+dkW2.r+dkW2.g);
      // القراءة اليدوية لا تمرّ بفكّ ترميز sRGB الذي يضيفه Three للخانة map — نفكّه هنا
      diffuseColor.rgb = pow(dkCol, vec3(2.2));`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      dkWeights();
      vec3 dkNw = normalize(vWN);
      vec3 dkN = (texture2D(uN0, vWP.xz/10.0).xyz*2.0-1.0)*dkW1.r
               + (texture2D(uN1, vWP.xz/12.0).xyz*2.0-1.0)*dkW1.g
               + (dkTri(uN2, vWP, dkNw, 12.5)*2.0-1.0)*dkW1.b
               + (texture2D(uN3, vWP.xz/6.5).xyz*2.0-1.0)*dkW1.a
               + (dkTri(uN4, vWP, dkNw, 13.0)*2.0-1.0)*dkW2.r
               + (dkTri(uN5, vWP, dkNw, 8.0)*2.0-1.0)*dkW2.g
               + (dkTri(uN6, vWP, dkNw, 11.0)*2.0-1.0)*dkW2.b;
      // الإسقاط على المستوى المماسّ يمنع انقلاب المُسوّي على الجروف شبه العمودية
      vec3 dkPert = vec3(dkN.x, 0.0, dkN.y)*0.70;
      dkPert -= normal * dot(dkPert, normal);
      normal = normalize(normal + dkPert*1.55*uNrmAmt);`);
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
  fogColor:{value:new THREE.Color(0xb9a68d)},
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

const TMAXS=0.60, TMINM=0.13, TARGET=6200;
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
    const alt0=(h[k]-LOW)/SPAN;
    const slLimit=TMAXS+clamp((0.45-alt0)*0.5,0,0.14);
    const sl=slopeAt(i,j); if(sl>slLimit) continue;
    const m=MOIST[k]; if(m<TMINM) continue;
    const clumpN=fbm(wx*0.0016+41, wz*0.0016-17, 4);
    // خطّ الشجر يعلو حتى ~0.66 من ارتفاع الخريطة ثم ينقطع دون حدّ الثلج
    const chance=clamp((m-TMINM)*2.6,0,1)*clamp((clumpN-0.24)*3.2,0,1)*clamp(1-(sl/slLimit)*0.85,0,1)
                 *clamp(1-(alt0-0.42)/0.24,0,1);
    if(rnd()>chance) continue;
    const alt=(h[k]-LOW)/SPAN;
    const conifer = alt>0.30 || m<0.42;
    const pool=[0,1,2].map(q=>q+(conifer?3:0));
    const sc=(0.78+rnd()*0.55)*(1-clamp((alt-0.32)/0.42,0,1)*0.34);
    const warm=0.86+rnd()*0.30, cool=0.86+rnd()*0.26;
    treePool.push({x:wx, z:wz, y:groundY(wx,wz), v:pool[(rnd()*3)|0], s:sc, r:rnd()*Math.PI*2,
                   tr:warm*(0.92+rnd()*0.20), tg:cool, tb:0.80+rnd()*0.34});
  }
}

/* ═══ الصخور ═══ */
const rockMat=new THREE.MeshStandardMaterial({map:SURF.rock.alb, normalMap:SURF.rock.nrm, roughness:0.93, metalness:0.02});
rockMat.map.repeat.set(4.0,4.0); rockMat.normalMap.repeat.set(4.0,4.0);
const cliffMat=new THREE.MeshStandardMaterial({map:SURF.cliff.alb, normalMap:SURF.cliff.nrm, roughness:0.95, metalness:0.02, vertexColors:true});
cliffMat.map.repeat.set(6.0,6.0); cliffMat.normalMap.repeat.set(6.0,6.0);
const ROCKS=[buildBoulder(6330000,1.4), buildBoulder(6330613,2.2), buildOutcrop(6331226,6.1), buildOutcrop(6331839,7.7)];
const rockPool=[], cliffPool=[];
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
/* نتوءات الجرف: كتل كبيرة كثيفة حيث ينكشف الصخر — بها يصير للجبل شكل */
{
  const rnd=rngFrom(SEED*613+91), grid=210, cell=WORLD/grid;
  let lo=1e9, hi=-1e9; for(const v of h){ if(v<lo)lo=v; if(v>hi)hi=v; }
  const span=Math.max(1,hi-lo);
  for(let gy=0;gy<grid;gy++) for(let gx=0;gx<grid;gx++){
    const wx=(gx+rnd())*cell-WORLD/2, wz=(gy+rnd())*cell-WORLD/2;
    const i=Math.min(N-1,Math.max(0,Math.round((wx+WORLD/2)/s))), j=Math.min(N-1,Math.max(0,Math.round((wz+WORLD/2)/s)));
    const k=j*N+i;
    const sl=slopeAt(i,j), alt=(h[k]-lo)/span;
    const chance=clamp((sl-0.46)*1.6,0,1)*clamp((alt-0.16)/0.32,0,1);
    if(rnd()>chance*0.85) continue;
    if(cliffPool.length>=6400) break;
    const big=rnd()<0.50;
    cliffPool.push({x:wx, z:wz, y:groundY(wx,wz)-(0.4+rnd()*1.1),
                    v:big?(2+((rnd()*2)|0)):((rnd()*2)|0),
                    s:(big? 2.9+rnd()*4.3 : 1.3+rnd()*2.1),
                    sy:0.7+rnd()*0.9, r:rnd()*Math.PI*2,
                    tx:(rnd()-0.5)*0.5, tz:(rnd()-0.5)*0.5,
                    tr:0.82+rnd()*0.30, tg:0.85+rnd()*0.28, tb:0.90+rnd()*0.28});
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
  for(let v=0;v<ROCKS.length;v++){
    const list=cliffPool.filter(r=>r.v===v && near(r.x,r.z,rockR*2.2));
    addInstanced(ROCKS[v], cliffMat, list, (it,p,e,sc)=>{ p.set(it.x*SC,it.y*SC,it.z*SC); e.set(it.tx,it.r,it.tz); sc.set(it.s,it.s*it.sy,it.s); }, true, true);
  }
  // أهل المملكة: يُوضعون بنفس نصف قطر الصخور فيظهرون في كل لقطة قريبة
  {
    for(const key of Object.keys(FOLK)){
      const list=folkPool.filter(f=>f.v===key && near(f.x,f.z,Math.max(rockR,520/SC)));
      if(!list.length) continue;
      const isHorse = key==='horse' || key==='horseplain';
      const place=(it,p,e,sc)=>{
        const k=(isHorse?HORSE_S:HUMAN_H)*it.s;
        p.set(it.x*SC, it.y*SC, it.z*SC); e.set(0, it.r, 0); sc.set(k,k,k);
      };
      addInstanced(FOLK[key].body,  bodyMat,  list, place, true, false);
      addInstanced(FOLK[key].cloth, clothMat, list, place, true, true);
    }
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
/* الضباب يُقاس بمضاعفات بُعد الكاميرا لا بالمتر: عند الإبعاد يتراجع تلقائياً
   فيبقى الميدان صافياً، ولا يبقى منه إلا تدرّج المسافة على حافّة الخريطة. */
// exp2: نسبة الضباب على مسافة d هي 1-exp(-(density·d)²).
// المعامل 0.135 مضبوط ليعطي ~16٪ ضباباً على ثلاثة أضعاف بُعد الكاميرا
// و~70٪ على ثمانية أضعافه: الميدان صافٍ، والعمق يبقى مقروءاً على الحافّة.
const FOG_K = 0.135;
function applyFog(camDist){
  scene.fog.density = FOG_K / Math.max(120, camDist);
  waterUniforms.fogDensity.value = scene.fog.density;
}
function look(target, dist, yawDeg, pitchDeg, lift, camLift){
  const yaw=yawDeg*Math.PI/180, pitch=pitchDeg*Math.PI/180;
  const ty=groundY(target[0],target[1])*SC;
  const t=new THREE.Vector3(target[0]*SC, ty+3.2+(lift||0), target[1]*SC);
  const off=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(dist);
  camera.position.copy(t).add(off);
  if(camLift) camera.position.y += camLift;
  camera.lookAt(t);
  sun.target.position.copy(t);
  // زاوية الشمس بالنسبة للكاميرا: 54° تجعلها خلف الكاميرا تقريباً فتقع الظلال
  // **خلف** الأجسام مختفيةً عن النظر — والمشهد يبدو مسطّحاً بلا ظلال أصلاً.
  // 83° إضاءة جانبية: الظلال تمتدّ عرض الكادر فتُقرأ، والضوء يبقى زاحفاً على
  // أضلاع الجبل. و132° (ما كان قبلاً) يجعل الجبل كتلة سوداء.
  // شمس عالمية ثابتة لا تدور مع الكاميرا: العالم فيه شمس واحدة، واللاعب يدير
  // كاميرته حولها. ربطُها بالكاميرا يجعل الظلال تتحرّك مع النظر — وهو خطأ فادح
  // في لعبة استراتيجية يدور فيها المشهد.
  const dist2=1400;
  sun.position.copy(t).add(new THREE.Vector3(Math.sin(SUN_AZ)*dist2, SUN_H, Math.cos(SUN_AZ)*dist2));
  applyFog(dist);
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
// زاوية الشمس بالنسبة للكاميرا هي كل شيء في الظلال:
//   0°   خلف الكاميرا تماماً → الظلّ يقع خلف الجسم فلا يُرى، والمشهد يبدو مسطّحاً.
//   83°  جانبية → الظلّ ما زال أغلبه محجوباً وراء الجدران.
//   135° أمامية بميل → الظلّ يمتدّ نحو الناظر فيُقرأ كاملاً، والجسم يبقى مضاءً.
//   180° خلف الهدف → الجبل كتلة سوداء.
// الارتفاع 430 على بُعد 1000 ≈ 23°: ظلال طويلة تنمذج الأرض.
// سمت الشمس اختير بالقياس لا بالتخمين: مُسحت ستّ زوايا عالمية على لقطتَي
// الجبال والقلعة، و149° وحدها تخدم الاثنين — جدار الجبل مضاء وأضلاعه تُقرأ،
// والقلعة تُلقي ظلالاً طويلة عبر العشب. الارتفاع 620 على بُعد 1400 ≈ 24°.
let SUN_AZ=2.60, SUN_H=620, LAST_SHOT='far';
const GA = GATE_ANGLE*180/Math.PI;
// موضع البوّابة بإحداثيات التوليد (القلعة نصف قطرها 150 وحدة توليد)
const GATE_R = 150;
const gatePos = [Math.cos(GATE_ANGLE)*GATE_R*0.98, Math.sin(GATE_ANGLE)*GATE_R*0.98];
const YAW_OUT = 90 - GA;          // الكاميرا خارج البوّابة تنظر إلى الداخل
/* ═══ أهل المملكة: بطل وجنود وقرويّون وخيل ═══
   نُصبح الشبكة الواحدة لكل صنف، ويُصبغ القماش بلون النسخة عبر instanceColor:
   القميص والعباءة والجُلّ بيضاء في الشبكة، فتأخذ لون الرايات لكل فصيلة. */
// مادّتان: البدن لا يُصبغ بلون النسخة، والقماش يُصبغ. لو كانت واحدة لصبغ لونُ
// الراية الجلدَ والفولاذ معه فيصير الجندي كتلة قرمزية بلا ملامح.
const bodyMat=new THREE.MeshStandardMaterial({
  color:0xffffff, roughness:0.68, metalness:0.16, vertexColors:true, side:THREE.DoubleSide });
const clothMat=new THREE.MeshStandardMaterial({
  color:0xffffff, roughness:0.86, metalness:0.0, vertexColors:true, side:THREE.DoubleSide });
const HUMAN_H = 3.05;                 // وحدة توليد ≈ 0.6 متر لعب ← الجندي 1.83 م
const HORSE_S = 3.20;

const mkFolk=(seed,kind)=>{ const r=buildHuman(seed,kind); return { body:r.body.geo(true), cloth:r.cloth.geo(true) }; };
const mkHorse=(seed,barded)=>{ const r=buildHorse(seed,barded); return { body:r.body.geo(true), cloth:r.cloth.geo(true) }; };
const FOLK = {
  hero:      mkFolk(90001,'hero'),
  spear:     mkFolk(90002,'spear'),
  spear2:    mkFolk(90003,'spear2'),
  sword:     mkFolk(90004,'sword'),
  sword2:    mkFolk(90005,'sword2'),
  archer:    mkFolk(90006,'archer'),
  villager:  mkFolk(90007,'villager'),
  villager2: mkFolk(90008,'villager'),
  horse:      mkHorse(91001,true),
  horseplain: mkHorse(91002,false),
};

/* ألوان رايات المملكة: قرمزيّ الحرس، وأزرق الرماة، وترابيّ القرويّين */
const LIVERY = {
  guard:  [0.647,0.180,0.180],
  archer: [0.220,0.353,0.541],
  hero:   [0.741,0.153,0.169],
  folk:   [[0.643,0.573,0.451],[0.514,0.455,0.353],[0.427,0.482,0.400],[0.596,0.514,0.404]]
};

const folkPool=[];       // {x,z,r,v,s,tr,tg,tb}
{
  const rnd=rngFrom(SEED*7717+31);
  const put=(v, x, z, rot, liv, scale)=>{
    folkPool.push({ v, x, z, r:rot, s:(scale||1)*(0.96+rnd()*0.09),
                    y:groundY(x,z), tr:liv[0], tg:liv[1], tb:liv[2] });
  };
  const ringR = 150;                              // نصف قطر سور القلعة بوحدات التوليد
  const gA = GATE_ANGLE;

  // ١) حرس البوّابة: زوج على كل جانب، متقابلان
  for(const side of [-1,1]){
    const a=gA + side*0.085;
    put('spear', Math.cos(a)*(ringR+9), Math.sin(a)*(ringR+9), -a+Math.PI/2, LIVERY.guard);
    put('spear2', Math.cos(a)*(ringR+21), Math.sin(a)*(ringR+21), -a+Math.PI/2, LIVERY.guard);
  }

  // ٢) البطل أمام البوّابة، ووراءه صفّان من الرِّماح — كتشكيل استعراض
  const hx=Math.cos(gA)*(ringR+46), hz=Math.sin(gA)*(ringR+46);
  put('hero', hx, hz, -gA+Math.PI/2, LIVERY.hero, 1.10);
  const ux=Math.cos(gA), uz=Math.sin(gA);          // اتّجاه الخروج
  const px=-uz, pz=ux;                              // عرض الصفّ
  for(let row=0; row<3; row++){
    for(let col=-3; col<=3; col++){
      if(row===0 && Math.abs(col)<1) continue;      // مكان البطل
      const jitter=(rnd()-0.5)*1.4;
      const x=hx + ux*(row*11+9) + px*(col*9.5+jitter);
      const z=hz + uz*(row*11+9) + pz*(col*9.5+jitter);
      const kind = (row===2) ? (col%2 ? 'archer':'archer') : ((col+row)%2 ? 'spear':'spear2');
      put(kind, x, z, -gA+Math.PI/2 + (rnd()-0.5)*0.10,
          row===2 ? LIVERY.archer : LIVERY.guard);
    }
  }

  // ٣) فارسان على جانبَي الطريق
  for(const side of [-1,1]){
    const x=hx + ux*44 + px*side*30, z=hz + uz*44 + pz*side*30;
    folkPool.push({ v:'horse', x, z, r:-gA+Math.PI/2, s:1, y:groundY(x,z),
                    tr:LIVERY.hero[0], tg:LIVERY.hero[1], tb:LIVERY.hero[2] });
    // الفارس يجلس على السرج: 0.82 من وحدة بناء الحصان مضروبةً في مقياسه
    folkPool.push({ v:'sword2', x, z, r:-gA+Math.PI/2, s:0.98,
                    y:groundY(x,z)+0.82*HORSE_S/SC*SC,
                    tr:LIVERY.hero[0], tg:LIVERY.hero[1], tb:LIVERY.hero[2] });
  }

  // ٤) حرس على أبراج السور: أربعة موزّعة حول الطوق
  for(let i=0;i<4;i++){
    const a=gA + Math.PI*0.5 + i*Math.PI*0.42;
    put('sword', Math.cos(a)*(ringR+6), Math.sin(a)*(ringR+6), -a+Math.PI/2, LIVERY.guard);
  }

  // ٥) قرويّون حول القرية وعلى الطريق
  if(villP){
    for(let i=0;i<14;i++){
      const a=rnd()*Math.PI*2, r=12+rnd()*46;
      const x=villP[0]+Math.cos(a)*r, z=villP[1]+Math.sin(a)*r;
      const liv=LIVERY.folk[(rnd()*LIVERY.folk.length)|0];
      put(rnd()<0.5?'villager':'villager2', x, z, rnd()*Math.PI*2, liv, 0.95+rnd()*0.06);
    }
    // خيل بلا فارس ترعى قرب القرية
    for(let i=0;i<3;i++){
      const a=rnd()*Math.PI*2, r=26+rnd()*30;
      const x=villP[0]+Math.cos(a)*r, z=villP[1]+Math.sin(a)*r;
      folkPool.push({ v:'horseplain', x, z, r:rnd()*Math.PI*2, s:0.95+rnd()*0.08,
                      y:groundY(x,z), tr:1, tg:1, tb:1 });
    }
  }
}

const SHOTS={
  mountain: ()=>{ populate(-560, 700, 1500, 1400, 260, 16000);
                  look([-560, 700], 620, 152, 7, 60); },
  peaks:    ()=>{ populate(-300, 1050, 1400, 1300, 0, 0);
                  look([-300, 1050], 760, 150, 8, 150); },
  ridge:    ()=>{ populate(-420, 880, 1600, 1500, 240, 14000);
                  look([-420, 880], 980, 168, 12, 90); },
  ground: ()=>{ populate(-260, 420, 520, 420, 190, 30000);
                look([-260, 420], 92, 300, 21, 6); },
  // زوايا مؤطَّرة: منخفضة وقريبة عند البوّابة، علوية ثلاثية الأرباع للمجمّع
  hero:   ()=>{ populate(0,0, 700, 560, 330, 18000);
                look(gatePos, 46, YAW_OUT, 1, 16, -3); },
  aerial: ()=>{ populate(0,0, 1000, 800, 340, 15000);
                look([0,0], 265, YAW_OUT+28, 24, 8); },
  tower:  ()=>{ populate(0,0, 600, 480, 300, 16000);
                look([Math.cos(GATE_ANGLE+0.62)*GATE_R*0.95, Math.sin(GATE_ANGLE+0.62)*GATE_R*0.95],
                     34, (GATE_ANGLE+0.62)*180/Math.PI*-1+90, 4, 14, -2); },
  through:()=>{ populate(0,0, 700, 560, 320, 16000);
                look([Math.cos(GATE_ANGLE)*GATE_R*0.45, Math.sin(GATE_ANGLE)*GATE_R*0.45],
                     46, YAW_OUT+180, 3, 5, 0); },
  army:   ()=>{ populate(gatePos[0], gatePos[1], 700, 560, 260, 16000);
                look([Math.cos(GATE_ANGLE)*(150+62), Math.sin(GATE_ANGLE)*(150+62)], 92, YAW_OUT+18, 12, 4); },
  hero2:  ()=>{ populate(gatePos[0], gatePos[1], 620, 480, 200, 14000);
                look([Math.cos(GATE_ANGLE)*(150+46), Math.sin(GATE_ANGLE)*(150+46)], 26, YAW_OUT+8, 6, 1.4); },
  gate:   ()=>{ populate(0,0, 700, 560, 330, 17000);
                look(gatePos, 52, YAW_OUT, 5); },
  castle: ()=>{ populate(0,0, 900, 700, 340, 15000);
                look([0,0], 250, YAW_OUT, 15); },
  keep:   ()=>{ populate(0,0, 700, 560, 330, 15000);
                look([0,0], 130, YAW_OUT+40, 16); },
  village:()=>{ populate(villP[0], villP[1], 700, 520, 280, 17000);
                look(villP, 95, YAW_OUT-70, 13); },
  valley: ()=>{ populate(150,-260, 900, 700, 220, 12000);
                look([150,-260], 330, 200, 18); },
  lake:   ()=>{ populate(lakePt.x, lakePt.z, 950, 720, 230, 13000);
                look([lakePt.x, lakePt.z], 330, 145, 8); },
  far:    ()=>{ populate(0,0, 1700, 1700, 0, 0);
                look([120,60], 1150, 208, 26); },
};
let ready=false;
/* ═══ تمريرة التدرّج اللوني: هي ما يصنع «الجوّ» ═══
   المشهد يُصيَّر خطّياً إلى هدف عالي المدى، ثم تُطبَّق دفعةً واحدة:
   تعريض ← فصل دافئ/بارد بين الإضاءة والظلّ ← تباين ← إشباع ← توهّج ←
   تعيين نغمي ACES ← تعتيم الأطراف ← ترميز sRGB.
   بدونها تُغسل الألوان الساطعة إلى الأبيض ويصير المشهد شاحباً بلا هوية. */
const GRADE={
  exposure: 1.06,
  shadowTint: new THREE.Color(0.835, 0.898, 1.130),   // الظلّ يأخذ لون السماء
  highTint:   new THREE.Color(1.085, 1.020, 0.900),   // الإضاءة تأخذ لون الشمس
  contrast: 1.15,
  saturation: 1.30,
  bloomThreshold: 1.05,
  bloomIntensity: 0.42,
  vignette: 0.26
};
const RTOPT={ minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter,
              format:THREE.RGBAFormat, type:THREE.HalfFloatType,
              encoding:THREE.LinearEncoding, depthBuffer:true, stencilBuffer:false };
const RW_=innerWidth, RH_=innerHeight, BW_=Math.max(2,RW_>>1), BH_=Math.max(2,RH_>>1);
const rtScene=new THREE.WebGLRenderTarget(RW_, RH_, RTOPT);
// عمق المشهد: منه يُحسب الانحجاب المحيطي — وهو ما يُجلس الأجسام على الأرض
rtScene.depthTexture=new THREE.DepthTexture(RW_, RH_);
rtScene.depthTexture.type=THREE.UnsignedIntType;
const rtAO=new THREE.WebGLRenderTarget(RW_, RH_, Object.assign({}, RTOPT, {depthBuffer:false, type:THREE.UnsignedByteType}));
const rtAOB=new THREE.WebGLRenderTarget(RW_, RH_, Object.assign({}, RTOPT, {depthBuffer:false, type:THREE.UnsignedByteType}));
const rtBloomA=new THREE.WebGLRenderTarget(BW_, BH_, Object.assign({}, RTOPT, {depthBuffer:false}));
const rtBloomB=new THREE.WebGLRenderTarget(BW_, BH_, Object.assign({}, RTOPT, {depthBuffer:false}));

const fsScene=new THREE.Scene(), fsCam=new THREE.Camera();
const fsQuad=new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2), null);
fsQuad.frustumCulled=false; fsScene.add(fsQuad);
const FS_VERT='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';

// استخلاص المناطق الساطعة وحدها — التوهّج على كل شيء يعيد الغسل الأبيض
const brightMat=new THREE.ShaderMaterial({
  uniforms:{ tSrc:{value:null}, uThreshold:{value:GRADE.bloomThreshold} },
  vertexShader:FS_VERT,
  fragmentShader:`varying vec2 vUv; uniform sampler2D tSrc; uniform float uThreshold;
    void main(){ vec3 c=texture2D(tSrc, vUv).rgb;
      float l=dot(c, vec3(0.2126,0.7152,0.0722));
      float k=max(0.0, l-uThreshold)/max(l, 1e-4);
      gl_FragColor=vec4(c*k, 1.0); }`
});
const blurMat=new THREE.ShaderMaterial({
  uniforms:{ tSrc:{value:null}, uDir:{value:new THREE.Vector2(1,0)},
             uTexel:{value:new THREE.Vector2(1/BW_, 1/BH_)} },
  vertexShader:FS_VERT,
  fragmentShader:`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uDir, uTexel;
    void main(){
      vec2 o=uDir*uTexel;
      vec3 c = texture2D(tSrc, vUv).rgb*0.2270270270;
      c += (texture2D(tSrc, vUv+o*1.3846153846).rgb + texture2D(tSrc, vUv-o*1.3846153846).rgb)*0.3162162162;
      c += (texture2D(tSrc, vUv+o*3.2307692308).rgb + texture2D(tSrc, vUv-o*3.2307692308).rgb)*0.0702702703;
      gl_FragColor=vec4(c,1.0); }`
});
/* ═══ الانحجاب المحيطي في الفضاء الشاشي ═══
   الظلّ المُسقَط وحده لا يكفي: الجدار والشجرة والبرج تبدو **ملصوقة** على الأرض
   لأن لا شيء يعتم عند خطّ التلامس. هذا يقرأ عمق المشهد، ويعيد بناء الموضع
   والمُسوّي منه، ثم يعدّ كم عيّنة في نصف الكرة حول كل نقطة يحجبها ما هو أقرب. */
const AO_KERNEL=(()=>{
  const k=[]; let sd=1;
  const rnd=()=>{ sd=(sd*1664525+1013904223)>>>0; return (sd>>>8)/16777216; };
  for(let i=0;i<14;i++){
    let x,y,z,l;
    do { x=rnd()*2-1; y=rnd()*2-1; z=rnd(); l=Math.hypot(x,y,z); } while(l<1e-3||l>1);
    // كثافة أعلى قرب المركز: التفاصيل القريبة أهمّ
    const scale=0.32+0.68*Math.pow(i/14,2);
    k.push(new THREE.Vector3(x/l*scale, y/l*scale, z/l*scale));
  }
  return k;
})();
const aoMat=new THREE.ShaderMaterial({
  extensions:{ derivatives:true },
  uniforms:{
    tDepth:{value:rtScene.depthTexture},
    uProj:{value:new THREE.Matrix4()}, uProjInv:{value:new THREE.Matrix4()},
    uRes:{value:new THREE.Vector2(RW_, RH_)},
    uKernel:{value:AO_KERNEL},
    uRadius:{value:2.6}, uBias:{value:0.045}, uIntensity:{value:1.0}
  },
  vertexShader:FS_VERT,
  fragmentShader:`varying vec2 vUv;
    uniform sampler2D tDepth;
    uniform mat4 uProj, uProjInv;
    uniform vec2 uRes;
    uniform vec3 uKernel[14];
    uniform float uRadius, uBias, uIntensity;
    vec3 viewPos(vec2 uv, float d){
      vec4 c = uProjInv * vec4(uv*2.0-1.0, d*2.0-1.0, 1.0);
      return c.xyz / c.w;
    }
    float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    void main(){
      float d = texture2D(tDepth, vUv).x;
      if(d >= 0.99999){ gl_FragColor = vec4(1.0); return; }   // السماء لا تُحجب
      vec3 P = viewPos(vUv, d);
      vec3 N = normalize(cross(dFdx(P), dFdy(P)));
      float ang = hash12(vUv*uRes)*6.28318530718;
      float ca = cos(ang), sa = sin(ang);
      float occ = 0.0;
      for(int i=0;i<14;i++){
        vec3 k = uKernel[i];
        vec3 kr = vec3(k.x*ca - k.y*sa, k.x*sa + k.y*ca, k.z);
        if(dot(kr, N) < 0.0) kr = -kr;              // اقلبها إلى نصف الكرة حول المُسوّي
        vec3 sp = P + kr*uRadius;
        vec4 cp = uProj * vec4(sp, 1.0);
        vec2 suv = (cp.xy/cp.w)*0.5 + 0.5;
        if(suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
        float sd = texture2D(tDepth, suv).x;
        if(sd >= 0.99999) continue;
        vec3 sampleP = viewPos(suv, sd);
        // في فضاء العرض z سالب للأمام: أكبر يعني أقرب إلى الكاميرا فيحجب
        if(sampleP.z - sp.z > uBias){
          // فحص المدى: سطح بعيد جداً خلف الحافّة لا يُحسب حاجباً
          occ += smoothstep(0.0, 1.0, uRadius / max(0.001, abs(P.z - sampleP.z)));
        }
      }
      float ao = 1.0 - (occ/14.0)*uIntensity;
      gl_FragColor = vec4(vec3(clamp(ao, 0.0, 1.0)), 1.0);
    }`
});
const aoBlurMat=new THREE.ShaderMaterial({
  uniforms:{ tSrc:{value:null}, uTexel:{value:new THREE.Vector2(1/RW_, 1/RH_)}, uDir:{value:new THREE.Vector2(1,0)} },
  vertexShader:FS_VERT,
  fragmentShader:`varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uTexel, uDir;
    void main(){
      vec2 o = uDir*uTexel;
      float a = texture2D(tSrc, vUv).r * 0.2270270270;
      a += (texture2D(tSrc, vUv+o*1.3846153846).r + texture2D(tSrc, vUv-o*1.3846153846).r)*0.3162162162;
      a += (texture2D(tSrc, vUv+o*3.2307692308).r + texture2D(tSrc, vUv-o*3.2307692308).r)*0.0702702703;
      gl_FragColor = vec4(vec3(a), 1.0);
    }`
});
const gradeMat=new THREE.ShaderMaterial({
  uniforms:{
    tScene:{value:rtScene.texture}, tBloom:{value:rtBloomA.texture}, tAO:{value:rtAOB.texture},
    uAOStrength:{value:0.88},
    uExposure:{value:GRADE.exposure},
    uShadowTint:{value:GRADE.shadowTint}, uHighTint:{value:GRADE.highTint},
    uContrast:{value:GRADE.contrast}, uSat:{value:GRADE.saturation},
    uBloom:{value:GRADE.bloomIntensity}, uVignette:{value:GRADE.vignette}
  },
  vertexShader:FS_VERT,
  fragmentShader:`varying vec2 vUv;
    uniform sampler2D tScene, tBloom, tAO;
    uniform float uAOStrength;
    uniform vec3 uShadowTint, uHighTint;
    uniform float uExposure, uContrast, uSat, uBloom, uVignette;
    // ACES بصيغة Narkowicz المقرّبة
    vec3 aces(vec3 x){
      const float a=2.51, b=0.03, c=2.43, d=0.59, e=0.14;
      return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
    }
    void main(){
      vec3 col = texture2D(tScene, vUv).rgb;
      // الانحجاب يُطبَّق قبل التوهّج: الأركان والتقاءات الأرض تعتم فتُقرأ المجسّمات
      col *= mix(1.0, texture2D(tAO, vUv).r, uAOStrength);
      col += texture2D(tBloom, vUv).rgb * uBloom;
      col *= uExposure;
      // فصل دافئ/بارد: الظلّ يميل إلى الأزرق والإضاءة إلى الذهب
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col *= mix(uShadowTint, uHighTint, smoothstep(0.02, 0.55, l));
      // تباين حول محور متوسّط ثم إشباع
      col = max(vec3(0.0), (col - 0.18) * uContrast + 0.18);
      float g = dot(col, vec3(0.2126,0.7152,0.0722));
      col = max(vec3(0.0), mix(vec3(g), col, uSat));
      col = aces(col);
      // تعتيم الأطراف: يجمع العين على قلب اللقطة
      vec2 q = vUv - 0.5;
      col *= 1.0 - uVignette * dot(q,q) * 2.2;
      gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0/2.2)), 1.0);
    }`
});

function blit(mat, target){
  fsQuad.material=mat;
  renderer.setRenderTarget(target);
  renderer.render(fsScene, fsCam);
}

function render(){
  // اتجاه الشمس يغذّي توهّج السماء فيتّفق الأفق مع مصدر الضوء
  skyUniforms.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
  renderer.setRenderTarget(rtScene);
  renderer.clear();
  renderer.render(scene, camera);

  aoMat.uniforms.uProj.value.copy(camera.projectionMatrix);
  aoMat.uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
  blit(aoMat, rtAO);
  aoBlurMat.uniforms.tSrc.value = rtAO.texture;
  aoBlurMat.uniforms.uDir.value.set(1,0);
  blit(aoBlurMat, rtAOB);
  aoBlurMat.uniforms.tSrc.value = rtAOB.texture;
  aoBlurMat.uniforms.uDir.value.set(0,1);
  blit(aoBlurMat, rtAO);
  gradeMat.uniforms.tAO.value = rtAO.texture;

  brightMat.uniforms.tSrc.value = rtScene.texture;
  blit(brightMat, rtBloomA);
  blurMat.uniforms.tSrc.value = rtBloomA.texture;
  blurMat.uniforms.uDir.value.set(1,0);
  blit(blurMat, rtBloomB);
  blurMat.uniforms.tSrc.value = rtBloomB.texture;
  blurMat.uniforms.uDir.value.set(0,1);
  blit(blurMat, rtBloomA);

  gradeMat.uniforms.tBloom.value = rtBloomA.texture;
  blit(gradeMat, null);
}
window.__d = {
  shadows(on){ sun.castShadow=!!on; render(); return true; },
  terShadow(on){ terrain.castShadow=!!on; render(); return true; },
  sunAz(rad){ SUN_AZ=rad; SHOTS[LAST_SHOT](); render(); return true; },
  sunH(v){ SUN_H=v; SHOTS[LAST_SHOT](); render(); return true; },
  setBias(b, nb){ sun.shadow.bias=b; sun.shadow.normalBias=nb;
                  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map=null; }
                  render(); return true; },
  dbg(){ const c=sun.shadow.camera; return { cast:sun.castShadow,
    L:c.left, R:c.right, T:c.top, B:c.bottom, near:c.near, far:c.far,
    map:sun.shadow.mapSize.x, bias:sun.shadow.bias, nb:sun.shadow.normalBias,
    sunPos:[Math.round(sun.position.x),Math.round(sun.position.y),Math.round(sun.position.z)],
    tgt:[Math.round(sun.target.position.x),Math.round(sun.target.position.y),Math.round(sun.target.position.z)],
    smEnabled: renderer.shadowMap.enabled }; },
  setAO(v){ if(terShaderRef) terShaderRef.uniforms.uAOAmt.value=v; render(); return true; },
  setNrm(v){ if(terShaderRef) terShaderRef.uniforms.uNrmAmt.value=v; render(); return true; },
  shot(name){ LAST_SHOT=SHOTS[name]?name:'far'; SHOTS[LAST_SHOT](); render(); render(); return true; },
  info(){ return { N, basin: BOWL_AT ? [Math.round(BOWL_AT[0]), Math.round(BOWL_AT[1])] : null,
                   trees:treePool.length, rocks:rockPool.length, cliffs:cliffPool.length,
                   lake: LAKE?{r:Math.round(LAKE.r), level:+LAKE.level.toFixed(1)}:null,
                   river: RIVER?{pts:RIVER.pts.length, w:+RIVER.w.toFixed(1)}:null,
                   roads: routes.length, range:+(HIGH-LOW).toFixed(0) }; },
  ready(){ return ready; }
};
SHOTS.far(); render(); ready=true;
document.title='ready';
