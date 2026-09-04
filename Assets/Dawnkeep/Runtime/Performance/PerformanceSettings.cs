using UnityEngine;

namespace Dawnkeep.Performance
{
    /// <summary>درجات الجهاز (§31). كل درجةٍ ميزانيّتها من الأعداء.</summary>
    public enum QualityTier
    {
        Low = 0,
        Medium = 1,
        High = 2,
    }

    /// <summary>
    /// أرقام الأداء (§31) — في أصل واحد لا في الكود (§1).
    ///
    /// وميزانيّة الأعداء **سقفٌ على الأحياء لا على الموجة**: الموجة تُولَّد
    /// كما تُولَّد، والخروج يُبطَّأ حتى يتّسع المكان. §31 تقول «حتى 140 عدوّاً
    /// نشطاً مرئيّاً» — نشطاً، لا مولَّداً.
    ///
    /// و«لا تكذب بعدّاد وحدات غير موجودة» (§31): ما لم يخرج بعد لا يُعدّ في
    /// شريط الأعداد، والعدّاد يقول من في الساحة فعلاً.
    /// </summary>
    [CreateAssetMenu(fileName = "PerformanceSettings", menuName = "مملكة الرماد/إعدادات الأداء")]
    public class PerformanceSettings : ScriptableObject
    {
        [Header("درجة الجهاز (§31)")]
        [Tooltip("الدرجة الجارية. تُختار تلقائيّاً عند أوّل تشغيل ثمّ تُحفظ.")]
        [SerializeField] private QualityTier tier = QualityTier.Medium;

        [Tooltip("سقف الأعداء الأحياء على الدرجة الدنيا (§31: 140).")]
        [SerializeField] private int lowBudget = 140;

        [Tooltip("وعلى المتوسطة (§31: 280).")]
        [SerializeField] private int mediumBudget = 280;

        [Tooltip("وعلى العليا (§31: 500).")]
        [SerializeField] private int highBudget = 500;

        [Header("المحاكاة (§31)")]
        [Tooltip("تردّد نبضة الذكاء الاصطناعي. §31: بين 20 و30 هرتز.")]
        [Range(20f, 30f)]
        [SerializeField] private float simulationHz = 25f;

        [Tooltip("تردّد القرارات البعيدة. §31: 4 هرتز.")]
        [Range(1f, 10f)]
        [SerializeField] private float distantHz = 4f;

        [Tooltip("أبعد من هذا المدى عن الكاميرا تُعَدّ الوحدة بعيدة.")]
        [SerializeField] private float distantRange = 90f;

        [Header("التجميع (§31)")]
        [Tooltip("يُسخَّن المجمّع مسبقاً بحسب أثقل موجة معرَّفة.")]
        [SerializeField] private bool preWarmPools = true;

        [Tooltip("هامشٌ فوق أثقل دفعة عند التسخين.")]
        [Range(1f, 2f)]
        [SerializeField] private float preWarmMargin = 1.25f;

        /// <summary>
        /// الدرجة الجارية. تُقرأ من ملفّ الحفظ (§27) لا من هذا الأصل: الأصل
        /// يُخبَز في البناء فلا يُكتب فيه على الجهاز، فاختيارُ اللاعب يضيع
        /// عند أوّل إغلاق.
        ///
        /// وإن لم يختر بعد، تُقترح من ذاكرة جهازه ونواه — ثمّ **تُحفظ**، فلا
        /// تتبدّل تحت يده لو تغيّر الاقتراح في إصدارٍ تالٍ.
        /// </summary>
        public QualityTier Tier
        {
            get
            {
                Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
                if (save == null)
                {
                    return tier;
                }

                int stored = save.Data.Settings.Quality;
                if (stored < 0)
                {
                    QualityTier suggested = Suggest();
                    save.Data.Settings.Quality = (int)suggested;
                    save.Mark();
                    return suggested;
                }

                return (QualityTier)Mathf.Clamp(stored, 0, 2);
            }

            set
            {
                tier = value;

                Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
                if (save != null)
                {
                    save.Data.Settings.Quality = (int)value;
                    save.Mark();
                }
            }
        }

        /// <summary>سقف الأحياء على الدرجة الجارية (§31).</summary>
        public int Budget
        {
            get
            {
                switch (tier)
                {
                    case QualityTier.Low: return Mathf.Max(1, lowBudget);
                    case QualityTier.High: return Mathf.Max(1, highBudget);
                    default: return Mathf.Max(1, mediumBudget);
                }
            }
        }

        public int BudgetFor(QualityTier level)
        {
            switch (level)
            {
                case QualityTier.Low: return Mathf.Max(1, lowBudget);
                case QualityTier.High: return Mathf.Max(1, highBudget);
                default: return Mathf.Max(1, mediumBudget);
            }
        }

        /// <summary>مدّة نبضة المحاكاة بالثواني.</summary>
        public float SimulationStep { get { return 1f / Mathf.Clamp(simulationHz, 20f, 30f); } }

        public float SimulationHz { get { return Mathf.Clamp(simulationHz, 20f, 30f); } }

        public float DistantStep { get { return 1f / Mathf.Max(0.5f, distantHz); } }

        public float DistantHz { get { return distantHz; } }

        public float DistantRange { get { return Mathf.Max(10f, distantRange); } }

        public bool PreWarmPools { get { return preWarmPools; } }

        public float PreWarmMargin { get { return Mathf.Max(1f, preWarmMargin); } }

        /// <summary>
        /// درجةٌ مقترحة من ذاكرة الجهاز وعدد نوى معالجه. اقتراحٌ لا حكم:
        /// اللاعب يبدّلها من الإعدادات، ولا تُفرض عليه بعد اختياره.
        /// </summary>
        public static QualityTier Suggest()
        {
            int memory = SystemInfo.systemMemorySize;      // بالميغابايت
            int cores = SystemInfo.processorCount;

            if (memory >= 6000 && cores >= 8)
            {
                return QualityTier.High;
            }

            if (memory >= 3000 && cores >= 4)
            {
                return QualityTier.Medium;
            }

            return QualityTier.Low;
        }
    }
}
