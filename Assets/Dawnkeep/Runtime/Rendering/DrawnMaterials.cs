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
            new Color(0.196f, 0.376f, 0.129f), new Color(0.259f, 0.447f, 0.157f),
            new Color(0.318f, 0.494f, 0.184f), new Color(0.145f, 0.302f, 0.106f),
            new Color(0.400f, 0.510f, 0.212f), new Color(0.482f, 0.522f, 0.243f),
        };

        public static TextureCanvas GrassGround(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.129f, 0.118f, 0.078f), new Color(0.243f, 0.220f, 0.129f), 1.2f);

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
                if (rng.Next() < 0.09f)
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

        private static readonly Color[] RockPlates =
        {
            new Color(0.396f, 0.384f, 0.361f), new Color(0.463f, 0.447f, 0.416f),
            new Color(0.325f, 0.325f, 0.322f), new Color(0.494f, 0.467f, 0.427f),
            new Color(0.361f, 0.365f, 0.369f), new Color(0.435f, 0.412f, 0.376f),
        };

        private static readonly Color[] CliffPlates =
        {
            new Color(0.376f, 0.380f, 0.388f), new Color(0.290f, 0.302f, 0.322f),
            new Color(0.455f, 0.451f, 0.443f), new Color(0.333f, 0.345f, 0.365f),
            new Color(0.243f, 0.255f, 0.278f), new Color(0.420f, 0.408f, 0.388f),
        };

        private static readonly Color[] ScreePlates =
        {
            new Color(0.545f, 0.541f, 0.537f), new Color(0.639f, 0.639f, 0.631f),
            new Color(0.459f, 0.467f, 0.478f), new Color(0.580f, 0.569f, 0.549f),
            new Color(0.494f, 0.502f, 0.518f),
        };

        /// <summary>
        /// صخر الأرض: ألواح فورونوي بثلاثة مقاييس. لا طبقات أفقية ولا شبكة شقوق —
        /// كلتاهما تتكرّر مع البلاطة كل بضع عشرات من الأمتار فتُقرأ على جدار الجبل
        /// كسُلّم أفقي أو نسيج عنكبوتي أبيض.
        /// </summary>
        public static TextureCanvas RockGround(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Facets(c, Mathf.RoundToInt(3f * k), seed, RockPlates, 5.0f * k, 0.34f, 4.2f, 1.0f, 0.30f);
            TexturePainter.Facets(c, Mathf.RoundToInt(8f * k), seed + 7717u, RockPlates, 2.6f * k, 0.26f, 2.4f, 0.52f, 0.22f);
            TexturePainter.Facets(c, Mathf.RoundToInt(19f * k), seed + 3313u, RockPlates, 1.5f * k, 0.18f, 1.2f, 0.24f, 0.16f);

            int cracks = Mathf.RoundToInt(4f * k * k);
            for (int i = 0; i < cracks; i++)
            {
                TexturePainter.Crack(c, rng.Next() * size, rng.Next() * size, rng.Next() * 6.28f,
                    (60f + (rng.Next() * 170f)) * k, 1.1f + (rng.Next() * 0.9f), ref rng, 2);
            }

            int chips = Mathf.RoundToInt(140f * k * k);
            for (int i = 0; i < chips; i++)
            {
                float r = (1.8f + (rng.Next() * 5f)) * k;
                float tone = 0.78f + (rng.Next() * 0.44f);
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.5f + (rng.Next() * 0.5f)),
                    rng.Next() * 3.14f, new Color(0.502f * tone, 0.494f * tone, 0.478f * tone), ref rng);
            }

            // أشنة تتجمّع في المفاصل الغائرة لا في بقع عشوائية
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
                    float a = Mathf.Min(0.34f, Mathf.Max(0f, (t - 0.58f) * 1.8f) * low * low);
                    if (a > 0.01f)
                    {
                        c.Put(x, y, 0.235f, 0.286f, 0.169f, a, 0f);
                    }
                }
            }

            return c;
        }

        /// <summary>وجه الجرف: كتل أضخم وأغمق وأبرد — الصخر المكشوف رمادي لا بنّي.</summary>
        public static TextureCanvas CliffRock(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Facets(c, Mathf.RoundToInt(2f * k), seed, CliffPlates, 7.0f * k, 0.46f, 6.0f, 1.0f, 0.34f);
            TexturePainter.Facets(c, Mathf.RoundToInt(5f * k), seed + 4411u, CliffPlates, 3.6f * k, 0.32f, 3.2f, 0.50f, 0.24f);
            TexturePainter.Facets(c, Mathf.RoundToInt(13f * k), seed + 8823u, CliffPlates, 1.8f * k, 0.20f, 1.6f, 0.26f, 0.18f);

            int cracks = Mathf.RoundToInt(6f * k * k);
            for (int i = 0; i < cracks; i++)
            {
                float ang = rng.Next() < 0.7f ? (rng.Next() - 0.5f) * 0.35f : rng.Next() * 6.28f;
                TexturePainter.Crack(c, rng.Next() * size, rng.Next() * size, ang,
                    (90f + (rng.Next() * 230f)) * k, 1.4f + rng.Next(), ref rng, 2);
            }

            int chips = Mathf.RoundToInt(180f * k * k);
            for (int i = 0; i < chips; i++)
            {
                float r = (2.2f + (rng.Next() * 7f)) * k;
                float tone = 0.70f + (rng.Next() * 0.5f);
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.42f + (rng.Next() * 0.5f)),
                    rng.Next() * 3.14f, new Color(0.435f * tone, 0.443f * tone, 0.455f * tone), ref rng);
            }

            return c;
        }

        /// <summary>حطام السفح (طاليوس): شظايا زاويّة رمادية تتراكم تحت الجروف.</summary>
        public static TextureCanvas Scree(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.412f, 0.408f, 0.404f), new Color(0.588f, 0.584f, 0.576f), 1.4f);

            for (int pass = 0; pass < 3; pass++)
            {
                int count = Mathf.RoundToInt((150f + (pass * 280f)) * k * k);
                float scale = 16f - (pass * 4.4f);
                for (int i = 0; i < count; i++)
                {
                    float r = (2.6f + (rng.Next() * scale)) * k;
                    Color col = ScreePlates[Mathf.Min(ScreePlates.Length - 1, (int)(rng.Next() * ScreePlates.Length))];
                    TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.34f + (rng.Next() * 0.42f)),
                        rng.Next() * 3.14f, col, ref rng);
                }
            }

            return c;
        }

        /// <summary>ثلج القمم: سطح مذرور ببلّورات، وفجواته مزرقّة كما يفعل الضوء داخل الجليد.</summary>
        public static TextureCanvas Snow(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.855f, 0.878f, 0.918f), new Color(0.976f, 0.984f, 1f), 0.7f);

            TileableNoise dune = new TileableNoise(5, seed + 31u);
            TileableNoise ripple = new TileableNoise(11, seed + 77u);
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    int i = (y * size) + x;
                    float u = (x + 0.5f) / size;
                    float v = (y + 0.5f) / size;
                    float d = ((dune.Sample(u, v) - 0.5f) * 1.6f) + ((ripple.Sample(u, v) - 0.5f) * 0.7f);
                    float lit = 1f + (d * 0.10f);
                    float blue = Mathf.Max(0f, -d) * 0.16f;
                    c.R[i] = Mathf.Min(1f, c.R[i] * lit * (1f - (blue * 1.2f)));
                    c.G[i] = Mathf.Min(1f, c.G[i] * lit * (1f - (blue * 0.5f)));
                    c.B[i] = Mathf.Min(1f, c.B[i] * lit * (1f + (blue * 0.35f)));
                    c.H[i] += d * 1.5f;
                }
            }

            int crystals = Mathf.RoundToInt(900f * k * k);
            for (int i = 0; i < crystals; i++)
            {
                float r = (0.9f + (rng.Next() * 2f)) * k;
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.7f + (rng.Next() * 0.3f)),
                    rng.Next() * 3.14f, new Color(0.996f, 0.996f, 1f), ref rng);
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
