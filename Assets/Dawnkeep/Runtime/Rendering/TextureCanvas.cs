using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// لوح رسم قابل للتبليط: تُرسم عليه الأعواد والحصى والشقوق فعلاً،
    /// ويحمل قناة ارتفاع تُشتقّ منها خريطة النتوء.
    /// الفرق بين «أرض تبدو مطموسة» و«أرض تبدو عشباً» هو هذا اللوح.
    /// </summary>
    public sealed class TextureCanvas
    {
        public TextureCanvas(int size)
        {
            Size = size;
            R = new float[size * size];
            G = new float[size * size];
            B = new float[size * size];
            H = new float[size * size];
        }

        public int Size { get; private set; }

        public float[] R { get; private set; }

        public float[] G { get; private set; }

        public float[] B { get; private set; }

        public float[] H { get; private set; }

        public int Wrap(int v)
        {
            int m = v % Size;
            return m < 0 ? m + Size : m;
        }

        /// <summary>مزج نقطة مع تغطية a وإضافة dh إلى الارتفاع. الإحداثيات تلتفّ عند الحواف.</summary>
        public void Put(float x, float y, float r, float g, float b, float a, float dh)
        {
            if (a <= 0f)
            {
                return;
            }

            if (a > 1f)
            {
                a = 1f;
            }

            int k = (Wrap(Mathf.RoundToInt(y)) * Size) + Wrap(Mathf.RoundToInt(x));
            R[k] += (r - R[k]) * a;
            G[k] += (g - G[k]) * a;
            B[k] += (b - B[k]) * a;
            H[k] += dh * a;
        }

        public Texture2D ToAlbedo(string name)
        {
            Color[] px = new Color[Size * Size];
            for (int i = 0; i < px.Length; i++)
            {
                px[i] = new Color(Mathf.Clamp01(R[i]), Mathf.Clamp01(G[i]), Mathf.Clamp01(B[i]), 1f);
            }

            Texture2D tex = new Texture2D(Size, Size, TextureFormat.RGBA32, true, false);
            tex.name = name;
            tex.wrapMode = TextureWrapMode.Repeat;
            tex.SetPixels(px);
            tex.Apply(true, false);
            return tex;
        }

        /// <summary>خريطة نتوء من قناة الارتفاع — RGB خام يحوّله المستورد إلى Normal Map.</summary>
        public Texture2D ToNormal(float strength)
        {
            Color[] px = new Color[Size * Size];

            for (int y = 0; y < Size; y++)
            {
                int ym = Wrap(y - 1);
                int yp = Wrap(y + 1);

                for (int x = 0; x < Size; x++)
                {
                    int xm = Wrap(x - 1);
                    int xp = Wrap(x + 1);

                    float dx = (H[(y * Size) + xp] - H[(y * Size) + xm]) * strength;
                    float dy = (H[(yp * Size) + x] - H[(ym * Size) + x]) * strength;
                    Vector3 n = new Vector3(-dx, -dy, 1f).normalized;

                    px[(y * Size) + x] = new Color(
                        (n.x * 0.5f) + 0.5f, (n.y * 0.5f) + 0.5f, (n.z * 0.5f) + 0.5f, 1f);
                }
            }

            Texture2D tex = new Texture2D(Size, Size, TextureFormat.RGBA32, true, true);
            tex.wrapMode = TextureWrapMode.Repeat;
            tex.SetPixels(px);
            tex.Apply(true, false);
            return tex;
        }
    }

    /// <summary>مولّد عشوائي حتمي صغير — نفس البذرة تعطي نفس الخامة على كل جهاز.</summary>
    public struct TexRandom
    {
        private uint _state;

        public TexRandom(uint seed)
        {
            _state = seed == 0u ? 1u : seed;
        }

        public float Next()
        {
            _state = (_state * 1664525u) + 1013904223u;
            return (_state >> 8) / 16777216f;
        }

        public float Range(float a, float b)
        {
            return a + ((b - a) * Next());
        }
    }
}
