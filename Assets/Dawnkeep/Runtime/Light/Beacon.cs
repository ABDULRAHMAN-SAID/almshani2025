using Dawnkeep.Rendering;
using UnityEngine;

namespace Dawnkeep.Light
{
    /// <summary>
    /// منارة فجر: عمود حجري بمِجمَرة، ودائرة أمان على الأرض حول قاعدته.
    ///
    /// الشحنات هي عملة النظام (§11): كل شحنة توسّع الدائرة، وتقضم درع الظلام
    /// عمّن بداخلها، وتزيد مدى من يرمي منها. واللاعب ينقلها بين المنارات قبل
    /// الموجة — وهذا هو القرار التكتيكي الذي تقوم عليه الركيزة السادسة.
    ///
    /// **المنارة تبني شكلها بنفسها**: شبكة العمود والدائرة والوهج تُولَّد في
    /// `Awake` من `MeshBuilder`، فلا جاهزة تُحرَّر يدوياً ولا أصل يُنسى تحديثه
    /// حين يتغيّر نصف القطر.
    /// </summary>
    [DisallowMultipleComponent]
    public class Beacon : MonoBehaviour
    {
        [SerializeField] private LightSettings settings;

        [Tooltip("شحنات المنارة عند بداية الجولة.")]
        [SerializeField] private int charges = 1;

        [Header("الشكل")]
        [SerializeField] private Color flameColor = new Color(1f, 0.796f, 0.451f);

        [Tooltip("ارتفاع المِجمَرة عن الأرض بالمتر.")]
        [SerializeField] private float bowlHeight = 4.2f;

        private Transform _transform;
        private Transform _ring;
        private Material _ringMaterial;
        private UnityEngine.Light _lamp;
        private Transform[] _pips;
        private Renderer[] _pipRenderers;
        private MaterialPropertyBlock _pipBlock;

        private float _snuffedUntil;
        private float _shownRadius = -1f;
        private int _shownCharges = -1;
        private bool _shownLit;

        private static readonly int RadiusId = Shader.PropertyToID("_Radius");
        private static readonly int SoftnessId = Shader.PropertyToID("_Softness");
        private static readonly int TintId = Shader.PropertyToID("_BaseColor");
        private static readonly int SharpId = Shader.PropertyToID("_Sharp");

        private static readonly Color Dim = new Color(0.180f, 0.176f, 0.169f, 1f);

        /// <summary>شحنات المنارة الآن.</summary>
        public int Charges { get { return charges; } }

        /// <summary>
        /// أُطفئت مؤقّتاً — لا تُضيء ولا تُحتسب، لكنّ شحناتها باقية فتعود بعد
        /// المهلة. الإطفاء يسلب المنطقة لا الشحنة: هذا ما يجعله هدفاً تكتيكياً
        /// لا خسارة دائمة.
        /// </summary>
        public bool Snuffed { get { return Time.time < _snuffedUntil; } }

        /// <summary>مضيئة فعلاً: لها شحنة ولم تُطفَأ.</summary>
        public bool IsLit { get { return charges > 0 && !Snuffed; } }

        public Vector3 Position { get { return _transform != null ? _transform.position : transform.position; } }

        public LightSettings Settings { get { return settings; } }

        /// <summary>نصف قطر دائرتها الآن. صفر إن كانت مطفأة.</summary>
        public float Radius
        {
            get
            {
                if (!IsLit || settings == null)
                {
                    return 0f;
                }

                return settings.RadiusFor(charges);
            }
        }

        public void Configure(LightSettings value, int startCharges)
        {
            settings = value;
            charges = startCharges;
        }

        /// <summary>
        /// يضيف شحنة إن بقي متّسع. يعيد false إن كانت ممتلئة — والنداء عندها
        /// لا يفعل شيئاً، فالمنادي يقرّر ماذا يعمل بالشحنة التي في يده.
        /// </summary>
        public bool AddCharge()
        {
            int max = settings != null ? settings.MaxChargesPerBeacon : 3;
            if (charges >= max)
            {
                return false;
            }

            charges++;
            return true;
        }

        /// <summary>ينزع شحنة. يعيد false إن كانت خاوية.</summary>
        public bool RemoveCharge()
        {
            if (charges <= 0)
            {
                return false;
            }

            charges--;
            return true;
        }

        /// <summary>
        /// يُطفئها مؤقّتاً. النداء المتكرّر **يمدّد** ولا يُراكم: عشرة آكلين
        /// حول منارة واحدة يعني ثماني ثوانٍ من آخرهم لا ثمانين.
        /// </summary>
        public void Snuff(float seconds)
        {
            float until = Time.time + seconds;
            if (until > _snuffedUntil)
            {
                _snuffedUntil = until;
            }
        }

        private void Awake()
        {
            _transform = transform;
            _pipBlock = new MaterialPropertyBlock();
            BuildBrazier();
            BuildRing();
            BuildPips();
            BuildLamp();
        }

        private void OnEnable()
        {
            LightField field = LightField.Instance;
            if (field != null)
            {
                field.Register(this);
            }
        }

        private void OnDisable()
        {
            LightField field = LightField.Instance;
            if (field != null)
            {
                field.Unregister(this);
            }
        }

        private void LateUpdate()
        {
            bool lit = IsLit;
            float radius = Radius;

            if (_ring != null)
            {
                if (_ring.gameObject.activeSelf != lit)
                {
                    _ring.gameObject.SetActive(lit);
                }

                // نصف القطر يُمرَّر إلى المُظلِّل لا إلى المقياس: تكبير الشبكة
                // يمطّ حافّتها الناعمة معها فتصير الحافّة أعرض كلّما اتّسعت.
                if (lit && !Mathf.Approximately(radius, _shownRadius))
                {
                    _shownRadius = radius;
                    _ringMaterial.SetFloat(RadiusId, radius);
                }
            }

            if (_lamp != null)
            {
                _lamp.enabled = lit;
                if (lit)
                {
                    // نبض خفيف: اللهب لا يثبت، والثبات يجعلها تبدو مصباحاً لا ناراً
                    float pulse = 0.92f + (0.08f * Mathf.Sin(Time.time * 5.3f));
                    _lamp.range = radius;
                    _lamp.intensity = (1.4f + (0.55f * charges)) * pulse;
                }
            }

            UpdatePips(lit);
        }

        /// <summary>حدّة الحافّة: واضحة أثناء التخطيط، ناعمة في القتال (§11).</summary>
        public void SetEdgeSharpness(float sharp)
        {
            if (_ringMaterial != null)
            {
                _ringMaterial.SetFloat(SharpId, Mathf.Clamp01(sharp));
            }
        }

        // ── الشكل ───────────────────────────────────────────────────────────

        private void BuildBrazier()
        {
            MeshBuilder stone = new MeshBuilder();

            // عمود مثمّن ينحسر صعوداً، ثم طوق بارز، ثم مِجمَرة تتّسع — شكل أصلي
            const int Sides = 8;
            stone.AddCylinder(Vector3.zero, 0.92f, 0.74f, 0.55f, Sides, 0.6f, false);
            stone.AddCylinder(new Vector3(0f, 0.55f, 0f), 0.74f, 0.56f, 2.00f, Sides, 0.6f, false);
            stone.AddCylinder(new Vector3(0f, 2.55f, 0f), 0.56f, 0.72f, 0.40f, Sides, 0.6f, false);
            stone.AddCylinder(new Vector3(0f, 2.95f, 0f), 0.72f, 0.52f, 0.35f, Sides, 0.6f, false);
            stone.AddCylinder(new Vector3(0f, 3.30f, 0f), 0.52f, 0.86f,
                Mathf.Max(0.2f, bowlHeight - 3.30f), Sides, 0.6f, true);

            AddPiece("Stone", stone.ToMesh("Dawnkeep_Beacon_Stone", true),
                new Color(0.451f, 0.435f, 0.408f), false);

            // اللهب: مخروط قصير فوق المِجمَرة، بلا ظلّ ولا استقبال ظلّ
            MeshBuilder flame = new MeshBuilder();
            flame.AddCylinder(new Vector3(0f, bowlHeight + 0.10f, 0f), 0.62f, 0.18f, 1.05f, 6, 1f, true);
            AddPiece("Flame", flame.ToMesh("Dawnkeep_Beacon_Flame", true), flameColor, true);
        }

        /// <summary>قرص أفقي بسيط — للنقاط ولدائرة الأرض.</summary>
        private static Mesh FlatQuad(string name, float span)
        {
            MeshBuilder builder = new MeshBuilder();
            int start = builder.VertexCount;
            Color white = new Color(1f, 1f, 1f, 1f);
            builder.AddVertex(new Vector3(-span, 0f, -span), Vector3.up, new Vector2(0f, 0f), white);
            builder.AddVertex(new Vector3(span, 0f, -span), Vector3.up, new Vector2(1f, 0f), white);
            builder.AddVertex(new Vector3(span, 0f, span), Vector3.up, new Vector2(1f, 1f), white);
            builder.AddVertex(new Vector3(-span, 0f, span), Vector3.up, new Vector2(0f, 1f), white);
            builder.AddQuad(start, start + 1, start + 2, start + 3);
            return builder.ToMesh(name, false);
        }

        private void AddPiece(string name, Mesh mesh, Color color, bool unlit)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(_transform, false);
            go.AddComponent<MeshFilter>().sharedMesh = mesh;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            Shader shader = Shader.Find(unlit
                ? "Universal Render Pipeline/Unlit"
                : "Universal Render Pipeline/Lit");

            Material material = new Material(shader);
            material.name = "Dawnkeep_Beacon_" + name;
            material.SetColor(TintId, color);
            renderer.sharedMaterial = material;

            if (unlit)
            {
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;
            }
        }

        /// <summary>
        /// دائرة الأمان: قرص أفقي فوق الأرض بقليل. حجمه ثابت والمُظلِّل يقصّه
        /// عند نصف القطر — فتوسّع الدائرة لا يمطّ حافّتها.
        /// </summary>
        private void BuildRing()
        {
            const float Span = 120f;      // أوسع من أيّ نصف قطر ممكن

            GameObject go = new GameObject("Ring");
            go.transform.SetParent(_transform, false);
            go.transform.localPosition = new Vector3(0f, 0.12f, 0f);
            go.AddComponent<MeshFilter>().sharedMesh = FlatQuad("Dawnkeep_Beacon_Ring", Span);

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;

            Shader shader = Shader.Find("Dawnkeep/LightRing");
            if (shader == null)
            {
                shader = Shader.Find("Universal Render Pipeline/Unlit");
                Debug.LogWarning("مملكة الرماد: لم يُعثر على مُظلِّل Dawnkeep/LightRing — "
                    + "الدائرة سترسم مربّعاً. تأكّد من وجود Shaders/DawnkeepLightRing.shader.");
            }

            _ringMaterial = new Material(shader);
            _ringMaterial.name = "Dawnkeep_LightRing";
            _ringMaterial.SetColor(TintId, flameColor);
            _ringMaterial.SetFloat(SoftnessId, settings != null ? settings.EdgeSoftness : 0.16f);
            _ringMaterial.SetFloat(SharpId, 0f);
            renderer.sharedMaterial = _ringMaterial;

            _ring = go.transform;
        }

        /// <summary>
        /// نقاط الشحنات فوق المِجمَرة: يقرأ اللاعب عددها بلمحة دون واجهة.
        /// ثلاث دائماً — المطفأة باهتة، فيرى الفارغ كما يرى الممتلئ.
        /// </summary>
        private void BuildPips()
        {
            int max = settings != null ? settings.MaxChargesPerBeacon : 3;
            _pips = new Transform[max];
            _pipRenderers = new Renderer[max];

            Mesh mesh = FlatQuad("Dawnkeep_Beacon_Pip", 0.20f);
            Material material = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            material.name = "Dawnkeep_Beacon_Pip";

            for (int i = 0; i < max; i++)
            {
                GameObject go = new GameObject("Pip_" + i);
                go.transform.SetParent(_transform, false);

                float offset = (i - ((max - 1) * 0.5f)) * 0.54f;
                go.transform.localPosition = new Vector3(offset, bowlHeight + 1.95f, 0f);
                go.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

                go.AddComponent<MeshFilter>().sharedMesh = mesh;
                MeshRenderer renderer = go.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = material;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;

                _pips[i] = go.transform;
                _pipRenderers[i] = renderer;
            }
        }

        /// <summary>
        /// النقاط لا تُكتب إلّا حين يتغيّر ما تحكيه: كتابة كتلة خصائص لكل نقطة
        /// في كل إطار عملٌ لا يراه أحد. والمُصيِّرات مخزَّنة من البناء — قاعدة 5
        /// تمنع `GetComponent` داخل حلقة الإطار.
        /// </summary>
        private void UpdatePips(bool lit)
        {
            if (_pipRenderers == null || (charges == _shownCharges && lit == _shownLit))
            {
                return;
            }

            _shownCharges = charges;
            _shownLit = lit;

            for (int i = 0; i < _pipRenderers.Length; i++)
            {
                bool on = i < charges && lit;
                _pipRenderers[i].GetPropertyBlock(_pipBlock);
                _pipBlock.SetColor(TintId, on ? flameColor : Dim);
                _pipRenderers[i].SetPropertyBlock(_pipBlock);
            }
        }

        private void BuildLamp()
        {
            GameObject go = new GameObject("Lamp");
            go.transform.SetParent(_transform, false);
            go.transform.localPosition = new Vector3(0f, bowlHeight + 0.6f, 0f);

            _lamp = go.AddComponent<UnityEngine.Light>();
            _lamp.type = LightType.Point;
            _lamp.color = flameColor;
            _lamp.shadows = LightShadows.None;      // ظلال نقطية لكل منارة تكلفة لا تُحتمل على الجوّال
            _lamp.range = Mathf.Max(1f, Radius);
        }
    }
}
