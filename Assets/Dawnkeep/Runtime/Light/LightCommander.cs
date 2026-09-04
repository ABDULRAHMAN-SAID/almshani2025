using Dawnkeep.Combat;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

namespace Dawnkeep.Light
{
    /// <summary>
    /// أمر اللاعب على النور: لمسة على منارة تنقل شحنة إليها أو تسحبها منها.
    ///
    /// **أثناء التخطيط وحده** (§11): الاستعداد أو الاستراحة. نقل الشحنات في
    /// وسط الاشتباك يحوّل القرار التكتيكي إلى نقر متواصل، ويُبطل معنى «قبل
    /// الموجة».
    ///
    /// لمسة واحدة تفعل الصواب دائماً: إن كان في المخزون شحنة وفي المنارة
    /// متّسع أضافت، وإلّا أعادت واحدة إلى المخزون. فلا يحتاج اللاعب زرّين ولا
    /// وضعَين، وكل خطوة قابلة للتراجع بلمسة أخرى.
    ///
    /// الإدخال بالنظام الجديد وحده (§1). ولا لمسة تُحسب إن كانت فوق الواجهة
    /// أو كانت سحباً لتحريك الكاميرا.
    /// </summary>
    [DisallowMultipleComponent]
    public class LightCommander : MonoBehaviour
    {
        [Tooltip("أبعد مسافة بالمتر بين نقطة اللمس وقاعدة المنارة لتُحسب لها.")]
        [SerializeField] private float pickRadius = 9f;

        [Tooltip("أطول زمن بالثانية تُعدّ اللمسة بعده سحباً لا نقرة.")]
        [SerializeField] private float tapSeconds = 0.45f;

        [Tooltip("أبعد إزاحة بالبكسل تبقى معها اللمسة نقرة.")]
        [SerializeField] private float tapSlack = 26f;

        private LightField _field;
        private WaveDirector _waves;
        private Camera _camera;

        private Vector2 _pressAt;
        private float _pressTime;
        private bool _pressed;

        private void Start()
        {
            _field = LightField.Instance;
            _waves = FindAnyObjectByType<WaveDirector>();
            _camera = Camera.main;
        }

        private void Update()
        {
            if (_camera == null)
            {
                _camera = Camera.main;
            }

            if (_field == null)
            {
                _field = LightField.Instance;
            }

            if (_field == null || _camera == null)
            {
                return;
            }

            Pointer pointer = Pointer.current;
            if (pointer == null)
            {
                return;
            }

            if (pointer.press.wasPressedThisFrame)
            {
                _pressed = true;
                _pressAt = pointer.position.ReadValue();
                _pressTime = Time.unscaledTime;
                return;
            }

            if (!pointer.press.wasReleasedThisFrame || !_pressed)
            {
                return;
            }

            _pressed = false;

            if (!Planning())
            {
                return;
            }

            Vector2 releaseAt = pointer.position.ReadValue();
            if ((releaseAt - _pressAt).sqrMagnitude > tapSlack * tapSlack)
            {
                return;      // سحب لتحريك الكاميرا، لا نقرة على منارة
            }

            if (Time.unscaledTime - _pressTime > tapSeconds)
            {
                return;      // ضغطة مطوّلة: ليست أمر نور
            }

            // النقر على الواجهة لا يمرّ إلى العالم تحتها
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject())
            {
                return;
            }

            Beacon beacon = Pick(releaseAt);
            if (beacon != null)
            {
                _field.ToggleCharge(beacon);
            }
        }

        private bool Planning()
        {
            return _waves == null || _waves.CanHasten || _waves.Phase == WavePhase.Idle;
        }

        /// <summary>
        /// المنارة تحت نقطة الشاشة. الإسقاط على **مستوى قاعدة المنارات** لا
        /// على مُصادِم: قاعدة عمود نحيف هدف صغير على شاشة جوّال، وإصابته
        /// بالإصبع محبطة. المستوى يعطي دائرة تسامح واسعة حول القاعدة.
        /// </summary>
        private Beacon Pick(Vector2 screen)
        {
            System.Collections.Generic.IReadOnlyList<Beacon> beacons = _field.Beacons;
            if (beacons.Count == 0)
            {
                return null;
            }

            Ray ray = _camera.ScreenPointToRay(screen);

            Beacon best = null;
            float bestSqr = pickRadius * pickRadius;

            for (int i = 0; i < beacons.Count; i++)
            {
                Beacon beacon = beacons[i];
                if (beacon == null)
                {
                    continue;
                }

                Vector3 basePoint = beacon.Position;
                float denominator = ray.direction.y;
                if (Mathf.Abs(denominator) < 0.0001f)
                {
                    continue;      // الشعاع موازٍ لمستوى القاعدة: لا تقاطع
                }

                float t = (basePoint.y - ray.origin.y) / denominator;
                if (t <= 0f)
                {
                    continue;      // المستوى خلف الكاميرا
                }

                Vector3 hit = ray.origin + (ray.direction * t);
                Vector3 delta = hit - basePoint;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr < bestSqr)
                {
                    bestSqr = distSqr;
                    best = beacon;
                }
            }

            return best;
        }
    }
}
