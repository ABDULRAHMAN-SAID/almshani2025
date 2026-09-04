using UnityEngine;

namespace Dawnkeep.Localization
{
    /// <summary>لغات اللعبة. العربية أساسية والإنجليزية ثانية (§1).</summary>
    public enum Language
    {
        Arabic = 0,
        English = 1,
    }

    /// <summary>
    /// جدول النصوص: مفتاحٌ لكل سطر يظهر على الشاشة، ونصّه بكل لغة.
    ///
    /// **لا نصّ ثابت في الكود ولا في الجاهزات** — هذا نصّ §21. النصّ المكتوب
    /// في الكود لا يُترجَم ولا يُراجَع لغويّاً ولا يُبحَث عنه، وتغييرُ كلمةٍ فيه
    /// يمرّ بإعادة تجميع.
    ///
    /// أصلٌ لا ملفّ نصّي: المحرّر يُظهره في المفتش، ويتتبّع Unity تغييره، ولا
    /// يحتاج قارئاً ولا مسار تحميل.
    /// </summary>
    [CreateAssetMenu(fileName = "LocaleTable", menuName = "مملكة الرماد/جدول النصوص")]
    public class LocaleTable : ScriptableObject
    {
        [System.Serializable]
        public struct Entry
        {
            public string Key;

            [TextArea(1, 3)]
            public string Arabic;

            [TextArea(1, 3)]
            public string English;
        }

        [SerializeField] private Entry[] entries = new Entry[0];

        public Entry[] Entries { get { return entries; } }

        /// <summary>
        /// نصّ مفتاح بلغة. يعيد false إن لم يوجد المفتاح، أو وُجد بلا نصّ
        /// بتلك اللغة — والفارغ ليس ترجمةً بل ثغرة.
        /// </summary>
        public bool TryGet(string key, Language language, out string value)
        {
            value = null;
            if (entries == null || string.IsNullOrEmpty(key))
            {
                return false;
            }

            for (int i = 0; i < entries.Length; i++)
            {
                if (!string.Equals(entries[i].Key, key))
                {
                    continue;
                }

                string text = language == Language.English ? entries[i].English : entries[i].Arabic;
                if (string.IsNullOrEmpty(text))
                {
                    // ترجمة ناقصة: تُرَدّ العربية بدل فراغ على الشاشة
                    text = entries[i].Arabic;
                }

                if (string.IsNullOrEmpty(text))
                {
                    return false;
                }

                value = text;
                return true;
            }

            return false;
        }
    }
}
