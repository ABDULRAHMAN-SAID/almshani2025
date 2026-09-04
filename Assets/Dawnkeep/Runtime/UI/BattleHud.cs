using Dawnkeep.Building;
using Dawnkeep.Combat;
using Dawnkeep.Economy;
using Dawnkeep.Light;
using Dawnkeep.Localization;
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
        [SerializeField] private Color dawnColor = new Color(1f, 0.796f, 0.451f);

        [Header("اللافتة")]
        [Tooltip("ثوانٍ تبقى فيها لافتة اسم الموجة قبل أن تذوب.")]
        [SerializeField] private float bannerHold = 2.6f;

        [SerializeField] private float bannerFade = 0.9f;

        private WaveDirector _waves;
        private CombatDirector _combat;
        private LightField _light;
        private Treasury _treasury;
        private Keep _keep;

        private TextMeshProUGUI _waveNumber;
        private TextMeshProUGUI _phaseLabel;
        private TextMeshProUGUI _countdown;
        private TextMeshProUGUI _kingdomCount;
        private TextMeshProUGUI _hordeCount;
        private TextMeshProUGUI _heroHealth;
        private TextMeshProUGUI _silver;
        private TextMeshProUGUI _bounty;
        private TextMeshProUGUI _lightStock;
        private TextMeshProUGUI _beaconCount;
        private TextMeshProUGUI _bannerText;
        private GameObject _hint;
        private Image _heroBar;
        private Image _keepBar;
        private TextMeshProUGUI _keepHealth;
        private TextMeshProUGUI _keepTier;
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
        private int _shownSilver = -1;
        private int _shownBounty = -1;
        private int _shownStock = -1;
        private int _shownBeacons = -1;
        private bool _shownHint;
        private int _shownKeepHealth = -1;
        private int _shownKeepTier = -1;
        private int _shownHeroHealth = -1;
        private int _shownHeroMax = -1;
        private WavePhase _shownPhase = (WavePhase)(-1);
        private bool _shownHasten;
        private bool _shownHero;
        private float _bannerLeft;

        private void Awake()
        {
            _wordPrepare = Loc.Text(LocKeys.PhasePrepare);
            _wordAssault = Loc.Text(LocKeys.PhaseAssault);
            _wordRespite = Loc.Text(LocKeys.PhaseRespite);
            _wordIdle = Loc.Text(LocKeys.PhaseIdle);

            Build();
        }

        private void OnEnable()
        {
            Loc.Changed += ReloadWords;
        }

        private void OnDisable()
        {
            Loc.Changed -= ReloadWords;
        }

        /// <summary>
        /// كلمات الأطوار مخزَّنة لتُبدَّل بلا تخصيص في الإطار، فتبديل اللغة
        /// يوجب إعادة جلبها — وإلّا بقيت لوحة الموجة بلغة سابقة وحدها.
        /// </summary>
        private void ReloadWords()
        {
            _wordPrepare = Loc.Text(LocKeys.PhasePrepare);
            _wordAssault = Loc.Text(LocKeys.PhaseAssault);
            _wordRespite = Loc.Text(LocKeys.PhaseRespite);
            _wordIdle = Loc.Text(LocKeys.PhaseIdle);

            _shownPhase = (WavePhase)(-1);      // يُجبر التحديث التالي على الكتابة
            _shownKeepTier = -1;
        }

        private void Start()
        {
            _waves = FindAnyObjectByType<WaveDirector>();
            _combat = CombatDirector.Instance;
            _light = LightField.Instance;
            _treasury = Treasury.Instance;
            _keep = Keep.Instance;

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

            if (_light == null)
            {
                _light = LightField.Instance;
            _treasury = Treasury.Instance;
            _keep = Keep.Instance;
            }

            if (_treasury == null)
            {
                _treasury = Treasury.Instance;
            _keep = Keep.Instance;
            }

            UpdateCounts();
            UpdateWave();
            UpdateSilver();
            UpdateKeep();
            UpdateLight();
            UpdateHero();
            UpdateBanner();
        }

        /// <summary>
        /// قلب الحصن أعلى الوسط: صحّته شرط الخسارة (§5)، فهي أهمّ رقم على
        /// الشاشة ومكانها هو الذي لا تفوته العين.
        /// </summary>
        private void UpdateKeep()
        {
            if (_keep == null)
            {
                _keep = Keep.Instance;
                if (_keep == null)
                {
                    return;
                }
            }

            int now = Mathf.CeilToInt(_keep.Health);
            if (now != _shownKeepHealth)
            {
                _shownKeepHealth = now;
                int max = Mathf.RoundToInt(_keep.MaxHealth);
                _keepBar.fillAmount = max > 0 ? Mathf.Clamp01((float)now / max) : 0f;
                _keepBar.color = Color.Lerp(hordeColor, dawnColor, _keepBar.fillAmount);
                _keepHealth.SetCharArray(_digits, 0, ArabicNumber.WritePair(now, max, _digits));
            }

            if (_keep.Tier != _shownKeepTier)
            {
                // أربع مرّات في الجولة كلّها: بناء سلسلة هنا لا يُحسب قمامةَ إطار
                _shownKeepTier = _keep.Tier;
                int length = ArabicNumber.Write(_shownKeepTier, _digits, 0);
                _keepTier.text = Loc.Format(LocKeys.KeepTier, new string(_digits, 0, length));
            }
        }

        /// <summary>
        /// الفضّة والمكافأة المعلّقة. المعلّقة تُعرض بعلامة زائد: هي **ليست**
        /// في الرصيد بعد، وعرضها مضمومةً إليه يجعل اللاعب يبني بما لا يملك
        /// ثم يُرفض بناؤه بلا سبب ظاهر (§10: تُصرف عند نهاية الموجة).
        /// </summary>
        private void UpdateSilver()
        {
            if (_treasury == null)
            {
                return;
            }

            if (_treasury.Silver != _shownSilver)
            {
                _shownSilver = _treasury.Silver;
                _silver.SetCharArray(_digits, 0, ArabicNumber.Write(_shownSilver, _digits, 0));
            }

            int pending = _treasury.PendingBounty;
            if (pending != _shownBounty)
            {
                _shownBounty = pending;
                if (pending > 0)
                {
                    _digits[0] = '+';
                    int length = ArabicNumber.Write(pending, _digits, 1);
                    _bounty.SetCharArray(_digits, 0, length + 1);
                }
                else
                {
                    _bounty.SetCharArray(_digits, 0, 0);
                }
            }
        }

        /// <summary>مخزون النور وعدد المنارات المضيئة — قراءة §11 على الشاشة.</summary>
        private void UpdateLight()
        {
            if (_light == null)
            {
                return;
            }

            if (_light.Stock != _shownStock)
            {
                _shownStock = _light.Stock;
                _lightStock.SetCharArray(_digits, 0, ArabicNumber.Write(_shownStock, _digits, 0));

                // المخزون الممتلئ ذهبيّ يلفت، والفارغ باهت لا يشغل العين
                _lightStock.color = _shownStock > 0 ? dawnColor : inkColor;
            }

            int lit = _light.LitCount;
            if (lit != _shownBeacons)
            {
                _shownBeacons = lit;
                _beaconCount.SetCharArray(_digits, 0, ArabicNumber.Write(lit, _digits, 0));
                _beaconCount.color = lit > 0 ? inkColor : hordeColor;
            }

            // التلميح أثناء التخطيط وحده: بقاؤه في الاشتباك ضجيج
            bool hint = _waves == null || _waves.CanHasten || _waves.Phase == WavePhase.Idle;
            if (hint != _shownHint)
            {
                _shownHint = hint;
                _hint.SetActive(hint);
            }
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

            int max = Mathf.RoundToInt(hero.MaxHealth);
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

            Announce(title, bannerHold + bannerFade);
        }

        /// <summary>
        /// يعرض لافتةً بنصٍّ منطقيّ مدّةً معلومة. تستعملها لقطة ظهور الزعيم
        /// (§6) كما تستعملها لافتة الموجة — لافتتان متطابقتان في مكانين
        /// تفترقان عند أوّل تعديل.
        /// </summary>
        public void Announce(string logicalTitle, float seconds)
        {
            if (_banner == null || _bannerText == null || string.IsNullOrEmpty(logicalTitle))
            {
                return;
            }

            _bannerText.text = Loc.Shape(logicalTitle);
            _banner.gameObject.SetActive(true);
            _banner.alpha = 1f;
            _bannerLeft = Mathf.Max(0.1f, seconds);
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
            BuildKeepBar(root);
            BuildSilverPanel(root);
            BuildLightPanel(root);
            BuildHeroPanel(root);
            BuildBanner(root);
            BuildHint(root);
        }

        /// <summary>لوحة الموجة: الزاوية اليمنى العليا — أوّل ما تقع عليه العين.</summary>
        private void BuildWavePanel(RectTransform root)
        {
            RectTransform panel = MakePanel("WavePanel", root,
                new Vector2(1f, 1f), new Vector2(-24f, -24f), new Vector2(330f, 108f));

            Label("Caption", panel, LocKeys.WaveCaption, 30f, goldColor,
                new Vector2(1f, 1f), new Vector2(-18f, -12f), new Vector2(150f, 38f),
                TextAlignmentOptions.MidlineRight);

            _waveNumber = Numeral("Number", panel, 44f, inkColor,
                new Vector2(0f, 1f), new Vector2(18f, -8f), new Vector2(110f, 48f),
                TextAlignmentOptions.MidlineLeft);

            _phaseLabel = Label("Phase", panel, LocKeys.PhasePrepare, 24f, goldColor,
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

            Label("Caption", rect, LocKeys.HastenButton, 26f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(180f, 44f),
                TextAlignmentOptions.Midline);

            return rect.gameObject;
        }

        /// <summary>لوحة الأعداد: كم واقفاً من كل جانب.</summary>
        private void BuildCountsPanel(RectTransform root)
        {
            // ‎-96‎ لا ‎-24‎: صفّ الإيقاف والسرعة يعلوها، و§7 تضعه أعلى الشاشة
            RectTransform panel = MakePanel("CountsPanel", root,
                new Vector2(0f, 1f), new Vector2(24f, -96f), new Vector2(300f, 108f));

            Label("KingdomCaption", panel, LocKeys.DefendersCaption, 24f, kingdomColor,
                new Vector2(1f, 1f), new Vector2(-18f, -12f), new Vector2(160f, 34f),
                TextAlignmentOptions.MidlineRight);

            _kingdomCount = Numeral("KingdomCount", panel, 30f, inkColor,
                new Vector2(0f, 1f), new Vector2(18f, -12f), new Vector2(96f, 34f),
                TextAlignmentOptions.MidlineLeft);

            Label("HordeCaption", panel, LocKeys.AttackersCaption, 24f, hordeColor,
                new Vector2(1f, 0f), new Vector2(-18f, 14f), new Vector2(160f, 34f),
                TextAlignmentOptions.MidlineRight);

            _hordeCount = Numeral("HordeCount", panel, 30f, inkColor,
                new Vector2(0f, 0f), new Vector2(18f, 14f), new Vector2(96f, 34f),
                TextAlignmentOptions.MidlineLeft);
        }

        /// <summary>
        /// شريط قلب الحصن أعلى الوسط: مستواه وصحّته وشريطها.
        /// </summary>
        private void BuildKeepBar(RectTransform root)
        {
            RectTransform panel = MakePanel("KeepBar", root,
                new Vector2(0.5f, 1f), new Vector2(0f, -18f), new Vector2(560f, 66f));

            Label("Caption", panel, LocKeys.KeepCaption, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -6f), new Vector2(180f, 32f),
                TextAlignmentOptions.MidlineRight);

            _keepHealth = Numeral("Health", panel, 22f, inkColor,
                new Vector2(0f, 1f), new Vector2(16f, -6f), new Vector2(160f, 32f),
                TextAlignmentOptions.MidlineLeft);

            // «المستوى ٤» نصّاً واحداً في وسط الصفّ: عنوانٌ ورقمٌ منفصلان
            // يتزاحمان مع «قلب الحصن» يميناً وعدّاد الصحّة يساراً.
            _keepTier = Numeral("Tier", panel, 22f, dawnColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -6f), new Vector2(200f, 32f),
                TextAlignmentOptions.Midline);

            RectTransform track = MakeRect("BarTrack", panel,
                new Vector2(0.5f, 0f), new Vector2(0f, 10f), new Vector2(528f, 18f));
            Image trackImage = track.gameObject.AddComponent<Image>();
            trackImage.color = new Color(0.078f, 0.086f, 0.094f, 0.92f);
            trackImage.raycastTarget = false;

            RectTransform fill = MakeRect("BarFill", track,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(520f, 11f));
            _keepBar = fill.gameObject.AddComponent<Image>();
            _keepBar.color = dawnColor;
            _keepBar.raycastTarget = false;
            _keepBar.type = Image.Type.Filled;
            _keepBar.fillMethod = Image.FillMethod.Horizontal;
            _keepBar.fillOrigin = (int)Image.OriginHorizontal.Right;
            _keepBar.fillAmount = 1f;
        }

        /// <summary>
        /// لوحة الفضّة أعلى اليسار فوق لوحة النور: هي الرقم الذي يُنظَر إليه
        /// قبل كل بناء، فيجب أن يكون في مكان ثابت لا يتنقّل.
        /// </summary>
        private void BuildSilverPanel(RectTransform root)
        {
            RectTransform panel = MakePanel("SilverPanel", root,
                new Vector2(0f, 1f), new Vector2(24f, -260f), new Vector2(340f, 62f));

            Label("Caption", panel, LocKeys.SilverCaption, 26f, goldColor,
                new Vector2(1f, 0.5f), new Vector2(-18f, 0f), new Vector2(120f, 40f),
                TextAlignmentOptions.MidlineRight);

            _silver = Numeral("Amount", panel, 32f, inkColor,
                new Vector2(0f, 0.5f), new Vector2(18f, 0f), new Vector2(120f, 40f),
                TextAlignmentOptions.MidlineLeft);

            _bounty = Numeral("Bounty", panel, 22f, kingdomColor,
                new Vector2(0.5f, 0.5f), new Vector2(14f, 0f), new Vector2(110f, 40f),
                TextAlignmentOptions.MidlineLeft);
        }

        /// <summary>
        /// لوحة النور تحت لوحة الأعداد: المخزون وعدد المنارات المضيئة.
        /// المنارات المضيئة بلون الخطر إن صفرت — انطفاؤها كلّها يعني أنّ درع
        /// الظلام يعمل بكامله في كل الساحة.
        /// </summary>
        private void BuildLightPanel(RectTransform root)
        {
            // 340 لا 300: «شحنات النور» و«منارات مضيئة» أطول من عناوين لوحة
            // الأعداد، ولوحةٌ يفيض نصّها عنها أسوأ من لوحة أعرض بقليل.
            RectTransform panel = MakePanel("LightPanel", root,
                new Vector2(0f, 1f), new Vector2(24f, -334f), new Vector2(340f, 108f));

            Label("StockCaption", panel, LocKeys.LightStockCaption, 24f, dawnColor,
                new Vector2(1f, 1f), new Vector2(-18f, -12f), new Vector2(220f, 34f),
                TextAlignmentOptions.MidlineRight);

            _lightStock = Numeral("Stock", panel, 30f, dawnColor,
                new Vector2(0f, 1f), new Vector2(18f, -12f), new Vector2(86f, 34f),
                TextAlignmentOptions.MidlineLeft);

            Label("BeaconCaption", panel, LocKeys.LightBeaconsCaption, 24f, inkColor,
                new Vector2(1f, 0f), new Vector2(-18f, 14f), new Vector2(220f, 34f),
                TextAlignmentOptions.MidlineRight);

            _beaconCount = Numeral("Beacons", panel, 30f, inkColor,
                new Vector2(0f, 0f), new Vector2(18f, 14f), new Vector2(86f, 34f),
                TextAlignmentOptions.MidlineLeft);
        }

        /// <summary>
        /// تلميح النقل: نظام النور لا يُكتشف بالصدفة. سطر واحد أثناء التخطيط
        /// يقول للّاعب ما الذي بيده — وأزرارٌ صامتة لا تعلّم أحداً.
        /// </summary>
        private void BuildHint(RectTransform root)
        {
            RectTransform rect = MakeRect("Hint", root,
                new Vector2(0.5f, 0f), new Vector2(0f, 26f), new Vector2(820f, 40f));

            Label("Text", rect, LocKeys.LightHint,
                24f, dawnColor, new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(820f, 40f),
                TextAlignmentOptions.Midline);

            _hint = rect.gameObject;
            _hint.SetActive(false);
        }

        /// <summary>لوحة البطل أسفل اليمين: قريبة من الإبهام على الجوّال.</summary>
        private void BuildHeroPanel(RectTransform root)
        {
            RectTransform panel = MakePanel("HeroPanel", root,
                new Vector2(1f, 0f), new Vector2(-24f, 24f), new Vector2(400f, 96f));

            _heroPanel = panel.gameObject.AddComponent<CanvasGroup>();
            _heroPanel.alpha = 0.35f;      // تبهت حتى يدخل البطل الساحة
            _heroPanel.blocksRaycasts = false;

            Label("Name", panel, LocKeys.HeroCaption, 28f, goldColor,
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
                new Vector2(0.5f, 1f), new Vector2(0f, -104f), new Vector2(720f, 76f));

            _banner = rect.gameObject.AddComponent<CanvasGroup>();
            _banner.blocksRaycasts = false;
            _banner.interactable = false;

            _bannerText = MakeText("Title", rect, 48f, goldColor,
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

        /// <summary>
        /// نصّ ثابت **بمفتاحه** لا بحروفه: `Loc` يجلبه باللغة الحالية ويشكّله.
        /// يُبنى مرّة في `Awake`، ويُعاد بناؤه عند تبديل اللغة.
        /// </summary>
        private TextMeshProUGUI Label(string name, Transform parent, string key, float size,
            Color color, Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            TextMeshProUGUI text = MakeText(name, parent, size, color, anchor, offset, rectSize, align);
            text.gameObject.AddComponent<LocalizedLabel>().Bind(text, key);
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
