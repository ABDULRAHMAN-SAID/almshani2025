# -*- coding: utf-8 -*-
"""
فحص الأداء والحشود (§31).

  cd docs/prototype/tests/perf && python3 perfcheck.py

لا يقيس إطاراتٍ — ذاك عمل `PerformanceProbe` على جهاز المستخدم. هذا يفحص
ما **يُقرأ من الشيفرة**: الميزانيات، وتردّد النبضة، والتجميع، والقواعد التي
نصّت عليها §31 نصّاً.

وأثقلُ ما فيه **تدقيق التخصيص**: §31 تهدف إلى «صفر بايت في أغلب الإطارات
بعد التسخين»، وأشهرُ ما يخرقه سطرٌ واحد — `new` في حلقة إطار، أو LINQ،
أو `foreach` على `List` عبر واجهة، أو نصٌّ يُبنى بالجمع. فالفحص يمرّ على
كل دالّة تُنادى كل إطار ويصيح على ما يخصّص.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

PERF   = read('Assets/Dawnkeep/Runtime/Performance/PerformanceSettings.cs')
PROBE  = read('Assets/Dawnkeep/Runtime/Performance/PerformanceProbe.cs')
ARENA  = read('Assets/Editor/DawnkeepArenaSetup.cs')
COMBAT = read('Assets/Dawnkeep/Runtime/Combat/CombatDirector.cs')
WAVES  = read('Assets/Dawnkeep/Runtime/Combat/WaveDirector.cs')
BARS   = read('Assets/Dawnkeep/Runtime/UI/HealthBarPool.cs')

ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

def setp(name, cast=float, src=ARENA):
    m = re.search(r'SetPrivate\(settings,\s*"' + name + r'",\s*(-?[0-9.]+)f?\)', src)
    return cast(m.group(1)) if m else None

print('── الميزانية (§31) ──────────────────────')
LOW, MED, HIGH = setp('lowBudget', int), setp('mediumBudget', int), setp('highBudget', int)
SIM, DIST = setp('simulationHz'), setp('distantHz')

print(f'  خفيف {LOW} · متوسّط {MED} · عالٍ {HIGH} عدوّاً نشطاً')
print(f'  نبضة المحاكاة {SIM:g} هرتز · القرارات البعيدة {DIST:g} هرتز')
print()

check('الميزانيات 140 و280 و500 كما نصّت §31',
      (LOW, MED, HIGH) == (140, 280, 500), f'  ({LOW}/{MED}/{HIGH})')
check('نبضة المحاكاة بين 20 و30 هرتز (§31)', SIM is not None and 20 <= SIM <= 30,
      f'  ({SIM:g})')
check('والقرارات البعيدة 4 هرتز (§31)', DIST == 4, f'  ({DIST:g})')

check('السقف على **الأحياء** لا على الموجة',
      'HasRoomForHorde' in COMBAT and 'LiveHorde < budget' in COMBAT)
check('وما لا يتّسع يُؤجَّل ولا يُلغى',
      'while (!HasRoom())' in WAVES and 'yield return WaitForRoom' in WAVES)
check('ومهلة الانتظار كائنٌ واحد يُعاد لا `new` في حلقة',
      'static readonly WaitForSeconds WaitForRoom' in WAVES)

print()
print('── المحاكاة (§31) ───────────────────────')
check('نبضةٌ تفصل قرارات الذكاء عن الرسم',
      'bool simulate' in COMBAT and '_simLeft' in COMBAT)
def guarded(source, marker, token):
    """هل يقع `token` داخل أحد أجسام `if (marker)`؟

    البحث في **كلّ** المواضع لا في أوّلها: أوّل `if (simulate)` هنا يعيد ضبط
    المؤقّت، والبناء في الثاني — وفحصٌ ينظر إلى الأوّل وحده يقول «ليس فيه»
    عن شيءٍ فيه. وهو ما فعله أوّل تشغيلٍ لهذا الفحص.
    """
    start = 0
    while True:
        i = source.find(marker, start)
        if i < 0:
            return False
        start = i + 1
        if token in block_after_index(source, i):
            return True

def block_after_index(source, index):
    """جسم القوس التالي لموضعٍ، بموازنة الأقواس لا بتعبيرٍ نمطيّ."""
    i = source.find('{', index)
    if i < 0:
        return ''
    depth, j = 0, i
    while j < len(source):
        if source[j] == '{':
            depth += 1
        elif source[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    return source[i:j]

def block_after(source, marker):
    """جسم `if` بعد مرساةٍ، بموازنة الأقواس. التعبير النمطيّ `[^}]*` يقف
    عند أوّل قوسٍ داخليّ، فيقول «ليس فيه» عن شيءٍ فيه — وهو ما فعله أوّل
    تشغيلٍ لهذا الفحص على حلقةٍ داخل الشرط."""
    i = source.find(marker)
    if i < 0:
        return ''
    i = source.index('{', i)
    depth, j = 0, i
    while j < len(source):
        if source[j] == '{':
            depth += 1
        elif source[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    return source[i:j]

check('وبناء الشبكة المكانية على النبضة لا كل إطار',
      guarded(COMBAT, 'if (simulate)', '_hash.Rebuild')
      and COMBAT.count('_hash.Rebuild') == 1)
check('وقياس النور كذلك',
      guarded(COMBAT, 'if (simulate)', 'unit.LightLevel =')
      and COMBAT.count('unit.LightLevel =') == 1)
check('وإطارٌ طويل لا يُلاحَق بنبضاتٍ متراكمة',
      '_simLeft < 0f' in COMBAT)

check('المقذوفات بلا `Rigidbody` لكل واحدة (§31)',
      'Rigidbody' not in read('Assets/Dawnkeep/Runtime/Combat/ProjectilePool.cs'))
check('ولا `Collider` لكل مؤثّر (§31)',
      'Collider' not in read('Assets/Dawnkeep/Runtime/Combat/Hazard.cs')
      and 'Collider' not in read('Assets/Dawnkeep/Runtime/Combat/HazardField.cs'))

print()
print('── التجميع (§31) ────────────────────────')
check('المجمّعات تُسخَّن مسبقاً بحسب الموجات',
      'private void PreWarm()' in WAVES and 'performance.PreWarmPools' in WAVES)
check('والتسخين عند الإقلاع لا عند أوّل صيحة',
      re.search(r'private void Start\(\)\s*\{\s*PreWarm\(\);', WAVES) is not None)
check('لا مادّة فريدة لكل وحدة: `MaterialPropertyBlock`',
      'MaterialPropertyBlock' in read('Assets/Dawnkeep/Runtime/Combat/Unit.cs'))
check('أشرطة الصحّة للمتضرّرين وحدهم (§31)',
      'ratio >= showBelow' in BARS)
check('ويمكن تعطيلها',
      'ToggleHealthBars' in read('Assets/Dawnkeep/Runtime/UI/PauseMenu.cs'))

print()
print('── ساحة القياس (§31) ────────────────────')
pops = re.search(r'Populations\s*=\s*\{([^}]*)\}', ARENA)
pops = [int(x) for x in re.findall(r'\d+', pops.group(1))] if pops else []
soldiers = re.search(r'Soldiers = (\d+)', ARENA)
towers = re.search(r'Towers = (\d+)', ARENA)

check('مئة ومئتان وخمسون وخمسمئة عدوّ', pops == [100, 250, 500], f'  ({pops})')
check('وخمسون جنديّاً', soldiers and int(soldiers.group(1)) == 50,
      f'  ({soldiers.group(1) if soldiers else "؟"})')
check('وعشرون برجاً', towers and int(towers.group(1)) == 20,
      f'  ({towers.group(1) if towers else "؟"})')
check('ومقذوفات ومؤثّرات',
      'ProjectilePool' in ARENA and 'HazardField' in ARENA)
check('والأبراج ترمي فعلاً (تُضمّ إلى حلقة المباني)',
      'buildings.Adopt(building)' in ARENA
      and 'public void Adopt(' in read('Assets/Dawnkeep/Runtime/Building/BuildingDirector.cs'))

for label, token in (('الإطارات', 'إطاراً/ث'), ('زمن الخيط الرئيس', 'أسوأ إطار'),
                     ('التخصيص لكل إطار', 'بايت/إطار'),
                     ('عدد الكائنات', 'وحدات في الذروة'),
                     ('زمن اختيار الهدف', 'اختيار الهدف')):
    print(f'      {"·" if token in PROBE else "✗"} {label}')

missing = [l for l, t in (('الإطارات', 'إطاراً/ث'), ('زمن الخيط', 'أسوأ إطار'),
                          ('التخصيص', 'بايت/إطار'), ('الكائنات', 'وحدات في الذروة'),
                          ('اختيار الهدف', 'اختيار الهدف')) if t not in PROBE]
check('التقرير يسجّل الخمسة التي تطلبها §31', not missing,
      '' if not missing else f'  (ناقص: {"، ".join(missing)})')

check('ويقيس بعد التسخين لا من أوّل إطار', 'warmUpSeconds' in PROBE)
check('ويقول صراحةً إن كان التخصيص لا يُقاس في بناء الإصدار',
      'بناء الإصدار' in PROBE)
check('وقياس زمن الهدف مطفأ في اللعب العادي',
      'if (Measuring)' in COMBAT and 'Measuring { get; set; }' in COMBAT)

# ── تدقيق التخصيص في حلقات الإطار ─────────────────────────────────
print()
print('── تخصيصٌ في حلقة إطار (§31: صفر بايت) ───')

# الجذور: ما ينادِيه المحرّك كل إطار. وما دونها يُستخرَج بالمشي على
# النداءات — القائمةُ المكتوبة باليد تنسى، وقد نسيت: `TickSummon` دخلت
# مسار الإطار وفيها بحثٌ في المشهد، والفحص ساكت لأنّ اسمها ليس فيها.
# الجذور: ما ينادِيه المحرّك كل إطار، ومعها مداخلُ تُنادى من كائنٍ آخر في
# الإطار (`_projectiles.ResolveHits`) فلا يبلغها المشي داخل الملفّ.
ROOTS = ('Update', 'LateUpdate', 'FixedUpdate')
SEEDS = ('ResolveHits', 'Sample', 'TickChain', 'TickPacked', 'Drag',
         'ReadTouch', 'ReadStick', 'ArmourCutAt', 'NearestLit')

# ثمّ يُمشى من كلٍّ منها إلى ما تنادِيه **داخل ملفّها**. القائمة المكتوبة
# باليد تنسى، وقد نسيت: `TickSummon` دخلت مسار الإطار وفيها بحثٌ في المشهد،
# والفحص ساكتٌ لأنّ اسمها لم يكن فيها.

# `new` المسموح: أنواع القيمة لا تخصّص على الكومة
VALUE_TYPES = ('Vector2', 'Vector3', 'Vector4', 'Quaternion', 'Color', 'Color32',
               'Rect', 'Bounds', 'Matrix4x4', 'Ray', 'RaycastHit')

# بحثٌ في المشهد: ممنوع داخل حلقة الإطار (§1 في CLAUDE.md)
SCENE_SEARCH = (r'\bGameObject\.Find\w*\(', r'\bFindObjectsByType\s*<',
                r'\bFindAnyObjectByType\s*<', r'\bFindFirstObjectByType\s*<',
                r'\bFindObjectOfType\s*<', r'\bGetComponent\w*\s*<')

DECL = re.compile(
    r'\b(?:private|public|protected|internal)[^\n;=]*?\b(\w+)\s*\([^)]*\)\s*(?:\n\s*)?\{')

def block(source, brace):
    """جسم الدالّة بموازنة الأقواس — لا بتعبيرٍ نمطيّ يقف عند أوّل قوسٍ داخليّ."""
    depth, j = 0, brace
    while j < len(source):
        if source[j] == '{':
            depth += 1
        elif source[j] == '}':
            depth -= 1
            if depth == 0:
                break
        j += 1
    return source[brace:j]

FILES = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs'):
            path = os.path.join(base, f)
            FILES[os.path.relpath(path, ROOT)] = io.open(path, encoding='utf-8').read()

# فهرس الدوالّ: الملفّ ← الاسم ← الجسم
DEFS = {}
for path, text in sorted(FILES.items()):
    here = {}
    for m in DECL.finditer(text):
        here[m.group(1)] = block(text, text.index('{', m.end() - 1))
    DEFS[path] = here

def strip(body):
    return '\n'.join(l for l in body.split('\n')
                     if not l.strip().startswith('//'))

# نداءٌ غير مُسنَد: `Foo(` لا `x.Foo(` ولا `new Foo(` — فالمسنَد إلى كائنٍ
# آخر صنفٌ آخر، ومتابعتُه بالاسم وحده تجرّ كل متشابهات الأسماء في المشروع.
CALL = re.compile(r'(?<![.\w])(?<!new )([A-Z]\w+)\s*\(')

hot, queue, seen = {}, [], set()
for path, here in DEFS.items():
    for name in here:
        if name in ROOTS or name in SEEDS:
            queue.append((path, name))

while queue:
    path, name = queue.pop()
    if (path, name) in seen:
        continue
    seen.add((path, name))
    body = DEFS[path].get(name)
    if body is None:
        continue
    hot[(path, name)] = body
    for c in CALL.findall(strip(body)):
        if c in DEFS[path] and (path, c) not in seen:
            queue.append((path, c))

# ── استثناءات، مكتوبةً بأسبابها ────────────────────────────────────
# لا تُحذف الحالة من الفحص بل تُنقل إلى هنا بسببها، وتُطبع في التقرير.
# استثناءٌ مكتوب يُراجَع؛ واسمٌ ناقصٌ من قائمةٍ يدويّة لا يُراجَع أبداً.
EXCUSED = {
    ('BossDirector', 'MakeEgg'):
        'احتياط نموّ المجمّع: المجمّع يُسخَّن عند دخول الزعيم، وهذا لزعيمين يبيضان معاً',
    ('BattleHud', 'UpdateKeep'):
        'مشروطٌ بتغيّر مرتبة الحصن — أربع مرّات في الجولة كلّها (§10)',
    ('MainMenu', 'Update'):
        'شاشة القائمة: لا حشد ولا مقذوفات، والبحث مرّةً واحدة عند انطفاء الشعار',
    ('MainMenu', 'Refresh'):
        'يُنادى عند فتح القائمة وبعد كل تغيّر، لا كل إطار',
    ('MainMenu', 'Digits'):
        'نصّ القائمة، من `Refresh` وحدها',
    ('PauseMenu', 'Digits'):
        'لوحة الإيقاف: الزمن موقوف والمشهد ساكن',
    ('PerformanceProbe', 'Finish'):
        'مرّةً واحدة عند نهاية القياس، بعد آخر إطارٍ يُحتسب',
}

offences, excused = [], []
for (path, name), body in sorted(hot.items()):
    code = strip(body)

    for m in re.finditer(r'\bnew\s+([A-Za-z_][\w<>\[\], ]*)', code):
        kind = m.group(1).split('(')[0].split('[')[0].split('<')[0].strip()
        if kind in VALUE_TYPES:
            continue
        offences.append((path, name, 'new ' + kind))

    if re.search(r'\.(Select|Where|OrderBy|ToList|ToArray|Any|First|Sum)\(', code):
        offences.append((path, name, 'LINQ'))

    # نصٌّ يُبنى بالجمع داخل حلقةٍ ساخنة
    if re.search(r'"\s*\+|\+\s*"', code):
        offences.append((path, name, 'بناء نصّ'))

    for pattern in SCENE_SEARCH:
        if re.search(pattern, code):
            offences.append((path, name, 'بحثٌ في المشهد'))
            break

# الفرز: ما له سببٌ مكتوب يُطبع سبباً، وما لا سبب له يُطبع خطأً
kept = []
for path, name, why in offences:
    key = (os.path.basename(path)[:-3], name)
    if key in EXCUSED:
        excused.append((key, why))
    else:
        kept.append((path, name, why))
offences = kept

for (cls, name), why in sorted(set(excused)):
    print(f'      · {cls}.{name}() — {why}  ({EXCUSED[(cls, name)]})')

for path, name, why in offences:
    print(f'      ✗ {os.path.basename(path)[:-3]}.{name}() — {why}')

check('لا تخصيص ولا بحثَ مشهدٍ فيما يُنادى كل إطار', not offences,
      f'  ({len(offences)} موضعاً)' if offences
      else f'  (مُشِيَ من {len(ROOTS)} جذوراً إلى {len(hot)} دالّة)')

sys.exit(0 if ok else 1)
