/* لقطات الخريطة العضوية: افتراضي، بعيد جداً، قريب — مع رصد الأخطاء */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  const t0=Date.now();
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  console.log('loaded in', Math.round((Date.now()-t0)/1000),'s | errors so far:', errors.length);
  await page.click('#ovBtn'); await page.waitForTimeout(300); await page.locator('#loStart').click(); await page.waitForTimeout(800);
  const info=await page.evaluate(()=>({...window.__d.info(), slots:window.__d.slots().length, walls:window.__d.walls().length}));
  console.log('info', JSON.stringify(info));
  await page.screenshot({path:'s6_default.png'}); console.log('shot default');
  await page.evaluate(()=>window.__d.cam(900)); await page.waitForTimeout(900);
  await page.screenshot({path:'s6_far.png'}); console.log('shot far');
  await page.evaluate(()=>window.__d.cam(1700)); await page.waitForTimeout(900);
  await page.screenshot({path:'s6_max.png'}); console.log('shot max');
  await page.evaluate(()=>window.__d.cam(150, .6, 60, -80)); await page.waitForTimeout(900);
  await page.screenshot({path:'s6_close.png'}); console.log('shot close');
  await page.evaluate(()=>window.__d.cam(330,0,0,0));
  await page.locator('#startBtn').click(); await page.waitForTimeout(14000);
  await page.screenshot({path:'s6_night.png'}); console.log('shot night', JSON.stringify(await page.evaluate(()=>window.__d.state())));
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
