namespace Dawnkeep.Save
{
    /// <summary>
    /// صيغة ملفّ الحفظ ورقمها (§27).
    ///
    /// الرقم يُرفع عند **كل تغييرٍ يكسر القراءة** — لا عند كل إضافة. إضافةُ
    /// حقلٍ جديد لا تكسر شيئاً: `JsonUtility` يتركه بقيمته الافتراضية.
    /// والذي يكسر: حذف حقلٍ يُقرأ، أو تغيير معناه، أو تغيير نوعه.
    /// </summary>
    public static class SaveFormat
    {
        /// <summary>
        /// الصيغة الجارية.
        ///
        /// **٢**: دُمجت نجوم البحث (§16) وجوهر الترقية (§17) في «شظايا
        /// الفجر» لتصير العملات ثلاثاً كما تشترط §21. وهذا **يكسر القراءة**
        /// — حقلان يُقرآن ولا يُكتبان — فرُفع الرقم، وخطوةُ الترحيل تجمعهما.
        /// </summary>
        public const int Current = 2;

        /// <summary>أقدم صيغةٍ يعرف هذا البناء ترحيلها.</summary>
        public const int Oldest = 1;

        /// <summary>اسم الملفّ ونسخه — في مكان واحد لا في كل مستدعٍ.</summary>
        public const string FileName = "dawnkeep.save";

        public const string TempName = "dawnkeep.save.tmp";

        public const string BackupOne = "dawnkeep.save.bak1";

        public const string BackupTwo = "dawnkeep.save.bak2";

        /// <summary>
        /// بصمة FNV-1a بأربع وستّين بتاً. ليست تعميةً ولا تدّعيها: هي كشفُ
        /// **عطبٍ** لا كشفُ عبث — قرصٌ ينقطع في منتصف الكتابة يترك ملفّاً
        /// يُقرأ نصفُه، وهذا ما تكشفه.
        ///
        /// وخوارزميّة بسيطة مكتوبة هنا لا مكتبة: `System.Security.Cryptography`
        /// تُثقل بناء الجوّال بما لا يُستعمل، والغرض عطبٌ لا أمن.
        /// </summary>
        public static string Checksum(string text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return "0000000000000000";
            }

            ulong hash = 14695981039346656037UL;
            for (int i = 0; i < text.Length; i++)
            {
                // على وحدات UTF-16 لا البايتات: النصّ عربيّ، وقصرُه إلى بايت
                // يجعل حرفين مختلفين يعطيان البصمة نفسها.
                char c = text[i];
                hash ^= (byte)(c & 0xFF);
                hash *= 1099511628211UL;
                hash ^= (byte)((c >> 8) & 0xFF);
                hash *= 1099511628211UL;
            }

            return hash.ToString("x16");
        }
    }
}
