# -*- coding: utf-8 -*-
"""
فحص قائمة أعداء §12 وسماتهم.

  cd docs/prototype/tests/units && python3 traitcheck.py

الخطر في §12 ليس أن ينقص عدوّ — ذاك يُعدّ بالعين — بل أن **تُعلَن سمةٌ
ولا تُنفَّذ**: راية `Flying` على تعريفٍ لا يقرؤها أحد تجعل الوطواط يمشي
كسائر المشاة، ولا شيء في المحرّر يشتكي. فهذا الفحص يمشي من الراية إلى
الشيفرة التي تقرؤها، ولا يرضى بأنّها مكتوبة.

ويقرأ الأرقام كلّها من المصدر — لا رقم مكرّراً هنا، فلا يفترق الفحص عن
اللعبة أبداً.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SETUP  = read('Assets/Editor/DawnkeepCombatSetup.cs')
ENUM   = read('Assets/Dawnkeep/Runtime/Combat/UnitTrait.cs')
DEF    = read('Assets/Dawnkeep/Runtime/Combat/UnitDefinition.cs')
UNIT   = read('Assets/Dawnkeep/Runtime/Combat/Unit.cs')
SPEC   = read('docs/DAWNKEEP_SPEC.md')

ok = True
def check(label, good, note=''):
    global ok
    ok = ok and bool(good)
    print(('  ✓ ' if good else '  ✗ ') + label + note)

# ── ما يُقرأ من المصدر ────────────────────────────────────────────────
TRAITS = re.findall(r'^\s{8}(\w+)\s*=\s*1\s*<<\s*(\d+),', ENUM, re.M)
TRAITS = [t for t, _ in TRAITS]

def num(x):
    return float(x.rstrip('f'))

# المهاجمون: اسم الأصل ← الاسم العربيّ
UNITS = {}
for m in re.finditer(
        r'MakeUnit\("(\w+)",\s*"([^"]+)",\s*"([^"]+)",\s*Faction\.(\w+),', SETUP):
    UNITS[m.group(1)] = dict(arabic=m.group(2), english=m.group(3),
                             faction=m.group(4), traits=[], nums={})

# المتغيّر المحلّي ← اسم الأصل، لِتُقرأ أسطر `Trait(` و`Threat(`
VAR = {}
for m in re.finditer(r'UnitDefinition (\w+) = MakeUnit\("(\w+)"', SETUP):
    VAR[m.group(1)] = m.group(2)

for m in re.finditer(
        r'Trait\((\w+),\s*UnitTrait\.(\w+),\s*range:\s*([\d.]+f?),\s*'
        r'power:\s*([\d.]+f?),\s*seconds:\s*([\d.]+f?)(,\s*spawn:\s*(\w+))?\)', SETUP):
    asset = VAR.get(m.group(1))
    if asset is None:
        continue
    UNITS[asset]['traits'].append(m.group(2))
    UNITS[asset]['nums'][m.group(2)] = dict(
        range=num(m.group(3)), power=num(m.group(4)), seconds=num(m.group(5)),
        spawn=m.group(7))

THREAT = {}
for m in re.finditer(
        r'Threat\((\w+),\s*cost:\s*(\d+),\s*taughtOn:\s*(\d+),\s*'
        r'group:\s*ThreatClass\.(\w+),\s*min:\s*(\d+),\s*max:\s*(\d+)\)', SETUP):
    asset = VAR.get(m.group(1))
    if asset:
        THREAT[asset] = dict(cost=int(m.group(2)), taught=int(m.group(3)),
                             group=m.group(4), min=int(m.group(5)), max=int(m.group(6)))

HORDE = {k: v for k, v in UNITS.items() if v['faction'] == 'Horde'}

print('── قائمة الإطلاق (§12: خمسة عشر) ─────────')
print(f'{"العدوّ":<20}{"يُعلَّم":>7}{"ثمن":>6}   السمات')
for asset, info in sorted(HORDE.items(), key=lambda kv: THREAT.get(kv[0], {}).get('taught', 99)):
    t = THREAT.get(asset, {})
    print(f'{info["arabic"]:<20}{t.get("taught","—"):>7}{t.get("cost","—"):>6}   '
          + ('، '.join(info['traits']) if info['traits'] else '—'))

print()
# §12 تعدّ خمسة عشر بالاسم في المواصفات نفسها
SPEC12 = SPEC[SPEC.index('## 12. الأعداء'):SPEC.index('## 13. الزعماء')]
listed = re.findall(r'^\s*(\d+)\.\s+(\S.*)$', SPEC12, re.M)
check(f'§12 تعدّ {len(listed)} عدوّاً والكتالوج يحملها', len(HORDE) == len(listed),
      f'  (المواصفات {len(listed)} · الكتالوج {len(HORDE)})')

check('كلّهم مسعَّرون في التوليد (§14)', len(THREAT) == len(HORDE),
      f'  ({len(THREAT)} من {len(HORDE)})')

# ── الأصالة: أسماءٌ عربية من عندنا لا ترجمةً حرفية ─────────────────
# ── القراءة على الشاشة: الظلّ قبل اللون ───────────────────────────
print()
print('── تمايز الأشكال (§12 على §30) ───────────')
DEFAULT_BULK = float(re.search(r'private float bodyScale = ([\d.]+)f', DEF).group(1))

for asset, info in UNITS.items():
    call = SETUP[SETUP.index('MakeUnit("%s"' % asset):]
    depth, j = 0, call.index('(')
    while j < len(call):
        if call[j] == '(':
            depth += 1
        elif call[j] == ')':
            depth -= 1
            if depth == 0:
                break
        j += 1
    body = call[:j]
    b = re.search(r'bulk:\s*([\d.]+)f', body)
    k = re.search(r'CharacterMeshFactory\.Kind\.(\w+)', body)
    info['bulk'] = float(b.group(1)) if b else DEFAULT_BULK
    info['kind'] = k.group(1) if k else '—'

# القوالب قليلة عمداً (§30) والتمايز بالحجم واللون. فالخطر أن يتشارك عدوّان
# القالبَ **وحجماً متقارباً**: عندها لا يفرّق بينهما إلّا اللون في ليلةٍ ظلماء.
same = []
horde = sorted(HORDE.items(), key=lambda kv: kv[1]['bulk'])
for i in range(len(horde)):
    for j in range(i + 1, len(horde)):
        a, b = horde[i][1], horde[j][1]
        if a['kind'] == b['kind'] and abs(a['bulk'] - b['bulk']) < 0.10:
            same.append(f'{a["arabic"]}/{b["arabic"]}')

spread = max(i['bulk'] for i in HORDE.values()) / min(i['bulk'] for i in HORDE.values())
print(f'{"العدوّ":<20}{"القالب":<12}{"الحجم":>7}')
for _, info in horde:
    print(f'{info["arabic"]:<20}{info["kind"]:<12}{info["bulk"]:>7.2f}')

check('لا عدوّان يتشاركان القالب وحجماً متقارباً', not same,
      '' if not same else f'  ({"، ".join(same)})')
check('ومدى الأحجام واسعٌ يُقرأ من بعيد', spread >= 2.0,
      f'  (أكبرهم {spread:.1f}× أصغرهم)')

# والحجم يتبع الدور: الأثقل صحّةً أضخم جسداً
health = {}
for asset in HORDE:
    m = re.search(r'MakeUnit\("%s"[\s\S]{0,400}?health:\s*([\d.]+)f' % asset, SETUP)
    if m:
        health[asset] = float(m.group(1))
pairs = [(health[a], HORDE[a]['bulk']) for a in health]
mh = sum(p[0] for p in pairs) / len(pairs)
mb = sum(p[1] for p in pairs) / len(pairs)
cov = sum((h - mh) * (b - mb) for h, b in pairs)
den = (sum((h - mh) ** 2 for h, _ in pairs) * sum((b - mb) ** 2 for _, b in pairs)) ** 0.5
check('والجسد الأضخم هو الأصلب (الشكل يَعِد بما يُنفِّذ)',
      den > 0 and cov / den >= 0.7, f'  (ارتباط {cov / den:.2f})' if den else '')

# والشريط فوق الرأس يتبع الحجم وإلّا دُفن في صدر الترول
check('وشريط الصحّة يرتفع بحجم الجسد',
      'BodyScale' in read('Assets/Dawnkeep/Runtime/UI/HealthBarPool.cs'))

# والتباعد كذلك: نصف قطرٍ ثابت يُدخل المُغِير في جسد الترول
check('والتباعد يتبعه كذلك',
      re.search(r'"separationRadius",\s*[\d.]+f\s*\*\s*bulk', SETUP) is not None)

print()
print('── السمات، من الراية إلى الشيفرة ─────────')

# أين تُقرأ كل راية؟ في المشروع كلّه ما عدا ملفّ التعداد وملفّ التعريف
RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs') and f not in ('UnitTrait.cs', 'UnitDefinition.cs'):
            path = os.path.join(base, f)
            RUNTIME[f[:-3]] = io.open(path, encoding='utf-8').read()

declared = set()
for info in HORDE.values():
    declared.update(info['traits'])

print(f'{"الراية":<16}{"مُعلَنة على":<22}تُقرأ في')
dead = []
for trait in TRAITS:
    if trait == 'None':
        continue
    carriers = [i['arabic'] for i in HORDE.values() if trait in i['traits']]
    readers = sorted(n for n, t in RUNTIME.items()
                     if re.search(r'UnitTrait\.' + trait + r'\b', t))
    print(f'{trait:<16}{("، ".join(carriers) or "—"):<22}{"، ".join(readers) or "—"}')
    if trait in declared and not readers:
        dead.append(trait)

check('كل رايةٍ مُعلَنة تُقرأ في الشيفرة', not dead,
      '' if not dead else f'  (بلا قارئ: {"، ".join(dead)})')

orphans = [t for t in TRAITS if t != 'None' and t not in declared]
check('ولا رايةَ في التعداد بلا حاملٍ في الكتالوج', not orphans,
      '' if not orphans else f'  (بلا حامل: {"، ".join(orphans)})')

# ── الأرقام التي تحتاجها كل سمة ───────────────────────────────────
print()
NEEDS = {
    'Suicide':      ('range', 'power', 'seconds'),   # مدى الانفجار وضرره وإنذاره
    'DeathCloud':   ('range', 'power', 'seconds'),   # سحابةٌ لها مدى وضرر ومدّة
    'Leap':         ('range', 'seconds'),            # مدى القفزة ومهلتها
    'SummonAtHalf': ('power',),                      # عدد المستدعَين
    'Support':      ('range', 'power', 'seconds'),   # مدى الحشد وقوّته وفترته
    'Burrow':       ('range', 'seconds'),            # مدى الظهور وثواني التحذير
    'DarkFavoured': ('power',),                      # مقدار الزيادة في الظلام
    'FrontShield':  ('power',),                      # مقدار الدرع الأماميّ
    'Flying':       (),                              # رايةٌ صِرف
}
missing = []
for asset, info in HORDE.items():
    for trait in info['traits']:
        vals = info['nums'][trait]
        for field in NEEDS.get(trait, ()):
            if vals.get(field) in (None, 0.0):
                missing.append(f'{info["arabic"]}/{trait}.{field}')
check('كل سمةٍ أُعطيت الأرقام التي تحتاجها', not missing,
      '' if not missing else f'  (ناقص: {"، ".join(missing)})')

spawner = [i for i in HORDE.values() if 'SummonAtHalf' in i['traits']]
check('والمستدعي أُعطي ما يستدعيه',
      all(i['nums']['SummonAtHalf']['spawn'] for i in spawner),
      f'  ({spawner[0]["arabic"]} ← {spawner[0]["nums"]["SummonAtHalf"]["spawn"]})'
      if spawner else '')

# ── تعارض الرايات ────────────────────────────────────────────────
# `TraitSpent` رايةُ «مرّةً واحدة» يتقاسمها الانفجار والاستدعاء: اجتماعهما
# على وحدةٍ واحدة يُسكِت أحدهما بلا خطأ ظاهر.
ONCE = ('Suicide', 'SummonAtHalf')
clash = [i['arabic'] for i in HORDE.values()
         if sum(1 for t in ONCE if t in i['traits']) > 1]
check(f'لا وحدةَ تجمع {" و".join(ONCE)} (تتقاسمان `TraitSpent`)', not clash,
      '' if not clash else f'  ({"، ".join(clash)})')

# والحافر لا يجري سماته وهو تحت الأرض
check('الحافر لا يجري سماته قبل خروجه',
      'Underground(' in read('Assets/Dawnkeep/Runtime/Combat/CombatDirector.cs')
      and read('Assets/Dawnkeep/Runtime/Combat/CombatDirector.cs').count('Underground(') >= 3)

# ── ما تنصّ عليه §12 نصّاً ────────────────────────────────────────
print()
print('── نصوص §12 ─────────────────────────────')
COMBAT = read('Assets/Dawnkeep/Runtime/Combat/CombatDirector.cs')

check('«ضعيف من الخلف»: الضرر يعرف من أين جاء',
      'TakeDamageFrom(' in UNIT and 'Vector3 origin' in UNIT
      and 'TakeDamageFrom(' in COMBAT)

shield = [i for i in HORDE.values() if 'FrontShield' in i['traits']]
check('  والدرع الأماميّ يزيد الوقاية لا الصحّة',
      bool(shield) and 'TraitPower' in UNIT,
      f'  (+{shield[0]["nums"]["FrontShield"]["power"]:.2f} وقايةً من الأمام)' if shield else '')

check('«يتجاهل الجدران»: الطائر لا يرى إلّا الأبراج والاقتصاد',
      re.search(r'UnitTrait\.Flying', COMBAT) is not None
      and 'FindStructure' in COMBAT)

check('«يترك منطقة سمّ عند موته»: من حقل الأخطار المشترك',
      'UnitTrait.DeathCloud' in COMBAT and 'hazards' in COMBAT.lower())

check('«يفجّر نفسه بعد Telegraph»: إنذارٌ قبل الانفجار',
      'TraitAt' in COMBAT and 'TickSuicide' in COMBAT)

check('«يستفيد من الظلام»: يُقاس بالنور المخزَّن لا باستعلامٍ لكل ضربة',
      'unit.LightLevel' in COMBAT and 'UnitTrait.DarkFavoured' in COMBAT)

check('«يبقى خلف الموجة ويقوّي الحلفاء»: آليّة الحشد نفسها لا ثانيةٌ لها',
      'ApplyRally(' in COMBAT and 'UnitTrait.Support' in COMBAT)

check('«يحفر ويظهر مع تحذير مسبق»: التحذير ثوانٍ يقفها ظاهراً',
      'UnitTrait.Burrow' in read('Assets/Dawnkeep/Runtime/Combat/WaveDirector.cs'))

check('ولا `Update` في `Unit` نفسها (§1: مُخرِجٌ واحد)',
      not re.search(r'\bprivate\s+void\s+Update\s*\(', UNIT))

# ── التعليم التدريجيّ (§14) ───────────────────────────────────────
print()
print('── التعليم التدريجيّ (§14) ────────────────')
byNight = {}
for asset, t in THREAT.items():
    byNight.setdefault(t['taught'], []).append(HORDE[asset]['arabic'])

crowded = {n: v for n, v in byNight.items() if n > 1 and len(v) > 1}
check('لا تُعلَّم ليلةٌ أكثر من نوعٍ واحد (ما بعد الأولى)', not crowded,
      '' if not crowded else f'  ({crowded})')

check('الليلة الأولى تفتح بأنواعٍ قليلة', len(byNight.get(1, [])) <= 3,
      f'  ({len(byNight.get(1, []))} أنواع)')

# ليلةٌ بلا نوعٍ جديد مقبولةٌ إن كانت ليلةَ زعيم: الزعيم هو جديدها، وجمعُه
# إلى عدوٍّ لم يُرَ قطّ يعلّم شيئين في وقتٍ واحد فلا يُتعلَّم أحدهما.
MINI  = int(re.search(r'"miniBossEvery",\s*(\d+)', SETUP).group(1))
EVERY = int(re.search(r'"bossEvery",\s*(\d+)', SETUP).group(1))
gaps = [n for n in range(1, max(byNight) + 1) if n not in byNight]
unexplained = [n for n in gaps if n % MINI and n % EVERY]
check('وكل ليلةٍ بلا نوعٍ جديد هي ليلةُ زعيم', not unexplained,
      f'  (الفارغ {gaps}؛ وكلّها زعماء)' if gaps and not unexplained
      else (f'  (بلا تفسير: {unexplained})' if unexplained else '  (لا فارغَ أصلاً)'))

# الثمن يصعد مع ليلة التعليم. لا يُعدّ الانقلاب — عدُّه يحتاج عتبةً
# مخترعة — بل يُقاس **ارتباط الرتب** (سبيرمان): إحصاءٌ له تفسيرٌ معروف،
# وقوّته الموجبة تعني أنّ الغالي يأتي متأخّراً.
def ranks(values):
    order = sorted(range(len(values)), key=lambda i: values[i])
    out, i = [0.0] * len(values), 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        mean = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            out[order[k]] = mean
        i = j + 1
    return out

nights = [t['taught'] for t in THREAT.values()]
costs   = [t['cost']  for t in THREAT.values()]
rn, rc = ranks(nights), ranks(costs)
mn, mc = sum(rn) / len(rn), sum(rc) / len(rc)
cov = sum((a - mn) * (b - mc) for a, b in zip(rn, rc))
den = (sum((a - mn) ** 2 for a in rn) * sum((b - mc) ** 2 for b in rc)) ** 0.5
rho = cov / den if den else 0.0
check('والأغلى يأتي بعد الأرخص (ارتباط رتبٍ موجبٌ قويّ)', rho >= 0.7,
      f'  (سبيرمان ρ = {rho:.2f})')

print()
print('── ما بقي مقيساً ─────────────────────────')
print(f'الكتالوج {len(HORDE)} مهاجماً، منهم {sum(1 for i in HORDE.values() if i["traits"])} '
      f'بسمةٍ سلوكيّة و{sum(1 for i in HORDE.values() if not i["traits"])} بلا سمة')
print('(§12 لا توجب سمةً لكلٍّ: «عدوّ أساسيّ متوازن» سلوكُه هو الأصل الذي')
print('تُقاس عليه البقيّة، وسمةٌ لكلّ عدوّ تعني ألّا سمةَ تُلاحَظ.)')
print()
print('السمات تُنفَّذ في `CombatDirector` وحدها: لا `Update` في الوحدة، ولا')
print('صنفاً موروثاً لكل عدوّ — راياتٌ على البيانات (§1)، فالعدوّ الذي يطير')
print('ويستدعي رايتان لا صنفٌ ثالث.')

sys.exit(0 if ok else 1)
