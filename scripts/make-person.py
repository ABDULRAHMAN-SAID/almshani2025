#!/usr/bin/env python3
"""
يُخرج صور شخصية الطقس من الصورة الأصلية:

  assets/images/weather/person.png      — الجسم كلّه بلا القدمين
  assets/images/weather/foot-front.png  — القدم الأمامية وحدها
  assets/images/weather/foot-back.png   — القدم الخلفية وحدها

ولماذا تُفصل القدمان؟ لأن الصورة الواحدة لا تمشي: الماشي تتقدّم ساقُه،
والصورة الساكنة إن حُرّكت كلّها قفزت. والدشداشة تستر الساقين، فما يُرى من
المشي هو القدمان تحت الحاشية — تتقدّم إحداهما وتتأخّر الأخرى. فتُقصّان من
الصورة على قناتها الشفّافة نفسها وبمقاسها نفسه، وتُحرَّكان في التطبيق كلٌّ
على حدة فوق الجسم.

والملفّات الثلاثة بمقاسٍ واحد عمدًا: تُركَّب في التطبيق فوق بعضها بلا حساب
إزاحة، فلا يزيغ موضع قدمٍ إن تغيّر حجم العرض.
"""
import numpy as np
from PIL import Image
from pathlib import Path
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/images/weather/person-source.png"
OUT = ROOT / "assets/images/weather"
HEIGHT = 640  # ارتفاع الملفّات الناتجة


def feet_mask(a: np.ndarray) -> np.ndarray:
    """بكسلات القدمين: جلدٌ أو نعلٌ في أسفل الصورة، لا ثوبٌ أبيض ولا بشتٌ كحلي."""
    h, w = a.shape[:2]
    r, g, b, al = (a[..., i].astype(np.int16) for i in range(4))
    yy, xx = np.mgrid[0:h, 0:w]

    zone = (yy >= int(h * 0.915)) & (xx <= int(w * 0.72)) & (al > 40)
    skin = (r > 140) & (g > 90) & (b < 150) & (r - b > 35)
    dark = (np.maximum(np.maximum(r, g), b) < 95) & (r >= b)      # سيور النعل
    brown = (r > 55) & (r < 160) & (g > 30) & (g < 115) & (b < 90) & (r > g) & (g >= b)
    navy = b > r + 8                                               # البشت — لا
    lo, hi = np.minimum(np.minimum(r, g), b), np.maximum(np.maximum(r, g), b)
    white = (lo > 165) & (hi - lo < 45)                             # الدشداشة وحافّتها — لا

    m = zone & (skin | dark | brown) & ~navy & ~white
    # حوافُّ الرسم مُنعَّمة: نوسّع بكسلًا واحدًا ليخرج الحرف مع القدم لا مع الجسم.
    m = ndimage.binary_closing(m, np.ones((3, 3), bool))
    # الفتحُ يقتل الخطوط بعرض بكسل — حافّة الحاشية المُنعَّمة تمرّ من مرشّح
    # الجلد لأن لونها بين الأبيض والبشرة، وهي خطٌّ لا قدم.
    m = ndimage.binary_opening(m, np.ones((3, 3), bool))
    m = ndimage.binary_dilation(m, np.ones((3, 3), bool)) & zone
    lab, n = ndimage.label(m)
    if n:
        areas = ndimage.sum(m, lab, index=np.arange(1, n + 1))
        keep = np.flatnonzero(areas >= 40) + 1
        m = np.isin(lab, keep)
    return m


def split_feet(mask: np.ndarray, h: int, w: int) -> tuple[np.ndarray, np.ndarray]:
    """الأمامية أسفل وأيسر، والخلفية أعلى وأيمن — خطٌّ مائل يفصلهما."""
    yy, xx = np.mgrid[0:h, 0:w]
    # النعل الخلفي أعلى (٥٩٧–٦٢٢ من ٦٤٠) والأمامي أسفل (٦٠٥–٦٤٠) ويتراكبان،
    # فالفاصل نعلُ الأمامي من ٦٢٢ نزولًا، وأصابعُه يسارًا من ٦١٢ نزولًا.
    front = mask & ((yy >= int(h * 0.972)) | ((xx <= int(w * 0.32)) & (yy >= int(h * 0.956))))
    back = mask & ~front
    return front, back


def only(a: np.ndarray, mask: np.ndarray) -> Image.Image:
    out = np.zeros_like(a)
    out[mask] = a[mask]
    return Image.fromarray(out, "RGBA")


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    im = src.crop(src.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    w0, h0 = im.size
    im = im.resize((max(1, round(w0 * HEIGHT / h0)), HEIGHT), Image.LANCZOS)
    a = np.array(im)
    h, w = a.shape[:2]
    print(f"الأصل {w0}×{h0} → {w}×{h}")

    mask = feet_mask(a)
    front, back = split_feet(mask, h, w)
    print(f"القدمان: {int(mask.sum())} بكسلًا — أمامية {int(front.sum())}، خلفية {int(back.sum())}")

    body = a.copy()
    body[mask] = 0
    Image.fromarray(body, "RGBA").save(OUT / "person.png", optimize=True)
    only(a, front).save(OUT / "foot-front.png", optimize=True)
    only(a, back).save(OUT / "foot-back.png", optimize=True)
    for name in ("person.png", "foot-front.png", "foot-back.png"):
        print(name, (OUT / name).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
