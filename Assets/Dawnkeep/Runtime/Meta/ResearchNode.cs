using UnityEngine;
using Dawnkeep.Boons;

namespace Dawnkeep.Meta
{
    /// <summary>
    /// عقدة بحث (§16): مراتبُ تُشترى بالذهب ونجوم البحث، وكلُّ مرتبة تحرّك
    /// رقماً بمقدارٍ صغير.
    ///
    /// **تستعمل `BoonStat` نفسه** لا مفرداتٍ ثانية. فما تحرّكه الأبحاث هو ما
    /// تحرّكه البركات، ووصفُه بمفردتين يعني نظامَي تعديلٍ في كل موضع قراءة —
    /// وسهواً في أحدهما لا يظهر في الآخر.
    /// </summary>
    [CreateAssetMenu(fileName = "Research_", menuName = "مملكة الرماد/عقدة بحث")]
    public class ResearchNode : ScriptableObject
    {
        [Tooltip("مفتاح الاسم في جدول النصوص.")]
        [SerializeField] private string nameKey = string.Empty;

        [Tooltip("مفتاح الوصف.")]
        [SerializeField] private string summaryKey = string.Empty;

        [Tooltip("الاسم الحرفيّ احتياطاً ولقارئ المفتّش.")]
        [SerializeField] private string displayName = "بحث";

        [Tooltip("فرعها من الأربعة (§16).")]
        [SerializeField] private ResearchBranch branch = ResearchBranch.Economy;

        [Tooltip("الرقم الذي تحرّكه كل مرتبة.")]
        [SerializeField] private BoonStat stat = BoonStat.None;

        [Tooltip("ما تضيفه المرتبة الواحدة. 0.05 يعني +5% لكل مرتبة.")]
        [SerializeField] private float perRank = 0.05f;

        [Tooltip("كم مرتبة (§16: خمس مراتب، ثلاث، واحدة…).")]
        [Range(1, 8)]
        [SerializeField] private int ranks = 5;

        [Tooltip("ذهب المرتبة الأولى. وما بعدها يزيد بالمعامل أدناه.")]
        [SerializeField] private int goldFirstRank = 120;

        [Tooltip("معامل تصاعد ثمن المرتبة.")]
        [SerializeField] private float goldGrowth = 1.55f;

        [Tooltip("نجوم بحثٍ لكل مرتبة (§16: كل عقدة تحتاج ذهباً ونجمة).")]
        [SerializeField] private int starsPerRank = 1;

        [Tooltip("شحنات نورٍ إضافية لكل مرتبة. رقمٌ صحيح لا مضاعف (§16).")]
        [SerializeField] private int extraLightCharges;

        [Tooltip("أقلّ مستوى حسابٍ تُفتح عنده هذه العقدة.")]
        [SerializeField] private int unlockLevel = 1;

        public ResearchBranch Branch { get { return branch; } }

        public BoonStat Stat { get { return stat; } }

        public float PerRank { get { return perRank; } }

        public int Ranks { get { return Mathf.Max(1, ranks); } }

        public int StarsPerRank { get { return Mathf.Max(0, starsPerRank); } }

        /// <summary>
        /// شحنة النور تُعَدّ ولا تُضرَب: نصفُ شحنةٍ لا معنى له، ومضاعفٌ على
        /// عددٍ صحيحٍ صغير يقرّب إلى الصفر أو إلى واحد بلا تدرّج.
        /// </summary>
        public int ExtraLightCharges { get { return Mathf.Max(0, extraLightCharges); } }

        public int UnlockLevel { get { return Mathf.Max(1, unlockLevel); } }

        public string Key { get { return name; } }

        /// <summary>ذهب المرتبة رقم `rank` (من صفر).</summary>
        public int GoldFor(int rank)
        {
            return Mathf.Max(1, Mathf.RoundToInt(
                goldFirstRank * Mathf.Pow(Mathf.Max(1f, goldGrowth), Mathf.Max(0, rank))));
        }

        /// <summary>
        /// المضاعف عند مرتبةٍ بعينها. **جمعٌ ثمّ ضربٌ واحد**: خمس مراتبَ
        /// بـ5% تعني 1.25 لا 1.276 — §16 تقول «+5% خمس مراتب»، وسقفها 30%
        /// يُقاس على هذا الفهم لا على التركيب الأسّي.
        /// </summary>
        public float MultiplierAt(int rank)
        {
            return 1f + (perRank * Mathf.Clamp(rank, 0, Ranks));
        }

        public string DisplayName
        {
            get
            {
                return string.IsNullOrEmpty(nameKey)
                    ? displayName
                    : Dawnkeep.Localization.Loc.Raw(nameKey);
            }
        }

        public string Summary
        {
            get
            {
                return string.IsNullOrEmpty(summaryKey)
                    ? string.Empty
                    : Dawnkeep.Localization.Loc.Raw(summaryKey);
            }
        }
    }
}
