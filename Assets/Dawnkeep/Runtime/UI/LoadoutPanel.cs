using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Dawnkeep.Equipment;
using Dawnkeep.Localization;

namespace Dawnkeep.UI
{
    /// <summary>
    /// شاشة التجهيز (§17): أربع فتحات، وقائمةُ ما تملكه في الفتحة المختارة،
    /// والحدّادة تحتها.
    ///
    /// **أربع فتحاتٍ لا أكثر** بنصّ §17، و**صفحةٌ واحدة لكل فتحة**: شاشةٌ
    /// تعرض العتاد كلّه دفعةً جدولٌ لا اختيار.
    ///
    /// وكل ندرةٍ تُعرض بثلاث علامات — لونٌ وإطارٌ ورمز — لأنّ §17 تقول
    /// صراحةً: «اللون ليس وسيلة التمييز الوحيدة».
    /// </summary>
    [DisallowMultipleComponent]
    public class LoadoutPanel : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.94f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.153f, 0.165f, 0.192f, 0.94f);
        [SerializeField] private Color lockedColor = new Color(0.098f, 0.106f, 0.122f, 0.92f);

        /// <summary>
        /// خمس بطاقاتٍ في الصفحة. والعدد **مقيس لا مختار**: البطاقة ٩٢
        /// ارتفاعاً (حدّ الإبهام ٨٨ في §7) بخطوة ١٠٠، وستٌّ منها تخرج من
        /// أسفل اللوحة. والباقي على الصفحات.
        /// </summary>
        public const int Rows = 5;

        private GameObject _root;

        private TextMeshProUGUI _header;
        private TextMeshProUGUI _purse;
        private TextMeshProUGUI _notice;

        private Image[] _slotFace;
        private TextMeshProUGUI[] _slotName;

        private readonly Image[] _rowFace = new Image[Rows];
        private readonly Image[] _rowFrame = new Image[Rows];
        private readonly TextMeshProUGUI[] _rowName = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowSummary = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowMark = new TextMeshProUGUI[Rows];
        private readonly TextMeshProUGUI[] _rowLevel = new TextMeshProUGUI[Rows];
        private readonly EquipmentDefinition[] _rowGear = new EquipmentDefinition[Rows];

        private TextMeshProUGUI _upgradeCaption;
        private TextMeshProUGUI _dismantleCaption;
        private Image _upgradeFace;
        private Image _dismantleFace;

        private EquipmentSlot _slot = EquipmentSlot.Weapon;
        private EquipmentDefinition _chosen;
        private int _page;

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
            Loadout loadout = Loadout.Instance;
            if (loadout != null)
            {
                loadout.Changed += Refresh;
            }

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null)
            {
                progress.Changed += Refresh;
            }

            Refresh();
        }

        private void OnDestroy()
        {
            Loadout loadout = Loadout.Instance;
            if (loadout != null)
            {
                loadout.Changed -= Refresh;
            }

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null)
            {
                progress.Changed -= Refresh;
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
            _slot = (EquipmentSlot)index;
            _page = 0;
            _chosen = null;
            Refresh();
        }

        /// <summary>
        /// ضغط البطاقة: **يختار ثمّ يُلبِس**. ضغطةٌ واحدة تُلبِس بلا اختيارٍ
        /// تجعل الحدّادة بلا هدفٍ ظاهر — واللاعب يرقّي ما لا يعلم.
        /// </summary>
        private void Choose(int row)
        {
            EquipmentDefinition gear = _rowGear[row];
            if (gear == null)
            {
                return;
            }

            if (_chosen == gear)
            {
                Loadout loadout = Loadout.Instance;
                if (loadout != null)
                {
                    loadout.Equip(gear);
                }
            }

            _chosen = gear;
            Refresh();
        }

        private void Upgrade()
        {
            string reason;
            if (!Forge.CanUpgrade(_chosen, out reason))
            {
                Notice(reason);
                return;
            }

            Forge.Upgrade(_chosen);
            Refresh();
        }

        private void Dismantle()
        {
            string reason;
            if (!Forge.CanDismantle(_chosen, out reason))
            {
                Notice(reason);
                return;
            }

            Forge.Dismantle(_chosen);
            _chosen = null;
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
                _notice.text = Loc.Text(key);
            }
        }

        // ── الرسم ───────────────────────────────────────────────────────────

        private void Refresh()
        {
            Loadout loadout = Loadout.Instance;
            if (loadout == null || _header == null)
            {
                return;
            }

            _header.text = Loc.Text(LocKeys.LoadoutTitle);

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (_purse != null)
            {
                _purse.text = progress != null
                    ? Loc.Format(LocKeys.MetaHeader, Digits(progress.AccountLevel),
                          Digits(progress.Gold))
                      + "  ·  " + Loc.Format(LocKeys.ForgeShards, Digits(progress.Shards))
                    : string.Empty;
            }

            PaintSlots(loadout);
            PaintRows(loadout);
            PaintForge(loadout, progress);
        }

        private void PaintSlots(Loadout loadout)
        {
            for (int i = 0; i < _slotFace.Length; i++)
            {
                EquipmentDefinition worn = loadout.Worn((EquipmentSlot)i);
                bool active = (int)_slot == i;

                _slotFace[i].color = active
                    ? new Color(goldColor.r * 0.30f, goldColor.g * 0.26f, goldColor.b * 0.18f, 0.96f)
                    : dimColor;

                _slotName[i].text = worn != null
                    ? ArabicShaper.Shape(worn.DisplayName)
                    : ArabicShaper.Shape(Loc.Text(LocKeys.SlotEmpty));

                _slotName[i].color = worn != null ? RarityMark.Tint(worn.Rarity) : inkColor;
            }
        }

        private void PaintRows(Loadout loadout)
        {
            // القطع التي تخصّ هذه الفتحة، صفحةً صفحة
            int seen = 0;
            int shown = 0;
            int skip = _page * Rows;

            for (int i = 0; i < Rows; i++)
            {
                _rowGear[i] = null;
            }

            System.Collections.Generic.IReadOnlyList<EquipmentDefinition> all = loadout.Catalogue;
            for (int i = 0; i < all.Count && shown < Rows; i++)
            {
                EquipmentDefinition gear = all[i];
                if (gear == null || gear.Slot != _slot)
                {
                    continue;
                }

                if (seen++ < skip)
                {
                    continue;
                }

                _rowGear[shown++] = gear;
            }

            // صفحةٌ فارغة بعد تفكيك آخر قطعةٍ فيها: ارجع صفحةً ولا تُرِ فراغاً
            if (shown == 0 && _page > 0)
            {
                _page--;
                PaintRows(loadout);
                return;
            }

            for (int i = 0; i < Rows; i++)
            {
                Paint(i, loadout, _rowGear[i]);
            }
        }

        private void Paint(int row, Loadout loadout, EquipmentDefinition gear)
        {
            bool has = gear != null;
            _rowFace[row].gameObject.SetActive(has);
            if (!has)
            {
                return;
            }

            bool owned = loadout.Owns(gear);
            bool worn = loadout.Worn(gear.Slot) == gear;
            bool picked = _chosen == gear;

            _rowFace[row].color = !owned ? lockedColor
                : picked ? new Color(goldColor.r * 0.26f, goldColor.g * 0.22f,
                      goldColor.b * 0.15f, 0.96f)
                : dimColor;

            // العلامة الأولى: الإطار. والثانية: الرمز. والثالثة: اللون (§17)
            _rowFrame[row].color = RarityMark.Tint(gear.Rarity);
            RectTransform frame = _rowFrame[row].rectTransform;
            Vector2 size = frame.sizeDelta;
            size.x = RarityMark.Frame(gear.Rarity);
            frame.sizeDelta = size;

            _rowMark[row].text = RarityMark.Symbol(gear.Rarity);
            _rowMark[row].color = RarityMark.Tint(gear.Rarity);

            _rowName[row].text = ArabicShaper.Shape(gear.DisplayName);
            _rowName[row].color = owned ? inkColor : new Color(inkColor.r, inkColor.g,
                inkColor.b, 0.45f);

            string summary = string.IsNullOrEmpty(gear.SummaryKey)
                ? string.Empty : Loc.Text(gear.SummaryKey);
            _rowSummary[row].text = ArabicShaper.Shape(summary);

            if (!owned)
            {
                _rowLevel[row].text = ArabicShaper.Shape(Loc.Text(LocKeys.GearLocked));
                _rowLevel[row].color = new Color(inkColor.r, inkColor.g, inkColor.b, 0.45f);
                return;
            }

            _rowLevel[row].text = worn
                ? ArabicShaper.Shape(Loc.Text(LocKeys.GearEquipped))
                : ArabicShaper.Shape(Loc.Format(LocKeys.GearLevel,
                      Digits(loadout.LevelOf(gear))));

            _rowLevel[row].color = worn ? goldColor : inkColor;
        }

        private void PaintForge(Loadout loadout, Dawnkeep.Meta.Progress progress)
        {
            bool has = _chosen != null;

            if (!has)
            {
                _upgradeCaption.text = ArabicShaper.Shape(Loc.Text(LocKeys.ForgeUpgrade));
                _dismantleCaption.text = ArabicShaper.Shape(Loc.Text(LocKeys.ForgeDismantle));
                _upgradeFace.color = lockedColor;
                _dismantleFace.color = lockedColor;
                return;
            }

            int level = loadout.LevelOf(_chosen);
            string reason;
            bool canUp = Forge.CanUpgrade(_chosen, out reason);

            _upgradeCaption.text = ArabicShaper.Shape(Loc.Text(LocKeys.ForgeUpgrade)
                + " — " + Loc.Format(LocKeys.ForgeCost,
                    Digits(_chosen.GoldToLevel(level)), Digits(_chosen.ShardsToLevel(level))));

            _upgradeFace.color = canUp
                ? new Color(goldColor.r * 0.30f, goldColor.g * 0.26f, goldColor.b * 0.18f, 0.96f)
                : lockedColor;

            bool canDown = Forge.CanDismantle(_chosen, out reason);
            _dismantleCaption.text = ArabicShaper.Shape(Loc.Text(LocKeys.ForgeDismantle)
                + " — " + Loc.Format(LocKeys.ForgeReturns,
                    Digits(Forge.DismantleValue(_chosen))));

            _dismantleFace.color = canDown ? dimColor : lockedColor;
        }

        /// <summary>رقمٌ للعرض. **مختصرٌ فوق العشرة آلاف** (§21).</summary>
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
                Debug.LogError("مملكة الرماد: LoadoutPanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            // **لا زرّ فتحٍ من عندها**: القائمة الرئيسة هي التي تفتحها،
            // وزرٌّ ثانٍ منها يقع فوق زرّ القائمة. والفتح من القائمة وحدها
            // هو ما تنصّ عليه §17 أيضاً — التجهيز **قبل المرحلة**، فبطلٌ
            // يبدّل سيفه في منتصف الليلة لم يختر شيئاً قبلها.

            // اللوحة
            RectTransform rect = MakeRect("LoadoutPanel", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1040f, 880f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            _header = MakeText("Header", rect, 30f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -14f), new Vector2(980f, 44f),
                TextAlignmentOptions.Midline);

            _purse = MakeText("Purse", rect, 22f, inkColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -56f), new Vector2(980f, 34f),
                TextAlignmentOptions.Midline);

            BuildSlots(rect);
            BuildRows(rect);
            BuildForge(rect);

            _notice = MakeText("Notice", rect, 20f, goldColor,
                new Vector2(0.5f, 0f), new Vector2(0f, 14f), new Vector2(980f, 30f),
                TextAlignmentOptions.Midline);

            _root = rect.gameObject;
            _root.SetActive(false);
        }

        private void BuildSlots(RectTransform rect)
        {
            string[] keys =
            {
                LocKeys.SlotWeapon, LocKeys.SlotArmor, LocKeys.SlotRelic, LocKeys.SlotMount,
            };

            _slotFace = new Image[keys.Length];
            _slotName = new TextMeshProUGUI[keys.Length];

            for (int i = 0; i < keys.Length; i++)
            {
                int captured = i;

                // ٢٣٦ عرضاً و٩٦ ارتفاعاً، بخطوةِ ٢٤٤ — فبين الأزرار ثمانية
                RectTransform head = MakeRect("Slot_" + i, rect,
                    new Vector2(1f, 1f), new Vector2(-22f - (i * 244f), -100f),
                    new Vector2(236f, 96f));

                _slotFace[i] = head.gameObject.AddComponent<Image>();
                _slotFace[i].color = dimColor;
                _slotFace[i].raycastTarget = true;

                Button action = head.gameObject.AddComponent<Button>();
                action.targetGraphic = _slotFace[i];
                action.onClick.AddListener(delegate { ChooseSlot(captured); });

                TextMeshProUGUI caption = MakeText("Caption", head, 22f, inkColor,
                    new Vector2(0.5f, 1f), new Vector2(0f, -8f), new Vector2(220f, 30f),
                    TextAlignmentOptions.Midline);
                caption.gameObject.AddComponent<LocalizedLabel>().Bind(caption, keys[i]);

                _slotName[i] = MakeText("Worn", head, 20f, inkColor,
                    new Vector2(0.5f, 0f), new Vector2(0f, 10f), new Vector2(220f, 32f),
                    TextAlignmentOptions.Midline);
            }
        }

        private void BuildRows(RectTransform rect)
        {
            for (int i = 0; i < Rows; i++)
            {
                int captured = i;

                // ٦٨ ارتفاعاً بخطوة ٧٦: بينها ثمانية، وهدف اللمس عرضُه كامل
                // ٩٢ ارتفاعاً بخطوة ١٠٠: فوق حدّ الإبهام (٨٨ في §7) وبينها
                // ثمانية. وتنزاح ٦٤ يميناً ليخلو اليسار لعمود الصفحات.
                RectTransform row = MakeRect("Row_" + i, rect,
                    new Vector2(0.5f, 1f), new Vector2(64f, -212f - (i * 100f)),
                    new Vector2(820f, 92f));

                _rowFace[i] = row.gameObject.AddComponent<Image>();
                _rowFace[i].color = dimColor;
                _rowFace[i].raycastTarget = true;

                Button action = row.gameObject.AddComponent<Button>();
                action.targetGraphic = _rowFace[i];
                action.onClick.AddListener(delegate { Choose(captured); });

                // الإطار: شريطٌ يمين البطاقة يغلظ بالندرة (§17)
                RectTransform frame = MakeRect("Frame", row,
                    new Vector2(1f, 0.5f), new Vector2(-2f, 0f), new Vector2(4f, 84f));
                _rowFrame[i] = frame.gameObject.AddComponent<Image>();
                _rowFrame[i].raycastTarget = false;

                _rowMark[i] = MakeText("Mark", row, 20f, inkColor,
                    new Vector2(1f, 1f), new Vector2(-14f, -6f), new Vector2(90f, 28f),
                    TextAlignmentOptions.MidlineRight);

                _rowName[i] = MakeText("Name", row, 24f, inkColor,
                    new Vector2(1f, 1f), new Vector2(-110f, -8f), new Vector2(420f, 34f),
                    TextAlignmentOptions.MidlineRight);

                _rowSummary[i] = MakeText("Summary", row, 18f,
                    new Color(inkColor.r, inkColor.g, inkColor.b, 0.78f),
                    new Vector2(1f, 0f), new Vector2(-110f, 10f), new Vector2(560f, 30f),
                    TextAlignmentOptions.MidlineRight);

                _rowLevel[i] = MakeText("Level", row, 20f, inkColor,
                    new Vector2(0f, 0.5f), new Vector2(16f, 0f), new Vector2(200f, 32f),
                    TextAlignmentOptions.MidlineLeft);
            }
        }

        private void BuildForge(RectTransform rect)
        {
            RectTransform up = MakeRect("Upgrade", rect,
                new Vector2(1f, 0f), new Vector2(-22f, 54f), new Vector2(480f, 92f));

            _upgradeFace = up.gameObject.AddComponent<Image>();
            _upgradeFace.color = lockedColor;
            _upgradeFace.raycastTarget = true;

            Button upAction = up.gameObject.AddComponent<Button>();
            upAction.targetGraphic = _upgradeFace;
            upAction.onClick.AddListener(Upgrade);

            _upgradeCaption = MakeText("Caption", up, 22f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(460f, 60f),
                TextAlignmentOptions.Midline);

            RectTransform down = MakeRect("Dismantle", rect,
                new Vector2(0f, 0f), new Vector2(22f, 54f), new Vector2(420f, 92f));

            _dismantleFace = down.gameObject.AddComponent<Image>();
            _dismantleFace.color = lockedColor;
            _dismantleFace.raycastTarget = true;

            Button downAction = down.gameObject.AddComponent<Button>();
            downAction.targetGraphic = _dismantleFace;
            downAction.onClick.AddListener(Dismantle);

            _dismantleCaption = MakeText("Caption", down, 22f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(400f, 60f),
                TextAlignmentOptions.Midline);

            // الصفحات والإغلاق: عمودٌ على اليسار **دون صفّ الفتحات**. كان
            // صفّاً أفقيّاً بجواره فاصطدم زرّ الإغلاق بالفتحة الثالثة.
            Button back = SmallButton(rect, "PageUp", new Vector2(0f, 1f),
                new Vector2(22f, -212f), "‹");
            back.onClick.AddListener(delegate { Turn(-1); });

            Button next = SmallButton(rect, "PageDown", new Vector2(0f, 1f),
                new Vector2(22f, -316f), "›");
            next.onClick.AddListener(delegate { Turn(1); });

            Button close = SmallButton(rect, "Close", new Vector2(0f, 1f),
                new Vector2(22f, -420f), "×");
            close.onClick.AddListener(Close);
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
