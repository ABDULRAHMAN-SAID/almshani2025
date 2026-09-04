using System.Collections.Generic;
using UnityEngine;
using Dawnkeep.Building;
using Dawnkeep.Light;

// `Dawnkeep.Building` اسم فضاءٍ وفيه صنفٌ بالاسم نفسه: الاسم المستعار يفصلهما
using Keeping = Dawnkeep.Building.Building;

namespace Dawnkeep.Boons
{
    /// <summary>
    /// مُوزِّع بركات §15: في الليالي المعلومة يختار اللاعب واحدة من ثلاث.
    ///
    /// قواعد العرض الأربع من §15 حرفياً:
    ///   ١. لا تُعرض بركة لا تؤثّر في شيءٍ يملكه — إلا إن كانت تفتح أسلوباً.
    ///   ٢. لا ثلاث خيارات من الفئة نفسها.
    ///   ٣. وزنٌ يقلّل تكرار بطاقة ظهرت مرّتين ولم تُختر.
    ///   ٤. إعادة اختيار **واحدة** في المرحلة، تُكسب من اللعب لا إعلاناً.
    ///
    /// والرابعة تُكسب هنا بقتل زعيم: أوضح ما يعرف اللاعب أنّه أنجزه، ولا
    /// سبيل إليها غيره — وهو نصّ §15 «من اللعب وليس إعلاناً».
    /// </summary>
    [DisallowMultipleComponent]
    public class BoonDealer : MonoBehaviour
    {
        public static BoonDealer Instance { get; private set; }

        [Tooltip("كل البركات المتاحة (§15: أربع وعشرون).")]
        [SerializeField] private BoonDefinition[] book = new BoonDefinition[0];

        [Tooltip("ليالي الاختيار (§15: الثالثة والسادسة والتاسعة).")]
        [SerializeField] private int[] boonNights = { 3, 6, 9 };

        [Tooltip("كم بطاقة تُعرض في المرّة.")]
        [SerializeField] private int cardsPerOffer = 3;

        [Tooltip("وزن بطاقةٍ ظهرت ولم تُختر. أقلّ = أندر.")]
        [Range(0.05f, 1f)]
        [SerializeField] private float staleWeight = 0.35f;

        [Tooltip("بعد كم ظهورٍ بلا اختيار يُخفَّض وزنها.")]
        [SerializeField] private int staleAfter = 2;

        [Tooltip("بذرة العرض — نفس البذرة تعيد نفس البطاقات.")]
        [SerializeField] private int seed = 20260115;

        private readonly Dictionary<BoonDefinition, int> _shown =
            new Dictionary<BoonDefinition, int>(32);

        private readonly List<BoonDefinition> _pool = new List<BoonDefinition>(32);
        private readonly List<BoonDefinition> _offer = new List<BoonDefinition>(4);
        private readonly List<int> _nightsDone = new List<int>(4);

        private System.Random _rng;
        private BoonBook _taken;
        private BuildingDirector _buildings;
        private LightField _light;

        /// <summary>البطاقات المعروضة الآن. فارغة يعني لا اختيار جارٍ.</summary>
        public IReadOnlyList<BoonDefinition> Cards { get { return _offer; } }

        /// <summary>هل بقيت إعادة اختيار؟ (§15: واحدة في المرحلة)</summary>
        public bool CanReroll { get; private set; }

        /// <summary>يُرفع عند فتح عرضٍ جديد أو إغلاقه.</summary>
        public event System.Action Changed;

        public void Configure(BoonDefinition[] all)
        {
            if (all != null && all.Length > 0)
            {
                book = all;
            }
        }

        private void Awake()
        {
            Instance = this;
            _rng = new System.Random(seed);
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>هل هذه الليلة ليلةَ بركة لم تُعرض بعد؟</summary>
        public bool IsBoonNight(int night)
        {
            if (boonNights == null || _nightsDone.Contains(night))
            {
                return false;
            }

            for (int i = 0; i < boonNights.Length; i++)
            {
                if (boonNights[i] == night)
                {
                    return true;
                }
            }

            return false;
        }

        /// <summary>
        /// يفتح عرض ليلةٍ. يعيد false إن لم يجد ما يعرضه — فلا تُفتح لوحةٌ
        /// فارغة، وهي أسوأ من ألّا تُفتح.
        /// </summary>
        public bool OpenFor(int night)
        {
            if (!IsBoonNight(night))
            {
                return false;
            }

            _nightsDone.Add(night);
            if (!Deal())
            {
                return false;
            }

            Raise();
            return true;
        }

        /// <summary>يأخذ بطاقةً ويغلق العرض.</summary>
        public void Choose(BoonDefinition boon)
        {
            if (boon == null || !_offer.Contains(boon))
            {
                return;
            }

            if (_taken == null)
            {
                _taken = BoonBook.Instance;
            }

            if (_taken != null)
            {
                _taken.Take(boon);
            }

            _offer.Clear();
            Raise();
        }

        /// <summary>إعادة الاختيار الوحيدة (§15). تُنفق ولا تعود.</summary>
        public bool Reroll()
        {
            if (!CanReroll || _offer.Count == 0)
            {
                return false;
            }

            CanReroll = false;
            if (!Deal())
            {
                return false;
            }

            Raise();
            return true;
        }

        /// <summary>
        /// تُكسب إعادةُ الاختيار بقتل زعيم (§15: «من اللعب وليس إعلاناً»).
        /// واحدةٌ للمرحلة: قتل زعيمٍ ثانٍ لا يعيدها لأنّها لا تُخزَّن اثنتين.
        /// </summary>
        public void EarnReroll()
        {
            CanReroll = true;
            Raise();
        }

        /// <summary>يمحو المرحلة كلّها — تُستدعى عند الإعادة (§5).</summary>
        public void ResetStage()
        {
            _shown.Clear();
            _offer.Clear();
            _nightsDone.Clear();
            CanReroll = false;
            _rng = new System.Random(seed);
            Raise();
        }

        /// <summary>يبني عرضاً جديداً. يعيد false إن لم يجد بطاقةً واحدة.</summary>
        private bool Deal()
        {
            // ما لم يُختر من العرض السابق يُعَدّ ظهوره: هذا أساس القاعدة
            // الثالثة، وعدُّه هنا لا عند الاختيار يكفل عدّ الإعادة أيضاً.
            for (int i = 0; i < _offer.Count; i++)
            {
                int count;
                _shown.TryGetValue(_offer[i], out count);
                _shown[_offer[i]] = count + 1;
            }

            _offer.Clear();
            Collect();

            if (_pool.Count == 0)
            {
                return false;
            }

            int want = Mathf.Min(cardsPerOffer, _pool.Count);
            for (int card = 0; card < want; card++)
            {
                BoonDefinition pick = Draw();
                if (pick == null)
                {
                    break;
                }

                _offer.Add(pick);
                _pool.Remove(pick);

                // القاعدة الثانية: بعد اثنتين من فئةٍ تُسحب بقيّتها من المجموعة
                if (CountInOffer(pick.Category) >= 2)
                {
                    for (int i = _pool.Count - 1; i >= 0; i--)
                    {
                        if (_pool[i].Category == pick.Category)
                        {
                            _pool.RemoveAt(i);
                        }
                    }
                }
            }

            return _offer.Count > 0;
        }

        /// <summary>سحبٌ موزون: الوزن يقلّ لمن ظهر ولم يُختر (القاعدة الثالثة).</summary>
        private BoonDefinition Draw()
        {
            float total = 0f;
            for (int i = 0; i < _pool.Count; i++)
            {
                total += Weight(_pool[i]);
            }

            if (total <= 0f)
            {
                return _pool.Count > 0 ? _pool[0] : null;
            }

            float roll = (float)_rng.NextDouble() * total;
            for (int i = 0; i < _pool.Count; i++)
            {
                roll -= Weight(_pool[i]);
                if (roll <= 0f)
                {
                    return _pool[i];
                }
            }

            return _pool[_pool.Count - 1];
        }

        private float Weight(BoonDefinition boon)
        {
            int count;
            _shown.TryGetValue(boon, out count);
            return count >= staleAfter ? staleWeight : 1f;
        }

        private int CountInOffer(BoonCategory category)
        {
            int count = 0;
            for (int i = 0; i < _offer.Count; i++)
            {
                if (_offer[i].Category == category)
                {
                    count++;
                }
            }

            return count;
        }

        /// <summary>يجمع المؤهَّلات: القاعدة الأولى من §15.</summary>
        private void Collect()
        {
            _pool.Clear();

            if (_taken == null)
            {
                _taken = BoonBook.Instance;
            }

            if (_buildings == null)
            {
                _buildings = BuildingDirector.Instance;
            }

            if (_light == null)
            {
                _light = LightField.Instance;
            }

            for (int i = 0; i < book.Length; i++)
            {
                BoonDefinition boon = book[i];
                if (boon == null)
                {
                    continue;
                }

                if (_taken != null && _taken.Contains(boon))
                {
                    continue;
                }

                if (!Useful(boon))
                {
                    continue;
                }

                _pool.Add(boon);
            }
        }

        /// <summary>
        /// هل تؤثّر هذه البركة في شيءٍ يملكه اللاعب؟ التي تفتح أسلوباً تُعرض
        /// على كل حال — §15 تستثنيها بنصّها.
        /// </summary>
        private bool Useful(BoonDefinition boon)
        {
            if (boon.OpensStyle)
            {
                return true;
            }

            if (boon.RequiresBeacon)
            {
                return _light != null && _light.LitCount > 0;
            }

            if (!boon.RequiresBuilding)
            {
                return true;      // بركات البطل والجند لا تشترط ملكاً
            }

            if (_buildings == null)
            {
                return false;
            }

            IReadOnlyList<Keeping> all = _buildings.Buildings;
            for (int i = 0; i < all.Count; i++)
            {
                Keeping building = all[i];
                if (building != null && building.Alive && building.Definition != null
                    && building.Definition.Role == boon.Requires)
                {
                    return true;
                }
            }

            return false;
        }

        private void Raise()
        {
            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }
    }
}
