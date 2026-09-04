# -*- coding: utf-8 -*-
"""
فحص العتاد والتجهيز (§17).

  cd docs/prototype/tests/gear && python3 gearcheck.py

خطر §17 كخطر §12: أن يُعلَن رقمٌ ولا يُقرأ. قطعةٌ تعد بـ«+18٪ لمدى البرج»
وليس في المشروع من يقرأ `TowerRange` هي قطعةٌ يشتريها اللاعب فلا تعمل،
ولا شيء في المحرّر يشتكي.

فالفحص:
  ١. يقرأ الكتالوج من باني الأصول (لا رقم مكرَّراً هنا).
  ٢. يتتبّع كل `BoonStat` تحرّكه قطعةٌ حتى **موضع قراءته** في التشغيل.
  ٣. يحاكي صيغة §17 للمستوى ويقيس أثرها على خمسين مستوىً.
  ٤. يقابل الأسلحة الستّة بشكل ضربةٍ **منفَّذ** لا معلَن.
  ٥. يحاكي دورة الحدّادة: كم يكلّف بلوغ المستوى، وكم يُعيد التفكيك.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SETUP  = read('Assets/Editor/DawnkeepEquipmentSetup.cs')
GEAR   = read('Assets/Dawnkeep/Runtime/Equipment/EquipmentDefinition.cs')
LOAD   = read('Assets/Dawnkeep/Runtime/Equipment/Loadout.cs')
FORGE  = read('Assets/Dawnkeep/Runtime/Equipment/Forge.cs')
RARITY = read('Assets/Dawnkeep/Runtime/Equipment/Rarity.cs')
KINDS  = read('Assets/Dawnkeep/Runtime/Equipment/WeaponKind.cs')
HERO   = read('Assets/Dawnkeep/Runtime/Hero/HeroController.cs')
BOOK   = read('Assets/Dawnkeep/Runtime/Boons/BoonBook.cs')
SAVE   = read('Assets/Dawnkeep/Runtime/Save/SaveData.cs')
PROG   = read('Assets/Dawnkeep/Runtime/Meta/Progress.cs')
SPEC   = read('docs/DAWNKEEP_SPEC.md')

ok = True
def check(label, good, note=''):
    global ok
    ok = ok and bool(good)
    print(('  ✓ ' if good else '  ✗ ') + label + note)

def block(source, start):
    depth, j = 0, start
    while j < len(source):
        if source[j] == '(':
            depth += 1
        elif source[j] == ')':
            depth -= 1
            if depth == 0:
                return source[start:j + 1]
        j += 1
    return ''

# ── الكتالوج، مقروءاً من الباني ───────────────────────────────────────
ITEMS = []
for m in re.finditer(r'(Weapon|Gear)\("(\w+)",\s*"([^"]+)",\s*"([^"]+)"', SETUP):
    call = block(SETUP, SETUP.index('(', m.start(1) + len(m.group(1)) - 1))
    if m.group(1) == 'Weapon':
        slot = 'Weapon'
        kind = re.search(r'WeaponKind\.(\w+)', call)
        kind = kind.group(1) if kind else '—'
    else:
        s = re.search(r'EquipmentSlot\.(\w+)', call)
        slot = s.group(1) if s else '—'
        kind = '—'

    rarity = re.search(r'Rarity\.(\w+)', call)
    gold = re.search(r'gold:\s*(\d+)', call)
    ess  = re.search(r'essence:\s*(\d+)', call)
    ITEMS.append(dict(
        asset=m.group(2), arabic=m.group(3), english=m.group(4),
        slot=slot, kind=kind,
        rarity=rarity.group(1) if rarity else 'Common',
        gold=int(gold.group(1)) if gold else 0,
        essence=int(ess.group(1)) if ess else 0,
        start='start: true' in call,
        changes=[(c.group(1), float(c.group(2)))
                 for c in re.finditer(r'Change\(BoonStat\.(\w+),\s*([\d.]+)f\)', call)]))

SLOTS = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', read('Assets/Dawnkeep/Runtime/Equipment/EquipmentSlot.cs'), re.M)
RARITIES = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', RARITY, re.M)
WEAPONS = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', KINDS, re.M)

print('── الكتالوج (§17) ────────────────────────')
print(f'{"القطعة":<22}{"الفتحة":<10}{"الندرة":<12}{"ذهب":>6}{"جوهر":>7}   ما تحرّكه')
for it in ITEMS:
    moves = '، '.join(f'{s} {m:g}' for s, m in it['changes'])
    print(f'{it["arabic"]:<22}{it["slot"]:<10}{it["rarity"]:<12}'
          f'{it["gold"]:>6}{it["essence"]:>7}   {moves}')

print()
bySlot = {}
for it in ITEMS:
    bySlot.setdefault(it['slot'], []).append(it)

check(f'الفتحات {len(SLOTS)} كما تعدّ §17 («لا تكثر الفتحات»)', len(SLOTS) == 4,
      f'  ({"، ".join(SLOTS)})')
check(f'والندرات {len(RARITIES)} كما تعدّها', len(RARITIES) == 5,
      f'  ({"، ".join(RARITIES)})')

# §17 تعدّ الأسلحة والمراكب والآثار بالاسم — العدد يُقرأ من المواصفات
SPEC17 = SPEC[SPEC.index('## 17.'):SPEC.index('## 18.')]
def counted(header):
    part = SPEC17[SPEC17.index(header):]
    part = part[:part.index('###', 4)] if '###' in part[4:] else part
    return len(re.findall(r'^\s*\d+\.\s+\S', part, re.M))

check('الأسلحة الستّة كما تعدّها §17',
      len(bySlot.get('Weapon', [])) == counted('### أسلحة الإطلاق'),
      f'  (المواصفات {counted("### أسلحة الإطلاق")} · الكتالوج {len(bySlot.get("Weapon", []))})')
check('والمراكب الأربعة',
      len(bySlot.get('Mount', [])) == counted('### المراكب'),
      f'  (المواصفات {counted("### المراكب")} · الكتالوج {len(bySlot.get("Mount", []))})')

relicTarget = int(re.search(r'أنشئ (\d+) Relics', SPEC17).group(1))
check('والآثار اثنا عشر («أنشئ 12 Relics أولية»)',
      len(bySlot.get('Relic', [])) == relicTarget,
      f'  (المواصفات {relicTarget} · الكتالوج {len(bySlot.get("Relic", []))})')

# الأسماء الستّة التي عدّتها §17 بعينها
named = ['Lantern Heart', "Captain’s Seal", 'Broken Sundial', "Mason’s Oath",
         'Harvest Coin', 'Ash Mirror']
english = {it['english'].replace("'", '’') for it in ITEMS}
missing = [n for n in named if n not in english]
check('والستّة التي سمّتها §17 بأعيانها موجودة', not missing,
      '' if not missing else f'  (ناقص: {"، ".join(missing)})')

check('في كل فتحةٍ قطعةٌ مملوكة من البداية (فتحةٌ فارغة أبداً ليست خياراً)',
      all(any(i['start'] for i in bySlot.get(s, [])) for s in SLOTS),
      '  (' + '، '.join(f'{s}: {sum(1 for i in bySlot.get(s, []) if i["start"])}'
                        for s in SLOTS) + ')')

# ── من الرقم إلى قارئه ────────────────────────────────────────────────
print()
print('── من الرقم إلى قارئه ────────────────────')

RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs') and f not in ('BoonStat.cs', 'EquipmentDefinition.cs',
                                           'BoonDefinition.cs', 'Loadout.cs'):
            RUNTIME[f[:-3]] = io.open(os.path.join(base, f), encoding='utf-8').read()

moved = sorted({s for it in ITEMS for s, _ in it['changes']})
dead = []
print(f'{"الرقم":<22}{"تحرّكه":<5}  يقرؤه')
for stat in moved:
    readers = sorted(n for n, t in RUNTIME.items()
                     if re.search(r'BoonStat\.' + stat + r'\b', t))
    carriers = sum(1 for it in ITEMS if any(s == stat for s, _ in it['changes']))
    print(f'{stat:<22}{carriers:<5}  {"، ".join(readers) or "—"}')
    if not readers:
        dead.append(stat)

check('كل رقمٍ تحرّكه قطعةٌ يُقرأ في التشغيل', not dead,
      '' if not dead else f'  (بلا قارئ: {"، ".join(dead)})')

check('والتجهيز يصل من نقطة `BoonBook` نفسها لا من ثانية',
      'Loadout.Stat(' in BOOK,
      '  (بركة × بحث × تجهيز في `Of` واحدة)')

# ── صيغة المستوى (§17 حرفياً) ─────────────────────────────────────────
print()
print('── المستوى (§17: BaseStat × (1 + 0.055 × (Level−1))) ──')
GROWTH = float(re.search(r'GrowthPerLevel = ([\d.]+)f', GEAR).group(1))
MAXLVL = int(re.search(r'MaxLevel = (\d+)', GEAR).group(1))
RETURN = float(re.search(r'DismantleReturn = ([\d.]+)f', GEAR).group(1))

specGrowth = float(re.search(r'BaseStat × \(1 \+ ([\d.]+) ×', SPEC17).group(1))
specMax = int(re.search(r'Level من 1 إلى (\d+)', SPEC17).group(1))
specBack = float(re.search(r'يعيد (\d+)% من Essence', SPEC17).group(1)) / 100.0

check('معدّل النموّ كما نصّت §17', abs(GROWTH - specGrowth) < 1e-9,
      f'  ({GROWTH} = {specGrowth})')
check('وأقصى مستوى', MAXLVL == specMax, f'  ({MAXLVL})')
check('وما يعيده التفكيك', abs(RETURN - specBack) < 1e-9, f'  ({RETURN:.0%})')

# النموّ على **الفائض فوق الواحد** لا على المضاعف نفسه
check('والنموّ على الفائض فوق الواحد لا على المضاعف',
      re.search(r'1f \+ \(changes\[i\]\.Multiplier - 1f\) \* factor', GEAR) is not None,
      '  (وإلّا صارت كل قطعةٍ أسطوريّةً عند المستوى العشرين)')

def grown(base, level):
    return 1.0 + (base - 1.0) * (1.0 + GROWTH * (level - 1))

sample = max(ITEMS, key=lambda i: max((m for _, m in i['changes']), default=0))
top = max(m for _, m in sample['changes'])
print()
print(f'{"مستوى":>7}{"مثال: " + sample["arabic"]:>26}')
for lvl in (1, 10, 25, 50):
    print(f'{lvl:>7}{grown(top, lvl):>26.3f}')

check('أعلى مضاعفٍ في اللعبة عند المستوى الأقصى معقول (دون ٣×)',
      grown(top, MAXLVL) < 3.0, f'  ({grown(top, MAXLVL):.2f}×)')

# ── الأسلحة: شكلٌ منفَّذ لا معلَن ──────────────────────────────────────
print()
print('── الأسلحة الستّة (§17: الفرق شكلُ الضربة) ──')
print(f'{"السلاح":<22}{"الشكل":<20}{"مدى":>7}{"فترة":>7}   منفَّذ في')
shapes = {}
for it in ITEMS:
    if it['slot'] != 'Weapon':
        continue
    call = block(SETUP, SETUP.index('(', SETUP.index('Weapon("%s"' % it['asset']) + 6))
    rng = float(re.search(r'range:\s*([\d.]+)f', call).group(1))
    itv = float(re.search(r'interval:\s*([\d.]+)f', call).group(1))
    shapes[it['kind']] = (it['arabic'], rng, itv)

    handled = re.search(r'case Dawnkeep\.Equipment\.WeaponKind\.' + it['kind'] + r':', HERO)
    where = 'HeroController' if handled else ''
    if it['kind'] == 'DawnBow':
        where = 'HeroController (الأساس)'
    if it['kind'] == 'EngineerGauntlet':
        where = 'BuildingDirector (الإصلاح)' \
            if 'WeaponKind.EngineerGauntlet' in read(
                'Assets/Dawnkeep/Runtime/Building/BuildingDirector.cs') else ''

    print(f'{it["arabic"]:<22}{it["kind"]:<20}{rng:>7.1f}{itv:>7.2f}   {where or "— لا أحد"}')
    it['where'] = where

silent = [i['arabic'] for i in ITEMS if i['slot'] == 'Weapon' and not i.get('where')]
check('كل سلاحٍ له شكلُ ضربةٍ منفَّذ', not silent,
      '' if not silent else f'  (معلَنٌ بلا تنفيذ: {"، ".join(silent)})')

check('وكلّ ما في `WeaponKind` مستعمَل', len(shapes) == len(WEAPONS),
      f'  ({len(shapes)} من {len(WEAPONS)})')

# لا سلاحان بنفس المدى والفترة: عندها الفرق رقمٌ لا شكل
twins = []
seen = {}
for kind, (name, rng, itv) in shapes.items():
    key = (round(rng, 1), round(itv, 2))
    if key in seen:
        twins.append(f'{seen[key]}/{name}')
    seen[key] = name
check('ولا سلاحان بالمدى والفترة نفسيهما', not twins,
      '' if not twins else f'  ({"، ".join(twins)})')

# المدى والفترة من القطعة لا من تعريف البطل
check('والبطل يقرأ مدى سلاحه وفترته من القطعة',
      'weapon != null ? weapon.Range : definition.WeaponRange' in HERO
      and 'weapon.Interval : definition.AttackInterval' in HERO)
check('  ورشقةُ الفجر تبقى بمدى البطل (قدرتُه هو لا قدرة سلاحه)',
      'definition.WeaponRange, Faction.Horde, _scan' in HERO)

# ── الحدّادة ──────────────────────────────────────────────────────────
print()
print('── الحدّادة (§17) ────────────────────────')

def goldTo(base, level):
    return round(base * (1.0 + GROWTH * (level - 1)))

def essTo(base, level):
    return round(base * (1.0 + GROWTH * (level - 1)))

pick = next(i for i in ITEMS if i['slot'] == 'Weapon' and not i['start'])
print(f'مثال: {pick["arabic"]} — ذهبٌ {pick["gold"]} وجوهرٌ {pick["essence"]} للمستوى الثاني')
print(f'{"إلى مستوى":>10}{"ذهبٌ تراكميّ":>16}{"جوهرٌ تراكميّ":>16}{"يعيده التفكيك":>16}')
for target in (5, 10, 25, 50):
    g = sum(goldTo(pick['gold'], l) for l in range(1, target))
    e = sum(essTo(pick['essence'], l) for l in range(1, target))
    print(f'{target:>10}{g:>16}{e:>16}{int(e * RETURN):>16}')

full = sum(essTo(pick['essence'], l) for l in range(1, MAXLVL))
check('التفكيك يعيد أقلّ ممّا صُرف (وإلّا صار دورةً بلا ثمن)',
      int(full * RETURN) < full, f'  ({int(full * RETURN)} من {full})')

check('وقطعةٌ لم تُرقَّ لا تعيد جوهراً',
      'for (int i = 1; i < level; i++)' in FORGE,
      '  (المجموع على المستويات المدفوعة وحدها)')

check('وعتاد البداية لا يُفكَّك (وإلّا بقي البطل بلا سلاح)',
      'gear.OwnedFromStart' in FORGE and 'ForgeStarterGear' in FORGE)

check('والجباية قبل الرفع لا بعده',
      FORGE.index('SpendForge(') < FORGE.index('loadout.SetLevel(gear, level + 1)'),
      '  (وإلّا بقي المستوى مرفوعاً حين تفشل الجباية)')

# الحدّادة تقرأ الرصيد لتعرف أتقدر أم لا، ولا **تكتبه**: الكتابة كلّها
# في `Progress`، وإلّا صارت العملة تُنقص من موضعين ويختلفان يوماً.
mutates = re.findall(r'\b(?:Gold|Essence|Stars)\s*(?:=|\+=|-=|\+\+|--)', FORGE)
check('والحدّادة تقرأ الرصيد ولا تكتبه — الكتابة في `Progress` وحدها',
      not mutates and 'SpendForge(' in FORGE and 'AddEssence(' in FORGE,
      f'  ({len(mutates)} كتابةً في الحدّادة)' if mutates
      else '  (`SpendForge` و`AddEssence` بابين لا أكثر)')

# ── الجوهر: مصدرٌ من اللعب ────────────────────────────────────────────
print()
essWave = int(re.search(r'essencePerWave = (\d+)', read(
    'Assets/Dawnkeep/Runtime/Meta/ProgressSettings.cs')).group(1))
essWin = int(re.search(r'essenceVictoryBonus = (\d+)', read(
    'Assets/Dawnkeep/Runtime/Meta/ProgressSettings.cs')).group(1))
run = essWave * 10 + essWin
check('الجوهر يأتي من اللعب لا من التفكيك وحده',
      essWave > 0, f'  (جولةٌ فائزة من عشر ليالٍ = {run} جوهراً)')

runs = 0
pot = 0
while pot < full and runs < 200:
    pot += run
    runs += 1
check('وترقيةُ قطعةٍ إلى الأقصى تحتاج جولاتٍ لا واحدة (§16: تدرّجٌ)',
      3 <= runs <= 60, f'  ({runs} جولةً فائزة لقطعةٍ واحدة إلى المستوى {MAXLVL})')

# ── §17 نصّاً ─────────────────────────────────────────────────────────
print()
print('── نصوص §17 ─────────────────────────────')
check('«اللون ليس وسيلة التمييز الوحيدة؛ استخدم إطاراً ورمزاً»',
      'Symbol(' in RARITY and 'Frame(' in RARITY and 'Tint(' in RARITY
      and '_rowFrame' in read('Assets/Dawnkeep/Runtime/UI/LoadoutPanel.cs'))

check('  والرمز يُقرأ بلا لون ويصعد بالندرة',
      len({re.search(r'case Rarity\.' + r + r':\s*return "([^"]+)"', RARITY).group(1)
           for r in RARITIES if re.search(r'case Rarity\.' + r + r':\s*return "([^"]+)"', RARITY)})
      >= len(RARITIES) - 1)

check('«عند Rare وEpic وLegendary تفتح خصائص نوعية»',
      'OpensTrait' in RARITY and 'rarity >= Rarity.Rare' in RARITY)

check('«لا تستخدم صندوقاً مدفوعاً باحتمالات عشوائية في الإصدار الأول»',
      not re.search(r'\bRandom\b|\bLootBox\b|\bChest\b', FORGE + LOAD))

check('«المركوب لا يغير Hitbox بصورة غير عادلة»',
      not any(s in ('HeroDamage', 'TowerRange')
              for it in ITEMS if it['slot'] == 'Mount' for s, _ in it['changes']),
      '  (لا مركبَ يمسّ ضرراً ولا مدى)')

check('«كل أثر يدعم أسلوباً محدداً» — لا أثرَ يزيد كل شيء قليلاً',
      all(len(i['changes']) <= 3 for i in ITEMS if i['slot'] == 'Relic'),
      f'  (أكثر أثرٍ يحرّك {max(len(i["changes"]) for i in ITEMS if i["slot"] == "Relic")} أرقام)')

trades = sum(1 for i in ITEMS if any(m < 1 for _, m in i['changes']))
check('وثمّة مقايضاتٌ لا زياداتٌ صِرف',
      trades >= len(ITEMS) // 3, f'  ({trades} قطعة من {len(ITEMS)} لها ثمن)')

# الأغلى ندرةً هو الأغلى ثمناً
order = {r: i for i, r in enumerate(RARITIES)}
pairs = [(order[i['rarity']], i['gold']) for i in ITEMS]
bad = [i['arabic'] for i in ITEMS
       if any(order[j['rarity']] > order[i['rarity']] and j['gold'] < i['gold'] for j in ITEMS)]
check('والأندر أغلى ثمناً', not bad,
      '' if not bad else f'  ({"، ".join(bad[:3])})')

# ── الحفظ (§27) ───────────────────────────────────────────────────────
print()
check('التجهيز يُحفظ في `SaveService` لا في `PlayerPrefs` (§27)',
      'PlayerPrefs' not in LOAD and 'SaveService' in LOAD)
check('  والمستوى معه، لا الملبوس وحده',
      'LevelKeys' in SAVE and 'LevelValues' in SAVE and 'SetLevel' in LOAD)
check('  وقطعةٌ من بناءٍ أحدث تُتجاهل ولا تُسقِط القراءة',
      '_byName.TryGetValue' in LOAD and 'continue;' in LOAD)
check('  وجدول المضاعفات يُبنى عند التبديل لا عند القراءة',
      LOAD.index('private void Rebuild()') > 0
      and 'Rebuild();' in LOAD and '_stats.TryGetValue(stat, out value) ? value : 1f' in LOAD)

print()
print('── ما لم يُبنَ من §17، وسببه ──────────────')
print('§17 تذكر أيضاً: مخطّطاتٍ من المراحل، ومتجراً يوميّاً، وBattle Pass،')
print('وترقيةَ ندرة. والمبنيّ منها: الصناعة والترقية والتفكيك — أمّا المتجر')
print('فمؤجَّلٌ بنصّ §41: «لا تبدأ المتجر قبل أن تصبح الحلقة الأساسية ممتعة')
print('وتعمل». والمخطّطات تنتظر §19 (أهداف المراحل)، فهي مصدرُها.')

sys.exit(0 if ok else 1)
