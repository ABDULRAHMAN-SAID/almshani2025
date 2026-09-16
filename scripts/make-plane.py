#!/usr/bin/env python3
"""
يُخرج صورتَي شاشة الرحلات من الصورة الأصلية للطائرة:

  assets/images/flights/plane.png  — بدنُ الطائرة بلا شفرات المروحة
  assets/images/flights/prop.png   — مروحةٌ وحدها، تدور في التطبيق

ولماذا تُفصل المروحة؟ لأن الصورة الواحدة لا تدور إلا كلّها — فتدور الطائرة
بدنًا وذيلًا. والمروحة وحدها تدور حول محورها كما تدور في الواقع.

وشفرات الرسم الأصلي تُمحى ولا تُستعمل: هي مرسومةٌ بزوايا غير متساوية (ما
يراه الرسّام من جانب)، فلو أُديرت لظهر الميل. والمروحة المرسومة هنا متناظرة
فتدور بلا أن يُرى لها أوّل.

والمحو: قناعُ الشفرات يُبنى بالملء من مخروط المروحة — والخطّ الخارجي للرسم
داكنٌ رفيع يسرّب الملء إلى البدن كلّه، فيُقتل بالتآكل قبل الملء ثم يُعاد
التمدّد. ثم يُملأ المقنَّع أفقيًّا من جاريه: فوق السماء يعود شفافًا، وفوق
البدن يعود بلون البدن.
"""
import numpy as np
from PIL import Image, ImageDraw
from pathlib import Path
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/images/flights/plane-source.png"

# مركز كل مروحة ونصف قطرها في إحداثيّات الصورة المقصوصة (١٩٢٠×٦٨٨).
HUBS = [(545, 410, 146), (616, 405, 162)]
# ما يُترك من البدن: مخروطا المروحتين وجسمُ المحرّك تحتهما.
KEEP_ELLIPSES = [(523, 412, 46, 32), (595, 408, 46, 32)]
KEEP_BOXES = [(540, 452, 720, 505)]

OUT_W = 620  # عرض بدن الطائرة في الملفّ الناتج


def blade_mask(im: Image.Image) -> np.ndarray:
    a = np.array(im).astype(np.int16)
    h, w = a.shape[:2]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    yy, xx = np.mgrid[0:h, 0:w]

    disc = np.zeros((h, w), bool)
    for cx, cy, rad in HUBS:
        disc |= (xx - cx) ** 2 + (yy - cy) ** 2 <= rad * rad

    dark = (al > 60) & (np.maximum(np.maximum(r, g), b) < 118)
    gold = (al > 60) & (r > 135) & (g > 85) & (b < 120)
    cand = disc & (dark | gold)

    core = ndimage.binary_erosion(cand, np.ones((5, 5), bool))
    lab, _ = ndimage.label(core)
    seeds = set()
    for cx, cy, _r in HUBS:
        sub = lab[cy - 34:cy + 34, cx - 34:cx + 34]
        seeds |= set(np.unique(sub[sub > 0]).tolist())
    core = np.isin(lab, sorted(seeds))

    mask = ndimage.binary_dilation(core, np.ones((13, 13), bool)) & cand

    # أطرافُ الشفرات الذهبية رفيعة، يأكلها التآكل فتنفصل عن المتن وتبقى
    # نقطًا معلّقة في السماء. وكلّ قطعةٍ صغيرة داخل قرص المروحة شفرةٌ، أمّا
    # خطّ البدن فقطعةٌ واحدة كبيرة.
    lab2, _ = ndimage.label(cand)
    if lab2.max():
        areas = ndimage.sum(cand, lab2, index=np.arange(1, lab2.max() + 1))
        small = np.flatnonzero(areas < 3000) + 1
        mask |= np.isin(lab2, small)
    # حوافُّ الرسم مُنعَّمة، فألوانها بين الشفرة والسماء ولا يلتقطها المرشّح.
    mask = ndimage.binary_dilation(mask, np.ones((5, 5), bool))

    for cx, cy, rx, ry in KEEP_ELLIPSES:
        mask &= ~((((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) <= 1.0)
    for x0, y0, x1, y1 in KEEP_BOXES:
        mask[y0:y1, x0:x1] = False
    return mask


def erase(im: Image.Image, mask: np.ndarray) -> Image.Image:
    """يملأ المقنَّع أفقيًّا من أقرب سليمٍ يمينًا ويسارًا."""
    a = np.array(im).astype(np.float64)
    h, w = a.shape[:2]
    out = a.copy()
    for y in range(h):
        row = mask[y]
        if not row.any():
            continue
        xs = np.flatnonzero(row)
        # حدود كل سلسلة مقنَّعة متّصلة
        splits = np.split(xs, np.flatnonzero(np.diff(xs) > 1) + 1)
        for run in splits:
            left, right = run[0] - 1, run[-1] + 1
            lv = a[y, left] if left >= 0 else None
            rv = a[y, right] if right < w else None
            if lv is None and rv is None:
                out[y, run] = 0
            elif lv is None:
                out[y, run] = rv
            elif rv is None:
                out[y, run] = lv
            else:
                t = ((run - left) / (right - left))[:, None]
                out[y, run] = lv * (1 - t) + rv * t
    return Image.fromarray(out.round().clip(0, 255).astype(np.uint8), "RGBA")


def keep_largest(im: Image.Image) -> Image.Image:
    """يُبقي أكبر قطعةٍ متّصلة — أي الطائرة وحدها.

    وأطرافُ الشفرات الذهبية تنفصل عن متنها عند المحو فتبقى نقطًا معلّقة في
    السماء بلا ما يحملها. وهي غير متّصلة بالبدن، فتسقط بهذه.
    """
    a = np.array(im)
    lab, n = ndimage.label(a[..., 3] > 8)
    if n <= 1:
        return im
    areas = ndimage.sum(a[..., 3] > 8, lab, index=np.arange(1, n + 1))
    biggest = int(np.argmax(areas)) + 1
    a[(lab != biggest) & (lab != 0)] = 0
    return Image.fromarray(a, "RGBA")


def propeller(size: int = 360, blades: int = 6) -> Image.Image:
    """مروحةٌ متناظرة: قرصُ دورانٍ باهت، وشفراتٌ داكنة بأطرافٍ ذهبية، ومحور.

    والقرصُ الباهت ليس زينة: المروحة الدائرة تُرى في الواقع قرصًا شفّافًا لا
    شفراتٍ محدّدة، وهو أيضًا يوحّد المروحتين المتداخلتين فلا تُقرآن نجمةً
    واحدة مشعّثة.
    """
    scale = 4  # تُرسم مكبَّرةً ثم تُصغَّر — فتنعم حوافّها
    s = size * scale
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    c = s / 2
    hub_r = s * 0.070
    tip = s * 0.47
    half = s * 0.038

    for i in range(blades):
        blade = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        bd = ImageDraw.Draw(blade)
        bd.ellipse([c - half, c - tip, c + half, c + hub_r * 0.3],
                   fill=(42, 47, 54, 224))
        bd.ellipse([c - half * 0.72, c - tip, c + half * 0.72, c - tip + s * 0.030],
                   fill=(226, 172, 56, 240))
        blade = blade.rotate(-360.0 * i / blades, resample=Image.BICUBIC, center=(c, c))
        im.alpha_composite(blade)

    d = ImageDraw.Draw(im)
    d.ellipse([c - hub_r, c - hub_r, c + hub_r, c + hub_r], fill=(48, 54, 62, 255))
    d.ellipse([c - hub_r * 0.42, c - hub_r * 0.42, c + hub_r * 0.42, c + hub_r * 0.42],
              fill=(104, 112, 120, 255))
    return im.resize((size, size), Image.LANCZOS)


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    im = src.crop(src.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    w, h = im.size
    print(f"الأصل بعد القصّ: {w}×{h}")

    mask = blade_mask(im)
    print(f"بكسلات الشفرات: {int(mask.sum())}")
    body = erase(im, mask)
    body = keep_largest(body)

    out = ROOT / "assets/images/flights"
    scaled = body.resize((OUT_W, round(h * OUT_W / w)), Image.LANCZOS)
    scaled.save(out / "plane.png", optimize=True)
    print(f"plane.png {scaled.size}")

    prop = propeller()
    prop.save(out / "prop.png", optimize=True)
    print(f"prop.png {prop.size}")

    # المقاسات التي تحتاجها الواجهة: موضع كل محور ونصف قطره نسبةً إلى الصورة.
    for i, (cx, cy, rad) in enumerate(HUBS, 1):
        print(f"مروحة {i}: dx={cx / w - 0.5:+.4f}  dy={cy / h - 0.5:+.4f}  "
              f"قطر={2 * rad / w:.4f} من العرض")


if __name__ == "__main__":
    main()
