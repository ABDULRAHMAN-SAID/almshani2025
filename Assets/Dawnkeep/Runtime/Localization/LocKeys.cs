namespace Dawnkeep.Localization
{
    /// <summary>
    /// مفاتيح النصوص **ثوابت لا سلاسل مكتوبة عند الاستعمال**.
    ///
    /// مفتاحٌ يُكتب حرفيّاً في موضعين يفترقان عند أوّل تعديل، وخطأ حرفٍ فيه لا
    /// يكسر التجميع بل يُظهر المفتاح نفسه على الشاشة. هنا يكسره المترجم.
    /// </summary>
    public static class LocKeys
    {
        // لوحة الموجة
        public const string WaveCaption = "hud.wave";
        public const string PhasePrepare = "hud.phase.prepare";
        public const string PhaseAssault = "hud.phase.assault";
        public const string PhaseRespite = "hud.phase.respite";
        public const string PhaseIdle = "hud.phase.idle";
        public const string HastenButton = "hud.hasten";
        public const string FocusKeep = "hud.focus.keep";
        public const string FocusHero = "hud.focus.hero";

        // لوحة الأعداد
        public const string DefendersCaption = "hud.defenders";
        public const string AttackersCaption = "hud.attackers";

        // قلب الحصن والفضّة
        public const string KeepCaption = "hud.keep";
        public const string KeepTier = "hud.keep.tier";
        public const string SilverCaption = "hud.silver";

        // النور
        public const string LightStockCaption = "hud.light.stock";
        public const string LightBeaconsCaption = "hud.light.beacons";
        public const string LightHint = "hud.light.hint";

        // البطل
        public const string HeroCaption = "hud.hero";

        // بطاقات البناء
        public const string BuildOnNode = "build.on";
        public const string BuildUpgradeOrSell = "build.upgradeOrSell";
        public const string BuildCost = "build.cost";
        public const string BuildSell = "build.sell";
        public const string BuildSellRefund = "build.sell.refund";
        public const string BuildSellSummary = "build.sell.summary";
        public const string BuildSellStat = "build.sell.stat";
        public const string BuildKeepTitle = "build.keep.title";
        public const string BuildKeepUpgrade = "build.keep.upgrade";
        public const string BuildKeepSummary = "build.keep.summary";
        public const string BuildStatIncome = "build.stat.income";
        public const string BuildStatDps = "build.stat.dps";
        public const string BuildStatRange = "build.stat.range";
        public const string BuildStatGuards = "build.stat.guards";
        public const string BuildStatHealth = "build.stat.health";

        // أنواع العقد
        public const string NodeInner = "node.inner";
        public const string NodeGate = "node.gate";
        public const string NodeOuter = "node.outer";
        public const string NodeEconomy = "node.economy";
        public const string NodeBeacon = "node.beacon";

        // الأوامر
        public const string OrdersButton = "orders.button";
        public const string OrderFollow = "orders.follow";
        public const string OrderHold = "orders.hold";
        public const string OrderDefend = "orders.defend";
        public const string OrderRetreat = "orders.retreat";
        public const string OrderAckFollow = "orders.ack.follow";
        public const string OrderAckHold = "orders.ack.hold";
        public const string OrderAckDefend = "orders.ack.defend";
        public const string OrderAckRetreat = "orders.ack.retreat";
        public const string OrderNoSquad = "orders.none";
        public const string OrderNoHero = "orders.noHero";
        public const string FilterAll = "orders.filter.all";
        public const string FilterGuards = "orders.filter.guards";
        public const string FilterArchers = "orders.filter.archers";
        public const string FilterHint = "orders.filter.hint";

        // قدرات البطل (§8)
        public const string AbilityVolley = "hero.volley";
        public const string AbilityRally = "hero.rally";
        public const string AbilityUltimate = "hero.ultimate";
        public const string SpiritWait = "hero.spirit";

        // النتيجة (§5)
        public const string ResultVictory = "result.victory";
        public const string ResultDefeat = "result.defeat";
        public const string ResultVictoryDetail = "result.victory.detail";
        public const string ResultDefeatDetail = "result.defeat.detail";
        public const string ResultRestart = "result.restart";

        // الإيقاف والإعدادات (§7)
        public const string PauseButton = "pause.button";
        public const string PauseTitle = "pause.title";
        public const string PauseResume = "pause.resume";
        public const string TabWave = "pause.tab.wave";
        public const string TabForces = "pause.tab.forces";
        public const string TabTowers = "pause.tab.towers";
        public const string TabSettings = "pause.tab.settings";
        public const string SettingLanguage = "settings.language";
        public const string SettingArabic = "settings.language.ar";
        public const string SettingEnglish = "settings.language.en";
        public const string SettingHealthBars = "settings.healthbars";
        public const string SettingStick = "settings.stick";
        public const string SettingStickSize = "settings.stick.size";
        public const string SettingStickFade = "settings.stick.fade";
        public const string SettingHanded = "settings.handed";
        public const string SettingRightHanded = "settings.handed.right";
        public const string SettingLeftHanded = "settings.handed.left";
        public const string SettingOn = "settings.on";
        public const string SettingOff = "settings.off";
        public const string SpeedCaption = "pause.speed";
        public const string TabEmpty = "pause.empty";
        public const string SquadOrderLabel = "pause.squad.order";
        public const string OrderGarrisonName = "orders.garrison";

        // توليد الموجات ودرجات الصعوبة (§14)
        public const string WaveNight = "wave.night";
        public const string WaveMiniBoss = "wave.miniboss";
        public const string WaveBoss = "wave.boss";
        public const string WavePreviewTitle = "wave.preview";
        public const string WavePreviewHidden = "wave.preview.hidden";
        public const string WavePreviewRow = "wave.preview.row";
        public const string WaveSecondFront = "wave.front.second";
        public const string SettingDifficulty = "settings.difficulty";
        public const string DifficultyStory = "difficulty.story";
        public const string DifficultyNormal = "difficulty.normal";
        public const string DifficultyVeteran = "difficulty.veteran";
        public const string DifficultyNightmare = "difficulty.nightmare";

        // بركات الجولة (§15)
        public const string BoonTitle = "boon.title";
        public const string BoonReroll = "boon.reroll";
        public const string BoonHero = "boon.hero";
        public const string BoonArmy = "boon.army";
        public const string BoonTowers = "boon.towers";
        public const string BoonEconomy = "boon.economy";
        public const string BoonLight = "boon.light";
        public const string BoonTaken = "boon.taken";
        public const string TabBoons = "pause.tab.boons";
        public const string BoonRow = "boon.row";

        // التقدّم الدائم والأبحاث (§16)
        public const string MetaOpen = "meta.open";
        public const string MetaClose = "meta.close";
        public const string MetaHeader = "meta.header";
        public const string MetaStars = "meta.stars";
        public const string MetaRank = "meta.rank";
        public const string MetaDelta = "meta.delta";
        public const string MetaCost = "meta.cost";
        public const string MetaMaxed = "meta.maxed";
        public const string MetaLocked = "meta.locked";
        public const string MetaCapped = "meta.capped";
        public const string MetaRespec = "meta.respec";
        public const string BranchEconomy = "branch.economy";
        public const string BranchFortification = "branch.fortification";
        public const string BranchCommand = "branch.command";
        public const string BranchDawncraft = "branch.dawncraft";
    }
}
