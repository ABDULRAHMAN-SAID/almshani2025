namespace Dawnkeep.Combat
{
    /// <summary>
    /// سماتُ سلوكٍ تُضاف إلى العدوّ (§12). **رايات لا وراثة**: عدوٌّ يطير
    /// ويستدعي هو راياتان على تعريفٍ واحد، وصنفان متوارثان لا يجتمعان.
    ///
    /// وتُقرأ في `CombatDirector` — لا `Update` في الوحدة (§1).
    /// </summary>
    [System.Flags]
    public enum UnitTrait
    {
        None = 0,

        /// <summary>يركض إلى هدفه ثمّ يفجّر نفسه بعد إنذار (§12: المفجّر).</summary>
        Suicide = 1 << 0,

        /// <summary>يترك منطقة سمٍّ عند موته (§12: حامل الطاعون).</summary>
        DeathCloud = 1 << 1,

        /// <summary>يقفز إلى الرماة إن لم يوقفه الحرّاس (§12: كلب المستنقع).</summary>
        Leap = 1 << 2,

        /// <summary>يستدعي وحدتين صغيرتين عند نصف صحّته (§12: فارس القبر).</summary>
        SummonAtHalf = 1 << 3,

        /// <summary>يتجاهل الجدران (§12: الطائر).</summary>
        Flying = 1 << 4,

        /// <summary>يبقى خلف الموجة ويقوّي الحلفاء (§12: كاهن الكسوف).</summary>
        Support = 1 << 5,

        /// <summary>يحفر ويظهر داخل الحلقة الخارجية بتحذير (§12: تنّين الصدع).</summary>
        Burrow = 1 << 6,

        /// <summary>يستفيد من الظلام (§12: الرامي المحجوب).</summary>
        DarkFavoured = 1 << 7,

        /// <summary>درعٌ أماميّ: ضعيفٌ من الخلف (§12: الغاشم المدرَّع).</summary>
        FrontShield = 1 << 8,
    }
}
