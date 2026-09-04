using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// جدول النصوص من جهة بناة الأصول: كل خطوة تسجّل صفوفها هي.
    ///
    /// **الضمّ لا الطمس**: تُضاف المفاتيح الناقصة وتُترك ترجمات المستخدم كما
    /// هي، وإلّا ضاع كل تحرير عند إعادة تشغيل أي خطوة.
    ///
    /// ولماذا لا يملك باني النصوص كل الصفوف: أسماء المباني والوحدات يعرفها
    /// بانيها هو. جمعُها في ملفّ ثالث يعني قائمتين تفترقان عند أوّل إضافة.
    /// </summary>
    public static class DawnkeepLocale
    {
        public const string TablePath = DawnkeepAssetPaths.Settings + "/LocaleTable.asset";

        /// <summary>يحمّل الجدول أو ينشئه.</summary>
        public static LocaleTable Ensure()
        {
            LocaleTable table = AssetDatabase.LoadAssetAtPath<LocaleTable>(TablePath);
            if (table != null)
            {
                return table;
            }

            DawnkeepAssetPaths.EnsureFolders();
            table = ScriptableObject.CreateInstance<LocaleTable>();
            AssetDatabase.CreateAsset(table, TablePath);
            return table;
        }

        public static LocaleTable.Entry Row(string key, string arabic, string english)
        {
            LocaleTable.Entry entry;
            entry.Key = key;
            entry.Arabic = arabic;
            entry.English = english;
            return entry;
        }

        /// <summary>يضمّ صفوفاً إلى الجدول. يعيد عدد ما أُضيف جديداً.</summary>
        public static int Add(IList<LocaleTable.Entry> rows)
        {
            LocaleTable table = Ensure();

            List<LocaleTable.Entry> merged = new List<LocaleTable.Entry>(rows.Count + 64);
            HashSet<string> present = new HashSet<string>();

            LocaleTable.Entry[] existing = table.Entries;
            if (existing != null)
            {
                for (int i = 0; i < existing.Length; i++)
                {
                    if (!string.IsNullOrEmpty(existing[i].Key) && present.Add(existing[i].Key))
                    {
                        merged.Add(existing[i]);
                    }
                }
            }

            int added = 0;
            for (int i = 0; i < rows.Count; i++)
            {
                if (present.Add(rows[i].Key))
                {
                    merged.Add(rows[i]);
                    added++;
                }
            }

            SetPrivate(table, "entries", merged.ToArray());
            EditorUtility.SetDirty(table);
            return added;
        }

        /// <summary>
        /// مفتاح محتوى من اسم أصله: «Unit_Spearman» ← «unit.spearman».
        /// اشتقاقه من الاسم لا كتابته يدوياً: مفتاحان لأصل واحد لا يفترقان.
        /// </summary>
        public static string ContentKey(string assetName)
        {
            int cut = assetName.IndexOf('_');
            string prefix = cut > 0 ? assetName.Substring(0, cut) : "content";
            string rest = cut > 0 ? assetName.Substring(cut + 1) : assetName;
            return prefix.ToLowerInvariant() + "." + rest.ToLowerInvariant();
        }

        private static void SetPrivate(object target, string field, object value)
        {
            if (target == null)
            {
                return;
            }

            FieldInfo info = target.GetType().GetField(field,
                BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);

            if (info == null)
            {
                Debug.LogWarning("مملكة الرماد: لا حقل باسم " + field + " في " + target.GetType().Name);
                return;
            }

            info.SetValue(target, value);
        }
    }
}
