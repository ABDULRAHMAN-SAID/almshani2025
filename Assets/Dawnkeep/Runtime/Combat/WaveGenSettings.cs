using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// أرقام توليد الموجات (§14) — في أصل واحد لا في الكود (§1).
    ///
    /// الصيغة كما نصّت §14: «الميزانية الأساسية = 12 × 1.22^(رقم الموجة − 1)
    /// × معامل المنطقة × معامل الصعوبة». الرقمان هنا لا هناك، فتجريبهما لا
    /// يحتاج تعديل سطر.
    /// </summary>
    [CreateAssetMenu(fileName = "WaveGenSettings", menuName = "مملكة الرماد/إعدادات توليد الموجات")]
    public class WaveGenSettings : ScriptableObject
    {
        [Header("ميزانية التهديد (§14)")]
        [Tooltip("الأساس: ميزانية الموجة الأولى قبل المعاملات.")]
        [SerializeField] private float baseBudget = 12f;

        [Tooltip("معامل النموّ الأُسّي لكل موجة تالية.")]
        [SerializeField] private float growth = 1.22f;

        [Tooltip("معامل المنطقة — خريطة أقسى ترفعه.")]
        [SerializeField] private float zoneFactor = 1f;

        [Header("تركيب الموجة")]
        [Tooltip("أقلّ عدد مجموعات في الموجة المولَّدة.")]
        [SerializeField] private int minGroups = 2;

        [Tooltip("أكثر عدد مجموعات — موجةٌ من عشر دفعات تُقرأ كضجيج.")]
        [SerializeField] private int maxGroups = 5;

        [Tooltip("توجب مجموعة مشاة واحدة على الأقل: بلا خطٍّ أماميّ لا تُقرأ الموجة.")]
        [SerializeField] private bool requireMelee = true;

        [Tooltip("ثوانٍ بين خروج فردٍ وآخر في المجموعة الكبيرة.")]
        [SerializeField] private float packSpacingMin = 0.5f;

        [Tooltip("ثوانٍ بين فردٍ وآخر في المجموعة الصغيرة.")]
        [SerializeField] private float packSpacingMax = 2.6f;

        [Tooltip("الثواني التي تُقسَم على أفراد المجموعة لحساب تباعدها.")]
        [SerializeField] private float packWindow = 8f;

        [Tooltip("ثوانٍ تأخير تُضاف لكل مجموعة تالية.")]
        [SerializeField] private float groupStagger = 4.5f;

        [Header("مستوى العدوّ (§14)")]
        [Tooltip("أقصى مستوى فوق الأساس. الميزانية الفائضة تشتري مستوى لا أجساداً.")]
        [Range(0, 6)]
        [SerializeField] private int maxTier = 4;

        [Tooltip("ثمن رفع مجموعة درجةً واحدة، نسبةً من ثمنها الأساس.")]
        [SerializeField] private float tierCost = 0.6f;

        [Tooltip("ما تضيفه الدرجة الواحدة إلى الصحّة.")]
        [SerializeField] private float tierHealth = 0.35f;

        [Tooltip("ما تضيفه الدرجة الواحدة إلى الضرر.")]
        [SerializeField] private float tierDamage = 0.25f;

        [Header("الزعماء (§14 و§13)")]
        [Tooltip("كل كم موجة يظهر زعيم صغير.")]
        [SerializeField] private int miniBossEvery = 5;

        [Tooltip("كل كم موجة يظهر زعيم كامل.")]
        [SerializeField] private int bossEvery = 10;

        [Tooltip("نصيب الزعيم من ميزانية موجته — الباقي لحاشيته.")]
        [Range(0.1f, 0.9f)]
        [SerializeField] private float bossShare = 0.45f;

        [Header("المهلة والبذرة")]
        [Tooltip("ثوانٍ استعداد للموجة المولَّدة الأولى.")]
        [SerializeField] private float prepareTime = 16f;

        [Tooltip("ثوانٍ تُضاف للاستعداد كل موجة، بسقف.")]
        [SerializeField] private float prepareGrowth = 0.6f;

        [SerializeField] private float prepareCap = 26f;

        [Tooltip("بذرة محفوظة: نفس البذرة تعيد نفس التحدّي (§14).")]
        [SerializeField] private int seed = 20260101;

        public float BaseBudget { get { return baseBudget; } }

        public float Growth { get { return growth; } }

        public float ZoneFactor { get { return zoneFactor; } }

        public int MinGroups { get { return Mathf.Max(1, minGroups); } }

        public int MaxGroups { get { return Mathf.Max(MinGroups, maxGroups); } }

        public bool RequireMelee { get { return requireMelee; } }

        public float PackSpacingMin { get { return packSpacingMin; } }

        public float PackSpacingMax { get { return Mathf.Max(packSpacingMin, packSpacingMax); } }

        public float PackWindow { get { return Mathf.Max(1f, packWindow); } }

        public float GroupStagger { get { return Mathf.Max(0f, groupStagger); } }

        public int MaxTier { get { return Mathf.Max(0, maxTier); } }

        public float TierCost { get { return Mathf.Max(0.05f, tierCost); } }

        public float TierHealth { get { return Mathf.Max(0f, tierHealth); } }

        public float TierDamage { get { return Mathf.Max(0f, tierDamage); } }

        /// <summary>مضاعف صحّة مستوىً بعينه: الأساس صفر.</summary>
        public float HealthAtTier(int tier)
        {
            return 1f + (TierHealth * Mathf.Clamp(tier, 0, MaxTier));
        }

        /// <summary>مضاعف ضرر مستوىً بعينه.</summary>
        public float DamageAtTier(int tier)
        {
            return 1f + (TierDamage * Mathf.Clamp(tier, 0, MaxTier));
        }

        public int MiniBossEvery { get { return Mathf.Max(0, miniBossEvery); } }

        public int BossEvery { get { return Mathf.Max(0, bossEvery); } }

        public float BossShare { get { return bossShare; } }

        public int Seed { get { return seed; } }

        /// <summary>ميزانية التهديد لموجةٍ بعينها — صيغة §14 حرفياً.</summary>
        public int Budget(int waveNumber, float difficultyScale)
        {
            // معامل المنطقة من الأصل × معامل منطقة الحملة الجارية (§19):
            // الأصل هو معامل الخريطة الواحدة، ومنطقةُ الحملة تصعد بالسلّم
            // كلّه. وضربُهما لا استبدالُهما — لأنّ الخريطة تبقى خريطتها.
            float raw = baseBudget
                * Mathf.Pow(growth, Mathf.Max(0, waveNumber - 1))
                * zoneFactor
                * Dawnkeep.Campaign.CampaignDirector.Threat()
                * Mathf.Max(0.01f, difficultyScale);

            return Mathf.Max(1, Mathf.RoundToInt(raw));
        }

        /// <summary>مهلة الاستعداد لموجةٍ بعينها — تطول قليلاً ثمّ تثبت.</summary>
        public float PrepareFor(int waveNumber)
        {
            return Mathf.Min(prepareCap, prepareTime + (prepareGrowth * Mathf.Max(0, waveNumber - 1)));
        }
    }
}
