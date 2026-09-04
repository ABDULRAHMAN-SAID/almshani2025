namespace Dawnkeep.UI
{
    /// <summary>
    /// كتابة الأعداد بالأرقام العربية الهندية (٠١٢٣٤٥٦٧٨٩) في مخزن محارف
    /// جاهز، **بلا تخصيص ذاكرة**.
    ///
    /// لماذا لا `value.ToString()`: يبني سلسلة جديدة في كل مرّة، وعدّاد صحّة
    /// يتغيّر عشرات المرّات في الثانية يعني قمامة مستمرّة. TextMeshPro يقبل
    /// `SetCharArray` فيقرأ من المخزن مباشرةً.
    /// </summary>
    public static class ArabicNumber
    {
        private const char Zero = '\u0660';       // ٠
        private const char Separator = '\u066B';  // الفاصلة العشرية العربية ٫

        /// <summary>أكبر عدد محارف قد تكتبه أيّ من الدوالّ هنا.</summary>
        public const int MaxLength = 24;

        /// <summary>
        /// يكتب عدداً صحيحاً في المخزن ابتداءً من `start`، ويعيد الطول المكتوب.
        /// السالب يُكتب بإشارة ناقص قبله.
        /// </summary>
        public static int Write(int value, char[] buffer, int start)
        {
            if (buffer == null || start >= buffer.Length)
            {
                return 0;
            }

            int at = start;
            if (value < 0)
            {
                buffer[at++] = '-';
                value = -value;
            }

            if (value == 0)
            {
                buffer[at++] = Zero;
                return at - start;
            }

            // تُكتب الخانات معكوسة ثم تُقلب: القسمة تعطي الآحاد أوّلاً
            int digitsAt = at;
            while (value > 0 && at < buffer.Length)
            {
                buffer[at++] = (char)(Zero + (value % 10));
                value /= 10;
            }

            for (int i = digitsAt, j = at - 1; i < j; i++, j--)
            {
                char swap = buffer[i];
                buffer[i] = buffer[j];
                buffer[j] = swap;
            }

            return at - start;
        }

        /// <summary>يكتب «أ / ب» — الشكل المعتاد لعدّاد الصحّة والموجات.</summary>
        public static int WritePair(int left, int right, char[] buffer)
        {
            int at = Write(left, buffer, 0);
            if (at + 3 >= buffer.Length)
            {
                return at;
            }

            buffer[at++] = ' ';
            buffer[at++] = '/';
            buffer[at++] = ' ';
            at += Write(right, buffer, at);
            return at;
        }

        /// <summary>
        /// يكتب ثوانيَ بخانة عشرية واحدة — عدّاد تنازلي يقرأه اللاعب بلمحة.
        /// </summary>
        public static int WriteSeconds(float seconds, char[] buffer)
        {
            if (seconds < 0f)
            {
                seconds = 0f;
            }

            int tenths = (int)((seconds * 10f) + 0.5f);
            int whole = tenths / 10;
            int fraction = tenths % 10;

            int at = Write(whole, buffer, 0);
            if (at + 2 >= buffer.Length)
            {
                return at;
            }

            buffer[at++] = Separator;
            buffer[at++] = (char)(Zero + fraction);
            return at;
        }
    }
}
