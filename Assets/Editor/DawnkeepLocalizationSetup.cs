using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الحادية عشرة: جدول النصوص (§21).
    ///
    /// يبني أصل الجدول بكل مفاتيح الواجهة ونصوصها بالعربية والإنجليزية،
    /// ويوصله بالمشهد.
    ///
    /// **المفاتيح من `LocKeys` لا مكتوبة هنا حرفيّاً**: مفتاحٌ يُكتب مرّتين
    /// يفترق عند أوّل تعديل، وخطؤه لا يكسر التجميع بل يُظهر المفتاح على
    /// الشاشة. هكذا يكسره المترجم.
    ///
    /// **الجدول لا يُطمَس إن وُجد**: تُضاف المفاتيح الناقصة وتُترك ترجمات
    /// المستخدم كما هي — وإلّا ضاع كل تحرير عند إعادة تشغيل الخطوة.
    /// </summary>
    public static class DawnkeepLocalizationSetup
    {
        [MenuItem("مملكة الرماد/11) جدول النصوص", false, 11)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();

            LocaleTable.Entry[] defaults = Defaults();
            int added = DawnkeepLocale.Add(defaults);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(DawnkeepLocale.Ensure());

            Debug.Log("مملكة الرماد: جدول النصوص جاهز — " + defaults.Length + " مفتاح واجهة"
                + (added > 0 ? "، أُضيف " + added + " جديداً." : "، بلا جديد."));
        }

        private static LocaleTable.Entry[] Defaults()
        {
            return new[]
            {
                // لوحة الموجة
                DawnkeepLocale.Row(LocKeys.WaveCaption, "الموجة", "Wave"),
                DawnkeepLocale.Row(LocKeys.PhasePrepare, "استعداد", "Prepare"),
                DawnkeepLocale.Row(LocKeys.PhaseAssault, "هجوم", "Assault"),
                DawnkeepLocale.Row(LocKeys.PhaseRespite, "استراحة", "Respite"),
                DawnkeepLocale.Row(LocKeys.PhaseIdle, "سكون", "Idle"),
                DawnkeepLocale.Row(LocKeys.HastenButton, "ابدأ الآن", "Start now"),
                DawnkeepLocale.Row(LocKeys.FocusKeep, "إلى الحصن", "To the keep"),
                DawnkeepLocale.Row(LocKeys.FocusHero, "إلى القائد", "To the commander"),

                // لوحة الأعداد
                DawnkeepLocale.Row(LocKeys.DefendersCaption, "المدافعون", "Defenders"),
                DawnkeepLocale.Row(LocKeys.AttackersCaption, "المهاجمون", "Attackers"),

                // قلب الحصن والفضّة
                DawnkeepLocale.Row(LocKeys.KeepCaption, "قلب الحصن", "The Keep"),
                DawnkeepLocale.Row(LocKeys.KeepTier, "المستوى {0}", "Tier {0}"),
                DawnkeepLocale.Row(LocKeys.SilverCaption, "الفضّة", "Silver"),

                // النور
                DawnkeepLocale.Row(LocKeys.LightStockCaption, "شحنات النور", "Light charges"),
                DawnkeepLocale.Row(LocKeys.LightBeaconsCaption, "منارات مضيئة", "Beacons lit"),
                DawnkeepLocale.Row(LocKeys.LightHint,
                    "انقر منارةً لتنقل إليها شحنة نور، وانقرها ثانيةً لتستردّها",
                    "Tap a beacon to move a charge to it, tap again to take it back"),

                // البطل
                DawnkeepLocale.Row(LocKeys.HeroCaption, "البطل", "Champion"),

                // بطاقات البناء
                DawnkeepLocale.Row(LocKeys.BuildOnNode, "ابنِ على {0}", "Build on {0}"),
                DawnkeepLocale.Row(LocKeys.BuildUpgradeOrSell, "رقِّ أو بِع", "Upgrade or sell"),
                DawnkeepLocale.Row(LocKeys.BuildCost, "{0} فضّة", "{0} silver"),
                DawnkeepLocale.Row(LocKeys.BuildSell, "بِع", "Sell"),
                DawnkeepLocale.Row(LocKeys.BuildSellRefund, "+{0} فضّة", "+{0} silver"),
                DawnkeepLocale.Row(LocKeys.BuildSellSummary,
                    "يُهدم {0} ويُستردّ {1}٪ مِمّا دُفع فيه.",
                    "Demolishes {0} and refunds {1}% of what was paid."),
                DawnkeepLocale.Row(LocKeys.BuildSellStat, "العقدة تعود خالية", "The node is freed"),
                DawnkeepLocale.Row(LocKeys.BuildKeepTitle, "قلب الحصن", "The Keep"),
                DawnkeepLocale.Row(LocKeys.BuildKeepUpgrade, "رقِّ قلب الحصن", "Upgrade the Keep"),
                DawnkeepLocale.Row(LocKeys.BuildKeepSummary,
                    "المستوى {0} يفتح عقد بناء جديدة.",
                    "Tier {0} unlocks new build nodes."),
                DawnkeepLocale.Row(LocKeys.BuildStatIncome, "دخل الفجر {0}", "Dawn income {0}"),
                DawnkeepLocale.Row(LocKeys.BuildStatDps, "ضرر/ث {0}", "DPS {0}"),
                DawnkeepLocale.Row(LocKeys.BuildStatRange, "مدى {0}", "range {0}"),
                DawnkeepLocale.Row(LocKeys.BuildStatGuards, "{0} حرّاس", "{0} guards"),
                DawnkeepLocale.Row(LocKeys.BuildStatHealth, "صحّة {0}", "Health {0}"),

                // أنواع العقد
                DawnkeepLocale.Row(LocKeys.NodeInner, "عقدة داخلية", "an inner node"),
                DawnkeepLocale.Row(LocKeys.NodeGate, "عقدة البوّابة", "a gate node"),
                DawnkeepLocale.Row(LocKeys.NodeOuter, "عقدة خارجية", "an outer node"),
                DawnkeepLocale.Row(LocKeys.NodeEconomy, "عقدة اقتصاد", "an economy node"),
                DawnkeepLocale.Row(LocKeys.NodeBeacon, "عقدة منارة", "a beacon node"),

                // الأوامر
                DawnkeepLocale.Row(LocKeys.OrdersButton, "الأوامر", "Orders"),
                DawnkeepLocale.Row(LocKeys.OrderFollow, "اتبعني", "Follow me"),
                DawnkeepLocale.Row(LocKeys.OrderHold, "اثبت", "Hold"),
                DawnkeepLocale.Row(LocKeys.OrderDefend, "دافع", "Defend"),
                DawnkeepLocale.Row(LocKeys.OrderRetreat, "تراجع", "Retreat"),
                DawnkeepLocale.Row(LocKeys.OrderAckFollow, "{0} فرقةً تتبعك", "{0} squads following"),
                DawnkeepLocale.Row(LocKeys.OrderAckHold, "{0} فرقةً ثبتت", "{0} squads holding"),
                DawnkeepLocale.Row(LocKeys.OrderAckDefend, "{0} فرقةً تدافع", "{0} squads defending"),
                DawnkeepLocale.Row(LocKeys.OrderAckRetreat, "{0} فرقةً تتراجع", "{0} squads retreating"),
                DawnkeepLocale.Row(LocKeys.OrderNoSquad, "لا فرقة قريبة", "No squad nearby"),
                DawnkeepLocale.Row(LocKeys.OrderNoHero, "لا بطل في الساحة", "No champion in the field"),
                DawnkeepLocale.Row(LocKeys.FilterAll, "الجميع", "All"),
                DawnkeepLocale.Row(LocKeys.FilterGuards, "حرّاس", "Guards"),
                DawnkeepLocale.Row(LocKeys.FilterArchers, "رماة", "Archers"),
                DawnkeepLocale.Row(LocKeys.FilterHint, "اضغط الأوامر مطوّلاً لاختيار النوع",
                    "Hold Orders to pick a type"),

                DawnkeepLocale.Row(LocKeys.AbilityVolley, "رشقة الفجر", "Dawn Volley"),
                DawnkeepLocale.Row(LocKeys.AbilityRally, "راية الحشد", "Rally Standard"),
                DawnkeepLocale.Row(LocKeys.AbilityUltimate, "الضوء الأوّل", "First Light"),
                DawnkeepLocale.Row(LocKeys.SpiritWait, "تعود بعد", "Returning in"),

                DawnkeepLocale.Row(LocKeys.ResultVictory, "صمد الحصن", "The Keep Stood"),
                DawnkeepLocale.Row(LocKeys.ResultDefeat, "سقط الحصن", "The Keep Fell"),
                DawnkeepLocale.Row(LocKeys.ResultVictoryDetail,
                    "نجوت من {0} موجات، وبقي قلب الحصن قائماً.",
                    "You survived {0} waves, and the Keep still stands."),
                DawnkeepLocale.Row(LocKeys.ResultDefeatDetail,
                    "بلغت الموجة {0} قبل أن يسقط قلب الحصن.",
                    "You reached wave {0} before the Keep fell."),
                DawnkeepLocale.Row(LocKeys.ResultRestart, "أعِد المرحلة", "Replay stage"),
                DawnkeepLocale.Row(LocKeys.ResultToMenu, "إلى القائمة", "To the menu"),

                DawnkeepLocale.Row(LocKeys.PauseButton, "إيقاف", "Pause"),
                DawnkeepLocale.Row(LocKeys.PauseTitle, "إيقاف مؤقّت", "Paused"),
                DawnkeepLocale.Row(LocKeys.PauseResume, "متابعة", "Resume"),
                DawnkeepLocale.Row(LocKeys.TabWave, "موجة الليلة", "Tonight's wave"),
                DawnkeepLocale.Row(LocKeys.TabForces, "قوّاتي", "My forces"),
                DawnkeepLocale.Row(LocKeys.TabTowers, "الأبراج", "Towers"),
                DawnkeepLocale.Row(LocKeys.TabSettings, "الإعدادات", "Settings"),
                DawnkeepLocale.Row(LocKeys.SettingLanguage, "اللغة", "Language"),
                DawnkeepLocale.Row(LocKeys.SettingArabic, "العربية", "Arabic"),
                DawnkeepLocale.Row(LocKeys.SettingEnglish, "الإنجليزية", "English"),
                DawnkeepLocale.Row(LocKeys.SettingHealthBars, "أشرطة الصحّة", "Health bars"),
                DawnkeepLocale.Row(LocKeys.SettingStick, "العصا", "Joystick"),
                DawnkeepLocale.Row(LocKeys.SettingStickSize, "حجم {0}٪", "Size {0}%"),
                DawnkeepLocale.Row(LocKeys.SettingStickFade, "وضوح {0}٪", "Opacity {0}%"),
                DawnkeepLocale.Row(LocKeys.SettingHanded, "اليد", "Handedness"),
                DawnkeepLocale.Row(LocKeys.SettingRightHanded, "يُمنى", "Right-handed"),
                DawnkeepLocale.Row(LocKeys.SettingLeftHanded, "يُسرى", "Left-handed"),
                DawnkeepLocale.Row(LocKeys.SettingQuality, "الجهاز", "Device"),
                DawnkeepLocale.Row(LocKeys.QualityLow, "خفيف", "Low"),
                DawnkeepLocale.Row(LocKeys.QualityMedium, "متوسّط", "Medium"),
                DawnkeepLocale.Row(LocKeys.QualityHigh, "عالٍ", "High"),
                DawnkeepLocale.Row(LocKeys.SettingOn, "تعمل", "On"),
                DawnkeepLocale.Row(LocKeys.SettingOff, "مطفأة", "Off"),
                DawnkeepLocale.Row(LocKeys.SpeedCaption, "السرعة", "Speed"),
                DawnkeepLocale.Row(LocKeys.TabEmpty, "لا شيء بعد", "Nothing yet"),
                DawnkeepLocale.Row(LocKeys.SquadOrderLabel, "{0} — {1} حيّاً", "{0} — {1} alive"),
                DawnkeepLocale.Row(LocKeys.OrderGarrisonName, "مرابطة", "Garrison"),

                // توليد الموجات (§14)
                DawnkeepLocale.Row(LocKeys.WaveNight, "ليلة الرماد", "Ashen Night"),
                DawnkeepLocale.Row(LocKeys.WaveMiniBoss, "طليعة ثقيلة", "Heavy Vanguard"),
                DawnkeepLocale.Row(LocKeys.WaveBoss, "ليلة الزعيم", "Warlord's Night"),
                DawnkeepLocale.Row(LocKeys.WavePreviewTitle, "ما يأتي الليلة", "Tonight's attack"),
                DawnkeepLocale.Row(LocKeys.WavePreviewHidden,
                    "لا كشف قبل الصيحة على هذه الدرجة",
                    "No forewarning at this difficulty"),
                DawnkeepLocale.Row(LocKeys.WavePreviewRow, "{0} × {1}", "{0} × {1}"),
                DawnkeepLocale.Row(LocKeys.WaveSecondFront, "من جهتين", "Two fronts"),
                DawnkeepLocale.Row(LocKeys.SettingDifficulty, "الصعوبة", "Difficulty"),
                DawnkeepLocale.Row(LocKeys.DifficultyStory, "حكاية", "Story"),
                DawnkeepLocale.Row(LocKeys.DifficultyNormal, "قياسي", "Normal"),
                DawnkeepLocale.Row(LocKeys.DifficultyVeteran, "مخضرم", "Veteran"),
                DawnkeepLocale.Row(LocKeys.DifficultyNightmare, "كابوس", "Nightmare"),

                // بركات الجولة (§15)
                DawnkeepLocale.Row(LocKeys.BoonTitle, "اختر بركةً لليلة", "Choose a boon"),
                DawnkeepLocale.Row(LocKeys.BoonReroll, "اسحب ثلاثاً غيرها", "Draw three others"),
                DawnkeepLocale.Row(LocKeys.BoonHero, "القائد", "Commander"),
                DawnkeepLocale.Row(LocKeys.BoonArmy, "الجند", "Army"),
                DawnkeepLocale.Row(LocKeys.BoonTowers, "الأبراج", "Towers"),
                DawnkeepLocale.Row(LocKeys.BoonEconomy, "الاقتصاد", "Economy"),
                DawnkeepLocale.Row(LocKeys.BoonLight, "النور", "Light"),
                DawnkeepLocale.Row(LocKeys.BoonTaken, "لم تُؤخذ بركة بعد", "No boons taken yet"),
                DawnkeepLocale.Row(LocKeys.TabBoons, "بركاتي", "My boons"),
                DawnkeepLocale.Row(LocKeys.BoonRow, "{0} — {1}", "{0} — {1}"),

                // التقدّم الدائم (§16)
                DawnkeepLocale.Row(LocKeys.MetaOpen, "الأبحاث", "Research"),
                DawnkeepLocale.Row(LocKeys.MetaClose, "إغلاق", "Close"),
                DawnkeepLocale.Row(LocKeys.MetaHeader, "المستوى {0} · {1} ذهباً",
                    "Level {0} · {1} gold"),
                DawnkeepLocale.Row(LocKeys.MetaStars, "{0} نجمة بحث", "{0} research stars"),
                DawnkeepLocale.Row(LocKeys.MetaRank, "({0}/{1})", "({0}/{1})"),
                DawnkeepLocale.Row(LocKeys.MetaDelta, "{0} ← {1}", "{0} → {1}"),
                DawnkeepLocale.Row(LocKeys.MetaCost, "{0} ذهباً و{1} نجمة",
                    "{0} gold, {1} star"),
                DawnkeepLocale.Row(LocKeys.MetaMaxed, "بلغت أقصاها", "Fully researched"),
                DawnkeepLocale.Row(LocKeys.MetaLocked, "تُفتح عند المستوى {0}",
                    "Unlocks at level {0}"),
                DawnkeepLocale.Row(LocKeys.MetaCapped, "بلغت سقف الأبحاث",
                    "Research cap reached"),
                DawnkeepLocale.Row(LocKeys.MetaRespec, "أعِد توزيع الأبحاث",
                    "Redistribute research"),
                DawnkeepLocale.Row(LocKeys.BranchEconomy, "الاقتصاد", "Economy"),
                DawnkeepLocale.Row(LocKeys.BranchFortification, "التحصين", "Fortification"),
                DawnkeepLocale.Row(LocKeys.BranchCommand, "القيادة", "Command"),
                DawnkeepLocale.Row(LocKeys.BranchDawncraft, "صنعة الفجر", "Dawncraft"),

                // القائمة الرئيسة (§24)
                DawnkeepLocale.Row(LocKeys.GameTitle, "مملكة الرماد", "Dawnkeep"),
                DawnkeepLocale.Row(LocKeys.GameSubtitle, "حصن الفجر", "Keep of the Dawn"),
                DawnkeepLocale.Row(LocKeys.MenuPlay, "ابدأ الليلة", "Begin the night"),
                DawnkeepLocale.Row(LocKeys.MenuSoon,
                    "المتجر والمهامّ ومواهب البطل لم تُبنَ بعد",
                    "Shop, Quests and hero talents are not built yet"),
                DawnkeepLocale.Row(LocKeys.SaveRecovered,
                    "تعذّرت قراءة ملفّ الحفظ — استُعيدت نسخة احتياطية",
                    "The save file could not be read — a backup was restored"),

                // التجهيز والحدّادة (§17)
                DawnkeepLocale.Row(LocKeys.LoadoutOpen, "التجهيز", "Loadout"),
                DawnkeepLocale.Row(LocKeys.LoadoutTitle, "عتادك", "Your gear"),
                DawnkeepLocale.Row(LocKeys.LoadoutClose, "إغلاق", "Close"),
                DawnkeepLocale.Row(LocKeys.SlotWeapon, "سلاح", "Weapon"),
                DawnkeepLocale.Row(LocKeys.SlotArmor, "درع", "Armor"),
                DawnkeepLocale.Row(LocKeys.SlotRelic, "أثر", "Relic"),
                DawnkeepLocale.Row(LocKeys.SlotMount, "مركب", "Mount"),
                DawnkeepLocale.Row(LocKeys.SlotEmpty, "فارغة", "Empty"),
                DawnkeepLocale.Row(LocKeys.RarityCommon, "شائع", "Common"),
                DawnkeepLocale.Row(LocKeys.RarityUncommon, "غير شائع", "Uncommon"),
                DawnkeepLocale.Row(LocKeys.RarityRare, "نادر", "Rare"),
                DawnkeepLocale.Row(LocKeys.RarityEpic, "ملحميّ", "Epic"),
                DawnkeepLocale.Row(LocKeys.RarityLegendary, "أسطوريّ", "Legendary"),
                DawnkeepLocale.Row(LocKeys.GearLevel, "مستوى {0}", "Level {0}"),
                DawnkeepLocale.Row(LocKeys.GearEquip, "ألبِس", "Equip"),
                DawnkeepLocale.Row(LocKeys.GearEquipped, "ملبوس", "Equipped"),
                DawnkeepLocale.Row(LocKeys.GearUnequip, "انزع", "Remove"),
                DawnkeepLocale.Row(LocKeys.GearLocked, "لا تملكها بعد", "Not yours yet"),
                DawnkeepLocale.Row(LocKeys.ForgeUpgrade, "رقِّ", "Upgrade"),
                DawnkeepLocale.Row(LocKeys.ForgeDismantle, "فكِّك", "Dismantle"),
                DawnkeepLocale.Row(LocKeys.ForgeCost, "{0} ذهباً و{1} جوهراً",
                    "{0} gold and {1} essence"),
                DawnkeepLocale.Row(LocKeys.ForgeReturns, "يعيد {0} جوهراً",
                    "Returns {0} essence"),
                DawnkeepLocale.Row(LocKeys.ForgeEssence, "الجوهر {0}", "Essence {0}"),
                DawnkeepLocale.Row(LocKeys.ForgeNoGear, "لا قطعة مختارة", "No gear selected"),
                DawnkeepLocale.Row(LocKeys.ForgeNotOwned, "لا تملكها بعد", "Not yours yet"),
                DawnkeepLocale.Row(LocKeys.ForgeMaxLevel, "بلغت أقصى مستوى",
                    "Already at max level"),
                DawnkeepLocale.Row(LocKeys.ForgeNoGold, "لا يكفي الذهب", "Not enough gold"),
                DawnkeepLocale.Row(LocKeys.ForgeNoEssence, "لا يكفي الجوهر",
                    "Not enough essence"),
                DawnkeepLocale.Row(LocKeys.ForgeStarterGear, "عتاد البداية لا يُفكَّك",
                    "Starter gear cannot be dismantled"),

                // بطاقات العقائد (§18)
                DawnkeepLocale.Row(LocKeys.DoctrineOpen, "العقائد", "Doctrines"),
                DawnkeepLocale.Row(LocKeys.DoctrineTitle, "عقيدتك في هذه المرحلة",
                    "Your doctrine for this stage"),
                DawnkeepLocale.Row(LocKeys.DoctrineHint,
                    "بطاقتان لا أكثر — ولكلٍّ ثمنها",
                    "Two cards, no more — and each has its price"),
                DawnkeepLocale.Row(LocKeys.DoctrineLocked, "لم تُفتح بعد", "Not unlocked yet"),
                DawnkeepLocale.Row(LocKeys.DoctrineAlready, "هي في الفتحة الأخرى",
                    "Already in the other slot"),
                DawnkeepLocale.Row(LocKeys.DoctrineNeeds, "{0}: {1}", "{0}: {1}"),
                DawnkeepLocale.Row(LocKeys.DoctrineUpgraded, "مُرقّاة", "Upgraded"),
                DawnkeepLocale.Row(LocKeys.DoctrineUpgradeAt, "ترقية عند {0}",
                    "Upgrade at {0}"),
                DawnkeepLocale.Row(LocKeys.UnlockFromStart, "مفتوحة", "Open"),
                DawnkeepLocale.Row(LocKeys.UnlockAccountLevel, "مستوى الحساب",
                    "Account level"),
                DawnkeepLocale.Row(LocKeys.UnlockVictories, "انتصارات", "Victories"),
                DawnkeepLocale.Row(LocKeys.UnlockFurthestWave, "أبعد ليلة", "Furthest night"),
                DawnkeepLocale.Row(LocKeys.UnlockBossesMet, "زعماء لُقُوا", "Bosses met"),
                DawnkeepLocale.Row(LocKeys.UnlockStagesPlayed, "مراحل لُعبت", "Stages played"),

                // خريطة الحملة (§19)
                DawnkeepLocale.Row(LocKeys.CampaignOpen, "الحملة", "Campaign"),
                DawnkeepLocale.Row(LocKeys.CampaignTitle, "خريطة الحملة", "Campaign map"),
                DawnkeepLocale.Row(LocKeys.StageCleared, "أُنجزت", "Cleared"),
                DawnkeepLocale.Row(LocKeys.StageLocked, "مقفلة", "Locked"),
                DawnkeepLocale.Row(LocKeys.StageNext, "التالية", "Next"),
                DawnkeepLocale.Row(LocKeys.StagePlay, "العب هذه", "Play this"),
                DawnkeepLocale.Row(LocKeys.StageReward, "تمنح: {0}", "Grants: {0}"),
                DawnkeepLocale.Row(LocKeys.ZoneLockedAfter, "تُفتح بعد {0} مراحل",
                    "Opens after {0} stages"),
                DawnkeepLocale.Row(LocKeys.ObjectiveHoldKeep, "احمِ قلب الحصن",
                    "Hold the keep"),
                DawnkeepLocale.Row(LocKeys.ObjectiveConvoy, "احمِ القافلة حتى الفجر",
                    "Guard the convoy until dawn"),
                DawnkeepLocale.Row(LocKeys.ObjectiveBeacons, "أشعِل منارتين",
                    "Light two beacons"),
                DawnkeepLocale.Row(LocKeys.ObjectiveSixNodes, "ستّ عقد بناءٍ فقط",
                    "Six build nodes only"),
                DawnkeepLocale.Row(LocKeys.ObjectiveTwoGates, "بوّابتان: اقسِم جيشك",
                    "Two gates: split your army"),
                DawnkeepLocale.Row(LocKeys.ObjectiveEconomy, "لا أبراج حتى الليلة الرابعة",
                    "No towers until night four"),
                DawnkeepLocale.Row(LocKeys.ObjectiveBrokenWall, "جدارٌ مكسور من البداية",
                    "A broken wall from the start"),

                // أنماط اللعب (§20)
                DawnkeepLocale.Row(LocKeys.ModesOpen, "الأنماط", "Modes"),
                DawnkeepLocale.Row(LocKeys.ModesTitle, "كيف تلعب الليلة",
                    "How you play tonight"),
                DawnkeepLocale.Row(LocKeys.ModeCampaign, "الحملة", "Campaign"),
                DawnkeepLocale.Row(LocKeys.ModeEndless, "بلا نهاية", "Endless"),
                DawnkeepLocale.Row(LocKeys.ModeDaily, "تجربة اليوم", "Daily Trial"),
                DawnkeepLocale.Row(LocKeys.ModeBossHunt, "صيد الزعماء", "Boss Hunt"),
                DawnkeepLocale.Row(LocKeys.ModeCampaignNote,
                    "أربعون مرحلة بأهدافها. بلا اتّصال.",
                    "Forty stages with their objectives. Offline."),
                DawnkeepLocale.Row(LocKeys.ModeEndlessNote,
                    "لا فوز — كم ليلةً تصمد؟ ببذرةٍ تبدّلها.",
                    "No victory — how many nights do you last? With a seed you can reroll."),
                DawnkeepLocale.Row(LocKeys.ModeDailyNote,
                    "سبع ليالٍ بتجهيزٍ واحدٍ للجميع، وبذرةِ اليوم.",
                    "Seven nights, one loadout for everyone, and today's seed."),
                DawnkeepLocale.Row(LocKeys.ModeBossHuntNote,
                    "ثلاث ليالٍ، زعيمٌ في كلٍّ منها.",
                    "Three nights, a boss in each."),
                DawnkeepLocale.Row(LocKeys.ModeLockedZone, "تُفتح بعد المنطقة {0}",
                    "Opens after zone {0}"),
                DawnkeepLocale.Row(LocKeys.ModeBest, "أفضل رقمك {0}", "Your best {0}"),
                DawnkeepLocale.Row(LocKeys.ModeNoBest, "لا رقم بعد", "No score yet"),
                DawnkeepLocale.Row(LocKeys.ModeChosen, "مختار", "Chosen"),
                DawnkeepLocale.Row(LocKeys.ModeSeed, "البذرة {0}", "Seed {0}"),
                DawnkeepLocale.Row(LocKeys.ModeReroll, "بذرة أخرى", "Reroll"),
                DawnkeepLocale.Row(LocKeys.ModeNewRecord, "رقمٌ جديد", "New best"),
            };
        }

        private static void WireScene(LocaleTable table)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            GameObject holder = GameObject.Find("Localization");
            if (holder == null)
            {
                holder = new GameObject("Localization");
            }

            LocaleRuntime runtime = holder.GetComponent<LocaleRuntime>();
            if (runtime == null)
            {
                runtime = holder.AddComponent<LocaleRuntime>();
            }

            SetPrivate(runtime, "table", table);

            EditorUtility.SetDirty(holder);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
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
    }
}
