using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// يخبز من وصفة سطح: حقل ارتفاع قابل للتبليط ← خريطة لون + خريطة نتوء.
    /// كل الخامات في اللعبة أصلية مولّدة هنا، لا مأخوذة من أي مصدر خارجي.
    /// </summary>
    public static class SurfaceBaker
    {
        /// <summary>حقل ارتفاع في [0,1] بحجم size × size، قابل للتبليط.</summary>
        public static float[] BakeHeight(SurfaceRecipe recipe, int size)
        {
            int octaves = Mathf.Clamp(recipe.Octaves, 1, 8);
            TileableNoise[] layers = new TileableNoise[octaves];
            TileableNoise warpX = null;
            TileableNoise warpY = null;

            for (int o = 0; o < octaves; o++)
            {
                int freq = Mathf.Max(2, recipe.BaseFrequency << o);
                layers[o] = new TileableNoise(freq, recipe.Seed + (uint)(o * 7919));
            }

            if (recipe.Warp > 0f)
            {
                warpX = new TileableNoise(Mathf.Max(2, recipe.BaseFrequency), recipe.Seed + 104729u);
                warpY = new TileableNoise(Mathf.Max(2, recipe.BaseFrequency), recipe.Seed + 104743u);
            }

            TileableNoise grain = recipe.Grain > 0f
                ? new TileableNoise(Mathf.Max(2, recipe.GrainFrequency), recipe.Seed + 15485863u)
                : null;

            float[] field = new float[size * size];
            float stretch = Mathf.Max(0.05f, recipe.Stretch);

            for (int y = 0; y < size; y++)
            {
                float v = (y + 0.5f) / size;

                for (int x = 0; x < size; x++)
                {
                    float u = (x + 0.5f) / size;
                    float su = u;
                    float sv = v / stretch;

                    if (warpX != null)
                    {
                        su += (warpX.Sample(u, v) - 0.5f) * recipe.Warp;
                        sv += (warpY.Sample(u, v) - 0.5f) * recipe.Warp;
                    }

                    float amp = 0.5f;
                    float sum = 0f;
                    float norm = 0f;

                    for (int o = 0; o < octaves; o++)
                    {
                        float n = layers[o].Sample(Frac(su), Frac(sv));
                        if (recipe.Ridged)
                        {
                            n = 1f - Mathf.Abs((n * 2f) - 1f);
                        }

                        sum += n * amp;
                        norm += amp;
                        amp *= 0.5f;
                    }

                    float value = sum / norm;

                    if (grain != null)
                    {
                        value = Mathf.Lerp(value, grain.Sample(u, v), recipe.Grain * 0.35f);
                    }

                    value = Mathf.Clamp01(0.5f + ((value - 0.5f) * recipe.Contrast));
                    field[(y * size) + x] = value;
                }
            }

            return field;
        }

        /// <summary>خريطة اللون من حقل الارتفاع، مع بقع لون ثالث تكسر التكرار.</summary>
        public static Texture2D BakeAlbedo(SurfaceRecipe recipe, float[] field, int size)
        {
            TileableNoise patch = new TileableNoise(Mathf.Max(2, recipe.PatchFrequency), recipe.Seed + 32452843u);
            Color[] pixels = new Color[size * size];

            for (int y = 0; y < size; y++)
            {
                float v = (y + 0.5f) / size;

                for (int x = 0; x < size; x++)
                {
                    float u = (x + 0.5f) / size;
                    float t = field[(y * size) + x];
                    Color c = Color.Lerp(recipe.Low, recipe.High, t);

                    if (recipe.PatchAmount > 0f)
                    {
                        float p = Mathf.Clamp01(((patch.Sample(u, v) - 0.5f) * 2.6f) + 0.5f);
                        c = Color.Lerp(c, recipe.Patch, p * recipe.PatchAmount);
                    }

                    c.a = 1f;
                    pixels[(y * size) + x] = c;
                }
            }

            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, true, false);
            tex.name = recipe.Name + "_albedo";
            tex.wrapMode = TextureWrapMode.Repeat;
            tex.SetPixels(pixels);
            tex.Apply(true, false);
            return tex;
        }

        /// <summary>خريطة نتوء بصيغة RGB خام — يحوّلها المستورد إلى Normal Map.</summary>
        public static Texture2D BakeNormal(float[] field, int size, float strength)
        {
            Color[] pixels = new Color[size * size];

            for (int y = 0; y < size; y++)
            {
                int ym = ((y - 1) + size) % size;
                int yp = (y + 1) % size;

                for (int x = 0; x < size; x++)
                {
                    int xm = ((x - 1) + size) % size;
                    int xp = (x + 1) % size;

                    float dx = (field[(y * size) + xp] - field[(y * size) + xm]) * strength * size * 0.02f;
                    float dy = (field[(yp * size) + x] - field[(ym * size) + x]) * strength * size * 0.02f;

                    Vector3 n = new Vector3(-dx, -dy, 1f).normalized;
                    pixels[(y * size) + x] = new Color(
                        (n.x * 0.5f) + 0.5f,
                        (n.y * 0.5f) + 0.5f,
                        (n.z * 0.5f) + 0.5f,
                        1f);
                }
            }

            Texture2D tex = new Texture2D(size, size, TextureFormat.RGBA32, true, true);
            tex.wrapMode = TextureWrapMode.Repeat;
            tex.SetPixels(pixels);
            tex.Apply(true, false);
            return tex;
        }

        private static float Frac(float v)
        {
            return v - Mathf.Floor(v);
        }
    }
}
