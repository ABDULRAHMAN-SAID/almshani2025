using Dawnkeep.Building;
using Dawnkeep.Economy;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// بطاقات البناء: **ثلاث في المرّة الواحدة** (§10)، تظهر عند لمس عقدة.
    ///
    /// ثلاث لا عشر: الركيزة الأولى «قرار اقتصادي **قصير المدى**»، وقائمةٌ من
    /// عشرين خياراً تحوّله إلى جدول بيانات. ولكل بطاقة اسمها وثمنها ووظيفتها
    /// ورقمها المميّز والفرق عن القائم — وهي الحقول التي تشترطها §10 نصّاً.
    ///
    /// تُبنى قطعها في `Awake` وتُملأ عند الفتح: بناء ثلاث بطاقات عند كل لمسة
    /// يولّد قمامة، وملء نصوصها لا.
    /// </summary>
    [DisallowMultipleComponent]
    public class BuildPanel : MonoBehaviour
    {
        private const int CardCount = 3;

        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.92f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color denyColor = new Color(0.851f, 0.294f, 0.267f);
        [SerializeField] private Color sellColor = new Color(0.851f, 0.514f, 0.267f);

        private readonly BuildingDefinition[] _offers = new BuildingDefinition[CardCount];
        private readonly bool[] _isSell = new bool[CardCount];
        private readonly bool[] _isKeep = new bool[CardCount];

        private GameObject _root;
        private TextMeshProUGUI _header;
        private GameObject[] _cards;
        private Image[] _cardBack;
        private TextMeshProUGUI[] _name;
        private TextMeshProUGUI[] _cost;
        private TextMeshProUGUI[] _summary;
        private TextMeshProUGUI[] _stat;

        private BuildingDirector _director;
        private Treasury _treasury;
        private BuildNode _node;
        private Keep _keep;

        /// <summary>اللوحة مفتوحة الآن — يقرؤها آمر البناء فلا يفتح أخرى فوقها.</summary>
        public bool IsOpen { get { return _root != null && _root.activeSelf; } }

        private void Awake()
        {
            Build();
        }

        private void Start()
        {
            _director = BuildingDirector.Instance;
            _treasury = Treasury.Instance;
        }

        /// <summary>يفتح البطاقات لعقدة. يغلق نفسه إن لم يبقَ ما يُعرض.</summary>
        /// <summary>
        /// بطاقة قلب الحصن: بطاقة واحدة لا ثلاث — لأنّ الخيار واحد. وتقول ما
        /// **تفتحه** الترقية لا صحّتها وحدها: العقد هي ما يشتريه اللاعب فعلاً.
        /// </summary>
        public void OpenKeep(Keep keep)
        {
            if (keep == null || !keep.CanUpgrade)
            {
                Close();
                return;
            }

            if (_treasury == null)
            {
                _treasury = Treasury.Instance;
            }

            _node = null;
            _keep = keep;

            _isKeep[0] = true;
            _isSell[0] = false;
            _offers[0] = null;

            _cards[0].SetActive(true);
            _cardBack[0].color = panelColor;

            bool affordable = _treasury == null || _treasury.CanAfford(keep.NextTierCost);

            _name[0].text = ArabicShaper.Shape("رقِّ قلب الحصن");
            _name[0].color = goldColor;

            _cost[0].text = ArabicShaper.Shape(Digits(keep.NextTierCost) + " فضّة");
            _cost[0].color = affordable ? inkColor : denyColor;

            _summary[0].text = ArabicShaper.Shape(
                "المستوى " + Digits(keep.Tier + 1) + " يفتح عقد بناء جديدة.");

            _stat[0].text = ArabicShaper.Shape("صحّة "
                + Digits(Mathf.RoundToInt(keep.NextTierHealth))
                + Delta(Mathf.RoundToInt(keep.NextTierHealth), Mathf.RoundToInt(keep.MaxHealth)));
            _stat[0].color = inkColor;

            HideFrom(1);
            _header.text = ArabicShaper.Shape("قلب الحصن");
            _root.SetActive(true);
        }

        public void Open(BuildNode node)
        {
            if (node == null || !node.Unlocked)
            {
                Close();
                return;
            }

            _keep = null;

            if (_director == null)
            {
                _director = BuildingDirector.Instance;
            }

            if (_treasury == null)
            {
                _treasury = Treasury.Instance;
            }

            _node = node;
            int filled = node.IsEmpty ? FillFromCatalogue(node) : FillFromUpgrades(node);

            if (filled == 0)
            {
                Close();
                return;
            }

            _header.text = ArabicShaper.Shape(node.IsEmpty
                ? "ابنِ على " + NodeName(node.Kind)
                : "رقِّ أو بِع");

            _root.SetActive(true);
        }

        public void Close()
        {
            _node = null;
            _keep = null;
            for (int i = 0; i < CardCount; i++)
            {
                _isKeep[i] = false;
            }

            if (_root != null)
            {
                _root.SetActive(false);
            }
        }

        // ── ملء البطاقات ────────────────────────────────────────────────────

        /// <summary>عقدة خالية: أوّل ثلاثة مبانٍ يقبلها نوعها.</summary>
        private int FillFromCatalogue(BuildNode node)
        {
            int filled = 0;
            if (_director == null)
            {
                return 0;
            }

            BuildingDefinition[] catalogue = _director.Catalogue;
            if (catalogue.Length == 0)
            {
                return 0;
            }

            // المسح يبدأ من بذرة العقدة ويلتفّ: بلا هذا تعرض كل العقد الداخلية
            // أوّل ثلاثة تقبلها من الكتالوج، فلا تُبنى مسلّة ولا ورشة أبداً.
            int start = ((node.OfferSeed % catalogue.Length) + catalogue.Length) % catalogue.Length;

            for (int step = 0; step < catalogue.Length && filled < CardCount; step++)
            {
                BuildingDefinition def = catalogue[(start + step) % catalogue.Length];
                if (def == null || !def.Fits(node.Kind))
                {
                    continue;
                }

                _offers[filled] = def;
                _isSell[filled] = false;
                _isKeep[filled] = false;
                ShowCard(filled, def, null);
                filled++;
            }

            HideFrom(filled);
            return filled;
        }

        /// <summary>عقدة مشغولة: فروع الترقية، وبطاقة بيع أخيرة.</summary>
        private int FillFromUpgrades(BuildNode node)
        {
            Building current = node.Current;
            BuildingDefinition def = current.Definition;
            BuildingDefinition[] upgrades = def.Upgrades;

            int filled = 0;
            for (int i = 0; i < upgrades.Length && filled < CardCount - 1; i++)
            {
                if (upgrades[i] == null)
                {
                    continue;
                }

                _offers[filled] = upgrades[i];
                _isSell[filled] = false;
                _isKeep[filled] = false;
                ShowCard(filled, upgrades[i], def);
                filled++;
            }

            // البيع دائماً آخر بطاقة: مكانٌ ثابت لا يُضغط بالخطأ بدل الترقية
            _offers[filled] = null;
            _isSell[filled] = true;
            _isKeep[filled] = false;
            ShowSellCard(filled, current);
            filled++;

            HideFrom(filled);
            return filled;
        }

        private void ShowCard(int index, BuildingDefinition def, BuildingDefinition compareTo)
        {
            _cards[index].SetActive(true);

            bool affordable = _treasury == null || _treasury.CanAfford(def.Cost);
            _cardBack[index].color = panelColor;

            _name[index].text = ArabicShaper.Shape(def.DisplayName);
            _name[index].color = goldColor;

            _cost[index].text = ArabicShaper.Shape(Digits(def.Cost) + " فضّة");
            _cost[index].color = affordable ? inkColor : denyColor;

            _summary[index].text = ArabicShaper.Shape(def.Summary);
            _stat[index].text = ArabicShaper.Shape(StatLine(def, compareTo));
            _stat[index].color = inkColor;
        }

        private void ShowSellCard(int index, Building current)
        {
            _cards[index].SetActive(true);
            _cardBack[index].color = new Color(panelColor.r + 0.06f, panelColor.g + 0.03f,
                panelColor.b + 0.02f, panelColor.a);

            float fraction = _treasury != null ? _treasury.SellFraction : 0.7f;
            int back = Mathf.RoundToInt(current.TotalPaid * fraction);

            _name[index].text = ArabicShaper.Shape("بِع");
            _name[index].color = sellColor;

            _cost[index].text = ArabicShaper.Shape("+" + Digits(back) + " فضّة");
            _cost[index].color = sellColor;

            _summary[index].text = ArabicShaper.Shape(
                "يُهدم " + current.Definition.DisplayName + " ويُستردّ "
                + Digits(Mathf.RoundToInt(fraction * 100f)) + "٪ مِمّا دُفع فيه.");

            _stat[index].text = ArabicShaper.Shape("العقدة تعود خالية");
            _stat[index].color = sellColor;
        }

        /// <summary>
        /// السطر المميّز: الرقم الذي يقارن به اللاعب، ومعه الفرق عن القائم —
        /// وهو ما تشترطه §10. بطاقةٌ بلا فرقٍ تُجبر اللاعب على الحساب الذهني.
        /// </summary>
        private static string StatLine(BuildingDefinition def, BuildingDefinition compareTo)
        {
            switch (def.Role)
            {
                case BuildingRole.Economy:
                    return "دخل الفجر " + Digits(def.DawnIncome)
                        + Delta(def.DawnIncome, compareTo != null ? compareTo.DawnIncome : 0);

                case BuildingRole.Tower:
                    return "ضرر/ث " + Digits(Mathf.RoundToInt(def.DamagePerSecond))
                        + Delta(Mathf.RoundToInt(def.DamagePerSecond),
                            compareTo != null ? Mathf.RoundToInt(compareTo.DamagePerSecond) : 0)
                        + " · مدى " + Digits(Mathf.RoundToInt(def.Range));

                case BuildingRole.Garrison:
                    return Digits(def.GuardCount) + " حرّاس"
                        + Delta(def.GuardCount, compareTo != null ? compareTo.GuardCount : 0);

                default:
                    return "صحّة " + Digits(Mathf.RoundToInt(def.MaxHealth))
                        + Delta(Mathf.RoundToInt(def.MaxHealth),
                            compareTo != null ? Mathf.RoundToInt(compareTo.MaxHealth) : 0);
            }
        }

        private static string Delta(int now, int before)
        {
            if (before <= 0 || now == before)
            {
                return string.Empty;
            }

            int diff = now - before;
            return diff > 0 ? " (+" + Digits(diff) + ")" : " (−" + Digits(-diff) + ")";
        }

        /// <summary>عدد بالأرقام العربية الهندية — سلسلة لا مخزن، فالبطاقات تُملأ عند الفتح لا كل إطار.</summary>
        private static string Digits(int value)
        {
            char[] buffer = new char[ArabicNumber.MaxLength];
            int length = ArabicNumber.Write(value, buffer, 0);
            return new string(buffer, 0, length);
        }

        private static string NodeName(NodeKind kind)
        {
            switch (kind)
            {
                case NodeKind.Gate: return "عقدة البوّابة";
                case NodeKind.Outer: return "عقدة خارجية";
                case NodeKind.Economy: return "عقدة اقتصاد";
                case NodeKind.Beacon: return "عقدة منارة";
                default: return "عقدة داخلية";
            }
        }

        private void HideFrom(int index)
        {
            for (int i = index; i < CardCount; i++)
            {
                _cards[i].SetActive(false);
            }
        }

        // ── الضغط ───────────────────────────────────────────────────────────

        private void Choose(int index)
        {
            if (_director == null || !_director.CanBuildNow)
            {
                Close();      // بدأ الاشتباك بينما البطاقات مفتوحة (§10)
                return;
            }

            if (_isKeep[index])
            {
                Keep keep = _keep;
                if (keep != null && keep.Upgrade())
                {
                    Close();
                }
                else if (keep != null)
                {
                    OpenKeep(keep);      // لم تكفِ الفضّة: يحمرّ الثمن ويبقى مفتوحاً
                }

                return;
            }

            if (_node == null)
            {
                Close();
                return;
            }

            if (_isSell[index])
            {
                _director.Sell(_node.Current);
                Close();
                return;
            }

            BuildingDefinition def = _offers[index];
            if (def == null)
            {
                Close();
                return;
            }

            bool done = _node.IsEmpty
                ? _director.Place(_node, def) != null
                : _director.Upgrade(_node.Current, def);

            if (done)
            {
                Close();
                return;
            }

            // فشل لعدم كفاية الفضّة: تبقى البطاقات مفتوحة ويحمرّ الثمن، فيرى
            // اللاعب سبب الرفض بدل أن تُغلق اللوحة في وجهه بلا تفسير.
            Open(_node);
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: BuildPanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            const float CardW = 300f;
            const float CardH = 200f;
            const float Gap = 16f;

            RectTransform root = MakeRect("BuildCards", parent,
                new Vector2(0.5f, 0f), new Vector2(0f, 92f),
                new Vector2((CardW * CardCount) + (Gap * (CardCount - 1)), CardH + 54f));

            _root = root.gameObject;

            _header = MakeText("Header", root, 26f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, 0f), new Vector2(620f, 40f),
                TextAlignmentOptions.Midline);

            _cards = new GameObject[CardCount];
            _cardBack = new Image[CardCount];
            _name = new TextMeshProUGUI[CardCount];
            _cost = new TextMeshProUGUI[CardCount];
            _summary = new TextMeshProUGUI[CardCount];
            _stat = new TextMeshProUGUI[CardCount];

            for (int i = 0; i < CardCount; i++)
            {
                // البطاقة الأولى يميناً: ترتيب القراءة العربي
                float offset = ((CardCount - 1) * 0.5f - i) * (CardW + Gap);

                RectTransform card = MakeRect("Card_" + i, root,
                    new Vector2(0.5f, 0f), new Vector2(offset, 0f), new Vector2(CardW, CardH));

                Image back = card.gameObject.AddComponent<Image>();
                back.color = panelColor;
                back.raycastTarget = true;

                Button button = card.gameObject.AddComponent<Button>();
                button.targetGraphic = back;

                int captured = i;      // لا يُلتقط `i` نفسه: يصير CardCount بعد الحلقة
                button.onClick.AddListener(delegate { Choose(captured); });

                _cards[i] = card.gameObject;
                _cardBack[i] = back;

                _name[i] = MakeText("Name", card, 26f, goldColor,
                    new Vector2(1f, 1f), new Vector2(-14f, -10f), new Vector2(180f, 36f),
                    TextAlignmentOptions.MidlineRight);

                _cost[i] = MakeText("Cost", card, 22f, inkColor,
                    new Vector2(0f, 1f), new Vector2(14f, -10f), new Vector2(120f, 36f),
                    TextAlignmentOptions.MidlineLeft);

                _summary[i] = MakeText("Summary", card, 20f, inkColor,
                    new Vector2(0.5f, 0.5f), new Vector2(0f, -4f), new Vector2(CardW - 28f, 86f),
                    TextAlignmentOptions.TopRight);
                _summary[i].textWrappingMode = TextWrappingModes.Normal;

                _stat[i] = MakeText("Stat", card, 22f, inkColor,
                    new Vector2(0.5f, 0f), new Vector2(0f, 12f), new Vector2(CardW - 28f, 34f),
                    TextAlignmentOptions.MidlineRight);
            }

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
            text.textWrappingMode = TextWrappingModes.NoWrap;
            return text;
        }
    }
}
