const { chromium, devices } = require('playwright');
const path=require('path');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({ viewport:{width:844,height:390}, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
  const page=await ctx.newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{}); await page.waitForSelector('#ovBtn',{timeout:240000});
  await page.waitForTimeout(3000);
  await page.screenshot({path:'m1-intro.png'});
  await page.tap('#ovBtn'); await page.waitForTimeout(700); if(await page.locator('#loStart').count()){ await page.locator('#loStart').tap(); await page.waitForTimeout(400); }
  await page.screenshot({path:'m2-dawn.png'});
  // اختر عقدة والمس بطاقة
  const l=await page.evaluate(()=>window.__d.slots());
  const box=await page.locator('#gl').boundingBox();
  await page.touchscreen.tap(box.x+l[0].x, box.y+l[0].y);
  await page.waitForTimeout(500);
  await page.screenshot({path:'m3-sheet.png'});
  const card=page.locator('#dockCards .bcard').first();
  if(await card.count()){ await card.click(); await page.waitForTimeout(500); }
  await page.screenshot({path:'m4-ghost.png'});
  const st=await page.evaluate(()=>window.__d.state());
  console.log('mobile state', JSON.stringify(st));
  console.log('joystick visible:', await page.evaluate(()=>!document.getElementById('joy').hidden));
  console.log('errors:', errs.length?errs.join('|'):'none');
  await b.close();
})();
