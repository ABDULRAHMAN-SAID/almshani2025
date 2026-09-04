# -*- coding: utf-8 -*-
"""
فحص تخطيط الواجهة ومواضع اللمس (§7).

  cd docs/prototype/tests/hud && python3 touchcheck.py

يقرأ استدعاءات `MakeRect` من ملفّات الواجهة، ويحسب المستطيلات **بحساب
`RectTransform` نفسه** (المرساة = المحور، والإزاحة منها، والمحور هو نقطة
الارتكاز)، ثمّ يفحص:

  · ألّا يتراكب هدفا لمسٍ يظهران معاً،
  · وألّا يخرج هدفٌ عن الشاشة،
  · وألّا يصغر هدفٌ عن أقلّ مقاسٍ يُصاب بالإبهام.

الحساب لا الصورة: صورةٌ تُنظَر إليها تُخطئ فيها العين ثمانية بكسلات،
والحساب لا يخطئ. وقد كشف هذا الفحص أوّل تشغيلٍ له تراكبَ بطاقات قوس
الأوامر بثمانية بكسلات بالضبط.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
UI = os.path.join(ROOT, 'Assets/Dawnkeep/Runtime/UI')

W, H = 1920, 1080          # المقاس المرجعي للوحة
MIN_TAP = 88               # أقلّ مقاس هدفٍ يُصاب بالإبهام بثقة

def read(name): return io.open(os.path.join(UI, name), encoding='utf-8').read()

# `Vector2.zero` مقبولةٌ كصفرين: من دونها يسقط النداء كلّه من القراءة،
# فتُنسَب اللوحة إلى الشاشة وتمرّ كل فحوص «داخل اللوحة» وهي عمياء. وقد
# وقع هذا: لوحة التجهيز خرجت عن حدّها والفحص أخضر.
VEC = r'(?:new Vector2\(\s*(-?[0-9.]+)f?\s*,\s*(-?[0-9.]+)f?\s*\)|Vector2\.(zero))'


def pair(*groups):
    """يفكّ ثلاثيّة `VEC`: رقمان، أو `zero` فصفران."""
    x, y, z = groups
    return (0.0, 0.0) if z else (float(x), float(y))
CALL = re.compile(r'MakeRect\(\s*"([^"]*)"[^,]*,\s*(\w+),\s*\n?\s*'
                  + VEC + r',\s*' + VEC + r',\s*' + VEC + r'\s*\)', re.S)

class Rect:
    def __init__(s, x, y, w, h): s.x, s.y, s.w, s.h = x, y, w, h
    def __repr__(s): return f'({s.x:.0f},{s.y:.0f} {s.w:.0f}×{s.h:.0f})'
    @property
    def right(s): return s.x + s.w
    @property
    def top(s): return s.y + s.h

ROOT_RECT = Rect(0, 0, W, H)

def place(parent, ax, ay, ox, oy, w, h):
    """نفس `MakeRect`: anchorMin = anchorMax = pivot = المرساة."""
    px = parent.x + (ax * parent.w) + ox
    py = parent.y + (ay * parent.h) + oy
    return Rect(px - (ax * w), py - (ay * h), w, h)

def overlap(a, b):
    dx = min(a.right, b.right) - max(a.x, b.x)
    dy = min(a.top, b.top) - max(a.y, b.y)
    return (dx, dy) if dx > 0 and dy > 0 else None

def collect(source, parents):
    """يحسب كل MakeRect في ملفّ. `parents` يربط اسم المتغيّر بمستطيله."""
    found = {}
    for m in CALL.finditer(source):
        g = m.groups()
        name, parent = g[0], g[1]
        ax, ay = pair(*g[2:5])
        ox, oy = pair(*g[5:8])
        w, h = pair(*g[8:11])
        base = parents.get(parent, ROOT_RECT)
        found[name] = place(base, ax, ay, ox, oy, w, h)
    return found

# ── ما نفحصه: أهداف اللمس التي تظهر أثناء اللعب ────────────────────
ABIL = read('AbilityBar.cs')
ORDER = read('OrderRing.cs')
HUD = read('BattleHud.cs')

# القدرات تُبنى في دالّة واحدة بمتغيّرات ثابتة، فتُقرأ من نداءاتها
abilities = {}
for m in re.finditer(r'MakeButton\(parent,\s*(\d+),[^,]*,\s*"[^"]*",\s*'
                     r'(-?[0-9.]+)f,\s*(-?[0-9.]+)f', ABIL):
    idx, x, y = m.groups()
    abilities['قدرة ' + idx] = place(ROOT_RECT, 1.0, 0.0, float(x), float(y), 122.0, 122.0)

# زرّ الأوامر ومرتكز القوس وصفّ المرشِّح
order_rects = collect(ORDER, {'parent': ROOT_RECT})
ring_origin = order_rects.get('Ring')
# مقاس البطاقة يُقرأ من `MakeOption` نفسها لا يُفترض: افتراضُه يجعل الفحص
# يمرّ على مقاسٍ تغيّر في الكود ولم يتغيّر هنا.
size = re.search(r'RectTransform rect = MakeRect\(name, parent,\s*\n\s*'
                 + VEC + r',\s*offset,\s*' + VEC, ORDER)
CARD = pair(*size.groups()[3:6]) if size else (150.0, 76.0)

options = {}
if ring_origin is not None:
    for m in re.finditer(r'MakeOption\(ring,\s*"(\w+)",[^,]*,\s*' + VEC, ORDER):
        name = m.group(1)
        ox, oy = pair(*m.groups()[1:4])
        options['أمر ' + name] = place(ring_origin, 0.5, 0.5,
                                       ox, oy, CARD[0], CARD[1])

hint = None
m = re.search(r'Label\("FilterHint", ring[^)]*?' + VEC + r',\s*' + VEC, ORDER, re.S)
if m:
    ox, oy = pair(*m.groups()[0:3])
    w, h = pair(*m.groups()[3:6])
    hint = place(ring_origin, 0.5, 0.5, ox, oy, w, h)

# لوحات الواجهة الثابتة
panels = {}
for m in re.finditer(r'MakePanel\("(\w+)", root,\s*\n?\s*' + VEC + r',\s*' + VEC
                     + r',\s*' + VEC + r'\)', HUD, re.S):
    g = m.groups()
    ax, ay = pair(*g[1:4])
    ox, oy = pair(*g[4:7])
    w, h = pair(*g[7:10])
    panels[g[0]] = place(ROOT_RECT, ax, ay, ox, oy, w, h)

print('── ما قُرئ ──────────────────────────────')
print(f'قدرات: {len(abilities)} · بطاقات أوامر: {len(options)} · لوحات: {len(panels)}')
print()

def show(title, rects):
    print(f'  {title}')
    for name, r in rects.items():
        print(f'    {name:<22} س {r.x:>6.0f}…{r.right:>6.0f}   ص {r.y:>5.0f}…{r.top:>5.0f}')

show('صفّ القدرات (§7: الجانب الأيمن)', abilities)
print()
show('زرّ الأوامر وقوسه', dict(list({k: v for k, v in order_rects.items()
                                      if k in ('OrderButton', 'FilterRow')}.items())
                                 + list(options.items())))
print()
show('لوحات الحالة', panels)
print()

ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

print('── التراكب ──────────────────────────────')

# مجموعات تظهر معاً: القدرات + زرّ الأوامر + لوحات الحالة دائماً؛
# وبطاقات القوس مع بعضها ومع القدرات وزرّها.
always = {}
always.update(abilities)
always['زرّ الأوامر'] = order_rects.get('OrderButton', Rect(0, 0, 0, 0))
for name, rect in panels.items():
    always['لوحة ' + name] = rect

groups = [
    ('الظاهر دائماً', always),
    ('القوس مفتوحاً', {**abilities,
                       'زرّ الأوامر': order_rects.get('OrderButton', Rect(0, 0, 0, 0)),
                       **options,
                       **({'تلميح المرشِّح': hint} if hint else {})}),
    ('المرشِّح مفتوحاً', {**abilities,
                          'زرّ الأوامر': order_rects.get('OrderButton', Rect(0, 0, 0, 0)),
                          'صفّ المرشِّح': order_rects.get('FilterRow', Rect(0, 0, 0, 0))}),
]

for title, rects in groups:
    clashes = []
    names = list(rects)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            a, b = rects[names[i]], rects[names[j]]
            if a.w <= 0 or b.w <= 0:
                continue
            hit = overlap(a, b)
            if hit:
                clashes.append((names[i], names[j], hit))

    check(f'{title}: لا تراكب', not clashes,
          '' if not clashes
          else '  (' + '، '.join(f'{a} × {b} بـ{int(dx)}×{int(dy)}'
                                 for a, b, (dx, dy) in clashes[:3]) + ')')

print()
print('── داخل الشاشة وبمقاسٍ يُصاب ──────────────')

outside = [n for n, r in {**abilities, **options,
                          'زرّ الأوامر': order_rects.get('OrderButton', Rect(0, 0, 1, 1)),
                          'صفّ المرشِّح': order_rects.get('FilterRow', Rect(0, 0, 1, 1))}.items()
           if r.x < 0 or r.y < 0 or r.right > W or r.top > H]
check('كل هدف لمسٍ داخل الشاشة', not outside,
      '' if not outside else f'  ({"، ".join(outside)})')

small = [(n, r) for n, r in {**abilities, **options}.items()
         if min(r.w, r.h) < MIN_TAP]
check(f'وكلٌّ لا يصغر عن {MIN_TAP} بكسلاً', not small,
      '' if not small else f'  ({small[0][0]}: {min(small[0][1].w, small[0][1].h):.0f})')

print()
print('── ما تضعه §7 ───────────────────────────')

check('القدرات على الجانب الأيمن (§7)',
      all(r.x > W * 0.5 for r in abilities.values()),
      f'  (أقصى يسارٍ فيها {min(r.x for r in abilities.values()):.0f} من {W})')

JOY = read('VirtualJoystick.cs')
region = re.search(r'regionWidth = ([0-9.]+)f', JOY)
check('العصا الافتراضية على الجانب الأيسر (§7)',
      region is not None and float(region.group(1)) <= 0.5,
      f'  (تشغل {float(region.group(1)) * 100:.0f}٪ من العرض)' if region else '')

check('ولا تتقاطع منطقتها مع القدرات',
      region is not None
      and min(r.x for r in abilities.values()) > W * float(region.group(1)),
      f'  (حدّ المنطقة {W * float(region.group(1)):.0f} · أقرب قدرة '
      f'{min(r.x for r in abilities.values()):.0f})' if region else '')

dead = re.search(r'deadZone = ([0-9.]+)f', JOY)
check('المنطقة الميتة 0.12 (§7)', dead is not None and abs(float(dead.group(1)) - 0.12) < 1e-6,
      f'  ({dead.group(1) if dead else "؟"})')

HERO = io.open(os.path.join(ROOT,
    'Assets/Dawnkeep/Runtime/Hero/HeroController.cs'), encoding='utf-8').read()
accel = re.search(r'accelerationTime = ([0-9.]+)f', HERO)
check('الوصول للسرعة الكاملة خلال 0.12 ثانية (§7)',
      accel is not None and abs(float(accel.group(1)) - 0.12) < 1e-6,
      f'  ({accel.group(1) if accel else "؟"})')

check('العصا تتجاهل مواضع الأزرار', 'blockers' in JOY and 'Eligible' in JOY)
check('حجمها وشفافيّتها قابلان للضبط (§7)',
      'SetScale' in JOY and 'SetOpacity' in JOY)
check('ومنطقة اللمس قابلة للتوسيع (§7)', 'regionWidth' in JOY)
check('وقوس الأوامر منبثقٌ فوق زرّه (§7: دائرة صغيرة)',
      ring_origin is not None
      and order_rects.get('OrderButton') is not None
      and ring_origin.y >= order_rects['OrderButton'].top - 1)

print()
print('── القائمة الرئيسة (§24) ─────────────────')

MENU = io.open(os.path.join(ROOT,
    'Assets/Dawnkeep/Runtime/Flow/MainMenu.cs'), encoding='utf-8').read()
MENUSETUP = io.open(os.path.join(ROOT,
    'Assets/Editor/DawnkeepMenuSetup.cs'), encoding='utf-8').read()

# أزرار القائمة تُبنى بدالّة `Button(...)` بمقاسٍ وإزاحةٍ صريحين
menu_buttons = {}
for m in re.finditer(r'Button\(rect,\s*"(\w+)",\s*[\w.]+,\s*' + VEC + r',\s*\n?\s*' + VEC,
                     MENU, re.S):
    g = m.groups()
    ox, oy = pair(*g[1:4])
    w, h = pair(*g[4:7])
    menu_buttons[g[0]] = place(ROOT_RECT, 0.5, 0.5, ox, oy, w, h)

show('أزرار القائمة', menu_buttons)
print()

clashes = []
names = list(menu_buttons)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        hit = overlap(menu_buttons[names[i]], menu_buttons[names[j]])
        if hit:
            clashes.append((names[i], names[j], hit))

check('لا تراكب بين أزرار القائمة', not clashes,
      '' if not clashes else f'  ({clashes[0][0]} × {clashes[0][1]})')

check('كلٌّ داخل الشاشة',
      all(0 <= r.x and 0 <= r.y and r.right <= W and r.top <= H
          for r in menu_buttons.values()))

small = [n for n, r in menu_buttons.items() if min(r.w, r.h) < MIN_TAP]
check(f'وكلٌّ لا يصغر عن {MIN_TAP} بكسلاً', not small,
      '' if not small else f'  ({"، ".join(small)})')

check('لا أكثر من سبعة أزرار رئيسة (§24)', len(menu_buttons) <= 7,
      f'  ({len(menu_buttons)})')

# §17: كل زرّ يفعل شيئاً. الدالّة توجب فعلاً في وسائطها، والفحص يقابل
# كل زرّ باسم دالّةٍ موجودة في الملفّ.
actions = re.findall(r'Button\(rect,\s*"(\w+)",[^;]*?,\s*(\w+)\);', MENU, re.S)
dead = [name for name, action in actions
        if not re.search(r'(private|public)[^\n]*\b' + action + r'\(', MENU)]
check('كل زرّ يستدعي دالّةً موجودة (§17: ممنوع الشكليّ)', not dead,
      '' if not dead else f'  ({"، ".join(dead)})')

for name, action in actions:
    print(f'      · {name} ← {action}()')

print()
boot = re.search(r'bootSeconds = ([0-9.]+)f', MENU)
check('شعار الإقلاع أقلّ من ثانيتين (§24)',
      boot is not None and float(boot.group(1)) < 2.0,
      f'  ({boot.group(1) if boot else "؟"} ث)')

check('ورسالة واضحة إن قُرئت نسخة احتياطية (§24)',
      'SaveSource.BackupOne' in MENU and 'SaveRecovered' in MENU)

check('القائمة أوّل مشهدٍ في إعدادات البناء (§41)',
      'scenes.Add(new EditorBuildSettingsScene(MenuScene, true))' in MENUSETUP
      and MENUSETUP.index('MenuScene, true') < MENUSETUP.index('WorldScene, true'))

check('ومشاهد المستخدم الأخرى لا تُمحى',
      'path != MenuScene && path != DawnkeepAssetPaths.WorldScene' in MENUSETUP)

check('وزرّ اللعب يعيد الزمن قبل التحميل',
      'Time.timeScale = 1f;' in MENU and 'SceneManager.LoadScene' in MENU)

print()
print('── شاشة التجهيز (§17) ────────────────────')

GEARUI = read('LoadoutPanel.cs')
gear_rects = collect(GEARUI, {'parent': ROOT_RECT})

# اللوحة أوّلاً، ثمّ ما بداخلها منسوباً إليها
panel = gear_rects.get('LoadoutPanel', ROOT_RECT)
inside = {}
for m in CALL.finditer(GEARUI):
    g = m.groups()
    if g[1] == 'rect':
        ax, ay = pair(*g[2:5])
        ox, oy = pair(*g[5:8])
        w, h = pair(*g[8:11])
        inside[g[0]] = place(panel, ax, ay, ox, oy, w, h)

# الفتحات الأربع والصفوف الستّة يُبنيان في حلقة، فمواضعهما تُحسب بخطوتها
slot = re.search(r'MakeRect\("Slot_" \+ i, rect,\s*\n\s*' + VEC
                 + r',\s*new Vector2\(-([0-9.]+)f - \(i \* ([0-9.]+)f\),\s*(-?[0-9.]+)f\),'
                 + r'\s*\n\s*' + VEC, GEARUI)
slots = {}
if slot:
    g = slot.groups()
    ax, ay = pair(*g[0:3])
    x0, step, y = float(g[3]), float(g[4]), float(g[5])
    w, h = pair(*g[6:9])
    for i in range(4):
        slots['فتحة ' + str(i)] = place(panel, ax, ay, -(x0 + i * step), y, w, h)

row = re.search(r'MakeRect\("Row_" \+ i, rect,\s*\n\s*' + VEC
                + r',\s*new Vector2\(([0-9.]+)f,\s*(-?[0-9.]+)f - \(i \* ([0-9.]+)f\)\),'
                + r'\s*\n\s*' + VEC, GEARUI)
rows = {}
ROWS = int(re.search(r'public const int Rows = (\d+);', GEARUI).group(1))
if row:
    g = row.groups()
    ax, ay = pair(*g[0:3])
    x, y0, step = float(g[3]), float(g[4]), float(g[5])
    w, h = pair(*g[6:9])
    for i in range(ROWS):
        rows['بطاقة ' + str(i)] = place(panel, ax, ay, x, y0 - i * step, w, h)

taps = {}
taps.update(slots)
taps.update(rows)
for name in ('Upgrade', 'Dismantle'):
    if name in inside:
        taps[name] = inside[name]

# الأزرار الصغيرة تمرّ بـ`SmallButton` فلا تلتقطها `CALL`: تُقرأ من نداءاتها
SMALL = pair(*re.search(r'MakeRect\(name, rect, anchor, offset, ' + VEC,
                        GEARUI).groups())
for m in re.finditer(r'SmallButton\(rect,\s*"(\w+)",\s*' + VEC + r',\s*\n?\s*' + VEC,
                     GEARUI, re.S):
    g = m.groups()
    ax, ay = pair(*g[1:4])
    ox, oy = pair(*g[4:7])
    taps[g[0]] = place(panel, ax, ay, ox, oy, SMALL[0], SMALL[1])

show('أهداف اللمس', taps)
print()

check('الفتحات أربعٌ (§17) والبطاقات كما في الشيفرة',
      len(slots) == 4 and len(rows) == ROWS,
      f'  ({len(slots)} فتحات · {len(rows)} بطاقات)')

small = [n for n, r in taps.items() if min(r.w, r.h) < MIN_TAP]
check(f'لا هدفَ يصغر عن {MIN_TAP} بكسلاً', not small,
      '' if not small else f'  ({"، ".join(small)})')

clashes = []
names = list(taps)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        hit = overlap(taps[names[i]], taps[names[j]])
        if hit:
            clashes.append((names[i], names[j], hit))

check('ولا تراكب بين هدفين', not clashes,
      '' if not clashes else f'  ({clashes[0][0]} × {clashes[0][1]} بـ{clashes[0][2]})')

outside = [n for n, r in taps.items()
           if r.x < panel.x - 1 or r.y < panel.y - 1
           or r.right > panel.right + 1 or r.top > panel.top + 1]
check('وكلٌّ داخل اللوحة', not outside,
      '' if not outside else f'  ({"، ".join(outside)})')

check('واللوحة داخل الشاشة',
      0 <= panel.x and 0 <= panel.y and panel.right <= W and panel.top <= H,
      f'  ({panel})')

# §17 مرّةً أخرى: زرٌّ لا يفعل شيئاً ممنوع
listeners = re.findall(r'onClick\.AddListener\((?:delegate \{ )?(\w+)', GEARUI)
missing = [a for a in set(listeners)
           if not re.search(r'(private|public)[^\n]*\b' + a + r'\(', GEARUI)]
check('كل زرٍّ في الشاشة يستدعي دالّةً موجودة (§17)', not missing,
      '' if not missing else f'  ({"، ".join(missing)})')
print('      · ' + '، '.join(sorted(set(listeners))))

print()
print('── شاشة العقائد (§18) ────────────────────')

DOCUI = read('DoctrinePanel.cs')
doc_rects = collect(DOCUI, {'parent': ROOT_RECT})
dpanel = doc_rects.get('DoctrinePanel', ROOT_RECT)

dslot = re.search(r'MakeRect\("Slot_" \+ i, rect,\s*\n\s*' + VEC
                  + r',\s*new Vector2\(-([0-9.]+)f - \(i \* ([0-9.]+)f\),\s*(-?[0-9.]+)f\),'
                  + r'\s*\n\s*' + VEC, DOCUI)
DSLOTS = int(re.search(r'public const int Slots = (\d+);', io.open(os.path.join(ROOT,
    'Assets/Dawnkeep/Runtime/Doctrine/DoctrineBook.cs'), encoding='utf-8').read()).group(1))

dtaps = {}
if dslot:
    g = dslot.groups()
    ax, ay = pair(*g[0:3])
    x0, step, y = float(g[3]), float(g[4]), float(g[5])
    w, h = pair(*g[6:9])
    for i in range(DSLOTS):
        dtaps['فتحة ' + str(i)] = place(dpanel, ax, ay, -(x0 + i * step), y, w, h)

drow = re.search(r'MakeRect\("Row_" \+ i, rect,\s*\n\s*' + VEC
                 + r',\s*new Vector2\(([0-9.]+)f,\s*(-?[0-9.]+)f - \(i \* ([0-9.]+)f\)\),'
                 + r'\s*\n\s*' + VEC, DOCUI)
DROWS = int(re.search(r'public const int Rows = (\d+);', DOCUI).group(1))
if drow:
    g = drow.groups()
    ax, ay = pair(*g[0:3])
    x, y0, step = float(g[3]), float(g[4]), float(g[5])
    w, h = pair(*g[6:9])
    for i in range(DROWS):
        dtaps['بطاقة ' + str(i)] = place(dpanel, ax, ay, x, y0 - i * step, w, h)

DSMALL = pair(*re.search(r'MakeRect\(name, rect, anchor, offset, ' + VEC,
                         DOCUI).groups())
for m in re.finditer(r'SmallButton\(rect,\s*"(\w+)",\s*' + VEC + r',\s*\n?\s*' + VEC,
                     DOCUI, re.S):
    g = m.groups()
    ax, ay = pair(*g[1:4])
    ox, oy = pair(*g[4:7])
    dtaps[g[0]] = place(dpanel, ax, ay, ox, oy, DSMALL[0], DSMALL[1])

show('أهداف اللمس', dtaps)
print()

check(f'الفتحتان (§18) والبطاقات كما في الشيفرة',
      len([k for k in dtaps if k.startswith('فتحة')]) == DSLOTS
      and len([k for k in dtaps if k.startswith('بطاقة')]) == DROWS,
      f'  ({DSLOTS} فتحتان · {DROWS} بطاقات)')

small = [n for n, r in dtaps.items() if min(r.w, r.h) < MIN_TAP]
check(f'لا هدفَ يصغر عن {MIN_TAP} بكسلاً', not small,
      '' if not small else f'  ({"، ".join(small)})')

clashes = []
names = list(dtaps)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        hit = overlap(dtaps[names[i]], dtaps[names[j]])
        if hit:
            clashes.append((names[i], names[j], hit))

check('ولا تراكب بين هدفين', not clashes,
      '' if not clashes else f'  ({clashes[0][0]} × {clashes[0][1]} بـ{clashes[0][2]})')

outside = [n for n, r in dtaps.items()
           if r.x < dpanel.x - 1 or r.y < dpanel.y - 1
           or r.right > dpanel.right + 1 or r.top > dpanel.top + 1]
check('وكلٌّ داخل اللوحة', not outside,
      '' if not outside else f'  ({"، ".join(outside)})')

check('واللوحة داخل الشاشة',
      0 <= dpanel.x and 0 <= dpanel.y and dpanel.right <= W and dpanel.top <= H,
      f'  ({dpanel})')

listeners = re.findall(r'onClick\.AddListener\((?:delegate \{ )?(\w+)', DOCUI)
missing = [a for a in set(listeners)
           if not re.search(r'(private|public)[^\n]*\b' + a + r'\(', DOCUI)]
check('كل زرٍّ في الشاشة يستدعي دالّةً موجودة (§17)', not missing,
      '' if not missing else f'  ({"، ".join(missing)})')

# واللوحتان لا تُفتحان معاً على الشاشة نفسها: كلٌّ تُغلق الأخرى؟ لا —
# تُفتح واحدةٌ في كل مرّة من القائمة، ومقاسهما واحد فتتطابقان تماماً.
check('ولوحتا التجهيز والعقائد بالمقاس نفسه (تخطيطٌ واحد)',
      abs(panel.w - dpanel.w) < 1 and abs(panel.h - dpanel.h) < 1,
      f'  ({panel.w:.0f}×{panel.h:.0f})')

print()
print('── خريطة الحملة (§19) ────────────────────')

MAPUI = read('CampaignPanel.cs')
map_rects = collect(MAPUI, {'parent': ROOT_RECT})
mpanel = map_rects.get('CampaignPanel', ROOT_RECT)

mzone = re.search(r'MakeRect\("Zone_" \+ i, rect,\s*\n\s*' + VEC
                  + r',\s*new Vector2\(-([0-9.]+)f - \(i \* ([0-9.]+)f\),\s*(-?[0-9.]+)f\),'
                  + r'\s*\n\s*' + VEC, MAPUI)
mtaps = {}
if mzone:
    g = mzone.groups()
    ax, ay = pair(*g[0:3])
    x0, step, y = float(g[3]), float(g[4]), float(g[5])
    w, h = pair(*g[6:9])
    for i in range(4):
        mtaps['منطقة ' + str(i)] = place(mpanel, ax, ay, -(x0 + i * step), y, w, h)

mrow = re.search(r'MakeRect\("Row_" \+ i, rect,\s*\n\s*' + VEC
                 + r',\s*new Vector2\(([0-9.]+)f,\s*(-?[0-9.]+)f - \(i \* ([0-9.]+)f\)\),'
                 + r'\s*\n\s*' + VEC, MAPUI)
MROWS = int(re.search(r'public const int Rows = (\d+);', MAPUI).group(1))
if mrow:
    g = mrow.groups()
    ax, ay = pair(*g[0:3])
    x, y0, step = float(g[3]), float(g[4]), float(g[5])
    w, h = pair(*g[6:9])
    for i in range(MROWS):
        mtaps['مرحلة ' + str(i)] = place(mpanel, ax, ay, x, y0 - i * step, w, h)

MSMALL = pair(*re.search(r'MakeRect\(name, rect, anchor, offset, ' + VEC,
                         MAPUI).groups())
for m in re.finditer(r'SmallButton\(rect,\s*"(\w+)",\s*' + VEC + r',\s*\n?\s*' + VEC,
                     MAPUI, re.S):
    g = m.groups()
    ax, ay = pair(*g[1:4])
    ox, oy = pair(*g[4:7])
    mtaps[g[0]] = place(mpanel, ax, ay, ox, oy, MSMALL[0], MSMALL[1])

show('أهداف اللمس', mtaps)
print()

check('المناطق أربعٌ (§19) والمراحل كما في الشيفرة',
      len([k for k in mtaps if k.startswith('منطقة')]) == 4
      and len([k for k in mtaps if k.startswith('مرحلة')]) == MROWS,
      f'  (4 مناطق · {MROWS} مراحل في الصفحة)')

small = [n for n, r in mtaps.items() if min(r.w, r.h) < MIN_TAP]
check(f'لا هدفَ يصغر عن {MIN_TAP} بكسلاً', not small,
      '' if not small else f'  ({"، ".join(small)})')

clashes = []
names = list(mtaps)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        hit = overlap(mtaps[names[i]], mtaps[names[j]])
        if hit:
            clashes.append((names[i], names[j], hit))

check('ولا تراكب بين هدفين', not clashes,
      '' if not clashes else f'  ({clashes[0][0]} × {clashes[0][1]} بـ{clashes[0][2]})')

outside = [n for n, r in mtaps.items()
           if r.x < mpanel.x - 1 or r.y < mpanel.y - 1
           or r.right > mpanel.right + 1 or r.top > mpanel.top + 1]
check('وكلٌّ داخل اللوحة', not outside,
      '' if not outside else f'  ({"، ".join(outside)})')

listeners = re.findall(r'onClick\.AddListener\((?:delegate \{ )?(\w+)', MAPUI)
missing = [a for a in set(listeners)
           if not re.search(r'(private|public)[^\n]*\b' + a + r'\(', MAPUI)]
check('كل زرٍّ في الشاشة يستدعي دالّةً موجودة (§17)', not missing,
      '' if not missing else f'  ({"، ".join(missing)})')

check('والشاشات الثلاث بالمقاس نفسه',
      abs(panel.w - mpanel.w) < 1 and abs(panel.h - mpanel.h) < 1,
      f'  ({mpanel.w:.0f}×{mpanel.h:.0f})')

sys.exit(0 if ok else 1)
