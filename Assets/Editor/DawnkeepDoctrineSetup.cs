using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Boons;
using Dawnkeep.Doctrine;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// بطاقات العقائد (§18): **عشرون**، يجهّز اللاعب اثنتين قبل المرحلة.
    ///
    /// ولكلٍّ **مكسبٌ وثمن** كما تبني §18 أمثلتها كلّها: «ابدأ بستّين فضّة
    /// إضافية، **لكنّ** قلب الحصن أقلّ صحّة 10%». بطاقةٌ كلّها مكسبٌ ليست
    /// عقيدةً بل زرّاً يُضغط، ومن جهّز اثنتين بلا ثمنٍ لم يختر شيئاً.
    ///
    /// وتُفتح **بالإنجازات والحملة لا بالسحب العشوائي** (§18): ستٌّ من
    /// البداية لئلّا تبقى الفتحتان فارغتين في الجولة الأولى، والباقي بشرطٍ
    /// يُقرأ من ملفّ الحفظ. ولكلٍّ **ترقيةٌ واحدة** لا أكثر — تُبلَغ بالشرط
    /// نفسه أشدَّ.
    ///
    /// والعتبات **معايَرةٌ على منحنيات مقيسة** لا مقدَّرة: بصيغة §21
    /// (‏80 + 12 × رقم المرحلة) يبلغ مستوى الحساب **٧ في الجولة العشرين**،
    /// فعتبةٌ عند ٨ لا تُبلَغ أبداً. وأبعدُ ليلةٍ تتجاوز العشر من الجولة
    /// الأولى (الحملة عشرٌ ثمّ Endless)، فعتبةٌ عند ٤ مفتوحةٌ من البداية بلا
    /// أن تُسمّى كذلك. و`doctrinecheck.py` هو من قاس الاثنين — ومرّتين:
    /// قبل §21 وبعدها، إذ بدّلت §21 منحنى الخبرة كلَّه.
    /// </summary>
    public static class DawnkeepDoctrineSetup
    {
        public const string CardFolder = DawnkeepAssetPaths.Settings + "/Doctrine";

        private static readonly List<LocaleTable.Entry> Rows = new List<LocaleTable.Entry>(64);

        [MenuItem("مملكة الرماد/20) بطاقات العقائد", false, 20)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            EnsureFolder(CardFolder);
            Rows.Clear();

            List<DoctrineDefinition> all = new List<DoctrineDefinition>(20);

            // ══ الخمس التي سمّتها §18 بأعيانها ════════════════════════════

            all.Add(Card("Doctrine_EarlyInvestment", "الاستثمار المبكّر", "Early Investment",
                "ابدأ بستّين فضّة إضافية، لكنّ قلب الحصن أقلّ صحّةً ١٠٪.",
                "Start with 60 extra silver, but the keep has 10% less health.",
                DoctrineUnlock.FromStart, 0, 0,
                DoctrineOpening.ExtraSilver, 60,
                Change(BoonStat.KeepHealth, 0.90f)));

            all.Add(Card("Doctrine_StandingArmy", "الجيش القائم", "Standing Army",
                "تبدأ بثلاثة حرّاس حول القلب، لكنّ البيوت أغلى ١٠٪.",
                "Start with three guards around the keep, but houses cost 10% more.",
                DoctrineUnlock.FromStart, 0, 0,
                DoctrineOpening.StandingGuards, 3,
                Change(BoonStat.BuildCost, 1.10f)));

            all.Add(Card("Doctrine_BrightFrontier", "التخم المضيء", "Bright Frontier",
                "شحنةُ نورٍ مجّانية، لكنّ مدى الأبراج أقلّ ٨٪.",
                "A free light charge, but towers reach 8% less far.",
                DoctrineUnlock.FromStart, 0, 0,
                DoctrineOpening.LitBeacon, 1,
                Change(BoonStat.TowerRange, 0.92f)));

            all.Add(Card("Doctrine_MobileCommand", "القيادة المتحرّكة", "Mobile Command",
                "نصف قطر الحشد أوسع ٣٥٪، لكنّ مقاومة الجند أقلّ ٨٪.",
                "Rally radius 35% wider, but troop resistance 8% lower.",
                DoctrineUnlock.FromStart, 0, 0,
                DoctrineOpening.None, 0,
                Change(BoonStat.HeroRallyRadius, 1.35f),
                Change(BoonStat.ArmyResistance, 0.92f)));

            all.Add(Card("Doctrine_StoneFirst", "الحجر أوّلاً", "Stone First",
                "أوّل جدارين بنصف الثمن، لكنّ دخل المباني أقلّ ٨٪.",
                "The first two walls cost half, but building income is 8% lower.",
                DoctrineUnlock.FromStart, 0, 0,
                DoctrineOpening.CheapFirstWalls, 2,
                Change(BoonStat.BuildingIncome, 0.92f)));

            // ══ وخمس عشرة على قياسها ══════════════════════════════════════
            //
            // البقيّة مفتوحةٌ بإنجاز، وترتيبُها من الأسهل إنجازاً إلى الأشدّ.

            all.Add(Card("Doctrine_FirstWatch", "الحرس الأوّل", "First Watch",
                "برجٌ أوّل مجّاناً، لكنّ معدّل رمي الأبراج أقلّ ٨٪.",
                "The first tower is free, but towers fire 8% slower.",
                DoctrineUnlock.FromStart, 0, 0,
                DoctrineOpening.FreeFirstTower, 1,
                Change(BoonStat.TowerFireRate, 0.92f)));

            all.Add(Card("Doctrine_LeanLedger", "دفترٌ نحيل", "Lean Ledger",
                "دخل الموجة أعلى ١٨٪، لكنّ مكافأة القتل أقلّ ١٥٪.",
                "Wave income 18% higher, but kill bounty 15% lower.",
                DoctrineUnlock.StagesPlayed, 3, 15,
                DoctrineOpening.None, 0,
                Change(BoonStat.WaveIncome, 1.18f),
                Change(BoonStat.KillBounty, 0.85f)));

            all.Add(Card("Doctrine_Headhunter", "صائد الرؤوس", "Headhunter",
                "مكافأة القتل أعلى ٢٥٪، لكنّ دخل الموجة أقلّ ١٢٪.",
                "Kill bounty 25% higher, but wave income 12% lower.",
                DoctrineUnlock.FurthestWave, 12, 20,
                DoctrineOpening.None, 0,
                Change(BoonStat.KillBounty, 1.25f),
                Change(BoonStat.WaveIncome, 0.88f)));

            all.Add(Card("Doctrine_SwiftHand", "يدٌ عَجِلة", "Swift Hand",
                "سرعة ضرب البطل أعلى ١٥٪، لكنّ ضرره أقلّ ٨٪.",
                "Hero attacks 15% faster, but hits 8% weaker.",
                DoctrineUnlock.AccountLevel, 2, 4,
                DoctrineOpening.None, 0,
                Change(BoonStat.HeroAttackSpeed, 1.15f),
                Change(BoonStat.HeroDamage, 0.92f)));

            all.Add(Card("Doctrine_HeavyHand", "يدٌ ثقيلة", "Heavy Hand",
                "ضرر البطل أعلى ٢٠٪، لكنّ سرعة ضربه أقلّ ١٢٪.",
                "Hero damage 20% higher, but attacks 12% slower.",
                DoctrineUnlock.AccountLevel, 3, 5,
                DoctrineOpening.None, 0,
                Change(BoonStat.HeroDamage, 1.20f),
                Change(BoonStat.HeroAttackSpeed, 0.88f)));

            all.Add(Card("Doctrine_Vanguard", "طليعةٌ زاحفة", "Vanguard",
                "سرعة الجند أعلى ١٨٪، لكنّ صحّتهم أقلّ ١٠٪.",
                "Troops move 18% faster, but have 10% less health.",
                DoctrineUnlock.Victories, 2, 10,
                DoctrineOpening.None, 0,
                Change(BoonStat.ArmyMoveSpeed, 1.18f),
                Change(BoonStat.ArmyHealth, 0.90f)));

            all.Add(Card("Doctrine_ShieldWall", "جدارُ التروس", "Shield Wall",
                "صحّة الجند أعلى ٢٢٪، لكنّهم أبطأ ١٠٪.",
                "Troops have 22% more health, but move 10% slower.",
                DoctrineUnlock.Victories, 3, 12,
                DoctrineOpening.None, 0,
                Change(BoonStat.ArmyHealth, 1.22f),
                Change(BoonStat.ArmyMoveSpeed, 0.90f)));

            all.Add(Card("Doctrine_WideLight", "نورٌ واسع", "Wide Light",
                "نصف قطر المنارة أوسع ٢٢٪، لكنّ قضم الدرع أقلّ ١٢٪.",
                "Beacons reach 22% wider, but shred 12% less armour.",
                DoctrineUnlock.FurthestWave, 14, 22,
                DoctrineOpening.None, 0,
                Change(BoonStat.BeaconRadius, 1.22f),
                Change(BoonStat.BeaconArmourCut, 0.88f)));

            all.Add(Card("Doctrine_KeenLight", "نورٌ حادّ", "Keen Light",
                "قضم الدرع أعلى ٢٥٪، لكنّ نصف قطر المنارة أضيق ١٢٪.",
                "Armour shred 25% higher, but beacons reach 12% narrower.",
                DoctrineUnlock.FurthestWave, 16, 24,
                DoctrineOpening.None, 0,
                Change(BoonStat.BeaconArmourCut, 1.25f),
                Change(BoonStat.BeaconRadius, 0.88f)));

            all.Add(Card("Doctrine_QuickWick", "فتيلٌ سريع", "Quick Wick",
                "المنارة المطفأة تعود أسرع ٣٠٪، لكنّ مدى النور حولك أقلّ ١٠٪.",
                "Snuffed beacons return 30% sooner, but your light reaches 10% less.",
                DoctrineUnlock.BossesMet, 2, 3,
                DoctrineOpening.None, 0,
                Change(BoonStat.SnuffSeconds, 0.70f),
                Change(BoonStat.LightRangeBonus, 0.90f)));

            all.Add(Card("Doctrine_LongArm", "ذراعٌ طويلة", "Long Arm",
                "مدى الأبراج أوسع ١٨٪، لكنّ ضررها أقلّ ١٠٪.",
                "Towers reach 18% further, but hit 10% weaker.",
                DoctrineUnlock.StagesPlayed, 6, 18,
                DoctrineOpening.None, 0,
                Change(BoonStat.TowerRange, 1.18f),
                Change(BoonStat.TowerDamage, 0.90f)));

            all.Add(Card("Doctrine_ShortFuse", "فتيلٌ قصير", "Short Fuse",
                "ضرر الأبراج أعلى ٢٢٪، لكنّ مداها أضيق ١٠٪.",
                "Tower damage 22% higher, but they reach 10% less far.",
                DoctrineUnlock.Victories, 5, 14,
                DoctrineOpening.None, 0,
                Change(BoonStat.TowerDamage, 1.22f),
                Change(BoonStat.TowerRange, 0.90f)));

            all.Add(Card("Doctrine_Cornerstone", "حجرُ الأساس", "Cornerstone",
                "قلب الحصن أصلب بمئتين، لكنّ البناء أغلى ١٢٪.",
                "The keep gains 200 health, but building costs 12% more.",
                DoctrineUnlock.FurthestWave, 18, 26,
                DoctrineOpening.ReinforcedKeep, 200,
                Change(BoonStat.BuildCost, 1.12f)));

            all.Add(Card("Doctrine_LastStand", "الوقفة الأخيرة", "Last Stand",
                "صحّة البطل أعلى ٣٠٪ ومهلة قدراته أقصر ١٠٪، لكنّ ضرره أقلّ ١٥٪.",
                "Hero health 30% higher and cooldowns 10% shorter, but damage 15% lower.",
                DoctrineUnlock.BossesMet, 3, 4,
                DoctrineOpening.None, 0,
                Change(BoonStat.HeroHealth, 1.30f),
                Change(BoonStat.HeroCooldown, 0.90f),
                Change(BoonStat.HeroDamage, 0.85f)));

            all.Add(Card("Doctrine_ScorchedEarth", "أرضٌ محروقة", "Scorched Earth",
                "ما يردّه البيع أعلى ٢٥٪ والبناء أرخص ١٠٪، لكنّ صحّة المباني أقلّ ١٥٪.",
                "Sell refunds 25% more and building costs 10% less, but buildings have 15% less health.",
                DoctrineUnlock.AccountLevel, 4, 6,
                DoctrineOpening.None, 0,
                Change(BoonStat.SellRefund, 1.25f),
                Change(BoonStat.BuildCost, 0.90f),
                Change(BoonStat.BuildingHealth, 0.85f)));

            DawnkeepLocale.Add(Rows);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(all.ToArray());
            Debug.Log("مملكة الرماد: " + all.Count + " بطاقة عقيدة في " + CardFolder);
        }

        // ── البناء ─────────────────────────────────────────────────────────

        private static BoonDefinition.Change Change(BoonStat stat, float multiplier)
        {
            BoonDefinition.Change change = new BoonDefinition.Change();
            change.Stat = stat;
            change.Multiplier = multiplier;
            return change;
        }

        private static DoctrineDefinition Card(string assetName, string arabic, string english,
            string summaryAr, string summaryEn,
            DoctrineUnlock unlock, int unlockAt, int upgradeAt,
            DoctrineOpening opening, int amount,
            BoonDefinition.Change a,
            BoonDefinition.Change? b = null, BoonDefinition.Change? c = null)
        {
            string path = CardFolder + "/" + assetName + ".asset";
            DoctrineDefinition def = AssetDatabase.LoadAssetAtPath<DoctrineDefinition>(path);
            if (def == null)
            {
                def = ScriptableObject.CreateInstance<DoctrineDefinition>();
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
            SetPrivate(def, "changes", changes.ToArray());
            SetPrivate(def, "opening", opening);
            SetPrivate(def, "openingAmount", amount);
            SetPrivate(def, "unlock", unlock);
            SetPrivate(def, "unlockAt", unlockAt);
            SetPrivate(def, "upgradeAt", upgradeAt);

            EditorUtility.SetDirty(def);
            return def;
        }

        private static void WireScene(DoctrineDefinition[] all)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            // مع `Progress` و`Loadout` على كائن `Meta`: الثلاثة تعيش في
            // المشهدين معاً وتُقرأ من ملفّ الحفظ نفسه.
            GameObject meta = GameObject.Find("Meta");
            if (meta == null)
            {
                meta = new GameObject("Meta");
            }

            DoctrineBook book = meta.GetComponent<DoctrineBook>();
            if (book == null)
            {
                book = meta.AddComponent<DoctrineBook>();
            }

            book.SetCatalogue(all);
            EditorUtility.SetDirty(book);

            // مُنفِّذ الأفعال الافتتاحية في مشهد المعركة: يحتاج حارساً مملكيّاً
            GameObject battle = GameObject.Find("Battle");
            if (battle != null)
            {
                DoctrineOpener opener = battle.GetComponent<DoctrineOpener>();
                if (opener == null)
                {
                    opener = battle.AddComponent<DoctrineOpener>();
                }

                Dawnkeep.Combat.UnitDefinition guard =
                    AssetDatabase.LoadAssetAtPath<Dawnkeep.Combat.UnitDefinition>(
                        DawnkeepCombatSetup.CombatFolder + "/Unit_Spearman.asset");

                opener.Configure(guard);
                EditorUtility.SetDirty(opener);
            }
            else
            {
                Debug.LogWarning("مملكة الرماد: لا كائن Battle — نفّذ القائمة 6 أوّلاً.");
            }

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
