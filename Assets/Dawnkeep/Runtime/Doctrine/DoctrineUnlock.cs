namespace Dawnkeep.Doctrine
{
    /// <summary>
    /// بأيّ إنجازٍ تُفتح البطاقة (§18: «بالإنجازات والحملة، لا بالسحب
    /// العشوائي»). وكلّها تُقرأ من ملفّ الحفظ (§27) — لا عدّادَ ثانٍ يتفرّق
    /// عن الأوّل.
    /// </summary>
    public enum DoctrineUnlock
    {
        /// <summary>مفتوحةٌ من أوّل جولة — لا بدّ من بضعٍ منها.</summary>
        FromStart = 0,

        /// <summary>مستوى الحساب بلغ كذا (§16).</summary>
        AccountLevel = 1,

        /// <summary>عدد المراحل المكسوبة بلغ كذا.</summary>
        Victories = 2,

        /// <summary>أبعد ليلةٍ بُلغت (§5) — يفتحها الصمود لا الفوز.</summary>
        FurthestWave = 3,

        /// <summary>عدد الزعماء الذين لُقُوا (§13).</summary>
        BossesMet = 4,

        /// <summary>عدد المراحل المُلعَبة — يفتحها المثابرة.</summary>
        StagesPlayed = 5,
    }
}
