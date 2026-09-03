using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// البحيرة = أوسع منخفض ملأه الفيض. مستواها هو مستوى الفيض نفسه،
    /// فيتبع شاطئها خطّ كنتور حقيقياً بدل أن يكون قرصاً مرسوماً باليد.
    /// </summary>
    public static class LakeSolver
    {
        public static void Solve(WorldGenSettings s, WorldData w, float[] filled)
        {
            int n = w.Resolution;
            int len = n * n;
            float[] h = w.Height;
            byte[] lake = w.Lake;

            bool[] seen = new bool[len];
            int[] stack = new int[len];
            List<int> best = null;
            float bestLevel = 0f;
            Vector2 bestCenter = Vector2.zero;
            int bestArea = 0;

            float edge = s.EdgeRadius;
            float minDepth = s.LakeMinDepth;
            List<int> cells = new List<int>();

            for (int j = 2; j < n - 2; j++)
            {
                for (int i = 2; i < n - 2; i++)
                {
                    int k0 = (j * n) + i;
                    if (seen[k0] || filled[k0] - h[k0] < minDepth)
                    {
                        continue;
                    }

                    int sp = 0;
                    int area = 0;
                    float cx = 0f;
                    float cz = 0f;
                    float level = 0f;
                    bool valid = true;
                    cells.Clear();

                    stack[sp++] = k0;
                    seen[k0] = true;

                    while (sp > 0)
                    {
                        int k = stack[--sp];
                        int ii = k % n;
                        int jj = k / n;
                        float x = w.NodeToWorld(ii);
                        float z = w.NodeToWorld(jj);
                        float r = Mathf.Sqrt((x * x) + (z * z));

                        // بحيرة تبتلع ربوة القلعة أو تلامس الحافة ليست بحيرة صالحة
                        if (r < 300f || r > edge * 1.02f || ii < 2 || jj < 2 || ii >= n - 2 || jj >= n - 2)
                        {
                            valid = false;
                        }

                        cells.Add(k);
                        area++;
                        cx += x;
                        cz += z;
                        level += filled[k];

                        if (area > s.LakeMaxCells)
                        {
                            valid = false;
                            break;
                        }

                        for (int dir = 0; dir < 4; dir++)
                        {
                            int kk = dir == 0 ? k - 1 : dir == 1 ? k + 1 : dir == 2 ? k - n : k + n;
                            if (kk < 0 || kk >= len || seen[kk])
                            {
                                continue;
                            }

                            if (dir < 2 && System.Math.Abs((kk % n) - ii) != 1)
                            {
                                continue;
                            }

                            if (filled[kk] - h[kk] < minDepth)
                            {
                                continue;
                            }

                            seen[kk] = true;
                            stack[sp++] = kk;
                        }
                    }

                    if (!valid || area < s.LakeMinCells)
                    {
                        continue;
                    }

                    if (best == null || area > bestArea)
                    {
                        best = new List<int>(cells);
                        bestArea = area;
                        bestCenter = new Vector2(cx / area, cz / area);
                        bestLevel = level / area;
                    }
                }
            }

            if (best == null)
            {
                w.HasLake = false;
                w.LakeLevel = float.NegativeInfinity;
                return;
            }

            for (int c = 0; c < best.Count; c++)
            {
                lake[best[c]] = 1;
            }

            w.HasLake = true;
            w.LakeLevel = bestLevel;
            w.LakeCenter = bestCenter;
            w.LakeRadius = Mathf.Sqrt(bestArea * w.Step * w.Step / Mathf.PI);
        }
    }
}
