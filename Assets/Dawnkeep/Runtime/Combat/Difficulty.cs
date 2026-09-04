namespace Dawnkeep.Combat
{
    /// <summary>درجات صعوبة الحملة (§14). الترتيب هو ترتيب الاختيار.</summary>
    public enum Difficulty
    {
        /// <summary>حكاية: أعداء أضعف ومعاينة كاملة.</summary>
        Story = 0,

        /// <summary>القياسية.</summary>
        Normal = 1,

        /// <summary>مخضرم: أقوى، وبعض الليالي من جهتين.</summary>
        Veteran = 2,

        /// <summary>كابوس: تُفتح بعد إنهاء المنطقة — نور أقلّ ومعدِّل ثابت.</summary>
        Nightmare = 3,
    }
}
