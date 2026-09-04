using UnityEngine;

namespace Dawnkeep.Campaign
{
    /// <summary>
    /// مرحلةٌ واحدة من أربعين (§19: أربع مناطق × عشر). **بيانٌ خالص**: أيّ
    /// منطقة، وأيّ هدف، وكم ليلة، وما تُسقطه من مخطّطات.
    ///
    /// والمخطّط هو ما يُغلق حلقة §17: «مخططات من المراحل والأهداف». فقطعةٌ
    /// لا تُملَك من البداية لا تُنال إلّا من هنا.
    /// </summary>
    [CreateAssetMenu(fileName = "Stage_", menuName = "مملكة الرماد/مرحلة حملة")]
    public class StageDefinition : ScriptableObject
    {
        [SerializeField] private string nameKey = string.Empty;
        [SerializeField] private string displayName = "مرحلة";

        [SerializeField] private ZoneDefinition zone;

        [Tooltip("ترتيبها داخل منطقتها، من واحد.")]
        [SerializeField] private int index = 1;

        [SerializeField] private StageObjective objective = StageObjective.HoldTheKeep;

        [Tooltip("كم ليلةً تُصمَد. §5 تجعلها عشراً في الحملة.")]
        [SerializeField] private int nights = 10;

        [Tooltip("مخطّطٌ يُملَّكه الفوز أوّل مرّة (§17). فارغاً فلا مخطّط.")]
        [SerializeField] private Dawnkeep.Equipment.EquipmentDefinition blueprint;

        public string NameKey { get { return nameKey; } }

        public ZoneDefinition Zone { get { return zone; } }

        public int Index { get { return Mathf.Max(1, index); } }

        public StageObjective Objective { get { return objective; } }

        public int Nights { get { return Mathf.Max(1, nights); } }

        public Dawnkeep.Equipment.EquipmentDefinition Blueprint { get { return blueprint; } }

        /// <summary>مفتاح المرحلة في الحفظ: «المنطقة‑الترتيب».</summary>
        public string Key
        {
            get
            {
                return (zone != null ? zone.Order : 0).ToString() + "-" + Index.ToString();
            }
        }

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
