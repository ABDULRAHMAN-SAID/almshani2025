#!/usr/bin/env python3
"""
يُخرج صور شخصية الطقس من الصورة الأصلية:

  assets/images/weather/person.png      — الجسم بلا القدمين ولا اليد
  assets/images/weather/foot-front.png  — القدم الأمامية وحدها
  assets/images/weather/foot-back.png   — القدم الخلفية وحدها
  assets/images/weather/hand.png        — الكفّ وحده

ولماذا تُفصل القدمان؟ لأن الصورة الواحدة لا تمشي: الماشي تتقدّم ساقُه،
والصورة الساكنة إن حُرّكت كلّها قفزت. والدشداشة تستر الساقين، فما يُرى من
المشي هو القدمان تحت الحاشية — تتقدّم إحداهما وتتأخّر الأخرى. فتُقصّان من
الصورة على قناتها الشفّافة نفسها وبمقاسها نفسه، وتُحرَّكان في التطبيق كلٌّ
على حدة فوق الجسم.

واليد مثلها: الماشي تتأرجح ذراعه عكس ساقه، ومن تتحرّك قدماه وذراعه جامدة
يبدو آليًّا. والكفُّ وحده يكفي — الكمّ فوقه ساكنٌ كما في الواقع، والحركة
تختفي في الرسغ.

والملفّات بمقاسٍ واحد عمدًا: تُركَّب في التطبيق فوق بعضها بلا حساب
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


def hand_mask(a: np.ndarray) -> np.ndarray:
    """بكسلات الكفّ: جلدٌ تحت الكمّ في وسط الصورة — لا وجهَ ولا قدم هناك."""
    h, w = a.shape[:2]
    r, g, b, al = (a[..., i].astype(np.int16) for i in range(4))
    yy, xx = np.mgrid[0:h, 0:w]

    # النطاق ينتهي قبل حبل الخنجر الذي يظهر تحت الكفّ: لونه دافئٌ كالجلد
    # المظلّل فلا يفرّقه مرشّح لون، ويفرّقه الموضع.
    zone = (
        (yy >= int(h * 0.500)) & (yy <= int(h * 0.594))
        & (xx >= int(w * 0.16)) & (xx <= int(w * 0.56))
        & (al > 40)
    )
    # الجلد مضيئُه ومظلّمه: الظلّ على الكفّ يهبط إلى (٨٧، ٣٧، ٢٤) فلا يلتقطه
    # حدٌّ على السطوع. والنسبة بين القنوات هي ما يبقى: الأحمر يزيد على الأخضر
    # زيادةً بيّنة، والأزرق لا يعلوه — وهذا ما يفصله عن الأبيض والكحليّ.
    skin = (r > 60) & (b < 130) & (r >= g * 1.25) & (g >= b * 0.9)
    m = zone & skin
    m = ndimage.binary_closing(m, np.ones((3, 3), bool))
    m = ndimage.binary_opening(m, np.ones((3, 3), bool))
    m = ndimage.binary_dilation(m, np.ones((3, 3), bool)) & zone
    lab, n = ndimage.label(m)
    if n:
        areas = ndimage.sum(m, lab, index=np.arange(1, n + 1))
        m = lab == (int(np.argmax(areas)) + 1)  # الكفّ أكبرها
    return m


def fill_from_below(a: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """يملأ المقنَّع بما تحته في العمود نفسه.

    والكفّ يقع على الدشداشة البيضاء وحبل الخنجر: وتحته هما، وفوقه الساعد —
    وهو جلدٌ كالكفّ. فالملء من أعلى يجرّ لون الجلد خطوطًا، ومن أسفل يعيد ما
    خلف الكفّ حقًّا. والأفقيّ يمسح الأبيض في الكحليّ.
    """
    out = a.astype(np.float64).copy()
    h, w = a.shape[:2]
    for x in range(w):
        col = mask[:, x]
        if not col.any():
            continue
        ys = np.flatnonzero(col)
        for run in np.split(ys, np.flatnonzero(np.diff(ys) > 1) + 1):
            bottom = run[-1] + 1
            out[run, x] = a[bottom, x] if bottom < h else 0
    return out.round().clip(0, 255).astype(np.uint8)


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

    hand = hand_mask(a)
    print(f"الكفّ: {int(hand.sum())} بكسلًا")

    body = fill_from_below(a, hand)
    body[mask] = 0
    Image.fromarray(body, "RGBA").save(OUT / "person.png", optimize=True)
    only(a, front).save(OUT / "foot-front.png", optimize=True)
    only(a, back).save(OUT / "foot-back.png", optimize=True)
    only(a, hand).save(OUT / "hand.png", optimize=True)

    # موضع الرسغ: أعلى الكفّ — محورُ تأرجحه في التطبيق، كسرًا من الصورة.
    ys, xs = np.where(hand)
    print(f"الرسغ: x={xs.mean() / w:.3f}  y={ys.min() / h:.3f} من الصورة")

    for name in ("person.png", "foot-front.png", "foot-back.png", "hand.png"):
        print(name, (OUT / name).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
