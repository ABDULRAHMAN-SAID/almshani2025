using System.Text;

namespace Dawnkeep.UI
{
    /// <summary>
    /// تشكيل العربية للعرض: يحوّل النصّ المنطقي (كما يُكتب ويُخزَّن) إلى نصّ
    /// **بصري** جاهز للرسم — حروف موصولة بأشكالها الأربعة، وترتيب من اليمين
    /// إلى اليسار.
    ///
    /// **لماذا هذا الملفّ أصلاً**: TextMeshPro يرسم الحروف كما تصله، بلا وصل
    /// ولا ترتيب. فإن سلّمته «الموجة» رسم «ا ل م و ج ة» مفكّكة ومقلوبة. §1
    /// تشترط RTL حقيقية عبر RTLTMPro «أو حلًّا موثوقًا مكافئًا»؛ وهذا هو
    /// المكافئ: بلا حزمة خارجية، وبلا رخصة تتبعنا.
    ///
    /// ما ينفّذه:
    ///  1. **الوصل**: لكل حرف شكل مفرد/نهائي/ابتدائي/وسطي بحسب جاريه.
    ///  2. **لام-ألف**: الرباط الواجب (لا لأ لإ لآ) — كتابته حرفين خطأ إملائي.
    ///  3. **الترتيب البصري**: عكس مقاطع العربية، مع إبقاء الأرقام واللاتينية
    ///     على ترتيبها داخلها (الرقم ٢٥ يُقرأ من يساره في العربية أيضاً).
    ///
    /// ما لا ينفّذه: تموضع الحركات فوق حروفها (يحتاج GPOS، وTMP لا يطبّقه)،
    /// ولا الأرقام الفارسية. نصوص اللعبة بلا حركات فلا أثر لذلك.
    ///
    /// **الاستدعاء**: عند تغيّر النصّ لا في كل إطار — يبني سلسلة جديدة.
    /// </summary>
    public static class ArabicShaper
    {
        private const char FirstBase = '\u0621';      // ء
        private const char LastBase = '\u064A';       // ي

        private const char Lam = '\u0644';            // ل
        private const char AlefMadda = '\u0622';      // آ
        private const char AlefHamzaAbove = '\u0623'; // أ
        private const char AlefHamzaBelow = '\u0625'; // إ
        private const char Alef = '\u0627';           // ا

        private const int Isolated = 0;
        private const int Final = 1;
        private const int Initial = 2;
        private const int Medial = 3;

        /// <summary>
        /// أشكال العرض لكل حرف: مفرد، نهائي، ابتدائي، وسطي. صفر يعني «لا شكل».
        /// الحرف الذي لا ابتدائيَّ له لا يصل بما بعده (ا د ذ ر ز و ة ى والهمزات).
        /// </summary>
        private static readonly ushort[] Forms =
        {
            0xFE80, 0x0000, 0x0000, 0x0000,   // 0621 ء
            0xFE81, 0xFE82, 0x0000, 0x0000,   // 0622 آ
            0xFE83, 0xFE84, 0x0000, 0x0000,   // 0623 أ
            0xFE85, 0xFE86, 0x0000, 0x0000,   // 0624 ؤ
            0xFE87, 0xFE88, 0x0000, 0x0000,   // 0625 إ
            0xFE89, 0xFE8A, 0xFE8B, 0xFE8C,   // 0626 ئ
            0xFE8D, 0xFE8E, 0x0000, 0x0000,   // 0627 ا
            0xFE8F, 0xFE90, 0xFE91, 0xFE92,   // 0628 ب
            0xFE93, 0xFE94, 0x0000, 0x0000,   // 0629 ة
            0xFE95, 0xFE96, 0xFE97, 0xFE98,   // 062A ت
            0xFE99, 0xFE9A, 0xFE9B, 0xFE9C,   // 062B ث
            0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0,   // 062C ج
            0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4,   // 062D ح
            0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8,   // 062E خ
            0xFEA9, 0xFEAA, 0x0000, 0x0000,   // 062F د
            0xFEAB, 0xFEAC, 0x0000, 0x0000,   // 0630 ذ
            0xFEAD, 0xFEAE, 0x0000, 0x0000,   // 0631 ر
            0xFEAF, 0xFEB0, 0x0000, 0x0000,   // 0632 ز
            0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4,   // 0633 س
            0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8,   // 0634 ش
            0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC,   // 0635 ص
            0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0,   // 0636 ض
            0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4,   // 0637 ط
            0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8,   // 0638 ظ
            0xFEC9, 0xFECA, 0xFECB, 0xFECC,   // 0639 ع
            0xFECD, 0xFECE, 0xFECF, 0xFED0,   // 063A غ
            0x0000, 0x0000, 0x0000, 0x0000,   // 063B
            0x0000, 0x0000, 0x0000, 0x0000,   // 063C
            0x0000, 0x0000, 0x0000, 0x0000,   // 063D
            0x0000, 0x0000, 0x0000, 0x0000,   // 063E
            0x0000, 0x0000, 0x0000, 0x0000,   // 063F
            0x0640, 0x0640, 0x0640, 0x0640,   // 0640 ـ التطويل: يصل الجهتين
            0xFED1, 0xFED2, 0xFED3, 0xFED4,   // 0641 ف
            0xFED5, 0xFED6, 0xFED7, 0xFED8,   // 0642 ق
            0xFED9, 0xFEDA, 0xFEDB, 0xFEDC,   // 0643 ك
            0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0,   // 0644 ل
            0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4,   // 0645 م
            0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8,   // 0646 ن
            0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC,   // 0647 ه
            0xFEED, 0xFEEE, 0x0000, 0x0000,   // 0648 و
            0xFEEF, 0xFEF0, 0x0000, 0x0000,   // 0649 ى
            0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4,   // 064A ي
        };

        // مقاطع الاتّجاه — للترتيب البصري وحده
        private const int DirNeutral = 0;
        private const int DirRtl = 1;
        private const int DirLtr = 2;
        private const int DirDigit = 3;

        private static readonly StringBuilder Joined = new StringBuilder(128);
        private static readonly StringBuilder Visual = new StringBuilder(128);
        private static int[] _dir = new int[128];

        /// <summary>يحوّل نصّاً منطقيّاً إلى نصّ بصري جاهز لـTextMeshPro.</summary>
        public static string Shape(string logical)
        {
            if (string.IsNullOrEmpty(logical))
            {
                return logical;
            }

            if (!NeedsShaping(logical))
            {
                return logical;      // نصّ لاتيني خالص: لا وصل ولا عكس
            }

            Join(logical);
            return Reorder(Joined);
        }

        /// <summary>هل في النصّ حرف عربي أصلاً؟ إن لا، فلا شغل لنا به.</summary>
        public static bool NeedsShaping(string text)
        {
            for (int i = 0; i < text.Length; i++)
            {
                if (IsArabicLetter(text[i]))
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>المرحلة الأولى: اختيار شكل كل حرف وربط لام-ألف.</summary>
        private static void Join(string text)
        {
            Joined.Length = 0;

            // «يصل بما قبله»: هل للحرف السابق شكل ابتدائي، أي يمدّ يده لما بعده؟
            bool prevConnects = false;

            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];

                if (IsTransparent(c))
                {
                    // الحركات لا تكسر الوصل ولا تأخذ شكلاً: تُمرَّر كما هي
                    Joined.Append(c);
                    continue;
                }

                if (!IsShapeable(c))
                {
                    Joined.Append(c);
                    prevConnects = false;
                    continue;
                }

                int next = NextShapeable(text, i);
                char nextChar = next >= 0 ? text[next] : '\0';

                // لام-ألف: رباط واجب، لا خيار فيه
                if (c == Lam && IsAlef(nextChar))
                {
                    Joined.Append(LamAlef(nextChar, prevConnects));
                    i = next;                 // ابتُلعت الألف داخل الرباط
                    prevConnects = false;     // والألف لا تصل بما بعدها
                    continue;
                }

                bool nextConnects = ConnectsBack(nextChar);
                Joined.Append(SelectForm(c, prevConnects, nextConnects));
                prevConnects = HasForm(c, Initial);
            }
        }

        private static char SelectForm(char c, bool prevConnects, bool nextConnects)
        {
            if (prevConnects && nextConnects && HasForm(c, Medial))
            {
                return Form(c, Medial);
            }

            if (prevConnects && HasForm(c, Final))
            {
                return Form(c, Final);
            }

            if (nextConnects && HasForm(c, Initial))
            {
                return Form(c, Initial);
            }

            return Form(c, Isolated);
        }

        /// <summary>الرباط بشكله: نهائي إن سبقته حرف يصل، وإلّا مفرد.</summary>
        private static char LamAlef(char alef, bool prevConnects)
        {
            int pair;
            switch (alef)
            {
                case AlefMadda: pair = 0xFEF5; break;        // لآ
                case AlefHamzaAbove: pair = 0xFEF7; break;   // لأ
                case AlefHamzaBelow: pair = 0xFEF9; break;   // لإ
                default: pair = 0xFEFB; break;               // لا
            }

            return (char)(prevConnects ? pair + 1 : pair);
        }

        /// <summary>ألفٌ بأيّ من صورها الأربع — كلّها تُربط باللام.</summary>
        private static bool IsAlef(char c)
        {
            return c == Alef || c == AlefMadda || c == AlefHamzaAbove || c == AlefHamzaBelow;
        }

        /// <summary>موضع الحرف القابل للتشكيل التالي، متخطّياً الحركات.</summary>
        private static int NextShapeable(string text, int from)
        {
            for (int i = from + 1; i < text.Length; i++)
            {
                if (!IsTransparent(text[i]))
                {
                    return IsShapeable(text[i]) ? i : -1;
                }
            }

            return -1;
        }

        /// <summary>هل يقبل هذا الحرف الوصل بما قبله (له شكل نهائي)؟</summary>
        private static bool ConnectsBack(char c)
        {
            return IsShapeable(c) && HasForm(c, Final);
        }

        /// <summary>
        /// المرحلة الثانية: الترتيب البصري. النصّ المنطقي يُقرأ من اليمين،
        /// والرسم يمضي من اليسار — فتُعكس مقاطع العربية، وتبقى الأرقام
        /// واللاتينية على حالها داخل مقاطعها.
        /// </summary>
        private static string Reorder(StringBuilder text)
        {
            int n = text.Length;
            if (_dir.Length < n)
            {
                _dir = new int[System.Math.Max(n, _dir.Length * 2)];
            }

            for (int i = 0; i < n; i++)
            {
                _dir[i] = Classify(text[i]);
            }

            ResolveNeutrals(text, n);

            // بعد حسم المحايدات وحدها: الرقم يُكتب من يساره حتى داخل نصّ عربي،
            // فيُعامَل من هنا معاملة المقطع اللاتيني. لو قُلبت الأرقام لصار
            // «١٢ ثانية» اثنتين وعشرين. ولا يجوز تقديم هذا على حسم المحايدات:
            // الفراغ بين رقمين يتبع اليمين لا اليسار.
            for (int i = 0; i < n; i++)
            {
                if (_dir[i] == DirDigit)
                {
                    _dir[i] = DirLtr;
                }
            }

            Visual.Length = 0;

            // تُكتب المقاطع من آخر النصّ المنطقي إلى أوّله: هذا هو العكس نفسه
            int end = n;
            while (end > 0)
            {
                int dir = _dir[end - 1];
                int start = end - 1;
                while (start > 0 && _dir[start - 1] == dir)
                {
                    start--;
                }

                if (dir == DirLtr)
                {
                    for (int i = start; i < end; i++)
                    {
                        Visual.Append(text[i]);
                    }
                }
                else
                {
                    AppendReversed(text, start, end);
                }

                end = start;
            }

            return Visual.ToString();
        }

        /// <summary>
        /// عكس مقطع عربي **بالمقاطع الصوتية لا بالمحارف**: الحركة تتبع حرفها،
        /// فعكس المحارف واحداً واحداً يقذف الحركة قبل حرفها فتُرسم على سابقه.
        /// </summary>
        private static void AppendReversed(StringBuilder text, int start, int end)
        {
            int i = end;
            while (i > start)
            {
                int baseIndex = i - 1;
                while (baseIndex > start && IsTransparent(text[baseIndex]))
                {
                    baseIndex--;
                }

                for (int k = baseIndex; k < i; k++)
                {
                    Visual.Append(Mirror(text[k]));
                }

                i = baseIndex;
            }
        }

        /// <summary>
        /// المحايدات (الفراغ وعلامات الترقيم) تأخذ اتّجاه جارَيها إن اتّفقا،
        /// وإلّا اتّجاه النصّ نفسه — وهو هنا يمين إلى يسار.
        /// الأرقام تُحسب «قوّة يمينية» في هذا القرار وإن حُفظ ترتيبها الداخلي:
        /// «٢ ٣» يقرأها العربي كما يقرأ «٢» ثم «٣» عن اليمين.
        /// </summary>
        private static void ResolveNeutrals(StringBuilder text, int n)
        {
            for (int i = 0; i < n; i++)
            {
                if (_dir[i] != DirNeutral)
                {
                    continue;
                }

                int run = i;
                while (run < n && _dir[run] == DirNeutral)
                {
                    run++;
                }

                int before = i > 0 ? StrengthOf(i - 1) : DirRtl;
                int after = run < n ? StrengthOf(run) : DirRtl;
                int resolved = before == after ? before : DirRtl;

                for (int k = i; k < run; k++)
                {
                    _dir[k] = resolved;
                }

                i = run - 1;
            }
        }

        /// <summary>
        /// قوّة المحرف في حساب المحايدات. الرقم يتبع آخر قوّة قبله: رقم بعد
        /// كلمة لاتينية جزء منها، ورقم بعد كلمة عربية عددٌ عربي.
        /// </summary>
        private static int StrengthOf(int index)
        {
            int d = _dir[index];
            if (d != DirDigit)
            {
                return d;
            }

            for (int i = index - 1; i >= 0; i--)
            {
                if (_dir[i] == DirLtr)
                {
                    return DirLtr;
                }

                if (_dir[i] == DirRtl)
                {
                    return DirRtl;
                }
            }

            return DirRtl;
        }

        private static int Classify(char c)
        {
            if (IsArabicRange(c))
            {
                return IsArabicNumeric(c) ? DirDigit : DirRtl;
            }

            if (c >= '0' && c <= '9')
            {
                return DirDigit;
            }

            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z'))
            {
                return DirLtr;
            }

            if (c >= '\u05D0' && c <= '\u05EA')
            {
                return DirRtl;      // العبرية: يمينية أيضاً
            }

            if (char.IsLetter(c))
            {
                return DirLtr;
            }

            return DirNeutral;
        }

        /// <summary>الأقواس تنعكس مع مقطعها: قوس يفتح يميناً يُرسم بشكل الإغلاق.</summary>
        private static char Mirror(char c)
        {
            switch (c)
            {
                case '(': return ')';
                case ')': return '(';
                case '[': return ']';
                case ']': return '[';
                case '{': return '}';
                case '}': return '{';
                case '<': return '>';
                case '>': return '<';
                default: return c;
            }
        }

        private static bool IsArabicRange(char c)
        {
            return (c >= '\u0600' && c <= '\u06FF')     // العربية الأساسية
                || (c >= '\u0750' && c <= '\u077F')     // ملحقها
                || (c >= '\uFB50' && c <= '\uFDFF')     // أشكال العرض أ
                || (c >= '\uFE70' && c <= '\uFEFF');    // أشكال العرض ب
        }

        /// <summary>
        /// رقمٌ عربي أو علامة تُقرأ معه. فواصل العدد (٫ و٬) وعلامة النسبة (٪)
        /// جزء من العدد لا كلمةٌ بجانبه: عدّها حرفاً عربيّاً يشطر «٧٫٤» إلى
        /// رقمين حول فاصلة فيُعكسان، فيصير سبعةً وأربعة أربعةً وسبعة.
        /// </summary>
        private static bool IsArabicNumeric(char c)
        {
            return (c >= '\u0660' && c <= '\u066C')     // ٠..٩ ثم ٪ ٫ ٬
                || (c >= '\u06F0' && c <= '\u06F9');    // الصور الفارسية
        }

        private static bool IsArabicLetter(char c)
        {
            return IsArabicRange(c) && !IsArabicNumeric(c);
        }

        /// <summary>الحركات والعلامات: لا شكل لها ولا تكسر وصل ما حولها.</summary>
        private static bool IsTransparent(char c)
        {
            return (c >= '\u064B' && c <= '\u065F')     // الحركات والتنوين
                || c == '\u0670'                        // الألف الخنجرية
                || (c >= '\u06D6' && c <= '\u06ED')     // علامات الوقف
                || c == '\u200D';                       // الواصل بلا عرض
        }

        private static bool IsShapeable(char c)
        {
            return c >= FirstBase && c <= LastBase && Forms[(c - FirstBase) * 4] != 0;
        }

        private static bool HasForm(char c, int form)
        {
            return Forms[((c - FirstBase) * 4) + form] != 0;
        }

        private static char Form(char c, int form)
        {
            return (char)Forms[((c - FirstBase) * 4) + form];
        }
    }
}
