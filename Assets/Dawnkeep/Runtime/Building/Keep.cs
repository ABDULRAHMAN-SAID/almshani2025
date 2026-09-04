using Dawnkeep.Economy;
using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>
    /// قلب الحصن (§10): صحّته هي شرط الخسارة، ومستواه هو ما **يفتح العقد**.
    ///
    /// بلا هذا التدرّج تُملأ الخريطة في الموجة الثالثة ويصير الفائض من الفضّة
    /// بلا مصرف — وهو ما قاسه `econcheck.py` فعلاً قبل أن يُكتب هذا الملفّ.
    /// رفع المستوى يشتري **مساحةً للقرار** لا رقماً في لوحة.
    ///
    /// الأرقام من §10 حرفياً: 1600/2400/3600/5200 صحّة، و120/260/480 ثمناً،
    /// و5 ثمّ 3 ثمّ 4 ثمّ 4 عقداً.
    /// </summary>
    [DisallowMultipleComponent]
    public class Keep : MonoBehaviour
    {
        public static Keep Instance { get; private set; }

        [Tooltip("صحّة كل مستوى (§10).")]
        [SerializeField] private float[] healthByTier = { 1600f, 2400f, 3600f, 5200f };

        [Tooltip("ثمن الترقية إلى كل مستوى. الأوّل مجّاني (§10).")]
        [SerializeField] private int[] costByTier = { 0, 120, 260, 480 };

        private int _tier = 1;
        private float _health;

        /// <summary>يُطلق عند تغيّر المستوى أو الصحّة — تُحدِّث الواجهة نفسها.</summary>
        public event System.Action Changed;

        public int Tier { get { return _tier; } }

        public int MaxTier { get { return healthByTier.Length; } }

        public float Health { get { return _health; } }

        public float MaxHealth
        {
            get { return healthByTier[Mathf.Clamp(_tier - 1, 0, healthByTier.Length - 1)]; }
        }

        /// <summary>سقط الحصن — شرط الخسارة (§5).</summary>
        public bool Fallen { get { return _health <= 0f; } }

        /// <summary>ثمن المستوى التالي، أو صفر إن بلغ أقصاه.</summary>
        public int NextTierCost
        {
            get
            {
                if (_tier >= MaxTier || _tier >= costByTier.Length)
                {
                    return 0;
                }

                return costByTier[_tier];
            }
        }

        public bool CanUpgrade { get { return _tier < MaxTier; } }

        /// <summary>صحّة المستوى التالي — تعرضها البطاقة كفرق.</summary>
        public float NextTierHealth
        {
            get
            {
                if (_tier >= healthByTier.Length)
                {
                    return MaxHealth;
                }

                return healthByTier[_tier];
            }
        }

        private void Awake()
        {
            Instance = this;
            _health = MaxHealth;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>
        /// يرفع المستوى بعد خصم ثمنه، ويملأ الصحّة إلى سقف المستوى الجديد.
        /// يعيد false إن بلغ أقصاه أو لم تكفِ الفضّة.
        /// </summary>
        public bool Upgrade()
        {
            if (!CanUpgrade)
            {
                return false;
            }

            Treasury treasury = Treasury.Instance;
            int cost = NextTierCost;
            if (treasury == null || !treasury.Spend(cost))
            {
                return false;
            }

            _tier++;

            // الصحّة تُملأ لا تُزاد فحسب: الترقية بناءٌ جديد فوق القديم، ورفعُ
            // السقف وحده يترك الحصن الجريح جريحاً بعد أن دفع اللاعب ثمنه.
            _health = MaxHealth;

            Raise();
            return true;
        }

        /// <summary>يعيد true إن أسقطت هذه الضربة الحصن.</summary>
        public bool TakeDamage(float amount)
        {
            if (_health <= 0f)
            {
                return false;
            }

            _health = Mathf.Max(0f, _health - amount);
            Raise();
            return _health <= 0f;
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
