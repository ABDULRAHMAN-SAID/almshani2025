/* اختبار تكاملي: مقدمة → تجهيز → بناء → إيقاف/إعدادات → تكبير → ليلة (قفل هدف) → تقرير → حفظ → حملة → هزيمة → إعادة الليلة */
const { chromium } = require('playwright');
const path = require('path');
const out=[]; const say=(...a)=>{ const s=a.join(' '); out.push(s); console.log(s); };
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1100,height:640} });
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message+' @ '+(e.stack||'').split('\n')[1]));
  await page.goto('file://'+path.resolve(__dirname,'t3dfast.html'),{waitUntil:'commit',timeout:60000}).catch(()=>{});
  await page.waitForSelector('#ovBtn',{timeout:240000});
  const st=()=>page.evaluate(()=>window.__d.state());
  const glBox=async()=>await page.locator('#gl').boundingBox();
  const tap=async sel=>{ await page.waitForSelector(sel,{timeout:180000, state:'attached'});
    await page.evaluate(s=>{ const e=document.querySelector(s); if(e) e.click(); }, sel); await page.waitForTimeout(200); };
  const tapN=async (sel,n)=>{ await page.waitForSelector(sel,{timeout:180000, state:'attached'});
    await page.evaluate(([s,i])=>{ const l=document.querySelectorAll(s); if(l[i]) l[i].click(); }, [sel,n]); await page.waitForTimeout(200); };
  const tapText=async (sel,txt)=>{ await page.waitForSelector(sel,{timeout:180000, state:'attached'});
    await page.evaluate(([s,t])=>{ for(const e of document.querySelectorAll(s)) if((e.textContent||'').includes(t)){ e.click(); return; } }, [sel,txt]); await page.waitForTimeout(200); };
  const click=async p=>{ const b=await glBox(); await page.mouse.click(b.x+p.x,b.y+p.y); await page.waitForTimeout(160); };
  await tap('#ovBtn'); await page.waitForTimeout(400);
  // ── التجهيز ──
  const lo=page.locator('#loadout');
  say('loadout visible:', await lo.isVisible(), '| weapons:', await lo.locator('[data-w]').count(), 'perks:', await lo.locator('[data-p]').count(), 'mutators:', await lo.locator('[data-m]').count(), 'equip:', await lo.locator('[data-eq]').count());
  const wps=await lo.locator('[data-w]:not([disabled])').count(); say('unlocked weapons:', wps);
  for(let i=0;i<4;i++) await tapN('#loadout [data-p]', i);
  await tapN('#loadout [data-m]',0);
  await tap('#loadout [data-d="1"]');
  await tap('#loadout [data-eq="armor"][data-id="heavy"]');
  await tap('#loStart'); await page.waitForTimeout(400);
  const lodat=await page.evaluate(()=>window.__d.lo());
  say('after start:', (await st()).st, '| loadout:', JSON.stringify(lodat), '| loadout hidden:', await lo.isHidden());
  // ── بناء ──
  const slots=await page.evaluate(()=>window.__d.slots());
  const pick=k=>slots.find(s=>s.kind===k);
  await click(pick('def')); await tapText('#dockCards .bcard','برج رماة');
  await tapN('#dockCards button.primary',0);
  await click(pick('econ')); await tapText('#dockCards .bcard','كوخ');
  await tapN('#dockCards button.primary',0);
  await page.evaluate(()=>window.__d.set(0,400));
  await click(pick('castle')); await tapText('#dockCards .bcard','ترقية');
  say('built:', JSON.stringify(await st()));
  await tap('#sheetClose');
  // ── الإيقاف ──
  await tap('#pauseBtn'); await page.waitForTimeout(250);
  say('paused:', await page.evaluate(()=>window.__d.paused()), '| panel visible:', await page.locator('#pausePanel').isVisible());
  for(const t of ['units','towers','set','wave']){ await tap(`#pausePanel [data-tab="${t}"]`); say('tab', t, ':', (await page.locator('#pausePanel .pb').innerText()).replace(/\s+/g,' ').slice(0,110)); }
  await tap('#pausePanel [data-tab="set"]');
  await tap('#pausePanel [data-set="dmgNums"]');
  say('dk_set:', await page.evaluate(()=>localStorage.getItem('dk_set')));
  await tap('#pResume');
  say('resumed:', await page.evaluate(()=>window.__d.paused())===false);
  // ── التكبير ──
  const zs=[]; for(let i=0;i<3;i++){ await tap('#zoomBtn'); zs.push((await page.evaluate(()=>window.__d.info())).camDist); }
  say('zoom presets:', zs.join(','));
  // ── الليل ──
  say('waveInfo:', (await page.locator('#waveInfo').innerText()).replace(/\s+/g,' '));
  await tap('#startBtn'); await page.waitForTimeout(250);
  say('night start:', (await st()).st, '| title:', (await page.locator('#nightTitle').innerText()).replace(/\s+/g,' '));
  let locked=false, combatSeen=false, lockTries=0;
  for(let t=0;t<1100;t++){
    await page.waitForTimeout(200);
    const s=await st();
    if(t%60===0) say('  night progress t='+t, 'n='+s.n, 'q='+s.q, 'castle='+s.castle, 'builds='+s.builds);
    if(s.st==='COMBAT' && !combatSeen){ combatSeen=true; say('combat:', JSON.stringify(s)); }
    const n=await page.evaluate(()=>window.__d.near());
    if(n){ const b=await glBox();
      if(!locked && s.n>3 && lockTries<3){ lockTries++; await page.mouse.move(b.x+n.x,b.y+n.y); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); await page.waitForTimeout(100);
        locked=await page.evaluate(()=>window.__d.lock()); say('lock after long press:', locked); }
      else { await page.mouse.click(b.x+n.x,b.y+n.y); }
    }
    if(s.overlay){ say('overlay:', s.head, '|', (await page.locator('#overlayCard').innerText()).replace(/\s+/g,' ').slice(0,160)); break; }
  }
  await tap('#ovBtn'); await page.waitForTimeout(300);
  say('after report:', JSON.stringify(await st()), '| save exists:', await page.evaluate(()=>!!localStorage.getItem('dk_save')));
  // ── الحملة ──
  await tap('#campBtn'); await page.waitForTimeout(250);
  say('campaign maps:', await page.locator('#campaign [data-map]').count(), '| enabled:', await page.locator('#campaign [data-map]:not([disabled])').count());
  await page.locator('#cpClose').click(); await page.waitForTimeout(100);
  // ── الهزيمة وإعادة الليلة ──
  const before=await st();
  await page.evaluate(()=>window.__d.lose()); await page.waitForTimeout(300);
  say('defeat:', (await st()).head, '| buttons:', (await page.locator('#overlayCard button').allTextContents()).join(' / '), '| retry enabled:', !(await page.locator('#ovBtn').isDisabled()));
  await tap('#ovBtn'); await page.waitForTimeout(500);
  const after=await st();
  say('after retry:', JSON.stringify(after), '| builds kept:', after.builds===before.builds, '| wave rewound:', after.wave, '(before', before.wave+')');
  // ── تغيير السلاح وإطلاق القدرة ──
  await page.evaluate(()=>window.__d.spawnAll(0,50,9)); await page.evaluate(()=>window.__d.hero(-4.5,55)); await page.waitForTimeout(4000);
  // القائد بسلاح +35% يقتل الغازي بضربة واحدة، فنعدّ المقتولين مع المصابين
  const hurtN=await page.evaluate(()=>{ const es=window.__d.units.enemies(); return es.filter(e=>e.hp<e.max).length + (9-es.length); });
  await page.click('#abil1'); await page.waitForTimeout(200);
  say('enemies hurt/killed by hero:', hurtN, '| ability name:', await page.locator('#abil1 b').innerText());
  say('ERRORS:', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{ console.log('FATAL', e.message.split('\n')[0]); process.exit(1); });
