/* لقطة قتال ليلي قريبة: أعداء قرب القلعة، سهام الحامية، ضربة القائد */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  await page.click('#ovBtn'); await page.waitForTimeout(300); await page.locator('#loStart').click(); await page.waitForTimeout(600);
  await page.locator('#startBtn').click(); await page.waitForTimeout(3600);
  await page.evaluate(()=>{ window.__d.night(true); window.__d.spawnAll(-6,-34,7); window.__d.hero(-4,-24); window.__d.cam(150,.35,-4,-28); });
  await page.waitForTimeout(2200);
  await page.screenshot({path:'s10_combat.png'}); console.log('shot combat', JSON.stringify(await page.evaluate(()=>window.__d.state())));
  await page.evaluate(()=>{ window.__d.cam(95,.6,-4,-30); }); await page.waitForTimeout(1200);
  await page.screenshot({path:'s10_close.png'}); console.log('shot close');
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
