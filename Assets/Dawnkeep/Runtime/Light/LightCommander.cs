using Dawnkeep.Combat;
using Dawnkeep.Interaction;
using UnityEngine;

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
    /// تمييز النقرة عن السحب في `TapDetector` المشترك: آمر البناء يحتاج المنطق
    /// نفسه، ونسختان منه تفترقان عند أوّل تعديل.
    /// </summary>
    [DisallowMultipleComponent]
    public class LightCommander : MonoBehaviour
    {
        [Tooltip("أبعد مسافة بالمتر بين نقطة اللمس وقاعدة المنارة لتُحسب لها.")]
        [SerializeField] private float pickRadius = 9f;

        private LightField _field;
        private WaveDirector _waves;
        private Camera _camera;
        private TapDetector _tap;

        private void Awake()
        {
            _tap = TapDetector.Default();
        }

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

            if (!Planning())
            {
                return;
            }

            Vector2 screen;
            if (!_tap.Poll(out screen))
            {
                return;
            }

            Beacon beacon = Pick(screen);
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

            Beacon best = null;
            float bestSqr = pickRadius * pickRadius;

            for (int i = 0; i < beacons.Count; i++)
            {
                Beacon beacon = beacons[i];
                if (beacon == null || !beacon.Movable)
                {
                    continue;      // منارةُ مبنىً: شحناتها من مستواه لا من يد اللاعب
                }

                Vector3 hit;
                if (!TapDetector.GroundPoint(_camera, screen, beacon.Position.y, out hit))
                {
                    continue;
                }

                Vector3 delta = hit - beacon.Position;
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
