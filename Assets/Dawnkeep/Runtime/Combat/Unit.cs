using Dawnkeep.Characters;
using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// وحدة مقاتلة: بيانات وحالة فقط.
    ///
    /// **لا `Update` هنا عمداً.** مئة وحدة تعني مئة استدعاء `Update` من المحرّك،
    /// وكلٌّ منها قفزة إلى كود مُدار. `CombatDirector` يمرّ عليها كلّها في حلقة
    /// واحدة، وهذا أسرع بمراتب على الجوّال. والمراجع تُخزَّن عند التهيئة لا في
    /// كل إطار.
    /// </summary>
    [DisallowMultipleComponent]
    public class Unit : MonoBehaviour
    {
        [SerializeField] private UnitDefinition definition;

        private Transform _transform;
        private CharacterAnimator _animator;

        private float _health;
        private float _nextThink;
        private float _nextAttack;
        private Unit _target;
        private Dawnkeep.Light.Beacon _beaconTarget;
        private Vector3 _home;
        private bool _hasHome;
        private float _light;

        private Vector3[] _path;
        private int _pathIndex;

        // كتلة خصائص واحدة مشتركة: إنشاؤها عند كل خروج من المجمّع يولّد قمامة
        private static MaterialPropertyBlock _liveryBlock;

        /// <summary>الوحدة حيّة وقابلة للاستهداف.</summary>
        public bool Alive { get; private set; }

        /// <summary>ماتت وتُشغّل سقوطها؛ تُعاد إلى المجمّع بعده.</summary>
        public float DeadFor { get; set; }

        public UnitDefinition Definition { get { return definition; } }

        public Faction Faction { get { return definition != null ? definition.Faction : Faction.Neutral; } }

        public CharacterAnimator Animator { get { return _animator; } }

        public Transform Body { get { return _transform; } }

        public float Health { get { return _health; } }

        public float NextThink { get { return _nextThink; } set { _nextThink = value; } }

        public float NextAttack { get { return _nextAttack; } set { _nextAttack = value; } }

        /// <summary>
        /// الهدف **بالمرجع لا بالفهرس**: قائمة الوحدات تتقلّص عند إزالة القتلى،
        /// فأي فهرس مخزَّن يصير مشيراً إلى وحدة أخرى في الإطار التالي.
        /// </summary>
        public Unit Target { get { return _target; } set { _target = value; } }

        /// <summary>
        /// المنارة التي تقصدها هذه الوحدة (آكل القناديل وحده). منفصلة عن
        /// `Target` لأنّها ليست وحدة: لا تُقتل ولا تُحسب في الأحياء، وخلطهما
        /// في حقل واحد يعني فحص نوع في كل إطار.
        /// </summary>
        public Dawnkeep.Light.Beacon BeaconTarget
        {
            get { return _beaconTarget; }
            set { _beaconTarget = value; }
        }

        /// <summary>
        /// شدّة النور على الوحدة الآن، من صفر إلى واحد. يحدّثها `CombatDirector`
        /// في مروره، فلا تسأل الوحدةُ حقلَ النور بنفسها ولا تكرّر الاستعلام.
        ///
        /// اسمها `LightLevel` لا `Light`: عضوٌ باسم `Light` في صنف يستورد
        /// `UnityEngine` يحجب نوع الضوء نفسه على كل من يقرأ الملفّ.
        /// </summary>
        public float LightLevel { get { return _light; } set { _light = value; } }

        /// <summary>موضع المرابطة: تعود إليه الحامية إذا لم يبقَ لها هدف.</summary>
        public Vector3 Home { get { return _home; } }

        public bool HasHome { get { return _hasHome; } }

        private void Awake()
        {
            _transform = transform;
            _animator = GetComponentInChildren<CharacterAnimator>();
        }

        /// <summary>
        /// تهيئة وحدة **موضوعة في المشهد** (حامية القلعة) بتعريفها المضبوط في
        /// المفتش. لا تنقلها ولا تغيّر اتّجاهها: موضعها جزء من تصميم المشهد.
        /// </summary>
        public void Awaken()
        {
            if (_transform == null)
            {
                Awake();
            }

            _health = definition != null ? definition.MaxHealth : 1f;
            Alive = true;
            DeadFor = 0f;
            _target = null;
            _beaconTarget = null;
            _light = 0f;
            _nextThink = 0f;
            _nextAttack = 0f;
            _pathIndex = 0;
            _home = _transform.position;
            _hasHome = true;      // الحامية ترابط: تعود إلى موقعها بعد الاشتباك
        }

        /// <summary>يضبط تعريف الوحدة من محرّر المشهد.</summary>
        public void SetDefinition(UnitDefinition value)
        {
            definition = value;
        }

        /// <summary>تهيئة عند الخروج من المجمّع. تُستدعى مرّة لا في كل إطار.</summary>
        public void Spawn(UnitDefinition def, Vector3 position, float headingDegrees, Vector3[] path)
        {
            definition = def;
            if (_transform == null)
            {
                Awake();
            }

            _transform.SetPositionAndRotation(position, Quaternion.Euler(0f, headingDegrees, 0f));
            _health = def != null ? def.MaxHealth : 1f;
            Alive = true;
            DeadFor = 0f;
            _target = null;
            _beaconTarget = null;
            _light = 0f;
            _nextThink = 0f;
            _nextAttack = 0f;
            _path = path;
            _pathIndex = 0;
            _hasHome = false;      // المهاجم لا يرابط: يمضي على مساره

            if (_animator != null)
            {
                _animator.Revive();
                _animator.Walk = 0f;
            }

            gameObject.SetActive(true);
            ApplyLivery(def != null ? def.Livery : Color.white);
        }

        /// <summary>الضرر بعد الدرع. يعيد true إن قتلت هذه الضربة الوحدة.</summary>
        public bool TakeDamage(float amount)
        {
            if (!Alive)
            {
                return false;
            }

            // درع الظلام يذوب في النور (§11): هو ما يجعل جرّ العدوّ إلى دائرة
            // منارة قراراً تكتيكياً. والمجموع مقصوص عند 0.9 فلا شيء يصير منيعاً.
            float armour = definition != null ? definition.Armour : 0f;
            if (definition != null && definition.DarkArmour > 0f)
            {
                armour += definition.DarkArmour * (1f - Mathf.Clamp01(_light));
            }

            _health -= amount * (1f - Mathf.Clamp(armour, 0f, 0.9f));

            if (_health > 0f)
            {
                if (_animator != null)
                {
                    _animator.Flinch();
                }

                return false;
            }

            _health = 0f;
            Alive = false;
            DeadFor = 0f;
            if (_animator != null)
            {
                _animator.Die();
            }

            return true;
        }

        /// <summary>الوجهة التالية على المسار، أو الموضع نفسه إن انتهى المسار.</summary>
        public Vector3 PathPoint(Vector3 fallback)
        {
            if (_path == null || _pathIndex >= _path.Length)
            {
                return fallback;
            }

            return _path[_pathIndex];
        }

        public void AdvancePath()
        {
            if (_path != null && _pathIndex < _path.Length)
            {
                _pathIndex++;
            }
        }

        public bool HasPath
        {
            get { return _path != null && _pathIndex < _path.Length; }
        }

        public void Despawn()
        {
            Alive = false;
            gameObject.SetActive(false);
        }

        /// <summary>
        /// لون الراية على مُصيِّر القماش وحده. الكتابة على الجذر تصبغ الجلد
        /// والفولاذ معه فيصير الجندي كتلة ملوّنة بلا ملامح.
        /// </summary>
        private void ApplyLivery(Color livery)
        {
            Transform cloth = _transform.Find("Cloth");
            if (cloth == null)
            {
                return;
            }

            MeshRenderer renderer = cloth.GetComponent<MeshRenderer>();
            if (renderer == null)
            {
                return;
            }

            if (_liveryBlock == null)
            {
                _liveryBlock = new MaterialPropertyBlock();
            }

            renderer.GetPropertyBlock(_liveryBlock);
            _liveryBlock.SetColor("_BaseColor", livery);
            renderer.SetPropertyBlock(_liveryBlock);
        }
    }
}
