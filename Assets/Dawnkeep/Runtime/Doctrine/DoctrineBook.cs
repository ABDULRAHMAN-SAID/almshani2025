using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Doctrine
{
    /// <summary>
    /// البطاقتان المجهَّزتان (§18)، وما تفتحه الإنجازات.
    ///
    /// **بطاقتان لا أكثر** بنصّ §18. والعدد قيدٌ لا عيب: من يجهّز عشراً لا
    /// يختار شيئاً، ومن يجهّز اثنتين يبني أسلوباً.
    ///
    /// ولا يملك بياناته: هي في `SaveService` (§27). و‎−400‎ ليقرأ بعد
    /// `SaveService` (‏−600) ومع `Loadout`.
    /// </summary>
    [DefaultExecutionOrder(-400)]
    [DisallowMultipleComponent]
    public class DoctrineBook : MonoBehaviour
    {
        public static DoctrineBook Instance { get; private set; }

        /// <summary>§18: «يجهز اللاعب بطاقتين قبل المرحلة».</summary>
        public const int Slots = 2;

        [Tooltip("كتالوج البطاقات كلّه. يُملأ من قائمة المحرّر.")]
        [SerializeField] private DoctrineDefinition[] catalogue = new DoctrineDefinition[0];

        public event System.Action Changed;

        private readonly Dictionary<string, DoctrineDefinition> _byName =
            new Dictionary<string, DoctrineDefinition>(24);

        private readonly DoctrineDefinition[] _held = new DoctrineDefinition[Slots];

        private readonly Dictionary<Dawnkeep.Boons.BoonStat, float> _stats =
            new Dictionary<Dawnkeep.Boons.BoonStat, float>(16);

        private Dawnkeep.Save.SaveService _save;
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

        public IReadOnlyList<DoctrineDefinition> Catalogue { get { return catalogue; } }

        /// <summary>البطاقة في فتحةٍ بعينها، أو `null`.</summary>
        public DoctrineDefinition Held(int slot)
        {
            return slot >= 0 && slot < _held.Length ? _held[slot] : null;
        }

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

        // ── الفتح بالإنجاز ──────────────────────────────────────────────────

        /// <summary>
        /// كم بلغ اللاعب من شرط هذه البطاقة؟ يُقرأ من الحفظ لا من عدّادٍ ثانٍ.
        /// </summary>
        public int Progress(DoctrineUnlock unlock)
        {
            Dawnkeep.Save.SaveData data = Store;
            switch (unlock)
            {
                case DoctrineUnlock.AccountLevel:
                    Dawnkeep.Meta.Progress meta = Dawnkeep.Meta.Progress.Instance;
                    return meta != null ? meta.AccountLevel : 1;

                case DoctrineUnlock.Victories:
                    return data.Campaign.Victories;

                case DoctrineUnlock.FurthestWave:
                    return data.Campaign.FurthestWave;

                case DoctrineUnlock.BossesMet:
                    return data.Campaign.BossesMet.Count;

                case DoctrineUnlock.StagesPlayed:
                    return data.Profile.StagesPlayed;

                default:
                    return int.MaxValue;      // مفتوحةٌ من البداية
            }
        }

        public bool Unlocked(DoctrineDefinition card)
        {
            return card != null
                && (card.Unlock == DoctrineUnlock.FromStart
                    || Progress(card.Unlock) >= card.UnlockAt);
        }

        /// <summary>هل بلغ شرط الترقية الواحدة (§18)؟</summary>
        public bool Upgraded(DoctrineDefinition card)
        {
            return card != null && card.UpgradeAt > 0
                && card.Unlock != DoctrineUnlock.FromStart
                && Progress(card.Unlock) >= card.UpgradeAt;
        }

        public int LevelOf(DoctrineDefinition card)
        {
            return Upgraded(card) ? 2 : 1;
        }

        // ── التجهيز ─────────────────────────────────────────────────────────

        /// <summary>
        /// يضع بطاقةً في فتحة. البطاقة المقفلة تُرفض، والمكرّرة تُرفض:
        /// بطاقتان متطابقتان تضاعفان الأثر وتُلغيان الاختيار.
        /// </summary>
        public bool Equip(int slot, DoctrineDefinition card)
        {
            if (slot < 0 || slot >= _held.Length || card == null || !Unlocked(card))
            {
                return false;
            }

            for (int i = 0; i < _held.Length; i++)
            {
                if (i != slot && _held[i] == card)
                {
                    return false;
                }
            }

            if (_held[slot] == card)
            {
                return false;
            }

            _held[slot] = card;
            Write();
            Rebuild();
            return true;
        }

        public bool Clear(int slot)
        {
            if (slot < 0 || slot >= _held.Length || _held[slot] == null)
            {
                return false;
            }

            _held[slot] = null;
            Write();
            Rebuild();
            return true;
        }

        // ── القراءة ─────────────────────────────────────────────────────────

        public float Of(Dawnkeep.Boons.BoonStat stat)
        {
            float value;
            return _stats.TryGetValue(stat, out value) ? value : 1f;
        }

        public static float Stat(Dawnkeep.Boons.BoonStat stat)
        {
            DoctrineBook book = Instance;
            return book != null ? book.Of(stat) : 1f;
        }

        /// <summary>
        /// مجموع فعلٍ افتتاحيٍّ بعينه من البطاقتين. صفرٌ إن لم تحمله واحدة —
        /// فالمستدعي يجمع ولا يفحص.
        /// </summary>
        public int OpeningAmount(DoctrineOpening opening)
        {
            int total = 0;
            for (int i = 0; i < _held.Length; i++)
            {
                DoctrineDefinition card = _held[i];
                if (card != null && card.Opening == opening)
                {
                    total += card.AmountAt(LevelOf(card));
                }
            }

            return total;
        }

        /// <summary>مجموعٌ ساكن يعمل ولو لم يكن ثمّة كتابٌ في المشهد.</summary>
        public static int Opening(DoctrineOpening opening)
        {
            DoctrineBook book = Instance;
            return book != null ? book.OpeningAmount(opening) : 0;
        }

        // ── الداخل ──────────────────────────────────────────────────────────

        private void Rebuild()
        {
            _stats.Clear();

            for (int i = 0; i < _held.Length; i++)
            {
                DoctrineDefinition card = _held[i];
                if (card == null)
                {
                    continue;
                }

                int level = LevelOf(card);
                Dawnkeep.Boons.BoonDefinition.Change[] changes = card.Changes;

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

                    _stats[stat] = current * card.MultiplierAt(stat, level);
                }
            }

            Raise();
        }

        private void Load()
        {
            List<string> held = Store.Doctrine.Held;

            for (int i = 0; i < _held.Length; i++)
            {
                _held[i] = null;
            }

            for (int i = 0; i < held.Count && i < _held.Length; i++)
            {
                DoctrineDefinition card;
                if (!_byName.TryGetValue(held[i], out card) || card == null)
                {
                    continue;      // بطاقةٌ من بناءٍ أحدث — تُتجاهل ولا تُسقط
                }

                // شرطُها قد يكون تشدّد في بناءٍ لاحق: لا تُلبَس ما لا يُملَك
                if (Unlocked(card))
                {
                    _held[i] = card;
                }
            }

            Rebuild();
        }

        private void Write()
        {
            List<string> held = Store.Doctrine.Held;
            held.Clear();

            for (int i = 0; i < _held.Length; i++)
            {
                held.Add(_held[i] != null ? _held[i].name : string.Empty);
            }

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
        public void SetCatalogue(DoctrineDefinition[] all)
        {
            catalogue = all;
        }
#endif
    }
}
