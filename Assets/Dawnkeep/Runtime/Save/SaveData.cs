using System;
using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Save
{
    /// <summary>
    /// ملفّ الحفظ (§27). كتلُه هي التي عدّدتها §27 بأسمائها، ولكلٍّ صنفٌ
    /// مستقلّ: كتلةٌ واحدة مسطّحة تجعل كل ترحيلٍ يمسّ كل شيء.
    ///
    /// **`[Serializable]` لا `ScriptableObject`**: هذا ما يُكتب على القرص لا
    /// ما يُضبط في المفتّش، و`JsonUtility` لا يقرأ إلا الحقول العامّة أو
    /// المعلَّمة — فحقول هذا الملفّ عامّةٌ عمداً، خلافاً لقاعدة §1 التي تخصّ
    /// حقول المفتّش.
    /// </summary>
    [Serializable]
    public class SaveData
    {
        /// <summary>رقم صيغة الملفّ. يرفعه كل تغييرٍ يكسر القراءة.</summary>
        public int SaveVersion = SaveFormat.Current;

        public PlayerProfile Profile = new PlayerProfile();
        public SaveSettings Settings = new SaveSettings();
        public Currencies Currencies = new Currencies();
        public CampaignProgress Campaign = new CampaignProgress();
        public HeroProgress Hero = new HeroProgress();
        public EquipmentInventory Equipment = new EquipmentInventory();
        public ResearchState Research = new ResearchState();
        public QuestState Quests = new QuestState();
        public PurchasesEntitlements Purchases = new PurchasesEntitlements();

        /// <summary>
        /// آخر تصفير يوميّ بتوقيت UTC، نصّاً بصيغة ISO. نصٌّ لا `DateTime`:
        /// `JsonUtility` لا يعرف `DateTime`، ويكتبه صفراً بلا صياح.
        /// </summary>
        public string LastDailyResetUtc = string.Empty;

        /// <summary>لحظة آخر حفظ — تعرضها شاشة تعارض السحابة (§27).</summary>
        public string SavedAtUtc = string.Empty;
    }

    [Serializable]
    public class PlayerProfile
    {
        public string Name = string.Empty;

        /// <summary>معرّف يُولَّد مرّة على الجهاز — لا يُطلب من اللاعب.</summary>
        public string DeviceId = string.Empty;

        public int AccountXp;
        public int StagesPlayed;
        public int StagesWon;
    }

    [Serializable]
    public class SaveSettings
    {
        /// <summary>0 عربية، 1 إنجليزية — كما في `Language`.</summary>
        public int Language;

        public bool HealthBars = true;
        public bool LeftHanded;
        public float StickScale = 1f;
        public float StickOpacity = 1f;

        /// <summary>الدرجة المختارة، كما في `Difficulty`.</summary>
        public int Difficulty = 1;

        public int SpeedIndex;

        /// <summary>درجة الجهاز (§31). ‏−1 يعني «لم تُختر بعد» فتُقترح.</summary>
        public int Quality = -1;
    }

    [Serializable]
    public class Currencies
    {
        public int Gold;
        public int ResearchStars;

        /// <summary>
        /// الجوهر: ثمن ترقية العتاد الثاني مع الذهب (§17). عملةٌ ثانية
        /// **لأنّ الذهب وحده يجعل الترقية سباق ادّخارٍ لا اختياراً**: الجوهر
        /// يأتي من التفكيك، فترقيةُ قطعةٍ ثمنُها التخلّي عن أخرى.
        /// </summary>
        public int Essence;
    }

    [Serializable]
    public class CampaignProgress
    {
        /// <summary>أعلى ليلة بُلغت في أي جولة.</summary>
        public int FurthestWave;

        /// <summary>عدد الجولات التي انتهت بالفوز.</summary>
        public int Victories;

        /// <summary>الزعماء الذين لُقُوا، بأسماء أصولهم.</summary>
        public List<string> BossesMet = new List<string>();
    }

    [Serializable]
    public class HeroProgress
    {
        public int Xp;
        public int TalentsSpent;
    }

    [Serializable]
    public class EquipmentInventory
    {
        /// <summary>ما يملكه اللاعب من عتاد (§17) — بأسماء أصوله.</summary>
        public List<string> Owned = new List<string>();

        /// <summary>ما هو مرتدىً الآن.</summary>
        public List<string> Equipped = new List<string>();

        /// <summary>
        /// مستوى كل قطعة (§17: من 1 إلى 50). قائمتان متوازيتان لا قاموس:
        /// `JsonUtility` لا يسلسل `Dictionary`، والقائمتان هما ما تسلسله.
        /// </summary>
        public List<string> LevelKeys = new List<string>();

        public List<int> LevelValues = new List<int>();

        /// <summary>مستوى قطعة، وواحدٌ لمن لم تُرقَّ بعد.</summary>
        public int LevelOf(string key)
        {
            int i = LevelKeys.IndexOf(key);
            return i >= 0 && i < LevelValues.Count ? LevelValues[i] : 1;
        }

        public void SetLevel(string key, int level)
        {
            int i = LevelKeys.IndexOf(key);
            if (i < 0)
            {
                LevelKeys.Add(key);
                LevelValues.Add(level);
                return;
            }

            while (LevelValues.Count <= i)
            {
                LevelValues.Add(1);
            }

            LevelValues[i] = level;
        }
    }

    [Serializable]
    public class ResearchState
    {
        /// <summary>
        /// مراتب العقد: قائمتان متوازيتان لا قاموس. `JsonUtility` لا يكتب
        /// `Dictionary` أصلاً، ويكتبه فارغاً بلا خطأ — وهو أسوأ ما يفعله.
        /// </summary>
        public List<string> Keys = new List<string>();

        public List<int> Ranks = new List<int>();

        public int RankOf(string key)
        {
            int index = Keys.IndexOf(key);
            return index >= 0 && index < Ranks.Count ? Ranks[index] : 0;
        }

        public void SetRank(string key, int rank)
        {
            int index = Keys.IndexOf(key);
            if (index < 0)
            {
                Keys.Add(key);
                Ranks.Add(rank);
                return;
            }

            Ranks[index] = rank;
        }

        public void Clear()
        {
            Keys.Clear();
            Ranks.Clear();
        }
    }

    [Serializable]
    public class QuestState
    {
        public List<string> Completed = new List<string>();
        public List<string> Active = new List<string>();
        public List<int> Counters = new List<int>();
    }

    [Serializable]
    public class PurchasesEntitlements
    {
        /// <summary>ما اشتُري ولا ينقضي.</summary>
        public List<string> Owned = new List<string>();

        /// <summary>هل أُزيلت الإعلانات؟ (§22)</summary>
        public bool AdsRemoved;
    }
}
