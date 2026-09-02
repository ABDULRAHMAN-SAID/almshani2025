const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:900,height:600} });
  page.on('pageerror',e=>console.log('PAGEERROR:', e.message, '\n', (e.stack||'').split('\n').slice(0,6).join('\n')));
  page.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE:', m.text().slice(0,300)); });
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'));
  await page.waitForTimeout(6000);
  await browser.close();
})();
