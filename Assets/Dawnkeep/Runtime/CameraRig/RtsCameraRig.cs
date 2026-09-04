using UnityEngine;

#if DAWNKEEP_INPUT
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
#endif

namespace Dawnkeep.CameraRig
{
    /// <summary>
    /// كاميرا المملكة: مدار مائل ثلاثي الأبعاد يدور حول نقطة على الأرض.
    /// سحب بإصبع = تحريك، إصبعان = تقريب ودوران، وعلى الحاسوب: أزرار الأسهم وعجلة الفأرة.
    /// كل المراجع تُخزَّن في Awake ولا تخصيص داخل حلقة الإطار.
    /// </summary>
    public class RtsCameraRig : MonoBehaviour
    {
        [Header("المدار")]
        [SerializeField] private Vector3 pivot = Vector3.zero;
        [SerializeField] private float distance = 260f;
        [SerializeField] private float minDistance = 60f;
        [SerializeField] private float maxDistance = 900f;
        [SerializeField] private float pitchDegrees = 42f;
        [SerializeField] private float yawDegrees = 35f;

        [Header("الاستجابة")]
        [SerializeField] private float panSpeed = 1.15f;
        [SerializeField] private float keyPanSpeed = 220f;
        [SerializeField] private float zoomSpeed = 42f;
        [SerializeField] private float rotateSpeed = 0.22f;
        [SerializeField] private float smoothTime = 0.09f;

        [Header("الحدود")]
        [SerializeField] private float boundsRadius = 1500f;
        [SerializeField] private float pivotHeightOffset = 4f;

        [Header("ملاحقة شخصية")]
        [Tooltip("حين يُضبط، تلاحق الكاميرا هذا الهدف والمسافة تبقى كما ضبطها اللاعب.")]
        [SerializeField] private Transform followTarget;

        [Tooltip("أقصى ما يتخلّف به مركز الكاميرا عن الهدف بالمتر. بعده يُشدّ إليه فوراً فلا يخرج من الكادر.")]
        [SerializeField] private float followMaxLag = 26f;

        [Tooltip("تحريك الكاميرا يدوياً يفكّ الملاحقة تلقائياً.")]
        [SerializeField] private bool breakFollowOnPan = true;

        private Transform _transform;
        private Terrain _terrain;
        private Vector3 _pivotVelocity;
        private Vector3 _smoothPivot;
        private float _smoothDistance;
        private float _smoothYaw;
        private float _cinemaUntil;
        private Transform _cinemaReturn;
#if !DAWNKEEP_INPUT
        private bool _warnedNoInput;
#endif

        public void Configure(Vector3 startPivot, float startDistance, float startYaw, float startPitch, float radius)
        {
            pivot = startPivot;
            distance = startDistance;
            yawDegrees = startYaw;
            pitchDegrees = startPitch;
            boundsRadius = radius;
        }

        private void Awake()
        {
            _transform = transform;
            _terrain = Terrain.activeTerrain;
            _smoothPivot = pivot;
            _smoothDistance = distance;
            _smoothYaw = yawDegrees;

#if DAWNKEEP_INPUT
            EnhancedTouchSupport.Enable();
#endif
        }

        private void OnDestroy()
        {
#if DAWNKEEP_INPUT
            EnhancedTouchSupport.Disable();
#endif
        }

        /// <summary>تلاحق الكاميرا هذا الهدف بمسافة ثابتة. مرّر null لفكّ الملاحقة.</summary>
        public void SetFollowTarget(Transform value)
        {
            followTarget = value;
        }

        /// <summary>ما تلاحقه الآن. تقرؤه الواجهة لتعيده بعد التثبيت (§6).</summary>
        public Transform FollowTarget { get { return followTarget; } }

        /// <summary>هل الكاميرا في لقطة الآن؟ الواجهة تخفي أزرارها حينها.</summary>
        public bool InCinematic { get { return _cinemaUntil > 0f; } }

        /// <summary>
        /// لقطة قصيرة على هدف ثمّ عودة إلى ما كانت تلاحقه (§6: ظهور الزعيم).
        ///
        /// **تحفظ الهدف السابق ولا تفترض البطل**: قد تكون الكاميرا مثبَّتة على
        /// الحصن أو مفكوكةً حين يظهر الزعيم، وإعادتها إلى البطل حينئذ تسرق
        /// من اللاعب موضعاً اختاره هو.
        /// </summary>
        public void BeginCinematic(Transform target, float seconds)
        {
            if (target == null || seconds <= 0f)
            {
                return;
            }

            if (_cinemaUntil <= 0f)
            {
                _cinemaReturn = followTarget;
            }

            followTarget = target;

            // بالزمن غير المقيَّس: اللقطة لا تتمدّد بسرعة اللعب ولا تختفي
            // عند إيقافها — وسقفها 1.2 ث من §6 لا يُتجاوز مهما مُرِّر.
            _cinemaUntil = Time.unscaledTime + Mathf.Min(1.2f, seconds);
        }

        /// <summary>يُنهي اللقطة فوراً — التخطّي الذي توجبه §6.</summary>
        public void EndCinematic()
        {
            if (_cinemaUntil <= 0f)
            {
                return;
            }

            _cinemaUntil = 0f;
            followTarget = _cinemaReturn;
            _cinemaReturn = null;
        }

        /// <summary>مسافة الكاميرا الحالية عن مركز نظرها — لا تتغيّر إلا بالتقريب.</summary>
        public float Distance
        {
            get { return distance; }
        }

        private void LateUpdate()
        {
            // اللقطة تنتهي بمضيّ مدّتها أو بأوّل لمسةٍ من اللاعب. قراءة الإدخال
            // تأتي بعدها: تخطٍّ في الإطار نفسه يجب أن يحرّك الكاميرا فوراً.
            if (_cinemaUntil > 0f && (Time.unscaledTime >= _cinemaUntil || Skipped()))
            {
                EndCinematic();
            }

            ReadInput();

            // الملاحقة تحرّك **مركز النظر** فقط؛ المسافة تبقى كما ضبطها اللاعب،
            // لأنّ موضع الكاميرا يُحسب دائماً من المركز بالمسافة نفسها.
            if (followTarget != null)
            {
                Vector3 goal = followTarget.position;
                Vector2 lag = new Vector2(pivot.x - goal.x, pivot.z - goal.z);
                float lagSqr = lag.sqrMagnitude;

                if (lagSqr > followMaxLag * followMaxLag)
                {
                    // شدّ فوري: التنعيم وحده يترك الهدف يهرب من الكادر عند الجري الطويل
                    float k = followMaxLag / Mathf.Sqrt(lagSqr);
                    pivot.x = goal.x + (lag.x * k);
                    pivot.z = goal.z + (lag.y * k);
                }
                else
                {
                    float t = 1f - Mathf.Exp(-9f * Time.deltaTime);
                    pivot.x = Mathf.Lerp(pivot.x, goal.x, t);
                    pivot.z = Mathf.Lerp(pivot.z, goal.z, t);
                }
            }

            distance = Mathf.Clamp(distance, minDistance, maxDistance);
            pivot.y = SampleGround(pivot.x, pivot.z) + pivotHeightOffset;

            Vector2 flat = new Vector2(pivot.x, pivot.z);
            if (flat.sqrMagnitude > boundsRadius * boundsRadius)
            {
                flat = flat.normalized * boundsRadius;
                pivot.x = flat.x;
                pivot.z = flat.y;
            }

            _smoothPivot = Vector3.SmoothDamp(_smoothPivot, pivot, ref _pivotVelocity, smoothTime);
            _smoothDistance = Mathf.Lerp(_smoothDistance, distance, 1f - Mathf.Exp(-12f * Time.deltaTime));
            _smoothYaw = Mathf.LerpAngle(_smoothYaw, yawDegrees, 1f - Mathf.Exp(-12f * Time.deltaTime));

            Quaternion rotation = Quaternion.Euler(pitchDegrees, _smoothYaw, 0f);
            _transform.SetPositionAndRotation(
                _smoothPivot - (rotation * Vector3.forward * _smoothDistance),
                rotation);
        }

        /// <summary>هل طلب اللاعب تخطّي اللقطة؟ أيّ لمسة أو مفتاح يكفي (§6).</summary>
        private bool Skipped()
        {
#if DAWNKEEP_INPUT
            Keyboard keyboard = Keyboard.current;
            if (keyboard != null && keyboard.anyKey.wasPressedThisFrame)
            {
                return true;
            }

            Mouse mouse = Mouse.current;
            if (mouse != null && mouse.leftButton.wasPressedThisFrame)
            {
                return true;
            }

            Touchscreen touch = Touchscreen.current;
            if (touch != null && touch.primaryTouch.press.wasPressedThisFrame)
            {
                return true;
            }
#endif
            return false;
        }

        private void ReadInput()
        {
#if DAWNKEEP_INPUT
            float dt = Time.deltaTime;
            Keyboard keyboard = Keyboard.current;

            if (keyboard != null)
            {
                float h = 0f;
                float v = 0f;

                if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed)
                {
                    h -= 1f;
                }

                if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed)
                {
                    h += 1f;
                }

                if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed)
                {
                    v -= 1f;
                }

                if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed)
                {
                    v += 1f;
                }

                if (h != 0f || v != 0f)
                {
                    MovePivot(h * keyPanSpeed * dt, v * keyPanSpeed * dt);
                }

                if (keyboard.qKey.isPressed)
                {
                    yawDegrees -= 60f * dt;
                }

                if (keyboard.eKey.isPressed)
                {
                    yawDegrees += 60f * dt;
                }
            }

            Mouse mouse = Mouse.current;
            if (mouse != null)
            {
                float scroll = mouse.scroll.ReadValue().y;
                if (scroll != 0f)
                {
                    distance -= scroll * zoomSpeed * 0.02f * Mathf.Max(1f, distance * 0.02f);
                }

                if (mouse.rightButton.isPressed)
                {
                    Vector2 delta = mouse.delta.ReadValue();
                    yawDegrees += delta.x * rotateSpeed;
                    pitchDegrees = Mathf.Clamp(pitchDegrees - (delta.y * rotateSpeed * 0.5f), 18f, 78f);
                }
                else if (mouse.leftButton.isPressed)
                {
                    Vector2 delta = mouse.delta.ReadValue();
                    float scale = panSpeed * distance * 0.0035f;
                    MovePivot(-delta.x * scale, -delta.y * scale);
                }
            }

            ReadTouch();
#else
            if (!_warnedNoInput)
            {
                _warnedNoInput = true;
                Debug.LogWarning("مملكة الرماد: حزمة Input System غير مثبّتة — الكاميرا ثابتة. نفّذ الخطوة 1.");
            }
#endif
        }

#if DAWNKEEP_INPUT
        private void ReadTouch()
        {
            var touches = UnityEngine.InputSystem.EnhancedTouch.Touch.activeTouches;
            if (touches.Count == 1)
            {
                Vector2 delta = touches[0].delta;
                float scale = panSpeed * distance * 0.0035f;
                MovePivot(-delta.x * scale, -delta.y * scale);
            }
            else if (touches.Count >= 2)
            {
                Vector2 a0 = touches[0].screenPosition;
                Vector2 b0 = touches[1].screenPosition;
                Vector2 aPrev = a0 - touches[0].delta;
                Vector2 bPrev = b0 - touches[1].delta;

                float now = Vector2.Distance(a0, b0);
                float before = Vector2.Distance(aPrev, bPrev);
                distance -= (now - before) * distance * 0.0035f;

                float angleNow = Mathf.Atan2(b0.y - a0.y, b0.x - a0.x);
                float angleBefore = Mathf.Atan2(bPrev.y - aPrev.y, bPrev.x - aPrev.x);
                yawDegrees += Mathf.DeltaAngle(angleBefore * Mathf.Rad2Deg, angleNow * Mathf.Rad2Deg) * 0.6f;
            }
        }
#endif

        private void MovePivot(float right, float forward)
        {
            if (followTarget != null)
            {
                if (!breakFollowOnPan)
                {
                    return;
                }

                followTarget = null;
            }

            float yaw = yawDegrees * Mathf.Deg2Rad;
            float sin = Mathf.Sin(yaw);
            float cos = Mathf.Cos(yaw);

            pivot.x += (right * cos) + (forward * sin);
            pivot.z += (-right * sin) + (forward * cos);
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
