#!/usr/bin/env python3
"""
رسم شخصية الطقس صورةً حقيقية — منحنيات وتظليل وحوافّ ناعمة.

ولماذا هذا الملفّ؟ لأن الرسم بمستطيلاتٍ ودوائر داخل التطبيق سقفُه شكلٌ
هندسي: لا منحنى، ولا تدرّج، ولا حافّة ناعمة. وهذا الراسم يرسم بالمسارات
(Bezier) ويملؤها بتدرّجات، ثم يُصغّر الصورة ثلاث مرّات فتذوب الحوافّ —
وهي الطريقة التي تُرسم بها أيقونات التطبيقات فعلًا.

    python3 scripts/draw-person.py

يُخرج: assets/images/weather/person.png
"""

import math
import struct
import zlib
from pathlib import Path

SS = 3                      # التضخيم قبل التصغير — به تنعم الحوافّ
W, H = 420, 560             # المقاس النهائي
CW, CH = W * SS, H * SS

# ——— الألوان ———
THOBE = (252, 252, 250)
THOBE_SHADE = (222, 228, 236)
THOBE_DEEP = (198, 208, 220)
SKIN = (226, 176, 134)
SKIN_SHADE = (198, 146, 104)
HAIR = (40, 34, 32)
KUMMA = (28, 68, 104)
KUMMA_LIGHT = (46, 96, 142)
GOLD = (199, 162, 82)
SANDAL = (108, 74, 48)
SHADOW = (12, 30, 52)
MASAR = (238, 235, 226)      # المصر: قماشٌ فاتح بنقشٍ كشميري
MASAR_SHADE = (214, 208, 194)
MASAR_PATTERN = (150, 44, 44)
BELT = (176, 138, 74)        # الحزام المنسوج
SILVER = (214, 218, 224)     # فضّة الخنجر
SILVER_DARK = (156, 164, 176)


class Canvas:
    """لوحة RGBA بسيطة: رسمٌ بالمسارات ثم تصغير."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = bytearray(w * h * 4)

    def blend(self, x, y, color, alpha):
        if alpha <= 0 or x < 0 or y < 0 or x >= self.w or y >= self.h:
            return
        i = (y * self.w + x) * 4
        p = self.px
        inv = 1.0 - alpha
        p[i] = int(color[0] * alpha + p[i] * inv)
        p[i + 1] = int(color[1] * alpha + p[i + 1] * inv)
        p[i + 2] = int(color[2] * alpha + p[i + 2] * inv)
        p[i + 3] = int(255 * alpha + p[i + 3] * inv)

    def fill_polygon(self, pts, color, shade=None, alpha=1.0):
        """
        ملءٌ بخوارزمية المسح (scanline).

        وshade دالّةٌ تأخذ (x, y) وتُرجع لونًا — بها يصير التظليل تدرّجًا
        لا لونًا مسطّحًا، وهو الفرق بين «شكل» و«رسم».
        """
        if len(pts) < 3:
            return
        ys = [p[1] for p in pts]
        y0, y1 = max(0, int(min(ys))), min(self.h - 1, int(max(ys)) + 1)
        for y in range(y0, y1 + 1):
            cy = y + 0.5
            xs = []
            n = len(pts)
            for i in range(n):
                ax, ay = pts[i]
                bx, by = pts[(i + 1) % n]
                if (ay <= cy < by) or (by <= cy < ay):
                    t = (cy - ay) / (by - ay)
                    xs.append(ax + t * (bx - ax))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                xa, xb = xs[i], xs[i + 1]
                for x in range(max(0, int(xa)), min(self.w - 1, int(xb)) + 1):
                    c = shade(x, y) if shade else color
                    self.blend(x, y, c, alpha)

    def ellipse(self, cx, cy, rx, ry, color, shade=None, alpha=1.0, rotate=0.0):
        pts = []
        for i in range(72):
            a = i / 72 * math.tau
            x, y = rx * math.cos(a), ry * math.sin(a)
            if rotate:
                x, y = (x * math.cos(rotate) - y * math.sin(rotate),
                        x * math.sin(rotate) + y * math.cos(rotate))
            pts.append((cx + x, cy + y))
        self.fill_polygon(pts, color, shade, alpha)

    def downsample(self, factor):
        w, h = self.w // factor, self.h // factor
        out = bytearray(w * h * 4)
        f2 = factor * factor
        for y in range(h):
            for x in range(w):
                r = g = b = a = 0
                for dy in range(factor):
                    row = (y * factor + dy) * self.w
                    for dx in range(factor):
                        i = (row + x * factor + dx) * 4
                        r += self.px[i]; g += self.px[i + 1]
                        b += self.px[i + 2]; a += self.px[i + 3]
                j = (y * w + x) * 4
                out[j] = r // f2; out[j + 1] = g // f2
                out[j + 2] = b // f2; out[j + 3] = a // f2
        return w, h, out


def bezier(p0, p1, p2, p3, steps=26):
    """منحنى مكعّب مُسطَّح إلى نقاط — به تُرسم أطراف الثوب والوجه."""
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]
        out.append((x, y))
    return out


def vertical_gradient(top_color, bottom_color, y_top, y_bottom):
    span = max(1.0, y_bottom - y_top)

    def shade(_x, y):
        t = min(1.0, max(0.0, (y - y_top) / span))
        return tuple(int(top_color[i] + (bottom_color[i] - top_color[i]) * t) for i in range(3))

    return shade


def side_gradient(light, dark, x_left, x_right):
    span = max(1.0, x_right - x_left)

    def shade(x, _y):
        t = min(1.0, max(0.0, (x - x_left) / span))
        return tuple(int(light[i] + (dark[i] - light[i]) * t) for i in range(3))

    return shade


def draw():
    c = Canvas(CW, CH)
    s = SS
    cx = CW / 2

    # ——— الظلّ على الأرض ———
    for i, (rx, ry, a) in enumerate([(118 * s, 20 * s, 0.10), (86 * s, 14 * s, 0.12)]):
        c.ellipse(cx, 528 * s, rx, ry, SHADOW, alpha=a)

    # ——— الثوب: منحنى يتّسع نحو الأسفل ———
    thobe = []
    thobe += bezier((cx - 42 * s, 172 * s), (cx - 50 * s, 250 * s),
                    (cx - 58 * s, 380 * s), (cx - 62 * s, 496 * s))
    thobe += [(cx + 62 * s, 496 * s)]
    thobe += bezier((cx + 62 * s, 496 * s), (cx + 58 * s, 380 * s),
                    (cx + 50 * s, 250 * s), (cx + 42 * s, 172 * s))
    c.fill_polygon(thobe, THOBE, shade=side_gradient(THOBE, THOBE_SHADE,
                                                     cx - 82 * s, cx + 82 * s))

    shoulders = []
    shoulders += bezier((cx - 42 * s, 176 * s), (cx - 34 * s, 158 * s),
                        (cx - 16 * s, 150 * s), (cx, 150 * s))
    shoulders += bezier((cx, 150 * s), (cx + 16 * s, 150 * s),
                        (cx + 34 * s, 158 * s), (cx + 42 * s, 176 * s))
    shoulders += [(cx + 42 * s, 196 * s), (cx - 42 * s, 196 * s)]
    c.fill_polygon(shoulders, THOBE, shade=side_gradient(THOBE, THOBE_SHADE,
                                                         cx - 42 * s, cx + 42 * s))

    # فتحة الصدر المطرّزة — أوّل ما يميّز الدشداشة العُمانية
    c.fill_polygon([(cx - 4 * s, 168 * s), (cx + 4 * s, 168 * s),
                    (cx + 3 * s, 232 * s), (cx - 3 * s, 232 * s)], GOLD, alpha=0.55)
    c.ellipse(cx, 236 * s, 4 * s, 4 * s, GOLD, alpha=0.6)

    # طيّة الثوب: ظلٌّ رأسيّ خفيف يمنع أن يبدو لوحًا مسطّحًا
    fold = []
    fold += bezier((cx + 8 * s, 200 * s), (cx + 14 * s, 300 * s),
                   (cx + 22 * s, 400 * s), (cx + 26 * s, 498 * s))
    fold += bezier((cx + 44 * s, 498 * s), (cx + 40 * s, 400 * s),
                   (cx + 34 * s, 300 * s), (cx + 26 * s, 200 * s))
    c.fill_polygon(fold, THOBE_DEEP, alpha=0.5)

    # ——— الأكمام والذراعان ———
    for sign in (-1, 1):
        sleeve = []
        sleeve += bezier((cx + sign * 38 * s, 174 * s), (cx + sign * 54 * s, 206 * s),
                         (cx + sign * 60 * s, 258 * s), (cx + sign * 56 * s, 312 * s))
        sleeve += [(cx + sign * 34 * s, 312 * s)]
        sleeve += bezier((cx + sign * 34 * s, 312 * s), (cx + sign * 38 * s, 258 * s),
                         (cx + sign * 34 * s, 210 * s), (cx + sign * 20 * s, 182 * s))
        c.fill_polygon(sleeve, THOBE, shade=side_gradient(
            THOBE_SHADE if sign > 0 else THOBE,
            THOBE if sign > 0 else THOBE_SHADE,
            cx + sign * 20 * s, cx + sign * 60 * s))
        # حدُّ الكمّ — بلا هذا يذوب الذراع في الثوب فيبدو الجسم كتلةً واحدة
        c.fill_polygon([(cx + sign * 36 * s, 306 * s), (cx + sign * 56 * s, 306 * s),
                        (cx + sign * 56 * s, 312 * s), (cx + sign * 36 * s, 312 * s)],
                       THOBE_DEEP, alpha=0.8)

    # اليدان عند طرفَي الكمّين — حيث تقعان طبيعيًّا، لا معلّقتين في الفراغ
    for sign in (-1, 1):
        c.ellipse(cx + sign * 45 * s, 322 * s, 12.5 * s, 16 * s, SKIN,
                  shade=vertical_gradient(SKIN, SKIN_SHADE, 306 * s, 340 * s))

    # ——— الرقبة ———
    c.fill_polygon([(cx - 15 * s, 146 * s), (cx + 15 * s, 146 * s),
                    (cx + 17 * s, 176 * s), (cx - 17 * s, 176 * s)], SKIN_SHADE)

    # ——— الوجه ———
    c.ellipse(cx, 108 * s, 46 * s, 54 * s, SKIN,
              shade=side_gradient(SKIN, SKIN_SHADE, cx - 46 * s, cx + 46 * s))
    # الأذن
    c.ellipse(cx - 46 * s, 112 * s, 10 * s, 14 * s, SKIN_SHADE)

    # اللحية: قوسٌ حول الفكّ
    beard = []
    beard += bezier((cx - 45 * s, 112 * s), (cx - 43 * s, 146 * s),
                    (cx - 22 * s, 158 * s), (cx, 158 * s))
    beard += bezier((cx, 158 * s), (cx + 22 * s, 158 * s),
                    (cx + 43 * s, 146 * s), (cx + 45 * s, 112 * s))
    beard += bezier((cx + 45 * s, 112 * s), (cx + 42 * s, 134 * s),
                    (cx + 24 * s, 140 * s), (cx, 140 * s))
    beard += bezier((cx, 140 * s), (cx - 24 * s, 140 * s),
                    (cx - 42 * s, 134 * s), (cx - 45 * s, 112 * s))
    c.fill_polygon(beard, HAIR, alpha=0.92)

    # العينان والحاجبان
    for sign in (-1, 1):
        c.ellipse(cx + sign * 17 * s, 104 * s, 4.6 * s, 5.4 * s, HAIR)
        c.fill_polygon([(cx + sign * 9 * s, 89 * s), (cx + sign * 27 * s, 91 * s),
                        (cx + sign * 27 * s, 96 * s), (cx + sign * 9 * s, 94 * s)], HAIR, alpha=0.85)
    # الأنف والابتسامة
    c.fill_polygon([(cx - 3 * s, 108 * s), (cx + 4 * s, 108 * s),
                    (cx + 2 * s, 122 * s), (cx - 4 * s, 122 * s)], SKIN_SHADE, alpha=0.75)
    smile = bezier((cx - 13 * s, 130 * s), (cx - 5 * s, 138 * s),
                   (cx + 5 * s, 138 * s), (cx + 13 * s, 130 * s))
    smile += bezier((cx + 13 * s, 132 * s), (cx + 5 * s, 142 * s),
                    (cx - 5 * s, 142 * s), (cx - 13 * s, 132 * s))
    c.fill_polygon(smile, (120, 70, 58), alpha=0.75)

    # ——— المصر: العمامة العُمانية ———
    # ولمَ المصر لا الكمّة؟ لأنه الزيّ الرسمي الذي يُعرف به العُماني في
    # المناسبات، وهو أظهر ما يميّز اللباس العُماني عن غيره في الخليج.
    # ويُرسم لفّاتٍ متراكبة لا قبّةً واحدة: اللفّات هي ما يجعله عمامةً.
    turban = []
    turban += bezier((cx - 54 * s, 78 * s), (cx - 56 * s, 22 * s),
                     (cx + 56 * s, 22 * s), (cx + 54 * s, 78 * s))
    turban += [(cx + 54 * s, 78 * s), (cx - 54 * s, 78 * s)]
    c.fill_polygon(turban, MASAR, shade=side_gradient(MASAR, MASAR_SHADE,
                                                      cx - 54 * s, cx + 54 * s))

    # لفّاتٌ ثلاث: خطوطٌ مائلة تلتفّ حول الرأس
    for i, (y0, y1, tilt) in enumerate([(34, 48, 6), (48, 62, 3), (62, 76, -2)]):
        wrap = []
        wrap += bezier((cx - 54 * s, (y1 + tilt) * s), (cx - 20 * s, (y0 + tilt) * s),
                       (cx + 20 * s, y0 * s), (cx + 54 * s, y1 * s))
        wrap += bezier((cx + 54 * s, (y1 + 5) * s), (cx + 20 * s, (y0 + 5) * s),
                       (cx - 20 * s, (y0 + tilt + 5) * s), (cx - 54 * s, (y1 + tilt + 5) * s))
        c.fill_polygon(wrap, MASAR_SHADE, alpha=0.95)

    # النقش الكشميري: نقاطٌ صغيرة بلون الخمري كما في مصر عُمان
    for row, y in enumerate([40, 54, 68]):
        for i in range(-4, 5):
            c.ellipse(cx + (i * 12 + (6 if row % 2 else 0)) * s, y * s,
                      2.4 * s, 2.4 * s, MASAR_PATTERN, alpha=0.7)

    # طرف المصر المطويّ على الجانب — لا تخلو منه عمامة
    tail = []
    tail += bezier((cx + 48 * s, 60 * s), (cx + 66 * s, 66 * s),
                   (cx + 72 * s, 86 * s), (cx + 64 * s, 104 * s))
    tail += bezier((cx + 64 * s, 104 * s), (cx + 58 * s, 88 * s),
                   (cx + 52 * s, 76 * s), (cx + 44 * s, 70 * s))
    c.fill_polygon(tail, MASAR, shade=vertical_gradient(MASAR, MASAR_SHADE, 60 * s, 104 * s))

    # ——— الحزام والخنجر ———
    # والخنجر ليس زينةً في هذا الرسم: هو شعار عُمان نفسه، ومن رآه عرف اللباس
    # قبل أن يقرأ اسم البلد.
    belt = []
    belt += bezier((cx - 50 * s, 252 * s), (cx - 20 * s, 246 * s),
                   (cx + 20 * s, 246 * s), (cx + 50 * s, 252 * s))
    belt += bezier((cx + 50 * s, 274 * s), (cx + 20 * s, 268 * s),
                   (cx - 20 * s, 268 * s), (cx - 50 * s, 274 * s))
    c.fill_polygon(belt, BELT, shade=vertical_gradient((200, 164, 96), BELT, 246 * s, 274 * s))
    for i in range(-4, 5):
        c.fill_polygon([(cx + i * 11 * s - 2 * s, 252 * s), (cx + i * 11 * s + 2 * s, 250 * s),
                        (cx + i * 11 * s + 2 * s, 270 * s), (cx + i * 11 * s - 2 * s, 272 * s)],
                       (150, 112, 58), alpha=0.5)

    # الخنجر: القبضة فوق الحزام والغمد ينزل تحته — لا أن يتداخلا فيصيرا لطخة
    c.fill_polygon([(cx - 11 * s, 216 * s), (cx + 11 * s, 216 * s),
                    (cx + 12 * s, 244 * s), (cx - 12 * s, 244 * s)], SILVER,
                   shade=vertical_gradient((238, 241, 246), SILVER_DARK, 216 * s, 244 * s))
    c.fill_polygon([(cx - 14 * s, 210 * s), (cx + 14 * s, 210 * s),
                    (cx + 12 * s, 218 * s), (cx - 12 * s, 218 * s)], GOLD)
    c.ellipse(cx, 230 * s, 4.5 * s, 4.5 * s, (170, 134, 64), alpha=0.8)

    # الغمد: ينحني يمينًا ثم يرتفع طرفه — الشكل الذي يُعرف به خنجر عُمان
    sheath = []
    sheath += bezier((cx - 12 * s, 276 * s), (cx - 16 * s, 308 * s),
                     (cx + 2 * s, 330 * s), (cx + 26 * s, 324 * s))
    sheath += bezier((cx + 26 * s, 324 * s), (cx + 40 * s, 320 * s),
                     (cx + 46 * s, 306 * s), (cx + 44 * s, 294 * s))
    sheath += bezier((cx + 44 * s, 294 * s), (cx + 36 * s, 312 * s),
                     (cx + 16 * s, 314 * s), (cx + 8 * s, 300 * s))
    sheath += bezier((cx + 8 * s, 300 * s), (cx + 4 * s, 288 * s),
                     (cx + 8 * s, 282 * s), (cx + 12 * s, 276 * s))
    c.fill_polygon(sheath, SILVER, shade=side_gradient((238, 241, 246), SILVER_DARK,
                                                       cx - 16 * s, cx + 46 * s))
    c.fill_polygon([(cx - 11 * s, 280 * s), (cx + 11 * s, 280 * s),
                    (cx + 10 * s, 288 * s), (cx - 10 * s, 288 * s)], GOLD, alpha=0.7)

    # ——— النعلان ———
    for sign in (-1, 1):
        c.ellipse(cx + sign * 34 * s, 508 * s, 30 * s, 12 * s, SANDAL,
                  shade=vertical_gradient((132, 92, 60), SANDAL, 496 * s, 520 * s))

    return c


def write_png(path, w, h, rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += rgba[y * w * 4:(y + 1) * w * 4]
    comp = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", comp)
    png += chunk(b"IEND", b"")
    Path(path).write_bytes(png)


if __name__ == "__main__":
    canvas = draw()
    w, h, data = canvas.downsample(SS)
    out = Path(__file__).resolve().parent.parent / "assets/images/weather/person.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    write_png(out, w, h, data)
    print(f"✅ {out}  ({w}×{h})")
