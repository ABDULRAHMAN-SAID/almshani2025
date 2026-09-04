# -*- coding: utf-8 -*-
"""
فحص محتوى الحملة (§19).

  cd docs/prototype/tests/campaign && python3 campaigncheck.py

§19 تختم قائمة أهدافها بشرطٍ قاطع:

    «لا تجعل كل الاختلافات نصًّا فقط؛ **يجب أن تغير القرار الفعلي**».

وهذا أسهلُ شرطٍ يُخرَق بلا أن يُلاحَظ: يُكتب الهدف على البطاقة، ويُترجَم،
ويُعرَض — ولا يفعل شيئاً في الساحة. فالفحص يمشي من **كل هدفٍ إلى الشيفرة
التي تنفّذه**، ولا يرضى بأنّه مكتوب.

ويقيس ثلاثة أخرى:
  · سلسلة الفتح: أتُبلَغ المنطقة الرابعة أم تبقى خلف شرطٍ لا يُنال؟
  · مصدر العتاد: أكلُّ قطعةٍ غير مملوكةٍ من البداية تُنال من مرحلة؟ (§17)
  · بيئة المناطق: أتختلف فعلاً أم بالاسم؟
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SETUP   = read('Assets/Editor/DawnkeepCampaignSetup.cs')
GEARSET = read('Assets/Editor/DawnkeepEquipmentSetup.cs')
ZONE    = read('Assets/Dawnkeep/Runtime/Campaign/ZoneDefinition.cs')
STAGE   = read('Assets/Dawnkeep/Runtime/Campaign/StageDefinition.cs')
GOALS   = read('Assets/Dawnkeep/Runtime/Campaign/StageObjective.cs')
RULES   = read('Assets/Dawnkeep/Runtime/Campaign/StageRules.cs')
DIR     = read('Assets/Dawnkeep/Runtime/Campaign/CampaignDirector.cs')
OUTCOME = read('Assets/Dawnkeep/Runtime/Flow/StageOutcome.cs')
SAVE    = read('Assets/Dawnkeep/Runtime/Save/SaveData.cs')
PANEL   = read('Assets/Dawnkeep/Runtime/UI/CampaignPanel.cs')
SPEC    = read('docs/DAWNKEEP_SPEC.md')

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

# ── المناطق، من الباني ────────────────────────────────────────────────
ZONES = []
for m in re.finditer(r'Zone\("(\w+)",\s*"([^"]+)",\s*"([^"]+)"', SETUP):
    call = block(SETUP, SETUP.index('(', m.start()))
    def num(name, default=1.0):
        g = re.search(name + r':\s*([\d.]+)f?', call)
        return float(g.group(1)) if g else default
    ZONES.append(dict(
        asset=m.group(1), arabic=m.group(2), english=m.group(3),
        order=int(num('order')), ground=num('ground'), tower=num('tower'),
        beacon=num('beacon'), threat=num('threat'),
        unlockAfter=int(num('unlockAfter', 0)),
        boss=re.search(r'boss:\s*"(\w+)"', call).group(1)))
ZONES.sort(key=lambda z: z['order'])

PATTERN = re.findall(r'StageObjective\.(\w+),\s*//', SETUP)
GOALNAMES = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', GOALS, re.M)
DROPS = re.search(r'string\[\] drops =\s*\{(.*?)\};', SETUP, re.S).group(1)
DROPLIST = re.findall(r'"([^"]*)"', DROPS)

STAGES_PER = int(re.search(r'SetPrivate\(def, "stages", (\d+)\)', SETUP).group(1))

print('── المناطق الأربع (§19) ──────────────────')
print(f'{"المنطقة":<20}{"أرض":>6}{"مدى":>6}{"نور":>6}{"تهديد":>7}{"تُفتح بعد":>10}   زعيمها')
for z in ZONES:
    print(f'{z["arabic"]:<20}{z["ground"]:>6.2f}{z["tower"]:>6.2f}{z["beacon"]:>6.2f}'
          f'{z["threat"]:>7.2f}{z["unlockAfter"]:>10}   {z["boss"]}')

print()
specZones = len(re.findall(r'^### المنطقة \d+:', SPEC[SPEC.index('## 19.'):SPEC.index('## 20.')], re.M))
specTotal = int(re.search(r'أي (\d+) مرحلة عند الإصدار',
                          SPEC[SPEC.index('## 19.'):SPEC.index('## 20.')]).group(1))

check(f'المناطق {specZones} كما تعدّ §19', len(ZONES) == specZones,
      f'  (المواصفات {specZones} · الباني {len(ZONES)})')
check(f'والمراحل {specTotal} ({len(ZONES)} × {STAGES_PER})',
      len(ZONES) * STAGES_PER == specTotal,
      f'  ({len(ZONES) * STAGES_PER})')
check('ولكلٍّ زعيمُها (§13)', len({z['boss'] for z in ZONES}) == len(ZONES),
      f'  ({len({z["boss"] for z in ZONES})} زعماء مختلفون)')

# البيئة تختلف فعلاً لا بالاسم
same = [z['arabic'] for z in ZONES
        if abs(z['ground'] - 1) < 0.01 and abs(z['tower'] - 1) < 0.01
        and abs(z['beacon'] - 1) < 0.01 and z['order'] > 1]
check('وبيئةُ كل منطقةٍ بعد الأولى تغيّر رقماً في اللعب', not same,
      '' if not same else f'  (بلا فرق: {"، ".join(same)})')

check('والتهديد يصعد بالمنطقة (§14: معامل المنطقة)',
      all(ZONES[i]['threat'] < ZONES[i + 1]['threat'] for i in range(len(ZONES) - 1)),
      f'  ({" ← ".join(str(z["threat"]) for z in ZONES)})')

# ── الأهداف: من النصّ إلى التنفيذ ─────────────────────────────────────
print()
print('── الأهداف، من الإعلان إلى الساحة (§19) ──')

RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs') and f not in ('StageObjective.cs', 'StageDefinition.cs',
                                           'CampaignPanel.cs'):
            RUNTIME[f[:-3]] = io.open(os.path.join(base, f), encoding='utf-8').read()

# كل هدفٍ وما ينفّذه. `HoldTheKeep` هو الأساس: شرط §5 نفسه، ولا يحتاج فرعاً.
BASE = 'HoldTheKeep'
print(f'{"الهدف":<20}{"مراحله":<8}يغيّره في الساحة')
dead = []
for goal in GOALNAMES:
    doers = sorted(n for n, t in RUNTIME.items()
                   if re.search(r'StageObjective\.' + goal + r'\b', t))
    count = sum(1 for g in PATTERN if g == goal) * len(ZONES)
    print(f'{goal:<20}{count:<8}{"، ".join(doers) or ("Keep (§5)" if goal == BASE else "—")}')
    if goal != BASE and not doers:
        dead.append(goal)

check('كل هدفٍ غير الأساس **يغيّر شيئاً في الساحة**', not dead,
      '' if not dead else f'  (نصٌّ بلا تنفيذ: {"، ".join(dead)})')

# §19 تعدّ سبعة أهداف بالنصّ
SPEC19 = SPEC[SPEC.index('### تنويع أهداف المراحل'):SPEC.index('## 20.')]
listed = len(re.findall(r'^- \S', SPEC19, re.M))
check(f'والعدد {listed} كما تعدّه §19', len(GOALNAMES) == listed,
      f'  (المواصفات {listed} · التعداد {len(GOALNAMES)})')

used = set(PATTERN)
check('وكلُّها مستعمَلٌ في نمط المنطقة', used == set(GOALNAMES),
      '' if used == set(GOALNAMES) else f'  (غير مستعمَل: {"، ".join(set(GOALNAMES) - used)})')

# وكلٌّ منها يُنفَّذ في الموضع الصحيح
print()
check('«ستّ عقد فقط» تقفل العقد فعلاً',
      'NodeAllowed' in RULES and 'StageRules.NodeAllowed' in RUNTIME['BuildNode'])
check('«بلا أبراج» ترفض بناء البرج لا تُخفيه فقط',
      'TowersOpen' in RULES and 'StageRules.TowersOpen' in RUNTIME['BuildingDirector'])
check('«بوّابتان» تجعلهما اثنتين من أوّل ليلة',
      'ForcedTwoFronts' in RULES and 'ForcedTwoFronts' in RUNTIME['WaveGenerator'])
check('«منارتان» تحبس الفوز حتى تُشعَلا',
      'BeaconsSatisfied' in RULES and 'BeaconsSatisfied' in OUTCOME)
check('  ولا تُحسَب خسارةً — اللاعب صمد',
      'if (!Dawnkeep.Campaign.StageRules.BeaconsSatisfied)\n            {\n                return;'
      in OUTCOME)
check('«القافلة» سقوطُها خسارةٌ ولو صمد القلب',
      'ConvoyLost' in RULES and 'ConvoyLost' in OUTCOME)
check('«جدارٌ مكسور» يُقام ثمّ يُكسَر فعلاً',
      'RaiseBreach' in RULES and 'TakeDamage' in RULES and 'breachHealth' in RULES)
check('  والهبة لا تخصم فضّةً من اللاعب',
      'public Building Grant(' in RUNTIME['BuildingDirector']
      and 'director.Grant(' in RULES)

# ── بيئة المنطقة: من الرقم إلى قارئه ──────────────────────────────────
print()
for name, reader in (('Ground', 'CombatDirector'), ('TowerRange', 'BuildingDirector'),
                     ('BeaconRadius', 'LightSettings'), ('Threat', 'WaveGenSettings')):
    check(f'معامل «{name}» يُقرأ في {reader}',
          f'CampaignDirector.{name}()' in RUNTIME.get(reader, ''))

# ── سلسلة الفتح، بمحاكاة ─────────────────────────────────────────────
print()
print('── سلسلة الفتح ───────────────────────────')

cleared = set()
def key(z, i): return f'{z}-{i}'

def unlocked(z, i):
    if z <= 1 and i <= 1:
        return True
    if i > 1:
        return key(z, i - 1) in cleared
    before = ZONES[z - 2] if z >= 2 else None
    if before is None:
        return True
    done = sum(1 for s in range(1, STAGES_PER + 1) if key(z - 1, s) in cleared)
    return done >= ZONES[z - 1]['unlockAfter']

# لاعبٌ يُنجز كل مرحلةٍ مفتوحةٍ بالترتيب
order = []
for _ in range(len(ZONES) * STAGES_PER + 4):
    nxt = None
    for z in range(1, len(ZONES) + 1):
        for i in range(1, STAGES_PER + 1):
            if key(z, i) not in cleared and unlocked(z, i):
                nxt = (z, i)
                break
        if nxt:
            break
    if nxt is None:
        break
    cleared.add(key(*nxt))
    order.append(nxt)

check(f'الأربعون كلّها تُبلَغ بالترتيب', len(order) == len(ZONES) * STAGES_PER,
      f'  (بُلغت {len(order)} من {len(ZONES) * STAGES_PER})')

for z in ZONES:
    first = next((n for n, (zz, ii) in enumerate(order, 1) if zz == z['order'] and ii == 1), None)
    print(f'  · {z["arabic"]}: أوّل مراحلها هي المرحلة {first} في الترتيب')

check('ولا منطقةَ تُفتح قبل التي قبلها',
      all(order.index((z['order'], 1)) > order.index((z['order'] - 1, 1))
          for z in ZONES if z['order'] > 1))

# ── مصدر العتاد (§17: «مخططات من المراحل») ───────────────────────────
print()
print('── مصدر العتاد ───────────────────────────')

GEAR = {}
for m in re.finditer(r'(?:Weapon|Gear)\("(\w+)",\s*"([^"]+)"', GEARSET):
    call = block(GEARSET, GEARSET.index('(', m.start()))
    GEAR[m.group(1)] = dict(arabic=m.group(2), start='start: true' in call)

owned = [a for a, g in GEAR.items() if g['start']]
dropped = [d for d in DROPLIST if d]
orphans = [GEAR[a]['arabic'] for a in GEAR
           if not GEAR[a]['start'] and a not in dropped]

print(f'الكتالوج {len(GEAR)} قطعة: {len(owned)} من البداية '
      f'و{len(set(dropped))} من مراحل الحملة.')

check('كل قطعةٍ غير مملوكةٍ من البداية لها مصدرٌ في الحملة (§17)', not orphans,
      '' if not orphans else f'  (بلا مصدر: {"، ".join(orphans)})')

unknown = [d for d in dropped if d not in GEAR]
check('ولا مخطّطَ يشير إلى قطعةٍ لا وجود لها', not unknown,
      '' if not unknown else f'  ({"، ".join(unknown)})')

twice = [d for d in set(dropped) if dropped.count(d) > 1]
check('ولا قطعةَ تسقط من مرحلتين', not twice,
      '' if not twice else f'  ({"، ".join(twice)})')

check('والمخطّط يُمنَح مرّةً واحدة ولو أُعيدت المرحلة',
      'bool fresh = !Cleared(stage)' in DIR and 'if (!fresh' in DIR)

check('وأوّل مخطّطٍ في المنطقة الأولى لا في الرابعة',
      bool(DROPLIST[1]), f'  (المرحلة 2 تمنح {DROPLIST[1] or "لا شيء"})')

# ── الحفظ (§27) والواجهة ─────────────────────────────────────────────
print()
check('المنجَز يُحفظ قائمةً لا عدّاداً',
      'List<string> StagesCleared' in SAVE,
      '  (العدّاد يقول «ستّ» ولا يقول أيّها)')
check('والمرحلة الجارية تعبر بين المشهدين',
      'public static StageDefinition Current' in DIR)
check('ولاعبٌ يضغط «ابدأ» بلا اختيارٍ يجد مرحلةً',
      'Current = NextOpen();' in DIR)
check('والحملة المكتملة تُعاد ولا تُقفَل',
      'return best != null ? best : Last();' in DIR)
check('والمقفلة تُعرَض ومعها شرطها',
      'ZoneLockedAfter' in PANEL and 'StageLocked' in PANEL)
check('والهدف مكتوبٌ على بطاقة المرحلة',
      'ObjectiveKey(stage.Objective)' in PANEL)

print()
print('── ما بقي من §19، وسببه ──────────────────')
print('البنية تحمل الأربعين ببيئاتها وأهدافها ومخطّطاتها، **والخريطة')
print('المبنيّة واحدة**. و§19 تسمح بهذا صراحةً: «لا يلزم صنع الفن النهائي')
print('لكل الأربع في أول Vertical Slice، لكن يجب أن تدعم البنية ذلك».')
print('فما ينقص فنٌّ لا بنية، وهو مسجَّلٌ في ASSET_MANIFEST.md.')

sys.exit(0 if ok else 1)
