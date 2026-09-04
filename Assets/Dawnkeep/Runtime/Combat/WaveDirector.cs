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
        [Header("المحتوى")]
        [SerializeField] private WaveDefinition[] waves = new WaveDefinition[0];

        [Tooltip("من أين يدخل المهاجمون. يُملأ من باني المشهد بمسار الطريق.")]
        [SerializeField] private Transform spawnPoint;

        [Tooltip("مسار الطريق إلى البوّابة. لا NavMeshAgent لكل وحدة (§1).")]
        [SerializeField] private Vector3[] approachPath = new Vector3[0];

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

        /// <summary>رقم الموجة الجارية بدءاً من واحد. صفر يعني لم تبدأ بعد.</summary>
        public int WaveNumber { get { return _waveIndex + 1; } }

        /// <summary>
        /// عدد الموجات المنقضية. **ليس `WaveNumber`**: آخر موجة تتكرّر عند نفاد
        /// المحتوى فيتجمّد فهرسها، فشرطُ الفوز «النجاة حتى العاشرة» (§5) لا
        /// يتحقّق أبداً لو قيس بالفهرس. هذا عدّاد لا يعود.
        /// </summary>
        public int WavesCleared { get; private set; }

        public int WaveCount { get { return waves != null ? waves.Length : 0; } }

        /// <summary>طور الموجة الآن — للواجهة.</summary>
        public WavePhase Phase { get { return _phase; } }

        /// <summary>أصل الموجة الجارية — تقرؤه لوحة الإيقاف لتعرض تركيبتها.</summary>
        public WaveDefinition CurrentWave
        {
            get
            {
                if (waves == null || _waveIndex < 0 || _waveIndex >= waves.Length)
                {
                    return null;
                }

                return waves[_waveIndex];
            }
        }

        /// <summary>اسم الموجة الجارية كما في أصلها، أو نصّ فارغ.</summary>
        public string WaveTitle
        {
            get
            {
                if (waves == null || _waveIndex < 0 || _waveIndex >= waves.Length || waves[_waveIndex] == null)
                {
                    return string.Empty;
                }

                return waves[_waveIndex].Title;
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

        public void Configure(Transform spawn, Vector3[] path)
        {
            spawnPoint = spawn;
            approachPath = path;
        }

        private void Awake()
        {
            _rng = new System.Random(20260101);
        }

        private void Start()
        {
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
            if (_waveIndex >= waves.Length)
            {
                _waveIndex = waves.Length - 1;    // آخر موجة تتكرّر: لا نقف بلا محتوى
            }

            WaveDefinition wave = waves[_waveIndex];
            if (wave == null)
            {
                return;
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
                SpawnOne(entry.Unit);
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

        private void SpawnOne(UnitDefinition def)
        {
            Unit unit = Take(def);
            if (unit == null)
            {
                return;
            }

            Vector3 origin = spawnPoint != null ? spawnPoint.position : transform.position;
            float side = ((float)_rng.NextDouble() - 0.5f) * spawnSpread;
            float depth = ((float)_rng.NextDouble() - 0.5f) * spawnSpread * 0.5f;

            Vector3 heading = approachPath != null && approachPath.Length > 0
                ? (approachPath[0] - origin)
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
            unit.Spawn(def, position, yaw, approachPath);

            CombatDirector director = CombatDirector.Instance;
            if (director != null)
            {
                director.Register(unit);
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
