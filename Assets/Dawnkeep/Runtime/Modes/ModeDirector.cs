using UnityEngine;

namespace Dawnkeep.Modes
{
    /// <summary>
    /// النمط الجاري وما يفتحه (§20).
    ///
    /// **لا يبني نمطاً ثانياً من اللعبة**: الحلقة واحدة (بناءٌ فليلٌ ففجر)،
    /// والنمطُ يبدّل ثلاثة أشياء لا أكثر — **البذرة**، و**عدد الليالي**،
    /// و**ما يُملَك عند البداية**. نسخةٌ ثانية من الحلقة لكل نمط تعني أربع
    /// حلقاتٍ تتفرّق عللُها.
    ///
    /// و‎−400‎ مع بقيّة قرّاء الحفظ، وساكنُ النمط يعبر بين المشهدين كما
    /// تعبر المرحلة الجارية.
    /// </summary>
    [DefaultExecutionOrder(-400)]
    [DisallowMultipleComponent]
    public class ModeDirector : MonoBehaviour
    {
        public static ModeDirector Instance { get; private set; }

        /// <summary>النمط الجاري. ساكنٌ: يُكتب في القائمة ويُقرأ في المعركة.</summary>
        public static PlayMode Current { get; private set; }

        [Tooltip("ليالي Endless قبل أن يُحسب الرقم — صفرٌ يعني بلا نهاية.")]
        [SerializeField] private int endlessNights;

        [Tooltip("ليالي التجربة اليومية (§20: «قصيرة»).")]
        [SerializeField] private int dailyNights = 7;

        [Tooltip("ليالي صيد الزعماء — معركةٌ قصيرة (§20).")]
        [SerializeField] private int bossHuntNights = 3;

        [Tooltip("فضّة البداية في التجربة اليومية: تجهيزٌ محدَّد سلفاً (§20).")]
        [SerializeField] private int dailySilver = 320;

        private Dawnkeep.Save.SaveService _save;
        private readonly Dawnkeep.Save.SaveData _fallback = new Dawnkeep.Save.SaveData();

        private Dawnkeep.Save.SaveData Store
        {
            get
            {
                if (_save == null)
                {
                    _save = Dawnkeep.Save.SaveService.Instance;
                }

                return _save != null ? _save.Data : _fallback;
            }
        }

        public event System.Action Changed;

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

        // ── الفتح ───────────────────────────────────────────────────────────

        /// <summary>
        /// هل فُتح النمط؟ §20: «Endless يفتح بعد المنطقة الأولى»، و«Boss Hunt
        /// يفتح بعد المنطقة الثانية». والقياس من **المراحل المنجَزة** لا من
        /// عدّادٍ ثانٍ — فالحملة هي مصدر الخبر.
        /// </summary>
        public bool Unlocked(PlayMode mode)
        {
            switch (mode)
            {
                case PlayMode.Endless:
                    return ZoneDone(1);

                case PlayMode.BossHunt:
                    return ZoneDone(2);

                case PlayMode.DailyTrial:
                    // اليومية تُفتح مع Endless: كلتاهما خارج الحملة، وفتحُ
                    // إحداهما دون الأخرى يترك اللاعب بنمطٍ واحدٍ خارجها.
                    return ZoneDone(1);

                default:
                    return true;
            }
        }

        private bool ZoneDone(int order)
        {
            Dawnkeep.Campaign.CampaignDirector campaign =
                Dawnkeep.Campaign.CampaignDirector.Instance;

            if (campaign == null)
            {
                return false;
            }

            Dawnkeep.Campaign.ZoneDefinition zone = campaign.ZoneAt(order);
            return zone != null && campaign.ClearedIn(zone) >= zone.Stages;
        }

        public bool Choose(PlayMode mode)
        {
            if (!Unlocked(mode))
            {
                return false;
            }

            Current = mode;
            Raise();
            return true;
        }

        // ── ما يبدّله النمط ─────────────────────────────────────────────────

        /// <summary>
        /// بذرة الجولة. §20 تطلب بذرةً لـEndless و**بذرةً واحدةً للجميع** في
        /// اليومية — واليوميّة تُشتقّ من **التاريخ** لا من عشوائيّ: يومٌ واحدٌ
        /// يعطي بذرةً واحدةً على كل جهاز، بلا خادمٍ ولا اتّصال.
        /// </summary>
        public static int SeedFor(PlayMode mode, int fallback)
        {
            switch (mode)
            {
                case PlayMode.DailyTrial:
                    System.DateTime day = System.DateTime.UtcNow.Date;
                    return (day.Year * 10000) + (day.Month * 100) + day.Day;

                case PlayMode.Endless:
                    ModeDirector director = Instance;
                    int stored = director != null ? director.Store.Modes.EndlessSeed : 0;
                    return stored != 0 ? stored : fallback;

                default:
                    return fallback;
            }
        }

        /// <summary>بذرةٌ جديدة لـEndless — يطلبها اللاعب من الشاشة.</summary>
        public void RerollEndless()
        {
            Store.Modes.EndlessSeed = Random.Range(1, int.MaxValue);
            Mark();
            Raise();
        }

        public int EndlessSeed { get { return Store.Modes.EndlessSeed; } }

        /// <summary>كم ليلةً في هذا النمط؟ صفرٌ يعني بلا نهاية (Endless).</summary>
        public static int NightsFor(PlayMode mode, int fallback)
        {
            ModeDirector director = Instance;
            if (director == null)
            {
                return fallback;
            }

            switch (mode)
            {
                case PlayMode.Endless:     return director.endlessNights;
                case PlayMode.DailyTrial:  return director.dailyNights;
                case PlayMode.BossHunt:    return director.bossHuntNights;
                default:                   return fallback;
            }
        }

        /// <summary>
        /// فضّة البداية. اليومية **تجهيزٌ محدَّد سلفاً** (§20)، فرصيدُها
        /// واحدٌ للجميع لا رصيدُ تقدّم اللاعب.
        /// </summary>
        public static int SilverFor(PlayMode mode, int fallback)
        {
            ModeDirector director = Instance;
            return mode == PlayMode.DailyTrial && director != null
                ? director.dailySilver : fallback;
        }

        /// <summary>
        /// هل يُقرأ عتاد اللاعب وعقيدته؟ اليومية **لا**: «Loadout ومباني
        /// محددة مسبقًا» (§20) — ولو قُرئ عتادُه لصار الرقم رقمَ عتادٍ لا
        /// رقمَ لعب، ولوحةُ الأرقام بلا معنى.
        /// </summary>
        public static bool UsesLoadout
        {
            get { return Current != PlayMode.DailyTrial; }
        }

        // ── لوحة الأرقام المحلّية (§20) ─────────────────────────────────────

        /// <summary>
        /// يسجّل رقماً إن كان أفضل ممّا سبق. **محلّية** بنصّ §20: «لوحة أفضل
        /// رقم محلية». ولا رقمَ عالميّ حتى يوجد خادمٌ يتحقّق — واليومية
        /// «يمكن لعبها دون اتصال لكن لا ترفع النتيجة العالمية حتى التحقق».
        /// </summary>
        public bool Record(PlayMode mode, int score)
        {
            Dawnkeep.Save.ModeRecords records = Store.Modes;
            int best = mode == PlayMode.Endless ? records.EndlessBest
                : mode == PlayMode.DailyTrial ? records.DailyBest
                : records.BossHuntBest;

            if (score <= best)
            {
                return false;
            }

            if (mode == PlayMode.Endless)
            {
                records.EndlessBest = score;
            }
            else if (mode == PlayMode.DailyTrial)
            {
                records.DailyBest = score;
                records.DailyDayUtc = System.DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
            }
            else
            {
                records.BossHuntBest = score;
            }

            Mark();
            Raise();
            return true;
        }

        public int BestOf(PlayMode mode)
        {
            Dawnkeep.Save.ModeRecords records = Store.Modes;

            // رقمُ اليوميّة يخصّ **يومَه**: رقمُ أمسٍ ليس رقم اليوم، وعرضُه
            // اليوم يجعل اللاعب يظنّ أنّه سبق نفسه وهو لم يلعب بعد.
            if (mode == PlayMode.DailyTrial)
            {
                string today = System.DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
                return records.DailyDayUtc == today ? records.DailyBest : 0;
            }

            return mode == PlayMode.Endless ? records.EndlessBest : records.BossHuntBest;
        }

        private void Mark()
        {
            if (_save == null)
            {
                _save = Dawnkeep.Save.SaveService.Instance;
            }

            if (_save != null)
            {
                _save.Mark();
            }
        }

        private void Raise()
        {
            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }
    }
}
