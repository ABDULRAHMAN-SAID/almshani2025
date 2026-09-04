using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Campaign;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// حملة §19: **أربع مناطق × عشر مراحل = أربعون**.
    ///
    /// و§19 صريحةٌ في أنّ الفنّ النهائي لا يلزم للأربع في أوّل شريحة، **لكنّ
    /// البنية يجب أن تدعمه**. فالأربعون كلّها هنا ببياناتها وأهدافها
    /// وبيئاتها، والخريطة المبنيّة واحدةٌ حتى الآن — وهذا مكتوبٌ في
    /// `ASSET_MANIFEST.md` لا مسكوتٌ عنه.
    ///
    /// **وأهدافها تغيّر اللعب لا النصّ**: §19 تشترط ذلك حرفياً، و`StageRules`
    /// هو التنفيذ. فمرحلةٌ بستّ عقدٍ تقفل الباقي فعلاً، ومرحلةٌ اقتصادية
    /// ترفض بناء البرج حتى ليلتها.
    /// </summary>
    public static class DawnkeepCampaignSetup
    {
        public const string ZoneFolder = DawnkeepAssetPaths.Settings + "/Campaign";

        private static readonly List<LocaleTable.Entry> Rows = new List<LocaleTable.Entry>(128);

        /// <summary>ترتيب الأهداف داخل المنطقة الواحدة: تعليمٌ ثمّ تنويع.</summary>
        private static readonly StageObjective[] Pattern =
        {
            StageObjective.HoldTheKeep,        // 1: الأساس
            StageObjective.HoldTheKeep,        // 2: يُثبَّت
            StageObjective.SixNodesOnly,       // 3: ضيقُ المكان
            StageObjective.LightTwoBeacons,    // 4: النور شرطاً
            StageObjective.TwoGates,           // 5: قسمةُ الجيش — وليلة زعيمٍ صغير
            StageObjective.EconomyOpening,     // 6: بلا أبراج
            StageObjective.GuardConvoy,        // 7: ما يُحمى غير القلب
            StageObjective.BrokenWall,         // 8: ثغرةٌ من البداية
            StageObjective.HoldTheKeep,        // 9: نفَسٌ قبل الأخيرة
            StageObjective.HoldTheKeep,        // 10: ليلة الزعيم — الهدف ألّا يسقط
        };

        [MenuItem("مملكة الرماد/21) حملة §19: المناطق والمراحل", false, 21)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(ZoneFolder);
            Rows.Clear();

            // ── المناطق الأربع، ولكلٍّ قاعدةُ بيئةٍ تغيّر اللعب ────────────
            List<ZoneDefinition> zones = new List<ZoneDefinition>(4);

            zones.Add(Zone("Zone_Emberwood", "تخوم الجمر", "Emberwood Frontier",
                "غابةٌ تتحوّل إلى برتقاليّ عند الغروب. تعلّم البناء والاقتصاد والقيادة.",
                "A forest that turns orange at dusk. It teaches building, economy and command.",
                order: 1, ground: 1f, tower: 1f, beacon: 1f, threat: 1f,
                unlockAfter: 0, boss: "Boss_BellRam"));

            zones.Add(Zone("Zone_MireOfBells", "مستنقع الأجراس", "Mire of Bells",
                "أرضٌ موحلة تبطئ الجميع، وبرك سمٍّ ومسالك ضيّقة.",
                "Muddy ground slows everyone, with poison pools and narrow paths.",
                order: 2, ground: 0.86f, tower: 1f, beacon: 0.94f, threat: 1.25f,
                unlockAfter: 8, boss: "Boss_MireMatron"));

            zones.Add(Zone("Zone_Frostwall", "امتداد الجليد", "Frostwall Expanse",
                "جليدٌ يزلق فيسرّع الجميع، وعواصف تقصّر مدى الأبراج.",
                "Ice makes everyone faster, and storms cut tower range.",
                order: 3, ground: 1.14f, tower: 0.86f, beacon: 1f, threat: 1.55f,
                unlockAfter: 8, boss: "Boss_AshCrown"));

            zones.Add(Zone("Zone_AshenEclipse", "كسوف الرماد", "Ashen Eclipse",
                "ظلامٌ كثيف يضيّق دوائر النور، والزعيم الأخير في آخرها.",
                "Thick darkness narrows the light, and the final boss waits at the end.",
                order: 4, ground: 1f, tower: 1f, beacon: 0.74f, threat: 1.9f,
                unlockAfter: 8, boss: "Boss_EaterOfDawn"));

            // ── الأربعون ───────────────────────────────────────────────────
            // المخطّطات تسقط من مراحلَ بعينها، فتُغلق حلقة §17: «مخططات من
            // المراحل والأهداف». وكلّ قطعةٍ غير مملوكةٍ من البداية لها مصدر.
            string[] drops =
            {
                // المنطقة 1 — سلاحان ودرعٌ وأثر
                "", "Gear_Sunblade", "", "Relic_MasonsOath", "",
                "Armor_Scale", "", "Relic_HarvestCoin", "", "Mount_ArmoredBoar",
                // المنطقة 2
                "", "Gear_StormStaff", "", "Relic_LanternHeart", "",
                "Armor_Dawnplate", "", "Relic_RallyHorn", "", "Mount_DawnBeetle",
                // المنطقة 3
                "", "Gear_HandBallista", "", "Relic_CaptainsSeal", "",
                "Armor_Bulwark", "Armor_Shadowweave", "Relic_LongSight", "",
                "Mount_WindStag",
                // المنطقة 4 — والأسطوريّتان في آخرها
                "", "Gear_EmberAxe", "", "Relic_PiercingWard", "Relic_DuelistsMark",
                "Gear_EngineerGauntlet", "Relic_DawnLedger", "Relic_BrokenSundial",
                "Relic_AshMirror", "Armor_FirstLight",
            };

            List<StageDefinition> stages = new List<StageDefinition>(40);
            int drop = 0;

            for (int z = 0; z < zones.Count; z++)
            {
                ZoneDefinition zone = zones[z];
                for (int i = 1; i <= zone.Stages; i++)
                {
                    string blueprint = drop < drops.Length ? drops[drop] : string.Empty;
                    drop++;

                    stages.Add(Stage(zone, i, Pattern[(i - 1) % Pattern.Length], blueprint));
                }
            }

            // ما بقي من القطع بلا مصدر: يُقال ولا يُسكَت عنه
            Report(stages);

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(zones.ToArray(), stages.ToArray());
            Debug.Log("مملكة الرماد: حملة §19 — " + zones.Count + " مناطق و"
                + stages.Count + " مرحلة.");
        }

        // ── البناء ─────────────────────────────────────────────────────────

        private static ZoneDefinition Zone(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, int order,
            float ground, float tower, float beacon, float threat,
            int unlockAfter, string boss)
        {
            string path = ZoneFolder + "/" + assetName + ".asset";
            ZoneDefinition def = AssetDatabase.LoadAssetAtPath<ZoneDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<ZoneDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            Rows.Add(DawnkeepLocale.Row(key, arabic, english));
            Rows.Add(DawnkeepLocale.Row(key + ".summary", summaryAr, summaryEn));

            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "summaryKey", key + ".summary");
            SetPrivate(def, "displayName", arabic);
            SetPrivate(def, "order", order);
            SetPrivate(def, "stages", 10);
            SetPrivate(def, "groundSpeed", ground);
            SetPrivate(def, "towerRange", tower);
            SetPrivate(def, "beaconRadius", beacon);
            SetPrivate(def, "threatScale", threat);
            SetPrivate(def, "unlockAfter", unlockAfter);

            SetPrivate(def, "boss", AssetDatabase.LoadAssetAtPath<Dawnkeep.Bosses.BossDefinition>(
                DawnkeepBossSetup.BossFolder + "/" + boss + ".asset"));

            EditorUtility.SetDirty(def);
            return def;
        }

        private static StageDefinition Stage(ZoneDefinition zone, int index,
            StageObjective objective, string blueprint)
        {
            string assetName = "Stage_" + zone.Order + "_" + index.ToString("00");
            string path = ZoneFolder + "/" + assetName + ".asset";

            StageDefinition def = AssetDatabase.LoadAssetAtPath<StageDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<StageDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            string arabic = zone.name.Length > 0
                ? Name(zone.Order, index) : "مرحلة " + index;

            Rows.Add(DawnkeepLocale.Row(key, arabic,
                "Stage " + zone.Order + "-" + index));

            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "displayName", arabic);
            SetPrivate(def, "zone", zone);
            SetPrivate(def, "index", index);
            SetPrivate(def, "objective", objective);
            SetPrivate(def, "nights", 10);

            if (!string.IsNullOrEmpty(blueprint))
            {
                SetPrivate(def, "blueprint",
                    AssetDatabase.LoadAssetAtPath<Dawnkeep.Equipment.EquipmentDefinition>(
                        DawnkeepEquipmentSetup.GearFolder + "/" + blueprint + ".asset"));
            }

            EditorUtility.SetDirty(def);
            return def;
        }

        /// <summary>اسمٌ عربيّ للمرحلة: اسم المنطقة ورقمها.</summary>
        private static string Name(int zone, int index)
        {
            string[] zones = { "", "تخوم الجمر", "مستنقع الأجراس", "امتداد الجليد", "كسوف الرماد" };
            string prefix = zone >= 1 && zone < zones.Length ? zones[zone] : "المنطقة";
            return prefix + " — " + index;
        }

        /// <summary>
        /// يقول أيّ قطعةٍ بقيت بلا مصدر. **يُقال في Console لا يُسكَت عنه**:
        /// قطعةٌ في الكتالوج لا تُنال من مرحلةٍ ولا تُملَك من البداية قطعةٌ
        /// لا يراها اللاعب أبداً.
        /// </summary>
        private static void Report(List<StageDefinition> stages)
        {
            string[] guids = AssetDatabase.FindAssets("t:EquipmentDefinition",
                new[] { DawnkeepEquipmentSetup.GearFolder });

            List<string> orphans = new List<string>(8);
            for (int i = 0; i < guids.Length; i++)
            {
                Dawnkeep.Equipment.EquipmentDefinition gear =
                    AssetDatabase.LoadAssetAtPath<Dawnkeep.Equipment.EquipmentDefinition>(
                        AssetDatabase.GUIDToAssetPath(guids[i]));

                if (gear == null || gear.OwnedFromStart)
                {
                    continue;
                }

                bool found = false;
                for (int s = 0; s < stages.Count && !found; s++)
                {
                    found = stages[s].Blueprint == gear;
                }

                if (!found)
                {
                    orphans.Add(gear.name);
                }
            }

            if (orphans.Count > 0)
            {
                Debug.LogWarning("مملكة الرماد: قطعٌ بلا مصدر في الحملة — "
                    + string.Join("، ", orphans));
            }
        }

        private static void WireScene(ZoneDefinition[] zones, StageDefinition[] stages)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            GameObject meta = GameObject.Find("Meta");
            if (meta == null)
            {
                meta = new GameObject("Meta");
            }

            CampaignDirector campaign = meta.GetComponent<CampaignDirector>();
            if (campaign == null)
            {
                campaign = meta.AddComponent<CampaignDirector>();
            }

            campaign.SetContent(zones, stages);
            EditorUtility.SetDirty(campaign);

            // قواعد الهدف في مشهد المعركة: هي التي تقفل العقد وتقيم الثغرة
            GameObject battle = GameObject.Find("Battle");
            if (battle != null)
            {
                StageRules rules = battle.GetComponent<StageRules>();
                if (rules == null)
                {
                    rules = battle.AddComponent<StageRules>();
                }

                SetPrivate(rules, "wall", Building("Build_Wall"));
                SetPrivate(rules, "convoy", Building("Build_Farm"));
                EditorUtility.SetDirty(rules);
            }
            else
            {
                Debug.LogWarning("مملكة الرماد: لا كائن Battle — نفّذ القائمة 6 أوّلاً.");
            }

            EditorSceneManager.MarkSceneDirty(scene);
        }

        private static Dawnkeep.Building.BuildingDefinition Building(string assetName)
        {
            return AssetDatabase.LoadAssetAtPath<Dawnkeep.Building.BuildingDefinition>(
                DawnkeepBuildSetup.BuildFolder + "/" + assetName + ".asset");
        }

        private static void EnsureFolder(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                string parent = System.IO.Path.GetDirectoryName(path).Replace('\\', '/');
                AssetDatabase.CreateFolder(parent, System.IO.Path.GetFileName(path));
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
