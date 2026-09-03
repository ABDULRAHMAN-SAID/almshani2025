using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// يرسم خامات النبات الشفّافة برمجياً: خصلة عشب وعنقود أوراق.
    /// لا صورة مستوردة — كل بكسل هنا مولّد بالكود، وهو ما يجعل الأصول أصلية.
    /// </summary>
    public static class FoliageTextureBaker
    {
        /// <summary>خصلة أعواد عشب على خلفية شفّافة — تُستعمل كـ Detail Texture للأرض.</summary>
        public static Texture2D GrassClump(int size, uint seed, Color baseColor, Color tipColor)
        {
            Color[] px = NewTransparent(size);
            uint s = seed == 0u ? 1u : seed;

            int blades = Mathf.Max(14, size / 7);
            for (int b = 0; b < blades; b++)
            {
                float rootX = (0.10f + (Next(ref s) * 0.80f)) * size;
                float height = (0.45f + (Next(ref s) * 0.50f)) * size;
                float lean = (Next(ref s) - 0.5f) * 0.55f * size;
                float halfWidth = (0.013f + (Next(ref s) * 0.017f)) * size;
                float shade = 0.72f + (Next(ref s) * 0.38f);

                int steps = Mathf.CeilToInt(height * 1.5f);
                for (int q = 0; q <= steps; q++)
                {
                    float t = (float)q / steps;
                    float x = rootX + (lean * t * t);
                    float y = t * height;
                    float w = halfWidth * Mathf.Pow(1f - t, 0.65f);
                    if (w < 0.35f)
                    {
                        w = 0.35f;
                    }

                    Color c = Color.Lerp(baseColor, tipColor, Mathf.Pow(t, 0.75f)) * shade;
                    c.a = 1f;
                    PaintColumn(px, size, x, y, w, c);
                }
            }

            return Finish(px, size, "grass_clump");
        }

        /// <summary>
        /// عنقود أوراق لِلَوحات الشجرة المتقاطعة. الكثافة مقصودة: بطاقة شفّافة
        /// بنسبة تغطية دون النصف تبدو أعواداً لا تاجاً.
        /// </summary>
        public static Texture2D LeafCluster(int size, uint seed, Color deep, Color light, bool needles)
        {
            Color[] px = NewTransparent(size);
            uint s = seed == 0u ? 1u : seed;

            float cx0 = size * 0.5f;
            float cy0 = size * 0.48f;
            float k = size / 256f;

            if (needles)
            {
                // رشّات إبر: ساق قصيرة تتفرّع منها إبر — الكثافة من عدد الرشّات
                int sprays = Mathf.Max(16, Mathf.RoundToInt(120f * k * k));
                for (int c = 0; c < sprays; c++)
                {
                    float a = Next(ref s) * Mathf.PI * 2f;
                    float r = Mathf.Pow(Next(ref s), 0.62f) * size * 0.45f;
                    float sx = cx0 + (Mathf.Cos(a) * r);
                    float sy = cy0 + (Mathf.Sin(a) * r * 0.90f);
                    float fall = 1f - Mathf.Clamp01(r / (size * 0.52f));

                    float dirAngle = a + ((Next(ref s) - 0.5f) * 0.8f);
                    float stem = (0.065f + (Next(ref s) * 0.075f)) * size;
                    float dx = Mathf.Cos(dirAngle);
                    float dy = Mathf.Sin(dirAngle);

                    float m0 = (0.32f + (Next(ref s) * 0.58f)) * (0.58f + (fall * 0.42f));
                    Color tint = Color.Lerp(deep, light, m0);

                    int steps = Mathf.CeilToInt(stem * 1.4f);
                    for (int q = 0; q <= steps; q++)
                    {
                        float t = (float)q / steps;
                        PaintColumn(px, size, sx + (dx * stem * t), sy + (dy * stem * t), 1.05f * k, tint);
                    }

                    const int NeedlesPerSpray = 16;
                    for (int nq = 0; nq < NeedlesPerSpray; nq++)
                    {
                        float t = 0.12f + (0.88f * nq / NeedlesPerSpray);
                        float bx = sx + (dx * stem * t);
                        float by = sy + (dy * stem * t);

                        for (int side = -1; side <= 1; side += 2)
                        {
                            float na = dirAngle + (side * (0.62f + (Next(ref s) * 0.55f)));
                            float nl = (0.018f + (Next(ref s) * 0.020f)) * size;
                            float ndx = Mathf.Cos(na);
                            float ndy = Mathf.Sin(na);
                            int st2 = Mathf.CeilToInt(nl * 1.6f);
                            Color c2 = Color.Lerp(deep, light, m0 * (0.82f + (Next(ref s) * 0.36f)));

                            for (int q = 0; q <= st2; q++)
                            {
                                float u = (float)q / st2;
                                PaintColumn(px, size, bx + (ndx * nl * u), by + (ndy * nl * u), (0.95f - (0.45f * u)) * k, c2);
                            }
                        }
                    }
                }
            }
            else
            {
                int leaves = Mathf.Max(120, Mathf.RoundToInt(1100f * k * k));
                for (int c = 0; c < leaves; c++)
                {
                    float a = Next(ref s) * Mathf.PI * 2f;
                    float r = Mathf.Pow(Next(ref s), 0.58f) * size * 0.44f;
                    float cx = cx0 + (Mathf.Cos(a) * r);
                    float cy = cy0 + (Mathf.Sin(a) * r * 0.88f);
                    float fall = 1f - Mathf.Clamp01(r / (size * 0.50f));

                    float m = (0.34f + (Next(ref s) * 0.66f)) * (0.56f + (fall * 0.44f));
                    Color tint = Color.Lerp(deep, light, m);
                    float rad = (0.020f + (Next(ref s) * 0.026f)) * size;
                    PaintLeaf(px, size, cx, cy, rad, Next(ref s) * Mathf.PI * 2f, tint);
                }
            }

            return Finish(px, size, needles ? "needle_cluster" : "leaf_cluster");
        }

        private static void PaintColumn(Color[] px, int size, float x, float y, float halfWidth, Color color)
        {
            int y0 = Mathf.Clamp(Mathf.FloorToInt(y), 0, size - 1);
            int x0 = Mathf.FloorToInt(x - halfWidth);
            int x1 = Mathf.CeilToInt(x + halfWidth);

            for (int xi = x0; xi <= x1; xi++)
            {
                if (xi < 0 || xi >= size)
                {
                    continue;
                }

                float d = Mathf.Abs((xi + 0.5f) - x);
                float cover = Mathf.Clamp01((halfWidth + 0.5f - d) / 1.0f);
                if (cover <= 0f)
                {
                    continue;
                }

                Blend(px, (y0 * size) + xi, color, cover);
            }
        }

        private static void PaintLeaf(Color[] px, int size, float cx, float cy, float radius, float rotation, Color color)
        {
            float cos = Mathf.Cos(rotation);
            float sin = Mathf.Sin(rotation);
            int r = Mathf.CeilToInt(radius) + 1;

            for (int dy = -r; dy <= r; dy++)
            {
                int yi = Mathf.RoundToInt(cy) + dy;
                if (yi < 0 || yi >= size)
                {
                    continue;
                }

                for (int dx = -r; dx <= r; dx++)
                {
                    int xi = Mathf.RoundToInt(cx) + dx;
                    if (xi < 0 || xi >= size)
                    {
                        continue;
                    }

                    float lx = ((dx * cos) + (dy * sin)) / radius;
                    float ly = (((-dx * sin) + (dy * cos)) / radius) * 1.75f;
                    float d = (lx * lx) + (ly * ly);
                    if (d > 1f)
                    {
                        continue;
                    }

                    // عرق الورقة أغمق قليلاً فلا تبدو بقعة صمّاء
                    float vein = Mathf.Abs(ly) < 0.16f ? 0.80f : 1f;
                    Color c = new Color(color.r * vein, color.g * vein, color.b * vein, 1f);
                    Blend(px, (yi * size) + xi, c, Mathf.Clamp01((1f - d) * 3.0f));
                }
            }
        }

        private static void PaintNeedle(Color[] px, int size, float cx, float cy, float angle, float length, Color color)
        {
            float dx = Mathf.Cos(angle);
            float dy = Mathf.Sin(angle);
            int steps = Mathf.CeilToInt(length * 1.6f);

            for (int q = 0; q <= steps; q++)
            {
                float t = (float)q / steps;
                float x = cx + (dx * length * t);
                float y = cy + (dy * length * t);
                PaintColumn(px, size, x, y, 0.75f * (1f - (t * 0.6f)), color);
            }
        }

        private static void Blend(Color[] px, int index, Color color, float cover)
        {
            Color dst = px[index];
            float a = Mathf.Clamp01(dst.a + cover);
            float w = cover / Mathf.Max(a, 1e-4f);
            px[index] = new Color(
                Mathf.Lerp(dst.r, color.r, w),
                Mathf.Lerp(dst.g, color.g, w),
                Mathf.Lerp(dst.b, color.b, w),
                a);
        }

        private static Color[] NewTransparent(int size)
        {
            Color[] px = new Color[size * size];
            for (int i = 0; i < px.Length; i++)
            {
                px[i] = new Color(0f, 0f, 0f, 0f);
            }

            return px;
        }

        private static Texture2D Finish(Color[] px, int size, string name)
        {
            // تسريب اللون تحت الشفّاف: يمنع الهالة السوداء عند التصفية الخطّية
            BleedColor(px, size);

            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, true, false);
            tex.name = name;
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.SetPixels(px);
            tex.Apply(true, false);
            return tex;
        }

        private static void BleedColor(Color[] px, int size)
        {
            for (int pass = 0; pass < 3; pass++)
            {
                Color[] copy = (Color[])px.Clone();
                for (int y = 0; y < size; y++)
                {
                    for (int x = 0; x < size; x++)
                    {
                        int k = (y * size) + x;
                        if (copy[k].a > 0.02f)
                        {
                            continue;
                        }

                        float r = 0f;
                        float g = 0f;
                        float b = 0f;
                        int n = 0;

                        for (int dy = -1; dy <= 1; dy++)
                        {
                            int yy = y + dy;
                            if (yy < 0 || yy >= size)
                            {
                                continue;
                            }

                            for (int dx = -1; dx <= 1; dx++)
                            {
                                int xx = x + dx;
                                if (xx < 0 || xx >= size)
                                {
                                    continue;
                                }

                                Color c = copy[(yy * size) + xx];
                                if (c.a <= 0.02f)
                                {
                                    continue;
                                }

                                r += c.r;
                                g += c.g;
                                b += c.b;
                                n++;
                            }
                        }

                        if (n > 0)
                        {
                            px[k] = new Color(r / n, g / n, b / n, 0f);
                        }
                    }
                }
            }
        }

        private static float Next(ref uint state)
        {
            state = (state * 1664525u) + 1013904223u;
            return (state >> 8) / 16777216f;
        }
    }
}
