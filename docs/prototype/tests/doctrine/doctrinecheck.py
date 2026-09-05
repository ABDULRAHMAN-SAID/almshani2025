# -*- coding: utf-8 -*-
"""
فحص بطاقات العقائد (§18).

  cd docs/prototype/tests/doctrine && python3 doctrinecheck.py

§18 قصيرةٌ وقيودُها صريحة: عشرون بطاقة، اثنتان قبل المرحلة، تُفتح
بالإنجازات **لا بالسحب العشوائي**، ولكلٍّ مستوىً أساسيّ **وترقيةٌ واحدة
فقط**. وكلُّ أمثلتها مبنيّةٌ على مقايضة.

فما يخفى ليس العدد بل ثلاثة:
  ١. **فعلٌ افتتاحيّ معلَنٌ ولا يقع** — «تبدأ بثلاثة حرّاس» ولا شيء يقرأ
     الرقم؛ ولا شيء في المحرّر يشتكي.
  ٢. **سلّم فتحٍ لا يُبلَغ** — بطاقةٌ تحتاج عشرين انتصاراً في لعبةٍ من عشر
     ليالٍ، فلا تُرى أبداً.
  ٣. **بطاقةٌ كلّها مكسب** — فتُختار دائماً، فلا اختيار.

فالفحص يقيس الثلاثة، ويحاكي عشرين جولةً ليقول متى تُفتح كلٌّ.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SETUP   = read('Assets/Editor/DawnkeepDoctrineSetup.cs')
CARD    = read('Assets/Dawnkeep/Runtime/Doctrine/DoctrineDefinition.cs')
BOOK    = read('Assets/Dawnkeep/Runtime/Doctrine/DoctrineBook.cs')
OPENING = read('Assets/Dawnkeep/Runtime/Doctrine/DoctrineOpening.cs')
UNLOCK  = read('Assets/Dawnkeep/Runtime/Doctrine/DoctrineUnlock.cs')
OPENER  = read('Assets/Dawnkeep/Runtime/Doctrine/DoctrineOpener.cs')
BOONS   = read('Assets/Dawnkeep/Runtime/Boons/BoonBook.cs')
SAVE    = read('Assets/Dawnkeep/Runtime/Save/SaveData.cs')
PANEL   = read('Assets/Dawnkeep/Runtime/UI/DoctrinePanel.cs')
PROGS   = read('Assets/Dawnkeep/Runtime/Meta/ProgressSettings.cs')
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

# ── الكتالوج، من الباني ───────────────────────────────────────────────
CARDS = []
for m in re.finditer(r'Card\("(\w+)",\s*"([^"]+)",\s*"([^"]+)"', SETUP):
    call = block(SETUP, SETUP.index('(', m.start()))
    unlock = re.search(r'DoctrineUnlock\.(\w+),\s*(\d+),\s*(\d+)', call)
    opening = re.search(r'DoctrineOpening\.(\w+),\s*(\d+)', call)
    CARDS.append(dict(
        asset=m.group(1), arabic=m.group(2), english=m.group(3),
        unlock=unlock.group(1), at=int(unlock.group(2)), upgrade=int(unlock.group(3)),
        opening=opening.group(1), amount=int(opening.group(2)),
        changes=[(c.group(1), float(c.group(2)))
                 for c in re.finditer(r'Change\(BoonStat\.(\w+),\s*([\d.]+)f\)', call)]))

SLOTS = int(re.search(r'public const int Slots = (\d+);', BOOK).group(1))
GAIN = float(re.search(r'UpgradeGain = ([\d.]+)f', CARD).group(1))
OPENINGS = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', OPENING, re.M)
UNLOCKS = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', UNLOCK, re.M)

print('── العشرون (§18) ─────────────────────────')
print(f'{"البطاقة":<22}{"يفتحها":<16}{"عند":>5}{"ترقية":>7}   الفعل / الأرقام')
for c in CARDS:
    act = '' if c['opening'] == 'None' else f'{c["opening"]}×{c["amount"]}  '
    moves = '، '.join(f'{s} {m:g}' for s, m in c['changes'])
    print(f'{c["arabic"]:<22}{c["unlock"]:<16}{c["at"] or "—":>5}'
          f'{c["upgrade"] or "—":>7}   {act}{moves}')

print()
target = int(re.search(r'أنشئ (\d+) بطاقة', SPEC[SPEC.index('## 18.'):SPEC.index('## 19.')])
             .group(1))
check(f'العدد {target} كما تنصّ §18', len(CARDS) == target,
      f'  (المواصفات {target} · الكتالوج {len(CARDS)})')

specSlots = int(re.search(r'يجهز اللاعب بطاقتين',
                          SPEC[SPEC.index('## 18.'):SPEC.index('## 19.')]) is not None) and 2
check('وفتحتان لا أكثر («يجهز اللاعب بطاقتين»)', SLOTS == specSlots, f'  ({SLOTS})')

# §18 تسمّي خمساً بأعيانها
named = ['Early Investment', 'Standing Army', 'Bright Frontier',
         'Mobile Command', 'Stone First']
english = {c['english'] for c in CARDS}
missing = [n for n in named if n not in english]
check('والخمس التي سمّتها §18 بأعيانها موجودة', not missing,
      '' if not missing else f'  (ناقص: {"، ".join(missing)})')

check('«لكل بطاقة مستوى واحد أساسي وترقية واحدة فقط»',
      'level <= 1 ? 1f : 1f + UpgradeGain' in CARD
      and 'return Upgraded(card) ? 2 : 1;' in BOOK,
      f'  (المستوى ١ أو ٢، والترقية تكبّر الفائض بـ{GAIN:.0%})')

check('«تُفتح بالإنجازات والحملة، لا بالسحب العشوائي»',
      not re.search(r'\bRandom\b|\bShuffle\b|\bDraw\b', BOOK + CARD),
      f'  ({len(UNLOCKS) - 1} شروطٍ من ملفّ الحفظ)')

# ── الفعل الافتتاحيّ: معلَنٌ ومنفَّذ؟ ─────────────────────────────────
print()
print('── الأفعال الافتتاحية، من الإعلان إلى التنفيذ ──')

RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs') and not f.startswith('Doctrine'):
            RUNTIME[f[:-3]] = io.open(os.path.join(base, f), encoding='utf-8').read()
RUNTIME['DoctrineOpener'] = OPENER

used = {c['opening'] for c in CARDS if c['opening'] != 'None'}
dead = []
print(f'{"الفعل":<20}{"بطاقاته":<9}ينفّذه')
for act in OPENINGS:
    if act == 'None':
        continue
    doers = sorted(n for n, t in RUNTIME.items()
                   if re.search(r'DoctrineOpening\.' + act + r'\b', t))
    carriers = sum(1 for c in CARDS if c['opening'] == act)
    print(f'{act:<20}{carriers:<9}{"، ".join(doers) or "—"}')
    if act in used and not doers:
        dead.append(act)

check('كل فعلٍ افتتاحيٍّ تَعِد به بطاقةٌ **منفَّذ**', not dead,
      '' if not dead else f'  (بلا منفِّذ: {"، ".join(dead)})')

orphan = [a for a in OPENINGS if a != 'None' and a not in used]
check('ولا فعلَ في التعداد بلا بطاقةٍ تحمله', not orphan,
      '' if not orphan else f'  (بلا حامل: {"، ".join(orphan)})')

zero = [c['arabic'] for c in CARDS if c['opening'] != 'None' and c['amount'] <= 0]
check('وكلُّ فعلٍ أُعطي مقداره', not zero,
      '' if not zero else f'  (بمقدارٍ صفر: {"، ".join(zero)})')

# ── الأرقام: من الرقم إلى قارئه ───────────────────────────────────────
print()
moved = sorted({s for c in CARDS for s, _ in c['changes']})
noreader = [s for s in moved
            if not any(re.search(r'BoonStat\.' + s + r'\b', t)
                       for n, t in RUNTIME.items()
                       if n not in ('BoonStat', 'BoonDefinition'))]
check(f'وكل رقمٍ تحرّكه بطاقةٌ يُقرأ في التشغيل ({len(moved)} رقماً)', not noreader,
      '' if not noreader else f'  (بلا قارئ: {"، ".join(noreader)})')

check('والعقيدة تصل من نقطة `BoonBook` نفسها لا من ثانية',
      'DoctrineBook.Stat(' in BOONS,
      '  (بركة × بحث × تجهيز × عقيدة في `Of` واحدة)')

# ── المقايضة: لا بطاقةَ كلّها مكسب ────────────────────────────────────
print()
print('── المقايضة (§18: لكلٍّ ثمن) ─────────────')

# «أفضل» يعني: مضاعفٌ فوق الواحد لرقمٍ يُراد كبيراً، أو دونه لرقمٍ يُراد
# صغيراً. ثلاثةٌ مقلوبة في المفردات، وتسميتُها هنا لا افتراضُها.
INVERTED = {'HeroCooldown', 'BuildCost', 'SnuffSeconds'}

def gain(stat, mult):
    return mult < 1.0 if stat in INVERTED else mult > 1.0

free = []
for c in CARDS:
    costs = [s for s, m in c['changes'] if not gain(s, m)]
    if c['opening'] != 'None':
        # فعلٌ افتتاحيّ مكسبٌ دائماً، فلا بدّ من ثمنٍ في الأرقام
        if not costs:
            free.append(c['arabic'])
    elif not costs or not [s for s, m in c['changes'] if gain(s, m)]:
        free.append(c['arabic'])

check('لا بطاقةَ كلّها مكسب ولا كلّها ثمن', not free,
      '' if not free else f'  ({"، ".join(free)})')

# ولا بطاقتان متطابقتان في الأثر
seen, twins = {}, []
for c in CARDS:
    key = tuple(sorted(c['changes'])) + (c['opening'], c['amount'])
    if key in seen:
        twins.append(f'{seen[key]}/{c["arabic"]}')
    seen[key] = c['arabic']
check('ولا بطاقتان بالأثر نفسه', not twins,
      '' if not twins else f'  ({"، ".join(twins)})')

check('ولا تُلبَس بطاقةٌ في الفتحتين معاً',
      'if (i != slot && _held[i] == card)' in BOOK)

# ── سلّم الفتح: مقيسٌ بمحاكاة ─────────────────────────────────────────
print()
print('── سلّم الفتح، بمحاكاة عشرين جولة ────────')

# صيغة §21: Account XP = 80 + 12 × رقم المرحلة
XPBASE_STAGE = int(re.search(r'accountXpBase = (\d+)', PROGS).group(1))
XPPER_STAGE  = int(re.search(r'accountXpPerStage = (\d+)', PROGS).group(1))
XPBASE = float(re.search(r'xpBase = ([\d.]+)f', PROGS).group(1))
XPEXP  = float(re.search(r'xpExponent = ([\d.]+)f', PROGS).group(1))
MAXACC = int(re.search(r'maxAccountLevel = (\d+)', PROGS).group(1))

def levelFor(xp):
    level, need = 1, 0.0
    while level < MAXACC:
        need += XPBASE * (level ** XPEXP)
        if xp < need:
            break
        level += 1
    return level

# جولةٌ نموذجية: عشر ليالٍ ثمّ فوز (§5)، وزعيمان يُلقيان فيها (§13)
RUNS = 20
CAMPAIGN = 10
state = dict(AccountLevel=1, Victories=0, FurthestWave=0,
             BossesMet=0, StagesPlayed=0)
xp = 0
opened, upgraded = {}, {}

for run in range(1, RUNS + 1):
    # لاعبٌ يتقدّم في الحملة مرحلةً في الجولة، فرقمُ المرحلة هو رقم الجولة
    xp += XPBASE_STAGE + XPPER_STAGE * run
    state['AccountLevel'] = levelFor(xp)
    state['Victories'] += 1
    state['StagesPlayed'] += 1
    state['FurthestWave'] = max(state['FurthestWave'], CAMPAIGN + run)
    state['BossesMet'] = min(4, 1 + run // 4)      # أربعة زعماء (§13)

    for c in CARDS:
        got = int(1e9) if c['unlock'] == 'FromStart' else state[c['unlock']]
        if c['asset'] not in opened and got >= c['at']:
            opened[c['asset']] = run
        if c['upgrade'] and c['asset'] not in upgraded and got >= c['upgrade']:
            upgraded[c['asset']] = run

print(f'{"البطاقة":<22}{"تُفتح":>8}{"تُرقّى":>9}   (بالجولة)')
for c in CARDS:
    o = opened.get(c['asset'])
    u = upgraded.get(c['asset'])
    print(f'{c["arabic"]:<22}{(str(o) if o else "—"):>8}{(str(u) if u else "—"):>9}')

print()
never = [c['arabic'] for c in CARDS if c['asset'] not in opened]
check(f'كل بطاقةٍ تُفتح خلال {RUNS} جولة', not never,
      '' if not never else f'  (لا تُفتح: {"، ".join(never)})')

start = [c for c in CARDS if c['unlock'] == 'FromStart']
check(f'وفي الجولة الأولى ما يملأ الفتحتين', len(start) >= SLOTS,
      f'  ({len(start)} مفتوحةٌ من البداية)')

check('ولا تُفتح العشرون كلّها في الجولة الأولى (§18: تدرّجٌ)',
      len(start) < len(CARDS), f'  ({len(start)} من {len(CARDS)})')

late = max(opened.values())
check('وآخرُها لا يتأخّر إلى ما بعد العشرين', late <= RUNS,
      f'  (آخرُ فتحٍ: الجولة {late})')

noUp = [c['arabic'] for c in CARDS
        if c['upgrade'] and c['asset'] not in upgraded]
check('وكل بطاقةٍ لها ترقيةٌ تبلغها', not noUp,
      '' if not noUp else f'  (لا تُرقّى: {"، ".join(noUp)})')

for c in CARDS:
    if c['upgrade'] and c['upgrade'] <= c['at']:
        check(f'شرط ترقية «{c["arabic"]}» أشدّ من شرط فتحها', False,
              f'  (فتحٌ {c["at"]} · ترقيةٌ {c["upgrade"]})')

# ── الحفظ (§27) ───────────────────────────────────────────────────────
print()
check('العقيدة تُحفظ في `SaveService` لا في `PlayerPrefs` (§27)',
      'PlayerPrefs' not in BOOK and 'SaveService' in BOOK)
check('  والفتحة الفارغة نصٌّ فارغ لا حذفٌ من القائمة',
      'held.Add(_held[i] != null ? _held[i].name : string.Empty)' in BOOK,
      '  (وإلّا صارت الثانية أولى بعد تفريغ الأولى)')
check('  وبطاقةٌ تشدّد شرطُها في بناءٍ لاحق تُنزَع ولا تُسقِط القراءة',
      'if (Unlocked(card))' in BOOK and 'continue;' in BOOK)
check('  وكتلةُ العقيدة في `SaveData` مستقلّة',
      'class DoctrineState' in SAVE and 'DoctrineState Doctrine' in SAVE)

# ── الواجهة ───────────────────────────────────────────────────────────
print()
check('المقفلة تُعرَض ومعها شرطها ومبلغُ اللاعب منه',
      'DoctrineNeeds' in PANEL and 'book.Progress(card.Unlock)' in PANEL,
      '  (عقيدةٌ مخفيّةٌ لا يسعى إليها أحد)')
check('وضغطُ فتحةٍ مختارة يفرّغها', 'book.Clear(index)' in PANEL)
check('ولا زرّ يفتح ما لا وجود له (§17)',
      all(re.search(r'(private|public)[^\n]*\b' + a + r'\(', PANEL)
          for a in set(re.findall(r'onClick\.AddListener\((?:delegate \{ )?(\w+)', PANEL))))

print()
print('── ما تعنيه المقايضة عملياً ───────────────')
best = max(CARDS, key=lambda c: len(c['changes']))
print(f'أكثر البطاقات أرقاماً: {best["arabic"]} بـ{len(best["changes"])}.')
print(f'والترقية تكبّر الفائض بـ{GAIN:.0%}: بطاقةٌ بـ+٢٠٪ تصير +٣٠٪،')
print('وثمنُها ‎−١٠٪‎ يصير ‎−١٥٪‎ — فالمقايضة تكبر مع المكسب ولا تنقلب')
print('البطاقة كلَّ مكسبٍ عند ترقيتها.')

sys.exit(0 if ok else 1)
