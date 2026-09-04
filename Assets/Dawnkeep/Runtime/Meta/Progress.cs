using System.Collections.Generic;
using UnityEngine;
using Dawnkeep.Boons;

namespace Dawnkeep.Meta
{
    /// <summary>
    /// التقدّم الدائم (§16): يبقى بين الجولات ويُحفظ على الجهاز.
    ///
    /// **`MonoBehaviour` لا صنفٌ ساكن**: الأصول (`ProgressSettings` وعقد
    /// البحث) تُربَط في المفتّش، وصنفٌ ساكن لا يُربَط له شيء فيضطرّ إلى
    /// `Resources.Load` — وهو بحثٌ بالاسم يُكسَر بأوّل إعادة تسمية.
    ///
    /// والحفظ في `PlayerPrefs`: خمسة أعداد وقاموسٌ صغير من المراتب. ملفٌّ
    /// كامل بصيغته وقارئه ثمنٌ لا يشتري شيئاً على هذا الحجم.
    /// </summary>
    [DisallowMultipleComponent]
    [DefaultExecutionOrder(-400)]
    public class Progress : MonoBehaviour
    {
        private const string KeyXp = "dawnkeep.account.xp";
        private const string KeyHeroXp = "dawnkeep.hero.xp";
        private const string KeyGold = "dawnkeep.gold";
        private const string KeyStars = "dawnkeep.stars";
        private const string KeySpent = "dawnkeep.talents.spent";
        private const string KeyRank = "dawnkeep.research.";

        public static Progress Instance { get; private set; }

        [SerializeField] private ProgressSettings settings;

        [Tooltip("كل عقد البحث. تُملأ من باني الأصول.")]
        [SerializeField] private ResearchNode[] nodes = new ResearchNode[0];

        private readonly Dictionary<string, int> _ranks = new Dictionary<string, int>(24);
        private readonly Dictionary<BoonStat, float> _research = new Dictionary<BoonStat, float>(24);

        /// <summary>يُرفع عند كل شراء أو مكافأة — تُعيد الواجهة رسم نفسها.</summary>
        public event System.Action Changed;

        public ProgressSettings Settings { get { return settings; } }

        public IReadOnlyList<ResearchNode> Nodes { get { return nodes; } }

        public int AccountXp { get; private set; }

        public int HeroXp { get; private set; }

        public int Gold { get; private set; }

        public int Stars { get; private set; }

        /// <summary>نقاط الموهبة المنفَقة — الباقي يُحسب من المستوى.</summary>
        public int TalentsSpent { get; private set; }

        public void Configure(ProgressSettings value, ResearchNode[] all)
        {
            if (value != null)
            {
                settings = value;
            }

            if (all != null && all.Length > 0)
            {
                nodes = all;
            }
        }

        private void Awake()
        {
            Instance = this;
            Load();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        // ── المستويات ───────────────────────────────────────────────────────

        public int AccountLevel { get { return LevelFor(AccountXp, MaxAccount); } }

        public int HeroLevel { get { return LevelFor(HeroXp, MaxHero); } }

        private int MaxAccount { get { return settings != null ? settings.MaxAccountLevel : 30; } }

        private int MaxHero { get { return settings != null ? settings.MaxHeroLevel : 40; } }

        /// <summary>
        /// المستوى من مجموع الخبرة. الحساب بالتراكم لا بالمعكوس: صيغة §16
        /// أسّية، ومعكوسها يقرّب خطأً عند الحدود فيقفز المستوى ذهاباً وإياباً
        /// حول نقطة الترقّي.
        /// </summary>
        public int LevelFor(int xp, int cap)
        {
            if (settings == null)
            {
                return 1;
            }

            int level = 1;
            int spent = 0;

            while (level < cap)
            {
                int need = settings.XpForLevel(level);
                if (xp < spent + need)
                {
                    break;
                }

                spent += need;
                level++;
            }

            return level;
        }

        /// <summary>الخبرة داخل المستوى الجاري، وما يلزم لإتمامه.</summary>
        public void AccountBar(out int inside, out int need)
        {
            Bar(AccountXp, AccountLevel, MaxAccount, out inside, out need);
        }

        public void HeroBar(out int inside, out int need)
        {
            Bar(HeroXp, HeroLevel, MaxHero, out inside, out need);
        }

        private void Bar(int xp, int level, int cap, out int inside, out int need)
        {
            inside = xp;
            need = 1;

            if (settings == null)
            {
                return;
            }

            for (int i = 1; i < level; i++)
            {
                inside -= settings.XpForLevel(i);
            }

            need = level >= cap ? 0 : settings.XpForLevel(level);
        }

        /// <summary>نقاط الموهبة الباقية: مرتبةٌ كل خمسة مستويات (§16).</summary>
        public int TalentPoints
        {
            get
            {
                if (settings == null)
                {
                    return 0;
                }

                int earned = HeroLevel / settings.LevelsPerTalent;
                return Mathf.Max(0, earned - TalentsSpent);
            }
        }

        // ── ما يُفتح ────────────────────────────────────────────────────────

        /// <summary>
        /// هل فُتحت هذه السرعة؟ (§16: «يفتح أنظمة جديدة تدريجيّاً»). الفهرس
        /// صفر هو السرعة العادية وهي مفتوحة دائماً.
        /// </summary>
        public bool SpeedUnlocked(int index)
        {
            if (index <= 0 || settings == null)
            {
                return true;
            }

            int level = AccountLevel;
            return index == 1
                ? level >= settings.DoubleSpeedLevel
                : level >= settings.TripleSpeedLevel;
        }

        public bool ResearchUnlocked
        {
            get { return settings == null || AccountLevel >= settings.ResearchLevel; }
        }

        /// <summary>هل فُتحت هذه الدرجة؟ (§14: الكابوس بعد إنهاء المنطقة)</summary>
        public bool DifficultyUnlocked(Dawnkeep.Combat.Difficulty level)
        {
            if (settings == null)
            {
                return true;
            }

            switch (level)
            {
                case Dawnkeep.Combat.Difficulty.Veteran:
                    return AccountLevel >= settings.VeteranLevel;
                case Dawnkeep.Combat.Difficulty.Nightmare:
                    return AccountLevel >= settings.NightmareLevel;
                default:
                    return true;
            }
        }

        // ── الأبحاث ─────────────────────────────────────────────────────────

        public int RankOf(ResearchNode node)
        {
            if (node == null)
            {
                return 0;
            }

            int rank;
            return _ranks.TryGetValue(node.Key, out rank) ? rank : 0;
        }

        /// <summary>هل يمكن شراء المرتبة التالية من هذه العقدة؟</summary>
        public bool CanBuy(ResearchNode node)
        {
            if (node == null || !ResearchUnlocked)
            {
                return false;
            }

            if (AccountLevel < node.UnlockLevel)
            {
                return false;
            }

            int rank = RankOf(node);
            if (rank >= node.Ranks)
            {
                return false;
            }

            // سقف §16: مجموع ما تضيفه الأبحاث إلى رقمٍ واحد لا يتجاوز 30%
            if (Ceiling(node, rank + 1))
            {
                return false;
            }

            return Gold >= node.GoldFor(rank) && Stars >= node.StarsPerRank;
        }

        /// <summary>هل تتجاوز هذه المرتبة سقف §16 على هذا الرقم؟</summary>
        public bool Ceiling(ResearchNode node, int wouldBeRank)
        {
            if (settings == null || node == null || node.Stat == BoonStat.None)
            {
                return false;
            }

            float total = 0f;
            for (int i = 0; i < nodes.Length; i++)
            {
                ResearchNode other = nodes[i];
                if (other == null || other.Stat != node.Stat)
                {
                    continue;
                }

                int rank = other == node ? wouldBeRank : RankOf(other);
                total += Mathf.Abs(other.PerRank) * rank;
            }

            return total > settings.ResearchCap + 0.0001f;
        }

        public bool Buy(ResearchNode node)
        {
            if (!CanBuy(node))
            {
                return false;
            }

            int rank = RankOf(node);
            Gold -= node.GoldFor(rank);
            Stars -= node.StarsPerRank;
            _ranks[node.Key] = rank + 1;

            Rebuild();
            Save();
            return true;
        }

        /// <summary>
        /// يعيد توزيع النقاط بثمنٍ ذهبيّ (§16). يُعيد الذهب المنفَق كلّه
        /// والنجوم كلّها: إعادةٌ تُبقي الثمن مدفوعاً ليست إعادةً بل عقوبة.
        /// </summary>
        public bool Respec()
        {
            if (settings == null || _ranks.Count == 0 || Gold < settings.RespecGold)
            {
                return false;
            }

            int gold = 0;
            int stars = 0;

            for (int i = 0; i < nodes.Length; i++)
            {
                ResearchNode node = nodes[i];
                if (node == null)
                {
                    continue;
                }

                int rank = RankOf(node);
                for (int r = 0; r < rank; r++)
                {
                    gold += node.GoldFor(r);
                }

                stars += rank * node.StarsPerRank;
            }

            Gold += gold - settings.RespecGold;
            Stars += stars;
            _ranks.Clear();

            Rebuild();
            Save();
            return true;
        }

        /// <summary>
        /// شحنات النور الإضافية من الأبحاث (§16). تُعَدّ ولا تُضرَب: نصفُ
        /// شحنةٍ لا معنى له.
        /// </summary>
        public int ExtraLightCharges
        {
            get
            {
                int total = 0;
                for (int i = 0; i < nodes.Length; i++)
                {
                    ResearchNode node = nodes[i];
                    if (node != null && node.ExtraLightCharges > 0)
                    {
                        total += node.ExtraLightCharges * RankOf(node);
                    }
                }

                return total;
            }
        }

        /// <summary>مضاعف الأبحاث وحدها على رقمٍ بعينه.</summary>
        public float ResearchOf(BoonStat stat)
        {
            float value;
            return _research.TryGetValue(stat, out value) ? value : 1f;
        }

        /// <summary>
        /// كل ما هو **دائم** على رقمٍ بعينه: الأبحاث ومستوى البطل معاً. هذا ما
        /// يقرؤه `BoonBook`، فلا يحتاج أن يعرف أنّهما بابان.
        ///
        /// ومستوى البطل يمسّ رقمين لا غير (§16: نحو 1.5% صحّة و1% ضرراً لكل
        /// مرتبة) — و«الحدّ لا يمكن شراؤه مباشرة»، فلا سبيل إليه إلا اللعب.
        /// </summary>
        public float Permanent(BoonStat stat)
        {
            float value = ResearchOf(stat);
            if (settings == null)
            {
                return value;
            }

            if (stat == BoonStat.HeroHealth)
            {
                value *= settings.HeroHealthAt(HeroLevel);
            }
            else if (stat == BoonStat.HeroDamage)
            {
                value *= settings.HeroDamageAt(HeroLevel);
            }

            return value;
        }

        private void Rebuild()
        {
            _research.Clear();
            for (int i = 0; i < nodes.Length; i++)
            {
                ResearchNode node = nodes[i];
                if (node == null || node.Stat == BoonStat.None)
                {
                    continue;
                }

                int rank = RankOf(node);
                if (rank <= 0)
                {
                    continue;
                }

                float current;
                if (!_research.TryGetValue(node.Stat, out current))
                {
                    current = 1f;
                }

                // الجمع داخل العقدة والضرب بين العقد: §16 تصف المرتبة بـ«+5%
                // خمس مراتب» فهي 25% لا 27.6%، وعقدتان مختلفتان تتضاعفان.
                _research[node.Stat] = current * node.MultiplierAt(rank);
            }

            Raise();
        }

        // ── المكافأة والحفظ ─────────────────────────────────────────────────

        /// <summary>
        /// مكافأة نهاية المرحلة (§16: «يكتسب Account XP من إنهاء المراحل»).
        /// تُمنح مرّةً لكل مرحلة — والاستدعاء المكرّر يُعيدها، فحارسها في
        /// `StageOutcome` لا هنا.
        /// </summary>
        public void AwardStage(int wavesCleared, bool victory)
        {
            if (settings == null)
            {
                return;
            }

            int xp = (settings.XpPerWave * Mathf.Max(0, wavesCleared))
                + (victory ? settings.XpVictoryBonus : 0);

            int gold = (settings.GoldPerWave * Mathf.Max(0, wavesCleared))
                + (victory ? settings.GoldVictoryBonus : 0);

            int stars = victory ? settings.StarsOnVictory : 0;
            if (!victory && wavesCleared >= settings.StarAtWave)
            {
                stars += 1;      // الخسارة بعد صمودٍ طويل ليست صفراً
            }

            AccountXp += xp;
            HeroXp += xp;      // البطل يتقدّم مع حسابه: بطلٌ واحد في الإصدار الأوّل
            Gold += gold;
            Stars += stars;

            Save();
            Raise();
        }

        private void Load()
        {
            AccountXp = PlayerPrefs.GetInt(KeyXp, 0);
            HeroXp = PlayerPrefs.GetInt(KeyHeroXp, 0);
            Gold = PlayerPrefs.GetInt(KeyGold, 0);
            Stars = PlayerPrefs.GetInt(KeyStars, 0);
            TalentsSpent = PlayerPrefs.GetInt(KeySpent, 0);

            _ranks.Clear();
            for (int i = 0; i < nodes.Length; i++)
            {
                ResearchNode node = nodes[i];
                if (node == null)
                {
                    continue;
                }

                int rank = PlayerPrefs.GetInt(KeyRank + node.Key, 0);
                if (rank > 0)
                {
                    _ranks[node.Key] = Mathf.Min(rank, node.Ranks);
                }
            }

            Rebuild();
        }

        private void Save()
        {
            PlayerPrefs.SetInt(KeyXp, AccountXp);
            PlayerPrefs.SetInt(KeyHeroXp, HeroXp);
            PlayerPrefs.SetInt(KeyGold, Gold);
            PlayerPrefs.SetInt(KeyStars, Stars);
            PlayerPrefs.SetInt(KeySpent, TalentsSpent);

            for (int i = 0; i < nodes.Length; i++)
            {
                ResearchNode node = nodes[i];
                if (node != null)
                {
                    PlayerPrefs.SetInt(KeyRank + node.Key, RankOf(node));
                }
            }

            PlayerPrefs.Save();
        }

        /// <summary>يمحو التقدّم كلّه — للتجريب في المحرّر.</summary>
        public void Wipe()
        {
            AccountXp = 0;
            HeroXp = 0;
            Gold = 0;
            Stars = 0;
            TalentsSpent = 0;
            _ranks.Clear();
            Rebuild();
            Save();
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
