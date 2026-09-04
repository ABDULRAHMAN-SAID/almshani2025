using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// يقود المعركة كلّها في حلقة واحدة: استهداف، حركة، تباعد، ضرب، موت.
    ///
    /// هذا **ليس** GameManager ضخماً: مسؤوليته واحدة ومحدّدة — تحريك المقاتلين
    /// وحلّ اشتباكهم. التوليد في `WaveDirector`، والمقذوفات في `ProjectilePool`،
    /// والشكل في `CharacterAnimator`.
    ///
    /// ثلاث قواعد من §12 مطبَّقة حرفياً:
    /// • لا يفحص أي عدو كل الأهداف في كل إطار — الفحص عبر Spatial Hash.
    /// • إعادة تقييم الهدف على فترة بين 0.25 و1 ثانية، **مبعثرة** بين الوحدات
    ///   فلا تتزامن كلّها في إطار واحد فتقفز الأطر.
    /// • تباعد محدود فلا تتكدّس الوحدات فوق بعضها، ولا يُفسد شكل الحشد.
    ///
    /// لا تخصيص ذاكرة داخل الحلقة: كل المصفوفات تُحجز مرّة عند التهيئة.
    /// </summary>
    [DisallowMultipleComponent]
    public class CombatDirector : MonoBehaviour
    {
        public static CombatDirector Instance { get; private set; }

        [Tooltip("أقصى عدد وحدات حيّة في وقت واحد. يحدّد حجم المصفوفات المحجوزة.")]
        [SerializeField] private int capacity = 512;

        [Tooltip("حجم خليّة التجزئة بالمتر. قريب من أبعد مدى بحث يعطي أقلّ عمل.")]
        [SerializeField] private float cellSize = 8f;

        [Tooltip("عرض العالم بالمتر — لبناء الشبكة.")]
        [SerializeField] private float worldSize = 2160f;

        [Tooltip("كم ثانية يبقى القتيل ملقىً قبل إعادته إلى المجمّع.")]
        [SerializeField] private float corpseLinger = 6f;

        [Tooltip("أقصى جيران يُفحصون في استعلام واحد.")]
        [SerializeField] private int maxNeighbours = 64;

        private readonly List<Unit> _units = new List<Unit>(512);

        private Vector3[] _positions;
        private int[] _neighbours;
        private SpatialHash _hash;
        private ProjectilePool _projectiles;
        private bool _ready;

        public int LiveCount { get; private set; }

        /// <summary>
        /// أحياء كل فصيلة على حدة. عدّاد واحد للجميع لا يصلح: `WaveDirector`
        /// ينتظر فناء **المهاجمين** لا فناء الحامية معهم، فلا تنتهي موجة أبداً.
        /// </summary>
        public int LiveKingdom { get; private set; }

        public int LiveHorde { get; private set; }

        /// <summary>الوحدات المسجّلة — للقراءة فقط، تستعملها الواجهة.</summary>
        public System.Collections.Generic.IReadOnlyList<Unit> Units { get { return _units; } }

        /// <summary>
        /// بطل اللاعب إن كان حيّاً. يُلتقط في نفس مرور الإطار الذي يعدّ الأحياء
        /// فلا تحتاج الواجهة بحثاً في المشهد كل إطار (قاعدة 5).
        /// </summary>
        public Unit Champion { get; private set; }

        private void Awake()
        {
            Instance = this;
            _positions = new Vector3[capacity];
            _neighbours = new int[Mathf.Max(8, maxNeighbours)];
            _hash = new SpatialHash(worldSize, cellSize, capacity);
            _projectiles = GetComponent<ProjectilePool>();
            _ready = true;
        }

        private void Start()
        {
            // تسجيل الحامية الموضوعة في المشهد مرّة واحدة عند الإقلاع.
            // البحث في المشهد مسموح هنا وحده — وممنوع داخل حلقة الإطار (§1).
            Unit[] placed = FindObjectsByType<Unit>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            for (int i = 0; i < placed.Length; i++)
            {
                Unit unit = placed[i];
                if (unit.Definition == null || !unit.gameObject.activeInHierarchy)
                {
                    continue;
                }

                unit.Awaken();
                Register(unit);
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void Register(Unit unit)
        {
            if (unit == null || _units.Count >= capacity)
            {
                return;
            }

            _units.Add(unit);
        }

        private void Update()
        {
            if (!_ready)
            {
                return;
            }

            float dt = Time.deltaTime;
            float now = Time.time;

            int count = _units.Count;
            for (int i = 0; i < count; i++)
            {
                _positions[i] = _units[i].Body.position;
            }

            _hash.Rebuild(_positions, count);

            int live = 0;
            int kingdom = 0;
            int horde = 0;
            Unit champion = null;
            for (int i = 0; i < count; i++)
            {
                Unit unit = _units[i];
                if (!unit.Alive)
                {
                    TickCorpse(unit, dt);
                    continue;
                }

                live++;
                if (unit.Faction == Faction.Kingdom)
                {
                    kingdom++;
                    if (champion == null && unit.Definition != null && unit.Definition.Champion)
                    {
                        champion = unit;
                    }
                }
                else if (unit.Faction == Faction.Horde)
                {
                    horde++;
                }

                TickUnit(i, unit, dt, now);
            }

            Champion = champion;
            LiveCount = live;
            LiveKingdom = kingdom;
            LiveHorde = horde;
            SweepDead();
        }

        private void TickCorpse(Unit unit, float dt)
        {
            if (!unit.gameObject.activeSelf)
            {
                return;
            }

            unit.DeadFor += dt;
        }

        /// <summary>يعيد القتلى إلى المجمّع بعد أن يستقرّ سقوطهم.</summary>
        private void SweepDead()
        {
            for (int i = _units.Count - 1; i >= 0; i--)
            {
                Unit unit = _units[i];
                if (unit.Alive || unit.DeadFor < corpseLinger)
                {
                    continue;
                }

                unit.Despawn();
                _units.RemoveAt(i);
            }
        }

        private void TickUnit(int index, Unit unit, float dt, float now)
        {
            UnitDefinition def = unit.Definition;
            if (def == null)
            {
                return;
            }

            // إعادة تقييم الهدف على فترتها، لا في كل إطار
            if (now >= unit.NextThink)
            {
                unit.Target = FindTarget(index, unit, def);
                unit.NextThink = now + def.RetargetInterval;
            }

            Unit target = ResolveTarget(unit);
            Vector3 position = unit.Body.position;
            Vector3 desired;
            bool inRange = false;

            if (target != null)
            {
                Vector3 toTarget = target.Body.position - position;
                toTarget.y = 0f;
                float distance = toTarget.magnitude;
                inRange = distance <= def.AttackRange;
                desired = inRange ? Vector3.zero : toTarget / Mathf.Max(0.0001f, distance);
            }
            else if (unit.HasPath)
            {
                // لا هدف: يمضي على مسار الطريق. لا NavMeshAgent لكل وحدة (§1)
                Vector3 waypoint = unit.PathPoint(position);
                Vector3 toWaypoint = waypoint - position;
                toWaypoint.y = 0f;
                if (toWaypoint.sqrMagnitude < 9f)
                {
                    unit.AdvancePath();
                }

                desired = toWaypoint.sqrMagnitude > 0.0001f ? toWaypoint.normalized : Vector3.zero;
            }
            else if (unit.HasHome)
            {
                // الحامية ترابط: تعود إلى موقعها بدل أن تنجرّ خلف كل مهاجم
                Vector3 toHome = unit.Home - position;
                toHome.y = 0f;
                desired = toHome.sqrMagnitude > 4f ? toHome.normalized : Vector3.zero;
            }
            else
            {
                desired = Vector3.zero;
            }

            desired += Separation(index, position, def.SeparationRadius);

            float speed = desired.sqrMagnitude > 0.0001f ? def.MoveSpeed : 0f;
            if (speed > 0f)
            {
                desired.y = 0f;
                desired.Normalize();
                Vector3 next = position + (desired * speed * dt);
                next.y = GroundHeight(next.x, next.z, position.y);
                unit.Body.position = next;

                Quaternion look = Quaternion.LookRotation(desired, Vector3.up);
                unit.Body.rotation = Quaternion.RotateTowards(unit.Body.rotation, look, def.TurnSpeed * dt);
            }
            else if (target != null)
            {
                // واقف يضرب: لا بدّ أن يلتفت إلى خصمه وإلا ضرب الهواء جانباً
                Vector3 face = target.Body.position - position;
                face.y = 0f;
                if (face.sqrMagnitude > 0.0001f)
                {
                    Quaternion look = Quaternion.LookRotation(face.normalized, Vector3.up);
                    unit.Body.rotation = Quaternion.RotateTowards(unit.Body.rotation, look, def.TurnSpeed * dt);
                }
            }

            if (unit.Animator != null)
            {
                unit.Animator.Walk = speed > 0f ? 1f : 0f;
            }

            if (target != null && inRange && now >= unit.NextAttack)
            {
                unit.NextAttack = now + def.AttackInterval;
                if (unit.Animator != null)
                {
                    if (def.Ranged)
                    {
                        unit.Animator.Shoot();
                    }
                    else
                    {
                        unit.Animator.Attack();
                    }
                }
            }

            ResolveHits(unit, def, target);
        }

        /// <summary>
        /// الضرر يقع في اللحظة التي **تُرى** فيها الضربة، لا عند بدء الحركة:
        /// المُحرِّك يرفع رايته في منتصف الهويّ، والسهم ينطلق عند الإفلات.
        /// </summary>
        private void ResolveHits(Unit unit, UnitDefinition def, Unit target)
        {
            if (unit.Animator == null || target == null || !target.Alive)
            {
                return;
            }

            if (!def.Ranged && unit.Animator.AttackLandedThisFrame)
            {
                target.TakeDamage(def.Damage);
                return;
            }

            if (def.Ranged && unit.Animator.ShotReleasedThisFrame && _projectiles != null)
            {
                Vector3 from = unit.Body.position + (Vector3.up * 1.35f);
                _projectiles.Fire(from, target, def.Damage, def.ProjectileSpeed);
            }
        }

        /// <summary>
        /// اختيار الهدف بوزن يجمع المسافة وفئة الهدف (§12) — لا أقرب هدف فحسب.
        /// الفحص محصور في خلايا الشبكة داخل مدى البصر.
        /// </summary>
        private Unit FindTarget(int selfIndex, Unit unit, UnitDefinition def)
        {
            int found = _hash.Query(unit.Body.position, def.SightRange, _neighbours);
            Unit best = null;
            float bestScore = float.MaxValue;
            float sightSqr = def.SightRange * def.SightRange;

            for (int n = 0; n < found; n++)
            {
                int j = _neighbours[n];
                if (j == selfIndex || j >= _units.Count)
                {
                    continue;
                }

                Unit other = _units[j];
                if (!other.Alive || other.Faction == unit.Faction || other.Faction == Faction.Neutral)
                {
                    continue;
                }

                Vector3 delta = other.Body.position - unit.Body.position;
                delta.y = 0f;
                float distSqr = delta.sqrMagnitude;
                if (distSqr > sightSqr)
                {
                    continue;
                }

                float score = distSqr;

                // تفضيل الفئة: الأثمن يُقرَّب وزنه فيُختار وإن كان أبعد قليلاً
                UnitDefinition otherDef = other.Definition;
                if (otherDef != null && def.TargetClass == TargetClass.Ranged && otherDef.Ranged)
                {
                    score *= 0.35f;
                }

                if (score < bestScore)
                {
                    bestScore = score;
                    best = other;
                }
            }

            return best;
        }

        private Unit ResolveTarget(Unit unit)
        {
            Unit target = unit.Target;
            if (target == null || !target.Alive || target.Faction == unit.Faction)
            {
                unit.Target = null;
                unit.NextThink = 0f;      // الهدف مات: يُعاد التقييم فوراً (§12)
                return null;
            }

            return target;
        }

        /// <summary>
        /// تباعد محدود: يدفع الوحدة عن جيرانها بما يكفي لئلّا تتكدّس، ولا يزيد
        /// فيتفكّك الحشد. المواصفات تنصّ على هذا الحدّ صراحةً.
        /// </summary>
        private Vector3 Separation(int selfIndex, Vector3 position, float radius)
        {
            if (radius <= 0f)
            {
                return Vector3.zero;
            }

            int found = _hash.Query(position, radius, _neighbours);
            Vector3 push = Vector3.zero;
            float radiusSqr = radius * radius;

            for (int n = 0; n < found; n++)
            {
                int j = _neighbours[n];
                if (j == selfIndex || j >= _units.Count)
                {
                    continue;
                }

                Vector3 delta = position - _units[j].Body.position;
                delta.y = 0f;
                float distSqr = delta.sqrMagnitude;
                if (distSqr > radiusSqr || distSqr < 0.0001f)
                {
                    continue;
                }

                push += delta / distSqr;
            }

            // الحدّ الأقصى 0.9: أعلى منه يغلب التباعدُ اتّجاهَ السير فيدور الجند في مكانه
            if (push.sqrMagnitude > 0.81f)
            {
                push = push.normalized * 0.9f;
            }

            return push;
        }

        private float GroundHeight(float x, float z, float fallback)
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
