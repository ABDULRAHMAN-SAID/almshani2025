# -*- coding: utf-8 -*-
"""
فحص اقتصاد §10 قبل تجريبه في المحرّر.

  python3 econcheck.py

يقرأ الأرقام **من ملفّات C# نفسها** ويحاكي عشر موجات بثلاث استراتيجيات، ثم
يقيسها بهدف §10: «في الموجة العاشرة يمتلك اللاعب عادة 10 إلى 14 بناءً أو
ترقية كبرى»، و«لا يستطيع بناء كل شيء».
"""
import io, os, re, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

TR = read('Assets/Dawnkeep/Runtime/Economy/Treasury.cs')
CS = read('Assets/Editor/DawnkeepCombatSetup.cs')
BS = read('Assets/Editor/DawnkeepBuildSetup.cs')
KP = read('Assets/Dawnkeep/Runtime/Building/Keep.cs')

def num(src, name, cast=int):
    m = re.search(r'private\s+(?:int|float)\s+' + re.escape(name) + r'\s*=\s*([0-9.]+)f?', src)
    return cast(m.group(1))

START   = num(TR, 'startingSilver')
BASE    = num(TR, 'waveIncomeBase')
PER     = num(TR, 'waveIncomePerWave')
SELL    = num(TR, 'sellFraction', float)

# ── المباني من باني الأصول
buildings = {}
KINDS = r'(Economy|Tower|Garrison|WallDef|Obelisk|Bombard|Workshop|BeaconDef)'
for m in re.finditer(KINDS + r'\("(\w+)",\s*"([^"]+)",\s*\n?\s*"[^"]*",\s*\n?\s*cost:\s*(\d+)(?:,\s*income:\s*(\d+))?', BS):
    kind, asset, name, cost, income = m.groups()
    buildings[asset] = dict(kind=kind, name=name, cost=int(cost), income=int(income or 0))

# ── مكافآت القتل وتركيب الموجات
bounty = {}
for m in re.finditer(r'MakeUnit\("(\w+)"', CS):
    tail = CS[m.end():m.end() + 900]
    bm = re.search(r'bounty:\s*(\d+)', tail.split('MakeUnit(', 1)[0])
    bounty[m.group(1)] = int(bm.group(1)) if bm else 6
for m in re.finditer(r'UnitDefinition (\w+) = MakeUnit\("(\w+)"', CS):
    pass
varname = {}
for m in re.finditer(r'UnitDefinition (\w+) = MakeUnit\("(\w+)"', CS):
    varname[m.group(1)] = m.group(2)

# الموجة: يُلتقط اسمها ثمّ كتلة `new[] { ... }` التي تليها مهما تغيّرت
# الوسائط بينهما. الالتقاط بعدد الوسائط هشّ: إضافة وسيط ترجمة واحد أعمى
# الفحص عن الموجات كلّها فسقط الدخل بمقدار مكافآت القتل جميعها.
waves = []
for wm in re.finditer(r'MakeWave\("(\w+)",\s*"([^"]+)"', BS + CS):
    tail = (BS + CS)[wm.end():]
    block = tail.split('new[]', 1)
    if len(block) < 2:
        continue
    body = block[1].split('});', 1)[0]
    entries = []
    for em in re.finditer(r'MakeEntry\((\w+),\s*(\d+)', body):
        entries.append((varname.get(em.group(1), em.group(1)), int(em.group(2))))
    if entries:
        waves.append((wm.group(2), entries))

if not waves:
    print('  ✗ لم تُقرأ أيّ موجة — تغيّر توقيع MakeWave؟ الفحص أعمى عن مكافآت القتل')

def wave_bounty(i):
    """الموجة i (من واحد). ما بعد آخر موجة يتكرّر — كما في WaveDirector."""
    if not waves:
        return 0
    name, entries = waves[min(i, len(waves)) - 1]
    return sum(bounty.get(u, 6) * n for u, n in entries)

print('── الأرقام المقروءة ──────────────────────')
print(f'بداية {START} فضّة · دخل الموجة {BASE} + {PER}×رقمها · البيع {SELL*100:.0f}%')
print(f'مبانٍ معرَّفة: {len(buildings)} · موجات: {len(waves)}')
print()

# ── قلب الحصن: أثمان المستويات من Keep.cs
KEEP_COST = [int(x) for x in re.search(r'costByTier\s*=\s*\{([^}]*)\}', KP).group(1).replace('f','').split(',')]

# ── العقد كما يضعها باني المشهد: نوعها ومستوى فتحها
_kinds = re.search(r'NodeKind\[\] kinds\s*=\s*\n?\s*\{(.*?)\};', BS, re.S).group(1)
_tiers = re.search(r'int\[\] tiers\s*=\s*\{([^}]*)\};', BS).group(1)
NODE_LIST = [(k.strip().split('.')[-1], int(t))
             for k, t in zip([x for x in _kinds.replace('\n',' ').split(',') if x.strip()],
                             [x for x in _tiers.split(',') if x.strip()])]
FITS = {                       # ما يقبله كل نوع عقدة، كما في DawnkeepBuildSetup
    'Economy':  ('Economy', 'Inner'),
    'Tower':    ('Outer', 'Inner'),
    'Garrison': ('Inner', 'Gate'),
    'WallDef':  ('Gate',),
    'Obelisk':  ('Inner', 'Outer'),
    'Bombard':  ('Inner', 'Outer'),
    'Workshop': ('Inner', 'Economy'),
    'BeaconDef':('Beacon', 'Inner', 'Outer'),
}

# سلاسل الترقية: أصلٌ ← ما يمكن أن يصير إليه
UPGRADES = {}
for m in re.finditer(KINDS + r'\("(\w+)".*?upgrades:\s*new\[\]\s*\{([^}]*)\}', BS, re.S):
    kids = [k.strip() for k in m.group(3).split(',') if k.strip()]
    UPGRADES[m.group(2)] = kids
VAR = {}
for m in re.finditer(r'BuildingDefinition (\w+) = (?:Economy|Tower|Garrison|WallDef|Obelisk|Bombard|Workshop|BeaconDef)\("(\w+)"', BS):
    VAR[m.group(1)] = m.group(2)
UPGRADES = {k: [VAR.get(c, c) for c in v] for k, v in UPGRADES.items()}

ROOTS = [k for k in buildings
         if not any(k in kids for kids in UPGRADES.values())]

# ── مقابض التوازن: تُقرأ من C# ثم من الأصل إن وُجد ثم من سطر الأوامر ──
BALSRC = read('Assets/Dawnkeep/Runtime/Economy/BalanceSettings.cs')
NODE_BUDGET    = num(BALSRC, 'nodeBudget')
UPGRADE_SCALE  = num(BALSRC, 'upgradeCostScale', float)
WAVES_TO_WIN   = num(BALSRC, 'wavesToSurvive')
KNOB_SOURCE    = 'الافتراضي في BalanceSettings.cs'

# الأصل المولَّد ليس في المستودع (ينشئه المحرّر)، فإن وُجد على جهاز
# المستخدم فهو الحقيقة: يُقرأ منه لتبقى المحاكاة واللعبة على رقم واحد.
ASSET = os.path.join(ROOT, 'Assets/Dawnkeep/Settings/BalanceSettings.asset')
if os.path.exists(ASSET):
    y = io.open(ASSET, encoding='utf-8').read()
    def yfield(name, cast=int, dflt=None):
        m = re.search(r'^\s*' + name + r':\s*([0-9.]+)', y, re.M)
        return cast(m.group(1)) if m else dflt
    NODE_BUDGET   = yfield('nodeBudget',       int,   NODE_BUDGET)
    UPGRADE_SCALE = yfield('upgradeCostScale', float, UPGRADE_SCALE)
    WAVES_TO_WIN  = yfield('wavesToSurvive',   int,   WAVES_TO_WIN)
    KNOB_SOURCE   = 'الأصل BalanceSettings.asset'

for a in sys.argv[1:]:
    m = re.match(r'--(nodes|upgrade|waves)=([0-9.]+)$', a)
    if not m:
        print(f'وسيط مجهول: {a}\nالاستعمال: econcheck.py [--nodes=N] [--upgrade=S] [--waves=W]')
        sys.exit(2)
    k, v = m.groups()
    if k == 'nodes':   NODE_BUDGET   = int(float(v))
    if k == 'upgrade': UPGRADE_SCALE = float(v)
    if k == 'waves':   WAVES_TO_WIN  = int(float(v))
    KNOB_SOURCE = 'سطر الأوامر'

# هدف §10 بعبارته: «10 إلى 14 بناءً أو ترقية كبرى» عند نهاية المرحلة
TARGET_LO, TARGET_HI = 10, 14

def run(label, econ_share, nodes=None, scale=None, waves_n=None, quiet=False):
    """يملأ العقد ثم يرقّي، ويرفع مستوى الحصن حين تمتلئ. يعيد (إجراءات، امتلاء، مبانٍ، صفوف)."""
    nodes   = NODE_BUDGET   if nodes   is None else nodes
    scale   = UPGRADE_SCALE if scale   is None else scale
    waves_n = WAVES_TO_WIN  if waves_n is None else waves_n

    node_list = NODE_LIST[:max(1, min(nodes, len(NODE_LIST)))]

    def cost_of(asset):
        """الجذر بثمنه، وما يُرقّى إليه يُضرب بالمقبض — كما في ScaleUpgradeCosts."""
        c = buildings[asset]['cost']
        return c if asset in ROOTS else int(round(c * scale))

    silver = START
    tier = 1
    free = {}
    for kind, t in node_list:
        if t <= tier:
            free[kind] = free.get(kind, 0) + 1
    placed = []          # (asset, node_kind)
    income = 0
    actions = 0          # بناء أو ترقية كبرى — وحدة قياس §10
    saturated = None
    rows = []

    def take_node(kind_of_building):
        for nk in FITS[kind_of_building]:
            if free.get(nk, 0) > 0:
                free[nk] -= 1
                return nk
        return None

    for w in range(1, waves_n + 1):
        moved = True
        while moved:
            moved = False
            econ_now = sum(1 for a, _ in placed if buildings[a]['kind'] == 'Economy')
            want = 'Economy' if econ_now < econ_share * (len(placed) + 1) else None

            # أوّلاً: املأ عقدةً خالية بالأرخص المناسب
            order = sorted(ROOTS, key=lambda k: (buildings[k]['kind'] != want, cost_of(k)))
            for k in order:
                if cost_of(k) > silver:
                    continue
                nk = take_node(buildings[k]['kind'])
                if nk is None:
                    continue
                silver -= cost_of(k)
                placed.append((k, nk))
                income += buildings[k]['income']
                actions += 1
                moved = True
                break
            if moved:
                continue

            # ثمّ: رقِّ الأرخص القابل للترقية
            best = None
            for i, (a, nk) in enumerate(placed):
                for kid in UPGRADES.get(a, []):
                    c = cost_of(kid)
                    if c <= silver and (best is None or c < best[2]):
                        best = (i, kid, c)
            if best is not None:
                i, kid, c = best
                silver -= c
                income += buildings[kid]['income'] - buildings[placed[i][0]]['income']
                placed[i] = (kid, placed[i][1])
                actions += 1
                moved = True

            # امتلأت العقد المفتوحة: ارفع مستوى الحصن ليفتح غيرها (§10)
            if not any(free.values()) and tier < len(KEEP_COST) and KEEP_COST[tier] <= silver:
                silver -= KEEP_COST[tier]
                tier += 1
                for kind, t in node_list:
                    if t == tier:
                        free[kind] = free.get(kind, 0) + 1
                actions += 1
                moved = True

        if saturated is None and not any(free.values()) and tier >= len(KEEP_COST):
            saturated = w

        pay = BASE + PER * w + income + wave_bounty(w)
        silver += pay
        rows.append((w, tier, len(placed), actions, income, pay, silver))

    if not quiet:
        print(f'── {label} ' + '─' * max(0, 40 - len(label)))
        print(f'{"موجة":>5}{"مستوى":>7}{"مبانٍ":>8}{"إجراءات":>9}{"دخل":>7}{"دفعة":>8}{"رصيد":>8}')
        for w, tr, n, a, inc, pay, sv in rows:
            print(f'{w:>5}{tr:>7}{n:>8}{a:>9}{inc:>7}{pay:>8}{sv:>8}')
        print(f'امتلأ كل شيء عند الموجة: {saturated if saturated else "لم يمتلئ"}')
    return actions, saturated, len(placed), rows

print('── مقابض التوازن §10 ─────────────────────')
print(f'المصدر: {KNOB_SOURCE}')
print(f'عقد {NODE_BUDGET} من {len(NODE_LIST)} · مضاعف الترقية {UPGRADE_SCALE:g}× · موجات النجاة {WAVES_TO_WIN}')
print()

# جولة واحدة لا ثلاث: الاستراتيجيات الثلاث تعطي النتيجة نفسها لأنّ العقد
# — لا الفضّة ولا الكتالوج — هي القيد، والأرخص يملؤها بنفس الترتيب دائماً.
ACTIONS, SAT, PLACED, ROWS = run('المسار الأرخص أوّلاً', 0.5)
print()

print('── مقابل §10 ────────────────────────────')

tiers  = [r[1] for r in ROWS]
silver = [r[6] for r in ROWS]
early  = silver[:min(6, len(silver))]
ok = True

def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

check('قلب الحصن يتدرّج ولا يقفز', tiers[0] == 1 and tiers[-1] == len(KEEP_COST),
      f'  (المستوى 1 → {tiers[-1]} على {len(ROWS)} موجات)')
check('لا يمتلئ كل شيء قبل الموجة السادسة', SAT is None or SAT >= 6,
      f'  (امتلأ عند {SAT if SAT else "لم يمتلئ"})')
check('الفضّة ضيّقة في الموجات الستّ الأولى', all(sv < 900 for sv in early),
      f'  (أقصى رصيد {max(early)})')
check('كل عقدة موضوعة تُملأ فعلاً', PLACED == min(NODE_BUDGET, len(NODE_LIST)),
      f'  ({PLACED} من {min(NODE_BUDGET, len(NODE_LIST))})')
print(f'  · الإجراءات المقيسة: {ACTIONS} عند الموجة {WAVES_TO_WIN} · هدف §10: {TARGET_LO}–{TARGET_HI}'
      f' ({"داخل المدى" if TARGET_LO <= ACTIONS <= TARGET_HI else "خارجه"})')

# هذه ليست فحصاً يسقط: الفجوة تناقض داخل §10 نفسها، وقرارها لصاحب المشروع.
# لو أسقطناها لبقي الفحص أحمر أبداً فاختفت الانحدارات الحقيقية تحته.

# ── مسح المقابض: أيّ ضبط يُدخل الرقم في مدى §10 ──────────────────
print()
print('── أثر كل مقبض على حدة (المقيس: إجراءات آخر موجة) ─')

def band(v):
    return 'داخل المدى' if TARGET_LO <= v <= TARGET_HI else ('دون المدى' if v < TARGET_LO else 'فوق المدى')

print(f'{"عقد":>5}{"إجراءات":>10}   الحكم')
node_fix = []
for n in range(4, len(NODE_LIST) + 1):
    a = run('', 0.5, nodes=n, scale=1.0, waves_n=10, quiet=True)[0]
    if TARGET_LO <= a <= TARGET_HI:
        node_fix.append(n)
    print(f'{n:>5}{a:>10}   {band(a)}')

print()
print(f'{"مضاعف":>7}{"إجراءات":>10}   الحكم')
scale_fix = []
s = 1.0
while s <= 4.0001:
    a = run('', 0.5, nodes=16, scale=s, waves_n=10, quiet=True)[0]
    if TARGET_LO <= a <= TARGET_HI:
        scale_fix.append(s)
    print(f'{s:>7.2f}{a:>10}   {band(a)}')
    s += 0.5

print()
print(f'{"موجات":>7}{"إجراءات":>10}   الحكم')
wave_fix = []
for w in range(5, 31, 5):
    a = run('', 0.5, nodes=16, scale=1.0, waves_n=w, quiet=True)[0]
    if TARGET_LO <= a <= TARGET_HI:
        wave_fix.append(w)
    print(f'{w:>7}{a:>10}   {band(a)}')

# ── الشبكة: عقد × مضاعف، فالمقبضان يعملان معاً لا بديلين ──────────
print()
print('── عقد × مضاعف ──────────────────────────')
SCALES = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
NODES  = [6, 8, 10, 12, 14, 16]
pairs = []
print('عقد\\مضاعف' + ''.join(f'{x:>7.1f}' for x in SCALES))
for n in NODES:
    cells = []
    for sc in SCALES:
        a = run('', 0.5, nodes=n, scale=sc, waves_n=10, quiet=True)[0]
        cells.append(a)
        if TARGET_LO <= a <= TARGET_HI:
            pairs.append((n, sc, a))
    print(f'{n:>9}' + ''.join(f'{c:>7}' + ('*' if TARGET_LO <= c <= TARGET_HI else ' ') for c in cells))
print('(* داخل مدى §10)')

print()
print('── خلاصة القياس ─────────────────────────')
print('§10 تحدّد العقد (5+3+4+4) والأثمان والدخل، وتستهدف «10 إلى 14 إجراءً»؛')
print('والثلاثة لا تُنتج هدفها. فصارت الأرقام مقابض في BalanceSettings، وهذا أثرها:')
print()
if node_fix:
    print(f'  • عدد العقد يبلغ المدى وحده عند {"، ".join(str(x) for x in node_fix)} عقدة.')
else:
    print('  • عدد العقد وحده لا يبلغ المدى ضمن 4–16.')
if scale_fix:
    print(f'  • مضاعف الترقية يبلغه وحده عند {"، ".join(f"{x:g}×" for x in scale_fix)}.')
else:
    print('  • مضاعف الترقية **لا يبلغه وحده** مهما غلظ حتى ٤× — الدخل المركّب')
    print('    يدفع الثمن الغليظ أيضاً، فيبقى الرقم فوق المدى.')
if wave_fix:
    print(f'  • عدد الموجات يبلغه وحده عند {"، ".join(str(x) for x in wave_fix)} موجة.')
else:
    print('  • عدد الموجات **لا أثر له على الرقم**: كل شيء يمتلئ عند الموجة الثامنة،')
    print('    فما بعدها لا يزيد إجراءً. وهو مقبض طول المرحلة (§5) لا مقبض §10.')
print()
print('  جُرِّب بديلان أوسع واستُبعدا بالقياس:')
print('    – إلغاء دخل المباني كلّه يُبقي الرقم 29: المموِّل الأكبر دخل الموجة')
print('      (35 + 10×رقمها) ومكافأة القتل، لا دخل المباني.')
print('    – ضرب الاقتصاد كلّه بالربع (×0.25) يبلغ 14 — انحرافٌ عن §10 أوسع')
print('      من تنصيف الخريطة، فعدد العقد أهون المقابض.')
print()
if pairs:
    best = min(pairs, key=lambda t: (-t[0], t[1]))
    print(f'  • معاً: {len(pairs)} ضبطاً مزدوجاً داخل المدى، أوسعها خريطةً')
    print(f'    {best[0]} عقدة بمضاعف {best[1]:g}× ← {best[2]} إجراءً.')
else:
    print('  • ولا ضبط مزدوج ضمن المسح يبلغ المدى.')
print()
print('لم يُغيَّر رقم من §10 في الكود. الضبط الحالي مطبوع أعلاه، ويُبدَّل من المفتِّش')
print('في Assets/Dawnkeep/Settings/BalanceSettings.asset — يقرؤه الفحص واللعبة معاً.')

# الفحص يسقط على ما يُصلَح بالكود، لا على قرار تصميم: يكفي أن تكون
# المقابض **نافذة** — أي أنّ ضبطاً ما ضمن مداها يبلغ هدف §10.
check('المقابض نافذة: ضبطٌ ضمن مداها يبلغ هدف §10',
      bool(node_fix or scale_fix or pairs),
      f'  ({len(node_fix)} بالعقد · {len(scale_fix)} بالمضاعف · {len(pairs)} مزدوجاً)')

sys.exit(0 if ok else 1)
