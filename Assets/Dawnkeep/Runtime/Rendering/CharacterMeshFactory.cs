using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// أهل المملكة: بطل وجنود ورماة وقرويّون — مبنيّون إجرائياً من نفس أدوات
    /// البناء (أنبوب، كتلة، مِخرطة). لا أصل مأخوذ من أي مصدر خارجي.
    ///
    /// القاعدة الحاكمة للشكل: على بُعد كاميرا الاستراتيجية لا تُقرأ التفاصيل
    /// التشريحية بل **الصورة الظلّية** — الخوذة، والمنكبان، والدرع، والرمح،
    /// والعباءة. لذلك تُبنى هذه بارزةً واضحة، ويُترك الوجه والأصابع.
    ///
    /// وتُخرَج **شبكتان لا واحدة**: البدن (جلد وفولاذ وجلود وخشب) لا يُصبغ أبداً،
    /// والقماش (القميص والعباءة ووجه الدرع) أبيض في الشبكة فيأخذ لون الراية لكل
    /// نسخة. لو كانتا واحدة لصبغ لونُ الراية الجلدَ والفولاذ معه، فيصير الجندي
    /// كتلة قرمزية بلا ملامح.
    ///
    /// كل شيء يُبنى بارتفاع 1.0 ثم يُقاس عند الوضع، فتُضبط الأحجام في مكان واحد.
    /// </summary>
    public static class CharacterMeshFactory
    {
        /// <summary>
        /// أرقام المفاصل. كل رأس يحمل رقم مفصله في TEXCOORD1.x، والمُظلِّل يدير
        /// المفصل حول محوره فتتحرّك الشخصية على بطاقة الرسم بلا هيكل عظمي.
        ///
        /// المفاصل الكرويّة تُسنَد إلى الطرف **الأب** فتبقى ثابتة وتغطّي الفجوة
        /// عند دوران الابن — بهذا لا تتمزّق الشبكة عند الكتف والركبة.
        /// </summary>
        public static class Limb
        {
            public const float Root = 0f;
            public const float Chest = 1f;
            public const float Head = 2f;
            public const float ArmLeftUpper = 3f;
            public const float ArmLeftLower = 4f;
            public const float ArmRightUpper = 5f;
            public const float ArmRightLower = 6f;
            public const float LegLeftUpper = 7f;
            public const float LegLeftLower = 8f;
            public const float LegRightUpper = 9f;
            public const float LegRightLower = 10f;
            public const float Cape = 11f;
        }

        public enum Kind
        {
            Hero,
            Spearman,
            Swordsman,
            Archer,
            Villager,
        }

        public struct Parts
        {
            public Mesh Body;
            public Mesh Cloth;
        }

        private static readonly Color Skin = new Color(0.741f, 0.549f, 0.404f);
        private static readonly Color SkinDark = new Color(0.639f, 0.451f, 0.322f);
        private static readonly Color Leather = new Color(0.361f, 0.239f, 0.157f);
        private static readonly Color LeatherDark = new Color(0.259f, 0.169f, 0.110f);
        private static readonly Color Wood = new Color(0.451f, 0.318f, 0.196f);
        private static readonly Color Steel = new Color(0.639f, 0.663f, 0.694f);
        private static readonly Color SteelDark = new Color(0.478f, 0.502f, 0.533f);
        private static readonly Color Gold = new Color(0.788f, 0.627f, 0.271f);

        private const float HipY = 0.50f;
        private const float ShoulderY = 0.815f;
        private const float HeadY = 0.915f;
        private const float HeadR = 0.072f;

        public static Parts Build(uint seed, Kind kind)
        {
            MeshBuilder body = new MeshBuilder();
            MeshBuilder cloth = new MeshBuilder();
            System.Random rng = new System.Random((int)seed);

            bool hero = kind == Kind.Hero;
            bool civilian = kind == Kind.Villager;
            bool armoured = !civilian;
            float stance = 0.052f + ((float)rng.NextDouble() * 0.012f);
            cloth.SetTint(1f, 1f, 1f);

            BuildLegs(body, stance, civilian, seed);
            BuildTorso(body, cloth, armoured, seed);
            BuildArms(body, cloth, armoured, seed);
            BuildHead(body, cloth, civilian, seed);
            BuildGear(body, cloth, kind, seed);

            Parts parts;
            parts.Body = body.ToMesh("Dawnkeep_" + kind + "_Body", true);
            parts.Cloth = cloth.ToMesh("Dawnkeep_" + kind + "_Cloth", true);
            return parts;
        }

        /// <summary>جذع: مقطع بيضويّ يُكنس من الحوض إلى المنكبين فيتّسع عند الصدر.</summary>
        private static void Torso(MeshBuilder mb, float hipY, float shoulderY,
            float hipWidth, float chestWidth, float depth)
        {
            int start = mb.VertexCount;
            const int Rings = 6;
            const int Segments = 12;

            for (int r = 0; r <= Rings; r++)
            {
                float t = (float)r / Rings;
                float y = hipY + ((shoulderY - hipY) * t);
                float w = hipWidth + ((chestWidth - hipWidth)
                        * Mathf.Sin(Mathf.Min(1f, t * 1.25f) * Mathf.PI * 0.62f));
                float d = depth * (0.86f + (0.24f * Mathf.Sin(t * Mathf.PI * 0.9f)));

                for (int q = 0; q <= Segments; q++)
                {
                    float a = (float)q / Segments * Mathf.PI * 2f;
                    float ca = Mathf.Cos(a);
                    float sa = Mathf.Sin(a);
                    Vector3 n = new Vector3(ca / Mathf.Max(w, 1e-4f), 0.12f, sa / Mathf.Max(d, 1e-4f)).normalized;
                    mb.AddVertex(new Vector3(ca * w, y, sa * d), n,
                        new Vector2((float)q / Segments * 2.4f, t * 2.2f), new Color(1f, 1f, 1f, 0f));
                }
            }

            int stride = Segments + 1;
            for (int r = 0; r < Rings; r++)
            {
                for (int q = 0; q < Segments; q++)
                {
                    int i = start + (r * stride) + q;
                    mb.AddQuad(i, i + 1, i + stride + 1, i + stride);
                }
            }
        }

        private static void BuildLegs(MeshBuilder body, float stance, bool civilian, uint seed)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                float hx = s * stance;
                float upper = s < 0 ? Limb.LegLeftUpper : Limb.LegRightUpper;
                float lower = s < 0 ? Limb.LegLeftLower : Limb.LegRightLower;

                body.SetLimb(lower);
                body.SetTint(LeatherDark.r, LeatherDark.g, LeatherDark.b);
                body.AddTube(new Vector3(hx, 0.030f, 0.012f), new Vector3(hx, 0.030f, 0.075f), 0.036f, 0.026f, 6, 1f, 0f, 0f, 0f);
                body.AddTube(new Vector3(hx, 0f, 0f), new Vector3(hx, 0.055f, 0f), 0.040f, 0.034f, 6, 1f, 0f, 0f, 0f);

                Color trouser = civilian
                    ? new Color(0.318f, 0.267f, 0.208f)
                    : new Color(Leather.r * 0.80f, Leather.g * 0.78f, Leather.b * 0.76f);
                body.SetTint(trouser.r, trouser.g, trouser.b);
                body.AddTube(new Vector3(hx, 0.055f, 0f), new Vector3(hx, 0.265f, 0.012f), 0.034f, 0.040f, 6, 1f, 0f, 0f, 0f);

                // كرة الركبة تُسنَد إلى الفخذ (الأب) فتغطّي الفجوة عند الثني
                body.SetLimb(upper);
                body.AddDeformedSphere(new Vector3(hx, 0.265f, 0.012f), new Vector3(0.045f, 0.045f, 0.045f), 4, 6, 0f, 7u);
                body.AddTube(new Vector3(hx, 0.265f, 0.012f), new Vector3(hx * 1.06f, HipY, 0f), 0.040f, 0.056f, 6, 1f, 0f, 0f, 0f);
            }

            body.SetLimb(Limb.Root);
            Color hips = civilian ? new Color(0.416f, 0.345f, 0.263f) : Leather;
            body.SetTint(hips.r, hips.g, hips.b);
            body.AddDeformedSphere(new Vector3(0f, HipY, 0f), new Vector3(0.098f, 0.062f, 0.070f), 5, 11, 0.03f, seed + 3u);
        }

        private static void BuildTorso(MeshBuilder body, MeshBuilder cloth, bool armoured, uint seed)
        {
            cloth.SetLimb(Limb.Chest);
            Torso(cloth, HipY - 0.02f, ShoulderY, 0.092f, 0.118f, 0.068f);

            body.SetLimb(Limb.Chest);
            if (armoured)
            {
                body.SetTint(SteelDark.r, SteelDark.g, SteelDark.b);
                Torso(body, HipY + 0.10f, ShoulderY - 0.005f, 0.100f, 0.124f, 0.074f);

                // منكبان بارزان: أهمّ ما في الصورة الظلّية على بُعد الكاميرا
                body.SetTint(Steel.r, Steel.g, Steel.b);
                for (int s = -1; s <= 1; s += 2)
                {
                    body.AddDeformedSphere(new Vector3(s * 0.128f, ShoulderY - 0.030f, 0f),
                        new Vector3(0.058f, 0.046f, 0.062f), 5, 11, 0.04f, seed + (uint)(s * 17));
                }
            }

            body.SetTint(LeatherDark.r, LeatherDark.g, LeatherDark.b);
            Torso(body, HipY + 0.055f, HipY + 0.088f, 0.100f, 0.104f, 0.076f);
        }

        private static void BuildArms(MeshBuilder body, MeshBuilder cloth, bool armoured, uint seed)
        {
            float armR = armoured ? 0.030f : 0.027f;
            for (int s = -1; s <= 1; s += 2)
            {
                float sx = s * 0.112f;
                float bend = s < 0 ? 0.10f : 0.045f;
                float upper = s < 0 ? Limb.ArmLeftUpper : Limb.ArmRightUpper;
                float lower = s < 0 ? Limb.ArmLeftLower : Limb.ArmRightLower;

                cloth.SetLimb(upper);
                cloth.AddTube(new Vector3(sx, ShoulderY - 0.035f, 0f),
                    new Vector3(sx * 1.10f, ShoulderY - 0.175f, bend), armR, armR * 0.88f, 6, 1f, 0f, 0f, 0f);
                cloth.AddDeformedSphere(new Vector3(sx * 1.10f, ShoulderY - 0.175f, bend),
                    new Vector3(armR * 0.99f, armR * 0.99f, armR * 0.99f), 4, 6, 0f, 7u);   // المرفق على العضد

                cloth.SetLimb(lower);
                cloth.AddTube(new Vector3(sx * 1.10f, ShoulderY - 0.175f, bend),
                    new Vector3(sx * 1.02f, ShoulderY - 0.300f, bend * 1.9f),
                    armR * 0.88f, armR * 0.80f, 6, 1f, 0f, 0f, 0f);

                body.SetLimb(lower);
                body.SetTint(Skin.r, Skin.g, Skin.b);
                body.AddDeformedSphere(new Vector3(sx * 1.02f, ShoulderY - 0.318f, bend * 2.0f),
                    new Vector3(0.030f, 0.034f, 0.030f), 4, 8, 0.05f, seed + (uint)(s * 29));
            }
        }

        private static void BuildHead(MeshBuilder body, MeshBuilder cloth, bool civilian, uint seed)
        {
            body.SetLimb(Limb.Chest);
            body.SetTint(SkinDark.r, SkinDark.g, SkinDark.b);
            body.AddTube(new Vector3(0f, ShoulderY - 0.010f, 0f), new Vector3(0f, ShoulderY + 0.042f, 0f),
                0.030f, 0.027f, 6, 1f, 0f, 0f, 0f);

            body.SetLimb(Limb.Head);
            body.SetTint(Skin.r, Skin.g, Skin.b);
            body.AddDeformedSphere(new Vector3(0f, HeadY, 0.004f),
                new Vector3(HeadR * 0.92f, HeadR * 1.06f, HeadR * 0.94f), 6, 11, 0.03f, seed + 41u);

            if (civilian)
            {
                body.SetTint(0.216f, 0.169f, 0.129f);
                body.AddDeformedSphere(new Vector3(0f, HeadY + 0.020f, -0.004f),
                    new Vector3(HeadR * 0.95f, HeadR * 0.80f, HeadR * 0.97f), 5, 11, 0.05f, seed + 53u);

                cloth.SetLimb(Limb.Head);
                ArchitectureBuilder.Lathe(cloth, new Vector3(0f, HeadY + (HeadR * 0.55f), 0f), new[]
                {
                    new Vector2(HeadR * 1.5f, 0f), new Vector2(HeadR * 1.35f, 0.012f),
                    new Vector2(HeadR * 0.9f, 0.030f), new Vector2(0f, 0.050f),
                }, 10, 1.4f, false);
            }
        }

        /// <summary>خوذة: قبّة مخروطة بحافّة، وقناع أنف للبطل.</summary>
        private static void Helm(MeshBuilder body, float cy, float r, string style)
        {
            body.SetTint(Steel.r, Steel.g, Steel.b);
            Vector3 baseC = new Vector3(0f, cy - (r * 0.9f), 0f);

            if (style == "conical")
            {
                ArchitectureBuilder.Lathe(body, baseC, new[]
                {
                    new Vector2(r * 1.02f, 0f), new Vector2(r * 1.05f, r * 0.24f),
                    new Vector2(r * 0.86f, r * 0.95f), new Vector2(r * 0.42f, r * 1.5f),
                    new Vector2(0f, r * 1.9f),
                }, 12, 1.4f, false);
            }
            else if (style == "kettle")
            {
                ArchitectureBuilder.Lathe(body, baseC, new[]
                {
                    new Vector2(r * 1.34f, 0f), new Vector2(r * 1.30f, r * 0.16f),
                    new Vector2(r * 1.02f, r * 0.30f), new Vector2(r * 0.94f, r * 0.9f),
                    new Vector2(r * 0.5f, r * 1.28f), new Vector2(0f, r * 1.38f),
                }, 12, 1.4f, false);
            }
            else
            {
                ArchitectureBuilder.Lathe(body, new Vector3(0f, cy - r, 0f), new[]
                {
                    new Vector2(r * 1.06f, 0f), new Vector2(r * 1.10f, r * 0.30f),
                    new Vector2(r * 1.02f, r), new Vector2(r * 0.66f, r * 1.62f),
                    new Vector2(r * 0.22f, r * 1.92f), new Vector2(0f, r * 1.98f),
                }, 14, 1.4f, false);

                body.SetTint(SteelDark.r, SteelDark.g, SteelDark.b);
                body.AddTube(new Vector3(0f, cy + (r * 0.10f), r * 0.86f),
                    new Vector3(0f, cy - (r * 0.55f), r * 0.98f), r * 0.13f, r * 0.09f, 5, 1f, 0f, 0f, 0f);
            }

            body.SetTint(SteelDark.r, SteelDark.g, SteelDark.b);
            ArchitectureBuilder.Lathe(body, new Vector3(0f, cy - (r * 0.92f), 0f), new[]
            {
                new Vector2(r * 1.12f, 0f), new Vector2(r * 1.16f, r * 0.14f), new Vector2(r * 1.10f, r * 0.20f),
            }, 12, 1.4f, false);
        }

        /// <summary>درع رأسي: قرص أو طُرس بوجه من القماش وحافّة معدنية وصُرّة.</summary>
        private static void Shield(MeshBuilder body, MeshBuilder cloth,
            float cx, float cy, float cz, float rot, float r, bool kite)
        {
            float ca = Mathf.Cos(rot);
            float sa = Mathf.Sin(rot);
            int segments = kite ? 9 : 16;

            List<Vector2> pts = new List<Vector2>(segments);
            for (int i = 0; i < segments; i++)
            {
                float a = (float)i / segments * Mathf.PI * 2f;
                float rx = r;
                float ry = r;
                if (kite)
                {
                    float t = (Mathf.Cos(a) + 1f) * 0.5f;
                    ry = r * (0.55f + (0.75f * t));
                    rx = r * 0.78f;
                }

                pts.Add(new Vector2(Mathf.Cos(a) * rx, Mathf.Sin(a) * ry));
            }

            float th = r * 0.10f;
            cloth.SetTint(1f, 1f, 1f);   // المفصل ضُبط قبل الاستدعاء
            for (int s = -1; s <= 1; s += 2)
            {
                int c0 = cloth.VertexCount;
                cloth.AddVertex(new Vector3(cx, cy, cz + (s * th)), new Vector3(0f, 0f, s),
                    new Vector2(0.5f, 0.5f), new Color(1f, 1f, 1f, 0f));

                for (int i = 0; i <= segments; i++)
                {
                    Vector2 q = pts[i % segments];
                    cloth.AddVertex(new Vector3(cx + (q.x * ca), cy + q.y, cz + (q.x * sa) + (s * th)),
                        new Vector3(0f, 0f, s),
                        new Vector2(0.5f + (q.x / r * 0.5f), 0.5f + (q.y / r * 0.5f)),
                        new Color(1f, 1f, 1f, 0f));
                }

                for (int i = 0; i < segments; i++)
                {
                    if (s > 0)
                    {
                        cloth.AddTriangle(c0, c0 + 1 + i, c0 + 2 + i);
                    }
                    else
                    {
                        cloth.AddTriangle(c0, c0 + 2 + i, c0 + 1 + i);
                    }
                }
            }

            body.SetTint(SteelDark.r, SteelDark.g, SteelDark.b);
            int rim = body.VertexCount;
            for (int i = 0; i <= segments; i++)
            {
                Vector2 q = pts[i % segments];
                Vector3 n = new Vector3(q.x * ca, q.y, q.x * sa).normalized;
                body.AddVertex(new Vector3(cx + (q.x * ca), cy + q.y, cz + (q.x * sa) - th), n,
                    new Vector2((float)i / segments * 2f, 0f), new Color(1f, 1f, 1f, 0f));
                body.AddVertex(new Vector3(cx + (q.x * ca), cy + q.y, cz + (q.x * sa) + th), n,
                    new Vector2((float)i / segments * 2f, 1f), new Color(1f, 1f, 1f, 0f));
            }

            for (int i = 0; i < segments; i++)
            {
                int a = rim + (i * 2);
                body.AddQuad(a, a + 2, a + 3, a + 1);
            }

            body.SetTint(Steel.r, Steel.g, Steel.b);
            body.AddDeformedSphere(new Vector3(cx, cy, cz + (th * 1.2f)),
                new Vector3(r * 0.20f, r * 0.20f, r * 0.16f), 5, 9, 0f, 3u);
        }

        private static void Spear(MeshBuilder body, float gx, float gy, float gz, float len, float tilt)
        {
            float st = Mathf.Sin(tilt);
            float ct = Mathf.Cos(tilt);
            Vector3 a = new Vector3(gx, gy - (len * 0.30f * ct), gz + (len * 0.30f * st));
            Vector3 b = new Vector3(gx, gy + (len * 0.70f * ct), gz - (len * 0.70f * st));

            // شفرة رفيعة جداً تُقرأ خيطاً أبيض على العشب المضيء: تُغلَّظ وتُغمَّق
            body.SetTint(Wood.r * 0.78f, Wood.g * 0.74f, Wood.b * 0.70f);
            body.AddTube(a, b, 0.021f, 0.018f, 6, 1f, 0f, 0f, 0f);

            body.SetTint(Steel.r, Steel.g, Steel.b);
            Vector3 tip = new Vector3(b.x, b.y + (len * 0.16f * ct), b.z - (len * 0.16f * st));
            Vector3 mid = Vector3.Lerp(b, tip, 0.35f);
            body.AddTube(b, mid, 0.019f, 0.036f, 6, 1f, 0f, 0f, 0f);
            body.AddTube(mid, tip, 0.036f, 0.005f, 6, 1f, 0f, 0f, 0f);
        }

        private static void Sword(MeshBuilder body, float gx, float gy, float gz, float len, float tilt, bool gilded)
        {
            float st = Mathf.Sin(tilt);
            float ct = Mathf.Cos(tilt);
            Vector3 dir = new Vector3(0f, ct, -st);
            Vector3 grip = new Vector3(gx, gy - (len * 0.10f), gz);
            Vector3 guard = grip + (dir * len * 0.10f) + new Vector3(0f, len * 0.10f * (1f - ct), 0f);
            guard = new Vector3(gx + (dir.x * len * 0.10f), gy + (dir.y * len * 0.10f), gz + (dir.z * len * 0.10f));

            body.SetTint(LeatherDark.r, LeatherDark.g, LeatherDark.b);
            body.AddTube(grip, guard, 0.016f, 0.015f, 5, 1f, 0f, 0f, 0f);

            Color pommel = gilded ? Gold : SteelDark;
            body.SetTint(pommel.r, pommel.g, pommel.b);
            body.AddDeformedSphere(new Vector3(grip.x, grip.y - 0.012f, grip.z),
                new Vector3(0.024f, 0.024f, 0.024f), 4, 7, 0f, 11u);
            body.AddTube(new Vector3(guard.x - 0.075f, guard.y, guard.z),
                new Vector3(guard.x + 0.075f, guard.y, guard.z), 0.012f, 0.012f, 5, 1f, 0f, 0f, 0f);

            // نصل مسطّح: مقطع رباعي مفلطح لا أنبوب مستدير
            body.SetTint(Steel.r, Steel.g, Steel.b);
            Vector3 tip = guard + (dir * len);
            int bs = body.VertexCount;
            const float W = 0.030f;
            const float T = 0.008f;
            for (int e = 0; e < 2; e++)
            {
                Vector3 c = e == 1 ? tip : guard;
                float w = e == 1 ? W * 0.25f : W;
                float t = e == 1 ? T * 0.5f : T;
                float[,] corners = { { -w, -t }, { w, -t }, { w, t }, { -w, t } };
                for (int i = 0; i < 4; i++)
                {
                    float ox = corners[i, 0];
                    float oz = corners[i, 1];
                    body.AddVertex(new Vector3(c.x + ox, c.y, c.z + oz),
                        new Vector3(ox, 0.1f, oz).normalized,
                        new Vector2((ox + w) / (2f * w), e * 2f), new Color(1f, 1f, 1f, 0f));
                }
            }

            for (int i = 0; i < 4; i++)
            {
                body.AddQuad(bs + i, bs + ((i + 1) % 4), bs + 4 + ((i + 1) % 4), bs + 4 + i);
            }
        }

        private static void Bow(MeshBuilder body, float hx, float hy, float hz)
        {
            body.SetTint(Wood.r, Wood.g, Wood.b);
            const int N = 9;
            Vector3[] pts = new Vector3[N + 1];
            for (int i = 0; i <= N; i++)
            {
                float t = (float)i / N;
                float a = (t - 0.5f) * 2.2f;
                pts[i] = new Vector3(hx + (Mathf.Sin(a) * 0.055f), hy + ((t - 0.5f) * 0.52f),
                    hz - 0.02f + (Mathf.Cos(a) * 0.055f) - 0.055f);
            }

            for (int i = 0; i < N; i++)
            {
                body.AddTube(pts[i], pts[i + 1], 0.010f, 0.010f, 4, 1f, 0f, 0f, 0f);
            }

            body.SetTint(0.86f, 0.84f, 0.78f);
            body.AddTube(pts[0], pts[N], 0.003f, 0.003f, 3, 1f, 0f, 0f, 0f);
        }

        /// <summary>عباءة: شريحة تنسدل من المنكبين وتتّسع نحو الأسفل وتتموّج.</summary>
        private static void Cape(MeshBuilder cloth, float topY, float botY, float topW, float botW, float back, uint seed)
        {
            int start = cloth.VertexCount;
            const int Rings = 7;
            const int Segments = 9;
            System.Random rng = new System.Random((int)seed);
            float wobble = (float)rng.NextDouble() * 6.28f;

            for (int r = 0; r <= Rings; r++)
            {
                float t = (float)r / Rings;
                float y = topY + ((botY - topY) * t);
                float w = topW + ((botW - topW) * t);
                for (int q = 0; q <= Segments; q++)
                {
                    float u = (float)q / Segments;
                    float a = (u - 0.5f) * Mathf.PI * 1.32f;
                    float fold = Mathf.Sin((u * Mathf.PI * 5f) + wobble) * 0.016f * t;
                    Vector3 p = new Vector3(Mathf.Sin(a) * w, y,
                        back + ((1f - Mathf.Cos(a)) * w * 0.55f) + fold);
                    Vector3 n = new Vector3(Mathf.Sin(a) * 0.4f, 0.10f, -Mathf.Cos(a)).normalized;
                    cloth.AddVertex(p, n, new Vector2(u * 1.6f, t * 2.0f), Vector2.zero,
                        new Color(1f, 1f, 1f, 0.22f * t * t));
                }
            }

            int stride = Segments + 1;
            for (int r = 0; r < Rings; r++)
            {
                for (int q = 0; q < Segments; q++)
                {
                    int i = start + (r * stride) + q;
                    cloth.AddQuad(i, i + stride, i + stride + 1, i + 1);
                    cloth.AddQuad(i, i + 1, i + stride + 1, i + stride);   // وجهان: تُرى من الجانبين
                }
            }
        }

        private static void BuildGear(MeshBuilder body, MeshBuilder cloth, Kind kind, uint seed)
        {
            float helmY = HeadY + (HeadR * 0.55f);

            if (kind == Kind.Spearman)
            {
                body.SetLimb(Limb.Head);
                Helm(body, helmY, HeadR, "conical");
                body.SetLimb(Limb.ArmLeftLower);      // الرمح في القبضة فيتأرجح معها
                Spear(body, -0.128f, ShoulderY - 0.31f, 0.10f, 1.42f, 0.055f);
                body.SetLimb(Limb.ArmRightLower);
                cloth.SetLimb(Limb.ArmRightLower);
                Shield(body, cloth, 0.150f, ShoulderY - 0.20f, 0.028f, 0.35f, 0.115f, false);
            }
            else if (kind == Kind.Swordsman)
            {
                body.SetLimb(Limb.Head);
                Helm(body, helmY, HeadR, "kettle");
                body.SetLimb(Limb.ArmRightLower);
                Sword(body, 0.152f, ShoulderY - 0.30f, 0.10f, 0.36f, 0.30f, false);
                body.SetLimb(Limb.ArmLeftLower);
                cloth.SetLimb(Limb.ArmLeftLower);
                Shield(body, cloth, -0.152f, ShoulderY - 0.19f, 0.030f, -0.42f, 0.135f, true);
            }
            else if (kind == Kind.Archer)
            {
                cloth.SetLimb(Limb.Head);
                cloth.SetTint(1f, 1f, 1f);
                cloth.AddDeformedSphere(new Vector3(0f, HeadY + 0.016f, -0.006f),
                    new Vector3(HeadR * 1.12f, HeadR * 1.02f, HeadR * 1.14f), 5, 11, 0.06f, seed + 61u);
                body.SetLimb(Limb.ArmLeftLower);
                Bow(body, -0.136f, ShoulderY - 0.16f, 0.10f);

                body.SetLimb(Limb.Chest);
                body.SetTint(Leather.r, Leather.g, Leather.b);
                body.AddTube(new Vector3(0.075f, ShoulderY - 0.02f, -0.075f),
                    new Vector3(0.115f, ShoulderY - 0.30f, -0.045f), 0.030f, 0.026f, 6, 1f, 0f, 0f, 0f);

                body.SetTint(0.86f, 0.84f, 0.78f);
                for (int i = 0; i < 5; i++)
                {
                    float ox = (i - 2) * 0.011f;
                    body.AddTube(new Vector3(0.075f + ox, ShoulderY + 0.02f, -0.075f),
                        new Vector3(0.075f + ox, ShoulderY + 0.075f, -0.082f), 0.004f, 0.004f, 3, 1f, 0f, 0f, 0f);
                }
            }
            else if (kind == Kind.Hero)
            {
                body.SetLimb(Limb.Head);
                Helm(body, helmY, HeadR * 1.04f, "great");

                // العُرف من القماش فيأخذ لون الراية مع العباءة
                cloth.SetLimb(Limb.Head);
                cloth.SetTint(1f, 1f, 1f);
                float top = helmY + (HeadR * 1.02f);
                for (int i = 0; i < 9; i++)
                {
                    float t = i / 8f;
                    float z = (t - 0.5f) * HeadR * 1.7f;
                    cloth.AddTube(new Vector3(0f, top + (Mathf.Sin(t * Mathf.PI) * HeadR * 0.30f), z),
                        new Vector3(0f, top + (Mathf.Sin(t * Mathf.PI) * HeadR * 0.62f), z - (HeadR * 0.12f)),
                        0.0075f, 0.003f, 4, 1f, 0f, 0.5f, i * 0.4f);
                }

                cloth.SetLimb(Limb.Cape);
                Cape(cloth, ShoulderY + 0.02f, 0.115f, 0.128f, 0.235f, -0.058f, seed + 71u);

                body.SetLimb(Limb.Chest);
                body.SetTint(Gold.r, Gold.g, Gold.b);
                Torso(body, ShoulderY - 0.055f, ShoulderY - 0.030f, 0.106f, 0.130f, 0.080f);
                body.SetLimb(Limb.ArmRightLower);
                Sword(body, 0.160f, ShoulderY - 0.24f, 0.09f, 0.46f, -0.28f, true);
                body.SetLimb(Limb.ArmLeftLower);
                cloth.SetLimb(Limb.ArmLeftLower);
                Shield(body, cloth, -0.160f, ShoulderY - 0.20f, 0.030f, -0.40f, 0.145f, true);
            }
        }
    }
}
