using Dawnkeep.Squads;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// زرّ الأوامر ودائرته (§7): اتبعني، اثبت، دافع — ويظهر «تراجع» رابعاً حين
    /// تنهك فرقة (§9: تحت 30% من الصحّة).
    ///
    /// دائرة لا قائمة: §7 تنصّ على «دائرة صغيرة»، وهي أسرع ما يُصاب بالإبهام
    /// على شاشة جوّال — كل خيار على قوسٍ حول نقطة ارتكاز الإصبع نفسها.
    ///
    /// الزرّ أسفل اليمين فوق لوحة البطل: §7 تضع أزرار الأوامر والقدرات يميناً.
    /// </summary>
    [DisallowMultipleComponent]
    public class OrderRing : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.92f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color alertColor = new Color(0.851f, 0.294f, 0.267f);

        [Tooltip("ثوانٍ يبقى فيها سطر تأكيد الأمر.")]
        [SerializeField] private float toastSeconds = 2.2f;

        private SquadDirector _squads;

        private GameObject _ring;
        private GameObject _retreatButton;
        private Image _openBackground;
        private TextMeshProUGUI _toast;
        private float _toastLeft;
        private bool _shownAlert;

        private string _wordFollow;
        private string _wordHold;
        private string _wordDefend;
        private string _wordRetreat;
        private string _wordNone;
        private string _wordNoHero;

        private void Awake()
        {
            _wordFollow = ArabicShaper.Shape("فرقةً تتبعك");
            _wordHold = ArabicShaper.Shape("فرقةً ثبتت");
            _wordDefend = ArabicShaper.Shape("فرقةً تدافع");
            _wordRetreat = ArabicShaper.Shape("فرقةً تتراجع");
            _wordNone = ArabicShaper.Shape("لا فرقة قريبة");
            _wordNoHero = ArabicShaper.Shape("لا بطل في الساحة");

            Build();
        }

        private void Start()
        {
            _squads = SquadDirector.Instance;
        }

        private void Update()
        {
            if (_squads == null)
            {
                _squads = SquadDirector.Instance;
            }

            if (_toastLeft > 0f)
            {
                _toastLeft -= Time.deltaTime;
                if (_toastLeft <= 0f)
                {
                    _toast.text = string.Empty;
                }
            }

            if (_squads == null)
            {
                return;
            }

            // «تراجع» لا يظهر إلّا حين يُحتاج (§9): خيارٌ دائم الظهور يفقد معناه
            bool alert = _squads.AnyNeedsRetreat;
            if (alert != _shownAlert)
            {
                _shownAlert = alert;
                _retreatButton.SetActive(alert);
                _openBackground.color = alert
                    ? new Color(alertColor.r * 0.42f, alertColor.g * 0.20f, alertColor.b * 0.18f, 0.94f)
                    : panelColor;
            }
        }

        /// <summary>يفتح الدائرة أو يغلقها — يُنادى من زرّ الأوامر.</summary>
        public void Toggle()
        {
            _ring.SetActive(!_ring.activeSelf);
        }

        public void Close()
        {
            _ring.SetActive(false);
        }

        // ── الأوامر ─────────────────────────────────────────────────────────

        public void Follow()
        {
            Report(_squads != null ? _squads.CommandFollow() : 0, _wordFollow);
        }

        public void Hold()
        {
            Report(_squads != null ? _squads.CommandHold() : 0, _wordHold);
        }

        public void Defend()
        {
            Report(_squads != null ? _squads.CommandDefend() : 0, _wordDefend);
        }

        public void Retreat()
        {
            Report(_squads != null ? _squads.CommandRetreat() : 0, _wordRetreat);
        }

        /// <summary>
        /// يقول كم فرقة سمعت الأمر. أمرٌ بلا ردّ يجعل اللاعب يعيده ظنّاً أنّه
        /// لم يصل — وأسوأ منه أمرٌ لم يشمل أحداً فيبدو كأنّه نُفِّذ.
        /// </summary>
        private void Report(int count, string what)
        {
            Close();

            if (count < 0)
            {
                _toast.text = _wordNoHero;
                _toast.color = alertColor;
            }
            else if (count == 0)
            {
                _toast.text = _wordNone;
                _toast.color = alertColor;
            }
            else
            {
                char[] buffer = new char[ArabicNumber.MaxLength];
                int length = ArabicNumber.Write(count, buffer, 0);
                _toast.text = new string(buffer, 0, length) + " " + what;
                _toast.color = goldColor;
            }

            _toastLeft = toastSeconds;
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: OrderRing يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            // زرّ الفتح: أسفل اليمين فوق لوحة البطل
            RectTransform open = MakeRect("OrderButton", parent,
                new Vector2(1f, 0f), new Vector2(-24f, 138f), new Vector2(132f, 96f));

            _openBackground = open.gameObject.AddComponent<Image>();
            _openBackground.color = panelColor;
            _openBackground.raycastTarget = true;

            Button openButton = open.gameObject.AddComponent<Button>();
            openButton.targetGraphic = _openBackground;
            openButton.onClick.AddListener(Toggle);

            Label("Caption", open, "الأوامر", 26f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(124f, 44f),
                TextAlignmentOptions.Midline);

            // الدائرة: قوسٌ يساراً وأعلى من زرّ الفتح
            // مرتكز القوس مزاح يساراً عن زرّ الفتح: على محاذاته تلتصق أوّل
            // بطاقة بالزرّ فيصعب فصلهما بالإبهام.
            RectTransform ring = MakeRect("Ring", parent,
                new Vector2(1f, 0f), new Vector2(-136f, 138f), new Vector2(10f, 10f));
            _ring = ring.gameObject;

            MakeOption(ring, "Follow", "اتبعني", new Vector2(-120f, 24f), Follow);
            MakeOption(ring, "Hold", "اثبت", new Vector2(-108f, 126f), Hold);
            MakeOption(ring, "Defend", "دافع", new Vector2(-62f, 222f), Defend);

            // «تراجع» أبعد البطاقات عن الإبهام: لا يُضغط بالخطأ بدل «دافع»
            _retreatButton = MakeOption(ring, "Retreat", "تراجع", new Vector2(-166f, 306f), Retreat);
            _retreatButton.SetActive(false);

            _ring.SetActive(false);

            // سطر التأكيد فوق أعلى بطاقة في القوس: على ارتفاعها يحجب إحداها
            _toast = MakeText("Toast", parent, 26f, goldColor,
                new Vector2(1f, 0f), new Vector2(-24f, 520f), new Vector2(420f, 40f),
                TextAlignmentOptions.MidlineRight);
        }

        private GameObject MakeOption(Transform parent, string name, string caption,
            Vector2 offset, UnityEngine.Events.UnityAction action)
        {
            RectTransform rect = MakeRect(name, parent,
                new Vector2(0.5f, 0.5f), offset, new Vector2(150f, 76f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = background;
            button.onClick.AddListener(action);

            Label("Caption", rect, caption, 26f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(142f, 44f),
                TextAlignmentOptions.Midline);

            return rect.gameObject;
        }

        private static RectTransform MakeRect(string name, Transform parent, Vector2 anchor,
            Vector2 offset, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = offset;
            rect.sizeDelta = size;
            return rect;
        }

        private TextMeshProUGUI Label(string name, Transform parent, string logical, float size,
            Color color, Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            TextMeshProUGUI text = MakeText(name, parent, size, color, anchor, offset, rectSize, align);
            text.text = ArabicShaper.Shape(logical);
            return text;
        }

        private TextMeshProUGUI MakeText(string name, Transform parent, float size, Color color,
            Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            RectTransform rect = MakeRect(name, parent, anchor, offset, rectSize);
            TextMeshProUGUI text = rect.gameObject.AddComponent<TextMeshProUGUI>();

            if (font != null)
            {
                text.font = font;
            }

            text.fontSize = size;
            text.color = color;
            text.alignment = align;
            text.raycastTarget = false;
            text.isRightToLeftText = false;
            text.textWrappingMode = TextWrappingModes.NoWrap;
            return text;
        }
    }
}
