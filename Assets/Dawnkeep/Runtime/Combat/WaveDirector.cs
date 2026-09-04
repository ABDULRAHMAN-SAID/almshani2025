using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>طور الموجة الجارية — تقرؤه الواجهة لتقول للّاعب أين هو.</summary>
    public enum WavePhase
    {
        /// <summary>لم تبدأ بعد، أو لا موجات مضبوطة.</summary>
        Idle,

        /// <summary>مهلة الاستعداد قبل الخروج: وقت اللاعب للبناء والتموضع.</summary>
        Prepare,

        /// <summary>المهاجمون خارجون أو مشتبكون.</summary>
        Assault,

        /// <summary>طُهِّرت الساحة، والموجة التالية على الطريق.</summary>
        Respite,
    }

    /// <summary>
    /// يُخرج الموجات من تعريفاتها ويجمّع الوحدات.
    ///
    /// مسؤوليته التوليد وحده: القتال في `CombatDirector`. والوحدات **مجمّعة**
    /// لا مُنشأة في مسار اللعب (§1) — إنشاء عدوّ لكل صيحة يولّد قمامة تُوقف
    /// الإطار عند تجميعها.
    /// </summary>
    [DisallowMultipleComponent]
    public class WaveDirector : MonoBehaviour
    {
        /// <summary>
        /// جهة دخول: نقطة على حافّة الخريطة ومسارها إلى البوّابة (§14).
        /// المسار مخزون لا محسوب: `NavMeshAgent` لكل وحدة ممنوع (§1).
        /// </summary>
        [System.Serializable]
        public class Front
        {
            [Tooltip("من أين يخرجون.")]
            public Transform Point;

            [Tooltip("نقاط الطريق إلى البوّابة.")]
            public Vector3[] Path = new Vector3[0];
        }

        [Header("المحتوى")]
        [Tooltip("الموجات المصمَّمة يدوياً — أوّل ليالٍ تعلّم الأنظمة (§14).")]
        [SerializeField] private WaveDefinition[] waves = new WaveDefinition[0];

        [Tooltip("كل تعريفات المهاجمين. منها يولّد المولّد ما بعد المصمَّم.")]
        [SerializeField] private UnitDefinition[] catalogue = new UnitDefinition[0];

        [Tooltip("أرقام التوليد (§14). فارغاً تتكرّر آخر موجة مصمَّمة.")]
        [SerializeField] private WaveGenSettings generation;

        [Tooltip("درجات الصعوبة (§14). فارغاً تُستعمل القياسية.")]
        [SerializeField] private DifficultySettings difficulty;

        [Tooltip("أرقام الأداء (§31): سقف الأحياء وتسخين المجمّعات.")]
        [SerializeField] private Dawnkeep.Performance.PerformanceSettings performance;

        [Tooltip("جهات الدخول. الأولى هي جهة الطريق الرئيسة.")]
        [SerializeField] private Front[] fronts = new Front[0];

        [Tooltip("عرض جبهة الخروج بالمتر: لا يخرجون من نقطة واحدة فوق بعضهم.")]
        [SerializeField] private float spawnSpread = 14f;

        [Header("التشغيل")]
        [SerializeField] private bool autoStart = true;

        [Tooltip("ثوانٍ بين موجة وأخرى بعد انتهاء سابقتها.")]
        [SerializeField] private float betweenWaves = 12f;

        private readonly Dictionary<UnitDefinition, List<Unit>> _pools =
            new Dictionary<UnitDefinition, List<Unit>>();

        private int _waveIndex = -1;
        private float _nextEvent;
        private bool _running;
        private System.Random _rng;
        private WavePhase _phase = WavePhase.Idle;

        private WaveGenerator _generator;

        /// <summary>
        /// نسخة تشغيل **واحدة** يُعاد ملؤها كل ليلة مولَّدة. إنشاء أصل لكل
        /// موجة يترك عشرات الأصول اليتيمة في الذاكرة حتى نهاية الجولة.
        /// </summary>
        private WaveDefinition _generated;

        private readonly List<UnitDefinition> _catalogue = new List<UnitDefinition>(24);

        /// <summary>رقم الموجة الجارية بدءاً من واحد. صفر يعني لم تبدأ بعد.</summary>
        public int WaveNumber { get { return _waveIndex + 1; } }

        /// <summary>
        /// عدد الموجات المنقضية. **ليس `WaveNumber`**: آخر موجة تتكرّر عند نفاد
        /// المحتوى فيتجمّد فهرسها، فشرطُ الفوز «النجاة حتى العاشرة» (§5) لا
        /// يتحقّق أبداً لو قيس بالفهرس. هذا عدّاد لا يعود.
        /// </summary>
        public int WavesCleared { get; private set; }

        /// <summary>عدد الموجات المصمَّمة يدوياً. ما بعدها يُولَّد (§14).</summary>
        public int WaveCount { get { return waves != null ? waves.Length : 0; } }

        /// <summary>هل الموجة الجارية مولَّدة لا مصمَّمة؟ — تقوله المعاينة.</summary>
        public bool CurrentIsGenerated
        {
            get { return waves != null && _waveIndex >= waves.Length; }
        }

        /// <summary>الدرجة الجارية — تقرؤها الواجهة وتبدّلها قائمة الإيقاف.</summary>
        public Difficulty Level
        {
            get { return difficulty != null ? difficulty.Current : Difficulty.Normal; }
        }

        /// <summary>
        /// هل تُعرض تركيبة الموجة قبل بدئها؟ §14 تعطي المعاينة الكاملة لدرجة
        /// «حكاية»، وما دونها يرى العنوان والعدد لا الجدول.
        /// </summary>
        public bool FullPreview { get { return ActiveProfile().FullPreview; } }

        /// <summary>مضاعف نصف قطر النور من الدرجة (§14: الكابوس يضيّقه).</summary>
        public float LightScale { get { return Mathf.Max(0.1f, ActiveProfile().LightScale); } }

        /// <summary>طور الموجة الآن — للواجهة.</summary>
        public WavePhase Phase { get { return _phase; } }

        /// <summary>أصل الموجة الجارية — تقرؤه لوحة الإيقاف لتعرض تركيبتها.</summary>
        public WaveDefinition CurrentWave
        {
            get
            {
                if (_waveIndex < 0)
                {
                    return null;
                }

                if (waves != null && _waveIndex < waves.Length)
                {
                    return waves[_waveIndex];
                }

                return _generated;
            }
        }

        /// <summary>اسم الموجة الجارية كما في أصلها، أو نصّ فارغ.</summary>
        public string WaveTitle
        {
            get
            {
                WaveDefinition wave = CurrentWave;
                return wave != null ? wave.Title : string.Empty;
            }
        }

        /// <summary>
        /// الثواني المتبقّية من مهلة موقوتة (استعداد أو استراحة). صفر في غيرها،
        /// فالاشتباك لا يُقاس بساعة بل بمن يبقى واقفاً.
        /// </summary>
        public float Countdown
        {
            get
            {
                if (_phase != WavePhase.Prepare && _phase != WavePhase.Respite)
                {
                    return 0f;
                }

                return Mathf.Max(0f, _nextEvent - Time.time);
            }
        }

        /// <summary>هل المهلة قابلة للتعجيل الآن؟ الزرّ يظهر بهذا وحده.</summary>
        public bool CanHasten
        {
            get { return _phase == WavePhase.Prepare || _phase == WavePhase.Respite; }
        }

        /// <summary>
        /// «ابدأ الآن»: يُنهي المهلة فوراً. لا يُقحم موجة فوق موجة — إن لم تكن
        /// المهلة جارية فلا أثر له، والزرّ نفسه مخفيّ حينها.
        /// </summary>
        public void Hasten()
        {
            if (CanHasten)
            {
                _nextEvent = Time.time;
            }
        }

        /// <summary>جهة واحدة — يبقى الباني القديم صالحاً بها.</summary>
        public void Configure(Transform spawn, Vector3[] path)
        {
            Front front = new Front();
            front.Point = spawn;
            front.Path = path;
            fronts = new[] { front };
        }

        /// <summary>كل جهات الدخول. الأولى هي جهة الطريق الرئيسة (§14).</summary>
        public void ConfigureFronts(Front[] value)
        {
            if (value != null && value.Length > 0)
            {
                fronts = value;
            }
        }

        /// <summary>يربط محتوى التوليد. يُستدعى من باني المشهد.</summary>
        public void UsePerformance(Dawnkeep.Performance.PerformanceSettings value)
        {
            if (value != null)
            {
                performance = value;
            }
        }

        public void ConfigureGeneration(UnitDefinition[] units, WaveGenSettings settings,
            DifficultySettings levels)
        {
            if (units != null)
            {
                catalogue = units;
            }

            if (settings != null)
            {
                generation = settings;
            }

            if (levels != null)
            {
                difficulty = levels;
            }
        }

        /// <summary>يبدّل الدرجة. أثرها على الموجة **التالية** لا الجارية.</summary>
        public void SetDifficulty(Difficulty level)
        {
            if (difficulty != null)
            {
                difficulty.Current = level;
            }
        }

        /// <summary>
        /// سطر الدرجة الجارية. دالّة لا خاصيّة: تُستدعى مرّة لكل وحدة تخرج،
        /// وقراءتها من الأصل أرخص من نسخة تُبنى كل مرّة.
        /// </summary>
        private DifficultySettings.Profile ActiveProfile()
        {
            if (difficulty != null)
            {
                return difficulty.Active;
            }

            DifficultySettings.Profile plain = new DifficultySettings.Profile();
            plain.Level = Difficulty.Normal;
            plain.HealthScale = 1f;
            plain.DamageScale = 1f;
            plain.ThreatScale = 1f;
            plain.LightScale = 1f;
            plain.ClassCeiling = 0.55f;
            return plain;
        }

        private Front FrontAt(int index)
        {
            if (fronts == null || fronts.Length == 0)
            {
                return null;
            }

            return fronts[Mathf.Clamp(index, 0, fronts.Length - 1)];
        }

        /// <summary>
        /// يبني موجة الليلة رقم <paramref name="number"/> بميزانية §14 في نسخة
        /// التشغيل الواحدة. يعيد null إن لم يكن ثمّة مولّد أو محتوى.
        /// </summary>
        private WaveDefinition GenerateWave(int number)
        {
            if (generation == null || _catalogue.Count == 0 || _generator == null)
            {
                return null;
            }

            _generator.Generate(number, _catalogue, generation, ActiveProfile(),
                fronts != null ? fronts.Length : 1);

            if (_generator.Entries.Count == 0)
            {
                return null;
            }

            if (_generated == null)
            {
                _generated = ScriptableObject.CreateInstance<WaveDefinition>();
                _generated.hideFlags = HideFlags.HideAndDontSave;
            }

            string key = _generator.HasBoss
                ? Dawnkeep.Localization.LocKeys.WaveBoss
                : (_generator.HasMiniBoss
                    ? Dawnkeep.Localization.LocKeys.WaveMiniBoss
                    : Dawnkeep.Localization.LocKeys.WaveNight);

            _generated.Fill(key, generation.PrepareFor(number), _generator.Entries);
            return _generated;
        }

        private void Awake()
        {
            _rng = new System.Random(generation != null ? generation.Seed : 20260101);
            _generator = new WaveGenerator();

            // الكتالوج يُنسخ مرّة إلى قائمة: المولّد يقرأ `IList` فلا تُبنى
            // مصفوفة جديدة كل ليلة.
            _catalogue.Clear();
            if (catalogue != null)
            {
                for (int i = 0; i < catalogue.Length; i++)
                {
                    if (catalogue[i] != null && catalogue[i].Faction == Faction.Horde)
                    {
                        _catalogue.Add(catalogue[i]);
                    }
                }
            }
        }

        private void Start()
        {
            PreWarm();

            if (autoStart)
            {
                BeginNextWave();
            }
        }

        /// <summary>يبدأ الموجة التالية. يُستدعى من زرّ «ابدأ الموجة» أيضاً.</summary>
        public void BeginNextWave()
        {
            if (waves == null || waves.Length == 0)
            {
                return;
            }

            if (_running)
            {
                return;      // موجة جارية: لا تُركَّب فوقها أخرى
            }

            _waveIndex++;

            WaveDefinition wave = _waveIndex < waves.Length
                ? waves[_waveIndex]
                : GenerateWave(_waveIndex + 1);

            if (wave == null)
            {
                // لا مولّد ولا محتوى: تتكرّر آخر موجة مصمَّمة. الوقوف بلا موجة
                // أسوأ من تكرارها، والفهرس يعود فلا يُعدّ ما لم يُلعب.
                _waveIndex = waves.Length - 1;
                wave = waves[_waveIndex];
                if (wave == null)
                {
                    return;
                }
            }

            // ممنوع StopAllCoroutines هنا: RunWave تستدعي هذه الدالّة في نهايتها،
            // فتوقف نفسها في منتصف تنفيذها. الحارس في أوّل الدالّة يكفي.
            _running = true;
            _phase = WavePhase.Prepare;
            _nextEvent = Time.time + wave.PrepareTime;
            StartCoroutine(RunWave(wave));
        }

        private System.Collections.IEnumerator RunWave(WaveDefinition wave)
        {
            // الاستعداد قبل الموجة: فرصة اللاعب للبناء والتموضع (§4)
            while (Time.time < _nextEvent)
            {
                yield return null;
            }

            _phase = WavePhase.Assault;
            WaveDefinition.Entry[] entries = wave.Entries;
            for (int e = 0; e < entries.Length; e++)
            {
                StartCoroutine(RunEntry(entries[e]));
            }

            // انتظار حتى تُخرَج كل الدفعات ثم حتى يُفنى المهاجمون
            float longest = 0f;
            for (int e = 0; e < entries.Length; e++)
            {
                float span = entries[e].Delay + (Mathf.Max(0, entries[e].Count) * Mathf.Max(0.01f, entries[e].Spacing));
                if (span > longest)
                {
                    longest = span;
                }
            }

            yield return new WaitForSeconds(longest + 1f);

            while (HordeAlive())
            {
                yield return new WaitForSeconds(0.5f);
            }

            // الاستراحة تُقاس بالساعة نفسها لا بـWaitForSeconds: الواجهة تقرأ
            // ما بقي منها، والزرّ «ابدأ الآن» يقصّها.
            _phase = WavePhase.Respite;
            WavesCleared++;

            // بركة الليلة (§15): تُعرض في الاستراحة لا في الاشتباك، ولوحتُها
            // توقف الزمن — فالمهلة أدناه لا تجري تحت الاختيار.
            Dawnkeep.Boons.BoonDealer dealer = Dawnkeep.Boons.BoonDealer.Instance;
            if (dealer != null)
            {
                dealer.OpenFor(WavesCleared);
            }

            _nextEvent = Time.time + betweenWaves;
            while (Time.time < _nextEvent)
            {
                yield return null;
            }

            _running = false;
            BeginNextWave();
        }

        private System.Collections.IEnumerator RunEntry(WaveDefinition.Entry entry)
        {
            if (entry.Unit == null || entry.Count <= 0)
            {
                yield break;
            }

            if (entry.Delay > 0f)
            {
                yield return new WaitForSeconds(entry.Delay);
            }

            float spacing = Mathf.Max(0.05f, entry.Spacing);
            for (int i = 0; i < entry.Count; i++)
            {
                // سقف الأحياء (§31): إن ضاق المكان **يُؤجَّل الخروج ولا يُلغى**.
                // إلغاؤه يُنقص الموجة عن وزنها فتصير الليلة أخفّ على جهازٍ
                // أضعف — وهو عقابٌ على ضعف الجهاز لا موازنةٌ له.
                while (!HasRoom())
                {
                    yield return WaitForRoom;
                }

                SpawnOne(entry.Unit, entry.Front, entry.Tier);
                yield return new WaitForSeconds(spacing);
            }
        }

        /// <summary>
        /// المهاجمون وحدهم. الاعتماد على عدّاد الأحياء الكلّي يجعل الشرط صحيحاً
        /// أبداً — الحامية لا تفنى — فلا تنتهي موجة ولا تبدأ التالية.
        /// </summary>
        private bool HordeAlive()
        {
            CombatDirector director = CombatDirector.Instance;
            return director != null && director.LiveHorde > 0;
        }

        private void SpawnOne(UnitDefinition def, int frontIndex, int tier)
        {
            Unit unit = Take(def);
            if (unit == null)
            {
                return;
            }

            Front front = FrontAt(frontIndex);
            Transform point = front != null ? front.Point : null;
            Vector3[] path = front != null ? front.Path : null;

            Vector3 origin = point != null ? point.position : transform.position;
            float side = ((float)_rng.NextDouble() - 0.5f) * spawnSpread;
            float depth = ((float)_rng.NextDouble() - 0.5f) * spawnSpread * 0.5f;

            Vector3 heading = path != null && path.Length > 0
                ? (path[0] - origin)
                : transform.forward;
            heading.y = 0f;
            if (heading.sqrMagnitude < 0.0001f)
            {
                heading = Vector3.forward;
            }

            heading.Normalize();
            Vector3 right = new Vector3(heading.z, 0f, -heading.x);
            Vector3 position = origin + (right * side) + (heading * depth);
            position.y = GroundHeight(position.x, position.z, origin.y);

            float yaw = Mathf.Atan2(heading.x, heading.z) * Mathf.Rad2Deg;

            // مضاعفان يُضربان لا يُجمعان: درجةُ الصعوبة (§14) ومستوى العدوّ
            // في هذه الموجة. جمعُهما يجعل «كابوس» على مستوى رابع أضعف من
            // حاصل ضربهما، فتتلاشى الليالي المتأخّرة في الدرجات العالية.
            DifficultySettings.Profile profile = ActiveProfile();
            float tierHealth = generation != null ? generation.HealthAtTier(tier) : 1f;
            float tierDamage = generation != null ? generation.DamageAtTier(tier) : 1f;

            // تنّين الصدع (§12): يحفر فيظهر **داخل الحلقة** لا على حافّتها.
            // والمسار يُترك فارغاً: من ظهر في الداخل لا طريق له يقطعه.
            Vector3[] walk = path;
            if (def.Has(UnitTrait.Burrow))
            {
                position = Burrow(def, position);
                walk = null;
            }

            unit.Spawn(def, position, yaw, walk,
                profile.HealthScale * tierHealth,
                profile.DamageScale * tierDamage);

            if (def.Has(UnitTrait.Burrow))
            {
                unit.TraitAt = Time.time + Mathf.Max(0.5f, def.TraitSeconds);
            }

            // الزعيم يُسجَّل عند قائده (§13). الفحص بـ`as` على **التعريف** لا
            // بـ`GetComponent` على كل وحدة: الأخير يُدفع ثمنه في كل صيحة من
            // آلاف الصيحات مقابل أربع وحدات في الجولة كلّها.
            if (def is Dawnkeep.Bosses.BossDefinition)
            {
                Dawnkeep.Bosses.Boss boss = unit.GetComponent<Dawnkeep.Bosses.Boss>();
                Dawnkeep.Bosses.BossDirector bossDirector = Dawnkeep.Bosses.BossDirector.Instance;

                if (boss != null && bossDirector != null)
                {
                    boss.SetDefinition((Dawnkeep.Bosses.BossDefinition)def);
                    bossDirector.Register(boss);
                }
            }

            CombatDirector director = CombatDirector.Instance;
            if (director != null)
            {
                director.Register(unit);
            }
        }

        /// <summary>
        /// يُخرج وحداتٍ عند نقطة بعينها من **مجمّعات هذا القائد نفسها** —
        /// يستعملها الزعماء لاستدعاء حاشيتهم (§13). مجمّعٌ ثانٍ للاستدعاء
        /// يعني نسختين من كل نوع في الذاكرة وقمامةً عند أوّل استدعاء.
        /// </summary>
        public void SummonAt(UnitDefinition def, Vector3 centre, float spread, int count, int frontIndex)
        {
            if (def == null || count <= 0)
            {
                return;
            }

            Front front = FrontAt(frontIndex);
            Vector3[] path = front != null ? front.Path : null;
            DifficultySettings.Profile profile = ActiveProfile();

            for (int i = 0; i < count; i++)
            {
                Unit unit = Take(def);
                if (unit == null)
                {
                    return;
                }

                float angle = (i / Mathf.Max(1f, count)) * Mathf.PI * 2f;
                Vector3 position = centre
                    + new Vector3(Mathf.Cos(angle) * spread, 0f, Mathf.Sin(angle) * spread);
                position.y = GroundHeight(position.x, position.z, centre.y);

                unit.Spawn(def, position, angle * Mathf.Rad2Deg, path,
                    profile.HealthScale, profile.DamageScale);

                CombatDirector director = CombatDirector.Instance;
                if (director != null)
                {
                    director.Register(unit);
                }
            }
        }

        /// <summary>
        /// موضع الظهور لمن يحفر: على حلقةٍ حول قلب الحصن بنصف قطرٍ من
        /// `TraitRange`. حول القلب لا حول اللاعب: ظهورٌ خلف ظهره مباشرةً
        /// غدرٌ لا تحدٍّ، وظهورٌ في الحلقة الخارجية هو ما تصفه §12.
        /// </summary>
        private Vector3 Burrow(UnitDefinition def, Vector3 fallback)
        {
            Dawnkeep.Building.Keep keep = Dawnkeep.Building.Keep.Instance;
            Vector3 centre = keep != null ? keep.transform.position : Vector3.zero;

            float angle = (float)_rng.NextDouble() * Mathf.PI * 2f;
            float radius = Mathf.Max(4f, def.TraitRange);

            Vector3 place = centre + new Vector3(
                Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);

            place.y = GroundHeight(place.x, place.z, fallback.y);
            return place;
        }

        /// <summary>هل يتّسع المكان لعدوٍّ آخر؟ (§31)</summary>
        private bool HasRoom()
        {
            CombatDirector director = CombatDirector.Instance;
            return director == null || director.HasRoomForHorde;
        }

        /// <summary>
        /// مهلة الانتظار حين يمتلئ المكان. **كائنٌ واحد يُعاد استعماله**:
        /// `new WaitForSeconds` في حلقةٍ تنتظر يولّد قمامةً كل ربع ثانية،
        /// وهو بالضبط ما تمنعه §31 («صفر بايت في أغلب الإطارات»).
        /// </summary>
        private static readonly WaitForSeconds WaitForRoom = new WaitForSeconds(0.25f);

        /// <summary>
        /// يسخّن المجمّعات مسبقاً بحسب أثقل موجة معرَّفة (§31). التسخين عند
        /// الإقلاع لا عند أوّل صيحة: `Instantiate` لثلاثين وحدة في إطارٍ واحد
        /// يُسقط الإطار سقوطاً يُرى، وأوّل صيحة تقع في أوّل ليلة.
        /// </summary>
        private void PreWarm()
        {
            if (performance == null || !performance.PreWarmPools || waves == null)
            {
                return;
            }

            // أثقل عددٍ لكل نوعٍ عبر الموجات المصمَّمة: المولَّدة تُبنى على
            // الأسراب نفسها، فأقصى سربٍ في التعريف هو السقف الحقيقي.
            Dictionary<UnitDefinition, int> most = new Dictionary<UnitDefinition, int>(16);

            for (int w = 0; w < waves.Length; w++)
            {
                if (waves[w] == null)
                {
                    continue;
                }

                WaveDefinition.Entry[] entries = waves[w].Entries;
                for (int e = 0; e < entries.Length; e++)
                {
                    UnitDefinition def = entries[e].Unit;
                    if (def == null)
                    {
                        continue;
                    }

                    int had;
                    most.TryGetValue(def, out had);
                    if (entries[e].Count > had)
                    {
                        most[def] = entries[e].Count;
                    }
                }
            }

            for (int i = 0; i < _catalogue.Count; i++)
            {
                UnitDefinition def = _catalogue[i];
                int had;
                most.TryGetValue(def, out had);

                int want = Mathf.Max(had, def.MaxPack);
                want = Mathf.CeilToInt(want * performance.PreWarmMargin);
                Warm(def, want);
            }
        }

        /// <summary>ينشئ `count` نسخةً مطفأة من نوعٍ ويضعها في مجمّعه.</summary>
        private void Warm(UnitDefinition def, int count)
        {
            if (def == null || def.Prefab == null || count <= 0)
            {
                return;
            }

            List<Unit> pool;
            if (!_pools.TryGetValue(def, out pool))
            {
                pool = new List<Unit>(count);
                _pools.Add(def, pool);
            }

            while (pool.Count < count)
            {
                GameObject go = Instantiate(def.Prefab, transform);
                Unit unit = go.GetComponent<Unit>();
                if (unit == null)
                {
                    unit = go.AddComponent<Unit>();
                }

                go.SetActive(false);
                pool.Add(unit);
            }
        }

        /// <summary>يأخذ وحدة من مجمّعها أو ينشئ واحدة أوّل مرّة فقط.</summary>
        private Unit Take(UnitDefinition def)
        {
            List<Unit> pool;
            if (!_pools.TryGetValue(def, out pool))
            {
                pool = new List<Unit>(32);
                _pools.Add(def, pool);
            }

            for (int i = 0; i < pool.Count; i++)
            {
                if (!pool[i].gameObject.activeSelf)
                {
                    return pool[i];
                }
            }

            if (def.Prefab == null)
            {
                Debug.LogWarning("مملكة الرماد: تعريف الوحدة " + def.name + " بلا جاهزة — نفّذ القائمة 4.");
                return null;
            }

            GameObject go = Instantiate(def.Prefab, transform);
            Unit unit = go.GetComponent<Unit>();
            if (unit == null)
            {
                unit = go.AddComponent<Unit>();
            }

            pool.Add(unit);
            return unit;
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
