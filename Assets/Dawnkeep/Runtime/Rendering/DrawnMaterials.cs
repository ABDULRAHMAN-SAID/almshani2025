using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// خامات المملكة مرسومة لا مولّدة بالضجيج: كل عود عشب وكل حصاة وكل شقّ وكل مدماك
    /// مرسوم فعلاً. لوحة الألوان أصلية للعبة — لا مأخوذة من أي مصدر خارجي.
    /// </summary>
    public static class DrawnMaterials
    {
        private static readonly Color[] GrassHues =
        {
            new Color(0.243f, 0.373f, 0.129f), new Color(0.318f, 0.443f, 0.157f),
            new Color(0.404f, 0.494f, 0.192f), new Color(0.192f, 0.294f, 0.110f),
            new Color(0.518f, 0.529f, 0.243f), new Color(0.596f, 0.549f, 0.271f),
        };

        public static TextureCanvas GrassGround(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.152f, 0.129f, 0.086f), new Color(0.286f, 0.235f, 0.145f), 1.2f);

            TileableNoise patch = new TileableNoise(11, seed + 313u);
            int blades = Mathf.RoundToInt(15000f * k * k);

            for (int i = 0; i < blades; i++)
            {
                float x = rng.Next() * size;
                float y = rng.Next() * size;

                // بقع جرداء صغيرة تكسر السجّادة الواحدة
                if (patch.Sample((x + 0.5f) / size, (y + 0.5f) / size) < 0.34f && rng.Next() < 0.55f)
                {
                    continue;
                }

                Color col = GrassHues[(int)(rng.Next() * GrassHues.Length) % GrassHues.Length];
                if (rng.Next() < 0.16f)
                {
                    col = new Color((col.r * 1.25f) + 0.10f, (col.g * 1.08f) + 0.05f, col.b * 0.85f);
                }

                TexturePainter.Blade(c, x, y, (-Mathf.PI / 2f) + ((rng.Next() - 0.5f) * 1.5f),
                    (7f + (rng.Next() * 15f)) * k, (0.9f + rng.Next()) * k, col, ref rng);
            }

            int flowers = Mathf.RoundToInt(90f * k * k);
            for (int i = 0; i < flowers; i++)
            {
                float x = rng.Next() * size;
                float y = rng.Next() * size;
                Color col = rng.Next() < 0.5f ? new Color(0.92f, 0.90f, 0.72f) : new Color(0.86f, 0.80f, 0.86f);
                for (int dy = -1; dy <= 1; dy++)
                {
                    for (int dx = -1; dx <= 1; dx++)
                    {
                        if (Mathf.Abs(dx) + Mathf.Abs(dy) < 2)
                        {
                            c.Put(x + dx, y + dy, col.r, col.g, col.b, 0.85f, 0.6f);
                        }
                    }
                }
            }

            return c;
        }

        public static TextureCanvas SoilGround(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.239f, 0.176f, 0.114f), new Color(0.475f, 0.376f, 0.259f), 1.6f);

            int cracks = Mathf.RoundToInt(26f * k * k);
            for (int i = 0; i < cracks; i++)
            {
                TexturePainter.Crack(c, rng.Next() * size, rng.Next() * size, rng.Next() * 6.28f,
                    (30f + (rng.Next() * 90f)) * k, 0.55f + (rng.Next() * 0.5f), ref rng, 2);
            }

            Color[] pebbles =
            {
                new Color(0.408f, 0.365f, 0.310f), new Color(0.502f, 0.451f, 0.380f),
                new Color(0.325f, 0.286f, 0.239f), new Color(0.565f, 0.494f, 0.404f),
            };

            int count = Mathf.RoundToInt(950f * k * k);
            for (int i = 0; i < count; i++)
            {
                float r = (1.2f + (rng.Next() * 3.6f)) * k;
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.65f + (rng.Next() * 0.35f)),
                    rng.Next() * 3.14f, pebbles[(int)(rng.Next() * pebbles.Length) % pebbles.Length], ref rng);
            }

            int twigs = Mathf.RoundToInt(140f * k * k);
            for (int i = 0; i < twigs; i++)
            {
                TexturePainter.Blade(c, rng.Next() * size, rng.Next() * size, rng.Next() * 6.28f,
                    (5f + (rng.Next() * 11f)) * k, (0.6f + (rng.Next() * 0.6f)) * k,
                    new Color(0.290f, 0.235f, 0.153f), ref rng);
            }

            return c;
        }

        public static TextureCanvas RockGround(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.243f, 0.231f, 0.212f), new Color(0.639f, 0.616f, 0.573f), 2.6f);

            int bands = Mathf.RoundToInt(14f + (rng.Next() * 8f));
            for (int i = 0; i < bands; i++)
            {
                TexturePainter.Stratum(c, rng.Next() * size, (4f + (rng.Next() * 16f)) * k,
                    0.58f + (rng.Next() * 0.85f), (14f + (rng.Next() * 34f)) * k, seed + (uint)(i * 57));
            }

            int cracks = Mathf.RoundToInt(58f * k * k);
            for (int i = 0; i < cracks; i++)
            {
                float ang = rng.Next() < 0.65f ? (rng.Next() - 0.5f) * 0.4f : rng.Next() * 6.28f;
                TexturePainter.Crack(c, rng.Next() * size, rng.Next() * size, ang,
                    (48f + (rng.Next() * 190f)) * k, 0.95f + rng.Next(), ref rng, 2);
            }

            int chips = Mathf.RoundToInt(420f * k * k);
            for (int i = 0; i < chips; i++)
            {
                float r = (1.6f + (rng.Next() * 5.5f)) * k;
                float tone = 0.78f + (rng.Next() * 0.5f);
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.5f + (rng.Next() * 0.5f)),
                    rng.Next() * 3.14f, new Color(0.478f * tone, 0.463f * tone, 0.435f * tone), ref rng);
            }

            // أشنة تتجمّع في الشقوق والمنخفضات لا في بقع عشوائية
            TileableNoise lichen = new TileableNoise(9, seed + 4242u);
            float hmin = float.PositiveInfinity;
            float hmax = float.NegativeInfinity;
            for (int i = 0; i < c.H.Length; i++)
            {
                if (c.H[i] < hmin)
                {
                    hmin = c.H[i];
                }

                if (c.H[i] > hmax)
                {
                    hmax = c.H[i];
                }
            }

            float span = Mathf.Max(1e-3f, hmax - hmin);
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    int i = (y * size) + x;
                    float low = 1f - Mathf.Clamp01((c.H[i] - hmin) / span);
                    float t = lichen.Sample((x + 0.5f) / size, (y + 0.5f) / size);
                    float a = Mathf.Min(0.42f, Mathf.Max(0f, (t - 0.55f) * 1.9f) * low * low);
                    if (a > 0.01f)
                    {
                        c.Put(x, y, 0.216f, 0.259f, 0.157f, a, 0f);
                    }
                }
            }

            return c;
        }

        public static TextureCanvas GravelGround(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.361f, 0.329f, 0.278f), new Color(0.545f, 0.510f, 0.447f), 1.0f);

            Color[] pebbles =
            {
                new Color(0.612f, 0.576f, 0.510f), new Color(0.729f, 0.694f, 0.624f),
                new Color(0.482f, 0.451f, 0.396f), new Color(0.663f, 0.612f, 0.522f),
                new Color(0.545f, 0.529f, 0.510f),
            };

            // الحصى الكبير أولاً ثم الصغير يملأ الفجوات
            for (int pass = 0; pass < 3; pass++)
            {
                int count = Mathf.RoundToInt((190f + (pass * 300f)) * k * k);
                float scale = 13.0f - (pass * 3.6f);

                for (int i = 0; i < count; i++)
                {
                    float r = (2.2f + (rng.Next() * scale)) * k;
                    TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.62f + (rng.Next() * 0.38f)),
                        rng.Next() * 3.14f, pebbles[(int)(rng.Next() * pebbles.Length) % pebbles.Length], ref rng);
                }
            }

            return c;
        }

        public static TextureCanvas Bark(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.161f, 0.129f, 0.094f), new Color(0.384f, 0.318f, 0.235f), 1.4f);

            int grooves = Mathf.RoundToInt(150f * k * k);
            for (int i = 0; i < grooves; i++)
            {
                float x = rng.Next() * size;
                float y = rng.Next() * size;
                float len = (60f + (rng.Next() * 260f)) * k;
                float depth = 0.5f + (rng.Next() * 0.9f);
                float xx = x;

                for (int q = 0; q < len; q++)
                {
                    xx += (rng.Next() - 0.5f) * 0.5f;
                    for (int o = -2; o <= 2; o++)
                    {
                        float t = Mathf.Abs(o) / 2.4f;
                        if (t > 1f)
                        {
                            continue;
                        }

                        float dark = 1f - (0.62f * (1f - t) * depth);
                        c.Put(xx + o, y + q, dark, dark, dark, (1f - t) * 0.55f, -(1f - t) * 1.5f * depth);
                    }

                    c.Put(xx + 2.6f, y + q, 1.22f, 1.20f, 1.16f, 0.16f, 0.6f);
                }
            }

            int knots = Mathf.RoundToInt(260f * k * k);
            for (int i = 0; i < knots; i++)
            {
                float r = (1f + (rng.Next() * 2.4f)) * k;
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (1.4f + (rng.Next() * 1.6f)),
                    (rng.Next() - 0.5f) * 0.3f, new Color(0.290f, 0.243f, 0.184f), ref rng);
            }

            return c;
        }
    }
}
