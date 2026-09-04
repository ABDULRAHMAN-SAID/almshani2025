using UnityEngine;

namespace Dawnkeep.Equipment
{
    /// <summary>
    /// الحدّادة (§17): ترقيةٌ وتفكيك وترقيةُ ندرة.
    ///
    /// **لا `MonoBehaviour`**: هي قواعدُ لا كائنٌ في المشهد. تقرأ `Progress`
    /// و`Loadout` وتكتب فيهما، فلا حالة لها تُحفَظ ولا تُحدَّث كل إطار.
    ///
    /// ولا صندوق حظٍّ فيها بنصّ §17: «لا تستخدم صندوقاً مدفوعاً باحتمالات
    /// عشوائية في الإصدار الأول». وترقيةُ الندرة تحتاج **مخطّط القطعة
    /// نفسها** لا خمسَ نسخٍ عشوائية.
    /// </summary>
    public static class Forge
    {
        /// <summary>هل يمكن رفع مستوى هذه القطعة الآن؟ ولماذا لا، إن لم يمكن.</summary>
        public static bool CanUpgrade(EquipmentDefinition gear, out string reason)
        {
            reason = string.Empty;

            Loadout loadout = Loadout.Instance;
            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;

            if (gear == null || loadout == null || progress == null)
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeNoGear;
                return false;
            }

            if (!loadout.Owns(gear))
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeNotOwned;
                return false;
            }

            int level = loadout.LevelOf(gear);
            if (level >= EquipmentDefinition.MaxLevel)
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeMaxLevel;
                return false;
            }

            if (progress.Gold < gear.GoldToLevel(level))
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeNoGold;
                return false;
            }

            if (progress.Essence < gear.EssenceToLevel(level))
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeNoEssence;
                return false;
            }

            return true;
        }

        /// <summary>يرفع المستوى واحداً بثمنه. لا يمسّ شيئاً إن لم يُدفَع الثمن.</summary>
        public static bool Upgrade(EquipmentDefinition gear)
        {
            string reason;
            if (!CanUpgrade(gear, out reason))
            {
                return false;
            }

            Loadout loadout = Loadout.Instance;
            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            int level = loadout.LevelOf(gear);

            // الجباية أوّلاً ثم الرفع: لو رُفع أوّلاً وفشلت الجباية بقي المستوى
            // مرفوعاً مجّاناً — وهذا هو الترتيب الذي يمنعه.
            if (!progress.SpendForge(gear.GoldToLevel(level), gear.EssenceToLevel(level)))
            {
                return false;
            }

            return loadout.SetLevel(gear, level + 1);
        }

        /// <summary>
        /// كم جوهراً يعيده تفكيك هذه القطعة؟ §17: «يعيد 80% من Essence
        /// المصروفة» — **المصروفة فعلاً**، فمجموعُ ما دُفع على مستوياتها.
        /// وقطعةٌ لم تُرقَّ لا تعيد شيئاً: لم يُصرف عليها جوهر.
        /// </summary>
        public static int DismantleValue(EquipmentDefinition gear)
        {
            Loadout loadout = Loadout.Instance;
            if (gear == null || loadout == null)
            {
                return 0;
            }

            int spent = 0;
            int level = loadout.LevelOf(gear);
            for (int i = 1; i < level; i++)
            {
                spent += gear.EssenceToLevel(i);
            }

            return Mathf.FloorToInt(spent * EquipmentDefinition.DismantleReturn);
        }

        /// <summary>هل يجوز تفكيكها؟</summary>
        public static bool CanDismantle(EquipmentDefinition gear, out string reason)
        {
            reason = string.Empty;

            Loadout loadout = Loadout.Instance;
            if (gear == null || loadout == null || !loadout.Owns(gear))
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeNotOwned;
                return false;
            }

            // قطعُ الانطلاق لا تُفكَّك: تفكيك آخر سلاحٍ يترك بطلاً بلا سلاح
            if (gear.OwnedFromStart)
            {
                reason = Dawnkeep.Localization.LocKeys.ForgeStarterGear;
                return false;
            }

            return true;
        }

        /// <summary>يفكّك قطعةً ويردّ جوهرها. تُنزَع إن كانت ملبوسة.</summary>
        public static bool Dismantle(EquipmentDefinition gear)
        {
            string reason;
            if (!CanDismantle(gear, out reason))
            {
                return false;
            }

            int back = DismantleValue(gear);
            if (!Loadout.Instance.Forget(gear))
            {
                return false;
            }

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null)
            {
                progress.AddEssence(back);
            }

            return true;
        }
    }
}
