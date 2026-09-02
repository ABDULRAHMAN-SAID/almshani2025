/* ليلة الزعيم بتشكيلة محددة على البنية الجديدة (عقد مصنّفة + مستويات القلعة): node bossfast2.js <ذهب> <مبانٍ> <أسوار> */
const { chromium } = require('playwright'); const path=require('path');
const SILVER=process.argv[2]?+process.argv[2]:600, NB=process.argv[3]?+process.argv[3]:8, NW=process.argv[4]?+process.argv[4]:2;
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: process.env.TURBO?{width:720,height:420}:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname, process.env.TURBO?'t3dturbo.html':'t3dfast.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:240000});
  await page.click('#ovBtn'); await page.waitForTimeout(300); if(await page.locator('#loStart').count()){ await page.locator('#loStart').click(); await page.waitForTimeout(300); }
  await page.evaluate(s=>{ window.__d.set(5,s); }, SILVER);
  const glBox = async ()=>await page.locator('#gl').boundingBox();
  const st = ()=>page.evaluate(()=>window.__d.state());
  const click = async p=>{ const b=await glBox(); await page.mouse.click(b.x+p.x,b.y+p.y); await page.waitForTimeout(90); };
  // هل النقطة على الساحة فعلاً (لا تحت لوحة أو شريط)؟
  const onCanvas = async p=>{ const b=await glBox(); return page.evaluate(([x,y])=>{ const el=document.elementFromPoint(x,y); return !!el && el.id==='gl'; }, [b.x+p.x, b.y+p.y]); };
  const firstFree = async list=>{ for(const p of list) if(await onCanvas(p)) return p; return null; };
  const card = async label=>{ const c=page.locator('#dockCards .bcard',{hasText:label}).first();
    if(await c.count() && !(await c.isDisabled())){ await c.click(); await page.waitForTimeout(120);
      const ok=page.locator('#dockCards button.primary').first();
      if(await ok.count() && !(await ok.isDisabled())){ await ok.click(); await page.waitForTimeout(90); return true; } }
    return false; };
  const tryBuild = async (kind,label)=>{
    const l=(await page.evaluate(()=>window.__d.slots())).filter(s=>s.kind===kind && !s.taken);
    const p=await firstFree(l);
    if(!p){ console.log('   (no reachable free slot of kind '+kind+')'); return false; } await click(p); return card(label); };
  const upgrade = async ()=>{ const c=(await page.evaluate(()=>window.__d.slots())).find(s=>s.kind==='castle'); await click(c);
    const b=page.locator('#dockCards .bcard',{hasText:'ترقية'}).first(); if(await b.count() && !(await b.isDisabled())){ await b.click(); await page.waitForTimeout(150); return true; } return false; };
  // خطة: برج، كوخ، برج، (قلعة 2) ثكنة، كوخ، منارة، برج، (قلعة 3) برج نار، ثكنة، برج، مزرعة، برج
  const PLAN=[['def','برج رماة'],['econ','كوخ'],['def','برج رماة'],['up'],['mil','ثكنة'],['econ','كوخ'],['special','منارة'],['def','برج رماة'],['up'],['def','برج نار'],['mil','ثكنة'],['def','برج رماة'],['econ','مزرعة'],['def','برج رماة'],['special','كوخ']];
  let built=0;
  for(const p of PLAN){ if(built>=NB) break; let ok; if(p[0]==='up'){ ok=await upgrade(); } else { ok=await tryBuild(p[0],p[1]); if(ok) built++; }
    const s0=await st(); console.log(`  ${p.join('/')} → ${ok} | builds ${s0.builds} walls ${s0.walls} lv ${s0.lv} silver ${s0.silver} sel ${await page.evaluate(()=>window.__d.sel())}`); }
  const walls=await page.evaluate(()=>window.__d.walls());
  const gates=walls.map((w,i)=>w.gate?i:-1).filter(i=>i>=0);
  let nw=0; for(const gi of gates){ if(nw>=NW) break; if(!(await onCanvas(walls[gi]))) continue; await click(walls[gi]); if(await card('سور')) nw++; }
  const before=await st();
  console.log(`[بناء] مبانٍ ${before.builds} أسوار ${before.walls} قلعة L${before.lv} فضة ${before.silver}`);
  const sc=page.locator('#sheetClose'); if(await sc.isVisible().catch(()=>false)) await sc.click();
  await page.locator('#startBtn').click({timeout:120000});
  let out=null; const t0=Date.now();
  for(let t=0;t<400;t++){
    await page.waitForTimeout(200);
    if(t%2===0){ const near = await page.evaluate(()=>window.__d.near());
      if(near){ const b=await glBox(); await page.mouse.click(b.x+near.x,b.y+near.y); } }
    const s=await st();
    if(t%30===0) console.log(`  t+${Math.round((Date.now()-t0)/1000)}s ${s.st} n=${s.n} q=${s.q} castle=${s.castle} builds=${s.builds}`);
    if(s.overlay){ out=s.head; break; }
    if(s.st==='BUILD' && s.wave>=6){ out='dawn'; break; }
    if(Date.now()-t0>540000){ out='TIMEOUT'; break; }
  }
  const s=await st();
  console.log(`ليلة الزعيم: ${out||'TIMEOUT'} | حصن ${before.castle}→${s.castle} | مبانٍ ${s.builds} أسوار ${s.walls} | ${Math.round((Date.now()-t0)/1000)}ث`);
  console.log('ERRORS:', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
