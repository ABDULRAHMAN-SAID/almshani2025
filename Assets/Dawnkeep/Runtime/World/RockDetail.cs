namespace Dawnkeep.World
{
    /// <summary>
    /// تفصيل الصخر: أضلاع وأخاديد على الميول الحادّة العالية.
    /// التعرية الحرارية تُنعّم الجبل حتى يصير جداراً أملس بلا شكل — وهذا يعيد له
    /// حدّته: ضجيج مطويّ بثلاثة مقاييس، مع تشويه المجال حتى تتعرّج الأضلاع بدل
    /// أن تخرج متوازية منتظمة كتضليع صناعي.
    /// </summary>
    public static class RockDetail
    {
        public static void Apply(WorldGenSettings settings, WorldData w)
        {
            int n = w.Resolution;
            float step = w.Step;
            float[] h = w.Height;
            float amp = settings.RockDetailAmplitude;
            float warp = settings.RockDetailWarp;
            double seed = settings.Seed;

            if (amp <= 0f)
            {
                return;
            }

            float[] src = new float[h.Length];
            System.Array.Copy(h, src, h.Length);

            float low = float.PositiveInfinity;
            float high = float.NegativeInfinity;
            for (int i = 0; i < src.Length; i++)
            {
                if (src[i] < low)
                {
                    low = src[i];
                }

                if (src[i] > high)
                {
                    high = src[i];
                }
            }

            float span = UnityEngine.Mathf.Max(1f, high - low);
            float half = w.WorldSize * 0.5f;

            for (int j = 1; j < n - 1; j++)
            {
                for (int i = 1; i < n - 1; i++)
                {
                    int k = (j * n) + i;
                    float dx = (src[k + 1] - src[k - 1]) / (2f * step);
                    float dz = (src[k + n] - src[k - n]) / (2f * step);
                    float slope = UnityEngine.Mathf.Sqrt((dx * dx) + (dz * dz));
                    float altitude = (src[k] - low) / span;

                    float weight = UnityEngine.Mathf.Clamp01((slope - 0.22f) / 0.42f)
                                 * UnityEngine.Mathf.Clamp01((altitude - 0.16f) / 0.30f);
                    if (weight <= 0.01f)
                    {
                        continue;
                    }

                    double x = (i * step) - half;
                    double z = (j * step) - half;

                    double qx = x + ((ValueNoise.Fbm((x * 0.0011) + 7.0, (z * 0.0011) - 3.0, 2) - 0.5) * warp);
                    double qz = z + ((ValueNoise.Fbm((x * 0.0011) - 9.0, (z * 0.0011) + 5.0, 2) - 0.5) * warp);

                    float r0 = ValueNoise.Ridged((qx * 0.0026) - (seed * 3.0), (qz * 0.0026) + (seed * 3.0), 4);
                    float r1 = ValueNoise.Ridged((x * 0.0062) + seed, (z * 0.0062) - seed, 4);
                    float r2 = ValueNoise.Ridged((x * 0.0155) - (seed * 2.0), (z * 0.0155) + (seed * 2.0), 3);

                    float folded = (UnityEngine.Mathf.Pow(r0, 1.4f) * 0.46f)
                                 + (UnityEngine.Mathf.Pow(r1, 1.5f) * 0.36f)
                                 + (UnityEngine.Mathf.Pow(r2, 1.7f) * 0.18f)
                                 - 0.34f;

                    h[k] += folded * amp * weight;
                }
            }
        }
    }
}
