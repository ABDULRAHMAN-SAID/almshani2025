using Dawnkeep.Boons;
using Dawnkeep.Localization;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// لوحة اختيار البركة (§15): ثلاث بطاقات وزرّ إعادةٍ واحد.
    ///
    /// **توقف الزمن**: الاختيار قرارٌ يُقارَن فيه بين ثلاثة، وموجةٌ تجري تحت
    /// اللوحة تجعله ضغطةً على أوّل ما تقع عليه العين. وتُفتح في الاستراحة
    /// (§4) فلا يُقتطع من الاشتباك شيء.
    ///
    /// وتبقى مفتوحة حتى يُختار: بركةٌ تُغلق بلا اختيار بركةٌ ضائعة، ولا سبيل
    /// إلى استرجاعها في هذه الجولة.
    /// </summary>
    [DisallowMultipleComponent]
    public class BoonPanel : MonoBehaviour
    {
        private const int Cards = 3;

        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.92f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.153f, 0.165f, 0.192f, 0.94f);

        private BoonDealer _dealer;
        private GameObject _root;
        private RectTransform[] _card;
        private Image[] _cardFace;
        private TextMeshProUGUI[] _cardName;
        private TextMeshProUGUI[] _cardSummary;
        private TextMeshProUGUI[] _cardCategory;
        private GameObject _rerollButton;
        private float _restoreScale = 1f;

        /// <summary>هل اللوحة مفتوحة؟ يقرؤها الإدخال ليتوقّف عن اللمس.</summary>
        public bool IsOpen { get { return _root != null && _root.activeSelf; } }

        public void Configure(TMP_FontAsset value)
        {
            if (value != null)
            {
                font = value;
            }
        }

        private void Awake()
        {
            Build();
        }

        private void Start()
        {
            _dealer = BoonDealer.Instance;
            if (_dealer != null)
            {
                _dealer.Changed += Refresh;
            }

            Loc.Changed += Refresh;
        }

        private void OnDestroy()
        {
            if (_dealer != null)
            {
                _dealer.Changed -= Refresh;
            }

            Loc.Changed -= Refresh;
        }

        /// <summary>يُعيد رسم اللوحة على حال المُوزِّع، ويفتحها أو يغلقها.</summary>
        private void Refresh()
        {
            if (_dealer == null)
            {
                _dealer = BoonDealer.Instance;
                if (_dealer == null)
                {
                    return;
                }
            }

            System.Collections.Generic.IReadOnlyList<BoonDefinition> offer = _dealer.Cards;
            if (offer.Count == 0)
            {
                Close();
                return;
            }

            for (int i = 0; i < Cards; i++)
            {
                bool used = i < offer.Count;
                _card[i].gameObject.SetActive(used);
                if (!used)
                {
                    continue;
                }

                BoonDefinition boon = offer[i];
                _cardName[i].text = Loc.Shape(boon.DisplayName);
                _cardSummary[i].text = Loc.Shape(boon.Summary);
                _cardCategory[i].text = Loc.Text(CategoryKey(boon.Category));
            }

            _rerollButton.SetActive(_dealer.CanReroll);
            Open();
        }

        private void Open()
        {
            if (IsOpen)
            {
                return;
            }

            _restoreScale = Time.timeScale > 0f ? Time.timeScale : 1f;
            Time.timeScale = 0f;
            _root.SetActive(true);
        }

        private void Close()
        {
            if (!IsOpen)
            {
                return;
            }

            _root.SetActive(false);
            Time.timeScale = _restoreScale;
        }

        private void Pick(int index)
        {
            if (_dealer == null)
            {
                return;
            }

            System.Collections.Generic.IReadOnlyList<BoonDefinition> offer = _dealer.Cards;
            if (index < 0 || index >= offer.Count)
            {
                return;
            }

            _dealer.Choose(offer[index]);
        }

        private void Reroll()
        {
            if (_dealer != null)
            {
                _dealer.Reroll();
            }
        }

        private static string CategoryKey(BoonCategory category)
        {
            switch (category)
            {
                case BoonCategory.Hero: return LocKeys.BoonHero;
                case BoonCategory.Army: return LocKeys.BoonArmy;
                case BoonCategory.Towers: return LocKeys.BoonTowers;
                case BoonCategory.Economy: return LocKeys.BoonEconomy;
                default: return LocKeys.BoonLight;
            }
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: BoonPanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            RectTransform rect = MakeRect("BoonPanel", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1120f, 480f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            TextMeshProUGUI title = MakeText("Title", rect, 44f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -18f), new Vector2(1000f, 62f),
                TextAlignmentOptions.Midline);
            title.gameObject.AddComponent<LocalizedLabel>().Bind(title, LocKeys.BoonTitle);

            _card = new RectTransform[Cards];
            _cardFace = new Image[Cards];
            _cardName = new TextMeshProUGUI[Cards];
            _cardSummary = new TextMeshProUGUI[Cards];
            _cardCategory = new TextMeshProUGUI[Cards];

            // البطاقات من اليمين إلى اليسار: اللوحة عربية، والأولى هي اليمنى
            for (int i = 0; i < Cards; i++)
            {
                int captured = i;
                _card[i] = MakeRect("Card_" + i, rect,
                    new Vector2(1f, 0.5f), new Vector2(-30f - (i * 350f), -14f),
                    new Vector2(330f, 300f));

                _cardFace[i] = _card[i].gameObject.AddComponent<Image>();
                _cardFace[i].color = dimColor;
                _cardFace[i].raycastTarget = true;

                Button action = _card[i].gameObject.AddComponent<Button>();
                action.targetGraphic = _cardFace[i];
                action.onClick.AddListener(delegate { Pick(captured); });

                _cardCategory[i] = MakeText("Category", _card[i], 22f, goldColor,
                    new Vector2(0.5f, 1f), new Vector2(0f, -14f), new Vector2(290f, 32f),
                    TextAlignmentOptions.Midline);

                _cardName[i] = MakeText("Name", _card[i], 34f, inkColor,
                    new Vector2(0.5f, 1f), new Vector2(0f, -54f), new Vector2(300f, 52f),
                    TextAlignmentOptions.Midline);

                _cardSummary[i] = MakeText("Summary", _card[i], 22f, inkColor,
                    new Vector2(0.5f, 0.5f), new Vector2(0f, -22f), new Vector2(290f, 170f),
                    TextAlignmentOptions.Top);
            }

            RectTransform reroll = MakeRect("Reroll", rect,
                new Vector2(0.5f, 0f), new Vector2(0f, 18f), new Vector2(300f, 54f));

            Image rerollFace = reroll.gameObject.AddComponent<Image>();
            rerollFace.color = new Color(goldColor.r * 0.30f, goldColor.g * 0.26f,
                goldColor.b * 0.18f, 0.94f);
            rerollFace.raycastTarget = true;

            Button rerollAction = reroll.gameObject.AddComponent<Button>();
            rerollAction.targetGraphic = rerollFace;
            rerollAction.onClick.AddListener(Reroll);

            TextMeshProUGUI rerollCaption = MakeText("Caption", reroll, 24f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(280f, 40f),
                TextAlignmentOptions.Midline);
            rerollCaption.gameObject.AddComponent<LocalizedLabel>()
                .Bind(rerollCaption, LocKeys.BoonReroll);

            _rerollButton = reroll.gameObject;
            _root = rect.gameObject;
            _root.SetActive(false);
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
