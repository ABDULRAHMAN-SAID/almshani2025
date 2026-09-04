using UnityEngine;
using Dawnkeep.Building;

namespace Dawnkeep.Campaign
{
    /// <summary>
    /// يُنفّذ هدف المرحلة (§19) في الساحة.
    ///
    /// §19 تختم قائمة الأهداف بشرطٍ قاطع: **«لا تجعل كل الاختلافات نصًّا
    /// فقط؛ يجب أن تغير القرار الفعلي»**. فهذا الصنف هو ذلك التغيير: عقدٌ
    /// تُقفَل، وأبراجٌ تُؤجَّل، وجدارٌ يبدأ مكسوراً، وقافلةٌ تُحمى.
    ///
    /// وهو **ساكنُ القراءة**: `BuildNode` و`BuildingDirector` يسألانه ولا
    /// يعرفان الحملة. فمشهدُ تجريبٍ بلا حملةٍ يعمل كما كان.
    /// </summary>
    [DefaultExecutionOrder(60)]
    [DisallowMultipleComponent]
    public class StageRules : MonoBehaviour
    {
        public static StageRules Instance { get; private set; }

        [Tooltip("كم عقدةً تُترك مفتوحةً في هدف «ستّ عقد فقط» (§19).")]
        [SerializeField] private int nodeLimit = 6;

        [Tooltip("أوّل ليلةٍ تُبنى فيها الأبراج في المرحلة الاقتصادية (§19).")]
        [SerializeField] private int towersFromNight = 4;

        [Tooltip("صحّة الجدار المكسور عند البداية، نسبةً (§19: «جدار مكسور»).")]
        [Range(0.05f, 0.6f)]
        [SerializeField] private float breachHealth = 0.25f;

        [Tooltip("مبنى القافلة — يُقام مجّاناً ويجب أن يصمد حتى الفجر (§19).")]
        [SerializeField] private BuildingDefinition convoy;

        [Tooltip("جدارٌ للثغرة.")]
        [SerializeField] private BuildingDefinition wall;

        /// <summary>العقد المسموحة في «ستّ عقد فقط» — تُختار مرّةً عند البداية.</summary>
        private readonly System.Collections.Generic.List<BuildNode> _allowed =
            new System.Collections.Generic.List<BuildNode>(8);

        /// <summary>القافلة المُقامة — سقوطُها خسارةٌ ولو صمد القلب.</summary>
        public Building Convoy { get; private set; }

        /// <summary>هل سقطت القافلة؟ يسأله `StageOutcome`.</summary>
        public bool ConvoyLost
        {
            get
            {
                return CampaignDirector.Objective() == StageObjective.GuardConvoy
                    && Convoy != null && !Convoy.Alive;
            }
        }

        private void Awake()
        {
            Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>
        /// يُقيم ما يُقام عند البداية. `Start` لا `Awake`: العقد والمباني
        /// تسجّل نفسها في `BuildingDirector.Start`، والإقامة قبلها تقع على
        /// قائمةٍ فارغة.
        /// </summary>
        private void Start()
        {
            switch (CampaignDirector.Objective())
            {
                case StageObjective.SixNodesOnly:
                    ChooseNodes();
                    break;

                case StageObjective.BrokenWall:
                    RaiseBreach();
                    break;

                case StageObjective.GuardConvoy:
                    RaiseConvoy();
                    break;
            }
        }

        // ── ما تسأله الأنظمة ────────────────────────────────────────────────

        /// <summary>هل تُستعمل هذه العقدة؟ «ستّ عقد فقط» تقفل الباقي (§19).</summary>
        public static bool NodeAllowed(BuildNode node)
        {
            StageRules rules = Instance;
            if (rules == null || node == null
                || CampaignDirector.Objective() != StageObjective.SixNodesOnly)
            {
                return true;
            }

            return rules._allowed.Contains(node);
        }

        /// <summary>
        /// هل تُبنى الأبراج الآن؟ المرحلة الاقتصادية تبدأ بلا أبراج وتفتحها
        /// بعد ليالٍ (§19) — فالقرار: أن تعيش بالجند والبطل حتى تُفتح.
        /// </summary>
        public static bool TowersOpen
        {
            get
            {
                StageRules rules = Instance;
                if (rules == null
                    || CampaignDirector.Objective() != StageObjective.EconomyOpening)
                {
                    return true;
                }

                Dawnkeep.Flow.StageOutcome outcome = Dawnkeep.Flow.StageOutcome.Instance;
                int night = outcome != null ? outcome.WavesCleared + 1 : 1;
                return night >= rules.towersFromNight;
            }
        }

        /// <summary>
        /// كم جهةً تدخل منها الموجة؟ «بوّابتان» تجعلهما اثنتين من أوّل ليلة
        /// (§19)، فيُقسَم الجيش. وغيرُها يترك القرار لـ§14.
        /// </summary>
        public static bool ForcedTwoFronts
        {
            get { return CampaignDirector.Objective() == StageObjective.TwoGates; }
        }

        /// <summary>
        /// هل تحقّق شرط النور؟ «تشغيل منارتين خارجيّتين» لا يُفاز به بالصمود
        /// وحده (§19) — فالنور صار شرطاً لا اختياراً.
        /// </summary>
        public static bool BeaconsSatisfied
        {
            get
            {
                if (CampaignDirector.Objective() != StageObjective.LightTwoBeacons)
                {
                    return true;
                }

                Dawnkeep.Light.LightField field = Dawnkeep.Light.LightField.Instance;
                if (field == null)
                {
                    return true;      // مشهدٌ بلا نور: لا يُحبَس الفوز بشرطٍ لا يُرى
                }

                int lit = 0;
                System.Collections.Generic.IReadOnlyList<Dawnkeep.Light.Beacon> all =
                    field.Beacons;

                for (int i = 0; i < all.Count; i++)
                {
                    if (all[i] != null && all[i].IsLit)
                    {
                        lit++;
                    }
                }

                return lit >= 2;
            }
        }

        // ── الإقامة ─────────────────────────────────────────────────────────

        /// <summary>
        /// يختار العقد المسموحة: الأقرب إلى القلب. الأقرب لا العشوائيّ —
        /// عقدٌ متفرّقةٌ على أطراف الخريطة تجعل الستّ بلا معنى دفاعيّ.
        /// </summary>
        private void ChooseNodes()
        {
            BuildingDirector director = BuildingDirector.Instance;
            if (director == null)
            {
                return;
            }

            Keep keep = Keep.Instance;
            Vector3 centre = keep != null ? keep.transform.position : transform.position;

            System.Collections.Generic.IReadOnlyList<BuildNode> nodes = director.Nodes;
            _allowed.Clear();

            for (int i = 0; i < nodes.Count; i++)
            {
                if (nodes[i] != null)
                {
                    _allowed.Add(nodes[i]);
                }
            }

            _allowed.Sort(delegate (BuildNode a, BuildNode b)
            {
                float da = (a.Position - centre).sqrMagnitude;
                float db = (b.Position - centre).sqrMagnitude;
                return da.CompareTo(db);
            });

            while (_allowed.Count > Mathf.Max(1, nodeLimit))
            {
                _allowed.RemoveAt(_allowed.Count - 1);
            }
        }

        /// <summary>يقيم جداراً ثمّ يكسره: ثغرةٌ ظاهرة من أوّل ليلة (§19).</summary>
        private void RaiseBreach()
        {
            Building built = RaiseFree(wall);
            if (built != null)
            {
                built.TakeDamage(built.MaxHealth * (1f - Mathf.Clamp01(breachHealth)));
            }
        }

        private void RaiseConvoy()
        {
            Convoy = RaiseFree(convoy);
        }

        /// <summary>
        /// يقيم مبنىً على أقرب عقدةٍ تقبله **بلا ثمن**. لا يمرّ بـ`Place`:
        /// تلك تخصم الفضّة، وهذه هبةُ المرحلة لا شراءُ اللاعب.
        /// </summary>
        private Building RaiseFree(BuildingDefinition definition)
        {
            BuildingDirector director = BuildingDirector.Instance;
            if (director == null || definition == null)
            {
                return null;
            }

            Keep keep = Keep.Instance;
            Vector3 centre = keep != null ? keep.transform.position : transform.position;

            BuildNode best = null;
            float bestSqr = float.MaxValue;

            System.Collections.Generic.IReadOnlyList<BuildNode> nodes = director.Nodes;
            for (int i = 0; i < nodes.Count; i++)
            {
                BuildNode node = nodes[i];
                if (node == null || !node.IsEmpty || !definition.Fits(node.Kind))
                {
                    continue;
                }

                float sqr = (node.Position - centre).sqrMagnitude;
                if (sqr < bestSqr)
                {
                    bestSqr = sqr;
                    best = node;
                }
            }

            return best != null ? director.Grant(best, definition) : null;
        }
    }
}
