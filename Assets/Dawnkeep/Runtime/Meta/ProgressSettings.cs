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
        [SerializeField] private int xpPerWave = 42;

        [Tooltip("خبرة إضافية عند الفوز.")]
        [SerializeField] private int xpVictoryBonus = 260;

        [Tooltip("ذهب لكل ليلة.")]
        [SerializeField] private int goldPerWave = 28;

        [Tooltip("ذهب إضافي عند الفوز.")]
        [SerializeField] private int goldVictoryBonus = 180;

        [Tooltip("نجوم بحثٍ عند الفوز.")]
        [SerializeField] private int starsOnVictory = 2;

        [Tooltip("نجمة عند بلوغ هذه الليلة ولو خُسرت المرحلة.")]
        [SerializeField] private int starAtWave = 5;

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

        public int XpPerWave { get { return xpPerWave; } }

        public int XpVictoryBonus { get { return xpVictoryBonus; } }

        public int GoldPerWave { get { return goldPerWave; } }

        public int GoldVictoryBonus { get { return goldVictoryBonus; } }

        public int StarsOnVictory { get { return starsOnVictory; } }

        public int StarAtWave { get { return starAtWave; } }

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
