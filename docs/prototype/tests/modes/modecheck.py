# -*- coding: utf-8 -*-
"""
فحص أنماط اللعب (§20).

  cd docs/prototype/tests/modes && python3 modecheck.py

خطر §20 أن يصير النمط **اسماً على زرّ**: يُختار «بلا نهاية» فيُلعَب نفسُ
ما يُلعَب في الحملة. فالفحص يمشي من كل نمطٍ إلى ما يبدّله فعلاً — البذرة،
وعدد الليالي، وفضّة البداية، وتردّد الزعماء، وقراءة العتاد.

ويحرس شرطين نصّيّين من §20:
  · **«لا تنفذ PvP حقيقيًا الآن»** — فلا أثر له في الشيفرة.
  · **«لوحة أفضل رقم محلية»** — فلا رقمَ عالميّ يُدّعى بلا خادم.
"""
import io, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

MODES   = read('Assets/Dawnkeep/Runtime/Modes/PlayMode.cs')
DIR     = read('Assets/Dawnkeep/Runtime/Modes/ModeDirector.cs')
GEN     = read('Assets/Dawnkeep/Runtime/Combat/WaveGenSettings.cs')
OUTCOME = read('Assets/Dawnkeep/Runtime/Flow/StageOutcome.cs')
TREAS   = read('Assets/Dawnkeep/Runtime/Economy/Treasury.cs')
LOADOUT = read('Assets/Dawnkeep/Runtime/Equipment/Loadout.cs')
DOCTRINE= read('Assets/Dawnkeep/Runtime/Doctrine/DoctrineBook.cs')
SAVE    = read('Assets/Dawnkeep/Runtime/Save/SaveData.cs')
PANEL   = read('Assets/Dawnkeep/Runtime/UI/ModePanel.cs')
SPEC    = read('docs/DAWNKEEP_SPEC.md')

ok = True
def check(label, good, note=''):
    global ok
    ok = ok and bool(good)
    print(('  ✓ ' if good else '  ✗ ') + label + note)

NAMES = re.findall(r'^\s{8}(\w+)\s*=\s*\d+,', MODES, re.M)
SPEC20 = SPEC[SPEC.index('## 20. أنماط اللعب'):SPEC.index('## 21.')]
LISTED = re.findall(r'^### (\S.*)$', SPEC20, re.M)

def num(name, default=0):
    m = re.search(name + r'\s*=\s*(-?\d+)\s*;', DIR)
    return int(m.group(1)) if m else default

NIGHTS = {
    'Endless':    num('endlessNights'),
    'DailyTrial': num('dailyNights', 7),
    'BossHunt':   num('bossHuntNights', 3),
}
SILVER = num('dailySilver', 320)

print('── الأنماط (§20) ─────────────────────────')
print(f'{"النمط":<14}{"ليالٍ":>7}   ما يبدّله')
for name in NAMES:
    n = NIGHTS.get(name)
    nights = 'بلا نهاية' if n == 0 else (str(n) if n else 'الحملة')
    print(f'{name:<14}{nights:>7}')

print()
check(f'§20 تعدّ {len(LISTED)} نمطاً، والتعداد يحمل ما يُنفَّذ منها',
      len(NAMES) == len(LISTED) - 1,
      f'  (المواصفات {len(LISTED)} فيها PvP · التعداد {len(NAMES)} بلا PvP)')

# §20: «ليس ضمن الإصدار الأول. لا تنفذ PvP حقيقيًا الآن.»
RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep')):
    for f in files:
        if f.endswith('.cs'):
            RUNTIME[f[:-3]] = io.open(os.path.join(base, f), encoding='utf-8').read()

def code(text):
    """الشيفرة بلا تعليق: **تعليقٌ يقول «لا PvP هنا» ليس PvP**، وفحصٌ
    يقرأ التعليقات يمنع من يكتب أنّه امتنع."""
    out = []
    for line in text.split('\n'):
        bare = line.strip()
        if bare.startswith('//') or bare.startswith('///'):
            continue
        out.append(line.split('//')[0] if '//' in line else line)
    return '\n'.join(out)

pvp = sorted(n for n, t in RUNTIME.items()
             if re.search(r'\bPvP\b|\bPvp\b|\bVersus\b|\bMatchmak', code(t)))
check('«لا تنفذ PvP حقيقيًا الآن» — ولا أثرَ له في الشيفرة', not pvp,
      '' if not pvp else f'  ({"، ".join(pvp)})')

check('  ولا زرَّ يعد به في الشاشة (§17)',
      'PvP' not in code(PANEL)
      and not re.search(r'onClick\.AddListener\((?:delegate \{ )?\w*[Pp]vp', PANEL))

check('  وبنيةُ الحفظ لا تمنعه لاحقاً (§20)',
      'class ModeRecords' in SAVE and 'DeviceId' in SAVE,
      '  (كتلٌ مستقلّة ومعرّفُ جهاز — تُضاف كتلةٌ ولا يُكسَر ما قبلها)')

# ── ما يبدّله كل نمط ──────────────────────────────────────────────────
print()
print('── ما يبدّله كل نمط فعلاً ────────────────')

check('البذرة: `WaveGenSettings.Seed` تمرّ بالنمط',
      'ModeDirector.SeedFor(' in GEN)
check('عددُ الليالي: شرط الفوز يمرّ به',
      'ModeDirector.NightsFor(' in OUTCOME)
check('فضّةُ البداية: الخزينة تمرّ به',
      'ModeDirector.SilverFor(' in TREAS)
check('تردّدُ الزعماء: صيد الزعماء يجعلها كل ليلة',
      'PlayMode.BossHunt' in GEN and '? 1 :' in GEN)
check('والعتاد لا يُقرأ في اليوميّة (§20: «Loadout محدد مسبقًا»)',
      'ModeDirector.UsesLoadout' in LOADOUT)
check('  ولا العقيدة كذلك',
      'ModeDirector.UsesLoadout' in DOCTRINE
      and DOCTRINE.count('ModeDirector.UsesLoadout') >= 2,
      '  (المضاعف والفعل الافتتاحيّ معاً)')

# ── «بلا نهاية» بلا نهاية فعلاً ───────────────────────────────────────
print()
check('«بلا نهاية» لا فوزَ فيه: صفرُ ليالٍ يعني ألّا يتحقّق شرط الفوز',
      NIGHTS['Endless'] == 0 and 'nights <= 0 ||' in OUTCOME,
      '  (وحبسُ الفوز خلف رقمٍ كبير نهايةٌ بعيدة لا «بلا نهاية»)')

# الرقم يُسجَّل من `Resolve` — وهي تُنادى من فرعَي الفوز **والخسارة**
# معاً. ولو سُجّل عند الفوز وحده لَما سجّل «بلا نهاية» رقماً أبداً: لا
# فوزَ فيه، وكل جولةٍ تنتهي بالسقوط.
resolve = OUTCOME[OUTCOME.index('private void Resolve('):]
resolve = resolve[:resolve.index('private void RecordMode')]
check('  والرقم يُسجَّل من `Resolve` لا من فرع الفوز وحده',
      'RecordMode();' in resolve,
      '  (وإلّا لم يسجّل «بلا نهاية» رقماً أبداً)')

check('  والرقم عددُ الليالي: أبسطُ ما يُقاس ويُفهَم',
      'modes.Record(Dawnkeep.Modes.ModeDirector.Current, WavesCleared)' in OUTCOME)

# ── بذرة اليوم: واحدةٌ للجميع بلا خادم ────────────────────────────────
print()
print('── بذرة التجربة اليومية ──────────────────')

# نفس الحساب المكتوب في `SeedFor`
formula = re.search(r'return \(day\.Year \* (\d+)\) \+ \(day\.Month \* (\d+)\) \+ day\.Day;', DIR)
check('بذرة اليوم تُشتقّ من التاريخ لا من عشوائيّ', formula is not None)

if formula:
    a, b = int(formula.group(1)), int(formula.group(2))
    today = datetime.datetime.utcnow().date()
    seed = today.year * a + today.month * b + today.day
    print(f'  اليوم {today}: البذرة {seed}')

    # يومان مختلفان لا يعطيان البذرة نفسها
    seen = set()
    d = datetime.date(2026, 1, 1)
    clash = None
    for _ in range(400):
        s = d.year * a + d.month * b + d.day
        if s in seen:
            clash = d
            break
        seen.add(s)
        d += datetime.timedelta(days=1)

    check('  ولا يومان يتشاركان بذرةً في السنة', clash is None,
          '' if clash is None else f'  (تكرّرت عند {clash})')

check('  وواحدةٌ للجميع بلا خادمٍ ولا اتّصال (§20)',
      'DateTime.UtcNow.Date' in DIR and 'Random' not in
      DIR[DIR.index('case PlayMode.DailyTrial'):DIR.index('case PlayMode.Endless')],
      '  (بالتوقيت العالمي لا المحلّي: وإلّا اختلف اليوم بين بلدين)')

check('«بلا نهاية» بذرتُه يبدّلها اللاعب',
      'RerollEndless' in DIR and 'RerollEndless' in PANEL)

# ── الفتح من الحملة ───────────────────────────────────────────────────
print()
print('── الفتح (§20) ───────────────────────────')

check('«بلا نهاية» يفتح بعد المنطقة الأولى',
      'case PlayMode.Endless:\n                    return ZoneDone(1);' in DIR)
check('و«صيد الزعماء» بعد الثانية',
      'case PlayMode.BossHunt:\n                    return ZoneDone(2);' in DIR)
check('والقياس من المراحل المنجَزة لا من عدّادٍ ثانٍ',
      'campaign.ClearedIn(zone) >= zone.Stages' in DIR)
check('والمقفل يُعرَض بشرطه لا يُخفى',
      'ModeLockedZone' in PANEL)

# ── اللوحة المحلّية ───────────────────────────────────────────────────
print()
print('── لوحة الأرقام (§20: «محلية») ───────────')

check('الأرقام في ملفّ الحفظ لا في خادم',
      'EndlessBest' in SAVE and 'DailyBest' in SAVE and 'BossHuntBest' in SAVE)
check('ولا يُدّعى رقمٌ عالميّ بلا خادمٍ يتحقّق',
      not re.search(r'Global|Leaderboard|Worldwide', DIR + PANEL))
check('ورقمُ اليوميّة يخصّ **يومَه**',
      'records.DailyDayUtc == today' in DIR,
      '  (رقمُ أمسٍ ليس رقم اليوم)')
check('ولا يُسجَّل إلّا ما فاق ما سبق',
      'if (score <= best)' in DIR)
check('وللحملة لا رقم: تقدّمُها في خريطتها',
      'PlayMode.Campaign' in PANEL and '_rowState[row].text = string.Empty' in PANEL)

# ── ما تفترق فيه الأنماط عملياً ───────────────────────────────────────
print()
print('── الفرق المقيس ──────────────────────────')
print(f'{"النمط":<14}{"ليالٍ":>9}{"فضّة":>8}{"زعيم كل":>9}{"عتادُك":>9}')
BOSSEVERY = int(re.search(r'private int bossEvery = (\d+)', GEN).group(1))
STARTSILVER = int(re.search(r'private int startingSilver = (\d+)', TREAS).group(1))
rows = [
    ('Campaign', 10, STARTSILVER, BOSSEVERY, 'نعم'),
    ('Endless', 0, STARTSILVER, BOSSEVERY, 'نعم'),
    ('DailyTrial', NIGHTS['DailyTrial'], SILVER, BOSSEVERY, 'لا'),
    ('BossHunt', NIGHTS['BossHunt'], STARTSILVER, 1, 'نعم'),
]
for name, n, silver, boss, gear in rows:
    print(f'{name:<14}{("∞" if n == 0 else str(n)):>9}{silver:>8}{boss:>9}{gear:>9}')

distinct = {(n, s, b, g) for _, n, s, b, g in rows}
check('لا نمطان متطابقان في كل ما يبدّلانه', len(distinct) == len(rows),
      f'  ({len(distinct)} من {len(rows)})')

print()
print('── ما بقي من §20، وسببه ──────────────────')
print('§20 تذكر لليوميّة «Seed واحد للجميع **عند اتصال الخدمة**» و«لا ترفع')
print('النتيجة العالمية حتى التحقق». فالبذرة اليوم من التاريخ — واحدةٌ')
print('للجميع بلا خادم — واللوحة محلّية كما تنصّ §20 نفسها. وما ينتظر')
print('الخادمَ هو **رفعُ** الرقم لا حسابُه، وهو مؤجَّلٌ مع §27 السحابية.')
print('وEndless «مكافأة أسبوعية محدودة» تنتظر §21 (الاقتصاد الدائم).')

sys.exit(0 if ok else 1)
