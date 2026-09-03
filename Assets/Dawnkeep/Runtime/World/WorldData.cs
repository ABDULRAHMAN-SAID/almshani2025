using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>حصيلة توليد العالم: حقول مسطّحة بحجم Resolution² ومعالم مشتقّة منها.</summary>
    public sealed class WorldData
    {
        public WorldData(int resolution, float worldSize)
        {
            Resolution = resolution;
            WorldSize = worldSize;
            Step = worldSize / (resolution - 1);

            int n = resolution * resolution;
            Height = new float[n];
            Flow = new float[n];
            Occlusion = new float[n];
            Moisture = new float[n];
            RiverDistance = new float[n];
            RoadDistance = new float[n];
            Lake = new byte[n];
            Downhill = new int[n];
            Roads = new List<Vector2[]>();
            River = new Vector2[0];
        }

        public int Resolution { get; private set; }

        public float WorldSize { get; private set; }

        /// <summary>المسافة بين عقدتين متجاورتين بالوحدات.</summary>
        public float Step { get; private set; }

        public float[] Height { get; private set; }

        /// <summary>تراكم الجريان — يقاس بعدد الخلايا التي تصبّ في الخلية.</summary>
        public float[] Flow { get; private set; }

        /// <summary>انحجاب محيط تقريبي في [0.66, 1].</summary>
        public float[] Occlusion { get; private set; }

        /// <summary>رطوبة التربة في [0,1]: مشتقّة من الجريان والقرب من الماء والارتفاع.</summary>
        public float[] Moisture { get; private set; }

        public float[] RiverDistance { get; private set; }

        public float[] RoadDistance { get; private set; }

        public byte[] Lake { get; private set; }

        public int[] Downhill { get; private set; }

        public List<Vector2[]> Roads { get; private set; }

        public Vector2[] River { get; set; }

        public float RiverWidth { get; set; }

        public bool HasLake { get; set; }

        public float LakeLevel { get; set; }

        public Vector2 LakeCenter { get; set; }

        public float LakeRadius { get; set; }

        public float MinHeight { get; set; }

        public float MaxHeight { get; set; }

        /// <summary>إحداثي العالم للعقدة i على المحور (المركز عند الصفر).</summary>
        public float NodeToWorld(int i)
        {
            return (i * Step) - (WorldSize * 0.5f);
        }

        /// <summary>أقرب عقدة داخلية للإحداثي العالمي.</summary>
        public int WorldToNode(float x, float z)
        {
            int i = Mathf.Clamp(Mathf.RoundToInt((x + (WorldSize * 0.5f)) / Step), 1, Resolution - 2);
            int j = Mathf.Clamp(Mathf.RoundToInt((z + (WorldSize * 0.5f)) / Step), 1, Resolution - 2);
            return (j * Resolution) + i;
        }

        /// <summary>قراءة ثنائية الخطّية من أي حقل بإحداثي عالمي.</summary>
        public float Sample(float[] field, float x, float z)
        {
            int n = Resolution;
            float fx = Mathf.Clamp((x + (WorldSize * 0.5f)) / Step, 0f, n - 1.0001f);
            float fz = Mathf.Clamp((z + (WorldSize * 0.5f)) / Step, 0f, n - 1.0001f);
            int i = (int)fx;
            int j = (int)fz;
            float tx = fx - i;
            float tz = fz - j;
            int k = (j * n) + i;

            float a = (field[k] * (1f - tx)) + (field[k + 1] * tx);
            float b = (field[k + n] * (1f - tx)) + (field[k + n + 1] * tx);
            return (a * (1f - tz)) + (b * tz);
        }

        /// <summary>
        /// قراءة ناعمة بمنحنى Catmull-Rom: تُستعمل لرفع دقّة شبكة التضاريس فوق دقّة
        /// المحاكاة. القراءة الخطّية تعيد نفس السطح بوجوه مسطّحة، وهذه تنعّمه فعلاً.
        /// </summary>
        public float SampleSmooth(float[] field, float x, float z)
        {
            int n = Resolution;
            float fx = Mathf.Clamp((x + (WorldSize * 0.5f)) / Step, 0f, n - 1.0001f);
            float fz = Mathf.Clamp((z + (WorldSize * 0.5f)) / Step, 0f, n - 1.0001f);
            int i = (int)fx;
            int j = (int)fz;
            float tx = fx - i;
            float tz = fz - j;

            float r0 = CubicRow(field, n, i, Mathf.Clamp(j - 1, 0, n - 1), tx);
            float r1 = CubicRow(field, n, i, j, tx);
            float r2 = CubicRow(field, n, i, Mathf.Clamp(j + 1, 0, n - 1), tx);
            float r3 = CubicRow(field, n, i, Mathf.Clamp(j + 2, 0, n - 1), tx);
            return Cubic(r0, r1, r2, r3, tz);
        }

        private static float CubicRow(float[] field, int n, int i, int j, float t)
        {
            int row = j * n;
            float a = field[row + Mathf.Clamp(i - 1, 0, n - 1)];
            float b = field[row + Mathf.Clamp(i, 0, n - 1)];
            float c = field[row + Mathf.Clamp(i + 1, 0, n - 1)];
            float d = field[row + Mathf.Clamp(i + 2, 0, n - 1)];
            return Cubic(a, b, c, d, t);
        }

        private static float Cubic(float a, float b, float c, float d, float t)
        {
            float t2 = t * t;
            return b
                 + (0.5f * t * (c - a))
                 + (t2 * (a - (2.5f * b) + (2f * c) - (0.5f * d)))
                 + (t2 * t * ((0.5f * (d - a)) + (1.5f * (b - c))));
        }

        /// <summary>ميل السطح عند عقدة، مُطبَّع بحيث 1 يساوي 45 درجة.</summary>
        public float SlopeAt(int i, int j)
        {
            int n = Resolution;
            int im = Mathf.Max(i - 1, 0);
            int ip = Mathf.Min(i + 1, n - 1);
            int jm = Mathf.Max(j - 1, 0);
            int jp = Mathf.Min(j + 1, n - 1);

            float dx = (Height[(j * n) + ip] - Height[(j * n) + im]) / ((ip - im) * Step);
            float dz = (Height[(jp * n) + i] - Height[(jm * n) + i]) / ((jp - jm) * Step);
            return Mathf.Sqrt((dx * dx) + (dz * dz));
        }
    }
}
