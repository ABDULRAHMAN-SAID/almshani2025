const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:960,height:600} });
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message+' '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+path.resolve(__dirname,'t3dfast.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:240000});
  await page.click('#ovBtn',{timeout:120000}); await page.waitForTimeout(300);
  const st=()=>page.evaluate(()=>window.__d.state());
  const glBox=async()=>await page.locator('#gl').boundingBox();
  const click=async p=>{ const b=await glBox(); await page.mouse.click(b.x+p.x,b.y+p.y); await page.waitForTimeout(150); };
  console.log('after intro:', JSON.stringify(await st()));
  const slots=await page.evaluate(()=>window.__d.slots());
  console.log('node kinds:', slots.map(s=>s.kind).join(','));
  const pick=(k)=>slots.findIndex(s=>s.kind===k);
  // عقدة زراعية: يجب أن تعرض كوخ (مفتوح) ومزرعة (مقفلة ليلة 2)
  await click(slots[pick('econ')]);
  console.log('econ cards:', await page.locator('#dockCards .bcard').allTextContents());
  // عقدة حجرية: برج رماة متاح، برج نار مقفل
  await click(slots[pick('def')]);
  console.log('def cards:', await page.locator('#dockCards .bcard').allTextContents());
  let card=page.locator('#dockCards .bcard',{hasText:'برج رماة'}).first(); await card.click(); await page.waitForTimeout(200);
  await page.locator('#dockCards button.primary').first().click(); await page.waitForTimeout(150);
  // القلعة
  await click(slots[pick('castle')]);
  console.log('castle cards:', await page.locator('#dockCards .bcard').allTextContents());
  await page.evaluate(()=>{ G.silver=400; }).catch(()=>{});
  await page.evaluate(()=>window.__d.set(0,400));
  await click(slots[pick('castle')]);
  card=page.locator('#dockCards .bcard',{hasText:'ترقية'}).first(); if(await card.count()){ await card.click(); await page.waitForTimeout(150); }
  console.log('after castle upgrade:', JSON.stringify(await st()));
  console.log('waveInfo:', (await page.locator('#waveInfo').innerText()).replace(/\s+/g,' '));
  await page.locator('#sheetClose').click(); await page.waitForTimeout(200);
  await page.locator('#startBtn').click({timeout:60000}); await page.waitForTimeout(300);
  console.log('night start:', JSON.stringify(await st()), 'title visible:', await page.locator('#nightTitle.show').count());
  let out=null;
  for(let t=0;t<300;t++){
    await page.waitForTimeout(200);
    const n=await page.evaluate(()=>window.__d.near()); if(n){ const b=await glBox(); await page.mouse.click(b.x+n.x,b.y+n.y); }
    const s=await st();
    if(t===15) console.log('combat:', JSON.stringify(s));
    if(s.overlay){ out=s.head; console.log('overlay:', s.head, '|', (await page.locator('#overlayCard').innerText()).replace(/\s+/g,' ').slice(0,200)); break; }
  }
  await page.locator('#ovBtn').click(); await page.waitForTimeout(300);
  console.log('after report:', JSON.stringify(await st()));
  console.log('ERRORS:', errors.length?errors.join('\n'):'none');
  await browser.close();
})();
