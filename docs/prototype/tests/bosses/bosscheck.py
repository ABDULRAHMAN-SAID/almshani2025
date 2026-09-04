# -*- coding: utf-8 -*-
"""
فحص الزعماء (§13) وظهورهم في الليالي (§14).

  cd docs/prototype/tests/bosses && python3 bosscheck.py

يقرأ أرقام الزعماء **من باني الأصول** لا من قيم C# الافتراضية، ويقابلها
بنصّ §13 حيث نصّ صراحةً، ثمّ يحاكي عشرين ليلة ليرى: أيّ ليلةٍ يخرج فيها أيّ
زعيم، وكم يبقى لحاشيته من الميزانية.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

BS  = read('Assets/Editor/DawnkeepBossSetup.cs')
CS  = read('Assets/Editor/DawnkeepCombatSetup.cs')
DIR = read('Assets/Dawnkeep/Runtime/Bosses/BossDirector.cs')
DEF = read('Assets/Dawnkeep/Runtime/Bosses/BossDefinition.cs')

# ── كل زعيم: من كتلة Make(...) ثمّ من SetPrivate التي تليها في دالّته
bosses = {}
for m in re.finditer(r'private static BossDefinition (Make\w+)\(([^)]*)\)\s*\{(.*?)\n        \}',
                     BS, re.S):
    fn, body = m.group(1), m.group(3)
    head = re.search(r'Make\("(\w+)",\s*"([^"]+)",\s*"([^"]+)",\s*\n\s*BossKind\.(\w+)', body)
    if not head:
        continue
    asset, arabic, english, kind = head.groups()

    def num(name, cast=float):
        mm = re.search(name + r':\s*(-?[0-9.]+)f?', body)
        return cast(mm.group(1)) if mm else None

    fields = {}
    for sm in re.finditer(r'SetPrivate\(def,\s*"(\w+)",\s*(-?[0-9.]+)f?\)', body):
        fields[sm.group(1)] = float(sm.group(2))

    rank = re.search(r'rank:\s*BossRank\.(\w+)', body)
    bosses[kind] = dict(asset=asset, name=arabic, english=english, fields=fields,
                        health=num('health'), armour=num('armour'),
                        threat=num('threat', int), taught=num('taughtOn', int),
                        rank=rank.group(1) if rank else '؟', bulk=num('bulk'))

print('── الزعماء المقروءون ─────────────────────')
print(f'{"الزعيم":<14}{"صحّة":>7}{"درع":>6}{"ثمن":>6}{"يُعلَّم":>8}{"الرتبة":>8}{"ضخامة":>8}')
for kind in ('BellRam', 'MireMatron', 'AshCrown', 'EaterOfDawn'):
    b = bosses.get(kind)
    if not b:
        print(f'{kind:<14}  — غير معرَّف')
        continue
    print(f'{b["name"]:<14}{b["health"]:>7.0f}{b["armour"]:>6.2f}{b["threat"]:>6}'
          f'{b["taught"]:>8}{b["rank"]:>8}{b["bulk"]:>8.1f}')
print()

ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

print('── مقابل نصّ §13 حرفياً ──────────────────')

check('الزعماء الأربعة كلّهم معرَّفون',
      all(k in bosses for k in ('BellRam', 'MireMatron', 'AshCrown', 'EaterOfDawn')),
      f'  ({len(bosses)} من 4)')

ram = bosses.get('BellRam', {}).get('fields', {})
check('كبش الجرس: إنذار 1.4 ثانية', ram.get('telegraphSeconds') == 1.4,
      f'  ({ram.get("telegraphSeconds")})')
check('كبش الجرس: الاستدعاء عند نصف الصحّة', ram.get('summonAtHealth') == 0.5,
      f'  ({ram.get("summonAtHealth")})')
check('كبش الجرس: ثلاث شحنات توقف الاندفاع', ram.get('chargeStopCharges') == 3,
      f'  ({ram.get("chargeStopCharges")})')
check('كبش الجرس: ضربة الجدار أثقل من دهس الجند',
      (ram.get('chargeDamage') or 0) > (ram.get('chargeTrample') or 0) * 4,
      f'  (جدار {ram.get("chargeDamage")} · دهس {ram.get("chargeTrample")})')

mat = bosses.get('MireMatron', {}).get('fields', {})
check('أمّ المستنقع: تَسِم مبنيين', mat.get('markCount') == 2,
      f'  ({mat.get("markCount")})')
check('أمّ المستنقع: للبيض نافذة تُحطَّم فيها',
      (mat.get('eggHatchSeconds') or 0) >= 8,
      f'  ({mat.get("eggHatchSeconds")} ث حتى الفقس)')
check('أمّ المستنقع: البيضة تُحطَّم قبل أن تفقس فعلاً',
      (mat.get('eggHealth') or 0) <= 120,
      f'  (صحّتها {mat.get("eggHealth")})')

ash = bosses.get('AshCrown', {}).get('fields', {})
check('تاج الرماد: طور الظلّ يخفض الضرر المتلقَّى',
      0 < (ash.get('shadowDamageTaken') or 1) < 1,
      f'  (يتلقّى {(ash.get("shadowDamageTaken") or 1) * 100:.0f}%)')
check('تاج الرماد: المسار يُرى قبل الإطفاء',
      (ash.get('snuffTelegraph') or 0) > 0,
      f'  ({ash.get("snuffTelegraph")} ث)')
check('تاج الرماد: الطوران يتناوبان بمهلة معلومة',
      (ash.get('phaseSeconds') or 0) > 0, f'  (كل {ash.get("phaseSeconds")} ث)')

eat = bosses.get('EaterOfDawn', {}).get('fields', {})
check('آكل الفجر: ثلاثة أطوار بعتبتين',
      0 < (eat.get('thirdPhaseAt') or 0) < (eat.get('secondPhaseAt') or 0) < 1,
      f'  ({eat.get("secondPhaseAt")} ثمّ {eat.get("thirdPhaseAt")})')
check('آكل الفجر: يستدعي موجة حصار',
      (eat.get('siegeCount') or 0) > 0, f'  ({eat.get("siegeCount")} وحدة)')
check('آكل الفجر: يسحب النور ولا يُطفئه بالكامل',
      (eat.get('lightDrainPerSecond') or 0) > 0 and (eat.get('lightFloor') or 0) > 0,
      f'  (سحب {eat.get("lightDrainPerSecond")}/ث · أرضيّة {eat.get("lightFloor")})')
check('آكل الفجر: أضخم الأربعة صحّةً',
      all(bosses['EaterOfDawn']['health'] > bosses[k]['health']
          for k in bosses if k != 'EaterOfDawn'),
      f'  ({bosses.get("EaterOfDawn", {}).get("health")})')

# §6: لقطة الظهور
intro = re.findall(r'SetPrivate\(def,\s*"introSeconds",\s*([0-9.]+)f\)', BS)
cap = re.search(r'Range\(0f,\s*1\.2f\)', DEF) is not None
check('لقطة الظهور لا تتجاوز 1.2 ثانية (§6)',
      bool(intro) and all(float(x) <= 1.2 for x in intro) and cap,
      f'  ({"، ".join(intro)} · والحقل مقصوص في التعريف: {"نعم" if cap else "لا"})')

skip = 'Skipped()' in read('Assets/Dawnkeep/Runtime/CameraRig/RtsCameraRig.cs')
check('اللقطة قابلة للتخطّي (§6)', skip)

# ── ظهورهم في الليالي: محاكاة اختيار المولّد ─────────────────────────
def setp(name, cast=float):
    m = re.search(r'SetPrivate\(settings,\s*"' + name + r'",\s*(-?[0-9.]+)f?\)', CS)
    return cast(m.group(1)) if m else None

BASE, GROWTH, ZONE = setp('baseBudget'), setp('growth'), setp('zoneFactor')
MINI, EVERY, SHARE = setp('miniBossEvery', int), setp('bossEvery', int), setp('bossShare')

def budget(w):
    return max(1, round(BASE * (GROWTH ** max(0, w - 1)) * ZONE))

print()
print('── ليالي الزعماء ─────────────────────────')
print(f'{"ليلة":>5}{"النوع":>10}{"ميزانية":>9}{"حصّة":>7}   الزعيم الخارج   ما يبقى لحاشيته')

nights = []
HORIZON = 30
for w in range(1, HORIZON + 1):
    full = EVERY > 0 and w % EVERY == 0
    mini = not full and MINI > 0 and w % MINI == 0
    if not (full or mini):
        continue

    b = budget(w)
    share = max(1, round(b * SHARE))
    want = 'Full' if full else 'Mini'
    eligible = [(k, v) for k, v in bosses.items()
                if v['taught'] <= w and v['threat'] <= b and v['rank'] == want]
    if not eligible:
        nights.append((w, full, b, None))
        print(f'{w:>5}{"كامل" if full else "صغير":>10}{b:>9}{share:>7}   — لا زعيم مؤهَّل')
        continue

    # التناوب نفسه الذي في المولّد: الدور برقم الدورة لا بالقرعة
    every = EVERY if full else MINI
    cycle = (w // every) - 1
    eligible.sort(key=lambda kv: kv[1]['taught'])
    pick = eligible[cycle % len(eligible)]

    left = b - pick[1]['threat']
    nights.append((w, full, b, pick[0]))
    print(f'{w:>5}{"كامل" if full else "صغير":>10}{b:>9}{share:>7}   {pick[1]["name"]:<14}'
          f'  {left} تهديداً')

print()
seen = [n[3] for n in nights if n[3]]
check('كل ليلة زعيمٍ تُخرج زعيماً فعلاً',
      all(n[3] for n in nights), f'  ({len(seen)} من {len(nights)})')
# الدور بالتناوب: ليالي الصغار هي الخامسة والخامسة عشرة والخامسة والعشرون
# (العاشرة والعشرون كاملتان)، فثلاثة صغار يستوفون دورتهم في خمسٍ وعشرين.
first = {}
for w, _, _, k in nights:
    if k and k not in first:
        first[k] = w

check(f'الزعماء الأربعة كلّهم يُرَون خلال {HORIZON} ليلة',
      len(first) == 4,
      f'  (رُئي {len(first)}: ' + '، '.join(
          f'{bosses[k]["name"]} في {w}' for k, w in sorted(first.items(), key=lambda kv: kv[1])) + ')')
check('يبقى للحاشية أكثر ممّا يأخذه الزعيم',
      all(b - bosses[k]['threat'] > bosses[k]['threat'] for _, _, b, k in nights if k),
      '')
check('زعيم الحملة يخرج في ليلة كاملة لا صغيرة',
      all(full for w, full, b, k in nights if k == 'EaterOfDawn'))

# §5 تُنهي المرحلة بالنجاة من عشر ليالٍ: زعيم الحملة يجب أن يقع داخلها
CAMPAIGN = 10
check('زعيم الحملة يُلقى داخل الليالي العشر (§5 و§13)',
      any(k == 'EaterOfDawn' and w <= CAMPAIGN for w, _, _, k in nights),
      f'  (يخرج في الليلة {next((w for w, _, _, k in nights if k == "EaterOfDawn"), "—")})')

met = [k for w, _, _, k in nights if k and w <= CAMPAIGN]
check('اللاعب يلقى زعيمين على الأقلّ قبل نهاية الحملة',
      len(met) >= 2, f'  ({"، ".join(bosses[k]["name"] for k in met)})')

# ── القدرات في القائد: كلّ زعيمٍ له فرعه ─────────────────────────────
print()
print('── الأطوار في القائد ─────────────────────')
for kind, arabic in (('BellRam', 'كبش الجرس'), ('MireMatron', 'أمّ المستنقع'),
                     ('AshCrown', 'تاج الرماد'), ('EaterOfDawn', 'آكل الفجر')):
    branch = 'case BossKind.' + kind + ':' in DIR
    check(f'{arabic}: له فرعه في الحلقة', branch)

check('لا `Update` في `Boss` ولا في البيضة ولا في البركة (§1)',
      'void Update' not in read('Assets/Dawnkeep/Runtime/Bosses/Boss.cs')
      and 'void Update' not in read('Assets/Dawnkeep/Runtime/Bosses/BossEgg.cs')
      and 'void Update' not in read('Assets/Dawnkeep/Runtime/Bosses/PoisonPool.cs'))

check('البيضة والبركة مجمَّعتان لا مُنشأتين في مسار اللعب (§1)',
      'TakeEgg()' in DIR and 'TakePool()' in DIR and 'Retire()' in DIR)

sys.exit(0 if ok else 1)
