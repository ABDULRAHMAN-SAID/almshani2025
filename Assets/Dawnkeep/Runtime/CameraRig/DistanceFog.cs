using UnityEngine;

namespace Dawnkeep.CameraRig
{
    /// <summary>
    /// ضباب يُقاس بمضاعفات بُعد الكاميرا لا بالمتر.
    ///
    /// الضباب بكثافة ثابتة عيبه أنّ الشعاع كلّما طال مرّ بهباء أكثر: فما إن
    /// تُبعد الكاميرا حتى يبيضّ الميدان كلّه. هنا يُشتقّ المدى من بُعد الكاميرا
    /// عن نقطة نظرها على الأرض، فيبقى ما تلعب عليه صافياً عند أي تقريب أو
    /// إبعاد، ولا يبقى من الضباب إلا تدرّج المسافة على حافّة الخريطة.
    ///
    /// يُوضع على الكاميرا نفسها. لا تخصيص ذاكرة داخل حلقة الإطار.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    [ExecuteAlways]
    public class DistanceFog : MonoBehaviour
    {
        [Tooltip("معامل الضباب نسبةً إلى بُعد الكاميرا. أصغر = أوضح وأبعد.")]
        [SerializeField] private float fogCoefficient = 0.135f;

        [Tooltip("أدنى بُعد يُحتسب، حتى لا ينفجر الضباب حين تلامس الكاميرا الأرض.")]
        [SerializeField] private float minReferenceDistance = 120f;

        [Tooltip("أقصى كثافة مسموحة مهما اقتربت الكاميرا.")]
        [SerializeField] private float maxDensity = 0.010f;

        [Tooltip("يمدّ مستوى القصّ البعيد مع الإبعاد فلا تُقصّ الجبال عن الكادر.")]
        [SerializeField] private bool driveFarClip = true;

        [SerializeField] private float farClipMultiplier = 5.5f;
        [SerializeField] private float minFarClip = 1200f;
        [SerializeField] private float maxFarClip = 9000f;

        private Camera _camera;
        private Transform _transform;
        private Terrain _terrain;

        private void Awake()
        {
            _camera = GetComponent<Camera>();
            _transform = transform;
            _terrain = Terrain.activeTerrain;
        }

        private void OnEnable()
        {
            if (_camera == null)
            {
                Awake();
            }
        }

        private void LateUpdate()
        {
            if (_camera == null)
            {
                return;
            }

            float reference = Mathf.Max(minReferenceDistance, GroundFocusDistance());

            // exp2: نسبة الضباب على مسافة d هي 1-exp(-(density·d)²).
            // المعامل 0.135 يعطي ~16٪ على ثلاثة أضعاف بُعد الكاميرا و~70٪ على
            // ثمانية أضعافه: الميدان صافٍ والعمق يبقى مقروءاً على حافّة الخريطة.
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = Mathf.Min(maxDensity, fogCoefficient / reference);

            if (driveFarClip)
            {
                _camera.farClipPlane = Mathf.Clamp(reference * farClipMultiplier, minFarClip, maxFarClip);
            }
        }

        /// <summary>
        /// المسافة من الكاميرا إلى النقطة التي تنظر إليها على الأرض.
        /// تُشتقّ من الارتفاع فوق الأرض وميل النظر — بلا إسقاط شعاع في كل إطار.
        /// </summary>
        private float GroundFocusDistance()
        {
            Vector3 position = _transform.position;
            float ground = SampleGround(position.x, position.z);
            float height = Mathf.Max(1f, position.y - ground);

            // مركّبة النظر الرأسية: كلّما استوى النظر بَعُدت نقطة الالتقاء بالأرض
            float dip = Mathf.Max(0.15f, -_transform.forward.y);
            return height / dip;
        }

        private float SampleGround(float x, float z)
        {
            if (_terrain == null)
            {
                _terrain = Terrain.activeTerrain;
                if (_terrain == null)
                {
                    return 0f;
                }
            }

            return _terrain.SampleHeight(new Vector3(x, 0f, z)) + _terrain.transform.position.y;
        }
    }
}
