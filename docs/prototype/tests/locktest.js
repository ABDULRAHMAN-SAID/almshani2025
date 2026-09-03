/* اختبار قفل الهدف: ضغط مطوّل على عدو بعيد أثناء القتال */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  const tap=async sel=>{ await page.waitForSelector(sel,{timeout:180000,state:'attached'});
    await page.evaluate(q=>{ const e=document.querySelector(q); if(e) e.click(); }, sel); await page.waitForTimeout(250); };
  await page.waitForSelector('#ovBtn',{timeout:240000});
  await tap('#ovBtn'); await page.waitForTimeout(300);
  await tap('#loStart'); await page.waitForTimeout(300);
  await tap('#startBtn'); await page.waitForTimeout(200);
  for(let i=0;i<40;i++){ await page.waitForTimeout(200); if((await page.evaluate(()=>window.__d.state())).st==='COMBAT') break; }
  await page.evaluate(()=>window.__d.spawnAll(0,-70,5)); await page.waitForTimeout(100);
  const b=await page.locator('#gl').boundingBox();
  const n=await page.evaluate(()=>window.__d.near());
  console.log('state', JSON.stringify(await page.evaluate(()=>window.__d.state())), 'near', JSON.stringify(n));
  await page.mouse.move(b.x+n.x,b.y+n.y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(100);
  console.log('locked:', await page.evaluate(()=>window.__d.lock()));
  // إلغاء بالضغط مرة أخرى على نفس العدو
  const n2=await page.evaluate(()=>window.__d.near());
  await page.mouse.move(b.x+n2.x,b.y+n2.y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(100);
  console.log('after second press (toggle off):', await page.evaluate(()=>window.__d.lock()));
  // أمر نقطة لا يقفل هدفاً
  await page.mouse.move(b.x+n2.x,b.y+n2.y); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(100);
  console.log('re-locked:', await page.evaluate(()=>window.__d.lock()));
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
