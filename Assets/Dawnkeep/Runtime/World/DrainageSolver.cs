namespace Dawnkeep.World
{
    /// <summary>
    /// شبكة التصريف: أولاً تُملأ المنخفضات (Priority-Flood) على نسخة توجيه فقط —
    /// الأرض تبقى بحفرها — ثم يُحسب تراكم الجريان D8 على السطح المملوء،
    /// فتصير كل خلية موصولة بمصبّ حتى حافة الخريطة بلا انقطاع.
    /// </summary>
    public static class DrainageSolver
    {
        /// <summary>يعيد نسخة الارتفاع بعد ملء المنخفضات (تُستعمل للتوجيه وحساب البحيرة).</summary>
        public static float[] FillDepressions(WorldData w)
        {
            int n = w.Resolution;
            int len = n * n;
            float[] h = w.Height;
            float[] filled = new float[len];
            System.Array.Copy(h, filled, len);

            bool[] seen = new bool[len];
            IndexHeap heap = new IndexHeap(1 << 14);

            for (int i = 0; i < n; i++)
            {
                PushBorder(heap, seen, filled, i);
                PushBorder(heap, seen, filled, ((n - 1) * n) + i);
                PushBorder(heap, seen, filled, i * n);
                PushBorder(heap, seen, filled, (i * n) + n - 1);
            }

            while (heap.Count > 0)
            {
                int k = heap.Pop();
                int i = k % n;

                for (int dir = 0; dir < 4; dir++)
                {
                    int kk = dir == 0 ? k - 1 : dir == 1 ? k + 1 : dir == 2 ? k - n : k + n;
                    if (kk < 0 || kk >= len || seen[kk])
                    {
                        continue;
                    }

                    // منع التفاف الصفّ على الصفّ التالي عند حركة أفقية
                    if (dir < 2 && System.Math.Abs((kk % n) - i) != 1)
                    {
                        continue;
                    }

                    seen[kk] = true;
                    if (filled[kk] < filled[k] + 1e-3f)
                    {
                        filled[kk] = filled[k] + 1e-3f;
                    }

                    heap.Push(kk, filled[kk]);
                }
            }

            return filled;
        }

        /// <summary>تراكم الجريان D8 على السطح المملوء، مع تسجيل اتجاه الانحدار لكل خلية.</summary>
        public static void Accumulate(WorldData w, float[] filled)
        {
            int n = w.Resolution;
            int len = n * n;
            float[] flow = w.Flow;
            int[] down = w.Downhill;

            int[] order = new int[len];
            float[] key = new float[len];

            for (int i = 0; i < len; i++)
            {
                order[i] = i;
                key[i] = -filled[i];
                flow[i] = 1f;
                down[i] = -1;
            }

            // ترتيب تنازلي بالارتفاع: كل خلية تُعالج بعد كل ما يعلوها
            System.Array.Sort(key, order);

            int[] nb = { -1, 1, -n, n, -n - 1, -n + 1, n - 1, n + 1 };

            for (int t = 0; t < len; t++)
            {
                int k = order[t];
                int i = k % n;
                int j = k / n;
                if (i < 1 || j < 1 || i >= n - 1 || j >= n - 1)
                {
                    continue;
                }

                int best = -1;
                float bestHeight = filled[k];

                for (int d = 0; d < 8; d++)
                {
                    int kk = k + nb[d];
                    if (filled[kk] < bestHeight)
                    {
                        bestHeight = filled[kk];
                        best = kk;
                    }
                }

                if (best >= 0)
                {
                    flow[best] += flow[k];
                    down[k] = best;
                }
            }
        }

        private static void PushBorder(IndexHeap heap, bool[] seen, float[] filled, int k)
        {
            if (seen[k])
            {
                return;
            }

            seen[k] = true;
            heap.Push(k, filled[k]);
        }
    }
}
