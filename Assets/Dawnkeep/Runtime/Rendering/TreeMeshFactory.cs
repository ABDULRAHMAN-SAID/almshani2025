using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// أشجار مولّدة: جذع يتفرّع بتكرار، وأوراق على بطاقات متقاطعة تحمل وزن التمايل
    /// في قناة ألفا من لون الرأس — فتتحرّك مع الريح في شادر Dawnkeep/Foliage.
    /// </summary>
    public static class TreeMeshFactory
    {
        public struct TreeMeshes
        {
            public Mesh Trunk;
            public Mesh Canopy;
            public float Height;
            public float Radius;
        }

        /// <summary>شجرة عريضة الأوراق: جذع مائل قليلاً يتفرّع إلى تاج مستدير.</summary>
        public static TreeMeshes BuildBroadleaf(uint seed, float height)
        {
            System.Random rng = new System.Random((int)seed);
            MeshBuilder trunk = new MeshBuilder();
            MeshBuilder canopy = new MeshBuilder();

            float baseRadius = height * 0.065f;
            float phase = (float)rng.NextDouble();
            Vector3 root = Vector3.zero;
            Vector3 lean = new Vector3(
                ((float)rng.NextDouble() - 0.5f) * height * 0.10f,
                0f,
                ((float)rng.NextDouble() - 0.5f) * height * 0.10f);

            Vector3 top = new Vector3(lean.x, height * 0.48f, lean.z);
            trunk.AddTube(root, top, baseRadius, baseRadius * 0.55f, 8, 1.4f, 0f, 0.16f, phase);

            float widest = 0f;
            int mainBranches = 4 + rng.Next(0, 3);

            for (int b = 0; b < mainBranches; b++)
            {
                float a = ((float)b / mainBranches * Mathf.PI * 2f) + ((float)rng.NextDouble() * 0.7f);
                float spread = height * (0.16f + ((float)rng.NextDouble() * 0.12f));
                float rise = height * (0.20f + ((float)rng.NextDouble() * 0.14f));
                Vector3 tip = top + new Vector3(Mathf.Cos(a) * spread, rise, Mathf.Sin(a) * spread);

                trunk.AddTube(top, tip, baseRadius * 0.5f, baseRadius * 0.22f, 6, 1.2f, 0.16f, 0.55f, phase);

                int twigs = 3 + rng.Next(0, 3);
                for (int t = 0; t < twigs; t++)
                {
                    float ta = a + (((float)rng.NextDouble() - 0.5f) * 1.7f);
                    float tl = height * (0.09f + ((float)rng.NextDouble() * 0.09f));
                    Vector3 twigTip = tip + new Vector3(
                        Mathf.Cos(ta) * tl,
                        height * (0.05f + ((float)rng.NextDouble() * 0.10f)),
                        Mathf.Sin(ta) * tl);

                    trunk.AddTube(tip, twigTip, baseRadius * 0.2f, baseRadius * 0.08f, 5, 1f, 0.55f, 0.9f, phase);
                    AddLeafCards(canopy, rng, twigTip, height * (0.30f + ((float)rng.NextDouble() * 0.14f)), 4, 0.95f, phase);
                    AddLeafCards(canopy, rng, Vector3.Lerp(tip, twigTip, 0.5f), height * 0.26f, 2, 0.85f, phase);

                    float rr = new Vector2(twigTip.x, twigTip.z).magnitude;
                    if (rr > widest)
                    {
                        widest = rr;
                    }
                }

                AddLeafCards(canopy, rng, tip, height * 0.34f, 3, 0.75f, phase);
            }

            TreeMeshes result;
            result.Trunk = trunk.ToMesh("DawnkeepBroadleafTrunk", false);
            result.Canopy = canopy.ToMesh("DawnkeepBroadleafCanopy", false);
            result.Height = height;
            result.Radius = Mathf.Max(widest + (height * 0.16f), height * 0.28f);
            return result;
        }

        /// <summary>صنوبر: جذع مستقيم وأغصان في دوائر متدرّجة تعطي صورة مخروطية.</summary>
        public static TreeMeshes BuildConifer(uint seed, float height)
        {
            System.Random rng = new System.Random((int)seed);
            MeshBuilder trunk = new MeshBuilder();
            MeshBuilder canopy = new MeshBuilder();

            float baseRadius = height * 0.052f;
            float phase = (float)rng.NextDouble();
            Vector3 root = Vector3.zero;
            Vector3 top = new Vector3(
                ((float)rng.NextDouble() - 0.5f) * height * 0.04f,
                height,
                ((float)rng.NextDouble() - 0.5f) * height * 0.04f);

            trunk.AddTube(root, top, baseRadius, baseRadius * 0.12f, 8, 1.6f, 0f, 0.35f, phase);

            int whorls = 7 + rng.Next(0, 3);
            float widest = 0f;

            for (int wIndex = 0; wIndex < whorls; wIndex++)
            {
                float t = 0.18f + (0.78f * wIndex / (whorls - 1));
                float y = height * t;
                float radius = height * 0.34f * Mathf.Pow(1f - t, 0.85f);
                if (radius < height * 0.03f)
                {
                    continue;
                }

                int arms = 4 + rng.Next(0, 3);
                float sway = 0.25f + (t * 0.65f);

                for (int a = 0; a < arms; a++)
                {
                    float ang = ((float)a / arms * Mathf.PI * 2f) + (wIndex * 0.9f) + ((float)rng.NextDouble() * 0.3f);
                    Vector3 armRoot = new Vector3(top.x * t, y, top.z * t);
                    Vector3 armTip = armRoot + new Vector3(
                        Mathf.Cos(ang) * radius,
                        -height * 0.03f,
                        Mathf.Sin(ang) * radius);

                    trunk.AddTube(armRoot, armTip, baseRadius * 0.16f, baseRadius * 0.05f, 5, 1f, sway * 0.5f, sway, phase);
                    AddLeafCards(canopy, rng, Vector3.Lerp(armRoot, armTip, 0.62f), radius * 1.6f, 3, sway, phase);
                    AddLeafCards(canopy, rng, Vector3.Lerp(armRoot, armTip, 0.30f), radius * 1.1f, 1, sway * 0.8f, phase);

                    if (radius > widest)
                    {
                        widest = radius;
                    }
                }
            }

            AddLeafCards(canopy, rng, new Vector3(top.x, height * 0.94f, top.z), height * 0.14f, 2, 0.95f, phase);

            TreeMeshes result;
            result.Trunk = trunk.ToMesh("DawnkeepConiferTrunk", false);
            result.Canopy = canopy.ToMesh("DawnkeepConiferCanopy", false);
            result.Height = height;
            result.Radius = Mathf.Max(widest + (height * 0.08f), height * 0.20f);
            return result;
        }

        private static void AddLeafCards(MeshBuilder canopy, System.Random rng, Vector3 center, float size,
            int count, float sway, float phase)
        {
            for (int i = 0; i < count; i++)
            {
                float yaw = (float)rng.NextDouble() * Mathf.PI * 2f;
                float pitch = (((float)rng.NextDouble() - 0.5f) * 0.9f);

                Vector3 right = new Vector3(Mathf.Cos(yaw), 0f, Mathf.Sin(yaw));
                Vector3 up = new Vector3(-Mathf.Sin(yaw) * Mathf.Sin(pitch), Mathf.Cos(pitch), Mathf.Cos(yaw) * Mathf.Sin(pitch));

                Vector3 jitter = new Vector3(
                    ((float)rng.NextDouble() - 0.5f) * size * 0.45f,
                    ((float)rng.NextDouble() - 0.5f) * size * 0.35f,
                    ((float)rng.NextDouble() - 0.5f) * size * 0.45f);

                float scale = size * (0.75f + ((float)rng.NextDouble() * 0.5f));
                canopy.AddCard(center + jitter, right, up, scale, scale * 0.82f, sway, phase + ((float)rng.NextDouble() * 0.4f));
            }
        }
    }
}
