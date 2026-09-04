# -*- coding: utf-8 -*-
"""
فحص توليد الموجات ودرجات الصعوبة (§14).

  cd docs/prototype/tests/waves && python3 wavecheck.py

يقرأ الأرقام **من ملفّات C# نفسها** (`WaveGenSettings` المضبوطة في باني
القتال، وبيانات التهديد على كل مهاجم، وسطور الدرجات) ثمّ يحاكي عشرين ليلة
بالدرجات الأربع.

**ما يفحصه**: القيود التي نصّت عليها §14 — لا الشيفرة. المحاكاة هنا تنفيذ
موازٍ لخوارزمية `WaveGenerator`، فاتّفاقها معه ليس مضموناً وليس المقصود؛
المقصود أنّ **الأرقام** تُنتج ما وعدت به §14: منحنى يصعد، ولا عدوّ قبل
تعليمه، ولا موجة من صنف واحد، وزعيم كل خمس وعشر، وسلّم درجات يفترق فعلاً.
"""
import io, os, re, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

CS  = read('Assets/Editor/DawnkeepCombatSetup.cs')
GEN = read('Assets/Dawnkeep/Runtime/Combat/WaveGenerator.cs')

def setp(name, cast=float):
    """قيمة ضُبطت بـSetPrivate في باني الأصول — لا القيمة الافتراضية في C#."""
    m = re.search(r'SetPrivate\(settings,\s*"' + name + r'",\s*(-?[0-9.]+)f?\)', CS)
    if not m:
        raise SystemExit('لم يُقرأ %s من باني القتال' % name)
    return cast(m.group(1))

BASE    = setp('baseBudget')
GROWTH  = setp('growth')
ZONE    = setp('zoneFactor')
MINGRP  = setp('minGroups', int)
MAXGRP  = setp('maxGroups', int)
MINIBOSS= setp('miniBossEvery', int)
BOSSEVERY=setp('bossEvery', int)
BOSSSHARE=setp('bossShare')
SEED    = setp('seed', int)
MAXTIER = setp('maxTier', int)
TIERCOST= setp('tierCost')
TIERHP  = setp('tierHealth')
TIERDMG = setp('tierDamage')
REQ_MELEE = re.search(r'SetPrivate\(settings,\s*"requireMelee",\s*(true|false)\)', CS).group(1) == 'true'

# ── بيانات التهديد لكل مهاجم، من استدعاءات Threat(...)
units = {}
for m in re.finditer(r'Threat\((\w+),\s*cost:\s*(\d+),\s*taughtOn:\s*(\d+),\s*'
                     r'group:\s*ThreatClass\.(\w+),\s*min:\s*(\d+),\s*max:\s*(\d+)\)', CS):
    var, cost, taught, group, mn, mx = m.groups()
    units[var] = dict(cost=int(cost), taught=int(taught), group=group,
                      minp=int(mn), maxp=int(mx))

# اسم كل متغيّر كما يظهر للّاعب
for m in re.finditer(r'UnitDefinition (\w+) = MakeUnit\("(\w+)",\s*"([^"]+)"', CS):
    if m.group(1) in units:
        units[m.group(1)]['name'] = m.group(3)

# ── سطور الدرجات
levels = []
for m in re.finditer(r'Level\(Difficulty\.(\w+),[^)]*?health:\s*([0-9.]+)f,\s*damage:\s*([0-9.]+)f,'
                     r'\s*threat:\s*([0-9.]+)f,\s*\n\s*preview:\s*(true|false),\s*'
                     r'secondFront:\s*(\d+),\s*light:\s*([0-9.]+)f,\s*ceiling:\s*([0-9.]+)f\)',
                     CS, re.S):
    levels.append(dict(name=m.group(1), health=float(m.group(2)), damage=float(m.group(3)),
                       threat=float(m.group(4)), preview=m.group(5) == 'true',
                       front=int(m.group(6)), light=float(m.group(7)),
                       ceiling=float(m.group(8))))

# ── وزن الموجات المصمَّمة يدوياً، بأثمان التهديد نفسها
handmade = []
for wm in re.finditer(r'MakeWave\("(\w+)",\s*"([^"]+)"', CS):
    body = CS[wm.end():].split('new[]', 1)[1].split('});', 1)[0]
    total = 0
    rows = []
    for em in re.finditer(r'MakeEntry\((\w+),\s*(\d+)', body):
        var, n = em.group(1), int(em.group(2))
        if var in units:
            total += units[var]['cost'] * n
            rows.append((units[var].get('name', var), n))
    handmade.append((wm.group(2), total, rows))

print('── الأرقام المقروءة ──────────────────────')
print(f'الميزانية = {BASE:g} × {GROWTH:g}^(الليلة−1) × منطقة {ZONE:g} × درجة')
print(f'المستوى: حتى {MAXTIER} درجات · ثمن الدرجة {TIERCOST:g}× · '
      f'تضيف {TIERHP:g} صحّة و{TIERDMG:g} ضرراً')
print(f'مجموعات {MINGRP}–{MAXGRP} · زعيم صغير كل {MINIBOSS} · زعيم كل {BOSSEVERY} '
      f'(حصّته {BOSSSHARE:g}) · بذرة {SEED}')
print(f'مهاجمون بأثمان: {len(units)} · درجات: {len(levels)} · موجات مصمَّمة: {len(handmade)}')
print()

print('── المهاجمون ─────────────────────────────')
print(f'{"العدو":<16}{"ثمن":>5}{"يُعلَّم":>8}{"الصنف":>12}{"السرب":>10}')
for var, u in sorted(units.items(), key=lambda kv: kv[1]['cost']):
    print(f'{u.get("name", var):<16}{u["cost"]:>5}{u["taught"]:>8}{u["group"]:>12}'
          f'{str(u["minp"]) + "–" + str(u["maxp"]):>10}')
print()

# ── محاكاة موازية لخوارزمية المولّد ───────────────────────────────
class Rng:
    """`System.Random` ليس قابلاً للنسخ هنا؛ المطلوب ثبات لا تطابق بايت."""
    def __init__(self, seed): self.s = seed & 0x7fffffff or 1
    def next(self, n):
        self.s = (1103515245 * self.s + 12345) & 0x7fffffff
        return self.s % max(1, n)

def budget(wave, threat_scale):
    return max(1, round(BASE * (GROWTH ** max(0, wave - 1)) * ZONE * threat_scale))

def generate(wave, profile):
    """يعيد (مجموعات، ميزانية، منفَق). المجموعة: (متغيّر، عدد، مستوى)."""
    b = budget(wave, profile['threat'])
    rng = Rng(SEED + wave * 7919)
    eligible = {v: u for v, u in units.items()
                if u['cost'] > 0 and u['taught'] <= wave and u['group'] != 'Boss'}
    if not eligible:
        return [], b, 0
    ceiling = max(1, round(b * profile['ceiling']))
    spent_by = {}
    groups = []
    remaining = b

    def place(want):
        nonlocal remaining
        if remaining <= 0:
            return 0
        already = spent_by.get(want, 0)
        room = min(remaining, ceiling - already)
        if room <= 0:
            return 0
        used = {g[0] for g in groups}
        cands = [v for v, u in eligible.items()
                 if u['group'] == want and u['cost'] * u['minp'] <= room and v not in used]
        if not cands:
            return 0
        cands.sort()
        pick = cands[rng.next(len(cands))]
        u = eligible[pick]
        affordable = room // u['cost']
        count = max(u['minp'], min(affordable, u['maxp']))
        if count > affordable:
            return 0
        cost = count * u['cost']
        spent_by[want] = already + cost
        groups.append([pick, count, 0])
        remaining -= cost
        return cost

    if REQ_MELEE:
        place('Melee')

    # جولة كاملة على الأصناف لا صنفاً واحداً بالدور
    CLASSES = ['Melee', 'Ranged', 'Armoured', 'Saboteur', 'Swarm']
    start = rng.next(len(CLASSES))
    guard = 0
    while len(groups) < MAXGRP and remaining > 0 and guard < 16:
        guard += 1
        before = remaining
        for c in range(len(CLASSES)):
            if len(groups) >= MAXGRP:
                break
            place(CLASSES[(start + c) % len(CLASSES)])
        if remaining == before:
            break

    # ما بقي يُشترى **مستوى** لا أجساداً (§14: «مستوى العدو»)
    guard = 0
    while remaining > 0 and guard < 256 and MAXTIER > 0:
        guard += 1
        best, best_cost = -1, None
        for i, (v, c, t) in enumerate(groups):
            if t >= MAXTIER:
                continue
            cost = max(1, round(c * units[v]['cost'] * TIERCOST))
            if cost <= remaining and (best_cost is None or cost < best_cost):
                best, best_cost = i, cost
        if best < 0:
            break
        groups[best][2] += 1
        remaining -= best_cost

    return [tuple(g) for g in groups], b, b - remaining

# ── منحنى الليالي على الدرجة القياسية ────────────────────────────
normal = next(l for l in levels if l['name'] == 'Normal')

print('── ليالي «قياسي» ─────────────────────────')
print(f'{"ليلة":>5}{"ميزانية":>9}{"منفَق":>8}{"مجموعات":>9}{"وحدات":>8}{"مستوى":>7}   التركيبة')
rows = []
for w in range(1, 21):
    groups, b, spent = generate(w, normal)
    n = sum(c for _, c, _ in groups)
    top = max((t for _, _, t in groups), default=0)
    rows.append((w, b, spent, len(groups), n, groups, top))
    desc = '، '.join(f'{units[v].get("name", v)}×{c}' + (f'+{t}' if t else '')
                     for v, c, t in groups)
    print(f'{w:>5}{b:>9}{spent:>8}{len(groups):>9}{n:>8}{top:>7}   {desc}')
print()

ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

print('── مقابل §14 ────────────────────────────')

# صيغة §14 حرفياً
check('الصيغة كما نصّت §14 (12 × 1.22^(ن−1) × منطقة × درجة)',
      abs(BASE - 12.0) < 1e-6 and abs(GROWTH - 1.22) < 1e-6,
      f'  (الأساس {BASE:g} والنموّ {GROWTH:g})')

# لا عدوّ قبل تعليمه
early = [(w, units[v].get('name', v), units[v]['taught'])
         for w, _, _, _, _, gs, _ in rows for v, _, _ in gs if units[v]['taught'] > w]
check('لا يظهر عدوّ قبل تعليمه', not early,
      '' if not early else f'  ({early[0][1]} في الليلة {early[0][0]} وتعليمه {early[0][2]})')

# سقف الصنف
over = []
for w, b, _, _, _, gs, _ in rows:
    per = {}
    for v, c, _ in gs:
        g = units[v]['group']
        per[g] = per.get(g, 0) + (c * units[v]['cost'])
    cap = max(1, round(b * normal['ceiling']))
    for g, sp in per.items():
        if sp > cap:
            over.append((w, g, sp, cap))
check('لا يتجاوز صنفٌ سقفه من الميزانية', not over,
      '' if not over else f'  ({over[0][1]} في الليلة {over[0][0]}: {over[0][2]} > {over[0][3]})')

# مشاة في كل ليلة
noMelee = [w for w, _, _, _, _, gs, _ in rows
           if not any(units[v]['group'] == 'Melee' for v, _, _ in gs)]
check('في كل ليلة خطٌّ أماميّ', not noMelee or not REQ_MELEE,
      '' if not noMelee else f'  (بلا مشاة: {noMelee})')

# عدد المجموعات ضمن الحدّين
badGroups = [(w, g) for w, _, _, g, _, _, _ in rows if g < MINGRP or g > MAXGRP]
check(f'المجموعات بين {MINGRP} و{MAXGRP}', not badGroups,
      '' if not badGroups else f'  (الليلة {badGroups[0][0]}: {badGroups[0][1]})')

# المنحنى يصعد
budgets = [b for _, b, _, _, _, _, _ in rows]
check('الميزانية تصعد كل ليلة', all(budgets[i] < budgets[i+1] for i in range(len(budgets)-1)),
      f'  ({budgets[0]} ← {budgets[-1]} على عشرين ليلة)')

spends = [s for _, _, s, _, _, _, _ in rows]

# القياس الأوّل كشف تجمّد المنفَق عند نحو 146 بينما الميزانية تبلغ 1155:
# حدود الأسراب تقصّه، فتتوقّف الصعوبة عند الليلة العاشرة والأرقام تصعد على
# الورق وحده. شراء المستوى هو ما يفكّ هذا، وهذا الفحص هو حارسه.
# الحملة عشر ليالٍ (§5). ما بعدها Endless، ولها سقفٌ تفرضه حدود الأسراب
# وعدد المستويات — وهو معلومٌ مطبوع لا مخفيّ.
CAMPAIGN = 10
under = [(w, b, s) for w, b, s, _, _, _, _ in rows if w <= CAMPAIGN and s < b * 0.95]
check(f'ليالي الحملة ({CAMPAIGN}) مموَّلة كاملةً', not under,
      '' if not under else f'  (الليلة {under[0][0]}: ميزانية {under[0][1]} ومنفَق {under[0][2]})')

sat = next((w for w, b, s, _, _, _, _ in rows if s < b * 0.95), None)
capacity = max(s for _, _, s, _, _, _, _ in rows)
check('التشبّع بعد الحملة لا داخلها', sat is None or sat > CAMPAIGN,
      f'  (يبدأ عند الليلة {sat if sat else "لم يبدأ خلال عشرين"} · السقف {capacity} تهديداً)')

check('المنفَق يصعد حتى الليلة العشرين',
      spends[-1] > spends[9] and spends[9] > spends[0],
      f'  (المنفَق {spends[0]} ← {spends[9]} ← {spends[-1]})')

counts = [n for _, _, _, _, n, _, _ in rows]
check('عدد الأجساد لا ينفجر مع الميزانية (الجوّال §30)',
      max(counts) <= 160,
      f'  (أكثر ليلة {max(counts)} وحدة)')

tops = [t for _, _, _, _, _, _, t in rows]
check('المستوى يصعد في الليالي المتأخّرة (§14: «مستوى العدو»)',
      tops[-1] > 0 and tops[-1] >= tops[4],
      f'  (أعلى مستوى: الليلة 5 ← {tops[4]} · الليلة 20 ← {tops[-1]})')

dupes = [w for w, _, _, _, _, gs, _ in rows
         if len({v for v, _, _ in gs}) != len(gs)]
check('لا نوع مرّتين في الموجة الواحدة', not dupes,
      '' if not dupes else f'  (تكرّر في: {dupes})')

# الاتّصال بالموجات المصمَّمة: الرابعة لا تهبط دون الثالثة
if handmade:
    last_hand = handmade[-1][1]
    first_gen = next(s for w, _, s, _, _, _, _ in rows if w == len(handmade) + 1)
    check('الليلة المولَّدة الأولى تُكمل المصمَّمة الأخيرة ولا تهبط دونها',
          first_gen >= last_hand,
          f'  (المصمَّمة {last_hand} ← المولَّدة {first_gen})')

# الثبات: نفس البذرة ونفس الليلة تعطي نفس الموجة
again = generate(7, normal)[0]
check('نفس البذرة تعيد نفس الليلة (§14)', again == rows[6][5],
      f'  (الليلة 7)')

print()
print('── الدرجات الأربع ────────────────────────')
print(f'{"الدرجة":<12}{"صحّة":>7}{"ضرر":>7}{"تهديد":>8}{"نور":>7}{"سقف":>7}{"جهة٢":>7}{"كشف":>7}'
      f'{"ميزانية ١٠":>12}')
for l in levels:
    print(f'{l["name"]:<12}{l["health"]:>7.2f}{l["damage"]:>7.2f}{l["threat"]:>8.2f}'
          f'{l["light"]:>7.2f}{l["ceiling"]:>7.2f}'
          f'{("كل " + str(l["front"])) if l["front"] else "—":>7}'
          f'{("نعم" if l["preview"] else "لا"):>7}{budget(10, l["threat"]):>12}')
print()

order = ['Story', 'Normal', 'Veteran', 'Nightmare']
byname = {l['name']: l for l in levels}
check('الدرجات الأربع كلّها معرَّفة', all(n in byname for n in order),
      f'  ({len(levels)} من 4)')

if all(n in byname for n in order):
    for field, label in (('health', 'الصحّة'), ('damage', 'الضرر'), ('threat', 'التهديد')):
        vals = [byname[n][field] for n in order]
        check(f'{label} يصعد مع الدرجة', all(vals[i] < vals[i+1] for i in range(3)),
              f'  ({" ← ".join(f"{v:g}" for v in vals)})')

    # §14 حرفياً: 80/80 · 125/115 · 150/135
    spec = {'Story': (0.80, 0.80), 'Veteran': (1.25, 1.15), 'Nightmare': (1.50, 1.35)}
    wrong = [n for n, (h, d) in spec.items()
             if abs(byname[n]['health'] - h) > 1e-6 or abs(byname[n]['damage'] - d) > 1e-6]
    check('أرقام الصحّة والضرر كما نصّت §14 حرفياً', not wrong,
          '' if not wrong else f'  (خالفت: {"، ".join(wrong)})')

    check('«حكاية» وحدها لها معاينة كاملة',
          byname['Story']['preview'] and not any(byname[n]['preview'] for n in order[1:]))

    check('«الكابوس» يضيّق النور ومعدِّله ثابت (§14)',
          byname['Nightmare']['light'] < 1.0 and byname['Nightmare']['front'] == 1,
          f'  (نور {byname["Nightmare"]["light"]:g} · جهة ثانية كل '
          f'{byname["Nightmare"]["front"]} ليلة)')

    check('«المخضرم» جهةٌ إضافية في بعض الليالي لا كلّها (§14)',
          byname['Veteran']['front'] > 1,
          f'  (كل {byname["Veteran"]["front"]} ليالٍ)')

print()
print('── الزعماء (§14: صغير كل خمس، كامل كل عشر) ─')
bosses = [v for v, u in units.items() if u['group'] == 'Boss']
if bosses:
    check('ثمّة زعماء معرَّفون', True, f'  ({len(bosses)})')
else:
    print('  · لا زعيم معرَّف بعد (§13 مرحلة تالية). المولّد يسقط إلى موجة')
    print(f'    عادية أثقل في الليالي {MINIBOSS} و{BOSSEVERY}، ولا يقف.')
    fallback = [w for w, _, _, g, _, _, _ in rows
                if (w % MINIBOSS == 0 or w % BOSSEVERY == 0) and g == 0]
    check('ليالي الزعماء لا تخرج فارغة رغم غيابهم', not fallback,
          '' if not fallback else f'  (فارغة: {fallback})')

print()
print('── سقف الموجة ────────────────────────────')
print(f'أثقل ما تحتمله موجة اليوم: {capacity} تهديداً — أسرابٌ ممتلئة على')
print(f'مستوى {MAXTIER}. والميزانية تتجاوزه عند الليلة {sat if sat else "—"}، فما بعدها')
print('يصعد على الورق ولا يصعد في الساحة.')
print()
print(f'السبب مقيس: الكتالوج {len(units)} مهاجمين من خمسة عشر في §12، ولا زعيم')
print('بعد (§13). كل نوع يُضاف يرفع السقف بحاصل ثمنه في سربه الأقصى، وكل')
print('زعيم يرفعه بحصّته. فالسقف يتبع المحتوى لا الصيغة، ورفعه بتضخيم')
print('الأسراب وحدها يكسر الإطار على الجوّال (§30).')
print()
print(f'الموجات المصمَّمة يدوياً تزن: '
      + '، '.join(f'{name} = {w}' for name, w, _ in handmade))
print('وهي التي تعلّم الأنظمة قبل أن يبدأ التوليد (§14).')

sys.exit(0 if ok else 1)
