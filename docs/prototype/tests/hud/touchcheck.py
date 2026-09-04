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

VEC = r'new Vector2\(\s*(-?[0-9.]+)f?\s*,\s*(-?[0-9.]+)f?\s*\)'
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
        name, parent, ax, ay, ox, oy, w, h = m.groups()
        base = parents.get(parent, ROOT_RECT)
        rect = place(base, float(ax), float(ay), float(ox), float(oy), float(w), float(h))
        found[name] = rect
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
CARD = (float(size.group(3)), float(size.group(4))) if size else (150.0, 76.0)

options = {}
if ring_origin is not None:
    for m in re.finditer(r'MakeOption\(ring,\s*"(\w+)",[^,]*,\s*' + VEC, ORDER):
        name, ox, oy = m.groups()
        options['أمر ' + name] = place(ring_origin, 0.5, 0.5,
                                       float(ox), float(oy), CARD[0], CARD[1])

hint = None
m = re.search(r'Label\("FilterHint", ring[^)]*?' + VEC + r',\s*' + VEC, ORDER, re.S)
if m:
    ox, oy, w, h = m.groups()
    hint = place(ring_origin, 0.5, 0.5, float(ox), float(oy), float(w), float(h))

# لوحات الواجهة الثابتة
panels = {}
for m in re.finditer(r'MakePanel\("(\w+)", root,\s*\n?\s*' + VEC + r',\s*' + VEC
                     + r',\s*' + VEC + r'\)', HUD, re.S):
    name, ax, ay, ox, oy, w, h = m.groups()
    panels[name] = place(ROOT_RECT, float(ax), float(ay), float(ox), float(oy),
                         float(w), float(h))

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

sys.exit(0 if ok else 1)
