using UnityEngine;

namespace Dawnkeep.Campaign
{
    /// <summary>
    /// نجوم المرحلة الثلاث (§21: «25 × عدد النجوم الجديدة»).
    ///
    /// **ثلاثٌ لا خمس**: كلٌّ منها يقيس شيئاً يقدر اللاعب على تحسينه ويفهم
    /// لماذا نقص. ونجمةٌ تُمنَح على «أنهِ المرحلة» وحدها ليست نجمة بل إتماماً
    /// مكرَّراً.
    ///
    /// **ولا `Update`**: تُحسب مرّةً عند الفصل، والقياس من الأنظمة نفسها لا
    /// من عدّاداتٍ ثانية تتفرّق عنها.
    /// </summary>
    public static class StageStars
    {
        /// <summary>النجمة الثانية: قلب الحصن فوق هذه النسبة عند الفجر.</summary>
        public const float KeepThreshold = 0.5f;

        /// <summary>
        /// كم نجمةً استحقّت هذه الجولة (0..3)؟
        ///
        /// 1. أُنجزت المرحلة.
        /// 2. وقلبُ الحصن فوق النصف.
        /// 3. ولم يسقط لك مبنى.
        ///
        /// والثانية والثالثة **مشروطتان بالأولى**: من خسر لا يأخذ نجمةً
        /// لأنّ قلبه كان سليماً قبل أن يسقط.
        /// </summary>
        public static int Earned(bool victory)
        {
            if (!victory)
            {
                return 0;
            }

            int stars = 1;

            Dawnkeep.Building.Keep keep = Dawnkeep.Building.Keep.Instance;
            if (keep != null && keep.MaxHealth > 0f
                && keep.Health / keep.MaxHealth >= KeepThreshold)
            {
                stars++;
            }

            Dawnkeep.Building.BuildingDirector buildings =
                Dawnkeep.Building.BuildingDirector.Instance;

            if (buildings != null && buildings.Lost == 0)
            {
                stars++;
            }

            return stars;
        }

        /// <summary>
        /// كم نجمةً **جديدة** — §21 تحسب الجديدة وحدها: «25 × عدد النجوم
        /// الجديدة». وإعادةُ مرحلةٍ بثلاث نجومٍ لا تُثري.
        /// </summary>
        public static int Fresh(StageDefinition stage, int earned)
        {
            if (stage == null)
            {
                return earned;      // خارج الحملة: لا سجلَّ يُقابَل به
            }

            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save == null)
            {
                return earned;
            }

            int had = save.Data.Campaign.StarsOf(stage.Key);
            return Mathf.Max(0, earned - had);
        }

        /// <summary>يسجّل أفضل ما بلغته المرحلة من نجوم. يعيد الجديد منها.</summary>
        public static int Record(StageDefinition stage, int earned)
        {
            int fresh = Fresh(stage, earned);
            if (stage == null || fresh <= 0)
            {
                return fresh;
            }

            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save != null)
            {
                save.Data.Campaign.SetStars(stage.Key, earned);
                save.Mark();
            }

            return fresh;
        }
    }
}
