using Dawnkeep.Localization;
using Dawnkeep.Meta;
using Dawnkeep.Save;
using Dawnkeep.UI;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Dawnkeep.Flow
{
    /// <summary>
    /// الإقلاع والقائمة الرئيسة (§24).
    ///
    /// **مشهدٌ واحد للاثنين**: الإقلاع في §24 «شعار قصير أقلّ من ثانيتين
    /// وتحميل وحفظ» — وهو عملُ إطارٍ أو إطارين لا مشهدٍ كامل. ومشهدٌ مستقلّ
    /// له يعني تحميلاً إضافيّاً على الجوّال مقابل لا شيء.
    ///
    /// و**لا زرّ لما لم يُبنَ**: §24 تعدّ سبعة أقسام في الصدر، وثلاثة منها
    /// موجودة اليوم — اللعب والأبحاث والإعدادات. والأربعة الباقية مسجَّلة في
    /// الخطة لا معروضةً أزراراً لا تفتح شيئاً (§17).
    /// </summary>
    [DisallowMultipleComponent]
    public class MainMenu : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [Tooltip("اسم مشهد المعركة. يُملأ من باني المشهد.")]
        [SerializeField] private string battleScene = "Dawnkeep_World";

        [Tooltip("ثوانِ الشعار. §24: أقلّ من ثانيتين.")]
        [Range(0.2f, 2f)]
        [SerializeField] private float bootSeconds = 1.2f;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.92f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color alertColor = new Color(0.851f, 0.294f, 0.267f);

        private CanvasGroup _boot;
        private CanvasGroup _hub;
        private TextMeshProUGUI _resources;
        private TextMeshProUGUI _saveNote;
        private GameObject _researchButton;
        private float _bootLeft;

        public void Configure(TMP_FontAsset value, string scene)
        {
            if (value != null)
            {
                font = value;
            }

            if (!string.IsNullOrEmpty(scene))
            {
                battleScene = scene;
            }
        }

        private void Awake()
        {
            Build();
        }

        private void Start()
        {
            // الزمن قد يكون موقوفاً: يُعاد من شاشة نتيجةٍ أوقفته ثمّ حُمّل
            // هذا المشهد، فيبقى موقوفاً ولا يتحرّك شيء.
            Time.timeScale = 1f;

            _bootLeft = bootSeconds;
            _boot.alpha = 1f;
            _hub.alpha = 0f;
            _hub.blocksRaycasts = false;

            Loc.Changed += Refresh;
            Refresh();
        }

        private void OnDestroy()
        {
            Loc.Changed -= Refresh;
        }

        private void Update()
        {
            if (_bootLeft <= 0f)
            {
                return;
            }

            // بالزمن غير المقيَّس: الشعار لا يتمدّد بسرعة اللعب ولا يقف بإيقافها
            _bootLeft -= Time.unscaledDeltaTime;

            float t = Mathf.Clamp01(1f - (_bootLeft / Mathf.Max(0.01f, bootSeconds)));
            _boot.alpha = 1f - t;
            _hub.alpha = t;

            if (_bootLeft > 0f)
            {
                return;
            }

            _boot.gameObject.SetActive(false);
            _hub.alpha = 1f;
            _hub.blocksRaycasts = true;

            // زرّ لوحة الأبحاث يظهر بعد الشعار لا معه: الشعار يغطّي الشاشة،
            // وزرٌّ تحته يُضغط بلا أن يُرى.
            MetaPanel panel = FindAnyObjectByType<MetaPanel>();
            if (panel != null)
            {
                panel.Reveal();
            }

            Refresh();
        }

        /// <summary>يبدأ المرحلة. §24: زرّ Play كبير.</summary>
        public void Play()
        {
            SaveService save = SaveService.Instance;
            if (save != null)
            {
                save.Flush();      // ما بُدّل في الإعدادات يُكتب قبل الانتقال
            }

            Time.timeScale = 1f;
            SceneManager.LoadScene(battleScene);
        }

        private void OpenResearch()
        {
            MetaPanel panel = FindAnyObjectByType<MetaPanel>();
            if (panel != null)
            {
                panel.Open();
            }
        }

        private void OpenLoadout()
        {
            Dawnkeep.UI.LoadoutPanel panel = FindAnyObjectByType<Dawnkeep.UI.LoadoutPanel>();
            if (panel != null)
            {
                panel.Open();
            }
        }

        private void OpenSettings()
        {
            PauseMenu pause = FindAnyObjectByType<PauseMenu>();
            if (pause != null)
            {
                pause.Open();
            }
        }

        /// <summary>
        /// يكتب شريط الموارد وحال الحفظ. §24: «إذا فشل الحفظ، رسالة واضحة
        /// وخيار نسخة احتياطية» — والنسخة تُقرأ تلقائيّاً، فالواجب أن يُقال
        /// **أيُّها قُرئت**: لاعبٌ يجد تقدّمه ناقصاً بلا خبرٍ يظنّها اللعبة
        /// ضيّعته.
        /// </summary>
        private void Refresh()
        {
            Progress progress = Progress.Instance;
            SaveService save = SaveService.Instance;

            if (_resources != null)
            {
                if (progress != null)
                {
                    _resources.text = Loc.Format(LocKeys.MetaHeader,
                        Digits(progress.AccountLevel), Digits(progress.Gold))
                        + "  ·  " + Loc.Format(LocKeys.MetaStars, Digits(progress.Stars));
                }
                else
                {
                    _resources.text = string.Empty;
                }
            }

            if (_researchButton != null)
            {
                // الأبحاث تُفتح بالمستوى (§16): الزرّ يُخفى قبله لا يُعرض مطفأً،
                // فالقائمة الرئيسة أوّل ما يُرى ولا ينبغي أن تبدأ بمقفول.
                _researchButton.SetActive(progress != null && progress.ResearchUnlocked);
            }

            if (_saveNote == null)
            {
                return;
            }

            SaveSource source = save != null ? save.Source : SaveSource.None;
            switch (source)
            {
                case SaveSource.BackupOne:
                case SaveSource.BackupTwo:
                    _saveNote.text = Loc.Text(LocKeys.SaveRecovered);
                    _saveNote.color = alertColor;
                    _saveNote.gameObject.SetActive(true);
                    break;

                default:
                    _saveNote.gameObject.SetActive(false);
                    break;
            }
        }

        private string Digits(int value)
        {
            char[] buffer = new char[ArabicNumber.MaxLength];
            int length = ArabicNumber.Write(value, buffer, 0);
            return new string(buffer, 0, length);
        }

        // ── البناء ──────────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: MainMenu يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            BuildBoot(parent);
            BuildHub(parent);
        }

        private void BuildBoot(RectTransform parent)
        {
            RectTransform rect = MakeRect("Boot", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1920f, 1080f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = new Color(0.031f, 0.035f, 0.043f, 1f);
            background.raycastTarget = true;

            _boot = rect.gameObject.AddComponent<CanvasGroup>();

            TextMeshProUGUI mark = MakeText("Mark", rect, 92f, goldColor,
                new Vector2(0.5f, 0.5f), new Vector2(0f, 20f), new Vector2(1200f, 130f),
                TextAlignmentOptions.Midline);
            mark.gameObject.AddComponent<LocalizedLabel>().Bind(mark, LocKeys.GameTitle);

            TextMeshProUGUI line = MakeText("Line", rect, 26f, inkColor,
                new Vector2(0.5f, 0.5f), new Vector2(0f, -70f), new Vector2(1200f, 44f),
                TextAlignmentOptions.Midline);
            line.gameObject.AddComponent<LocalizedLabel>().Bind(line, LocKeys.GameSubtitle);
        }

        private void BuildHub(RectTransform parent)
        {
            RectTransform rect = MakeRect("Hub", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(1920f, 1080f));

            _hub = rect.gameObject.AddComponent<CanvasGroup>();

            TextMeshProUGUI title = MakeText("Title", rect, 68f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -70f), new Vector2(1200f, 96f),
                TextAlignmentOptions.Midline);
            title.gameObject.AddComponent<LocalizedLabel>().Bind(title, LocKeys.GameTitle);

            // شريط الموارد (§24)
            RectTransform bar = MakeRect("Resources", rect,
                new Vector2(0.5f, 1f), new Vector2(0f, -186f), new Vector2(720f, 62f));

            Image barFace = bar.gameObject.AddComponent<Image>();
            barFace.color = panelColor;
            barFace.raycastTarget = false;

            _resources = MakeText("Text", bar, 26f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(700f, 44f),
                TextAlignmentOptions.Midline);

            _saveNote = MakeText("SaveNote", rect, 24f, alertColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -256f), new Vector2(1100f, 40f),
                TextAlignmentOptions.Midline);
            _saveNote.gameObject.SetActive(false);

            // زرّ اللعب كبير (§24)
            Button(rect, "Play", LocKeys.MenuPlay, new Vector2(0f, 40f),
                new Vector2(520f, 132f), 44f, goldColor, Play);

            // ‏٩٢ لا ٧٨ ارتفاعاً: قاس `touchcheck.py` أنّ ٧٨ دون أقلّ مقاسٍ
            // يُصاب بالإبهام بثقة (٨٨) — وهي القائمة الأولى التي يلمسها اللاعب.
            _researchButton = Button(rect, "Research", LocKeys.MetaOpen,
                new Vector2(-150f, -124f), new Vector2(280f, 92f), 28f, inkColor, OpenResearch);

            Button(rect, "Settings", LocKeys.TabSettings, new Vector2(150f, -124f),
                new Vector2(280f, 92f), 28f, inkColor, OpenSettings);

            // التجهيز **قبل المرحلة** لا في أثنائها (§17): من دخل الليلة
            // بسلاحٍ لا يريده يخرج منها ليبدّله، وذاك ليس اختياراً.
            Button(rect, "Loadout", LocKeys.LoadoutOpen, new Vector2(0f, -232f),
                new Vector2(280f, 92f), 28f, inkColor, OpenLoadout);

            // ما لم يُبنَ بعد يُقال نصّاً لا يُعرض زرّاً (§17). والحدّادة
            // خرجت من هذه القائمة: صارت داخل شاشة التجهيز.
            TextMeshProUGUI soon = MakeText("Soon", rect, 22f, inkColor * 0.7f,
                new Vector2(0.5f, 0f), new Vector2(0f, 40f), new Vector2(1200f, 38f),
                TextAlignmentOptions.Midline);
            soon.gameObject.AddComponent<LocalizedLabel>().Bind(soon, LocKeys.MenuSoon);
        }

        private GameObject Button(RectTransform parent, string name, string captionKey,
            Vector2 offset, Vector2 size, float fontSize, Color color,
            UnityEngine.Events.UnityAction action)
        {
            RectTransform rect = MakeRect(name, parent,
                new Vector2(0.5f, 0.5f), offset, size);

            Image face = rect.gameObject.AddComponent<Image>();
            face.color = new Color(color.r * 0.30f, color.g * 0.26f, color.b * 0.18f, 0.94f);
            face.raycastTarget = true;

            UnityEngine.UI.Button button = rect.gameObject.AddComponent<UnityEngine.UI.Button>();
            button.targetGraphic = face;
            button.onClick.AddListener(action);

            TextMeshProUGUI caption = MakeText("Caption", rect, fontSize, color,
                new Vector2(0.5f, 0.5f), Vector2.zero,
                new Vector2(size.x - 20f, size.y - 24f), TextAlignmentOptions.Midline);
            caption.gameObject.AddComponent<LocalizedLabel>().Bind(caption, captionKey);

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
