using System.IO;
using System.Text;
using Dawnkeep.Save;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// اختبار نظام الحفظ (§27: «اختبر انقطاع الكتابة وملفًا تالفًا ونسخة
    /// قديمة»).
    ///
    /// **يُشغَّل فعلاً** ولا يُقرأ: يكتب في مجلّد مؤقّت، ويعطب الملفّات عمداً،
    /// ويقرأ، ثمّ ينظّف. وهو الفرق بين «الآليّة موجودة» و«الآليّة تعمل».
    ///
    /// وفي مجلّد مؤقّت لا في مجلّد اللاعب: اختبارٌ يمحو حفظ من يشغّله ليس
    /// اختباراً.
    /// </summary>
    public static class DawnkeepSaveCheck
    {
        private static int _passed;
        private static int _failed;

        [MenuItem("مملكة الرماد/16) اختبار نظام الحفظ", false, 16)]
        public static void Run()
        {
            string sandbox = Path.Combine(Path.GetTempPath(),
                "dawnkeep_savecheck_" + System.DateTime.UtcNow.Ticks);

            string previous = SaveFile.Folder;
            _passed = 0;
            _failed = 0;

            StringBuilder report = new StringBuilder();
            report.AppendLine("── اختبار الحفظ (§27) ──");

            try
            {
                SaveFile.Folder = sandbox;
                Directory.CreateDirectory(sandbox);

                RoundTrip(report);
                Rotation(report);
                InterruptedWrite(report);
                CorruptPrimary(report);
                CorruptPrimaryAndFirst(report);
                CorruptAll(report);
                OlderVersion(report);
                FutureVersion(report);
                MissingBlocks(report);
            }
            finally
            {
                SaveFile.Folder = previous;
                if (Directory.Exists(sandbox))
                {
                    Directory.Delete(sandbox, true);
                }
            }

            report.AppendLine();
            report.AppendLine(_failed == 0
                ? "كل الاختبارات مرّت (" + _passed + ")"
                : _failed + " اختباراً سقط من " + (_passed + _failed));

            if (_failed == 0)
            {
                Debug.Log(report.ToString());
            }
            else
            {
                Debug.LogError(report.ToString());
            }
        }

        // ── الاختبارات ──────────────────────────────────────────────────────

        /// <summary>يُكتب ويُقرأ فيعود كما هو.</summary>
        private static void RoundTrip(StringBuilder report)
        {
            SaveFile.Wipe();

            SaveData data = Sample(4200, 7);
            bool written = SaveFile.Write(data);

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            Check(report, "الكتابة والقراءة تعيدان ما كُتب",
                written && read != null
                && read.Profile.AccountXp == 4200
                && read.Campaign.FurthestWave == 7
                && read.Research.RankOf("Research_RichHomes") == 3
                && source == SaveSource.Primary,
                read == null ? "لم يُقرأ شيء" : "الخبرة " + read.Profile.AccountXp);
        }

        /// <summary>ثلاث كتباتٍ تتركان نسختين مختلفتين عن الأصل.</summary>
        private static void Rotation(StringBuilder report)
        {
            SaveFile.Wipe();

            SaveFile.Write(Sample(100, 1));
            SaveFile.Write(Sample(200, 2));
            SaveFile.Write(Sample(300, 3));

            SaveData first = SaveFile.TryRead(SaveFile.PathOf(SaveFormat.BackupOne));
            SaveData second = SaveFile.TryRead(SaveFile.PathOf(SaveFormat.BackupTwo));
            SaveData primary = SaveFile.TryRead(SaveFile.PathOf(SaveFormat.FileName));

            Check(report, "النسختان تدوران: الأصل 300 والأولى 200 والثانية 100",
                primary != null && first != null && second != null
                && primary.Profile.AccountXp == 300
                && first.Profile.AccountXp == 200
                && second.Profile.AccountXp == 100,
                Trio(primary, first, second));
        }

        /// <summary>
        /// انقطاع الكتابة: مؤقّتٌ نصفُ مكتوب والأصل سليم. المحاكاة بكتابة
        /// مؤقّتٍ تالف يدوياً — وهو بالضبط ما يتركه انقطاع التيّار.
        /// </summary>
        private static void InterruptedWrite(StringBuilder report)
        {
            SaveFile.Wipe();
            SaveFile.Write(Sample(900, 9));

            File.WriteAllText(SaveFile.PathOf(SaveFormat.TempName), "{\"Version\":1,\"Chec");

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            Check(report, "انقطاع الكتابة لا يمسّ الأصل",
                read != null && read.Profile.AccountXp == 900 && source == SaveSource.Primary,
                read == null ? "لم يُقرأ شيء" : "الخبرة " + read.Profile.AccountXp);
        }

        /// <summary>ملفٌّ تالف: تُقرأ النسخة الأولى.</summary>
        private static void CorruptPrimary(StringBuilder report)
        {
            SaveFile.Wipe();
            SaveFile.Write(Sample(100, 1));
            SaveFile.Write(Sample(200, 2));

            Corrupt(SaveFormat.FileName);

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            Check(report, "الأصل تالف فتُقرأ النسخة الأولى",
                read != null && read.Profile.AccountXp == 100 && source == SaveSource.BackupOne,
                read == null ? "لم يُقرأ شيء" : "الخبرة " + read.Profile.AccountXp
                    + " من " + source);
        }

        private static void CorruptPrimaryAndFirst(StringBuilder report)
        {
            SaveFile.Wipe();
            SaveFile.Write(Sample(100, 1));
            SaveFile.Write(Sample(200, 2));
            SaveFile.Write(Sample(300, 3));

            Corrupt(SaveFormat.FileName);
            Corrupt(SaveFormat.BackupOne);

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            Check(report, "الأصل والأولى تالفان فتُقرأ الثانية",
                read != null && read.Profile.AccountXp == 100 && source == SaveSource.BackupTwo,
                read == null ? "لم يُقرأ شيء" : "الخبرة " + read.Profile.AccountXp
                    + " من " + source);
        }

        /// <summary>كلّها تالفة: لاعبٌ جديد، ولا رمي.</summary>
        private static void CorruptAll(StringBuilder report)
        {
            SaveFile.Wipe();
            SaveFile.Write(Sample(100, 1));
            SaveFile.Write(Sample(200, 2));
            SaveFile.Write(Sample(300, 3));

            Corrupt(SaveFormat.FileName);
            Corrupt(SaveFormat.BackupOne);
            Corrupt(SaveFormat.BackupTwo);

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            Check(report, "كلّها تالفة فيبدأ لاعبٌ جديد بلا رمي",
                read == null && source == SaveSource.None,
                read == null ? "null كما يجب" : "قُرئ شيء!");
        }

        /// <summary>
        /// نسخة قديمة: تُرحَّل إلى الصيغة الجارية. واليوم الصيغة واحدة، فأقدم
        /// ما يُقبل هو نفسها — والاختبار يثبت أنّ **الآليّة تعمل**: ملفٌّ
        /// بصيغة `Oldest` يُقرأ ويعود بصيغة `Current`.
        /// </summary>
        private static void OlderVersion(StringBuilder report)
        {
            SaveFile.Wipe();

            SaveData data = Sample(555, 5);
            data.SaveVersion = SaveFormat.Oldest;

            // رصيدٌ بالعملتين القديمتين: نجومُ بحثٍ وجوهرُ ترقية (§16 و§17
            // قبل دمج §21). الترحيل يجب أن **يجمعهما** لا يأخذ الأكبر.
            data.Currencies.ResearchStars = 20;
            data.Currencies.Essence = 40;
            data.Currencies.DawnShards = 0;

            WriteRaw(SaveFormat.FileName, SaveFormat.Oldest, JsonUtility.ToJson(data));

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            Check(report, "الصيغة الأقدم تُرحَّل إلى الجارية",
                read != null && read.SaveVersion == SaveFormat.Current
                && read.Profile.AccountXp == 555,
                read == null ? "لم يُقرأ" : "الصيغة " + read.SaveVersion);

            Check(report, "ونجومُ البحث وجوهرُ الترقية يصيران شظايا (§21)",
                read != null && read.Currencies.DawnShards == 60,
                read == null ? "لم يُقرأ"
                    : read.Currencies.DawnShards + " شظيّة (المنتظر ٦٠)");

            Check(report, "والمهجورتان تُصفَّران فلا تُجمعان مرّتين",
                read != null && read.Currencies.ResearchStars == 0
                && read.Currencies.Essence == 0,
                read == null ? "لم يُقرأ"
                    : read.Currencies.ResearchStars + " و" + read.Currencies.Essence);
        }

        /// <summary>
        /// نسخة من مستقبل: **لا تُقرأ ولا تُمحى**. قراءتُها بجهلٍ تُفقد تقدّماً
        /// كُتب بإصدارٍ أحدث.
        /// </summary>
        private static void FutureVersion(StringBuilder report)
        {
            SaveFile.Wipe();

            SaveData data = Sample(777, 7);
            WriteRaw(SaveFormat.FileName, SaveFormat.Current + 5, JsonUtility.ToJson(data));

            SaveSource source;
            SaveData read = SaveFile.Read(out source);
            bool stillThere = File.Exists(SaveFile.PathOf(SaveFormat.FileName));

            Check(report, "صيغة من مستقبل تُرفض ولا تُمحى",
                read == null && stillThere,
                (read == null ? "رُفضت" : "قُرئت!") + (stillThere ? " والملفّ باقٍ" : " ومُحي!"));
        }

        /// <summary>
        /// ملفٌّ ينقصه كتلة: يُصلَح ولا يرمي. هذا ما يحدث حين يقرأ إصدارٌ
        /// جديد ملفّاً كتبه إصدارٌ لم تكن فيه الكتلة.
        /// </summary>
        private static void MissingBlocks(StringBuilder report)
        {
            SaveFile.Wipe();

            string payload = "{\"SaveVersion\":" + SaveFormat.Current
                + ",\"Profile\":{\"AccountXp\":42}}";
            WriteRaw(SaveFormat.FileName, SaveFormat.Current, payload);

            SaveSource source;
            SaveData read = SaveFile.Read(out source);

            bool safe = read != null
                && read.Research != null && read.Research.Keys != null
                && read.Currencies != null && read.Quests != null
                && read.Purchases != null && read.Equipment != null
                && read.Profile.AccountXp == 42;

            Check(report, "ملفٌّ تنقصه كتل يُصلَح ولا يرمي", safe,
                read == null ? "لم يُقرأ" : "الخبرة " + read.Profile.AccountXp);
        }

        // ── أدوات ───────────────────────────────────────────────────────────

        private static SaveData Sample(int xp, int wave)
        {
            SaveData data = new SaveData();
            data.Profile.AccountXp = xp;
            data.Profile.DeviceId = "test";
            data.Campaign.FurthestWave = wave;
            data.Currencies.Gold = xp / 2;
            data.Research.SetRank("Research_RichHomes", 3);
            data.Quests.Active.Add("quest.first");
            return data;
        }

        /// <summary>يكتب غلافاً بصيغةٍ وبصمةٍ صحيحة — لاختبار الترحيل.</summary>
        private static void WriteRaw(string name, int version, string payload)
        {
            string json = "{\"Version\":" + version
                + ",\"Checksum\":\"" + SaveFormat.Checksum(payload) + "\""
                + ",\"Payload\":" + Quote(payload) + "}";

            File.WriteAllText(SaveFile.PathOf(name), json);
        }

        /// <summary>
        /// يقتبس نصّاً بصيغة JSON. مكتوبة هنا لا مأخوذة من `JsonUtility`:
        /// هذا اختبارٌ للقارئ، فتوليدُ مدخله بالكاتب نفسه يخفي عللاً فيهما.
        /// </summary>
        private static string Quote(string text)
        {
            StringBuilder sb = new StringBuilder(text.Length + 2);
            sb.Append('"');

            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20)
                        {
                            sb.Append("\\u").Append(((int)c).ToString("x4"));
                        }
                        else
                        {
                            sb.Append(c);
                        }

                        break;
                }
            }

            sb.Append('"');
            return sb.ToString();
        }

        /// <summary>
        /// يعطب ملفّاً بقطع نصفه — وهو شكل العطب الحقيقي: قرصٌ ينقطع يترك
        /// بدايةً سليمة ونهايةً مفقودة، لا محتوىً عشوائيّاً.
        /// </summary>
        private static void Corrupt(string name)
        {
            string path = SaveFile.PathOf(name);
            if (!File.Exists(path))
            {
                return;
            }

            string text = File.ReadAllText(path);
            File.WriteAllText(path, text.Substring(0, text.Length / 2));
        }

        private static string Trio(SaveData a, SaveData b, SaveData c)
        {
            return (a != null ? a.Profile.AccountXp.ToString() : "—") + " · "
                + (b != null ? b.Profile.AccountXp.ToString() : "—") + " · "
                + (c != null ? c.Profile.AccountXp.ToString() : "—");
        }

        private static void Check(StringBuilder report, string label, bool passed, string detail)
        {
            if (passed)
            {
                _passed++;
            }
            else
            {
                _failed++;
            }

            report.Append(passed ? "  ✓ " : "  ✗ ").Append(label);
            if (!string.IsNullOrEmpty(detail))
            {
                report.Append("  (").Append(detail).Append(')');
            }

            report.AppendLine();
        }
    }
}
