using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// تعرية بالقطرات: كل قطرة تنزل مع الانحدار، تجرف حيث تُسرع وترسّب حيث تبطؤ.
    /// هذا ما يحفر الأودية المتشعّبة ويكوّن السهول الطميية عند أقدام الجبال.
    /// </summary>
    public static class HydraulicErosion
    {
        public static void Erode(WorldGenSettings s, WorldData w, System.Action<float> onProgress)
        {
            int n = w.Resolution;
            float[] h = w.Height;
            int len = h.Length;

            uint state = (uint)((s.Seed * 7919) + 31);

            List<int> brushOffset = new List<int>();
            List<float> brushWeight = new List<float>();
            float weightSum = 0f;

            for (int dj = -2; dj <= 2; dj++)
            {
                for (int di = -2; di <= 2; di++)
                {
                    float d = Mathf.Sqrt((di * di) + (dj * dj));
                    if (d > 2.3f)
                    {
                        continue;
                    }

                    brushOffset.Add((dj * n) + di);
                    float weight = 1f - (d / 2.5f);
                    brushWeight.Add(weight);
                    weightSum += weight;
                }
            }

            for (int b = 0; b < brushWeight.Count; b++)
            {
                brushWeight[b] = brushWeight[b] / weightSum;
            }

            int[] offsets = brushOffset.ToArray();
            float[] weights = brushWeight.ToArray();

            int drops = s.Droplets;
            int life = s.DropletLifetime;
            float inertia = s.Inertia;
            float capF = s.SedimentCapacity;
            float minSlope = s.MinSlope;
            float erodeSp = s.ErodeSpeed;
            float depoSp = s.DepositSpeed;
            float evap = s.Evaporation;
            float grav = s.Gravity;
            int report = Mathf.Max(1, drops / 40);

            for (int d = 0; d < drops; d++)
            {
                if (onProgress != null && (d % report) == 0)
                {
                    onProgress((float)d / drops);
                }

                float px = 3f + (NextFloat(ref state) * (n - 7));
                float pz = 3f + (NextFloat(ref state) * (n - 7));
                float dx = 0f;
                float dz = 0f;
                float speed = 1f;
                float water = 1f;
                float sediment = 0f;

                for (int l = 0; l < life; l++)
                {
                    int i = (int)px;
                    int j = (int)pz;
                    if (i < 1 || j < 1 || i >= n - 2 || j >= n - 2)
                    {
                        break;
                    }

                    float fx = px - i;
                    float fz = pz - j;
                    int k = (j * n) + i;

                    float h00 = h[k];
                    float h10 = h[k + 1];
                    float h01 = h[k + n];
                    float h11 = h[k + n + 1];

                    float gx = ((h10 - h00) * (1f - fz)) + ((h11 - h01) * fz);
                    float gz = ((h01 - h00) * (1f - fx)) + ((h11 - h10) * fx);
                    float hh = (h00 * (1f - fx) * (1f - fz)) + (h10 * fx * (1f - fz))
                             + (h01 * (1f - fx) * fz) + (h11 * fx * fz);

                    dx = (dx * inertia) - (gx * (1f - inertia));
                    dz = (dz * inertia) - (gz * (1f - inertia));

                    float dl = Mathf.Sqrt((dx * dx) + (dz * dz));
                    if (dl < 1e-6f)
                    {
                        break;
                    }

                    dx /= dl;
                    dz /= dl;
                    px += dx;
                    pz += dz;

                    int ni = (int)px;
                    int nj = (int)pz;
                    if (ni < 1 || nj < 1 || ni >= n - 2 || nj >= n - 2)
                    {
                        break;
                    }

                    float nfx = px - ni;
                    float nfz = pz - nj;
                    int nk = (nj * n) + ni;
                    float nh = (h[nk] * (1f - nfx) * (1f - nfz)) + (h[nk + 1] * nfx * (1f - nfz))
                             + (h[nk + n] * (1f - nfx) * nfz) + (h[nk + n + 1] * nfx * nfz);

                    float dh = nh - hh;
                    float capacity = Mathf.Max(-dh, minSlope) * speed * water * capF;

                    if (sediment > capacity || dh > 0f)
                    {
                        float deposit = dh > 0f ? Mathf.Min(dh, sediment) : (sediment - capacity) * depoSp;
                        sediment -= deposit;
                        h[k] += deposit * (1f - fx) * (1f - fz);
                        h[k + 1] += deposit * fx * (1f - fz);
                        h[k + n] += deposit * (1f - fx) * fz;
                        h[k + n + 1] += deposit * fx * fz;
                    }
                    else
                    {
                        float erosion = Mathf.Min((capacity - sediment) * erodeSp, -dh);
                        for (int b = 0; b < offsets.Length; b++)
                        {
                            int kk = k + offsets[b];
                            if (kk < 0 || kk >= len)
                            {
                                continue;
                            }

                            h[kk] -= erosion * weights[b];
                        }

                        sediment += erosion;
                    }

                    speed = Mathf.Sqrt(Mathf.Max(0f, (speed * speed) + (-dh * grav)));
                    water *= 1f - evap;
                }
            }
        }

        /// <summary>مولّد عشوائي حتمي (نفس البذرة = نفس الخريطة على كل جهاز).</summary>
        private static float NextFloat(ref uint state)
        {
            state += 0x6D2B79F5u;
            uint t = state;
            t = (t ^ (t >> 15)) * (1u | t);
            t ^= t + ((t ^ (t >> 7)) * (61u | t));
            return ((t ^ (t >> 14)) & 0xFFFFFFu) / 16777216f;
        }
    }
}
