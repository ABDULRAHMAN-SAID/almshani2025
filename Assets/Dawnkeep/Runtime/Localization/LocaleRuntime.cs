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

            // اللغة من ملفّ الحفظ إن وُجد (§27): مَن بدّلها مرّةً يجدها
            // مبدَّلةً في كل جولة. و`SaveService` يوقظ نفسه قبل هذا (‏−600
            // قبل ‏−500) فقيمتُه جاهزة.
            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save != null)
            {
                language = (Language)Mathf.Clamp(save.Data.Settings.Language, 0, 1);
            }

            Loc.Current = language;
        }

        /// <summary>يبدّل اللغة في وقت التشغيل — تُعيد اللوحات بناء نصوصها.</summary>
        public void SetLanguage(Language value)
        {
            language = value;
            Loc.Current = value;

            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save != null)
            {
                save.Data.Settings.Language = (int)value;
                save.Mark();
            }
        }
    }
}
