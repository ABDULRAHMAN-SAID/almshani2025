namespace Dawnkeep.Equipment
{
    /// <summary>
    /// فتحات التجهيز الأربع (§17). **أربعٌ لا أكثر** بنصّ §17: «لا تكثر
    /// الفتحات لتجنّب شاشة معقّدة» — وشاشةٌ بثماني فتحاتٍ على هاتفٍ في يدٍ
    /// واحدة ليست خياراً، بل جدول.
    /// </summary>
    public enum EquipmentSlot
    {
        /// <summary>السلاح: يغيّر **شكل الضربة** لا رقمها وحده (§17).</summary>
        Weapon = 0,

        /// <summary>الدرع: صحّةً ومقاومة.</summary>
        Armor = 1,

        /// <summary>الأثر: «كل أثر يدعم أسلوباً محدّداً» (§17).</summary>
        Relic = 2,

        /// <summary>المركب: سرعةً وما يتبعها.</summary>
        Mount = 3,
    }
}
