using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>
    /// عقدة بناء: موضع ثابت في الخريطة يقبل صنفاً من المباني (§10).
    ///
    /// العقد **ثابتة لا حرّة**: البناء الحرّ يجعل كل جولة تخطيطاً هندسياً
    /// طويلاً، والعقد تجعله اختياراً بين ثلاث بطاقات — وهي الركيزة الأولى:
    /// «قرار اقتصادي قصير المدى».
    ///
    /// العقدة الخالية تُعلَّم بحلقة على الأرض ووتد، فيراها اللاعب من بعيد بلا
    /// واجهة تشير إليها.
    /// </summary>
    [DisallowMultipleComponent]
    public class BuildNode : MonoBehaviour
    {
        [SerializeField] private NodeKind kind = NodeKind.Inner;

        [Tooltip("مستوى قلب الحصن الذي تُفتح عنده هذه العقدة (§10).")]
        [SerializeField] private int unlockTier = 1;

        [Tooltip("من أين يبدأ مسح الكتالوج لهذه العقدة — يُنوِّع بطاقاتها.")]
        [SerializeField] private int offerSeed;

        private Transform _transform;
        private Transform _marker;
        private Building _building;

        public NodeKind Kind { get { return kind; } }

        public int UnlockTier { get { return unlockTier; } }

        /// <summary>
        /// بذرة بطاقات هذه العقدة. §10 تعرض **ثلاثاً في المرّة**، ومسحُ
        /// الكتالوج من أوّله دائماً يعني أنّ المسلّة والورشة والقاذف لا تظهر
        /// أبداً على عقدة داخلية — يسبقها الكوخ والمزرعة والبرج. البذرة تُدوّر
        /// نقطة البدء فتختلف العقد فيما تعرضه، وتبقى ثابتة لكل عقدة.
        /// </summary>
        public int OfferSeed { get { return offerSeed; } }

        /// <summary>
        /// فُتحت بمستوى قلب الحصن الحالي. المقفلة لا تُلمس ولا تُعلَّم: عقدةٌ
        /// ظاهرة لا تقبل شيئاً تُعلّم اللاعب أن نقره لا يفعل شيئاً.
        /// </summary>
        public bool Unlocked
        {
            get
            {
                // هدف «ستّ عقد فقط» (§19) يقفل ما زاد عنها طول المرحلة.
                // هنا لا في اللوحة: العقدة المقفلة لا تُعلَّم ولا تُلمس،
                // والقفل من موضعٍ واحد يسري على كل طريقٍ إليها.
                if (!Dawnkeep.Campaign.StageRules.NodeAllowed(this))
                {
                    return false;
                }

                Keep keep = Keep.Instance;
                return keep == null || unlockTier <= keep.Tier;
            }
        }

        public Vector3 Position { get { return _transform != null ? _transform.position : transform.position; } }

        /// <summary>المبنى القائم عليها، أو null إن كانت خالية.</summary>
        public Building Current { get { return _building; } }

        public bool IsEmpty { get { return _building == null || !_building.Alive; } }

        public void Configure(NodeKind value, int tier, int seed)
        {
            kind = value;
            unlockTier = tier;
            offerSeed = seed;
        }

        private void Awake()
        {
            _transform = transform;
            BuildMarker();
            RefreshMarker();
        }

        private void OnEnable()
        {
            BuildingDirector director = BuildingDirector.Instance;
            if (director != null)
            {
                director.RegisterNode(this);
            }
        }

        private void OnDisable()
        {
            BuildingDirector director = BuildingDirector.Instance;
            if (director != null)
            {
                director.UnregisterNode(this);
            }
        }

        /// <summary>يوائم علامتها مع القفل والامتلاء. يُنادى عند تغيّر المستوى.</summary>
        public void RefreshMarker()
        {
            ShowMarker(IsEmpty && Unlocked);
        }

        public void Attach(Building building)
        {
            _building = building;
            ShowMarker(false);
        }

        public void Clear()
        {
            _building = null;
            RefreshMarker();
        }

        /// <summary>يُظهر علامة العقدة الخالية أو يخفيها.</summary>
        public void ShowMarker(bool visible)
        {
            if (_marker != null && _marker.gameObject.activeSelf != visible)
            {
                _marker.gameObject.SetActive(visible);
            }
        }

        /// <summary>حلقة على الأرض ووتد قصير — علامة العقدة الخالية.</summary>
        private void BuildMarker()
        {
            GameObject go = new GameObject("Marker");
            go.transform.SetParent(_transform, false);

            Mesh quad = new Mesh();
            quad.name = "Dawnkeep_NodeMark";
            const float S = 4.6f;
            quad.vertices = new[]
            {
                new Vector3(-S, 0f, -S), new Vector3(S, 0f, -S),
                new Vector3(S, 0f, S), new Vector3(-S, 0f, S),
            };
            quad.uv = new[] { Vector2.zero, Vector2.right, Vector2.one, Vector2.up };
            quad.triangles = new[] { 0, 2, 1, 0, 3, 2 };
            quad.RecalculateNormals();
            quad.RecalculateBounds();

            go.transform.localPosition = new Vector3(0f, 0.15f, 0f);
            go.AddComponent<MeshFilter>().sharedMesh = quad;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;

            Shader shader = Shader.Find("Dawnkeep/LightRing");
            if (shader == null)
            {
                shader = Shader.Find("Universal Render Pipeline/Unlit");
            }

            // نفس مُظلِّل دائرة النور: حلقة بحافّة، بلا ملء يحجب الأرض
            Material material = new Material(shader);
            material.name = "Dawnkeep_NodeMark";
            material.SetColor(BuildingMaterials.BaseColorId, MarkerColor(kind));
            material.SetFloat(Shader.PropertyToID("_Radius"), 3.4f);
            material.SetFloat(Shader.PropertyToID("_Fill"), 0.05f);
            material.SetFloat(Shader.PropertyToID("_Rim"), 0.85f);
            material.SetFloat(Shader.PropertyToID("_Softness"), 0.22f);
            material.SetFloat(Shader.PropertyToID("_Sharp"), 1f);
            renderer.sharedMaterial = material;

            _marker = go.transform;
        }

        /// <summary>لون العلامة بحسب نوع العقدة — يقرأ اللاعب ما تقبله قبل لمسها.</summary>
        private static Color MarkerColor(NodeKind kind)
        {
            switch (kind)
            {
                case NodeKind.Gate: return new Color(0.851f, 0.514f, 0.267f);
                case NodeKind.Outer: return new Color(0.812f, 0.400f, 0.376f);
                case NodeKind.Economy: return new Color(0.404f, 0.729f, 0.502f);
                case NodeKind.Beacon: return new Color(1f, 0.796f, 0.451f);
                default: return new Color(0.478f, 0.639f, 0.812f);
            }
        }
    }
}
