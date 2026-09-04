using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Building;
using Dawnkeep.Combat;
using Dawnkeep.Economy;
using Dawnkeep.UI;
using Dawnkeep.World;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة التاسعة: البناء والاقتصاد (§10).
    ///
    /// يُنشئ تعريفات المباني بأرقام §10 حرفياً، ويضع عقد البناء حول الحصن،
    /// ويركّب الخزينة وقائد البناء ولوحة البطاقات.
    ///
    /// **تحويل وحدات موثّق**: §10 تكتب المدى بوحدات نموذجها الشبكي (برج
    /// المراقبة 5.6)، وعالم Unity هنا بالمتر وجنديّه ثلاثة أمتار. المعامل
    /// المستعمل **6 أمتار للوحدة**، فيصير مدى البرج 33.6 م — قريباً من مدى
    /// الرامي (17 م) بمقدار الضعف، وهي النسبة نفسها في المواصفات.
    ///
    /// يُنفَّذ بعد القائمة 8 (نظام النور).
    /// </summary>
    public static class DawnkeepBuildSetup
    {
        public const string BuildFolder = DawnkeepAssetPaths.Settings + "/Buildings";

        /// <summary>أمتار لكل وحدة مدى في §10.</summary>
        private const float RangeUnit = 6f;

        [MenuItem("مملكة الرماد/9) البناء والاقتصاد", false, 9)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(BuildFolder);
            Rows.Clear();

            UnitDefinition spearGuard = LoadUnit("Unit_Spearman");
            UnitDefinition archerGuard = LoadUnit("Unit_Archer");

            List<BuildingDefinition> catalogue = new List<BuildingDefinition>(8);

            // ── الاقتصاد ────────────────────────────────────────────────────
            BuildingDefinition guildHouse = Economy("Build_GuildHouse", "دار الصنّاع",
                "أعلى دخل في الكوخ، وتزيد غنيمة نهاية المرحلة.",
                cost: 130, income: 48, health: 400);

            BuildingDefinition safehouse = Economy("Build_Safehouse", "دار الأمان",
                "دخل أقلّ، لكنّها تعيد فرقة ساقطة عند الفجر.",
                cost: 120, income: 34, health: 460);

            BuildingDefinition cottage2 = Economy("Build_Cottage2", "كوخ موسّع",
                "بيتٌ زيد بناؤه فزاد دخله.",
                cost: 70, income: 28, health: 340, upgrades: new[] { guildHouse, safehouse });

            BuildingDefinition cottage = Economy("Build_Cottage", "كوخ",
                "أرخص دخل ثابت. أساس أي اقتصاد.",
                cost: 45, income: 16, health: 260, upgrades: new[] { cottage2 });

            BuildingDefinition grandHarvest = Economy("Build_GrandHarvest", "الحصاد الكبير",
                "أعلى دخل في اللعبة، وأهشّ ما يُحمى.",
                cost: 150, income: 76, health: 340);

            BuildingDefinition powderMill = Economy("Build_PowderMill", "مطحنة البارود",
                "دخل أقلّ، وتنفجر عند هدمها فتحرق من حولها.",
                cost: 140, income: 42, health: 300);

            BuildingDefinition farm2 = Economy("Build_Farm2", "مزرعة موسّعة",
                "حقل أوسع ودخل أعلى.",
                cost: 120, income: 48, health: 300, upgrades: new[] { grandHarvest, powderMill });

            BuildingDefinition farm = Economy("Build_Farm", "مزرعة",
                "دخل عالٍ وصحّة زهيدة — اقتصاد يحتاج حماية.",
                cost: 90, income: 32, health: 300, upgrades: new[] { farm2 },
                shape: BuildingShape.Farm);

            // ── الأبراج ─────────────────────────────────────────────────────
            BuildingDefinition longbow = Tower("Build_LongbowSpire", "برج القوس الطويل",
                "ضربة ثقيلة بطيئة، تصل أبعد من كل شيء.",
                cost: 180, health: 520, damage: 62f, rate: 0.75f, rangeUnits: 8.2f,
                targetClass: TargetClass.Ranged);

            BuildingDefinition splitshot = Tower("Build_SplitshotBastion", "حصن السهام الثلاثة",
                "ضربات أخفّ وأسرع، أنفع على الحشد.",
                cost: 175, health: 560, damage: 27f, rate: 1.6f, rangeUnits: 6.4f,
                targetClass: TargetClass.Nearest);

            BuildingDefinition watchtower2 = Tower("Build_Watchtower2", "برج مُحصَّن",
                "نفس البرج بضرر ومدى أعلى.",
                cost: 95, health: 480, damage: 29f, rate: 1.1f, rangeUnits: 6f,
                targetClass: TargetClass.Nearest, upgrades: new[] { longbow, splitshot });

            BuildingDefinition watchtower = Tower("Build_Watchtower", "برج مراقبة",
                "أرخص ضرر بعيد. يرمي ما دخل مداه بلا أمر.",
                cost: 75, health: 420, damage: 18f, rate: 1.1f, rangeUnits: 5.6f,
                targetClass: TargetClass.Nearest, upgrades: new[] { watchtower2 });

            // ── الحاميات ────────────────────────────────────────────────────
            BuildingDefinition barracks2 = Garrison("Build_Barracks2", "ثكنة كبرى",
                "ستّة حرّاس يرابطون حولها.",
                cost: 120, health: 620, guards: 6, guard: spearGuard);

            BuildingDefinition barracks = Garrison("Build_Barracks", "ثكنة",
                "أربعة حرّاس يوقفون من يعبر.",
                cost: 95, health: 500, guards: 4, guard: spearGuard,
                upgrades: new[] { barracks2 }, shape: BuildingShape.Barracks);

            BuildingDefinition camp2 = Garrison("Build_ArcherCamp2", "معسكر رماة كبير",
                "ستّة رماة يرمون من خلف الخطّ.",
                cost: 135, health: 480, guards: 6, guard: archerGuard,
                shape: BuildingShape.ArcherCamp);

            BuildingDefinition camp = Garrison("Build_ArcherCamp", "معسكر رماة",
                "أربعة رماة — ضرر بعيد يتحرّك بخلاف البرج.",
                cost: 110, health: 420, guards: 4, guard: archerGuard,
                upgrades: new[] { camp2 }, shape: BuildingShape.ArcherCamp);

            // ── المسلّات: ضرر سحري يتجاوز جزءاً من الدرع (§10) ──────────────
            BuildingDefinition stormObelisk = Obelisk("Build_StormObelisk", "مسلّة العاصفة",
                "صاعقة تقفز إلى أربعة، وتضعف عشرين في المئة عند كل قفزة.",
                cost: 195, health: 420, damage: 72f, rate: 0.7f, rangeUnits: 6f,
                pierce: 0.45f, chain: 4, chainFalloff: 0.8f);

            BuildingDefinition frostObelisk = Obelisk("Build_FrostObelisk", "مسلّة الصقيع",
                "ضرر أقلّ، لكنّها تُبطئ المصاب اثنين وثلاثين في المئة.",
                cost: 185, health: 440, damage: 46f, rate: 0.7f, rangeUnits: 6f,
                pierce: 0.45f, slowFactor: 0.68f, slowSeconds: 1.8f);

            BuildingDefinition obelisk2 = Obelisk("Build_Obelisk2", "مسلّة عليا",
                "نفس السحر بضرر مضاعف.",
                cost: 165, health: 410, damage: 72f, rate: 0.7f, rangeUnits: 5.8f,
                pierce: 0.40f, upgrades: new[] { stormObelisk, frostObelisk });

            BuildingDefinition obelisk = Obelisk("Build_Obelisk", "مسلّة سحرية",
                "ضربات بطيئة ثقيلة تتجاوز جزءاً من الدرع.",
                cost: 145, health: 380, damage: 44f, rate: 0.7f, rangeUnits: 5.8f,
                pierce: 0.40f, upgrades: new[] { obelisk2 });

            // ── القواذف: ضرر مساحة ضدّ الحشود (§10) ────────────────────────
            BuildingDefinition emberMortar = Bombard("Build_EmberMortar", "هاون الجمر",
                "انفجار أوسع يحرق ما حوله.",
                cost: 205, health: 500, damage: 78f, rate: 0.36f, rangeUnits: 7f,
                blastUnits: 2.1f, minUnits: 2.2f);

            BuildingDefinition breakerCannon = Bombard("Build_BreakerCannon", "مدفع الكاسر",
                "انفجار أضيق وضربة أثقل بكثير على المدرَّع.",
                cost: 215, health: 520, damage: 148f, rate: 0.36f, rangeUnits: 7f,
                blastUnits: 0.9f, minUnits: 2.2f, pierce: 0.35f);

            BuildingDefinition bombard = Bombard("Build_Bombard", "قاذف",
                "ضربة مساحة على الحشد. لا يصيب من اقترب منه.",
                cost: 170, health: 460, damage: 78f, rate: 0.36f, rangeUnits: 6.8f,
                blastUnits: 1.5f, minUnits: 2.2f,
                upgrades: new[] { emberMortar, breakerCannon });

            // ── الورش: دعمٌ يُبقي البناء واقفاً (§10) ──────────────────────
            BuildingDefinition engineerGuild = Workshop("Build_EngineerGuild", "نقابة المهندسين",
                "إصلاح أقوى وأوسع مدى.",
                cost: 190, health: 460, repair: 75f, targets: 4);

            BuildingDefinition trapworks = Workshop("Build_Trapworks", "دار الأفخاخ",
                "إصلاح أخفّ، ويزرع ما يُبطئ المهاجمين حولها.",
                cost: 180, health: 440, repair: 45f, targets: 3);

            BuildingDefinition workshop2 = Workshop("Build_Workshop2", "ورشة كبرى",
                "تصلح ثلاثة مبانٍ بخمسٍ وخمسين صحّة.",
                cost: 160, health: 420, repair: 55f, targets: 3,
                upgrades: new[] { engineerGuild, trapworks });

            BuildingDefinition workshop = Workshop("Build_Workshop", "ورشة",
                "تصلح أقرب مبنيين خمساً وثلاثين صحّة كل أربع ثوانٍ.",
                cost: 130, health: 380, repair: 35f, targets: 2,
                upgrades: new[] { workshop2 });

            // ── منارات الفجر كمبانٍ (§10 و§11) ────────────────────────────
            BuildingDefinition sanctuary = BeaconDef("Build_Sanctuary", "الملاذ",
                "منارة بثلاث شحنات — أوسع دائرة أمان في اللعبة.",
                cost: 210, health: 400, charges: 3);

            BuildingDefinition sunlance = BeaconDef("Build_Sunlance", "رمح الشمس",
                "منارة بشحنتين، وعمودها يقذف من يقترب.",
                cost: 200, health: 380, charges: 2);

            BuildingDefinition beacon2 = BeaconDef("Build_Beacon2", "منارة موسّعة",
                "شحنتان: دائرة أوسع وقضمٌ أعمق لدرع الظلام.",
                cost: 170, health: 360, charges: 2,
                upgrades: new[] { sanctuary, sunlance });

            BuildingDefinition beacon = BeaconDef("Build_Beacon", "منارة فجر",
                "دائرة نور جديدة حيث تحتاجها — تذيب درع الظلام.",
                cost: 140, health: 340, charges: 1, upgrades: new[] { beacon2 });

            // ── الجدران ─────────────────────────────────────────────────────
            BuildingDefinition wall2 = WallDef("Build_Wall2", "جدار مضاعف",
                "حجرٌ مضاعف يصبر أطول.", cost: 80, health: 1250);

            BuildingDefinition wall = WallDef("Build_Wall", "جدار",
                "يعترض الطريق ويشتري لك وقتاً.", cost: 55, health: 700,
                upgrades: new[] { wall2 });

            // ترتيب الكتالوج هو ترتيب البطاقات: الأرخص أوّلاً في كل نوع عقدة
            catalogue.Add(cottage);
            catalogue.Add(farm);
            catalogue.Add(watchtower);
            catalogue.Add(barracks);
            catalogue.Add(camp);
            catalogue.Add(obelisk);
            catalogue.Add(bombard);
            catalogue.Add(workshop);
            catalogue.Add(beacon);
            catalogue.Add(wall);

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(catalogue.ToArray());
        }

        // ── مصانع التعريفات ─────────────────────────────────────────────────

        private static BuildingDefinition Economy(string asset, string name, string summary,
            int cost, int income, float health, BuildingDefinition[] upgrades = null,
            BuildingShape shape = BuildingShape.Cottage)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Economy, cost, health, upgrades, shape,
                new[] { NodeKind.Economy, NodeKind.Inner });
            SetPrivate(def, "dawnIncome", income);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition Tower(string asset, string name, string summary,
            int cost, float health, float damage, float rate, float rangeUnits,
            TargetClass targetClass, BuildingDefinition[] upgrades = null)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Tower, cost, health, upgrades,
                BuildingShape.Watchtower, new[] { NodeKind.Outer, NodeKind.Inner });
            SetPrivate(def, "damage", damage);
            SetPrivate(def, "shotsPerSecond", rate);
            SetPrivate(def, "range", rangeUnits * RangeUnit);
            SetPrivate(def, "targetClass", targetClass);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition Garrison(string asset, string name, string summary,
            int cost, float health, int guards, UnitDefinition guard,
            BuildingDefinition[] upgrades = null, BuildingShape shape = BuildingShape.Barracks)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Garrison, cost, health, upgrades, shape,
                new[] { NodeKind.Inner, NodeKind.Gate });
            SetPrivate(def, "guardCount", guards);
            SetPrivate(def, "guard", guard);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition Obelisk(string asset, string name, string summary,
            int cost, float health, float damage, float rate, float rangeUnits, float pierce,
            int chain = 0, float chainFalloff = 0.8f, float slowFactor = 1f, float slowSeconds = 0f,
            BuildingDefinition[] upgrades = null)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Tower, cost, health, upgrades,
                BuildingShape.Obelisk, new[] { NodeKind.Inner, NodeKind.Outer });
            SetPrivate(def, "damage", damage);
            SetPrivate(def, "shotsPerSecond", rate);
            SetPrivate(def, "range", rangeUnits * RangeUnit);
            SetPrivate(def, "armourPierce", pierce);
            SetPrivate(def, "chainTargets", chain);
            SetPrivate(def, "chainFalloff", chainFalloff);
            SetPrivate(def, "slowFactor", slowFactor);
            SetPrivate(def, "slowSeconds", slowSeconds);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition Bombard(string asset, string name, string summary,
            int cost, float health, float damage, float rate, float rangeUnits,
            float blastUnits, float minUnits, float pierce = 0f,
            BuildingDefinition[] upgrades = null)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Tower, cost, health, upgrades,
                BuildingShape.Bombard, new[] { NodeKind.Inner, NodeKind.Outer });
            SetPrivate(def, "damage", damage);
            SetPrivate(def, "shotsPerSecond", rate);
            SetPrivate(def, "range", rangeUnits * RangeUnit);
            SetPrivate(def, "blastRadius", blastUnits * RangeUnit);
            SetPrivate(def, "minimumRange", minUnits * RangeUnit);
            SetPrivate(def, "armourPierce", pierce);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition Workshop(string asset, string name, string summary,
            int cost, float health, float repair, int targets,
            BuildingDefinition[] upgrades = null)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Support, cost, health, upgrades,
                BuildingShape.Workshop, new[] { NodeKind.Inner, NodeKind.Economy });
            SetPrivate(def, "repairAmount", repair);
            SetPrivate(def, "repairTargets", targets);
            SetPrivate(def, "repairInterval", 4f);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition BeaconDef(string asset, string name, string summary,
            int cost, float health, int charges, BuildingDefinition[] upgrades = null)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Beacon, cost, health, upgrades,
                BuildingShape.Beacon, new[] { NodeKind.Beacon, NodeKind.Inner, NodeKind.Outer });
            SetPrivate(def, "lightCharges", charges);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static BuildingDefinition WallDef(string asset, string name, string summary,
            int cost, float health, BuildingDefinition[] upgrades = null)
        {
            BuildingDefinition def = Make(asset);
            Common(def, asset, name, summary, BuildingRole.Wall, cost, health, upgrades,
                BuildingShape.Wall, new[] { NodeKind.Gate });
            EditorUtility.SetDirty(def);
            return def;
        }


        /// <summary>
        /// الترجمة الإنجليزية للمحتوى، مفتاحها اسم الأصل.
        ///
        /// جدولٌ واحد لا وسيطان في كل مصنع: إضافة وسيطَي ترجمة إلى ثمانية
        /// مصانع وثلاثة وثلاثين نداءً تُغرق ملفّ الأرقام بنصوص، والمترجم اللغوي
        /// يريد النصوص مجتمعة لا مبعثرة بين التكاليف.
        /// </summary>
        private static readonly Dictionary<string, string[]> English =
            new Dictionary<string, string[]>
        {
            { "Build_Cottage", new[] { "Cottage", "The cheapest steady income. The base of any economy." } },
            { "Build_Cottage2", new[] { "Expanded Cottage", "A house built out, so its income grew." } },
            { "Build_GuildHouse", new[] { "Guild House", "Highest cottage income, and a larger end-of-stage haul." } },
            { "Build_Safehouse", new[] { "Safehouse", "Less income, but it restores one fallen squad at dawn." } },

            { "Build_Farm", new[] { "Farm", "High income and slight health — an economy that needs guarding." } },
            { "Build_Farm2", new[] { "Expanded Farm", "A wider field and higher income." } },
            { "Build_GrandHarvest", new[] { "Grand Harvest", "The highest income in the game, and the frailest thing to guard." } },
            { "Build_PowderMill", new[] { "Powder Mill", "Less income, and it bursts when torn down, burning what stands near." } },

            { "Build_Watchtower", new[] { "Watchtower", "The cheapest ranged damage. It shoots whatever enters its reach, unbidden." } },
            { "Build_Watchtower2", new[] { "Fortified Tower", "The same tower with higher damage and reach." } },
            { "Build_LongbowSpire", new[] { "Longbow Spire", "A heavy slow strike that reaches further than anything." } },
            { "Build_SplitshotBastion", new[] { "Splitshot Bastion", "Lighter, faster strikes — better against a crowd." } },

            { "Build_Barracks", new[] { "Barracks", "Four guards who stop whoever passes." } },
            { "Build_Barracks2", new[] { "Great Barracks", "Six guards posted around it." } },
            { "Build_ArcherCamp", new[] { "Archer Camp", "Four archers — ranged damage that moves, unlike a tower." } },
            { "Build_ArcherCamp2", new[] { "Great Archer Camp", "Six archers shooting from behind the line." } },

            { "Build_Obelisk", new[] { "Arcane Obelisk", "Slow heavy strikes that pierce part of the armour." } },
            { "Build_Obelisk2", new[] { "High Obelisk", "The same magic at doubled damage." } },
            { "Build_StormObelisk", new[] { "Storm Obelisk", "A bolt that leaps to four, weakening twenty percent each jump." } },
            { "Build_FrostObelisk", new[] { "Frost Obelisk", "Less damage, but it slows the struck by thirty-two percent." } },

            { "Build_Bombard", new[] { "Bombard", "An area strike on the crowd. It cannot hit whoever closes on it." } },
            { "Build_EmberMortar", new[] { "Ember Mortar", "A wider burst that burns what surrounds it." } },
            { "Build_BreakerCannon", new[] { "Breaker Cannon", "A narrower burst and a far heavier blow against the armoured." } },

            { "Build_Workshop", new[] { "Workshop", "Repairs the nearest two buildings thirty-five health every four seconds." } },
            { "Build_Workshop2", new[] { "Great Workshop", "Repairs three buildings by fifty-five health." } },
            { "Build_EngineerGuild", new[] { "Engineer Guild", "Stronger repair over a wider reach." } },
            { "Build_Trapworks", new[] { "Trapworks", "Lighter repair, and it lays what slows attackers around it." } },

            { "Build_Beacon", new[] { "Dawn Beacon", "A new circle of light where you need it — it melts dark armour." } },
            { "Build_Beacon2", new[] { "Expanded Beacon", "Two charges: a wider circle and a deeper bite into dark armour." } },
            { "Build_Sanctuary", new[] { "Sanctuary", "A beacon of three charges — the widest circle of safety in the game." } },
            { "Build_Sunlance", new[] { "Sunlance", "A beacon of two charges whose spire strikes whoever nears." } },

            { "Build_Wall", new[] { "Wall", "It blocks the path and buys you time." } },
            { "Build_Wall2", new[] { "Double Wall", "Doubled stone that endures longer." } },
        };

        /// <summary>صفوف النصوص التي تجمعها هذه الخطوة قبل ضمّها إلى الجدول.</summary>
        private static readonly List<Dawnkeep.Localization.LocaleTable.Entry> Rows =
            new List<Dawnkeep.Localization.LocaleTable.Entry>(48);

        private static void Common(BuildingDefinition def, string assetName, string name,
            string summary, BuildingRole role, int cost, float health, BuildingDefinition[] upgrades,
            BuildingShape shape, NodeKind[] nodes)
        {
            // الاسم والوصف مفتاحان في الجدول، والحرفيّان يبقيان احتياطاً
            string key = DawnkeepLocale.ContentKey(assetName);
            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "summaryKey", key + ".summary");
            SetPrivate(def, "displayName", name);
            SetPrivate(def, "summary", summary);

            string[] translated;
            if (!English.TryGetValue(assetName, out translated))
            {
                // بلا ترجمة: تُرَدّ العربية في اللغتين، ويكشفها فحص المفاتيح
                translated = new[] { name, summary };
            }

            Rows.Add(DawnkeepLocale.Row(key, name, translated[0]));
            Rows.Add(DawnkeepLocale.Row(key + ".summary", summary, translated[1]));
            SetPrivate(def, "role", role);
            SetPrivate(def, "cost", cost);
            SetPrivate(def, "maxHealth", health);
            SetPrivate(def, "shape", shape);
            SetPrivate(def, "nodes", nodes);
            SetPrivate(def, "upgrades", upgrades ?? new BuildingDefinition[0]);
        }

        private static BuildingDefinition Make(string assetName)
        {
            string path = BuildFolder + "/" + assetName + ".asset";
            BuildingDefinition def = AssetDatabase.LoadAssetAtPath<BuildingDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<BuildingDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            return def;
        }

        private static UnitDefinition LoadUnit(string assetName)
        {
            string path = DawnkeepCombatSetup.CombatFolder + "/" + assetName + ".asset";
            UnitDefinition unit = AssetDatabase.LoadAssetAtPath<UnitDefinition>(path);
            if (unit == null)
            {
                Debug.LogWarning("مملكة الرماد: لا تعريف " + assetName + " — نفّذ القائمة 6 أوّلاً.");
            }

            return unit;
        }

        // ── المشهد ──────────────────────────────────────────────────────────

        private static void WireScene(BuildingDefinition[] catalogue)
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

            Require<Treasury>(battle);

            BuildingMaterials materials = Require<BuildingMaterials>(battle);
            SetPrivate(materials, "stone", LoadMaterial("Dawnkeep_Stone"));
            SetPrivate(materials, "timber", LoadMaterial("Dawnkeep_Timber"));
            SetPrivate(materials, "thatch", LoadMaterial("Dawnkeep_Thatch"));
            SetPrivate(materials, "plaster", LoadMaterial("Dawnkeep_Plaster"));

            BuildingDirector director = Require<BuildingDirector>(battle);
            SetPrivate(director, "catalogue", catalogue);

            BuildCommander commander = Require<BuildCommander>(battle);

            BuildPanel panel = WirePanel();
            SetPrivate(commander, "panel", panel);

            EnsureKeep();
            int nodes = PlaceNodes();

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log("مملكة الرماد: البناء جاهز — " + catalogue.Length + " مبانٍ و" + nodes
                + " عقدة. اضغط Play وانقر عقدةً أثناء الاستعداد.");
        }

        /// <summary>لوحة البطاقات تعيش على نفس لوحة الواجهة، بخطّها نفسه.</summary>
        private static BuildPanel WirePanel()
        {
            GameObject canvas = GameObject.Find("BattleHud");
            if (canvas == null)
            {
                Debug.LogWarning("مملكة الرماد: لا لوحة BattleHud — نفّذ القائمة 7 أوّلاً.");
                return null;
            }

            BuildPanel panel = Require<BuildPanel>(canvas);

            TMP_FontAsset font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri_Bold.asset");

            if (font == null)
            {
                font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                    DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri.asset");
            }

            SetPrivate(panel, "font", font);
            EditorUtility.SetDirty(canvas);
            return panel;
        }

        /// <summary>
        /// يوزّع العقد على أربع حلقات حول الحصن.
        ///
        /// الحلقات مباعدة عن حلقة المنارات (0.74) بعشرين متراً على الأقلّ: آمر
        /// النور وآمر البناء يلتقطان النقرة كلٌّ بنصف قطره، وتقارب الحلقتين
        /// يجعل لمسةً واحدة تنقل شحنةً وتفتح بطاقات معاً.
        /// </summary>
        private static int PlaceNodes()
        {
            GameObject root = GameObject.Find("BuildNodes");
            if (root == null)
            {
                root = new GameObject("BuildNodes");
            }

            float castle = CastleRadius();
            float threat = ThreatAngle();

            // (نوع العقدة، مستوى قلب الحصن الذي يفتحها) — §10: يفتح المستوى
            // الأوّل خمساً، ثمّ ثلاثاً، ثمّ أربعاً، ثمّ أربعاً.
            NodeKind[] kinds =
            {
                NodeKind.Economy, NodeKind.Economy, NodeKind.Inner, NodeKind.Outer, NodeKind.Gate,
                NodeKind.Economy, NodeKind.Outer, NodeKind.Inner,
                NodeKind.Economy, NodeKind.Economy, NodeKind.Outer, NodeKind.Gate,
                NodeKind.Economy, NodeKind.Inner, NodeKind.Inner, NodeKind.Outer,
            };

            int[] tiers = { 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4 };

            // عدّاد لكل نوع: كل نوع على حلقته وبزاويته، فلا تتراكب عقدتان
            int economy = 0;
            int inner = 0;
            int outer = 0;
            int gate = 0;

            for (int i = 0; i < kinds.Length; i++)
            {
                float radius;
                float angle;

                switch (kinds[i])
                {
                    case NodeKind.Economy:
                        radius = castle * 0.40f;
                        angle = threat + 0.78f + (economy++ * Mathf.PI * 2f / 6f);
                        break;

                    case NodeKind.Inner:
                        radius = castle * 0.52f;
                        angle = threat + 0.30f + (inner++ * Mathf.PI * 2f / 4f);
                        break;

                    case NodeKind.Outer:
                        radius = castle * 1.10f;
                        angle = threat + 1.05f + (outer++ * Mathf.PI * 2f / 4f);
                        break;

                    default:      // البوّابة على مسار المهاجمين مباشرةً
                        radius = castle * (gate++ == 0 ? 1.02f : 1.16f);
                        angle = threat;
                        break;
                }

                Point(root, i, kinds[i], radius, angle, tiers[i]);
            }

            EditorUtility.SetDirty(root);
            return kinds.Length;
        }

        /// <summary>قلب الحصن على مركز القلعة — صحّته شرط الخسارة (§5).</summary>
        private static void EnsureKeep()
        {
            GameObject kingdom = GameObject.Find("Kingdom");
            if (kingdom == null)
            {
                Debug.LogWarning("مملكة الرماد: لا كائن Kingdom — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            // القلعة مبنيّة حول أصل العالم، فمركزها هو الصفر لا موضع كائنها
            GameObject holder = GameObject.Find("KeepCore");
            if (holder == null)
            {
                holder = new GameObject("KeepCore");
                holder.transform.SetParent(kingdom.transform, false);
            }

            holder.transform.position = new Vector3(0f, Height(0f, 0f), 0f);
            Require<Keep>(holder);
            EditorUtility.SetDirty(holder);
        }

        private static int Point(GameObject root, int index, NodeKind kind,
            float radius, float angle, int tier)
        {
            string name = "Node_" + kind + "_" + index;
            Transform existing = root.transform.Find(name);
            GameObject go = existing != null ? existing.gameObject : new GameObject(name);
            go.transform.SetParent(root.transform, false);

            float x = Mathf.Cos(angle) * radius;
            float z = Mathf.Sin(angle) * radius;
            go.transform.position = new Vector3(x, Height(x, z), z);
            go.transform.rotation = Quaternion.identity;

            BuildNode node = go.GetComponent<BuildNode>();
            if (node == null)
            {
                node = go.AddComponent<BuildNode>();
            }

            // البذرة من ترتيب العقدة: ثابتة بين التشغيلات، ومختلفة بين العقد
            node.Configure(kind, tier, index * 3);
            EditorUtility.SetDirty(node);
            return index + 1;
        }

        private static float ThreatAngle()
        {
            GameObject spawn = GameObject.Find("HordeSpawn");
            if (spawn == null)
            {
                return 0f;
            }

            Vector3 from = spawn.transform.position;
            if ((from.x * from.x) + (from.z * from.z) < 1f)
            {
                return 0f;
            }

            return Mathf.Atan2(from.z, from.x);
        }

        private static float CastleRadius()
        {
            WorldGenSettings settings =
                AssetDatabase.LoadAssetAtPath<WorldGenSettings>(DawnkeepAssetPaths.WorldSettings);

            if (settings == null)
            {
                return 96f;
            }

            return settings.CastleRadius * settings.WorldScale;
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

        private static Material LoadMaterial(string name)
        {
            return AssetDatabase.LoadAssetAtPath<Material>(
                DawnkeepAssetPaths.Materials + "/" + name + ".mat");
        }

        private static T Require<T>(GameObject target) where T : Component
        {
            T component = target.GetComponent<T>();
            if (component == null)
            {
                component = target.AddComponent<T>();
            }

            return component;
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
