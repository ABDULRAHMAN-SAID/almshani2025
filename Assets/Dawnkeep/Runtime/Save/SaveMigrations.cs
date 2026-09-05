using UnityEngine;

namespace Dawnkeep.Save
{
    /// <summary>
    /// ترحيل ملفّ الحفظ من صيغةٍ إلى التي تليها (§27: «Migration لكل إصدار»).
    ///
    /// **سلسلةٌ لا قفزة**: الترحيل من 1 إلى 4 يمرّ بـ2 و3، فكل خطوةٍ تُكتب
    /// مرّةً وتخدم كل من جاء قبلها. وقفزةٌ مباشرة من كل صيغةٍ إلى الأحدث تعني
    /// عدد الخطوات مربّعاً، وكلُّها تُختبر أو لا تُختبر.
    ///
    /// واليوم الصيغة واحدة فالسلسلة فارغة — والآليّة موجودة، وهي التي تُختبر
    /// في `DawnkeepSaveCheck`: ملفٌّ بصيغةٍ أقدم يُرحَّل، وبصيغةٍ أحدث يُرفَض.
    /// </summary>
    public static class SaveMigrations
    {
        /// <summary>
        /// يرفع بيانات الحفظ إلى الصيغة الجارية. يعيدها كما هي إن كانت
        /// عليها، وnull إن كانت أقدم من أقدم ما يُعرف ترحيله.
        /// </summary>
        public static SaveData Upgrade(SaveData data)
        {
            if (data == null)
            {
                return null;
            }

            if (data.SaveVersion > SaveFormat.Current)
            {
                return null;      // من مستقبل: يرفضها القارئ قبل أن تصل هنا
            }

            if (data.SaveVersion < SaveFormat.Oldest)
            {
                Debug.LogWarning("مملكة الرماد: صيغة حفظٍ أقدم من المعروف ("
                    + data.SaveVersion + ") — بدأت جولةٌ جديدة.");
                return null;
            }

            int guard = 0;
            while (data.SaveVersion < SaveFormat.Current && guard++ < 64)
            {
                int before = data.SaveVersion;
                data = Step(data);

                if (data == null)
                {
                    return null;
                }

                if (data.SaveVersion == before)
                {
                    // خطوةٌ ناقصة: أفضل من حلقةٍ لا تنتهي أن نقولها ونقف
                    Debug.LogWarning("مملكة الرماد: لا خطوة ترحيلٍ من الصيغة "
                        + before + " — بدأت جولةٌ جديدة.");
                    return null;
                }
            }

            Repair(data);
            return data;
        }

        /// <summary>
        /// خطوةٌ واحدة من `data.SaveVersion` إلى التي تليها. تُضاف حالةٌ هنا
        /// مع كل رفعٍ للصيغة، ويُرفع الرقم داخلها لا خارجها.
        /// </summary>
        private static SaveData Step(SaveData data)
        {
            switch (data.SaveVersion)
            {
                case 1:
                    // ١ ← ٢: العملات ثلاثٌ بنصّ §21. نجمُ البحث (§16) وجوهرُ
                    // الترقية (§17) يصيران «شظايا فجر».
                    //
                    // **يُجمعان ولا يُستبدل أحدهما**: لاعبٌ ادّخر عشرين نجمةً
                    // وأربعين جوهراً يملك ستّين شظيّة. وأخذُ الأكبر وحده
                    // يمحو ما دفع فيه ليالي.
                    data.Currencies.DawnShards +=
                        data.Currencies.ResearchStars + data.Currencies.Essence;

                    data.Currencies.ResearchStars = 0;
                    data.Currencies.Essence = 0;

                    data.SaveVersion = 2;
                    return data;

                default:
                    return data;      // بلا تغيير: يكشفه الحارس أعلاه
            }
        }

        /// <summary>
        /// يُصلح ما قد يأتي ناقصاً: ملفٌّ كُتب بإصدارٍ أقدم ليس فيه كتلةٌ
        /// أُضيفت بعده، فيقرؤها `JsonUtility` **null** لا كائناً فارغاً —
        /// وأوّل قراءةٍ لها ترمي.
        /// </summary>
        private static void Repair(SaveData data)
        {
            if (data.Profile == null) { data.Profile = new PlayerProfile(); }
            if (data.Settings == null) { data.Settings = new SaveSettings(); }
            if (data.Currencies == null) { data.Currencies = new Currencies(); }
            if (data.Campaign == null) { data.Campaign = new CampaignProgress(); }
            if (data.Hero == null) { data.Hero = new HeroProgress(); }
            if (data.Equipment == null) { data.Equipment = new EquipmentInventory(); }
            if (data.Research == null) { data.Research = new ResearchState(); }
            if (data.Quests == null) { data.Quests = new QuestState(); }
            if (data.Purchases == null) { data.Purchases = new PurchasesEntitlements(); }

            if (data.Campaign.BossesMet == null)
            {
                data.Campaign.BossesMet = new System.Collections.Generic.List<string>();
            }

            if (data.Research.Keys == null)
            {
                data.Research.Keys = new System.Collections.Generic.List<string>();
            }

            if (data.Research.Ranks == null)
            {
                data.Research.Ranks = new System.Collections.Generic.List<int>();
            }

            // قائمتان متوازيتان قد تفترقان بملفٍّ عُبث به: تُقصّان إلى الأقصر
            while (data.Research.Ranks.Count > data.Research.Keys.Count)
            {
                data.Research.Ranks.RemoveAt(data.Research.Ranks.Count - 1);
            }

            while (data.Research.Keys.Count > data.Research.Ranks.Count)
            {
                data.Research.Keys.RemoveAt(data.Research.Keys.Count - 1);
            }
        }
    }
}
