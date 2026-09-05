# -*- coding: utf-8 -*-
"""
فحص التقدّم الدائم (§16).

  cd docs/prototype/tests/meta && python3 metacheck.py

يقرأ الأرقام من باني الأصول ويقابلها بنصّ §16، ثمّ **يحاكي عشرين جولة**
ليقيس: متى يبلغ اللاعب المستوى الثالث فتُفتح سرعة ٢×، ومتى الثامن فتُفتح
٣×، وكم يملك من ذهبٍ ونجوم عند كلٍّ — فلا يبقى «يُفتح تدريجيّاً» كلاماً.
"""
import io, os, re, sys, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SETUP = read('Assets/Editor/DawnkeepMetaSetup.cs')
PROG  = read('Assets/Dawnkeep/Runtime/Meta/Progress.cs')
NODE  = read('Assets/Dawnkeep/Runtime/Meta/ResearchNode.cs')
BOOK  = read('Assets/Dawnkeep/Runtime/Boons/BoonBook.cs')

RUNTIME = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs'):
            path = os.path.join(base, f)
            RUNTIME[os.path.relpath(path, ROOT)] = io.open(path, encoding='utf-8').read()

CONSUMERS = {p: t for p, t in RUNTIME.items()
             if '/Boons/' not in p.replace('\\', '/') and '/Meta/' not in p.replace('\\', '/')}

def setp(name, cast=float):
    m = re.search(r'SetPrivate\(settings,\s*"' + name + r'",\s*(-?[0-9.]+)f?\)', SETUP)
    return cast(m.group(1)) if m else None

XP_BASE   = setp('xpBase')
XP_EXP    = setp('xpExponent')
MAX_ACC   = setp('maxAccountLevel', int)
MAX_HERO  = setp('maxHeroLevel', int)
HP_LVL    = setp('heroHealthPerLevel')
DMG_LVL   = setp('heroDamagePerLevel')
PER_TALENT= setp('levelsPerTalent', int)
# مكافأة §21 (بدّلتها المرحلة 33 عن «لكل ليلة» إلى «لكل مرحلة»):
#   Gold = 100 + 18 × رقم المرحلة + 25 × النجوم الجديدة
#   Account XP = 80 + 12 × رقم المرحلة   ·   Dawn Shards: 0..3
GOLD_BASE = setp('goldBase', int)
GOLD_STG  = setp('goldPerStage', int)
GOLD_STAR = setp('goldPerStar', int)
ACC_BASE  = setp('accountXpBase', int)
ACC_STG   = setp('accountXpPerStage', int)
SHARD_CAP = setp('shardCap', int)
LVL_2X    = setp('doubleSpeedLevel', int)
LVL_3X    = setp('tripleSpeedLevel', int)
LVL_RES   = setp('researchLevel', int)
LVL_VET   = setp('veteranLevel', int)
LVL_NIGHT = setp('nightmareLevel', int)
CAP       = setp('researchCap')
RESPEC    = setp('respecGold', int)

# ── عقد الأبحاث
nodes = []
for m in re.finditer(r'Node\("(\w+)",\s*"([^"]+)",\s*"[^"]+",\s*\n\s*"([^"]*)",\s*"[^"]*",\s*\n'
                     r'\s*ResearchBranch\.(\w+),\s*BoonStat\.(\w+),\s*\n'
                     r'\s*perRank:\s*(-?[0-9.]+)f,\s*ranks:\s*(\d+),\s*gold:\s*(\d+),\s*'
                     r'unlock:\s*(\d+)(.*?)\)\);', SETUP, re.S):
    asset, arabic, summary, branch, stat, per, ranks, gold, unlock, tail = m.groups()
    charges = re.search(r'charges:\s*(\d+)', tail)
    stars = re.search(r'stars:\s*(\d+)', tail)
    nodes.append(dict(asset=asset, name=arabic, summary=summary, branch=branch, stat=stat,
                      per=float(per), ranks=int(ranks), gold=int(gold), unlock=int(unlock),
                      charges=int(charges.group(1)) if charges else 0,
                      stars=int(stars.group(1)) if stars else 1))

print('── الأرقام المقروءة ──────────────────────')
print(f'الخبرة = {XP_BASE:g} × المستوى^{XP_EXP:g} · الحساب حتى {MAX_ACC} · البطل حتى {MAX_HERO}')
print(f'البطل +{HP_LVL*100:g}% صحّة و+{DMG_LVL*100:g}% ضرراً لكل مرتبة · موهبة كل {PER_TALENT}')
print(f'المكافأة (§21): ذهبٌ {GOLD_BASE} + {GOLD_STG}×المرحلة + {GOLD_STAR}×النجوم · '
      f'خبرةٌ {ACC_BASE} + {ACC_STG}×المرحلة · شظايا حتى {SHARD_CAP}')
print(f'يُفتح: أبحاث عند {LVL_RES} · ٢× عند {LVL_2X} · مخضرم عند {LVL_VET} · '
      f'٣× عند {LVL_3X} · كابوس عند {LVL_NIGHT}')
print(f'سقف الأبحاث {CAP*100:g}% · إعادة التوزيع {RESPEC} ذهباً · عقد: {len(nodes)}')
print()

BR = {'Economy': 'الاقتصاد', 'Fortification': 'التحصين',
      'Command': 'القيادة', 'Dawncraft': 'صنعة الفجر'}

print('── شجرة الأبحاث ─────────────────────────')
for b in ('Economy', 'Fortification', 'Command', 'Dawncraft'):
    group = [n for n in nodes if n['branch'] == b]
    print(f'\n  {BR[b]} ({len(group)}):')
    for n in group:
        total = abs(n['per']) * n['ranks'] * 100
        print(f'    · {n["name"]:<16} {n["ranks"]} مراتب × {n["per"]*100:+.0f}% '
              f'= {total:.0f}٪  (من المستوى {n["unlock"]}، {n["gold"]} ذهباً)')

print()
ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

print('── مقابل نصّ §16 حرفياً ──────────────────')
check('صيغة الخبرة 100 × المستوى^1.45',
      abs(XP_BASE - 100) < 1e-6 and abs(XP_EXP - 1.45) < 1e-6,
      f'  ({XP_BASE:g} و{XP_EXP:g})')
check('مستوى الحساب من 1 إلى 30', MAX_ACC == 30, f'  ({MAX_ACC})')
check('مستوى البطل من 1 إلى 40', MAX_HERO == 40, f'  ({MAX_HERO})')
check('زيادة البطل صغيرة: نحو 1.5% صحّة و1% ضرراً',
      abs(HP_LVL - 0.015) < 1e-6 and abs(DMG_LVL - 0.01) < 1e-6,
      f'  ({HP_LVL*100:g}% و{DMG_LVL*100:g}%)')
check('نقطة موهبة كل خمسة مستويات', PER_TALENT == 5, f'  ({PER_TALENT})')
check('سقف الأبحاث نحو 30% على أي رقم أساس', abs(CAP - 0.30) < 1e-6, f'  ({CAP*100:g}%)')
check('الفروع الأربعة كلّها ممثَّلة',
      all(any(n['branch'] == b for n in nodes) for b in BR),
      f'  ({len({n["branch"] for n in nodes})} من 4)')
check('كل عقدة تحتاج ذهباً **ونجمة** (§16)',
      all(n['gold'] > 0 and n['stars'] > 0 for n in nodes))
check('يمكن إعادة توزيع النقاط مقابل ذهب',
      'public bool Respec()' in PROG and RESPEC > 0, f'  ({RESPEC} ذهباً)')
check('الفرق يُعرض قبل الشراء وبعده',
      'MetaDelta' in read('Assets/Dawnkeep/Runtime/UI/MetaPanel.cs'))
check('الحدّ لا يُشترى مباشرة (لا شراء لمستوى البطل)',
      'HeroXp' in PROG and 'BuyHeroLevel' not in PROG and 'BuyLevel' not in PROG)

# أمثلة §16 الأربعة
ex = {n['asset']: n for n in nodes}
check('مثال §16: البيوت +5% خمس مراتب',
      any(abs(n['per'] - 0.05) < 1e-6 and n['ranks'] == 5
          and n['stat'] == 'BuildingIncome' for n in nodes))
check('مثال §16: الجدران +6% خمس مراتب',
      any(abs(n['per'] - 0.06) < 1e-6 and n['ranks'] == 5
          and n['stat'] == 'BuildingHealth' for n in nodes))
check('مثال §16: مدى الراية ثلاث مراتب',
      any(n['ranks'] == 3 and n['stat'] == 'HeroRallyRadius' for n in nodes))
check('مثال §16: شحنة نور إضافية مرتبةً واحدة',
      any(n['charges'] > 0 and n['ranks'] == 1 for n in nodes))

# السقف مُحترَم فعلاً
over = []
byStat = {}
for n in nodes:
    if n['stat'] == 'None':
        continue
    byStat.setdefault(n['stat'], 0.0)
    byStat[n['stat']] += abs(n['per']) * n['ranks']
for stat, total in byStat.items():
    if total > CAP + 1e-6:
        over.append((stat, total))
check('لا رقمَ أساس تتجاوز أبحاثُه السقف',
      not over,
      '' if not over else f'  ({over[0][0]}: {over[0][1]*100:.0f}٪ > {CAP*100:g}٪)')

print()
print('── هل تعمل الأبحاث فعلاً؟ ────────────────')
unread = []
for stat in sorted({n['stat'] for n in nodes} - {'None'}):
    where = [p for p, t in CONSUMERS.items() if 'BoonStat.' + stat in t]
    if not where:
        unread.append(stat)
    print(f'  {stat:<20} {"، ".join(os.path.basename(p)[:-3] for p in where) or "— لا أحد"}')

check('كل رقمٍ تحرّكه عقدة بحثٍ يُقرأ في مسار اللعب', not unread,
      '' if not unread else f'  ({"، ".join(unread)})')

check('الأبحاث ومستوى البطل يمرّان من نقطة قراءةٍ واحدة',
      'progress.Permanent(stat)' in BOOK)

charge_node = [n for n in nodes if n['charges'] > 0]
check('شحنة النور الإضافية تُقرأ في حقل النور',
      bool(charge_node) and 'ExtraLightCharges'
      in read('Assets/Dawnkeep/Runtime/Light/LightField.cs'))

check('السرعة مقفلة بالمستوى فعلاً (§16)',
      'SpeedUnlocked' in read('Assets/Dawnkeep/Runtime/UI/PauseMenu.cs'))

check('والدرجات مقفلة بالمستوى (§14: الكابوس بعد إنهاء المنطقة)',
      'DifficultyUnlocked' in read('Assets/Dawnkeep/Runtime/UI/PauseMenu.cs'))

# ── محاكاة عشرين جولة ────────────────────────────────────────────
def xp_for(level):
    return max(1, round(XP_BASE * (level ** XP_EXP)))

def level_of(xp, cap):
    level, spent = 1, 0
    while level < cap:
        need = xp_for(level)
        if xp < spent + need:
            break
        spent += need
        level += 1
    return level

print()
print('── عشرون جولة (نجاةٌ من عشر ليالٍ في كلٍّ) ──')
print(f'{"جولة":>5}{"خبرة":>9}{"مستوى":>7}{"ذهب":>8}{"شظايا":>7}   ما يُفتح')

xp = gold = stars = 0
firstAt = {}
for run in range(1, 21):
    # لاعبٌ يتقدّم مرحلةً في الجولة وينال نجمتين من ثلاث
    earned = 2
    xp += ACC_BASE + (ACC_STG * run)
    gold += GOLD_BASE + (GOLD_STG * run) + (GOLD_STAR * earned)
    stars += min(earned + 1, SHARD_CAP)
    level = level_of(xp, MAX_ACC)

    opened = []
    for name, need in (('الأبحاث', LVL_RES), ('سرعة ٢×', LVL_2X), ('مخضرم', LVL_VET),
                       ('سرعة ٣×', LVL_3X), ('كابوس', LVL_NIGHT)):
        if level >= need and name not in firstAt:
            firstAt[name] = run
            opened.append(name)

    if run <= 12 or opened:
        print(f'{run:>5}{xp:>9}{level:>7}{gold:>8}{stars:>7}   {"، ".join(opened)}')

print()
for name, run in firstAt.items():
    print(f'  · {name}: من الجولة {run}')

missing = [n for n in ('الأبحاث', 'سرعة ٢×', 'مخضرم', 'سرعة ٣×', 'كابوس') if n not in firstAt]
check('كل ما يُفتح بالمستوى يُبلَغ خلال عشرين جولة', not missing,
      '' if not missing else f'  (لم يُبلَغ: {"، ".join(missing)})')

check('الأبحاث تُفتح مبكّراً (الجولة الثالثة فما دونها)',
      firstAt.get('الأبحاث', 99) <= 3, f'  (الجولة {firstAt.get("الأبحاث", "—")})')

check('و٣× ليست في الجولة الأولى — التدرّج مقصود (§16)',
      firstAt.get('سرعة ٣×', 0) > 2, f'  (الجولة {firstAt.get("سرعة ٣×", "—")})')

# كم عقدة يقدر عليها بعد عشرين جولة؟
cheapest = sorted(n['gold'] for n in nodes)
afford = 0
purse = gold
for g in cheapest:
    if purse >= g:
        purse -= g
        afford += 1
print()
print(f'بعد عشرين جولة: {gold} ذهباً و{stars} نجمة — تكفي المرتبة الأولى من')
print(f'{afford} عقدة من {len(nodes)}. فالشجرة لا تُستنفَد في جولاتٍ قليلة،')
print('وهو ما تطلبه §16: «يفتح أنظمة جديدة تدريجيّاً ولا يضيف قوة ضخمة وحده».')

sys.exit(0 if ok else 1)
