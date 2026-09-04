using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Characters;
using Dawnkeep.Combat;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة السادسة: إعداد القتال والموجات.
    ///
    /// يُنشئ تعريفات الوحدات والموجة الأولى كأصول (كل أرقام التوازن هناك لا في
    /// الكود — §1)، ثم يضع قادة المعركة في المشهد، ويُسنِد تعريفاً لكل فرد من
    /// حامية القلعة الموضوعة سلفاً فيصير مقاتلاً لا تمثالاً.
    ///
    /// يُنفَّذ بعد القائمة 5 (بناء مشهد العالم).
    /// </summary>
    public static class DawnkeepCombatSetup
    {
        public const string CombatFolder = DawnkeepAssetPaths.Settings + "/Combat";

        [MenuItem("مملكة الرماد/6) إعداد القتال والموجات", false, 6)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(CombatFolder);
            Rows.Clear();

            UnitDefinition spearman = MakeUnit("Unit_Spearman", "رمّاح", "Spearman", Faction.Kingdom,
                CharacterMeshFactory.Kind.Spearman, new Color(0.647f, 0.180f, 0.180f),
                health: 140f, armour: 0.20f, speed: 3.0f, damage: 14f,
                range: 2.6f, interval: 1.20f, ranged: false, sight: 22f, retarget: 0.5f,
                targetClass: TargetClass.Nearest);

            UnitDefinition swordsman = MakeUnit("Unit_Swordsman", "سيّاف", "Swordsman", Faction.Kingdom,
                CharacterMeshFactory.Kind.Swordsman, new Color(0.647f, 0.180f, 0.180f),
                health: 165f, armour: 0.28f, speed: 3.2f, damage: 17f,
                range: 1.9f, interval: 1.05f, ranged: false, sight: 20f, retarget: 0.5f,
                targetClass: TargetClass.Nearest);

            UnitDefinition archer = MakeUnit("Unit_Archer", "رامٍ", "Archer", Faction.Kingdom,
                CharacterMeshFactory.Kind.Archer, new Color(0.220f, 0.353f, 0.541f),
                health: 95f, armour: 0.05f, speed: 3.1f, damage: 21f,
                range: 17f, interval: 1.55f, ranged: true, sight: 26f, retarget: 0.6f,
                targetClass: TargetClass.Nearest);

            UnitDefinition hero = MakeUnit("Unit_Hero", "البطل", "Champion", Faction.Kingdom,
                CharacterMeshFactory.Kind.Hero, new Color(0.741f, 0.153f, 0.169f),
                health: 520f, armour: 0.35f, speed: 4.1f, damage: 38f,
                range: 2.4f, interval: 0.85f, ranged: false, sight: 30f, retarget: 0.35f,
                targetClass: TargetClass.Nearest);

            // المهاجمون: نفس الأشكال بألوان راية أخرى — أصالة الشكل محفوظة
            // والتمييز باللون، وهو أوضح ما يُقرأ على بُعد كاميرا الاستراتيجية.
            UnitDefinition raider = MakeUnit("Unit_Raider", "مُغِير", "Raider", Faction.Horde,
                CharacterMeshFactory.Kind.Swordsman, new Color(0.243f, 0.271f, 0.318f),
                health: 110f, armour: 0.10f, speed: 3.6f, damage: 12f,
                range: 1.9f, interval: 1.10f, ranged: false, sight: 24f, retarget: 0.5f,
                targetClass: TargetClass.Nearest, darkArmour: 0.18f, bounty: 6);

            UnitDefinition brute = MakeUnit("Unit_Brute", "غاشم مدرّع", "Armoured Brute", Faction.Horde,
                CharacterMeshFactory.Kind.Spearman, new Color(0.318f, 0.271f, 0.243f),
                health: 260f, armour: 0.34f, speed: 2.4f, damage: 22f,
                range: 2.6f, interval: 1.45f, ranged: false, sight: 22f, retarget: 0.7f,
                targetClass: TargetClass.Nearest, darkArmour: 0.22f, bounty: 14);

            UnitDefinition nightArcher = MakeUnit("Unit_NightArcher", "رامي الليل", "Night Archer", Faction.Horde,
                CharacterMeshFactory.Kind.Archer, new Color(0.353f, 0.239f, 0.416f),
                health: 80f, armour: 0.05f, speed: 3.2f, damage: 16f,
                range: 15f, interval: 1.75f, ranged: true, sight: 24f, retarget: 0.6f,
                targetClass: TargetClass.Ranged, darkArmour: 0.15f, bounty: 9);

            // وحدتا §11: الأولى تذوب في النور، والثانية تُطفئه.
            // درع ظلام عالٍ وصحّة زهيدة: خارج النور تصمد، وداخله تتساقط —
            // وهذا هو الدرس الذي يعلّم اللاعب قيمة الدائرة في موجة واحدة.
            UnitDefinition duskling = MakeUnit("Unit_Duskling", "وليد الغَسَق", "Duskling", Faction.Horde,
                CharacterMeshFactory.Kind.Swordsman, new Color(0.286f, 0.243f, 0.376f),
                health: 55f, armour: 0.02f, speed: 4.7f, damage: 9f,
                range: 1.8f, interval: 0.85f, ranged: false, sight: 26f, retarget: 0.45f,
                targetClass: TargetClass.Nearest, darkArmour: 0.62f, bounty: 4);

            // يمرّ بالمقاتلين إلى المنارة فيُطفئها ثماني ثوانٍ (§11). ضربه لا
            // يجرح أحداً: خطره أنّه يسلب المنطقة، فيوجب على اللاعب فكّ خطّه.
            UnitDefinition lampEater = MakeUnit("Unit_LampEater", "آكل القناديل", "Lamp Eater", Faction.Horde,
                CharacterMeshFactory.Kind.Spearman, new Color(0.208f, 0.196f, 0.271f),
                health: 165f, armour: 0.16f, speed: 3.5f, damage: 6f,
                range: 3.4f, interval: 1.60f, ranged: false, sight: 40f, retarget: 0.8f,
                targetClass: TargetClass.Beacon, darkArmour: 0.30f, bounty: 12);

            // ── بيانات توليد §14: ثمن التهديد، وأوّل ليلة يجوز فيها، وصنفه،
            // وحدّا سربه. الأثمان **نسبية** لا مطلقة: المُغير واحد، وما فوقه
            // يقاس به. ومعامل المنطقة في `WaveGenSettings` هو ما يرفع السلّم
            // كلّه، فيبقى رقما §14 (12 و1.22) كما نصّت عليهما.
            Threat(raider, cost: 1, taughtOn: 1, group: ThreatClass.Melee, min: 4, max: 26);
            Threat(brute, cost: 4, taughtOn: 1, group: ThreatClass.Armoured, min: 2, max: 12);
            Threat(nightArcher, cost: 2, taughtOn: 1, group: ThreatClass.Ranged, min: 3, max: 14);

            // وليد الغسق يُعلَّم في الليلة الثالثة — وهي الموجة المصمَّمة التي
            // تشرح النور. §14: «لا يظهر عدو قبل تعليمه في الحملة».
            Threat(duskling, cost: 1, taughtOn: 3, group: ThreatClass.Swarm, min: 6, max: 34);
            Threat(lampEater, cost: 3, taughtOn: 2, group: ThreatClass.Saboteur, min: 1, max: 6);

            WaveDefinition wave = MakeWave("Wave_01", "الموجة الأولى", "First Wave", 10f, new[]
            {
                MakeEntry(raider, 8, 0.9f, 0f),
                MakeEntry(brute, 2, 2.4f, 6f),
                MakeEntry(nightArcher, 3, 1.4f, 10f),
            });

            WaveDefinition wave2 = MakeWave("Wave_02", "الموجة الثانية", "Second Wave", 14f, new[]
            {
                MakeEntry(raider, 12, 0.7f, 0f),
                MakeEntry(brute, 4, 2.0f, 5f),
                MakeEntry(nightArcher, 6, 1.1f, 9f),
                MakeEntry(lampEater, 1, 1f, 14f),
            });

            WaveDefinition wave3 = MakeWave("Wave_03", "موجة الغَسَق", "Dusk Wave", 16f, new[]
            {
                MakeEntry(duskling, 14, 0.55f, 0f),
                MakeEntry(lampEater, 2, 3.0f, 7f),
                MakeEntry(brute, 4, 2.0f, 12f),
                MakeEntry(nightArcher, 5, 1.2f, 16f),
            });

            WaveGenSettings generation = MakeGeneration();
            DifficultySettings levels = MakeDifficulties();

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(new[] { wave, wave2, wave3 },
                new[] { raider, brute, nightArcher, duskling, lampEater },
                generation, levels,
                spearman, swordsman, archer, hero);

            Debug.Log("مملكة الرماد: القتال والموجات جاهزة. الأرقام في " + CombatFolder);
        }

        private static WaveDefinition.Entry MakeEntry(UnitDefinition unit, int count, float spacing, float delay)
        {
            WaveDefinition.Entry entry;
            entry.Unit = unit;
            entry.Count = count;
            entry.Spacing = spacing;
            entry.Delay = delay;
            return entry;
        }

        /// <summary>
        /// يضع قادة المعركة في المشهد ويُسنِد تعريفاً لكل فرد من الحامية.
        /// يُميَّز الصنف من اسم جاهزته: هي المعلومة الوحيدة المتاحة على النسخة.
        /// </summary>
        private static void WireScene(WaveDefinition[] waves, UnitDefinition[] horde,
            WaveGenSettings generation, DifficultySettings levels,
            UnitDefinition spearman, UnitDefinition swordsman, UnitDefinition archer,
            UnitDefinition hero)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أولاً.");
                return;
            }

            GameObject battle = GameObject.Find("Battle");
            if (battle == null)
            {
                battle = new GameObject("Battle");
            }

            // خدمة الحفظ (§27) أوّل ما يُضاف: كل نظامٍ بعدها يقرأ منها في
            // `Awake`، وهي توقظ نفسها قبلهم جميعاً (‏−600).
            if (battle.GetComponent<Dawnkeep.Save.SaveService>() == null)
            {
                battle.AddComponent<Dawnkeep.Save.SaveService>();
            }

            CombatDirector director = battle.GetComponent<CombatDirector>();
            if (director == null)
            {
                director = battle.AddComponent<CombatDirector>();
            }

            if (battle.GetComponent<ProjectilePool>() == null)
            {
                battle.AddComponent<ProjectilePool>();
            }

            WaveDirector waveDirector = battle.GetComponent<WaveDirector>();
            if (waveDirector == null)
            {
                waveDirector = battle.AddComponent<WaveDirector>();
            }

            SetPrivate(waveDirector, "waves", waves);

            // ثلاث جهات دخول (§14): الطريق الرئيس، ثمّ جهتان تُستعملان في
            // ليالي «المخضرم» و«الكابوس». تُبنى كلّها دائماً — بناؤها عند أوّل
            // ليلة تحتاجها يعني إنشاء كائنات في منتصف الاشتباك.
            waveDirector.ConfigureFronts(BuildFronts(battle.transform));
            waveDirector.ConfigureGeneration(horde, generation, levels);

            int assigned = AssignGarrison(spearman, swordsman, archer, hero);

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log("مملكة الرماد: أُسنِد تعريف قتالي إلى " + assigned + " من الحامية.");
        }

        /// <summary>يضبط بيانات توليد §14 على تعريف مهاجم.</summary>
        private static void Threat(UnitDefinition def, int cost, int taughtOn,
            ThreatClass group, int min, int max)
        {
            SetPrivate(def, "threatCost", cost);
            SetPrivate(def, "taughtOnWave", taughtOn);
            SetPrivate(def, "threatClass", group);
            SetPrivate(def, "minPack", min);
            SetPrivate(def, "maxPack", max);
            EditorUtility.SetDirty(def);
        }

        /// <summary>
        /// أرقام التوليد. رقما §14 (12 و1.22) كما نصّت، والمعامل الذي يرفع
        /// السلّم كلّه هو **معامل المنطقة** — وهو الباب الذي تركته §14 لهذا
        /// بعينه. الموجات الثلاث المصمَّمة تزن 22 ثمّ 43 ثمّ 46 تهديداً،
        /// والمولَّدة الرابعة تزن 48: فالليلة الرابعة تكمل الثالثة ولا تهبط
        /// دونها.
        /// </summary>
        private static WaveGenSettings MakeGeneration()
        {
            string path = CombatFolder + "/WaveGenSettings.asset";
            WaveGenSettings settings = AssetDatabase.LoadAssetAtPath<WaveGenSettings>(path);
            if (settings == null)
            {
                settings = ScriptableObject.CreateInstance<WaveGenSettings>();
                AssetDatabase.CreateAsset(settings, path);
            }

            SetPrivate(settings, "baseBudget", 12f);
            SetPrivate(settings, "growth", 1.22f);
            SetPrivate(settings, "zoneFactor", 2.2f);
            SetPrivate(settings, "minGroups", 2);
            SetPrivate(settings, "maxGroups", 5);
            SetPrivate(settings, "requireMelee", true);
            SetPrivate(settings, "packSpacingMin", 0.45f);
            SetPrivate(settings, "packSpacingMax", 2.6f);
            SetPrivate(settings, "packWindow", 9f);
            SetPrivate(settings, "groupStagger", 4.5f);
            SetPrivate(settings, "maxTier", 4);
            SetPrivate(settings, "tierCost", 0.6f);
            SetPrivate(settings, "tierHealth", 0.35f);
            SetPrivate(settings, "tierDamage", 0.25f);
            SetPrivate(settings, "miniBossEvery", 5);
            SetPrivate(settings, "bossEvery", 10);
            SetPrivate(settings, "bossShare", 0.45f);
            SetPrivate(settings, "prepareTime", 16f);
            SetPrivate(settings, "prepareGrowth", 0.6f);
            SetPrivate(settings, "prepareCap", 26f);
            SetPrivate(settings, "seed", 20260101);

            EditorUtility.SetDirty(settings);
            return settings;
        }

        /// <summary>
        /// درجات §14 الأربع. الصحّة والضرر بنصّها حرفياً، وما عداهما تفسيرٌ
        /// لجملتها الختامية: «لا ترفع الصعوبة بالأرقام فقط؛ أضف تركيبات أعداء
        /// ومسارات مختلفة» — فالجهة الثانية وسقف الصنف بابان لا رقمان.
        /// </summary>
        private static DifficultySettings MakeDifficulties()
        {
            string path = CombatFolder + "/DifficultySettings.asset";
            DifficultySettings levels = AssetDatabase.LoadAssetAtPath<DifficultySettings>(path);
            if (levels == null)
            {
                levels = ScriptableObject.CreateInstance<DifficultySettings>();
                AssetDatabase.CreateAsset(levels, path);
            }

            DifficultySettings.Profile[] profiles =
            {
                Level(Difficulty.Story, Dawnkeep.Localization.LocKeys.DifficultyStory,
                    health: 0.80f, damage: 0.80f, threat: 0.85f,
                    preview: true, secondFront: 0, light: 1f, ceiling: 0.50f),

                Level(Difficulty.Normal, Dawnkeep.Localization.LocKeys.DifficultyNormal,
                    health: 1f, damage: 1f, threat: 1f,
                    preview: false, secondFront: 0, light: 1f, ceiling: 0.55f),

                // «موجة من اتجاه إضافي في بعض الليالي» (§14): كل ثالثة
                Level(Difficulty.Veteran, Dawnkeep.Localization.LocKeys.DifficultyVeteran,
                    health: 1.25f, damage: 1.15f, threat: 1.10f,
                    preview: false, secondFront: 3, light: 1f, ceiling: 0.62f),

                // «ضوء أقل وModifier ثابت» (§14): النور 80%، والمعدِّل الثابت
                // هو أنّ كل ليلة من جهتين لا بعض الليالي.
                Level(Difficulty.Nightmare, Dawnkeep.Localization.LocKeys.DifficultyNightmare,
                    health: 1.50f, damage: 1.35f, threat: 1.25f,
                    preview: false, secondFront: 1, light: 0.80f, ceiling: 0.70f),
            };

            SetPrivate(levels, "profiles", profiles);
            SetPrivate(levels, "current", Difficulty.Normal);

            EditorUtility.SetDirty(levels);
            return levels;
        }

        /// <summary>
        /// سطر درجة. **لا يضيف صفّ نصّ**: صفوف مفاتيح `LocKeys` كلّها في باني
        /// الجدول وحده، وتفريقها على البنّائين يجعل فحص التغطية أعمى عن نصفها.
        /// </summary>
        private static DifficultySettings.Profile Level(Difficulty level, string key,
            float health, float damage, float threat,
            bool preview, int secondFront, float light, float ceiling)
        {
            DifficultySettings.Profile profile = new DifficultySettings.Profile();
            profile.Level = level;
            profile.NameKey = key;
            profile.HealthScale = health;
            profile.DamageScale = damage;
            profile.ThreatScale = threat;
            profile.FullPreview = preview;
            profile.SecondFrontEvery = secondFront;
            profile.LightScale = light;
            profile.ClassCeiling = ceiling;
            return profile;
        }

        /// <summary>
        /// جهات الدخول الثلاث: الطريق الرئيس، ثمّ جهتان على ±110 درجة منه.
        /// ليست ±90: جهةٌ عمودية على الطريق تقع خلف الجناح مباشرة فتصل
        /// البوّابة في نصف الزمن، فتُقرأ غدراً لا تحدّياً.
        /// </summary>
        private static WaveDirector.Front[] BuildFronts(Transform battle)
        {
            float[] angles = { 0f, 110f, -110f };
            WaveDirector.Front[] result = new WaveDirector.Front[angles.Length];

            for (int i = 0; i < angles.Length; i++)
            {
                string name = i == 0 ? "HordeSpawn" : "HordeSpawn_" + i;
                GameObject spawn = GameObject.Find(name);
                if (spawn == null)
                {
                    spawn = new GameObject(name);
                    spawn.transform.SetParent(battle, false);
                }

                WaveDirector.Front front = new WaveDirector.Front();
                front.Point = spawn.transform;
                front.Path = BuildApproachPath(spawn.transform, angles[i]);
                result[i] = front;
            }

            return result;
        }

        /// <summary>
        /// مسار الاقتراب: من حافّة الخريطة إلى بوّابة القلعة. يُشتقّ من موضع
        /// القلعة واتّجاه البوّابة، فلا يحتاج NavMesh ولا شبكة تنقّل (§1).
        /// </summary>
        private static Vector3[] BuildApproachPath(Transform spawn, float yawDegrees)
        {
            GameObject gate = GameObject.Find("Kingdom");
            Vector3 castle = gate != null ? gate.transform.position : Vector3.zero;

            Terrain terrain = Terrain.activeTerrain;
            float half = terrain != null ? terrain.terrainData.size.x * 0.5f : 1080f;

            // الجهة التي يأتون منها: عكس اتّجاه القلعة عن المركز، أو جنوباً،
            // مُدارةً بزاوية هذه الجهة (§14).
            Vector3 outward = castle.sqrMagnitude > 1f ? castle.normalized : Vector3.forward;
            outward = Quaternion.Euler(0f, yawDegrees, 0f) * outward;
            Vector3 from = outward * (half * 0.86f);
            from.y = Height(from.x, from.z);
            spawn.position = from;

            const int Steps = 10;
            Vector3[] path = new Vector3[Steps];
            for (int i = 0; i < Steps; i++)
            {
                float t = (i + 1f) / Steps;
                Vector3 p = Vector3.Lerp(from, castle, t);
                p.y = Height(p.x, p.z);
                path[i] = p;
            }

            return path;
        }

        private static float Height(float x, float z)
        {
            Terrain terrain = Terrain.activeTerrain;
            if (terrain == null)
            {
                return 0f;
            }

            return terrain.SampleHeight(new Vector3(x, 0f, z)) + terrain.transform.position.y;
        }

        /// <summary>يُسنِد تعريفاً لكل فرد من حامية المشهد بحسب اسم جاهزته.</summary>
        private static int AssignGarrison(UnitDefinition spearman, UnitDefinition swordsman,
            UnitDefinition archer, UnitDefinition hero)
        {
            GameObject folk = GameObject.Find("Folk");
            if (folk == null)
            {
                return 0;
            }

            int assigned = 0;
            Transform root = folk.transform;
            for (int i = 0; i < root.childCount; i++)
            {
                Transform child = root.GetChild(i);
                string name = child.name;

                UnitDefinition def = null;
                if (name.Contains("Spearman"))
                {
                    def = spearman;
                }
                else if (name.Contains("Swordsman"))
                {
                    def = swordsman;
                }
                else if (name.Contains("Archer"))
                {
                    def = archer;
                }
                else if (name.Contains("Hero"))
                {
                    def = hero;
                }

                if (def == null)
                {
                    continue;      // القرويّون والخيل محايدون: لا يُقاتَلون
                }

                Unit unit = child.GetComponent<Unit>();
                if (unit == null)
                {
                    unit = child.gameObject.AddComponent<Unit>();
                }

                unit.SetDefinition(def);
                if (child.GetComponent<CharacterAnimator>() == null)
                {
                    child.gameObject.AddComponent<CharacterAnimator>();
                }

                EditorUtility.SetDirty(child.gameObject);
                assigned++;
            }

            return assigned;
        }

        /// <summary>صفوف النصوص التي تجمعها هذه الخطوة قبل ضمّها إلى الجدول.</summary>
        private static readonly List<Dawnkeep.Localization.LocaleTable.Entry> Rows =
            new List<Dawnkeep.Localization.LocaleTable.Entry>(16);

        private static UnitDefinition MakeUnit(string assetName, string display, string english,
            Faction faction,
            CharacterMeshFactory.Kind kind, Color livery, float health, float armour, float speed,
            float damage, float range, float interval, bool ranged, float sight, float retarget,
            TargetClass targetClass, float darkArmour = 0f, int bounty = 6)
        {
            string path = CombatFolder + "/" + assetName + ".asset";
            UnitDefinition def = AssetDatabase.LoadAssetAtPath<UnitDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<UnitDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            // الاسم مفتاحاً في الجدول، والحرفيّ يبقى احتياطاً ولقارئ المفتش
            string key = DawnkeepLocale.ContentKey(assetName);
            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "displayName", display);
            Rows.Add(DawnkeepLocale.Row(key, display, english));
            SetPrivate(def, "faction", faction);
            SetPrivate(def, "targetClass", targetClass);
            SetPrivate(def, "prefab", AssetDatabase.LoadAssetAtPath<GameObject>(
                DawnkeepPrefabBuilder.FolkPrefabPath(kind)));
            SetPrivate(def, "livery", livery);
            SetPrivate(def, "maxHealth", health);
            SetPrivate(def, "armour", armour);
            SetPrivate(def, "darkArmour", darkArmour);
            SetPrivate(def, "bounty", bounty);
            SetPrivate(def, "moveSpeed", speed);
            SetPrivate(def, "damage", damage);
            SetPrivate(def, "attackRange", range);
            SetPrivate(def, "attackInterval", interval);
            SetPrivate(def, "ranged", ranged);
            SetPrivate(def, "sightRange", sight);
            SetPrivate(def, "retargetInterval", retarget);

            EditorUtility.SetDirty(def);
            return def;
        }

        private static WaveDefinition MakeWave(string assetName, string title, string english,
            float prepare, WaveDefinition.Entry[] entries)
        {
            string path = CombatFolder + "/" + assetName + ".asset";
            WaveDefinition wave = AssetDatabase.LoadAssetAtPath<WaveDefinition>(path);
            if (wave == null)
            {
                wave = ScriptableObject.CreateInstance<WaveDefinition>();
                AssetDatabase.CreateAsset(wave, path);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            SetPrivate(wave, "titleKey", key);
            SetPrivate(wave, "title", title);
            Rows.Add(DawnkeepLocale.Row(key, title, english));
            SetPrivate(wave, "prepareTime", prepare);
            SetPrivate(wave, "entries", entries);

            EditorUtility.SetDirty(wave);
            return wave;
        }

        /// <summary>
        /// يضبط حقلاً خاصّاً بالانعكاس. الحقول `[SerializeField] private` قاعدة
        /// من §1، وباني الأصول يحتاج ضبطها — فالانعكاس هو الطريق، لا فتحها عامّة.
        /// </summary>
        private static void SetPrivate(object target, string field, object value)
        {
            if (target == null)
            {
                return;
            }

            FieldInfo info = target.GetType().GetField(field,
                BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);

            if (info == null)
            {
                Debug.LogWarning("مملكة الرماد: لا حقل باسم " + field + " في " + target.GetType().Name);
                return;
            }

            info.SetValue(target, value);
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path))
            {
                return;
            }

            int cut = path.LastIndexOf('/');
            AssetDatabase.CreateFolder(path.Substring(0, cut), path.Substring(cut + 1));
        }
    }
}
