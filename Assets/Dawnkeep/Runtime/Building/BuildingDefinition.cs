using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>نوع العقدة التي يُبنى عليها (§10).</summary>
    public enum NodeKind
    {
        /// <summary>داخل الساحة: دعم واقتصاد محميّ.</summary>
        Inner = 0,

        /// <summary>على مسار البوّابة: جدران وما يُبطئ التقدّم.</summary>
        Gate = 1,

        /// <summary>خارج السور: أبراج تُطلق مبكّراً وتُصاب مبكّراً.</summary>
        Outer = 2,

        /// <summary>مخصّصة للاقتصاد وحده.</summary>
        Economy = 3,

        /// <summary>منارات النور (§11).</summary>
        Beacon = 4,
    }

    /// <summary>دور المبنى — يحدّد ما يفعله `BuildingDirector` به كل إطار.</summary>
    public enum BuildingRole
    {
        /// <summary>يدرّ فضّةً عند الفجر ولا يفعل شيئاً في القتال.</summary>
        Economy = 0,

        /// <summary>يرمي المهاجمين في مداه.</summary>
        Tower = 1,

        /// <summary>يُخرج حرّاساً يرابطون حوله.</summary>
        Garrison = 2,

        /// <summary>يعترض الطريق ويمتصّ الضرب.</summary>
        Wall = 3,

        /// <summary>يصلح جيرانه أثناء القتال (§10: الورشة).</summary>
        Support = 4,

        /// <summary>منارة نور تُبنى على عقدة (§10 و§11).</summary>
        Beacon = 5,
    }

    /// <summary>
    /// تعريف مبنى: كل أرقامه في أصل، ولا رقم منها في الكود (§1).
    ///
    /// الترقية **سلسلة أصول** لا حقول مستوى: `upgrades` يحمل ما يمكن أن يصير
    /// إليه هذا المبنى، فيصف الأصلُ الشجرةَ كلّها — بما فيها تفرّع المستوى
    /// الثالث الذي تصفه §10 (خيارَان لا خيار واحد).
    /// </summary>
    [CreateAssetMenu(fileName = "BuildingDefinition", menuName = "مملكة الرماد/تعريف مبنى")]
    public class BuildingDefinition : ScriptableObject
    {
        [Header("التعريف")]
        [Tooltip("مفتاح الاسم في جدول النصوص. فارغاً يُستعمل `displayName` كما هو.")]
        [SerializeField] private string nameKey = string.Empty;

        [Tooltip("مفتاح الوصف في جدول النصوص.")]
        [SerializeField] private string summaryKey = string.Empty;

        [Tooltip("اسم احتياطي إن لم يوجد مفتاح — ولمن يقرأ الأصل في المفتش.")]
        [SerializeField] private string displayName = "مبنى";

        [Tooltip("سطر واحد يقول ما يفعله — يُعرض على البطاقة.")]
        [TextArea(1, 2)]
        [SerializeField] private string summary = string.Empty;

        [SerializeField] private BuildingRole role = BuildingRole.Economy;

        [Tooltip("أنواع العقد التي تقبل هذا المبنى.")]
        [SerializeField] private NodeKind[] nodes = { NodeKind.Inner };

        [Header("الثمن والبنية")]
        [SerializeField] private int cost = 45;

        [SerializeField] private float maxHealth = 260f;

        [Tooltip("زمن حركة البناء بالثانية (§10: 0.35).")]
        [SerializeField] private float buildSeconds = 0.35f;

        [Header("الاقتصاد")]
        [Tooltip("فضّة يدرّها عند الفجر. للاقتصاد وحده.")]
        [SerializeField] private int dawnIncome;

        [Header("الرمي")]
        [SerializeField] private float damage;

        [Tooltip("طلقات في الثانية (§10 تكتبها هكذا لا كفترة).")]
        [SerializeField] private float shotsPerSecond = 1.1f;

        [Tooltip("المدى بالمتر.")]
        [SerializeField] private float range = 34f;

        [Tooltip("أقرب مسافة يستطيع الضرب عندها — للمدافع التي لا تصيب ما تحتها.")]
        [SerializeField] private float minimumRange;

        [SerializeField] private TargetClass targetClass = TargetClass.Nearest;

        [Header("أثر المقذوف")]
        [Tooltip("ما يتجاوزه من درع الهدف (§10: المسلّة السحرية).")]
        [Range(0f, 1f)]
        [SerializeField] private float armourPierce;

        [Tooltip("نصف قطر الانفجار بالمتر. صفر يعني إصابة مفردة (§10: القاذف).")]
        [SerializeField] private float blastRadius;

        [Tooltip("معامل سرعة المصاب. واحد يعني بلا إبطاء (§10: مسلّة الصقيع 0.68).")]
        [Range(0.2f, 1f)]
        [SerializeField] private float slowFactor = 1f;

        [SerializeField] private float slowSeconds;

        [Tooltip("كم هدفاً إضافيّاً تقفز إليه السلسلة (§10: مسلّة العاصفة).")]
        [SerializeField] private int chainTargets;

        [Tooltip("ما يبقى من الضرر عند كل قفزة (§10: تناقص 20% ⇐ 0.8).")]
        [Range(0.1f, 1f)]
        [SerializeField] private float chainFalloff = 0.8f;

        [Header("الدعم")]
        [Tooltip("كم صحّة يعيد لكل مبنى (§10: الورشة 35).")]
        [SerializeField] private float repairAmount;

        [Tooltip("كل كم ثانية يصلح (§10: 4).")]
        [SerializeField] private float repairInterval = 4f;

        [Tooltip("كم مبنى يصلح في المرّة (§10: 2).")]
        [SerializeField] private int repairTargets = 2;

        [Tooltip("أبعد مسافة يصل إليها الإصلاح بالمتر.")]
        [SerializeField] private float repairRange = 40f;

        [Header("النور")]
        [Tooltip("شحنات المنارة التي يقيمها هذا المبنى (§10 و§11).")]
        [SerializeField] private int lightCharges = 1;

        [Header("الحامية")]
        [Tooltip("عدد الحرّاس الذين يُخرجهم عند البناء.")]
        [SerializeField] private int guardCount;

        [SerializeField] private UnitDefinition guard;

        [Header("الترقية")]
        [Tooltip("ما يمكن أن يصير إليه. أكثر من واحد يعني تفرّعاً يختاره اللاعب.")]
        [SerializeField] private BuildingDefinition[] upgrades = new BuildingDefinition[0];

        [Header("الشكل")]
        [SerializeField] private BuildingShape shape = BuildingShape.Cottage;

        [SerializeField] private Color accent = new Color(0.647f, 0.180f, 0.180f);

        /// <summary>الاسم المنطقي — الواجهة هي التي تشكّل.</summary>
        public string DisplayName
        {
            get
            {
                return string.IsNullOrEmpty(nameKey)
                    ? displayName
                    : Dawnkeep.Localization.Loc.Raw(nameKey);
            }
        }

        public string Summary
        {
            get
            {
                return string.IsNullOrEmpty(summaryKey)
                    ? summary
                    : Dawnkeep.Localization.Loc.Raw(summaryKey);
            }
        }

        public BuildingRole Role { get { return role; } }

        public NodeKind[] Nodes { get { return nodes; } }

        public int Cost { get { return cost; } }

        public float MaxHealth { get { return maxHealth; } }

        public float BuildSeconds { get { return buildSeconds; } }

        public int DawnIncome { get { return dawnIncome; } }

        public float Damage { get { return damage; } }

        public float ShotsPerSecond { get { return shotsPerSecond; } }

        public float Range { get { return range; } }

        public float MinimumRange { get { return minimumRange; } }

        public TargetClass TargetClass { get { return targetClass; } }

        public float ArmourPierce { get { return armourPierce; } }

        public float BlastRadius { get { return blastRadius; } }

        public float SlowFactor { get { return slowFactor; } }

        public float SlowSeconds { get { return slowSeconds; } }

        public int ChainTargets { get { return chainTargets; } }

        public float ChainFalloff { get { return chainFalloff; } }

        public float RepairAmount { get { return repairAmount; } }

        public float RepairInterval { get { return repairInterval; } }

        public int RepairTargets { get { return repairTargets; } }

        public float RepairRange { get { return repairRange; } }

        public int LightCharges { get { return lightCharges; } }

        /// <summary>أثر مقذوف هذا المبنى، جاهزاً لـ`ProjectilePool`.</summary>
        public Combat.ProjectileEffect Effect
        {
            get
            {
                Combat.ProjectileEffect e;
                e.ArmourPierce = armourPierce;
                e.BlastRadius = blastRadius;
                e.SlowFactor = slowFactor;
                e.SlowSeconds = slowSeconds;
                e.ChainTargets = chainTargets;
                e.ChainFalloff = chainFalloff;
                return e;
            }
        }

        public int GuardCount { get { return guardCount; } }

        public UnitDefinition Guard { get { return guard; } }

        public BuildingDefinition[] Upgrades { get { return upgrades; } }

        public BuildingShape Shape { get { return shape; } }

        public Color Accent { get { return accent; } }

        /// <summary>الضرر في الثانية — الرقم الذي يقارن به اللاعب على البطاقة.</summary>
        public float DamagePerSecond { get { return damage * shotsPerSecond; } }

        /// <summary>هل تقبل هذه العقدة هذا المبنى؟</summary>
        public bool Fits(NodeKind kind)
        {
            if (nodes == null || nodes.Length == 0)
            {
                return true;
            }

            for (int i = 0; i < nodes.Length; i++)
            {
                if (nodes[i] == kind)
                {
                    return true;
                }
            }

            return false;
        }
    }
}
