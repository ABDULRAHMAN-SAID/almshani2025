namespace Dawnkeep.World
{
    /// <summary>
    /// ضجيج تدرّجي (Perlin) بتَبْيين خماسي ودوران مجال لكل طبقة.
    /// الضجيج القيمي على شبكة محاذية للمحاور يترك نقشاً ماسيّاً ظاهراً في هندسة
    /// التضاريس — وهو ما كان يجعل الجبال تبدو منقوشة بنسيج متكرّر. التدرّجي يزيله،
    /// ودوران المجال بين الطبقات يمنع اصطفافها على نفس المحاور.
    /// الحساب مزدوج الدقّة كي لا تتفتّت القيم عند الإحداثيات الكبيرة.
    /// </summary>
    public static class ValueNoise
    {
        private const double Tau = 6.28318530717958648;
        private static readonly double FoldCos = System.Math.Cos(0.6180339);
        private static readonly double FoldSin = System.Math.Sin(0.6180339);

        private static double Hash(double a, double b)
        {
            double v = System.Math.Sin((a * 127.1) + (b * 311.7)) * 43758.5453;
            return v - System.Math.Floor(v);
        }

        private static double Grad(double ix, double iz, double dx, double dz)
        {
            double a = Hash(ix, iz) * Tau;
            return (System.Math.Cos(a) * dx) + (System.Math.Sin(a) * dz);
        }

        /// <summary>قيمة في [0,1] تقريباً — تدرّجية لا قيمية.</summary>
        public static float Value(double x, double z)
        {
            double xi = System.Math.Floor(x);
            double zi = System.Math.Floor(z);
            double xf = x - xi;
            double zf = z - zi;

            // تبيين خماسي: مشتقّته الأولى والثانية صفر عند العقد فلا تظهر حوافّ الشبكة
            double u = xf * xf * xf * ((xf * ((xf * 6.0) - 15.0)) + 10.0);
            double v = zf * zf * zf * ((zf * ((zf * 6.0) - 15.0)) + 10.0);

            double n00 = Grad(xi, zi, xf, zf);
            double n10 = Grad(xi + 1.0, zi, xf - 1.0, zf);
            double n01 = Grad(xi, zi + 1.0, xf, zf - 1.0);
            double n11 = Grad(xi + 1.0, zi + 1.0, xf - 1.0, zf - 1.0);

            double a = (n00 * (1.0 - u)) + (n10 * u);
            double b = (n01 * (1.0 - u)) + (n11 * u);
            return (float)(((a * (1.0 - v)) + (b * v)) * 0.72 + 0.5);
        }

        /// <summary>مجموع طبقات مضروبة التردّد مع دوران المجال — قيمة في [0,1].</summary>
        public static float Fbm(double x, double z, int octaves)
        {
            double amplitude = 0.5;
            double sum = 0.0;
            double norm = 0.0;

            for (int i = 0; i < octaves; i++)
            {
                sum += Value(x, z) * amplitude;
                norm += amplitude;
                amplitude *= 0.5;
                double nx = (((x * FoldCos) - (z * FoldSin)) * 2.03) + 17.1;
                double nz = (((x * FoldSin) + (z * FoldCos)) * 2.11) + 9.7;
                x = nx;
                z = nz;
            }

            return norm > 0.0 ? (float)(sum / norm) : 0f;
        }

        /// <summary>ضجيج مطويّ: قمم حادّة بدل نتوءات مستديرة — شكل الأعراف الصخرية.</summary>
        public static float Ridged(double x, double z, int octaves)
        {
            return 1f - System.Math.Abs((Fbm(x, z, octaves) * 2f) - 1f);
        }
    }
}
