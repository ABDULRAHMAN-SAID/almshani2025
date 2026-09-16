#!/usr/bin/env python3
"""
يُخرج طائرةً مقاتلةً واحدة من صورة التشكيل الخماسي:

  assets/images/jets/jet.png

ولماذا واحدة من خمس؟ لأن الخمسة في الصورة نسخةٌ واحدة مكرّرة بمواضع مختلفة.
فحفظُها خمسًا يُثقل التحديث بخمسة أضعاف بلا فائدة، ويمنع أن تتمايل كلُّ
طائرةٍ وحدها في التشكيل كما تفعل المقاتلات الحقيقية وهي تحفظ موقعها.

ويطبع السكربت مواضعها في التشكيل كسورًا من عرض الطائرة الواحدة — ينسخها
JetFormation.tsx فيبني التشكيل نفسه بنسخةٍ واحدة.
"""
import numpy as np
from PIL import Image
from pathlib import Path
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/images/jets/formation-source.png"
OUT = ROOT / "assets/images/jets/jet.png"
WIDTH = 260  # عرض الملفّ الناتج — ثلاثة أضعاف أكبر عرضٍ يُعرض به


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    a = np.array(im)
    lab, n = ndimage.label(a[..., 3] > 30)
    if n != 5:
        raise SystemExit(f"توقّعتُ خمس طائرات، فوجدتُ {n}")

    boxes = []
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

    # القائدة أعلاها، وعليها يُقاس الباقي.
    lead = min(boxes, key=lambda b: b[1])
    jw, jh = lead[2] - lead[0], lead[3] - lead[1]
    lead_cx, lead_cy = (lead[0] + lead[2]) / 2, (lead[1] + lead[3]) / 2

    jet = im.crop(lead).resize((WIDTH, round(jh * WIDTH / jw)), Image.LANCZOS)
    jet.save(OUT, optimize=True)
    print(f"jet.png {jet.size}  ({OUT.stat().st_size // 1024} KB)")

    print("مواضع التشكيل — كسورًا من عرض الطائرة:")
    for x0, y0, x1, y1 in sorted(boxes, key=lambda b: (b[1], b[0])):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        print(f"  {{ dx: {(cx - lead_cx) / jw:+.3f}, dy: {(cy - lead_cy) / jw:+.3f} }},")


if __name__ == "__main__":
    main()
