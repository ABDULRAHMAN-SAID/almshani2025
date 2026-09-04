using UnityEngine;

namespace Dawnkeep.Economy
{
    /// <summary>
    /// خزينة الفضّة: المورد الوحيد الذي يُبنى به (§10).
    ///
    /// **لا عملات تتساقط في الساحة.** §10 تنصّ على أنّ قتل الأعداء يضيف مكافأة
    /// **تُحسب عند نهاية الموجة**، لا مئات القطع الفيزيائية تُلتقط. فالقتل يزيد
    /// عدّاداً معلّقاً، ويُصرف كلّه مع دخل الفجر دفعةً واحدة — يقرؤها اللاعب
    /// رقماً واحداً بدل أن يطارد بريقاً على الأرض.
    ///
    /// الحدث `Changed` يُطلق عند كل تغيّر فتُحدِّث الواجهة نفسها بلا سؤال في
    /// كل إطار.
    /// </summary>
    [DisallowMultipleComponent]
    public class Treasury : MonoBehaviour
    {
        public static Treasury Instance { get; private set; }

        [Tooltip("فضّة بداية المرحلة (§10: 220).")]
        [SerializeField] private int startingSilver = 220;

        [Tooltip("الدخل الثابت بعد كل موجة (§10: 35).")]
        [SerializeField] private int waveIncomeBase = 35;

        [Tooltip("يُضاف لكل رقم موجة (§10: 10 × رقم الموجة).")]
        [SerializeField] private int waveIncomePerWave = 10;

        [Tooltip("ما يُستردّ عند بيع مبنى، من إجمالي ما دُفع فيه (§10: 70%).")]
        [Range(0f, 1f)]
        [SerializeField] private float sellFraction = 0.70f;

        private int _silver;
        private int _pendingBounty;
        private int _lastPayout;

        /// <summary>يُطلق عند كل تغيّر في الرصيد أو المكافأة المعلّقة.</summary>
        public event System.Action Changed;

        public int Silver { get { return _silver; } }

        /// <summary>مكافأة القتل المتراكمة، تُصرف عند نهاية الموجة.</summary>
        public int PendingBounty { get { return _pendingBounty; } }

        /// <summary>آخر دفعة صُرفت — تعرضها الواجهة عند الفجر.</summary>
        public int LastPayout { get { return _lastPayout; } }

        public float SellFraction { get { return sellFraction; } }

        private void Awake()
        {
            Instance = this;
            _silver = startingSilver;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>هل يكفي الرصيد لهذا الثمن؟</summary>
        public bool CanAfford(int cost)
        {
            return cost <= _silver;
        }

        /// <summary>
        /// يخصم الثمن. يعيد false ولا يخصم شيئاً إن لم يكفِ الرصيد — فلا
        /// يُبنى مبنى بنصف ثمن، ولا يهبط الرصيد تحت الصفر.
        /// </summary>
        public bool Spend(int cost)
        {
            if (cost < 0 || cost > _silver)
            {
                return false;
            }

            _silver -= cost;
            Raise();
            return true;
        }

        /// <summary>
        /// نسبة البيع بعد بركات §15. مقصوصة عند واحد: بركةٌ تعيد أكثر ممّا
        /// دُفع تجعل البيع والشراء دورةً تطبع الفضّة.
        /// </summary>
        public float RefundFraction
        {
            get
            {
                return Mathf.Clamp01(sellFraction
                    * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.SellRefund));
            }
        }

        /// <summary>يعيد للخزينة نسبة البيع من إجمالي ما دُفع في المبنى.</summary>
        public int Refund(int totalPaid)
        {
            int back = Mathf.RoundToInt(totalPaid * RefundFraction);
            _silver += back;
            Raise();
            return back;
        }

        /// <summary>قتيل: مكافأته تُعلَّق ولا تدخل الخزينة قبل نهاية الموجة.</summary>
        public void AddBounty(int amount)
        {
            if (amount <= 0)
            {
                return;
            }

            _pendingBounty += Mathf.RoundToInt(amount
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.KillBounty));
            Raise();
        }

        /// <summary>
        /// دفعة الفجر: دخل الموجة الثابت، ودخل المباني الاقتصادية، والمكافأة
        /// المعلّقة كلّها. تعيد ما صُرف ليُعرَض.
        /// </summary>
        public int PayDawn(int waveNumber, int buildingIncome)
        {
            // بركات §15 تُضرب في كل مصدرٍ على حدة لا في المجموع: بركة المزارع
            // يجب أن تكافئ من بنى مزارع، لا من قتل كثيراً.
            int income = Mathf.RoundToInt((waveIncomeBase
                + (waveIncomePerWave * Mathf.Max(0, waveNumber)))
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.WaveIncome));

            int fromBuildings = Mathf.RoundToInt(buildingIncome
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.BuildingIncome));

            int total = income + fromBuildings + _pendingBounty;

            _pendingBounty = 0;
            _silver += total;
            _lastPayout = total;

            Raise();
            return total;
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
