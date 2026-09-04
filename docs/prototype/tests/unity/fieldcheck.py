# -*- coding: utf-8 -*-
"""
فحص أسماء الحقول المضبوطة بالانعكاس في بناة الأصول.

  cd docs/prototype/tests/unity && python3 fieldcheck.py

لماذا: حقول المفتش `[SerializeField] private` (قاعدة 4)، وبناة الأصول تضبطها
بالانعكاس. اسمٌ مخطئ **لا يكسر التجميع**: يمرّ صامتاً ويطبع تحذيراً في Console
قد لا يقرأه أحد، فيخرج أصلٌ بقيمة افتراضية بدل قيمته المقصودة.

يقرأ كل `[SerializeField]` في المشروع، ويطابق كل `SetPrivate(x, "field", …)`
عليها. يخرج بصفر إن كانت كلّها سليمة.
"""
import io, re, os, sys, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
ASSETS = os.path.join(ROOT, 'Assets')


def serialized_fields(src):
    """أسماء الحقول التي تحمل [SerializeField] في ملفّ."""
    out = set()
    for m in re.finditer(r'\[SerializeField\]', src):
        # العبارة كاملة حتى الفاصلة المنقوطة — قد تمتدّ على أسطر
        stmt = src[m.end(): m.end() + 400].split(';', 1)[0]
        head = stmt.split('=', 1)[0]
        ids = re.findall(r'[A-Za-z_]\w*', head)
        if ids:
            out.add(ids[-1])      # آخر معرّف قبل '=' هو اسم الحقل
    return out


classes = {}
for path in glob.glob(os.path.join(ASSETS, '**', '*.cs'), recursive=True):
    src = io.open(path, encoding='utf-8').read()
    fields = serialized_fields(src)
    for cm in re.finditer(r'\bclass\s+(\w+)', src):
        classes.setdefault(cm.group(1), set()).update(fields)

# الوراثة: `BossDefinition : UnitDefinition` يرث حقول أصله، وبدونها يصيح
# الفحص على كل حقل موروث يضبطه البنّاء — وهي حقول موجودة فعلاً.
parents = {}
for path in glob.glob(os.path.join(ASSETS, '**', '*.cs'), recursive=True):
    src = io.open(path, encoding='utf-8').read()
    for cm in re.finditer(r'\bclass\s+(\w+)\s*:\s*([\w.]+)', src):
        parents[cm.group(1)] = cm.group(2).split('.')[-1]

for child in list(classes):
    seen = set()
    p = parents.get(child)
    while p and p in classes and p not in seen:
        seen.add(p)
        classes[child].update(classes[p])
        p = parents.get(p)

bad = 0
total = 0
for path in glob.glob(os.path.join(ASSETS, 'Editor', '*.cs')):
    src = io.open(path, encoding='utf-8').read()
    for m in re.finditer(r'SetPrivate\(\s*(\w+)\s*,\s*"(\w+)"', src):
        total += 1
        var, field = m.group(1), m.group(2)
        decl = re.search(r'\b([A-Z]\w+)\s+' + re.escape(var) + r'\s*[=;)]', src)
        guessed = decl.group(1) if decl else None
        candidates = [guessed] if guessed and guessed in classes else list(classes)
        if not any(field in classes.get(c, set()) for c in candidates if c):
            print('  ✗ %s: SetPrivate(%s, "%s") — لا حقل بهذا الاسم (الصنف المخمَّن %s)'
                  % (os.path.basename(path), var, field, guessed))
            bad += 1

print('SetPrivate: %d استدعاء — %s'
      % (total, 'كلّها سليمة' if bad == 0 else '%d لا يطابق حقلاً' % bad))
sys.exit(0 if bad == 0 else 1)
