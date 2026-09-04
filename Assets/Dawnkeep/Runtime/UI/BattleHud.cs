using Dawnkeep.Combat;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// واجهة المعركة: رقم الموجة وطورها، عدد الواقفين من الجانبين، صحّة البطل،
    /// وزرّ «ابدأ الآن» الذي يقصّ مهلة الاستعداد.
    ///
    /// **تبني نفسها في `Awake`** ولا تُركَّب قطعةً قطعةً في المشهد: تركيب واجهة
    /// من ثلاثين كائناً يدوياً في ملفّ مشهد يعني ملفّاً لا يُراجَع ولا يُدمَج،
    /// وكل تعديل عليه صراع دمج. هنا شيفرة واحدة تُقرأ وتُعدَّل.
    ///
    /// **بلا تخصيص ذاكرة في الإطار**: الأعداد تُكتب في مخزن محارف ثابت عبر
    /// `SetCharArray`، والنصوص الثابتة تُشكَّل مرّة في `Awake`، والمتغيّرة منها
    /// لا تُبدَّل إلّا عند تغيّر قيمتها فعلاً (قاعدة 6).
    ///
    /// اتّجاه الواجهة يمين إلى يسار: المعلومة الأولى في الزاوية اليمنى العليا،
    /// وهي أوّل ما تقع عليه العين العربية.
    /// </summary>
    [DisallowMultipleComponent]
    public class BattleHud : MonoBehaviour
    {
        [Header("الخط")]
        [SerializeField] private TMP_FontAsset font;

        [Header("الألوان")]
        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.78f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color kingdomColor = new Color(0.353f, 0.780f, 0.404f);
        [SerializeField] private Color hordeColor = new Color(0.851f, 0.294f, 0.267f);

        [Header("اللافتة")]
        [Tooltip("ثوانٍ تبقى فيها لافتة اسم الموجة قبل أن تذوب.")]
        [SerializeField] private float bannerHold = 2.6f;

        [SerializeField] private float bannerFade = 0.9f;

        private WaveDirector _waves;
        private CombatDirector _combat;

        private TextMeshProUGUI _waveNumber;
        private TextMeshProUGUI _phaseLabel;
        private TextMeshProUGUI _countdown;
        private TextMeshProUGUI _kingdomCount;
        private TextMeshProUGUI _hordeCount;
        private TextMeshProUGUI _heroHealth;
        private TextMeshProUGUI _bannerText;
        private Image _heroBar;
        private CanvasGroup _heroPanel;
        private CanvasGroup _banner;
        private GameObject _hastenButton;

        private readonly char[] _digits = new char[ArabicNumber.MaxLength];

        // نصوص الأطوار مشكّلة مرّة واحدة: لا داعي لإعادة تشكيلها كل إطار
        private string _wordPrepare;
        private string _wordAssault;
        private string _wordRespite;
        private string _wordIdle;

        private int _shownWave = -1;
        private int _shownKingdom = -1;
        private int _shownHorde = -1;
        private int _shownHeroHealth = -1;
        private int _shownHeroMax = -1;
        private WavePhase _shownPhase = (WavePhase)(-1);
        private bool _shownHasten;
        private bool _shownHero;
        private float _bannerLeft;

        private void Awake()
        {
            _wordPrepare = ArabicShaper.Shape("استعداد");
            _wordAssault = ArabicShaper.Shape("هجوم");
            _wordRespite = ArabicShaper.Shape("استراحة");
            _wordIdle = ArabicShaper.Shape("سكون");

            Build();
        }

        private void Start()
        {
            _waves = FindAnyObjectByType<WaveDirector>();
            _combat = CombatDirector.Instance;

            if (_waves != null && _hastenButton != null)
            {
                Button button = _hastenButton.GetComponent<Button>();
                button.onClick.AddListener(_waves.Hasten);
            }
        }

        private void Update()
        {
            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            UpdateCounts();
            UpdateWave();
            UpdateHero();
            UpdateBanner();
        }

        private void UpdateCounts()
        {
            if (_combat == null)
            {
                return;
            }

            if (_combat.LiveKingdom != _shownKingdom)
            {
                _shownKingdom = _combat.LiveKingdom;
                _kingdomCount.SetCharArray(_digits, 0, ArabicNumber.Write(_shownKingdom, _digits, 0));
            }

            if (_combat.LiveHorde != _shownHorde)
            {
                _shownHorde = _combat.LiveHorde;
                _hordeCount.SetCharArray(_digits, 0, ArabicNumber.Write(_shownHorde, _digits, 0));
            }
        }

        private void UpdateWave()
        {
            if (_waves == null)
            {
                return;
            }

            if (_waves.WaveNumber != _shownWave)
            {
                _shownWave = _waves.WaveNumber;
                _waveNumber.SetCharArray(_digits, 0, ArabicNumber.Write(_shownWave, _digits, 0));
                ShowBanner();
            }

            WavePhase phase = _waves.Phase;
            if (phase != _shownPhase)
            {
                _shownPhase = phase;
                _phaseLabel.text = PhaseWord(phase);
                _phaseLabel.color = phase == WavePhase.Assault ? hordeColor : goldColor;
            }

            // العدّاد وحده يتغيّر كل إطار، وكتابته لا تخصّص ذاكرة
            bool timed = phase == WavePhase.Prepare || phase == WavePhase.Respite;
            if (_countdown.gameObject.activeSelf != timed)
            {
                _countdown.gameObject.SetActive(timed);
            }

            if (timed)
            {
                _countdown.SetCharArray(_digits, 0, ArabicNumber.WriteSeconds(_waves.Countdown, _digits));
            }

            bool canHasten = _waves.CanHasten;
            if (canHasten != _shownHasten)
            {
                _shownHasten = canHasten;
                _hastenButton.SetActive(canHasten);
            }
        }

        private void UpdateHero()
        {
            Unit hero = _combat != null ? _combat.Champion : null;
            bool alive = hero != null && hero.Definition != null;

            if (alive != _shownHero)
            {
                _shownHero = alive;
                _heroPanel.alpha = alive ? 1f : 0.35f;
            }

            if (!alive)
            {
                if (_shownHeroHealth != 0)
                {
                    _shownHeroHealth = 0;
                    _heroBar.fillAmount = 0f;
                    _heroHealth.SetCharArray(_digits, 0,
                        ArabicNumber.WritePair(0, Mathf.Max(0, _shownHeroMax), _digits));
                }

                return;
            }

            int max = Mathf.RoundToInt(hero.Definition.MaxHealth);
            int now = Mathf.CeilToInt(hero.Health);
            if (now == _shownHeroHealth && max == _shownHeroMax)
            {
                return;
            }

            _shownHeroHealth = now;
            _shownHeroMax = max;
            _heroBar.fillAmount = max > 0 ? Mathf.Clamp01((float)now / max) : 0f;
            _heroBar.color = Color.Lerp(hordeColor, kingdomColor, _heroBar.fillAmount);
            _heroHealth.SetCharArray(_digits, 0, ArabicNumber.WritePair(now, max, _digits));
        }

        private void UpdateBanner()
        {
            if (_bannerLeft <= 0f)
            {
                return;
            }

            _bannerLeft -= Time.deltaTime;
            _banner.alpha = Mathf.Clamp01(_bannerLeft / Mathf.Max(0.01f, bannerFade));

            if (_bannerLeft <= 0f)
            {
                _banner.gameObject.SetActive(false);
            }
        }

        private void ShowBanner()
        {
            if (_waves == null)
            {
                return;
            }

            string title = _waves.WaveTitle;
            if (string.IsNullOrEmpty(title))
            {
                return;
            }

            _bannerText.text = ArabicShaper.Shape(title);
            _banner.gameObject.SetActive(true);
            _banner.alpha = 1f;
            _bannerLeft = bannerHold + bannerFade;
        }

        private string PhaseWord(WavePhase phase)
        {
            switch (phase)
            {
                case WavePhase.Prepare: return _wordPrepare;
                case WavePhase.Assault: return _wordAssault;
                case WavePhase.Respite: return _wordRespite;
                default: return _wordIdle;
            }
        }

        // ── بناء الواجهة ────────────────────────────────────────────────────

        private void Build()
        {
            RectTransform root = GetComponent<RectTransform>();
            if (root == null)
            {
                // بلا RectTransform لا لوحة أصلاً: الأبناء يخرجون إلى جذر
                // المشهد فلا يُرسم شيء، وهو عطل صامت أسوأ من رسالة.
                Debug.LogError("مملكة الرماد: BattleHud يجب أن يكون على كائن Canvas — "
                    + "نفّذ «مملكة الرماد ▸ 7) بناء الخطّ العربي وواجهة المعركة».");
                enabled = false;
                return;
            }

            BuildWavePanel(root);
            BuildCountsPanel(root);
            BuildHeroPanel(root);
            BuildBanner(root);
        }

        /// <summary>لوحة الموجة: الزاوية اليمنى العليا — أوّل ما تقع عليه العين.</summary>
        private void BuildWavePanel(RectTransform root)
        {
            RectTransform panel = MakePanel("WavePanel", root,
                new Vector2(1f, 1f), new Vector2(-24f, -24f), new Vector2(330f, 108f));

            Label("Caption", panel, "الموجة", 30f, goldColor,
                new Vector2(1f, 1f), new Vector2(-18f, -12f), new Vector2(150f, 38f),
                TextAlignmentOptions.MidlineRight);

            _waveNumber = Numeral("Number", panel, 44f, inkColor,
                new Vector2(0f, 1f), new Vector2(18f, -8f), new Vector2(110f, 48f),
                TextAlignmentOptions.MidlineLeft);

            _phaseLabel = Label("Phase", panel, "استعداد", 24f, goldColor,
                new Vector2(1f, 0f), new Vector2(-18f, 14f), new Vector2(160f, 34f),
                TextAlignmentOptions.MidlineRight);

            _countdown = Numeral("Countdown", panel, 26f, inkColor,
                new Vector2(0f, 0f), new Vector2(18f, 14f), new Vector2(110f, 34f),
                TextAlignmentOptions.MidlineLeft);

            _hastenButton = BuildHastenButton(root);
            _hastenButton.SetActive(false);
        }

        private GameObject BuildHastenButton(RectTransform root)
        {
            RectTransform rect = MakePanel("HastenButton", root,
                new Vector2(1f, 1f), new Vector2(-24f, -142f), new Vector2(190f, 58f));

            Image background = rect.GetComponent<Image>();
            background.color = new Color(goldColor.r * 0.34f, goldColor.g * 0.30f, goldColor.b * 0.20f, 0.90f);

            // اللوحات لا تستقبل النقر كي لا تحجب الساحة تحتها، والزرّ يستقبله:
            // زرّ برسم لا يستقبل النقر زرٌّ شكليّ، وهي علّة ممنوعة (§17).
            background.raycastTarget = true;

            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = background;

            ColorBlock colors = button.colors;
            colors.normalColor = Color.white;
            colors.highlightedColor = new Color(1.18f, 1.18f, 1.18f, 1f);
            colors.pressedColor = new Color(0.78f, 0.78f, 0.78f, 1f);
            colors.selectedColor = Color.white;
            button.colors = colors;

            Label("Caption", rect, "ابدأ الآن", 26f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(180f, 44f),
                TextAlignmentOptions.Midline);

            return rect.gameObject;
        }

        /// <summary>لوحة الأعداد: كم واقفاً من كل جانب.</summary>
        private void BuildCountsPanel(RectTransform root)
        {
            RectTransform panel = MakePanel("CountsPanel", root,
                new Vector2(0f, 1f), new Vector2(24f, -24f), new Vector2(300f, 108f));

            Label("KingdomCaption", panel, "المدافعون", 24f, kingdomColor,
                new Vector2(1f, 1f), new Vector2(-18f, -12f), new Vector2(160f, 34f),
                TextAlignmentOptions.MidlineRight);

            _kingdomCount = Numeral("KingdomCount", panel, 30f, inkColor,
                new Vector2(0f, 1f), new Vector2(18f, -12f), new Vector2(96f, 34f),
                TextAlignmentOptions.MidlineLeft);

            Label("HordeCaption", panel, "المهاجمون", 24f, hordeColor,
                new Vector2(1f, 0f), new Vector2(-18f, 14f), new Vector2(160f, 34f),
                TextAlignmentOptions.MidlineRight);

            _hordeCount = Numeral("HordeCount", panel, 30f, inkColor,
                new Vector2(0f, 0f), new Vector2(18f, 14f), new Vector2(96f, 34f),
                TextAlignmentOptions.MidlineLeft);
        }

        /// <summary>لوحة البطل أسفل اليمين: قريبة من الإبهام على الجوّال.</summary>
        private void BuildHeroPanel(RectTransform root)
        {
            RectTransform panel = MakePanel("HeroPanel", root,
                new Vector2(1f, 0f), new Vector2(-24f, 24f), new Vector2(400f, 96f));

            _heroPanel = panel.gameObject.AddComponent<CanvasGroup>();
            _heroPanel.alpha = 0.35f;      // تبهت حتى يدخل البطل الساحة
            _heroPanel.blocksRaycasts = false;

            Label("Name", panel, "البطل", 28f, goldColor,
                new Vector2(1f, 1f), new Vector2(-18f, -10f), new Vector2(150f, 36f),
                TextAlignmentOptions.MidlineRight);

            _heroHealth = Numeral("Health", panel, 24f, inkColor,
                new Vector2(0f, 1f), new Vector2(18f, -10f), new Vector2(190f, 36f),
                TextAlignmentOptions.MidlineLeft);

            RectTransform track = MakeRect("BarTrack", panel,
                new Vector2(0.5f, 0f), new Vector2(0f, 20f), new Vector2(364f, 22f));
            Image trackImage = track.gameObject.AddComponent<Image>();
            trackImage.color = new Color(0.078f, 0.086f, 0.094f, 0.92f);
            trackImage.raycastTarget = false;

            RectTransform fill = MakeRect("BarFill", track,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(356f, 14f));
            _heroBar = fill.gameObject.AddComponent<Image>();
            _heroBar.color = kingdomColor;
            _heroBar.raycastTarget = false;

            // الشريط ينفد نحو اليسار: الملء يبدأ من اليمين كاتّجاه القراءة
            _heroBar.type = Image.Type.Filled;
            _heroBar.fillMethod = Image.FillMethod.Horizontal;
            _heroBar.fillOrigin = (int)Image.OriginHorizontal.Right;
            _heroBar.fillAmount = 1f;
        }

        /// <summary>لافتة اسم الموجة: تظهر عند بدايتها ثم تذوب.</summary>
        private void BuildBanner(RectTransform root)
        {
            RectTransform rect = MakeRect("Banner", root,
                new Vector2(0.5f, 1f), new Vector2(0f, -110f), new Vector2(720f, 76f));

            _banner = rect.gameObject.AddComponent<CanvasGroup>();
            _banner.blocksRaycasts = false;
            _banner.interactable = false;

            _bannerText = Label("Title", rect, string.Empty, 48f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(720f, 76f),
                TextAlignmentOptions.Midline);

            rect.gameObject.SetActive(false);
        }

        // ── أدوات البناء ────────────────────────────────────────────────────

        private RectTransform MakePanel(string name, Transform parent, Vector2 anchor,
            Vector2 offset, Vector2 size)
        {
            RectTransform rect = MakeRect(name, parent, anchor, offset, size);
            Image image = rect.gameObject.AddComponent<Image>();
            image.color = panelColor;
            image.raycastTarget = false;
            return rect;
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

        /// <summary>نصّ عربي ثابت: يُشكَّل مرّة عند البناء.</summary>
        private TextMeshProUGUI Label(string name, Transform parent, string logical, float size,
            Color color, Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            TextMeshProUGUI text = MakeText(name, parent, size, color, anchor, offset, rectSize, align);
            text.text = ArabicShaper.Shape(logical);
            return text;
        }

        /// <summary>نصّ أرقام: لا يحتاج تشكيلاً، ويُكتب بـSetCharArray بلا قمامة.</summary>
        private TextMeshProUGUI Numeral(string name, Transform parent, float size, Color color,
            Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            return MakeText(name, parent, size, color, anchor, offset, rectSize, align);
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
            text.overflowMode = TextOverflowModes.Overflow;

            // التشكيل والعكس تمّا في `ArabicShaper`: تركه لـTMP يعكس العكس
            text.isRightToLeftText = false;
            return text;
        }
    }
}
