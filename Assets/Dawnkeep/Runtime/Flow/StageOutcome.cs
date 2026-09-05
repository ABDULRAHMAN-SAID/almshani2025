using Dawnkeep.Building;
using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Flow
{
    /// <summary>نتيجة المرحلة (§5).</summary>
    public enum StageResult
    {
        Running = 0,
        Victory = 1,
        Defeat = 2,
    }

    /// <summary>
    /// شرطا الفوز والخسارة (§5)، ولا شيء غيرهما.
    ///
    /// **الفوز**: النجاة حتى نهاية الموجة المطلوبة وقلب الحصن حيّ.
    /// **الخسارة**: صحّة قلب الحصن صفر — وحدها. §5 تنصّ صراحةً على أنّ اللاعب
    /// **لا يخسر بموت البطل**، فهذا المكوّن لا ينظر إليه أصلاً.
    ///
    /// يوقف الزمن عند الحسم بدل هدم المشهد: اللاعب يريد أن يرى الساحة التي
    /// خسرها أو ربحها، لا شاشةً سوداء فوقها.
    /// </summary>
    [DisallowMultipleComponent]
    public class StageOutcome : MonoBehaviour
    {
        public static StageOutcome Instance { get; private set; }

        [Tooltip("مقابض توازن §10. يُملأ من باني الأصول؛ فارغاً يُستعمل العدد أدناه.")]
        [SerializeField] private Economy.BalanceSettings balance;

        [Tooltip("عدد الموجات التي تُنهي المرحلة بالنجاة (§5: عشر).")]
        [SerializeField] private int wavesToSurvive = 10;

        [Tooltip("يوقف الزمن عند الحسم فتبقى الساحة معروضة ساكنة.")]
        [SerializeField] private bool freezeOnResult = true;

        private WaveDirector _waves;
        private Keep _keep;
        private StageResult _result = StageResult.Running;

        /// <summary>يُطلق مرّة عند الحسم.</summary>
        public event System.Action<StageResult> Resolved;

        public StageResult Result { get { return _result; } }

        public int WavesToSurvive
        {
            get { return balance != null ? balance.WavesToSurvive : wavesToSurvive; }
        }

        /// <summary>الموجات التي نجا منها فعلاً — تعرضها شاشة النتيجة.</summary>
        public int WavesCleared { get; private set; }

        /// <summary>مخطّطٌ منحه الفوز أوّل مرّة (§19)، أو `null`. تعرضه النتيجة.</summary>
        public Dawnkeep.Equipment.EquipmentDefinition Blueprint { get; private set; }

        /// <summary>هل سجّلت هذه الجولة رقماً جديداً في نمطها (§20)؟</summary>
        public bool NewRecord { get; private set; }

        /// <summary>نجوم هذه الجولة (§21)، من ثلاث.</summary>
        public int Stars { get; private set; }

        /// <summary>الجديد منها — وهو ما يُثري (§21).</summary>
        public int FreshStars { get; private set; }

        /// <summary>
        /// هل خرج زعيمٌ هذه الجولة؟ يزيد شظيّةً (§21: «حسب الأهداف
        /// **والزعماء**»). يرفعه `BossDirector` عند التسجيل.
        /// </summary>
        public bool MetBoss { get; set; }

        private void Awake()
        {
            Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Start()
        {
            _waves = FindAnyObjectByType<WaveDirector>();
            _keep = Keep.Instance;
        }

        private void Update()
        {
            if (_result != StageResult.Running)
            {
                return;
            }

            if (_keep == null)
            {
                _keep = Keep.Instance;
            }

            if (_keep != null && _keep.Fallen)
            {
                Resolve(StageResult.Defeat);
                return;
            }

            // «حماية قافلة حتى الفجر» (§19): سقوطُها خسارةٌ ولو صمد القلب —
            // وإلّا صار الهدف نصّاً على الشاشة لا شرطاً في الساحة.
            if (Dawnkeep.Campaign.StageRules.Instance != null
                && Dawnkeep.Campaign.StageRules.Instance.ConvoyLost)
            {
                Resolve(StageResult.Defeat);
                return;
            }

            if (_waves == null)
            {
                return;
            }

            // العدّاد من `WaveDirector` لا من رقم الموجة: آخر موجة تتكرّر عند
            // نفاد المحتوى فيتجمّد رقمها، ولا يتحقّق شرط الفوز أبداً.
            WavesCleared = _waves.WavesCleared;

            // Endless بلا نهاية (§20): لا فوزَ فيه، والجولة تنتهي بالسقوط
            // وحده. وحبسُ الفوز خلف رقمٍ كبير ليس «بلا نهاية» بل نهايةٌ
            // بعيدة — والرقم يُبلَغ يوماً فتنتهي اللعبة بلا معنى.
            int nights = Dawnkeep.Modes.ModeDirector.NightsFor(
                Dawnkeep.Modes.ModeDirector.Current, WavesToSurvive);

            if (nights <= 0 || WavesCleared < nights)
            {
                return;
            }

            // «تشغيل منارتين خارجيّتين» (§19): الصمود وحده لا يكفي. ولا
            // تُحسَب خسارةً — اللاعب صمد، وما نقص إلّا الشرط: تبقى المرحلة
            // جاريةً حتى يُشعل، فيفوز حين يفعل.
            if (!Dawnkeep.Campaign.StageRules.BeaconsSatisfied)
            {
                return;
            }

            Resolve(StageResult.Victory);
        }

        private void Resolve(StageResult result)
        {
            _result = result;

            // مكافأة التقدّم الدائم (§16) تُمنح **هنا** ومرّةً واحدة: `Resolve`
            // تُستدعى من فرعين (فوزٍ وخسارة) ولا تُستدعى مرّتين — و`_result`
            // يمنع دخولها ثانيةً على كل حال.
            // النجوم أوّلاً (§21: «25 × عدد النجوم **الجديدة**»): تُحسب
            // وتُسجَّل قبل المكافأة، فالمكافأة تقرأ الجديد منها.
            bool won = result == StageResult.Victory;
            Stars = Dawnkeep.Campaign.StageStars.Earned(won);
            FreshStars = Dawnkeep.Campaign.StageStars.Record(
                Dawnkeep.Campaign.CampaignDirector.Current, Stars);

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null)
            {
                progress.AwardStage(WavesCleared, won, FreshStars, MetBoss);
            }

            RecordCampaign(result);
            RecordMode();

            // إنجاز مرحلة الحملة ومخطّطها (§19 و§17). عند الفوز وحده،
            // ومرّةً واحدة — `Complete` تحرسها بقائمة المنجَز لا بعدّاد.
            if (result == StageResult.Victory)
            {
                Dawnkeep.Campaign.CampaignDirector campaign =
                    Dawnkeep.Campaign.CampaignDirector.Instance;

                if (campaign != null)
                {
                    Blueprint = campaign.Complete();
                }
            }

            if (freezeOnResult)
            {
                Time.timeScale = 0f;
            }

            System.Action<StageResult> handler = Resolved;
            if (handler != null)
            {
                handler(result);
            }
        }

        /// <summary>
        /// يسجّل رقم النمط (§20) إن لم تكن حملة. **الرقم عدد الليالي**:
        /// أبسطُ ما يُقاس ويُفهَم، ولا يحتاج صيغةً تُشرَح.
        ///
        /// و`NewRecord` يعرضه شاشة النتيجة — رقمٌ يُسجَّل بلا أن يُقال ليس
        /// رقماً في نظر اللاعب.
        /// </summary>
        private void RecordMode()
        {
            Dawnkeep.Modes.ModeDirector modes = Dawnkeep.Modes.ModeDirector.Instance;
            if (modes == null
                || Dawnkeep.Modes.ModeDirector.Current == Dawnkeep.Modes.PlayMode.Campaign)
            {
                return;
            }

            NewRecord = modes.Record(Dawnkeep.Modes.ModeDirector.Current, WavesCleared);
        }

        /// <summary>
        /// يسجّل ما بلغته هذه الجولة في كتلة الحملة (§27). **أبعدُ ليلةٍ لا
        /// آخرُها**: من نجا من ثمانٍ ثمّ أعاد فخسر في ثلاث لم يتراجع تقدّمه.
        /// </summary>
        private void RecordCampaign(StageResult result)
        {
            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save == null)
            {
                return;
            }

            Dawnkeep.Save.SaveData data = save.Data;
            data.Profile.StagesPlayed++;

            if (result == StageResult.Victory)
            {
                data.Profile.StagesWon++;
                data.Campaign.Victories++;
            }

            if (WavesCleared > data.Campaign.FurthestWave)
            {
                data.Campaign.FurthestWave = WavesCleared;
            }

            save.Mark();

            // الكتابة الآن لا على الفترة: شاشة النتيجة قد تُتبع بإغلاق
            // التطبيق، وجولةٌ كاملة أثمن من أن تُترك لفترةٍ لم تحن.
            save.Flush();
        }

        /// <summary>يستأنف الزمن — تناديه شاشة النتيجة عند الإعادة.</summary>
        public void Resume()
        {
            Time.timeScale = 1f;
        }
    }
}
