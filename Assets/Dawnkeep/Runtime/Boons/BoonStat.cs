namespace Dawnkeep.Boons
{
    /// <summary>
    /// ما تحرّكه البركات. كلّها **مضاعفات** تُضرب في الرقم الأساس، فبركةٌ
    /// بقيمة 1.18 تعني «+18%» وبقيمة 0.92 تعني «−8%».
    ///
    /// المضاعف لا الجمع: الأرقام الأساس تختلف بين مبنىً ومبنى ووحدةٍ ووحدة،
    /// فزيادةُ «عشرة» تعني شيئاً على البرج الأوّل وشيئاً آخر على آخره.
    /// </summary>
    public enum BoonStat
    {
        None = 0,

        // البطل (§8)
        HeroAttackSpeed = 1,
        HeroDamage = 2,
        HeroHealth = 3,
        HeroCooldown = 4,           // أقلّ = أسرع
        HeroCrit = 5,

        // الجند (§9)
        ArmyResistance = 10,        // يُضاف إلى الدرع لا يُضرب فيه
        ArmyMoveSpeed = 11,
        ArmyAttackSpeed = 12,
        ArmyHealth = 13,

        // الأبراج (§10)
        TowerDamage = 20,
        TowerRange = 21,
        TowerFireRate = 22,
        TowerPierce = 23,           // يُضاف: اختراق الدرع نسبةً

        // المباني (§10) — تحرّكها الأبحاث أكثر ممّا تحرّكها البركات
        BuildingHealth = 25,
        KeepHealth = 26,

        // الاقتصاد (§10)
        SellRefund = 30,            // يُضاف إلى نسبة البيع
        BuildingIncome = 31,
        WaveIncome = 32,
        KillBounty = 33,
        BuildCost = 34,             // أقلّ = أرخص

        // القيادة (§8)
        HeroRallyRadius = 6,

        // النور (§11)
        BeaconRadius = 40,
        BeaconArmourCut = 41,
        SnuffSeconds = 42,          // أقلّ = يعود أسرع
        LightRangeBonus = 43,
    }
}
