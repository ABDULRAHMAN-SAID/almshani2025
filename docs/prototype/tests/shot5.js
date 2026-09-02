/* لقطات الواجهات الجديدة: التجهيز، اللوحة الجانبية، عنوان الليلة، الإيقاف، الحملة، نظرة الخريطة */
const { chromium } = require('playwright'); const path=require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:240000});
  await page.click('#ovBtn'); await page.waitForTimeout(500);
  await page.screenshot({path:'s5_loadout.png'}); console.log('shot loadout');
  await page.locator('#loStart').click(); await page.waitForTimeout(600);
  const slots=await page.evaluate(()=>window.__d.slots()); const b=await page.locator('#gl').boundingBox();
  const d=slots.find(s=>s.kind==='def'); await page.mouse.click(b.x+d.x,b.y+d.y); await page.waitForTimeout(300);
  await page.locator('#dockCards .bcard',{hasText:'برج رماة'}).first().click(); await page.waitForTimeout(500);
  await page.screenshot({path:'s5_build.png'}); console.log('shot build');
  await page.locator('#dockCards button.primary').first().click(); await page.waitForTimeout(300);
  if(await page.locator('#sheetClose').isVisible()){ await page.locator('#sheetClose').click(); await page.waitForTimeout(200); }
  await page.click('#pauseBtn'); await page.waitForTimeout(300);
  await page.locator('#pausePanel [data-tab="wave"]').click(); await page.waitForTimeout(300);
  await page.screenshot({path:'s5_pause.png'}); console.log('shot pause');
  await page.locator('#pResume').click(); await page.waitForTimeout(200);
  await page.click('#campBtn'); await page.waitForTimeout(300);
  await page.screenshot({path:'s5_campaign.png'}); console.log('shot campaign');
  await page.locator('#cpClose').click(); await page.waitForTimeout(200);
  await page.click('#zoomBtn'); await page.waitForTimeout(900);
  await page.screenshot({path:'s5_far.png'}); console.log('shot far');
  await page.click('#zoomBtn'); await page.click('#zoomBtn'); await page.waitForTimeout(600);
  await page.locator('#startBtn').click(); await page.waitForTimeout(900);
  await page.screenshot({path:'s5_night.png'}); console.log('shot night title');
  await page.waitForTimeout(6000);
  await page.screenshot({path:'s5_combat.png'}); console.log('shot combat');
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
