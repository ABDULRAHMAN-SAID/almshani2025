using System.Collections.Generic;
using Dawnkeep.Combat;
using Dawnkeep.Economy;
using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>
    /// يقود المباني كلّها في حلقة واحدة: رمي الأبراج، وهدم المهدوم، ودفعة الفجر.
    ///
    /// مسؤوليته البناء وحده. القتال في `CombatDirector`، والنور في `LightField`،
    /// والفضّة في `Treasury` — لا `GameManager` يجمعها (§1).
    ///
    /// الأبراج ترمي عبر `ProjectilePool` نفسه الذي يرمي به الرماة: سهم واحد
    /// مجمّع لكل الرماة في الساحة، لا مجمّع لكل برج.
    /// </summary>
    [DisallowMultipleComponent]
    public class BuildingDirector : MonoBehaviour
    {
        public static BuildingDirector Instance { get; private set; }

        [Tooltip("ارتفاع فوهة البرج عن قاعدته، بالمتر.")]
        [SerializeField] private float muzzleHeight = 8.6f;

        [Tooltip("كل المباني المتاحة. البطاقات تُنتقى منها بحسب نوع العقدة (§10).")]
        [SerializeField] private BuildingDefinition[] catalogue = new BuildingDefinition[0];

        private readonly List<BuildNode> _nodes = new List<BuildNode>(32);
        private readonly List<Building> _buildings = new List<Building>(32);

        private CombatDirector _combat;
        private ProjectilePool _projectiles;
        private Treasury _treasury;
        private WaveDirector _waves;
        private Keep _keep;
        private uint _seed = 20260215u;
        private int _lastPaidWave = -1;
        private int _shownTier = -1;

        public IReadOnlyList<BuildNode> Nodes { get { return _nodes; } }

        /// <summary>كم مبنىً سقط هذه الجولة — تقرؤه نجمةُ §21.</summary>
        public int Lost { get; private set; }

        /// <summary>كتالوج المباني — تقرؤه لوحة البطاقات.</summary>
        public BuildingDefinition[] Catalogue { get { return catalogue; } }

        public IReadOnlyList<Building> Buildings { get { return _buildings; } }

        /// <summary>مجموع دخل الفجر من كل المباني الاقتصادية القائمة.</summary>
        public int DawnIncome
        {
            get
            {
                int total = 0;
                for (int i = 0; i < _buildings.Count; i++)
                {
                    Building building = _buildings[i];
                    if (building != null && building.Alive && building.Definition != null)
                    {
                        total += building.Definition.DawnIncome;
                    }
                }

                return total;
            }
        }

        private void Awake()
        {
            Instance = this;
        }

        private void Start()
        {
            _combat = CombatDirector.Instance;
            _projectiles = GetComponent<ProjectilePool>();
            _treasury = Treasury.Instance;
            _waves = GetComponent<WaveDirector>();
            _keep = Keep.Instance;

            // العقد الموضوعة في المشهد قد سبقت هذا الكائن في الإيقاظ
            BuildNode[] placed = FindObjectsByType<BuildNode>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            for (int i = 0; i < placed.Length; i++)
            {
                RegisterNode(placed[i]);
            }

            // والمباني الموضوعة في المشهد يدوياً كذلك: `Place` وحدها كانت
            // تُدخل المبنى في القائمة، فمبنىً وُضع في مشهدٍ (ساحة قياسٍ أو
            // مشهدِ تجريب) يقف صامتاً ولا يرمي — وهو عطبٌ لا يُرى إلّا بعدّ
            // المقذوفات.
            Building[] standing = FindObjectsByType<Building>(
                FindObjectsInactive.Exclude, FindObjectsSortMode.None);

            for (int i = 0; i < standing.Length; i++)
            {
                Adopt(standing[i]);
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>
        /// يضمّ مبنىً قائماً إلى الحلقة إن لم يكن فيها. لا يبنيه ولا يخصم
        /// ثمنه: هو موضوعٌ سلفاً، والمطلوب أن يعمل لا أن يُشترى.
        /// </summary>
        public void Adopt(Building building)
        {
            if (building == null || _buildings.Contains(building))
            {
                return;
            }

            _buildings.Add(building);
        }

        public void RegisterNode(BuildNode node)
        {
            if (node != null && !_nodes.Contains(node))
            {
                _nodes.Add(node);
            }
        }

        public void UnregisterNode(BuildNode node)
        {
            _nodes.Remove(node);
        }

        private void Update()
        {
            float now = Time.time;

            for (int i = _buildings.Count - 1; i >= 0; i--)
            {
                Building building = _buildings[i];
                if (building == null)
                {
                    _buildings.RemoveAt(i);
                    continue;
                }

                if (!building.Alive)
                {
                    // يُعَدّ هنا لا في `Building`: هذا هو الموضع الوحيد الذي
                    // يمرّ به كل ساقط **مرّةً واحدة** (§21: نجمةُ «لم يسقط
                    // لك مبنى»). والعدُّ في المبنى يعني عدّاداً في كلٍّ.
                    Lost++;
                    _buildings.RemoveAt(i);
                    building.Remove();
                    continue;
                }

                if (building.Raising)
                {
                    continue;
                }

                if (building.Definition.Role == BuildingRole.Tower)
                {
                    TickTower(building, now);
                }
                else if (building.Definition.Role == BuildingRole.Support)
                {
                    TickWorkshop(building, now);
                }
            }

            PayAtDawn();
            RefreshLocks();
        }

        /// <summary>
        /// ترقية قلب الحصن تفتح عقداً، فتُوائم علاماتها. مرّة عند التغيّر لا
        /// في كل إطار: مرورٌ على ست عشرة عقدة ستّين مرّة في الثانية بلا سبب.
        /// </summary>
        private void RefreshLocks()
        {
            if (_keep == null)
            {
                _keep = Keep.Instance;
                if (_keep == null)
                {
                    return;
                }
            }

            if (_keep.Tier == _shownTier)
            {
                return;
            }

            _shownTier = _keep.Tier;
            for (int i = 0; i < _nodes.Count; i++)
            {
                if (_nodes[i] != null)
                {
                    _nodes[i].RefreshMarker();
                }
            }
        }

        /// <summary>
        /// دفعة الفجر تُصرف **مرّة لكل موجة**: الطور يبقى استراحةً ثواني، فبلا
        /// حارس رقم الموجة تُصرف الدفعة في كل إطار منها.
        /// </summary>
        private void PayAtDawn()
        {
            if (_waves == null || _treasury == null)
            {
                return;
            }

            if (_waves.Phase != WavePhase.Respite || _waves.WaveNumber == _lastPaidWave)
            {
                return;
            }

            _lastPaidWave = _waves.WaveNumber;
            _treasury.PayDawn(_waves.WaveNumber, DawnIncome);
        }

        /// <summary>ما يبطئه «حجر الجمر» من إطلاق القاذف (§15).</summary>
        private const float BurningStonesRate = 0.78f;

        /// <summary>برج يرمي: يبحث عن هدف في مداه ويُطلق على فترته.</summary>
        private void TickTower(Building building, float now)
        {
            if (now < building.NextShot || _combat == null || _projectiles == null)
            {
                return;
            }

            BuildingDefinition def = building.Definition;
            Unit target = FindTarget(building, def);
            if (target == null)
            {
                return;
            }

            // بركات §15 على البرج: سرعة الإطلاق والضرر. و«حجر الجمر» يبطئ
            // القاذف عمداً — الثمن جزءٌ من البركة لا أثرٌ جانبيّ.
            float rate = Mathf.Max(0.1f,
                Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.TowerFireRate));

            if (Dawnkeep.Boons.BoonBook.Flagged(Dawnkeep.Boons.BoonFlag.BurningStones)
                && def.Effect == ProjectileEffect.Splash)
            {
                rate *= BurningStonesRate;
            }

            building.NextShot = now + (1f / Mathf.Max(0.05f, def.ShotsPerSecond * rate));

            float damage = def.Damage
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.TowerDamage);

            Vector3 muzzle = building.Body.position + (Vector3.up * muzzleHeight);
            _projectiles.Fire(muzzle, target, damage, 46f, def.Effect);
        }

        /// <summary>
        /// الورشة تصلح جيرانها الجرحى (§10). **الجرحى وحدهم**: إصلاح مبنىً
        /// سليم يُهدر النوبة ويترك الجريح ينهار وهو في مداها.
        /// </summary>
        private void TickWorkshop(Building workshop, float now)
        {
            if (now < workshop.NextShot)
            {
                return;
            }

            BuildingDefinition def = workshop.Definition;
            workshop.NextShot = now + Mathf.Max(0.25f, def.RepairInterval);

            if (def.RepairAmount <= 0f)
            {
                return;
            }

            // قفّاز المهندس (§17): «يقوّي الإصلاح». والقوّة **من القطعة** لا
            // رقماً هنا: `Shape` في تعريف القفّاز هو مضاعف الإصلاح، فتُبدَّل
            // قوّته من المفتّش لا من الشيفرة (§1).
            float mend = def.RepairAmount;
            if (Dawnkeep.Equipment.Loadout.Shape() == Dawnkeep.Equipment.WeaponKind.EngineerGauntlet)
            {
                Dawnkeep.Equipment.Loadout loadout = Dawnkeep.Equipment.Loadout.Instance;
                Dawnkeep.Equipment.EquipmentDefinition gauntlet =
                    loadout != null ? loadout.Weapon : null;

                if (gauntlet != null)
                {
                    mend *= Mathf.Max(1f, gauntlet.Shape);
                }
            }

            Vector3 centre = workshop.Body.position;
            float rangeSqr = def.RepairRange * def.RepairRange;
            int healed = 0;

            for (int i = 0; i < _buildings.Count && healed < def.RepairTargets; i++)
            {
                Building other = _buildings[i];
                if (other == null || other == workshop || !other.Alive)
                {
                    continue;
                }

                // «الحصاد الأخير» (§15): المزارع تنتج أكثر ولا تُصلَح. ثمنها
                // هنا لا في مصلحٍ آخر — الورشة هي الإصلاح كلّه في هذا البناء،
                // فاستثناؤها منها هو الثمن الذي وعدت به البركة.
                if (other.Definition != null
                    && other.Definition.Role == BuildingRole.Economy
                    && Dawnkeep.Boons.BoonBook.Flagged(Dawnkeep.Boons.BoonFlag.FinalHarvest))
                {
                    continue;
                }

                Vector3 delta = other.Body.position - centre;
                delta.y = 0f;
                if (delta.sqrMagnitude > rangeSqr)
                {
                    continue;
                }

                if (other.Repair(mend))
                {
                    healed++;
                }
            }
        }

        /// <summary>
        /// أقرب مهاجم داخل المدى وخارج المدى الأدنى.
        /// المرور على الوحدات مباشرةً لا عبر شبكة التجزئة: الأبراج عشرات لا
        /// مئات، وفترة رميها ثانية — فبناء استعلام لكلٍّ منها عملٌ أكثر من
        /// ثمرته.
        /// </summary>
        private Unit FindTarget(Building building, BuildingDefinition def)
        {
            IReadOnlyList<Unit> units = _combat.Units;
            Vector3 position = building.Body.position;

            // مدى البرج بعد بركة §15 وزيادة النور (§11) وعاصفة المنطقة (§19)
            float reach = def.Range
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.TowerRange)
                * Dawnkeep.Campaign.CampaignDirector.TowerRange();

            float rangeSqr = reach * reach;
            float minSqr = def.MinimumRange * def.MinimumRange;

            Unit best = null;
            float bestScore = float.MaxValue;

            for (int i = 0; i < units.Count; i++)
            {
                Unit unit = units[i];
                if (unit == null || !unit.Alive || unit.Faction != Faction.Horde)
                {
                    continue;
                }

                Vector3 delta = unit.Body.position - position;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr > rangeSqr || distSqr < minSqr)
                {
                    continue;
                }

                float score = distSqr;
                UnitDefinition unitDef = unit.Definition;
                if (unitDef != null && def.TargetClass == TargetClass.Ranged && unitDef.Ranged)
                {
                    score *= 0.35f;
                }

                if (score < bestScore)
                {
                    bestScore = score;
                    best = unit;
                }
            }

            return best;
        }

        // ── البناء والبيع ───────────────────────────────────────────────────

        /// <summary>
        /// ثمن مبنىً بعد بركات §15. **مكانٌ واحد للحساب**: الثمن يُقرأ في
        /// الخصم وفي `Raise` وفي بطاقة اللوحة، ولو حُسب في كلٍّ على حدة لَبيع
        /// المبنى يوماً بأكثر ممّا دُفع فيه.
        /// </summary>
        public static int CostOf(BuildingDefinition definition)
        {
            if (definition == null)
            {
                return 0;
            }

            return Mathf.Max(0, Mathf.RoundToInt(definition.Cost
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.BuildCost)));
        }

        /// <summary>
        /// يقيم مبنى على عقدة خالية بعد خصم ثمنه. يعيد null إن لم تكفِ الفضّة
        /// أو كانت العقدة مشغولة أو لا تقبل هذا الصنف.
        /// </summary>
        public Building Place(BuildNode node, BuildingDefinition definition)
        {
            if (node == null || definition == null || !node.IsEmpty || !node.Unlocked)
            {
                return null;
            }

            if (!definition.Fits(node.Kind))
            {
                return null;
            }

            // المرحلة الاقتصادية (§19): لا أبراجَ قبل ليلتها. هنا لا في
            // اللوحة وحدها — اللوحة تُخفيها، وهذا يمنعها من أيّ طريقٍ آخر.
            if (definition.Role == BuildingRole.Tower
                && !Dawnkeep.Campaign.StageRules.TowersOpen)
            {
                return null;
            }

            if (_treasury == null)
            {
                _treasury = Treasury.Instance;
            }

            int price = PriceOf(definition);
            if (_treasury == null || !_treasury.Spend(price))
            {
                return null;
            }

            Consume(definition);

            // لا جاهزة: المبنى يبني شكله بالكود من تعريفه، فجاهزةٌ فارغة تُحفظ
            // في الأصول لا تضيف إلّا ملفّاً يُنسى تحديثه.
            GameObject go = new GameObject("Building_" + definition.name);
            go.transform.SetParent(transform, false);
            go.transform.position = node.Position;

            Building building = go.AddComponent<Building>();

            building.Raise(definition, node, price, NextSeed());
            node.Attach(building);
            _buildings.Add(building);

            SpawnGuards(building, definition);
            EnsureBeacon(building, definition);
            return building;
        }

        /// <summary>
        /// يقيم مبنىً **بلا ثمن**: هبةُ المرحلة (§19) لا شراءُ اللاعب. تمرّ
        /// بالطريق نفسه بعد الخصم — فالحرّاس والمنارة والتسجيل واحدٌ، ولا
        /// يفترق المُهدى عن المشترى في شيءٍ إلّا في ثمنه.
        /// </summary>
        public Building Grant(BuildNode node, BuildingDefinition definition)
        {
            if (node == null || definition == null || !node.IsEmpty
                || !definition.Fits(node.Kind))
            {
                return null;
            }

            GameObject go = new GameObject("Building_" + definition.name);
            go.transform.SetParent(transform, false);
            go.transform.position = node.Position;

            Building building = go.AddComponent<Building>();

            // بثمنٍ صفر: البيع يردّ نسبةً ممّا دُفع، ومن لم يدفع لا يُردّ له
            building.Raise(definition, node, 0, NextSeed());
            node.Attach(building);
            _buildings.Add(building);

            SpawnGuards(building, definition);
            EnsureBeacon(building, definition);
            return building;
        }

        // ── خصومات العقيدة (§18) ────────────────────────────────────────────
        //
        // «الحجر أوّلاً» و«أوّل برج»: خصمٌ على **أوّل ما يُبنى** لا على كل ما
        // يُبنى. وعدُّ ما استُهلك هنا لا في البطاقة: البطاقة بيانٌ خالص،
        // والعدّاد حالُ جولةٍ يُمحى بإعادتها.

        /// <summary>كم جداراً بقي من خصم «الحجر أوّلاً».</summary>
        private int _cheapWallsLeft = -1;

        /// <summary>كم برجاً بقي من خصم «أوّل برج».</summary>
        private int _freeTowersLeft = -1;

        private void EnsureDiscounts()
        {
            if (_cheapWallsLeft >= 0)
            {
                return;
            }

            _cheapWallsLeft = Dawnkeep.Doctrine.DoctrineBook.Opening(
                Dawnkeep.Doctrine.DoctrineOpening.CheapFirstWalls);

            _freeTowersLeft = Dawnkeep.Doctrine.DoctrineBook.Opening(
                Dawnkeep.Doctrine.DoctrineOpening.FreeFirstTower);
        }

        /// <summary>
        /// الثمن الذي **يدفعه اللاعب فعلاً**: ثمن §10 بعد خصم العقيدة.
        /// تقرؤه بطاقة اللوحة كما يقرؤه الخصم — لو عرضت البطاقة الثمن
        /// الكامل بينما يُخصَم النصف، رأى اللاعب بطاقةً حمراء لا يملك ثمنها
        /// وهو يملكه.
        /// </summary>
        public static int PriceOf(BuildingDefinition definition)
        {
            int price = CostOf(definition);
            BuildingDirector director = Instance;
            return director != null ? director.Discounted(definition, price) : price;
        }

        /// <summary>ثمنٌ بعد خصم العقيدة، إن بقي منه شيء.</summary>
        private int Discounted(BuildingDefinition definition, int price)
        {
            EnsureDiscounts();

            if (definition.Role == BuildingRole.Wall && _cheapWallsLeft > 0)
            {
                return Mathf.Max(0, Mathf.RoundToInt(price * 0.5f));
            }

            if (definition.Role == BuildingRole.Tower && _freeTowersLeft > 0)
            {
                return 0;
            }

            return price;
        }

        /// <summary>
        /// يستهلك خصمةً بعد نجاح الدفع. **بعده لا قبله**: لو نقص الرصيد عن
        /// الثمن المخفَّض ما بُني شيء، فاستهلاكُ الخصم حينها يضيّعه هدراً.
        /// </summary>
        private void Consume(BuildingDefinition definition)
        {
            if (definition.Role == BuildingRole.Wall && _cheapWallsLeft > 0)
            {
                _cheapWallsLeft--;
            }
            else if (definition.Role == BuildingRole.Tower && _freeTowersLeft > 0)
            {
                _freeTowersLeft--;
            }
        }

        /// <summary>يرقّي مبنى قائماً إلى أحد فروعه بعد خصم فرق الثمن.</summary>
        public bool Upgrade(Building building, BuildingDefinition into)
        {
            if (building == null || !building.Alive || into == null)
            {
                return false;
            }

            if (_treasury == null)
            {
                _treasury = Treasury.Instance;
            }

            int price = CostOf(into);
            if (_treasury == null || !_treasury.Spend(price))
            {
                return false;
            }

            building.UpgradeTo(into, price, NextSeed());
            SpawnGuards(building, into);
            EnsureBeacon(building, into);
            return true;
        }

        /// <summary>
        /// يبيع مبنى ويعيد 70% من إجمالي ما دُفع فيه (§10). يعيد ما استُردّ،
        /// أو صفراً إن رُفض البيع.
        /// </summary>
        public int Sell(Building building)
        {
            if (building == null || !building.Alive)
            {
                return 0;
            }

            if (_treasury == null)
            {
                _treasury = Treasury.Instance;
            }

            if (_treasury == null)
            {
                return 0;
            }

            int back = _treasury.Refund(building.TotalPaid);
            _buildings.Remove(building);
            building.Remove();
            return back;
        }

        /// <summary>هل يُسمح بالبناء والبيع الآن؟ (§10: في التخطيط وحده)</summary>
        public bool CanBuildNow
        {
            get
            {
                return _waves == null || _waves.CanHasten || _waves.Phase == WavePhase.Idle;
            }
        }

        /// <summary>
        /// حرّاس الثكنة: يخرجون مرابطين حول مبناهم لا سائرين على مسار.
        /// `Awaken` هي التي تثبّت موضع المرابطة، فتعود الحامية إلى بابها.
        /// </summary>
        private void SpawnGuards(Building building, BuildingDefinition definition)
        {
            if (definition.Role != BuildingRole.Garrison || definition.Guard == null
                || definition.GuardCount <= 0 || definition.Guard.Prefab == null)
            {
                return;
            }

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            // كل ثكنة فرقة (§9): قرارٌ واحد يقود جندها لا قرارٌ لكل فرد
            Squads.Squad squad = building.GetComponent<Squads.Squad>();
            if (squad == null)
            {
                squad = building.gameObject.AddComponent<Squads.Squad>();
            }

            squad.Clear();
            squad.SetPost(building.Body.position);

            for (int i = 0; i < definition.GuardCount; i++)
            {
                float angle = (float)i / definition.GuardCount * Mathf.PI * 2f;
                Vector3 at = building.Body.position
                    + new Vector3(Mathf.Cos(angle) * 5.2f, 0f, Mathf.Sin(angle) * 5.2f);
                at.y = GroundHeight(at.x, at.z, building.Body.position.y);

                GameObject go = Instantiate(definition.Guard.Prefab, at,
                    Quaternion.Euler(0f, angle * Mathf.Rad2Deg, 0f), transform);

                Unit unit = go.GetComponent<Unit>();
                if (unit == null)
                {
                    unit = go.AddComponent<Unit>();
                }

                unit.SetDefinition(definition.Guard);
                unit.Awaken();
                building.AddGuard(unit);
                squad.Enlist(unit);

                if (_combat != null)
                {
                    _combat.Register(unit);
                }
            }
        }

        /// <summary>
        /// منارة الفجر كمبنى (§10): يحمل الكائنُ نفسه مكوّنَ `Beacon`، فيبني
        /// عمودها ودائرتها بنفسه ويسجّل نفسه في حقل النور.
        ///
        /// المكوّن يُعاد ضبطه لا يُضاف ثانيةً عند الترقية: `DisallowMultiple`
        /// يمنع الثاني، والشحنات هي ما يتغيّر.
        /// </summary>
        private void EnsureBeacon(Building building, BuildingDefinition definition)
        {
            Dawnkeep.Light.Beacon beacon = building.GetComponent<Dawnkeep.Light.Beacon>();

            if (definition.Role != BuildingRole.Beacon)
            {
                if (beacon != null)
                {
                    // رُقّي إلى دور آخر: تُطوى المنارة بما بنته لا مكوّنها وحده
                    beacon.Teardown();
                    Destroy(beacon);
                }

                return;
            }

            Dawnkeep.Light.LightField field = Dawnkeep.Light.LightField.Instance;

            if (beacon == null)
            {
                beacon = building.gameObject.AddComponent<Dawnkeep.Light.Beacon>();
            }

            beacon.Configure(field != null ? field.Settings : null, definition.LightCharges);
            beacon.Fix();

            if (field != null)
            {
                field.Register(beacon);
            }
        }

        private static float GroundHeight(float x, float z, float fallback)
        {
            Terrain terrain = Terrain.activeTerrain;
            if (terrain == null)
            {
                return fallback;
            }

            return terrain.SampleHeight(new Vector3(x, 0f, z)) + terrain.transform.position.y;
        }

        /// <summary>بذرة مختلفة لكل مبنى فلا يتكرّر ميله وتفاصيله حرفياً.</summary>
        private uint NextSeed()
        {
            _seed = (_seed * 1664525u) + 1013904223u;
            return _seed;
        }
    }
}
