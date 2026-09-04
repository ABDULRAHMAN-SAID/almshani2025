using UnityEngine;

namespace Dawnkeep.Characters
{
    /// <summary>
    /// يقود تحريك الشخصية في المُظلِّل.
    ///
    /// لا هيكل عظمي ولا `Animator`: الوضعية تُحسب تحليلياً في مُظلِّل الرؤوس من
    /// الزمن، وهذا المكوّن لا يفعل شيئاً في كل إطار سوى تمرير **وزن المشي**
    /// حين يتغيّر فعلاً. مئة جندي هنا تكلّف المعالج ما يكلّفه جندي واحد.
    ///
    /// الطور يُشتقّ من موضع الشخصية لا يُخزَّن: بهذا يختلف كل جندي عن جاره بلا
    /// بيانات إضافية، ولا يمشي الجيش كلّه بخطوة واحدة.
    /// </summary>
    [DisallowMultipleComponent]
    public class CharacterAnimator : MonoBehaviour
    {
        private static readonly int PhaseId = Shader.PropertyToID("_AnimPhase");
        private static readonly int WalkId = Shader.PropertyToID("_AnimWalk");
        private static readonly int ActionId = Shader.PropertyToID("_AnimAction");
        private static readonly int ActionTimeId = Shader.PropertyToID("_AnimActionTime");

        /// <summary>الحركات المنفصلة. أرقامها هي ما يقرؤه المُظلِّل.</summary>
        public enum Action
        {
            None = 0,
            Attack = 1,
            Shoot = 2,
            Flinch = 3,
            Death = 4,
        }

        [Tooltip("وزن المشي: صفر وقوف، واحد مشي كامل. يُضبط من منطق الوحدة.")]
        [Range(0f, 1f)]
        [SerializeField] private float walk;

        [Tooltip("زمن الانتقال بين الوقوف والمشي بالثواني. الانتقال المفاجئ يُقرأ خللاً.")]
        [SerializeField] private float blendTime = 0.18f;

        [Tooltip("طور ثابت يُضاف إلى الطور المشتقّ من الموضع.")]
        [SerializeField] private float phaseOffset;

        [Header("مدد الحركات بالثواني")]
        [SerializeField] private float attackDuration = 0.72f;
        [SerializeField] private float shootDuration = 1.05f;
        [SerializeField] private float flinchDuration = 0.42f;
        [SerializeField] private float deathDuration = 1.15f;

        private MeshRenderer[] _renderers;
        private MaterialPropertyBlock _block;
        private float _current = -1f;
        private float _velocity;

        private Action _action = Action.None;
        private float _actionElapsed;
        private float _actionDuration;

        /// <summary>الحركة الجارية الآن. None يعني وقوفاً أو مشياً فقط.</summary>
        public Action Current
        {
            get { return _action; }
        }

        /// <summary>هل انتهت الشخصية؟ القتيل لا يقوم ولا يقبل حركة جديدة.</summary>
        public bool IsDead
        {
            get { return _action == Action.Death; }
        }

        /// <summary>لحظة وقوع الضربة داخل حركة الهجوم — عندها يُطبَّق الضرر.</summary>
        public bool AttackLandedThisFrame { get; private set; }

        /// <summary>لحظة انطلاق السهم داخل حركة الرمي — عندها يُطلَق المقذوف.</summary>
        public bool ShotReleasedThisFrame { get; private set; }

        /// <summary>يعيد الوحدة إلى الوقوف. يُستدعى عند الخروج من المجمّع.</summary>
        public void Revive()
        {
            _action = Action.None;
            _actionElapsed = 0f;
            ApplyFloat(ActionId, 0f);
            ApplyFloat(ActionTimeId, 0f);
        }

        public void Attack()
        {
            Play(Action.Attack, attackDuration);
        }

        public void Shoot()
        {
            Play(Action.Shoot, shootDuration);
        }

        public void Flinch()
        {
            Play(Action.Flinch, flinchDuration);
        }

        public void Die()
        {
            Play(Action.Death, deathDuration);
        }

        /// <summary>
        /// يبدأ حركة. الموت لا يُلغى بشيء: القتيل لا يقوم ليضرب.
        /// وحركة جارية لا تُقطع إلا بالموت أو بالارتداد من ضربة.
        /// </summary>
        private void Play(Action action, float duration)
        {
            if (_action == Action.Death)
            {
                return;
            }

            if (_action != Action.None && action != Action.Death && action != Action.Flinch)
            {
                return;
            }

            _action = action;
            _actionDuration = Mathf.Max(0.05f, duration);
            _actionElapsed = 0f;
            ApplyFloat(ActionId, (float)(int)action);
            ApplyFloat(ActionTimeId, 0f);
        }

        /// <summary>وزن المشي المطلوب. يُنعَّم إلى القيمة الفعلية عبر blendTime.</summary>
        public float Walk
        {
            get { return walk; }
            set { walk = Mathf.Clamp01(value); }
        }

        private void Awake()
        {
            // المراجع تُخزَّن مرّة: ممنوع GetComponent داخل حلقة الإطار
            _renderers = GetComponentsInChildren<MeshRenderer>(true);
            _block = new MaterialPropertyBlock();

            // الطور من الموضع: يعطي لكل جندي خطوة مختلفة بلا بيانات لكل نسخة
            Vector3 p = transform.position;
            float hash = Mathf.Repeat((p.x * 0.7317f) + (p.z * 0.4391f) + phaseOffset, 1f);
            ApplyFloat(PhaseId, hash * 6.2831853f);

            _current = walk;
            ApplyFloat(WalkId, _current);
        }

        private void Update()
        {
            AttackLandedThisFrame = false;
            ShotReleasedThisFrame = false;

            if (_action != Action.None)
            {
                float before = _actionElapsed / _actionDuration;
                _actionElapsed += Time.deltaTime;
                float u = _actionElapsed / _actionDuration;

                // لحظة وقوع الضربة: منتصف الهويّ في المُظلِّل (u ≈ 0.44)
                if (_action == Action.Attack && before < 0.44f && u >= 0.44f)
                {
                    AttackLandedThisFrame = true;
                }

                // انطلاق السهم عند لحظة الإفلات في المُظلِّل (u ≈ 0.62)
                if (_action == Action.Shoot && before < 0.62f && u >= 0.62f)
                {
                    ShotReleasedThisFrame = true;
                }

                if (u >= 1f)
                {
                    u = 1f;
                    // الموت يثبت عند نهايته: لا يُصفَّر فيقوم القتيل واقفاً
                    if (_action != Action.Death)
                    {
                        _action = Action.None;
                        ApplyFloat(ActionId, 0f);
                    }
                }

                ApplyFloat(ActionTimeId, u);
            }

            if (Mathf.Abs(_current - walk) < 0.001f)
            {
                return;             // لا شيء تغيّر: لا لمس للمُصيِّرات أصلاً
            }

            _current = Mathf.SmoothDamp(_current, walk, ref _velocity, Mathf.Max(0.01f, blendTime));
            ApplyFloat(WalkId, _current);
        }

        /// <summary>
        /// الكتابة تمرّ بـ GetPropertyBlock أوّلاً: الاستبدال المباشر يمحو ما
        /// كُتب سابقاً — ومنه **لون الراية** على قطعة القماش.
        /// </summary>
        private void ApplyFloat(int id, float value)
        {
            for (int i = 0; i < _renderers.Length; i++)
            {
                MeshRenderer r = _renderers[i];
                if (r == null)
                {
                    continue;
                }

                r.GetPropertyBlock(_block);
                _block.SetFloat(id, value);
                r.SetPropertyBlock(_block);
            }
        }
    }
}
