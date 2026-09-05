using UnityEngine;

namespace Dawnkeep.Equipment
{
    /// <summary>
    /// قطعة تجهيز (§17). **بيانٌ خالص** كالبركة: ما تحرّكه وكم وبأيّ ندرة.
    /// لا سطر منطقٍ فيها — التجميع في `Loadout`، والتطبيق في الأنظمة التي
    /// تقرأ `BoonBook`.
    ///
    /// وأرقامها **مضاعفات من مفردات `BoonStat` نفسها** التي تستعملها بركات
    /// §15 وأبحاث §16. مفرداتٌ ثالثة للتجهيز تعني ثلاث نقاط قراءةٍ في كل
    /// نظام — ونسيان إحداها في موضعٍ يعني قطعةً يشتريها اللاعب فلا تعمل.
    /// </summary>
    [CreateAssetMenu(fileName = "Gear_", menuName = "مملكة الرماد/قطعة تجهيز")]
    public class EquipmentDefinition : ScriptableObject
    {
        [Tooltip("مفتاح الاسم في جدول النصوص.")]
        [SerializeField] private string nameKey = string.Empty;

        [Tooltip("مفتاح الوصف: سطرٌ واحد بلغةٍ مباشرة (§17).")]
        [SerializeField] private string summaryKey = string.Empty;

        [Tooltip("الاسم الحرفيّ احتياطاً ولقارئ المفتّش.")]
        [SerializeField] private string displayName = "قطعة";

        [SerializeField] private EquipmentSlot slot = EquipmentSlot.Relic;

        [SerializeField] private Rarity rarity = Rarity.Common;

        [Tooltip("ما تحرّكه من الأرقام، بمستواها الأوّل. المستوى يكبّرها.")]
        [SerializeField] private Dawnkeep.Boons.BoonDefinition.Change[] changes =
            new Dawnkeep.Boons.BoonDefinition.Change[0];

        [Header("السلاح (§17) — للسلاح وحده")]
        [Tooltip("شكل الضربة. يُقرأ حين تكون الفتحة سلاحاً.")]
        [SerializeField] private WeaponKind weapon = WeaponKind.DawnBow;

        [Tooltip("مدى الضربة بالوحدات (وحدةٌ = ستّة أمتار، كما في تعريف البطل).")]
        [SerializeField] private float rangeUnits = 4.8f;

        [Tooltip("ثواني ما بين ضربتين. أقلّ = أسرع.")]
        [SerializeField] private float interval = 0.65f;

        [Tooltip("رقمٌ يخدم شكل الضربة: زاوية القوس، أو نصف قطر المنطقة…")]
        [SerializeField] private float shape = 1f;

        [Header("الصناعة (§17)")]
        [Tooltip("ذهبُ الترقية عند المستوى الأوّل. يصعد مع المستوى.")]
        [SerializeField] private int goldCost = 120;

        [Tooltip("شظايا الترقية عند المستوى الأوّل (§21: شظايا الفجر).")]
        [SerializeField] private int shardCost = 8;

        [Tooltip("مفتوحةٌ من البداية — قطعُ الانطلاق لا تحتاج مخطّطاً.")]
        [SerializeField] private bool ownedFromStart;

        /// <summary>§17: «StatAtLevel = BaseStat × (1 + 0.055 × (Level − 1))».</summary>
        public const float GrowthPerLevel = 0.055f;

        /// <summary>§17: «Level من 1 إلى 50».</summary>
        public const int MaxLevel = 50;

        /// <summary>§17: «تفكيك القطع يعيد 80% من Essence المصروفة» — والجوهر
        /// صار «شظايا الفجر» بنصّ §21 التي تحصر العملات في ثلاث.</summary>
        public const float DismantleReturn = 0.80f;

        public string NameKey { get { return nameKey; } }

        public string SummaryKey { get { return summaryKey; } }

        public EquipmentSlot Slot { get { return slot; } }

        public Rarity Rarity { get { return rarity; } }

        public Dawnkeep.Boons.BoonDefinition.Change[] Changes { get { return changes; } }

        public WeaponKind Weapon { get { return weapon; } }

        public float Range { get { return rangeUnits * Dawnkeep.Hero.HeroDefinition.RangeUnit; } }

        public float Interval { get { return Mathf.Max(0.05f, interval); } }

        public float Shape { get { return shape; } }

        public int GoldCost { get { return goldCost; } }

        public int ShardCost { get { return shardCost; } }

        public bool OwnedFromStart { get { return ownedFromStart; } }

        /// <summary>هل تفتح خاصّةً نوعية؟ (§17: من Rare فصاعداً).</summary>
        public bool HasTrait { get { return RarityMark.OpensTrait(rarity); } }

        /// <summary>
        /// المضاعف عند مستوىً بعينه. الصيغة من §17 حرفياً، ومطبَّقةٌ على
        /// **الفائض فوق الواحد** لا على المضاعف نفسه: قطعةٌ بـ1.10 عند
        /// المستوى العاشر يجب أن تصير 1.15 لا 1.60 — ضربُ المضاعف كلّه
        /// يجعل كل قطعةٍ أسطوريّةً بحلول المستوى العشرين.
        /// </summary>
        public float MultiplierAt(Dawnkeep.Boons.BoonStat stat, int level)
        {
            float grown = 1f;
            float factor = 1f + GrowthPerLevel * (Mathf.Clamp(level, 1, MaxLevel) - 1);

            for (int i = 0; i < changes.Length; i++)
            {
                if (changes[i].Stat != stat)
                {
                    continue;
                }

                grown *= 1f + (changes[i].Multiplier - 1f) * factor;
            }

            return grown;
        }

        /// <summary>ثمن الترقية إلى المستوى التالي: ذهبٌ وجوهر (§17).</summary>
        public int GoldToLevel(int level)
        {
            return Mathf.RoundToInt(goldCost * (1f + GrowthPerLevel * (Mathf.Max(1, level) - 1)));
        }

        public int ShardsToLevel(int level)
        {
            return Mathf.RoundToInt(shardCost * (1f + GrowthPerLevel * (Mathf.Max(1, level) - 1)));
        }

        /// <summary>الاسم المنطقيّ لا المشكَّل — الواجهة هي التي تشكّل.</summary>
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
