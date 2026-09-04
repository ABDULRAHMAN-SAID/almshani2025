using System.Text;
using UnityEngine;
using UnityEngine.Profiling;
using Dawnkeep.Combat;

namespace Dawnkeep.Performance
{
    /// <summary>
    /// مقياس الأداء (§31): يسجّل الإطارات وزمن الخيط الرئيس وتخصيص الذاكرة
    /// وعدد الكائنات وزمن اختيار الهدف.
    ///
    /// **يقيس بعد التسخين لا من أوّل إطار**: أوّل ثانيتين فيهما تحميلُ خاماتٍ
    /// وتوليدُ مجمّعات، وإدخالُهما في المتوسّط يجعل كل قياسٍ كاذباً.
    ///
    /// وتخصيصُ الذاكرة يُقرأ من `Profiler`، وهو **لا يعمل إلا في المحرّر أو
    /// في بناء تطوير**. في بناء الإصدار يعود صفراً — والفحص يقول ذلك ولا
    /// يعرضه إنجازاً.
    /// </summary>
    [DisallowMultipleComponent]
    public class PerformanceProbe : MonoBehaviour
    {
        [Tooltip("ثوانِ تُترك قبل بدء القياس — تحميلٌ وتسخينُ مجمّعات.")]
        [SerializeField] private float warmUpSeconds = 2f;

        [Tooltip("ثوانِ القياس بعد التسخين.")]
        [SerializeField] private float measureSeconds = 10f;

        [Tooltip("يطبع تقريراً في السجلّ عند الانتهاء.")]
        [SerializeField] private bool logOnFinish = true;

        private CombatDirector _combat;
        private float _left;
        private bool _warm;
        private bool _done;

        private int _frames;
        private double _msSum;
        private double _msWorst;
        private double _targetSum;
        private double _targetWorst;
        private long _allocSum;
        private long _allocWorst;
        private int _zeroAllocFrames;
        private long _lastMono;
        private int _peakUnits;

        /// <summary>هل انتهى القياس؟ تقرؤه شاشة الساحة.</summary>
        public bool Finished { get { return _done; } }

        /// <summary>التقرير جاهزاً للعرض أو للسجلّ.</summary>
        public string Report { get; private set; }

        private void Awake()
        {
            Report = string.Empty;
            _left = warmUpSeconds;
        }

        private void OnDestroy()
        {
            if (_combat != null)
            {
                _combat.Measuring = false;
            }
        }

        private void Update()
        {
            if (_done)
            {
                return;
            }

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            _left -= Time.unscaledDeltaTime;

            if (!_warm)
            {
                if (_left > 0f)
                {
                    return;
                }

                _warm = true;
                _left = measureSeconds;
                _lastMono = Profiler.GetMonoUsedSizeLong();

                if (_combat != null)
                {
                    _combat.Measuring = true;
                    _combat.TakeTargetMilliseconds();      // يُطرح ما جُمع في التسخين
                }

                return;
            }

            Sample();

            if (_left <= 0f)
            {
                Finish();
            }
        }

        private void Sample()
        {
            _frames++;

            double ms = Time.unscaledDeltaTime * 1000.0;
            _msSum += ms;
            if (ms > _msWorst)
            {
                _msWorst = ms;
            }

            if (_combat != null)
            {
                double target = _combat.TakeTargetMilliseconds();
                _targetSum += target;
                if (target > _targetWorst)
                {
                    _targetWorst = target;
                }

                if (_combat.LiveCount > _peakUnits)
                {
                    _peakUnits = _combat.LiveCount;
                }
            }

            // فرقُ ما تستعمله الذاكرة المُدارة بين إطارين. سالبٌ يعني أنّ
            // جامع القمامة عمل، ولا يُحسب تخصيصاً.
            long mono = Profiler.GetMonoUsedSizeLong();
            long delta = mono - _lastMono;
            _lastMono = mono;

            if (delta > 0)
            {
                _allocSum += delta;
                if (delta > _allocWorst)
                {
                    _allocWorst = delta;
                }
            }
            else
            {
                _zeroAllocFrames++;
            }
        }

        private void Finish()
        {
            _done = true;
            if (_combat != null)
            {
                _combat.Measuring = false;
            }

            int frames = Mathf.Max(1, _frames);
            double avgMs = _msSum / frames;

            StringBuilder sb = new StringBuilder(512);
            sb.AppendLine("── قياس الأداء (§31) ──");
            sb.Append("  وحدات في الذروة: ").Append(_peakUnits).AppendLine();
            sb.Append("  إطارات مقيسة: ").Append(frames)
              .Append(" على ").Append(measureSeconds.ToString("0.#")).AppendLine(" ث");
            sb.Append("  الإطار المتوسّط: ").Append(avgMs.ToString("0.00"))
              .Append(" مل ث  (").Append((1000.0 / Mathf.Max(0.001f, (float)avgMs)).ToString("0"))
              .AppendLine(" إطاراً/ث)");
            sb.Append("  أسوأ إطار: ").Append(_msWorst.ToString("0.00")).AppendLine(" مل ث");
            sb.Append("  اختيار الهدف: ").Append((_targetSum / frames).ToString("0.000"))
              .Append(" مل ث متوسّطاً · أسوأه ")
              .Append(_targetWorst.ToString("0.000")).AppendLine(" مل ث");

            long mono = Profiler.GetMonoUsedSizeLong();
            if (mono <= 0)
            {
                sb.AppendLine("  التخصيص: لا يُقاس في بناء الإصدار — شغّله في المحرّر");
            }
            else
            {
                sb.Append("  التخصيص: ").Append((_allocSum / frames)).Append(" بايت/إطار متوسّطاً · أسوأه ")
                  .Append(_allocWorst).AppendLine(" بايت");
                sb.Append("  إطارات بلا تخصيص: ").Append(_zeroAllocFrames)
                  .Append(" من ").Append(frames)
                  .Append("  (").Append((_zeroAllocFrames * 100 / frames)).AppendLine("٪)");
                sb.AppendLine("  §31 تهدف إلى صفر بايت في أغلب الإطارات بعد التسخين.");
            }

            Report = sb.ToString();

            if (logOnFinish)
            {
                Debug.Log(Report);
            }
        }
    }
}
