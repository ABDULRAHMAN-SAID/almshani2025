using UnityEngine;

namespace Almshani.Player
{
    /// <summary>
    /// كاميرا تتبع الهدف من خلف/فوق بمسافة **ثابتة لا تتغيّر**.
    ///
    /// الخطأ الشائع هو تنعيم موضع الكاميرا نفسه نحو (الهدف + الإزاحة): عندها
    /// تتخلّف الكاميرا كلّما أسرع الهدف، فتتباعد المسافة وتقترب حين يقف —
    /// وهذا بالضبط ما كان يحدث. الصواب أن يُنعَّم **ما تنظر إليه** ثم تُوضع
    /// الكاميرا على الإزاحة كاملةً منه، فتبقى المسافة واحدة دائماً.
    ///
    /// وحتى نقطة النظر لها حدّ تخلّف أقصى: إن سبقها الهدف أكثر منه شُدّت إليه
    /// فوراً، فلا يخرج من الكادر مهما طال الجري.
    /// </summary>
    public class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform target;

        [Tooltip("إزاحة الكاميرا عن الهدف. طولها هو المسافة الثابتة المحفوظة.")]
        [SerializeField] private Vector3 offset = new Vector3(0f, 9f, -9f);

        [Tooltip("زمن تنعيم نقطة النظر. الكاميرا نفسها لا تُنعَّم — وإلا تغيّرت المسافة.")]
        [SerializeField] private float smoothTime = 0.15f;

        [Tooltip("أقصى ما تتخلّف به نقطة النظر عن الهدف بالمتر. بعده تُشدّ إليه فوراً.")]
        [SerializeField] private float maxLag = 6f;

        [SerializeField] private float lookAtHeight = 1f;

        [Tooltip("إن كان الهدف قد يمرّ خلف تضاريس، تُرفع الكاميرا فوق الأرض بهذا المقدار.")]
        [SerializeField] private float groundClearance = 1.6f;

        private Vector3 _anchor;
        private Vector3 _velocity;
        private bool _hasAnchor;
        private Terrain _terrain;

        public void SetTarget(Transform value)
        {
            target = value;
            _hasAnchor = false;
        }

        /// <summary>المسافة الثابتة بين الكاميرا والهدف.</summary>
        public float Distance
        {
            get { return offset.magnitude; }
        }

        /// <summary>يغيّر المسافة مع الحفاظ على اتجاه الإزاحة (زاوية النظر).</summary>
        public void SetDistance(float value)
        {
            float current = offset.magnitude;
            if (current > 1e-4f && value > 1e-4f)
            {
                offset *= value / current;
            }
        }

        private void Awake()
        {
            _terrain = Terrain.activeTerrain;
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            Vector3 goal = target.position;

            if (!_hasAnchor)
            {
                _anchor = goal;
                _velocity = Vector3.zero;
                _hasAnchor = true;
            }
            else
            {
                _anchor = Vector3.SmoothDamp(_anchor, goal, ref _velocity, smoothTime);

                // حدّ التخلّف: التنعيم وحده يترك الهدف يهرب من الكادر عند الجري الطويل
                Vector3 lag = _anchor - goal;
                float lagSqr = lag.sqrMagnitude;
                if (lagSqr > maxLag * maxLag)
                {
                    _anchor = goal + (lag * (maxLag / Mathf.Sqrt(lagSqr)));
                }
            }

            // الإزاحة تُطبَّق كاملةً من نقطة النظر: المسافة ثابتة بحكم البناء
            Vector3 position = _anchor + offset;

            if (groundClearance > 0f)
            {
                float ground = SampleGround(position.x, position.z) + groundClearance;
                if (position.y < ground)
                {
                    position.y = ground;
                }
            }

            transform.position = position;
            transform.LookAt(_anchor + (Vector3.up * lookAtHeight));
        }

        private float SampleGround(float x, float z)
        {
            if (_terrain == null)
            {
                _terrain = Terrain.activeTerrain;
                if (_terrain == null)
                {
                    return float.NegativeInfinity;
                }
            }

            return _terrain.SampleHeight(new Vector3(x, 0f, z)) + _terrain.transform.position.y;
        }
    }
}
