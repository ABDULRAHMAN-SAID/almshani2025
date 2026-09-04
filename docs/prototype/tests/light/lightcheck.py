# -*- coding: utf-8 -*-
"""
فحص أرقام نظام النور (§11) قبل أن تُجرَّب في المحرّر.

  python3 lightcheck.py

الأرقام تُقرأ من ملفّات C# نفسها لا تُنسخ، فلا يتخلّف الفحص عن الأصل.
"""
import io, os, re, math

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))

def read(path):
    return io.open(os.path.join(ROOT, path), encoding='utf-8').read()

def field(src, name, default=None):
    m = re.search(r'\bprivate\s+(?:float|int)\s+' + re.escape(name) + r'\s*=\s*([0-9.]+)f?', src)
    if not m:
        if default is None:
            raise KeyError(name)
        return default
    return float(m.group(1))

LS = read('Assets/Dawnkeep/Runtime/Light/LightSettings.cs')
WS = read('Assets/Dawnkeep/Runtime/World/WorldGenSettings.cs')
CS = read('Assets/Editor/DawnkeepCombatSetup.cs')
LU = read('Assets/Editor/DawnkeepLightSetup.cs')

base       = field(LS, 'baseRadius')
perCharge  = field(LS, 'radiusPerCharge')
zoneCut    = field(LS, 'zoneArmourCut')
cutPer     = field(LS, 'armourCutPerCharge')
rangePer   = field(LS, 'rangeBonusPerCharge')
maxCharges = int(field(LS, 'maxChargesPerBeacon'))
stock      = int(field(LS, 'startingCharges'))
snuff      = field(LS, 'snuffSeconds')

castleR = field(WS, 'castleRadius') * field(WS, 'worldScale')
ringFactor = float(re.search(r'CastleRadius\(\)\s*\*\s*([0-9.]+)f', LU).group(1))
count = int(re.search(r'BeaconCount\s*=\s*(\d+)', LU).group(1))

def radius(c): return base * (1 + perCharge * c)
def cut(c):    return min(1.0, zoneCut + cutPer * c)

print('── الهندسة ───────────────────────────────')
ring = castleR * ringFactor
gap = 2 * ring * math.sin(math.pi / count)
print(f'نصف قطر السور        {castleR:6.1f} م')
print(f'حلقة المنارات        {ring:6.1f} م  ({count} منارات)')
print(f'بين متجاورتين        {gap:6.1f} م')
for c in range(1, maxCharges + 1):
    r = radius(c)
    reach = ring + r
    print(f'  {c} شحنة: نصف قطر {r:5.1f} م · تغطّي {min(100, 200*r/gap):5.1f}% من الفجوة'
          f' · تصل إلى {reach:6.1f} م (السور عند ~{castleR*1.16:.0f})')
ok_reach = ring + radius(1) > castleR
print('النور يتجاوز السور بشحنة واحدة:', 'نعم' if ok_reach else '**لا — المنارات لا تحمي الجدار**')

print()
print('── قضم درع الظلام ────────────────────────')
for c in range(0, maxCharges + 1):
    print(f'  {c} شحنة → يقضم {cut(c)*100:5.1f}% من الدرع · +{c*rangePer*100:.0f}% مدى')

print()
print('── الزمن حتى القتل (السيّاف: 17 ضرراً كل 1.05 ث) ──')
HIT, IVL = 17.0, 1.05
# القراءة **بتقطيع النصّ عند كل MakeUnit** لا بتعبير يمتدّ بينها: التعبير
# القديم كان يشترط `)` بعد darkArmour مباشرة، وكل وحدة تنتهي بـ`bounty:`،
# فلم يطابق شيئاً وبقي الجدول فارغاً بلا صياح — وهذا أسوأ من فحصٍ يسقط.
units = {}
for chunk in CS.split('MakeUnit(')[1:]:
    body = chunk.split(');', 1)[0]
    name = re.search(r'"(\w+)",\s*"([^"]+)"', body)
    hp   = re.search(r'health:\s*([0-9.]+)f', body)
    arm  = re.search(r'armour:\s*([0-9.]+)f', body)
    if not (name and hp and arm):
        continue
    dark = re.search(r'darkArmour:\s*([0-9.]+)f', body)
    units[name.group(2)] = (float(hp.group(1)), float(arm.group(1)),
                            float(dark.group(1)) if dark else 0.0)

if not any(d > 0 for _, _, d in units.values()):
    print('  ✗ لم تُقرأ وحدة واحدة بدرع ظلام — تغيّر توقيع MakeUnit؟')

print(f'{"الوحدة":<16}{"في الظلام":>12}{"شحنة":>9}{"شحنتان":>9}{"ثلاث":>9}{"الفارق":>9}')
for name, (hp, arm, dark) in units.items():
    if dark <= 0:
        continue
    row = []
    for c in [0, 1, 2, 3]:
        a = min(0.9, arm + dark * (1 - cut(c) if c > 0 else 1.0))
        dmg = HIT * (1 - a)
        row.append(math.ceil(hp / dmg) * IVL)
    print(f'{name:<16}{row[0]:>11.1f}ث{row[1]:>8.1f}ث{row[2]:>8.1f}ث{row[3]:>8.1f}ث{row[0]/row[3]:>8.1f}×')

print()
print('── المخزون ───────────────────────────────')
print(f'شحنات البداية {stock} + منارة مضاءة سلفاً 1 = {stock+1} من أصل {count*maxCharges} خانة')
print(f'مدّة الإطفاء {snuff:.0f} ث')
