using UnityEngine;

namespace Dawnkeep.Boons
{
    /// <summary>
    /// بركة جولة (§15). **بيانٌ خالص**: ما تحرّكه، وكم، وما تشترطه لتُعرَض.
    /// لا سطر منطقٍ في البركة نفسها — تجميعها في `BoonBook`، وتطبيقُها في
    /// الأنظمة التي تقرؤها.
    /// </summary>
    [CreateAssetMenu(fileName = "Boon_", menuName = "مملكة الرماد/بركة جولة")]
    public class BoonDefinition : ScriptableObject
    {
        /// <summary>تحريكٌ واحد: مضاعفٌ على رقمٍ بعينه.</summary>
        [System.Serializable]
        public struct Change
        {
            [Tooltip("الرقم الذي يتحرّك.")]
            public BoonStat Stat;

            [Tooltip("المضاعف. 1.18 يعني +18%، و0.92 يعني −8%.")]
            public float Multiplier;
        }

        [Tooltip("مفتاح الاسم في جدول النصوص.")]
        [SerializeField] private string nameKey = string.Empty;

        [Tooltip("مفتاح الوصف — سطرٌ واحد يقول المكسب والثمن معاً.")]
        [SerializeField] private string summaryKey = string.Empty;

        [Tooltip("الاسم الحرفيّ احتياطاً ولقارئ المفتّش.")]
        [SerializeField] private string displayName = "بركة";

        [Tooltip("فئتها (§15). لا تُعرض ثلاث من فئة واحدة.")]
        [SerializeField] private BoonCategory category = BoonCategory.Hero;

        [Tooltip("ما تحرّكه من الأرقام. فارغاً فهي بركة سلوك.")]
        [SerializeField] private Change[] changes = new Change[0];

        [Tooltip("سلوكٌ تضيفه، إن كان لها سلوك.")]
        [SerializeField] private BoonFlag flag = BoonFlag.None;

        [Tooltip("لا تُعرض ما لم يملك اللاعب شيئاً من هذه الفئة من المباني.")]
        [SerializeField] private Building.BuildingRole requires = Building.BuildingRole.Economy;

        [Tooltip("هل تشترط ملكاً أصلاً؟ بركات البطل والجند لا تشترط.")]
        [SerializeField] private bool requiresBuilding;

        [Tooltip("تشترط منارة مضاءة (بركات النور التي لا معنى لها بلا نور).")]
        [SerializeField] private bool requiresBeacon;

        /// <summary>
        /// §15: «لا تعرض بركة لا تؤثّر في أي شيء يملكه اللاعب **إلا إذا كانت
        /// تفتح أسلوباً واضحاً قبل وقت كافٍ**». هذا هو ذلك الاستثناء.
        /// </summary>
        [Tooltip("تفتح أسلوباً: تُعرض ولو لم يملك اللاعب شرطها بعد.")]
        [SerializeField] private bool opensStyle;

        public string NameKey { get { return nameKey; } }

        public string SummaryKey { get { return summaryKey; } }

        public BoonCategory Category { get { return category; } }

        public Change[] Changes { get { return changes; } }

        public BoonFlag Flag { get { return flag; } }

        public Building.BuildingRole Requires { get { return requires; } }

        public bool RequiresBuilding { get { return requiresBuilding; } }

        public bool RequiresBeacon { get { return requiresBeacon; } }

        public bool OpensStyle { get { return opensStyle; } }

        /// <summary>الاسم المنطقيّ لا المشكَّل — الواجهة هي التي تشكّل.</summary>
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
