using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// هندسة معمارية لا صناديق. الصندوق المحاذي للمحاور هو سبب مظهر «ماين كرافت»؛
    /// البديل أربع أدوات: كنس مقطع على مسار، خراطة مقطع حول محور، بثق مضلّع مشطوف،
    /// وقوس بأحجار شعاعية.
    /// </summary>
    public static class ArchitectureBuilder
    {
        /// <summary>
        /// كنس مقطع مغلق على مسار أفقي: منه يُبنى السور بجسم واحد متّصل —
        /// قاعدة بارزة، انحسار، بَطّة مائلة، إفريز، ممشى، ستارة.
        /// المقطع: x = الإزاحة العمودية على المسار (موجب = خارجاً)، y = الارتفاع.
        /// </summary>
        public static void SweepProfile(MeshBuilder mb, IList<Vector2> path, IList<Vector2> profile,
            System.Func<float, float, float> baseHeight, float uvScale, bool closedPath, bool capEnds)
        {
            int n = path.Count;
            int m = profile.Count;
            if (n < 2 || m < 3)
            {
                return;
            }

            float[] arc = new float[m];
            for (int i = 1; i < m; i++)
            {
                arc[i] = arc[i - 1] + Vector2.Distance(profile[i], profile[i - 1]);
            }

            int start = mb.VertexCount;
            float travelled = 0f;
            Vector3[][] rings = new Vector3[n][];
            float[] travels = new float[n];
            Vector2[] perps = new Vector2[n];

            for (int i = 0; i < n; i++)
            {
                Vector2 prev = path[(i - 1 + n) % n];
                Vector2 next = path[(i + 1) % n];
                Vector2 cur = path[i];
                Vector2 dir;

                if (closedPath)
                {
                    dir = next - prev;
                }
                else if (i == 0)
                {
                    dir = path[1] - path[0];
                }
                else if (i == n - 1)
                {
                    dir = path[n - 1] - path[n - 2];
                }
                else
                {
                    dir = next - prev;
                }

                if (dir.sqrMagnitude < 1e-8f)
                {
                    dir = new Vector2(1f, 0f);
                }

                dir.Normalize();
                Vector2 perp = new Vector2(dir.y, -dir.x);   // خارجاً لمسار عكس عقارب الساعة
                perps[i] = perp;

                if (i > 0)
                {
                    travelled += Vector2.Distance(cur, path[i - 1]);
                }

                travels[i] = travelled;
                float by = baseHeight(cur.x, cur.y);

                Vector3[] ring = new Vector3[m];
                for (int q = 0; q < m; q++)
                {
                    ring[q] = new Vector3(
                        cur.x + (perp.x * profile[q].x),
                        by + profile[q].y,
                        cur.y + (perp.y * profile[q].x));
                }

                rings[i] = ring;
            }

            for (int i = 0; i < n; i++)
            {
                for (int q = 0; q < m; q++)
                {
                    Vector2 e = profile[(q + 1) % m] - profile[q];
                    Vector2 nrm = new Vector2(e.y, -e.x);
                    if (nrm.sqrMagnitude < 1e-8f)
                    {
                        nrm = new Vector2(1f, 0f);
                    }

                    nrm.Normalize();
                    mb.AddVertex(rings[i][q],
                        new Vector3(perps[i].x * nrm.x, nrm.y, perps[i].y * nrm.x).normalized,
                        new Vector2(travels[i] * uvScale, arc[q] * uvScale),
                        new Color(0f, 0.5f, 0.5f, 0f));
                }
            }

            int limit = closedPath ? n : n - 1;
            for (int i = 0; i < limit; i++)
            {
                int a = start + (i * m);
                int b = start + (((i + 1) % n) * m);
                for (int q = 0; q < m; q++)
                {
                    int q2 = (q + 1) % m;
                    mb.AddQuad(a + q, a + q2, b + q2, b + q);
                }
            }

            if (capEnds && !closedPath)
            {
                CapRing(mb, rings[0], profile, perps[0], uvScale, true);
                CapRing(mb, rings[n - 1], profile, perps[n - 1], uvScale, false);
            }
        }

        private static void CapRing(MeshBuilder mb, Vector3[] ring, IList<Vector2> profile, Vector2 perp,
            float uvScale, bool flip)
        {
            int m = ring.Length;
            int start = mb.VertexCount;
            Vector3 center = Vector3.zero;
            for (int q = 0; q < m; q++)
            {
                center += ring[q];
            }

            center /= m;
            Vector3 n = new Vector3(flip ? -perp.y : perp.y, 0f, flip ? perp.x : -perp.x);

            mb.AddVertex(center, n, Vector2.zero, new Color(0f, 0.5f, 0.5f, 0f));
            for (int q = 0; q <= m; q++)
            {
                mb.AddVertex(ring[q % m], n, profile[q % m] * uvScale, new Color(0f, 0.5f, 0.5f, 0f));
            }

            for (int q = 0; q < m; q++)
            {
                if (flip)
                {
                    mb.AddTriangle(start, start + 1 + q, start + 2 + q);
                }
                else
                {
                    mb.AddTriangle(start, start + 2 + q, start + 1 + q);
                }
            }
        }

        /// <summary>خراطة مقطع (نصف قطر، ارتفاع) حول محور رأسي — أبراج بحلقات وبَطّة ومَشْط.</summary>
        public static void Lathe(MeshBuilder mb, Vector3 center, IList<Vector2> profile, int segments,
            float uvScale, bool capTop)
        {
            int m = profile.Count;
            if (m < 2)
            {
                return;
            }

            int start = mb.VertexCount;
            float[] arc = new float[m];
            for (int i = 1; i < m; i++)
            {
                arc[i] = arc[i - 1] + Vector2.Distance(profile[i], profile[i - 1]);
            }

            for (int s = 0; s <= segments; s++)
            {
                float a = (float)s / segments * Mathf.PI * 2f;
                float ca = Mathf.Cos(a);
                float sa = Mathf.Sin(a);

                for (int q = 0; q < m; q++)
                {
                    float r = profile[q].x;
                    float y = profile[q].y;
                    int qa = Mathf.Max(0, q - 1);
                    int qb = Mathf.Min(m - 1, q + 1);
                    Vector2 slope = profile[qb] - profile[qa];
                    if (slope.sqrMagnitude < 1e-8f)
                    {
                        slope = new Vector2(0f, 1f);
                    }

                    slope.Normalize();
                    Vector3 n = new Vector3(ca * slope.y, -slope.x, sa * slope.y).normalized;

                    mb.AddVertex(new Vector3(center.x + (ca * r), center.y + y, center.z + (sa * r)), n,
                        new Vector2((float)s / segments * Mathf.PI * 2f * Mathf.Max(r, 0.4f) * uvScale, arc[q] * uvScale),
                        new Color(0f, 0.5f, 0.5f, 0f));
                }
            }

            for (int s = 0; s < segments; s++)
            {
                int a = start + (s * m);
                int b = start + ((s + 1) * m);
                for (int q = 0; q < m - 1; q++)
                {
                    mb.AddQuad(a + q, a + q + 1, b + q + 1, b + q);
                }
            }

            if (capTop)
            {
                int capStart = mb.VertexCount;
                float r = profile[m - 1].x;
                float y = profile[m - 1].y;
                mb.AddVertex(new Vector3(center.x, center.y + y, center.z), Vector3.up, Vector2.zero,
                    new Color(0f, 0.5f, 0.5f, 0f));

                for (int s = 0; s <= segments; s++)
                {
                    float a = (float)s / segments * Mathf.PI * 2f;
                    mb.AddVertex(new Vector3(center.x + (Mathf.Cos(a) * r), center.y + y, center.z + (Mathf.Sin(a) * r)),
                        Vector3.up, new Vector2(Mathf.Cos(a) * r * uvScale, Mathf.Sin(a) * r * uvScale),
                        new Color(0f, 0.5f, 0.5f, 0f));
                }

                for (int s = 0; s < segments; s++)
                {
                    mb.AddTriangle(capStart, capStart + 1 + s, capStart + 2 + s);
                }
            }
        }

        /// <summary>بثق مضلّع بحواف مشطوفة: كتلة حجرية بحرف مكسور لا صندوق حادّ.</summary>
        public static void Prism(MeshBuilder mb, IList<Vector2> poly, float y0, float height,
            float chamfer, float uvScale, float uOffset)
        {
            int m = poly.Count;
            if (m < 3 || height <= 0f)
            {
                return;
            }

            Vector2 c = Vector2.zero;
            for (int i = 0; i < m; i++)
            {
                c += poly[i];
            }

            c /= m;

            Vector2[] shrunk = new Vector2[m];
            for (int i = 0; i < m; i++)
            {
                Vector2 d = poly[i] - c;
                float len = d.magnitude;
                shrunk[i] = len > 1e-4f ? poly[i] - (d / len * chamfer) : poly[i];
            }

            Vector2[][] levels = { shrunk, null, null, shrunk };
            Vector2[] full = new Vector2[m];
            for (int i = 0; i < m; i++)
            {
                full[i] = poly[i];
            }

            levels[1] = full;
            levels[2] = full;
            float[] ys = { y0, y0 + chamfer, y0 + height - chamfer, y0 + height };

            float[] perim = new float[m + 1];
            for (int i = 1; i <= m; i++)
            {
                perim[i] = perim[i - 1] + Vector2.Distance(poly[i % m], poly[i - 1]);
            }

            int start = mb.VertexCount;
            for (int l = 0; l < 4; l++)
            {
                for (int i = 0; i <= m; i++)
                {
                    Vector2 p = levels[l][i % m];
                    Vector2 q = levels[l][(i + 1) % m];
                    Vector2 r = levels[l][(i - 1 + m) % m];
                    Vector2 nrm = new Vector2(q.y - r.y, -(q.x - r.x));
                    if (nrm.sqrMagnitude < 1e-8f)
                    {
                        nrm = new Vector2(1f, 0f);
                    }

                    nrm.Normalize();
                    mb.AddVertex(new Vector3(p.x, ys[l], p.y), new Vector3(nrm.x, 0f, nrm.y),
                        new Vector2((perim[i] + uOffset) * uvScale, ys[l] * uvScale),
                        new Color(0f, 0.5f, 0.5f, 0f));
                }
            }

            int stride = m + 1;
            for (int l = 0; l < 3; l++)
            {
                for (int i = 0; i < m; i++)
                {
                    int a = start + (l * stride) + i;
                    int b = start + ((l + 1) * stride) + i;
                    mb.AddQuad(a, b, b + 1, a + 1);
                }
            }

            int capStart = mb.VertexCount;
            Vector2 topCenter = Vector2.zero;
            for (int i = 0; i < m; i++)
            {
                topCenter += shrunk[i];
            }

            topCenter /= m;
            mb.AddVertex(new Vector3(topCenter.x, ys[3], topCenter.y), Vector3.up, Vector2.zero,
                new Color(0f, 0.5f, 0.5f, 0f));

            for (int i = 0; i <= m; i++)
            {
                Vector2 p = shrunk[i % m];
                mb.AddVertex(new Vector3(p.x, ys[3], p.y), Vector3.up,
                    new Vector2(p.x * uvScale, p.y * uvScale), new Color(0f, 0.5f, 0.5f, 0f));
            }

            for (int i = 0; i < m; i++)
            {
                mb.AddTriangle(capStart, capStart + 1 + i, capStart + 2 + i);
            }
        }

        /// <summary>قوس بأحجار شعاعية — فتحة حقيقية لا مدرّجة بالصناديق.</summary>
        public static void VoussoirArch(MeshBuilder mb, Vector3 spring, float rot, float radius, float depth,
            float ringThickness, int count, float uvScale, float startFraction)
        {
            float co = Mathf.Cos(rot);
            float si = Mathf.Sin(rot);
            float sf = startFraction;

            for (int i = 0; i < count; i++)
            {
                float a0 = Mathf.PI * (sf + ((1f - (2f * sf)) * i / count));
                float a1 = Mathf.PI * (sf + ((1f - (2f * sf)) * (i + 1) / count));
                float am = (a0 + a1) * 0.5f;
                const float Gap = 0.012f;

                Vector2[] pts =
                {
                    new Vector2(Mathf.Cos(a0 + Gap) * radius, Mathf.Sin(a0 + Gap) * radius),
                    new Vector2(Mathf.Cos(a0 + Gap) * (radius + ringThickness), Mathf.Sin(a0 + Gap) * (radius + ringThickness)),
                    new Vector2(Mathf.Cos(a1 - Gap) * (radius + ringThickness), Mathf.Sin(a1 - Gap) * (radius + ringThickness)),
                    new Vector2(Mathf.Cos(a1 - Gap) * radius, Mathf.Sin(a1 - Gap) * radius),
                };

                int st = mb.VertexCount;
                float[] depths = { -depth * 0.5f, depth * 0.5f };

                for (int d = 0; d < 2; d++)
                {
                    for (int p = 0; p < 4; p++)
                    {
                        float wx = spring.x + ((pts[p].x * co) - (depths[d] * si));
                        float wz = spring.z + ((pts[p].x * si) + (depths[d] * co));
                        mb.AddVertex(new Vector3(wx, spring.y + pts[p].y, wz),
                            new Vector3(Mathf.Cos(am) * co, Mathf.Sin(am), Mathf.Cos(am) * si).normalized,
                            new Vector2((pts[p].x + radius) * uvScale, pts[p].y * uvScale),
                            new Color(0f, 0.5f, 0.5f, 0f));
                    }
                }

                mb.AddQuad(st + 0, st + 1, st + 2, st + 3);
                mb.AddQuad(st + 7, st + 6, st + 5, st + 4);
                mb.AddQuad(st + 1, st + 5, st + 6, st + 2);
                mb.AddQuad(st + 3, st + 2, st + 6, st + 7);
                mb.AddQuad(st + 4, st + 5, st + 1, st + 0);
                mb.AddQuad(st + 0, st + 3, st + 7, st + 4);
            }
        }
    }
}
