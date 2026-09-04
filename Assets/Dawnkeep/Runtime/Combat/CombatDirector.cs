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

        [Tooltip("أرقام الأداء (§31). فارغاً تُستعمل نبضةٌ افتراضية 25 هرتز.")]
        [SerializeField] private Dawnkeep.Performance.PerformanceSettings performance;

        private Vector3[] _positions;
        private float _simLeft;
        private int[] _neighbours;
        private SpatialHash _hash;
        private ProjectilePool _projectiles;
        private Dawnkeep.Light.LightField _light;
        private Dawnkeep.Building.BuildingDirector _buildings;
        private Dawnkeep.Economy.Treasury _treasury;
        private Dawnkeep.Building.Keep _keep;
        private WaveDirector _waves;
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
            _waves = FindAnyObjectByType<WaveDirector>();

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
        /// <summary>
        /// يَعُدّ من في الدائرة من فصيلٍ بعينه، بلا مصفوفة نتائج. العدّ وحده
        /// حين يكفي العددُ: تمريرُ مصفوفةٍ لكل جنديّ في كل نوبةٍ يخصّص أو
        /// يحجز بلا حاجة.
        /// </summary>
        public int CountFaction(Vector3 centre, float radius, Faction faction, int cap)
        {
            if (!_ready || cap <= 0)
            {
                return 0;
            }

            int found = _hash.Query(centre, radius, _neighbours);
            float radiusSqr = radius * radius;
            int count = 0;

            for (int n = 0; n < found && count < cap; n++)
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
                if (delta.sqrMagnitude <= radiusSqr)
                {
                    count++;
                }
            }

            return count;
        }

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

            // ── نبضة المحاكاة (§31: بين 20 و30 هرتز) ──────────────────────
            //
            // ليس كلّ ما في هذه الحلقة يستحقّ ستّين مرّةً في الثانية. الحركة
            // والضرب المرئي نعم — تراهما العين. أمّا **بناء الشبكة المكانية**
            // و**قياس النور لكل وحدة** فقراراتٌ لا صور: بناؤها خمساً وعشرين
            // مرّة يكفي، ويوفّر ثلثها على حشدٍ من خمسمئة.
            //
            // والثمن مقيس لا مقدَّر: أربعون ميلي ثانية من التقادم، وأسرع
            // وحدة في اللعبة (وليد الغسق، 4.7 م/ث) تقطع فيها **تسعة عشر
            // سنتيمتراً** — أقلّ من نصف نصف قطر جسدها.
            _simLeft -= dt;
            bool simulate = _simLeft <= 0f;
            if (simulate)
            {
                _simLeft += SimulationStep;

                // الحارس: إطارٌ طويل (تحميلٌ أو انتقال مشهد) قد يترك المتبقّي
                // سالباً بثوانٍ، فتُلاحَق النبضاتُ الفائتة دفعةً وتتجمّد الصورة.
                if (_simLeft < 0f)
                {
                    _simLeft = SimulationStep;
                }
            }

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
            if (simulate)
            {
                for (int i = 0; i < count; i++)
                {
                    _positions[i] = _units[i].Body.position;
                }

                _hash.Rebuild(_positions, count);
            }

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

                // النور يُقاس على **نبضة المحاكاة** لا على فترة التفكير: فترةُ
                // التفكير تبلغ ثانيةً كاملة، والوحدة تعبر حافّة الدائرة فيها
                // فيضربها الظلام وهي في النور. والنبضة أربعون ميلي ثانية.
                //
                // والمخزَّن هو **مقدار قضم الدرع** لا شدّة النور الخام: الشحنات
                // جزء من الحساب، وتكرارها عند كل ضربة يعني استعلاماً زائداً.
                if (simulate)
                {
                    unit.LightLevel = _light != null
                        ? _light.ArmourCutAt(unit.Body.position)
                        : 0f;
                }

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

                UnitDefinition def = unit.Definition;
                TickUnit(i, unit, dt, now);

                // سمات §12: تُقرأ بعد الحركة، فالقفزة والانفجار يقعان على
                // الموضع الذي انتهت إليه الوحدة لا على موضعٍ ترَكَته.
                //
                // ووحدةٌ بلا تعريف واردة (مجمَّعةٌ لم تُهيَّأ بعد)، وحافرٌ لم
                // يخرج من الأرض لا يجري سماته — وإلّا انفجر تحت الرمل.
                if (def != null && def.Traits != UnitTrait.None && !Underground(def, unit, now))
                {
                    TickTrait(unit, def, now);
                }
            }

            Champion = champion;
            LiveCount = live;
            LiveKingdom = kingdom;
            LiveHorde = horde;
            SweepDead();
        }

        /// <summary>
        /// ضرر الوحدة بعد سماتها (§12). «يستفيد من الظلام» في الرامي المحجوب
        /// **يُقاس بالنور المخزَّن** لا بحسابٍ جديد: القياس جرى في نبضة
        /// المحاكاة، وإعادتُه عند كل ضربة استعلامٌ زائد على كل سهم.
        /// </summary>
        private static float Strength(Unit unit, UnitDefinition def)
        {
            float damage = unit.Damage;
            if (!def.Has(UnitTrait.DarkFavoured))
            {
                return damage;
            }

            // النور المخزَّن هو قضم الدرع: واحدٌ في قلب الدائرة وصفرٌ خارجها
            float lit = Mathf.Clamp01(unit.LightLevel);
            return damage * Mathf.Lerp(1f + def.TraitPower, 1f, lit);
        }

        // ── سمات §12 ────────────────────────────────────────────────────────

        /// <summary>
        /// يجري سمة الوحدة إن كان لها سمة. فرعٌ لكل سمة لا شجرةُ قرار: لا
        /// يشترك المفجّر والكاهن في شيءٍ إلّا أنّهما عدوّان.
        /// </summary>
        private void TickTrait(Unit unit, UnitDefinition def, float now)
        {
            if (def.Has(UnitTrait.Suicide))
            {
                TickSuicide(unit, def, now);
            }

            if (def.Has(UnitTrait.Leap))
            {
                TickLeap(unit, def, now);
            }

            if (def.Has(UnitTrait.SummonAtHalf))
            {
                TickSummon(unit, def, now);
            }

            if (def.Has(UnitTrait.Support))
            {
                TickSupport(unit, def, now);
            }
        }

        /// <summary>
        /// المفجّر (§12): يركض إلى الجدار ثمّ ينفجر بعد **إنذار**. والإنذار
        /// شرطٌ لا زينة: انفجارٌ بلا إنذار عقابٌ على القرب لا على الخطأ،
        /// ولا سبيل إلى تفاديه.
        /// </summary>
        private void TickSuicide(Unit unit, UnitDefinition def, float now)
        {
            if (unit.TraitSpent)
            {
                return;
            }

            // الإنذار يبدأ حين يبلغ هدفه: بدؤه من بعيد يجعله ينفجر في الطريق
            if (unit.TraitAt <= 0f)
            {
                if (!NearTarget(unit, def))
                {
                    return;
                }

                unit.TraitAt = now + Mathf.Max(0.2f, def.TraitSeconds);
                return;
            }

            if (now < unit.TraitAt)
            {
                return;
            }

            unit.TraitSpent = true;
            Detonate(unit, def);
            unit.TakeDamage(unit.MaxHealth * 10f);      // يفنى بانفجاره
        }

        private void Detonate(Unit unit, UnitDefinition def)
        {
            Vector3 centre = unit.Body.position;
            float radius = Mathf.Max(1f, def.TraitRange);

            // الجدار أوّلاً: هو ما جاء له (§12)
            if (_buildings != null)
            {
                System.Collections.Generic.IReadOnlyList<Dawnkeep.Building.Building> all =
                    _buildings.Buildings;

                for (int i = 0; i < all.Count; i++)
                {
                    Dawnkeep.Building.Building building = all[i];
                    if (building == null || !building.Alive)
                    {
                        continue;
                    }

                    Vector3 delta = building.Body.position - centre;
                    delta.y = 0f;
                    if (delta.sqrMagnitude <= radius * radius)
                    {
                        building.TakeDamage(def.TraitPower);
                    }
                }
            }

            int found = QueryFaction(centre, radius, Faction.Kingdom, _traitScan);
            for (int i = 0; i < found; i++)
            {
                if (_traitScan[i] != null && _traitScan[i].Alive)
                {
                    _traitScan[i].TakeDamage(def.TraitPower);
                }
            }
        }

        /// <summary>
        /// كلب المستنقع (§12): يقفز إلى الرماة **إن لم يوقفه الحرّاس**.
        /// فالشرط أن يكون خالياً من مشتبكٍ به — وإلّا صار الحرّاس بلا معنى.
        /// </summary>
        private void TickLeap(Unit unit, UnitDefinition def, float now)
        {
            // لا تُقرأ `TraitSpent` هنا: القفزة تتكرّر على مهلتها، و`TraitSpent`
            // رايةُ «مرّةً واحدة» للانفجار والاستدعاء. قراءتها هنا تُسكِت قفزَ
            // وحدةٍ تجمع القفزَ إلى إحداهما.
            if (now < unit.TraitNext)
            {
                return;
            }

            unit.TraitNext = now + Mathf.Max(1f, def.TraitSeconds);

            // مشتبكٌ به: مقاتلٌ مملكيّ في مدى ضربه — الحرّاس أوقفوه
            if (QueryFaction(unit.Body.position, def.AttackRange + 1.2f,
                Faction.Kingdom, _traitScan) > 0)
            {
                return;
            }

            Unit prey = null;
            float bestSqr = def.TraitRange * def.TraitRange;
            int found = QueryFaction(unit.Body.position, def.TraitRange,
                Faction.Kingdom, _traitScan);

            for (int i = 0; i < found; i++)
            {
                Unit other = _traitScan[i];
                if (other == null || !other.Alive || other.Definition == null
                    || !other.Definition.Ranged)
                {
                    continue;
                }

                Vector3 delta = other.Body.position - unit.Body.position;
                delta.y = 0f;
                float sqr = delta.sqrMagnitude;
                if (sqr < bestSqr)
                {
                    bestSqr = sqr;
                    prey = other;
                }
            }

            if (prey == null)
            {
                return;
            }

            // القفزة نقلةٌ إلى جوار الرامي لا اختراقٌ له: الوقوف في موضعه
            // يجعل الاثنين في نقطةٍ واحدة فتتنازعهما دفعةُ التباعد.
            Vector3 to = prey.Body.position;
            Vector3 away = (unit.Body.position - to);
            away.y = 0f;
            if (away.sqrMagnitude < 0.01f)
            {
                away = Vector3.forward;
            }

            to += away.normalized * (def.AttackRange * 0.8f);
            to.y = Ground(to.x, to.z, unit.Body.position.y);

            unit.Body.position = to;
            unit.Target = prey;
            unit.NextThink = now + def.RetargetInterval;
        }

        /// <summary>فارس القبر (§12): يستدعي عند نصف صحّته، مرّةً واحدة.</summary>
        private void TickSummon(Unit unit, UnitDefinition def, float now)
        {
            if (unit.TraitSpent || def.TraitSpawn == null)
            {
                return;
            }

            if (unit.Health > unit.MaxHealth * 0.5f)
            {
                return;
            }

            unit.TraitSpent = true;

            // المولّد ملتقَطٌ في `Start`: البحث في المشهد داخل حلقة الإطار
            // ممنوع (§1)، وإن ندر — فارسُ قبرٍ واحد يكفي لِيُكلِّف بحثاً كاملاً.
            if (_waves != null)
            {
                _waves.SummonAt(def.TraitSpawn, unit.Body.position, 2.2f,
                    Mathf.Max(1, Mathf.RoundToInt(def.TraitPower)), 0);
            }
        }

        /// <summary>
        /// كاهن الكسوف (§12): «يبقى خلف الموجة ويقوّي الحلفاء». والتقوية
        /// راية حشدٍ على من حوله — الآليّة نفسها التي يستعملها البطل، فلا
        /// نظامَ ثانٍ لأثرٍ واحد.
        /// </summary>
        private void TickSupport(Unit unit, UnitDefinition def, float now)
        {
            if (now < unit.TraitNext)
            {
                return;
            }

            unit.TraitNext = now + Mathf.Max(0.5f, def.TraitSeconds);

            int found = QueryFaction(unit.Body.position, def.TraitRange,
                Faction.Horde, _traitScan);

            for (int i = 0; i < found; i++)
            {
                Unit ally = _traitScan[i];
                if (ally != null && ally.Alive && ally != unit)
                {
                    ally.ApplyRally(def.TraitPower, def.TraitPower * 0.5f,
                        def.TraitSeconds * 1.4f);
                }
            }
        }

        /// <summary>
        /// هل ما يزال الحافر تحت الأرض؟ يقرؤه موضعان: الحركة والسمات، فلا
        /// يتحرّك ولا ينفجر ولا يستدعي قبل أن يخرج (§12: تنّين الصدع).
        /// </summary>
        private static bool Underground(UnitDefinition def, Unit unit, float now)
        {
            return def.Has(UnitTrait.Burrow) && now < unit.TraitAt;
        }

        /// <summary>هل بلغ المفجّر هدفه؟ جدارٌ أو مقاتلٌ في مدى ضربه.</summary>
        private bool NearTarget(Unit unit, UnitDefinition def)
        {
            if (unit.StructureTarget != null)
            {
                Vector3 delta = unit.StructureTarget.Body.position - unit.Body.position;
                delta.y = 0f;
                if (delta.sqrMagnitude <= (def.AttackRange + StructureReach)
                    * (def.AttackRange + StructureReach))
                {
                    return true;
                }
            }

            return QueryFaction(unit.Body.position, def.AttackRange + 1f,
                Faction.Kingdom, _traitScan) > 0;
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

        /// <summary>مصفوفة السمات — مخصَّصة مرّةً لا في كل نداء.</summary>
        private readonly Unit[] _traitScan = new Unit[48];

        /// <summary>
        /// هل يُقاس زمن اختيار الهدف الآن؟ يرفعه `PerformanceProbe` وحده.
        /// </summary>
        public bool Measuring { get; set; }

        /// <summary>
        /// زمن اختيار الأهداف في الإطار المنقضي، بالميلي ثانية (§31).
        /// يُصفَّر عند القراءة: الجمع بلا تصفير يقيس منذ بدء اللعبة لا الإطار.
        /// </summary>
        public double TakeTargetMilliseconds()
        {
            double ms = (_targetTicks * 1000.0) / System.Diagnostics.Stopwatch.Frequency;
            _targetTicks = 0;
            return ms;
        }

        private long _targetTicks;

        /// <summary>مدّة نبضة المحاكاة — من الأصل أو الافتراضي (§31).</summary>
        private float SimulationStep
        {
            get { return performance != null ? performance.SimulationStep : 1f / 25f; }
        }

        /// <summary>سقف الأعداء الأحياء (§31). صفرٌ يعني بلا سقف.</summary>
        public int HordeBudget
        {
            get { return performance != null ? performance.Budget : 0; }
        }

        /// <summary>هل يتّسع المكان لعدوٍّ آخر؟ يسأله `WaveDirector` قبل الصيحة.</summary>
        public bool HasRoomForHorde
        {
            get
            {
                int budget = HordeBudget;
                return budget <= 0 || LiveHorde < budget;
            }
        }

        public void UsePerformance(Dawnkeep.Performance.PerformanceSettings value)
        {
            if (value != null)
            {
                performance = value;
            }
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
                    // «وقود الظلام» (§15): القتلُ في الظلام يزيد المكافأة.
                    // القراءة من `LightLevel` المحفوظة على الوحدة لا من الحقل
                    // الآن: القتيل قد سقط خارج النور ثمّ أُشعلت منارةٌ فوقه،
                    // وما كُسب يُحسب حيث وقع لا حيث صار.
                    int bounty = unit.Definition.Bounty;
                    if (Dawnkeep.Boons.BoonBook.Flagged(Dawnkeep.Boons.BoonFlag.DarkTithe))
                    {
                        bounty = Mathf.RoundToInt(bounty
                            * Mathf.Lerp(DarkTitheBonus, 1f, Mathf.Clamp01(unit.LightLevel)));
                    }

                    _treasury.AddBounty(bounty);
                }

                // حامل الطاعون (§12): يترك منطقة سمٍّ عند موته. هنا لأنّ هذا
                // هو الموضع الوحيد الذي يُنفَّذ **مرّةً لكل قتيل** — وسحابةٌ
                // تُترك في كل إطارٍ من إطارات جثّته تملأ الساحة.
                if (unit.Definition != null && unit.Definition.Has(UnitTrait.DeathCloud))
                {
                    HazardField hazards = HazardField.Instance;
                    if (hazards != null)
                    {
                        hazards.Place(unit.Body.position,
                            unit.Definition.TraitRange,
                            unit.Definition.TraitPower,
                            unit.Definition.TraitSeconds,
                            Faction.Kingdom, hazards.PoisonTint);
                    }
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

                if (unit.PlayerControlled)
                {
                    // البطل لا يُعاد إلى المجمّع بموته: §5 تجعله روحاً تعود.
                    // إخفاء كائنه يوقف `HeroController` فلا يعود أبداً.
                    continue;
                }

                unit.Despawn();
                _units.RemoveAt(i);
            }
        }

        /// <summary>
        /// «الصفوف المتراصّة» (§15): المتقاربون يقاومون أكثر ويتحرّكون أبطأ.
        /// المكافأة تتوقّف عند الجار الثالث: بلا سقفٍ يصير الحلّ كومةً واحدة،
        /// وهو أسوأ ما يمكن أن تعلّمه بركةٌ لدفاعٍ يُقرأ (§3).
        /// </summary>
        private void TickPacked(Unit unit, UnitDefinition def)
        {
            if (def.Faction != Faction.Kingdom
                || !Dawnkeep.Boons.BoonBook.Flagged(Dawnkeep.Boons.BoonFlag.PackedRanks))
            {
                unit.PackFactor = 1f;
                unit.PackResistance = 0f;
                return;
            }

            // ‏−1 لأنّ الوحدة نفسها في الدائرة. والسقف PackCap+1 يشمله.
            int near = CountFaction(unit.Body.position, PackRadius, Faction.Kingdom, PackCap + 1) - 1;
            if (near <= 0)
            {
                unit.PackFactor = 1f;
                unit.PackResistance = 0f;
                return;
            }

            int counted = Mathf.Min(near, PackCap);
            unit.PackResistance = PackResistancePer * counted;
            unit.PackFactor = 1f - (PackSlowPer * counted);
        }

        /// <summary>ما تبلغه مكافأة القتل في الظلام الكامل مع «وقود الظلام».</summary>
        private const float DarkTitheBonus = 1.6f;

        private const float PackRadius = 3.2f;
        private const int PackCap = 3;
        private const float PackResistancePer = 0.05f;
        private const float PackSlowPer = 0.06f;

        private void TickUnit(int index, Unit unit, float dt, float now)
        {
            UnitDefinition def = unit.Definition;
            if (def == null)
            {
                return;
            }

            // تنّين الصدع (§12): يظهر داخل الحلقة الخارجية **مع تحذير مسبق**.
            // والتحذير هو ظهورُه ساكناً ثوانيَ قبل أن يتحرّك: علامةٌ لا تحمل
            // شكل ما سيخرج ليست تحذيراً، وشكلُه واقفاً يحمله.
            if (Underground(def, unit, now))
            {
                return;
            }

            // البطل يقوده اللاعب: `HeroController` يحرّكه ويستهدف له ويضرب به.
            // تحريكه هنا أيضاً يعني إصبعاً وذكاءً اصطناعيّاً يتنازعان وحدة واحدة.
            if (unit.PlayerControlled)
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

                // قياس زمن اختيار الهدف (§31) — **مطفأ في اللعب العادي**:
                // `GetTimestamp` رخيص لكنّه ليس مجّاناً، ونداؤه مرّتين لكل
                // وحدةٍ في كل نبضة ثمنٌ يُدفع مقابل رقمٍ لا يقرؤه أحد.
                if (Measuring)
                {
                    long started = System.Diagnostics.Stopwatch.GetTimestamp();
                    unit.Target = FindTarget(index, unit, def);
                    _targetTicks += System.Diagnostics.Stopwatch.GetTimestamp() - started;
                }
                else
                {
                    unit.Target = FindTarget(index, unit, def);
                }

                // المبنى هدف احتياطي لا أصلي: يُقصد إن لم يعترض المهاجمَ مقاتلٌ،
                // أو إن كانت فئته `Structure` أصلاً. وإلّا صار الجند يتجاهلون
                // بعضهم ويضربون الحجر بينما الخصم يضربهم في ظهورهم.
                bool wantsStructure = def.TargetClass == TargetClass.Structure;
                unit.StructureTarget = (wantsStructure || unit.Target == null)
                    && unit.Faction == Faction.Horde
                    ? FindStructure(unit, def)
                    : null;

                // «الصفوف المتراصّة» (§15): تُحسب على نوبة التفكير لا في كل
                // إطار — عدُّ الجيران ستّين مرّة في الثانية لكل جنديّ يقتل
                // الإطار مقابل رقمٍ لا يتغيّر بين نبضةٍ وأخرى.
                TickPacked(unit, def);

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
            // بركات §15 على المملكة وحدها: مضاعفها على المهاجم يجعل البركة
            // تعمل لصالح من هي عليه.
            float boonSpeed = def.Faction == Faction.Kingdom
                ? Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.ArmyMoveSpeed)
                : 1f;

            float speed = desired.sqrMagnitude > 0.0001f
                ? def.MoveSpeed * unit.SpeedMultiplier * boonSpeed * unit.PackFactor
                : 0f;
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
                // راية الحشد تسرّع الضرب: الفترة تُقسَم على الزيادة (§8)
                float boonRate = def.Faction == Faction.Kingdom
                    ? Mathf.Max(0.1f,
                        Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.ArmyAttackSpeed))
                    : 1f;

                unit.NextAttack = now
                    + (def.AttackInterval / ((1f + unit.RallyAttackSpeed) * boonRate));
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

                // الطائر يتجاهل الجدران ويستهدف الأبراج أو الاقتصاد (§12).
                // تجاهلُه لها هنا لا في الحركة: لا تصادم في هذا البناء أصلاً،
                // فالجدار يوقفه بأن يكون هدفاً — ومن لا يستهدفه يمرّ فوقه.
                if (candidate.Definition != null && def.Has(UnitTrait.Flying))
                {
                    Dawnkeep.Building.BuildingRole role = candidate.Definition.Role;
                    if (role != Dawnkeep.Building.BuildingRole.Tower
                        && role != Dawnkeep.Building.BuildingRole.Economy)
                    {
                        continue;
                    }
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
                    structure.TakeDamage(Strength(unit, def));
                }

                return;
            }

            if (aimKeep)
            {
                if (unit.Animator.AttackLandedThisFrame && _keep != null)
                {
                    _keep.TakeDamage(Strength(unit, def));
                }

                return;
            }

            if (target == null || !target.Alive)
            {
                return;
            }

            if (!def.Ranged && unit.Animator.AttackLandedThisFrame)
            {
                target.TakeDamageFrom(Strength(unit, def), 0f, unit.Body.position);
                return;
            }

            if (def.Ranged && unit.Animator.ShotReleasedThisFrame && _projectiles != null)
            {
                Vector3 from = unit.Body.position + (Vector3.up * 1.35f);
                _projectiles.Fire(from, target, Strength(unit, def), def.ProjectileSpeed);
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
