using System.Collections.Generic;
using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Squads
{
    /// <summary>
    /// يقود الفرق كلّها في حلقة واحدة، ويرسم علامة مرساة كل فرقة.
    ///
    /// **أربع إلى ثماني مرّات في الثانية** كما تنصّ §9، لا ستّين: التشكيل
    /// والمقود لا يتغيّران بين إطارين، وتحديثهما في كل إطار عملٌ لا يراه أحد.
    /// والفرق موزّعة على الدورات فلا تتزامن كلّها في إطار واحد.
    /// </summary>
    [DisallowMultipleComponent]
    public class SquadDirector : MonoBehaviour
    {
        public static SquadDirector Instance { get; private set; }

        [Tooltip("كم مرّة في الثانية تُحدَّث قرارات الفرق (§9: 4 إلى 8).")]
        [Range(2f, 12f)]
        [SerializeField] private float updatesPerSecond = 6f;

        [Tooltip("أبعد مسافة بالمتر تُختار عندها الفرقة بقربها من البطل (§9: 4 وحدات).")]
        [SerializeField] private float selectRadius = 24f;

        [SerializeField] private Color holdColor = new Color(0.478f, 0.639f, 0.812f);
        [SerializeField] private Color defendColor = new Color(0.851f, 0.514f, 0.267f);
        [SerializeField] private Color retreatColor = new Color(0.851f, 0.294f, 0.267f);
        [SerializeField] private Color followColor = new Color(0.404f, 0.729f, 0.502f);

        private readonly List<Squad> _squads = new List<Squad>(16);
        private Transform[] _markers;
        private Renderer[] _markerRenderers;
        private MaterialPropertyBlock _block;

        private CombatDirector _combat;

        private static readonly int TintId = Shader.PropertyToID("_BaseColor");
        private static readonly int RadiusId = Shader.PropertyToID("_Radius");

        public IReadOnlyList<Squad> Squads { get { return _squads; } }

        /// <summary>فرقة واحدة على الأقلّ منهكة وتحتاج تراجعاً (§9).</summary>
        public bool AnyNeedsRetreat
        {
            get
            {
                for (int i = 0; i < _squads.Count; i++)
                {
                    if (_squads[i] != null && _squads[i].ShouldRetreat)
                    {
                        return true;
                    }
                }

                return false;
            }
        }

        private void Awake()
        {
            Instance = this;
            _block = new MaterialPropertyBlock();
            BuildMarkers();
        }

        private void Start()
        {
            _combat = CombatDirector.Instance;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void Register(Squad squad)
        {
            if (squad != null && !_squads.Contains(squad))
            {
                _squads.Add(squad);
            }
        }

        public void Unregister(Squad squad)
        {
            _squads.Remove(squad);
        }

        private void Update()
        {
            float now = Time.time;
            float interval = 1f / Mathf.Max(1f, updatesPerSecond);

            // كل فرقة بساعتها، وأوّل موعدٍ لها مزاح بمقدار ترتيبها: تنال كلٌّ
            // معدّلها كاملاً (§9: 4 إلى 8 في الثانية) ولا تتزامن كلّها في إطار.
            for (int i = 0; i < _squads.Count; i++)
            {
                Squad squad = _squads[i];
                if (squad == null || !squad.Due(now))
                {
                    continue;
                }

                squad.ScheduleNext(now, interval + (i * 0.0007f));
                squad.Apply();
            }

            DrawMarkers();
        }

        // ── أوامر اللاعب ────────────────────────────────────────────────────

        /// <summary>
        /// الفرق التي يشملها الأمر: ما كان مركزها داخل نصف قطر الاختيار من
        /// البطل (§9: أربع وحدات). إن لم يكن ثمّ بطل حيّ شُمِلت كلّها — أمرٌ
        /// لا يجد من ينفّذه أسوأ من أمرٍ يشمل الجميع.
        /// </summary>
        private int Selected(List<Squad> into)
        {
            into.Clear();

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            Unit hero = _combat != null ? _combat.Champion : null;
            if (hero == null)
            {
                for (int i = 0; i < _squads.Count; i++)
                {
                    if (_squads[i] != null && _squads[i].LiveCount > 0)
                    {
                        into.Add(_squads[i]);
                    }
                }

                return into.Count;
            }

            Vector3 centre = hero.Body.position;
            float radiusSqr = selectRadius * selectRadius;

            for (int i = 0; i < _squads.Count; i++)
            {
                Squad squad = _squads[i];
                if (squad == null || squad.LiveCount == 0)
                {
                    continue;
                }

                Vector3 delta = squad.Centre - centre;
                delta.y = 0f;
                if (delta.sqrMagnitude <= radiusSqr)
                {
                    into.Add(squad);
                }
            }

            return into.Count;
        }

        private readonly List<Squad> _scratch = new List<Squad>(16);

        /// <summary>
        /// «اتبعني» — تتبع الفرق القريبة البطل بتشكيلها.
        /// يعيد **‎-1‎** إن لم يكن في الساحة بطل: سببٌ غير سبب «لا فرقة قريبة»،
        /// وخلطهما يترك اللاعب يبحث عن فرقه بينما العلّة أنّ بطله سقط.
        /// </summary>
        public int CommandFollow()
        {
            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            Unit hero = _combat != null ? _combat.Champion : null;
            if (hero == null)
            {
                return -1;      // لا قائد يُتبع
            }

            int count = Selected(_scratch);
            for (int i = 0; i < count; i++)
            {
                _scratch[i].OrderFollow(hero.Body);
                _scratch[i].Apply();
            }

            return count;
        }

        /// <summary>«اثبت» — تثبت الفرق حيث هي الآن.</summary>
        public int CommandHold()
        {
            int count = Selected(_scratch);
            for (int i = 0; i < count; i++)
            {
                _scratch[i].OrderHold();
                _scratch[i].Apply();
            }

            return count;
        }

        /// <summary>«دافع» — عن أقرب مبنى إلى البطل، أو إلى الفرقة إن لم يكن.</summary>
        public int CommandDefend()
        {
            int count = Selected(_scratch);
            int ordered = 0;

            for (int i = 0; i < count; i++)
            {
                Squad squad = _scratch[i];
                Building.Building target = NearestBuilding(squad.Centre);
                if (target == null)
                {
                    continue;
                }

                squad.OrderDefend(target);
                squad.Apply();
                ordered++;
            }

            return ordered;
        }

        /// <summary>«تراجع» — إلى أقرب منارة مضيئة، وإلّا إلى موضع المرابطة.</summary>
        public int CommandRetreat()
        {
            int count = Selected(_scratch);
            for (int i = 0; i < count; i++)
            {
                Squad squad = _scratch[i];
                Vector3 refuge;

                if (!NearestRefuge(squad.Centre, out refuge))
                {
                    squad.OrderGarrison();
                }
                else
                {
                    squad.OrderRetreat(refuge);
                }

                squad.Apply();
            }

            return count;
        }

        private static Building.Building NearestBuilding(Vector3 from)
        {
            Building.BuildingDirector director = Building.BuildingDirector.Instance;
            if (director == null)
            {
                return null;
            }

            IReadOnlyList<Building.Building> list = director.Buildings;
            Building.Building best = null;
            float bestSqr = float.MaxValue;

            for (int i = 0; i < list.Count; i++)
            {
                Building.Building candidate = list[i];
                if (candidate == null || !candidate.Alive)
                {
                    continue;
                }

                Vector3 delta = candidate.Body.position - from;
                delta.y = 0f;
                float distSqr = delta.sqrMagnitude;
                if (distSqr < bestSqr)
                {
                    bestSqr = distSqr;
                    best = candidate;
                }
            }

            return best;
        }

        /// <summary>أقرب منارة مضيئة — الملجأ الذي تنصّ عليه §9.</summary>
        private static bool NearestRefuge(Vector3 from, out Vector3 refuge)
        {
            refuge = from;

            Light.LightField field = Light.LightField.Instance;
            if (field == null)
            {
                return false;
            }

            Light.Beacon beacon = field.NearestLit(from);
            if (beacon == null)
            {
                return false;
            }

            refuge = beacon.Position;
            return true;
        }

        // ── العلامات ────────────────────────────────────────────────────────

        /// <summary>
        /// علامة مرساة لكل فرقة مأمورة. §9 تشترط «Marker واضحاً» عند التثبيت،
        /// وأمرٌ بلا أثر مرئي أمرٌ لا يثق اللاعب بأنّه وصل.
        /// </summary>
        private void BuildMarkers()
        {
            const int Capacity = 16;      // سقف §9 اثنتا عشرة فرقة
            _markers = new Transform[Capacity];
            _markerRenderers = new Renderer[Capacity];

            Mesh quad = BuildQuad(7f);
            Material material = BuildMaterial();

            for (int i = 0; i < Capacity; i++)
            {
                GameObject go = new GameObject("SquadMark_" + i);
                go.transform.SetParent(transform, false);
                go.AddComponent<MeshFilter>().sharedMesh = quad;

                MeshRenderer renderer = go.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = material;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;

                _markers[i] = go.transform;
                _markerRenderers[i] = renderer;
                go.SetActive(false);
            }
        }

        private void DrawMarkers()
        {
            if (_markers == null)
            {
                return;
            }

            int used = 0;
            for (int i = 0; i < _squads.Count && used < _markers.Length; i++)
            {
                Squad squad = _squads[i];
                if (squad == null || squad.LiveCount == 0 || squad.Order == SquadOrder.Garrison)
                {
                    continue;      // المرابطة حالٌ افتراضية: علامتها ضجيج
                }

                Transform mark = _markers[used];
                if (!mark.gameObject.activeSelf)
                {
                    mark.gameObject.SetActive(true);
                }

                Vector3 at = squad.Anchor;
                at.y += 0.16f;
                mark.position = at;

                _markerRenderers[used].GetPropertyBlock(_block);
                _block.SetColor(TintId, ColorFor(squad.Order));
                _block.SetFloat(RadiusId, 5.2f);
                _markerRenderers[used].SetPropertyBlock(_block);

                used++;
            }

            for (int i = used; i < _markers.Length; i++)
            {
                if (_markers[i].gameObject.activeSelf)
                {
                    _markers[i].gameObject.SetActive(false);
                }
            }
        }

        private Color ColorFor(SquadOrder order)
        {
            switch (order)
            {
                case SquadOrder.Follow: return followColor;
                case SquadOrder.Defend: return defendColor;
                case SquadOrder.Retreat: return retreatColor;
                default: return holdColor;
            }
        }

        private static Mesh BuildQuad(float span)
        {
            Mesh mesh = new Mesh();
            mesh.name = "Dawnkeep_SquadMark";
            mesh.vertices = new[]
            {
                new Vector3(-span, 0f, -span), new Vector3(span, 0f, -span),
                new Vector3(span, 0f, span), new Vector3(-span, 0f, span),
            };
            mesh.uv = new[] { Vector2.zero, Vector2.right, Vector2.one, Vector2.up };
            mesh.triangles = new[] { 0, 2, 1, 0, 3, 2 };
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        private static Material BuildMaterial()
        {
            Shader shader = Shader.Find("Dawnkeep/LightRing");
            if (shader == null)
            {
                shader = Shader.Find("Universal Render Pipeline/Unlit");
            }

            Material material = new Material(shader);
            material.name = "Dawnkeep_SquadMark";
            material.SetFloat(Shader.PropertyToID("_Fill"), 0.04f);
            material.SetFloat(Shader.PropertyToID("_Rim"), 1.0f);
            material.SetFloat(Shader.PropertyToID("_Softness"), 0.26f);
            material.SetFloat(Shader.PropertyToID("_Sharp"), 1f);
            return material;
        }
    }
}
