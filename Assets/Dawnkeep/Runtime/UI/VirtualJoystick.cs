using TMPro;
using UnityEngine;
using UnityEngine.UI;
#if DAWNKEEP_INPUT
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
#endif

namespace Dawnkeep.UI
{
    /// <summary>
    /// عصا §7 الافتراضية العائمة: تظهر **حيث تقع الإصبع** في النصف الأيسر،
    /// لا في مكانٍ ثابت يبحث عنه الإبهام.
    ///
    /// «عائمة» شرطٌ لا زينة: عصا ثابتة على شاشة جوّال تُلزم اللاعب أن ينظر
    /// إلى إبهامه ليجدها، وهو ينظر إلى الموجة. والظهور عند اللمس يجعل موضعها
    /// هو موضع إبهامه دائماً.
    ///
    /// **لا تقرأ الأزرار**: اللمسة التي تبدأ فوق عنصر واجهة لا تُنشئ عصا،
    /// وإلّا تحرّك البطل مع كل ضغطة قدرة. والفحص بموضع اللمسة في مستطيلات
    /// الأزرار لا بـ`EventSystem`: هذا الأخير يستهلك اللمسة فلا يصل خبرها.
    /// </summary>
    [DisallowMultipleComponent]
    public class VirtualJoystick : MonoBehaviour
    {
        [SerializeField] private Color ringColor = new Color(0.918f, 0.898f, 0.851f, 0.24f);
        [SerializeField] private Color knobColor = new Color(0.878f, 0.749f, 0.451f, 0.62f);

        [Tooltip("نسبة عرض الشاشة التي تصلح للعصا من اليسار (§7: الجانب الأيسر).")]
        [Range(0.2f, 0.7f)]
        [SerializeField] private float regionWidth = 0.45f;

        [Tooltip("أعلى ما تبلغه المنطقة من ارتفاع الشاشة — أسفل شريط الحالة.")]
        [Range(0.3f, 1f)]
        [SerializeField] private float regionHeight = 0.78f;

        [Tooltip("نصف قطر الحلقة بالبكسل عند مقياس 1. يُضبط من الإعدادات (§7).")]
        [SerializeField] private float radius = 130f;

        [Tooltip("مقياس العصا — «حساسية عصا وتحجيمها» (§7).")]
        [Range(0.6f, 1.8f)]
        [SerializeField] private float scale = 1f;

        [Tooltip("شفافيّتها (§7).")]
        [Range(0.15f, 1f)]
        [SerializeField] private float opacity = 1f;

        [Tooltip("منطقة ميتة داخل الحلقة (§7: 0.12).")]
        [Range(0f, 0.4f)]
        [SerializeField] private float deadZone = 0.12f;

        [Tooltip("مواضع لا تُنشئ عصا: أزرار القدرات والأوامر وما شابهها.")]
        [SerializeField] private RectTransform[] blockers = new RectTransform[0];

        private RectTransform _canvas;
        private RectTransform _ring;
        private RectTransform _knob;
        private CanvasGroup _group;

        private Vector2 _originLocal;
        private Vector2 _value;
        private bool _active;
        private int _finger = -1;

        /// <summary>
        /// قراءة العصا: متّجهٌ في مربّع الوحدة، صفرٌ إن لم تكن مضغوطة.
        /// **ساكنة** فيقرؤها `HeroController` بلا مرجعٍ ولا بحثٍ في المشهد.
        /// </summary>
        public static Vector2 Value
        {
            get { return Instance != null ? Instance._value : Vector2.zero; }
        }

        /// <summary>هل العصا ممسوكة الآن؟ يقرؤها اللمس ليتجاهل السحب.</summary>
        public static bool Held
        {
            get { return Instance != null && Instance._active; }
        }

        public static VirtualJoystick Instance { get; private set; }

        public void Configure(RectTransform[] blocked)
        {
            if (blocked != null && blocked.Length > 0)
            {
                blockers = blocked;
            }
        }

        /// <summary>تكبير العصا أو تصغيرها من الإعدادات (§7).</summary>
        public void SetScale(float value)
        {
            scale = Mathf.Clamp(value, 0.6f, 1.8f);
            Apply();
        }

        /// <summary>شفافيّتها من الإعدادات (§7).</summary>
        public void SetOpacity(float value)
        {
            opacity = Mathf.Clamp(value, 0.15f, 1f);
            if (_group != null && _active)
            {
                _group.alpha = opacity;
            }
        }

        public float Scale { get { return scale; } }

        public float Opacity { get { return opacity; } }

        private void Awake()
        {
            Instance = this;
            _canvas = GetComponent<RectTransform>();
            Build();
        }

        private void OnEnable()
        {
#if DAWNKEEP_INPUT
            EnhancedTouchSupport.Enable();
#endif
        }

        private void OnDisable()
        {
#if DAWNKEEP_INPUT
            EnhancedTouchSupport.Disable();
#endif
            Release();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Update()
        {
#if DAWNKEEP_INPUT
            // الزمن قد يكون موقوفاً (لوحة بركة أو نتيجة): العصا تُفلَت حينها
            // ولا تُلتقط، وإلّا بقي البطل يجري باتّجاه إصبعٍ رُفع قبل اللوحة.
            if (Time.timeScale <= 0f)
            {
                Release();
                return;
            }

            ReadTouch();
            ReadMouse();
#endif
        }

#if DAWNKEEP_INPUT
        private void ReadTouch()
        {
            var touches = Touch.activeTouches;
            for (int i = 0; i < touches.Count; i++)
            {
                Touch touch = touches[i];

                if (_finger < 0 && touch.began && Eligible(touch.screenPosition))
                {
                    Grab(touch.finger.index, touch.screenPosition);
                    continue;
                }

                if (_finger >= 0 && touch.finger.index == _finger)
                {
                    if (touch.ended || touch.phase == UnityEngine.InputSystem.TouchPhase.Canceled)
                    {
                        Release();
                    }
                    else
                    {
                        Drag(touch.screenPosition);
                    }
                }
            }

            // الإصبع اختفت بلا حدث نهاية (تبديل تطبيق مثلاً): تُفلَت العصا
            if (_finger >= 0 && !AnyFinger(_finger))
            {
                Release();
            }
        }

        private bool AnyFinger(int index)
        {
            var touches = Touch.activeTouches;
            for (int i = 0; i < touches.Count; i++)
            {
                if (touches[i].finger.index == index)
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// الفأرة تحرّك العصا أيضاً — للتجريب في المحرّر. المفاتيح تبقى
        /// الطريق الأوّل على الحاسوب، فلا تُلغى إحداهما الأخرى.
        /// </summary>
        private void ReadMouse()
        {
            Mouse mouse = Mouse.current;
            if (mouse == null || Application.isMobilePlatform)
            {
                return;
            }

            if (_finger < 0 && mouse.rightButton.wasPressedThisFrame
                && Eligible(mouse.position.ReadValue()))
            {
                Grab(-2, mouse.position.ReadValue());
                return;
            }

            if (_finger == -2)
            {
                if (mouse.rightButton.isPressed)
                {
                    Drag(mouse.position.ReadValue());
                }
                else
                {
                    Release();
                }
            }
        }
#endif

        /// <summary>
        /// هل تصلح هذه النقطة لبدء عصا؟ (§7: الجانب الأيسر — أو الأيمن في
        /// نمط الأعسر). المنطقة تُقاس من الحافّة المقابلة لمجموعة الأزرار
        /// دائماً، فلا يقع الإبهامان على جانبٍ واحد.
        /// </summary>
        private bool Eligible(Vector2 screen)
        {
            float span = Screen.width * regionWidth;
            bool inside = Handedness.LeftHanded
                ? screen.x >= Screen.width - span
                : screen.x <= span;

            if (!inside)
            {
                return false;
            }

            if (screen.y > Screen.height * regionHeight)
            {
                return false;
            }

            for (int i = 0; i < blockers.Length; i++)
            {
                RectTransform blocker = blockers[i];
                if (blocker != null && blocker.gameObject.activeInHierarchy
                    && RectTransformUtility.RectangleContainsScreenPoint(blocker, screen, null))
                {
                    return false;
                }
            }

            return true;
        }

        private void Grab(int finger, Vector2 screen)
        {
            _finger = finger;
            _active = true;
            _value = Vector2.zero;

            _originLocal = ToLocal(screen);
            _ring.anchoredPosition = _originLocal;
            _knob.anchoredPosition = Vector2.zero;

            _group.alpha = opacity;
            _ring.gameObject.SetActive(true);
        }

        /// <summary>
        /// الحساب كلّه في **إحداثيات اللوحة** لا الشاشة: اللوحة تتغيّر مقياساً
        /// بدقّة الجهاز، فحلقةٌ نصف قطرها 130 وحدة لوحة قد تكون 195 بكسلاً
        /// على شاشةٍ عالية. ولو قِيست الإصبع بالبكسل والحلقةُ بالوحدة لَبلغت
        /// القبضةُ الحافّة قبل الإصبع بثلثٍ على تلك الشاشة.
        /// </summary>
        private void Drag(Vector2 screen)
        {
            Vector2 delta = ToLocal(screen) - _originLocal;
            float reach = radius * scale;
            float magnitude = delta.magnitude;

            // القبضة تلاحق الإصبع داخل الحلقة وتقف عند حافّتها
            _knob.anchoredPosition = magnitude > reach ? (delta / magnitude) * reach : delta;

            if (magnitude < 0.001f)
            {
                _value = Vector2.zero;
                return;
            }

            float unit = Mathf.Clamp01(magnitude / reach);
            if (unit <= deadZone)
            {
                _value = Vector2.zero;
                return;
            }

            // المنطقة الميتة تُقصّ ثمّ يُعاد تطبيع الباقي — كما في `HeroController`
            _value = (delta / magnitude) * ((unit - deadZone) / (1f - deadZone));
        }

        private void Release()
        {
            _finger = -1;
            _active = false;
            _value = Vector2.zero;

            if (_ring != null)
            {
                _ring.gameObject.SetActive(false);
            }
        }

        private Vector2 ToLocal(Vector2 screen)
        {
            Vector2 local;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                _canvas, screen, null, out local);
            return local;
        }

        private void Apply()
        {
            if (_ring == null || _knob == null)
            {
                return;
            }

            _ring.sizeDelta = new Vector2(radius * 2f * scale, radius * 2f * scale);
            _knob.sizeDelta = new Vector2(radius * 0.72f * scale, radius * 0.72f * scale);
        }

        private void Build()
        {
            if (_canvas == null)
            {
                Debug.LogError("مملكة الرماد: VirtualJoystick يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            GameObject ring = new GameObject("JoystickRing", typeof(RectTransform));
            _ring = ring.GetComponent<RectTransform>();
            _ring.SetParent(_canvas, false);
            _ring.anchorMin = new Vector2(0.5f, 0.5f);
            _ring.anchorMax = new Vector2(0.5f, 0.5f);
            _ring.pivot = new Vector2(0.5f, 0.5f);

            _group = ring.AddComponent<CanvasGroup>();
            _group.blocksRaycasts = false;
            _group.interactable = false;

            Image ringImage = ring.AddComponent<Image>();
            ringImage.color = ringColor;
            ringImage.raycastTarget = false;

            // القبضة **ابنة الحلقة**: موضعها إزاحةٌ عنها، فتختفي معها بضغطةٍ
            // واحدة. رفعُها إلى اللوحة يترك قبضةً معلّقة بعد رفع الإصبع.
            GameObject knob = new GameObject("JoystickKnob", typeof(RectTransform));
            _knob = knob.GetComponent<RectTransform>();
            _knob.SetParent(_ring, false);
            _knob.anchorMin = new Vector2(0.5f, 0.5f);
            _knob.anchorMax = new Vector2(0.5f, 0.5f);
            _knob.pivot = new Vector2(0.5f, 0.5f);

            Image knobImage = knob.AddComponent<Image>();
            knobImage.color = knobColor;
            knobImage.raycastTarget = false;

            Apply();
            _ring.gameObject.SetActive(false);
        }
    }
}
