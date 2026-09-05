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
        public const string ResultToMenu = "result.menu";

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
        public const string SettingQuality = "settings.quality";
        public const string QualityLow = "quality.low";
        public const string QualityMedium = "quality.medium";
        public const string QualityHigh = "quality.high";
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
        public const string MetaShards = "meta.shards";
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

        // القائمة الرئيسة والإقلاع (§24)
        public const string GameTitle = "menu.title";
        public const string GameSubtitle = "menu.subtitle";
        public const string MenuPlay = "menu.play";
        public const string MenuSoon = "menu.soon";
        public const string SaveRecovered = "menu.save.recovered";

        // التجهيز والحدّادة (§17)
        public const string LoadoutOpen = "gear.open";
        public const string LoadoutTitle = "gear.title";
        public const string LoadoutClose = "gear.close";
        public const string SlotWeapon = "gear.slot.weapon";
        public const string SlotArmor = "gear.slot.armor";
        public const string SlotRelic = "gear.slot.relic";
        public const string SlotMount = "gear.slot.mount";
        public const string SlotEmpty = "gear.slot.empty";
        public const string RarityCommon = "gear.rarity.common";
        public const string RarityUncommon = "gear.rarity.uncommon";
        public const string RarityRare = "gear.rarity.rare";
        public const string RarityEpic = "gear.rarity.epic";
        public const string RarityLegendary = "gear.rarity.legendary";
        public const string GearLevel = "gear.level";
        public const string GearEquip = "gear.equip";
        public const string GearEquipped = "gear.equipped";
        public const string GearUnequip = "gear.unequip";
        public const string GearLocked = "gear.locked";
        public const string ForgeUpgrade = "forge.upgrade";
        public const string ForgeDismantle = "forge.dismantle";
        public const string ForgeCost = "forge.cost";
        public const string ForgeReturns = "forge.returns";
        public const string ForgeShards = "forge.shards";
        public const string ForgeNoGear = "forge.no.gear";
        public const string ForgeNotOwned = "forge.not.owned";
        public const string ForgeMaxLevel = "forge.max.level";
        public const string ForgeNoGold = "forge.no.gold";
        public const string ForgeNoShards = "forge.no.shards";
        public const string ForgeStarterGear = "forge.starter";

        // بطاقات العقائد (§18)
        public const string DoctrineOpen = "doctrine.open";
        public const string DoctrineTitle = "doctrine.title";
        public const string DoctrineHint = "doctrine.hint";
        public const string DoctrineLocked = "doctrine.locked";
        public const string DoctrineAlready = "doctrine.already";
        public const string DoctrineNeeds = "doctrine.needs";
        public const string DoctrineUpgraded = "doctrine.upgraded";
        public const string DoctrineUpgradeAt = "doctrine.upgrade.at";
        public const string UnlockFromStart = "doctrine.unlock.start";
        public const string UnlockAccountLevel = "doctrine.unlock.level";
        public const string UnlockVictories = "doctrine.unlock.victories";
        public const string UnlockFurthestWave = "doctrine.unlock.wave";
        public const string UnlockBossesMet = "doctrine.unlock.bosses";
        public const string UnlockStagesPlayed = "doctrine.unlock.stages";

        // خريطة الحملة (§19)
        public const string CampaignOpen = "campaign.open";
        public const string CampaignTitle = "campaign.title";
        public const string StageCleared = "campaign.cleared";
        public const string StageLocked = "campaign.locked";
        public const string StageNext = "campaign.next";
        public const string StagePlay = "campaign.play";
        public const string StageReward = "campaign.reward";
        public const string ZoneLockedAfter = "campaign.zone.locked";
        public const string ObjectiveHoldKeep = "objective.keep";
        public const string ObjectiveConvoy = "objective.convoy";
        public const string ObjectiveBeacons = "objective.beacons";
        public const string ObjectiveSixNodes = "objective.nodes";
        public const string ObjectiveTwoGates = "objective.gates";
        public const string ObjectiveEconomy = "objective.economy";
        public const string ObjectiveBrokenWall = "objective.wall";

        // أنماط اللعب (§20)
        public const string ModesOpen = "modes.open";
        public const string ModesTitle = "modes.title";
        public const string ModeCampaign = "mode.campaign";
        public const string ModeEndless = "mode.endless";
        public const string ModeDaily = "mode.daily";
        public const string ModeBossHunt = "mode.bosshunt";
        public const string ModeCampaignNote = "mode.campaign.note";
        public const string ModeEndlessNote = "mode.endless.note";
        public const string ModeDailyNote = "mode.daily.note";
        public const string ModeBossHuntNote = "mode.bosshunt.note";
        public const string ModeLockedZone = "mode.locked.zone";
        public const string ModeBest = "mode.best";
        public const string ModeNoBest = "mode.nobest";
        public const string ModeChosen = "mode.chosen";
        public const string ModeSeed = "mode.seed";
        public const string ModeReroll = "mode.reroll";
        public const string ModeNewRecord = "mode.record";

        // حصاد الجولة (§21)
        public const string HarvestStars = "harvest.stars";
        public const string HarvestGold = "harvest.gold";
        public const string HarvestShards = "harvest.shards";
        public const string HarvestBlueprint = "harvest.blueprint";
    }
}
