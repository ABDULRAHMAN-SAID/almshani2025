using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// الطرق تُشقّ بأقلّ كلفة صعود من فجوات الجبال إلى ربوة القلعة:
    /// تلتفّ حول الميول الحادة، وتعبر النهر عند أضيق موضع — وهناك يُبنى الجسر.
    /// ثم يُسوّى ممرّها حفراً وردماً كما تُشقّ الطرق فعلاً.
    /// </summary>
    public static class RoadRouter
    {
        public static void Route(WorldGenSettings s, WorldData w)
        {
            int n = w.Resolution;
            int len = n * n;
            float[] h = w.Height;
            float[] rd = w.RiverDistance;
            byte[] lake = w.Lake;
            float step = w.Step;
            float riverWidth = w.River.Length > 0 ? w.RiverWidth : 0f;

            float[] cost = new float[len];
            int[] prev = new int[len];
            bool[] done = new bool[len];

            for (int i = 0; i < len; i++)
            {
                cost[i] = float.PositiveInfinity;
                prev[i] = -1;
            }

            int start = w.WorldToNode(0f, 0f);
            cost[start] = 0f;

            IndexHeap heap = new IndexHeap(1 << 15);
            heap.Push(start, 0f);

            int[] nb = { -1, 1, -n, n, -n - 1, -n + 1, n - 1, n + 1 };
            float diag = step * 1.41421356f;
            float[] nbd = { step, step, step, step, diag, diag, diag, diag };

            while (heap.Count > 0)
            {
                int k = heap.Pop();
                if (done[k])
                {
                    continue;
                }

                done[k] = true;
                int i = k % n;
                int j = k / n;
                if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1)
                {
                    continue;
                }

                float c0 = cost[k];
                float h0 = h[k];

                for (int d = 0; d < 8; d++)
                {
                    int kk = k + nb[d];
                    if (done[kk])
                    {
                        continue;
                    }

                    float dist = nbd[d];
                    float grade = Mathf.Abs(h[kk] - h0) / dist;
                    float c = dist * (1f + (s.RoadGradePenalty * grade * grade));

                    if (grade > s.RoadCliffGrade)
                    {
                        c += dist * s.RoadCliffPenalty;
                    }

                    if (riverWidth > 0f && rd[kk] < riverWidth * 1.25f)
                    {
                        c += s.RoadRiverCrossCost;
                    }

                    if (lake[kk] != 0)
                    {
                        c += s.RoadLakeCost;
                    }

                    float nc = c0 + c;
                    if (nc < cost[kk])
                    {
                        cost[kk] = nc;
                        prev[kk] = k;
                        heap.Push(kk, nc);
                    }
                }
            }

            w.Roads.Clear();
            float edge = s.EdgeRadius;
            int roads = s.RoadCount;

            for (int r = 0; r < roads; r++)
            {
                float a0 = (Mathf.PI * 2f * r / roads) + 0.35f;

                // الفجوة: الاتجاه الذي يبلغ فيه الطوق أوطأ ارتفاع
                float bestAngle = a0;
                float bestPeak = 1e9f;
                for (float da = -0.62f; da <= 0.62f; da += 0.022f)
                {
                    float angle = a0 + da;
                    float peak = -1e9f;
                    for (float rr = edge * 0.86f; rr <= edge * 1.34f; rr += 26f)
                    {
                        float sampled = w.Sample(h, Mathf.Cos(angle) * rr, Mathf.Sin(angle) * rr);
                        if (sampled > peak)
                        {
                            peak = sampled;
                        }
                    }

                    if (peak < bestPeak)
                    {
                        bestPeak = peak;
                        bestAngle = angle;
                    }
                }

                int far = w.WorldToNode(Mathf.Cos(bestAngle) * edge * 1.30f, Mathf.Sin(bestAngle) * edge * 1.30f);
                List<int> path = new List<int>();
                int cur = far;
                int guard = 0;
                while (cur >= 0 && guard++ < n * 4)
                {
                    path.Add(cur);
                    cur = prev[cur];
                }

                if (path.Count < 6)
                {
                    continue;
                }

                List<Vector2> pts = new List<Vector2>(path.Count);
                for (int p = 0; p < path.Count; p++)
                {
                    pts.Add(new Vector2(w.NodeToWorld(path[p] % n), w.NodeToWorld(path[p] / n)));
                }

                w.Roads.Add(RiverTracer.SmoothPolyline(pts, 3).ToArray());
            }

            GradeCorridors(s, w);
        }

        /// <summary>تسوية ممرّ الطريق: ملف ارتفاع ناعم يُطبَّق حفراً وردماً مع تلاشٍ جانبي.</summary>
        private static void GradeCorridors(WorldGenSettings s, WorldData w)
        {
            int n = w.Resolution;
            float[] h = w.Height;
            float[] roadDist = w.RoadDistance;

            for (int k = 0; k < roadDist.Length; k++)
            {
                roadDist[k] = 1e9f;
            }

            if (w.Roads.Count == 0)
            {
                return;
            }

            List<Vector2[]> nodes = new List<Vector2[]>();
            List<float[]> profiles = new List<float[]>();

            for (int r = 0; r < w.Roads.Count; r++)
            {
                Vector2[] full = w.Roads[r];
                List<Vector2> picked = new List<Vector2>();
                for (int i = 0; i < full.Length; i++)
                {
                    if (i % 3 == 0 || i == full.Length - 1)
                    {
                        picked.Add(full[i]);
                    }
                }

                if (picked.Count < 2)
                {
                    continue;
                }

                float[] ys = new float[picked.Count];
                for (int i = 0; i < picked.Count; i++)
                {
                    ys[i] = w.Sample(h, picked[i].x, picked[i].y);
                }

                for (int it = 0; it < 8; it++)
                {
                    for (int i = 1; i < ys.Length - 1; i++)
                    {
                        ys[i] = (ys[i - 1] + (ys[i] * 2f) + ys[i + 1]) * 0.25f;
                    }
                }

                nodes.Add(picked.ToArray());
                profiles.Add(ys);
            }

            float core = s.RoadCoreWidth;
            float feather = s.RoadFeatherWidth;

            // صناديق إحاطة لكل قطعة: بدونها يصير الفحص مئات الملايين من العمليات
            List<Vector4[]> bounds = new List<Vector4[]>();
            for (int r = 0; r < nodes.Count; r++)
            {
                Vector2[] p = nodes[r];
                Vector4[] box = new Vector4[Mathf.Max(0, p.Length - 1)];
                for (int q = 0; q < box.Length; q++)
                {
                    box[q] = new Vector4(
                        Mathf.Min(p[q].x, p[q + 1].x) - feather,
                        Mathf.Max(p[q].x, p[q + 1].x) + feather,
                        Mathf.Min(p[q].y, p[q + 1].y) - feather,
                        Mathf.Max(p[q].y, p[q + 1].y) + feather);
                }

                bounds.Add(box);
            }

            for (int j = 1; j < n - 1; j++)
            {
                float z = w.NodeToWorld(j);
                for (int i = 1; i < n - 1; i++)
                {
                    float x = w.NodeToWorld(i);
                    float bestDist = 1e9f;
                    float bestY = 0f;

                    for (int r = 0; r < nodes.Count; r++)
                    {
                        Vector2[] p = nodes[r];
                        float[] ys = profiles[r];
                        Vector4[] box = bounds[r];

                        for (int q = 0; q < p.Length - 1; q++)
                        {
                            Vector4 bb = box[q];
                            if (x < bb.x || x > bb.y || z < bb.z || z > bb.w)
                            {
                                continue;
                            }

                            Vector2 a = p[q];
                            Vector2 b = p[q + 1];
                            float dx = b.x - a.x;
                            float dz = b.y - a.y;
                            float l2 = (dx * dx) + (dz * dz);
                            if (l2 < 1e-5f)
                            {
                                l2 = 1e-5f;
                            }

                            float t = Mathf.Clamp01((((x - a.x) * dx) + ((z - a.y) * dz)) / l2);
                            float ex = x - (a.x + (dx * t));
                            float ez = z - (a.y + (dz * t));
                            float d = Mathf.Sqrt((ex * ex) + (ez * ez));

                            if (d < bestDist)
                            {
                                bestDist = d;
                                bestY = ys[q] + ((ys[q + 1] - ys[q]) * t);
                            }
                        }
                    }

                    int k = (j * n) + i;
                    roadDist[k] = bestDist;

                    if (bestDist > feather)
                    {
                        continue;
                    }

                    float blend = 1f - Mathf.Clamp01((bestDist - core) / (feather - core));
                    h[k] = (h[k] * (1f - blend)) + (bestY * blend);
                }
            }
        }
    }
}
