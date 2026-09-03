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

            Vector3 top = new Vector3(lean.x, height * 0.46f, lean.z);
            Vector3 crownCenter = new Vector3(top.x, height * 0.74f, top.z);
            float crownRadius = height * 0.40f;
            trunk.AddTube(root, top, baseRadius, baseRadius * 0.52f, 9, 0.6f, 0f, 0.16f, phase);

            float widest = 0f;
            int mainBranches = 4 + rng.Next(0, 3);

            for (int b = 0; b < mainBranches; b++)
            {
                float a = ((float)b / mainBranches * Mathf.PI * 2f) + ((float)rng.NextDouble() * 0.7f);
                float spread = height * (0.16f + ((float)rng.NextDouble() * 0.12f));
                float rise = height * (0.20f + ((float)rng.NextDouble() * 0.14f));
                Vector3 tip = top + new Vector3(Mathf.Cos(a) * spread, rise, Mathf.Sin(a) * spread);

                trunk.AddTube(top, tip, baseRadius * 0.52f, baseRadius * 0.22f, 7, 0.6f, 0.16f, 0.55f, phase);

                int twigs = 3 + rng.Next(0, 3);
                for (int t = 0; t < twigs; t++)
                {
                    float ta = a + (((float)rng.NextDouble() - 0.5f) * 1.7f);
                    float tl = height * (0.09f + ((float)rng.NextDouble() * 0.09f));
                    Vector3 twigTip = tip + new Vector3(
                        Mathf.Cos(ta) * tl,
                        height * (0.05f + ((float)rng.NextDouble() * 0.10f)),
                        Mathf.Sin(ta) * tl);

                    trunk.AddTube(tip, twigTip, baseRadius * 0.2f, baseRadius * 0.07f, 5, 0.6f, 0.55f, 0.9f, phase);
                    AddLeafCards(canopy, rng, twigTip, height * 0.155f, 7, 0.95f, phase, crownCenter, crownRadius);

                    float rr = new Vector2(twigTip.x, twigTip.z).magnitude;
                    if (rr > widest)
                    {
                        widest = rr;
                    }
                }

                AddLeafCards(canopy, rng, tip, height * 0.145f, 4, 0.75f, phase, crownCenter, crownRadius);
            }

            // قشرة التاج: بطاقات على سطح كرة مفلطحة فيصير للشجرة صورة ظلّية مستديرة
            int shell = 46 + rng.Next(0, 19);
            for (int i = 0; i < shell; i++)
            {
                float u = ((float)rng.NextDouble() * 2f) - 1f;
                float th = (float)rng.NextDouble() * Mathf.PI * 2f;
                float r2 = Mathf.Sqrt(Mathf.Max(0f, 1f - (u * u)));
                float rr = crownRadius * (0.72f + ((float)rng.NextDouble() * 0.30f));
                Vector3 p = new Vector3(
                    crownCenter.x + (Mathf.Cos(th) * r2 * rr),
                    crownCenter.y + (u * rr * 0.72f),
                    crownCenter.z + (Mathf.Sin(th) * r2 * rr));
                AddLeafCards(canopy, rng, p, height * 0.135f, 1, 0.95f, phase, crownCenter, crownRadius);
            }

            TreeMeshes result;
            result.Trunk = trunk.ToMesh("DawnkeepBroadleafTrunk", false);
            result.Canopy = canopy.ToMesh("DawnkeepBroadleafCanopy", false);
            result.Height = height;
            result.Radius = Mathf.Max(widest + (height * 0.16f), crownRadius);
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

            trunk.AddTube(root, top, baseRadius, baseRadius * 0.12f, 9, 0.6f, 0f, 0.35f, phase);
            Vector3 coneCenter = new Vector3(top.x * 0.5f, height * 0.5f, top.z * 0.5f);
            float coneRadius = height * 0.42f;

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

                    trunk.AddTube(armRoot, armTip, baseRadius * 0.16f, baseRadius * 0.05f, 5, 0.6f, sway * 0.5f, sway, phase);
                    AddLeafCards(canopy, rng, Vector3.Lerp(armRoot, armTip, 0.62f), radius * 0.95f, 5, sway, phase, coneCenter, coneRadius);
                    AddLeafCards(canopy, rng, Vector3.Lerp(armRoot, armTip, 0.32f), radius * 0.72f, 2, sway * 0.8f, phase, coneCenter, coneRadius);

                    if (radius > widest)
                    {
                        widest = radius;
                    }
                }
            }

            AddLeafCards(canopy, rng, new Vector3(top.x, height * 0.94f, top.z), height * 0.10f, 4, 0.95f, phase, coneCenter, coneRadius);

            TreeMeshes result;
            result.Trunk = trunk.ToMesh("DawnkeepConiferTrunk", false);
            result.Canopy = canopy.ToMesh("DawnkeepConiferCanopy", false);
            result.Height = height;
            result.Radius = Mathf.Max(widest + (height * 0.08f), height * 0.20f);
            return result;
        }

        /// <summary>
        /// بطاقات أوراق مع تدرّج ظلّ: ما قرب من قلب التاج أغمق وما علا أفتح.
        /// هذا التدرّج هو ما يجعل التيجان تُقرأ أشجاراً لا سجّادة خضراء واحدة.
        /// </summary>
        private static void AddLeafCards(MeshBuilder canopy, System.Random rng, Vector3 center, float size,
            int count, float sway, float phase, Vector3 crownCenter, float crownRadius)
        {
            for (int i = 0; i < count; i++)
            {
                float yaw = (float)rng.NextDouble() * Mathf.PI * 2f;
                float pitch = ((float)rng.NextDouble() - 0.5f) * 0.9f;

                Vector3 right = new Vector3(Mathf.Cos(yaw), 0f, Mathf.Sin(yaw));
                Vector3 up = new Vector3(-Mathf.Sin(yaw) * Mathf.Sin(pitch), Mathf.Cos(pitch), Mathf.Cos(yaw) * Mathf.Sin(pitch));

                Vector3 jitter = new Vector3(
                    ((float)rng.NextDouble() - 0.5f) * size * 0.85f,
                    ((float)rng.NextDouble() - 0.5f) * size * 0.62f,
                    ((float)rng.NextDouble() - 0.5f) * size * 0.85f);

                Vector3 p = center + jitter;
                float shade = 1f;

                if (crownRadius > 0.01f)
                {
                    Vector3 d = p - crownCenter;
                    float t = d.magnitude / crownRadius;
                    shade = 0.34f + (0.58f * Mathf.Min(1f, Mathf.Pow(Mathf.Max(0f, t), 0.85f)));
                    shade *= 0.86f + (0.28f * Mathf.Clamp01(((d.y / crownRadius) * 0.9f) + 0.5f));
                    shade = Mathf.Min(0.94f, shade);
                }

                float scale = size * (0.55f + ((float)rng.NextDouble() * 0.42f));
                canopy.AddCard(p, right, up, scale, scale * 0.86f, sway,
                    phase + ((float)rng.NextDouble() * 0.4f), shade);
            }
        }
    }
}
