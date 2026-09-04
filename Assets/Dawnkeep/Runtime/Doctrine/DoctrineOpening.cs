namespace Dawnkeep.Doctrine
{
    /// <summary>
    /// ما تفعله البطاقة **عند بداية المرحلة** (§18). لا كل عقيدةٍ مضاعف:
    /// «ابدأ بستّين فضّة إضافية» و«تبدأ بثلاثة حرّاس» فعلٌ يقع مرّةً، لا
    /// رقمٌ يُضرب في كل قراءة — وحشرُهما في مضاعفٍ يجعل الفضّة تُضاف عند
    /// كل بناء، والحرّاس يُستدعَون في كل موجة.
    /// </summary>
    public enum DoctrineOpening
    {
        /// <summary>لا فعلَ افتتاحيّ — البطاقة أرقامٌ صِرف.</summary>
        None = 0,

        /// <summary>فضّةٌ إضافية في الخزينة (§18: Early Investment).</summary>
        ExtraSilver = 1,

        /// <summary>حرّاسٌ يبدؤون في الساحة (§18: Standing Army).</summary>
        StandingGuards = 2,

        /// <summary>منارةٌ مضاءةٌ مجّاناً (§18: Bright Frontier).</summary>
        LitBeacon = 3,

        /// <summary>أوّل جدارين بنصف الثمن (§18: Stone First).</summary>
        CheapFirstWalls = 4,

        /// <summary>برجٌ مجّانيّ على أوّل عقدةٍ يبنيه اللاعب.</summary>
        FreeFirstTower = 5,

        /// <summary>صحّةٌ إضافية لقلب الحصن عند البداية.</summary>
        ReinforcedKeep = 6,
    }
}
