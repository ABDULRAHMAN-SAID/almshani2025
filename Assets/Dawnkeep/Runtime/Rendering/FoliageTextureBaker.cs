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

            int blades = Mathf.Max(9, size / 12);
            for (int b = 0; b < blades; b++)
            {
                float rootX = (0.10f + (Next(ref s) * 0.80f)) * size;
                float height = (0.45f + (Next(ref s) * 0.50f)) * size;
                float lean = (Next(ref s) - 0.5f) * 0.55f * size;
                float halfWidth = (0.010f + (Next(ref s) * 0.014f)) * size;
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

        /// <summary>عنقود أوراق لِلَوحات الشجرة المتقاطعة.</summary>
        public static Texture2D LeafCluster(int size, uint seed, Color deep, Color light, bool needles)
        {
            Color[] px = NewTransparent(size);
            uint s = seed == 0u ? 1u : seed;

            int clusters = needles ? Mathf.Max(40, size / 5) : Mathf.Max(26, size / 9);
            float centerX = size * 0.5f;
            float centerY = size * 0.46f;

            for (int c = 0; c < clusters; c++)
                {
                float a = Next(ref s) * Mathf.PI * 2f;
                float r = Mathf.Sqrt(Next(ref s)) * size * (needles ? 0.46f : 0.42f);
                float cx = centerX + (Mathf.Cos(a) * r);
                float cy = centerY + (Mathf.Sin(a) * r * 0.86f);

                float fall = 1f - Mathf.Clamp01(r / (size * 0.5f));
                Color tint = Color.Lerp(deep, light, (0.25f + (Next(ref s) * 0.75f)) * (0.45f + (fall * 0.55f)));

                if (needles)
                {
                    float len = (0.06f + (Next(ref s) * 0.10f)) * size;
                    float ang = a + ((Next(ref s) - 0.5f) * 1.1f);
                    PaintNeedle(px, size, cx, cy, ang, len, tint);
                }
                else
                {
                    float rad = (0.035f + (Next(ref s) * 0.055f)) * size;
                    PaintLeaf(px, size, cx, cy, rad, (Next(ref s) - 0.5f) * 3.1f, tint);
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
                    float ly = (((-dx * sin) + (dy * cos)) / radius) * 1.9f;
                    float d = (lx * lx) + (ly * ly);
                    if (d > 1f)
                    {
                        continue;
                    }

                    Blend(px, (yi * size) + xi, color, Mathf.Clamp01((1f - d) * 2.2f));
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
