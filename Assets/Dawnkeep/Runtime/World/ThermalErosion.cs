namespace Dawnkeep.World
{
    /// <summary>
    /// تعرية حرارية (انهيار المنحدرات): كل منحدر يتجاوز زاوية الاستقرار ينهار
    /// وتتراكم مادّته عند سفحه فتتكوّن مخاريط الحطام.
    /// بدونها تُخلّف تعرية القطرات على الجروف أخاديد متوازية تشبه الأنياب لا الجبال.
    /// </summary>
    public static class ThermalErosion
    {
        public static void Apply(WorldGenSettings s, WorldData w, System.Action<float> onProgress)
        {
            int n = w.Resolution;
            float[] h = w.Height;
            int len = n * n;

            float talus = s.TalusAngle * w.Step;
            float rate = s.ThermalRate;
            int iterations = s.ThermalIterations;
            if (iterations <= 0 || talus <= 0f)
            {
                return;
            }

            int[] nb = { -1, 1, -n, n, -n - 1, -n + 1, n - 1, n + 1 };
            float[] nbd = { 1f, 1f, 1f, 1f, 1.41421356f, 1.41421356f, 1.41421356f, 1.41421356f };

            float[] delta = new float[len];
            float[] drop = new float[8];

            for (int it = 0; it < iterations; it++)
            {
                if (onProgress != null)
                {
                    onProgress((float)it / iterations);
                }

                System.Array.Clear(delta, 0, len);

                for (int j = 1; j < n - 1; j++)
                {
                    for (int i = 1; i < n - 1; i++)
                    {
                        int k = (j * n) + i;
                        float h0 = h[k];
                        float total = 0f;
                        float max = 0f;

                        for (int d = 0; d < 8; d++)
                        {
                            float diff = h0 - h[k + nb[d]] - (talus * nbd[d]);
                            drop[d] = diff > 0f ? diff : 0f;

                            if (diff > 0f)
                            {
                                total += diff;
                                if (diff > max)
                                {
                                    max = diff;
                                }
                            }
                        }

                        if (total <= 0f)
                        {
                            continue;
                        }

                        float move = max * 0.5f * rate;
                        delta[k] -= move;

                        for (int d = 0; d < 8; d++)
                        {
                            if (drop[d] > 0f)
                            {
                                delta[k + nb[d]] += move * (drop[d] / total);
                            }
                        }
                    }
                }

                for (int k = 0; k < len; k++)
                {
                    h[k] += delta[k];
                }
            }
        }
    }
}
