using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Bosses;
using Dawnkeep.CameraRig;
using Dawnkeep.Combat;
using Dawnkeep.Localization;
using Dawnkeep.Rendering;
using Dawnkeep.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// زعماء §13 الأربعة: شبكاتهم وجاهزاتهم وتعريفاتهم، ثمّ ربطهم بقائد
    /// الموجات فتُنتجهم ليالي الخمس والعشر (§14).
    ///
    /// أرقامهم كلّها من §13 حرفياً حيث نصّت (الإنذار ١٫٤ ث، نصف الصحّة،
    /// ثلاث شحنات، مبنيان موسومان، ثلاثة أطوار)، وما لم تنصّ عليه فأرقامٌ
    /// أصلية موضوعة هنا في الأصل لا في الكود (§1).
    ///
    /// **توفيق بين ثلاثة نصوص**: §5 تُنهي الحملة بالنجاة من عشر ليالٍ، و§13
    /// تسمّي آكل الفجر «زعيم الحملة»، و§14 تجعل الزعيم الكامل كل عشر والصغير
    /// كل خمس. فآكل الفجر **كامل** يُعلَّم في العاشرة: هو ختام الحملة كما
    /// نصّت §13 وفي ليلتها التي حدّدتها §5. والثلاثة الباقون **صغار**
    /// يتناوبون على ليالي الخمس — فيلقاه اللاعب في الخامسة كبشُ الجرس، ثمّ
    /// في العاشرة آكلُ الفجر، ثمّ يدور الباقون فيما بعد الحملة.
    ///
    /// ولولا هذا التوفيق لَما رأى اللاعب زعيم الحملة أصلاً: تعليمه في
    /// العشرين يجعله خلف نهاية المرحلة بعشر ليالٍ.
    /// </summary>
    public static class DawnkeepBossSetup
    {
        public const string BossFolder = DawnkeepAssetPaths.Settings + "/Bosses";

        /// <summary>الزعيم أضخم من الجنديّ: مقياسه يقول ذلك قبل شريط صحّته.</summary>
        private static readonly float[] Scale = { 4.6f, 4.2f, 4.4f, 6.2f };

        private static readonly List<LocaleTable.Entry> Rows = new List<LocaleTable.Entry>(16);

        [MenuItem("مملكة الرماد/13) الزعماء الأربعة", false, 13)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(BossFolder);
            Rows.Clear();

            BuildPrefabs();
            GameObject egg = BuildEgg();
            GameObject hazard = BuildHazard();

            UnitDefinition gloom = Load<UnitDefinition>(
                DawnkeepCombatSetup.CombatFolder + "/Unit_Duskling.asset");
            UnitDefinition brute = Load<UnitDefinition>(
                DawnkeepCombatSetup.CombatFolder + "/Unit_Brute.asset");

            BossDefinition[] bosses =
            {
                MakeBellRam(gloom),
                MakeMatron(gloom),
                MakeAshCrown(),
                MakeEater(gloom, brute),
            };

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(bosses, egg, hazard);
            Debug.Log("مملكة الرماد: الزعماء الأربعة جاهزون في " + BossFolder);
        }

        // ── الجاهزات ────────────────────────────────────────────────────────

        private static void BuildPrefabs()
        {
            Material bodyMaterial = Load<Material>(
                DawnkeepAssetPaths.Materials + "/Dawnkeep_FolkBody.mat");
            Material clothMaterial = Load<Material>(
                DawnkeepAssetPaths.Materials + "/Dawnkeep_FolkCloth.mat");

            for (int i = 0; i < 4; i++)
            {
                BossMeshFactory.Kind kind = (BossMeshFactory.Kind)i;
                CharacterMeshFactory.Parts parts =
                    BossMeshFactory.Build((uint)(95001 + (i * 1009)), kind);

                Mesh body = SaveMesh(parts.Body, "Boss_" + kind + "_Body");
                Mesh cloth = SaveMesh(parts.Cloth, "Boss_" + kind + "_Cloth");

                GameObject root = new GameObject("Dawnkeep_Boss_" + kind);
                root.transform.localScale = Vector3.one * Scale[i];

                AddPiece(root, "Body", body, bodyMaterial);
                AddPiece(root, "Cloth", cloth, clothMaterial);

                root.AddComponent<Dawnkeep.Characters.CharacterAnimator>();
                root.AddComponent<Unit>();
                root.AddComponent<Boss>();

                CapsuleCollider collider = root.AddComponent<CapsuleCollider>();
                collider.radius = 0.30f;
                collider.height = 1.1f;
                collider.center = new Vector3(0f, 0.55f, 0f);

                PrefabUtility.SaveAsPrefabAsset(root, PrefabPath(kind));
                Object.DestroyImmediate(root);
            }
        }

        public static string PrefabPath(BossMeshFactory.Kind kind)
        {
            return DawnkeepAssetPaths.Prefabs + "/Dawnkeep_Boss_" + kind + ".prefab";
        }

        /// <summary>
        /// البيضة: كرة مشوّهة على قاعدة. صغيرة لكن ظاهرة — والتوهّج يقول
        /// كم بقي حتى الفقس، فتحطيمها قرارٌ لا مفاجأة (§13).
        /// </summary>
        private static GameObject BuildEgg()
        {
            string path = DawnkeepAssetPaths.Prefabs + "/Dawnkeep_BossEgg.prefab";

            MeshBuilder mb = new MeshBuilder();
            mb.SetTint(1f, 1f, 1f);
            mb.AddDeformedSphere(new Vector3(0f, 0.34f, 0f), new Vector3(0.26f, 0.34f, 0.26f),
                8, 12, 0.09f, 9601u);
            mb.AddCylinder(new Vector3(0f, 0f, 0f), 0.22f, 0.18f, 0.08f, 10, 1f, true);

            Mesh mesh = SaveMesh(mb.ToMesh("Dawnkeep_BossEgg", true), "BossEgg");

            GameObject root = new GameObject("Dawnkeep_BossEgg");
            AddPiece(root, "Shell", mesh,
                Load<Material>(DawnkeepAssetPaths.Materials + "/Dawnkeep_FolkCloth.mat"));
            root.AddComponent<BossEgg>();

            GameObject saved = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return saved;
        }

        /// <summary>
        /// قرص الخطر: نصف قطرٍ **واحد** يتّسع بالمقياس، ولونه من `MaterialProperty
        /// Block` عند الوضع. شبكةٌ لكل نصف قطر تعني شبكةً جديدة كل ستّ ثوانٍ،
        /// وشبكةٌ لكل لون تعني نسختين لشيءٍ واحد — وكلاهما ممنوع (§1).
        /// </summary>
        private static GameObject BuildHazard()
        {
            string path = DawnkeepAssetPaths.Prefabs + "/Dawnkeep_Hazard.prefab";

            MeshBuilder mb = new MeshBuilder();
            mb.SetTint(1f, 1f, 1f);
            mb.AddCylinder(new Vector3(0f, 0f, 0f), 1f, 0.94f, 0.035f, 24, 1f, true);

            Mesh mesh = SaveMesh(mb.ToMesh("Dawnkeep_Hazard", true), "Hazard");

            GameObject root = new GameObject("Dawnkeep_Hazard");
            AddPiece(root, "Surface", mesh,
                Load<Material>(DawnkeepAssetPaths.Materials + "/Dawnkeep_FolkCloth.mat"));
            root.AddComponent<Hazard>();

            GameObject saved = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return saved;
        }

        // ── التعريفات ───────────────────────────────────────────────────────

        /// <summary>
        /// كبش الجرس: إنذار ١٫٤ ث ثمّ اندفاع بخطٍّ مستقيم (§13). ثمنه من
        /// ميزانية §14 خمسةٌ وعشرون — نحو نصف ميزانية الليلة الخامسة، فتبقى
        /// لحاشيته حصّة تُقرأ.
        /// </summary>
        private static BossDefinition MakeBellRam(UnitDefinition summon)
        {
            BossDefinition def = Make("Boss_BellRam", "كبش الجرس", "The Bell-Ram",
                BossKind.BellRam, BossMeshFactory.Kind.BellRam,
                health: 2600f, armour: 0.28f, speed: 2.9f, damage: 44f,
                range: 3.4f, interval: 1.6f, darkArmour: 0.20f, bounty: 90,
                threat: 25, taughtOn: 5, rank: BossRank.Mini, bulk: 3.2f);

            SetPrivate(def, "telegraphSeconds", 1.4f);      // §13 حرفياً
            SetPrivate(def, "chargeInterval", 11f);
            SetPrivate(def, "chargeSpeed", 16f);
            SetPrivate(def, "chargeRange", 34f);
            SetPrivate(def, "chargeDamage", 320f);
            SetPrivate(def, "chargeTrample", 46f);
            SetPrivate(def, "chargeStopCharges", 3);        // §13: منطقة نور ممتلئة
            SetPrivate(def, "summonAtHealth", 0.5f);        // §13: بعد فقدان النصف
            SetPrivate(def, "summon", summon);
            SetPrivate(def, "summonCount", 4);
            SetPrivate(def, "summonInterval", 9f);
            return def;
        }

        private static BossDefinition MakeMatron(UnitDefinition brood)
        {
            BossDefinition def = Make("Boss_MireMatron", "أمّ المستنقع", "Mire Matron",
                BossKind.MireMatron, BossMeshFactory.Kind.MireMatron,
                health: 2200f, armour: 0.18f, speed: 2.1f, damage: 26f,
                range: 3.0f, interval: 1.9f, darkArmour: 0.34f, bounty: 90,
                threat: 25, taughtOn: 10, rank: BossRank.Mini, bulk: 3.0f);

            SetPrivate(def, "poolInterval", 6.5f);
            SetPrivate(def, "poolRadius", 7f);
            SetPrivate(def, "poolDamage", 11f);
            SetPrivate(def, "poolSeconds", 9f);
            SetPrivate(def, "eggInterval", 14f);
            SetPrivate(def, "eggCount", 3);
            SetPrivate(def, "eggHatchSeconds", 12f);
            SetPrivate(def, "eggHealth", 70f);
            SetPrivate(def, "eggBrood", 2);
            SetPrivate(def, "markCount", 2);                // §13: مزرعتان أو بيتان
            SetPrivate(def, "summon", brood);
            return def;
        }

        private static BossDefinition MakeAshCrown()
        {
            BossDefinition def = Make("Boss_AshCrown", "تاج الرماد", "The Ash Crown",
                BossKind.AshCrown, BossMeshFactory.Kind.AshCrown,
                health: 2400f, armour: 0.12f, speed: 3.4f, damage: 38f,
                range: 4.2f, interval: 1.35f, darkArmour: 0.46f, bounty: 110,
                threat: 30, taughtOn: 15, rank: BossRank.Mini, bulk: 2.4f);

            SetPrivate(def, "phaseSeconds", 10f);
            SetPrivate(def, "shadowDamageTaken", 0.30f);
            SetPrivate(def, "snuffInterval", 13f);
            SetPrivate(def, "snuffTelegraph", 1.6f);        // §13: المسار يُرى قبل الإطفاء
            SetPrivate(def, "snuffSeconds", 10f);
            return def;
        }

        private static BossDefinition MakeEater(UnitDefinition summon, UnitDefinition siege)
        {
            BossDefinition def = Make("Boss_EaterOfDawn", "آكل الفجر", "Eater of Dawn",
                BossKind.EaterOfDawn, BossMeshFactory.Kind.EaterOfDawn,
                health: 4800f, armour: 0.32f, speed: 2.6f, damage: 62f,
                range: 4.6f, interval: 1.5f, darkArmour: 0.40f, bounty: 220,
                threat: 55, taughtOn: 10, rank: BossRank.Full, bulk: 4.2f);

            SetPrivate(def, "secondPhaseAt", 0.66f);
            SetPrivate(def, "thirdPhaseAt", 0.33f);
            SetPrivate(def, "siege", siege);
            SetPrivate(def, "siegeCount", 6);
            SetPrivate(def, "sideSwapSeconds", 15f);
            SetPrivate(def, "lightDrainPerSecond", 0.05f);
            SetPrivate(def, "lightFloor", 0.25f);
            SetPrivate(def, "summon", summon);
            SetPrivate(def, "summonCount", 5);
            SetPrivate(def, "summonInterval", 11f);
            SetPrivate(def, "summonAtHealth", 0.66f);
            return def;
        }

        private static BossDefinition Make(string assetName, string display, string english,
            BossKind kind, BossMeshFactory.Kind mesh,
            float health, float armour, float speed, float damage, float range, float interval,
            float darkArmour, int bounty, int threat, int taughtOn, BossRank rank, float bulk)
        {
            string path = BossFolder + "/" + assetName + ".asset";
            BossDefinition def = AssetDatabase.LoadAssetAtPath<BossDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<BossDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "displayName", display);
            Rows.Add(DawnkeepLocale.Row(key, display, english));

            SetPrivate(def, "faction", Faction.Horde);
            SetPrivate(def, "targetClass", TargetClass.Structure);
            SetPrivate(def, "prefab", Load<GameObject>(PrefabPath(mesh)));
            SetPrivate(def, "livery", new Color(0.361f, 0.212f, 0.243f));
            SetPrivate(def, "maxHealth", health);
            SetPrivate(def, "armour", armour);
            SetPrivate(def, "darkArmour", darkArmour);
            SetPrivate(def, "bounty", bounty);
            SetPrivate(def, "moveSpeed", speed);
            SetPrivate(def, "damage", damage);
            SetPrivate(def, "attackRange", range);
            SetPrivate(def, "attackInterval", interval);
            SetPrivate(def, "ranged", false);
            SetPrivate(def, "sightRange", 34f);
            SetPrivate(def, "retargetInterval", 0.8f);

            // صنفه Boss فلا يُقسَم عليه سقف الصنف، وسربه واحدٌ دائماً
            SetPrivate(def, "threatCost", threat);
            SetPrivate(def, "taughtOnWave", taughtOn);
            SetPrivate(def, "threatClass", ThreatClass.Boss);
            SetPrivate(def, "minPack", 1);
            SetPrivate(def, "maxPack", 1);

            SetPrivate(def, "kind", kind);
            SetPrivate(def, "rank", rank);
            SetPrivate(def, "introSeconds", 1.1f);          // §6: لا تتجاوز 1.2
            SetPrivate(def, "bulk", bulk);

            EditorUtility.SetDirty(def);
            return def;
        }

        // ── الربط بالمشهد ───────────────────────────────────────────────────

        private static void WireScene(BossDefinition[] bosses, GameObject egg, GameObject hazard)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            GameObject battle = GameObject.Find("Battle");
            if (battle == null)
            {
                Debug.LogWarning("مملكة الرماد: لا كائن Battle — نفّذ القائمة 6 أوّلاً.");
                return;
            }

            WaveDirector waves = battle.GetComponent<WaveDirector>();
            BossDirector director = battle.GetComponent<BossDirector>();
            if (director == null)
            {
                director = battle.AddComponent<BossDirector>();
            }

            BossIntro intro = battle.GetComponent<BossIntro>();
            if (intro == null)
            {
                intro = battle.AddComponent<BossIntro>();
            }

            intro.Configure(Object.FindAnyObjectByType<RtsCameraRig>(),
                Object.FindAnyObjectByType<BattleHud>());
            HazardField hazards = battle.GetComponent<HazardField>();
            if (hazards == null)
            {
                hazards = battle.AddComponent<HazardField>();
            }

            hazards.Configure(hazard);
            director.Configure(waves, egg, intro);

            // الزعماء يُضافون إلى كتالوج التوليد لا إلى الموجات المصمَّمة:
            // §14 تُخرجهم كل خمس وعشر، ووضعُهم في موجةٍ بعينها يجعل ظهورهم
            // ثابتاً مهما تغيّرت البذرة.
            if (waves != null)
            {
                AppendCatalogue(waves, bosses);
            }

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
        }

        private static void AppendCatalogue(WaveDirector waves, BossDefinition[] bosses)
        {
            FieldInfo field = typeof(WaveDirector).GetField("catalogue",
                BindingFlags.Instance | BindingFlags.NonPublic);

            if (field == null)
            {
                Debug.LogWarning("مملكة الرماد: لا حقل catalogue في WaveDirector.");
                return;
            }

            UnitDefinition[] current = field.GetValue(waves) as UnitDefinition[];
            List<UnitDefinition> merged = new List<UnitDefinition>(
                current != null ? current : new UnitDefinition[0]);

            for (int i = 0; i < bosses.Length; i++)
            {
                if (bosses[i] != null && !merged.Contains(bosses[i]))
                {
                    merged.Add(bosses[i]);
                }
            }

            field.SetValue(waves, merged.ToArray());
            EditorUtility.SetDirty(waves);
        }

        // ── أدوات ───────────────────────────────────────────────────────────

        private static T Load<T>(string path) where T : Object
        {
            return AssetDatabase.LoadAssetAtPath<T>(path);
        }

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                AssetDatabase.CreateFolder(System.IO.Path.GetDirectoryName(path).Replace('\\', '/'),
                    System.IO.Path.GetFileName(path));
            }
        }

        private static Mesh SaveMesh(Mesh mesh, string name)
        {
            string path = DawnkeepAssetPaths.Meshes + "/Dawnkeep_" + name + ".asset";
            Mesh existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);

            if (existing == null)
            {
                mesh.name = "Dawnkeep_" + name;
                AssetDatabase.CreateAsset(mesh, path);
                return mesh;
            }

            // uv2 تحمل رقم المفصل: إسقاطها يجمّد الزعيم في وضع الراحة
            existing.Clear();
            existing.indexFormat = mesh.indexFormat;
            existing.vertices = mesh.vertices;
            existing.normals = mesh.normals;
            existing.uv = mesh.uv;
            existing.uv2 = mesh.uv2;
            existing.colors = mesh.colors;
            existing.triangles = mesh.triangles;
            existing.RecalculateTangents();
            existing.RecalculateBounds();
            EditorUtility.SetDirty(existing);
            Object.DestroyImmediate(mesh);
            return existing;
        }

        private static void AddPiece(GameObject parent, string name, Mesh mesh, Material material)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent.transform, false);

            MeshFilter filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        }

        private static void SetPrivate(object target, string field, object value)
        {
            if (target == null)
            {
                return;
            }

            FieldInfo info = null;
            System.Type type = target.GetType();

            // الصعود إلى الأصل: حقول `UnitDefinition` معلنة فيه لا في الوارث،
            // و`GetField` لا يرى الخاصّ في الأصل من نوع الابن.
            while (type != null && info == null)
            {
                info = type.GetField(field,
                    BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);
                type = type.BaseType;
            }

            if (info == null)
            {
                Debug.LogWarning("مملكة الرماد: لا حقل باسم " + field
                    + " في " + target.GetType().Name);
                return;
            }

            info.SetValue(target, value);
        }
    }
}
