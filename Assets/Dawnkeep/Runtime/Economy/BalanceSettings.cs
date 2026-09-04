using UnityEngine;

namespace Dawnkeep.Economy
{
    /// <summary>
    /// مقابض توازن §10 الثلاثة — في أصل واحد يُجرَّب بضغطة.
    ///
    /// **لماذا هذا الأصل موجود**: قاس `econcheck.py` أنّ اللاعب يبلغ ٣٣ إجراءً
    /// في الموجة العاشرة، وهدف §10 عشرة إلى أربعة عشر. وثبت بالقياس أنّ السبب
    /// ليس المحتوى ولا مكافأة القتل، بل **عدد العقد وعمق الترقية** — وكلاهما
    /// تحدّده §10 بنفسها مع الأثمان والدخل، والثلاثة لا تُنتج هدفها.
    ///
    /// التوفيق قرار تصميم لا قرار برمجة. فبدل أن يُحسَم في الكود، صار كل حلٍّ
    /// رقماً هنا: يبدّله صاحب المشروع ويرى أثره في اللعب وفي الفحص معاً — إذ
    /// يقرأ `econcheck.py` هذه الأرقام نفسها.
    /// </summary>
    [CreateAssetMenu(fileName = "BalanceSettings", menuName = "مملكة الرماد/إعدادات التوازن")]
    public class BalanceSettings : ScriptableObject
    {
        [Header("الحلّ الأوّل: تقليل العقد")]
        [Tooltip("كم عقدة تُوضع من ستّ عشرة. تقليلها يوافق هدف §10 ويخالف جدولها.")]
        [Range(4, 16)]
        [SerializeField] private int nodeBudget = 16;

        [Header("الحلّ الثاني: تغليظ الترقية")]
        [Tooltip("مضاعف ثمن كل ترقية. رفعه يوافق الهدف ويخالف جدول الأثمان.")]
        [Range(1f, 4f)]
        [SerializeField] private float upgradeCostScale = 1f;

        [Header("الحلّ الثالث: تعديل الهدف")]
        [Tooltip("كم موجة تُنهي المرحلة بالنجاة (§5: عشر). رفعها يبقي كل رقم في §10.")]
        [Range(5, 30)]
        [SerializeField] private int wavesToSurvive = 10;

        public int NodeBudget { get { return nodeBudget; } }

        public float UpgradeCostScale { get { return upgradeCostScale; } }

        public int WavesToSurvive { get { return wavesToSurvive; } }
    }
}
