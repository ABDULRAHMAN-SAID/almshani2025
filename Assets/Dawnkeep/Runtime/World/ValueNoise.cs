namespace Dawnkeep.World
{
    /// <summary>
    /// ضجيج قيمي متدرّج بنفس دالّة التجزئة المستعملة في النموذج المتصفّحي،
    /// بحساب مزدوج الدقّة كي لا تتفتّت القيم عند الإحداثيات الكبيرة.
    /// </summary>
    public static class ValueNoise
    {
        private static double Hash(double a, double b)
        {
            double v = System.Math.Sin((a * 127.1) + (b * 311.7)) * 43758.5453;
            return v - System.Math.Floor(v);
        }

        /// <summary>قيمة في [0,1] بتنعيم smoothstep بين عقد الشبكة.</summary>
        public static float Value(double x, double z)
        {
            double xi = System.Math.Floor(x);
            double zi = System.Math.Floor(z);
            double xf = x - xi;
            double zf = z - zi;
            double u = xf * xf * (3.0 - (2.0 * xf));
            double v = zf * zf * (3.0 - (2.0 * zf));

            double r = (Hash(xi, zi) * (1.0 - u) * (1.0 - v))
                     + (Hash(xi + 1.0, zi) * u * (1.0 - v))
                     + (Hash(xi, zi + 1.0) * (1.0 - u) * v)
                     + (Hash(xi + 1.0, zi + 1.0) * u * v);
            return (float)r;
        }

        /// <summary>مجموع طبقات مضروبة التردّد — قيمة في [0,1].</summary>
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
                x = (x * 2.03) + 17.1;
                z = (z * 2.11) + 9.7;
            }

            return norm > 0.0 ? (float)(sum / norm) : 0f;
        }
    }
}
