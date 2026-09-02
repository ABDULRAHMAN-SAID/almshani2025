const { chromium } = require('playwright');
const path=require('path');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  for(const [w,h,label] of [[1280,860,'desktop'],[844,390,'mobile']]){
    const ctx=await b.newContext({viewport:{width:w,height:h}, isMobile:label==='mobile', hasTouch:label==='mobile'});
    const page=await ctx.newPage();
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('file://'+path.resolve(__dirname,'t3d.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{}); await page.waitForSelector('#ovBtn',{timeout:240000});
    await page.waitForTimeout(3200);
    const t=await page.evaluate(()=>window.__d? window.__d.thumbs() : 'no-hook');
    const canvasOk=await page.evaluate(()=>{const c=document.getElementById('gl');return c.width>0&&c.height>0;});
    console.log(label, 'canvas', canvasOk, '| thumbs', JSON.stringify(t));
    console.log(label, 'errors:', errs.length?errs.join('|'):'none');
    await ctx.close();
  }
  await b.close();
})();
