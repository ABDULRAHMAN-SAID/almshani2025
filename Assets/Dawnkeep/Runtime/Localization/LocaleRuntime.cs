using UnityEngine;

namespace Dawnkeep.Localization
{
    /// <summary>
    /// يوصل جدول النصوص بـ`Loc` عند الإقلاع.
    ///
    /// **‎-500‎ في ترتيب التنفيذ**: كل لوحات الواجهة تبني نصوصها في `Awake`،
    /// فلو أُوصل الجدول بعدها لبَنَت اللوحات نفسها على مفاتيح بلا نصّ وظهرت
    /// المفاتيح على الشاشة.
    /// </summary>
    [DefaultExecutionOrder(-500)]
    [DisallowMultipleComponent]
    public class LocaleRuntime : MonoBehaviour
    {
        [SerializeField] private LocaleTable table;

        [Tooltip("لغة البداية. العربية أساسية (§1).")]
        [SerializeField] private Language language = Language.Arabic;

        private void Awake()
        {
            Loc.Use(table);
            Loc.Current = language;
        }

        /// <summary>يبدّل اللغة في وقت التشغيل — تُعيد اللوحات بناء نصوصها.</summary>
        public void SetLanguage(Language value)
        {
            language = value;
            Loc.Current = value;
        }
    }
}
