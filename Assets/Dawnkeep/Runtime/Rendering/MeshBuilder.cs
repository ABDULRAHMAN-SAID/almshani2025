using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// بانٍ شبكات بسيط: أنابيب مخروطية وألواح ومجسّمات كروية مشوّهة.
    /// لون الرأس يحمل بيانات الريح: A = قابلية التمايل، R = فرق الطور بين الأغصان.
    /// </summary>
    public sealed class MeshBuilder
    {
        private readonly List<Vector3> _vertices = new List<Vector3>();
        private readonly List<Vector3> _normals = new List<Vector3>();
        private readonly List<Vector2> _uvs = new List<Vector2>();
        private readonly List<Color> _colors = new List<Color>();
        private readonly List<int> _triangles = new List<int>();

        public int VertexCount
        {
            get { return _vertices.Count; }
        }

        public void AddVertex(Vector3 position, Vector3 normal, Vector2 uv, Color color)
        {
            _vertices.Add(position);
            _normals.Add(normal);
            _uvs.Add(uv);
            _colors.Add(color);
        }

        public void AddTriangle(int a, int b, int c)
        {
            _triangles.Add(a);
            _triangles.Add(b);
            _triangles.Add(c);
        }

        public void AddQuad(int a, int b, int c, int d)
        {
            AddTriangle(a, b, c);
            AddTriangle(a, c, d);
        }

        /// <summary>أنبوب مخروطي بين نقطتين — جذع أو غصن.</summary>
        public void AddTube(Vector3 from, Vector3 to, float radiusFrom, float radiusTo, int sides,
            float uvScale, float swayFrom, float swayTo, float phase)
        {
            Vector3 axis = to - from;
            float length = axis.magnitude;
            if (length < 1e-4f || sides < 3)
            {
                return;
            }

            Vector3 dir = axis / length;
            Vector3 helper = Mathf.Abs(dir.y) > 0.9f ? Vector3.right : Vector3.up;
            Vector3 side = Vector3.Normalize(Vector3.Cross(helper, dir));
            Vector3 up = Vector3.Cross(dir, side);

            int start = _vertices.Count;

            for (int ring = 0; ring < 2; ring++)
            {
                Vector3 center = ring == 0 ? from : to;
                float radius = ring == 0 ? radiusFrom : radiusTo;
                float sway = ring == 0 ? swayFrom : swayTo;

                for (int i = 0; i <= sides; i++)
                {
                    float a = (float)i / sides * Mathf.PI * 2f;
                    Vector3 offset = (side * Mathf.Cos(a)) + (up * Mathf.Sin(a));
                    AddVertex(
                        center + (offset * radius),
                        offset,
                        new Vector2((float)i / sides * uvScale, ring == 0 ? 0f : length * uvScale * 0.25f),
                        new Color(phase, 0.5f, 0.5f, sway));
                }
            }

            int stride = sides + 1;
            for (int i = 0; i < sides; i++)
            {
                int a = start + i;
                int b = start + i + 1;
                int c = start + stride + i + 1;
                int d = start + stride + i;
                AddQuad(a, b, c, d);
            }
        }

        /// <summary>لوح مزدوج الوجه — بطاقة أوراق.</summary>
        public void AddCard(Vector3 center, Vector3 right, Vector3 up, float width, float height,
            float sway, float phase)
        {
            Vector3 normal = Vector3.Normalize(Vector3.Cross(right, up));
            Vector3 hw = right * (width * 0.5f);
            Vector3 hh = up * (height * 0.5f);

            int start = _vertices.Count;
            Color c = new Color(phase, 0.5f, 0.5f, sway);

            AddVertex(center - hw - hh, normal, new Vector2(0f, 0f), c);
            AddVertex(center + hw - hh, normal, new Vector2(1f, 0f), c);
            AddVertex(center + hw + hh, normal, new Vector2(1f, 1f), c);
            AddVertex(center - hw + hh, normal, new Vector2(0f, 1f), c);
            AddQuad(start, start + 1, start + 2, start + 3);

            int back = _vertices.Count;
            AddVertex(center - hw - hh, -normal, new Vector2(1f, 0f), c);
            AddVertex(center - hw + hh, -normal, new Vector2(1f, 1f), c);
            AddVertex(center + hw + hh, -normal, new Vector2(0f, 1f), c);
            AddVertex(center + hw - hh, -normal, new Vector2(0f, 0f), c);
            AddQuad(back, back + 1, back + 2, back + 3);
        }

        /// <summary>كرة مشوّهة بضجيج — صخرة أو كتلة حجرية.</summary>
        public void AddDeformedSphere(Vector3 center, Vector3 radii, int rings, int segments,
            float roughness, uint seed)
        {
            int start = _vertices.Count;
            System.Random rng = new System.Random((int)seed);
            float[] offsets = new float[6];
            for (int i = 0; i < offsets.Length; i++)
            {
                offsets[i] = (float)rng.NextDouble() * 10f;
            }

            for (int r = 0; r <= rings; r++)
            {
                float v = (float)r / rings;
                float theta = v * Mathf.PI;
                float sinTheta = Mathf.Sin(theta);
                float cosTheta = Mathf.Cos(theta);

                for (int s = 0; s <= segments; s++)
                {
                    float u = (float)s / segments;
                    float phi = u * Mathf.PI * 2f;

                    Vector3 unit = new Vector3(
                        sinTheta * Mathf.Cos(phi),
                        cosTheta,
                        sinTheta * Mathf.Sin(phi));

                    float bump = 1f
                        + (Mathf.Sin((unit.x * 3.1f) + offsets[0]) * Mathf.Cos((unit.z * 2.7f) + offsets[1]) * roughness)
                        + (Mathf.Sin((unit.y * 5.3f) + offsets[2]) * Mathf.Cos((unit.x * 4.1f) + offsets[3]) * roughness * 0.5f);

                    Vector3 p = new Vector3(unit.x * radii.x, unit.y * radii.y, unit.z * radii.z) * bump;
                    AddVertex(center + p, unit, new Vector2(u * 2f, v * 2f), new Color(0f, 0.5f, 0.5f, 0f));
                }
            }

            int stride = segments + 1;
            for (int r = 0; r < rings; r++)
            {
                for (int s = 0; s < segments; s++)
                {
                    int a = start + (r * stride) + s;
                    int b = a + 1;
                    int c = a + stride + 1;
                    int d = a + stride;
                    AddQuad(a, b, c, d);
                }
            }
        }

        /// <summary>
        /// صندوق بإحداثيات نسيج بمقياس العالم: تتساوى كثافة الخامة على كل وجه
        /// مهما اختلفت الأبعاد، فلا تظهر مداميك بمترين على جدار ومداميك بسنتيمترات على آخر.
        /// </summary>
        public void AddBox(Vector3 center, Vector3 size, float rotY, float uvScale)
        {
            float co = Mathf.Cos(rotY);
            float si = Mathf.Sin(rotY);
            float hx = size.x * 0.5f;
            float hy = size.y * 0.5f;
            float hz = size.z * 0.5f;

            Vector3[][] faces =
            {
                new[] { new Vector3(-hx, -hy, hz), new Vector3(hx, -hy, hz), new Vector3(hx, hy, hz), new Vector3(-hx, hy, hz) },
                new[] { new Vector3(hx, -hy, -hz), new Vector3(-hx, -hy, -hz), new Vector3(-hx, hy, -hz), new Vector3(hx, hy, -hz) },
                new[] { new Vector3(hx, -hy, hz), new Vector3(hx, -hy, -hz), new Vector3(hx, hy, -hz), new Vector3(hx, hy, hz) },
                new[] { new Vector3(-hx, -hy, -hz), new Vector3(-hx, -hy, hz), new Vector3(-hx, hy, hz), new Vector3(-hx, hy, -hz) },
                new[] { new Vector3(-hx, hy, hz), new Vector3(hx, hy, hz), new Vector3(hx, hy, -hz), new Vector3(-hx, hy, -hz) },
                new[] { new Vector3(-hx, -hy, -hz), new Vector3(hx, -hy, -hz), new Vector3(hx, -hy, hz), new Vector3(-hx, -hy, hz) },
            };

            Vector3[] normals =
            {
                Vector3.forward, Vector3.back, Vector3.right, Vector3.left, Vector3.up, Vector3.down,
            };

            Vector2[] extents =
            {
                new Vector2(size.x, size.y), new Vector2(size.x, size.y),
                new Vector2(size.z, size.y), new Vector2(size.z, size.y),
                new Vector2(size.x, size.z), new Vector2(size.x, size.z),
            };

            for (int f = 0; f < faces.Length; f++)
            {
                Vector3 n = Rotate(normals[f], co, si);
                int start = VertexCount;
                Vector2 e = extents[f] * uvScale;
                Vector2[] uv = { new Vector2(0f, 0f), new Vector2(e.x, 0f), new Vector2(e.x, e.y), new Vector2(0f, e.y) };

                for (int i = 0; i < 4; i++)
                {
                    Vector3 p = Rotate(faces[f][i], co, si);
                    AddVertex(center + p, n, uv[i], new Color(0f, 0.5f, 0.5f, 0f));
                }

                AddQuad(start, start + 1, start + 2, start + 3);
            }
        }

        /// <summary>أسطوانة أو مخروط — أبراج وأسقف مخروطية وبراميل.</summary>
        public void AddCylinder(Vector3 baseCenter, float radiusBottom, float radiusTop, float height,
            int segments, float uvScale, bool capTop)
        {
            int start = VertexCount;
            float circumference = Mathf.PI * (radiusBottom + radiusTop);

            for (int ring = 0; ring < 2; ring++)
            {
                float y = baseCenter.y + (ring == 1 ? height : 0f);
                float r = ring == 1 ? radiusTop : radiusBottom;

                for (int i = 0; i <= segments; i++)
                {
                    float a = (float)i / segments * Mathf.PI * 2f;
                    float ca = Mathf.Cos(a);
                    float sa = Mathf.Sin(a);
                    AddVertex(
                        new Vector3(baseCenter.x + (ca * r), y, baseCenter.z + (sa * r)),
                        new Vector3(ca, 0f, sa),
                        new Vector2((float)i / segments * circumference * uvScale, (ring == 1 ? height : 0f) * uvScale),
                        new Color(0f, 0.5f, 0.5f, 0f));
                }
            }

            int stride = segments + 1;
            for (int i = 0; i < segments; i++)
            {
                AddQuad(start + i, start + i + 1, start + stride + i + 1, start + stride + i);
            }

            if (capTop)
            {
                int capStart = VertexCount;
                AddVertex(new Vector3(baseCenter.x, baseCenter.y + height, baseCenter.z), Vector3.up,
                    Vector2.zero, new Color(0f, 0.5f, 0.5f, 0f));

                for (int i = 0; i <= segments; i++)
                {
                    float a = (float)i / segments * Mathf.PI * 2f;
                    AddVertex(
                        new Vector3(baseCenter.x + (Mathf.Cos(a) * radiusTop), baseCenter.y + height,
                            baseCenter.z + (Mathf.Sin(a) * radiusTop)),
                        Vector3.up,
                        new Vector2(Mathf.Cos(a) * radiusTop * uvScale, Mathf.Sin(a) * radiusTop * uvScale),
                        new Color(0f, 0.5f, 0.5f, 0f));
                }

                for (int i = 0; i < segments; i++)
                {
                    AddTriangle(capStart, capStart + 1 + i, capStart + 2 + i);
                }
            }
        }

        /// <summary>سقف جملوني: منحدران يلتقيان عند جائز.</summary>
        public void AddGableRoof(Vector3 eaveCenter, float width, float depth, float height,
            float rotY, float uvScale, float overhang)
        {
            float co = Mathf.Cos(rotY);
            float si = Mathf.Sin(rotY);
            float hw = (width * 0.5f) + overhang;
            float hd = (depth * 0.5f) + overhang;
            float slope = Mathf.Sqrt((hw * hw) + (height * height));

            Vector3 a = eaveCenter + Rotate(new Vector3(-hw, 0f, -hd), co, si);
            Vector3 b = eaveCenter + Rotate(new Vector3(hw, 0f, -hd), co, si);
            Vector3 cc = eaveCenter + Rotate(new Vector3(hw, 0f, hd), co, si);
            Vector3 d = eaveCenter + Rotate(new Vector3(-hw, 0f, hd), co, si);
            Vector3 r0 = eaveCenter + Rotate(new Vector3(0f, height, -hd), co, si);
            Vector3 r1 = eaveCenter + Rotate(new Vector3(0f, height, hd), co, si);

            Vector3 nL = Rotate(new Vector3(-height / slope, hw / slope, 0f), co, si);
            Vector3 nR = Rotate(new Vector3(height / slope, hw / slope, 0f), co, si);

            AddSlope(a, d, r1, r0, nL, depth * uvScale, slope * uvScale);
            AddSlope(cc, b, r0, r1, nR, depth * uvScale, slope * uvScale);
        }

        /// <summary>واجهة مثلّثة تسدّ طرف الجملون.</summary>
        public void AddGableEnd(Vector3 eaveCenter, float width, float height, float rotY, float z, float uvScale)
        {
            float co = Mathf.Cos(rotY);
            float si = Mathf.Sin(rotY);
            Vector3 n = Rotate(new Vector3(0f, 0f, Mathf.Sign(z)), co, si);

            int start = VertexCount;
            Vector2[] local = { new Vector2(-width * 0.5f, 0f), new Vector2(width * 0.5f, 0f), new Vector2(0f, height) };

            for (int i = 0; i < 3; i++)
            {
                Vector3 p = Rotate(new Vector3(local[i].x, local[i].y, z), co, si);
                AddVertex(eaveCenter + p, n,
                    new Vector2((local[i].x + (width * 0.5f)) * uvScale, local[i].y * uvScale),
                    new Color(0f, 0.5f, 0.5f, 0f));
            }

            AddTriangle(start, start + 1, start + 2);
        }

        private void AddSlope(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector3 n, float uSpan, float vSpan)
        {
            int start = VertexCount;
            AddVertex(a, n, new Vector2(0f, 0f), new Color(0f, 0.5f, 0.5f, 0f));
            AddVertex(b, n, new Vector2(uSpan, 0f), new Color(0f, 0.5f, 0.5f, 0f));
            AddVertex(c, n, new Vector2(uSpan, vSpan), new Color(0f, 0.5f, 0.5f, 0f));
            AddVertex(d, n, new Vector2(0f, vSpan), new Color(0f, 0.5f, 0.5f, 0f));
            AddQuad(start, start + 1, start + 2, start + 3);
        }

        private static Vector3 Rotate(Vector3 v, float cos, float sin)
        {
            return new Vector3((v.x * cos) - (v.z * sin), v.y, (v.x * sin) + (v.z * cos));
        }

        public Mesh ToMesh(string name, bool recalculateNormals)
        {
            Mesh mesh = new Mesh();
            mesh.name = name;
            mesh.indexFormat = _vertices.Count > 65000
                ? UnityEngine.Rendering.IndexFormat.UInt32
                : UnityEngine.Rendering.IndexFormat.UInt16;

            mesh.SetVertices(_vertices);
            mesh.SetNormals(_normals);
            mesh.SetUVs(0, _uvs);
            mesh.SetColors(_colors);
            mesh.SetTriangles(_triangles, 0);

            if (recalculateNormals)
            {
                mesh.RecalculateNormals();
            }

            mesh.RecalculateTangents();
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
