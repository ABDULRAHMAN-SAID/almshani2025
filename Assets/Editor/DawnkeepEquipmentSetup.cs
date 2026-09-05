using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Boons;
using Dawnkeep.Equipment;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// عتاد §17: ستّة أسلحة وأربعة مراكب واثنا عشر أثراً وستّة دروع.
    ///
    /// **الأسلحة تختلف بشكل الضربة لا برقمها**: قوسٌ وسيفٌ يفترقان بالضرر
    /// وحده هما رقمٌ واحد مكتوبٌ مرّتين. فلكلٍّ `WeaponKind` يقرؤه البطل عند
    /// كل ضربة، ومداه وفترته من القطعة نفسها لا من تعريف البطل.
    ///
    /// **والآثار تدعم أسلوباً**: §17 تقول «كل أثر يدعم أسلوباً محدّداً ويشرح
    /// أثره بلغة مباشرة». فليس فيها أثرٌ يزيد كل شيء قليلاً — ذاك رقمٌ لا
    /// أسلوب. وستّةٌ منها بالأسماء التي عدّتها §17، والستّة الباقية على
    /// قياسها.
    ///
    /// ولا صندوق حظّ ولا متجرٍ يوميّ هنا: §41 تقول «لا تبدأ المتجر قبل أن
    /// تصبح الحلقة الأساسية ممتعة وتعمل»، و§17 تمنع صندوق الاحتمالات في
    /// الإصدار الأوّل. فالطريق إلى القطعة: مخطّطٌ من المراحل، وصناعةٌ في
    /// الحدّادة.
    ///
    /// **وأثمان الشظايا معايَرةٌ على منح §21 لا مخترعة**: §21 تحصر ما تمنحه
    /// المرحلة في «0 إلى 3» شظايا، فحملةُ أربعين مرحلةً تعطي مئةً وعشرين —
    /// والبحث (§16) يقاسمها الجيب. وأثمانُ §17 الأولى كانت معايَرةً على
    /// اقتصادٍ يعطي أربعاً وخمسين في الجولة الواحدة، فكانت الحملةُ كلّها
    /// تبلغ بسيفٍ المستوى السادس. `gearcheck.py` هو من قاس ذلك، والأثمان
    /// هنا مقسومةٌ على ثلاثة.
    /// </summary>
    public static class DawnkeepEquipmentSetup
    {
        public const string GearFolder = DawnkeepAssetPaths.Settings + "/Equipment";

        private static readonly List<LocaleTable.Entry> Rows = new List<LocaleTable.Entry>(96);

        [MenuItem("مملكة الرماد/19) العتاد والتجهيز", false, 19)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(GearFolder);
            Rows.Clear();

            List<EquipmentDefinition> all = new List<EquipmentDefinition>(28);

            // ══ الأسلحة الستّة (§17) ══════════════════════════════════════
            //
            // قوس الفجر هو الأساس، وسلاح البداية: بطلٌ بلا سلاحٍ لا يقاتل،
            // فواحدٌ منها **مملوكٌ من البداية** ولا يُفكَّك.

            all.Add(Weapon("Gear_DawnBow", "قوس الفجر", "Dawn Bow",
                "بعيدٌ متوازن، هدفٌ واحد. الأساس الذي تُقاس عليه البقيّة.",
                "Ranged and balanced, one target. The baseline for the rest.",
                WeaponKind.DawnBow, Rarity.Common,
                range: 4.8f, interval: 0.65f, shape: 1f, gold: 100, essence: 2,
                start: true,
                a: Change(BoonStat.HeroDamage, 1f)));

            all.Add(Weapon("Gear_Sunblade", "نصل الشمس", "Sunblade",
                "قريبٌ يضرب قوساً: يصيب كل من أمامك في ثمانين درجة.",
                "Close range, arc strike: hits everyone in an eighty-degree arc.",
                WeaponKind.Sunblade, Rarity.Uncommon,
                range: 1.6f, interval: 0.55f, shape: 80f, gold: 180, essence: 3,
                start: false,
                a: Change(BoonStat.HeroDamage, 0.82f),
                b: Change(BoonStat.HeroAttackSpeed, 1.10f)));

            all.Add(Weapon("Gear_StormStaff", "عصا العاصفة", "Storm Staff",
                "يرتدّ إلى هدفٍ ثانٍ بنصف ضرره — بعيدٌ وأبطأ.",
                "Arcs to a second target for half damage — ranged and slower.",
                WeaponKind.StormStaff, Rarity.Rare,
                range: 4.2f, interval: 0.90f, shape: 0.5f, gold: 260, essence: 5,
                start: false,
                a: Change(BoonStat.HeroDamage, 0.88f)));

            all.Add(Weapon("Gear_HandBallista", "باليستا اليد", "Hand Ballista",
                "بطيئةٌ تخترق خطّاً: تصيب كل من على مسار السهم.",
                "Slow, pierces a line: hits everyone along the bolt's path.",
                WeaponKind.HandBallista, Rarity.Rare,
                range: 6.4f, interval: 1.35f, shape: 1.4f, gold: 280, essence: 6,
                start: false,
                a: Change(BoonStat.HeroDamage, 1.45f),
                b: Change(BoonStat.HeroAttackSpeed, 0.85f)));

            all.Add(Weapon("Gear_EmberAxe", "فأس الجمر", "Ember Axe",
                "قريبٌ بضرر منطقة حول الهدف — يُنصف الأسراب ويُبطئ عن المدرَّع.",
                "Close range, area damage around the target — halves swarms, slow on armour.",
                WeaponKind.EmberAxe, Rarity.Epic,
                range: 1.8f, interval: 1.05f, shape: 3.6f, gold: 340, essence: 8,
                start: false,
                a: Change(BoonStat.HeroDamage, 1.12f)));

            all.Add(Weapon("Gear_EngineerGauntlet", "قفّاز المهندس", "Engineer Gauntlet",
                "مقذوفاتٌ قصيرة، ويقوّي إصلاح الورشة بالثلث.",
                "Short-range shots, and strengthens workshop repair by a third.",
                WeaponKind.EngineerGauntlet, Rarity.Epic,
                range: 3.0f, interval: 0.70f, shape: 1.33f, gold: 320, essence: 7,
                start: false,
                a: Change(BoonStat.HeroDamage, 0.90f),
                b: Change(BoonStat.BuildingHealth, 1.12f)));

            // ══ المراكب الأربعة (§17) ═════════════════════════════════════
            // «المركوب لا يغيّر Hitbox بصورة غير عادلة» — فلا واحدٌ منها يمسّ
            // صحّة البطل أو مداه؛ كلّها على السرعة وما يتبعها.

            all.Add(Gear("Mount_Courser", "الجواد الطليق", "Courser",
                "سرعةٌ متوازنة: ‎+12%‎ حركةً بلا ثمن.",
                "Balanced speed: +12% movement, no downside.",
                EquipmentSlot.Mount, Rarity.Common, gold: 120, essence: 3, start: true,
                a: Change(BoonStat.ArmyMoveSpeed, 1.12f)));

            all.Add(Gear("Mount_ArmoredBoar", "الخنزير المدرَّع", "Armored Boar",
                "أبطأ، لكنّه يزيد صحّتك الخُمس ويصمد في الاشتباك.",
                "Slower, but adds a fifth to your health and holds the line.",
                EquipmentSlot.Mount, Rarity.Uncommon, gold: 200, essence: 4, start: false,
                a: Change(BoonStat.ArmyMoveSpeed, 0.92f),
                b: Change(BoonStat.HeroHealth, 1.20f)));

            all.Add(Gear("Mount_DawnBeetle", "خنفساء الفجر", "Dawn Beetle",
                "حاجزٌ دوريّ: ‎+15%‎ صحّةً و‎+10%‎ مقاومةً للجند حولك.",
                "A periodic ward: +15% health and +10% resistance for nearby troops.",
                EquipmentSlot.Mount, Rarity.Rare, gold: 280, essence: 6, start: false,
                a: Change(BoonStat.HeroHealth, 1.15f),
                b: Change(BoonStat.ArmyResistance, 1.10f)));

            all.Add(Gear("Mount_WindStag", "أيّل الريح", "Wind Stag",
                "سريعٌ يقصّر مهلة القدرات الخُمس — أسلوب الكرّ والفرّ.",
                "Fast, and cuts ability cooldowns by a fifth — hit and run.",
                EquipmentSlot.Mount, Rarity.Epic, gold: 360, essence: 9, start: false,
                a: Change(BoonStat.ArmyMoveSpeed, 1.22f),
                b: Change(BoonStat.HeroCooldown, 0.80f)));

            // ══ الآثار الاثنا عشر (§17) ═══════════════════════════════════
            // ستٌّ بأسماء §17 نفسها، وستٌّ على قياسها. ولكلٍّ **أسلوبٌ** واحد
            // يدعمه بوضوح، لا زيادةٌ صغيرة في كل شيء.

            all.Add(Gear("Relic_LanternHeart", "قلب القنديل", "Lantern Heart",
                "أسلوب النور: ‎+18%‎ لنصف قطر المنارة و‎−20%‎ لمدّة إطفائها.",
                "The light style: +18% beacon radius and −20% snuff time.",
                EquipmentSlot.Relic, Rarity.Rare, gold: 240, essence: 5, start: false,
                a: Change(BoonStat.BeaconRadius, 1.18f),
                b: Change(BoonStat.SnuffSeconds, 0.80f)));

            all.Add(Gear("Relic_CaptainsSeal", "خاتم القائد", "Captain's Seal",
                "أسلوب الجند: ‎+15%‎ لصحّتهم و‎+12%‎ لسرعة ضربهم.",
                "The army style: +15% troop health and +12% attack speed.",
                EquipmentSlot.Relic, Rarity.Rare, gold: 240, essence: 5, start: false,
                a: Change(BoonStat.ArmyHealth, 1.15f),
                b: Change(BoonStat.ArmyAttackSpeed, 1.12f)));

            all.Add(Gear("Relic_BrokenSundial", "المزولة المكسورة", "Broken Sundial",
                "أسلوب القدرات: ‎−22%‎ لمهلتها، و‎−8%‎ من ضربتك العادية.",
                "The ability style: −22% cooldowns, and −8% off your basic strike.",
                EquipmentSlot.Relic, Rarity.Epic, gold: 320, essence: 7, start: false,
                a: Change(BoonStat.HeroCooldown, 0.78f),
                b: Change(BoonStat.HeroDamage, 0.92f)));

            all.Add(Gear("Relic_MasonsOath", "عهد البنّاء", "Mason's Oath",
                "أسلوب التحصين: ‎+20%‎ لصحّة المباني و‎+10%‎ لقلب الحصن.",
                "The fortification style: +20% building health and +10% keep health.",
                EquipmentSlot.Relic, Rarity.Uncommon, gold: 180, essence: 3, start: false,
                a: Change(BoonStat.BuildingHealth, 1.20f),
                b: Change(BoonStat.KeepHealth, 1.10f)));

            all.Add(Gear("Relic_HarvestCoin", "دينار الحصاد", "Harvest Coin",
                "أسلوب الاقتصاد: ‎+16%‎ لدخل المباني و‎+12%‎ لمكافأة القتل.",
                "The economy style: +16% building income and +12% kill bounty.",
                EquipmentSlot.Relic, Rarity.Uncommon, gold: 180, essence: 3, start: false,
                a: Change(BoonStat.BuildingIncome, 1.16f),
                b: Change(BoonStat.KillBounty, 1.12f)));

            all.Add(Gear("Relic_AshMirror", "مرآة الرماد", "Ash Mirror",
                "أسلوب الظلام: ‎+25%‎ لقضم الدرع، لكنّ نصف قطر المنارة أقلّ ‎12%‎.",
                "The dark style: +25% armour shred, but 12% less beacon radius.",
                EquipmentSlot.Relic, Rarity.Epic, gold: 330, essence: 8, start: false,
                a: Change(BoonStat.BeaconArmourCut, 1.25f),
                b: Change(BoonStat.BeaconRadius, 0.88f)));

            all.Add(Gear("Relic_QuarryStone", "حجر المحجر", "Quarry Stone",
                "أسلوب البناء الواسع: ‎−14%‎ لثمن البناء.",
                "The wide-build style: −14% build cost.",
                EquipmentSlot.Relic, Rarity.Common, gold: 120, essence: 2, start: true,
                a: Change(BoonStat.BuildCost, 0.86f)));

            all.Add(Gear("Relic_LongSight", "بُعد النظر", "Long Sight",
                "أسلوب الأبراج: ‎+15%‎ لمداها و‎+8%‎ لمعدّل رميها.",
                "The tower style: +15% range and +8% fire rate.",
                EquipmentSlot.Relic, Rarity.Rare, gold: 250, essence: 6, start: false,
                a: Change(BoonStat.TowerRange, 1.15f),
                b: Change(BoonStat.TowerFireRate, 1.08f)));

            all.Add(Gear("Relic_PiercingWard", "الوسم الخارق", "Piercing Ward",
                "أسلوب المدرَّعين: ‎+18%‎ اختراقاً لدرع الأبراج.",
                "The anti-armour style: +18% tower armour pierce.",
                EquipmentSlot.Relic, Rarity.Rare, gold: 250, essence: 6, start: false,
                a: Change(BoonStat.TowerPierce, 1.18f)));

            all.Add(Gear("Relic_RallyHorn", "بوق الحشد", "Rally Horn",
                "أسلوب القيادة: ‎+30%‎ لنصف قطر الحشد و‎+10%‎ لمقاومة الجند.",
                "The command style: +30% rally radius and +10% troop resistance.",
                EquipmentSlot.Relic, Rarity.Uncommon, gold: 190, essence: 4, start: false,
                a: Change(BoonStat.HeroRallyRadius, 1.30f),
                b: Change(BoonStat.ArmyResistance, 1.10f)));

            all.Add(Gear("Relic_DuelistsMark", "وسم المبارز", "Duelist's Mark",
                "أسلوب المبارزة: ‎+22%‎ لضررك و‎+6%‎ للضربة الحاسمة، وصحّتك أقلّ ‎10%‎.",
                "The duel style: +22% damage and +6% crit, at 10% less health.",
                EquipmentSlot.Relic, Rarity.Legendary, gold: 480, essence: 13, start: false,
                a: Change(BoonStat.HeroDamage, 1.22f),
                b: Change(BoonStat.HeroCrit, 1.06f),
                c: Change(BoonStat.HeroHealth, 0.90f)));

            all.Add(Gear("Relic_DawnLedger", "دفتر الفجر", "Dawn Ledger",
                "أسلوب المدّخر: ‎+20%‎ لدخل الموجة و‎+10%‎ لما يردّه البيع.",
                "The saver's style: +20% wave income and +10% sell refund.",
                EquipmentSlot.Relic, Rarity.Legendary, gold: 460, essence: 13, start: false,
                a: Change(BoonStat.WaveIncome, 1.20f),
                b: Change(BoonStat.SellRefund, 1.10f)));

            // ══ الدروع الستّة ═════════════════════════════════════════════
            // §17 تعدّ الفتحة ولا تعدّ محتواها، فهذه على قياس الآثار: لكلٍّ
            // مقايضةٌ لا زيادةٌ صِرف.

            all.Add(Gear("Armor_Padded", "درعٌ مبطَّن", "Padded Coat",
                "‎+12%‎ صحّةً. درع البداية.",
                "+12% health. The starting armour.",
                EquipmentSlot.Armor, Rarity.Common, gold: 100, essence: 2, start: true,
                a: Change(BoonStat.HeroHealth, 1.12f)));

            all.Add(Gear("Armor_Scale", "درعٌ حَرشفيّ", "Scale Mail",
                "‎+22%‎ صحّةً و‎−6%‎ سرعةَ حركة.",
                "+22% health and −6% movement.",
                EquipmentSlot.Armor, Rarity.Uncommon, gold: 190, essence: 4, start: false,
                a: Change(BoonStat.HeroHealth, 1.22f),
                b: Change(BoonStat.ArmyMoveSpeed, 0.94f)));

            all.Add(Gear("Armor_Dawnplate", "صفيحة الفجر", "Dawnplate",
                "‎+34%‎ صحّةً و‎+12%‎ مقاومةً للجند، و‎−12%‎ سرعةَ ضرب.",
                "+34% health, +12% troop resistance, and −12% attack speed.",
                EquipmentSlot.Armor, Rarity.Rare, gold: 270, essence: 6, start: false,
                a: Change(BoonStat.HeroHealth, 1.34f),
                b: Change(BoonStat.ArmyResistance, 1.12f),
                c: Change(BoonStat.HeroAttackSpeed, 0.88f)));

            all.Add(Gear("Armor_Shadowweave", "نسيج الظلّ", "Shadowweave",
                "‎+16%‎ سرعةَ ضرب و‎+10%‎ حركةً، وصحّتك أقلّ ‎8%‎.",
                "+16% attack speed and +10% movement, at 8% less health.",
                EquipmentSlot.Armor, Rarity.Epic, gold: 340, essence: 8, start: false,
                a: Change(BoonStat.HeroAttackSpeed, 1.16f),
                b: Change(BoonStat.ArmyMoveSpeed, 1.10f),
                c: Change(BoonStat.HeroHealth, 0.92f)));

            all.Add(Gear("Armor_Bulwark", "حِصنُ الصدر", "Bulwark Harness",
                "‎+28%‎ صحّةً و‎+18%‎ لصحّة قلب الحصن — للمدافع الصبور.",
                "+28% health and +18% keep health — for the patient defender.",
                EquipmentSlot.Armor, Rarity.Epic, gold: 350, essence: 8, start: false,
                a: Change(BoonStat.HeroHealth, 1.28f),
                b: Change(BoonStat.KeepHealth, 1.18f)));

            all.Add(Gear("Armor_FirstLight", "أوّل الضوء", "First Light",
                "‎+30%‎ صحّةً و‎+15%‎ لمدى النور حولك، و‎−10%‎ ضرراً.",
                "+30% health and +15% light range around you, at 10% less damage.",
                EquipmentSlot.Armor, Rarity.Legendary, gold: 470, essence: 13, start: false,
                a: Change(BoonStat.HeroHealth, 1.30f),
                b: Change(BoonStat.LightRangeBonus, 1.15f),
                c: Change(BoonStat.HeroDamage, 0.90f)));

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(all.ToArray());

            Debug.Log("مملكة الرماد: بُني عتاد §17 — " + all.Count + " قطعة.");
        }

        // ── البناء ─────────────────────────────────────────────────────────

        private static BoonDefinition.Change Change(BoonStat stat, float multiplier)
        {
            BoonDefinition.Change change = new BoonDefinition.Change();
            change.Stat = stat;
            change.Multiplier = multiplier;
            return change;
        }

        private static EquipmentDefinition Weapon(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, WeaponKind kind, Rarity rarity,
            float range, float interval, float shape, int gold, int essence, bool start,
            BoonDefinition.Change a,
            BoonDefinition.Change? b = null, BoonDefinition.Change? c = null)
        {
            EquipmentDefinition def = Gear(assetName, arabic, english, summaryAr, summaryEn,
                EquipmentSlot.Weapon, rarity, gold, essence, start, a, b, c);

            SetPrivate(def, "weapon", kind);
            SetPrivate(def, "rangeUnits", range);
            SetPrivate(def, "interval", interval);
            SetPrivate(def, "shape", shape);
            EditorUtility.SetDirty(def);
            return def;
        }

        private static EquipmentDefinition Gear(string assetName, string arabic, string english,
            string summaryAr, string summaryEn, EquipmentSlot slot, Rarity rarity,
            int gold, int essence, bool start,
            BoonDefinition.Change a,
            BoonDefinition.Change? b = null, BoonDefinition.Change? c = null)
        {
            string path = GearFolder + "/" + assetName + ".asset";
            EquipmentDefinition def = AssetDatabase.LoadAssetAtPath<EquipmentDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<EquipmentDefinition>();
                AssetDatabase.CreateAsset(def, path);
            }

            List<BoonDefinition.Change> changes = new List<BoonDefinition.Change>(3);
            changes.Add(a);
            if (b.HasValue)
            {
                changes.Add(b.Value);
            }

            if (c.HasValue)
            {
                changes.Add(c.Value);
            }

            string key = DawnkeepLocale.ContentKey(assetName);
            Rows.Add(DawnkeepLocale.Row(key, arabic, english));
            Rows.Add(DawnkeepLocale.Row(key + ".summary", summaryAr, summaryEn));

            SetPrivate(def, "nameKey", key);
            SetPrivate(def, "summaryKey", key + ".summary");
            SetPrivate(def, "displayName", arabic);
            SetPrivate(def, "slot", slot);
            SetPrivate(def, "rarity", rarity);
            SetPrivate(def, "changes", changes.ToArray());
            SetPrivate(def, "goldCost", gold);
            SetPrivate(def, "shardCost", essence);
            SetPrivate(def, "ownedFromStart", start);

            EditorUtility.SetDirty(def);
            return def;
        }

        private static void WireScene(EquipmentDefinition[] all)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            // التجهيز يُقرأ في القائمة وفي المعركة معاً، فيقع على الكائن الذي
            // يعيش في المشهدين: `Meta` — نفس الكائن الذي يحمل `Progress`.
            GameObject meta = GameObject.Find("Meta");
            if (meta == null)
            {
                meta = new GameObject("Meta");
            }

            Loadout loadout = meta.GetComponent<Loadout>();
            if (loadout == null)
            {
                loadout = meta.AddComponent<Loadout>();
            }

            loadout.SetCatalogue(all);
            EditorUtility.SetDirty(loadout);

            // **ولا شاشةَ تجهيزٍ في مشهد المعركة**: §17 تجهّز قبل المرحلة،
            // وشاشةٌ تُفتح في منتصف الليلة تُلغي الاختيار الذي سبقها.
            // بناؤها في القائمة وحدها — انظر `DawnkeepMenuSetup`.

            EditorSceneManager.MarkSceneDirty(scene);
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
