using UnityEngine;

namespace Dawnkeep.Meta
{
    /// <summary>
    /// أرقام التقدّم الدائم (§16) — في أصل واحد لا في الكود (§1).
    ///
    /// صيغة الخبرة كما نصّت §16: «XP = تقريب 100 × المستوى أس 1.45».
    /// </summary>
    [CreateAssetMenu(fileName = "ProgressSettings", menuName = "مملكة الرماد/إعدادات التقدّم")]
    public class ProgressSettings : ScriptableObject
    {
        [Header("مستوى الحساب (§16)")]
        [Tooltip("معامل صيغة الخبرة: 100 × المستوى^1.45.")]
        [SerializeField] private float xpBase = 100f;

        [Tooltip("أُسّ الصيغة.")]
        [SerializeField] private float xpExponent = 1.45f;

        [Tooltip("أعلى مستوى حساب في الإصدار الأوّل (§16: ثلاثون).")]
        [SerializeField] private int maxAccountLevel = 30;

        [Header("مستوى البطل (§16)")]
        [Tooltip("أعلى مستوى للبطل (§16: أربعون).")]
        [SerializeField] private int maxHeroLevel = 40;

        [Tooltip("ما تضيفه كل مرتبة إلى صحّة البطل (§16: نحو 1.5%).")]
        [SerializeField] private float heroHealthPerLevel = 0.015f;

        [Tooltip("وما تضيفه إلى ضرره (§16: نحو 1%).")]
        [SerializeField] private float heroDamagePerLevel = 0.01f;

        [Tooltip("كل كم مستوى يمنح نقطة موهبة (§16: خمسة).")]
        [SerializeField] private int levelsPerTalent = 5;

        [Header("مكافأة المرحلة")]
        [Tooltip("خبرة الحساب لكل ليلة نُجيَ منها.")]
        // ── مكافأة المرحلة: أرقام §21 حرفياً ──────────────────────────────
        //
        //   Gold        = 100 + 18 × رقم المرحلة + 25 × النجوم الجديدة
        //   Account XP  =  80 + 12 × رقم المرحلة
        //   Hero XP     =  60 + 10 × رقم المرحلة
        //
        // وهي هنا مقابضُ لا ثوابتُ مدفونة (§1)، وقيمُها الافتراضية أرقام
        // §21 كما هي.

        [Tooltip("الذهب الأساس لكل مرحلة (§21: 100).")]
        [SerializeField] private int goldBase = 100;

        [Tooltip("ذهبٌ لكل رقم مرحلة (§21: 18).")]
        [SerializeField] private int goldPerStage = 18;

        [Tooltip("ذهبٌ لكل نجمةٍ جديدة (§21: 25).")]
        [SerializeField] private int goldPerStar = 25;

        [Tooltip("خبرة الحساب الأساس (§21: 80).")]
        [SerializeField] private int accountXpBase = 80;

        [Tooltip("خبرة حسابٍ لكل رقم مرحلة (§21: 12).")]
        [SerializeField] private int accountXpPerStage = 12;

        [Tooltip("خبرة البطل الأساس (§21: 60).")]
        [SerializeField] private int heroXpBase = 60;

        [Tooltip("خبرة بطلٍ لكل رقم مرحلة (§21: 10).")]
        [SerializeField] private int heroXpPerStage = 10;

        [Tooltip("أقصى شظايا فجرٍ من مرحلة (§21: «من 0 إلى 3»).")]
        [Range(0, 3)]
        [SerializeField] private int shardCap = 3;

        [Tooltip("حصّة الخاسر من المكافأة، نسبةً إلى ما صمد من ليالٍ.")]
        [Range(0f, 1f)]
        [SerializeField] private float defeatShare = 0.5f;

        [Header("ما يُفتح بالمستوى")]
        [Tooltip("مستوى الحساب الذي تُفتح عنده سرعة ٢×.")]
        [SerializeField] private int doubleSpeedLevel = 3;

        [Tooltip("ومستوى سرعة ٣×.")]
        [SerializeField] private int tripleSpeedLevel = 8;

        [Tooltip("مستوى فتح شجرة الأبحاث.")]
        [SerializeField] private int researchLevel = 2;

        [Tooltip("مستوى فتح درجة «مخضرم».")]
        [SerializeField] private int veteranLevel = 5;

        [Tooltip("ومستوى «الكابوس» (§14: تُفتح بعد إنهاء المنطقة).")]
        [SerializeField] private int nightmareLevel = 12;

        [Header("سقف الأبحاث (§16)")]
        [Tooltip("أقصى ما تضيفه الأبحاث كلّها إلى رقمٍ أساس واحد.")]
        [Range(0.05f, 1f)]
        [SerializeField] private float researchCap = 0.30f;

        [Tooltip("ثمن إعادة توزيع النقاط ذهباً.")]
        [SerializeField] private int respecGold = 300;

        public int MaxAccountLevel { get { return Mathf.Max(1, maxAccountLevel); } }

        public int MaxHeroLevel { get { return Mathf.Max(1, maxHeroLevel); } }

        public float HeroHealthPerLevel { get { return heroHealthPerLevel; } }

        public float HeroDamagePerLevel { get { return heroDamagePerLevel; } }

        public int LevelsPerTalent { get { return Mathf.Max(1, levelsPerTalent); } }

        public int GoldBase { get { return goldBase; } }

        public int GoldPerStage { get { return goldPerStage; } }

        public int GoldPerStar { get { return goldPerStar; } }

        public int AccountXpBase { get { return accountXpBase; } }

        public int AccountXpPerStage { get { return accountXpPerStage; } }

        public int HeroXpBase { get { return heroXpBase; } }

        public int HeroXpPerStage { get { return heroXpPerStage; } }

        public int ShardCap { get { return Mathf.Clamp(shardCap, 0, 3); } }

        public float DefeatShare { get { return Mathf.Clamp01(defeatShare); } }

        public int DoubleSpeedLevel { get { return doubleSpeedLevel; } }

        public int TripleSpeedLevel { get { return tripleSpeedLevel; } }

        public int ResearchLevel { get { return researchLevel; } }

        public int VeteranLevel { get { return veteranLevel; } }

        public int NightmareLevel { get { return nightmareLevel; } }

        public float ResearchCap { get { return researchCap; } }

        public int RespecGold { get { return respecGold; } }

        /// <summary>
        /// الخبرة اللازمة للانتقال **من** هذا المستوى إلى الذي يليه — صيغة
        /// §16 حرفياً.
        /// </summary>
        public int XpForLevel(int level)
        {
            return Mathf.Max(1, Mathf.RoundToInt(
                xpBase * Mathf.Pow(Mathf.Max(1, level), xpExponent)));
        }

        /// <summary>مضاعف صحّة البطل عند مستواه.</summary>
        public float HeroHealthAt(int level)
        {
            return 1f + (heroHealthPerLevel * Mathf.Max(0, level - 1));
        }

        public float HeroDamageAt(int level)
        {
            return 1f + (heroDamagePerLevel * Mathf.Max(0, level - 1));
        }
    }
}
