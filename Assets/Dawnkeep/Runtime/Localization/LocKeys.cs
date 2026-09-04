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
    }
}
