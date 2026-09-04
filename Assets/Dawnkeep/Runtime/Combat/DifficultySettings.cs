using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// أرقام درجات §14 — في أصل واحد لا في الكود (§1).
    ///
    /// §14 تختم بجملة حاكمة: «لا ترفع الصعوبة بالأرقام فقط؛ أضف تركيبات أعداء
    /// ومسارات مختلفة». فلكل درجة هنا **ثلاثة** أبواب لا باب واحد: الأرقام،
    /// وتركيب الموجة (سقف الميزانية وحصّة الصنف)، والجهات.
    /// </summary>
    [CreateAssetMenu(fileName = "DifficultySettings", menuName = "مملكة الرماد/درجات الصعوبة")]
    public class DifficultySettings : ScriptableObject
    {
        [System.Serializable]
        public struct Profile
        {
            [Tooltip("الدرجة التي يصفها هذا السطر.")]
            public Difficulty Level;

            [Tooltip("مفتاح اسمها في جدول النصوص.")]
            public string NameKey;

            [Tooltip("مضاعف صحّة المهاجمين.")]
            public float HealthScale;

            [Tooltip("مضاعف ضررهم.")]
            public float DamageScale;

            [Tooltip("معامل الصعوبة في ميزانية التهديد (§14).")]
            public float ThreatScale;

            [Tooltip("معاينة كاملة لتركيبة الموجة قبل بدئها.")]
            public bool FullPreview;

            [Tooltip("ليالٍ من جهة إضافية: كل كم ليلة؟ صفر يعني لا شيء.")]
            public int SecondFrontEvery;

            [Tooltip("مضاعف نصف قطر النور — الكابوس يضيّقه (§14).")]
            public float LightScale;

            [Tooltip("أثقل صنف مسموح في الموجة الواحدة، نسبةً من ميزانيّتها.")]
            [Range(0.2f, 1f)]
            public float ClassCeiling;
        }

        [SerializeField] private Profile[] profiles = new Profile[0];

        [Tooltip("الدرجة المختارة. تُبدَّل من قائمة الإيقاف (§7).")]
        [SerializeField] private Difficulty current = Difficulty.Normal;

        public Difficulty Current
        {
            get { return current; }
            set { current = value; }
        }

        public Profile[] Profiles { get { return profiles; } }

        /// <summary>
        /// سطر الدرجة الجارية. لا يعيد `default` أبداً: أصلٌ فارغ يعني أعداءً
        /// بصحّة صفر، وهو عطبٌ صامت أسوأ من رقم افتراضي معلوم.
        /// </summary>
        public Profile Active
        {
            get { return For(current); }
        }

        public Profile For(Difficulty level)
        {
            if (profiles != null)
            {
                for (int i = 0; i < profiles.Length; i++)
                {
                    if (profiles[i].Level == level)
                    {
                        return profiles[i];
                    }
                }
            }

            Profile fallback = new Profile();
            fallback.Level = level;
            fallback.HealthScale = 1f;
            fallback.DamageScale = 1f;
            fallback.ThreatScale = 1f;
            fallback.LightScale = 1f;
            fallback.ClassCeiling = 0.55f;
            fallback.FullPreview = false;
            fallback.SecondFrontEvery = 0;
            return fallback;
        }
    }
}
