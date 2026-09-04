using UnityEngine;

namespace Dawnkeep.Save
{
    /// <summary>
    /// مالك بيانات الحفظ في المشهد (§27).
    ///
    /// **يوقظ نفسه قبل كل شيء** (‏−600): `Progress` و`Loc` وغيرهما يقرؤون منه
    /// في `Awake`، فإيقاظُه بعدهم يعني جولةً تبدأ بحسابٍ فارغ ثمّ يُكتب فوق
    /// الحفظ الصحيح.
    ///
    /// ولا يكتب في كل تغيير: `Mark()` يعلّم الحاجة، والكتابة عند الفجر وعند
    /// نهاية المرحلة وعند خروج التطبيق. كتابةُ ملفٍّ كامل عند كل عملة تُكسَب
    /// توقف الإطار على الجوّال.
    /// </summary>
    [DisallowMultipleComponent]
    [DefaultExecutionOrder(-600)]
    public class SaveService : MonoBehaviour
    {
        public static SaveService Instance { get; private set; }

        [Tooltip("كل كم ثانية يُكتب الحفظ إن كان ثمّة تغيير.")]
        [SerializeField] private float autoSaveSeconds = 25f;

        private SaveData _data;
        private ICloudSaveService _cloud;
        private float _nextSave;
        private bool _dirty;

        /// <summary>بيانات الحفظ. لا تكون null بعد `Awake` أبداً.</summary>
        public SaveData Data
        {
            get
            {
                if (_data == null)
                {
                    Load();
                }

                return _data;
            }
        }

        /// <summary>من أين قُرئ الحفظ — تعرضه الإعدادات عند العطب.</summary>
        public SaveSource Source { get; private set; }

        /// <summary>خدمة السحابة. `NullCloudSave` ما لم تُركَّب غيرها (§27).</summary>
        public ICloudSaveService Cloud
        {
            get
            {
                if (_cloud == null)
                {
                    _cloud = new NullCloudSave();
                }

                return _cloud;
            }
        }

        /// <summary>يُرفع بعد كل قراءةٍ أو كتابة — تُعيد الواجهة رسم نفسها.</summary>
        public event System.Action Changed;

        public void UseCloud(ICloudSaveService service)
        {
            _cloud = service;
        }

        private void Awake()
        {
            Instance = this;
            Load();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Flush();
                Instance = null;
            }
        }

        private void Update()
        {
            if (!_dirty || Time.unscaledTime < _nextSave)
            {
                return;
            }

            Flush();
        }

        /// <summary>
        /// خروج التطبيق أو تعليقُه على الجوّال. `OnApplicationPause` لا
        /// `OnApplicationQuit` وحدها: نظام الجوّال قد يقتل التطبيق المعلَّق
        /// بلا استئذان، فلا يصل `Quit` أبداً.
        /// </summary>
        private void OnApplicationPause(bool paused)
        {
            if (paused)
            {
                Flush();
            }
        }

        private void OnApplicationQuit()
        {
            Flush();
        }

        /// <summary>يعلّم أنّ ثمّة ما يُكتب. رخيصة، تُستدعى بلا حساب.</summary>
        public void Mark()
        {
            _dirty = true;
        }

        /// <summary>يكتب الآن إن كان ثمّة تغيير. يعيد ما كُتب فعلاً.</summary>
        public bool Flush()
        {
            if (!_dirty || _data == null)
            {
                return false;
            }

            _dirty = false;
            _nextSave = Time.unscaledTime + Mathf.Max(1f, autoSaveSeconds);

            bool written = SaveFile.Write(_data);
            if (written)
            {
                Raise();
            }

            return written;
        }

        /// <summary>يقرأ من القرص، أو يبدأ ملفّاً جديداً.</summary>
        public void Load()
        {
            SaveSource source;
            SaveData data = SaveFile.Read(out source);

            if (data == null)
            {
                data = new SaveData();
                data.Profile.DeviceId = System.Guid.NewGuid().ToString("N");
                source = SaveSource.None;
                _dirty = true;      // لاعبٌ جديد: يُكتب ملفّه عند أوّل فرصة
            }

            _data = data;
            Source = source;
            _nextSave = Time.unscaledTime + Mathf.Max(1f, autoSaveSeconds);
            Raise();
        }

        /// <summary>يمحو كل شيء ويبدأ من جديد — للتجريب.</summary>
        public void Wipe()
        {
            SaveFile.Wipe();
            _data = null;
            _dirty = false;
            Load();
        }

        private void Raise()
        {
            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }
    }
}
