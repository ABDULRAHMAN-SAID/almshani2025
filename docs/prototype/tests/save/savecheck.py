# -*- coding: utf-8 -*-
"""
فحص نظام الحفظ (§27).

  cd docs/prototype/tests/save && python3 savecheck.py

شقّان:

**الأوّل بنيويّ**: يقرأ ملفّات الحفظ من C# ويقابلها بما عدّدته §27 — الكتل
الإحدى عشرة، والكتابة الذرّية، والبصمة، والنسختين، والترحيل، ومنعِ
`PlayerPrefs` لحفظ التقدّم، وواجهةِ السحابة.

**والثاني خوارزميّ**: ينفّذ منطق التدوير والقراءة **تنفيذاً موازياً** بلغة
أخرى، ويشغّل عليه السيناريوهات نفسها التي يشغّلها `DawnkeepSaveCheck` في
المحرّر. فالمحرّر يثبت أنّ **الشيفرة** تعمل على جهاز المستخدم، وهذا يثبت
أنّ **الخوارزميّة** سليمة قبل أن يفتحه — ولا يغني أحدهما عن الآخر.
"""
import io, os, re, sys, shutil, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(p): return io.open(os.path.join(ROOT, p), encoding='utf-8').read()

SAVE = 'Assets/Dawnkeep/Runtime/Save/'
DATA   = read(SAVE + 'SaveData.cs')
FORMAT = read(SAVE + 'SaveFormat.cs')
FILE   = read(SAVE + 'SaveFile.cs')
MIGR   = read(SAVE + 'SaveMigrations.cs')
CLOUD  = read(SAVE + 'ICloudSaveService.cs')
SERVICE= read(SAVE + 'SaveService.cs')
CHECK  = read('Assets/Editor/DawnkeepSaveCheck.cs')

ok = True
def check(label, passed, detail=''):
    global ok
    if not passed:
        ok = False
    print(f'  {"✓" if passed else "✗"} {label}{detail}')

print('── كتل §27 ──────────────────────────────')

# §27 تعدّ الكتل بأسمائها. الأسماء هنا عربية المعنى، فالمقابلة بالحقل لا باللفظ.
BLOCKS = [
    ('SaveVersion',            r'public int SaveVersion'),
    ('PlayerProfile',          r'class PlayerProfile'),
    ('Settings',               r'class SaveSettings'),
    ('Currencies',             r'class Currencies'),
    ('CampaignProgress',       r'class CampaignProgress'),
    ('HeroProgress',           r'class HeroProgress'),
    ('EquipmentInventory',     r'class EquipmentInventory'),
    ('Research',               r'class ResearchState'),
    ('Quests',                 r'class QuestState'),
    ('PurchasesEntitlements',  r'class PurchasesEntitlements'),
    ('LastDailyResetUtc',      r'LastDailyResetUtc'),
]

missing = [name for name, pattern in BLOCKS if not re.search(pattern, DATA)]
check('الكتل الإحدى عشرة كلّها موجودة', not missing,
      '' if not missing else f'  (ناقصة: {"، ".join(missing)})')

for name, pattern in BLOCKS:
    print(f'      {"·" if re.search(pattern, DATA) else "✗"} {name}')

print()
print('── قواعد §27 ────────────────────────────')

check('بصمة على المحتوى', 'Checksum' in FORMAT and 'Checksum(envelope.Payload)' in FILE)
check('والبصمة تُفحص **قبل** تحليل الحمولة',
      FILE.index('Checksum(envelope.Payload)') < FILE.index('FromJson<SaveData>'))

check('كتابة ذرّية: مؤقّت ثمّ استبدال',
      'TempName' in FILE and 'File.Move(temp, primary)' in FILE)
check('والمؤقّت يُكتب كاملاً قبل أن يُمسّ الأصل',
      FILE.index('File.WriteAllText(temp') < FILE.index('Rotate(primary)'))

check('نسختان احتياطيتان دوارتان',
      'BackupOne' in FORMAT and 'BackupTwo' in FORMAT and 'private static void Rotate' in FILE)
check('والأصل يُنسَخ لا يُنقَل عند التدوير',
      'File.Copy(primary, first, true)' in FILE)

check('القراءة تتدرّج: الأصل ثمّ الأولى ثمّ الثانية',
      FILE.count('TryRead(PathOf(') >= 3
      and 'SaveSource.BackupTwo' in FILE)

check('ترحيل لكل إصدار (§27)',
      'public static SaveData Upgrade' in MIGR and 'private static SaveData Step' in MIGR)
check('والترحيل سلسلةٌ لا قفزة', 'while (data.SaveVersion < SaveFormat.Current' in MIGR)
check('وخطوةٌ ناقصة تُكشف ولا تُدخل في حلقةٍ لا تنتهي',
      'data.SaveVersion == before' in MIGR)

check('صيغةٌ من مستقبل تُرفض ولا تُقرأ',
      'envelope.Version > SaveFormat.Current' in FILE)

check('كتلٌ ناقصة تُصلَح فلا ترمي أوّل قراءة',
      'private static void Repair' in MIGR and 'data.Research = new ResearchState()' in MIGR)

# §27: لا PlayerPrefs لحفظ التقدّم
runtime = {}
for base, _, files in os.walk(os.path.join(ROOT, 'Assets/Dawnkeep/Runtime')):
    for f in files:
        if f.endswith('.cs'):
            path = os.path.join(base, f)
            runtime[os.path.relpath(path, ROOT)] = io.open(path, encoding='utf-8').read()

def code_lines(text):
    """أسطر الشيفرة وحدها: ذكرُ الاسم في تعليقٍ ليس استعمالاً."""
    out = []
    for line in text.split('\n'):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('///'):
            continue
        out.append(line)
    return '\n'.join(out)

prefs = [p for p, t in runtime.items() if 'PlayerPrefs' in code_lines(t)]
check('لا `PlayerPrefs` في مسار اللعب (§27 تمنعه لحفظ التقدّم)',
      not prefs, '' if not prefs else f'  ({"، ".join(os.path.basename(p) for p in prefs)})')

print()
print('── السحابة (§27) ────────────────────────')

check('واجهة `ICloudSaveService` معرَّفة', 'interface ICloudSaveService' in CLOUD)
check('واللعبة تعمل دونها: تنفيذٌ فارغ افتراضيّ',
      'class NullCloudSave' in CLOUD and 'new NullCloudSave()' in SERVICE)
check('التعارض يعرض الوقت والتقدّم من الجهتين',
      'LocalSavedAtUtc' in CLOUD and 'CloudSavedAtUtc' in CLOUD
      and 'LocalAccountXp' in CLOUD and 'CloudAccountXp' in CLOUD)
check('ولا يُحسم بصمت عند اختلافٍ كبير',
      'public bool Large' in CLOUD and 'Resolve(bool keepLocal' in CLOUD)
check('ووقت الخادم متاح لمن يحتاجه', 'ServerTimeUtc' in CLOUD)

print()
print('── الاختبار الذي يعمل في المحرّر ─────────')
SCENARIOS = [
    ('الكتابة والقراءة',      'RoundTrip'),
    ('تدوير النسخ',           'Rotation'),
    ('انقطاع الكتابة',        'InterruptedWrite'),
    ('ملفّ تالف',             'CorruptPrimary'),
    ('الأصل والأولى تالفان',  'CorruptPrimaryAndFirst'),
    ('كلّها تالفة',           'CorruptAll'),
    ('نسخة قديمة',            'OlderVersion'),
    ('نسخة من مستقبل',        'FutureVersion'),
    ('كتلٌ ناقصة',            'MissingBlocks'),
]
for arabic, name in SCENARIOS:
    print(f'      {"·" if name in CHECK else "✗"} {arabic}')

absent = [a for a, n in SCENARIOS if n not in CHECK]
check('السيناريوهات الثلاثة التي توجبها §27 وأكثر', not absent,
      '' if not absent else f'  (ناقصة: {"، ".join(absent)})')
check('ويعمل في مجلّد مؤقّت لا في مجلّد اللاعب',
      'Path.GetTempPath()' in CHECK and 'SaveFile.Folder = sandbox' in CHECK)
check('ويُنظّف بعده مهما سقط', 'finally' in CHECK and 'Directory.Delete(sandbox, true)' in CHECK)

# ── الشقّ الثاني: تنفيذ موازٍ للخوارزميّة ──────────────────────────
print()
print('── الخوارزميّة نفسها، منفَّذةً هنا ────────')

def fnv(text):
    """FNV-1a على وحدات UTF-16 — كما في `SaveFormat.Checksum`."""
    h = 14695981039346656037
    for ch in text:
        c = ord(ch)
        h ^= c & 0xFF
        h = (h * 1099511628211) & 0xFFFFFFFFFFFFFFFF
        h ^= (c >> 8) & 0xFF
        h = (h * 1099511628211) & 0xFFFFFFFFFFFFFFFF
    return '%016x' % h

CURRENT = int(re.search(r'Current = (\d+)', FORMAT).group(1))
OLDEST  = int(re.search(r'Oldest = (\d+)', FORMAT).group(1))

class Disk:
    """قرصٌ من ملفّاتٍ حقيقية في مجلّد مؤقّت — لا قاموسٌ في الذاكرة."""
    def __init__(s, root):
        s.root = root
        s.primary = os.path.join(root, 'save')
        s.bak1 = os.path.join(root, 'bak1')
        s.bak2 = os.path.join(root, 'bak2')
        s.tmp = os.path.join(root, 'tmp')

    def write(s, xp, interrupt=False):
        payload = '{"xp":%d}' % xp
        body = '%d|%s|%s' % (CURRENT, fnv(payload), payload)

        io.open(s.tmp, 'w', encoding='utf-8').write(body[:len(body)//2] if interrupt else body)
        if interrupt:
            return False            # انقطع: الأصل لم يُمَسّ

        # التدوير: الثانية تُمحى، الأولى تصير ثانية، والأصل يُنسَخ إلى الأولى
        if os.path.exists(s.primary):
            if os.path.exists(s.bak1):
                if os.path.exists(s.bak2):
                    os.remove(s.bak2)
                shutil.move(s.bak1, s.bak2)
            shutil.copy2(s.primary, s.bak1)
            os.remove(s.primary)

        shutil.move(s.tmp, s.primary)
        return True

    def corrupt(s, path):
        text = io.open(path, encoding='utf-8').read()
        io.open(path, 'w', encoding='utf-8').write(text[:len(text)//2])

    def try_read(s, path):
        if not os.path.exists(path):
            return None
        try:
            version, checksum, payload = io.open(path, encoding='utf-8').read().split('|', 2)
        except ValueError:
            return None
        if fnv(payload) != checksum:
            return None
        if int(version) > CURRENT or int(version) < OLDEST:
            return None
        m = re.search(r'"xp":(\d+)', payload)
        return int(m.group(1)) if m else None

    def read(s):
        for path, source in ((s.primary, 'أصل'), (s.bak1, 'أولى'), (s.bak2, 'ثانية')):
            value = s.try_read(path)
            if value is not None:
                return value, source
        return None, 'لا شيء'

sandbox = tempfile.mkdtemp(prefix='dawnkeep_save_')
try:
    d = Disk(sandbox)

    d.write(100)
    d.write(200)
    d.write(300)
    check('ثلاث كتباتٍ: الأصل 300 والأولى 200 والثانية 100',
          (d.try_read(d.primary), d.try_read(d.bak1), d.try_read(d.bak2)) == (300, 200, 100),
          f'  ({d.try_read(d.primary)} · {d.try_read(d.bak1)} · {d.try_read(d.bak2)})')

    d.write(400, interrupt=True)
    value, source = d.read()
    check('انقطاع الكتابة يترك الأصل سليماً', (value, source) == (300, 'أصل'),
          f'  ({value} من {source})')

    d.corrupt(d.primary)
    value, source = d.read()
    check('الأصل تالف فتُقرأ الأولى', (value, source) == (200, 'أولى'),
          f'  ({value} من {source})')

    d.corrupt(d.bak1)
    value, source = d.read()
    check('والأولى تالفة فتُقرأ الثانية', (value, source) == (100, 'ثانية'),
          f'  ({value} من {source})')

    d.corrupt(d.bak2)
    value, source = d.read()
    check('كلّها تالفة فلا يُقرأ شيء ولا يُرمى', value is None,
          f'  ({value if value is not None else "لا شيء"})')

    # نسخة من مستقبل
    payload = '{"xp":999}'
    io.open(d.primary, 'w', encoding='utf-8').write(
        '%d|%s|%s' % (CURRENT + 5, fnv(payload), payload))
    check('صيغة من مستقبل تُرفض', d.try_read(d.primary) is None)
    check('ولا تُمحى', os.path.exists(d.primary))

    # ثبات البصمة: نصٌّ عربيّ لا يعطي البصمة نفسها لنصٍّ آخر
    check('البصمة تفرّق بين نصّين عربيّين يختلفان بحرف',
          fnv('{"n":"مُغِير"}') != fnv('{"n":"مُغِيرة"}'))
    check('وبين نصّين يختلفان في البايت الأعلى وحده',
          fnv('م') != fnv('݅'))
finally:
    shutil.rmtree(sandbox, ignore_errors=True)

print()
print('── ما بقي من §27 ────────────────────────')
print('  · التنفيذ السحابيّ (UGS Authentication + Cloud Save) مرحلةُ إنتاج.')
print('    الواجهة والتنفيذ الفارغ موجودان، واللعبة تعمل بلا سحابة كما تنصّ §27.')
print('  · وقتُ الخادم للمكافآت المهمّة: `ServerTimeUtc` في الواجهة، ولا خادم')
print('    بعد — والمكافآت اليومية (§21) لم تُبنَ، فلا يُعتمد على ساعةٍ أصلاً.')

sys.exit(0 if ok else 1)
