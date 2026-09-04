using System;

namespace Dawnkeep.Save
{
    /// <summary>ما آل إليه طلبٌ سحابيّ.</summary>
    public enum CloudResult
    {
        /// <summary>لا خدمة سحابية موصولة — اللعبة تعمل بلا سحابة (§27).</summary>
        Unavailable = 0,

        Success = 1,

        /// <summary>لا اتّصال. يُعاد المحاولة لاحقاً ولا يُفقد شيء.</summary>
        Offline = 2,

        /// <summary>ثمّة حفظٌ سحابيّ يخالف ما على الجهاز — يقرّره اللاعب.</summary>
        Conflict = 3,

        Error = 4,
    }

    /// <summary>
    /// وصفُ تعارضٍ بين الجهاز والسحابة (§27): **يُعرض ولا يُحسم بصمت** عند
    /// اختلافٍ كبير. فالوصف يحمل ما يحتاجه اللاعب ليقرّر: متى حُفظ كلٌّ، وكم
    /// بلغ فيه.
    /// </summary>
    public struct CloudConflict
    {
        public string LocalSavedAtUtc;
        public string CloudSavedAtUtc;

        public int LocalAccountXp;
        public int CloudAccountXp;

        public int LocalFurthestWave;
        public int CloudFurthestWave;

        /// <summary>
        /// هل الفرق كبير؟ عندها **لا يُختار بصمت** (§27). والكبير يُقاس بما
        /// يخسره اللاعب لو أُخذ الآخر: خبرةٌ أو ليالٍ لا وقتاً — ساعةُ الجهاز
        /// قد تكون مضبوطةً خطأً، والتقدّم لا يكذب.
        /// </summary>
        public bool Large
        {
            get
            {
                return Math.Abs(LocalAccountXp - CloudAccountXp) >= LargeXpGap
                    || Math.Abs(LocalFurthestWave - CloudFurthestWave) >= LargeWaveGap;
            }
        }

        /// <summary>فرقُ خبرةٍ يُعَدّ كبيراً — نحو جولتين.</summary>
        public const int LargeXpGap = 1200;

        /// <summary>وفرقُ ليالٍ.</summary>
        public const int LargeWaveGap = 3;

        public static CloudConflict Between(SaveData local, SaveData cloud)
        {
            CloudConflict conflict = new CloudConflict();
            if (local != null)
            {
                conflict.LocalSavedAtUtc = local.SavedAtUtc;
                conflict.LocalAccountXp = local.Profile != null ? local.Profile.AccountXp : 0;
                conflict.LocalFurthestWave = local.Campaign != null ? local.Campaign.FurthestWave : 0;
            }

            if (cloud != null)
            {
                conflict.CloudSavedAtUtc = cloud.SavedAtUtc;
                conflict.CloudAccountXp = cloud.Profile != null ? cloud.Profile.AccountXp : 0;
                conflict.CloudFurthestWave = cloud.Campaign != null ? cloud.Campaign.FurthestWave : 0;
            }

            return conflict;
        }
    }

    /// <summary>
    /// واجهة الحفظ السحابيّ (§27). **اللعبة تعمل دونها**: التنفيذ الافتراضي
    /// `NullCloudSave` يعيد `Unavailable` دائماً، ولا يعطّل شيئاً.
    ///
    /// الواجهة الآن والتنفيذ في الإنتاج: كتابةُ الاعتماد على UGS في الأنظمة
    /// مباشرةً تجعل نزعَه عند اختلاف الخدمة تعديلاً في كل نظام.
    /// </summary>
    public interface ICloudSaveService
    {
        /// <summary>هل ثمّة حساب موصول الآن؟</summary>
        bool SignedIn { get; }

        /// <summary>يرفع الحفظ. النتيجة عبر `done` — لا يوقف الإطار.</summary>
        void Upload(SaveData data, Action<CloudResult> done);

        /// <summary>ينزّل الحفظ السحابيّ. `null` مع النتيجة إن لم يوجد.</summary>
        void Download(Action<CloudResult, SaveData> done);

        /// <summary>
        /// يحسم تعارضاً بعد **اختيار اللاعب**. لا تُستدعى بلا اختياره إن كان
        /// الفرق كبيراً — وهذا شرط §27.
        /// </summary>
        void Resolve(bool keepLocal, Action<CloudResult> done);

        /// <summary>
        /// وقت الخادم بتوقيت UTC نصّاً، أو نصٌّ فارغ إن لم يتوفّر. §27:
        /// «لا تعتمد على ساعة الجهاز للمكافآت المهمة عند الاتصال».
        /// </summary>
        string ServerTimeUtc { get; }
    }

    /// <summary>
    /// لا سحابة. هو الافتراضي، وبه تعمل اللعبة كاملةً — وهو نصّ §27:
    /// «اللعبة تعمل دون Cloud».
    /// </summary>
    public class NullCloudSave : ICloudSaveService
    {
        public bool SignedIn { get { return false; } }

        public string ServerTimeUtc { get { return string.Empty; } }

        public void Upload(SaveData data, Action<CloudResult> done)
        {
            if (done != null)
            {
                done(CloudResult.Unavailable);
            }
        }

        public void Download(Action<CloudResult, SaveData> done)
        {
            if (done != null)
            {
                done(CloudResult.Unavailable, null);
            }
        }

        public void Resolve(bool keepLocal, Action<CloudResult> done)
        {
            if (done != null)
            {
                done(CloudResult.Unavailable);
            }
        }
    }
}
