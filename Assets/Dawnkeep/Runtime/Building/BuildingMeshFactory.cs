using Dawnkeep.Rendering;
using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>شكل المبنى — يختار كتلته المبنيّة بالكود.</summary>
    public enum BuildingShape
    {
        Cottage = 0,
        Farm = 1,
        Watchtower = 2,
        Barracks = 3,
        ArcherCamp = 4,
        Wall = 5,
    }

    /// <summary>
    /// يبني كتل المباني بالكود، مقسومة على الخامات المخبوزة سلفاً.
    ///
    /// القسمة على خامات لا على مبنى واحد: حجرٌ وخشبٌ وقشّ لكل مبنى، فيقرأ
    /// اللاعب مادّته من بعيد — وهي أوضح إشارة على وظيفته من أي أيقونة.
    ///
    /// الأشكال **أصلية**: لم تُنسخ من مرجع ولا من لعبة (قاعدة الأصالة).
    /// </summary>
    public static class BuildingMeshFactory
    {
        /// <summary>كتل المبنى مقسومة على خاماتها.</summary>
        public struct Parts
        {
            public MeshBuilder Stone;
            public MeshBuilder Timber;
            public MeshBuilder Thatch;
            public MeshBuilder Plaster;

            public static Parts Create()
            {
                Parts p;
                p.Stone = new MeshBuilder();
                p.Timber = new MeshBuilder();
                p.Thatch = new MeshBuilder();
                p.Plaster = new MeshBuilder();
                return p;
            }
        }

        /// <summary>يبني الشكل المطلوب حول نقطة الأصل المحلّية.</summary>
        public static Parts Build(BuildingShape shape, uint seed)
        {
            Parts parts = Parts.Create();
            TexRandom rng = new TexRandom(seed == 0 ? 1u : seed);

            switch (shape)
            {
                case BuildingShape.Farm: Farm(parts, ref rng); break;
                case BuildingShape.Watchtower: Watchtower(parts, ref rng); break;
                case BuildingShape.Barracks: Barracks(parts, ref rng); break;
                case BuildingShape.ArcherCamp: ArcherCamp(parts, ref rng); break;
                case BuildingShape.Wall: Wall(parts, ref rng); break;
                default: Cottage(parts, ref rng); break;
            }

            return parts;
        }

        /// <summary>كوخ: قاعدة حجرية، جسم جصّي، سقف جملوني بقشّ.</summary>
        private static void Cottage(Parts p, ref TexRandom rng)
        {
            const float W = 6.4f;
            const float D = 5.0f;
            float rot = (rng.Next() - 0.5f) * 0.30f;

            p.Stone.AddBox(new Vector3(0f, 0.35f, 0f), new Vector3(W + 0.5f, 0.70f, D + 0.5f), rot, 0.35f);
            p.Plaster.AddBox(new Vector3(0f, 2.05f, 0f), new Vector3(W, 2.70f, D), rot, 0.30f);

            p.Timber.AddBox(new Vector3(0f, 2.05f, 0f), new Vector3(W + 0.14f, 0.26f, D + 0.14f), rot, 0.5f);
            p.Timber.AddBox(new Vector3(0f, 3.28f, 0f), new Vector3(W + 0.14f, 0.22f, D + 0.14f), rot, 0.5f);

            p.Thatch.AddGableRoof(new Vector3(0f, 3.40f, 0f), W, D, 2.30f, rot, 0.30f, 0.45f);
            p.Thatch.AddGableEnd(new Vector3(0f, 3.40f, 0f), W, 2.30f, rot, D * 0.5f, 0.30f);
            p.Thatch.AddGableEnd(new Vector3(0f, 3.40f, 0f), W, 2.30f, rot, -D * 0.5f, 0.30f);

            // مدخنة على أحد الطرفين — تكسر التماثل فلا يبدو المبنى قالباً
            p.Stone.AddBox(new Vector3(W * 0.30f, 4.55f, D * 0.22f), new Vector3(0.80f, 2.40f, 0.80f), rot, 0.6f);
        }

        /// <summary>مزرعة: حقل مرتفع قليلاً وسقيفة خشبية على حافّته.</summary>
        private static void Farm(Parts p, ref TexRandom rng)
        {
            const float Field = 9.5f;
            float rot = (rng.Next() - 0.5f) * 0.24f;

            // مصاطب الحقل: ثلاثة ألواح متجاورة أوضح من مستطيل واحد
            for (int i = -1; i <= 1; i++)
            {
                p.Timber.AddBox(new Vector3(i * 2.9f, 0.22f, 0f),
                    new Vector3(2.30f, 0.44f, Field), rot, 0.5f);
            }

            p.Stone.AddBox(new Vector3(0f, 0.12f, 0f), new Vector3(Field + 1.2f, 0.24f, Field + 1.2f), rot, 0.3f);

            // السقيفة
            const float W = 3.6f;
            const float D = 3.0f;
            Vector3 shed = new Vector3(0f, 0f, (Field * 0.5f) + 2.4f);
            p.Timber.AddBox(shed + new Vector3(0f, 1.35f, 0f), new Vector3(W, 2.30f, D), rot, 0.4f);
            p.Thatch.AddGableRoof(shed + new Vector3(0f, 2.50f, 0f), W, D, 1.45f, rot, 0.35f, 0.40f);
            p.Thatch.AddGableEnd(shed + new Vector3(0f, 2.50f, 0f), W, 1.45f, rot, D * 0.5f, 0.35f);
            p.Thatch.AddGableEnd(shed + new Vector3(0f, 2.50f, 0f), W, 1.45f, rot, -D * 0.5f, 0.35f);
        }

        /// <summary>برج مراقبة: بدن حجري ينحسر، شرفة خشبية، شرفات مسنّنة.</summary>
        private static void Watchtower(Parts p, ref TexRandom rng)
        {
            const int Sides = 8;
            const float Height = 9.6f;

            p.Stone.AddCylinder(Vector3.zero, 2.35f, 2.05f, 1.10f, Sides, 0.35f, false);
            p.Stone.AddCylinder(new Vector3(0f, 1.10f, 0f), 1.90f, 1.55f, Height - 1.10f, Sides, 0.35f, false);

            // الشرفة تبرز عن البدن: ظلّها هو ما يميّز البرج عن عمود
            p.Timber.AddCylinder(new Vector3(0f, Height, 0f), 2.30f, 2.30f, 0.34f, Sides, 0.5f, true);

            // الشرفات: مكعّبات على المحيط، واحد يُترك فتحةً بينها
            for (int i = 0; i < Sides; i++)
            {
                float a = (float)i / Sides * Mathf.PI * 2f;
                p.Stone.AddBox(
                    new Vector3(Mathf.Cos(a) * 1.95f, Height + 0.95f, Mathf.Sin(a) * 1.95f),
                    new Vector3(0.85f, 1.20f, 0.60f), -a, 0.6f);
            }

            p.Timber.AddCylinder(new Vector3(0f, Height + 0.34f, 0f), 1.72f, 1.72f, 0.18f, Sides, 0.5f, true);
        }

        /// <summary>ثكنة: قاعة طويلة منخفضة بسقف قرميد وبابين.</summary>
        private static void Barracks(Parts p, ref TexRandom rng)
        {
            const float W = 11.5f;
            const float D = 5.6f;
            float rot = (rng.Next() - 0.5f) * 0.18f;

            p.Stone.AddBox(new Vector3(0f, 0.40f, 0f), new Vector3(W + 0.6f, 0.80f, D + 0.6f), rot, 0.35f);
            p.Stone.AddBox(new Vector3(0f, 2.10f, 0f), new Vector3(W, 2.60f, D), rot, 0.32f);

            p.Timber.AddBox(new Vector3(0f, 3.42f, 0f), new Vector3(W + 0.20f, 0.28f, D + 0.20f), rot, 0.5f);
            p.Thatch.AddGableRoof(new Vector3(0f, 3.56f, 0f), W, D, 1.85f, rot, 0.30f, 0.50f);
            p.Thatch.AddGableEnd(new Vector3(0f, 3.56f, 0f), W, 1.85f, rot, D * 0.5f, 0.30f);
            p.Thatch.AddGableEnd(new Vector3(0f, 3.56f, 0f), W, 1.85f, rot, -D * 0.5f, 0.30f);

            // دعامات خارجية: تقول «ثكنة» لا «بيت طويل»
            for (int i = -2; i <= 2; i++)
            {
                p.Timber.AddBox(new Vector3(i * 2.4f, 1.70f, (D * 0.5f) + 0.22f),
                    new Vector3(0.40f, 3.40f, 0.44f), rot, 0.6f);
            }
        }

        /// <summary>معسكر رماة: خيمتان ومنصّة رمي ووتد أعلام.</summary>
        private static void ArcherCamp(Parts p, ref TexRandom rng)
        {
            p.Timber.AddBox(new Vector3(0f, 0.30f, 0f), new Vector3(9.0f, 0.60f, 7.0f), 0f, 0.4f);

            for (int i = 0; i < 2; i++)
            {
                float x = i == 0 ? -2.4f : 2.6f;
                float z = i == 0 ? -0.8f : 1.0f;
                float rot = (rng.Next() - 0.5f) * 0.6f;

                // الخيمة مخروط رباعي: قاعدة عريضة تنتهي بقمّة
                p.Thatch.AddCylinder(new Vector3(x, 0.60f, z), 2.05f, 0.05f, 2.85f, 4, 0.5f, false);
                p.Timber.AddBox(new Vector3(x, 1.75f, z), new Vector3(0.18f, 3.60f, 0.18f), rot, 0.6f);
            }

            // منصّة الرمي على الحافّة الأمامية
            p.Timber.AddBox(new Vector3(0f, 0.95f, 3.05f), new Vector3(7.2f, 0.70f, 1.30f), 0f, 0.45f);
            p.Timber.AddBox(new Vector3(0f, 1.75f, 3.62f), new Vector3(7.2f, 0.90f, 0.22f), 0f, 0.55f);
        }

        /// <summary>جدار: مقطع سور قصير بشرفات — يُبنى على عقد البوّابة وحدها.</summary>
        private static void Wall(Parts p, ref TexRandom rng)
        {
            const float W = 10.0f;

            p.Stone.AddBox(new Vector3(0f, 0.45f, 0f), new Vector3(W, 0.90f, 3.10f), 0f, 0.30f);
            p.Stone.AddBox(new Vector3(0f, 2.55f, 0f), new Vector3(W - 0.7f, 3.30f, 2.40f), 0f, 0.30f);
            p.Stone.AddBox(new Vector3(0f, 4.32f, 0f), new Vector3(W - 0.4f, 0.24f, 2.80f), 0f, 0.45f);

            for (int i = -3; i <= 3; i++)
            {
                if (i % 2 != 0)
                {
                    continue;      // فتحة بين كل سنّتين: هذا ما يجعله سوراً لا لوحاً
                }

                p.Stone.AddBox(new Vector3(i * 1.45f, 5.00f, 0f),
                    new Vector3(1.15f, 1.20f, 2.40f), 0f, 0.5f);
            }
        }
    }
}
