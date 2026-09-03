using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// خامات البناء مرسومة: مداميك حجر بمونة، قرميد بصفوف مقوّسة، جصّ بشقوق شعرية،
    /// خشب بعروق وعقد، وقشّ. كلّها أصلية مولّدة بالكود.
    /// </summary>
    public static class BuildingMaterials
    {
        /// <summary>حجر منحوت: مداميك متبادلة الإزاحة بحوافّ مشطوفة وأشنة في المونة.</summary>
        public static TextureCanvas StoneWall(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.180f, 0.169f, 0.153f), new Color(0.259f, 0.243f, 0.220f), 0.6f);

            int courses = Mathf.Max(3, Mathf.RoundToInt(7f * k));
            float ch = (float)size / courses;

            for (int row = 0; row < courses; row++)
            {
                float y0 = row * ch;
                float offset = ((row % 2) != 0 ? ch * 0.5f : 0f) + (rng.Next() * ch * 0.25f);
                float x = offset - (ch * 1.2f);

                while (x < size + ch)
                {
                    float bw = ch * (1.15f + (rng.Next() * 1.5f));
                    float bh = ch * (0.78f + (rng.Next() * 0.16f));
                    float mortar = Mathf.Max(1.4f, ch * 0.075f);
                    float tone = 0.80f + (rng.Next() * 0.5f);
                    Color baseColor = new Color(0.451f * tone, 0.427f * tone, 0.392f * tone);

                    float px0 = x + mortar;
                    float px1 = x + bw - mortar;
                    float py0 = y0 + mortar;
                    float py1 = y0 + bh - mortar;

                    for (int yy = Mathf.FloorToInt(py0); yy <= Mathf.CeilToInt(py1); yy++)
                    {
                        float ty = (yy - py0) / Mathf.Max(1f, py1 - py0);
                        float wob = Mathf.Sin((yy * 0.7f) + (tone * 9f)) * ch * 0.035f;

                        for (int xx = Mathf.FloorToInt(px0 + wob); xx <= Mathf.CeilToInt(px1 + wob); xx++)
                        {
                            float tx = (xx - px0 - wob) / Mathf.Max(1f, px1 - px0);
                            if (tx < 0f || tx > 1f)
                            {
                                continue;
                            }

                            float edge = Mathf.Min(Mathf.Min(tx, 1f - tx), Mathf.Min(ty, 1f - ty));
                            float bevel = Mathf.Min(1f, edge * Mathf.Max(4f, ch * 0.30f));
                            float lit = 0.72f + (0.42f * bevel) + ((1f - ty) * 0.16f);
                            float grain = 0.94f + (0.12f * Mathf.Sin((xx * 1.7f) + (yy * 2.3f) + (tone * 13f)));
                            float m = lit * grain;
                            c.Put(xx, yy, baseColor.r * m, baseColor.g * m, baseColor.b * m, 1f, (bevel * 2.2f) + 0.6f);
                        }
                    }

                    for (int i = 0; i < 3; i++)
                    {
                        float r = (1f + (rng.Next() * 3.2f)) * k;
                        TexturePainter.Pebble(c, x + (bw * rng.Next()), y0 + (bh * rng.Next()),
                            r, r * (0.6f + (rng.Next() * 0.5f)), rng.Next() * 3.1f,
                            new Color(baseColor.r * 0.82f, baseColor.g * 0.82f, baseColor.b * 0.80f), ref rng);
                    }

                    x += bw;
                }
            }

            TileableNoise lichen = new TileableNoise(8, seed + 555u);
            for (int y = 0; y < size; y++)
            {
                for (int x2 = 0; x2 < size; x2++)
                {
                    int i = (y * size) + x2;
                    float t = lichen.Sample((x2 + 0.5f) / size, (y + 0.5f) / size);
                    if (t < 0.60f || c.H[i] > 1.2f)
                    {
                        continue;
                    }

                    c.Put(x2, y, 0.235f, 0.259f, 0.169f, Mathf.Min(0.40f, (t - 0.60f) * 2.0f), 0f);
                }
            }

            return c;
        }

        /// <summary>قرميد: صفوف متداخلة، كل قرميدة مقطعها مقوّس فيظهر الظلّ بين الصفوف.</summary>
        public static TextureCanvas RoofTile(int size, uint seed, Color hue)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed,
                new Color(hue.r * 0.45f, hue.g * 0.45f, hue.b * 0.45f),
                new Color(hue.r * 0.72f, hue.g * 0.72f, hue.b * 0.72f), 0.5f);

            int rows = Mathf.Max(3, Mathf.RoundToInt(9f * k));
            float rh = (float)size / rows;
            int cols = Mathf.Max(3, Mathf.RoundToInt(15f * k));
            float cw = (float)size / cols;

            for (int r = 0; r < rows; r++)
            {
                float y0 = r * rh;
                float shift = (r % 2) != 0 ? cw * 0.5f : 0f;

                for (int q = -1; q <= cols; q++)
                {
                    float x0 = (q * cw) + shift;
                    float tone = 0.86f + (rng.Next() * 0.34f);

                    for (float yy = 0f; yy < rh * 1.35f; yy += 1f)
                    {
                        float ty = yy / (rh * 1.35f);
                        if (ty > 1f)
                        {
                            break;
                        }

                        for (float xx = 0f; xx < cw; xx += 1f)
                        {
                            float tx = xx / cw;
                            float arch = Mathf.Sin(tx * Mathf.PI);
                            float lit = 0.58f + (0.62f * arch) - (ty * 0.20f);
                            float edge = (tx < 0.06f || tx > 0.94f) ? 0.62f : 1f;
                            float a = ty > 0.92f ? (1f - ((ty - 0.92f) / 0.08f)) * 0.9f : 1f;
                            float m = tone * lit * edge;
                            float dh = (arch * 2.4f * (1f - (ty * 0.5f))) - (ty > 0.9f ? 1.8f : 0f);
                            c.Put(x0 + xx, y0 + yy, hue.r * m, hue.g * m, hue.b * m, a, dh);
                        }
                    }
                }
            }

            return c;
        }

        public static TextureCanvas Plaster(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.702f, 0.671f, 0.596f), new Color(0.851f, 0.827f, 0.749f), 0.8f);

            int cracks = Mathf.RoundToInt(26f * k * k);
            for (int i = 0; i < cracks; i++)
            {
                TexturePainter.Crack(c, rng.Next() * size, rng.Next() * size, rng.Next() * 6.28f,
                    (24f + (rng.Next() * 70f)) * k, 0.35f + (rng.Next() * 0.35f), ref rng, 1);
            }

            int grains = Mathf.RoundToInt(220f * k * k);
            for (int i = 0; i < grains; i++)
            {
                float r = (1f + (rng.Next() * 2.6f)) * k;
                float t = 0.86f + (rng.Next() * 0.22f);
                TexturePainter.Pebble(c, rng.Next() * size, rng.Next() * size, r, r * (0.7f + (rng.Next() * 0.4f)),
                    rng.Next() * 3.1f, new Color(0.706f * t, 0.678f * t, 0.596f * t), ref rng);
            }

            // بقع رطوبة تتجمّع في أسفل الجدار
            TileableNoise damp = new TileableNoise(5, seed + 31u);
            for (int y = 0; y < size; y++)
            {
                float dampen = Mathf.Max(0f, ((float)y / size - 0.55f) / 0.45f);
                for (int x = 0; x < size; x++)
                {
                    float t = damp.Sample((x + 0.5f) / size, (y + 0.5f) / size);
                    float a = Mathf.Min(0.30f, Mathf.Max(0f, t - 0.45f) * dampen * 1.6f);
                    if (a > 0.01f)
                    {
                        c.Put(x, y, 0.494f, 0.463f, 0.404f, a, 0f);
                    }
                }
            }

            return c;
        }

        public static TextureCanvas Timber(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.239f, 0.169f, 0.106f), new Color(0.400f, 0.298f, 0.196f), 0.7f);

            int veins = Mathf.RoundToInt(220f * k * k);
            for (int i = 0; i < veins; i++)
            {
                float x = rng.Next() * size;
                float tone = 0.72f + (rng.Next() * 0.6f);
                float w = (0.7f + (rng.Next() * 2.2f)) * k;

                for (int y = 0; y < size; y++)
                {
                    float wob = Mathf.Sin((y * 0.035f) + (x * 0.11f)) * 2.2f * k;
                    for (float o = -w; o <= w; o += 1f)
                    {
                        float t = Mathf.Abs(o) / (w + 0.5f);
                        c.Put(x + wob + o, y, 0.286f * tone, 0.208f * tone, 0.133f * tone,
                            (1f - t) * 0.55f, (1f - t) * 0.5f * (tone - 1f));
                    }
                }
            }

            int knots = Mathf.RoundToInt(9f * k * k);
            for (int i = 0; i < knots; i++)
            {
                float cx = rng.Next() * size;
                float cy = rng.Next() * size;
                float rad = (5f + (rng.Next() * 9f)) * k;

                for (float dy = -rad; dy <= rad; dy += 1f)
                {
                    for (float dx = -rad; dx <= rad; dx += 1f)
                    {
                        float d = Mathf.Sqrt((dx * dx) + (dy * dy)) / rad;
                        if (d > 1f)
                        {
                            continue;
                        }

                        float ring = 0.6f + (0.4f * Mathf.Sin(d * rad * 0.9f));
                        c.Put(cx + dx, cy + dy, 0.184f * ring, 0.129f * ring, 0.086f * ring,
                            (1f - d) * 0.85f, -(1f - d) * 1.2f);
                    }
                }
            }

            return c;
        }

        public static TextureCanvas Thatch(int size, uint seed)
        {
            TextureCanvas c = new TextureCanvas(size);
            TexRandom rng = new TexRandom(seed);
            float k = size / 512f;

            TexturePainter.Base(c, seed, new Color(0.325f, 0.263f, 0.157f), new Color(0.478f, 0.400f, 0.243f), 0.8f);

            int straws = Mathf.RoundToInt(9000f * k * k);
            for (int i = 0; i < straws; i++)
            {
                float tone = 0.72f + (rng.Next() * 0.62f);
                TexturePainter.Blade(c, rng.Next() * size, rng.Next() * size,
                    (Mathf.PI / 2f) + ((rng.Next() - 0.5f) * 0.45f),
                    (10f + (rng.Next() * 22f)) * k, (0.8f + (rng.Next() * 0.9f)) * k,
                    new Color(0.545f * tone, 0.451f * tone, 0.263f * tone), ref rng);
            }

            return c;
        }
    }
}
