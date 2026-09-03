using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// تسوية موقع القلعة: كل حصن يُقام على مصطبة مسوّاة لا على نتوء متعرّج.
    /// القرص الداخلي يستوي تماماً ثم يتلاشى بنعومة إلى الأرض الطبيعية.
    /// </summary>
    public static class CastleTerrace
    {
        /// <summary>يعيد منسوب المصطبة بعد التسوية.</summary>
        public static float Level(WorldData w, float cx, float cz, float innerRadius, float outerRadius)
        {
            int n = w.Resolution;
            float[] h = w.Height;

            float sum = 0f;
            int count = 0;

            for (int j = 1; j < n - 1; j++)
            {
                float z = w.NodeToWorld(j);
                for (int i = 1; i < n - 1; i++)
                {
                    float x = w.NodeToWorld(i);
                    float dx = x - cx;
                    float dz = z - cz;
                    if ((dx * dx) + (dz * dz) <= innerRadius * innerRadius)
                    {
                        sum += h[(j * n) + i];
                        count++;
                    }
                }
            }

            if (count == 0)
            {
                return 0f;
            }

            float level = sum / count;

            for (int j = 1; j < n - 1; j++)
            {
                float z = w.NodeToWorld(j);
                for (int i = 1; i < n - 1; i++)
                {
                    float x = w.NodeToWorld(i);
                    float d = Mathf.Sqrt(((x - cx) * (x - cx)) + ((z - cz) * (z - cz)));
                    if (d > outerRadius)
                    {
                        continue;
                    }

                    float k = 1f;
                    if (d > innerRadius)
                    {
                        float t = (d - innerRadius) / (outerRadius - innerRadius);
                        k = 1f - (t * t * (3f - (2f * t)));
                    }

                    int idx = (j * n) + i;
                    h[idx] = Mathf.Lerp(h[idx], level, k);
                }
            }

            return level;
        }
    }
}
