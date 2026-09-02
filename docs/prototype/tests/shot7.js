/* لقطات: القائد على حصانه قريباً، نجع مبانٍ، نظرة الخريطة */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  await page.click('#ovBtn'); await page.waitForTimeout(300); await page.locator('#loStart').click(); await page.waitForTimeout(800);
  console.log('errors after boot:', errors.length);
  await page.evaluate(()=>{ window.__d.hero(0,40); window.__d.cam(78, .5, 0, 40); }); await page.waitForTimeout(900);
  await page.screenshot({path:'s7_hero.png'}); console.log('shot hero');
  // ابنِ عدة مبانٍ برمجياً عبر العقد ثم صوّر النجع
  await page.evaluate(()=>window.__d.set(0,2000));
  const slots=await page.evaluate(()=>window.__d.slots()); const b=await page.locator('#gl').boundingBox();
  await page.evaluate(()=>window.__d.cam(400,0,0,0)); await page.waitForTimeout(500);
  const plan=[['econ','كوخ'],['econ','مزرعة'],['def','برج رماة'],['mil','ثكنة'],['special','منارة'],['def','برج نار']];
  for(const [k,label] of plan){
    const l=(await page.evaluate(()=>window.__d.slots())).filter(s=>s.kind===k && !s.taken);
    let done=false;
    for(const p of l){ const on=await page.evaluate(([x,y])=>{ const el=document.elementFromPoint(x,y); return !!el&&el.id==='gl'; },[b.x+p.x,b.y+p.y]); if(!on) continue;
      await page.mouse.click(b.x+p.x,b.y+p.y); await page.waitForTimeout(250);
      const c=page.locator('#dockCards .bcard',{hasText:label}).first();
      if(await c.count() && !(await c.isDisabled())){ await c.click(); await page.waitForTimeout(200); const ok=page.locator('#dockCards button.primary').first(); if(await ok.count()&&!(await ok.isDisabled())){ await ok.click(); await page.waitForTimeout(200); done=true; } }
      if(done) break; }
    console.log('build', label, done);
  }
  const st=await page.evaluate(()=>window.__d.state()); console.log('state', JSON.stringify(st));
  const bl=await page.evaluate(()=>window.__d.units? null: null);
  await page.evaluate(()=>window.__d.cam(160, .7, 40, 60)); await page.waitForTimeout(900);
  await page.screenshot({path:'s7_buildings.png'}); console.log('shot buildings');
  await page.evaluate(()=>window.__d.cam(400,0,0,0)); await page.waitForTimeout(900);
  await page.screenshot({path:'s7_default.png'}); console.log('shot default');
  await page.evaluate(()=>window.__d.cam(2400,0,0,0)); await page.waitForTimeout(900);
  await page.screenshot({path:'s7_max.png'}); console.log('shot max');
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
