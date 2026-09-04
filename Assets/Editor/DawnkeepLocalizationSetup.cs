using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Localization;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الحادية عشرة: جدول النصوص (§21).
    ///
    /// يبني أصل الجدول بكل مفاتيح الواجهة ونصوصها بالعربية والإنجليزية،
    /// ويوصله بالمشهد.
    ///
    /// **المفاتيح من `LocKeys` لا مكتوبة هنا حرفيّاً**: مفتاحٌ يُكتب مرّتين
    /// يفترق عند أوّل تعديل، وخطؤه لا يكسر التجميع بل يُظهر المفتاح على
    /// الشاشة. هكذا يكسره المترجم.
    ///
    /// **الجدول لا يُطمَس إن وُجد**: تُضاف المفاتيح الناقصة وتُترك ترجمات
    /// المستخدم كما هي — وإلّا ضاع كل تحرير عند إعادة تشغيل الخطوة.
    /// </summary>
    public static class DawnkeepLocalizationSetup
    {
        private const string TablePath = DawnkeepAssetPaths.Settings + "/LocaleTable.asset";

        [MenuItem("مملكة الرماد/11) جدول النصوص", false, 11)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();

            LocaleTable table = AssetDatabase.LoadAssetAtPath<LocaleTable>(TablePath);
            if (table == null)
            {
                table = ScriptableObject.CreateInstance<LocaleTable>();
                AssetDatabase.CreateAsset(table, TablePath);
            }

            LocaleTable.Entry[] defaults = Defaults();
            int added = Merge(table, defaults);

            EditorUtility.SetDirty(table);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(table);

            Debug.Log("مملكة الرماد: جدول النصوص جاهز — " + defaults.Length + " مفتاحاً"
                + (added > 0 ? "، أُضيف " + added + " جديداً." : "، بلا جديد."));
        }

        /// <summary>
        /// يضمّ المفاتيح الناقصة إلى الجدول القائم ويُبقي الموجود.
        /// يعيد عدد ما أُضيف.
        /// </summary>
        private static int Merge(LocaleTable table, LocaleTable.Entry[] defaults)
        {
            List<LocaleTable.Entry> merged = new List<LocaleTable.Entry>(defaults.Length);
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
            for (int i = 0; i < defaults.Length; i++)
            {
                if (present.Add(defaults[i].Key))
                {
                    merged.Add(defaults[i]);
                    added++;
                }
            }

            SetPrivate(table, "entries", merged.ToArray());
            return added;
        }

        private static LocaleTable.Entry Row(string key, string arabic, string english)
        {
            LocaleTable.Entry entry;
            entry.Key = key;
            entry.Arabic = arabic;
            entry.English = english;
            return entry;
        }

        private static LocaleTable.Entry[] Defaults()
        {
            return new[]
            {
                // لوحة الموجة
                Row(LocKeys.WaveCaption, "الموجة", "Wave"),
                Row(LocKeys.PhasePrepare, "استعداد", "Prepare"),
                Row(LocKeys.PhaseAssault, "هجوم", "Assault"),
                Row(LocKeys.PhaseRespite, "استراحة", "Respite"),
                Row(LocKeys.PhaseIdle, "سكون", "Idle"),
                Row(LocKeys.HastenButton, "ابدأ الآن", "Start now"),

                // لوحة الأعداد
                Row(LocKeys.DefendersCaption, "المدافعون", "Defenders"),
                Row(LocKeys.AttackersCaption, "المهاجمون", "Attackers"),

                // قلب الحصن والفضّة
                Row(LocKeys.KeepCaption, "قلب الحصن", "The Keep"),
                Row(LocKeys.KeepTier, "المستوى {0}", "Tier {0}"),
                Row(LocKeys.SilverCaption, "الفضّة", "Silver"),

                // النور
                Row(LocKeys.LightStockCaption, "شحنات النور", "Light charges"),
                Row(LocKeys.LightBeaconsCaption, "منارات مضيئة", "Beacons lit"),
                Row(LocKeys.LightHint,
                    "انقر منارةً لتنقل إليها شحنة نور، وانقرها ثانيةً لتستردّها",
                    "Tap a beacon to move a charge to it, tap again to take it back"),

                // البطل
                Row(LocKeys.HeroCaption, "البطل", "Champion"),

                // بطاقات البناء
                Row(LocKeys.BuildOnNode, "ابنِ على {0}", "Build on {0}"),
                Row(LocKeys.BuildUpgradeOrSell, "رقِّ أو بِع", "Upgrade or sell"),
                Row(LocKeys.BuildCost, "{0} فضّة", "{0} silver"),
                Row(LocKeys.BuildSell, "بِع", "Sell"),
                Row(LocKeys.BuildSellRefund, "+{0} فضّة", "+{0} silver"),
                Row(LocKeys.BuildSellSummary,
                    "يُهدم {0} ويُستردّ {1}٪ مِمّا دُفع فيه.",
                    "Demolishes {0} and refunds {1}% of what was paid."),
                Row(LocKeys.BuildSellStat, "العقدة تعود خالية", "The node is freed"),
                Row(LocKeys.BuildKeepTitle, "قلب الحصن", "The Keep"),
                Row(LocKeys.BuildKeepUpgrade, "رقِّ قلب الحصن", "Upgrade the Keep"),
                Row(LocKeys.BuildKeepSummary,
                    "المستوى {0} يفتح عقد بناء جديدة.",
                    "Tier {0} unlocks new build nodes."),
                Row(LocKeys.BuildStatIncome, "دخل الفجر {0}", "Dawn income {0}"),
                Row(LocKeys.BuildStatDps, "ضرر/ث {0}", "DPS {0}"),
                Row(LocKeys.BuildStatRange, "مدى {0}", "range {0}"),
                Row(LocKeys.BuildStatGuards, "{0} حرّاس", "{0} guards"),
                Row(LocKeys.BuildStatHealth, "صحّة {0}", "Health {0}"),

                // أنواع العقد
                Row(LocKeys.NodeInner, "عقدة داخلية", "an inner node"),
                Row(LocKeys.NodeGate, "عقدة البوّابة", "a gate node"),
                Row(LocKeys.NodeOuter, "عقدة خارجية", "an outer node"),
                Row(LocKeys.NodeEconomy, "عقدة اقتصاد", "an economy node"),
                Row(LocKeys.NodeBeacon, "عقدة منارة", "a beacon node"),

                // الأوامر
                Row(LocKeys.OrdersButton, "الأوامر", "Orders"),
                Row(LocKeys.OrderFollow, "اتبعني", "Follow me"),
                Row(LocKeys.OrderHold, "اثبت", "Hold"),
                Row(LocKeys.OrderDefend, "دافع", "Defend"),
                Row(LocKeys.OrderRetreat, "تراجع", "Retreat"),
                Row(LocKeys.OrderAckFollow, "{0} فرقةً تتبعك", "{0} squads following"),
                Row(LocKeys.OrderAckHold, "{0} فرقةً ثبتت", "{0} squads holding"),
                Row(LocKeys.OrderAckDefend, "{0} فرقةً تدافع", "{0} squads defending"),
                Row(LocKeys.OrderAckRetreat, "{0} فرقةً تتراجع", "{0} squads retreating"),
                Row(LocKeys.OrderNoSquad, "لا فرقة قريبة", "No squad nearby"),
                Row(LocKeys.OrderNoHero, "لا بطل في الساحة", "No champion in the field"),
            };
        }

        private static void WireScene(LocaleTable table)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            GameObject holder = GameObject.Find("Localization");
            if (holder == null)
            {
                holder = new GameObject("Localization");
            }

            LocaleRuntime runtime = holder.GetComponent<LocaleRuntime>();
            if (runtime == null)
            {
                runtime = holder.AddComponent<LocaleRuntime>();
            }

            SetPrivate(runtime, "table", table);

            EditorUtility.SetDirty(holder);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
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
