using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Dawnkeep.Doctrine;
using Dawnkeep.Localization;

namespace Dawnkeep.UI
{
    /// <summary>
    /// شاشة العقائد (§18): فتحتان، وقائمةُ العشرين بشرط فتح كلٍّ.
    ///
    /// **المقفلة تُعرَض** ولا تُخفى، ومعها شرطُها ومبلغُ اللاعب منه: «انتصارات
    /// ٢ من ٣». عقيدةٌ مخفيّةٌ حتى تُفتح لا يسعى إليها أحد، و§18 تبني
    /// الفتح على الإنجاز — والإنجازُ يُسعى إليه إن عُلم.
    /// </summary>
    [DisallowMultipleComponent]
    public class DoctrinePanel : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.94f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.153f, 0.165f, 0.192f, 0.94f);
        [SerializeField] private Color lockedColor = new Color(0.098f, 0.106f, 0.122f, 0.92f);

        /// <summary>خمس بطاقاتٍ في الصفحة، بمقاس شاشة التجهيز نفسه.</summary>
        public const int Rows = 5;

        private GameObject _root;
        private TextMeshProUGUI _header;
        private TextMeshProUGUI _notice;

        private Image[] _slotFace;
        private TextMeshProUGUI[] _slotName;

        private readonly Image[] _rowFace = new Image[Rows];
        private readonly TextMeshProUGUI[] _rowName = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowSummary = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowState = new TextMeshProUGUI[Rows];
        private readonly DoctrineDefinition[] _rowCard = new DoctrineDefinition[Rows];

        private int _slot;
        private int _page;

        private readonly char[] _digits = new char[12];

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
            DoctrineBook book = DoctrineBook.Instance;
            if (book != null)
            {
                book.Changed += Refresh;
            }

            Refresh();
        }

        private void OnDestroy()
        {
            DoctrineBook book = DoctrineBook.Instance;
            if (book != null)
            {
                book.Changed -= Refresh;
            }
        }

        public void Open()
        {
            if (_root != null)
            {
                _root.SetActive(true);
            }

            Refresh();
        }

        public void Close()
        {
            if (_root != null)
            {
                _root.SetActive(false);
            }
        }

        // ── الأفعال ─────────────────────────────────────────────────────────

        private void ChooseSlot(int index)
        {
            // ضغطُ فتحةٍ مختارةٍ يفرّغها: طريقٌ للنزع بلا زرٍّ ثالث
            if (_slot == index)
            {
                DoctrineBook book = DoctrineBook.Instance;
                if (book != null)
                {
                    book.Clear(index);
                }
            }

            _slot = index;
            Refresh();
        }

        private void Choose(int row)
        {
            DoctrineBook book = DoctrineBook.Instance;
            DoctrineDefinition card = _rowCard[row];
            if (book == null || card == null)
            {
                return;
            }

            if (!book.Unlocked(card))
            {
                Notice(LocKeys.DoctrineLocked);
                return;
            }

            if (!book.Equip(_slot, card))
            {
                // الرفض الوحيد الذي يحتاج تفسيراً: هي في الفتحة الأخرى
                Notice(LocKeys.DoctrineAlready);
                return;
            }

            Notice(string.Empty);
            Refresh();
        }

        private void Turn(int delta)
        {
            _page = Mathf.Max(0, _page + delta);
            Refresh();
        }

        private void Notice(string key)
        {
            if (_notice != null)
            {
                _notice.text = string.IsNullOrEmpty(key)
                    ? string.Empty : ArabicShaper.Shape(Loc.Text(key));
            }
        }

        // ── الرسم ───────────────────────────────────────────────────────────

        private void Refresh()
        {
            DoctrineBook book = DoctrineBook.Instance;
            if (book == null || _header == null)
            {
                return;
            }

            _header.text = ArabicShaper.Shape(Loc.Text(LocKeys.DoctrineTitle));

            for (int i = 0; i < _slotFace.Length; i++)
            {
                DoctrineDefinition held = book.Held(i);
                bool active = _slot == i;

                _slotFace[i].color = active
                    ? new Color(goldColor.r * 0.30f, goldColor.g * 0.26f, goldColor.b * 0.18f, 0.96f)
                    : dimColor;

                _slotName[i].text = held != null
                    ? ArabicShaper.Shape(held.DisplayName)
                    : ArabicShaper.Shape(Loc.Text(LocKeys.SlotEmpty));

                _slotName[i].color = held != null ? goldColor : inkColor;
            }

            PaintRows(book);
        }

        private void PaintRows(DoctrineBook book)
        {
            for (int i = 0; i < Rows; i++)
            {
                _rowCard[i] = null;
            }

            System.Collections.Generic.IReadOnlyList<DoctrineDefinition> all = book.Catalogue;
            int skip = _page * Rows;
            int shown = 0;

            for (int i = skip; i < all.Count && shown < Rows; i++)
            {
                if (all[i] != null)
                {
                    _rowCard[shown++] = all[i];
                }
            }

            if (shown == 0 && _page > 0)
            {
                _page--;
                PaintRows(book);
                return;
            }

            for (int i = 0; i < Rows; i++)
            {
                Paint(i, book, _rowCard[i]);
            }
        }

        private void Paint(int row, DoctrineBook book, DoctrineDefinition card)
        {
            bool has = card != null;
            _rowFace[row].gameObject.SetActive(has);
            if (!has)
            {
                return;
            }

            bool unlocked = book.Unlocked(card);
            bool held = book.Held(0) == card || book.Held(1) == card;

            _rowFace[row].color = !unlocked ? lockedColor
                : held ? new Color(goldColor.r * 0.26f, goldColor.g * 0.22f,
                      goldColor.b * 0.15f, 0.96f)
                : dimColor;

            _rowName[row].text = ArabicShaper.Shape(card.DisplayName);
            _rowName[row].color = unlocked ? inkColor
                : new Color(inkColor.r, inkColor.g, inkColor.b, 0.45f);

            string summary = string.IsNullOrEmpty(card.SummaryKey)
                ? string.Empty : Loc.Text(card.SummaryKey);
            _rowSummary[row].text = ArabicShaper.Shape(summary);

            if (!unlocked)
            {
                // الشرط ومبلغُ اللاعب منه: «انتصارات ٢ من ٣»
                _rowState[row].text = ArabicShaper.Shape(Loc.Format(LocKeys.DoctrineNeeds,
                    Loc.Text(UnlockKey(card.Unlock)),
                    Digits(Mathf.Min(book.Progress(card.Unlock), card.UnlockAt))
                        + " / " + Digits(card.UnlockAt)));

                _rowState[row].color = new Color(inkColor.r, inkColor.g, inkColor.b, 0.55f);
                return;
            }

            if (held)
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Text(LocKeys.GearEquipped));
                _rowState[row].color = goldColor;
                return;
            }

            // مفتوحةٌ: يُقال أمُرقّاةٌ هي أم لا، وبكم تُرقّى
            if (book.Upgraded(card))
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Text(LocKeys.DoctrineUpgraded));
                _rowState[row].color = goldColor;
            }
            else if (card.UpgradeAt > 0)
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Format(LocKeys.DoctrineUpgradeAt,
                    Digits(book.Progress(card.Unlock)) + " / " + Digits(card.UpgradeAt)));
                _rowState[row].color = new Color(inkColor.r, inkColor.g, inkColor.b, 0.70f);
            }
            else
            {
                _rowState[row].text = string.Empty;
            }
        }

        private static string UnlockKey(DoctrineUnlock unlock)
        {
            switch (unlock)
            {
                case DoctrineUnlock.AccountLevel:  return LocKeys.UnlockAccountLevel;
                case DoctrineUnlock.Victories:     return LocKeys.UnlockVictories;
                case DoctrineUnlock.FurthestWave:  return LocKeys.UnlockFurthestWave;
                case DoctrineUnlock.BossesMet:     return LocKeys.UnlockBossesMet;
                case DoctrineUnlock.StagesPlayed:  return LocKeys.UnlockStagesPlayed;
                default:                           return LocKeys.UnlockFromStart;
            }
        }

        private string Digits(int value)
        {
            int length = ArabicNumber.Write(value, _digits, 0);
            return new string(_digits, 0, length);
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: DoctrinePanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            RectTransform rect = MakeRect("DoctrinePanel", parent,
                new Vector2(0.5f, 0.5f), new Vector2(0f, 0f), new Vector2(1040f, 880f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            _header = MakeText("Header", rect, 30f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -14f), new Vector2(980f, 44f),
                TextAlignmentOptions.Midline);

            TextMeshProUGUI hint = MakeText("Hint", rect, 22f, inkColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -56f), new Vector2(980f, 34f),
                TextAlignmentOptions.Midline);
            hint.gameObject.AddComponent<LocalizedLabel>().Bind(hint, LocKeys.DoctrineHint);

            BuildSlots(rect);
            BuildRows(rect);

            Button back = SmallButton(rect, "PageUp", new Vector2(0f, 1f),
                new Vector2(22f, -212f), "‹");
            back.onClick.AddListener(delegate { Turn(-1); });

            Button next = SmallButton(rect, "PageDown", new Vector2(0f, 1f),
                new Vector2(22f, -316f), "›");
            next.onClick.AddListener(delegate { Turn(1); });

            Button close = SmallButton(rect, "Close", new Vector2(0f, 1f),
                new Vector2(22f, -420f), "×");
            close.onClick.AddListener(Close);

            _notice = MakeText("Notice", rect, 22f, goldColor,
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(980f, 40f),
                TextAlignmentOptions.Midline);

            _root = rect.gameObject;
            _root.SetActive(false);
        }

        private void BuildSlots(RectTransform rect)
        {
            _slotFace = new Image[DoctrineBook.Slots];
            _slotName = new TextMeshProUGUI[DoctrineBook.Slots];

            for (int i = 0; i < DoctrineBook.Slots; i++)
            {
                int captured = i;

                // فتحتان عريضتان: ٤٧٦ بخطوة ٤٨٤ — بينهما ثمانية
                RectTransform head = MakeRect("Slot_" + i, rect,
                    new Vector2(1f, 1f), new Vector2(-22f - (i * 484f), -100f),
                    new Vector2(476f, 96f));

                _slotFace[i] = head.gameObject.AddComponent<Image>();
                _slotFace[i].color = dimColor;
                _slotFace[i].raycastTarget = true;

                Button action = head.gameObject.AddComponent<Button>();
                action.targetGraphic = _slotFace[i];
                action.onClick.AddListener(delegate { ChooseSlot(captured); });

                _slotName[i] = MakeText("Held", head, 24f, inkColor,
                    new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(456f, 40f),
                    TextAlignmentOptions.Midline);
            }
        }

        private void BuildRows(RectTransform rect)
        {
            for (int i = 0; i < Rows; i++)
            {
                int captured = i;

                RectTransform row = MakeRect("Row_" + i, rect,
                    new Vector2(0.5f, 1f), new Vector2(64f, -212f - (i * 100f)),
                    new Vector2(820f, 92f));

                _rowFace[i] = row.gameObject.AddComponent<Image>();
                _rowFace[i].color = dimColor;
                _rowFace[i].raycastTarget = true;

                Button action = row.gameObject.AddComponent<Button>();
                action.targetGraphic = _rowFace[i];
                action.onClick.AddListener(delegate { Choose(captured); });

                _rowName[i] = MakeText("Name", row, 24f, inkColor,
                    new Vector2(1f, 1f), new Vector2(-16f, -8f), new Vector2(420f, 34f),
                    TextAlignmentOptions.MidlineRight);

                _rowSummary[i] = MakeText("Summary", row, 18f,
                    new Color(inkColor.r, inkColor.g, inkColor.b, 0.78f),
                    new Vector2(1f, 0f), new Vector2(-16f, 10f), new Vector2(780f, 30f),
                    TextAlignmentOptions.MidlineRight);

                _rowState[i] = MakeText("State", row, 20f, inkColor,
                    new Vector2(0f, 1f), new Vector2(16f, -8f), new Vector2(330f, 34f),
                    TextAlignmentOptions.MidlineLeft);
            }
        }

        private Button SmallButton(RectTransform rect, string name, Vector2 anchor,
            Vector2 offset, string glyph)
        {
            RectTransform button = MakeRect(name, rect, anchor, offset, new Vector2(96f, 96f));

            Image face = button.gameObject.AddComponent<Image>();
            face.color = dimColor;
            face.raycastTarget = true;

            Button action = button.gameObject.AddComponent<Button>();
            action.targetGraphic = face;

            TextMeshProUGUI caption = MakeText("Glyph", button, 30f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(80f, 60f),
                TextAlignmentOptions.Midline);
            caption.text = glyph;

            return action;
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
