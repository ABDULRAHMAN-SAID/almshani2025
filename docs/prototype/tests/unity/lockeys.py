# -*- coding: utf-8 -*-
"""
فحص تغطية مفاتيح النصوص (§21).

  cd docs/prototype/tests/unity && python3 lockeys.py

المفاتيح ثوابت في `LocKeys`، فيكسر المترجمُ خطأ حرفٍ فيها. لكنّه **لا يكشف
مفتاحاً أُعلن ولم يُضَف إلى الجدول**: يمرّ التجميع، ويظهر المفتاح نفسه بين
قوسين مركّنين على الشاشة. هذا الفحص يقابل ثوابت `LocKeys` بصفوف باني الجدول.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

KEYS = io.open(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime/Localization/LocKeys.cs'),
               encoding='utf-8').read()
SETUP = io.open(os.path.join(ROOT, 'Assets/Editor/DawnkeepLocalizationSetup.cs'),
                encoding='utf-8').read()

declared = dict(re.findall(r'public const string (\w+)\s*=\s*"([^"]+)"', KEYS))

# صفّ الجدول كاملاً: الاسم ونصّاه. القراءة بالصفّ لا بجوار الاسم — النظر إلى
# ما بعد الاسم بعدد محارف يمتدّ إلى الصفّ التالي فيُنسَب قالبه إلى سابقه.
ROW = re.compile(r'Row\(LocKeys\.(\w+),\s*\n?\s*"((?:[^"\\]|\\.)*)",\s*\n?\s*"((?:[^"\\]|\\.)*)"\)', re.S)
rows = {}
for m in ROW.finditer(SETUP):
    rows[m.group(1)] = (m.group(2), m.group(3))

missing = sorted(n for n in declared if n not in rows)
extra = sorted(n for n in rows if n not in declared)

print('مفاتيح مُعلنة: %d · صفوف في الجدول: %d' % (len(declared), len(rows)))

for n in missing:
    print('  ✗ %s ("%s") معلَن ولا صفّ له — سيظهر بين قوسين على الشاشة' % (n, declared[n]))
for n in extra:
    print('  ✗ صفّ لمفتاح غير معلَن: %s' % n)

# قيم المفاتيح فريدة: مفتاحان بالنصّ نفسه يعني أنّ أحدهما يطمس الآخر
seen = {}
dupes = 0
for name, value in declared.items():
    if value in seen:
        print('  ✗ المفتاحان %s و%s يحملان النصّ نفسه "%s"' % (seen[value], name, value))
        dupes += 1
    seen[value] = name

# الترجمة الإنجليزية موجودة لكل صفّ
blank = 0
for name, (ar, en) in sorted(rows.items()):
    if not ar.strip():
        print('  ✗ %s بلا نصّ عربي' % name); blank += 1
    if not en.strip():
        print('  ✗ %s بلا ترجمة إنجليزية' % name); blank += 1

# كل قالب فيه {0} يُنادى بـFormat أو Fill لا بـText، والعكس
UI = []
for root, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs'):
            UI.append(io.open(os.path.join(root, f), encoding='utf-8').read())
source = '\n'.join(UI)

bad_use = 0
for name, (ar, en) in sorted(rows.items()):
    has_slot = '{0}' in ar or '{0}' in en
    called_text = re.search(r'Loc\.Text\(LocKeys\.' + name + r'\)', source) is not None
    called_fill = re.search(r'(Loc\.Format|Fill)\(LocKeys\.' + name + r'\b', source) is not None
    if has_slot and called_text:
        print('  ✗ %s قالبٌ فيه {0} ونُودي بـLoc.Text — سيظهر {0} حرفيّاً' % name); bad_use += 1
    if not has_slot and called_fill:
        print('  ✗ %s بلا {0} ونُودي بـFormat — الوسيط يُهمَل صامتاً' % name); bad_use += 1


# ── نصوص المحتوى: أسماء المباني والوحدات والموجات
BUILD = io.open(os.path.join(ROOT, 'Assets/Editor/DawnkeepBuildSetup.cs'), encoding='utf-8').read()
COMBAT = io.open(os.path.join(ROOT, 'Assets/Editor/DawnkeepCombatSetup.cs'), encoding='utf-8').read()

FACTORY = re.compile(r'(?:Economy|Tower|Garrison|WallDef|Obelisk|Bombard|Workshop|BeaconDef)'
                     r'\("(Build_\w+)"')
assets = set(FACTORY.findall(BUILD))
translated = set(re.findall(r'\{ "(Build_\w+)", new\[\]', BUILD))

content = 0
for a in sorted(assets - translated):
    print('  ✗ %s يُبنى ولا ترجمة إنجليزية له — ستُردّ العربية في اللغتين' % a); content += 1
for a in sorted(translated - assets):
    print('  ✗ ترجمة لأصل لا يُبنى: %s (أعيدت تسميته؟)' % a); content += 1

# كل وحدة وموجة تمرّر ترجمتها الإنجليزية
units = re.findall(r'MakeUnit\("(\w+)",\s*"[^"]+",\s*"([^"]*)"', COMBAT)
waves = re.findall(r'MakeWave\("(\w+)",\s*"[^"]+",\s*"([^"]*)"', COMBAT)
for name, en in units + waves:
    if not en.strip():
        print('  ✗ %s بلا ترجمة إنجليزية' % name); content += 1

print('محتوى مترجَم: %d مبنىً · %d وحدة · %d موجة'
      % (len(assets), len(units), len(waves)))

bad = len(missing) + len(extra) + dupes + blank + bad_use + content
print('جدول النصوص:', 'مكتمل' if bad == 0 else '%d مشكلة' % bad)
sys.exit(0 if bad == 0 else 1)
