using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// أدوات الرسم على لوح الخامة: أرضية مبقّعة، عود عشب، حصاة، شقّ، وطبقة صخرية.
    /// كلّها تلتفّ عند الحواف فتبقى الخامة قابلة للتبليط.
    /// </summary>
    public static class TexturePainter
    {
        /// <summary>أرضية مبقّعة بثلاث طبقات ضجيج — الأساس الذي يظهر بين الأعواد والحصى.</summary>
        public static void Base(TextureCanvas c, uint seed, Color lo, Color hi, float heightAmount)
        {
            int n = c.Size;
            TileableNoise n1 = new TileableNoise(5, seed);
            TileableNoise n2 = new TileableNoise(13, seed + 77u);
            TileableNoise n3 = new TileableNoise(37, seed + 911u);

            for (int y = 0; y < n; y++)
            {
                float v = (y + 0.5f) / n;

                for (int x = 0; x < n; x++)
                {
                    float u = (x + 0.5f) / n;
                    float t = (n1.Sample(u, v) * 0.55f) + (n2.Sample(u, v) * 0.30f) + (n3.Sample(u, v) * 0.15f);
                    t = Mathf.Clamp01((t - 0.28f) * 1.9f);

                    int k = (y * n) + x;
                    c.R[k] = Mathf.Lerp(lo.r, hi.r, t);
                    c.G[k] = Mathf.Lerp(lo.g, hi.g, t);
                    c.B[k] = Mathf.Lerp(lo.b, hi.b, t);
                    c.H[k] = (t - 0.5f) * heightAmount;
                }
            }
        }

        /// <summary>عود عشب: خطّ مقوّس مدبّب، طرفه أفتح وحافّتاه أغمق قليلاً فيقرأ حجمه.</summary>
        public static void Blade(TextureCanvas c, float x0, float y0, float angle, float len, float width,
            Color col, ref TexRandom rng)
        {
            float curve = (rng.Next() - 0.5f) * 0.9f;
            int steps = Mathf.Max(3, Mathf.CeilToInt(len * 1.35f));

            for (int q = 0; q <= steps; q++)
            {
                float t = (float)q / steps;
                float a = angle + (curve * t * t);
                float x = x0 + (Mathf.Cos(a) * len * t);
                float y = y0 + (Mathf.Sin(a) * len * t);
                float w = width * (1f - (t * 0.92f));
                float shade = 0.78f + (0.44f * t);
                float half = Mathf.Max(0.5f, w);
                float px = -Mathf.Sin(a);
                float py = Mathf.Cos(a);

                int span = Mathf.CeilToInt(half);
                for (int o = -span; o <= span; o++)
                {
                    float cover = Mathf.Clamp01(half + 0.5f - Mathf.Abs(o));
                    if (cover <= 0f)
                    {
                        continue;
                    }

                    float edge = Mathf.Abs(o) > half - 0.85f ? 0.86f : 1f;
                    float m = shade * edge;
                    c.Put(x + (px * o), y + (py * o), col.r * m, col.g * m, col.b * m, cover, 0.55f * cover * (1f - (t * 0.5f)));
                }
            }
        }

        /// <summary>حصاة: قبّة بيضوية مضاءة من أعلى، حول حافّتها ظلّ تماس.</summary>
        public static void Pebble(TextureCanvas c, float cx, float cy, float rx, float ry, float rot,
            Color col, ref TexRandom rng)
        {
            float co = Mathf.Cos(rot);
            float si = Mathf.Sin(rot);
            int r = Mathf.CeilToInt(Mathf.Max(rx, ry)) + 2;
            float bumpy = 0.12f + (rng.Next() * 0.22f);
            float ph = rng.Next() * 6.28f;

            for (int dy = -r; dy <= r; dy++)
            {
                for (int dx = -r; dx <= r; dx++)
                {
                    float lx = ((dx * co) + (dy * si)) / rx;
                    float ly = ((-dx * si) + (dy * co)) / ry;
                    float ang = Mathf.Atan2(ly, lx);
                    float rr = 1f + (Mathf.Sin((ang * 3f) + ph) * bumpy * 0.35f);
                    float d = ((lx * lx) + (ly * ly)) / (rr * rr);

                    if (d > 1.25f)
                    {
                        continue;
                    }

                    if (d > 1f)
                    {
                        float sfall = 1f - ((d - 1f) / 0.25f);
                        c.Put(cx + dx, cy + dy, 0f, 0f, 0f, 0.22f * sfall, -0.08f * sfall);
                        continue;
                    }

                    float dome = Mathf.Sqrt(Mathf.Max(0f, 1f - d));
                    float lit = 0.62f + (0.72f * dome) + (-ly * 0.30f);
                    float grain = 0.92f + (0.16f * Mathf.Sin(((dx * 2.7f) + (dy * 3.1f) + ph) * 1.7f));
                    float a = Mathf.Min(1f, ((1f - d) * 6f) + 0.35f);
                    float m = lit * grain;
                    c.Put(cx + dx, cy + dy, col.r * m, col.g * m, col.b * m, a, dome * 1.5f);
                }
            }
        }

        /// <summary>شقّ متعرّج غائر بشفة مضيئة على جانب، يتفرّع أحياناً.</summary>
        public static void Crack(TextureCanvas c, float x0, float y0, float angle, float len, float depth,
            ref TexRandom rng, int recursion)
        {
            float x = x0;
            float y = y0;
            float a = angle;
            int steps = Mathf.CeilToInt(len);

            for (int q = 0; q < steps; q++)
            {
                a += (rng.Next() - 0.5f) * 0.45f;
                x += Mathf.Cos(a);
                y += Mathf.Sin(a);

                float w = depth * (0.6f + (0.8f * Mathf.Sin((float)q / steps * Mathf.PI)));
                float px = -Mathf.Sin(a);
                float py = Mathf.Cos(a);

                for (int o = -2; o <= 2; o++)
                {
                    float t = Mathf.Abs(o) / 2.2f;
                    if (t > 1f)
                    {
                        continue;
                    }

                    float dark = 1f - (0.78f * (1f - t));
                    c.Put(x + (px * o), y + (py * o), dark, dark, dark,
                        (1f - t) * 0.85f * Mathf.Min(1f, w), -(1f - t) * 1.6f * w);
                }

                c.Put(x + (px * 2.2f), y + (py * 2.2f), 1.18f, 1.18f, 1.18f, 0.20f, 0.5f * w);

                if (recursion > 0 && rng.Next() < 0.035f)
                {
                    float branch = a + ((rng.Next() < 0.5f ? 1f : -1f) * (0.6f + (rng.Next() * 0.6f)));
                    Crack(c, x, y, branch, len * 0.35f, depth * 0.7f, ref rng, recursion - 1);
                }
            }
        }

        /// <summary>حزام طبقة صخرية أفقي مموّج — ما يجعل الصخر صخراً لا رمادياً مموّهاً.</summary>
        public static void Stratum(TextureCanvas c, float y0, float thickness, float tone, float warp, uint seed)
        {
            int n = c.Size;
            TileableNoise w = new TileableNoise(6, seed);

            for (int x = 0; x < n; x++)
            {
                float u = (x + 0.5f) / n;
                float off = ((w.Sample(u, 0.5f) - 0.5f) * warp) + ((w.Sample(u * 2.3f, 0.17f) - 0.5f) * warp * 0.4f);

                for (float dy = -thickness; dy <= thickness; dy += 1f)
                {
                    float t = 1f - (Mathf.Abs(dy) / thickness);
                    if (t <= 0f)
                    {
                        continue;
                    }

                    int k = (c.Wrap(Mathf.RoundToInt(y0 + off + dy)) * n) + x;
                    float f = t * 0.75f;
                    float mul = (1f - f) + (tone * f);
                    c.R[k] *= mul;
                    c.G[k] *= mul;
                    c.B[k] *= mul;
                    c.H[k] += (tone - 1f) * t * 2.2f;
                }
            }
        }
        /// <summary>
        /// وجوه صخرية بخلايا فورونوي: الصخر مكسور إلى ألواح غير منتظمة بمفاصل
        /// غائرة وحوافّ مضيئة. هذا شكل الصخر الحقيقي — لا شبكة شقوق مرسومة فوق
        /// ضجيج، فتلك كانت تُقرأ عن بُعد كنسيج عنكبوتي أبيض على الجبل.
        /// تُستدعى بثلاثة مقاييس متراكبة: ألواح كبيرة ثم تكسير ثانوي ثم حبيبات.
        /// </summary>
        public static void Facets(TextureCanvas c, int cellsX, uint seed, Color[] palette,
            float jointWidth, float bevel, float heightAmount, float alpha, float toneSpread)
        {
            int n = c.Size;
            int g = Mathf.Max(2, cellsX);
            float cell = n / (float)g;
            TexRandom rng = new TexRandom(seed);

            float[] ox = new float[g * g];
            float[] oy = new float[g * g];
            float[] tone = new float[g * g];
            int[] pick = new int[g * g];
            for (int i = 0; i < g * g; i++)
            {
                ox[i] = 0.12f + (rng.Next() * 0.76f);
                oy[i] = 0.12f + (rng.Next() * 0.76f);
                tone[i] = (1f - (toneSpread * 0.5f)) + (rng.Next() * toneSpread);
                pick[i] = Mathf.Min(palette.Length - 1, (int)(rng.Next() * palette.Length));
            }

            for (int y = 0; y < n; y++)
            {
                int gj = Mathf.FloorToInt(y / cell);
                for (int x = 0; x < n; x++)
                {
                    int gi = Mathf.FloorToInt(x / cell);
                    float d1 = float.MaxValue;
                    float d2 = float.MaxValue;
                    int best = 0;
                    float by = 0f;

                    for (int dj = -1; dj <= 1; dj++)
                    {
                        for (int di = -1; di <= 1; di++)
                        {
                            int a = gi + di;
                            int b = gj + dj;
                            int idx = (((b % g) + g) % g * g) + (((a % g) + g) % g);
                            float sx = (a + ox[idx]) * cell;
                            float sy = (b + oy[idx]) * cell;
                            float dx = x - sx;
                            float dy = y - sy;
                            float d = (dx * dx) + (dy * dy);
                            if (d < d1)
                            {
                                d2 = d1;
                                d1 = d;
                                best = idx;
                                by = sy;
                            }
                            else if (d < d2)
                            {
                                d2 = d;
                            }
                        }
                    }

                    // القرب من المفصل: الفرق بين أقرب بذرتين هو المسافة إلى الحدّ
                    float edge = Mathf.Sqrt(d2) - Mathf.Sqrt(d1);
                    float joint = 1f - Mathf.Min(1f, edge / Mathf.Max(1e-4f, jointWidth));
                    Color col = palette[pick[best]];
                    float t = tone[best];
                    // انحدار الوجه: أعلاه أفتح وأسفله أغمق فتُقرأ الكتلة مجسّمة
                    float face = 0.86f + (bevel * ((by - y) / cell) * 0.9f);
                    float shade = (1f - (joint * 0.72f)) * face * t;

                    int k = (y * n) + x;
                    c.R[k] += ((col.r * shade) - c.R[k]) * alpha;
                    c.G[k] += ((col.g * shade) - c.G[k]) * alpha;
                    c.B[k] += ((col.b * shade) - c.B[k]) * alpha;
                    c.H[k] += ((((1f - joint) * heightAmount) - (joint * heightAmount * 0.9f)
                                + ((t - 1f) * heightAmount * 0.35f)) - c.H[k]) * alpha;

                    // حافّة مضيئة على الجانب المقابل للمفصل — خافتة عمداً:
                    // اللمعة القوية على مئات الحوافّ تتجمّع فتصير شبكة بيضاء
                    if (joint > 0.55f && joint < 0.9f && (y - by) < 0f)
                    {
                        float l = (joint - 0.55f) / 0.35f;
                        c.R[k] += (1.22f - c.R[k]) * l * 0.22f * alpha;
                        c.G[k] += (1.19f - c.G[k]) * l * 0.22f * alpha;
                        c.B[k] += (1.15f - c.B[k]) * l * 0.22f * alpha;
                    }
                }
            }
        }
    }
}
