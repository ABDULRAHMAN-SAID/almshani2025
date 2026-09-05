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
        /// §21: «استخدم K وM **فقط بعد 10,000**». فما دونها يُكتب كاملاً —
        /// «٩٨٤٠» لا «٩٫٨ك»: اللاعب يوازن ثمناً برصيد، والتقريب في هذا
        /// المدى يخفي الفرق الذي يقرّر به.
        /// </summary>
        public const int ShortenAbove = 10000;

        /// <summary>
        /// يكتب عدداً **مختصراً** إن جاوز عشرة آلاف (§21): ٤٫٢ألف، ١٫٣مليون.
        /// وما دونها كاملاً. يعيد الطول المكتوب.
        ///
        /// والاختصار **يقصّ ولا يقرّب لأعلى**: «٩٫٩ألف» لرصيدٍ يبلغ ٩٩٩٩
        /// يجعل اللاعب يظنّ أنّه يملك عشرة آلاف فيُرفَض شراؤه بلا سبب ظاهر.
        /// </summary>
        public static int WriteShort(int value, char[] buffer, int start)
        {
            if (buffer == null || start >= buffer.Length)
            {
                return 0;
            }

            int magnitude = value < 0 ? -value : value;
            if (magnitude < ShortenAbove)
            {
                return Write(value, buffer, start);
            }

            int at = start;
            if (value < 0)
            {
                buffer[at++] = '-';
            }

            // مليونٌ فما فوق بالمليون، وما دونه بالألف
            bool millions = magnitude >= 1000000;
            int unit = millions ? 1000000 : 1000;

            int whole = magnitude / unit;
            int tenth = (magnitude % unit) * 10 / unit;      // قصٌّ لا تقريب

            at += Write(whole, buffer, at);

            if (tenth > 0 && at + 2 < buffer.Length)
            {
                buffer[at++] = Separator;
                buffer[at++] = (char)(Zero + tenth);
            }

            string suffix = millions ? "مليون" : "ألف";
            for (int i = 0; i < suffix.Length && at < buffer.Length; i++)
            {
                buffer[at++] = suffix[i];
            }

            return at - start;
        }

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
