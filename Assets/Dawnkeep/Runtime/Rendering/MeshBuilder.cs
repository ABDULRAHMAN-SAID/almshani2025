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
