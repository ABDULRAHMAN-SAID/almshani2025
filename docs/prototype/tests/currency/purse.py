# -*- coding: utf-8 -*-
"""
فحص الاقتصاد الدائم (§21).

  cd docs/prototype/tests/currency && python3 purse.py

§21 قصيرةٌ وقيودُها عدديّة، وأشدُّها قيدٌ **يخالفه المشروع بغير قصد**:

    «استخدم **ثلاث** عملات فقط: Gold، Dawn Shards، Crystals.»

بينما §16 تسمّي عملةً رابعة («Research Star») و§17 خامسة («Essence»).
فالفحص يعدّ العملات الدائمة في الشيفرة ويقابلها بالثلاث، ويقرأ صيغة
المكافأة حرفاً حرفاً من §21، ويحاكي أربعين مرحلةً ليقول: أتكفي الشظايا
سبيلَيها، وهل يتضخّم شيء؟
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SAVE    = read('Assets/Dawnkeep/Runtime/Save/SaveData.cs')
FORMAT  = read('Assets/Dawnkeep/Runtime/Save/SaveFormat.cs')
MIGRATE = read('Assets/Dawnkeep/Runtime/Save/SaveMigrations.cs')
PROG    = read('Assets/Dawnkeep/Runtime/Meta/Progress.cs')
PROGS   = read('Assets/Dawnkeep/Runtime/Meta/ProgressSettings.cs')
STARS   = read('Assets/Dawnkeep/Runtime/Campaign/StageStars.cs')
OUTCOME = read('Assets/Dawnkeep/Runtime/Flow/StageOutcome.cs')
NUMBER  = read('Assets/Dawnkeep/Runtime/UI/ArabicNumber.cs')
NODE    = read('Assets/Dawnkeep/Runtime/Meta/ResearchNode.cs')
GEARSET = read('Assets/Editor/DawnkeepEquipmentSetup.cs')
GEAR    = read('Assets/Dawnkeep/Runtime/Equipment/EquipmentDefinition.cs')
METASET = read('Assets/Editor/DawnkeepMetaSetup.cs')
SPEC    = read('docs/DAWNKEEP_SPEC.md')

SPEC21 = SPEC[SPEC.index('## 21. الاقتصاد الدائم'):SPEC.index('## 22.')]

ok = True
def check(label, good, note=''):
    global ok
    ok = ok and bool(good)
    print(('  ✓ ' if good else '  ✗ ') + label + note)

# ── العملات الدائمة ───────────────────────────────────────────────────
print('── العملات الدائمة (§21) ─────────────────')

block = SAVE[SAVE.index('public class Currencies'):]
block = block[:block.index('\n    }')]

live = re.findall(r'^\s*public int (\w+);', block, re.M)
legacy = [f for f in live
          if re.search(r'مهجور[^\n]*\n\s*public int ' + f + ';', block)]
active = [f for f in live if f not in legacy]

wanted = int(re.search(r'استخدم (\S+) عملات فقط', SPEC21).group(1) == 'ثلاث') and 3

print(f'{"العملة":<16}حالُها')
for f in live:
    print(f'{f:<16}{"مهجورة — للترحيل وحده" if f in legacy else "حيّة"}')

print()
check(f'العملات الحيّة **{wanted}** كما تشترط §21', len(active) == wanted,
      f'  ({"، ".join(active)})')

for name in ('Gold', 'DawnShards', 'Crystals'):
    check(f'  وفيها «{name}»', name in active)

check('والفضّة ليست عملةً دائمة (§21)', 'Silver' not in live,
      '  («تستخدم داخل المرحلة فقط»)')

# ── الترحيل: لا يضيع رصيدُ أحد ────────────────────────────────────────
print()
print('── الترحيل من الصيغة الأولى (§27) ────────')

version = int(re.search(r'Current = (\d+)', FORMAT).group(1))
check('رُفعت صيغةُ الحفظ (حقلان يُقرآن ولا يُكتبان)', version >= 2,
      f'  (الصيغة {version})')

check('والمهجورتان **لم تُحذفا** من الصنف', len(legacy) == 2,
      f'  ({"، ".join(legacy)} — لو حُذفتا لضاع رصيدُ كل لاعب)')

check('وخطوةُ الترحيل **تجمعهما** ولا تأخذ الأكبر',
      'ResearchStars + data.Currencies.Essence' in MIGRATE,
      '  (من ادّخر عشرين وأربعين يملك ستّين)')

check('ثمّ تُصفَّران فلا تُجمعان مرّتين',
      'data.Currencies.ResearchStars = 0;' in MIGRATE
      and 'data.Currencies.Essence = 0;' in MIGRATE)

# ── صيغة المكافأة، حرفاً حرفاً من §21 ────────────────────────────────
print()
print('── صيغة المكافأة (§21) ───────────────────')

def spec_num(pattern):
    m = re.search(pattern, SPEC21)
    return int(m.group(1)) if m else None

want = {
    'goldBase':          spec_num(r'Gold = (\d+) \+'),
    'goldPerStage':      spec_num(r'Gold = \d+ \+ (\d+) ×'),
    'goldPerStar':       spec_num(r'\+ (\d+) × عدد النجوم'),
    'accountXpBase':     spec_num(r'Account XP = (\d+) \+'),
    'accountXpPerStage': spec_num(r'Account XP = \d+ \+ (\d+) ×'),
    'heroXpBase':        spec_num(r'Hero XP = (\d+) \+'),
    'heroXpPerStage':    spec_num(r'Hero XP = \d+ \+ (\d+) ×'),
}

print(f'{"المقبض":<20}{"§21":>6}{"الكود":>7}')
for field, expected in want.items():
    got = re.search(field + r' = (\d+)', PROGS)
    got = int(got.group(1)) if got else None
    print(f'{field:<20}{expected if expected is not None else "؟":>6}{got if got is not None else "؟":>7}')
    check(f'  {field}', expected is not None and expected == got)

# والصيغة مُركَّبة كما نصّت لا مقاربةً لها
check('والذهب يُركَّب: أساسٌ + مرحلةٌ + نجوم',
      'settings.GoldBase' in PROG and 'settings.GoldPerStage * number' in PROG
      and 'settings.GoldPerStar * Mathf.Max(0, newStars)' in PROG)

shardCap = int(re.search(r'shardCap = (\d+)', PROGS).group(1))
specCap = int(re.search(r'Dawn Shards: من 0 إلى (\d+)', SPEC21).group(1))
check(f'والشظايا «من 0 إلى {specCap}»', shardCap == specCap, f'  ({shardCap})')

check('  «حسب الأهداف **والزعماء**»',
      'newStars' in PROG and 'metBoss' in PROG)

check('ومخطّطٌ واحدٌ مضمون لأوّل إنهاء (§21 و§19)',
      'campaign.Complete()' in OUTCOME)

# ── النجوم ────────────────────────────────────────────────────────────
print()
print('── النجوم الثلاث ─────────────────────────')

check('ثلاثُ نجومٍ لا أكثر', 'int stars = 1;' in STARS and STARS.count('stars++') == 2)
check('والثانية والثالثة مشروطتان بالإنجاز',
      'if (!victory)\n            {\n                return 0;' in STARS)
check('و**الجديدة** وحدها تُثري (§21: «النجوم الجديدة»)',
      'Fresh(' in STARS and 'earned - had' in STARS)
check('وأفضلُ ما بُلغ يُحفَظ لا آخرُه',
      'if (stars > StarValues[i])' in SAVE,
      '  (من نال ثلاثاً ثمّ أعاد فنال واحدةً لم يتراجع)')
check('ونجمةُ «لم يسقط مبنى» تُقاس من عدّادٍ حقيقيّ',
      'buildings.Lost == 0' in STARS
      and 'Lost++' in read('Assets/Dawnkeep/Runtime/Building/BuildingDirector.cs'))

# ── منع التضخّم ───────────────────────────────────────────────────────
print()
print('── منع التضخّم (§21) ─────────────────────')

shorten = int(re.search(r'ShortenAbove = (\d+)', NUMBER).group(1))
specShorten = int(re.search(r'K وM فقط بعد ([\d,]+)', SPEC21).group(1).replace(',', ''))
check(f'«استخدم K وM فقط بعد {specShorten:,}»', shorten == specShorten,
      f'  (الحدّ {shorten})')

check('  والاختصار يقصّ ولا يقرّب لأعلى',
      '(magnitude % unit) * 10 / unit' in NUMBER,
      '  (٩٫٩ألف لتسعةِ آلافٍ وتسعمئةٍ وتسعين يوهم بعشرة آلاف)')

check('  ويُستعمَل في عرض الأرصدة',
      'WriteShort' in read('Assets/Dawnkeep/Runtime/UI/LoadoutPanel.cs')
      and 'WriteShort' in read('Assets/Dawnkeep/Runtime/Flow/MainMenu.cs'))

check('«تكاليف التطوير ترتفع تدريجيًا»',
      'GrowthPerLevel' in GEAR and 'GoldFor' in NODE)

# ── المحاكاة: أتكفي الشظايا سبيلَيها؟ ────────────────────────────────
print()
print('── حملةٌ من أربعين، مقيسة ────────────────')

GB = int(re.search(r'goldBase = (\d+)', PROGS).group(1))
GS = int(re.search(r'goldPerStage = (\d+)', PROGS).group(1))
GT = int(re.search(r'goldPerStar = (\d+)', PROGS).group(1))

gold = shards = 0
for stage in range(1, 41):
    stars = 3                      # لاعبٌ متقن
    gold += GB + GS * stage + GT * stars
    shards += min(stars + 1, shardCap)

print(f'ذهبٌ: {gold:,}   ·   شظايا: {shards}')

# ثمن شجرة البحث كلّها (§16). **يُقرأ لكل عقدةٍ على حدة** مع احترام
# القيمة الافتراضية للوسيط: `stars` وسيطٌ اختياريّ، وأكثرُ العقد لا تمرّره
# — فعدُّ مواضعِ `stars:` وحدها يقرأ أربعاً من أربع عشرة ويسكت.
DEFAULT_STARS = int(re.search(r'int stars = (\d+)\)', METASET).group(1))

tree = []
for m in re.finditer(r'Node\("(\w+)"', METASET):
    depth, j = 0, METASET.index('(', m.start())
    while j < len(METASET):
        if METASET[j] == '(':
            depth += 1
        elif METASET[j] == ')':
            depth -= 1
            if depth == 0:
                break
        j += 1

    call = METASET[m.start():j]
    ranks = re.search(r'ranks:\s*(\d+)', call)
    stars = re.search(r'stars:\s*(\d+)', call)
    tree.append((m.group(1),
                 int(ranks.group(1)) if ranks else 1,
                 int(stars.group(1)) if stars else DEFAULT_STARS))

# حارسٌ ضدّ جدولٍ فارغ: فحصٌ يقرأ صفراً ويمرّ هو فحصٌ لا يفحص
check('قُرئت عقدُ البحث من الباني', len(tree) >= 10,
      f'  ({len(tree)} عقدة)')

treeShards = sum(r * st for _, r, st in tree)
print(f'شجرةُ البحث كاملةً: {treeShards} شظيّة ({len(tree)} عقدة).')

check('وحملةٌ واحدة لا تُتمّ الشجرة (§16: تدرّجٌ)', shards < treeShards,
      f'  ({shards} من {treeShards})')
check('  لكنّها تفتح منها شيئاً معتبراً', shards >= treeShards * 0.15,
      f'  ({shards / treeShards:.0%} من الشجرة لو صُرفت كلّها فيها)')

check('والذهب لا يتضخّم: حملةٌ كاملة دون المليون', gold < 1000000,
      f'  ({gold:,} — ويُعرض «{gold // 1000}٫{(gold % 1000) // 100}ألف»)')

check('ولا يبلغ حدَّ الاختصار من مرحلةٍ واحدة',
      GB + GS * 40 + GT * 3 < shorten,
      f'  (أثقلُ مرحلة تعطي {GB + GS * 40 + GT * 3})')

print()
print('── المصالحة الموثَّقة ─────────────────────')
print('§16 تسمّي عملة البحث «Research Star»، و§17 تسمّي عملة الترقية')
print('«Essence»، و§21 تقول «ثلاث عملات فقط» ولا تعدّ أيّاً منهما — بل')
print('«Dawn Shards» التي تصفها بأنّها **من النجوم** وتُصرف **لصناعة**')
print('الندرات. فهي الاثنتان باسمٍ واحد: الاسم من §21 لأنّها التي تعدّ،')
print('والميكانيكا من §16 و§17 كما هي.')
print()
print('وأثرُ الدمج مقصود: البحث والعتاد يتنافسان على جيبٍ واحد، فترقيةُ')
print('سيفٍ ثمنُها تأجيلُ عقدة بحث — اختيارٌ لم يكن قائماً حين كان لكلٍّ جيبُه.')

sys.exit(0 if ok else 1)
