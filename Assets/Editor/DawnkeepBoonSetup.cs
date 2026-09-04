using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Boons;
using Dawnkeep.Building;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// بركات §15: **أربع وعشرون** موزَّعة على الفئات الخمس.
    ///
    /// كلّها بأسماء عربية أصلية، ولكلٍّ **مكسبٌ وثمن** في سطر واحد. البركة
    /// التي كلّها مكسب ليست اختياراً بل زرّاً يُضغط، و§15 تبني أمثلتها كلّها
    /// على المفاضلة: «+18% سرعة، −8% ضرراً».
    ///
    /// وستٌّ منها **سلوك لا رقم**، وهي التي سمّت §15 أمثلتها بعينها: سلسلة
    /// القناديل، وحجر الجمر، والحصاد الأخير، والصفوف المتراصّة — وأضفنا
    /// يقظة الفجر ووقود الظلام على القياس نفسه.
    /// </summary>
    public static class DawnkeepBoonSetup
    {
        public const string BoonFolder = DawnkeepAssetPaths.Settings + "/Boons";

        private static readonly List<LocaleTable.Entry> Rows = new List<LocaleTable.Entry>(64);

        [MenuItem("مملكة الرماد/14) بركات الجولة", false, 14)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(BoonFolder);
            Rows.Clear();

            List<BoonDefinition> all = new List<BoonDefinition>(24);

            // ── البطل (§8) ─────────────────────────────────────────────────
            all.Add(Boon("Boon_SwiftDawn", "فجرٌ عَجِل", "Swift Dawn",
                "‏+١٨٪ سرعة ضرب القائد، و−٨٪ من ضرره",
                "+18% commander attack speed, −8% damage",
                BoonCategory.Hero,
                Change(BoonStat.HeroAttackSpeed, 1.18f),
                Change(BoonStat.HeroDamage, 0.92f)));

            all.Add(Boon("Boon_HeavyHand", "يدٌ ثقيلة", "Heavy Hand",
                "‏+٢٢٪ ضرراً للقائد، و−١٠٪ من سرعته",
                "+22% commander damage, −10% attack speed",
                BoonCategory.Hero,
                Change(BoonStat.HeroDamage, 1.22f),
                Change(BoonStat.HeroAttackSpeed, 0.90f)));

                        all.Add(Boon("Boon_QuickBanner", "رايةٌ سريعة", "Quick Banner",
                "‏−٢٢٪ من مهل القدرات، و−١٢٪ من صحّة القائد",
                "−22% ability cooldowns, −12% commander health",
                BoonCategory.Hero,
                Change(BoonStat.HeroCooldown, 0.78f),
                Change(BoonStat.HeroHealth, 0.88f)));

            all.Add(Boon("Boon_KeenEdge", "حدٌّ ماضٍ", "Keen Edge",
                "‏ضعفُ فرصة الضربة الحرِجة، و−٦٪ من الضرر الأساس",
                "Double crit chance, −6% base damage",
                BoonCategory.Hero,
                Change(BoonStat.HeroCrit, 2f),
                Change(BoonStat.HeroDamage, 0.94f)));

            all.Add(Flagged("Boon_FirstLight", "يقظة الفجر", "First Light",
                "‏أوّل ضربةٍ على عدوٍّ كامل الصحّة حرِجةٌ دائماً، و−٨٪ من سرعة الضرب",
                "First strike on a full-health enemy always crits, −8% attack speed",
                BoonCategory.Hero, BoonFlag.FirstLight,
                Change(BoonStat.HeroAttackSpeed, 0.92f)));

            // ── الجند (§9) ─────────────────────────────────────────────────
            all.Add(Boon("Boon_IronDiscipline", "انضباط الحديد", "Iron Discipline",
                "‏+٨ نقاطٍ من المقاومة للجند، و−٨٪ من سرعة حركتهم",
                "+8 armour points for soldiers, −8% move speed",
                BoonCategory.Army,
                Change(BoonStat.ArmyResistance, 1.08f),
                Change(BoonStat.ArmyMoveSpeed, 0.92f)));

            all.Add(Boon("Boon_LightFoot", "خِفّةُ القدم", "Light Foot",
                "‏+٢٠٪ سرعةَ حركةٍ للجند، و−١٠٪ من صحّتهم",
                "+20% soldier move speed, −10% health",
                BoonCategory.Army,
                Change(BoonStat.ArmyMoveSpeed, 1.20f),
                Change(BoonStat.ArmyHealth, 0.90f)));

            all.Add(Boon("Boon_DrilledArms", "سواعدُ مدرَّبة", "Drilled Arms",
                "‏+١٦٪ سرعةَ ضربٍ للجند، و−٨٪ من صحّتهم",
                "+16% soldier attack speed, −8% health",
                BoonCategory.Army,
                Change(BoonStat.ArmyAttackSpeed, 1.16f),
                Change(BoonStat.ArmyHealth, 0.92f)));

            all.Add(Boon("Boon_ThickBlood", "دمٌ ثخين", "Thick Blood",
                "‏+٢٢٪ صحّةً للجند، و−١٢٪ من سرعة ضربهم",
                "+22% soldier health, −12% attack speed",
                BoonCategory.Army,
                Change(BoonStat.ArmyHealth, 1.22f),
                Change(BoonStat.ArmyAttackSpeed, 0.88f)));

            all.Add(Flagged("Boon_PackedRanks", "صفوفٌ متراصّة", "Packed Ranks",
                "‏المتقاربون يقاومون أكثر ويتحرّكون أبطأ — حتى ثلاثة جيران",
                "Nearby soldiers gain resistance but move slower — up to three neighbours",
                BoonCategory.Army, BoonFlag.PackedRanks));

            // ── الأبراج (§10) ──────────────────────────────────────────────
            all.Add(Boon("Boon_LongSight", "بُعدُ النظر", "Long Sight",
                "‏+١٨٪ مدىً للأبراج، و−١٠٪ من ضررها",
                "+18% tower range, −10% damage",
                BoonCategory.Towers,
                Change(BoonStat.TowerRange, 1.18f),
                Change(BoonStat.TowerDamage, 0.90f),
                requires: BuildingRole.Tower));

            all.Add(Boon("Boon_HeavyBolts", "سهامٌ ثقيلة", "Heavy Bolts",
                "‏+٢٤٪ ضرراً للأبراج، و−١٢٪ من سرعة إطلاقها",
                "+24% tower damage, −12% fire rate",
                BoonCategory.Towers,
                Change(BoonStat.TowerDamage, 1.24f),
                Change(BoonStat.TowerFireRate, 0.88f),
                requires: BuildingRole.Tower));

            all.Add(Boon("Boon_RapidVolley", "رشقٌ متتابع", "Rapid Volley",
                "‏+٢٠٪ سرعةَ إطلاقٍ للأبراج، و−١٠٪ من مداها",
                "+20% tower fire rate, −10% range",
                BoonCategory.Towers,
                Change(BoonStat.TowerFireRate, 1.20f),
                Change(BoonStat.TowerRange, 0.90f),
                requires: BuildingRole.Tower));

            all.Add(Boon("Boon_HarrierNest", "وكرُ الجوارح", "Harrier Nest",
                "‏+١٤٪ ضرراً و+٨٪ مدىً للأبراج، و−١٥٪ من دخل المباني",
                "+14% tower damage and +8% range, −15% building income",
                BoonCategory.Towers,
                Change(BoonStat.TowerDamage, 1.14f),
                Change(BoonStat.TowerRange, 1.08f),
                Change(BoonStat.BuildingIncome, 0.85f),
                requires: BuildingRole.Tower));

            all.Add(Flagged("Boon_BurningStones", "حجرُ الجمر", "Burning Stones",
                "‏قذائف القاذف تترك ناراً، وإطلاقه أبطأ",
                "Bombard shells leave fire, but fire more slowly",
                BoonCategory.Towers, BoonFlag.BurningStones,
                requires: BuildingRole.Tower, opensStyle: true));

            // ── الاقتصاد (§10) ─────────────────────────────────────────────
            all.Add(Boon("Boon_Salvager", "المُنقِذ", "Salvager",
                "‏البيع يعيد ٨٥٪ بدل ٧٠٪، و−١٠٪ من دخل المباني",
                "Selling refunds 85% instead of 70%, −10% building income",
                BoonCategory.Economy,
                Change(BoonStat.SellRefund, 1.214f),
                Change(BoonStat.BuildingIncome, 0.90f),
                requires: BuildingRole.Economy));

                        all.Add(Boon("Boon_Headhunter", "طالبُ الرؤوس", "Headhunter",
                "‏+٣٠٪ من مكافأة القتل، و−١٥٪ من دخل الموجة",
                "+30% kill bounty, −15% wave income",
                BoonCategory.Economy,
                Change(BoonStat.KillBounty, 1.30f),
                Change(BoonStat.WaveIncome, 0.85f)));

            all.Add(Boon("Boon_LeanMasons", "بنّاؤون زهيدون", "Lean Masons",
                "‏−١٥٪ من أثمان البناء، و−١٠٪ من صحّة الجند",
                "−15% build costs, −10% soldier health",
                BoonCategory.Economy,
                Change(BoonStat.BuildCost, 0.85f),
                Change(BoonStat.ArmyHealth, 0.90f)));

            all.Add(Flagged("Boon_FinalHarvest", "الحصادُ الأخير", "Final Harvest",
                "‏+٥٠٪ من دخل المباني، لكنّ الاقتصاد لا يُصلَح بعدها",
                "+50% building income, but economy buildings are never repaired",
                BoonCategory.Economy, BoonFlag.FinalHarvest,
                requires: BuildingRole.Economy,
                changes: new[] { Change(BoonStat.BuildingIncome, 1.50f) }));

            all.Add(Flagged("Boon_DarkTithe", "وقودُ الظلام", "Dark Tithe",
                "‏القتلُ في الظلام يزيد المكافأة ٦٠٪، و−١٢٪ من نصف قطر المنارات",
                "Kills in darkness pay 60% more, −12% beacon radius",
                BoonCategory.Economy, BoonFlag.DarkTithe,
                Change(BoonStat.BeaconRadius, 0.88f)));

            // ── النور (§11) ────────────────────────────────────────────────
            all.Add(Boon("Boon_WideLantern", "قنديلٌ واسع", "Wide Lantern",
                "‏+٢٠٪ من نصف قطر المنارات، و−١٥٪ من قضمها للدرع",
                "+20% beacon radius, −15% armour shred",
                BoonCategory.Light,
                Change(BoonStat.BeaconRadius, 1.20f),
                Change(BoonStat.BeaconArmourCut, 0.85f),
                requiresBeacon: true));

            all.Add(Boon("Boon_BitingLight", "نورٌ قارص", "Biting Light",
                "‏+٢٥٪ من قضم الدرع في النور، و−١٢٪ من نصف قطره",
                "+25% armour shred in light, −12% beacon radius",
                BoonCategory.Light,
                Change(BoonStat.BeaconArmourCut, 1.25f),
                Change(BoonStat.BeaconRadius, 0.88f),
                requiresBeacon: true));

            all.Add(Boon("Boon_SteadyWick", "فتيلٌ ثابت", "Steady Wick",
                "‏−٤٠٪ من مدّة إطفاء المنارة، و−١٠٪ من نصف قطرها",
                "−40% beacon snuff duration, −10% radius",
                BoonCategory.Light,
                Change(BoonStat.SnuffSeconds, 0.60f),
                Change(BoonStat.BeaconRadius, 0.90f),
                requiresBeacon: true));

            all.Add(Flagged("Boon_LanternChain", "سلسلةُ القناديل", "Lantern Chain",
                "‏تداخلُ دائرتَي منارة يجرح جرحاً مستمرّاً، و−١٥٪ من قضم الدرع",
                "Overlapping beacon circles burn enemies, −15% armour shred",
                BoonCategory.Light, BoonFlag.LanternChain,
                changes: new[] { Change(BoonStat.BeaconArmourCut, 0.85f) },
                requiresBeacon: true, opensStyle: true));

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(all.ToArray());
            Debug.Log("مملكة الرماد: " + all.Count + " بركة جاهزة في " + BoonFolder);
        }

        // ── أدوات البناء ────────────────────────────────────────────────────

        private static BoonDefinition.Change Change(BoonStat stat, float multiplier)
        {
            BoonDefinition.Change change;
            change.Stat = stat;
            change.Multiplier = multiplier;
            return change;
        }

        private static BoonDefinition Boon(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, BoonCategory category,
            BoonDefinition.Change a, BoonDefinition.Change b,
            BuildingRole requires = BuildingRole.Economy, bool requiresBeacon = false)
        {
            return Build(assetName, arabic, english, summaryAr, summaryEn, category,
                new[] { a, b }, BoonFlag.None, requires,
                requires != BuildingRole.Economy || Needs(category), requiresBeacon, false);
        }

        private static BoonDefinition Boon(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, BoonCategory category,
            BoonDefinition.Change a, BoonDefinition.Change b, BoonDefinition.Change c,
            BuildingRole requires = BuildingRole.Economy, bool requiresBeacon = false)
        {
            return Build(assetName, arabic, english, summaryAr, summaryEn, category,
                new[] { a, b, c }, BoonFlag.None, requires,
                requires != BuildingRole.Economy || Needs(category), requiresBeacon, false);
        }

        private static BoonDefinition Flagged(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, BoonCategory category, BoonFlag flag,
            BoonDefinition.Change[] changes = null,
            BuildingRole requires = BuildingRole.Economy,
            bool requiresBeacon = false, bool opensStyle = false)
        {
            return Build(assetName, arabic, english, summaryAr, summaryEn, category,
                changes ?? new BoonDefinition.Change[0], flag, requires,
                requires != BuildingRole.Economy || Needs(category), requiresBeacon, opensStyle);
        }

        private static BoonDefinition Flagged(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, BoonCategory category, BoonFlag flag,
            BoonDefinition.Change changeA)
        {
            return Build(assetName, arabic, english, summaryAr, summaryEn, category,
                new[] { changeA }, flag, BuildingRole.Economy, false, false, false);
        }

        /// <summary>
        /// هل تشترط هذه الفئة ملكاً؟ بركات البطل والجند لا تشترط — القائد
        /// وجنده موجودون من الليلة الأولى. وبركات الاقتصاد والأبراج تشترط،
        /// وهي القاعدة الأولى في §15.
        /// </summary>
        private static bool Needs(BoonCategory category)
        {
            return category == BoonCategory.Economy || category == BoonCategory.Towers;
        }

        private static BoonDefinition Build(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, BoonCategory category,
            BoonDefinition.Change[] changes, BoonFlag flag, BuildingRole requires,
            bool requiresBuilding, bool requiresBeacon, bool opensStyle)
        {
            string path = BoonFolder + "/" + assetName + ".asset";
            BoonDefinition def = AssetDatabase.LoadAssetAtPath<BoonDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<BoonDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            Rows.Add(DawnkeepLocale.Row(key, arabic, english));
            Rows.Add(DawnkeepLocale.Row(key + ".summary", summaryAr, summaryEn));

            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "summaryKey", key + ".summary");
            SetPrivate(def, "displayName", arabic);
            SetPrivate(def, "category", category);
            SetPrivate(def, "changes", changes);
            SetPrivate(def, "flag", flag);
            SetPrivate(def, "requires", requires);
            SetPrivate(def, "requiresBuilding", requiresBuilding);
            SetPrivate(def, "requiresBeacon", requiresBeacon);
            SetPrivate(def, "opensStyle", opensStyle);

            EditorUtility.SetDirty(def);
            return def;
        }

        private static void WireScene(BoonDefinition[] all)
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

            if (battle.GetComponent<BoonBook>() == null)
            {
                battle.AddComponent<BoonBook>();
            }

            BoonDealer dealer = battle.GetComponent<BoonDealer>();
            if (dealer == null)
            {
                dealer = battle.AddComponent<BoonDealer>();
            }

            dealer.Configure(all);

            // لوحة الاختيار على اللوحة نفسها التي تحمل واجهة المعركة، وبخطّها
            GameObject canvas = GameObject.Find("BattleHud");
            if (canvas != null)
            {
                Dawnkeep.UI.BoonPanel panel = canvas.GetComponent<Dawnkeep.UI.BoonPanel>();
                if (panel == null)
                {
                    panel = canvas.AddComponent<Dawnkeep.UI.BoonPanel>();
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
