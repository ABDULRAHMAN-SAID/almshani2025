using Dawnkeep.Localization;
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
    /// و**ضغطه مطوّلاً يفتح مرشِّح النوع** (§9): الجميع أو الحرّاس أو الرماة.
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
        private GameObject _filterRow;
        private GameObject _retreatButton;
        private Image[] _filterBack;
        private LongPressButton _openPress;
        private Image _openBackground;
        private TextMeshProUGUI _toast;
        private float _toastLeft;
        private bool _shownAlert;

        // مفاتيح لا نصوص: القالب يحمل `{0}` لعدد الفرق، فيُحلّ عند كل أمر
        private string _wordFollow;
        private string _wordHold;
        private string _wordDefend;
        private string _wordRetreat;

        private void Awake()
        {
            _wordFollow = LocKeys.OrderAckFollow;
            _wordHold = LocKeys.OrderAckHold;
            _wordDefend = LocKeys.OrderAckDefend;
            _wordRetreat = LocKeys.OrderAckRetreat;

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

                Color rest = alert
                    ? new Color(alertColor.r * 0.42f, alertColor.g * 0.20f, alertColor.b * 0.18f, 0.94f)
                    : panelColor;

                // اللون يمرّ عبر الزرّ لا يُكتب على صورته وحدها: الكتابة
                // المباشرة تُطمَس حين يرفع اللاعب إصبعه فيعيد الزرّ لون راحته
                // القديم.
                _openBackground.color = rest;
                _openPress.Refresh(rest);
            }
        }

        /// <summary>يفتح الدائرة أو يغلقها — يُنادى من زرّ الأوامر.</summary>
        public void Toggle()
        {
            bool open = !_ring.activeSelf;
            _ring.SetActive(open);

            // لا يُفتح الاثنان معاً: صفّ المرشِّح يقع على قوس الدائرة
            if (open)
            {
                _filterRow.SetActive(false);
            }
        }

        /// <summary>يفتح مرشِّح النوع أو يغلقه — من الضغطة المطوّلة (§9).</summary>
        public void ToggleFilter()
        {
            bool open = !_filterRow.activeSelf;
            _filterRow.SetActive(open);

            if (open)
            {
                _ring.SetActive(false);
                PaintFilter();
            }
        }

        public void Close()
        {
            _ring.SetActive(false);
            _filterRow.SetActive(false);
        }

        private void SetFilter(SquadFilter filter)
        {
            if (_squads != null)
            {
                _squads.Filter = filter;
            }

            PaintFilter();
            _filterRow.SetActive(false);

            // سطرٌ يقول ما اختير: مرشِّحٌ يُضبط بلا ردّ لا يُعرف أنّه ضُبط
            _toast.text = Loc.Text(FilterKey(filter));
            _toast.color = goldColor;
            _toastLeft = toastSeconds;
        }

        /// <summary>المختار يُضاء والباقي يبهت — الحال مقروءة قبل الأمر لا بعده.</summary>
        private void PaintFilter()
        {
            if (_filterBack == null || _squads == null)
            {
                return;
            }

            for (int i = 0; i < _filterBack.Length; i++)
            {
                bool active = (int)_squads.Filter == i;
                _filterBack[i].color = active
                    ? new Color(goldColor.r * 0.34f, goldColor.g * 0.30f, goldColor.b * 0.20f, 0.94f)
                    : panelColor;
            }
        }

        private static string FilterKey(SquadFilter filter)
        {
            switch (filter)
            {
                case SquadFilter.Guards: return LocKeys.FilterGuards;
                case SquadFilter.Archers: return LocKeys.FilterArchers;
                default: return LocKeys.FilterAll;
            }
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
        /// يقول كم فرقة سمعت الأمر. `what` مفتاح قالبٍ فيه `{0}` للعدد. أمرٌ بلا ردّ يجعل اللاعب يعيده ظنّاً أنّه
        /// لم يصل — وأسوأ منه أمرٌ لم يشمل أحداً فيبدو كأنّه نُفِّذ.
        /// </summary>
        private void Report(int count, string what)
        {
            Close();

            if (count < 0)
            {
                _toast.text = Loc.Text(LocKeys.OrderNoHero);
                _toast.color = alertColor;
            }
            else if (count == 0)
            {
                _toast.text = Loc.Text(LocKeys.OrderNoSquad);
                _toast.color = alertColor;
            }
            else
            {
                char[] buffer = new char[ArabicNumber.MaxLength];
                int length = ArabicNumber.Write(count, buffer, 0);
                _toast.text = Loc.Format(what, new string(buffer, 0, length));
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

            // لا `Button` هنا: نقرته تقع عند الرفع مهما طالت الضغطة، فيصدر
            // الأمران معاً — تُفتح الدائرة ويُفتح المرشِّح في لمسة واحدة.
            _openPress = open.gameObject.AddComponent<LongPressButton>();
            _openPress.Clicked += Toggle;
            _openPress.LongPressed += ToggleFilter;

            Label("Caption", open, LocKeys.OrdersButton, 26f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(124f, 44f),
                TextAlignmentOptions.Midline);

            // الدائرة: قوسٌ يساراً وأعلى من زرّ الفتح
            // مرتكز القوس مزاح يساراً عن زرّ الفتح: على محاذاته تلتصق أوّل
            // بطاقة بالزرّ فيصعب فصلهما بالإبهام.
            RectTransform ring = MakeRect("Ring", parent,
                new Vector2(1f, 0f), new Vector2(-136f, 138f), new Vector2(10f, 10f));
            _ring = ring.gameObject;

            MakeOption(ring, "Follow", LocKeys.OrderFollow, new Vector2(-120f, 24f), Follow);
            MakeOption(ring, "Hold", LocKeys.OrderHold, new Vector2(-108f, 126f), Hold);
            MakeOption(ring, "Defend", LocKeys.OrderDefend, new Vector2(-62f, 222f), Defend);

            // «تراجع» أبعد البطاقات عن الإبهام: لا يُضغط بالخطأ بدل «دافع»
            _retreatButton = MakeOption(ring, "Retreat", LocKeys.OrderRetreat, new Vector2(-166f, 306f), Retreat);
            _retreatButton.SetActive(false);

            // التلميح **داخل القوس** لا خارجه: خارجه يقع على بطاقة «اثبت»،
            // وداخله يظهر ويختفي معه — واللاعب لا يحتاجه إلّا وهو يفكّر في أمر.
            Label("FilterHint", ring, LocKeys.FilterHint, 20f, inkColor,
                new Vector2(0.5f, 0.5f), new Vector2(-166f, 372f), new Vector2(420f, 32f),
                TextAlignmentOptions.Midline);

            _ring.SetActive(false);

            // صفّ المرشِّح: يقع على قوس الدائرة، ولذلك لا يُفتحان معاً
            RectTransform filter = MakeRect("FilterRow", parent,
                new Vector2(1f, 0f), new Vector2(-24f, 470f), new Vector2(396f, 56f));
            _filterRow = filter.gameObject;
            _filterBack = new Image[3];

            _filterBack[0] = MakeFilter(filter, "All", LocKeys.FilterAll, -8f, SquadFilter.All);
            _filterBack[1] = MakeFilter(filter, "Guards", LocKeys.FilterGuards, -140f, SquadFilter.Guards);
            _filterBack[2] = MakeFilter(filter, "Archers", LocKeys.FilterArchers, -272f, SquadFilter.Archers);

            _filterRow.SetActive(false);

            // سطر التأكيد فوق الصفّ والقوس معاً: على ارتفاع أيّهما يحجبه
            _toast = MakeText("Toast", parent, 26f, goldColor,
                new Vector2(1f, 0f), new Vector2(-24f, 600f), new Vector2(420f, 40f),
                TextAlignmentOptions.MidlineRight);
        }

        /// <summary>بطاقة مرشِّح واحدة. تعيد خلفيّتها لتُلوَّن بحسب المختار.</summary>
        private Image MakeFilter(Transform parent, string name, string captionKey,
            float offsetX, SquadFilter filter)
        {
            RectTransform rect = MakeRect(name, parent,
                new Vector2(1f, 0f), new Vector2(offsetX, 0f), new Vector2(124f, 56f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = background;

            SquadFilter captured = filter;
            button.onClick.AddListener(delegate { SetFilter(captured); });

            Label("Caption", rect, captionKey, 24f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(116f, 36f),
                TextAlignmentOptions.Midline);

            return background;
        }

        private GameObject MakeOption(Transform parent, string name, string captionKey,
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

            Label("Caption", rect, captionKey, 26f, inkColor,
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

        private TextMeshProUGUI Label(string name, Transform parent, string key, float size,
            Color color, Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            TextMeshProUGUI text = MakeText(name, parent, size, color, anchor, offset, rectSize, align);
            text.gameObject.AddComponent<LocalizedLabel>().Bind(text, key);
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
