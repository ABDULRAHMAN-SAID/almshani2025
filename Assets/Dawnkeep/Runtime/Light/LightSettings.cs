using UnityEngine;

namespace Dawnkeep.Light
{
    /// <summary>
    /// أرقام نظام النور كلّها (§11) — **في أصل لا في الكود**.
    ///
    /// هذا هو العنصر الفارق الأصلي للعبة، وأرقامه هي ما يُوزَن به: نصف القطر
    /// وأثر الشحنة ومدّة الإطفاء. دفنها في الكود يعني أنّ كل تعديل توازن يمرّ
    /// بإعادة تجميع.
    /// </summary>
    [CreateAssetMenu(fileName = "LightSettings", menuName = "مملكة الرماد/إعدادات النور")]
    public class LightSettings : ScriptableObject
    {
        [Header("المخزون")]
        [Tooltip("شحنات قلب الحصن عند البداية (§11: شحنتان).")]
        [SerializeField] private int startingCharges = 2;

        [Tooltip("أقصى شحنات تستقبلها منارة واحدة (§11: من صفر إلى ثلاث).")]
        [SerializeField] private int maxChargesPerBeacon = 3;

        [Header("نصف القطر")]
        [Tooltip("نصف القطر الأساس بالمتر، قبل أثر الشحنات.")]
        [SerializeField] private float baseRadius = 30f;

        [Tooltip("كل شحنة توسّع نصف القطر بهذه النسبة (§11: 15%).")]
        [SerializeField] private float radiusPerCharge = 0.15f;

        [Header("أثر الشحنة")]
        [Tooltip("ما تقضمه المنطقة من درع الظلام لمجرّد دخولها، قبل الشحنات.")]
        [Range(0f, 1f)]
        [SerializeField] private float zoneArmourCut = 0.55f;

        [Tooltip("كل شحنة تخفض درع الظلام داخل المنطقة بهذه النسبة (§11: 12%).")]
        [SerializeField] private float armourCutPerCharge = 0.12f;

        [Tooltip("كل شحنة تمنح المدى داخل المنطقة هذه الزيادة (§11: 5%).")]
        [SerializeField] private float rangeBonusPerCharge = 0.05f;

        [Header("الإطفاء")]
        [Tooltip("كم ثانية تبقى الشحنة مطفأة بعد أن يبتلعها آكل القناديل (§11: ثمانٍ).")]
        [SerializeField] private float snuffSeconds = 8f;

        [Header("الحافّة")]
        [Tooltip("سماكة التلاشي عند حافّة الدائرة كنسبة من نصف قطرها.")]
        [Range(0.02f, 0.5f)]
        [SerializeField] private float edgeSoftness = 0.16f;

        [Tooltip("درجات الصعوبة (§14). فارغاً لا يُضيَّق النور.")]
        [SerializeField] private Dawnkeep.Combat.DifficultySettings difficulty;

        public int StartingCharges { get { return startingCharges; } }

        public int MaxChargesPerBeacon { get { return maxChargesPerBeacon; } }

        public float BaseRadius { get { return baseRadius; } }

        public float RadiusPerCharge { get { return radiusPerCharge; } }

        /// <summary>
        /// **توفيق موثّق بين نصّين في المواصفات.** §3 (الركيزة السادسة) تقول
        /// إنّ الأعداء داخل الدائرة «يخسرون درع الظلام»، و§11 تقول إنّ كل شحنة
        /// «تخفضه 12%». الأوّل نيّة التصميم والثاني مقبض التوازن — فالدخول
        /// وحده يقضم `zoneArmourCut`، وكل شحنة تضيف 12% فوقه:
        ///
        ///   شحنة واحدة ← 67% · شحنتان ← 79% · ثلاث ← 91%
        ///
        /// فيخسر العدوّ درعه فعلاً كما تقول الركيزة، وتبقى كل شحنة تساوي 12%
        /// كما يقول §11. الرقم الوحيد المستحدث هو `zoneArmourCut` وهو في الأصل
        /// لا في الكود.
        /// </summary>
        public float ZoneArmourCut
        {
            get
            {
                return zoneArmourCut
                    * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.BeaconArmourCut);
            }
        }

        public float ArmourCutPerCharge
        {
            get
            {
                return armourCutPerCharge
                    * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.BeaconArmourCut);
            }
        }

        public float RangeBonusPerCharge
        {
            get
            {
                return rangeBonusPerCharge
                    * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.LightRangeBonus);
            }
        }

        /// <summary>
        /// مدّة إطفاء المنارة. بركة §15 تخفضها — والمضاعف أقلّ من واحد يعني
        /// «تعود أسرع»، فيُضرب في المدّة لا يُقسم عليها.
        /// </summary>
        public float SnuffSeconds
        {
            get
            {
                return snuffSeconds
                    * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.SnuffSeconds);
            }
        }

        public float EdgeSoftness { get { return edgeSoftness; } }

        /// <summary>
        /// نصف قطر منارة بعدد شحنات معلوم، بعد مضاعف الدرجة (§14: «ضوء أقل»
        /// في الكابوس). المضاعف هنا لا في `Beacon`: كل منارة تقرأ هذا الأصل،
        /// فوضعه هنا يضبطهنّ جميعاً بمكان واحد.
        /// </summary>
        public float RadiusFor(int charges)
        {
            float scale = difficulty != null
                ? Mathf.Max(0.1f, difficulty.Active.LightScale)
                : 1f;

            scale *= Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.BeaconRadius);

            return baseRadius * (1f + (radiusPerCharge * Mathf.Max(0, charges))) * scale;
        }
    }
}
