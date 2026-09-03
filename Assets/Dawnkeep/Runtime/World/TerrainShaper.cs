using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// الشكل المبدئي قبل التعرية: حوض مائل له مصبّ واحد، يحيطه طوق جبال
    /// مشوّه المجال (سلاسل متعرّجة لا حلقة منتظمة) مفتوح عند مضيق واحد،
    /// وفي قلبه ربوة تجلس عليها القلعة.
    /// </summary>
    public static class TerrainShaper
    {
        public static void Shape(WorldGenSettings s, WorldData w)
        {
            int n = w.Resolution;
            float step = w.Step;
            float world = w.WorldSize;
            float[] h = w.Height;

            double a = (s.Seed * 2.3) + 1.1;
            double tilt = (s.Seed * 1.9) + 0.7;
            float tiltCos = (float)System.Math.Cos(tilt);
            float tiltSin = (float)System.Math.Sin(tilt);
            float edge = s.EdgeRadius;

            for (int j = 0; j < n; j++)
            {
                float z = (j * step) - (world * 0.5f);

                for (int i = 0; i < n; i++)
                {
                    float x = (i * step) - (world * 0.5f);
                    float r = Mathf.Sqrt((x * x) + (z * z));

                    float y = (ValueNoise.Fbm((x * 0.0013) + a, (z * 0.0013) - a, 5) - 0.45f) * 2f * s.BroadHills;
                    y += (ValueNoise.Fbm((x * 0.0042) - a, (z * 0.0042) + a, 4) - 0.5f) * 2f * s.MidHills;
                    y += (ValueNoise.Fbm((x * 0.0105) + (a * 2.0), (z * 0.0105) - (a * 2.0), 3) - 0.5f) * 2f * s.Roughness;

                    // ميل عام يمنح الحوض مصبّاً واحداً بدل أن يحبس الماء في المنتصف
                    y -= ((x * tiltCos) + (z * tiltSin)) * s.BasinTilt;

                    float e = Mathf.Clamp01((r - (edge * 0.80f)) / 470f);
                    if (e > 0f)
                    {
                        double wx = x + ((ValueNoise.Fbm((x * 0.0012) + 3.0, (z * 0.0012) - 2.0, 2) - 0.5f) * s.RimWarp);
                        double wz = z + ((ValueNoise.Fbm((x * 0.0012) - 5.0, (z * 0.0012) + 7.0, 2) - 0.5f) * s.RimWarp);
                        float ridge = 1f - Mathf.Abs((ValueNoise.Fbm((wx * 0.0024) - (a * 2.0), (wz * 0.0024) + (a * 2.0), 5) * 2f) - 1f);

                        float rise = Mathf.Pow(e, 1.7f) * (s.RimBase + (ridge * ridge * s.RimRidges));

                        // مضيق واحد في الطوق باتجاه المصبّ — منه يخرج النهر وتدخل الطرق
                        double ga = System.Math.Atan2(z, x) - tilt;
                        double gd = System.Math.Abs(((ga + (System.Math.PI * 3.0)) % (System.Math.PI * 2.0)) - System.Math.PI);
                        rise *= 1f - (s.GorgeDepth * (float)System.Math.Exp(-(gd * gd) / 0.05));

                        y += rise;
                    }

                    // ربوة القلعة: نتوء طبيعي في القلب لا منصّة مربّعة
                    y += s.KnollHeight * Mathf.Exp(-(r * r) / (236f * 236f));

                    h[(j * n) + i] = y;
                }
            }
        }
    }
}
