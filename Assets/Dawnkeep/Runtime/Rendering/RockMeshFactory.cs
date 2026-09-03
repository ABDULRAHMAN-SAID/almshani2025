using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// صخور مولّدة: كتل مشوّهة تُكدَّس فتعطي نتوءاً صخرياً حقيقياً على الجرف
    /// بدل «صخرة» واحدة ملساء. لا حوافّ مربّعة ولا تكرار ظاهر.
    /// </summary>
    public static class RockMeshFactory
    {
        /// <summary>كتلة واحدة — تُستعمل كحصاة أو صخرة متوسّطة.</summary>
        public static Mesh BuildBoulder(uint seed, float size)
        {
            System.Random rng = new System.Random((int)seed);
            MeshBuilder mb = new MeshBuilder();

            Vector3 radii = new Vector3(
                size * (0.85f + ((float)rng.NextDouble() * 0.45f)),
                size * (0.55f + ((float)rng.NextDouble() * 0.40f)),
                size * (0.85f + ((float)rng.NextDouble() * 0.45f)));

            mb.AddDeformedSphere(new Vector3(0f, radii.y * 0.72f, 0f), radii, 10, 14, 0.16f, seed);
            return mb.ToMesh("DawnkeepBoulder", true);
        }

        /// <summary>نتوء صخري: عدّة كتل متداخلة بأحجام متدرّجة تتكئ على بعضها.</summary>
        public static Mesh BuildOutcrop(uint seed, float size)
        {
            System.Random rng = new System.Random((int)seed);
            MeshBuilder mb = new MeshBuilder();

            int blocks = 4 + rng.Next(0, 4);
            for (int b = 0; b < blocks; b++)
            {
                float t = (float)b / blocks;
                float scale = size * (1f - (t * 0.55f)) * (0.6f + ((float)rng.NextDouble() * 0.6f));
                float a = (float)rng.NextDouble() * Mathf.PI * 2f;
                float spread = size * 0.55f * (float)rng.NextDouble();

                Vector3 center = new Vector3(
                    Mathf.Cos(a) * spread,
                    (scale * 0.55f) + (t * size * 0.62f),
                    Mathf.Sin(a) * spread);

                Vector3 radii = new Vector3(
                    scale * (0.75f + ((float)rng.NextDouble() * 0.5f)),
                    scale * (0.60f + ((float)rng.NextDouble() * 0.7f)),
                    scale * (0.75f + ((float)rng.NextDouble() * 0.5f)));

                mb.AddDeformedSphere(center, radii, 9, 12, 0.20f, seed + (uint)(b * 977));
            }

            return mb.ToMesh("DawnkeepOutcrop", true);
        }
    }
}
