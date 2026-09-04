using Dawnkeep.Building;
using Dawnkeep.Combat;
using Dawnkeep.Flow;
using Dawnkeep.Localization;
using Dawnkeep.Squads;
using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// الإيقاف المؤقّت وتبويباته وسرعة اللعب (§7).
    ///
    /// كل تبويب يعرض **بياناً حقيقيّاً** من أنظمة اللعبة: تركيبة الموجة من
    /// أصلها، والفرق من قائدها، والمباني من قائدها، والإعدادات تعمل فعلاً.
    /// تبويبٌ يعرض نصّاً ثابتاً لوحةٌ شكلية، وهي ممنوعة (§17).
    ///
    /// **لا يستأنف الزمن إن كانت المرحلة قد حُسمت**: شاشة النتيجة توقفه عمداً
    /// (§5)، ورفعُ الإيقاف من هنا يعيد تشغيل معركة انتهت.
    /// </summary>
    [DisallowMultipleComponent]
    public class PauseMenu : MonoBehaviour
    {
        /// <summary>
        /// خمسة تبويبات: موجة الليلة، وقوّاتي، والأبراج، وبركاتي، والإعدادات.
        /// **الإعدادات آخرها دائماً** — `ShowTab` يميّزها بموضعها لا باسمها.
        /// </summary>
        private const int TabCount = 5;
        private const int MaxRows = 9;

        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.94f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color goldColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color dimColor = new Color(0.243f, 0.271f, 0.318f, 0.92f);

        [Tooltip("سرعات اللعب المتاحة (§7: 1× و2× و3×).")]
        [SerializeField] private float[] speeds = { 1f, 2f, 3f };

        [Tooltip("لون الزرّ المقفل — يُعرض ولا يُخفى (§16).")]
        [SerializeField] private Color lockedColor = new Color(0.098f, 0.106f, 0.122f, 0.92f);

        [Tooltip("لون نصّه.")]
        [SerializeField] private Color lockedInk = new Color(0.455f, 0.447f, 0.427f);

        private GameObject _root;
        private GameObject _listBody;
        private GameObject _settingsBody;
        private Image[] _tabHead;
        private TextMeshProUGUI[] _rows;
        private Image[] _speedButton;
        private TextMeshProUGUI[] _speedCaption;
        private Image[] _languageButton;
        private Image[] _difficultyButton;
        private Image[] _qualityButton;

        [Tooltip("أرقام الأداء (§31). فارغاً يُخفى اختيار الدرجة.")]
        [SerializeField] private Dawnkeep.Performance.PerformanceSettings performance;
        private Image _healthBarsButton;
        private Image _stickSizeButton;
        private Image _stickFadeButton;
        private Image _handedButton;
        private TextMeshProUGUI _stickSizeValue;
        private TextMeshProUGUI _stickFadeValue;
        private TextMeshProUGUI _handedValue;
        private TextMeshProUGUI _healthBarsValue;

        private WaveDirector _waves;
        private SquadDirector _squads;
        private BuildingDirector _buildings;
        private StageOutcome _outcome;
        private LocaleRuntime _locale;
        private HealthBarPool _healthBars;

        private int _tab;
        private int _speed;

        public bool IsOpen { get { return _root != null && _root.activeSelf; } }

        private void Awake()
        {
            Build();
        }

        private void Start()
        {
            _waves = FindAnyObjectByType<WaveDirector>();
            _squads = SquadDirector.Instance;
            _buildings = BuildingDirector.Instance;
            _outcome = StageOutcome.Instance;
            _locale = FindAnyObjectByType<LocaleRuntime>();
            _healthBars = FindAnyObjectByType<HealthBarPool>();

            // الاستعادة قبل الصبغ: الصبغُ يقرأ ما استُعيد، وعكسُه يعرض
            // الافتراضيّ ثمّ يبدّله بعد إطارٍ أمام عين اللاعب.
            RestoreSettings();

            PaintSpeed();
            PaintLanguage();
            PaintHealthBars();
            PaintDifficulty();
            PaintStick();
            PaintQuality();
        }

        private void Update()
        {
            Keyboard keyboard = Keyboard.current;
            if (keyboard != null && keyboard.escapeKey.wasPressedThisFrame)
            {
                Toggle();
            }
        }

        // ── الفتح والإغلاق ──────────────────────────────────────────────────

        public void Toggle()
        {
            if (IsOpen)
            {
                Resume();
            }
            else
            {
                Open();
            }
        }

        public void Open()
        {
            if (_outcome != null && _outcome.Result != StageResult.Running)
            {
                return;      // المرحلة حُسمت: شاشة النتيجة صاحبة الزمن
            }

            _root.SetActive(true);
            Time.timeScale = 0f;
            Fill();
        }

        public void Resume()
        {
            _root.SetActive(false);

            if (_outcome != null && _outcome.Result != StageResult.Running)
            {
                return;      // لا يُستأنف زمنُ معركةٍ انتهت
            }

            // السرعة المحفوظة قد تكون مقفلةً الآن (تُمحى بيانات، أو يُفتح
            // المشهد على حساب آخر): تُردّ إلى العادية بدل أن تعمل مجّاناً.
            Dawnkeep.Meta.Progress meta = Dawnkeep.Meta.Progress.Instance;
            if (meta != null && !meta.SpeedUnlocked(_speed))
            {
                _speed = 0;
            }

            Time.timeScale = speeds[Mathf.Clamp(_speed, 0, speeds.Length - 1)];
        }

        // ── التبويبات ───────────────────────────────────────────────────────

        private void ShowTab(int index)
        {
            _tab = Mathf.Clamp(index, 0, TabCount - 1);

            // التبويبات الثلاثة الأولى صفوف نصّ فتتشارك جسماً واحداً؛ الإعدادات
            // أزرار فلها جسمها. أربعة أجسام متطابقة تعني أربع نسخ من الصفوف
            // تُملأ ثلاثتها بلا أن تُرى.
            bool settings = _tab == TabCount - 1;
            _listBody.SetActive(!settings);
            _settingsBody.SetActive(settings);

            for (int i = 0; i < TabCount; i++)
            {
                _tabHead[i].color = i == _tab ? goldColor * 0.34f : dimColor;
            }

            Fill();
        }

        /// <summary>يملأ صفوف التبويب المفتوح من بيانات النظام الحيّة.</summary>
        private void Fill()
        {
            for (int i = 0; i < _rows.Length; i++)
            {
                _rows[i].text = string.Empty;
            }

            int written = 0;
            switch (_tab)
            {
                case 0: written = FillWave(); break;
                case 1: written = FillForces(); break;
                case 2: written = FillTowers(); break;
                case 3: written = FillBoons(); break;
                default: return;      // الإعدادات أزرار لا صفوف
            }

            if (written == 0)
            {
                _rows[0].text = Loc.Text(LocKeys.TabEmpty);
            }
        }

        private int FillWave()
        {
            if (_waves == null)
            {
                return 0;
            }

            WaveDefinition wave = _waves.CurrentWave;
            if (wave == null)
            {
                return 0;
            }

            int row = 0;
            _rows[row++].text = Loc.Shape(wave.Title);

            WaveDefinition.Entry[] entries = wave.Entries;

            // جهتان في هذه الليلة؟ يُقال قبل الجدول: هو أهمّ ما في المعاينة —
            // من يبني كل شيء على جهة واحدة يخسر الليلة قبل أن تبدأ.
            bool twoFronts = false;
            for (int i = 0; i < entries.Length; i++)
            {
                if (entries[i].Front != 0)
                {
                    twoFronts = true;
                    break;
                }
            }

            if (twoFronts && row < MaxRows)
            {
                _rows[row++].text = Loc.Text(LocKeys.WaveSecondFront);
            }

            // §14: المعاينة الكاملة لدرجة «حكاية» وحدها. وما اشتبك فقد رُئي،
            // فحجبه بعد خروجه سرٌّ عن شيء أمام عين اللاعب.
            bool reveal = _waves.FullPreview || _waves.Phase == WavePhase.Assault;
            if (!reveal)
            {
                if (row < MaxRows)
                {
                    _rows[row++].text = Loc.Format(LocKeys.WavePreviewRow,
                        Loc.Text(LocKeys.AttackersCaption), Digits(wave.TotalUnits));
                }

                if (row < MaxRows)
                {
                    _rows[row++].text = Loc.Text(LocKeys.WavePreviewHidden);
                }

                return row;
            }

            for (int i = 0; i < entries.Length && row < MaxRows; i++)
            {
                if (entries[i].Unit == null)
                {
                    continue;
                }

                _rows[row++].text = Loc.Format(LocKeys.WavePreviewRow,
                    entries[i].Unit.DisplayName, Digits(entries[i].Count));
            }

            return row;
        }

        /// <summary>
        /// ما أُخذ من البركات هذه الجولة (§15). يُقرأ من `BoonBook` لا من
        /// المُوزِّع: المُوزِّع يعرف ما عُرض، والكتاب يعرف ما صار في اليد.
        /// </summary>
        private int FillBoons()
        {
            Dawnkeep.Boons.BoonBook book = Dawnkeep.Boons.BoonBook.Instance;
            if (book == null)
            {
                return 0;
            }

            System.Collections.Generic.IReadOnlyList<Dawnkeep.Boons.BoonDefinition> taken =
                book.Taken;

            int row = 0;
            for (int i = 0; i < taken.Count && row < MaxRows; i++)
            {
                if (taken[i] == null)
                {
                    continue;
                }

                _rows[row++].text = Loc.Format(LocKeys.BoonRow,
                    taken[i].DisplayName, taken[i].Summary);
            }

            return row;
        }

        private int FillForces()
        {
            if (_squads == null)
            {
                _squads = SquadDirector.Instance;
            }

            if (_squads == null)
            {
                return 0;
            }

            System.Collections.Generic.IReadOnlyList<Squad> squads = _squads.Squads;
            int row = 0;

            for (int i = 0; i < squads.Count && row < MaxRows; i++)
            {
                Squad squad = squads[i];
                if (squad == null || squad.LiveCount == 0)
                {
                    continue;
                }

                _rows[row++].text = Loc.Format(LocKeys.SquadOrderLabel,
                    Loc.Raw(OrderKey(squad.Order)), Digits(squad.LiveCount));
            }

            return row;
        }

        private int FillTowers()
        {
            if (_buildings == null)
            {
                _buildings = BuildingDirector.Instance;
            }

            if (_buildings == null)
            {
                return 0;
            }

            System.Collections.Generic.IReadOnlyList<Building.Building> list = _buildings.Buildings;
            int row = 0;

            for (int i = 0; i < list.Count && row < MaxRows; i++)
            {
                Building.Building building = list[i];
                if (building == null || !building.Alive || building.Definition == null)
                {
                    continue;
                }

                _rows[row++].text = Loc.Format(LocKeys.SquadOrderLabel,
                    building.Definition.DisplayName,
                    Digits(Mathf.CeilToInt(building.Health)));
            }

            return row;
        }

        private static string OrderKey(SquadOrder order)
        {
            switch (order)
            {
                case SquadOrder.Follow: return LocKeys.OrderFollow;
                case SquadOrder.Hold: return LocKeys.OrderHold;
                case SquadOrder.Defend: return LocKeys.OrderDefend;
                case SquadOrder.Retreat: return LocKeys.OrderRetreat;
                default: return LocKeys.OrderGarrisonName;
            }
        }

        // ── الإعدادات ───────────────────────────────────────────────────────

        /// <summary>
        /// السرعة تُفتح بمستوى الحساب (§16). الزرّ المقفل **يُعرض مطفأً** لا
        /// يُخفى: أن يرى اللاعب ما ينتظره أدعى إلى المضيّ من أن يُفاجأ بزرٍّ
        /// يظهر يوماً بلا سبب.
        /// </summary>
        private void SetSpeed(int index)
        {
            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null && !progress.SpeedUnlocked(index))
            {
                return;
            }

            _speed = Mathf.Clamp(index, 0, speeds.Length - 1);
            Remember(save => save.Data.Settings.SpeedIndex = _speed);
            PaintSpeed();

            // اللوحة مفتوحة والزمن موقوف: السرعة تُطبَّق عند المتابعة لا الآن،
            // وإلّا استأنفت اللعبة تحت اللوحة.
            if (!IsOpen)
            {
                Time.timeScale = speeds[_speed];
            }
        }

        private void PaintSpeed()
        {
            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;

            for (int i = 0; i < _speedButton.Length; i++)
            {
                bool open = progress == null || progress.SpeedUnlocked(i);

                _speedButton[i].color = !open
                    ? lockedColor
                    : (i == _speed ? goldColor * 0.34f : dimColor);

                if (_speedCaption != null && _speedCaption[i] != null)
                {
                    _speedCaption[i].color = open ? inkColor : lockedInk;
                }
            }
        }

        private void SetLanguage(Language language)
        {
            if (_locale != null)
            {
                _locale.SetLanguage(language);
            }
            else
            {
                Loc.Current = language;
            }

            PaintLanguage();
            Fill();      // الصفوف مبنيّة بالنصّ لا بالمفتاح، فتُعاد كتابتها
        }

        private void PaintLanguage()
        {
            for (int i = 0; i < _languageButton.Length; i++)
            {
                _languageButton[i].color = (int)Loc.Current == i ? goldColor * 0.34f : dimColor;
            }
        }

        /// <summary>
        /// يبدّل الدرجة (§14). أثرها على الموجة **التالية**: تبديلها في منتصف
        /// اشتباكٍ يجعل نصف المهاجمين أقوى من نصفهم الآخر بلا سبب مرئيّ.
        /// </summary>
        private void SetDifficulty(Difficulty level)
        {
            // «الكابوس» تُفتح بعد إنهاء المنطقة (§14) — والمخضرم قبلها. الزرّ
            // المقفل يُعرض مطفأً كأزرار السرعة، فيعرف اللاعب ما ينتظره.
            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null && !progress.DifficultyUnlocked(level))
            {
                return;
            }

            if (_waves != null)
            {
                _waves.SetDifficulty(level);
            }

            Remember(save => save.Data.Settings.Difficulty = (int)level);
            PaintDifficulty();
            Fill();
        }

        private void PaintDifficulty()
        {
            if (_difficultyButton == null)
            {
                return;
            }

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            int active = _waves != null ? (int)_waves.Level : (int)Difficulty.Normal;

            for (int i = 0; i < _difficultyButton.Length; i++)
            {
                bool open = progress == null || progress.DifficultyUnlocked((Difficulty)i);

                _difficultyButton[i].color = !open
                    ? lockedColor
                    : (i == active ? goldColor * 0.34f : dimColor);
            }
        }

        /// <summary>
        /// حجم العصا يدور على ثلاث درجات (§7). دورةٌ لا شريط: الشريط يحتاج
        /// سحباً دقيقاً على لوحةٍ موقوفة الزمن، والدورة ضغطةٌ واحدة تُرى
        /// نتيجتها فوراً عند المتابعة.
        /// </summary>
        private void CycleStickSize()
        {
            VirtualJoystick stick = VirtualJoystick.Instance;
            if (stick == null)
            {
                return;
            }

            float[] steps = { 0.8f, 1f, 1.3f };
            int next = 0;
            for (int i = 0; i < steps.Length; i++)
            {
                if (Mathf.Abs(steps[i] - stick.Scale) < 0.05f)
                {
                    next = (i + 1) % steps.Length;
                    break;
                }
            }

            stick.SetScale(steps[next]);
            PaintStick();
        }

        private void CycleStickFade()
        {
            VirtualJoystick stick = VirtualJoystick.Instance;
            if (stick == null)
            {
                return;
            }

            float[] steps = { 1f, 0.6f, 0.3f };
            int next = 0;
            for (int i = 0; i < steps.Length; i++)
            {
                if (Mathf.Abs(steps[i] - stick.Opacity) < 0.05f)
                {
                    next = (i + 1) % steps.Length;
                    break;
                }
            }

            stick.SetOpacity(steps[next]);
            PaintStick();
        }

        private void ToggleHanded()
        {
            Handedness.LeftHanded = !Handedness.LeftHanded;
            PaintStick();
        }

        /// <summary>
        /// يكتب إعداداً في ملفّ الحفظ (§27) ويعلّم الحاجة إلى الكتابة. دالّةٌ
        /// واحدة بدل ستّة أسطر متكرّرة، وهي التي تضمن ألّا يُنسى `Mark`.
        /// </summary>
        private static void Remember(System.Action<Dawnkeep.Save.SaveService> write)
        {
            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save == null)
            {
                return;
            }

            write(save);
            save.Mark();
        }

        /// <summary>
        /// يستعيد ما حُفظ من إعدادات (§27). يُستدعى بعد البناء لا قبله:
        /// أزرارُ السرعة تُصبغ بحسب المحفوظ، ولا وجود لها قبل البناء.
        /// </summary>
        private void RestoreSettings()
        {
            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save == null)
            {
                return;
            }

            Dawnkeep.Save.SaveSettings settings = save.Data.Settings;

            _speed = Mathf.Clamp(settings.SpeedIndex, 0, speeds.Length - 1);

            if (_healthBars == null)
            {
                _healthBars = FindAnyObjectByType<HealthBarPool>();
            }

            if (_healthBars != null)
            {
                _healthBars.enabled = settings.HealthBars;
            }

            if (_waves != null)
            {
                _waves.SetDifficulty((Difficulty)Mathf.Clamp(settings.Difficulty, 0, 3));
            }
        }

        /// <summary>
        /// يبدّل درجة الجهاز (§31). أثرها على الموجة **التالية** لا الجارية:
        /// خفضُ السقف وسط اشتباكٍ لا يمحو من في الساحة، ورفعُه لا يملؤها —
        /// فالتبديل في منتصفها يُقرأ بلا أثر ثمّ يظهر فجأةً.
        /// </summary>
        private void SetQuality(Dawnkeep.Performance.QualityTier level)
        {
            if (performance != null)
            {
                performance.Tier = level;
            }

            PaintQuality();
        }

        private void PaintQuality()
        {
            if (_qualityButton == null)
            {
                return;
            }

            int active = performance != null ? (int)performance.Tier : 1;
            for (int i = 0; i < _qualityButton.Length; i++)
            {
                _qualityButton[i].color = i == active ? goldColor * 0.34f : dimColor;
            }
        }

        private void PaintStick()
        {
            VirtualJoystick stick = VirtualJoystick.Instance;

            if (_stickSizeValue != null)
            {
                _stickSizeValue.text = stick != null
                    ? Loc.Format(LocKeys.SettingStickSize, Digits(Mathf.RoundToInt(stick.Scale * 100f)))
                    : Loc.Text(LocKeys.SettingOff);
            }

            if (_stickFadeValue != null)
            {
                _stickFadeValue.text = stick != null
                    ? Loc.Format(LocKeys.SettingStickFade, Digits(Mathf.RoundToInt(stick.Opacity * 100f)))
                    : Loc.Text(LocKeys.SettingOff);
            }

            if (_handedValue != null)
            {
                _handedValue.text = Loc.Text(Handedness.LeftHanded
                    ? LocKeys.SettingLeftHanded : LocKeys.SettingRightHanded);
            }

            if (_handedButton != null)
            {
                _handedButton.color = Handedness.LeftHanded ? goldColor * 0.34f : dimColor;
            }
        }

        private void ToggleHealthBars()
        {
            if (_healthBars == null)
            {
                _healthBars = FindAnyObjectByType<HealthBarPool>();
            }

            if (_healthBars == null)
            {
                return;
            }

            _healthBars.enabled = !_healthBars.enabled;
            Remember(save => save.Data.Settings.HealthBars = _healthBars.enabled);
            PaintHealthBars();
        }

        private void PaintHealthBars()
        {
            if (_healthBarsValue == null)
            {
                return;
            }

            bool on = _healthBars != null && _healthBars.enabled;
            _healthBarsButton.color = on ? goldColor * 0.34f : dimColor;
            _healthBarsValue.text = Loc.Text(on ? LocKeys.SettingOn : LocKeys.SettingOff);
        }

        private static string Digits(int value)
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
                Debug.LogError("مملكة الرماد: PauseMenu يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            BuildTopRow(parent);

            RectTransform panel = MakeRect("PausePanel", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(900f, 560f));

            Image background = panel.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            TextMeshProUGUI title = MakeText("Title", panel, 40f, goldColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -14f), new Vector2(600f, 56f),
                TextAlignmentOptions.Midline);
            title.gameObject.AddComponent<LocalizedLabel>().Bind(title, LocKeys.PauseTitle);

            _tabHead = new Image[TabCount];

            string[] keys =
            {
                LocKeys.TabWave, LocKeys.TabForces, LocKeys.TabTowers,
                LocKeys.TabBoons, LocKeys.TabSettings,
            };
            for (int i = 0; i < TabCount; i++)
            {
                // أوّل تبويب يميناً: ترتيب القراءة العربي. العرض ١٧٠ لا ٢١٠
                // بعد التبويب الخامس: خمسةٌ بالعرض القديم تبلغ ١٠٩٦ بكسلاً
                // على لوحةٍ عرضها ٩٠٠، فيخرج آخرها من إطارها.
                float x = -14f - (i * 176f);
                int captured = i;

                RectTransform head = MakeRect("Tab_" + i, panel,
                    new Vector2(1f, 1f), new Vector2(x, -78f), new Vector2(170f, 54f));

                Image face = head.gameObject.AddComponent<Image>();
                face.color = dimColor;
                face.raycastTarget = true;
                _tabHead[i] = face;

                Button button = head.gameObject.AddComponent<Button>();
                button.targetGraphic = face;
                button.onClick.AddListener(delegate { ShowTab(captured); });

                Label("Caption", head, keys[i], 21f, inkColor,
                    new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(162f, 40f),
                    TextAlignmentOptions.Midline);
            }

            RectTransform list = MakeRect("ListBody", panel,
                new Vector2(0.5f, 1f), new Vector2(0f, -140f), new Vector2(860f, 340f));
            _listBody = list.gameObject;
            BuildRows(list);

            RectTransform settingsBody = MakeRect("SettingsBody", panel,
                new Vector2(0.5f, 1f), new Vector2(0f, -140f), new Vector2(860f, 340f));
            _settingsBody = settingsBody.gameObject;
            BuildSettings(settingsBody);

            RectTransform resume = MakeRect("Resume", panel,
                new Vector2(0.5f, 0f), new Vector2(0f, 20f), new Vector2(260f, 62f));

            Image resumeFace = resume.gameObject.AddComponent<Image>();
            resumeFace.color = goldColor * 0.34f;
            resumeFace.raycastTarget = true;

            Button resumeButton = resume.gameObject.AddComponent<Button>();
            resumeButton.targetGraphic = resumeFace;
            resumeButton.onClick.AddListener(Resume);

            Label("Caption", resume, LocKeys.PauseResume, 28f, goldColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(240f, 44f),
                TextAlignmentOptions.Midline);

            _root = panel.gameObject;
            _root.SetActive(false);
            ShowTab(0);
            _root.SetActive(false);
        }

        /// <summary>صفّ الإيقاف والسرعة أعلى اليسار (§7: أعلى الشاشة).</summary>
        private void BuildTopRow(RectTransform parent)
        {
            RectTransform row = MakeRect("TopRow", parent,
                new Vector2(0f, 1f), new Vector2(24f, -24f), new Vector2(300f, 56f));

            Image background = row.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = false;

            RectTransform pause = MakeRect("PauseButton", row,
                new Vector2(1f, 0.5f), new Vector2(-8f, 0f), new Vector2(108f, 44f));

            Image pauseFace = pause.gameObject.AddComponent<Image>();
            pauseFace.color = dimColor;
            pauseFace.raycastTarget = true;

            Button pauseButton = pause.gameObject.AddComponent<Button>();
            pauseButton.targetGraphic = pauseFace;
            pauseButton.onClick.AddListener(Open);

            Label("Caption", pause, LocKeys.PauseButton, 22f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(100f, 34f),
                TextAlignmentOptions.Midline);

            _speedButton = new Image[speeds.Length];
            _speedCaption = new TextMeshProUGUI[speeds.Length];
            for (int i = 0; i < speeds.Length; i++)
            {
                int captured = i;
                RectTransform button = MakeRect("Speed_" + i, row,
                    new Vector2(0f, 0.5f), new Vector2(8f + (i * 58f), 0f), new Vector2(54f, 44f));

                Image face = button.gameObject.AddComponent<Image>();
                face.color = dimColor;
                face.raycastTarget = true;
                _speedButton[i] = face;

                Button action = button.gameObject.AddComponent<Button>();
                action.targetGraphic = face;
                action.onClick.AddListener(delegate { SetSpeed(captured); });

                TextMeshProUGUI caption = MakeText("Caption", button, 22f, inkColor,
                    new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(48f, 34f),
                    TextAlignmentOptions.Midline);
                caption.text = Digits(Mathf.RoundToInt(speeds[i])) + "×";
                _speedCaption[i] = caption;
            }
        }

        private void BuildRows(RectTransform body)
        {
            _rows = new TextMeshProUGUI[MaxRows];
            for (int i = 0; i < MaxRows; i++)
            {
                _rows[i] = MakeText("Row_" + i, body, 24f, inkColor,
                    new Vector2(1f, 1f), new Vector2(-16f, -8f - (i * 36f)), new Vector2(820f, 34f),
                    TextAlignmentOptions.MidlineRight);
            }
        }

        private void BuildSettings(RectTransform body)
        {
            Label("LanguageCaption", body, LocKeys.SettingLanguage, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -10f), new Vector2(220f, 40f),
                TextAlignmentOptions.MidlineRight);

            _languageButton = new Image[2];
            _languageButton[0] = MakeChoice(body, "Arabic", LocKeys.SettingArabic, -250f, -10f,
                delegate { SetLanguage(Language.Arabic); });
            _languageButton[1] = MakeChoice(body, "English", LocKeys.SettingEnglish, -412f, -10f,
                delegate { SetLanguage(Language.English); });

            Label("BarsCaption", body, LocKeys.SettingHealthBars, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -74f), new Vector2(220f, 40f),
                TextAlignmentOptions.MidlineRight);

            // القيمة تُكتب يدويّاً لا بـ`LocalizedLabel`: المكوّن يعيد كتابة
            // مفتاحه عند تبديل اللغة فيطمس «مطفأة» ويعيدها «تعمل».
            _healthBarsButton = MakeChoice(body, "Bars", null, -250f, -74f, ToggleHealthBars);
            _healthBarsValue = _healthBarsButton.GetComponentInChildren<TextMeshProUGUI>();

            Label("DifficultyCaption", body, LocKeys.SettingDifficulty, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -138f), new Vector2(220f, 40f),
                TextAlignmentOptions.MidlineRight);

            string[] levelKeys =
            {
                LocKeys.DifficultyStory, LocKeys.DifficultyNormal,
                LocKeys.DifficultyVeteran, LocKeys.DifficultyNightmare,
            };

            _difficultyButton = new Image[levelKeys.Length];
            for (int i = 0; i < levelKeys.Length; i++)
            {
                Difficulty captured = (Difficulty)i;
                // ١٦٢ لا ١٣٨: الزرّ عرضه ١٥٢، فتباعدٌ أقلّ منه يجعلهما
                // يتراكبان بأربعة عشر بكسلاً — وهو إيقاع صفّ اللغة نفسه.
                _difficultyButton[i] = MakeChoice(body, "Level_" + i, levelKeys[i],
                    -250f - (i * 162f), -138f, delegate { SetDifficulty(captured); });
            }

            // ── إعدادات العصا (§7): «حساسية عصا وتحجيمها وشفافيتها» ──
            Label("StickCaption", body, LocKeys.SettingStick, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -202f), new Vector2(220f, 40f),
                TextAlignmentOptions.MidlineRight);

            _stickSizeButton = MakeChoice(body, "StickSize", null, -250f, -202f, CycleStickSize);
            _stickSizeValue = _stickSizeButton.GetComponentInChildren<TextMeshProUGUI>();

            _stickFadeButton = MakeChoice(body, "StickFade", null, -412f, -202f, CycleStickFade);
            _stickFadeValue = _stickFadeButton.GetComponentInChildren<TextMeshProUGUI>();

            Label("QualityCaption", body, LocKeys.SettingQuality, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -330f), new Vector2(220f, 40f),
                TextAlignmentOptions.MidlineRight);

            string[] qualityKeys =
            {
                LocKeys.QualityLow, LocKeys.QualityMedium, LocKeys.QualityHigh,
            };

            _qualityButton = new Image[qualityKeys.Length];
            for (int i = 0; i < qualityKeys.Length; i++)
            {
                Dawnkeep.Performance.QualityTier captured =
                    (Dawnkeep.Performance.QualityTier)i;

                _qualityButton[i] = MakeChoice(body, "Quality_" + i, qualityKeys[i],
                    -250f - (i * 162f), -330f, delegate { SetQuality(captured); });
            }

            Label("HandCaption", body, LocKeys.SettingHanded, 26f, goldColor,
                new Vector2(1f, 1f), new Vector2(-16f, -266f), new Vector2(220f, 40f),
                TextAlignmentOptions.MidlineRight);

            _handedButton = MakeChoice(body, "Handed", null, -250f, -266f, ToggleHanded);
            _handedValue = _handedButton.GetComponentInChildren<TextMeshProUGUI>();

            // السرعة أزرارها في الصفّ العلوي (§7): تكرار عنوانها هنا بلا قيمة
            // يعرضها لصقٌ لا إعداد.
        }

        private Image MakeChoice(Transform parent, string name, string captionKey,
            float x, float y, UnityEngine.Events.UnityAction action)
        {
            RectTransform rect = MakeRect(name, parent,
                new Vector2(1f, 1f), new Vector2(x, y), new Vector2(152f, 44f));

            Image face = rect.gameObject.AddComponent<Image>();
            face.color = dimColor;
            face.raycastTarget = true;

            Button button = rect.gameObject.AddComponent<Button>();
            button.targetGraphic = face;
            button.onClick.AddListener(action);

            TextMeshProUGUI caption = MakeText("Caption", rect, 22f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(144f, 34f),
                TextAlignmentOptions.Midline);

            if (!string.IsNullOrEmpty(captionKey))
            {
                caption.gameObject.AddComponent<LocalizedLabel>().Bind(caption, captionKey);
            }

            return face;
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

        private TextMeshProUGUI Label(string name, Transform parent, string key, float size,
            Color color, Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            TextMeshProUGUI text = MakeText(name, parent, size, color, anchor, offset, rectSize, align);
            text.gameObject.AddComponent<LocalizedLabel>().Bind(text, key);
            return text;
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
