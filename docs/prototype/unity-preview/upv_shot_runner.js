const { chromium } = require('playwright');
(async () => {
  const shots = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: ' + m.text().slice(0,220)); });
  await page.goto('file://' + __dirname + '/upv.html', { waitUntil: 'load', timeout: 180000 });
  try {
    await page.waitForFunction(() => window.__d && window.__d.ready && window.__d.ready(), { timeout: 900000 });
  } catch (e) {
    console.log('NOT READY. title=', await page.title());
    console.log('errors:', (await page.evaluate(()=>window.__err||[])).slice(0,6), errs.slice(0,6));
    await browser.close(); process.exit(1);
  }
  console.log('info', JSON.stringify(await page.evaluate(() => window.__d.info())));
  for (const s of shots) {
    const t0 = Date.now();
    await page.evaluate(n => window.__d.shot(n), s);
    await page.screenshot({ timeout: 120000, path: __dirname + '/upv_' + s + '.png' });
    console.log('shot', s, ((Date.now()-t0)/1000).toFixed(1) + 's');
  }
  if (errs.length) console.log('ERRORS:', errs.slice(0,8)); else console.log('ERRORS: none');
  await browser.close();
})();
