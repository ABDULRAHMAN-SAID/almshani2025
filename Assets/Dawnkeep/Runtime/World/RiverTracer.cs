using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// النهر ليس خطاً مرسوماً: هو المجرى الرئيس في شبكة التصريف —
    /// يُقرأ من أكبر تراكم جريان، يُتبَع صاعداً إلى منابعه ونازلاً إلى مصبّه،
    /// ثم يُنحت مجراه على شكل V بضفّتين مرتفعتين.
    /// </summary>
    public static class RiverTracer
    {
        public static void Trace(WorldGenSettings s, WorldData w)
        {
            int n = w.Resolution;
            int len = n * n;
            float[] h = w.Height;
            float[] flow = w.Flow;
            int[] down = w.Downhill;

            int main = -1;
            float bestFlow = 0f;

            for (int j = 3; j < n - 3; j++)
            {
                for (int i = 3; i < n - 3; i++)
                {
                    float x = w.NodeToWorld(i);
                    float z = w.NodeToWorld(j);
                    float r = Mathf.Sqrt((x * x) + (z * z));

                    // المجرى الرئيس يمرّ بالمملكة لا بأطرافها
                    if (r < s.RiverSearchInner || r > s.RiverSearchOuter)
                    {
                        continue;
                    }

                    int k = (j * n) + i;
                    if (flow[k] > bestFlow)
                    {
                        bestFlow = flow[k];
                        main = k;
                    }
                }
            }

            if (main < 0)
            {
                w.River = new Vector2[0];
                FillDistance(w, new List<Vector2>());
                return;
            }

            int[] nb = { -1, 1, -n, n, -n - 1, -n + 1, n - 1, n + 1 };

            // أعلى المجرى: اتبع أكبر رافد صاعداً
            List<int> upstream = new List<int>();
            int cur = main;
            int guard = 0;
            while (guard++ < n * 2)
            {
                upstream.Add(cur);
                int best = -1;
                float bestTrib = 0f;

                for (int d = 0; d < 8; d++)
                {
                    int kk = cur + nb[d];
                    if (kk < 0 || kk >= len)
                    {
                        continue;
                    }

                    if (down[kk] == cur && flow[kk] > bestTrib)
                    {
                        bestTrib = flow[kk];
                        best = kk;
                    }
                }

                if (best < 0 || bestTrib < bestFlow * 0.018f)
                {
                    break;
                }

                cur = best;
            }

            upstream.Reverse();

            // أسفل المجرى: اتبع الانحدار حتى البحيرة أو خارج الساحة
            List<int> downstream = new List<int>();
            cur = main;
            guard = 0;
            while (guard++ < n * 2)
            {
                int next = down[cur];
                if (next < 0)
                {
                    break;
                }

                downstream.Add(next);

                float x = w.NodeToWorld(next % n);
                float z = w.NodeToWorld(next / n);
                if (Mathf.Sqrt((x * x) + (z * z)) > s.EdgeRadius * 1.28f)
                {
                    break;
                }

                if (w.Lake[next] != 0)
                {
                    break;
                }

                cur = next;
            }

            List<int> chain = new List<int>(upstream.Count + downstream.Count);
            chain.AddRange(upstream);
            chain.AddRange(downstream);

            if (chain.Count < 8)
            {
                w.River = new Vector2[0];
                FillDistance(w, new List<Vector2>());
                return;
            }

            List<Vector2> raw = new List<Vector2>(chain.Count);
            for (int c = 0; c < chain.Count; c++)
            {
                raw.Add(new Vector2(w.NodeToWorld(chain[c] % n), w.NodeToWorld(chain[c] / n)));
            }

            List<Vector2> smooth = SmoothPolyline(raw, 3);

            // إعادة توزيع النقاط على مسافات متقاربة
            List<Vector2> pts = new List<Vector2>();
            float acc = 0f;
            for (int i = 0; i < smooth.Count; i++)
            {
                if (i == 0 || i == smooth.Count - 1)
                {
                    pts.Add(smooth[i]);
                    acc = 0f;
                    continue;
                }

                acc += Vector2.Distance(smooth[i], smooth[i - 1]);
                if (acc > 34f)
                {
                    pts.Add(smooth[i]);
                    acc = 0f;
                }
            }

            float width = Mathf.Clamp(Mathf.Sqrt(bestFlow) * s.RiverWidthScale, s.RiverWidthMin, s.RiverWidthMax);
            w.River = pts.ToArray();
            w.RiverWidth = width;

            FillDistance(w, pts);

            // نحت المجرى: قناة V داخل العرض، وضفّة مرتفعة خارجه
            float[] rd = w.RiverDistance;
            for (int k = 0; k < len; k++)
            {
                float d = rd[k];
                if (d > width * 2.4f)
                {
                    continue;
                }

                if (d < width)
                {
                    h[k] -= Mathf.Pow(1f - (d / width), 1.25f) * s.RiverCarveDepth;
                }
                else
                {
                    float t = 1f - ((d - width) / (width * 1.4f));
                    h[k] += t * t * s.RiverBankHeight;
                }
            }
        }

        /// <summary>حقل مسافة إلى المضلّع — يُحسب مرّة ويُقرأ في كل مكان بدل إعادة الحساب.</summary>
        private static void FillDistance(WorldData w, List<Vector2> pts)
        {
            int n = w.Resolution;
            float[] rd = w.RiverDistance;
            for (int k = 0; k < rd.Length; k++)
            {
                rd[k] = 1e9f;
            }

            float step = w.Step;
            float half = w.WorldSize * 0.5f;

            for (int p = 0; p < pts.Count - 1; p++)
            {
                Vector2 a = pts[p];
                Vector2 b = pts[p + 1];

                int i0 = Mathf.Clamp(Mathf.FloorToInt((Mathf.Min(a.x, b.x) + half) / step) - 9, 0, n - 1);
                int i1 = Mathf.Clamp(Mathf.CeilToInt((Mathf.Max(a.x, b.x) + half) / step) + 9, 0, n - 1);
                int j0 = Mathf.Clamp(Mathf.FloorToInt((Mathf.Min(a.y, b.y) + half) / step) - 9, 0, n - 1);
                int j1 = Mathf.Clamp(Mathf.CeilToInt((Mathf.Max(a.y, b.y) + half) / step) + 9, 0, n - 1);

                float dx = b.x - a.x;
                float dz = b.y - a.y;
                float l2 = (dx * dx) + (dz * dz);
                if (l2 < 1e-5f)
                {
                    l2 = 1e-5f;
                }

                for (int j = j0; j <= j1; j++)
                {
                    float z = w.NodeToWorld(j);
                    for (int i = i0; i <= i1; i++)
                    {
                        float x = w.NodeToWorld(i);
                        float t = Mathf.Clamp01((((x - a.x) * dx) + ((z - a.y) * dz)) / l2);
                        float ex = x - (a.x + (dx * t));
                        float ez = z - (a.y + (dz * t));
                        float d = Mathf.Sqrt((ex * ex) + (ez * ez));

                        int k = (j * n) + i;
                        if (d < rd[k])
                        {
                            rd[k] = d;
                        }
                    }
                }
            }
        }

        /// <summary>تنعيم بمتوسّط منزلق — الأنهار والطرق منحنية لا مسنّنة.</summary>
        public static List<Vector2> SmoothPolyline(List<Vector2> pts, int radius)
        {
            List<Vector2> outPts = new List<Vector2>(pts.Count);
            for (int i = 0; i < pts.Count; i++)
            {
                float sx = 0f;
                float sz = 0f;
                int count = 0;

                for (int d = -radius; d <= radius; d++)
                {
                    int q = i + d;
                    if (q < 0 || q >= pts.Count)
                    {
                        continue;
                    }

                    sx += pts[q].x;
                    sz += pts[q].y;
                    count++;
                }

                outPts.Add(new Vector2(sx / count, sz / count));
            }

            return outPts;
        }
    }
}
