using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

namespace Dawnkeep.Interaction
{
    /// <summary>
    /// يميّز **النقرة** عن السحب والضغطة المطوّلة، بنظام الإدخال الجديد وحده (§1).
    ///
    /// الكاميرا تُحرَّك بالسحب، فلو حُسبت كل رفعة إصبع نقرةً لبنى اللاعب مبنى
    /// كلّما نظر حوله. والنقرة هنا: رفعٌ بعد ضغطٍ قريبٍ زمناً ومكاناً، وليس
    /// فوق الواجهة.
    ///
    /// بنيةٌ لا مكوّن: يملكها كل آمر بنسخته، فلا يتنازع اثنان على حالة واحدة.
    /// </summary>
    public struct TapDetector
    {
        private Vector2 _pressAt;
        private float _pressTime;
        private bool _pressed;

        /// <summary>أطول زمن بالثانية تبقى معه اللمسة نقرة.</summary>
        public float MaxSeconds;

        /// <summary>أبعد إزاحة بالبكسل تبقى معها اللمسة نقرة.</summary>
        public float MaxSlack;

        public static TapDetector Default()
        {
            TapDetector d = default(TapDetector);
            d.MaxSeconds = 0.45f;
            d.MaxSlack = 26f;
            return d;
        }

        /// <summary>
        /// يُنادى مرّة في كل إطار. يعيد true في الإطار الذي تكتمل فيه نقرة،
        /// ويعطي موضعها على الشاشة.
        /// </summary>
        public bool Poll(out Vector2 screen)
        {
            screen = Vector2.zero;

            // اللعبة موقوفة: هذا المميِّز يعمل بزمن غير مقيّس (وهو الصواب،
            // فالكاميرا تتحرّك أثناء الإيقاف)، فلولا هذا الحارس لبنى اللاعب
            // ونقل شحنات النور ولوحة الإيقاف مفتوحة فوقه.
            if (Time.timeScale <= 0f)
            {
                _pressed = false;
                return false;
            }

            Pointer pointer = Pointer.current;
            if (pointer == null)
            {
                _pressed = false;
                return false;
            }

            if (pointer.press.wasPressedThisFrame)
            {
                _pressed = true;
                _pressAt = pointer.position.ReadValue();
                _pressTime = Time.unscaledTime;
                return false;
            }

            if (!pointer.press.wasReleasedThisFrame || !_pressed)
            {
                return false;
            }

            _pressed = false;

            Vector2 releaseAt = pointer.position.ReadValue();
            if ((releaseAt - _pressAt).sqrMagnitude > MaxSlack * MaxSlack)
            {
                return false;      // سحب لتحريك الكاميرا
            }

            if (Time.unscaledTime - _pressTime > MaxSeconds)
            {
                return false;      // ضغطة مطوّلة
            }

            // النقر على الواجهة لا يمرّ إلى العالم تحتها
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject())
            {
                return false;
            }

            screen = releaseAt;
            return true;
        }

        /// <summary>
        /// النقطة التي يقطع عندها شعاعُ الشاشة مستوىً أفقيّاً على ارتفاع معلوم.
        ///
        /// الإسقاط على مستوٍ لا على مُصادِم: قاعدة عمود أو عقدة هدفٌ صغير على
        /// شاشة جوّال، وإصابته بالإصبع محبطة. المستوى يعطي دائرة تسامح واسعة.
        /// يعيد false إن كان الشعاع موازياً للمستوى أو خلف الكاميرا.
        /// </summary>
        public static bool GroundPoint(Camera camera, Vector2 screen, float planeY, out Vector3 point)
        {
            point = Vector3.zero;
            if (camera == null)
            {
                return false;
            }

            Ray ray = camera.ScreenPointToRay(screen);
            if (Mathf.Abs(ray.direction.y) < 0.0001f)
            {
                return false;
            }

            float t = (planeY - ray.origin.y) / ray.direction.y;
            if (t <= 0f)
            {
                return false;
            }

            point = ray.origin + (ray.direction * t);
            return true;
        }
    }
}
