using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// ضجيج قيمي قابل للتبليط: القيم على الحافّة اليمنى تساوي اليسرى تماماً،
    /// فلا يظهر خطّ وصل حين تتكرّر الخامة على الأرض.
    /// </summary>
    public sealed class TileableNoise
    {
        private readonly int _freq;
        private readonly float[] _grid;

        public TileableNoise(int freq, uint seed)
        {
            _freq = Mathf.Max(2, freq);
            _grid = new float[_freq * _freq];

            uint s = seed == 0u ? 1u : seed;
            for (int i = 0; i < _grid.Length; i++)
            {
                s = (s * 1664525u) + 1013904223u;
                _grid[i] = (s >> 8) / 16777216f;
            }
        }

        /// <summary>u و v في [0,1) — القراءة تلتفّ عند الحواف.</summary>
        public float Sample(float u, float v)
        {
            float fx = u * _freq;
            float fy = v * _freq;

            int i0 = Wrap(Mathf.FloorToInt(fx));
            int j0 = Wrap(Mathf.FloorToInt(fy));
            int i1 = Wrap(i0 + 1);
            int j1 = Wrap(j0 + 1);

            float tx = fx - Mathf.Floor(fx);
            float ty = fy - Mathf.Floor(fy);
            tx = tx * tx * (3f - (2f * tx));
            ty = ty * ty * (3f - (2f * ty));

            float a = Mathf.Lerp(_grid[(j0 * _freq) + i0], _grid[(j0 * _freq) + i1], tx);
            float b = Mathf.Lerp(_grid[(j1 * _freq) + i0], _grid[(j1 * _freq) + i1], tx);
            return Mathf.Lerp(a, b, ty);
        }

        private int Wrap(int i)
        {
            int m = i % _freq;
            return m < 0 ? m + _freq : m;
        }
    }
}
