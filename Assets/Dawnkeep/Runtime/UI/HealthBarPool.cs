using UnityEngine;
using Dawnkeep.Combat;

namespace Dawnkeep.UI
{
    /// <summary>
    /// أشرطة صحّة فوق الرؤوس، مرسومة كأشكال في العالم لا كعناصر واجهة.
    ///
    /// لماذا لا Canvas لكل وحدة: كل عنصر واجهة عالمي يعني إعادة بناء تخطيط
    /// وأمر رسم منفصلاً؛ مئة وحدة تعني مئة منهما في كل إطار. هنا شبكتان
    /// مجمّعتان (خلفية وحشو) تُحرَّكان وتُقاسان فقط — بلا تخصيص ولا تخطيط.
    ///
    /// الشريط يظهر عند الجرح وحده: شريط فوق كل جندي سليم ضجيج بصري يخفي
    /// المعركة بدل أن يوضّحها.
    /// </summary>
    [DisallowMultipleComponent]
    public class HealthBarPool : MonoBehaviour
    {
        [SerializeField] private int capacity = 128;
        [SerializeField] private float width = 1.30f;
        [SerializeField] private float height = 0.16f;

        // الجندي المبني نحو 3.1 متراً في العالم (طوله المحلّي ~1.02 مضروباً في
        // مقياس الجاهزة 3.05)، فالشريط فوق قمّة الخوذة بقليل لا عند صدره.
        [SerializeField] private float heightAboveHead = 3.45f;

        [Tooltip("لا يظهر الشريط إلا إذا نقصت الصحّة عن هذه النسبة.")]
        [Range(0.5f, 1f)]
        [SerializeField] private float showBelow = 0.995f;

        [Tooltip("أبعد مسافة من الكاميرا يظهر عندها الشريط.")]
        [SerializeField] private float maxDistance = 95f;

        [SerializeField] private Color kingdomColor = new Color(0.353f, 0.780f, 0.404f);
        [SerializeField] private Color hordeColor = new Color(0.851f, 0.294f, 0.267f);
        [SerializeField] private Color backColor = new Color(0.078f, 0.086f, 0.094f);

        private Transform[] _back;
        private Transform[] _fill;
        private MeshRenderer[] _fillRenderer;
        private MaterialPropertyBlock _block;
        private Camera _camera;
        private CombatDirector _director;

        private void Awake()
        {
            _block = new MaterialPropertyBlock();
            _back = new Transform[capacity];
            _fill = new Transform[capacity];
            _fillRenderer = new MeshRenderer[capacity];

            Mesh quad = BuildQuad();
            Material material = BuildMaterial();

            for (int i = 0; i < capacity; i++)
            {
                _back[i] = MakePiece("Back_" + i, quad, material, backColor, null).transform;
                GameObject fill = MakePiece("Fill_" + i, quad, material, kingdomColor, _back[i]);
                _fill[i] = fill.transform;
                _fillRenderer[i] = fill.GetComponent<MeshRenderer>();
                _back[i].gameObject.SetActive(false);
            }
        }

        private void Start()
        {
            _camera = Camera.main;
            _director = CombatDirector.Instance;
        }

        private void LateUpdate()
        {
            if (_director == null)
            {
                _director = CombatDirector.Instance;
            }

            if (_camera == null)
            {
                _camera = Camera.main;
            }

            if (_director == null || _camera == null)
            {
                return;
            }

            Vector3 eye = _camera.transform.position;
            Quaternion facing = _camera.transform.rotation;
            float maxSqr = maxDistance * maxDistance;
            int used = 0;

            System.Collections.Generic.IReadOnlyList<Unit> units = _director.Units;
            for (int i = 0; i < units.Count && used < capacity; i++)
            {
                Unit unit = units[i];
                if (unit == null || !unit.Alive || unit.Definition == null)
                {
                    continue;
                }

                float ratio = unit.Health / Mathf.Max(1f, unit.MaxHealth);
                if (ratio >= showBelow)
                {
                    continue;
                }

                Vector3 head = unit.Body.position + (Vector3.up * heightAboveHead);
                if ((head - eye).sqrMagnitude > maxSqr)
                {
                    continue;
                }

                Transform back = _back[used];
                back.gameObject.SetActive(true);
                back.SetPositionAndRotation(head, facing);
                back.localScale = new Vector3(width, height, 1f);

                // الحشو يُقاس من يساره لا من مركزه: القياس من المركز يقلّصه من
                // الطرفين فيبدو كأنّه ينكمش لا كأنّه ينفد.
                float clamped = Mathf.Clamp01(ratio);
                _fill[used].localScale = new Vector3(clamped, 0.72f, 1f);
                _fill[used].localPosition = new Vector3((clamped - 1f) * 0.5f, 0f, -0.01f);

                Color tint = unit.Faction == Faction.Horde ? hordeColor : kingdomColor;
                _fillRenderer[used].GetPropertyBlock(_block);
                _block.SetColor("_BaseColor", tint);
                _fillRenderer[used].SetPropertyBlock(_block);

                used++;
            }

            for (int i = used; i < capacity; i++)
            {
                if (_back[i].gameObject.activeSelf)
                {
                    _back[i].gameObject.SetActive(false);
                }
            }
        }

        private GameObject MakePiece(string name, Mesh mesh, Material material, Color color, Transform parent)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent != null ? parent : transform, false);

            MeshFilter filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;

            MaterialPropertyBlock block = new MaterialPropertyBlock();
            renderer.GetPropertyBlock(block);
            block.SetColor("_BaseColor", color);
            renderer.SetPropertyBlock(block);
            return go;
        }

        private static Mesh BuildQuad()
        {
            Mesh mesh = new Mesh();
            mesh.name = "Dawnkeep_BarQuad";
            mesh.vertices = new[]
            {
                new Vector3(-0.5f, -0.5f, 0f), new Vector3(0.5f, -0.5f, 0f),
                new Vector3(0.5f, 0.5f, 0f), new Vector3(-0.5f, 0.5f, 0f),
            };
            mesh.uv = new[] { Vector2.zero, Vector2.right, Vector2.one, Vector2.up };
            mesh.triangles = new[] { 0, 2, 1, 0, 3, 2 };
            mesh.RecalculateNormals();
            return mesh;
        }

        private static Material BuildMaterial()
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Unlit");
            if (shader == null)
            {
                shader = Shader.Find("Unlit/Color");
            }

            Material material = new Material(shader);
            material.name = "Dawnkeep_HealthBar";
            material.enableInstancing = true;
            return material;
        }
    }
}
