# -*- coding: utf-8 -*-
"""
اختبار المُشكِّل العربي مقابل HarfBuzz وFriBiDi.

  pip install pillow            # يجب أن تكون مبنية مع raqm
  python3 rtltest.py            # يطبع تقريراً ويحفظ sidebyside.png

الخطّ يُقرأ من مجلّد الأصول في المشروع نفسه، وجدول الأشكال من ملفّ C# نفسه
(انظر shaper.py) — فلا نسخة ثانية تتخلّف عن الأصل.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
from shaper import shape, FORMS, FIRST, is_shapeable

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.normpath(os.path.join(
    HERE, '..', '..', '..', '..', 'Assets', 'Dawnkeep', 'Art', 'Fonts', 'Amiri-Regular.ttf'))

# ── 1) جدول الأشكال مطابق لترتيب Unicode المتسلسل FE80–FEF4
SEQ = [(0x0621,1),(0x0622,2),(0x0623,2),(0x0624,2),(0x0625,2),(0x0626,4),(0x0627,2),(0x0628,4),
       (0x0629,2),(0x062A,4),(0x062B,4),(0x062C,4),(0x062D,4),(0x062E,4),(0x062F,2),(0x0630,2),
       (0x0631,2),(0x0632,2),(0x0633,4),(0x0634,4),(0x0635,4),(0x0636,4),(0x0637,4),(0x0638,4),
       (0x0639,4),(0x063A,4),(0x0641,4),(0x0642,4),(0x0643,4),(0x0644,4),(0x0645,4),(0x0646,4),
       (0x0647,4),(0x0648,2),(0x0649,2),(0x064A,4)]

def test_table():
    cur, bad = 0xFE80, 0
    for base, cnt in SEQ:
        want = [cur + k for k in range(cnt)] + [0] * (4 - cnt)
        cur += cnt
        got = FORMS[(base - FIRST) * 4:(base - FIRST) * 4 + 4]
        if got != want:
            print('  ✗ %04X' % base, ['%04X' % g for g in got]); bad += 1
    print('جدول الأشكال:', 'مطابق تماماً' if bad == 0 else '%d خطأ' % bad)
    return bad == 0

# ── 2) كل ثنائية حروف تُشكَّل: لا حرف يبقى بصورته الأساسية
def test_pairs():
    letters = [chr(c) for c in range(0x0621, 0x064B) if is_shapeable(c) and c != 0x0640]
    left = 0
    for a in letters:
        for b in letters:
            for ch in shape('ب' + a + b + 'ب'):
                if 0x0621 <= ord(ch) <= 0x064A and ord(ch) != 0x0640:
                    left += 1
                    break
    print('ثنائيات: %d — حروف بقيت بلا شكل: %d' % (len(letters) ** 2, left))
    return left == 0

# ── 3) مقابلة بصرية مع HarfBuzz/FriBiDi
CASES = ['مملكة الرماد','حصن الفجر','البطل','رمّاح','سيّاف','رامٍ','مُغِير','غاشم مدرّع',
         'رامي الليل','استعداد','هجوم','استراحة','المدافعون','المهاجمون','ابدأ الآن',
         'الموجة الأولى','الموجة الثانية','لا إله إلا الله','الموجة 2 من 3','الموجة ٢ من ٣',
         'الموجة القادمة بعد 12 ثانية','٢٥ جندياً','١٠٠٪ من القوّة','٧٫٤ ثانية',
         'Dawnkeep حصن الفجر','لأنّ لإبراهيم لآخر','انتصار!','هزيمة']

def test_render():
    if not os.path.exists(FONT):
        print('لا خطّ في', FONT); return False
    W, SZ = 1200, 44
    img = Image.new('L', (W, len(CASES) * 124 + 20), 255)
    d = ImageDraw.Draw(img)
    fr = ImageFont.truetype(FONT, SZ, layout_engine=ImageFont.Layout.RAQM)
    fb = ImageFont.truetype(FONT, SZ, layout_engine=ImageFont.Layout.BASIC)
    y = 10
    for c in CASES:
        d.text((W - 20, y), c, font=fr, fill=0, anchor='ra', direction='rtl'); y += 62
        d.text((W - 20, y), shape(c), font=fb, fill=110, anchor='ra'); y += 62
    img.save(os.path.join(HERE, 'sidebyside.png'))
    print('حُفظت sidebyside.png — الصفّ الأسود مرجع HarfBuzz، والرمادي خرج المُشكِّل.')
    print('الفرق المقبول: أربطة أميري الزخرفية وتموضع الحركات (GPOS) وحدهما.')
    return True

if __name__ == '__main__':
    ok = test_table() and test_pairs() and test_render()
    sys.exit(0 if ok else 1)
