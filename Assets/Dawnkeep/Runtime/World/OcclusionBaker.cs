using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// انحجاب محيط تقريبي بأفق متعدّد الأنصاف: الأودية أغمق والأعراف أفتح.
    /// يُخبز في خريطة تُضرب في لون الأرض فتظهر عمق التضاريس بلا كلفة إضاءة.
    /// </summary>
    public static class OcclusionBaker
    {
        private static readonly int[] Radii = { 2, 5, 9 };

        public static void Bake(WorldData w)
        {
            int n = w.Resolution;
            float step = w.Step;
            float[] h = w.Height;
            float[] ao = w.Occlusion;

            for (int i = 0; i < ao.Length; i++)
            {
                ao[i] = 1f;
            }

            for (int j = 1; j < n - 1; j++)
            {
                for (int i = 1; i < n - 1; i++)
                {
                    int k = (j * n) + i;
                    float h0 = h[k];
                    float occlusion = 0f;

                    for (int r = 0; r < Radii.Length; r++)
                    {
                        int radius = Radii[r];
                        float maxRise = -1e9f;

                        for (int d = 0; d < 8; d++)
                        {
                            float a = d / 8f * Mathf.PI * 2f;
                            int ii = Mathf.Clamp(i + Mathf.RoundToInt(Mathf.Cos(a) * radius), 0, n - 1);
                            int jj = Mathf.Clamp(j + Mathf.RoundToInt(Mathf.Sin(a) * radius), 0, n - 1);
                            float rise = (h[(jj * n) + ii] - h0) / (radius * step);
                            if (rise > maxRise)
                            {
                                maxRise = rise;
                            }
                        }

                        occlusion += Mathf.Clamp01(maxRise) / Radii.Length;
                    }

                    ao[k] = Mathf.Clamp(1f - (occlusion * 0.52f), 0.66f, 1f);
                }
            }
        }
    }
}
