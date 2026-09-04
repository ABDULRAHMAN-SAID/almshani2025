namespace Dawnkeep.Boons
{
    /// <summary>
    /// بركاتٌ لا يصفها مضاعف بل **سلوك**. لا تُبنى بأرقام لأنّها تضيف قاعدة
    /// جديدة لا تحرّك قاعدة قائمة — و§15 تسمّي منها ثلاثاً بعينها.
    /// </summary>
    public enum BoonFlag
    {
        None = 0,

        /// <summary>سلسلة القناديل: تداخل دائرتَي منارة يجرح جرحاً مستمرّاً.</summary>
        LanternChain = 1,

        /// <summary>حجر الجمر: قذيفة القاذف تترك ناراً، وإطلاقه أبطأ.</summary>
        BurningStones = 2,

        /// <summary>الحصاد الأخير: المزارع تنتج أكثر ولا تُصلَح عند الفجر.</summary>
        FinalHarvest = 3,

        /// <summary>صفوفٌ متراصّة: المتقاربون يقاومون أكثر ويتحرّكون أبطأ.</summary>
        PackedRanks = 4,

        /// <summary>يقظة الفجر: أوّل ضربة على عدوٍّ كامل الصحّة حرِجة دائماً.</summary>
        FirstLight = 5,

        /// <summary>وقود الظلام: قتلُ عدوٍّ في الظلام يزيد المكافأة، وفي النور لا.</summary>
        DarkTithe = 6,
    }
}
