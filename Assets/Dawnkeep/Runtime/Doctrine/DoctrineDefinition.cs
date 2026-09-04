using UnityEngine;

namespace Dawnkeep.Doctrine
{
    /// <summary>
    /// بطاقة عقيدة (§18). **بيانٌ خالص** كالبركة والقطعة: ما تحرّكه، وما
    /// تفعله عند البداية، وبأيّ إنجازٍ تُفتح.
    ///
    /// و§18 صريحة في قيدين: «تُفتح بالإنجازات والحملة، **لا بالسحب
    /// العشوائي**»، و«لا تُرفع إلى مستويات كثيرة؛ لكل بطاقة مستوى واحد
    /// أساسي **وترقية واحدة فقط**». فالمستوى هنا اثنان لا خمسون.
    /// </summary>
    [CreateAssetMenu(fileName = "Doctrine_", menuName = "مملكة الرماد/بطاقة عقيدة")]
    public class DoctrineDefinition : ScriptableObject
    {
        [Tooltip("مفتاح الاسم في جدول النصوص.")]
        [SerializeField] private string nameKey = string.Empty;

        [Tooltip("مفتاح الوصف: المكسب والثمن في سطر واحد.")]
        [SerializeField] private string summaryKey = string.Empty;

        [Tooltip("الاسم الحرفيّ احتياطاً ولقارئ المفتّش.")]
        [SerializeField] private string displayName = "عقيدة";

        [Tooltip("ما تحرّكه من الأرقام، بمستواها الأوّل.")]
        [SerializeField] private Dawnkeep.Boons.BoonDefinition.Change[] changes =
            new Dawnkeep.Boons.BoonDefinition.Change[0];

        [Tooltip("فعلٌ يقع عند بداية المرحلة، إن كان لها فعل.")]
        [SerializeField] private DoctrineOpening opening = DoctrineOpening.None;

        [Tooltip("مقدار الفعل: كم فضّةً، أو كم حارساً…")]
        [SerializeField] private int openingAmount;

        [Header("الفتح بالإنجاز (§18: لا بالسحب العشوائي)")]
        [Tooltip("الشرط الذي يفتحها.")]
        [SerializeField] private DoctrineUnlock unlock = DoctrineUnlock.FromStart;

        [Tooltip("عتبة الشرط: مستوىً، أو عدد انتصارات، أو ليلة.")]
        [SerializeField] private int unlockAt;

        [Tooltip("عتبة الترقية — الشرط نفسه أشدّ. **ترقيةٌ واحدة** لا أكثر (§18).")]
        [SerializeField] private int upgradeAt;

        /// <summary>
        /// كم تكبر أرقام البطاقة بالترقية. **الترقية واحدة**، فرقمٌ واحد
        /// يكفي — ولا صيغةَ مستوىً كما في العتاد (§17)، فذاك خمسون مستوىً
        /// وهذه اثنان.
        /// </summary>
        public const float UpgradeGain = 0.5f;

        public string NameKey { get { return nameKey; } }

        public string SummaryKey { get { return summaryKey; } }

        public Dawnkeep.Boons.BoonDefinition.Change[] Changes { get { return changes; } }

        public DoctrineOpening Opening { get { return opening; } }

        public DoctrineUnlock Unlock { get { return unlock; } }

        public int UnlockAt { get { return unlockAt; } }

        public int UpgradeAt { get { return upgradeAt; } }

        /// <summary>مقدار الفعل الافتتاحيّ عند مستوىً بعينه.</summary>
        public int AmountAt(int level)
        {
            if (level <= 1)
            {
                return openingAmount;
            }

            return Mathf.RoundToInt(openingAmount * (1f + UpgradeGain));
        }

        /// <summary>
        /// مضاعف رقمٍ بعينه عند مستوىً. الترقية تكبّر **الفائض فوق الواحد**
        /// بالنصف — القاعدة نفسها التي يسير عليها العتاد، فالمقايضة تكبر
        /// مع المكسب ولا تنقلب البطاقة كلَّ مكسبٍ عند ترقيتها.
        /// </summary>
        public float MultiplierAt(Dawnkeep.Boons.BoonStat stat, int level)
        {
            float grown = 1f;
            float factor = level <= 1 ? 1f : 1f + UpgradeGain;

            for (int i = 0; i < changes.Length; i++)
            {
                if (changes[i].Stat != stat)
                {
                    continue;
                }

                grown *= 1f + (changes[i].Multiplier - 1f) * factor;
            }

            return grown;
        }

        /// <summary>الاسم المنطقيّ لا المشكَّل — الواجهة هي التي تشكّل.</summary>
        public string DisplayName
        {
            get
            {
                if (!string.IsNullOrEmpty(nameKey))
                {
                    string text = Dawnkeep.Localization.Loc.Text(nameKey);
                    if (!string.IsNullOrEmpty(text))
                    {
                        return text;
                    }
                }

                return displayName;
            }
        }
    }
}
