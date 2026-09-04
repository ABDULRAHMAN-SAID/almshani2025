namespace Dawnkeep.Combat
{
    /// <summary>الطرفان في المعركة. الحياد لِما لا يُقاتَل: القرويّون والخيل.</summary>
    public enum Faction
    {
        Neutral = 0,
        Kingdom = 1,
        Horde = 2,
    }

    /// <summary>فئة الهدف التي يفضّلها العدو — §12 من المواصفات.</summary>
    public enum TargetClass
    {
        Nearest = 0,      // Raider: أقرب ما يعترضه
        Champion = 1,     // Assassin: القائد أو الجنود البعيدون
        Structure = 2,    // Siege: الجدران وقلب الحصن
        Ranged = 3,       // Mire Hound: يقفز إلى الرماة
    }
}
