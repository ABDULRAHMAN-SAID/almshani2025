using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// خطّ التوليد كاملاً: شكل مبدئي ← تعرية ← ملء منخفضات ← جريان ← بحيرة ←
    /// نهر ← طرق ← رطوبة ← انحجاب. النتيجة تضاريس مشتقّة من الفيزياء لا مرسومة باليد.
    /// </summary>
    public static class WorldGenerator
    {
        /// <summary>مراحل التوليد كما تُعرض في شريط التقدّم.</summary>
        public delegate void ProgressCallback(string stage, float progress);

        public static WorldData Generate(WorldGenSettings settings, ProgressCallback onProgress)
        {
            if (settings == null)
            {
                Debug.LogError("مملكة الرماد: إعدادات توليد العالم غير موجودة.");
                return null;
            }

            WorldData w = new WorldData(settings.Resolution, settings.WorldSize);

            Report(onProgress, "تشكيل الحوض وطوق الجبال", 0.02f);
            TerrainShaper.Shape(settings, w);

            Report(onProgress, "التعرية المائية", 0.08f);
            HydraulicErosion.Erode(settings, w, delegate (float t)
            {
                Report(onProgress, "التعرية المائية", 0.08f + (t * 0.42f));
            });

            Report(onProgress, "انهيار المنحدرات (تعرية حرارية)", 0.50f);
            ThermalErosion.Apply(settings, w, delegate (float t)
            {
                Report(onProgress, "انهيار المنحدرات (تعرية حرارية)", 0.50f + (t * 0.06f));
            });

            Report(onProgress, "نحت أضلاع الصخر وأخاديده", 0.56f);
            RockDetail.Apply(settings, w);

            Report(onProgress, "ملء المنخفضات", 0.57f);
            float[] filled = DrainageSolver.FillDepressions(w);

            Report(onProgress, "حساب شبكة التصريف", 0.62f);
            DrainageSolver.Accumulate(w, filled);

            Report(onProgress, "استخراج البحيرة", 0.68f);
            LakeSolver.Solve(settings, w, filled);

            Report(onProgress, "تتبّع النهر ونحت مجراه", 0.74f);
            RiverTracer.Trace(settings, w);

            Report(onProgress, "شقّ الطرق وتسويتها", 0.82f);
            RoadRouter.Route(settings, w);

            Report(onProgress, "تسوية مصطبة القلعة", 0.88f);
            w.CastleLevel = CastleTerrace.Level(w, 0f, 0f, settings.TerraceInner, settings.TerraceOuter);

            Report(onProgress, "حساب الرطوبة", 0.90f);
            ComputeMoisture(settings, w);

            Report(onProgress, "خبز الانحجاب", 0.94f);
            OcclusionBaker.Bake(w);

            Report(onProgress, "قياس المدى", 0.99f);
            MeasureRange(w);

            return w;
        }

        /// <summary>
        /// الرطوبة تحكم لون التربة وكثافة الغابة والعشب: تزيد قرب النهر والبحيرة
        /// وفي مجاري الجريان، وتقلّ مع الارتفاع وفي الميول الحادة.
        /// </summary>
        private static void ComputeMoisture(WorldGenSettings s, WorldData w)
        {
            int n = w.Resolution;
            float[] h = w.Height;
            float[] flow = w.Flow;
            float[] rd = w.RiverDistance;
            float[] moisture = w.Moisture;

            float low = float.PositiveInfinity;
            float high = float.NegativeInfinity;
            for (int k = 0; k < h.Length; k++)
            {
                if (h[k] < low)
                {
                    low = h[k];
                }

                if (h[k] > high)
                {
                    high = h[k];
                }
            }

            float span = Mathf.Max(1f, high - low);
            float riverWidth = w.River.Length > 0 ? w.RiverWidth : 0f;

            for (int j = 0; j < n; j++)
            {
                for (int i = 0; i < n; i++)
                {
                    int k = (j * n) + i;

                    // الجريان لوغاريتمي: الفرق بين رافد وواد أوضح من الفرق بين وادٍ ونهر
                    float channel = Mathf.Clamp01(Mathf.Log(1f + flow[k]) / 9f);

                    float nearRiver = riverWidth > 0f
                        ? Mathf.Clamp01(1f - (rd[k] / (riverWidth * 7f)))
                        : 0f;

                    float nearLake = 0f;
                    if (w.HasLake)
                    {
                        float dx = w.NodeToWorld(i) - w.LakeCenter.x;
                        float dz = w.NodeToWorld(j) - w.LakeCenter.y;
                        float d = Mathf.Sqrt((dx * dx) + (dz * dz));
                        nearLake = Mathf.Clamp01(1f - ((d - w.LakeRadius) / (w.LakeRadius * 2.6f + 220f)));
                    }

                    float altitude = Mathf.Clamp01((h[k] - low) / span);
                    float slope = Mathf.Clamp01(w.SlopeAt(i, j));

                    float m = (channel * 0.46f)
                            + (nearRiver * 0.34f)
                            + (nearLake * 0.28f)
                            + ((1f - altitude) * 0.34f)
                            - (slope * 0.30f);

                    moisture[k] = Mathf.Clamp01(m);
                }
            }
        }

        private static void MeasureRange(WorldData w)
        {
            float low = float.PositiveInfinity;
            float high = float.NegativeInfinity;
            float[] h = w.Height;

            for (int k = 0; k < h.Length; k++)
            {
                if (h[k] < low)
                {
                    low = h[k];
                }

                if (h[k] > high)
                {
                    high = h[k];
                }
            }

            w.MinHeight = low;
            w.MaxHeight = high;
        }

        private static void Report(ProgressCallback onProgress, string stage, float progress)
        {
            if (onProgress != null)
            {
                onProgress(stage, progress);
            }
        }
    }
}
