using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// خطرٌ على الأرض: قرصٌ يجرح من يقف فيه مدّةً ثمّ يزول — بركة سمّ أمّ
    /// المستنقع (§13) ونارُ «حجر الجمر» (§15) كلاهما هذا الشيء نفسه.
    ///
    /// **مجمَّع** لا مُنشأ: بركةٌ كل ستّ ثوانٍ ونارٌ مع كل قذيفة تعني مئات
    /// الكائنات وقمامتَها (§1).
    ///
    /// والضرر يُحسب في `HazardField` لا هنا: حلقةٌ واحدة تمرّ على الأخطار
    /// كلّها أرخص من `Update` في كلّ قرص، والقاعدة نفسها في §1.
    /// </summary>
    [DisallowMultipleComponent]
    public class Hazard : MonoBehaviour
    {
        private Transform _transform;
        private Renderer[] _renderers;
        private MaterialPropertyBlock _block;

        public bool Active { get; private set; }

        public float Radius { get; private set; }

        public float DamagePerSecond { get; private set; }

        public float ExpiresAt { get; private set; }

        /// <summary>من يجرحه هذا الخطر. السمّ يجرح المملكة والنار تجرح الحشد.</summary>
        public Faction Victims { get; private set; }

        public Vector3 Position { get { return _transform != null ? _transform.position : transform.position; } }

        private void Awake()
        {
            _transform = transform;
            _renderers = GetComponentsInChildren<Renderer>(true);
            _block = new MaterialPropertyBlock();
        }

        public void Place(Vector3 position, float radius, float damagePerSecond, float seconds,
            Faction victims, Color tint)
        {
            if (_transform == null)
            {
                Awake();
            }

            _transform.position = position;

            // القرص مبنيٌّ بنصف قطر واحد، فالاتّساع بالمقياس لا بشبكة جديدة
            _transform.localScale = new Vector3(radius, 1f, radius);

            Radius = Mathf.Max(0.5f, radius);
            DamagePerSecond = Mathf.Max(0f, damagePerSecond);
            ExpiresAt = Time.time + Mathf.Max(0.5f, seconds);
            Victims = victims;
            Active = true;
            gameObject.SetActive(true);
            Paint(tint);
        }

        public void Retire()
        {
            Active = false;
            gameObject.SetActive(false);
        }

        /// <summary>
        /// اللون يقول ما هو: أخضرُ سمٍّ يجرح جندك، وبرتقاليُّ نارٍ يجرح عدوّك.
        /// قرصان بلون واحد يجعل اللاعب يفرّ من ناره ويقف في سمّه.
        /// </summary>
        private void Paint(Color tint)
        {
            if (_renderers == null || _block == null)
            {
                return;
            }

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
