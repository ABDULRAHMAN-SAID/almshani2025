/* تشخيص: هل يهاجم القائد أعداء مثبّتين قربه؟ قبل الهزيمة وبعد إعادة الليلة */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'t3dfast.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  await page.click('#ovBtn'); await page.waitForTimeout(300);
  const lo=page.locator('#loadout'); const perks=lo.locator('[data-p]'); for(let i=0;i<4;i++){ await perks.nth(i).click(); await page.waitForTimeout(80); }
  await lo.locator('[data-m]').first().click(); await lo.locator('[data-d="1"]').click(); await lo.locator('[data-eq="armor"][data-id="heavy"]').click();
  await page.locator('#loStart').click(); await page.waitForTimeout(500);
  console.log('loadout', JSON.stringify(await page.evaluate(()=>window.__d.lo())));
  const probe=async(tag)=>{ await page.evaluate(()=>window.__d.spawnAll(0,50,9)); await page.evaluate(()=>window.__d.hero(-4.5,55)); await page.waitForTimeout(3000);
    const r=await page.evaluate(()=>{ const es=window.__d.units.enemies(); const h=window.__d.heroInfo?window.__d.heroInfo():null; return {hurt:es.filter(e=>e.hp<e.max).length, nan:es.filter(e=>Number.isNaN(e.hp)).length, hp0:es[0]&&es[0].hp, n:es.length, e0:es[0]&&[Math.round(es[0].x),Math.round(es[0].z)], st:window.__d.state().st, hero:h}; });
    console.log(tag, JSON.stringify(r)); };
  await probe('before defeat:');
  // ابدأ ليلة كي تُلتقط لقطة الفجر (شرط إعادة الليلة) ثم اهزم
  await page.evaluate(()=>{ window.__d.set(0,400); }); await page.locator('#startBtn').click(); await page.waitForTimeout(1500);
  await page.evaluate(()=>window.__d.lose()); await page.waitForTimeout(300);
  await page.locator('#ovBtn').click(); await page.waitForTimeout(600);
  await probe('after retry:');
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
