using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Dawnkeep.Modes;
using Dawnkeep.Localization;

namespace Dawnkeep.UI
{
    /// <summary>
    /// شاشة الأنماط (§20): أربعةٌ، ولكلٍّ ما يميّزه ورقمُ اللاعب فيه.
    ///
    /// **والمقفل يُعرَض بشرطه** كما في شاشتَي §18 و§19 — نمطٌ مخفيٌّ حتى
    /// يُفتح لا يسعى إليه أحد. و**لا PvP فيها**: §20 تقول «ليس ضمن الإصدار
    /// الأول»، وزرٌّ يعد بما لا وجود له ممنوع (§17).
    /// </summary>
    [DisallowMultipleComponent]
    public class ModePanel : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.94f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.153f, 0.165f, 0.192f, 0.94f);
        [SerializeField] private Color lockedColor = new Color(0.098f, 0.106f, 0.122f, 0.92f);

        /// <summary>أربعة أنماط (§20) — بلا PvP.</summary>
        public const int Rows = 4;

        private static readonly PlayMode[] Order =
        {
            PlayMode.Campaign, PlayMode.Endless, PlayMode.DailyTrial, PlayMode.BossHunt,
        };

        private GameObject _root;
        private TextMeshProUGUI _header;
        private TextMeshProUGUI _notice;
        private TextMeshProUGUI _seed;

        private readonly Image[] _rowFace = new Image[Rows];
        private readonly TextMeshProUGUI[] _rowName = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowNote = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowState = new TextMeshProUGUI[Rows];

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
            ModeDirector modes = ModeDirector.Instance;
            if (modes != null)
            {
                modes.Changed += Refresh;
            }

            Refresh();
        }

        private void OnDestroy()
        {
            ModeDirector modes = ModeDirector.Instance;
            if (modes != null)
            {
                modes.Changed -= Refresh;
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

        private void Choose(int row)
        {
            ModeDirector modes = ModeDirector.Instance;
            if (modes == null || row < 0 || row >= Order.Length)
            {
                return;
            }

            if (!modes.Choose(Order[row]))
            {
                Notice(Loc.Format(LocKeys.ModeLockedZone,
                    Digits(Order[row] == PlayMode.BossHunt ? 2 : 1)));
                return;
            }

            Notice(string.Empty);
            Refresh();
        }

        private void Reroll()
        {
            ModeDirector modes = ModeDirector.Instance;
            if (modes == null || !modes.Unlocked(PlayMode.Endless))
            {
                Notice(Loc.Format(LocKeys.ModeLockedZone, Digits(1)));
                return;
            }

            modes.RerollEndless();
            Refresh();
        }

        private void Notice(string text)
        {
            if (_notice != null)
            {
                _notice.text = string.IsNullOrEmpty(text)
                    ? string.Empty : ArabicShaper.Shape(text);
            }
        }

        // ── الرسم ───────────────────────────────────────────────────────────

        private void Refresh()
        {
            ModeDirector modes = ModeDirector.Instance;
            if (modes == null || _header == null)
            {
                return;
            }

            _header.text = ArabicShaper.Shape(Loc.Text(LocKeys.ModesTitle));

            // بذرة «بلا نهاية» تُعرض دائماً: هي ما يبدّل الخريطة، ولاعبٌ لا
            // يراها لا يعلم أنّ جولتيه اختلفتا لسبب.
            if (_seed != null)
            {
                _seed.text = ArabicShaper.Shape(Loc.Format(LocKeys.ModeSeed,
                    Digits(ModeDirector.SeedFor(PlayMode.Endless, 0))));
            }

            for (int i = 0; i < Rows; i++)
            {
                Paint(i, modes, Order[i]);
            }
        }

        private void Paint(int row, ModeDirector modes, PlayMode mode)
        {
            bool open = modes.Unlocked(mode);
            bool chosen = ModeDirector.Current == mode;

            _rowFace[row].color = !open ? lockedColor
                : chosen ? new Color(goldColor.r * 0.26f, goldColor.g * 0.22f,
                      goldColor.b * 0.15f, 0.96f)
                : dimColor;

            _rowName[row].text = ArabicShaper.Shape(Loc.Text(NameKey(mode)));
            _rowName[row].color = open ? inkColor
                : new Color(inkColor.r, inkColor.g, inkColor.b, 0.45f);

            _rowNote[row].text = ArabicShaper.Shape(Loc.Text(NoteKey(mode)));

            if (!open)
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Format(LocKeys.ModeLockedZone,
                    Digits(mode == PlayMode.BossHunt ? 2 : 1)));
                _rowState[row].color = new Color(inkColor.r, inkColor.g, inkColor.b, 0.55f);
                return;
            }

            if (chosen)
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Text(LocKeys.ModeChosen));
                _rowState[row].color = goldColor;
                return;
            }

            // الحملة لا رقمَ لها: تقدّمُها في خريطتها لا في لوحة أرقام
            if (mode == PlayMode.Campaign)
            {
                _rowState[row].text = string.Empty;
                return;
            }

            int best = modes.BestOf(mode);
            _rowState[row].text = ArabicShaper.Shape(best > 0
                ? Loc.Format(LocKeys.ModeBest, Digits(best))
                : Loc.Text(LocKeys.ModeNoBest));

            _rowState[row].color = inkColor;
        }

        private static string NameKey(PlayMode mode)
        {
            switch (mode)
            {
                case PlayMode.Endless:    return LocKeys.ModeEndless;
                case PlayMode.DailyTrial: return LocKeys.ModeDaily;
                case PlayMode.BossHunt:   return LocKeys.ModeBossHunt;
                default:                  return LocKeys.ModeCampaign;
            }
        }

        private static string NoteKey(PlayMode mode)
        {
            switch (mode)
            {
                case PlayMode.Endless:    return LocKeys.ModeEndlessNote;
                case PlayMode.DailyTrial: return LocKeys.ModeDailyNote;
                case PlayMode.BossHunt:   return LocKeys.ModeBossHuntNote;
                default:                  return LocKeys.ModeCampaignNote;
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
                Debug.LogError("مملكة الرماد: ModePanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            RectTransform rect = MakeRect("ModePanel", parent,
                new Vector2(0.5f, 0.5f), new Vector2(0f, 0f), new Vector2(1040f, 880f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            _header = MakeText("Header", rect, 30f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -14f), new Vector2(980f, 44f),
                TextAlignmentOptions.Midline);

            _seed = MakeText("Seed", rect, 22f, inkColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -60f), new Vector2(980f, 34f),
                TextAlignmentOptions.Midline);

            BuildRows(rect);

            RectTransform roll = MakeRect("Reroll", rect,
                new Vector2(1f, 0f), new Vector2(-22f, 54f), new Vector2(320f, 92f));

            Image rollFace = roll.gameObject.AddComponent<Image>();
            rollFace.color = dimColor;
            rollFace.raycastTarget = true;

            Button rollAction = roll.gameObject.AddComponent<Button>();
            rollAction.targetGraphic = rollFace;
            rollAction.onClick.AddListener(Reroll);

            TextMeshProUGUI rollCaption = MakeText("Caption", roll, 24f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(300f, 60f),
                TextAlignmentOptions.Midline);
            rollCaption.gameObject.AddComponent<LocalizedLabel>()
                .Bind(rollCaption, LocKeys.ModeReroll);

            Button close = SmallButton(rect, "Close", new Vector2(0f, 1f),
                new Vector2(22f, -212f), "×");
            close.onClick.AddListener(Close);

            _notice = MakeText("Notice", rect, 22f, goldColor,
                new Vector2(0.5f, 0f), new Vector2(0f, 16f), new Vector2(980f, 32f),
                TextAlignmentOptions.Midline);

            _root = rect.gameObject;
            _root.SetActive(false);
        }

        private void BuildRows(RectTransform rect)
        {
            for (int i = 0; i < Rows; i++)
            {
                int captured = i;

                RectTransform row = MakeRect("Row_" + i, rect,
                    new Vector2(0.5f, 1f), new Vector2(64f, -212f - (i * 132f)),
                    new Vector2(820f, 124f));

                _rowFace[i] = row.gameObject.AddComponent<Image>();
                _rowFace[i].color = dimColor;
                _rowFace[i].raycastTarget = true;

                Button action = row.gameObject.AddComponent<Button>();
                action.targetGraphic = _rowFace[i];
                action.onClick.AddListener(delegate { Choose(captured); });

                _rowName[i] = MakeText("Name", row, 26f, inkColor,
                    new Vector2(1f, 1f), new Vector2(-16f, -10f), new Vector2(400f, 38f),
                    TextAlignmentOptions.MidlineRight);

                _rowNote[i] = MakeText("Note", row, 19f,
                    new Color(inkColor.r, inkColor.g, inkColor.b, 0.78f),
                    new Vector2(1f, 0f), new Vector2(-16f, 14f), new Vector2(780f, 32f),
                    TextAlignmentOptions.MidlineRight);

                _rowState[i] = MakeText("State", row, 20f, inkColor,
                    new Vector2(0f, 1f), new Vector2(16f, -10f), new Vector2(340f, 38f),
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
