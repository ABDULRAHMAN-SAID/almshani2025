# -*- coding: utf-8 -*-
"""
فحص بركات الجولة (§15).

  cd docs/prototype/tests/boons && python3 booncheck.py

يقرأ البركات من باني الأصول، ويقابلها بنصّ §15: العدد، والفئات الخمس،
والمفاضلة في كلٍّ منها، وقواعد العرض الأربع.

**وأهمّ ما يفحصه**: أنّ كل رقمٍ تحرّكه بركة **يُقرأ فعلاً** في مكانٍ من
مسار اللعب. بركةٌ تحرّك رقماً لا يقرؤه أحد هي بطاقة شكلية، وهي ممنوعة
(§17) — ولا يكشفها تجميعٌ ولا قراءةُ الملفّ الذي كُتبت فيه.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SETUP  = read('Assets/Editor/DawnkeepBoonSetup.cs')
DEALER = read('Assets/Dawnkeep/Runtime/Boons/BoonDealer.cs')
BOOK   = read('Assets/Dawnkeep/Runtime/Boons/BoonBook.cs')
STATS  = read('Assets/Dawnkeep/Runtime/Boons/BoonStat.cs')
FLAGS  = read('Assets/Dawnkeep/Runtime/Boons/BoonFlag.cs')

# كل ملفّات مسار اللعب: فيها تُقرأ البركات
RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs'):
            path = os.path.join(base, f)
            RUNTIME[os.path.relpath(path, ROOT)] = io.open(path, encoding='utf-8').read()

# ما هو خارج مجلّد البركات نفسه — القراءة الحقيقية تقع هناك
CONSUMERS = {p: t for p, t in RUNTIME.items() if '/Boons/' not in p.replace('\\', '/')}

# ── قراءة البركات من الباني ───────────────────────────────────────
boons = []
for m in re.finditer(r'(Boon|Flagged)\("(\w+)",\s*"([^"]+)",\s*"([^"]+)",\s*\n\s*'
                     r'"([^"]*)",\s*\n\s*"([^"]*)",\s*\n\s*BoonCategory\.(\w+)(.*?)\)\);',
                     SETUP, re.S):
    kind, asset, arabic, english, sumAr, sumEn, category, tail = m.groups()
    changes = [(s, float(v)) for s, v in
               re.findall(r'Change\(BoonStat\.(\w+),\s*(-?[0-9.]+)f\)', tail)]
    flag = re.search(r'BoonFlag\.(\w+)', tail)
    boons.append(dict(asset=asset, name=arabic, english=english,
                      summary=sumAr, category=category, changes=changes,
                      flag=flag.group(1) if flag else None,
                      opens='opensStyle: true' in tail,
                      beacon='requiresBeacon: true' in tail,
                      requires=(re.search(r'requires:\s*BuildingRole\.(\w+)', tail) or [None, None])[1]
                      if re.search(r'requires:\s*BuildingRole\.(\w+)', tail) else None))

print('── البركات المقروءة ──────────────────────')
CATS = ['Hero', 'Army', 'Towers', 'Economy', 'Light']
ARABIC = {'Hero': 'القائد', 'Army': 'الجند', 'Towers': 'الأبراج',
          'Economy': 'الاقتصاد', 'Light': 'النور'}
for c in CATS:
    group = [b for b in boons if b['category'] == c]
    print(f'\n  {ARABIC[c]} ({len(group)}):')
    for b in group:
        marks = []
        if b['flag']:
            marks.append('سلوك')
        if b['opens']:
            marks.append('تفتح أسلوباً')
        tag = ('  [' + '، '.join(marks) + ']') if marks else ''
        print(f'    · {b["name"]:<18} {b["summary"]}{tag}')

print()
print('── مقابل §15 ────────────────────────────')

ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

check('أربع وعشرون بركة', len(boons) == 24, f'  ({len(boons)})')

missing = [c for c in CATS if not any(b['category'] == c for b in boons)]
check('الفئات الخمس كلّها ممثَّلة', not missing,
      '' if not missing else f'  (ناقصة: {"، ".join(missing)})')

thin = [c for c in CATS if len([b for b in boons if b['category'] == c]) < 4]
check('لكل فئة أربع بركات على الأقلّ', not thin,
      '' if not thin else f'  (قليلة: {"، ".join(ARABIC[c] for c in thin)})')

names = [b['name'] for b in boons]
check('لا اسم مكرَّر', len(set(names)) == len(names))

assets = [b['asset'] for b in boons]
check('لا أصل مكرَّر', len(set(assets)) == len(assets))

# المفاضلة: كل بركة فيها مكسب وثمن.
#
# **أرقامٌ مقلوبة**: في المهلة والثمن ومدّة الإطفاء يكون الأقلّ مكسباً
# والأكثر ثمناً — عكس الصحّة والضرر والمدى. أوّل تشغيل لهذا الفحص صاح على
# ستّ بركاتٍ سليمة لأنّه قاس الجميع بمقياسٍ واحد.
INVERTED = {'HeroCooldown', 'BuildCost', 'SnuffSeconds'}

def gains(boon):
    if boon['flag']:
        return True      # السلوك نفسه هو المكسب
    return any((v < 1) if s in INVERTED else (v > 1) for s, v in boon['changes'])

def costs(boon):
    return any((v > 1) if s in INVERTED else (v < 1) for s, v in boon['changes'])

# ثلاث بركاتٍ ثمنُها **في سلوكها** لا في رقمها: التراصّ يُبطئ، وحجر
# الجمر يبطئ الإطلاق، والحصاد الأخير يمنع الإصلاح. ولكلٍّ علامةٌ في الكود
# يتحقّق منها الفحص — وإلّا صار «الثمن في السلوك» عذراً يُقال بلا برهان.
CODED_COST = {
    'PackedRanks':    ('Assets/Dawnkeep/Runtime/Combat/CombatDirector.cs', 'PackSlowPer'),
    'BurningStones':  ('Assets/Dawnkeep/Runtime/Building/BuildingDirector.cs', 'BurningStonesRate'),
    'FinalHarvest':   ('Assets/Dawnkeep/Runtime/Building/BuildingDirector.cs', 'BoonFlag.FinalHarvest'),
}

def coded(boon):
    entry = CODED_COST.get(boon['flag'])
    if not entry:
        return False
    path, marker = entry
    return marker in read(path)

freebies = [b['name'] for b in boons if not costs(b) and not coded(b)]
check('كل بركة فيها ثمنٌ مع مكسبها', not freebies,
      '' if not freebies else f'  (بلا ثمن: {"، ".join(freebies)})')

paid = [b['name'] for b in boons if b['flag'] in CODED_COST]
check('والثمنُ الذي في السلوك موجودٌ في الكود لا في الوصف وحده',
      all(coded(b) for b in boons if b['flag'] in CODED_COST),
      f'  ({"، ".join(paid)})')

gainless = [b['name'] for b in boons if not gains(b)]
check('وكلّها فيها مكسب', not gainless,
      '' if not gainless else f'  (بلا مكسب: {"، ".join(gainless)})')

# البركات السلوكية بلا أرقام لها سلوك فعلاً
hollow = [b['name'] for b in boons if not b['changes'] and not b['flag']]
check('لا بركة فارغة (بلا رقمٍ ولا سلوك)', not hollow,
      '' if not hollow else f'  ({"، ".join(hollow)})')

print()
print('── هل تعمل فعلاً؟ (§17: ممنوع الشكليّ) ───')

declared_stats = set(re.findall(r'^\s*(\w+) = \d+,', STATS, re.M)) - {'None'}
used_stats = {s for b in boons for s, _ in b['changes']}

print(f'{"الرقم":<22}{"بركات":>7}   يُقرأ في')
unread = []
for stat in sorted(used_stats):
    where = [p for p, t in CONSUMERS.items() if 'BoonStat.' + stat in t]
    count = sum(1 for b in boons for s, _ in b['changes'] if s == stat)
    if not where:
        unread.append(stat)
    short = '، '.join(os.path.basename(p)[:-3] for p in where) or '— لا أحد'
    print(f'{stat:<22}{count:>7}   {short}')

check('كل رقمٍ تحرّكه بركة يُقرأ في مسار اللعب', not unread,
      '' if not unread else f'  (لا يُقرأ: {"، ".join(unread)})')

print()
declared_flags = set(re.findall(r'^\s*(\w+) = \d+,', FLAGS, re.M)) - {'None'}
used_flags = {b['flag'] for b in boons if b['flag']}
print(f'{"السلوك":<20}   يُقرأ في')
unread_flags = []
for flag in sorted(used_flags):
    where = [p for p, t in CONSUMERS.items() if 'BoonFlag.' + flag in t]
    if not where:
        unread_flags.append(flag)
    short = '، '.join(os.path.basename(p)[:-3] for p in where) or '— لا أحد'
    print(f'{flag:<20}   {short}')

check('كل سلوكٍ تعد به بركة منفَّذ فعلاً', not unread_flags,
      '' if not unread_flags else f'  (غير منفَّذ: {"، ".join(unread_flags)})')

idle_stats = declared_stats - used_stats
if idle_stats:
    print(f'\n  · أرقامٌ معلنة بلا بركة تحرّكها: {"، ".join(sorted(idle_stats))}')
    print('    (ليست علّة: مساحةٌ لبركاتٍ تالية، لكنّها تُذكر لئلّا تُنسى)')

idle_flags = declared_flags - used_flags
if idle_flags:
    print(f'  · سلوكٌ معلن بلا بركة: {"، ".join(sorted(idle_flags))}')

print()
print('── قواعد العرض الأربع ────────────────────')

nights = re.search(r'boonNights\s*=\s*\{([^}]*)\}', DEALER)
nights = [int(x) for x in re.findall(r'\d+', nights.group(1))] if nights else []
check('ليالي الاختيار هي الثالثة والسادسة والتاسعة (§15)',
      nights == [3, 6, 9], f'  ({nights})')

cards = re.search(r'cardsPerOffer\s*=\s*(\d+)', DEALER)
check('ثلاث بطاقات في المرّة', cards and int(cards.group(1)) == 3,
      f'  ({cards.group(1) if cards else "؟"})')

check('١. لا تُعرض بركة لا تؤثّر — إلا التي تفتح أسلوباً',
      'private bool Useful(' in DEALER and 'OpensStyle' in DEALER)

check('٢. لا ثلاث خيارات من الفئة نفسها',
      'CountInOffer(pick.Category) >= 2' in DEALER)

check('٣. وزنٌ يقلّل تكرار بطاقة ظهرت ولم تُختر',
      'staleWeight' in DEALER and 'private float Weight(' in DEALER)

check('٤. إعادة اختيار واحدة تُكسب من اللعب',
      'CanReroll = false' in DEALER and 'EarnReroll' in DEALER)

earn = [p for p, t in RUNTIME.items() if 'EarnReroll' in t and '/Boons/' not in p.replace('\\', '/')]
check('وإعادة الاختيار تُكسب فعلاً من مكانٍ في اللعب',
      bool(earn), f'  ({"، ".join(os.path.basename(p)[:-3] for p in earn) or "لا أحد يمنحها"})')

opens = [b['name'] for b in boons if b['opens']]
check('ثمّة بركاتٌ «تفتح أسلوباً» تُعرض قبل شرطها',
      bool(opens), f'  ({"، ".join(opens) if opens else "لا شيء"})')

# المضاعفات تُضرب لا تُجمع
check('المضاعفات تُضرب لا تُجمع (تكديسٌ يتناقص من نفسه)',
      'current * changes[i].Multiplier' in BOOK)

# لوحة الاختيار توقف الزمن وتفتح في الاستراحة
PANEL = read('Assets/Dawnkeep/Runtime/UI/BoonPanel.cs')
check('لوحة الاختيار توقف الزمن', 'Time.timeScale = 0f' in PANEL)

WAVES = read('Assets/Dawnkeep/Runtime/Combat/WaveDirector.cs')
check('العرض يُفتح في الاستراحة لا في الاشتباك',
      'WavePhase.Respite' in WAVES and 'OpenFor(WavesCleared)' in WAVES)

print()
print('── محاكاة العرض ─────────────────────────')
print('ثلاث ليالٍ بثلاث بطاقات: تسع بطاقات من أربعٍ وعشرين — أي أنّ اللاعب')
print(f'يرى {9 * 100 // len(boons) if boons else 0}٪ من الكتاب في الجولة الواحدة، ويأخذ ثلاثاً.')
print('وهذه هي إعادة اللعب التي تطلبها §3 (الركيزة الخامسة): جولتان لا')
print('تريان الشيء نفسه، ولا تبنيان الأسلوب نفسه.')

sys.exit(0 if ok else 1)
