/* لقطة تشخيصية: بنية العالم + منظر علوي */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  const t0=Date.now();
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  console.log('loaded in', Math.round((Date.now()-t0)/1000),'s');
  await page.click('#ovBtn'); await page.waitForTimeout(300); await page.locator('#loStart').click(); await page.waitForTimeout(900);
  console.log('river', JSON.stringify(await page.evaluate(()=>window.__d.river())));
  console.log('feats', JSON.stringify(await page.evaluate(()=>window.__d.feats())));
  console.log('info', JSON.stringify(await page.evaluate(()=>window.__d.info())));
  for(const [n,d,az] of [['t_close',170,.5],['t_mid',520,.2],['t_far',1150,.9],['t_top',1900,0]]){
    await page.evaluate(([d,az])=>window.__d.cam(d,az), [d,az]); await page.waitForTimeout(900);
    await page.screenshot({path:n+'.png'}); console.log('shot',n);
  }
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
