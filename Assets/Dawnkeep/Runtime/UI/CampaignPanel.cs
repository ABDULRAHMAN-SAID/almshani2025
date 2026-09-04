using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Dawnkeep.Campaign;
using Dawnkeep.Localization;

namespace Dawnkeep.UI
{
    /// <summary>
    /// خريطة الحملة (§19): المناطق الأربع، ومراحل المنطقة المختارة.
    ///
    /// **المقفلة تُعرَض** كما في شاشة العقائد: لاعبٌ لا يرى ما أمامه لا يعرف
    /// إلامَ يسعى. ومنطقةٌ مقفلة تقول شرطها: «تُفتح بعد ٨ مراحل».
    ///
    /// وتخطيطُها من تخطيط شاشتَي §17 و§18 نفسه — لوحةٌ واحدة بمقاسٍ واحد،
    /// و`touchcheck.py` يقيس الثلاث بحسابٍ واحد.
    /// </summary>
    [DisallowMultipleComponent]
    public class CampaignPanel : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.94f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.153f, 0.165f, 0.192f, 0.94f);
        [SerializeField] private Color lockedColor = new Color(0.098f, 0.106f, 0.122f, 0.92f);

        /// <summary>خمسٌ في الصفحة، والمنطقة عشرٌ — فصفحتان لكلّ منطقة.</summary>
        public const int Rows = 5;

        private GameObject _root;
        private TextMeshProUGUI _header;
        private TextMeshProUGUI _notice;

        private Image[] _zoneFace;
        private TextMeshProUGUI[] _zoneName;

        private readonly Image[] _rowFace = new Image[Rows];
        private readonly TextMeshProUGUI[] _rowName = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowGoal = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowState = new TextMeshProUGUI[Rows];
        private readonly StageDefinition[] _rowStage = new StageDefinition[Rows];

        private int _zone = 1;
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
            CampaignDirector campaign = CampaignDirector.Instance;
            if (campaign != null)
            {
                campaign.Changed += Refresh;

                // تُفتح على منطقة المرحلة التالية لا على الأولى دائماً
                StageDefinition next = CampaignDirector.Current;
                if (next != null && next.Zone != null)
                {
                    _zone = next.Zone.Order;
                    _page = (next.Index - 1) / Rows;
                }
            }

            Refresh();
        }

        private void OnDestroy()
        {
            CampaignDirector campaign = CampaignDirector.Instance;
            if (campaign != null)
            {
                campaign.Changed -= Refresh;
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

        private void ChooseZone(int order)
        {
            _zone = order;
            _page = 0;
            Refresh();
        }

        private void Choose(int row)
        {
            CampaignDirector campaign = CampaignDirector.Instance;
            StageDefinition stage = _rowStage[row];
            if (campaign == null || stage == null)
            {
                return;
            }

            if (!campaign.Choose(stage))
            {
                Notice(LocKeys.StageLocked);
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
            CampaignDirector campaign = CampaignDirector.Instance;
            if (campaign == null || _header == null)
            {
                return;
            }

            _header.text = ArabicShaper.Shape(Loc.Text(LocKeys.CampaignTitle));

            for (int i = 0; i < _zoneFace.Length; i++)
            {
                ZoneDefinition zone = campaign.ZoneAt(i + 1);
                bool active = _zone == i + 1;

                _zoneFace[i].color = active
                    ? new Color(goldColor.r * 0.30f, goldColor.g * 0.26f, goldColor.b * 0.18f, 0.96f)
                    : dimColor;

                _zoneName[i].text = zone != null
                    ? ArabicShaper.Shape(zone.DisplayName) : string.Empty;

                _zoneName[i].color = zone != null && Open(campaign, zone)
                    ? inkColor : new Color(inkColor.r, inkColor.g, inkColor.b, 0.45f);
            }

            PaintRows(campaign);
        }

        /// <summary>هل فُتحت المنطقة؟ أوّل مراحلها هي الميزان.</summary>
        private static bool Open(CampaignDirector campaign, ZoneDefinition zone)
        {
            StageDefinition first = campaign.Find(zone, 1);
            return first != null && campaign.Unlocked(first);
        }

        private void PaintRows(CampaignDirector campaign)
        {
            ZoneDefinition zone = campaign.ZoneAt(_zone);
            for (int i = 0; i < Rows; i++)
            {
                _rowStage[i] = zone != null
                    ? campaign.Find(zone, (_page * Rows) + i + 1) : null;
            }

            if (_rowStage[0] == null && _page > 0)
            {
                _page--;
                PaintRows(campaign);
                return;
            }

            for (int i = 0; i < Rows; i++)
            {
                Paint(i, campaign, _rowStage[i]);
            }
        }

        private void Paint(int row, CampaignDirector campaign, StageDefinition stage)
        {
            bool has = stage != null;
            _rowFace[row].gameObject.SetActive(has);
            if (!has)
            {
                return;
            }

            bool unlocked = campaign.Unlocked(stage);
            bool cleared = campaign.Cleared(stage);
            bool current = CampaignDirector.Current == stage;

            _rowFace[row].color = !unlocked ? lockedColor
                : current ? new Color(goldColor.r * 0.26f, goldColor.g * 0.22f,
                      goldColor.b * 0.15f, 0.96f)
                : dimColor;

            _rowName[row].text = ArabicShaper.Shape(stage.DisplayName);
            _rowName[row].color = unlocked ? inkColor
                : new Color(inkColor.r, inkColor.g, inkColor.b, 0.45f);

            // الهدف مكتوبٌ على البطاقة: هو ما يغيّر القرار (§19)
            string goal = Loc.Text(ObjectiveKey(stage.Objective));
            if (stage.Blueprint != null && !cleared)
            {
                goal += "  ·  " + Loc.Format(LocKeys.StageReward,
                    stage.Blueprint.DisplayName);
            }

            _rowGoal[row].text = ArabicShaper.Shape(goal);

            if (cleared)
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Text(LocKeys.StageCleared));
                _rowState[row].color = goldColor;
            }
            else if (!unlocked)
            {
                ZoneDefinition zone = stage.Zone;
                _rowState[row].text = stage.Index <= 1 && zone != null
                    ? ArabicShaper.Shape(Loc.Format(LocKeys.ZoneLockedAfter,
                          Digits(zone.UnlockAfter)))
                    : ArabicShaper.Shape(Loc.Text(LocKeys.StageLocked));

                _rowState[row].color = new Color(inkColor.r, inkColor.g, inkColor.b, 0.55f);
            }
            else
            {
                _rowState[row].text = ArabicShaper.Shape(Loc.Text(
                    current ? LocKeys.StageNext : LocKeys.StagePlay));

                _rowState[row].color = current ? goldColor : inkColor;
            }
        }

        private static string ObjectiveKey(StageObjective objective)
        {
            switch (objective)
            {
                case StageObjective.GuardConvoy:     return LocKeys.ObjectiveConvoy;
                case StageObjective.LightTwoBeacons: return LocKeys.ObjectiveBeacons;
                case StageObjective.SixNodesOnly:    return LocKeys.ObjectiveSixNodes;
                case StageObjective.TwoGates:        return LocKeys.ObjectiveTwoGates;
                case StageObjective.EconomyOpening:  return LocKeys.ObjectiveEconomy;
                case StageObjective.BrokenWall:      return LocKeys.ObjectiveBrokenWall;
                default:                             return LocKeys.ObjectiveHoldKeep;
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
                Debug.LogError("مملكة الرماد: CampaignPanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            RectTransform rect = MakeRect("CampaignPanel", parent,
                new Vector2(0.5f, 0.5f), new Vector2(0f, 0f), new Vector2(1040f, 880f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            _header = MakeText("Header", rect, 30f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -14f), new Vector2(980f, 44f),
                TextAlignmentOptions.Midline);

            BuildZones(rect);
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

        private void BuildZones(RectTransform rect)
        {
            _zoneFace = new Image[4];
            _zoneName = new TextMeshProUGUI[4];

            for (int i = 0; i < 4; i++)
            {
                int captured = i + 1;

                RectTransform head = MakeRect("Zone_" + i, rect,
                    new Vector2(1f, 1f), new Vector2(-22f - (i * 244f), -68f),
                    new Vector2(236f, 96f));

                _zoneFace[i] = head.gameObject.AddComponent<Image>();
                _zoneFace[i].color = dimColor;
                _zoneFace[i].raycastTarget = true;

                Button action = head.gameObject.AddComponent<Button>();
                action.targetGraphic = _zoneFace[i];
                action.onClick.AddListener(delegate { ChooseZone(captured); });

                _zoneName[i] = MakeText("Name", head, 20f, inkColor,
                    new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(220f, 60f),
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
                    new Vector2(1f, 1f), new Vector2(-16f, -8f), new Vector2(400f, 34f),
                    TextAlignmentOptions.MidlineRight);

                _rowGoal[i] = MakeText("Goal", row, 18f,
                    new Color(inkColor.r, inkColor.g, inkColor.b, 0.78f),
                    new Vector2(1f, 0f), new Vector2(-16f, 10f), new Vector2(780f, 30f),
                    TextAlignmentOptions.MidlineRight);

                _rowState[i] = MakeText("State", row, 20f, inkColor,
                    new Vector2(0f, 1f), new Vector2(16f, -8f), new Vector2(340f, 34f),
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
