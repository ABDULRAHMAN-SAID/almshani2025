using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// شقّ المصبّ: مجرى يُحفر على أقلّ المسارات ارتفاعاً من أعمق نقطة في الوادي
    /// إلى حافّة الخريطة.
    ///
    /// بدونه يكون الحوض كلّه منخفضاً مغلقاً: حلّ التصريف يملأه بمئات الوحدات،
    /// فلا يميّز مستخرج البحيرات بحيرةً من غرقٍ عامّ فيرفض كل شيء — وتخرج
    /// الخريطة بلا ماء مهما بدّلنا البذرة.
    ///
    /// طريقتان لا تعملان وقد جُرّبتا:
    /// • اتّباع المصبّ `Downstream` على السطح المملوء — السطح المملوء **مستوٍ**،
    ///   فلا جار أخفض لأي خليّة، فيتوقّف المشي عند أول خطوة.
    /// • نحت مضيق مستقيم في طوق الجبال — أخفض نقطة في الوادي قد تكون بعيدة عنه
    ///   فيبقى الماء محبوساً دونه.
    ///
    /// الطريقة العاملة: مسار «الأدنى-أعلى» (minimax). نزحف من حافّة الخريطة
    /// بأولوية أقلّ ارتفاع بلغناه، فيصير لكل خليّة أوطأ سرج يفصلها عن الخارج.
    /// ثم نتتبّع المسار من أعمق نقطة إلى الحافّة ونحفر على طوله قاعاً هابطاً.
    /// </summary>
    public static class OutletBreach
    {
        public static void Carve(WorldGenSettings settings, WorldData w)
        {
            // تمريرة واحدة تصرّف أعمق منخفض وحده، وفي الوادي منخفضات عدّة: ما يبقى
            // منها مغلقاً يتّصل بحوض البحيرة عند الفيض فيرفض المستخرج المنطقة كلّها.
            // نكرّر حتى يجفّ ميدان اللعب.
            int n = w.Resolution;
            bool[] carved = new bool[n * n];

            for (int pass = 0; pass < 5; pass++)
            {
                if (!CarveOnce(settings, w, carved))
                {
                    break;
                }
            }

            Smooth(w, carved);
        }

        /// <summary>
        /// تنعيم المجرى: القطع بشرط «الأدنى» يترك حدّاً حادّاً كالسكّين على الضفاف.
        /// تمريرتان على الخلايا المحفورة وحدها تحوّلانه إلى وادٍ منحوت.
        /// </summary>
        private static void Smooth(WorldData w, bool[] carved)
        {
            int n = w.Resolution;
            float[] h = w.Height;
            float[] tmp = new float[n * n];

            for (int pass = 0; pass < 2; pass++)
            {
                System.Array.Copy(h, tmp, h.Length);
                for (int j = 1; j < n - 1; j++)
                {
                    for (int i = 1; i < n - 1; i++)
                    {
                        int k = (j * n) + i;
                        if (!carved[k])
                        {
                            continue;
                        }

                        float sum = (tmp[k] * 4f)
                                  + tmp[k - 1] + tmp[k + 1] + tmp[k - n] + tmp[k + n]
                                  + ((tmp[k - n - 1] + tmp[k - n + 1] + tmp[k + n - 1] + tmp[k + n + 1]) * 0.5f);
                        h[k] = sum / 10f;
                    }
                }
            }
        }

        private static bool CarveOnce(WorldGenSettings settings, WorldData w, bool[] carved)
        {
            int n = w.Resolution;
            int len = n * n;
            float step = w.Step;
            float half = w.WorldSize * 0.5f;
            float[] h = w.Height;

            float[] filled = DrainageSolver.FillDepressions(w);

            int deepest = -1;
            float deepestDepth = 0f;
            float playRadiusSqr = settings.EdgeRadius * settings.EdgeRadius * 1.14f;
            for (int k = 0; k < len; k++)
            {
                // البحث داخل ميدان اللعب وحده: منخفضات الأركان خارج الطوق لا تعني اللاعب
                float x = w.NodeToWorld(k % n);
                float z = w.NodeToWorld(k / n);
                if (((x * x) + (z * z)) > playRadiusSqr)
                {
                    continue;
                }

                float d = filled[k] - h[k];
                if (d > deepestDepth)
                {
                    deepestDepth = d;
                    deepest = k;
                }
            }

            if (deepest < 0 || deepestDepth < 24f)
            {
                return false;
            }

            float[] barrier = new float[len];
            int[] parent = new int[len];
            bool[] done = new bool[len];
            for (int k = 0; k < len; k++)
            {
                barrier[k] = float.PositiveInfinity;
                parent[k] = -1;
            }

            IndexHeap heap = new IndexHeap(1 << 14);
            for (int i = 0; i < n; i++)
            {
                SeedBorder(heap, barrier, h, i);
                SeedBorder(heap, barrier, h, ((n - 1) * n) + i);
                SeedBorder(heap, barrier, h, i * n);
                SeedBorder(heap, barrier, h, (i * n) + n - 1);
            }

            while (heap.Count > 0)
            {
                int k = heap.Pop();
                if (done[k])
                {
                    continue;
                }

                done[k] = true;
                if (k == deepest)
                {
                    break;
                }

                int i = k % n;
                Relax(heap, barrier, parent, done, h, n, len, k, k - 1, i, true);
                Relax(heap, barrier, parent, done, h, n, len, k, k + 1, i, true);
                Relax(heap, barrier, parent, done, h, n, len, k, k - n, i, false);
                Relax(heap, barrier, parent, done, h, n, len, k, k + n, i, false);
            }

            if (parent[deepest] < 0)
            {
                return false;
            }

            float channelHalf = settings.OutletChannelWidth * 0.5f;
            float bankRise = settings.OutletBankRise;
            float slope = settings.OutletSlope;

            int cell = deepest;
            float bed = h[deepest] - 3f;
            int guard = 0;

            while (cell >= 0 && guard++ < n * 8)
            {
                float cx = w.NodeToWorld(cell % n);
                float cz = w.NodeToWorld(cell / n);

                // الحدّ الأدنى صفر لا واحد: حصر الحفر داخل الإطار يترك صفّ الحافّة
                // مرتفعاً فيقف المجرى على بُعد خليّة من المخرج ويبقى الوادي مغلقاً.
                int i0 = Mathf.Max(0, Mathf.FloorToInt((cx - channelHalf + half) / step));
                int i1 = Mathf.Min(n - 1, Mathf.CeilToInt((cx + channelHalf + half) / step));
                int j0 = Mathf.Max(0, Mathf.FloorToInt((cz - channelHalf + half) / step));
                int j1 = Mathf.Min(n - 1, Mathf.CeilToInt((cz + channelHalf + half) / step));

                for (int j = j0; j <= j1; j++)
                {
                    float z = w.NodeToWorld(j);
                    for (int i = i0; i <= i1; i++)
                    {
                        float x = w.NodeToWorld(i);
                        float dx = x - cx;
                        float dz = z - cz;
                        float d = Mathf.Sqrt((dx * dx) + (dz * dz));
                        if (d > channelHalf)
                        {
                            continue;
                        }

                        // قاع مستوٍ ثم ضفّتان ترتفعان: مجرى لا خندق بجدارين عموديين
                        float t = Mathf.Max(0f, (d - (channelHalf * 0.26f)) / (channelHalf * 0.74f));
                        float target = bed + (t * t * bankRise);
                        int kk = (j * n) + i;
                        if (h[kk] > target)
                        {
                            h[kk] = target;
                            carved[kk] = true;
                        }
                    }
                }

                int next = parent[cell];
                if (next < 0)
                {
                    break;
                }

                float nx = w.NodeToWorld(next % n) - cx;
                float nz = w.NodeToWorld(next / n) - cz;
                bed -= Mathf.Sqrt((nx * nx) + (nz * nz)) * slope;
                cell = next;
            }

            return true;
        }

        private static void SeedBorder(IndexHeap heap, float[] barrier, float[] h, int k)
        {
            if (float.IsPositiveInfinity(barrier[k]))
            {
                barrier[k] = h[k];
                heap.Push(k, h[k]);
            }
        }

        private static void Relax(IndexHeap heap, float[] barrier, int[] parent, bool[] done,
            float[] h, int n, int len, int from, int to, int fromColumn, bool sameRow)
        {
            if (to < 0 || to >= len || done[to])
            {
                return;
            }

            // لا يلتفّ الصفّ على الصفّ التالي
            if (sameRow && Mathf.Abs((to % n) - fromColumn) != 1)
            {
                return;
            }

            float candidate = Mathf.Max(barrier[from], h[to]);
            if (candidate < barrier[to])
            {
                barrier[to] = candidate;
                parent[to] = from;
                heap.Push(to, candidate);
            }
        }
    }
}
