using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// أثر المقذوف عند الإصابة (§10): اختراق درع، وانفجار، وإبطاء، وسلسلة.
    ///
    /// بنيةٌ لا صنف: تُمرَّر بالقيمة وتُخزَّن في مصفوفة، فلا تخصيص لكل طلقة.
    /// و`None` هو سهم الرامي العادي — بلا أثر زائد.
    /// </summary>
    public struct ProjectileEffect
    {
        /// <summary>ما يتجاوزه من الدرع، من صفر إلى واحد.</summary>
        public float ArmourPierce;

        /// <summary>نصف قطر الانفجار بالمتر. صفر يعني إصابة مفردة.</summary>
        public float BlastRadius;

        /// <summary>معامل سرعة المصاب (0.68 يعني بطء 32%). واحد يعني بلا إبطاء.</summary>
        public float SlowFactor;

        /// <summary>مدّة الإبطاء بالثواني.</summary>
        public float SlowSeconds;

        /// <summary>كم هدفاً إضافيّاً تقفز إليه السلسلة.</summary>
        public int ChainTargets;

        /// <summary>ما يبقى من الضرر عند كل قفزة (0.8 يعني تناقص 20%).</summary>
        public float ChainFalloff;

        /// <summary>أثرٌ خالٍ — سهم عادي.</summary>
        public static ProjectileEffect None
        {
            get
            {
                ProjectileEffect e = default(ProjectileEffect);
                e.SlowFactor = 1f;
                e.ChainFalloff = 1f;
                return e;
            }
        }
    }

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
        private ProjectileEffect[] _effect;
        private int _next;

        // مخزن الجيران يملكه المجمّع وحده — انظر `CombatDirector.QueryFaction`
        private Unit[] _splash;
        private CombatDirector _combat;

        private void Awake()
        {
            _shafts = new Transform[capacity];
            _velocity = new Vector3[capacity];
            _target = new Unit[capacity];
            _damage = new float[capacity];
            _life = new float[capacity];
            _active = new bool[capacity];
            _effect = new ProjectileEffect[capacity];
            _splash = new Unit[32];

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

        /// <summary>يطلق سهماً عاديّاً بلا أثر زائد.</summary>
        public void Fire(Vector3 from, Unit target, float damage, float speed)
        {
            Fire(from, target, damage, speed, ProjectileEffect.None);
        }

        /// <summary>يطلق مقذوفاً بأثره. إن نفد المجمّع يُعاد استعمال أقدم سهم.</summary>
        public void Fire(Vector3 from, Unit target, float damage, float speed, ProjectileEffect effect)
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
            _effect[slot] = effect;
            _life[slot] = 0f;
            _active[slot] = true;
        }

        /// <summary>
        /// وقوع الأثر: المصاب أوّلاً، ثمّ الانفجار، ثمّ السلسلة.
        ///
        /// الانفجار **لا يضرب المصاب مرّتين**: هو داخل نصف قطره حتماً، وضربه
        /// بالضررين يضاعف ما تقوله البطاقة.
        /// </summary>
        private void Land(int index, Unit target)
        {
            ProjectileEffect effect = _effect[index];
            float damage = _damage[index];

            target.TakeDamage(damage, effect.ArmourPierce);

            if (effect.SlowSeconds > 0f)
            {
                target.ApplySlow(effect.SlowFactor, effect.SlowSeconds);
            }

            if (effect.BlastRadius <= 0f && effect.ChainTargets <= 0)
            {
                return;
            }

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
                if (_combat == null)
                {
                    return;
                }
            }

            Vector3 centre = target.Body.position;

            if (effect.BlastRadius > 0f)
            {
                int found = _combat.QueryFaction(centre, effect.BlastRadius, target.Faction, _splash);
                for (int i = 0; i < found; i++)
                {
                    if (_splash[i] == target)
                    {
                        continue;
                    }

                    _splash[i].TakeDamage(damage, effect.ArmourPierce);
                    if (effect.SlowSeconds > 0f)
                    {
                        _splash[i].ApplySlow(effect.SlowFactor, effect.SlowSeconds);
                    }
                }
            }

            if (effect.ChainTargets > 0)
            {
                // السلسلة تقفز إلى أقرب من لم تُصبه، بتناقص عند كل قفزة
                int found = _combat.QueryFaction(centre, ChainReach, target.Faction, _splash);
                float carried = damage;
                int jumped = 0;

                for (int i = 0; i < found && jumped < effect.ChainTargets; i++)
                {
                    if (_splash[i] == target)
                    {
                        continue;
                    }

                    carried *= effect.ChainFalloff;
                    _splash[i].TakeDamage(carried, effect.ArmourPierce);
                    jumped++;
                }
            }
        }

        /// <summary>أبعد ما تقفز إليه السلسلة بالمتر.</summary>
        private const float ChainReach = 9f;

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
                    Land(i, target);
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
