/* الجسر: ارتفاعات الأرض والسطح عند العبور + منظر قريب للجسر ليلاً بأعداء عليه */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+path.resolve(__dirname,'t3dfast.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  await page.click('#ovBtn'); await page.waitForTimeout(300); await page.locator('#loStart').click(); await page.waitForTimeout(500);
  const b=await page.evaluate(()=>window.__d.bridge ? window.__d.bridge() : null); console.log('bridge', JSON.stringify(b));
  if(b){ await page.evaluate(([x,z])=>window.__d.cam(150,.4,x,z),[b.x,b.z]); await page.locator('#startBtn').click(); await page.waitForTimeout(18000);
    await page.screenshot({path:'s10_bridge.png'}); console.log('shot bridge', JSON.stringify(await page.evaluate(()=>window.__d.state()))); }
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
