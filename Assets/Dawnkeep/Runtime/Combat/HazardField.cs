using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// أخطار الأرض كلّها في مجمّعٍ واحد وحلقةٍ واحدة: سمُّ أمّ المستنقع (§13)
    /// ونارُ «حجر الجمر» (§15).
    ///
    /// مجمّعان لشيءٍ واحد يعني نسختين من الجاهزة في الذاكرة، وحلقتَي إطار،
    /// وعلّةً تُصلَح في أحدهما وتبقى في الآخر.
    /// </summary>
    [DisallowMultipleComponent]
    public class HazardField : MonoBehaviour
    {
        public static HazardField Instance { get; private set; }

        [Tooltip("جاهزة القرص المجمَّعة. تُملأ من باني المشهد.")]
        [SerializeField] private GameObject hazardPrefab;

        [Tooltip("لون السمّ — يجرح المملكة.")]
        [SerializeField] private Color poisonTint = new Color(0.322f, 0.451f, 0.278f);

        [Tooltip("لون النار — تجرح الحشد.")]
        [SerializeField] private Color fireTint = new Color(0.788f, 0.361f, 0.157f);

        private readonly List<Hazard> _pool = new List<Hazard>(24);
        private CombatDirector _combat;
        private Transform _root;
        private Unit[] _scan = new Unit[64];

        public Color PoisonTint { get { return poisonTint; } }

        public Color FireTint { get { return fireTint; } }

        public void Configure(GameObject prefab)
        {
            if (prefab != null)
            {
                hazardPrefab = prefab;
            }
        }

        private void Awake()
        {
            Instance = this;
            _root = transform;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>يضع خطراً. يعيد false إن لم تكن ثمّة جاهزة مضبوطة.</summary>
        public bool Place(Vector3 at, float radius, float damagePerSecond, float seconds,
            Faction victims, Color tint)
        {
            Hazard hazard = Take();
            if (hazard == null)
            {
                return false;
            }

            Vector3 place = at;
            place.y = Ground(place.x, place.z, at.y) + 0.06f;
            hazard.Place(place, radius, damagePerSecond, seconds, victims, tint);
            return true;
        }

        private void Update()
        {
            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
                if (_combat == null)
                {
                    return;
                }
            }

            float now = Time.time;
            float dt = Time.deltaTime;

            for (int i = 0; i < _pool.Count; i++)
            {
                Hazard hazard = _pool[i];
                if (hazard == null || !hazard.Active)
                {
                    continue;
                }

                if (now >= hazard.ExpiresAt)
                {
                    hazard.Retire();
                    continue;
                }

                int found = _combat.QueryFaction(hazard.Position, hazard.Radius,
                    hazard.Victims, _scan);

                for (int u = 0; u < found; u++)
                {
                    Unit unit = _scan[u];
                    if (unit != null && unit.Alive)
                    {
                        unit.TakeDamage(hazard.DamagePerSecond * dt);
                    }
                }
            }
        }

        private Hazard Take()
        {
            for (int i = 0; i < _pool.Count; i++)
            {
                if (_pool[i] != null && !_pool[i].Active)
                {
                    return _pool[i];
                }
            }

            if (hazardPrefab == null)
            {
                return null;
            }

            GameObject go = Instantiate(hazardPrefab, _root);
            Hazard hazard = go.GetComponent<Hazard>();
            if (hazard == null)
            {
                hazard = go.AddComponent<Hazard>();
            }

            _pool.Add(hazard);
            return hazard;
        }

        private static float Ground(float x, float z, float fallback)
        {
            Terrain terrain = Terrain.activeTerrain;
            if (terrain == null)
            {
                return fallback;
            }

            return terrain.SampleHeight(new Vector3(x, 0f, z)) + terrain.transform.position.y;
        }
    }
}
