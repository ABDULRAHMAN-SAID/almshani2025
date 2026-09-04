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
        [Tooltip("مفتاح الاسم في جدول النصوص. فارغاً يُستعمل `displayName` كما هو.")]
        [SerializeField] private string nameKey = string.Empty;

        [Tooltip("اسم احتياطي إن لم يوجد مفتاح — ولمن يقرأ الأصل في المفتش.")]
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

        [Tooltip("حجم الجسد. خمسة عشر عدوّاً بحجمٍ واحد لا يُفرَّق بينها في "
            + "حشدٍ ليليّ مهما اختلفت ألوانها — والظلّ يُقرأ قبل اللون (§12).")]
        [Range(0.6f, 2.2f)]
        [SerializeField] private float bodyScale = 1f;

        [Tooltip("فضّة يضيفها قتله إلى المكافأة المعلّقة، تُصرف عند الفجر (§10).")]
        [SerializeField] private int bounty = 6;

        [Header("السلوك (§12)")]
        [Tooltip("سماتُ سلوكٍ تُضاف إلى القتال. تُقرأ في `CombatDirector`.")]
        [SerializeField] private UnitTrait traits = UnitTrait.None;

        [Tooltip("رقمٌ يخدم السمة الجارية: نصف قطر الانفجار، أو مدى القفزة…")]
        [SerializeField] private float traitRange = 6f;

        [Tooltip("رقمٌ ثانٍ: ضرر الانفجار، أو ما يضيفه الدعم، أو عدد المستدعَين.")]
        [SerializeField] private float traitPower = 40f;

        [Tooltip("ثوانِ الإنذار قبل السمة — أو فترتُها إن كانت متكرّرة.")]
        [SerializeField] private float traitSeconds = 1.1f;

        [Tooltip("ما يُستدعى إن كانت السمة تستدعي.")]
        [SerializeField] private UnitDefinition traitSpawn;

        [Header("توليد الموجات (§14)")]

        [Tooltip("ثمن هذا العدوّ من ميزانية التهديد. صفر يمنعه من التوليد.")]
        [SerializeField] private int threatCost;

        [Tooltip("أوّل ليلة يجوز أن يظهر فيها. §14: لا يظهر عدوّ قبل تعليمه.")]
        [SerializeField] private int taughtOnWave = 1;

        [Tooltip("صنفه في قسمة الموجة: لا تُصرف الميزانية كلّها على صنف واحد.")]
        [SerializeField] private ThreatClass threatClass = ThreatClass.Melee;

        [Tooltip("أقلّ عدد يخرج منه إن اختير — واحدٌ من سربٍ ليس سرباً.")]
        [SerializeField] private int minPack = 1;

        [Tooltip("أكبر عدد يخرج منه في الموجة الواحدة.")]
        [SerializeField] private int maxPack = 12;

        /// <summary>
        /// الاسم **المنطقي** لا المشكَّل: الواجهة هي التي تشكّل، وتشكيلُه هنا
        /// يعني تشكيلاً مضاعفاً عند أوّل مستدعٍ يمرّ به على `Loc`.
        /// </summary>
        public string DisplayName
        {
            get
            {
                return string.IsNullOrEmpty(nameKey)
                    ? displayName
                    : Dawnkeep.Localization.Loc.Raw(nameKey);
            }
        }

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

        /// <summary>
        /// حجم جسده. الظلّ هو ما يُقرأ أوّلاً في ليلةٍ فيها تسعون وحدة، فحجمٌ
        /// واحدٌ للجميع يجعل ترول الحصار ومُغِيراً شيئاً واحداً حتى يضرب.
        /// </summary>
        public float BodyScale { get { return Mathf.Max(0.1f, bodyScale); } }

        /// <summary>مكافأة قتله بالفضّة (§10: تُحسب عند نهاية الموجة لا تتساقط).</summary>
        public int Bounty { get { return bounty; } }

        public UnitTrait Traits { get { return traits; } }

        /// <summary>هل فيه هذه السمة؟ دالّة لا مقارنة: الراية تُختبر ببتّها.</summary>
        public bool Has(UnitTrait trait)
        {
            return (traits & trait) != 0;
        }

        public float TraitRange { get { return traitRange; } }

        public float TraitPower { get { return traitPower; } }

        public float TraitSeconds { get { return traitSeconds; } }

        public UnitDefinition TraitSpawn { get { return traitSpawn; } }

        /// <summary>ثمنه من ميزانية §14. صفر يعني «لا يُولَّد» لا «مجّاني».</summary>
        public int ThreatCost { get { return threatCost; } }

        public int TaughtOnWave { get { return taughtOnWave; } }

        public ThreatClass ThreatClass { get { return threatClass; } }

        public int MinPack { get { return Mathf.Max(1, minPack); } }

        public int MaxPack { get { return Mathf.Max(MinPack, maxPack); } }
    }
}
