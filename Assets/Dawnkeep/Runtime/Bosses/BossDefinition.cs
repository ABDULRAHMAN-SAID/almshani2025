using UnityEngine;
using Dawnkeep.Combat;

namespace Dawnkeep.Bosses
{
    /// <summary>
    /// زعيم §13: تعريف وحدة **يرث** `UnitDefinition` ويزيد عليه أرقام أطواره.
    ///
    /// الوراثة لا التركيب: الزعيم وحدة تقاتل وتُقتل وتمشي على المسار كغيرها،
    /// فلو كان صنفاً مستقلاً لاحتاج `CombatDirector` و`WaveDirector` فرعاً
    /// خاصّاً في كل حلقة — وذاك ثمنٌ يُدفع في كل إطار مقابل أربع وحدات.
    ///
    /// كل زعيم يقرأ **مجموعة حقوله وحدها**؛ ما عداها يبقى بقيمته ولا يُقرأ.
    /// </summary>
    [CreateAssetMenu(fileName = "Boss_", menuName = "مملكة الرماد/تعريف زعيم")]
    public class BossDefinition : UnitDefinition
    {
        [Header("الزعيم (§13)")]
        [Tooltip("أيّ زعماء §13 الأربعة هو.")]
        [SerializeField] private BossKind kind = BossKind.BellRam;

        [Tooltip("صغير يخرج في ليالي الخمس، وكامل في ليالي العشر (§14).")]
        [SerializeField] private BossRank rank = BossRank.Mini;

        [Tooltip("ثوانِ لقطة الظهور. §6: لا تتجاوز 1.2 ويمكن تخطّيها.")]
        [Range(0f, 1.2f)]
        [SerializeField] private float introSeconds = 1.1f;

        [Tooltip("نصف قطر جسده بالمتر — لبرك السمّ ولاصطدام الاندفاع.")]
        [SerializeField] private float bulk = 2.6f;

        [Header("كبش الجرس")]
        [Tooltip("ثوانِ الإنذار قبل الاندفاع. §13: 1.4.")]
        [SerializeField] private float telegraphSeconds = 1.4f;

        [Tooltip("كل كم ثانية يعيد الاندفاع.")]
        [SerializeField] private float chargeInterval = 11f;

        [Tooltip("سرعته أثناء الاندفاع بالمتر في الثانية.")]
        [SerializeField] private float chargeSpeed = 16f;

        [Tooltip("أطول اندفاعة بالمتر.")]
        [SerializeField] private float chargeRange = 34f;

        [Tooltip("ما يصيب به أوّل جدار في خطّه.")]
        [SerializeField] private float chargeDamage = 320f;

        [Tooltip("ما يصيب به من يعترضه من الجند.")]
        [SerializeField] private float chargeTrample = 46f;

        [Tooltip("عدد شحنات النور التي توقف الاندفاع. §13: ثلاث.")]
        [SerializeField] private int chargeStopCharges = 3;

        [Header("الاستدعاء (كبش الجرس وآكل الفجر)")]
        [Tooltip("عند أيّ نسبة صحّة يبدأ الاستدعاء. §13: نصف صحّته.")]
        [Range(0f, 1f)]
        [SerializeField] private float summonAtHealth = 0.5f;

        [Tooltip("ما يُستدعى.")]
        [SerializeField] private UnitDefinition summon;

        [Tooltip("كم واحداً في كل استدعاء.")]
        [SerializeField] private int summonCount = 4;

        [Tooltip("كل كم ثانية يعيد الاستدعاء بعد بلوغ العتبة.")]
        [SerializeField] private float summonInterval = 9f;

        [Header("أمّ المستنقع")]
        [Tooltip("كل كم ثانية تضع بركة سمّ.")]
        [SerializeField] private float poolInterval = 6.5f;

        [Tooltip("نصف قطر البركة بالمتر.")]
        [SerializeField] private float poolRadius = 7f;

        [Tooltip("ضرر البركة في الثانية.")]
        [SerializeField] private float poolDamage = 11f;

        [Tooltip("كم ثانية تبقى البركة.")]
        [SerializeField] private float poolSeconds = 9f;

        [Tooltip("كل كم ثانية تضع بيضاً.")]
        [SerializeField] private float eggInterval = 14f;

        [Tooltip("كم بيضة في المرّة.")]
        [SerializeField] private int eggCount = 3;

        [Tooltip("ثوانِ حتى الفقس — نافذة اللاعب لتحطيمها.")]
        [SerializeField] private float eggHatchSeconds = 12f;

        [Tooltip("صحّة البيضة.")]
        [SerializeField] private float eggHealth = 70f;

        [Tooltip("كم يخرج من البيضة الواحدة إن فقست.")]
        [SerializeField] private int eggBrood = 2;

        [Tooltip("كم مبنىً تَسِمه دفعةً واحدة. §13: اثنان.")]
        [SerializeField] private int markCount = 2;

        [Header("تاج الرماد")]
        [Tooltip("كم ثانية يبقى في كل طور قبل أن يبدّل.")]
        [SerializeField] private float phaseSeconds = 10f;

        [Tooltip("ما يتلقّاه من الضرر في طور الظلّ **خارج النور**.")]
        [Range(0.05f, 1f)]
        [SerializeField] private float shadowDamageTaken = 0.30f;

        [Tooltip("كل كم ثانية يطفئ منارة.")]
        [SerializeField] private float snuffInterval = 13f;

        [Tooltip("ثوانِ يُرى فيها مسار الطاقة قبل الإطفاء. §13: يظهر قبله.")]
        [SerializeField] private float snuffTelegraph = 1.6f;

        [Tooltip("كم ثانية تبقى المنارة مطفأة.")]
        [SerializeField] private float snuffSeconds = 10f;

        [Header("آكل الفجر")]
        [Tooltip("عتبة الطور الثاني من صحّته.")]
        [Range(0f, 1f)]
        [SerializeField] private float secondPhaseAt = 0.66f;

        [Tooltip("عتبة الطور الثالث.")]
        [Range(0f, 1f)]
        [SerializeField] private float thirdPhaseAt = 0.33f;

        [Tooltip("ما يُستدعى في موجة الحصار (الطور الثاني).")]
        [SerializeField] private UnitDefinition siege;

        [Tooltip("كم واحداً في موجة الحصار.")]
        [SerializeField] private int siegeCount = 6;

        [Tooltip("كم ثانية بين تبديل جهة هجومه.")]
        [SerializeField] private float sideSwapSeconds = 15f;

        [Tooltip("ما يُسحب من نور الخريطة في الثانية في الطور الأخير.")]
        [SerializeField] private float lightDrainPerSecond = 0.05f;

        [Tooltip("أقلّ ما يبلغه النور مهما طال الطور الأخير.")]
        [Range(0.05f, 1f)]
        [SerializeField] private float lightFloor = 0.25f;

        public BossKind Kind { get { return kind; } }

        public BossRank Rank { get { return rank; } }

        public float IntroSeconds { get { return Mathf.Clamp(introSeconds, 0f, 1.2f); } }

        public float Bulk { get { return Mathf.Max(0.5f, bulk); } }

        public float TelegraphSeconds { get { return telegraphSeconds; } }

        public float ChargeInterval { get { return chargeInterval; } }

        public float ChargeSpeed { get { return chargeSpeed; } }

        public float ChargeRange { get { return chargeRange; } }

        public float ChargeDamage { get { return chargeDamage; } }

        public float ChargeTrample { get { return chargeTrample; } }

        public int ChargeStopCharges { get { return chargeStopCharges; } }

        public float SummonAtHealth { get { return summonAtHealth; } }

        public UnitDefinition Summon { get { return summon; } }

        public int SummonCount { get { return summonCount; } }

        public float SummonInterval { get { return summonInterval; } }

        public float PoolInterval { get { return poolInterval; } }

        public float PoolRadius { get { return poolRadius; } }

        public float PoolDamage { get { return poolDamage; } }

        public float PoolSeconds { get { return poolSeconds; } }

        public float EggInterval { get { return eggInterval; } }

        public int EggCount { get { return eggCount; } }

        public float EggHatchSeconds { get { return eggHatchSeconds; } }

        public float EggHealth { get { return eggHealth; } }

        public int EggBrood { get { return eggBrood; } }

        public int MarkCount { get { return markCount; } }

        public float PhaseSeconds { get { return phaseSeconds; } }

        public float ShadowDamageTaken { get { return shadowDamageTaken; } }

        public float SnuffInterval { get { return snuffInterval; } }

        public float SnuffTelegraph { get { return snuffTelegraph; } }

        public float SnuffSeconds { get { return snuffSeconds; } }

        public float SecondPhaseAt { get { return secondPhaseAt; } }

        public float ThirdPhaseAt { get { return thirdPhaseAt; } }

        public UnitDefinition Siege { get { return siege; } }

        public int SiegeCount { get { return siegeCount; } }

        public float SideSwapSeconds { get { return sideSwapSeconds; } }

        public float LightDrainPerSecond { get { return lightDrainPerSecond; } }

        public float LightFloor { get { return lightFloor; } }
    }
}
