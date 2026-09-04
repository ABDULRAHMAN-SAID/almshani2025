using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Equipment
{
    /// <summary>
    /// ما يلبسه اللاعب (§17): قطعةٌ في كل فتحةٍ من الأربع، ومستوىً لكلٍّ.
    ///
    /// **لا يملك بياناته**: هي في `SaveService` (§27) ككتلة `Equipment`.
    /// و‎−400‎ في ترتيب التنفيذ ليقرأ بعد `SaveService` (‏−600) وقبل أن
    /// يستيقظ البطل والواجهة.
    ///
    /// وأثرُه يصل إلى الأنظمة **من نقطة `BoonBook` نفسها**: بركةُ الجولة
    /// مضروبةً في بحثِ الحساب مضروبةً في التجهيز. فالبرج الذي يقرأ
    /// `TowerDamage` يقرأ الثلاثة بسطرٍ واحد، ولا يعلم بوجود تجهيزٍ أصلاً.
    /// </summary>
    [DefaultExecutionOrder(-400)]
    [DisallowMultipleComponent]
    public class Loadout : MonoBehaviour
    {
        public static Loadout Instance { get; private set; }

        [Tooltip("كتالوج القطع كلّه. يُملأ من قائمة المحرّر.")]
        [SerializeField] private EquipmentDefinition[] catalogue = new EquipmentDefinition[0];

        /// <summary>يُرفع عند كل تبديلٍ أو ترقية — تُعيد الواجهة رسم نفسها.</summary>
        public event System.Action Changed;

        private readonly Dictionary<string, EquipmentDefinition> _byName =
            new Dictionary<string, EquipmentDefinition>(48);

        /// <summary>الملبوس مرتَّباً بالفتحة — أربعة مواضع لا قاموس.</summary>
        private readonly EquipmentDefinition[] _worn = new EquipmentDefinition[4];

        /// <summary>مضاعفات التجهيز مجموعةً. تُبنى عند التبديل لا عند القراءة.</summary>
        private readonly Dictionary<Dawnkeep.Boons.BoonStat, float> _stats =
            new Dictionary<Dawnkeep.Boons.BoonStat, float>(24);

        private Dawnkeep.Save.SaveService _save;

        /// <summary>حفظٌ في الذاكرة إن لم يكن ثمّة خدمة — مشهدُ تجريبٍ لا يسقط.</summary>
        private readonly Dawnkeep.Save.SaveData _fallback = new Dawnkeep.Save.SaveData();

        private Dawnkeep.Save.SaveData Store
        {
            get
            {
                if (_save == null)
                {
                    _save = Dawnkeep.Save.SaveService.Instance;
                }

                return _save != null ? _save.Data : _fallback;
            }
        }

        public IReadOnlyList<EquipmentDefinition> Catalogue { get { return catalogue; } }

        private void Awake()
        {
            Instance = this;

            for (int i = 0; i < catalogue.Length; i++)
            {
                if (catalogue[i] != null)
                {
                    _byName[catalogue[i].name] = catalogue[i];
                }
            }

            Load();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        // ── الملك والمستوى ──────────────────────────────────────────────────

        public bool Owns(EquipmentDefinition gear)
        {
            return gear != null
                && (gear.OwnedFromStart || Store.Equipment.Owned.Contains(gear.name));
        }

        public int LevelOf(EquipmentDefinition gear)
        {
            return gear == null ? 1 : Mathf.Max(1, Store.Equipment.LevelOf(gear.name));
        }

        /// <summary>ما في الفتحة الآن، أو `null` إن كانت فارغة.</summary>
        public EquipmentDefinition Worn(EquipmentSlot slot)
        {
            int i = (int)slot;
            return i >= 0 && i < _worn.Length ? _worn[i] : null;
        }

        /// <summary>السلاح الملبوس — يقرؤه البطل في كل ضربة.</summary>
        public EquipmentDefinition Weapon { get { return _worn[(int)EquipmentSlot.Weapon]; } }

        // ── التبديل ─────────────────────────────────────────────────────────

        /// <summary>
        /// يلبس قطعةً. القطعة غير المملوكة تُرفض بصمت: الواجهة تعرض المقفل
        /// رمادياً ولا تسمح بضغطه، وهذا حارسٌ ثانٍ لو استُدعي من مكانٍ آخر.
        /// </summary>
        public bool Equip(EquipmentDefinition gear)
        {
            if (gear == null || !Owns(gear))
            {
                return false;
            }

            int i = (int)gear.Slot;
            if (i < 0 || i >= _worn.Length || _worn[i] == gear)
            {
                return false;
            }

            _worn[i] = gear;
            WriteEquipped();
            Rebuild();
            return true;
        }

        /// <summary>ينزع ما في الفتحة. السلاح لا يُنزع: بطلٌ بلا سلاحٍ لا يقاتل.</summary>
        public bool Unequip(EquipmentSlot slot)
        {
            if (slot == EquipmentSlot.Weapon)
            {
                return false;
            }

            int i = (int)slot;
            if (i < 0 || i >= _worn.Length || _worn[i] == null)
            {
                return false;
            }

            _worn[i] = null;
            WriteEquipped();
            Rebuild();
            return true;
        }

        /// <summary>يُملِّك قطعةً (من مخطّطٍ أو صناعة). يرفع الحدث إن تغيّر شيء.</summary>
        public bool Grant(EquipmentDefinition gear)
        {
            if (gear == null || Owns(gear))
            {
                return false;
            }

            Store.Equipment.Owned.Add(gear.name);
            Mark();
            Raise();
            return true;
        }

        /// <summary>يرفع مستوى قطعة. `Forge` هو من يجبي الثمن، وهذا يكتب الرقم.</summary>
        public bool SetLevel(EquipmentDefinition gear, int level)
        {
            if (gear == null)
            {
                return false;
            }

            int clamped = Mathf.Clamp(level, 1, EquipmentDefinition.MaxLevel);
            if (clamped == LevelOf(gear))
            {
                return false;
            }

            Store.Equipment.SetLevel(gear.name, clamped);
            Mark();
            Rebuild();
            return true;
        }

        /// <summary>يُسقِط ملك قطعة (تفكيك). وينزعها إن كانت ملبوسة.</summary>
        public bool Forget(EquipmentDefinition gear)
        {
            if (gear == null || gear.OwnedFromStart || !Owns(gear))
            {
                return false;
            }

            Store.Equipment.Owned.Remove(gear.name);
            Store.Equipment.SetLevel(gear.name, 1);

            int i = (int)gear.Slot;
            if (i >= 0 && i < _worn.Length && _worn[i] == gear)
            {
                _worn[i] = null;
                WriteEquipped();
            }

            Mark();
            Rebuild();
            return true;
        }

        // ── القراءة ─────────────────────────────────────────────────────────

        /// <summary>
        /// مضاعف التجهيز لرقمٍ بعينه. واحدٌ إن لم يمسّه شيء — فالمستدعي
        /// يضرب دائماً ولا يفحص.
        /// </summary>
        public float Of(Dawnkeep.Boons.BoonStat stat)
        {
            float value;
            return _stats.TryGetValue(stat, out value) ? value : 1f;
        }

        /// <summary>مضاعفٌ ساكن يعمل ولو لم يكن ثمّة تجهيزٌ في المشهد.</summary>
        public static float Stat(Dawnkeep.Boons.BoonStat stat)
        {
            Loadout loadout = Instance;
            return loadout != null ? loadout.Of(stat) : 1f;
        }

        /// <summary>شكل ضربة السلاح الملبوس، أو قوس الفجر إن لم يُلبَس شيء.</summary>
        public static WeaponKind Shape()
        {
            Loadout loadout = Instance;
            EquipmentDefinition weapon = loadout != null ? loadout.Weapon : null;
            return weapon != null ? weapon.Weapon : WeaponKind.DawnBow;
        }

        // ── الداخل ──────────────────────────────────────────────────────────

        /// <summary>
        /// يعيد بناء جدول المضاعفات من الأربع الملبوسة. **عند التبديل لا عند
        /// القراءة**: القراءة تقع آلاف المرّات في الثانية من الأبراج والجند،
        /// والتبديل يقع مرّةً في الشاشة.
        /// </summary>
        private void Rebuild()
        {
            _stats.Clear();

            for (int i = 0; i < _worn.Length; i++)
            {
                EquipmentDefinition gear = _worn[i];
                if (gear == null)
                {
                    continue;
                }

                int level = LevelOf(gear);
                Dawnkeep.Boons.BoonDefinition.Change[] changes = gear.Changes;

                for (int c = 0; c < changes.Length; c++)
                {
                    Dawnkeep.Boons.BoonStat stat = changes[c].Stat;
                    if (stat == Dawnkeep.Boons.BoonStat.None)
                    {
                        continue;
                    }

                    float current;
                    if (!_stats.TryGetValue(stat, out current))
                    {
                        current = 1f;
                    }

                    _stats[stat] = current * gear.MultiplierAt(stat, level);
                }
            }

            Raise();
        }

        private void Load()
        {
            Dawnkeep.Save.EquipmentInventory kit = Store.Equipment;

            for (int i = 0; i < _worn.Length; i++)
            {
                _worn[i] = null;
            }

            for (int i = 0; i < kit.Equipped.Count; i++)
            {
                EquipmentDefinition gear;
                if (!_byName.TryGetValue(kit.Equipped[i], out gear) || gear == null)
                {
                    continue;       // قطعةٌ من بناءٍ أحدث — تُتجاهل ولا تُسقِط
                }

                if (!Owns(gear))
                {
                    continue;
                }

                _worn[(int)gear.Slot] = gear;
            }

            // بطلٌ بلا سلاحٍ لا يقاتل: أوّل سلاحٍ مملوكٍ من الكتالوج احتياطاً
            if (_worn[(int)EquipmentSlot.Weapon] == null)
            {
                for (int i = 0; i < catalogue.Length; i++)
                {
                    EquipmentDefinition gear = catalogue[i];
                    if (gear != null && gear.Slot == EquipmentSlot.Weapon && Owns(gear))
                    {
                        _worn[(int)EquipmentSlot.Weapon] = gear;
                        break;
                    }
                }

                WriteEquipped();
            }

            Rebuild();
        }

        private void WriteEquipped()
        {
            List<string> equipped = Store.Equipment.Equipped;
            equipped.Clear();

            for (int i = 0; i < _worn.Length; i++)
            {
                if (_worn[i] != null)
                {
                    equipped.Add(_worn[i].name);
                }
            }

            Mark();
        }

        private void Mark()
        {
            if (_save == null)
            {
                _save = Dawnkeep.Save.SaveService.Instance;
            }

            if (_save != null)
            {
                _save.Mark();
            }
        }

        private void Raise()
        {
            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }

#if UNITY_EDITOR
        /// <summary>يملأ الكتالوج من المجلّد — يستدعيه باني الأصول.</summary>
        public void SetCatalogue(EquipmentDefinition[] all)
        {
            catalogue = all;
        }
#endif
    }
}
