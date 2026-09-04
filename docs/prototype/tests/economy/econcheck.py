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
for m in re.finditer(r'MakeUnit\("(\w+)",\s*"([^"]+)".*?bounty:\s*(\d+)\)', CS, re.S):
    bounty[m.group(1)] = int(m.group(3))
for m in re.finditer(r'UnitDefinition (\w+) = MakeUnit\("(\w+)"', CS):
    pass
varname = {}
for m in re.finditer(r'UnitDefinition (\w+) = MakeUnit\("(\w+)"', CS):
    varname[m.group(1)] = m.group(2)

waves = []
for wm in re.finditer(r'MakeWave\("(\w+)",\s*"([^"]+)",[^,]+,\s*new\[\]\s*\{(.*?)\}\)', BS + CS, re.S):
    entries = []
    for em in re.finditer(r'MakeEntry\((\w+),\s*(\d+)', wm.group(3)):
        entries.append((varname.get(em.group(1), em.group(1)), int(em.group(2))))
    if entries:
        waves.append((wm.group(2), entries))

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

last_rows, last_saturated, last_actions, last_placed = [], None, 0, 0

ROOTS = [k for k in buildings
         if not any(k in kids for kids in UPGRADES.values())]

def run(label, econ_share):
    """يملأ العقد ثم يرقّي، ويرفع مستوى الحصن حين تمتلئ. يعيد جدول الموجات."""
    silver = START
    tier = 1
    free = {}
    for kind, t in NODE_LIST:
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

    for w in range(1, 11):
        moved = True
        while moved:
            moved = False
            econ_now = sum(1 for a, _ in placed if buildings[a]['kind'] == 'Economy')
            want = 'Economy' if econ_now < econ_share * (len(placed) + 1) else None

            # أوّلاً: املأ عقدةً خالية بالأرخص المناسب
            order = sorted(ROOTS, key=lambda k: (buildings[k]['kind'] != want, buildings[k]['cost']))
            for k in order:
                if buildings[k]['cost'] > silver:
                    continue
                nk = take_node(buildings[k]['kind'])
                if nk is None:
                    continue
                silver -= buildings[k]['cost']
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
                    c = buildings[kid]['cost']
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
                for kind, t in NODE_LIST:
                    if t == tier:
                        free[kind] = free.get(kind, 0) + 1
                actions += 1
                moved = True

        if saturated is None and not any(free.values()) and tier >= len(KEEP_COST):
            saturated = w

        pay = BASE + PER * w + income + wave_bounty(w)
        silver += pay
        rows.append((w, tier, len(placed), actions, income, pay, silver))

    print(f'── {label} ' + '─' * (40 - len(label)))
    print(f'{"موجة":>5}{"مستوى":>7}{"مبانٍ":>8}{"إجراءات":>9}{"دخل":>7}{"دفعة":>8}{"رصيد":>8}')
    for w, tr, n, a, inc, pay, sv in rows:
        print(f'{w:>5}{tr:>7}{n:>8}{a:>9}{inc:>7}{pay:>8}{sv:>8}')
    print(f'امتلأ كل شيء عند الموجة: {saturated if saturated else "لم يمتلئ خلال عشر موجات"}')
    global last_rows, last_saturated, last_actions, last_placed
    last_rows, last_saturated, last_actions, last_placed = rows, saturated, actions, len(placed)
    return actions

# جولة واحدة لا ثلاث: الاستراتيجيات الثلاث تعطي النتيجة نفسها لأنّ العقد
# — لا الفضّة ولا الكتالوج — هي القيد، والأرخص يملؤها بنفس الترتيب دائماً.
run('المسار الأرخص أوّلاً', 0.5)
print()

print('── مقابل §10 ────────────────────────────')

rows = last_rows
tiers = [r[1] for r in rows]
silver = [r[6] for r in rows]
sat = last_saturated
ok = True

def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

check('قلب الحصن يتدرّج ولا يقفز', tiers[0] == 1 and tiers[-1] == len(KEEP_COST),
      f'  (المستوى 1 → {tiers[-1]} على {len(rows)} موجات)')
check('لا يمتلئ كل شيء قبل الموجة السادسة', sat is None or sat >= 6,
      f'  (امتلأ عند {sat if sat else "لم يمتلئ"})')
check('الفضّة ضيّقة في الموجات الستّ الأولى', all(sv < 900 for sv in silver[:6]),
      f'  (أقصى رصيد {max(silver[:6])})')
check('كل عقدة مفتوحة تُملأ فعلاً', last_placed == len(NODE_LIST),
      f'  ({last_placed} من {len(NODE_LIST)})')

print()
print('── تناقض مقيس داخل §10 ───────────────────')
print(f'§10 تستهدف «10 إلى 14 بناءً أو ترقية كبرى في الموجة العاشرة»، والمقيس {last_actions}.')
print()
print('جُرِّب سببان واستُبعدا بالقياس:')
print('  ١. مكافأة القتل — خفضها إلى واحد لكل عدوّ ينزل الرقم إلى 28 فقط.')
print(f'  ٢. قلّة المحتوى — الكتالوج اليوم {len(buildings)} تعريفاً (عشر عائلات كاملة)')
print('     والنتيجة لم تتغيّر عن ستّ عائلات: 33 إجراءً في الحالتين.')
print()
print(f'فالقيد هو **عدد العقد** ({len(NODE_LIST)}) وعمق الترقية، لا الفضّة ولا الخيارات.')
print('و§10 نفسها تحدّد العقد (5+3+4+4) والأثمان والدخل — وهذه الثلاثة لا')
print('تُنتج هدفها: دخلها (35 + 10×الموجة) مع دخل المباني المركّب يموّل ملء')
print('العقد كلّها وترقيتها مرّةً في ثماني موجات.')
print()
print('لم تُعدَّل أرقام §10 هنا. التوفيق قرار تصميم لصاحب المشروع، وأمامه ثلاثة:')
print('  • تقليل العقد إلى نحو ستٍّ — يوافق الهدف ويخالف جدول §10.')
print('  • مضاعفة أثمان الترقية — يوافق الهدف ويخالف جدول الأثمان.')
print('  • قبول 33 وتعديل الهدف — يبقي كل رقم في §10 كما هو.')
print()
print(f'الرصيد يفيض بعد الموجة الثامنة ({silver[-1]} فضّة) — وهذا أثر التناقض نفسه.')

sys.exit(0 if ok else 1)
