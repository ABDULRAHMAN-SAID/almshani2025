using System.Collections.Generic;
using Dawnkeep.Rendering;
using UnityEngine;

namespace Dawnkeep.Buildings
{
    /// <summary>
    /// عمارة المملكة مولّدة بالكود: سور بشرفات ودعامات، أبراج بأسقف مخروطية،
    /// بوّابة بقوس ومَشيقولة، حصن بأبراج ركنية، وبيوت بإطار خشبي وجصّ وقرميد.
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

        /// <summary>ارتفاعات وأبعاد المجمّع — كلّها بالأمتار.</summary>
        public struct Layout
        {
            public float Radius;
            public float GateAngle;
            public int Sides;
            public float WallHeight;
            public float WallThickness;
        }

        public static Layout DefaultLayout(float radius, float gateAngle)
        {
            Layout l;
            l.Radius = radius;
            l.GateAngle = gateAngle;
            l.Sides = 11;
            l.WallHeight = 11f;
            l.WallThickness = 3.4f;
            return l;
        }

        public static Parts BuildCastle(GroundSampler ground, Layout layout, uint seed)
        {
            Parts m = new Parts();
            TexRandom rng = new TexRandom(seed);
            float r = layout.Radius;
            int sides = Mathf.Max(5, layout.Sides);

            // مضلّع السور: غير منتظم كما تُبنى الحصون على تضاريس
            List<Vector2> pts = new List<Vector2>(sides);
            for (int i = 0; i < sides; i++)
            {
                float a = (float)i / sides * Mathf.PI * 2f;
                float rr = r * (0.88f + (0.22f * Mathf.Sin((a * 2.3f) + 1.1f)) + (rng.Next() * 0.06f));
                pts.Add(new Vector2(Mathf.Cos(a) * rr, Mathf.Sin(a) * rr));
            }

            BuildWall(m, pts, ground, layout.WallHeight, layout.WallThickness);

            for (int i = 0; i < sides; i += 2)
            {
                Vector2 p = pts[i];
                BuildTower(m, p.x, p.y, ground(p.x, p.y), 4.2f + (rng.Next() * 1.2f), 15f + (rng.Next() * 5f));
            }

            BuildGatehouse(m, ground, layout);
            BuildKeep(m, ground, rng);
            BuildCourtyard(m, ground, layout, pts, ref rng);

            return m;
        }

        private static void BuildWall(Parts m, List<Vector2> pts, GroundSampler ground, float height, float thick)
        {
            for (int i = 0; i < pts.Count; i++)
            {
                Vector2 a = pts[i];
                Vector2 b = pts[(i + 1) % pts.Count];
                Vector2 delta = b - a;
                float len = delta.magnitude;
                if (len < 0.5f)
                {
                    continue;
                }

                float rot = Mathf.Atan2(delta.y, delta.x);
                int segs = Mathf.Max(1, Mathf.RoundToInt(len / 6f));

                for (int q = 0; q < segs; q++)
                {
                    float t0 = (float)q / segs;
                    float t1 = (float)(q + 1) / segs;
                    float tm = (t0 + t1) * 0.5f;
                    Vector2 mid = a + (delta * tm);
                    float slen = len / segs;

                    float gy = Mathf.Min(
                        ground(a.x + (delta.x * t0), a.y + (delta.y * t0)),
                        ground(a.x + (delta.x * t1), a.y + (delta.y * t1)));
                    float bse = gy - 4f;

                    // قاعدة أعرض ثم جسم ثم إفريز — لا لوح مسطّح واحد
                    m.Stone.AddBox(new Vector3(mid.x, bse + 1.4f, mid.y), new Vector3(slen * 1.02f, 2.8f, thick * 1.28f), rot, 0.42f);
                    m.Stone.AddBox(new Vector3(mid.x, bse + 2.8f + ((height - 2.8f) * 0.5f), mid.y),
                        new Vector3(slen * 1.02f, height - 2.8f, thick), rot, 0.42f);
                    m.Stone.AddBox(new Vector3(mid.x, bse + height - 1.1f, mid.y),
                        new Vector3(slen * 1.02f, 0.42f, thick * 1.14f), rot, 0.5f);
                    m.Stone.AddBox(new Vector3(mid.x, bse + height + 0.35f, mid.y),
                        new Vector3(slen * 1.02f, 0.7f, thick * 1.30f), rot, 0.5f);

                    if (q % 2 == 0)
                    {
                        m.Stone.AddBox(
                            new Vector3(mid.x - (Mathf.Sin(rot) * thick * 0.62f), bse + ((height - 1f) * 0.5f),
                                mid.y + (Mathf.Cos(rot) * thick * 0.62f)),
                            new Vector3(1.9f, height - 1f, thick * 0.55f), rot, 0.42f);
                    }

                    int mer = Mathf.Max(1, Mathf.RoundToInt(slen / 3.0f));
                    for (int k = 0; k < mer; k++)
                    {
                        float tt = (k + 0.5f) / mer;
                        Vector2 p = a + (delta * (t0 + ((t1 - t0) * tt)));
                        float off = thick * 0.42f;
                        m.Stone.AddBox(
                            new Vector3(p.x + (Mathf.Sin(rot) * off), bse + height + 1.6f, p.y - (Mathf.Cos(rot) * off)),
                            new Vector3(slen / mer * 0.55f, 1.9f, thick * 0.34f), rot, 0.55f);
                    }
                }
            }
        }

        private static void BuildTower(Parts m, float x, float z, float groundY, float radius, float height)
        {
            m.Stone.AddCylinder(new Vector3(x, groundY - 2f, z), radius * 1.12f, radius, height, 14, 0.40f, false);

            int merlons = Mathf.Max(8, Mathf.RoundToInt(radius * 2.2f));
            for (int i = 0; i < merlons; i++)
            {
                float a = (float)i / merlons * Mathf.PI * 2f;
                m.Stone.AddBox(
                    new Vector3(x + (Mathf.Cos(a) * radius * 0.94f), groundY - 2f + height + 0.9f, z + (Mathf.Sin(a) * radius * 0.94f)),
                    new Vector3(radius * 0.42f, 1.8f, radius * 0.30f), a, 0.55f);
            }

            m.Stone.AddCylinder(new Vector3(x, groundY - 2f + height, z), radius * 1.06f, radius * 1.06f, 0.55f, 14, 0.5f, true);
            m.Tile.AddCylinder(new Vector3(x, groundY - 2f + height + 2.0f, z), radius * 1.10f, 0.10f, radius * 1.5f, 14, 0.55f, false);
        }

        private static void BuildGatehouse(Parts m, GroundSampler ground, Layout layout)
        {
            float ga = layout.GateAngle;
            float gx = Mathf.Cos(ga) * layout.Radius * 0.98f;
            float gz = Mathf.Sin(ga) * layout.Radius * 0.98f;
            float gy = ground(gx, gz);
            float rot = ga + (Mathf.PI * 0.5f);

            for (int s = -1; s <= 1; s += 2)
            {
                float px = gx - (Mathf.Sin(ga) * s * 5.6f);
                float pz = gz + (Mathf.Cos(ga) * s * 5.6f);
                BuildTower(m, px, pz, ground(px, pz), 4.0f, 19f);
            }

            m.Stone.AddBox(new Vector3(gx, gy - 4f + 8.5f, gz), new Vector3(13.5f, 17f, 6.5f), rot, 0.42f);
            m.Stone.AddBox(new Vector3(gx, gy - 4f + 17.4f, gz), new Vector3(15.2f, 1.2f, 8.2f), rot, 0.5f);

            for (int i = 0; i < 6; i++)
            {
                float t = ((i + 0.5f) / 6f) - 0.5f;
                m.Stone.AddBox(
                    new Vector3(gx - (Mathf.Sin(ga) * t * 13.0f), gy - 4f + 19.0f, gz + (Mathf.Cos(ga) * t * 13.0f)),
                    new Vector3(1.5f, 1.9f, 8.0f), rot, 0.55f);
            }

            // فتحة القوس: أعمدة بارتفاع متدرّج تحفر القوس في الكتلة
            for (int i = 0; i < 9; i++)
            {
                float t = (i + 0.5f) / 9f;
                float h2 = Mathf.Sin(Mathf.PI * t) * 4.6f;
                m.Stone.AddBox(
                    new Vector3(gx - (Mathf.Sin(ga) * (t - 0.5f) * 9.6f), gy - 4f + 9.0f + (h2 * 0.5f) + 2.0f,
                        gz + (Mathf.Cos(ga) * (t - 0.5f) * 9.6f)),
                    new Vector3(1.1f, 12.0f - h2, 6.8f), rot, 0.42f);
            }

            // باب خشبي مدعّم
            m.Timber.AddBox(new Vector3(gx, gy + 3.4f, gz), new Vector3(8.4f, 6.8f, 0.5f), rot, 0.45f);
            for (int i = 0; i < 5; i++)
            {
                m.Timber.AddBox(
                    new Vector3(gx - (Mathf.Sin(ga) * (i - 2) * 1.6f), gy + 3.4f, gz + (Mathf.Cos(ga) * (i - 2) * 1.6f)),
                    new Vector3(0.34f, 6.8f, 0.72f), rot, 0.6f);
            }

            m.Timber.AddBox(new Vector3(gx, gy + 1.2f, gz), new Vector3(8.4f, 0.55f, 0.75f), rot, 0.6f);
            m.Timber.AddBox(new Vector3(gx, gy + 5.6f, gz), new Vector3(8.4f, 0.55f, 0.75f), rot, 0.6f);
        }

        private static void BuildKeep(Parts m, GroundSampler ground, TexRandom rng)
        {
            float ky = ground(0f, 0f);
            const float KW = 19f;
            const float KD = 15f;
            const float KH = 21f;
            const float Rot = 0.35f;
            float co = Mathf.Cos(Rot);
            float si = Mathf.Sin(Rot);

            m.Stone.AddBox(new Vector3(0f, ky - 3f + (KH * 0.5f), 0f), new Vector3(KW, KH, KD), Rot, 0.42f);
            m.Stone.AddBox(new Vector3(0f, ky - 3f + KH + 0.55f, 0f), new Vector3(KW + 1.6f, 1.1f, KD + 1.6f), Rot, 0.5f);

            int mx = Mathf.RoundToInt((KW + 1.6f) / 2.6f);
            int mz = Mathf.RoundToInt((KD + 1.6f) / 2.6f);

            for (int i = 0; i < mx; i++)
            {
                float lx = (-(KW + 1.6f) * 0.5f) + ((i + 0.5f) * (KW + 1.6f) / mx);
                for (int s = -1; s <= 1; s += 2)
                {
                    float lz = s * (((KD + 1.6f) * 0.5f) - 0.5f);
                    m.Stone.AddBox(new Vector3((lx * co) - (lz * si), ky - 3f + KH + 2.0f, (lx * si) + (lz * co)),
                        new Vector3((KW + 1.6f) / mx * 0.55f, 1.8f, 0.9f), Rot, 0.55f);
                }
            }

            for (int i = 0; i < mz; i++)
            {
                float lz = (-(KD + 1.6f) * 0.5f) + ((i + 0.5f) * (KD + 1.6f) / mz);
                for (int s = -1; s <= 1; s += 2)
                {
                    float lx = s * (((KW + 1.6f) * 0.5f) - 0.5f);
                    m.Stone.AddBox(new Vector3((lx * co) - (lz * si), ky - 3f + KH + 2.0f, (lx * si) + (lz * co)),
                        new Vector3(0.9f, 1.8f, (KD + 1.6f) / mz * 0.55f), Rot, 0.55f);
                }
            }

            Vector3 eave = new Vector3(0f, ky - 3f + KH + 1.2f, 0f);
            m.Tile.AddGableRoof(eave, KW - 2.4f, KD - 2.4f, 8.5f, Rot, 0.52f, 0.3f);
            m.Stone.AddGableEnd(eave, KW - 2.4f, 8.5f, Rot, (KD - 2.4f) * 0.5f, 0.42f);
            m.Stone.AddGableEnd(eave, KW - 2.4f, 8.5f, Rot, -(KD - 2.4f) * 0.5f, 0.42f);

            float[,] corners = { { -KW * 0.5f, -KD * 0.5f }, { KW * 0.5f, -KD * 0.5f }, { KW * 0.5f, KD * 0.5f }, { -KW * 0.5f, KD * 0.5f } };
            for (int i = 0; i < 4; i++)
            {
                float lx = corners[i, 0];
                float lz = corners[i, 1];
                BuildTower(m, (lx * co) - (lz * si), (lx * si) + (lz * co), ky, 3.2f, KH + 4f);
            }

            for (int i = 0; i < 3; i++)
            {
                for (int lvl = 0; lvl < 2; lvl++)
                {
                    float lx = (-KW * 0.28f) + (i * KW * 0.28f);
                    float lz = (KD * 0.5f) + 0.1f;
                    m.Timber.AddBox(new Vector3((lx * co) - (lz * si), ky - 3f + 6f + (lvl * 7f), (lx * si) + (lz * co)),
                        new Vector3(1.1f, 2.2f, 0.25f), Rot, 0.6f);
                }
            }
        }

        private static void BuildCourtyard(Parts m, GroundSampler ground, Layout layout, List<Vector2> pts, ref TexRandom rng)
        {
            float ga = layout.GateAngle;
            float r = layout.Radius;
            float gx = Mathf.Cos(ga) * r * 0.98f;
            float gz = Mathf.Sin(ga) * r * 0.98f;

            // ممرّ مرصوف من البوّابة إلى الحصن
            const int Steps = 16;
            for (int i = 0; i < Steps; i++)
            {
                float t = (float)i / (Steps - 1);
                float px = gx * (1f - t);
                float pz = gz * (1f - t);
                m.Stone.AddBox(new Vector3(px, ground(px, pz) + 0.10f, pz),
                    new Vector3(7.5f, 0.7f, r * 2f / Steps * 1.2f), ga + (Mathf.PI * 0.5f), 0.45f);
            }

            // سلالم إلى ممشى السور
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

            // بئر الساحة
            float wx = Mathf.Cos(ga + 2.1f) * r * 0.34f;
            float wz = Mathf.Sin(ga + 2.1f) * r * 0.34f;
            float wy = ground(wx, wz);
            m.Stone.AddCylinder(new Vector3(wx, wy - 0.4f, wz), 2.1f, 1.9f, 1.5f, 12, 0.55f, false);
            for (int s = -1; s <= 1; s += 2)
            {
                m.Timber.AddBox(new Vector3(wx + (s * 1.7f), wy + 1.9f, wz), new Vector3(0.28f, 2.6f, 0.28f), 0f, 0.6f);
            }

            m.Timber.AddBox(new Vector3(wx, wy + 3.3f, wz), new Vector3(4.4f, 0.35f, 2.6f), 0f, 0.4f);
            m.Tile.AddGableRoof(new Vector3(wx, wy + 3.3f, wz), 4.4f, 2.8f, 1.0f, 0f, 0.6f, 0.25f);

            // براميل وصناديق
            for (int i = 0; i < 14; i++)
            {
                float a = rng.Next() * Mathf.PI * 2f;
                float rr = r * (0.25f + (rng.Next() * 0.5f));
                float bx = Mathf.Cos(a) * rr;
                float bz = Mathf.Sin(a) * rr;
                float by = ground(bx, bz);

                if (rng.Next() < 0.5f)
                {
                    m.Timber.AddCylinder(new Vector3(bx, by, bz), 0.55f, 0.5f, 1.15f, 9, 0.7f, true);
                }
                else
                {
                    m.Timber.AddBox(new Vector3(bx, by + 0.45f, bz), new Vector3(1.1f, 0.9f, 0.9f), rng.Next() * 3.14f, 0.7f);
                }
            }

            // رايات على الأبراج
            for (int i = 0; i < pts.Count; i += 2)
            {
                Vector2 p = pts[i];
                float py = ground(p.x, p.y);
                m.Timber.AddBox(new Vector3(p.x, py + 22f, p.y), new Vector3(0.18f, 8f, 0.18f), 0f, 0.8f);
                m.Thatch.AddBox(new Vector3(p.x + 1.3f, py + 24.5f, p.y), new Vector3(2.6f, 2.0f, 0.10f), 0f, 0.6f);
            }

            // قاعات داخل السور
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
