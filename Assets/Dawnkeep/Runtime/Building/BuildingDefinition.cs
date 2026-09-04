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

        public string DisplayName { get { return displayName; } }

        public string Summary { get { return summary; } }

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
