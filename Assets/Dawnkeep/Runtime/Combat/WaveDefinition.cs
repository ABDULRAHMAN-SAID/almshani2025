using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// موجة: من يأتي، وكم، ومتى. **كل الأرقام هنا لا في الكود** (§1).
    /// </summary>
    [CreateAssetMenu(fileName = "Wave_", menuName = "مملكة الرماد/تعريف موجة")]
    public class WaveDefinition : ScriptableObject
    {
        [System.Serializable]
        public struct Entry
        {
            [Tooltip("نوع الوحدة القادمة.")]
            public UnitDefinition Unit;

            [Tooltip("كم واحداً من هذا النوع.")]
            public int Count;

            [Tooltip("ثوانٍ بين واحد وآخر داخل هذه الدفعة.")]
            public float Spacing;

            [Tooltip("ثوانٍ تأخير قبل بدء هذه الدفعة من بداية الموجة.")]
            public float Delay;
        }

        [Tooltip("مفتاح العنوان في جدول النصوص. فارغاً يُستعمل `title` كما هو.")]
        [SerializeField] private string titleKey = string.Empty;

        [Tooltip("عنوان احتياطي إن لم يوجد مفتاح — ولقارئ الأصل في المفتش.")]
        [SerializeField] private string title = "موجة";

        [Tooltip("ثوانٍ استعداد قبل أن تبدأ الموجة.")]
        [SerializeField] private float prepareTime = 8f;

        [SerializeField] private Entry[] entries = new Entry[0];

        /// <summary>العنوان المنطقي — اللافتة هي التي تشكّله.</summary>
        public string Title
        {
            get
            {
                return string.IsNullOrEmpty(titleKey)
                    ? title
                    : Dawnkeep.Localization.Loc.Raw(titleKey);
            }
        }

        public float PrepareTime { get { return prepareTime; } }

        public Entry[] Entries { get { return entries; } }

        /// <summary>مجموع ما ستُخرجه هذه الموجة — لواجهة اللاعب ولشرط الفوز.</summary>
        public int TotalUnits
        {
            get
            {
                int total = 0;
                for (int i = 0; i < entries.Length; i++)
                {
                    total += Mathf.Max(0, entries[i].Count);
                }

                return total;
            }
        }
    }
}
