using System.Collections.Generic;
using UnityEngine;
using Dawnkeep.Building;
using Dawnkeep.Combat;
using Dawnkeep.Light;

// `Dawnkeep.Building` اسم فضاءٍ، وفيه صنفٌ اسمه `Building` أيضاً. الاسم
// المستعار يفصلهما، فلا يقرأ المترجم ولا القارئ أحدَهما مكان الآخر.
using Keeping = Dawnkeep.Keeping;

namespace Dawnkeep.Bosses
{
    /// <summary>
    /// أطوار الزعماء الأربعة (§13) في **حلقة واحدة**.
    ///
    /// لا `Update` في `Boss` ولا في البيضة ولا في البركة: زعيمان في الساحة
    /// وعشرون بيضة وبِركة يعني اثنتين وعشرين حلقة إطار مقابل حلقةٍ واحدة هنا
    /// — والقاعدة من §1 لا اجتهاد.
    ///
    /// وكل زعيم يقرأ فرعه وحده. الفروع أربعة لا شجرة قرار عامّة: أطوارهم لا
    /// تشترك في شيء إلا أنّها أطوار، وتعميمها يصنع تجريداً بلا مستفيد.
    /// </summary>
    [DisallowMultipleComponent]
    public class BossDirector : MonoBehaviour
    {
        public static BossDirector Instance { get; private set; }

        [Tooltip("جاهزة البيضة المجمَّعة. تُملأ من باني المشهد.")]
        [SerializeField] private GameObject eggPrefab;

        [Tooltip("قائد الموجات — منه يستدعي الزعيم حاشيته من مجمّعاتها.")]
        [SerializeField] private WaveDirector waves;

        [Tooltip("لقطة الظهور (§6). فارغاً يدخل الزعيم بلا لقطة.")]
        [SerializeField] private BossIntro intro;

        private readonly List<Boss> _bosses = new List<Boss>(4);
        private readonly List<BossEgg> _eggs = new List<BossEgg>(16);
        private readonly List<Keeping> _marked = new List<Keeping>(4);

        private readonly Unit[] _scan = new Unit[64];
        private CombatDirector _combat;
        private BuildingDirector _buildings;
        private LightField _light;
        private Transform _root;

        /// <summary>المباني الموسومة الآن — تقرؤها الواجهة لترسم العلامة.</summary>
        public IReadOnlyList<Keeping> Marked { get { return _marked; } }

        /// <summary>الزعماء في الساحة — للواجهة ولشريط صحّتهم.</summary>
        public IReadOnlyList<Boss> Bosses { get { return _bosses; } }

        public void Configure(WaveDirector director, GameObject egg, BossIntro shot)
        {
            waves = director != null ? director : waves;
            eggPrefab = egg != null ? egg : eggPrefab;
            intro = shot != null ? shot : intro;
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

        /// <summary>يُدخل زعيماً الساحة. يُستدعى من `WaveDirector` عند خروجه.</summary>
        public void Register(Boss boss)
        {
            if (boss == null || _bosses.Contains(boss))
            {
                return;
            }

            boss.Enter();
            _bosses.Add(boss);
            Remember(boss);

            // تسخين البيوض **عند دخول الزعيم** لا عند أوّل وضعة (§31): أوّل
            // وضعةٍ تقع في ذروة الاشتباك، وتوليدُ ستّ بيضاتٍ فيها قفزةُ إطار.
            // ولا تُسخَّن عند الإقلاع: زعيمٌ لا يبيض قد لا يخرج أصلاً.
            if (boss.Definition != null && boss.Definition.EggCount > 0)
            {
                Prewarm(boss.Definition.EggCount);
            }

            if (intro != null && boss.Definition != null)
            {
                intro.Play(boss);
                boss.IntroShown = true;
            }
        }

        /// <summary>
        /// يسجّل لقاء الزعيم في كتلة الحملة (§27). **عند الظهور لا عند
        /// القتل**: «لُقُوا» لا «قُتلوا»، ومن رآه ثمّ خسر قد رآه.
        /// </summary>
        private static void Remember(Boss boss)
        {
            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save == null || boss.Definition == null)
            {
                return;
            }

            string key = boss.Definition.name;
            if (save.Data.Campaign.BossesMet.Contains(key))
            {
                return;
            }

            save.Data.Campaign.BossesMet.Add(key);
            save.Mark();
        }

        public void Unregister(Boss boss)
        {
            _bosses.Remove(boss);
        }

        private void Update()
        {
            float now = Time.time;
            float dt = Time.deltaTime;

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            if (_buildings == null)
            {
                _buildings = BuildingDirector.Instance;
            }

            if (_light == null)
            {
                _light = LightField.Instance;
            }

            TickBosses(now, dt);
            TickEggs(now);
        }

        private void TickBosses(float now, float dt)
        {
            for (int i = _bosses.Count - 1; i >= 0; i--)
            {
                Boss boss = _bosses[i];

                // الفحص بـ`== null` وحده لا يكشف كائناً هُدم: Unity تُبقي
                // المرجع حيّاً بعد `Destroy`، فالوصول إليه يرمي.
                if (boss == null || boss.Unit == null)
                {
                    _bosses.RemoveAt(i);
                    continue;
                }

                if (!boss.Unit.Alive)
                {
                    Depart(boss);
                    _bosses.RemoveAt(i);
                    continue;
                }

                BossDefinition def = boss.Definition;
                if (def == null)
                {
                    continue;
                }

                switch (def.Kind)
                {
                    case BossKind.BellRam: TickBellRam(boss, def, now, dt); break;
                    case BossKind.MireMatron: TickMatron(boss, def, now); break;
                    case BossKind.AshCrown: TickAshCrown(boss, def, now); break;
                    case BossKind.EaterOfDawn: TickEater(boss, def, now, dt); break;
                }
            }
        }

        /// <summary>ما يُترك عند موت الزعيم: النور يعود، والعلامات تُرفع.</summary>
        private void Depart(Boss boss)
        {
            if (boss == null || boss.Definition == null)
            {
                return;
            }

            if (boss.Definition.Kind == BossKind.EaterOfDawn && _light != null)
            {
                _light.RadiusMultiplier = 1f;
            }

            // إعادة اختيار البركة تُكسب بقتل زعيم (§15: «من اللعب وليس
            // إعلاناً»). واحدةٌ للمرحلة: الثاني لا يزيدها لأنّها لا تُخزَّن.
            Dawnkeep.Boons.BoonDealer dealer = Dawnkeep.Boons.BoonDealer.Instance;
            if (dealer != null)
            {
                dealer.EarnReroll();
            }

            // العلامة تُرفع بموت واضعتها وحدها: مسحُها عند موت أيّ زعيم يُطفئ
            // علامات أمّ المستنقع وهي حيّة في الساحة نفسها.
            if (boss.Definition.Kind == BossKind.MireMatron)
            {
                _marked.Clear();
            }
        }

        // ── كبش الجرس ───────────────────────────────────────────────────────

        /// <summary>
        /// اندفاعٌ بخطٍّ مستقيم بعد إنذار ١٫٤ ث (§13). الاتّجاه يُثبَّت **لحظة
        /// الإنذار** لا لحظة الانطلاق: إنذارٌ يتبع اللاعب ليس إنذاراً، والتفادي
        /// هو كل ما في هذه القدرة.
        /// </summary>
        private void TickBellRam(Boss boss, BossDefinition def, float now, float dt)
        {
            Summoning(boss, def, now);

            if (now < boss.ChargeUntil)
            {
                Charge(boss, def, dt);
                return;
            }

            if (boss.TelegraphUntil > 0f && now >= boss.TelegraphUntil)
            {
                boss.TelegraphUntil = 0f;

                // النور يصعقه: ثلاث شحنات توقف الاندفاع قبل أن يبدأ (§13).
                // الفحص هنا لا عند الإنذار — وإلّا لما نفع إشعال المنارة بعده،
                // وهي النافذة التي يعطيها الإنذار للّاعب أصلاً.
                if (_light != null && _light.ChargesAt(boss.Body.position) >= def.ChargeStopCharges)
                {
                    boss.Unit.ApplySlow(0.45f, 2.5f);
                    boss.NextAbility = now + def.ChargeInterval;
                    return;
                }

                boss.ChargeUntil = now + (def.ChargeRange / Mathf.Max(1f, def.ChargeSpeed));
                boss.ChargeLeft = def.ChargeRange;
                return;
            }

            if (boss.TelegraphUntil <= 0f && now >= boss.NextAbility)
            {
                boss.TelegraphUntil = now + def.TelegraphSeconds;
                boss.NextAbility = now + def.ChargeInterval + def.TelegraphSeconds;
                boss.ChargeDirection = Heading(boss);
            }
        }

        private void Charge(Boss boss, BossDefinition def, float dt)
        {
            float step = def.ChargeSpeed * dt;
            if (step > boss.ChargeLeft)
            {
                step = boss.ChargeLeft;
            }

            boss.ChargeLeft -= step;
            Vector3 to = boss.Body.position + (boss.ChargeDirection * step);
            to.y = Ground(to.x, to.z, boss.Body.position.y);
            boss.Body.position = to;

            // أوّل جدار في الخطّ يأخذ الضربة كاملةً ثمّ تقف الاندفاعة: كبشٌ
            // يمرّ بالجدار الأوّل إلى الثاني يجعل الجدران بلا معنى.
            Keeping wall = WallAhead(boss, def);
            if (wall != null)
            {
                wall.TakeDamage(def.ChargeDamage);
                boss.ChargeUntil = 0f;
                boss.ChargeLeft = 0f;
                return;
            }

            Trample(boss, def);
        }

        private void Trample(Boss boss, BossDefinition def)
        {
            if (_combat == null)
            {
                return;
            }

            int found = _combat.QueryFaction(boss.Body.position, def.Bulk + 1.4f,
                Faction.Kingdom, _scan);

            for (int i = 0; i < found; i++)
            {
                Unit unit = _scan[i];
                if (unit != null && unit.Alive)
                {
                    unit.TakeDamage(def.ChargeTrample * Time.deltaTime * 4f);
                }
            }
        }

        private Keeping WallAhead(Boss boss, BossDefinition def)
        {
            if (_buildings == null)
            {
                return null;
            }

            IReadOnlyList<Keeping> all = _buildings.Buildings;
            float reach = def.Bulk + 2.2f;

            for (int i = 0; i < all.Count; i++)
            {
                Keeping building = all[i];
                if (building == null || !building.Alive || building.Definition == null)
                {
                    continue;
                }

                if (building.Definition.Role != BuildingRole.Wall)
                {
                    continue;
                }

                Vector3 delta = building.Body.position - boss.Body.position;
                delta.y = 0f;
                if (delta.sqrMagnitude <= reach * reach)
                {
                    return building;
                }
            }

            return null;
        }

        // ── الاستدعاء المشترك (كبش الجرس وآكل الفجر) ─────────────────────────

        private void Summoning(Boss boss, BossDefinition def, float now)
        {
            if (def.Summon == null || def.SummonCount <= 0)
            {
                return;
            }

            if (!boss.SummoningBegun)
            {
                if (boss.HealthFraction > def.SummonAtHealth)
                {
                    return;
                }

                boss.SummoningBegun = true;
                boss.NextSecond = now;      // أوّل استدعاء فور بلوغ العتبة
            }

            if (now < boss.NextSecond)
            {
                return;
            }

            boss.NextSecond = now + def.SummonInterval;
            if (waves != null)
            {
                waves.SummonAt(def.Summon, boss.Body.position, def.Bulk + 2.6f,
                    def.SummonCount, boss.Side);
            }
        }

        // ── أمّ المستنقع ─────────────────────────────────────────────────────

        private void TickMatron(Boss boss, BossDefinition def, float now)
        {
            if (now >= boss.NextAbility)
            {
                boss.NextAbility = now + def.PoolInterval;
                SpawnPool(boss.Body.position, def);
            }

            if (now >= boss.NextSecond)
            {
                boss.NextSecond = now + def.EggInterval;
                LayEggs(boss, def);
                Mark(def);
            }
        }

        /// <summary>
        /// بركة السمّ من **حقل الأخطار المشترك** لا من مجمّعٍ خاصّ: هي ونارُ
        /// «حجر الجمر» (§15) شيءٌ واحد بلونين وضحيّتين.
        /// </summary>
        private void SpawnPool(Vector3 at, BossDefinition def)
        {
            HazardField hazards = HazardField.Instance;
            if (hazards == null)
            {
                return;
            }

            hazards.Place(at, def.PoolRadius, def.PoolDamage, def.PoolSeconds,
                Faction.Kingdom, hazards.PoisonTint);
        }

        private void LayEggs(Boss boss, BossDefinition def)
        {
            for (int i = 0; i < def.EggCount; i++)
            {
                BossEgg egg = TakeEgg();
                if (egg == null)
                {
                    return;
                }

                float angle = (i / Mathf.Max(1f, def.EggCount)) * Mathf.PI * 2f;
                float reach = def.Bulk + 4.5f;
                Vector3 place = boss.Body.position
                    + new Vector3(Mathf.Cos(angle) * reach, 0f, Mathf.Sin(angle) * reach);
                place.y = Ground(place.x, place.z, boss.Body.position.y);
                egg.Place(place, def.EggHealth, def.EggHatchSeconds, def.Summon, def.EggBrood);
            }
        }

        /// <summary>
        /// تَسِم مبنيين اقتصاديّين بعلامة ظاهرة (§13). الاقتصاد لا الأبراج:
        /// وسمُ برجٍ يقول للّاعب «دافع عن دفاعك»، ووسمُ مزرعةٍ يجبره على
        /// اختيارٍ بين ما يحميه وما يكسبه — وهو ركيزة §3 الأولى.
        /// </summary>
        private void Mark(BossDefinition def)
        {
            _marked.Clear();
            if (_buildings == null)
            {
                return;
            }

            IReadOnlyList<Keeping> all = _buildings.Buildings;
            for (int i = 0; i < all.Count && _marked.Count < def.MarkCount; i++)
            {
                Keeping building = all[i];
                if (building == null || !building.Alive || building.Definition == null)
                {
                    continue;
                }

                if (building.Definition.Role == BuildingRole.Economy)
                {
                    _marked.Add(building);
                }
            }
        }

        // ── تاج الرماد ──────────────────────────────────────────────────────

        /// <summary>
        /// طوران يتناوبان: جسديّ يُجرح كغيره، وظلٌّ لا يتلقّى ضرراً كاملاً
        /// **خارج النور** (§13). فالنور هو المفتاح لا السلاح، وهذا ما يجعل
        /// جرّه إلى دائرة منارة قراراً لا زينة.
        /// </summary>
        private void TickAshCrown(Boss boss, BossDefinition def, float now)
        {
            if (now >= boss.NextAbility)
            {
                boss.NextAbility = now + def.PhaseSeconds;
                boss.InShadow = !boss.InShadow;
                boss.Phase = boss.InShadow ? 2 : 1;
            }

            float lit = _light != null ? _light.LightAt(boss.Body.position) : 0f;
            boss.Unit.DamageTakenScale = boss.InShadow
                ? Mathf.Lerp(def.ShadowDamageTaken, 1f, lit)
                : 1f;

            if (boss.SnuffTarget != null)
            {
                if (now >= boss.NextSecond)
                {
                    if (boss.SnuffTarget != null)
                    {
                        boss.SnuffTarget.Snuff(def.SnuffSeconds);
                    }

                    boss.SnuffTarget = null;
                    boss.NextSecond = now + def.SnuffInterval;
                }

                return;
            }

            if (now < boss.NextSecond)
            {
                return;
            }

            // المسار يُرى قبل الإطفاء (§13): تُختار المنارة ثمّ يُنتظر الإنذار.
            // الاختيار قبل الانتظار لا بعده، وإلّا لَما كان للمسار ما يشير إليه.
            boss.SnuffTarget = _light != null ? _light.NearestLit(boss.Body.position) : null;
            if (boss.SnuffTarget == null)
            {
                boss.NextSecond = now + def.SnuffInterval;
                return;
            }

            boss.NextSecond = now + def.SnuffTelegraph;
        }

        // ── آكل الفجر ───────────────────────────────────────────────────────

        /// <summary>
        /// ثلاثة أطوار لا تختلف بالصحّة وحدها (§13): الأوّل يبدّل جهة هجومه،
        /// والثاني يستدعي موجة حصار، والثالث يسحب نور الخريطة — فتُحمى منارة
        /// مركزية أو تنطفئ الليلة.
        /// </summary>
        private void TickEater(Boss boss, BossDefinition def, float now, float dt)
        {
            float health = boss.HealthFraction;
            int phase = health <= def.ThirdPhaseAt ? 3 : (health <= def.SecondPhaseAt ? 2 : 1);

            if (phase != boss.Phase)
            {
                boss.Phase = phase;
                boss.NextAbility = now;      // الطور الجديد يعمل فوراً لا بعد مهلته
            }

            if (phase == 1 && now >= boss.NextAbility)
            {
                boss.NextAbility = now + def.SideSwapSeconds;
                boss.Side = boss.Side + 1;
                Reposition(boss, def);
            }

            if (phase >= 2)
            {
                Summoning(boss, def, now);

                if (now >= boss.NextAbility)
                {
                    boss.NextAbility = now + def.SideSwapSeconds;
                    if (waves != null && def.Siege != null)
                    {
                        waves.SummonAt(def.Siege, boss.Body.position, def.Bulk + 5f,
                            def.SiegeCount, boss.Side);
                    }
                }
            }

            if (phase >= 3 && _light != null)
            {
                float drained = _light.RadiusMultiplier - (def.LightDrainPerSecond * dt);
                _light.RadiusMultiplier = Mathf.Max(def.LightFloor, drained);
            }
        }

        /// <summary>
        /// ينقله إلى جهةٍ أخرى من القلعة. النقل بالقفز لا بالمشي: مشيُه حول
        /// السور دقيقةً كاملة ليس تبديل جهة بل انسحاب.
        /// </summary>
        private void Reposition(Boss boss, BossDefinition def)
        {
            Keep keep = Keep.Instance;
            Vector3 centre = keep != null ? keep.transform.position : Vector3.zero;

            Vector3 from = boss.Body.position - centre;
            from.y = 0f;
            if (from.sqrMagnitude < 1f)
            {
                from = Vector3.forward;
            }

            float radius = from.magnitude;
            Vector3 turned = Quaternion.Euler(0f, 120f, 0f) * from.normalized;
            Vector3 to = centre + (turned * radius);
            to.y = Ground(to.x, to.z, boss.Body.position.y);
            boss.Body.position = to;
        }

        // ── البيض والبرك ────────────────────────────────────────────────────

        private void TickEggs(float now)
        {
            for (int i = 0; i < _eggs.Count; i++)
            {
                BossEgg egg = _eggs[i];
                if (egg == null || !egg.Alive)
                {
                    continue;
                }

                egg.Paint();
                if (now < egg.HatchAt)
                {
                    continue;
                }

                Hatch(egg);
            }
        }

        /// <summary>
        /// الفقس من بيانات **البيضة** لا من زعيمةٍ قد تكون ماتت: بيضةٌ وُضعت
        /// ثمّ قُتلت واضعتها يجب أن تفقس كما وُعد اللاعب، وإلّا صار قتلُها
        /// إبطالاً صامتاً لتهديدٍ ما زال أمام عينه.
        /// </summary>
        private void Hatch(BossEgg egg)
        {
            if (waves != null && egg.Brood != null && egg.BroodCount > 0)
            {
                waves.SummonAt(egg.Brood, egg.Position, 1.6f, egg.BroodCount, 0);
            }

            egg.Retire();
        }


        /// <summary>
        /// يضرب أقرب بيضة إلى نقطة. تستدعيها اللمسة والقدرات: البيضة ليست
        /// `Unit`، فلا تصلها ضربات حلقة القتال من نفسها.
        /// </summary>
        public bool StrikeEgg(Vector3 point, float radius, float damage)
        {
            BossEgg best = null;
            float bestSqr = radius * radius;

            for (int i = 0; i < _eggs.Count; i++)
            {
                BossEgg egg = _eggs[i];
                if (egg == null || !egg.Alive)
                {
                    continue;
                }

                Vector3 delta = egg.Position - point;
                delta.y = 0f;
                float sqr = delta.sqrMagnitude;
                if (sqr < bestSqr)
                {
                    bestSqr = sqr;
                    best = egg;
                }
            }

            if (best == null)
            {
                return false;
            }

            best.TakeDamage(damage);
            return true;
        }


        /// <summary>
        /// يبلغ بمجمّع البيوض عدداً مطلوباً. يُنادى عند دخول الزعيم وحده،
        /// فالتوليد خارج حلقة الاشتباك (§31).
        /// </summary>
        private void Prewarm(int count)
        {
            if (eggPrefab == null)
            {
                return;
            }

            while (_eggs.Count < count)
            {
                BossEgg egg = MakeEgg();
                if (egg == null)
                {
                    return;
                }
            }
        }

        private BossEgg MakeEgg()
        {
            GameObject go = Instantiate(eggPrefab, _root);
            BossEgg egg = go.GetComponent<BossEgg>();
            if (egg == null)
            {
                egg = go.AddComponent<BossEgg>();
            }

            egg.gameObject.SetActive(false);
            _eggs.Add(egg);
            return egg;
        }

        private BossEgg TakeEgg()
        {
            for (int i = 0; i < _eggs.Count; i++)
            {
                if (_eggs[i] != null && !_eggs[i].Alive)
                {
                    return _eggs[i];
                }
            }

            // المجمّع مسخَّنٌ عند دخول الزعيم؛ وهذا احتياطُ نموٍّ إن زاد
            // العدد المطلوب عمّا سُخِّن (زعيمان يبيضان معاً).
            return eggPrefab != null ? MakeEgg() : null;
        }


        /// <summary>اتّجاه الزعيم نحو أقرب هدف مملكيّ، أو نحو ما يواجهه.</summary>
        private Vector3 Heading(Boss boss)
        {
            Vector3 forward = boss.Body.forward;
            forward.y = 0f;

            if (_combat != null)
            {
                int found = _combat.QueryFaction(boss.Body.position, 60f, Faction.Kingdom, _scan);
                float bestSqr = float.MaxValue;
                Vector3 best = Vector3.zero;

                for (int i = 0; i < found; i++)
                {
                    Unit unit = _scan[i];
                    if (unit == null || !unit.Alive)
                    {
                        continue;
                    }

                    Vector3 delta = unit.Body.position - boss.Body.position;
                    delta.y = 0f;
                    float sqr = delta.sqrMagnitude;
                    if (sqr < bestSqr && sqr > 0.01f)
                    {
                        bestSqr = sqr;
                        best = delta;
                    }
                }

                if (bestSqr < float.MaxValue)
                {
                    forward = best;
                }
            }

            return forward.sqrMagnitude > 0.001f ? forward.normalized : Vector3.forward;
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
