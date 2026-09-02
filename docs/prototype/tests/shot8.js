/* عرض المجسمات: القائد على حصانه، وجهه، جندي، كل المباني */
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:300000});
  const save=async(name,fn)=>{ const url=await page.evaluate(fn); if(!url){ console.log('no image', name); return; } fs.writeFileSync(name, Buffer.from(url.split(',')[1],'base64')); console.log('saved', name); };
  await save('sc_hero.png', ()=>window.__d.showcase('hero'));
  await save('sc_face.png', ()=>window.__d.faceShot('hero'));
  await save('sc_soldier_face.png', ()=>window.__d.faceShot('soldier'));
  for(const k of ['cottage','farm','tower','fire','barracks','beacon']) await save('sc_'+k+'.png', new Function('return window.__d.showcase("'+k+'")'));
  await save('sc_grunt.png', ()=>window.__d.showcase('enemy:grunt'));
  console.log('ERRORS', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
