using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// بيانات نوع الوحدة. **كل أرقام التوازن هنا لا في الكود** — قاعدة قاطعة من
    /// §1: تغيير التوازن يجب أن يكون بتعديل أصل لا بإعادة تصريف.
    /// </summary>
    [CreateAssetMenu(fileName = "Unit_", menuName = "مملكة الرماد/تعريف وحدة")]
    public class UnitDefinition : ScriptableObject
    {
        [Header("الهوية")]
        [SerializeField] private string displayName = "وحدة";
        [SerializeField] private Faction faction = Faction.Kingdom;
        [SerializeField] private TargetClass targetClass = TargetClass.Nearest;

        [Tooltip("جاهزة الشكل. تُولَّد من القائمة 4.")]
        [SerializeField] private GameObject prefab;

        [Tooltip("لون الراية على قطعة القماش وحدها.")]
        [SerializeField] private Color livery = new Color(0.647f, 0.180f, 0.180f);

        [Tooltip("بطل اللاعب: واحد فقط في الساحة، تتبعه الكاميرا وتعرض الواجهة صحّته.")]
        [SerializeField] private bool champion;

        [Header("البقاء")]
        [SerializeField] private float maxHealth = 100f;
        [Tooltip("تخفيض الضرر الوارد نسبةً. 0.25 يعني ربع الضرر يُمتصّ.")]
        [Range(0f, 0.9f)]
        [SerializeField] private float armour;

        [Tooltip("درع الظلام (§11): يُضاف إلى الدرع خارج النور ويذوب داخله. "
            + "هو ما يجعل جرّ العدوّ إلى دائرة منارة قراراً لا زينة.")]
        [Range(0f, 0.9f)]
        [SerializeField] private float darkArmour;

        [Header("الحركة")]
        [Tooltip("متر في الثانية.")]
        [SerializeField] private float moveSpeed = 3.2f;
        [Tooltip("سرعة الالتفات بالدرجات في الثانية.")]
        [SerializeField] private float turnSpeed = 540f;
        [Tooltip("نصف قطر التباعد: به لا تتكدّس الوحدات فوق بعضها بصرياً (§12).")]
        [SerializeField] private float separationRadius = 1.1f;

        [Header("القتال")]
        [SerializeField] private float damage = 12f;
        [Tooltip("مدى الضربة بالمتر. الرامي يقف في مدى آمن.")]
        [SerializeField] private float attackRange = 1.9f;
        [Tooltip("ثوانٍ بين ضربة وأخرى.")]
        [SerializeField] private float attackInterval = 1.15f;
        [SerializeField] private bool ranged;
        [Tooltip("سرعة السهم بالمتر في الثانية. للرماة فقط.")]
        [SerializeField] private float projectileSpeed = 34f;

        [Header("قرار الهدف (§12)")]
        [Tooltip("كل كم ثانية يُعاد تقييم الهدف. المواصفات: بين 0.25 و1.")]
        [Range(0.25f, 1f)]
        [SerializeField] private float retargetInterval = 0.5f;

        [Tooltip("أبعد ما يبحث فيه عن هدف بالمتر.")]
        [SerializeField] private float sightRange = 26f;

        [Tooltip("فضّة يضيفها قتله إلى المكافأة المعلّقة، تُصرف عند الفجر (§10).")]
        [SerializeField] private int bounty = 6;

        public string DisplayName { get { return displayName; } }

        public Faction Faction { get { return faction; } }

        public TargetClass TargetClass { get { return targetClass; } }

        public GameObject Prefab { get { return prefab; } }

        public Color Livery { get { return livery; } }

        /// <summary>هل هذه وحدة البطل؟ الواجهة تسأل التعريف لا اسم الجاهزة.</summary>
        public bool Champion { get { return champion; } }

        public float MaxHealth { get { return maxHealth; } }

        public float Armour { get { return armour; } }

        /// <summary>درع الظلام الكامل — قبل ما يقضمه النور.</summary>
        public float DarkArmour { get { return darkArmour; } }

        public float MoveSpeed { get { return moveSpeed; } }

        public float TurnSpeed { get { return turnSpeed; } }

        public float SeparationRadius { get { return separationRadius; } }

        public float Damage { get { return damage; } }

        public float AttackRange { get { return attackRange; } }

        public float AttackInterval { get { return attackInterval; } }

        public bool Ranged { get { return ranged; } }

        public float ProjectileSpeed { get { return projectileSpeed; } }

        public float RetargetInterval { get { return retargetInterval; } }

        public float SightRange { get { return sightRange; } }

        /// <summary>مكافأة قتله بالفضّة (§10: تُحسب عند نهاية الموجة لا تتساقط).</summary>
        public int Bounty { get { return bounty; } }
    }
}
