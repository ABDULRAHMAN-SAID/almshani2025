using System.Collections.Generic;
using Dawnkeep.Rendering;
using UnityEngine;

namespace Dawnkeep.Buildings
{
    /// <summary>
    /// عمارة المملكة بهندسة معمارية لا بصناديق: السور جسم واحد مكنوس بمقطع
    /// (قاعدة بارزة، بَطّة مائلة، إفريز، ممشى، ستارة)، والأبراج مخروطة بحلقات
    /// ومَشْط بارز وسقف بأفاريز، والبوّابة فتحة حقيقية بقوس أحجار شعاعية.
    /// النِّسَب معمارية عامّة — لا نسخ من أي لعبة أو صورة مرجعية.
    /// </summary>
    public static class KingdomBuilder
    {
        /// <summary>مجموعة أجزاء مصنّفة بالخامة — كل خامة تصير شبكة واحدة.</summary>
        public sealed class Parts
        {
            public MeshBuilder Stone = new MeshBuilder();
            public MeshBuilder Plaster = new MeshBuilder();
            public MeshBuilder Timber = new MeshBuilder();
            public MeshBuilder Tile = new MeshBuilder();
            public MeshBuilder Thatch = new MeshBuilder();
        }

        public delegate float GroundSampler(float x, float z);

        public struct Layout
        {
            public float Radius;
            public float GateAngle;
            public int Sides;
        }

        public static Layout DefaultLayout(float radius, float gateAngle)
        {
            Layout l;
            l.Radius = radius;
            l.GateAngle = gateAngle;
            l.Sides = 11;
            return l;
        }

        /// <summary>
        /// مقطع السور: قاعدة بارزة ← انحسار ← بَطّة مائلة ← إفريز بارز ← ممشى ← ستارة.
        /// موجب x = خارج الحصن.
        /// </summary>
        private static readonly Vector2[] WallProfile =
        {
            new Vector2(2.30f, 0.00f), new Vector2(2.30f, 0.95f), new Vector2(1.92f, 1.55f), new Vector2(1.74f, 2.15f),
            new Vector2(1.58f, 8.40f), new Vector2(1.94f, 8.90f), new Vector2(2.04f, 9.30f), new Vector2(1.66f, 9.78f),
            new Vector2(1.66f, 11.35f), new Vector2(1.40f, 11.62f),
            new Vector2(0.96f, 11.62f), new Vector2(0.96f, 10.15f),
            new Vector2(-2.12f, 10.15f), new Vector2(-2.48f, 9.72f), new Vector2(-2.06f, 9.34f), new Vector2(-1.56f, 8.60f),
            new Vector2(-1.50f, 2.15f), new Vector2(-1.74f, 1.55f), new Vector2(-2.12f, 0.95f), new Vector2(-2.12f, 0.00f),
        };

        public static Parts BuildCastle(GroundSampler ground, Layout layout, uint seed)
        {
            Parts m = new Parts();
            TexRandom rng = new TexRandom(seed);
            float r = layout.Radius;
            int sides = Mathf.Max(7, layout.Sides);
            float ga = layout.GateAngle;

            // رأس المضلّع الأول عند البوّابة تماماً، والسور يُفتح عندها فتصير فتحة حقيقية
            Vector2[] pts = new Vector2[sides];
            for (int i = 0; i < sides; i++)
            {
                float a = ga + ((float)i / sides * Mathf.PI * 2f);
                float rr = r * (0.88f + (0.22f * Mathf.Sin((a * 2.3f) + 1.1f)) + (rng.Next() * 0.06f));
                pts[i] = new Vector2(Mathf.Cos(a) * rr, Mathf.Sin(a) * rr);
            }

            const float Gap = 9.2f;
            Vector2 dIn = (pts[1] - pts[0]).normalized;
            Vector2 dOut = (pts[sides - 1] - pts[0]).normalized;

            List<Vector2> wallPath = new List<Vector2>(sides + 1);
            wallPath.Add(pts[0] + (dIn * Gap));
            for (int i = 1; i < sides; i++)
            {
                wallPath.Add(pts[i]);
            }

            wallPath.Add(pts[0] + (dOut * Gap));

            BuildWall(m, wallPath, ground);

            for (int i = 1; i < sides; i++)
            {
                if (i % 2 == 0)
                {
                    continue;
                }

                BuildTower(m, pts[i].x, pts[i].y, ground(pts[i].x, pts[i].y), 4.2f + (rng.Next() * 1.2f), 15f + (rng.Next() * 5f));
            }

            BuildGatehouse(m, ground, pts[0], ga, ref rng);
            BuildKeep(m, ground, ref rng);
            BuildCourtyard(m, ground, layout, pts, ref rng);
            return m;
        }

        private static void BuildWall(Parts m, List<Vector2> path, GroundSampler ground)
        {
            // يتبع الأرض: كل عقدة تنزل إلى أوطأ نقطة قريبة كي لا يطفو السور
            System.Func<float, float, float> baseAt = delegate (float x, float z)
            {
                float low = ground(x, z);
                low = Mathf.Min(low, ground(x + 6f, z));
                low = Mathf.Min(low, ground(x - 6f, z));
                low = Mathf.Min(low, ground(x, z + 6f));
                low = Mathf.Min(low, ground(x, z - 6f));
                return low - 3.2f;
            };

            ArchitectureBuilder.SweepProfile(m.Stone, path, WallProfile, baseAt, 0.40f, false, true);

            for (int i = 0; i < path.Count - 1; i++)
            {
                Vector2 a = path[i];
                Vector2 b = path[i + 1];
                Vector2 d = b - a;
                float len = d.magnitude;
                if (len < 1f)
                {
                    continue;
                }

                Vector2 u = d / len;
                Vector2 p = new Vector2(u.y, -u.x);
                int n = Mathf.Max(1, Mathf.RoundToInt(len / 2.9f));

                for (int q = 0; q < n; q++)
                {
                    float t = (q + 0.35f) / n;
                    float w = len / n * 0.52f;
                    Vector2 c = a + (d * t);
                    const float Off = 1.30f;

                    Vector2[] poly =
                    {
                        c + (u * -w * 0.5f) + (p * (Off - 0.36f)),
                        c + (u * w * 0.5f) + (p * (Off - 0.36f)),
                        c + (u * w * 0.5f) + (p * (Off + 0.36f)),
                        c + (u * -w * 0.5f) + (p * (Off + 0.36f)),
                    };

                    ArchitectureBuilder.Prism(m.Stone, poly, baseAt(c.x, c.y) + 11.62f, 1.95f, 0.14f, 0.55f, 0f);
                }
            }
        }

        /// <summary>برج: قاعدة، بَطّة، مَشْط بارز، ستارة بشرفات، سقف قرميدي بأفاريز مرفرفة.</summary>
        private static void BuildTower(Parts m, float x, float z, float groundY, float r, float h)
        {
            float y0 = groundY - 3f;
            Vector2[] profile =
            {
                new Vector2(r * 1.30f, 0.0f), new Vector2(r * 1.30f, 1.1f),
                new Vector2(r * 1.16f, 1.9f), new Vector2(r * 1.10f, 2.6f),
                new Vector2(r * 1.00f, h * 0.55f), new Vector2(r * 0.96f, h * 0.92f),
                new Vector2(r * 1.13f, h * 0.96f), new Vector2(r * 1.20f, h * 1.00f),
                new Vector2(r * 1.16f, h * 1.05f), new Vector2(r * 1.06f, h * 1.07f),
            };

            ArchitectureBuilder.Lathe(m.Stone, new Vector3(x, y0, z), profile, 20, 0.40f, false);

            float topY = y0 + (h * 1.07f);
            float radius = r * 1.06f;
            int merlons = Mathf.Max(9, Mathf.RoundToInt(r * 2.6f));

            for (int i = 0; i < merlons; i++)
            {
                float a = (float)i / merlons * Mathf.PI * 2f;
                float w = radius * 2f * Mathf.PI / merlons * 0.55f;
                float t = radius * 0.30f;
                float ca = Mathf.Cos(a);
                float sa = Mathf.Sin(a);
                Vector2 tangent = new Vector2(-sa, ca);
                Vector2 outward = new Vector2(ca, sa);
                Vector2 c = new Vector2(x + (ca * (radius - (t * 0.1f))), z + (sa * (radius - (t * 0.1f))));

                Vector2[] poly =
                {
                    c + (tangent * -w * 0.5f) + (outward * -t * 0.5f),
                    c + (tangent * w * 0.5f) + (outward * -t * 0.5f),
                    c + (tangent * w * 0.5f) + (outward * t * 0.5f),
                    c + (tangent * -w * 0.5f) + (outward * t * 0.5f),
                };

                ArchitectureBuilder.Prism(m.Stone, poly, topY, 2.1f, 0.16f, 0.55f, 0f);
            }

            Vector2[] parapet =
            {
                new Vector2(radius, 0f), new Vector2(radius, 0.55f), new Vector2(radius * 0.94f, 0.75f),
            };

            ArchitectureBuilder.Lathe(m.Stone, new Vector3(x, topY, z), parapet, 20, 0.5f, false);

            float ry = topY + 2.1f;
            Vector2[] roof =
            {
                new Vector2(radius * 1.02f, -0.35f), new Vector2(radius * 1.22f, -0.05f),
                new Vector2(radius * 1.10f, 0.35f), new Vector2(radius * 0.72f, r * 0.85f),
                new Vector2(0.06f, r * 1.85f),
            };

            ArchitectureBuilder.Lathe(m.Tile, new Vector3(x, ry, z), roof, 20, 0.55f, false);

            Vector2[] finial = { new Vector2(0.30f, 0f), new Vector2(0.16f, 0.5f), new Vector2(0.05f, 0.9f) };
            ArchitectureBuilder.Lathe(m.Stone, new Vector3(x, ry + (r * 1.85f), z), finial, 8, 0.6f, true);
        }

        private static void BuildGatehouse(Parts m, GroundSampler ground, Vector2 gate, float ga, ref TexRandom rng)
        {
            float gx = gate.x;
            float gz = gate.y;
            float gy = ground(gx, gz) - 3.2f;
            Vector2 outward = new Vector2(Mathf.Cos(ga), Mathf.Sin(ga));
            Vector2 across = new Vector2(-outward.y, outward.x);

            const float AR = 3.6f;
            const float Pier = 2.6f;
            const float Depth = 7.8f;
            const float Spring = 8.4f;
            const float Ring = 1.35f;
            float w = (AR * 2f) + (Pier * 2f);
            float ro = AR + Ring;
            float springY = gy + Spring;
            float topY = springY + ro + 5.8f;

            for (int s = -1; s <= 1; s += 2)
            {
                Vector2 tp = new Vector2(gx, gz) + (across * s * 8.6f);
                BuildTower(m, tp.x, tp.y, ground(tp.x, tp.y), 4.3f, 21f);
            }

            for (int s = -1; s <= 1; s += 2)
            {
                Vector2 c = new Vector2(gx, gz) + (across * s * (AR + (Pier * 0.5f)));
                Vector2[] poly =
                {
                    c + (across * -Pier * 0.5f) + (outward * -Depth * 0.5f),
                    c + (across * Pier * 0.5f) + (outward * -Depth * 0.5f),
                    c + (across * Pier * 0.5f) + (outward * Depth * 0.5f),
                    c + (across * -Pier * 0.5f) + (outward * Depth * 0.5f),
                };

                ArchitectureBuilder.Prism(m.Stone, poly, gy, Spring, 0.28f, 0.42f, 0f);
            }

            ArchitectureBuilder.VoussoirArch(m.Stone, new Vector3(gx, springY, gz),
                ga + (Mathf.PI * 0.5f), AR, Depth, Ring, 15, 0.42f, 0.10f);

            // حشوة الكَتِفين وما فوق القوس: مداميك أفقية تلتفّ حول القوس
            const float Dh = 0.62f;
            for (float y = springY; y < topY - 0.01f; y += Dh)
            {
                float ym = Mathf.Min(y + Dh, topY);
                float mid = ((y + ym) * 0.5f) - springY;
                float half = mid < ro ? Mathf.Sqrt(Mathf.Max(0f, (ro * ro) - (mid * mid))) : 0f;

                int spans = half > 0.05f ? 2 : 1;
                for (int sp = 0; sp < spans; sp++)
                {
                    float a0 = spans == 1 ? -w * 0.5f : (sp == 0 ? -w * 0.5f : half);
                    float a1 = spans == 1 ? w * 0.5f : (sp == 0 ? -half : w * 0.5f);
                    if (a1 - a0 < 0.05f)
                    {
                        continue;
                    }

                    Vector2[] poly =
                    {
                        new Vector2(gx, gz) + (across * a0) + (outward * -Depth * 0.5f),
                        new Vector2(gx, gz) + (across * a1) + (outward * -Depth * 0.5f),
                        new Vector2(gx, gz) + (across * a1) + (outward * Depth * 0.5f),
                        new Vector2(gx, gz) + (across * a0) + (outward * Depth * 0.5f),
                    };

                    ArchitectureBuilder.Prism(m.Stone, poly, y, ym - y, 0f, 0.42f, a0 + (w * 0.5f));
                }
            }

            // أكتاف المَشيقولة ثم ستارة معلّقة بشرفات
            for (int face = -1; face <= 1; face += 2)
            {
                int n = Mathf.RoundToInt(w / 1.6f);
                for (int i = 0; i < n; i++)
                {
                    float a = (-w * 0.5f) + ((i + 0.5f) * w / n);
                    for (int k = 0; k < 3; k++)
                    {
                        float outw = 0.55f + (k * 0.42f);
                        float wdt = 1.0f - (k * 0.12f);
                        Vector2[] poly =
                        {
                            new Vector2(gx, gz) + (across * (a - (wdt * 0.5f))) + (outward * face * ((Depth * 0.5f) + outw - 0.42f)),
                            new Vector2(gx, gz) + (across * (a + (wdt * 0.5f))) + (outward * face * ((Depth * 0.5f) + outw - 0.42f)),
                            new Vector2(gx, gz) + (across * (a + (wdt * 0.5f))) + (outward * face * ((Depth * 0.5f) + outw)),
                            new Vector2(gx, gz) + (across * (a - (wdt * 0.5f))) + (outward * face * ((Depth * 0.5f) + outw)),
                        };

                        ArchitectureBuilder.Prism(m.Stone, poly, topY - 1.2f + (k * 0.40f), 0.44f, 0.06f, 0.55f, 0f);
                    }
                }
            }

            List<Vector2> parapetPath = new List<Vector2>
            {
                new Vector2(gx, gz) + (across * -w * 0.5f),
                new Vector2(gx, gz) + (across * w * 0.5f),
            };

            Vector2[] parapetProfile =
            {
                new Vector2((Depth * 0.5f) + 1.5f, 0f), new Vector2((Depth * 0.5f) + 1.5f, 2.4f),
                new Vector2((Depth * 0.5f) + 1.2f, 2.7f),
                new Vector2(-(Depth * 0.5f) - 1.2f, 2.7f), new Vector2(-(Depth * 0.5f) - 1.5f, 2.4f),
                new Vector2(-(Depth * 0.5f) - 1.5f, 0f),
            };

            ArchitectureBuilder.SweepProfile(m.Stone, parapetPath, parapetProfile,
                delegate (float x, float z) { return topY; }, 0.45f, false, true);

            int mn = Mathf.RoundToInt(w / 2.9f);
            for (int i = 0; i < mn; i++)
            {
                float a = (-w * 0.5f) + ((i + 0.4f) * w / mn);
                float w2 = w / mn * 0.5f;
                for (int face = -1; face <= 1; face += 2)
                {
                    Vector2[] poly =
                    {
                        new Vector2(gx, gz) + (across * (a - (w2 * 0.5f))) + (outward * face * ((Depth * 0.5f) + 0.85f)),
                        new Vector2(gx, gz) + (across * (a + (w2 * 0.5f))) + (outward * face * ((Depth * 0.5f) + 0.85f)),
                        new Vector2(gx, gz) + (across * (a + (w2 * 0.5f))) + (outward * face * ((Depth * 0.5f) + 1.5f)),
                        new Vector2(gx, gz) + (across * (a - (w2 * 0.5f))) + (outward * face * ((Depth * 0.5f) + 1.5f)),
                    };

                    ArchitectureBuilder.Prism(m.Stone, poly, topY + 2.7f, 2.0f, 0.14f, 0.55f, 0f);
                }
            }

            // باب خشبي مدعّم
            float rot = ga + (Mathf.PI * 0.5f);
            m.Timber.AddBox(new Vector3(gx, gy + 4.0f, gz), new Vector3(AR * 2f, 8.0f, 0.5f), rot, 0.45f);
            for (int i = 0; i < 5; i++)
            {
                Vector2 p = new Vector2(gx, gz) + (across * (i - 2) * 1.5f);
                m.Timber.AddBox(new Vector3(p.x, gy + 4.0f, p.y), new Vector3(0.34f, 8.0f, 0.72f), rot, 0.6f);
            }

            m.Timber.AddBox(new Vector3(gx, gy + 1.4f, gz), new Vector3(AR * 2f, 0.55f, 0.75f), rot, 0.6f);
            m.Timber.AddBox(new Vector3(gx, gy + 6.4f, gz), new Vector3(AR * 2f, 0.55f, 0.75f), rot, 0.6f);
        }

        private static void BuildKeep(Parts m, GroundSampler ground, ref TexRandom rng)
        {
            float ky = ground(0f, 0f) - 3f;
            const float KW = 19f;
            const float KD = 15f;
            const float KH = 22f;
            const float Rot = 0.35f;
            float co = Mathf.Cos(Rot);
            float si = Mathf.Sin(Rot);

            Vector2[] poly = new Vector2[4];
            float[,] corners = { { -KW * 0.5f, -KD * 0.5f }, { KW * 0.5f, -KD * 0.5f }, { KW * 0.5f, KD * 0.5f }, { -KW * 0.5f, KD * 0.5f } };
            for (int i = 0; i < 4; i++)
            {
                float lx = corners[i, 0];
                float lz = corners[i, 1];
                poly[i] = new Vector2((lx * co) - (lz * si), (lx * si) + (lz * co));
            }

            ArchitectureBuilder.Prism(m.Stone, poly, ky, KH, 0.55f, 0.42f, 0f);

            Vector2[] band = new Vector2[4];
            for (int i = 0; i < 4; i++)
            {
                band[i] = poly[i] + (poly[i].normalized * 0.45f);
            }

            ArchitectureBuilder.Prism(m.Stone, band, ky + (KH * 0.52f), 0.55f, 0.16f, 0.5f, 0f);

            Vector2[] outer = new Vector2[4];
            for (int i = 0; i < 4; i++)
            {
                outer[i] = poly[i] + (poly[i].normalized * 1.45f);
            }

            for (int e = 0; e < 4; e++)
            {
                Vector2 a = poly[e];
                Vector2 b = poly[(e + 1) % 4];
                float len = Vector2.Distance(a, b);
                int n = Mathf.Max(2, Mathf.RoundToInt(len / 1.7f));
                Vector2 u = (b - a) / len;
                Vector2 p = new Vector2(u.y, -u.x);

                for (int i = 0; i < n; i++)
                {
                    Vector2 c = a + ((b - a) * ((i + 0.5f) / n));
                    for (int k = 0; k < 3; k++)
                    {
                        float outw = 0.35f + (k * 0.40f);
                        float wdt = 1.0f - (k * 0.14f);
                        Vector2[] br =
                        {
                            c + (u * -wdt * 0.5f) + (p * (outw - 0.40f)),
                            c + (u * wdt * 0.5f) + (p * (outw - 0.40f)),
                            c + (u * wdt * 0.5f) + (p * outw),
                            c + (u * -wdt * 0.5f) + (p * outw),
                        };

                        ArchitectureBuilder.Prism(m.Stone, br, ky + KH - 1.3f + (k * 0.40f), 0.42f, 0.06f, 0.55f, 0f);
                    }
                }
            }

            Vector2[] keepParapet =
            {
                new Vector2(0.30f, 0f), new Vector2(0.30f, 2.5f), new Vector2(0.05f, 2.8f),
                new Vector2(-0.65f, 2.8f), new Vector2(-0.65f, 0f),
            };

            ArchitectureBuilder.SweepProfile(m.Stone, outer, keepParapet,
                delegate (float x, float z) { return ky + KH; }, 0.45f, true, false);

            for (int e = 0; e < 4; e++)
            {
                Vector2 a = outer[e];
                Vector2 b = outer[(e + 1) % 4];
                float len = Vector2.Distance(a, b);
                int n = Mathf.Max(2, Mathf.RoundToInt(len / 2.7f));
                Vector2 u = (b - a) / len;
                Vector2 p = new Vector2(u.y, -u.x);

                for (int i = 0; i < n; i++)
                {
                    Vector2 c = a + ((b - a) * ((i + 0.35f) / n));
                    float w2 = len / n * 0.52f;
                    Vector2[] mer =
                    {
                        c + (u * -w2 * 0.5f) + (p * -0.30f),
                        c + (u * w2 * 0.5f) + (p * -0.30f),
                        c + (u * w2 * 0.5f) + (p * 0.30f),
                        c + (u * -w2 * 0.5f) + (p * 0.30f),
                    };

                    ArchitectureBuilder.Prism(m.Stone, mer, ky + KH + 2.8f, 1.9f, 0.12f, 0.55f, 0f);
                }
            }

            Vector3 eave = new Vector3(0f, ky + KH + 2.4f, 0f);
            m.Tile.AddGableRoof(eave, KW - 3.0f, KD - 3.0f, 9.5f, Rot, 0.52f, 0.85f);
            m.Stone.AddGableEnd(eave, KW - 3.0f, 9.5f, Rot, (KD - 3.0f) * 0.5f, 0.42f);
            m.Stone.AddGableEnd(eave, KW - 3.0f, 9.5f, Rot, -(KD - 3.0f) * 0.5f, 0.42f);

            for (int i = 0; i < 4; i++)
            {
                BuildTower(m, poly[i].x, poly[i].y, ground(poly[i].x, poly[i].y), 3.1f, KH + 3f);
            }

            for (int face = -1; face <= 1; face += 2)
            {
                for (int i = 0; i < 3; i++)
                {
                    for (int lvl = 0; lvl < 2; lvl++)
                    {
                        float lx = (-KW * 0.28f) + (i * KW * 0.28f);
                        float lz = face * ((KD * 0.5f) + 0.06f);
                        Vector3 p = new Vector3((lx * co) - (lz * si), 0f, (lx * si) + (lz * co));
                        ArchitectureBuilder.VoussoirArch(m.Stone, new Vector3(p.x, ky + 6.4f + (lvl * 7.2f), p.z),
                            Rot + (face > 0 ? 0f : Mathf.PI), 0.72f, 0.6f, 0.34f, 7, 0.55f, 0f);
                        m.Timber.AddBox(new Vector3(p.x, ky + 5.2f + (lvl * 7.2f), p.z),
                            new Vector3(1.30f, 2.4f, 0.22f), Rot, 0.7f);
                    }
                }
            }
        }

        private static void BuildCourtyard(Parts m, GroundSampler ground, Layout layout, Vector2[] pts, ref TexRandom rng)
        {
            float ga = layout.GateAngle;
            float r = layout.Radius;
            Vector2 gate = pts[0];

            const int Steps = 16;
            for (int i = 0; i < Steps; i++)
            {
                float t = (float)i / (Steps - 1);
                Vector2 p = gate * (1f - t);
                m.Stone.AddBox(new Vector3(p.x, ground(p.x, p.y) + 0.10f, p.y),
                    new Vector3(7.5f, 0.7f, r * 2f / Steps * 1.2f), ga + (Mathf.PI * 0.5f), 0.45f);
            }

            for (int i = 0; i < 2; i++)
            {
                float a = ga + (i == 0 ? -2.2f : 2.2f);
                float sx = Mathf.Cos(a) * r * 0.86f;
                float sz = Mathf.Sin(a) * r * 0.86f;
                float sy = ground(sx, sz);

                for (int q = 0; q < 9; q++)
                {
                    float t = (float)q / 9f;
                    m.Stone.AddBox(
                        new Vector3(sx + (Mathf.Cos(a) * t * 7f), sy + (q * 1.2f) + 0.6f, sz + (Mathf.Sin(a) * t * 7f)),
                        new Vector3(3.2f, 1.3f, 7f / 9f * 1.4f), a + (Mathf.PI * 0.5f), 0.5f);
                }
            }

            float wx = Mathf.Cos(ga + 2.1f) * r * 0.34f;
            float wz = Mathf.Sin(ga + 2.1f) * r * 0.34f;
            float wy = ground(wx, wz);
            Vector2[] wellProfile = { new Vector2(2.1f, 0f), new Vector2(2.2f, 0.4f), new Vector2(1.95f, 1.5f) };
            ArchitectureBuilder.Lathe(m.Stone, new Vector3(wx, wy - 0.4f, wz), wellProfile, 14, 0.55f, false);
            for (int s = -1; s <= 1; s += 2)
            {
                m.Timber.AddBox(new Vector3(wx + (s * 1.7f), wy + 1.9f, wz), new Vector3(0.28f, 2.6f, 0.28f), 0f, 0.6f);
            }

            m.Timber.AddBox(new Vector3(wx, wy + 3.3f, wz), new Vector3(4.4f, 0.35f, 2.6f), 0f, 0.4f);
            m.Tile.AddGableRoof(new Vector3(wx, wy + 3.3f, wz), 4.4f, 2.8f, 1.0f, 0f, 0.6f, 0.25f);

            for (int i = 0; i < 14; i++)
            {
                float a = rng.Next() * Mathf.PI * 2f;
                float rr = r * (0.25f + (rng.Next() * 0.5f));
                float bx = Mathf.Cos(a) * rr;
                float bz = Mathf.Sin(a) * rr;
                float by = ground(bx, bz);

                if (rng.Next() < 0.5f)
                {
                    Vector2[] barrel = { new Vector2(0.48f, 0f), new Vector2(0.58f, 0.55f), new Vector2(0.46f, 1.15f) };
                    ArchitectureBuilder.Lathe(m.Timber, new Vector3(bx, by, bz), barrel, 10, 0.7f, true);
                }
                else
                {
                    m.Timber.AddBox(new Vector3(bx, by + 0.45f, bz), new Vector3(1.1f, 0.9f, 0.9f), rng.Next() * 3.14f, 0.7f);
                }
            }

            for (int i = 1; i < pts.Length; i += 2)
            {
                float py = ground(pts[i].x, pts[i].y);
                m.Timber.AddBox(new Vector3(pts[i].x, py + 24f, pts[i].y), new Vector3(0.18f, 8f, 0.18f), 0f, 0.8f);
                m.Thatch.AddBox(new Vector3(pts[i].x + 1.3f, py + 26.5f, pts[i].y), new Vector3(2.6f, 2.0f, 0.10f), 0f, 0.6f);
            }

            for (int i = 0; i < 5; i++)
            {
                float a = ga + (Mathf.PI * 0.5f) + (i * 0.72f);
                float rr = r * (0.50f + (rng.Next() * 0.14f));
                float hx = Mathf.Cos(a) * rr;
                float hz = Mathf.Sin(a) * rr;
                BuildHouse(m, hx, hz, ground(hx, hz), a + (Mathf.PI * 0.5f), ref rng, 12f, 8.5f, false);
            }
        }
        /// <summary>
        /// بيت: قاعدة حجرية، طابق مجصّص بإطار خشبي حقيقي (قوائم وعوارض ومساند مائلة)،
        /// سقف قرميد أو قشّ، مدخنة، باب بعتبة، ونوافذ بإطار.
        /// </summary>
        public static void BuildHouse(Parts m, float x, float z, float groundY, float rot, ref TexRandom rng,
            float baseWidth, float baseDepth, bool allowThatch)
        {
            float w = baseWidth * (0.85f + (rng.Next() * 0.35f));
            float d = baseDepth * (0.85f + (rng.Next() * 0.35f));
            float stoneH = 1.5f + (rng.Next() * 1.1f);
            float wallH = 3.4f + (rng.Next() * 1.4f);
            float roofH = 2.4f + (rng.Next() * 1.3f);
            float y = groundY - 0.5f;

            float co = Mathf.Cos(rot);
            float si = Mathf.Sin(rot);

            m.Stone.AddBox(new Vector3(x, y + (stoneH * 0.5f), z), new Vector3(w + 0.5f, stoneH, d + 0.5f), rot, 0.42f);
            m.Plaster.AddBox(new Vector3(x, y + stoneH + (wallH * 0.5f), z), new Vector3(w, wallH, d), rot, 0.42f);

            const float Beam = 0.20f;
            const float Jut = 0.05f;

            for (int f = 0; f < 2; f++)
            {
                float lz = (f == 0 ? 1f : -1f) * ((d * 0.5f) + Jut);
                int posts = Mathf.Max(3, Mathf.RoundToInt(w / 1.7f));

                for (int i = 0; i <= posts; i++)
                {
                    float lx = (-w * 0.5f) + (w * i / posts);
                    m.Timber.AddBox(Local(x, z, lx, lz, co, si, y + stoneH + (wallH * 0.5f)),
                        new Vector3(Beam, wallH, Beam * 0.7f), rot, 0.6f);
                }

                float[] rails = { Beam * 0.5f, wallH * 0.55f, wallH - (Beam * 0.5f) };
                for (int i = 0; i < rails.Length; i++)
                {
                    m.Timber.AddBox(Local(x, z, 0f, lz, co, si, y + stoneH + rails[i]),
                        new Vector3(w, Beam, Beam * 0.7f), rot, 0.6f);
                }

                for (int i = 0; i < posts; i += 2)
                {
                    float cellW = w / posts;
                    float cellH = wallH * 0.45f;
                    float cx2 = (-w * 0.5f) + (cellW * (i + 0.5f));
                    float cy2 = wallH * 0.775f;
                    float len = Mathf.Sqrt((cellW * cellW) + (cellH * cellH)) * 0.94f;
                    float ang = Mathf.Atan2(cellH, cellW) * ((i % 4) != 0 ? 1f : -1f);

                    const int Seg = 7;
                    for (int q = 0; q < Seg; q++)
                    {
                        float t = ((q + 0.5f) / Seg) - 0.5f;
                        float ox = Mathf.Cos(ang) * len * t;
                        float oy = Mathf.Sin(ang) * len * t;
                        m.Timber.AddBox(Local(x, z, cx2 + ox, lz, co, si, y + stoneH + cy2 + oy),
                            new Vector3(len / Seg * 1.25f, Beam, Beam * 0.7f), rot, 0.6f);
                    }
                }
            }

            for (int s = -1; s <= 1; s += 2)
            {
                float lx = s * ((w * 0.5f) + Jut);
                for (int i = 0; i <= 2; i++)
                {
                    float lz = (-d * 0.5f) + (d * i / 2f);
                    m.Timber.AddBox(Local(x, z, lx, lz, co, si, y + stoneH + (wallH * 0.5f)),
                        new Vector3(Beam * 0.7f, wallH, Beam), rot, 0.6f);
                }

                m.Timber.AddBox(Local(x, z, lx, 0f, co, si, y + stoneH + (Beam * 0.5f)),
                    new Vector3(Beam * 0.7f, Beam, d), rot, 0.6f);
                m.Timber.AddBox(Local(x, z, lx, 0f, co, si, y + stoneH + wallH - (Beam * 0.5f)),
                    new Vector3(Beam * 0.7f, Beam, d), rot, 0.6f);
            }

            float ry = y + stoneH + wallH;
            MeshBuilder roof = (allowThatch && rng.Next() < 0.45f) ? m.Thatch : m.Tile;
            roof.AddGableRoof(new Vector3(x, ry, z), w, d, roofH, rot, 0.52f, 0.55f);
            m.Plaster.AddGableEnd(new Vector3(x, ry, z), w, roofH, rot, d * 0.5f, 0.42f);
            m.Plaster.AddGableEnd(new Vector3(x, ry, z), w, roofH, rot, -d * 0.5f, 0.42f);

            m.Stone.AddBox(Local(x, z, w * 0.28f, d * 0.12f, co, si, ry + (roofH * 0.55f)),
                new Vector3(0.9f, roofH * 1.5f, 0.9f), rot, 0.55f);

            Vector3 door = Local(x, z, 0f, (d * 0.5f) + 0.12f, co, si, y + stoneH + 0.95f);
            m.Timber.AddBox(door, new Vector3(1.05f, 1.95f, 0.14f), rot, 0.6f);
            m.Stone.AddBox(Local(x, z, 0f, (d * 0.5f) + 0.12f, co, si, y + stoneH + 0.06f),
                new Vector3(1.7f, 0.28f, 0.9f), rot, 0.5f);

            for (int s = -1; s <= 1; s += 2)
            {
                for (int f = 0; f < 2; f++)
                {
                    float lz = (f == 0 ? 1f : -1f) * ((d * 0.5f) + 0.12f);
                    Vector3 win = Local(x, z, s * w * 0.28f, lz, co, si, y + stoneH + (wallH * 0.60f));
                    m.Timber.AddBox(win, new Vector3(0.72f, 0.62f, 0.12f), rot, 0.7f);
                    m.Timber.AddBox(win, new Vector3(0.62f, 0.10f, 0.16f), rot, 0.7f);
                    m.Timber.AddBox(win, new Vector3(0.10f, 0.52f, 0.16f), rot, 0.7f);
                }
            }
        }

        private static Vector3 Local(float x, float z, float lx, float lz, float co, float si, float y)
        {
            return new Vector3(x + (lx * co) - (lz * si), y, z + (lx * si) + (lz * co));
        }
    }
}
