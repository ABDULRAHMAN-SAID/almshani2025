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

        [Tooltip("وزن المشي: صفر وقوف، واحد مشي كامل. يُضبط من منطق الوحدة.")]
        [Range(0f, 1f)]
        [SerializeField] private float walk;

        [Tooltip("زمن الانتقال بين الوقوف والمشي بالثواني. الانتقال المفاجئ يُقرأ خللاً.")]
        [SerializeField] private float blendTime = 0.18f;

        [Tooltip("طور ثابت يُضاف إلى الطور المشتقّ من الموضع.")]
        [SerializeField] private float phaseOffset;

        private MeshRenderer[] _renderers;
        private MaterialPropertyBlock _block;
        private float _current = -1f;
        private float _velocity;

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
