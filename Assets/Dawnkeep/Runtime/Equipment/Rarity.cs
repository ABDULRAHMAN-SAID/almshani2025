namespace Dawnkeep.Equipment
{
    /// <summary>ندرات §17 الخمس.</summary>
    public enum Rarity
    {
        Common = 0,
        Uncommon = 1,
        Rare = 2,
        Epic = 3,
        Legendary = 4,
    }

    /// <summary>
    /// كيف تُعرض الندرة. §17 تقول صراحةً: «**اللون ليس وسيلة التمييز
    /// الوحيدة**؛ استخدم إطاراً ورمزاً».
    ///
    /// وليست قاعدةَ ذوق: نحو ثمانية في المئة من الذكور لا يفرّقون بين
    /// الأحمر والأخضر، ولاعبٌ منهم يشتري القطعة الخطأ ولا يفهم لماذا. فلكل
    /// ندرةٍ **ثلاث علامات**: لونٌ، وسُمك إطار، ورمزٌ مطبوع.
    /// </summary>
    public static class RarityMark
    {
        /// <summary>رمزٌ يُقرأ بلا لون. تصاعديّ: كلّما زادت الندرة زاد الرمز.</summary>
        public static string Symbol(Rarity rarity)
        {
            switch (rarity)
            {
                case Rarity.Uncommon:  return "◦◦";
                case Rarity.Rare:      return "◦◦◦";
                case Rarity.Epic:      return "◈◈◈";
                case Rarity.Legendary: return "★★★";
                default:               return "◦";
            }
        }

        /// <summary>سُمك الإطار بالبكسل — علامةٌ ثالثة تُرى في المصغَّرة.</summary>
        public static float Frame(Rarity rarity)
        {
            return 2f + (int)rarity * 1.5f;
        }

        /// <summary>اللون، وهو **آخر** العلامات الثلاث لا أوّلها.</summary>
        public static UnityEngine.Color Tint(Rarity rarity)
        {
            switch (rarity)
            {
                case Rarity.Uncommon:  return new UnityEngine.Color(0.478f, 0.663f, 0.451f);
                case Rarity.Rare:      return new UnityEngine.Color(0.400f, 0.596f, 0.780f);
                case Rarity.Epic:      return new UnityEngine.Color(0.647f, 0.475f, 0.784f);
                case Rarity.Legendary: return new UnityEngine.Color(0.882f, 0.686f, 0.318f);
                default:               return new UnityEngine.Color(0.702f, 0.702f, 0.702f);
            }
        }

        /// <summary>
        /// هل تفتح هذه الندرة خاصّةً نوعية؟ §17: «عند Rare وEpic وLegendary
        /// تفتح خصائص نوعية، **وليست أرقاماً فقط**».
        /// </summary>
        public static bool OpensTrait(Rarity rarity)
        {
            return rarity >= Rarity.Rare;
        }
    }
}
