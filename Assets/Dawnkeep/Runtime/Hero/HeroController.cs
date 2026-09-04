using Dawnkeep.Characters;
using Dawnkeep.Combat;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Dawnkeep.Hero
{
    /// <summary>حال البطل: يقاتل، أو روحٌ ينتظر العودة (§5).</summary>
    public enum HeroState
    {
        Alive = 0,
        Spirit = 1,
    }

    /// <summary>
    /// البطل: حركته وقتاله وقدراته الثلاث (§8)، وموته وعودته (§5).
    ///
    /// **لا يقوده `CombatDirector`**: يرفع `Unit.PlayerControlled` فتتخطّاه
    /// الحلقة، ويحرّكه هذا المكوّن بإصبع اللاعب. تحريكه من الجهتين يعني
    /// ذكاءً اصطناعيّاً وإصبعاً يتنازعان وحدة واحدة فترتجف.
    ///
    /// **ولا يخسر اللاعب بموته** (§5): يتحوّل روحاً سبع ثوانٍ يتحرّك ببطء،
    /// ثمّ يعود بنصف صحّته. وكل موتة تالية في الليلة تزيد الانتظار أربعاً.
    /// </summary>
    [DisallowMultipleComponent]
    public class HeroController : MonoBehaviour
    {
        public static HeroController Instance { get; private set; }

        [SerializeField] private HeroDefinition definition;

        [Tooltip("منطقة ميتة للعصا (§7: 0.12).")]
        [Range(0f, 0.4f)]
        [SerializeField] private float deadZone = 0.12f;

        [Tooltip("ثوانٍ للوصول إلى السرعة الكاملة (§7: 0.12).")]
        [SerializeField] private float accelerationTime = 0.12f;

        private Unit _unit;
        private Transform _transform;
        private CharacterAnimator _animator;
        private CombatDirector _combat;
        private ProjectilePool _projectiles;

        private readonly Unit[] _scan = new Unit[48];

        private Vector3 _velocity;
        private Unit _target;
        private float _nextRetarget;
        private float _nextAttack;
        private float _attackSlowUntil;

        private float _volleyReady;
        private float _rallyReady;
        private float _ultimateCharge;

        private HeroState _state = HeroState.Alive;
        private float _spiritUntil;
        private int _deaths;
        private uint _critSeed = 8675309u;

        private Transform _banner;
        private float _bannerUntil;
        private float _nextRallyPulse;
        private WaveDirector _waves;
        private WavePhase _lastPhase = WavePhase.Idle;

        public HeroDefinition Definition { get { return definition; } }

        public HeroState State { get { return _state; } }

        /// <summary>
        /// اللعبة موقوفة. القدرات تُقرأ بالمفاتيح والأزرار وكلاهما يعمل بزمن
        /// غير مقيّس، فبلا هذا الحارس تُطلق رشقةٌ ولوحة الإيقاف مفتوحة.
        /// </summary>
        private static bool Paused { get { return Time.timeScale <= 0f; } }

        public Unit Body { get { return _unit; } }

        /// <summary>ثوانٍ باقية على عودته روحاً. صفر إن كان حيّاً.</summary>
        public float SpiritLeft
        {
            get { return _state == HeroState.Spirit ? Mathf.Max(0f, _spiritUntil - Time.time) : 0f; }
        }

        /// <summary>جاهزية رشقة الفجر من صفر إلى واحد.</summary>
        public float VolleyReadiness { get { return Readiness(_volleyReady, Cooldown(true)); } }

        public float RallyReadiness { get { return Readiness(_rallyReady, Cooldown(false)); } }

        /// <summary>امتلاء الضوء الأوّل — يُشحن بالقتال لا بالزمن (§8).</summary>
        public float UltimateReadiness
        {
            get
            {
                if (definition == null || definition.UltimateChargeDamage <= 0f)
                {
                    return 0f;
                }

                return Mathf.Clamp01(_ultimateCharge / definition.UltimateChargeDamage);
            }
        }

        private void Awake()
        {
            Instance = this;
            _transform = transform;
            _unit = GetComponent<Unit>();
            _animator = GetComponentInChildren<CharacterAnimator>();

            if (_unit != null)
            {
                _unit.PlayerControlled = true;
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Start()
        {
            _combat = CombatDirector.Instance;
            _projectiles = _combat != null ? _combat.GetComponent<ProjectilePool>() : null;
            _waves = FindAnyObjectByType<WaveDirector>();
        }

        /// <summary>
        /// عقوبة الموت تتراكم **داخل الليلة الواحدة** (§5)، فتُنسى عند الفجر.
        /// بلا هذا يصير الانتظار في الموجة العاشرة أربعين ثانية على موتات
        /// وقعت قبل ساعة من اللعب.
        /// </summary>
        private void TickDawnReset()
        {
            if (_waves == null)
            {
                return;
            }

            WavePhase phase = _waves.Phase;
            if (phase == _lastPhase)
            {
                return;
            }

            _lastPhase = phase;
            if (phase == WavePhase.Respite)
            {
                _deaths = 0;
            }
        }

        private void Update()
        {
            if (_unit == null || definition == null)
            {
                return;
            }

            float dt = Time.deltaTime;
            float now = Time.time;

            TickDawnReset();

            if (_state == HeroState.Spirit)
            {
                TickSpirit(dt, now);
                return;
            }

            if (!_unit.Alive)
            {
                EnterSpirit(now);
                return;
            }

            Move(dt, now);
            Fight(now);
            TickBanner(now);
        }

        // ── الحركة ──────────────────────────────────────────────────────────

        private void Move(float dt, float now)
        {
            Vector3 wish = ReadStick();

            // الهجوم القريب يُبطئ إلى 75% مدّة الضربة وحدها (§8). والرمي لا
            // يوقف الحركة أصلاً — وهذا نصّ المواصفات لا اجتهاد.
            float speed = definition.MoveSpeed;
            if (now < _attackSlowUntil)
            {
                speed *= definition.AttackSlow;
            }

            Vector3 wanted = wish * speed;

            // منحنى تسارع خفيف: القفز إلى السرعة الكاملة في إطار يجعل الحركة
            // تشبه الانتقال لا المشي (§7).
            float rate = accelerationTime > 0.001f ? dt / accelerationTime : 1f;
            _velocity = Vector3.Lerp(_velocity, wanted, Mathf.Clamp01(rate));

            if (_velocity.sqrMagnitude > 0.0004f)
            {
                Vector3 next = _transform.position + (_velocity * dt);
                next.y = GroundHeight(next.x, next.z, _transform.position.y);
                _transform.position = next;

                Vector3 face = _velocity;
                face.y = 0f;
                if (face.sqrMagnitude > 0.0001f)
                {
                    _transform.rotation = Quaternion.RotateTowards(_transform.rotation,
                        Quaternion.LookRotation(face.normalized, Vector3.up), 720f * dt);
                }
            }

            if (_animator != null)
            {
                _animator.Walk = _velocity.sqrMagnitude > 0.09f ? 1f : 0f;
            }
        }

        /// <summary>
        /// اتّجاه الحركة من العصا أو المفاتيح. المنطقة الميتة تُقصّ **ثمّ
        /// يُعاد تطبيع الباقي**: قصّها وحدها يجعل أوّل حركة تقفز من صفر إلى
        /// 0.12 من السرعة.
        /// </summary>
        private Vector3 ReadStick()
        {
            Vector2 raw = Vector2.zero;

            Keyboard keyboard = Keyboard.current;
            if (keyboard != null)
            {
                if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed) { raw.y += 1f; }
                if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed) { raw.y -= 1f; }
                if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed) { raw.x += 1f; }
                if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed) { raw.x -= 1f; }
            }

            Gamepad pad = Gamepad.current;
            if (pad != null && raw.sqrMagnitude < 0.0001f)
            {
                raw = pad.leftStick.ReadValue();
            }

            // العصا الافتراضية (§7) آخر ما يُقرأ ولا يُلغيها شيء: هي وحدها
            // مضبوطةٌ بمنطقتها الميتة قبل أن تصل هنا، فتُؤخذ كما هي ولا تمرّ
            // بالقصّ ثانيةً — قصّها مرّتين يقضم أوّل 23% من مدى الإبهام.
            if (raw.sqrMagnitude < 0.0001f)
            {
                Vector2 stick = Dawnkeep.UI.VirtualJoystick.Value;
                if (stick.sqrMagnitude > 0.0001f)
                {
                    return Project(stick);
                }
            }

            float magnitude = raw.magnitude;
            if (magnitude <= deadZone)
            {
                return Vector3.zero;
            }

            raw = (raw / magnitude) * Mathf.Clamp01((magnitude - deadZone) / (1f - deadZone));
            return Project(raw);
        }

        /// <summary>
        /// يُسقِط متّجه العصا على محورَي الكاميرا. الحركة على مستوى العالم لا
        /// مستوى الكاميرا تجعل «فوق» تعني شمالاً مهما دارت الكاميرا؛ والصحيح
        /// أن تعني «بعيداً عن اللاعب».
        /// </summary>
        private static Vector3 Project(Vector2 raw)
        {
            Camera camera = Camera.main;
            if (camera == null)
            {
                return new Vector3(raw.x, 0f, raw.y);
            }

            Vector3 forward = camera.transform.forward;
            forward.y = 0f;
            if (forward.sqrMagnitude < 0.0001f)
            {
                forward = Vector3.forward;
            }

            forward.Normalize();
            Vector3 right = new Vector3(forward.z, 0f, -forward.x);
            return (forward * raw.y) - (right * raw.x);
        }

        // ── القتال ──────────────────────────────────────────────────────────

        private void Fight(float now)
        {
            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
                if (_combat == null)
                {
                    return;
                }
            }

            if (now >= _nextRetarget || _target == null || !_target.Alive || OutOfRange(_target))
            {
                _target = FindTarget();
                _nextRetarget = now + definition.RetargetInterval;
            }

            if (now < _nextAttack)
            {
                return;
            }

            // لا عدوّ في المدى: البيضة هدفٌ صالح (§13). البيضة ليست `Unit`
            // فلا يجدها `FindTarget`، ولو لم يصلها ضربُ البطل لَما كان لجملة
            // §13 «يجب تدمير البيض قبل الفقس» طريقٌ يُنفَّذ به أصلاً.
            if (_target == null)
            {
                StrikeEggNear(now);
                return;
            }

            _nextAttack = now + AttackInterval;
            _attackSlowUntil = now + (AttackInterval * 0.5f);

            if (_animator != null)
            {
                _animator.Shoot();
            }

            float damage = definition.Damage
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.HeroDamage);

            float crit = definition.CritChance
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.HeroCrit);

            // «يقظة الفجر» (§15): أوّل ضربة على عدوٍّ كامل الصحّة حرِجة دائماً.
            // شرطُ الصحّة الكاملة هو ما يمنعها من أن تصير حرِجاً دائماً على كل
            // ضربة — وهي حينها ليست بركةً بل مضاعفَ ضررٍ مقنَّعاً.
            bool opener = Dawnkeep.Boons.BoonBook.Flagged(Dawnkeep.Boons.BoonFlag.FirstLight)
                && _target.Health >= _target.MaxHealth - 0.01f;

            if (opener || Roll() < crit)
            {
                damage *= definition.CritMultiplier;
            }

            Strike(_target, damage);
        }

        /// <summary>
        /// فترة ضرب البطل بعد بركات §15. البركة تحرّك **السرعة**، والفترة
        /// مقلوبها — فالقسمة لا الضرب، وضربُها يبطئ ما وُعد بتسريعه.
        /// </summary>
        private float AttackInterval
        {
            get
            {
                float speed = Mathf.Max(0.1f,
                    Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.HeroAttackSpeed));
                return definition.AttackInterval / speed;
            }
        }

        /// <summary>
        /// يضرب أقرب بيضة إن لم يكن ثمّة عدوّ. الضربة كاملة بلا حرِج: البيضة
        /// لا تتفادى ولا تتدرّع، وحرِجٌ عليها رقمٌ يطفو بلا معنى.
        /// </summary>
        private void StrikeEggNear(float now)
        {
            Dawnkeep.Bosses.BossDirector bosses = Dawnkeep.Bosses.BossDirector.Instance;
            if (bosses == null)
            {
                return;
            }

            float reach = definition.WeaponRange;
            if (!bosses.StrikeEgg(_transform.position, reach, definition.Damage))
            {
                return;
            }

            _nextAttack = now + AttackInterval;
            _attackSlowUntil = now + (AttackInterval * 0.5f);

            if (_animator != null)
            {
                _animator.Shoot();
            }
        }

        /// <summary>
        /// أولوية الاستهداف (§8): من يضربني وهو قريب، ثمّ من يهدم الحصن، ثمّ
        /// من يطفئ منارة، ثمّ أقرب عدوّ. الترجيح بالضرب في معامل لا بالفرز:
        /// عدوٌّ أثمن على بُعد عشرين متراً لا يُفضَّل على واحدٍ يضربني الآن.
        /// </summary>
        private Unit FindTarget()
        {
            Vector3 me = _transform.position;
            float range = definition.WeaponRange;
            int found = _combat.QueryFaction(me, range, Faction.Horde, _scan);

            Unit best = null;
            float bestScore = float.MaxValue;

            for (int i = 0; i < found; i++)
            {
                Unit other = _scan[i];
                Vector3 delta = other.Body.position - me;
                delta.y = 0f;
                float score = delta.sqrMagnitude;

                if (other.Target == _unit)
                {
                    score *= 0.25f;      // يضربني: الأولى
                }
                else if (other.Definition != null
                    && other.Definition.TargetClass == TargetClass.Structure)
                {
                    score *= 0.45f;      // يهدم البناء
                }
                else if (other.BeaconTarget != null)
                {
                    score *= 0.55f;      // يطفئ منارة
                }

                if (score < bestScore)
                {
                    bestScore = score;
                    best = other;
                }
            }

            return best;
        }

        private bool OutOfRange(Unit target)
        {
            Vector3 delta = target.Body.position - _transform.position;
            delta.y = 0f;
            return delta.sqrMagnitude > definition.WeaponRange * definition.WeaponRange;
        }

        /// <summary>يوقع الضرر ويشحن الضوء الأوّل بما أوقعه (§8).</summary>
        private void Strike(Unit target, float damage)
        {
            if (target == null || !target.Alive)
            {
                return;
            }

            if (_projectiles != null)
            {
                _projectiles.Fire(_transform.position + (Vector3.up * 1.6f), target, damage, 52f);
            }
            else
            {
                target.TakeDamage(damage);
            }

            _ultimateCharge += damage;
        }

        // ── القدرات ─────────────────────────────────────────────────────────

        /// <summary>رشقة الفجر: خمسة سهام في قوس (§8).</summary>
        public bool CastVolley()
        {
            if (Paused || _state != HeroState.Alive || definition == null || Time.time < _volleyReady)
            {
                return false;
            }

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            if (_combat == null)
            {
                return false;
            }

            _volleyReady = Time.time + Cooldown(true);

            Vector3 me = _transform.position;
            int found = _combat.QueryFaction(me, definition.WeaponRange, Faction.Horde, _scan);
            if (found == 0)
            {
                return true;      // أُطلقت في الفراغ: الفترة تُستهلك كما لو أصابت
            }

            // ثلاث إصابات على الهدف الواحد سقفاً (§8): بلا هذا تنهال الخمسة
            // على عدوّ واحد إن كان وحده فتصير القدرة ضربةً مفردة ثقيلة.
            int perTarget = Mathf.Max(1, definition.VolleyMaxHitsPerTarget);
            int cursor = 0;
            int hitsOnCurrent = 0;

            for (int i = 0; i < definition.VolleyArrows; i++)
            {
                if (hitsOnCurrent >= perTarget)
                {
                    cursor = (cursor + 1) % found;
                    hitsOnCurrent = 0;
                }

                Unit victim = _scan[cursor];
                if (victim != null && victim.Alive)
                {
                    Strike(victim, definition.VolleyDamage);
                    hitsOnCurrent++;
                }
                else
                {
                    cursor = (cursor + 1) % found;
                    hitsOnCurrent = 0;
                }
            }

            if (_animator != null)
            {
                _animator.Shoot();
            }

            return true;
        }

        /// <summary>راية الحشد: بقعة تسرّع الجند وتقوّيهم ثماني ثوانٍ (§8).</summary>
        public bool CastRally()
        {
            if (Paused || _state != HeroState.Alive || definition == null || Time.time < _rallyReady)
            {
                return false;
            }

            _rallyReady = Time.time + Cooldown(false);
            _bannerUntil = Time.time + definition.RallySeconds;

            EnsureBanner();
            _banner.position = _transform.position;
            _banner.gameObject.SetActive(true);

            ApplyRallyPulse();
            return true;
        }

        /// <summary>
        /// الراية تُطبَّق كل نصف ثانية لا مرّة واحدة: جنديٌّ دخل بقعتها بعد
        /// وضعها لا ينال شيئاً لو طُبِّقت عند الوضع فقط.
        /// </summary>
        private void TickBanner(float now)
        {
            if (_banner == null || now >= _bannerUntil)
            {
                if (_banner != null && _banner.gameObject.activeSelf)
                {
                    _banner.gameObject.SetActive(false);
                }

                return;
            }

            if (now >= _nextRallyPulse)
            {
                _nextRallyPulse = now + 0.5f;
                ApplyRallyPulse();
            }
        }

        private void ApplyRallyPulse()
        {
            if (_combat == null || _banner == null)
            {
                return;
            }

            float rallyReach = definition.RallyRadius
                * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.HeroRallyRadius);

            int found = _combat.QueryFaction(_banner.position, rallyReach,
                Faction.Kingdom, _scan);

            for (int i = 0; i < found; i++)
            {
                _scan[i].ApplyRally(definition.RallyAttackSpeed, definition.RallyResistance, 0.9f);
            }
        }

        /// <summary>الضوء الأوّل: موجة تضرب وتنزع الظلام وتشفي الجند (§8).</summary>
        public bool CastUltimate()
        {
            if (Paused || _state != HeroState.Alive || definition == null || UltimateReadiness < 1f)
            {
                return false;
            }

            if (_combat == null)
            {
                _combat = CombatDirector.Instance;
            }

            if (_combat == null)
            {
                return false;
            }

            _ultimateCharge = 0f;
            Vector3 me = _transform.position;

            // النزع قبل الضرر لا بعده: الترتيب المعكوس يجعل الضربة تقع على
            // الدرع الكامل ثمّ يُنزع، فتضيع نصف قيمة القدرة.
            int hostile = _combat.QueryFaction(me, definition.UltimateRadius, Faction.Horde, _scan);
            for (int i = 0; i < hostile; i++)
            {
                _scan[i].PurgeDarkArmour(definition.UltimatePurgeSeconds);
            }

            for (int i = 0; i < hostile; i++)
            {
                _scan[i].TakeDamage(definition.UltimateDamage);
            }

            // «الضوء الأوّل» يصل البيض أيضاً (§13): قدرةٌ تُفني ما حولها ثمّ
            // تترك البيضة سليمة بينها تُقرأ عطباً لا قاعدة.
            Dawnkeep.Bosses.BossDirector bosses = Dawnkeep.Bosses.BossDirector.Instance;
            if (bosses != null)
            {
                bosses.StrikeEgg(me, definition.UltimateRadius, definition.UltimateDamage);
            }

            int friendly = _combat.QueryFaction(me, definition.UltimateRadius, Faction.Kingdom, _scan);
            for (int i = 0; i < friendly; i++)
            {
                // من سقف **الوحدة** لا من سقف تعريفها: مضاعف الصعوبة (§14)
                // يرفع السقف، وشفاءٌ بنسبة من الرقم الخام يشفي أقلّ ممّا وُعد.
                if (_scan[i].Definition != null)
                {
                    _scan[i].Heal(_scan[i].MaxHealth * definition.UltimateHeal);
                }
            }

            return true;
        }

        // ── الموت والعودة (§5) ──────────────────────────────────────────────

        private void EnterSpirit(float now)
        {
            _state = HeroState.Spirit;
            _deaths++;

            // كل موتة تالية في الليلة تزيد الانتظار أربع ثوانٍ (§5)
            _spiritUntil = now + definition.SpiritSeconds
                + (definition.SpiritPenalty * (_deaths - 1));

            _velocity = Vector3.zero;
            _target = null;

            if (_banner != null)
            {
                _banner.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// الروح تتحرّك ببطء ويختار اللاعب موضع عودته (§5). لا تُضرَب ولا
        /// تَضرِب: `Unit.Alive` كاذب فتتخطّاها الحلقة القتالية أصلاً.
        /// </summary>
        private void TickSpirit(float dt, float now)
        {
            Vector3 wish = ReadStick();
            if (wish.sqrMagnitude > 0.0001f)
            {
                Vector3 next = _transform.position + (wish * definition.SpiritSpeed * dt);
                next.y = GroundHeight(next.x, next.z, _transform.position.y);
                _transform.position = next;
            }

            if (_animator != null)
            {
                _animator.Walk = 0f;
            }

            if (now < _spiritUntil)
            {
                return;
            }

            Revive();
        }

        /// <summary>يعود بنصف صحّته (§5).</summary>
        public void Revive()
        {
            _state = HeroState.Alive;
            _unit.Awaken();

            // `Awaken` يملأ الصحّة؛ §5 تقول نصفها، فتُضبط نسبةً مباشرةً
            _unit.SetHealthFraction(definition.ReviveHealth);
            _unit.PlayerControlled = true;

            if (_animator != null)
            {
                _animator.Revive();
            }
        }

        /// <summary>ينسى موتات الليلة — يُنادى عند الفجر (§5).</summary>
        public void ResetDeaths()
        {
            _deaths = 0;
        }

        // ── أدوات ───────────────────────────────────────────────────────────

        /// <summary>
        /// مهلة القدرة بعد بركات §15. المضاعف أقلُّ من واحد يعني «أسرع»،
        /// فيُضرب في المهلة مباشرة لا يُقسم عليها.
        /// </summary>
        private float Cooldown(bool volley)
        {
            float raw = volley ? definition.VolleyCooldown : definition.RallyCooldown;
            return raw * Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.HeroCooldown);
        }

        private static float Readiness(float readyAt, float cooldown)
        {
            if (cooldown <= 0f)
            {
                return 1f;
            }

            float left = readyAt - Time.time;
            return left <= 0f ? 1f : Mathf.Clamp01(1f - (left / cooldown));
        }

        /// <summary>عشوائية الحرِج بمولّد خاصّ: `Random` مشترك يتأثّر بكل ما سواه.</summary>
        private float Roll()
        {
            _critSeed = (_critSeed * 1664525u) + 1013904223u;
            return (_critSeed >> 8) / 16777216f;
        }

        private void EnsureBanner()
        {
            if (_banner != null)
            {
                return;
            }

            GameObject go = new GameObject("RallyBanner");
            go.transform.SetParent(null, false);

            Dawnkeep.Rendering.MeshBuilder builder = new Dawnkeep.Rendering.MeshBuilder();
            builder.AddCylinder(Vector3.zero, 0.16f, 0.12f, 3.4f, 6, 1f, false);
            builder.AddBox(new Vector3(0.62f, 3.0f, 0f), new Vector3(1.25f, 0.90f, 0.08f), 0f, 1f);

            go.AddComponent<MeshFilter>().sharedMesh = builder.ToMesh("Dawnkeep_RallyBanner", true);

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            Material material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.name = "Dawnkeep_RallyBanner";
            material.SetColor("_BaseColor", new Color(0.741f, 0.153f, 0.169f));
            renderer.sharedMaterial = material;

            _banner = go.transform;
            go.SetActive(false);
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
    }
}
