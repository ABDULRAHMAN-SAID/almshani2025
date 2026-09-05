using System.Collections.Generic;
using Dawnkeep.Flow;
using Dawnkeep.Localization;
using Dawnkeep.Meta;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// لوحة ما بين الجولات (§16): المستوى، والذهب، والنجوم، وشجرة الأبحاث
    /// بفروعها الأربعة.
    ///
    /// تُفتح **بعد شاشة النتيجة** لا قبلها: النتيجة تقول ماذا جرى، وهذه تقول
    /// ماذا كسبتَ منه — وعرضُهما معاً يجعل الفوز والشراء لحظةً واحدة مزدحمة.
    ///
    /// و§16 توجب **عرض الفرق قبل الشراء وبعده**، فكل عقدةٍ تقول قيمتَها
    /// الآن وقيمتَها لو اشتُريت.
    /// </summary>
    [DisallowMultipleComponent]
    public class MetaPanel : MonoBehaviour
    {
        private const int VisibleNodes = 8;

        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.94f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.153f, 0.165f, 0.192f, 0.94f);
        [SerializeField] private Color lockedColor = new Color(0.098f, 0.106f, 0.122f, 0.92f);

        private Progress _progress;
        private StageOutcome _outcome;
        private GameObject _root;
        private TextMeshProUGUI _header;
        private Image[] _branchHead;
        private RectTransform[] _row;
        private Image[] _rowFace;
        private TextMeshProUGUI[] _rowName;
        private TextMeshProUGUI[] _rowDelta;
        private TextMeshProUGUI[] _rowCost;
        private Image _respecFace;
        private GameObject _openButton;

        private readonly List<ResearchNode> _shown = new List<ResearchNode>(VisibleNodes);
        private int _branch;
        private readonly char[] _digits = new char[ArabicNumber.MaxLength];

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
            _progress = Progress.Instance;
            if (_progress != null)
            {
                _progress.Changed += Refresh;
            }

            _outcome = StageOutcome.Instance;
            if (_outcome != null)
            {
                _outcome.Resolved += OnResolved;
            }

            Loc.Changed += Refresh;
            Refresh();
        }

        private void OnDestroy()
        {
            if (_progress != null)
            {
                _progress.Changed -= Refresh;
            }

            if (_outcome != null)
            {
                _outcome.Resolved -= OnResolved;
            }

            Loc.Changed -= Refresh;
        }

        /// <summary>
        /// انتهت المرحلة: يظهر زرّ «الأبحاث» بجانب شاشة النتيجة. اللوحة نفسها
        /// لا تُفتح تلقائياً — النتيجة أوّل ما يُقرأ.
        /// </summary>
        private void OnResolved(StageResult result)
        {
            if (_openButton != null && _progress != null && _progress.ResearchUnlocked)
            {
                _openButton.SetActive(true);
            }
        }

        /// <summary>
        /// يُظهر زرّ الأبحاث بلا انتظار نتيجةِ مرحلة. تستعمله القائمة الرئيسة:
        /// هناك لا نتيجةَ تسبقه، والأبحاث هي نصف ما يُفعل بين الجولات.
        /// </summary>
        public void Reveal()
        {
            if (_openButton != null)
            {
                _openButton.SetActive(true);
            }
        }

        public void Open()
        {
            _root.SetActive(true);
            Refresh();
        }

        public void Close()
        {
            _root.SetActive(false);
        }

        private void ShowBranch(int index)
        {
            _branch = Mathf.Clamp(index, 0, 3);
            Refresh();
        }

        private void Buy(int row)
        {
            if (_progress == null || row < 0 || row >= _shown.Count)
            {
                return;
            }

            _progress.Buy(_shown[row]);
        }

        private void Respec()
        {
            if (_progress != null)
            {
                _progress.Respec();
            }
        }

        private void Refresh()
        {
            if (_progress == null)
            {
                _progress = Progress.Instance;
                if (_progress == null)
                {
                    return;
                }
            }

            int inside;
            int need;
            _progress.AccountBar(out inside, out need);

            _header.text = Loc.Format(LocKeys.MetaHeader,
                Digits(_progress.AccountLevel), Digits(_progress.Gold))
                + "  ·  " + Loc.Format(LocKeys.MetaShards, Digits(_progress.Shards));

            for (int i = 0; i < _branchHead.Length; i++)
            {
                _branchHead[i].color = i == _branch ? goldColor * 0.34f : dimColor;
            }

            _shown.Clear();
            IReadOnlyList<ResearchNode> all = _progress.Nodes;
            for (int i = 0; i < all.Count && _shown.Count < VisibleNodes; i++)
            {
                if (all[i] != null && (int)all[i].Branch == _branch)
                {
                    _shown.Add(all[i]);
                }
            }

            for (int i = 0; i < VisibleNodes; i++)
            {
                bool used = i < _shown.Count;
                _row[i].gameObject.SetActive(used);
                if (!used)
                {
                    continue;
                }

                Paint(i, _shown[i]);
            }

            if (_respecFace != null)
            {
                bool can = _progress.Settings != null
                    && _progress.Gold >= _progress.Settings.RespecGold;
                _respecFace.color = can ? dimColor : lockedColor;
            }
        }

        /// <summary>
        /// يرسم صفّ عقدة: اسمُها، والفرق **قبل وبعد** (§16)، وثمنُها.
        /// </summary>
        private void Paint(int row, ResearchNode node)
        {
            int rank = _progress.RankOf(node);
            bool maxed = rank >= node.Ranks;
            bool locked = _progress.AccountLevel < node.UnlockLevel;
            bool capped = !maxed && _progress.Ceiling(node, rank + 1);
            bool can = _progress.CanBuy(node);

            _rowName[row].text = Loc.Shape(node.DisplayName) + "  "
                + Loc.Format(LocKeys.MetaRank, Digits(rank), Digits(node.Ranks));

            if (maxed)
            {
                _rowDelta[row].text = Loc.Text(LocKeys.MetaMaxed);
            }
            else if (locked)
            {
                _rowDelta[row].text = Loc.Format(LocKeys.MetaLocked, Digits(node.UnlockLevel));
            }
            else if (capped)
            {
                _rowDelta[row].text = Loc.Text(LocKeys.MetaCapped);
            }
            else if (node.Stat == Dawnkeep.Boons.BoonStat.None)
            {
                // عقدةٌ لا تحرّك رقماً (شحنة النور): وصفُها هو فرقُها
                _rowDelta[row].text = Loc.Shape(node.Summary);
            }
            else
            {
                // الفرق قبل وبعد، بالمئة — §16 توجب عرضه قبل الشراء
                _rowDelta[row].text = Loc.Format(LocKeys.MetaDelta,
                    Percent(node.MultiplierAt(rank)),
                    Percent(node.MultiplierAt(rank + 1)));
            }

            _rowCost[row].text = maxed || locked || capped
                ? string.Empty
                : Loc.Format(LocKeys.MetaCost,
                    Digits(node.GoldFor(rank)), Digits(node.StarsPerRank));

            _rowFace[row].color = can ? dimColor : lockedColor;
            _rowName[row].color = maxed ? goldColor : (can ? inkColor : lockedColor * 3f);
        }

        private string Percent(float multiplier)
        {
            int points = Mathf.RoundToInt((multiplier - 1f) * 100f);
            int length = ArabicNumber.Write(Mathf.Abs(points), _digits, 0);
            string body = new string(_digits, 0, length) + "٪";
            return points < 0 ? "−" + body : "+" + body;
        }

        private string Digits(int value)
        {
            int length = ArabicNumber.WriteShort(value, _digits, 0);
            return new string(_digits, 0, length);
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: MetaPanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            // زرّ الفتح: يظهر بعد النتيجة، تحت لوحتها
            RectTransform open = MakeRect("MetaOpen", parent,
                new Vector2(0.5f, 0.5f), new Vector2(0f, -196f), new Vector2(260f, 56f));

            Image openFace = open.gameObject.AddComponent<Image>();
            openFace.color = new Color(goldColor.r * 0.30f, goldColor.g * 0.26f,
                goldColor.b * 0.18f, 0.94f);
            openFace.raycastTarget = true;

            Button openAction = open.gameObject.AddComponent<Button>();
            openAction.targetGraphic = openFace;
            openAction.onClick.AddListener(Open);

            TextMeshProUGUI openCaption = MakeText("Caption", open, 26f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(240f, 42f),
                TextAlignmentOptions.Midline);
            openCaption.gameObject.AddComponent<LocalizedLabel>()
                .Bind(openCaption, LocKeys.MetaOpen);

            _openButton = open.gameObject;
            _openButton.SetActive(false);

            // اللوحة نفسها
            RectTransform rect = MakeRect("MetaPanel", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1000f, 560f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            _header = MakeText("Header", rect, 28f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -16f), new Vector2(940f, 44f),
                TextAlignmentOptions.Midline);

            string[] branchKeys =
            {
                LocKeys.BranchEconomy, LocKeys.BranchFortification,
                LocKeys.BranchCommand, LocKeys.BranchDawncraft,
            };

            _branchHead = new Image[branchKeys.Length];
            for (int i = 0; i < branchKeys.Length; i++)
            {
                int captured = i;
                RectTransform head = MakeRect("Branch_" + i, rect,
                    new Vector2(1f, 1f), new Vector2(-20f - (i * 236f), -68f),
                    new Vector2(228f, 48f));

                _branchHead[i] = head.gameObject.AddComponent<Image>();
                _branchHead[i].color = dimColor;
                _branchHead[i].raycastTarget = true;

                Button action = head.gameObject.AddComponent<Button>();
                action.targetGraphic = _branchHead[i];
                action.onClick.AddListener(delegate { ShowBranch(captured); });

                TextMeshProUGUI caption = MakeText("Caption", head, 22f, inkColor,
                    new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(220f, 36f),
                    TextAlignmentOptions.Midline);
                caption.gameObject.AddComponent<LocalizedLabel>().Bind(caption, branchKeys[i]);
            }

            _row = new RectTransform[VisibleNodes];
            _rowFace = new Image[VisibleNodes];
            _rowName = new TextMeshProUGUI[VisibleNodes];
            _rowDelta = new TextMeshProUGUI[VisibleNodes];
            _rowCost = new TextMeshProUGUI[VisibleNodes];

            for (int i = 0; i < VisibleNodes; i++)
            {
                int captured = i;
                _row[i] = MakeRect("Node_" + i, rect,
                    new Vector2(1f, 1f), new Vector2(-20f, -132f - (i * 50f)),
                    new Vector2(956f, 44f));

                _rowFace[i] = _row[i].gameObject.AddComponent<Image>();
                _rowFace[i].color = dimColor;
                _rowFace[i].raycastTarget = true;

                Button action = _row[i].gameObject.AddComponent<Button>();
                action.targetGraphic = _rowFace[i];
                action.onClick.AddListener(delegate { Buy(captured); });

                _rowName[i] = MakeText("Name", _row[i], 22f, inkColor,
                    new Vector2(1f, 0.5f), new Vector2(-12f, 0f), new Vector2(360f, 36f),
                    TextAlignmentOptions.MidlineRight);

                _rowDelta[i] = MakeText("Delta", _row[i], 21f, goldColor,
                    new Vector2(1f, 0.5f), new Vector2(-386f, 0f), new Vector2(340f, 36f),
                    TextAlignmentOptions.Midline);

                _rowCost[i] = MakeText("Cost", _row[i], 21f, inkColor,
                    new Vector2(0f, 0.5f), new Vector2(12f, 0f), new Vector2(230f, 36f),
                    TextAlignmentOptions.MidlineLeft);
            }

            RectTransform respec = MakeRect("Respec", rect,
                new Vector2(1f, 0f), new Vector2(-20f, 16f), new Vector2(300f, 48f));

            _respecFace = respec.gameObject.AddComponent<Image>();
            _respecFace.color = dimColor;
            _respecFace.raycastTarget = true;

            Button respecAction = respec.gameObject.AddComponent<Button>();
            respecAction.targetGraphic = _respecFace;
            respecAction.onClick.AddListener(Respec);

            TextMeshProUGUI respecCaption = MakeText("Caption", respec, 22f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(290f, 36f),
                TextAlignmentOptions.Midline);
            respecCaption.gameObject.AddComponent<LocalizedLabel>()
                .Bind(respecCaption, LocKeys.MetaRespec);

            RectTransform close = MakeRect("Close", rect,
                new Vector2(0f, 0f), new Vector2(20f, 16f), new Vector2(220f, 48f));

            Image closeFace = close.gameObject.AddComponent<Image>();
            closeFace.color = dimColor;
            closeFace.raycastTarget = true;

            Button closeAction = close.gameObject.AddComponent<Button>();
            closeAction.targetGraphic = closeFace;
            closeAction.onClick.AddListener(Close);

            TextMeshProUGUI closeCaption = MakeText("Caption", close, 22f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(210f, 36f),
                TextAlignmentOptions.Midline);
            closeCaption.gameObject.AddComponent<LocalizedLabel>()
                .Bind(closeCaption, LocKeys.MetaClose);

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
            text.textWrappingMode = TextWrappingModes.NoWrap;
            return text;
        }
    }
}
