const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage({ viewport:{width:1280,height:720} });
  p.on('pageerror', e=>console.log('PAGEERROR', e.message));
  p.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE', m.text().slice(0,300)); });
  await p.goto('file://'+__dirname+'/upv.html', { waitUntil:'load', timeout:180000 });
  try { await p.waitForFunction(()=>window.__d && window.__d.ready && window.__d.ready(), {timeout:900000}); }
  catch(e){ console.log('NOT READY', await p.title(), (await p.evaluate(()=>window.__err||[])).slice(0,4)); await b.close(); process.exit(1); }
  await p.evaluate(()=>window.__d.shot('combat'));
  const us = [0.0, 0.22, 0.40, 0.52, 0.70, 1.0];
  for (let i=0;i<us.length;i++){
    await p.evaluate(u=>window.__d.setAct(u), us[i]);
    await p.screenshot({ timeout:120000, path: __dirname+'/act'+i+'.png' });
    console.log('u='+us[i]);
  }
  console.log('done');
  await b.close();
})();
