using UnityEngine;

namespace Dawnkeep.Bosses
{
    /// <summary>
    /// بركة سمّ (§13): منطقة تجرح من يقف فيها. **مجمَّعة** لا مُنشأة —
    /// بركةٌ كل ستّ ثوانٍ على مدى ليلة تعني عشرات الكائنات وقمامتَها (§1).
    ///
    /// الضرر يُحسب في `BossDirector` لا هنا: حلقةٌ واحدة تمرّ على البرك كلّها
    /// أرخص من `Update` في كلّ بركة، والقاعدة نفسها في §1.
    /// </summary>
    [DisallowMultipleComponent]
    public class PoisonPool : MonoBehaviour
    {
        private Transform _transform;

        public bool Active { get; private set; }

        public float Radius { get; private set; }

        public float DamagePerSecond { get; private set; }

        public float ExpiresAt { get; private set; }

        public Vector3 Position { get { return _transform != null ? _transform.position : transform.position; } }

        private void Awake()
        {
            _transform = transform;
        }

        public void Place(Vector3 position, float radius, float damagePerSecond, float seconds)
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
            Active = true;
            gameObject.SetActive(true);
        }

        public void Retire()
        {
            Active = false;
            gameObject.SetActive(false);
        }
    }
}
