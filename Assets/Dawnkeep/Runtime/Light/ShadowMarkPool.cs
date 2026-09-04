using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Light
{
    /// <summary>
    /// علامة الظلام: حلقة تحت قدمَي كل عدوّ ما يزال درع ظلامه يحميه.
    ///
    /// §11 تشترط أن يُقرأ النظام بلا لون وحده. فالعلامة تحمل ثلاث إشارات:
    /// **وجودها** (تختفي تماماً داخل النور)، و**قُطرها** (يتقلّص كلّما قضم
    /// النور من الدرع)، ولونها البنفسجي ثالثاً لا أوّلاً. اللاعب المصاب بعمى
    /// الألوان يقرأ الأوّلَين كما يقرؤهما غيره.
    ///
    /// مجمّعة كأشرطة الصحّة: حلقة لكل عدوّ تُنشأ في مسار اللعب قمامةٌ مستمرّة.
    /// </summary>
    [DisallowMultipleComponent]
    public class ShadowMarkPool : MonoBehaviour
    {
        [SerializeField] private int capacity = 96;

        [Tooltip("قطر الحلقة بالمتر عند اكتمال درع الظلام.")]
        [SerializeField] private float fullRadius = 1.75f;

        [Tooltip("أصغر قطر تصله الحلقة قبل أن تختفي.")]
        [SerializeField] private float minRadius = 0.85f;

        [Tooltip("أبعد مسافة من الكاميرا تظهر عندها العلامة.")]
        [SerializeField] private float maxDistance = 95f;

        [SerializeField] private Color shadowColor = new Color(0.545f, 0.373f, 0.780f);

        private Transform[] _marks;
        private Renderer[] _renderers;
        private MaterialPropertyBlock _block;
        private CombatDirector _combat;
        private Camera _camera;

        private static readonly int RadiusId = Shader.PropertyToID("_Radius");
        private static readonly int TintId = Shader.PropertyToID("_BaseColor");

        private void Awake()
        {
            _block = new MaterialPropertyBlock();
            _marks = new Transform[capacity];
            _renderers = new Renderer[capacity];

            Mesh mesh = BuildQuad(fullRadius * 1.4f);
            Material material = BuildMaterial();

            for (int i = 0; i < capacity; i++)
            {
                GameObject go = new GameObject("ShadowMark_" + i);
                go.transform.SetParent(transform, false);
                go.AddComponent<MeshFilter>().sharedMesh = mesh;

                MeshRenderer renderer = go.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = material;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;

                _marks[i] = go.transform;
                _renderers[i] = renderer;
                go.SetActive(false);
            }
        }

        private void Start()
        {
            _combat = CombatDirector.Instance;
            _camera = Camera.main;
        }

        private void LateUpdate()
        {
            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            if (_camera == null)
            {
                _camera = Camera.main;
            }

            if (_combat == null || _camera == null)
            {
                return;
            }

            Vector3 eye = _camera.transform.position;
            float maxSqr = maxDistance * maxDistance;
            int used = 0;

            System.Collections.Generic.IReadOnlyList<Unit> units = _combat.Units;
            for (int i = 0; i < units.Count && used < capacity; i++)
            {
                Unit unit = units[i];
                if (unit == null || !unit.Alive || unit.Definition == null)
                {
                    continue;
                }

                float dark = unit.Definition.DarkArmour;
                if (dark <= 0f)
                {
                    continue;      // من لا درع ظلام له لا علامة عليه
                }

                float remaining = dark * (1f - Mathf.Clamp01(unit.LightLevel));
                if (remaining <= 0.005f)
                {
                    continue;      // ذاب الدرع في النور: تختفي العلامة تماماً
                }

                Vector3 foot = unit.Body.position;
                if ((foot - eye).sqrMagnitude > maxSqr)
                {
                    continue;
                }

                Transform mark = _marks[used];
                if (!mark.gameObject.activeSelf)
                {
                    mark.gameObject.SetActive(true);
                }

                mark.position = foot + new Vector3(0f, 0.14f, 0f);

                // القطر يحكي مقدار الحماية الباقية — إشارة شكل لا لون
                float t = Mathf.Clamp01(remaining / Mathf.Max(0.0001f, dark));
                float radius = Mathf.Lerp(minRadius, fullRadius, t);

                _renderers[used].GetPropertyBlock(_block);
                _block.SetFloat(RadiusId, radius);
                _block.SetColor(TintId, shadowColor);
                _renderers[used].SetPropertyBlock(_block);

                used++;
            }

            for (int i = used; i < capacity; i++)
            {
                if (_marks[i].gameObject.activeSelf)
                {
                    _marks[i].gameObject.SetActive(false);
                }
            }
        }

        private static Mesh BuildQuad(float span)
        {
            Mesh mesh = new Mesh();
            mesh.name = "Dawnkeep_ShadowMark";
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
            material.name = "Dawnkeep_ShadowMark";

            // حلقة رفيعة بلا ملء: الملء تحت الأقدام يخفي الجندي نفسه
            material.SetFloat(Shader.PropertyToID("_Fill"), 0f);
            material.SetFloat(Shader.PropertyToID("_Rim"), 1.15f);
            material.SetFloat(Shader.PropertyToID("_Softness"), 0.34f);
            material.SetFloat(Shader.PropertyToID("_Sharp"), 1f);
            return material;
        }
    }
}
