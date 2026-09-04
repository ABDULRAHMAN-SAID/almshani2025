using System;
using System.IO;
using UnityEngine;

namespace Dawnkeep.Save
{
    /// <summary>من أين قُرئ الحفظ — تقوله الواجهة والسجلّ عند العطب.</summary>
    public enum SaveSource
    {
        /// <summary>لا ملفّ: لاعبٌ جديد.</summary>
        None = 0,

        /// <summary>الملفّ الأصلي سليماً.</summary>
        Primary = 1,

        /// <summary>النسخة الاحتياطية الأولى — الأصل تالف.</summary>
        BackupOne = 2,

        /// <summary>الثانية — الأصل والأولى تالفان.</summary>
        BackupTwo = 3,
    }

    /// <summary>
    /// قراءة ملفّ الحفظ وكتابته على القرص (§27).
    ///
    /// **كتابة ذرّية**: مؤقّتٌ ثمّ استبدال، فلا يبقى الملفّ الأصلي نصف مكتوب
    /// إن انقطعت الكتابة. و**نسختان احتياطيتان دوارتان** فوق ذلك: العطب قد
    /// يقع في القرص نفسه بعد كتابةٍ ناجحة.
    ///
    /// و**بصمةٌ** على المحتوى تكشف نصفَ ملفّ. القراءة تجرّب الأصل ثمّ الأولى
    /// ثمّ الثانية، فلا تُفقد الجولة كلّها بملفٍّ واحد.
    ///
    /// صنفٌ ساكن بلا حالة: `SaveService` هو الذي يملك البيانات، وهذا يعرف
    /// القرص وحده — ففحصُه لا يحتاج مشهداً.
    /// </summary>
    public static class SaveFile
    {
        /// <summary>غلافُ الملفّ: الصيغة والبصمة والحمولة نصّاً.</summary>
        [Serializable]
        private class Envelope
        {
            public int Version;
            public string Checksum;
            public string Payload;
        }

        /// <summary>مجلّد الحفظ. يُبدَّل في الفحص فيكتب في مجلّد مؤقّت.</summary>
        public static string Folder { get; set; }

        private static string Root
        {
            get
            {
                return string.IsNullOrEmpty(Folder) ? Application.persistentDataPath : Folder;
            }
        }

        public static string PathOf(string name)
        {
            return Path.Combine(Root, name);
        }

        public static bool Exists
        {
            get { return File.Exists(PathOf(SaveFormat.FileName)); }
        }

        /// <summary>
        /// يكتب الحفظ ذرّيّاً. يعيد false ولا يمسّ الملفّ القائم إن أخفق
        /// شيءٌ — نصفُ حفظٍ أسوأ من لا حفظ.
        /// </summary>
        public static bool Write(SaveData data)
        {
            if (data == null)
            {
                return false;
            }

            try
            {
                Directory.CreateDirectory(Root);

                data.SaveVersion = SaveFormat.Current;
                data.SavedAtUtc = DateTime.UtcNow.ToString("o");

                string payload = JsonUtility.ToJson(data);

                Envelope envelope = new Envelope();
                envelope.Version = SaveFormat.Current;
                envelope.Checksum = SaveFormat.Checksum(payload);
                envelope.Payload = payload;

                string temp = PathOf(SaveFormat.TempName);
                string primary = PathOf(SaveFormat.FileName);

                // المؤقّت أوّلاً وكاملاً: الانقطاع هنا يترك مؤقّتاً تالفاً
                // والأصلُ سليم، وهو المقصود من الذرّية كلّها.
                File.WriteAllText(temp, JsonUtility.ToJson(envelope, true));

                Rotate(primary);

                if (File.Exists(primary))
                {
                    File.Delete(primary);
                }

                File.Move(temp, primary);
                return true;
            }
            catch (Exception error)
            {
                Debug.LogWarning("مملكة الرماد: تعذّرت كتابة الحفظ — " + error.Message);
                return false;
            }
        }

        /// <summary>
        /// يُدوّر النسخ: الثانية تُمحى، والأولى تصير ثانية، والأصل يصير أولى.
        /// **نسخاً لا نقلاً** للأصل: نقلُه يترك اللعبة بلا ملفٍّ أصليّ لحظةً،
        /// وانقطاعُ التيّار فيها يُفقد آخر جولة وإن كانت النسخ سليمة.
        /// </summary>
        private static void Rotate(string primary)
        {
            if (!File.Exists(primary))
            {
                return;
            }

            string first = PathOf(SaveFormat.BackupOne);
            string second = PathOf(SaveFormat.BackupTwo);

            if (File.Exists(first))
            {
                if (File.Exists(second))
                {
                    File.Delete(second);
                }

                File.Move(first, second);
            }

            File.Copy(primary, first, true);
        }

        /// <summary>
        /// يقرأ الحفظ: الأصل ثمّ الأولى ثمّ الثانية. يعيد null إن لم يوجد
        /// شيءٌ سليم، ويقول من أين قرأ.
        /// </summary>
        public static SaveData Read(out SaveSource source)
        {
            SaveData data = TryRead(PathOf(SaveFormat.FileName));
            if (data != null)
            {
                source = SaveSource.Primary;
                return data;
            }

            data = TryRead(PathOf(SaveFormat.BackupOne));
            if (data != null)
            {
                source = SaveSource.BackupOne;
                Debug.LogWarning("مملكة الرماد: الحفظ الأصلي تالف — قُرئت النسخة الأولى.");
                return data;
            }

            data = TryRead(PathOf(SaveFormat.BackupTwo));
            if (data != null)
            {
                source = SaveSource.BackupTwo;
                Debug.LogWarning("مملكة الرماد: الأصل والنسخة الأولى تالفان — قُرئت الثانية.");
                return data;
            }

            source = SaveSource.None;
            return null;
        }

        /// <summary>يقرأ ملفّاً بعينه. null إن لم يوجد أو لم يجتز التدقيق.</summary>
        public static SaveData TryRead(string path)
        {
            try
            {
                if (!File.Exists(path))
                {
                    return null;
                }

                Envelope envelope = JsonUtility.FromJson<Envelope>(File.ReadAllText(path));
                if (envelope == null || string.IsNullOrEmpty(envelope.Payload))
                {
                    return null;
                }

                // البصمة قبل التحليل: حمولةٌ نصفُ مكتوبة قد تُحلَّل إلى كائنٍ
                // «صحيح» بأرقامٍ منقوصة، فيمرّ العطب صامتاً.
                if (SaveFormat.Checksum(envelope.Payload) != envelope.Checksum)
                {
                    return null;
                }

                // صيغةٌ من مستقبل: لا تُقرأ ولا تُمحى. قراءتُها بجهلٍ تُفقد
                // تقدّماً كُتب بإصدارٍ أحدث، ومحوُها أسوأ.
                if (envelope.Version > SaveFormat.Current)
                {
                    Debug.LogWarning("مملكة الرماد: ملفّ حفظٍ من صيغة أحدث ("
                        + envelope.Version + ") — لم يُقرأ.");
                    return null;
                }

                SaveData data = JsonUtility.FromJson<SaveData>(envelope.Payload);
                if (data == null)
                {
                    return null;
                }

                data.SaveVersion = envelope.Version;
                return SaveMigrations.Upgrade(data);
            }
            catch (Exception error)
            {
                Debug.LogWarning("مملكة الرماد: ملفّ حفظٍ لا يُقرأ (" + path + ") — "
                    + error.Message);
                return null;
            }
        }

        /// <summary>يمحو الحفظ ونسخه. للتجريب في المحرّر وحده.</summary>
        public static void Wipe()
        {
            string[] all =
            {
                SaveFormat.FileName, SaveFormat.TempName,
                SaveFormat.BackupOne, SaveFormat.BackupTwo,
            };

            for (int i = 0; i < all.Length; i++)
            {
                string path = PathOf(all[i]);
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
        }
    }
}
