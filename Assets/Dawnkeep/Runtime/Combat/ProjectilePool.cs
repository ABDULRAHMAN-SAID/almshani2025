using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// سهام مجمّعة. **ممنوع `Instantiate` في مسار اللعب** (§1): إنشاء سهم لكل
    /// طلقة يولّد قمامة تُوقف الإطار عند تجميعها. تُنشأ كلّها مرّة ثم تُعاد.
    ///
    /// السهم يتتبّع هدفه تتبّعاً ليّناً: التتبّع الكامل يجعل التفادي مستحيلاً،
    /// والاستقامة التامّة تُطيّر السهام فوق رؤوس المتحرّكين.
    /// </summary>
    [DisallowMultipleComponent]
    public class ProjectilePool : MonoBehaviour
    {
        [SerializeField] private int capacity = 96;
        [SerializeField] private float shaftLength = 0.9f;
        [SerializeField] private float shaftRadius = 0.022f;
        [SerializeField] private Color shaftColor = new Color(0.42f, 0.30f, 0.19f);

        [Tooltip("قوّة التتبّع: صفر استقامة تامّة، وواحد التصاق كامل بالهدف.")]
        [Range(0f, 1f)]
        [SerializeField] private float homing = 0.55f;

        [Tooltip("أقصى عمر للسهم بالثواني قبل إعادته إلى المجمّع.")]
        [SerializeField] private float maxLife = 3.5f;

        private Transform[] _shafts;
        private Vector3[] _velocity;
        private Unit[] _target;
        private float[] _damage;
        private float[] _life;
        private bool[] _active;
        private int _next;

        private void Awake()
        {
            _shafts = new Transform[capacity];
            _velocity = new Vector3[capacity];
            _target = new Unit[capacity];
            _damage = new float[capacity];
            _life = new float[capacity];
            _active = new bool[capacity];

            Mesh mesh = BuildArrowMesh();
            Material material = BuildArrowMaterial();

            for (int i = 0; i < capacity; i++)
            {
                GameObject go = new GameObject("Arrow_" + i);
                go.transform.SetParent(transform, false);

                MeshFilter filter = go.AddComponent<MeshFilter>();
                filter.sharedMesh = mesh;

                MeshRenderer renderer = go.AddComponent<MeshRenderer>();
                renderer.sharedMaterial = material;
                renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                renderer.receiveShadows = false;

                go.SetActive(false);
                _shafts[i] = go.transform;
            }
        }

        /// <summary>يطلق سهماً نحو وحدة. إن نفد المجمّع يُعاد استعمال أقدم سهم.</summary>
        public void Fire(Vector3 from, Unit target, float damage, float speed)
        {
            if (_shafts == null || target == null)
            {
                return;
            }

            int slot = -1;
            for (int k = 0; k < capacity; k++)
            {
                int i = (_next + k) % capacity;
                if (!_active[i])
                {
                    slot = i;
                    break;
                }
            }

            if (slot < 0)
            {
                slot = _next;           // المجمّع ممتلئ: أقدم سهم يُعاد استعماله
            }

            _next = (slot + 1) % capacity;

            Vector3 aim = target.Body.position + (Vector3.up * 1.1f) - from;
            float distance = aim.magnitude;
            Vector3 direction = distance > 0.001f ? aim / distance : Vector3.forward;

            _shafts[slot].SetPositionAndRotation(from, Quaternion.LookRotation(direction, Vector3.up));
            _shafts[slot].gameObject.SetActive(true);
            _velocity[slot] = direction * speed;
            _target[slot] = target;
            _damage[slot] = damage;
            _life[slot] = 0f;
            _active[slot] = true;
        }

        private void Update()
        {
            if (_shafts == null)
            {
                return;
            }

            float dt = Time.deltaTime;

            for (int i = 0; i < capacity; i++)
            {
                if (!_active[i])
                {
                    continue;
                }

                _life[i] += dt;
                Unit target = _target[i];

                if (_life[i] > maxLife || target == null || !target.Alive)
                {
                    Retire(i);
                    continue;
                }

                Vector3 position = _shafts[i].position;
                Vector3 aim = target.Body.position + (Vector3.up * 1.1f) - position;
                float distance = aim.magnitude;

                if (distance < 0.6f)
                {
                    target.TakeDamage(_damage[i]);
                    Retire(i);
                    continue;
                }

                Vector3 wanted = (aim / distance) * _velocity[i].magnitude;
                _velocity[i] = Vector3.Lerp(_velocity[i], wanted, homing * dt * 6f);

                position += _velocity[i] * dt;
                _shafts[i].SetPositionAndRotation(position,
                    Quaternion.LookRotation(_velocity[i].normalized, Vector3.up));
            }
        }

        private void Retire(int index)
        {
            _active[index] = false;
            _target[index] = null;
            _shafts[index].gameObject.SetActive(false);
        }

        /// <summary>سهم بسيط: عود ورأس. يُبنى مرّة ويُشارَك بين كل السهام.</summary>
        private Mesh BuildArrowMesh()
        {
            Dawnkeep.Rendering.MeshBuilder mb = new Dawnkeep.Rendering.MeshBuilder();
            mb.SetTint(shaftColor.r, shaftColor.g, shaftColor.b);
            mb.AddTube(Vector3.zero, new Vector3(0f, 0f, shaftLength), shaftRadius, shaftRadius, 4, 1f, 0f, 0f, 0f);
            mb.SetTint(0.62f, 0.64f, 0.67f);
            mb.AddTube(new Vector3(0f, 0f, shaftLength),
                new Vector3(0f, 0f, shaftLength + 0.10f), shaftRadius * 2.1f, 0.002f, 4, 1f, 0f, 0f, 0f);
            return mb.ToMesh("Dawnkeep_Arrow", true);
        }

        private Material BuildArrowMaterial()
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            Material material = new Material(shader);
            material.name = "Dawnkeep_Arrow";
            material.SetColor("_BaseColor", Color.white);
            material.enableInstancing = true;
            return material;
        }
    }
}
