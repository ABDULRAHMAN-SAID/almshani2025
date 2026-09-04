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

        /// <summary>نصف القطر التقريبي للمبنى: يُضاف إلى مدى الضرب عليه.</summary>
        private const float StructureReach = 4.2f;

        private readonly List<Unit> _units = new List<Unit>(512);

        private Vector3[] _positions;
        private int[] _neighbours;
        private SpatialHash _hash;
        private ProjectilePool _projectiles;
        private Dawnkeep.Light.LightField _light;
        private Dawnkeep.Building.BuildingDirector _buildings;
        private Dawnkeep.Economy.Treasury _treasury;
        private Dawnkeep.Building.Keep _keep;
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
            // يُلتقط هنا لا في Awake: ترتيب إيقاظ الكائنات غير مضمون، وحقل
            // النور قد لا يكون سجّل نفسه بعد.
            _light = Dawnkeep.Light.LightField.Instance;
            _buildings = Dawnkeep.Building.BuildingDirector.Instance;
            _treasury = Dawnkeep.Economy.Treasury.Instance;
            _keep = Dawnkeep.Building.Keep.Instance;

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

        /// <summary>
        /// يشطب وحدة من القائمة. **واجب قبل هدم كائنها**: الحلقة تقرأ
        /// `unit.Body.position` لكل مسجَّلة، ومرجعٌ إلى كائن مهدوم يرمي
        /// MissingReference لا يُلتقط بفحص `== null` وحده.
        /// </summary>
        public void Unregister(Unit unit)
        {
            _units.Remove(unit);
        }

        /// <summary>
        /// وحدات فصيلة معيّنة داخل نصف قطر، تُكتب في مخزن المنادي.
        /// **يملك المنادي مخزنه**: مخزنٌ مشترك هنا يعني أنّ استعلاماً متداخلاً
        /// (انفجارٌ يستدعي سلسلةً) يمسح نتيجة سابقه تحت قدميه.
        /// </summary>
        public int QueryFaction(Vector3 centre, float radius, Faction faction, Unit[] results)
        {
            if (results == null || !_ready)
            {
                return 0;
            }

            int found = _hash.Query(centre, radius, _neighbours);
            float radiusSqr = radius * radius;
            int count = 0;

            for (int n = 0; n < found && count < results.Length; n++)
            {
                int j = _neighbours[n];
                if (j >= _units.Count)
                {
                    continue;
                }

                Unit unit = _units[j];
                if (unit == null || !unit.Alive || unit.Faction != faction)
                {
                    continue;
                }

                Vector3 delta = unit.Body.position - centre;
                delta.y = 0f;
                if (delta.sqrMagnitude > radiusSqr)
                {
                    continue;
                }

                results[count++] = unit;
            }

            return count;
        }

        private void Update()
        {
            if (!_ready)
            {
                return;
            }

            float dt = Time.deltaTime;
            float now = Time.time;

            // تنظيف المهدوم قبل أي قراءة: قد يُهدم حارسُ مبنى بين إطارين من
            // خارج هذه الحلقة، فيبقى مرجعه هنا وتنكسر قراءة موضعه.
            for (int i = _units.Count - 1; i >= 0; i--)
            {
                if (_units[i] == null)
                {
                    _units.RemoveAt(i);
                }
            }

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

                // النور يُقاس في كل إطار لا على فترة التفكير: الوحدة قد تعبر
                // حافّة الدائرة بين تفكيرين، فيضربها الظلام وهي في النور.
                // والمخزَّن هو **مقدار قضم الدرع** لا شدّة النور الخام: الشحنات
                // جزء من الحساب، وتكرارها عند كل ضربة يعني استعلاماً زائداً.
                unit.LightLevel = _light != null ? _light.ArmourCutAt(unit.Body.position) : 0f;

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

            // المكافأة تُصرف مرّة: لا تتساقط عملات في الساحة، بل يزيد عدّاد
            // معلّق يُصرف كلّه عند الفجر (§10).
            if (!unit.BountyPaid && unit.Faction == Faction.Horde)
            {
                unit.BountyPaid = true;
                if (_treasury == null)
                {
                    _treasury = Dawnkeep.Economy.Treasury.Instance;
            _keep = Dawnkeep.Building.Keep.Instance;
                }

                if (_treasury != null && unit.Definition != null)
                {
                    _treasury.AddBounty(unit.Definition.Bounty);
                }
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
                if (def.TargetClass == TargetClass.Beacon && _light != null)
                {
                    unit.BeaconTarget = _light.NearestLit(unit.Body.position);
                }

                unit.Target = FindTarget(index, unit, def);

                // المبنى هدف احتياطي لا أصلي: يُقصد إن لم يعترض المهاجمَ مقاتلٌ،
                // أو إن كانت فئته `Structure` أصلاً. وإلّا صار الجند يتجاهلون
                // بعضهم ويضربون الحجر بينما الخصم يضربهم في ظهورهم.
                bool wantsStructure = def.TargetClass == TargetClass.Structure;
                unit.StructureTarget = (wantsStructure || unit.Target == null)
                    && unit.Faction == Faction.Horde
                    ? FindStructure(unit, def)
                    : null;

                unit.NextThink = now + def.RetargetInterval;
            }

            Unit target = ResolveTarget(unit);
            Dawnkeep.Light.Beacon beacon = ResolveBeacon(unit, def);
            Dawnkeep.Building.Building structure = ResolveStructure(unit, target, def);
            Vector3 position = unit.Body.position;

            // قلب الحصن هدفٌ أخير: من بلغ آخر مساره ولم يجد مقاتلاً ولا مبنى
            // يقصده. هو شرط الخسارة (§5)، فلا يجوز أن يقف المهاجمون حوله بلا
            // فعل لأنّ قائمة المباني خلت.
            bool aimKeep = target == null && structure == null && beacon == null
                && unit.Faction == Faction.Horde && !unit.HasPath
                && _keep != null && !_keep.Fallen;
            Vector3 desired;
            bool inRange = false;

            // المدى يتّسع داخل النور (§11: +5% لكل شحنة). طُبِّق على الرماة
            // وحدهم لأنّهم أقرب ما في اللعبة اليوم إلى برج — ولا أبراج بعد.
            float range = def.AttackRange;
            if (def.Ranged && _light != null)
            {
                range *= 1f + _light.RangeBonusAt(position);
            }

            if (beacon != null)
            {
                // آكل القناديل يمرّ بالمقاتلين إلى المنارة: هذه هي التهديدة
                // التي تجبر اللاعب على ترك خطّه ليحميها (§11).
                Vector3 toBeacon = beacon.Position - position;
                toBeacon.y = 0f;
                float distance = toBeacon.magnitude;
                inRange = distance <= range;
                desired = inRange ? Vector3.zero : toBeacon / Mathf.Max(0.0001f, distance);
            }
            else if (structure != null)
            {
                Vector3 toStructure = structure.Body.position - position;
                toStructure.y = 0f;
                float distance = toStructure.magnitude;

                // المبنى جسم عريض لا نقطة: يُضاف نصف قطره التقريبي إلى المدى
                // وإلّا وقف المهاجم يضرب الهواء عند جداره.
                inRange = distance <= range + StructureReach;
                desired = inRange ? Vector3.zero : toStructure / Mathf.Max(0.0001f, distance);
            }
            else if (target != null)
            {
                Vector3 toTarget = target.Body.position - position;
                toTarget.y = 0f;
                float distance = toTarget.magnitude;
                inRange = distance <= range;
                desired = inRange ? Vector3.zero : toTarget / Mathf.Max(0.0001f, distance);
            }
            else if (aimKeep)
            {
                Vector3 toKeep = _keep.transform.position - position;
                toKeep.y = 0f;
                float distance = toKeep.magnitude;
                inRange = distance <= range + StructureReach;
                desired = inRange ? Vector3.zero : toKeep / Mathf.Max(0.0001f, distance);
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

            // الإبطاء يضرب السرعة هنا لا في التعريف: التعريف أصلٌ مشترك بين
            // كل نسخ الوحدة، وتعديله يبطئ الجيش كلّه.
            float speed = desired.sqrMagnitude > 0.0001f ? def.MoveSpeed * unit.SpeedMultiplier : 0f;
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
            else if (target != null || beacon != null || structure != null || aimKeep)
            {
                // واقف يضرب: لا بدّ أن يلتفت إلى خصمه وإلا ضرب الهواء جانباً
                Vector3 aim = beacon != null ? beacon.Position
                    : structure != null ? structure.Body.position
                    : aimKeep ? _keep.transform.position
                    : target.Body.position;

                Vector3 face = aim - position;
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

            if ((target != null || beacon != null || structure != null || aimKeep)
                && inRange && now >= unit.NextAttack)
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

            ResolveHits(unit, def, target, beacon, structure, aimKeep);
        }

        /// <summary>
        /// المبنى المقصود إن بقي قائماً — ويُترك فوراً إن اعترض المهاجمَ مقاتلٌ
        /// حيّ، فلا يقف يهدم جداراً وسيفٌ في ظهره.
        /// </summary>
        private Dawnkeep.Building.Building ResolveStructure(Unit unit, Unit target, UnitDefinition def)
        {
            Dawnkeep.Building.Building structure = unit.StructureTarget;
            if (structure == null || !structure.Alive)
            {
                unit.StructureTarget = null;
                return null;
            }

            if (target != null && def.TargetClass != TargetClass.Structure)
            {
                return null;      // مقاتل حاضر: هو الأولى
            }

            return structure;
        }

        /// <summary>
        /// أقرب مبنى داخل مدى البصر. المرور على المباني مباشرةً: هي عشرات لا
        /// مئات، ولا تدخل شبكة تجزئة الوحدات أصلاً.
        /// </summary>
        private Dawnkeep.Building.Building FindStructure(Unit unit, UnitDefinition def)
        {
            if (_buildings == null)
            {
                _buildings = Dawnkeep.Building.BuildingDirector.Instance;
                if (_buildings == null)
                {
                    return null;
                }
            }

            System.Collections.Generic.IReadOnlyList<Dawnkeep.Building.Building> list = _buildings.Buildings;
            Vector3 position = unit.Body.position;

            // فئة `Structure` تقصد المباني من بعيد؛ غيرها لا يلتفت إليها إلّا
            // إن كانت في طريقه فعلاً.
            float sight = def.TargetClass == TargetClass.Structure ? def.SightRange * 3f : def.SightRange;
            float sightSqr = sight * sight;

            Dawnkeep.Building.Building best = null;
            float bestSqr = float.MaxValue;

            for (int i = 0; i < list.Count; i++)
            {
                Dawnkeep.Building.Building candidate = list[i];
                if (candidate == null || !candidate.Alive)
                {
                    continue;
                }

                Vector3 delta = candidate.Body.position - position;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr > sightSqr || distSqr >= bestSqr)
                {
                    continue;
                }

                bestSqr = distSqr;
                best = candidate;
            }

            return best;
        }

        /// <summary>
        /// المنارة المقصودة إن بقيت مضيئة. تُنسى فور انطفائها: بقاء آكل
        /// القناديل يضرب منارة مطفأة يجمّده عن المعركة كلّها.
        /// </summary>
        private Dawnkeep.Light.Beacon ResolveBeacon(Unit unit, UnitDefinition def)
        {
            if (def.TargetClass != TargetClass.Beacon)
            {
                return null;
            }

            Dawnkeep.Light.Beacon beacon = unit.BeaconTarget;
            if (beacon == null || !beacon.IsLit)
            {
                unit.BeaconTarget = null;
                unit.NextThink = 0f;
                return null;
            }

            return beacon;
        }

        /// <summary>
        /// الضرر يقع في اللحظة التي **تُرى** فيها الضربة، لا عند بدء الحركة:
        /// المُحرِّك يرفع رايته في منتصف الهويّ، والسهم ينطلق عند الإفلات.
        /// </summary>
        private void ResolveHits(Unit unit, UnitDefinition def, Unit target,
            Dawnkeep.Light.Beacon beacon, Dawnkeep.Building.Building structure, bool aimKeep)
        {
            if (unit.Animator == null)
            {
                return;
            }

            // المنارة لا تُجرَح بل **تُطفَأ**: الشحنة تعود بعد المهلة، فالخسارة
            // منطقةٌ لثوانٍ لا مورد إلى الأبد (§11).
            if (beacon != null)
            {
                if (unit.Animator.AttackLandedThisFrame && _light != null && _light.Settings != null)
                {
                    beacon.Snuff(_light.Settings.SnuffSeconds);
                }

                return;
            }

            if (structure != null)
            {
                if (unit.Animator.AttackLandedThisFrame)
                {
                    structure.TakeDamage(def.Damage);
                }

                return;
            }

            if (aimKeep)
            {
                if (unit.Animator.AttackLandedThisFrame && _keep != null)
                {
                    _keep.TakeDamage(def.Damage);
                }

                return;
            }

            if (target == null || !target.Alive)
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

            // المقود: لا تلاحق الفرقة هدفاً يخرج بها عن مرساتها (§9). الفحص
            // على **موضع الهدف** لا على موضع الملاحِق: عدوٌّ يقف على حافّة
            // المقود يجرّ الجندي خارجه إن قيسَ من الجندي.
            bool leashed = unit.HasHome && unit.Leash > 0f;
            float leashSqr = unit.Leash * unit.Leash;

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

                if (leashed)
                {
                    Vector3 fromHome = other.Body.position - unit.Home;
                    fromHome.y = 0f;
                    if (fromHome.sqrMagnitude > leashSqr)
                    {
                        continue;
                    }
                }

                float score = distSqr;

                // «دافع عن الهدف»: من يضرب ما نحرسه أولى بضربنا (§9)
                if (unit.Guarded != null && other.StructureTarget == unit.Guarded)
                {
                    score *= 0.30f;
                }

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
