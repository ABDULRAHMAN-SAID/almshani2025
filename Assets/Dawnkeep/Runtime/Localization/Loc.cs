using System.Collections.Generic;
using Dawnkeep.UI;
using UnityEngine;

namespace Dawnkeep.Localization
{
    /// <summary>
    /// مُحلّ النصوص: يعطي كل مفتاح نصّه **مشكّلاً جاهزاً للرسم**.
    ///
    /// التشكيل هنا لا عند كل مُستدعٍ: كان كل موضع في الواجهة ينادي
    /// `ArabicShaper.Shape` بنفسه، فمن ينسى تظهر عنده الحروف مفكّكة. المرور
    /// من هنا يجعل النسيان مستحيلاً.
    ///
    /// والنتيجة **مخزَّنة بالمفتاح**: النصّ الثابت يُشكَّل مرّة في العمر لا
    /// مرّة عند كل عرض. يُمسح المخزن عند تبديل اللغة أو الجدول.
    /// </summary>
    public static class Loc
    {
        private static readonly Dictionary<string, string> Shaped = new Dictionary<string, string>(64);
        private static readonly HashSet<string> Warned = new HashSet<string>();

        private static LocaleTable _table;
        private static Language _language = Language.Arabic;

        /// <summary>يُطلق عند تبديل اللغة أو الجدول — تعيد الواجهة بناء نصوصها.</summary>
        public static event System.Action Changed;

        public static Language Current
        {
            get { return _language; }
            set
            {
                if (_language == value)
                {
                    return;
                }

                _language = value;
                Invalidate();
            }
        }

        public static bool HasTable { get { return _table != null; } }

        public static void Use(LocaleTable table)
        {
            if (_table == table)
            {
                return;
            }

            _table = table;
            Invalidate();
        }

        /// <summary>
        /// نصّ مفتاح، مشكّلاً. مفتاحٌ بلا نصّ يظهر **بين قوسين مركّنين** لا
        /// فارغاً: نصٌّ غائب يجب أن يُرى في اللقطة الأولى لا أن يمرّ بياضاً.
        /// </summary>
        public static string Text(string key)
        {
            string cached;
            if (Shaped.TryGetValue(key, out cached))
            {
                return cached;
            }

            string raw;
            if (_table == null || !_table.TryGet(key, _language, out raw))
            {
                if (Warned.Add(key))
                {
                    Debug.LogWarning("مملكة الرماد: لا نصّ للمفتاح «" + key + "» في جدول النصوص.");
                }

                raw = "⟦" + key + "⟧";
            }

            cached = Shape(raw);
            Shaped[key] = cached;
            return cached;
        }

        /// <summary>
        /// نصّ مفتاح بعد إحلال `{0}` و`{1}`. **لا يُخزَّن**: قيمه تتغيّر.
        ///
        /// الإحلال قبل التشكيل لا بعده: الرقم جزء من مقطع النصّ، وتشكيلُ
        /// القالب ثمّ حشو الرقم فيه يضع الرقم في موضعه المنطقي لا البصري
        /// فيقفز إلى الطرف الخطأ من السطر.
        /// </summary>
        public static string Format(string key, string a0)
        {
            return Shape(Raw(key).Replace("{0}", a0));
        }

        public static string Format(string key, string a0, string a1)
        {
            return Shape(Raw(key).Replace("{0}", a0).Replace("{1}", a1));
        }

        /// <summary>النصّ المنطقي بلا تشكيل — لمن يركّب سلسلة قبل رسمها.</summary>
        public static string Raw(string key)
        {
            string raw;
            if (_table != null && _table.TryGet(key, _language, out raw))
            {
                return raw;
            }

            if (Warned.Add(key))
            {
                Debug.LogWarning("مملكة الرماد: لا نصّ للمفتاح «" + key + "» في جدول النصوص.");
            }

            return "⟦" + key + "⟧";
        }

        /// <summary>يشكّل نصّاً منطقيّاً بحسب اللغة الحالية.</summary>
        public static string Shape(string logical)
        {
            // الإنجليزية لا تُشكَّل ولا تُعكس: `ArabicShaper` يمرّرها كما هي،
            // لكنّ تخطّي النداء أصرح وأرخص.
            return _language == Language.English ? logical : ArabicShaper.Shape(logical);
        }

        private static void Invalidate()
        {
            Shaped.Clear();
            Warned.Clear();

            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }
    }
}
