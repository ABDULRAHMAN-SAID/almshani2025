const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage({ viewport:{width:1280,height:720} });
  p.on('pageerror', e=>console.log('PAGEERROR', e.message));
  p.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE', m.text().slice(0,400)); });
  await p.goto('file://'+__dirname+'/upv.html', { waitUntil:'load', timeout:180000 });
  try { await p.waitForFunction(()=>window.__d && window.__d.ready && window.__d.ready(), {timeout:900000}); }
  catch(e){ console.log('NOT READY', await p.title(), (await p.evaluate(()=>window.__err||[])).slice(0,4)); await b.close(); process.exit(1); }
  await p.evaluate(()=>window.__d.shot('stride'));
  const frames = [0, 0.28, 0.56, 0.84, 1.12, 1.40];
  for (let i=0;i<frames.length;i++){
    await p.evaluate(t=>window.__d.setTime(t), frames[i]);
    await p.screenshot({ timeout:120000, path: __dirname+'/an'+i+'.png' });
    console.log('frame', i, 't='+frames[i]);
  }
  await p.evaluate(()=>window.__d.shot('army'));
  await p.evaluate(t=>window.__d.setTime(t), 3.2);
  await p.screenshot({ timeout:120000, path: __dirname+'/upv_army.png' });
  await p.evaluate(()=>window.__d.shot('hero2'));
  await p.evaluate(t=>window.__d.setTime(t), 3.2);
  await p.screenshot({ timeout:120000, path: __dirname+'/upv_hero2.png' });
  console.log('done');
  await b.close();
})();
