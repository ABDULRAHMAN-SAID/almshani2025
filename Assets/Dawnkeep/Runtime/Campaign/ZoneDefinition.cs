using UnityEngine;

namespace Dawnkeep.Campaign
{
    /// <summary>
    /// منطقة من مناطق §19 الأربع. ولكلٍّ **قاعدةُ بيئةٍ تغيّر اللعب** لا
    /// لونَ سماءٍ فقط: الوحل يبطئ، والجليد يزلق، والعاصفة تقصّر المدى،
    /// والظلام يضيّق النور.
    /// </summary>
    [CreateAssetMenu(fileName = "Zone_", menuName = "مملكة الرماد/منطقة حملة")]
    public class ZoneDefinition : ScriptableObject
    {
        [SerializeField] private string nameKey = string.Empty;
        [SerializeField] private string summaryKey = string.Empty;
        [SerializeField] private string displayName = "منطقة";

        [Tooltip("ترتيبها في الحملة، من واحد.")]
        [SerializeField] private int order = 1;

        [Tooltip("عدد مراحلها. §19: عشرٌ لكل منطقة.")]
        [SerializeField] private int stages = 10;

        [Header("البيئة — تغيّر اللعب لا الصورة وحدها (§19)")]
        [Tooltip("مضاعف سرعة المهاجمين والجند. الوحل يبطئ، والجليد يسرّع.")]
        [Range(0.7f, 1.3f)]
        [SerializeField] private float groundSpeed = 1f;

        [Tooltip("مضاعف مدى الأبراج. العاصفة تقصّره.")]
        [Range(0.7f, 1.2f)]
        [SerializeField] private float towerRange = 1f;

        [Tooltip("مضاعف نصف قطر المنارة. الظلام الكثيف يضيّقه.")]
        [Range(0.6f, 1.2f)]
        [SerializeField] private float beaconRadius = 1f;

        [Tooltip("مضاعف ميزانية التهديد (§14). منطقةٌ أشدّ تصعد بالسلّم كلّه.")]
        [Range(0.8f, 2.5f)]
        [SerializeField] private float threatScale = 1f;

        [Tooltip("زعيم المنطقة — يخرج في مرحلتها الأخيرة.")]
        [SerializeField] private Dawnkeep.Bosses.BossDefinition boss;

        [Tooltip("تُفتح بعد إتمام هذا العدد من مراحل المنطقة السابقة.")]
        [SerializeField] private int unlockAfter;

        public string NameKey { get { return nameKey; } }

        public string SummaryKey { get { return summaryKey; } }

        public int Order { get { return Mathf.Max(1, order); } }

        public int Stages { get { return Mathf.Max(1, stages); } }

        public float GroundSpeed { get { return groundSpeed; } }

        public float TowerRange { get { return towerRange; } }

        public float BeaconRadius { get { return beaconRadius; } }

        public float ThreatScale { get { return threatScale; } }

        public Dawnkeep.Bosses.BossDefinition Boss { get { return boss; } }

        public int UnlockAfter { get { return unlockAfter; } }

        public string DisplayName
        {
            get
            {
                if (!string.IsNullOrEmpty(nameKey))
                {
                    string text = Dawnkeep.Localization.Loc.Text(nameKey);
                    if (!string.IsNullOrEmpty(text))
                    {
                        return text;
                    }
                }

                return displayName;
            }
        }
    }
}
