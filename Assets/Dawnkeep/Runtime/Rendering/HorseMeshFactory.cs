using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// خيل المملكة: جذع وكفل وعنق ورأس وأربع قوائم بمفاصل، وعُرف وذيل، وسرج ولجام،
    /// وجُلّ اختياري للفارس. مبنيّة إجرائياً من نفس أدوات البناء — لا أصل خارجي.
    ///
    /// شبكتان كالبشر: البدن لا يُصبغ (لون الشعر من الشبكة نفسها)، والجُلّ أبيض
    /// فيأخذ لون الراية. الطول المرجعي: كتف الحصان عند 0.62 من وحدة البناء.
    /// </summary>
    public static class HorseMeshFactory
    {
        private static readonly Color[] Coats =
        {
            new Color(0.361f, 0.239f, 0.161f), new Color(0.212f, 0.176f, 0.157f),
            new Color(0.529f, 0.404f, 0.271f), new Color(0.318f, 0.286f, 0.271f),
        };

        private static readonly Color Leather = new Color(0.361f, 0.239f, 0.157f);
        private static readonly Color LeatherDark = new Color(0.259f, 0.169f, 0.110f);

        private const float BodyY = 0.62f;

        public static CharacterMeshFactory.Parts Build(uint seed, bool barded)
        {
            MeshBuilder body = new MeshBuilder();
            MeshBuilder cloth = new MeshBuilder();
            System.Random rng = new System.Random((int)seed);
            Color coat = Coats[rng.Next(0, Coats.Length)];
            cloth.SetTint(1f, 1f, 1f);

            body.SetTint(coat.r, coat.g, coat.b);
            body.AddDeformedSphere(new Vector3(0f, BodyY, 0f), new Vector3(0.185f, 0.215f, 0.560f), 7, 13, 0.05f, seed + 2u);
            body.AddDeformedSphere(new Vector3(0f, BodyY + 0.03f, -0.30f), new Vector3(0.165f, 0.190f, 0.230f), 6, 11, 0.05f, seed + 5u);

            // العنق والرأس والخطم
            body.AddTube(new Vector3(0f, BodyY + 0.10f, 0.42f), new Vector3(0f, BodyY + 0.36f, 0.60f), 0.135f, 0.088f, 9, 1f, 0f, 0f, 0f);
            body.AddDeformedSphere(new Vector3(0f, BodyY + 0.40f, 0.655f), new Vector3(0.070f, 0.082f, 0.105f), 6, 11, 0.04f, seed + 8u);
            body.AddTube(new Vector3(0f, BodyY + 0.395f, 0.70f), new Vector3(0f, BodyY + 0.335f, 0.815f), 0.062f, 0.046f, 7, 1f, 0f, 0f, 0f);

            body.SetTint(coat.r * 0.6f, coat.g * 0.6f, coat.b * 0.6f);
            for (int s = -1; s <= 1; s += 2)
            {
                body.AddTube(new Vector3(s * 0.038f, BodyY + 0.462f, 0.618f),
                    new Vector3(s * 0.050f, BodyY + 0.520f, 0.600f), 0.016f, 0.004f, 4, 1f, 0f, 0f, 0f);
            }

            // العُرف والذيل
            body.SetTint(0.129f, 0.106f, 0.086f);
            for (int i = 0; i < 10; i++)
            {
                float t = i / 9f;
                Vector3 a = new Vector3(0f, BodyY + 0.12f + (t * 0.30f), 0.44f + (t * 0.17f));
                Vector3 b = new Vector3(((float)rng.NextDouble() - 0.5f) * 0.05f, a.y - 0.075f, a.z - 0.055f);
                body.AddTube(a, b, 0.020f, 0.008f, 4, 1f, 0f, 0.35f, i * 0.5f);
            }

            for (int i = 0; i < 8; i++)
            {
                Vector3 a = new Vector3(((float)rng.NextDouble() - 0.5f) * 0.03f, BodyY + 0.11f, -0.53f);
                Vector3 b = new Vector3(a.x * 2.2f, BodyY - 0.22f + ((float)rng.NextDouble() * 0.06f),
                    -0.60f - ((float)rng.NextDouble() * 0.05f));
                body.AddTube(a, b, 0.024f, 0.009f, 4, 1f, 0.1f, 0.6f, i * 0.7f);
            }

            // القوائم الأربع: مفصل ثم وظيف ثم حافر
            float[,] legs = { { -0.115f, 0.34f }, { 0.115f, 0.34f }, { -0.120f, -0.30f }, { 0.120f, -0.30f } };
            for (int i = 0; i < 4; i++)
            {
                float lx = legs[i, 0];
                float lz = legs[i, 1];
                bool fore = i < 2;

                body.SetTint(coat.r, coat.g, coat.b);
                Vector3 top = new Vector3(lx, BodyY - 0.10f, lz);
                Vector3 knee = new Vector3(lx, 0.30f, lz + (fore ? 0.02f : -0.03f));
                Vector3 fetlock = new Vector3(lx, 0.085f, lz + (fore ? 0f : 0.02f));

                body.AddTube(top, knee, fore ? 0.072f : 0.082f, 0.044f, 6, 1f, 0f, 0f, 0f);
                body.AddDeformedSphere(knee, new Vector3(0.049f, 0.049f, 0.049f), 4, 6, 0f, 7u);
                body.AddTube(knee, fetlock, 0.044f, 0.032f, 6, 1f, 0f, 0f, 0f);

                body.SetTint(0.129f, 0.114f, 0.098f);
                body.AddTube(fetlock, new Vector3(lx, 0f, fetlock.z + 0.012f), 0.034f, 0.040f, 6, 1f, 0f, 0f, 0f);
            }

            // السرج واللجام والركاب
            body.SetTint(Leather.r, Leather.g, Leather.b);
            body.AddDeformedSphere(new Vector3(0f, BodyY + 0.20f, 0.06f), new Vector3(0.150f, 0.062f, 0.185f), 5, 11, 0.05f, seed + 13u);
            body.AddTube(new Vector3(0f, BodyY + 0.40f, 0.70f), new Vector3(0f, BodyY + 0.42f, 0.62f), 0.058f, 0.070f, 7, 1f, 0f, 0f, 0f);

            body.SetTint(LeatherDark.r, LeatherDark.g, LeatherDark.b);
            for (int s = -1; s <= 1; s += 2)
            {
                body.AddTube(new Vector3(s * 0.155f, BodyY + 0.17f, 0.06f),
                    new Vector3(s * 0.170f, BodyY - 0.06f, 0.06f), 0.010f, 0.010f, 4, 1f, 0f, 0f, 0f);
            }

            if (barded)
            {
                for (int s = -1; s <= 1; s += 2)
                {
                    int start = cloth.VertexCount;
                    const int Rings = 4;
                    const int Segments = 6;
                    for (int r = 0; r <= Rings; r++)
                    {
                        float t = (float)r / Rings;
                        float y = BodyY + 0.16f - (t * 0.42f);
                        for (int q = 0; q <= Segments; q++)
                        {
                            float u = (float)q / Segments;
                            float z = 0.30f - (u * 0.66f);
                            cloth.AddVertex(new Vector3(s * (0.196f + (t * 0.020f)), y, z),
                                new Vector3(s, 0.1f, 0f).normalized,
                                new Vector2(u * 1.4f, t * 1.4f), Vector2.zero,
                                new Color(1f, 1f, 1f, 0.10f * t));
                        }
                    }

                    int stride = Segments + 1;
                    for (int r = 0; r < Rings; r++)
                    {
                        for (int q = 0; q < Segments; q++)
                        {
                            int i = start + (r * stride) + q;
                            if (s > 0)
                            {
                                cloth.AddQuad(i, i + 1, i + stride + 1, i + stride);
                            }
                            else
                            {
                                cloth.AddQuad(i, i + stride, i + stride + 1, i + 1);
                            }
                        }
                    }
                }
            }

            CharacterMeshFactory.Parts parts;
            parts.Body = body.ToMesh("Dawnkeep_Horse_Body", true);
            parts.Cloth = cloth.ToMesh("Dawnkeep_Horse_Cloth", true);
            return parts;
        }
    }
}
