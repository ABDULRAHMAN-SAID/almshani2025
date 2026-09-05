using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Boons;
using Dawnkeep.Localization;
using Dawnkeep.Meta;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// التقدّم الدائم (§16): إعداداته، وعقد الأبحاث الأربع عشرة على فروعها
    /// الأربعة، وربطها بالمشهد.
    ///
    /// أرقام §16 حرفياً حيث نصّت: صيغة الخبرة (100 × المستوى^1.45)،
    /// والمستويات (30 و40)، وزيادة البطل (1.5% صحّة و1% ضرراً)، ونقطة موهبة
    /// كل خمسة، وسقف الأبحاث 30% على أي رقمٍ أساس. وأمثلتها الأربعة موضوعة
    /// كما ضربتها: بيوتٌ +5% خمس مراتب، وجدرانٌ +6% خمس، ومدى الراية ثلاث،
    /// وشحنة نورٍ إضافية مرتبةً واحدة.
    /// </summary>
    public static class DawnkeepMetaSetup
    {
        public const string MetaFolder = DawnkeepAssetPaths.Settings + "/Meta";

        private static readonly List<LocaleTable.Entry> Rows = new List<LocaleTable.Entry>(48);

        [MenuItem("مملكة الرماد/15) التقدّم الدائم والأبحاث", false, 15)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(MetaFolder);
            Rows.Clear();

            ProgressSettings settings = MakeSettings();
            List<ResearchNode> nodes = new List<ResearchNode>(16);

            // ── الاقتصاد ───────────────────────────────────────────────────
            nodes.Add(Node("Research_RichHomes", "بيوتٌ عامرة", "Rich Homes",
                "‏+٥٪ من دخل المباني لكل مرتبة", "+5% building income per rank",
                ResearchBranch.Economy, BoonStat.BuildingIncome,
                perRank: 0.05f, ranks: 5, gold: 120, unlock: 2));

            nodes.Add(Node("Research_FairMarket", "سوقٌ منصف", "Fair Market",
                "‏+٤٪ ممّا يعيده البيع لكل مرتبة", "+4% sell refund per rank",
                ResearchBranch.Economy, BoonStat.SellRefund,
                perRank: 0.04f, ranks: 3, gold: 150, unlock: 3));

            nodes.Add(Node("Research_LeanWages", "أجورٌ زهيدة", "Lean Wages",
                "‏−٣٪ من أثمان البناء لكل مرتبة", "−3% build costs per rank",
                ResearchBranch.Economy, BoonStat.BuildCost,
                perRank: -0.03f, ranks: 5, gold: 180, unlock: 4));

            nodes.Add(Node("Research_PricedHeads", "رؤوسٌ مثمَّنة", "Priced Heads",
                "‏+٥٪ من مكافأة القتل لكل مرتبة", "+5% kill bounty per rank",
                ResearchBranch.Economy, BoonStat.KillBounty,
                perRank: 0.05f, ranks: 4, gold: 140, unlock: 3));

            // ── التحصين ────────────────────────────────────────────────────
            nodes.Add(Node("Research_ThickWalls", "جدرانٌ سميكة", "Thick Walls",
                "‏+٦٪ من صحّة المباني لكل مرتبة", "+6% building health per rank",
                ResearchBranch.Fortification, BoonStat.BuildingHealth,
                perRank: 0.06f, ranks: 5, gold: 130, unlock: 2));

            nodes.Add(Node("Research_DeepFooting", "أساسٌ راسخ", "Deep Footing",
                "‏+٥٪ من صحّة قلب الحصن لكل مرتبة", "+5% keep health per rank",
                ResearchBranch.Fortification, BoonStat.KeepHealth,
                perRank: 0.05f, ranks: 4, gold: 200, unlock: 5));

            nodes.Add(Node("Research_TrueSight", "رميٌ مسدَّد", "True Sight",
                "‏+٣٪ من مدى الأبراج لكل مرتبة", "+3% tower range per rank",
                ResearchBranch.Fortification, BoonStat.TowerRange,
                perRank: 0.03f, ranks: 4, gold: 170, unlock: 4));

            // ── القيادة ────────────────────────────────────────────────────
            nodes.Add(Node("Research_WiderBanner", "رايةٌ أوسع", "Wider Banner",
                "‏+٦٪ من مدى راية الحشد لكل مرتبة", "+6% rally radius per rank",
                ResearchBranch.Command, BoonStat.HeroRallyRadius,
                perRank: 0.06f, ranks: 3, gold: 160, unlock: 3));

            nodes.Add(Node("Research_SoldiersGrit", "عزمُ الجند", "Soldier's Grit",
                "‏+٤٪ من صحّة الجند لكل مرتبة", "+4% soldier health per rank",
                ResearchBranch.Command, BoonStat.ArmyHealth,
                perRank: 0.04f, ranks: 5, gold: 140, unlock: 2));

            nodes.Add(Node("Research_SharpOrders", "صرامةُ الأمر", "Sharp Orders",
                "‏+٣٪ من سرعة ضرب الجند لكل مرتبة", "+3% soldier attack speed per rank",
                ResearchBranch.Command, BoonStat.ArmyAttackSpeed,
                perRank: 0.03f, ranks: 4, gold: 190, unlock: 5));

            nodes.Add(Node("Research_SteadyHand", "يدٌ ثابتة", "Steady Hand",
                "‏−٤٪ من مهل قدرات القائد لكل مرتبة", "−4% commander cooldowns per rank",
                ResearchBranch.Command, BoonStat.HeroCooldown,
                perRank: -0.04f, ranks: 4, gold: 220, unlock: 6));

            // ── صنعة الفجر ─────────────────────────────────────────────────
            nodes.Add(Node("Research_AmpleOil", "زيتٌ وافر", "Ample Oil",
                "‏شحنةُ نورٍ إضافية تبدأ بها كل جولة",
                "Start every run with one extra light charge",
                ResearchBranch.Dawncraft, BoonStat.None,
                perRank: 0f, ranks: 1, gold: 420, unlock: 6, charges: 1, stars: 6));

            nodes.Add(Node("Research_WiderLanterns", "قناديلُ أوسع", "Wider Lanterns",
                "‏+٤٪ من نصف قطر المنارات لكل مرتبة", "+4% beacon radius per rank",
                ResearchBranch.Dawncraft, BoonStat.BeaconRadius,
                perRank: 0.04f, ranks: 5, gold: 150, unlock: 3));

            nodes.Add(Node("Research_StubbornWick", "فتيلٌ عصيّ", "Stubborn Wick",
                "‏−٥٪ من مدّة إطفاء المنارة لكل مرتبة", "−5% snuff duration per rank",
                ResearchBranch.Dawncraft, BoonStat.SnuffSeconds,
                perRank: -0.05f, ranks: 4, gold: 180, unlock: 4));

            nodes.Add(Node("Research_KeenerLight", "نورٌ أقرص", "Keener Light",
                "‏+٤٪ من قضم النور للدرع لكل مرتبة", "+4% armour shred in light per rank",
                ResearchBranch.Dawncraft, BoonStat.BeaconArmourCut,
                perRank: 0.04f, ranks: 5, gold: 200, unlock: 5));

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(settings, nodes.ToArray());
            Debug.Log("مملكة الرماد: التقدّم الدائم و" + nodes.Count
                + " عقدة بحث جاهزة في " + MetaFolder);
        }

        private static ProgressSettings MakeSettings()
        {
            string path = MetaFolder + "/ProgressSettings.asset";
            ProgressSettings settings = AssetDatabase.LoadAssetAtPath<ProgressSettings>(path);
            if (settings == null)
            {
                settings = ScriptableObject.CreateInstance<ProgressSettings>();
                AssetDatabase.CreateAsset(settings, path);
            }

            SetPrivate(settings, "xpBase", 100f);            // §16 حرفياً
            SetPrivate(settings, "xpExponent", 1.45f);       // §16 حرفياً
            SetPrivate(settings, "maxAccountLevel", 30);     // §16 حرفياً
            SetPrivate(settings, "maxHeroLevel", 40);        // §16 حرفياً
            SetPrivate(settings, "heroHealthPerLevel", 0.015f);
            SetPrivate(settings, "heroDamagePerLevel", 0.01f);
            SetPrivate(settings, "levelsPerTalent", 5);      // §16 حرفياً
            // مكافأة المرحلة: أرقام §21 حرفياً
            //   Gold = 100 + 18 × رقم المرحلة + 25 × النجوم الجديدة
            //   Account XP = 80 + 12 ×، وHero XP = 60 + 10 ×
            SetPrivate(settings, "goldBase", 100);
            SetPrivate(settings, "goldPerStage", 18);
            SetPrivate(settings, "goldPerStar", 25);
            SetPrivate(settings, "accountXpBase", 80);
            SetPrivate(settings, "accountXpPerStage", 12);
            SetPrivate(settings, "heroXpBase", 60);
            SetPrivate(settings, "heroXpPerStage", 10);
            SetPrivate(settings, "shardCap", 3);
            // سلّم الفتح مضبوطٌ على **قياس** لا على تقدير: قاس `metacheck.py`
            // أنّ الضبط الأوّل يفتح سرعة ٢× في الجولة الأولى — أي بلا تدرّج —
            // ويترك «الكابوس» خلف تسعٍ وعشرين جولة، فلا يُبلَغ أصلاً.
            //
            // بالأرقام الحالية (680 خبرةً للجولة الفائزة) يصير السلّم:
            //   الأبحاث الجولة 1 · ٢× الجولة 2 · مخضرم 3 · ٣× 7 · كابوس 14
            SetPrivate(settings, "doubleSpeedLevel", 2);
            SetPrivate(settings, "tripleSpeedLevel", 4);
            SetPrivate(settings, "researchLevel", 1);
            SetPrivate(settings, "veteranLevel", 3);
            SetPrivate(settings, "nightmareLevel", 6);
            SetPrivate(settings, "researchCap", 0.30f);      // §16 حرفياً
            SetPrivate(settings, "respecGold", 300);

            EditorUtility.SetDirty(settings);
            return settings;
        }

        private static ResearchNode Node(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, ResearchBranch branch, BoonStat stat,
            float perRank, int ranks, int gold, int unlock, int charges = 0, int stars = 3)
        {
            string path = MetaFolder + "/" + assetName + ".asset";
            ResearchNode node = AssetDatabase.LoadAssetAtPath<ResearchNode>(path);
            if (node == null)
            {
                node = ScriptableObject.CreateInstance<ResearchNode>();
                AssetDatabase.CreateAsset(node, path);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            Rows.Add(DawnkeepLocale.Row(key, arabic, english));
            Rows.Add(DawnkeepLocale.Row(key + ".summary", summaryAr, summaryEn));

            SetPrivate(node, "nameKey", key);
            SetPrivate(node, "summaryKey", key + ".summary");
            SetPrivate(node, "displayName", arabic);
            SetPrivate(node, "branch", branch);
            SetPrivate(node, "stat", stat);
            SetPrivate(node, "perRank", perRank);
            SetPrivate(node, "ranks", ranks);
            SetPrivate(node, "goldFirstRank", gold);
            SetPrivate(node, "goldGrowth", 1.55f);
            SetPrivate(node, "starsPerRank", stars);
            SetPrivate(node, "unlockLevel", unlock);
            SetPrivate(node, "extraLightCharges", charges);

            EditorUtility.SetDirty(node);
            return node;
        }

        private static void WireScene(ProgressSettings settings, ResearchNode[] nodes)
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

            Progress progress = battle.GetComponent<Progress>();
            if (progress == null)
            {
                progress = battle.AddComponent<Progress>();
            }

            progress.Configure(settings, nodes);

            GameObject canvas = GameObject.Find("BattleHud");
            if (canvas != null)
            {
                Dawnkeep.UI.MetaPanel panel = canvas.GetComponent<Dawnkeep.UI.MetaPanel>();
                if (panel == null)
                {
                    panel = canvas.AddComponent<Dawnkeep.UI.MetaPanel>();
                }

                TMPro.TMP_FontAsset font = AssetDatabase.LoadAssetAtPath<TMPro.TMP_FontAsset>(
                    DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri_Bold.asset");

                if (font == null)
                {
                    font = AssetDatabase.LoadAssetAtPath<TMPro.TMP_FontAsset>(
                        DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri.asset");
                }

                panel.Configure(font);
                EditorUtility.SetDirty(canvas);
            }
            else
            {
                Debug.LogWarning("مملكة الرماد: لا BattleHud — نفّذ القائمة 7 أوّلاً.");
            }

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
        }

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                AssetDatabase.CreateFolder(System.IO.Path.GetDirectoryName(path).Replace('\\', '/'),
                    System.IO.Path.GetFileName(path));
            }
        }

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
                Debug.LogWarning("مملكة الرماد: لا حقل باسم " + field
                    + " في " + target.GetType().Name);
                return;
            }

            info.SetValue(target, value);
        }
    }
}
