using Dawnkeep.Hero;
using Dawnkeep.Localization;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// أزرار قدرات البطل (§7: الجانب الأيمن) وعدّاد عودته روحاً (§5).
    ///
    /// كل زرّ يحمل **قرصاً يمتلئ** لا رقماً: نسبة الجاهزية تُقرأ بلمحة، والرقم
    /// يُجبر اللاعب على القراءة في وسط الاشتباك.
    ///
    /// المفاتيح Q و E و R كما تنصّ §7، وتنادي **دوالّ الأزرار نفسها** فلا
    /// يفترق سلوك الجهازين.
    /// </summary>
    [DisallowMultipleComponent]
    public class AbilityBar : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.92f);
        [SerializeField] private Color readyColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color chargingColor = new Color(0.243f, 0.271f, 0.318f, 0.92f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color spiritColor = new Color(0.545f, 0.373f, 0.780f);

        private HeroController _hero;

        private Image[] _fill;
        private Image[] _back;
        private GameObject _spiritPanel;
        private TextMeshProUGUI _spiritSeconds;

        private readonly char[] _digits = new char[ArabicNumber.MaxLength];
        private readonly float[] _shown = { -1f, -1f, -1f };
        private int _shownSpirit = -1;
        private bool _spiritOpen;

        private readonly System.Collections.Generic.List<RectTransform> _mirrorRoots =
            new System.Collections.Generic.List<RectTransform>(6);

        private bool _mirrored;

        /// <summary>
        /// يعكس مجموعة هذا العنصر لنمط الأعسر (§7). الأبناء يُعكسون معه:
        /// عكسُ الأب وحده يترك أرقام القدرات ونصوصها على جانبها القديم.
        /// </summary>
        private void ApplyHandedness()
        {
            bool want = Handedness.LeftHanded;
            if (want == _mirrored)
            {
                return;
            }

            _mirrored = want;
            for (int i = 0; i < _mirrorRoots.Count; i++)
            {
                Handedness.MirrorTree(_mirrorRoots[i]);
            }
        }

        private void OnDestroy()
        {
            Handedness.Changed -= ApplyHandedness;
        }

        private void Awake()
        {
            Handedness.Changed += ApplyHandedness;
            Build();
        }

        private void Start()
        {
            _hero = HeroController.Instance;
        }

        private void Update()
        {
            if (_hero == null)
            {
                _hero = HeroController.Instance;
                if (_hero == null)
                {
                    return;
                }
            }

            ReadKeys();
            Paint(0, _hero.VolleyReadiness);
            Paint(1, _hero.RallyReadiness);
            Paint(2, _hero.UltimateReadiness);
            PaintSpirit();
        }

        private void ReadKeys()
        {
            Keyboard keyboard = Keyboard.current;
            if (keyboard == null)
            {
                return;
            }

            if (keyboard.qKey.wasPressedThisFrame)
            {
                Volley();
            }
            else if (keyboard.eKey.wasPressedThisFrame)
            {
                Rally();
            }
            else if (keyboard.rKey.wasPressedThisFrame)
            {
                Ultimate();
            }
        }

        public void Volley()
        {
            if (_hero != null)
            {
                _hero.CastVolley();
            }
        }

        public void Rally()
        {
            if (_hero != null)
            {
                _hero.CastRally();
            }
        }

        public void Ultimate()
        {
            if (_hero != null)
            {
                _hero.CastUltimate();
            }
        }

        /// <summary>
        /// القرص يمتلئ من الأسفل، والزرّ يذهب لونه حتى يجهز. الكتابة عند
        /// التغيّر وحده: `fillAmount` يعيد بناء شبكة الصورة عند كل ضبط.
        /// </summary>
        private void Paint(int index, float readiness)
        {
            if (Mathf.Abs(readiness - _shown[index]) < 0.01f)
            {
                return;
            }

            _shown[index] = readiness;
            _fill[index].fillAmount = readiness;
            _back[index].color = readiness >= 1f ? panelColor : chargingColor;
            _fill[index].color = readiness >= 1f ? readyColor : new Color(readyColor.r * 0.55f,
                readyColor.g * 0.5f, readyColor.b * 0.42f, 0.85f);
        }

        /// <summary>عدّاد العودة: الرقم الوحيد الذي ينتظره اللاعب بلا فعل (§5).</summary>
        private void PaintSpirit()
        {
            bool spirit = _hero.State == HeroState.Spirit;
            if (spirit != _spiritOpen)
            {
                _spiritOpen = spirit;
                _spiritPanel.SetActive(spirit);
            }

            if (!spirit)
            {
                return;
            }

            int seconds = Mathf.CeilToInt(_hero.SpiritLeft);
            if (seconds == _shownSpirit)
            {
                return;
            }

            _shownSpirit = seconds;
            _spiritSeconds.SetCharArray(_digits, 0, ArabicNumber.Write(seconds, _digits, 0));
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: AbilityBar يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            _fill = new Image[3];
            _back = new Image[3];

            // **عادت القدرات يميناً كما تضع §7** بعد أن بُنيت العصا العائمة
            // فصار اليسار لها. والأزرار من المرساة اليمنى إلى اليسار: أوّلها
            // أقرب إلى الإبهام، وهي «رشقة الفجر» أكثرها استعمالاً.
            //
            // والصفّ في الأسفل (y = 24) وزرّا الأوامر والبناء فوقه (y = 170)،
            // فقوسُ الأوامر يفتح من هناك صاعداً ولا يقع على القدرات.
            MakeButton(parent, 0, LocKeys.AbilityVolley, "Q", -24f, 24f, Volley);
            MakeButton(parent, 1, LocKeys.AbilityRally, "E", -154f, 24f, Rally);
            MakeButton(parent, 2, LocKeys.AbilityUltimate, "R", -284f, 24f, Ultimate);

            RectTransform spirit = MakeRect("SpiritPanel", parent,
                new Vector2(0.5f, 0.5f), new Vector2(0f, -40f), new Vector2(460f, 96f));

            Image background = spirit.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = false;

            Label("Caption", spirit, LocKeys.SpiritWait, 28f, spiritColor,
                new Vector2(1f, 0.5f), new Vector2(-18f, 0f), new Vector2(300f, 44f),
                TextAlignmentOptions.MidlineRight);

            _spiritSeconds = MakeText("Seconds", spirit, 40f, inkColor,
                new Vector2(0f, 0.5f), new Vector2(18f, 0f), new Vector2(110f, 52f),
                TextAlignmentOptions.MidlineLeft);

            _spiritPanel = spirit.gameObject;
            _spiritPanel.SetActive(false);

            // الاختيار محفوظ: من قلب التحكّم مرّةً يجده مقلوباً في كل جولة
            ApplyHandedness();
        }

        /// <summary>
        /// مستطيلات أزرار القدرات — تقرؤها العصا الافتراضية فلا تنشأ تحت
        /// إصبعٍ يضغط قدرة. القراءة من هنا لا بالبحث في المشهد بالاسم:
        /// إعادةُ تسميةٍ لا تُكسر ما لا يعتمد على الأسماء.
        /// </summary>
        public RectTransform[] TouchTargets()
        {
            RectTransform[] rects = new RectTransform[_back.Length];
            for (int i = 0; i < _back.Length; i++)
            {
                rects[i] = _back[i] != null
                    ? _back[i].GetComponent<RectTransform>()
                    : null;
            }

            return rects;
        }

        private void MakeButton(Transform parent, int index, string captionKey, string hotkey,
            float x, float y, UnityEngine.Events.UnityAction action)
        {
            RectTransform rect = MakeRect("Ability_" + index, parent,
                new Vector2(1f, 0f), new Vector2(x, y), new Vector2(122f, 122f));

            _mirrorRoots.Add(rect);

            Image back = rect.gameObject.AddComponent<Image>();
            back.color = chargingColor;
            back.raycastTarget = true;
            _back[index] = back;

            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = back;
            button.onClick.AddListener(action);

            RectTransform fillRect = MakeRect("Fill", rect,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(110f, 110f));

            Image fill = fillRect.gameObject.AddComponent<Image>();
            fill.color = readyColor;
            fill.raycastTarget = false;
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Vertical;
            fill.fillOrigin = (int)Image.OriginVertical.Bottom;
            fill.fillAmount = 0f;
            _fill[index] = fill;

            Label("Caption", rect, captionKey, 22f, inkColor,
                new Vector2(0.5f, 0.5f), new Vector2(0f, -6f), new Vector2(116f, 60f),
                TextAlignmentOptions.Midline);

            // حرف المفتاح صغيراً في الزاوية: يعلّم لاعب الحاسوب بلا أن يزاحم
            TextMeshProUGUI key = MakeText("Hotkey", rect, 18f, inkColor,
                new Vector2(0f, 1f), new Vector2(8f, -4f), new Vector2(34f, 26f),
                TextAlignmentOptions.Midline);
            key.text = hotkey;
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
            text.textWrappingMode = TextWrappingModes.Normal;
            return text;
        }
    }
}
