# واجهة الوحدات — «مملكة الرماد» (Three.js r128، ملف واحد)

اللعبة كلها داخل IIFE واحد في `dk3d.core.html` (لا تعدّله). كل وحدة ملف JS مستقل (`m_weapons.js` / `m_units.js` / `m_ui.js`) يُدرَج نصّه مكان العلامة `/*@@MODULES@@*/` قبل قسم الإقلاع، بواسطة:

```
python3 assemble.py && python3 mktests.py && node --check game3d.js
```

- `assemble.py` يقرأ `dk3d.core.html` + الوحدات الموجودة ويكتب `dawnkeep3d.html`.
- `mktests.py` يولّد `t3d.html` (Three محلي + خطاف `window.__d`) و`t3dfast.html` (محاكاة ×6 أسرع، ظلال أصغر) و`game3d.js` للفحص النحوي.
- الوحدة كود عادي داخل نطاق الـIIFE: تصريحات `function`/`const` على المستوى الأعلى تُرفع وتُرى من كل مكان. **لا** تستخدم `import`/`export`/`window.`.
- كل النصوص العربية RTL. لا أصول خارجية؛ كل الرسوم بالكود (Three.js أشكال أولية أو Canvas 2D). لا مكتبات إضافية.
- الهاتف أولاً: أهداف لمس ≥ 44px، لا تخصيص ذاكرة داخل حلقات الإطار (لا `new`/LINQ داخل `update`)، ولا قوائم مزدحمة أثناء القتال.

## ما هو موجود في النواة (استخدمه)

الحالة: `G` (`G.state` ∈ INTRO/BUILD/NIGHT_START/COMBAT/DAWN_REPORT/VICTORY/DEFEAT، `G.phase` "dawn"/"night"، `G.hero {x,z,hp,max,sp,dir,dead,ab,ab2,atkCd,swing,moving}`، `G.enemies[]` `{t,x,z,hp,max,sp,dmg,r,armor,stun,flash,burn,obj,tgt,phase}`، `G.soldiers[]` `{home,x,z,hp,max,dmg,sp,atk,dead,i,obj,moving,swing}`، `G.buildings[]` `{type,lv,branch,x,z,hp,max,slot,obj}`، `G.walls[]`، `G.silver`، `G.wave`، `G.stage`، `G.castleHp/castleMax/castleLv`، `G.order` ("follow"/"hold"/"guard")، `G.holdAt`، `G.lock` (هدف مقفول — اختياري)، `G.paused`، `G.night {enemies,kills,gold,income,lost,units}`، `G.stat {kills,built,bosses,gold,nightsT}`، `G.keys` Set، `G.joy` `{x,y}|null`، `G.cam {tx,tz}`، `G.t` زمن اللعبة).

البيانات: `STAGES[]` (خرائط: id/name/nights/lanes/boss/accent/nodes)، `B` (مبانٍ: name/cat/nodes/unlock/castle/cost/hp/d/branches)، `WALL`، `E` (أعداء: n/hp/sp/dmg/r/armor/prio/gold/wv/boss/fly/ranged/sieger/phases)، `WAVES`، `BOONS`، `CASTLE_LV`، `NODE_KINDS`، `DIFFS`.
جداول فارغة تملؤها الوحدات: `WEAPONS`, `PERKS`, `MUTATORS`, `UNITS`. التجهيز: `LOADOUT {weapon,perks[],mutators[],diff}`، والدالة `applyLoadout()` تعيد حساب `MOD` من البركات/المعدِّلات/الصعوبة ثم تستدعي `onLoadoutApplied()` إن وُجدت.
`MOD` (تقرؤه الأنظمة): `income, towerDmg, towerRange, heroDmg, unitDmg, unitSpeed, wallHp, dawnHeal, enemyHp, enemyDmg, enemySpeed, waveMul, noWalls, score`.
`SET` (إعدادات محفوظة في localStorage عبر `saveSet()`): `dmgNums, ranges, hpBars, shake, motion, quality, shadows, cb, autoTarget`. النواة تحترم `ranges/hpBars/shake` بالفعل.

الخطّافات (`HOOKS.<x>.push(fn)`): `kill(e)`, `dawn()`, `nightStart()`, `tick(dt)` (كل إطار داخل update)، `draw(ctx)` (Canvas 2D فوق المشهد، بعد رسم النواة)، `hurt(e,realDmg)`، `longPress(groundPoint|null, event)` (ضغط 480ms بلا سحب)، `build(building)`.
نقاط استبدال (عرّف الدالة فتُستخدم بدل الافتراضي): `heroCombat(h,dt)` (هجوم القائد الآلي — بديل كامل)، `weaponActive(h)` (زر «نداء» = القدرة النشطة للسلاح)، `unitStats(b)` (يعيد `{n,hp,dmg,sp,...}` للثكنة `b`)، `soldierBehavior(s,dt,h)` (يعيد true إن تولّى الجندي كاملاً: حركة، هجوم، وضع `s.obj.position`، `poseRig`)، `renderOrders(containerEl)` (يبني أزرار الأوامر في `#orderRow`)، `openPause()` (زر ⏸)، `openLoadout()` (بعد شاشة المقدمة؛ يجب أن تنتهي بـ `applyLoadout(); setState("BUILD"); refresh(); sync();`).

أدوات: `dist2(x1,z1,x2,z2)`، `clamp`، `rnd(a,b)`، `keepIn(obj)`، `terrainY(x,z)`، `project(x,y,z)→{x,y,vis}` (كائن مشترك — انسخ القيم)، `hurt(e,dm)`، `poof(x,z,colorHex,n)`، `dropGold(x,z,n)`، `log(msg)` (سطر الحالة)، `SFX.{shoot,hit,build,night,dawn,ability,die,boss,lose}` و`tone(freq,dur,type,vol,slide)`، `showOverlay({title,body,btn,after,choices,list})` (بطاقة مركزية، `after` يُستدعى بعد الزر)، `refresh()` (يعيد بناء لوحة البناء والأوامر)، `sync()` (HUD)، `setState(s)`، `mat(hex,opts)`, `part(geo,mat,x,y,z,sx,sy,sz,rx,ry,rz)`, `geo.{box,cyl,cone8,sph,sphLow,ico,torus,plane}`, `RG.{oct,half,shield,dome,bow}`, `CAP`, `makeRig(opts)`/`poseRig(obj,t,moving,atk)`/`mkHumanoid(kind)`، `getSoldierRig()/freeSoldierRig(o)`، `world` (Group المشهد)، `camera`, `camDist`, `MOBILE`, `q(id)`, `setT(id,v)`، `mkCard(title,price,desc,disabled,fn,img)` (زر بطاقة)، `THUMBS[k]` (صور المباني)، `stats(b)`، `has(boonId)`.
للاختبار: `window.__d` في `t3d*.html`: `state()`, `slots()`, `walls()`, `near()`, `cam(d,az,tx,tz)`, `spawnAll(cx,cz,gap)`, `set(wave,silver)`, `hero(x,z)`, `night(bool)`, `pickAt(x,y)`, `sel()`, `info()`.

## قواعد المشاركة
- لا تعدّل `dk3d.core.html` ولا وحدات الآخرين. إن احتجت عنصر HTML أو CSS أنشئه من وحدتك عبر `document.getElementById("stageBox").insertAdjacentHTML(...)` و`<style>` مُدرَج.
- استخدم متغيرات الألوان الموجودة (`--amber #F5C25B`, `--parch`, `--muted`, `--panel`, `--line`, `--blood`, `--ok`) والخطوط Tajawal/Amiri.
- اختبر بـ Playwright: `chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader']})`، افتح `file://…/t3dfast.html` بـ `{waitUntil:'commit',timeout:60000}` ثم `waitForSelector('#ovBtn',{timeout:240000})` ثم `click('#ovBtn',{timeout:120000})`. العرض بطيء (برمجي) — انتظر بسخاء. التقط `pageerror` وافشل إن ظهر أي خطأ.
