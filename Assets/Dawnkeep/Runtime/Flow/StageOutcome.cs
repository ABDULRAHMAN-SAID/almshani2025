using Dawnkeep.Building;
using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Flow
{
    /// <summary>نتيجة المرحلة (§5).</summary>
    public enum StageResult
    {
        Running = 0,
        Victory = 1,
        Defeat = 2,
    }

    /// <summary>
    /// شرطا الفوز والخسارة (§5)، ولا شيء غيرهما.
    ///
    /// **الفوز**: النجاة حتى نهاية الموجة المطلوبة وقلب الحصن حيّ.
    /// **الخسارة**: صحّة قلب الحصن صفر — وحدها. §5 تنصّ صراحةً على أنّ اللاعب
    /// **لا يخسر بموت البطل**، فهذا المكوّن لا ينظر إليه أصلاً.
    ///
    /// يوقف الزمن عند الحسم بدل هدم المشهد: اللاعب يريد أن يرى الساحة التي
    /// خسرها أو ربحها، لا شاشةً سوداء فوقها.
    /// </summary>
    [DisallowMultipleComponent]
    public class StageOutcome : MonoBehaviour
    {
        public static StageOutcome Instance { get; private set; }

        [Tooltip("عدد الموجات التي تُنهي المرحلة بالنجاة (§5: عشر).")]
        [SerializeField] private int wavesToSurvive = 10;

        [Tooltip("يوقف الزمن عند الحسم فتبقى الساحة معروضة ساكنة.")]
        [SerializeField] private bool freezeOnResult = true;

        private WaveDirector _waves;
        private Keep _keep;
        private StageResult _result = StageResult.Running;

        /// <summary>يُطلق مرّة عند الحسم.</summary>
        public event System.Action<StageResult> Resolved;

        public StageResult Result { get { return _result; } }

        public int WavesToSurvive { get { return wavesToSurvive; } }

        /// <summary>الموجات التي نجا منها فعلاً — تعرضها شاشة النتيجة.</summary>
        public int WavesCleared { get; private set; }

        private void Awake()
        {
            Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Start()
        {
            _waves = FindAnyObjectByType<WaveDirector>();
            _keep = Keep.Instance;
        }

        private void Update()
        {
            if (_result != StageResult.Running)
            {
                return;
            }

            if (_keep == null)
            {
                _keep = Keep.Instance;
            }

            if (_keep != null && _keep.Fallen)
            {
                Resolve(StageResult.Defeat);
                return;
            }

            if (_waves == null)
            {
                return;
            }

            // العدّاد من `WaveDirector` لا من رقم الموجة: آخر موجة تتكرّر عند
            // نفاد المحتوى فيتجمّد رقمها، ولا يتحقّق شرط الفوز أبداً.
            WavesCleared = _waves.WavesCleared;

            if (WavesCleared >= wavesToSurvive)
            {
                Resolve(StageResult.Victory);
            }
        }

        private void Resolve(StageResult result)
        {
            _result = result;

            if (freezeOnResult)
            {
                Time.timeScale = 0f;
            }

            System.Action<StageResult> handler = Resolved;
            if (handler != null)
            {
                handler(result);
            }
        }

        /// <summary>يستأنف الزمن — تناديه شاشة النتيجة عند الإعادة.</summary>
        public void Resume()
        {
            Time.timeScale = 1f;
        }
    }
}
