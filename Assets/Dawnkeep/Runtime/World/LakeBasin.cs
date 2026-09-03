using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// حوض البحيرة: منخفض مغلق يُنحت عمداً بعد التعرية.
    ///
    /// ترك البحيرة لمصادفة التضاريس يعني خريطة بلا ماء في أغلب البذور — وقد حدث
    /// فعلاً بعد التحوّل إلى الضجيج التدرّجي: كل بذرة جُرّبت خرجت بلا بحيرة.
    ///
    /// ولا يكفي حفر قعر ورفع حافّة حوله: ميل الوادي العامّ يهبط عبر قطر الحوض
    /// أكثر ممّا ترفعه الحافّة، فيتسرّب الماء من الجهة المنخفضة. ورفع الحلقة
    /// أسوأ: يصير سدّاً عرضياً يحبس النهر فيغرق الوادي الأعلى كلّه.
    ///
    /// الصواب: تُقاس **أوطأ نقطة في حلقة الحافّة الطبيعية**، ثم يُحفر القعر
    /// تحتها كلّه ولا تُمَسّ الحلقة. عندها يكون الانغلاق مضموناً هندسياً.
    /// ويُحفر بعد التعرية لا قبلها كي لا تشقّ القطرات حافّته.
    /// </summary>
    public static class LakeBasin
    {
        public static void Carve(WorldGenSettings settings, WorldData w)
        {
            float depth = settings.LakeBasinDepth;
            float radius = settings.LakeBasinRadius;
            if (depth <= 0f || radius <= 1f)
            {
                return;
            }

            int n = w.Resolution;
            float step = w.Step;
            float[] h = w.Height;
            double drain = (settings.Seed * 1.9) + 0.7;

            float ringLow = settings.LakeBasinRing * 1.16f;
            float ringHigh = settings.LakeBasinRing * 1.48f;
            float clearance = settings.TerraceOuter + radius + (step * 4f);

            float bx = 0f;
            float bz = 0f;
            float lowest = float.PositiveInfinity;
            bool found = false;

            for (int t = 0; t < 720; t++)
            {
                double angle = (t / 720.0) * System.Math.PI * 2.0;

                // لا يُحفر في اتجاه المصبّ: هناك ينفتح الطوق فلا تنغلق حافّة
                double delta = System.Math.Abs((((angle - drain) + (System.Math.PI * 3.0))
                    % (System.Math.PI * 2.0)) - System.Math.PI);
                if (delta < 0.95)
                {
                    continue;
                }

                float ca = (float)System.Math.Cos(angle);
                float sa = (float)System.Math.Sin(angle);

                for (float r = ringLow; r <= ringHigh; r += step * 1.5f)
                {
                    float x = ca * r;
                    float z = sa * r;
                    if (Mathf.Sqrt((x * x) + (z * z)) < clearance)
                    {
                        continue;
                    }

                    float y = h[w.WorldToNode(x, z)];
                    if (y < lowest)
                    {
                        lowest = y;
                        bx = x;
                        bz = z;
                        found = true;
                    }
                }
            }

            if (!found)
            {
                return;
            }

            float rim = radius * 1.54f;

            // أوطأ نقطة في حلقة الحافّة: هي التي يتسرّب منها الماء لو تجاهلناها
            float rimMin = float.PositiveInfinity;
            for (int t = 0; t < 1440; t++)
            {
                double angle = (t / 1440.0) * System.Math.PI * 2.0;
                float ca = (float)System.Math.Cos(angle);
                float sa = (float)System.Math.Sin(angle);
                for (float r = radius; r <= rim; r += step)
                {
                    float y = h[w.WorldToNode(bx + (ca * r), bz + (sa * r))];
                    if (y < rimMin)
                    {
                        rimMin = y;
                    }
                }
            }

            if (float.IsPositiveInfinity(rimMin))
            {
                return;
            }

            for (int j = 1; j < n - 1; j++)
            {
                float z = w.NodeToWorld(j);
                for (int i = 1; i < n - 1; i++)
                {
                    float x = w.NodeToWorld(i);
                    float dx = x - bx;
                    float dz = z - bz;
                    float d = Mathf.Sqrt((dx * dx) + (dz * dz));
                    if (d > radius)
                    {
                        continue;
                    }

                    float t = d / radius;
                    float target = rimMin - 1.2f - (depth * Mathf.Pow(1f - (t * t), 1.10f));
                    int k = (j * n) + i;
                    if (h[k] > target)
                    {
                        h[k] = target;
                    }
                }
            }

            // حلقة الحافّة لا تُرفع أبداً: رفعها يقيم سدّاً عرضياً في الوادي
            // يحبس النهر فيغرق الحوض الأعلى كلّه.
        }
    }
}
