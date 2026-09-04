using UnityEngine;

namespace Dawnkeep.Bosses
{
    /// <summary>
    /// بيضة أمّ المستنقع (§13): تُحطَّم قبل أن تفقس أو يخرج منها ما يخرج.
    ///
    /// **ليست `Unit`**: لا تمشي ولا تهاجم ولا تدخل حلقة القتال، ودخولها فيها
    /// يجعل كل جنديٍّ يفاضل بينها وبين المهاجمين في كل تقييم هدف. هي هدفٌ
    /// يُضرب بلمسةٍ من اللاعب وبمن حولها من الحامية، وحسابها في `BossDirector`.
    /// </summary>
    [DisallowMultipleComponent]
    public class BossEgg : MonoBehaviour
    {
        private Transform _transform;
        private Renderer[] _renderers;
        private MaterialPropertyBlock _block;

        /// <summary>هل هي حيّة الآن؟ المجمَّعة المطفأة ليست كذلك.</summary>
        public bool Alive { get; private set; }

        /// <summary>لحظة الفقس. بعدها تُخرج حاشيتها وتموت.</summary>
        public float HatchAt { get; private set; }

        public float Health { get; private set; }

        public float MaxHealth { get; private set; }

        /// <summary>ما يخرج منها إن فقست — تحمله معها لا من واضعتها.</summary>
        public Dawnkeep.Combat.UnitDefinition Brood { get; private set; }

        public int BroodCount { get; private set; }

        public Vector3 Position { get { return _transform != null ? _transform.position : transform.position; } }

        private void Awake()
        {
            _transform = transform;
            _renderers = GetComponentsInChildren<Renderer>(true);
            _block = new MaterialPropertyBlock();
        }

        public void Place(Vector3 position, float health, float hatchSeconds,
            Dawnkeep.Combat.UnitDefinition brood, int broodCount)
        {
            if (_transform == null)
            {
                Awake();
            }

            _transform.position = position;
            MaxHealth = Mathf.Max(1f, health);
            Health = MaxHealth;
            HatchAt = Time.time + Mathf.Max(0.5f, hatchSeconds);
            Brood = brood;
            BroodCount = Mathf.Max(0, broodCount);
            Alive = true;
            gameObject.SetActive(true);
            Paint();
        }

        /// <summary>يعيد true إن حطّمتها هذه الضربة.</summary>
        public bool TakeDamage(float amount)
        {
            if (!Alive)
            {
                return false;
            }

            Health -= Mathf.Max(0f, amount);
            if (Health > 0f)
            {
                Paint();
                return false;
            }

            Retire();
            return true;
        }

        public void Retire()
        {
            Alive = false;
            gameObject.SetActive(false);
        }

        /// <summary>
        /// تتوهّج كلّما قرب فقسها: العدّ المرئيّ هو ما يجعل تحطيمها قراراً
        /// لا مفاجأة. الصبغ بـ`MaterialPropertyBlock` فلا خامة جديدة لكل بيضة.
        /// </summary>
        public void Paint()
        {
            if (_renderers == null || _block == null)
            {
                return;
            }

            float left = Mathf.Clamp01((HatchAt - Time.time) / 12f);
            float heat = 1f - left;
            Color tint = Color.Lerp(new Color(0.44f, 0.52f, 0.36f),
                new Color(0.85f, 0.34f, 0.18f), heat);

            _block.SetColor(TintId, tint);
            for (int i = 0; i < _renderers.Length; i++)
            {
                if (_renderers[i] != null)
                {
                    _renderers[i].SetPropertyBlock(_block);
                }
            }
        }

        private static readonly int TintId = Shader.PropertyToID("_BaseColor");
    }
}
