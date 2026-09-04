using UnityEngine;

namespace Dawnkeep.Hero
{
    /// <summary>
    /// إحصاءات البطل وقدراته (§8) — كلّها في أصل لا في الكود.
    ///
    /// **تحويل وحدات موثّق**: §8 تكتب السرعة بوحدات العالم (4.8) والمدى بوحدات
    /// شبكتها (4.8 أيضاً). عالم Unity هنا بالمتر، فالسرعة تُؤخذ كما هي
    /// (٤٫٨ م/ث — ونصف مرّة ونصف سرعة الجندي)، والمدى يُضرب في ٦ كما في §10
    /// (٢٨٫٨ م — ضعف مدى الرامي، وأريْن «قائد متوازن بعيد المدى»).
    /// </summary>
    [CreateAssetMenu(fileName = "HeroDefinition", menuName = "مملكة الرماد/تعريف بطل")]
    public class HeroDefinition : ScriptableObject
    {
        [Header("الأساس")]
        [SerializeField] private string nameKey = string.Empty;
        [SerializeField] private string displayName = "أَرْيَن";

        [Header("الحركة والقتال")]
        [Tooltip("متر في الثانية (§8: 4.8).")]
        [SerializeField] private float moveSpeed = 4.8f;

        [Tooltip("يُبطأ إلى هذه النسبة أثناء الضربة القريبة وحدها (§8: 75%).")]
        [Range(0.3f, 1f)]
        [SerializeField] private float attackSlow = 0.75f;

        [SerializeField] private float damage = 28f;

        [Tooltip("زمن الهجوم بالثانية (§8: 0.65).")]
        [SerializeField] private float attackInterval = 0.65f;

        [Tooltip("مدى السلاح بوحدات §8 — يُضرب في ستّة.")]
        [SerializeField] private float weaponRangeUnits = 4.8f;

        [Range(0f, 1f)]
        [SerializeField] private float critChance = 0.05f;

        [Tooltip("مضاعف ضرر الضربة الحرجة (§8: 150%).")]
        [SerializeField] private float critMultiplier = 1.5f;

        [Tooltip("لا يُبدَّل الهدف أسرع من هذا إلّا إن مات أو خرج من المدى (§8: 0.2).")]
        [SerializeField] private float retargetInterval = 0.2f;

        [Header("رشقة الفجر")]
        [SerializeField] private int volleyArrows = 5;

        [Tooltip("نسبة ضرر الهجوم لكل سهم (§8: 55%).")]
        [SerializeField] private float volleyDamageShare = 0.55f;

        [Tooltip("أقصى إصابات على الهدف الواحد (§8: ثلاث).")]
        [SerializeField] private int volleyMaxHitsPerTarget = 3;

        [Tooltip("زاوية القوس بالدرجات.")]
        [SerializeField] private float volleyArc = 42f;

        [SerializeField] private float volleyCooldown = 8f;

        [Header("راية الحشد")]
        [Tooltip("مدّة الراية بالثانية (§8: ثمان).")]
        [SerializeField] private float rallySeconds = 8f;

        [Tooltip("نصف قطر الراية بوحدات §8 — يُضرب في ستّة.")]
        [SerializeField] private float rallyRadiusUnits = 4.5f;

        [Tooltip("زيادة سرعة الهجوم داخلها (§8: 20%).")]
        [SerializeField] private float rallyAttackSpeed = 0.20f;

        [Tooltip("المقاومة الممنوحة داخلها (§8: 15%).")]
        [SerializeField] private float rallyResistance = 0.15f;

        [SerializeField] private float rallyCooldown = 16f;

        [Header("الضوء الأوّل")]
        [Tooltip("نصف قطر الموجة بوحدات §8 — يُضرب في ستّة.")]
        [SerializeField] private float ultimateRadiusUnits = 6f;

        [SerializeField] private float ultimateDamage = 180f;

        [Tooltip("ما يشفيه للجنود من صحّتهم القصوى (§8: 25%).")]
        [SerializeField] private float ultimateHeal = 0.25f;

        [Tooltip("ثوانٍ يبقى فيها درع الظلام مُزالاً بعد الموجة.")]
        [SerializeField] private float ultimatePurgeSeconds = 6f;

        [Tooltip("ضررٌ يُوقعه البطل ليمتلئ العدّاد. §8: يُشحن بالقتال لا بالزمن.")]
        [SerializeField] private float ultimateChargeDamage = 900f;

        [Header("الموت والعودة (§5)")]
        [Tooltip("ثوانٍ يبقى فيها روحاً قبل أن يعود (§5: سبع).")]
        [SerializeField] private float spiritSeconds = 7f;

        [Tooltip("تُضاف لكل موتة تالية في الليلة نفسها (§5: أربع).")]
        [SerializeField] private float spiritPenalty = 4f;

        [Tooltip("سرعة الروح — بطيئة عمداً (§5).")]
        [SerializeField] private float spiritSpeed = 2.6f;

        [Tooltip("نسبة الصحّة عند العودة (§5: 50%).")]
        [Range(0.1f, 1f)]
        [SerializeField] private float reviveHealth = 0.5f;

        /// <summary>أمتار لكل وحدة مدى في §8 — نفس معامل §10.</summary>
        public const float RangeUnit = 6f;

        public string NameKey { get { return nameKey; } }

        public string DisplayName
        {
            get
            {
                return string.IsNullOrEmpty(nameKey)
                    ? displayName
                    : Dawnkeep.Localization.Loc.Raw(nameKey);
            }
        }

        public float MoveSpeed { get { return moveSpeed; } }

        public float AttackSlow { get { return attackSlow; } }

        public float Damage { get { return damage; } }

        public float AttackInterval { get { return attackInterval; } }

        public float WeaponRange { get { return weaponRangeUnits * RangeUnit; } }

        public float CritChance { get { return critChance; } }

        public float CritMultiplier { get { return critMultiplier; } }

        public float RetargetInterval { get { return retargetInterval; } }

        public int VolleyArrows { get { return volleyArrows; } }

        public float VolleyDamage { get { return damage * volleyDamageShare; } }

        public int VolleyMaxHitsPerTarget { get { return volleyMaxHitsPerTarget; } }

        public float VolleyArc { get { return volleyArc; } }

        public float VolleyCooldown { get { return volleyCooldown; } }

        public float RallySeconds { get { return rallySeconds; } }

        public float RallyRadius { get { return rallyRadiusUnits * RangeUnit; } }

        public float RallyAttackSpeed { get { return rallyAttackSpeed; } }

        public float RallyResistance { get { return rallyResistance; } }

        public float RallyCooldown { get { return rallyCooldown; } }

        public float UltimateRadius { get { return ultimateRadiusUnits * RangeUnit; } }

        public float UltimateDamage { get { return ultimateDamage; } }

        public float UltimateHeal { get { return ultimateHeal; } }

        public float UltimatePurgeSeconds { get { return ultimatePurgeSeconds; } }

        public float UltimateChargeDamage { get { return ultimateChargeDamage; } }

        public float SpiritSeconds { get { return spiritSeconds; } }

        public float SpiritPenalty { get { return spiritPenalty; } }

        public float SpiritSpeed { get { return spiritSpeed; } }

        public float ReviveHealth { get { return reviveHealth; } }
    }
}
