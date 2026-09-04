using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>
    /// زعماء §13 الأربعة — مبنيّون إجرائياً من أدوات البناء نفسها (أنبوب،
    /// كتلة، مِخرطة، كرة مشوّهة). **لا أصل مأخوذ من أي مصدر خارجي**.
    ///
    /// القاعدة الحاكمة: الزعيم يُعرَف من **صورته الظلّية على بُعد الكاميرا**
    /// قبل أن يُقرأ اسمه على اللافتة. فلكلٍّ صورةٌ لا تشبه الأخرى ولا تشبه
    /// جنديّاً مكبَّراً:
    ///
    ///   • كبش الجرس — أفقيٌّ منخفض على أربع، قرنان لولبيّان وجرسٌ متدلٍّ.
    ///   • أمّ المستنقع — كتلة منتفخة عريضة القاعدة، وأكياس بيضٍ على ظهرها.
    ///   • تاج الرماد — عمودٌ نحيل طويل بلا رجلين، وتاجٌ من شُعبٍ فوق فراغ.
    ///   • آكل الفجر — فمٌ عريض أفقيّ يعلوه هلالٌ من الأنياب، وذراعان طويلتان.
    ///
    /// ويلتزم كلٌّ منها **أرقام المفاصل نفسها** في `CharacterMeshFactory.Limb`،
    /// فيحرّكها `CharacterAnimator` بلا شيفرة خاصّة — ولولا ذلك لَما وقع ضربُ
    /// الزعيم أصلاً: `CombatDirector` يوقع الضرر عند لحظة الضربة المرئيّة،
    /// ووحدةٌ بلا مُحرِّك تخرج من دالّة الضرر عند أوّل سطر.
    /// </summary>
    public static class BossMeshFactory
    {
        public enum Kind
        {
            BellRam,
            MireMatron,
            AshCrown,
            EaterOfDawn,
        }

        private static readonly Color Hide = new Color(0.267f, 0.239f, 0.216f);
        private static readonly Color HideDark = new Color(0.180f, 0.165f, 0.153f);
        private static readonly Color Horn = new Color(0.639f, 0.596f, 0.518f);
        private static readonly Color Bronze = new Color(0.545f, 0.412f, 0.208f);
        private static readonly Color Mire = new Color(0.278f, 0.333f, 0.243f);
        private static readonly Color MireWet = new Color(0.196f, 0.243f, 0.180f);
        private static readonly Color EggShell = new Color(0.478f, 0.510f, 0.376f);
        private static readonly Color Ash = new Color(0.318f, 0.298f, 0.318f);
        private static readonly Color Ember = new Color(0.729f, 0.376f, 0.180f);
        private static readonly Color Void = new Color(0.098f, 0.086f, 0.110f);
        private static readonly Color Fang = new Color(0.812f, 0.784f, 0.706f);

        public static CharacterMeshFactory.Parts Build(uint seed, Kind kind)
        {
            MeshBuilder body = new MeshBuilder();
            MeshBuilder cloth = new MeshBuilder();
            cloth.SetTint(1f, 1f, 1f);

            switch (kind)
            {
                case Kind.BellRam: BellRam(body, cloth, seed); break;
                case Kind.MireMatron: MireMatron(body, cloth, seed); break;
                case Kind.AshCrown: AshCrown(body, cloth, seed); break;
                default: EaterOfDawn(body, cloth, seed); break;
            }

            CharacterMeshFactory.Parts parts;
            parts.Body = body.ToMesh("Dawnkeep_Boss_" + kind + "_Body", true);
            parts.Cloth = cloth.ToMesh("Dawnkeep_Boss_" + kind + "_Cloth", true);
            return parts;
        }

        /// <summary>أنبوبٌ بلون. الأداة تأخذ لونها من الصبغة لا من وسائطها.</summary>
        private static void Tube(MeshBuilder mb, Color tint, Vector3 from, Vector3 to,
            float radiusFrom, float radiusTo, int sides)
        {
            mb.SetTint(tint.r, tint.g, tint.b);
            mb.AddTube(from, to, radiusFrom, radiusTo, sides, 1f, 0f, 0f, 0f);
        }

        private static void Blob(MeshBuilder mb, Color tint, Vector3 centre, Vector3 radii,
            int rings, int segments, float roughness, uint seed)
        {
            mb.SetTint(tint.r, tint.g, tint.b);
            mb.AddDeformedSphere(centre, radii, rings, segments, roughness, seed);
        }

        private static void Block(MeshBuilder mb, Color tint, Vector3 centre, Vector3 size)
        {
            mb.SetTint(tint.r, tint.g, tint.b);
            mb.AddBox(centre, size, 0f, 1f);
        }

        // ── كبش الجرس ───────────────────────────────────────────────────────

        /// <summary>
        /// أفقيٌّ على أربع، صدره أضخم من كفله فيُقرأ اتّجاه اندفاعه من صورته
        /// وحدها قبل أن يتحرّك — وهو ما يجعل إنذار §13 مفهوماً لا مجرّد وميض.
        /// </summary>
        private static void BellRam(MeshBuilder body, MeshBuilder cloth, uint seed)
        {
            body.SetLimb(CharacterMeshFactory.Limb.Chest);
            Tube(body, Hide, new Vector3(0f, 0.62f, 0.34f), new Vector3(0f, 0.56f, -0.40f),
                0.30f, 0.22f, 12);

            body.SetLimb(CharacterMeshFactory.Limb.Head);
            Tube(body, Hide, new Vector3(0f, 0.60f, 0.34f), new Vector3(0f, 0.50f, 0.62f),
                0.20f, 0.15f, 10);
            Blob(body, HideDark, new Vector3(0f, 0.48f, 0.70f),
                new Vector3(0.15f, 0.14f, 0.19f), 8, 12, 0.06f, seed + 17u);

            Horns(body, 0.104f, 0.50f, 0.70f);
            Horns(body, -0.104f, 0.50f, 0.70f);

            // القوائم الأربع على مفاصل الأرجل والذراعين، فيمشي المُحرِّك بها
            RamLeg(body, 0.16f, 0.26f, CharacterMeshFactory.Limb.LegLeftUpper,
                CharacterMeshFactory.Limb.LegLeftLower);
            RamLeg(body, -0.16f, 0.26f, CharacterMeshFactory.Limb.LegRightUpper,
                CharacterMeshFactory.Limb.LegRightLower);
            RamLeg(body, 0.15f, -0.30f, CharacterMeshFactory.Limb.ArmLeftUpper,
                CharacterMeshFactory.Limb.ArmLeftLower);
            RamLeg(body, -0.15f, -0.30f, CharacterMeshFactory.Limb.ArmRightUpper,
                CharacterMeshFactory.Limb.ArmRightLower);

            // الجرس المحطَّم تحت العنق: هو اسمه وعلامته
            body.SetLimb(CharacterMeshFactory.Limb.Head);
            Tube(body, Bronze, new Vector3(0f, 0.40f, 0.46f), new Vector3(0f, 0.22f, 0.46f),
                0.018f, 0.018f, 6);
            Tube(body, Bronze, new Vector3(0f, 0.24f, 0.46f), new Vector3(0f, 0.06f, 0.46f),
                0.10f, 0.17f, 12);

            body.ClearLimb();
            body.ClearTint();
            cloth.ClearLimb();
        }

        private static void Horns(MeshBuilder mb, float x, float y, float z)
        {
            const int Steps = 7;
            Vector3 previous = new Vector3(x, y + 0.10f, z - 0.02f);
            float radius = 0.055f;

            for (int i = 1; i <= Steps; i++)
            {
                float t = (float)i / Steps;
                float angle = t * Mathf.PI * 1.45f;
                Vector3 next = new Vector3(
                    x + (Mathf.Sin(angle) * 0.11f * (0.6f + t)),
                    y + 0.10f + (Mathf.Cos(angle * 0.6f) * 0.06f) - (t * 0.05f),
                    z - 0.02f - (t * 0.24f));

                float nextRadius = radius * 0.82f;
                Tube(mb, Horn, previous, next, radius, nextRadius, 8);
                previous = next;
                radius = nextRadius;
            }
        }

        private static void RamLeg(MeshBuilder mb, float x, float z, float upper, float lower)
        {
            mb.SetLimb(upper);
            Tube(mb, Hide, new Vector3(x, 0.52f, z), new Vector3(x, 0.28f, z), 0.070f, 0.055f, 7);
            mb.SetLimb(lower);
            Tube(mb, HideDark, new Vector3(x, 0.28f, z), new Vector3(x, 0.03f, z), 0.055f, 0.042f, 7);
            Block(mb, HideDark, new Vector3(x, 0.025f, z + 0.02f), new Vector3(0.09f, 0.05f, 0.11f));
        }

        // ── أمّ المستنقع ────────────────────────────────────────────────────

        /// <summary>
        /// قاعدةٌ عريضة وبطنٌ منتفخ ورأسٌ صغير: صورةٌ تقول «لا تتحرّك كثيراً»
        /// قبل أن يراها اللاعب تتحرّك، فيفهم أنّ خطرها فيما تضعه لا فيما تلحقه.
        /// </summary>
        private static void MireMatron(MeshBuilder body, MeshBuilder cloth, uint seed)
        {
            body.SetLimb(CharacterMeshFactory.Limb.Root);
            Tube(body, MireWet, new Vector3(0f, 0f, 0f), new Vector3(0f, 0.16f, 0f),
                0.34f, 0.30f, 14);

            body.SetLimb(CharacterMeshFactory.Limb.Chest);
            Blob(body, Mire, new Vector3(0f, 0.40f, 0f),
                new Vector3(0.34f, 0.32f, 0.31f), 10, 16, 0.10f, seed + 41u);

            body.SetLimb(CharacterMeshFactory.Limb.Head);
            Blob(body, MireWet, new Vector3(0f, 0.74f, 0.04f),
                new Vector3(0.13f, 0.12f, 0.13f), 8, 12, 0.05f, seed + 43u);

            MatronArm(body, 0.30f, CharacterMeshFactory.Limb.ArmLeftUpper,
                CharacterMeshFactory.Limb.ArmLeftLower);
            MatronArm(body, -0.30f, CharacterMeshFactory.Limb.ArmRightUpper,
                CharacterMeshFactory.Limb.ArmRightLower);

            // أكياس البيض على الظهر — في **البدن** لا القماش: القماش يأخذ
            // لون الراية، ولونُ الأكياس هو ما يقول للّاعب ماذا تحمل. صبغها
            // بلون الراية يُخفي المعلومة الوحيدة التي وُضعت من أجلها.
            body.SetLimb(CharacterMeshFactory.Limb.Chest);
            for (int i = 0; i < 5; i++)
            {
                float a = ((i / 5f) * Mathf.PI) - (Mathf.PI * 0.5f);
                Vector3 at = new Vector3(Mathf.Sin(a) * 0.24f,
                    0.52f + (Mathf.Cos(a * 2f) * 0.06f),
                    -0.22f - (Mathf.Cos(a) * 0.05f));
                Blob(body, EggShell, at, new Vector3(0.075f, 0.085f, 0.075f), 6, 9, 0.06f,
                    seed + (uint)(300 + i));
            }

            body.ClearLimb();
            body.ClearTint();
            cloth.ClearLimb();
            cloth.SetTint(1f, 1f, 1f);
        }

        private static void MatronArm(MeshBuilder mb, float x, float upper, float lower)
        {
            float side = Mathf.Sign(x);
            mb.SetLimb(upper);
            Tube(mb, Mire, new Vector3(x, 0.52f, 0f), new Vector3(x + (side * 0.06f), 0.34f, 0.04f),
                0.062f, 0.050f, 7);
            mb.SetLimb(lower);
            Tube(mb, MireWet, new Vector3(x + (side * 0.06f), 0.34f, 0.04f),
                new Vector3(x + (side * 0.08f), 0.16f, 0.10f), 0.050f, 0.038f, 7);
        }

        // ── تاج الرماد ──────────────────────────────────────────────────────

        /// <summary>
        /// عمودٌ نحيل يعلو فراغاً: لا رجلين ولا قدمين، وطرفه السفليّ يتلاشى.
        /// طور الظلّ ليس تغيير لون بل **غياب أرضٍ يقف عليها** — والصورة تقوله
        /// قبل أن يقوله الرقم. وجذعه **قماش**، فلونه يتبع الطور.
        /// </summary>
        private static void AshCrown(MeshBuilder body, MeshBuilder cloth, uint seed)
        {
            cloth.SetLimb(CharacterMeshFactory.Limb.Root);
            Tube(cloth, Color.white, new Vector3(0f, 0.06f, 0f), new Vector3(0f, 0.46f, 0f),
                0.06f, 0.20f, 12);

            cloth.SetLimb(CharacterMeshFactory.Limb.Chest);
            Tube(cloth, Color.white, new Vector3(0f, 0.46f, 0f), new Vector3(0f, 0.86f, 0f),
                0.20f, 0.14f, 12);

            body.SetLimb(CharacterMeshFactory.Limb.Head);
            Blob(body, Void, new Vector3(0f, 0.94f, 0.01f),
                new Vector3(0.105f, 0.115f, 0.105f), 8, 12, 0.04f, seed + 51u);

            // سبع شُعبٍ غير متساوية: تاجٌ متناظر يُقرأ زينةً لا تهديداً
            float[] spike = { 0.16f, 0.10f, 0.19f, 0.12f, 0.17f, 0.09f, 0.14f };
            for (int i = 0; i < spike.Length; i++)
            {
                float a = (i / (float)spike.Length) * Mathf.PI * 2f;
                Vector3 root = new Vector3(Mathf.Cos(a) * 0.10f, 1.02f, Mathf.Sin(a) * 0.10f);
                Vector3 tip = new Vector3(Mathf.Cos(a) * 0.13f, 1.02f + spike[i], Mathf.Sin(a) * 0.13f);
                Tube(body, Ember, root, tip, 0.022f, 0.004f, 6);
            }

            CrownArm(body, 1f);
            CrownArm(body, -1f);

            body.ClearLimb();
            body.ClearTint();
            cloth.ClearLimb();
            cloth.SetTint(1f, 1f, 1f);
        }

        private static void CrownArm(MeshBuilder mb, float side)
        {
            float upper = side > 0f
                ? CharacterMeshFactory.Limb.ArmLeftUpper
                : CharacterMeshFactory.Limb.ArmRightUpper;
            float lower = side > 0f
                ? CharacterMeshFactory.Limb.ArmLeftLower
                : CharacterMeshFactory.Limb.ArmRightLower;

            mb.SetLimb(upper);
            Tube(mb, Ash, new Vector3(side * 0.15f, 0.80f, 0f),
                new Vector3(side * 0.22f, 0.56f, 0.03f), 0.040f, 0.030f, 6);
            mb.SetLimb(lower);
            Tube(mb, Void, new Vector3(side * 0.22f, 0.56f, 0.03f),
                new Vector3(side * 0.26f, 0.30f, 0.08f), 0.030f, 0.018f, 6);
        }

        // ── آكل الفجر ───────────────────────────────────────────────────────

        /// <summary>
        /// عريضٌ أفقيّ، فمُه أوسع من كتفيه: زعيم الحملة يجب أن يُقرأ **أكبر**
        /// من كل ما سبقه في اللمحة الأولى، والعرض أظهر من الطول على كاميرا
        /// مائلة — الطول تبتلعه الزاوية.
        /// </summary>
        private static void EaterOfDawn(MeshBuilder body, MeshBuilder cloth, uint seed)
        {
            body.SetLimb(CharacterMeshFactory.Limb.Chest);
            Blob(body, Void, new Vector3(0f, 0.58f, 0f),
                new Vector3(0.46f, 0.30f, 0.28f), 10, 18, 0.09f, seed + 61u);

            body.SetLimb(CharacterMeshFactory.Limb.Head);
            Blob(body, new Color(0.055f, 0.047f, 0.063f), new Vector3(0f, 0.50f, 0.22f),
                new Vector3(0.40f, 0.13f, 0.16f), 8, 16, 0.05f, seed + 63u);

            for (int i = 0; i < 11; i++)
            {
                float t = (i / 10f) - 0.5f;
                float x = t * 0.68f;
                float drop = 0.10f - (Mathf.Abs(t) * 0.10f);
                Tube(body, Fang, new Vector3(x, 0.56f, 0.30f),
                    new Vector3(x, 0.56f - 0.05f - drop, 0.31f), 0.020f, 0.003f, 5);
            }

            EaterArm(body, 1f);
            EaterArm(body, -1f);
            EaterLeg(body, 1f);
            EaterLeg(body, -1f);

            // شقّان متوهّجان مكان العينين — قماشٌ فيأخذ لون الطور
            cloth.SetLimb(CharacterMeshFactory.Limb.Chest);
            Block(cloth, Color.white, new Vector3(0.15f, 0.68f, 0.25f),
                new Vector3(0.13f, 0.035f, 0.02f));
            Block(cloth, Color.white, new Vector3(-0.15f, 0.68f, 0.25f),
                new Vector3(0.13f, 0.035f, 0.02f));

            body.ClearLimb();
            body.ClearTint();
            cloth.ClearLimb();
            cloth.SetTint(1f, 1f, 1f);
        }

        private static void EaterArm(MeshBuilder mb, float side)
        {
            float upper = side > 0f
                ? CharacterMeshFactory.Limb.ArmLeftUpper
                : CharacterMeshFactory.Limb.ArmRightUpper;
            float lower = side > 0f
                ? CharacterMeshFactory.Limb.ArmLeftLower
                : CharacterMeshFactory.Limb.ArmRightLower;

            mb.SetLimb(upper);
            Tube(mb, Void, new Vector3(side * 0.40f, 0.66f, -0.02f),
                new Vector3(side * 0.56f, 0.38f, 0.06f), 0.075f, 0.058f, 8);
            mb.SetLimb(lower);
            Tube(mb, Void, new Vector3(side * 0.56f, 0.38f, 0.06f),
                new Vector3(side * 0.62f, 0.05f, 0.14f), 0.058f, 0.036f, 8);
        }

        private static void EaterLeg(MeshBuilder mb, float side)
        {
            float upper = side > 0f
                ? CharacterMeshFactory.Limb.LegLeftUpper
                : CharacterMeshFactory.Limb.LegRightUpper;
            float lower = side > 0f
                ? CharacterMeshFactory.Limb.LegLeftLower
                : CharacterMeshFactory.Limb.LegRightLower;

            mb.SetLimb(upper);
            Tube(mb, Void, new Vector3(side * 0.15f, 0.36f, 0f),
                new Vector3(side * 0.17f, 0.18f, 0f), 0.085f, 0.070f, 8);
            mb.SetLimb(lower);
            Tube(mb, Void, new Vector3(side * 0.17f, 0.18f, 0f),
                new Vector3(side * 0.18f, 0.02f, 0.03f), 0.070f, 0.055f, 8);
        }
    }
}
