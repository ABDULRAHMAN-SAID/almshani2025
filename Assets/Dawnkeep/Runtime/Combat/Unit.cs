using Dawnkeep.Characters;
using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// وحدة مقاتلة: بيانات وحالة فقط.
    ///
    /// **لا `Update` هنا عمداً.** مئة وحدة تعني مئة استدعاء `Update` من المحرّك،
    /// وكلٌّ منها قفزة إلى كود مُدار. `CombatDirector` يمرّ عليها كلّها في حلقة
    /// واحدة، وهذا أسرع بمراتب على الجوّال. والمراجع تُخزَّن عند التهيئة لا في
    /// كل إطار.
    /// </summary>
    [DisallowMultipleComponent]
    public class Unit : MonoBehaviour
    {
        [SerializeField] private UnitDefinition definition;

        private Transform _transform;
        private CharacterAnimator _animator;

        private float _health;
        private float _nextThink;
        private float _nextAttack;
        private Unit _target;
        private Dawnkeep.Light.Beacon _beaconTarget;
        private Dawnkeep.Building.Building _structureTarget;
        private Vector3 _home;
        private bool _hasHome;
        private float _leash;
        private Dawnkeep.Building.Building _guarded;
        private float _light;
        private float _slowUntil;
        private float _slowFactor = 1f;
        private float _rallyUntil;
        private float _rallyAttackSpeed;
        private float _rallyResistance;
        private float _purgeUntil;

        private Vector3[] _path;
        private int _pathIndex;

        // كتلة خصائص واحدة مشتركة: إنشاؤها عند كل خروج من المجمّع يولّد قمامة
        private static MaterialPropertyBlock _liveryBlock;

        /// <summary>الوحدة حيّة وقابلة للاستهداف.</summary>
        public bool Alive { get; private set; }

        /// <summary>ماتت وتُشغّل سقوطها؛ تُعاد إلى المجمّع بعده.</summary>
        public float DeadFor { get; set; }

        public UnitDefinition Definition { get { return definition; } }

        public Faction Faction { get { return definition != null ? definition.Faction : Faction.Neutral; } }

        public CharacterAnimator Animator { get { return _animator; } }

        public Transform Body { get { return _transform; } }

        public float Health { get { return _health; } }

        public float NextThink { get { return _nextThink; } set { _nextThink = value; } }

        public float NextAttack { get { return _nextAttack; } set { _nextAttack = value; } }

        /// <summary>
        /// الهدف **بالمرجع لا بالفهرس**: قائمة الوحدات تتقلّص عند إزالة القتلى،
        /// فأي فهرس مخزَّن يصير مشيراً إلى وحدة أخرى في الإطار التالي.
        /// </summary>
        public Unit Target { get { return _target; } set { _target = value; } }

        /// <summary>
        /// المنارة التي تقصدها هذه الوحدة (آكل القناديل وحده). منفصلة عن
        /// `Target` لأنّها ليست وحدة: لا تُقتل ولا تُحسب في الأحياء، وخلطهما
        /// في حقل واحد يعني فحص نوع في كل إطار.
        /// </summary>
        public Dawnkeep.Light.Beacon BeaconTarget
        {
            get { return _beaconTarget; }
            set { _beaconTarget = value; }
        }

        /// <summary>
        /// شدّة النور على الوحدة الآن، من صفر إلى واحد. يحدّثها `CombatDirector`
        /// في مروره، فلا تسأل الوحدةُ حقلَ النور بنفسها ولا تكرّر الاستعلام.
        ///
        /// اسمها `LightLevel` لا `Light`: عضوٌ باسم `Light` في صنف يستورد
        /// `UnityEngine` يحجب نوع الضوء نفسه على كل من يقرأ الملفّ.
        /// </summary>
        public float LightLevel { get { return _light; } set { _light = value; } }

        /// <summary>
        /// المبنى الذي يضربه الآن. منفصل عن `Target` كما انفصلت المنارة: مبنى
        /// لا يتحرّك ولا يُحسب في الأحياء، وخلط الأنواع في حقل واحد يعني فحص
        /// نوع في كل إطار.
        /// </summary>
        public Dawnkeep.Building.Building StructureTarget
        {
            get { return _structureTarget; }
            set { _structureTarget = value; }
        }

        /// <summary>
        /// صُرفت مكافأة قتله. عَلَمٌ لا حدث: الجثّة تبقى ثوانيَ قبل إعادتها إلى
        /// المجمّع، فبلا هذا العَلَم تُصرف مكافأتها في كل إطار منها.
        /// </summary>
        public bool BountyPaid { get; set; }

        /// <summary>
        /// معامل السرعة الآن: واحد إن لم يُبطَّأ. الإبطاء **لا يتراكم بل يغلب
        /// أقواه**: ثلاث مسلّات صقيع على عدوّ واحد تُجمّده تماماً لو ضُرب
        /// المعامل في نفسه، فيصير البرج الواحد بلا قيمة والثلاثة كسراً للّعبة.
        /// </summary>
        public float SpeedMultiplier
        {
            get { return Time.time < _slowUntil ? _slowFactor : 1f; }
        }

        /// <summary>
        /// هذه الوحدة يقودها اللاعب. `CombatDirector` يتخطّاها في حلقته: لا
        /// يحرّكها ولا يختار لها هدفاً — وإلّا تنازع الذكاءُ الاصطناعي والإصبعُ
        /// على وحدة واحدة. وتبقى تُعدّ وتُستهدَف وتُجرَح كغيرها.
        /// </summary>
        public bool PlayerControlled { get; set; }

        /// <summary>زيادة سرعة الهجوم من راية الحشد (§8). صفر خارجها.</summary>
        public float RallyAttackSpeed
        {
            get { return Time.time < _rallyUntil ? _rallyAttackSpeed : 0f; }
        }

        /// <summary>
        /// درع الظلام مُزال مؤقّتاً بـ«الضوء الأوّل» (§8). أقوى من النور:
        /// النور يقضم بحسب الشحنات، وهذه تنزعه كلّه أينما وقف العدوّ.
        /// </summary>
        public bool DarkArmourPurged { get { return Time.time < _purgeUntil; } }

        /// <summary>يمنح راية الحشد: سرعة هجوم ومقاومة لمدّة.</summary>
        public void ApplyRally(float attackSpeed, float resistance, float seconds)
        {
            if (seconds <= 0f)
            {
                return;
            }

            // الأقوى يغلب ولا يتراكم: رايتان لا تعطيان ضعف الأثر
            float until = Time.time + seconds;
            if (until > _rallyUntil || attackSpeed > _rallyAttackSpeed)
            {
                _rallyAttackSpeed = Mathf.Max(attackSpeed, RallyAttackSpeed);
                _rallyResistance = Mathf.Max(resistance, Time.time < _rallyUntil ? _rallyResistance : 0f);
            }

            if (until > _rallyUntil)
            {
                _rallyUntil = until;
            }
        }

        /// <summary>ينزع درع الظلام عن الوحدة مدّة معلومة.</summary>
        public void PurgeDarkArmour(float seconds)
        {
            float until = Time.time + seconds;
            if (until > _purgeUntil)
            {
                _purgeUntil = until;
            }
        }

        /// <summary>
        /// يضبط الصحّة نسبةً من سقفها. **لا يمرّ بالدرع**: العودة بنصف الصحّة
        /// (§5) عددٌ مقصود، وإنزالها بضربةٍ يجعل الدرع يقضم منها فيعود البطل
        /// بأربعةٍ وخمسين في المئة لا بخمسين.
        /// </summary>
        public void SetHealthFraction(float fraction)
        {
            if (definition == null)
            {
                return;
            }

            _health = Mathf.Clamp01(fraction) * MaxHealth;
            Alive = _health > 0f;
        }

        /// <summary>يشفي بحدّ سقف الصحّة. يعيد ما شُفي فعلاً.</summary>
        public float Heal(float amount)
        {
            if (!Alive || definition == null || amount <= 0f)
            {
                return 0f;
            }

            float before = _health;
            _health = Mathf.Min(MaxHealth, _health + amount);
            return _health - before;
        }

        /// <summary>يُبطئ الوحدة. `factor` معامل السرعة (0.68 يعني بطء 32%).</summary>
        public void ApplySlow(float factor, float seconds)
        {
            if (seconds <= 0f || factor >= 1f)
            {
                return;
            }

            float until = Time.time + seconds;
            if (factor < _slowFactor || Time.time >= _slowUntil)
            {
                _slowFactor = factor;
            }

            if (until > _slowUntil)
            {
                _slowUntil = until;
            }
        }

        /// <summary>موضع المرابطة: تعود إليه الحامية إذا لم يبقَ لها هدف.</summary>
        public Vector3 Home { get { return _home; } }

        public bool HasHome { get { return _hasHome; } }

        /// <summary>
        /// أبعد ما تبتعده عن مرساتها لملاحقة عدوّ. صفر يعني بلا حدّ.
        /// هذا هو كل ما تحتاجه حلقة القتال لتعرف أمر الفرقة — لا تعرف الفرق
        /// أصلاً، بل تقرأ حقلَين على الوحدة كما كانت تفعل.
        /// </summary>
        public float Leash { get { return _leash; } }

        /// <summary>المبنى الذي تدافع عنه — يرجّح مهاجميه في اختيار الهدف.</summary>
        public Dawnkeep.Building.Building Guarded
        {
            get { return _guarded; }
            set { _guarded = value; }
        }

        /// <summary>يضبط مرساة الوحدة ومقودها. تستعمله `Squad` وحدها.</summary>
        public void SetPost(Vector3 home, float leash)
        {
            _home = home;
            _hasHome = true;
            _leash = leash;
        }

        private void Awake()
        {
            _transform = transform;
            _animator = GetComponentInChildren<CharacterAnimator>();

            // مضاعفان محايدان قبل أيّ تهيئة: صفرٌ هنا يعني وحدةً بواحد في
            // المئة من صحّتها لو قُرئت قبل `Spawn` أو `Awaken`.
            HealthScale = 1f;
            DamageScale = 1f;
            DamageTakenScale = 1f;
            PackFactor = 1f;
            PackResistance = 0f;
        }

        /// <summary>
        /// تهيئة وحدة **موضوعة في المشهد** (حامية القلعة) بتعريفها المضبوط في
        /// المفتش. لا تنقلها ولا تغيّر اتّجاهها: موضعها جزء من تصميم المشهد.
        /// </summary>
        public void Awaken()
        {
            if (_transform == null)
            {
                Awake();
            }

            HealthScale = 1f;
            DamageScale = 1f;
            DamageTakenScale = 1f;
            PackFactor = 1f;
            PackResistance = 0f;
            _health = MaxHealth;
            Alive = true;
            DeadFor = 0f;
            _target = null;
            _beaconTarget = null;
            _structureTarget = null;
            BountyPaid = false;
            _light = 0f;
            _slowUntil = 0f;
            _slowFactor = 1f;
            _rallyUntil = 0f;
            _purgeUntil = 0f;
            _nextThink = 0f;
            _nextAttack = 0f;
            _pathIndex = 0;
            _home = _transform.position;
            _hasHome = true;      // الحامية ترابط: تعود إلى موقعها بعد الاشتباك
            _leash = 0f;
            _guarded = null;
        }

        /// <summary>يضبط تعريف الوحدة من محرّر المشهد.</summary>
        public void SetDefinition(UnitDefinition value)
        {
            definition = value;
        }

        /// <summary>
        /// مضاعفا الصعوبة (§14). الحامية تبقى على واحد: الدرجة ترفع المهاجمين
        /// لا المدافعين، ورفع الطرفين معاً يُلغي أثرها.
        /// </summary>
        public float HealthScale { get; private set; }

        public float DamageScale { get; private set; }

        /// <summary>
        /// ما تتلقّاه هذه الوحدة من الضرر، مضروباً. طور الظلّ في §13 يخفضه،
        /// وهو **بعد** الدرع لا معه: الدرع نسبةٌ تُقتصّ عند 0.9 فلا شيء يصير
        /// منيعاً، وطور الظلّ يجب أن ينزل تحت ذلك ليُقرأ.
        /// </summary>
        public float DamageTakenScale { get; set; }

        /// <summary>سقف الصحّة بعد مضاعف الصعوبة — تقرؤه أشرطة الصحّة والفرق.</summary>
        public float MaxHealth
        {
            get
            {
                if (definition == null)
                {
                    return Mathf.Max(0.01f, HealthScale);
                }

                return definition.MaxHealth * Mathf.Max(0.01f, HealthScale) * HealthBoon;
            }
        }

        /// <summary>
        /// بركة الصحّة (§15) — للمملكة وحدها، وللبطل بركته لا بركة الجند.
        /// </summary>
        private float HealthBoon
        {
            get
            {
                if (definition.Faction != Faction.Kingdom)
                {
                    return 1f;
                }

                return definition.Champion
                    ? Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.HeroHealth)
                    : Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.ArmyHealth);
            }
        }

        /// <summary>
        /// معامل سرعة «الصفوف المتراصّة» (§15). يضبطه القائد على نوبة التفكير
        /// لا في كل إطار: عدُّ الجيران ستّين مرّةً في الثانية لكل جنديّ يقتل
        /// الإطار مقابل رقمٍ لا يتغيّر بين نبضةٍ وأخرى.
        /// </summary>
        public float PackFactor { get; set; }

        /// <summary>مقاومةٌ تُضاف من التراصّ. تُضبط مع `PackFactor`.</summary>
        public float PackResistance { get; set; }

        /// <summary>ضرر الضربة بعد مضاعف الصعوبة.</summary>
        public float Damage
        {
            get { return (definition != null ? definition.Damage : 0f) * Mathf.Max(0f, DamageScale); }
        }

        /// <summary>تهيئة عند الخروج من المجمّع. تُستدعى مرّة لا في كل إطار.</summary>
        public void Spawn(UnitDefinition def, Vector3 position, float headingDegrees, Vector3[] path)
        {
            Spawn(def, position, headingDegrees, path, 1f, 1f);
        }

        /// <summary>تهيئة بمضاعفَي درجة الصعوبة (§14).</summary>
        public void Spawn(UnitDefinition def, Vector3 position, float headingDegrees, Vector3[] path,
            float healthScale, float damageScale)
        {
            definition = def;
            HealthScale = Mathf.Max(0.01f, healthScale);
            DamageScale = Mathf.Max(0f, damageScale);
            DamageTakenScale = 1f;
            PackFactor = 1f;
            PackResistance = 0f;
            if (_transform == null)
            {
                Awake();
            }

            _transform.SetPositionAndRotation(position, Quaternion.Euler(0f, headingDegrees, 0f));
            _health = MaxHealth;
            Alive = true;
            DeadFor = 0f;
            _target = null;
            _beaconTarget = null;
            _structureTarget = null;
            BountyPaid = false;
            _light = 0f;
            _slowUntil = 0f;
            _slowFactor = 1f;
            _rallyUntil = 0f;
            _purgeUntil = 0f;
            _nextThink = 0f;
            _nextAttack = 0f;
            _path = path;
            _pathIndex = 0;
            _hasHome = false;      // المهاجم لا يرابط: يمضي على مساره
            _leash = 0f;
            _guarded = null;

            if (_animator != null)
            {
                _animator.Revive();
                _animator.Walk = 0f;
            }

            gameObject.SetActive(true);
            ApplyLivery(def != null ? def.Livery : Color.white);
        }

        /// <summary>الضرر بعد الدرع. يعيد true إن قتلت هذه الضربة الوحدة.</summary>
        public bool TakeDamage(float amount)
        {
            return TakeDamage(amount, 0f);
        }

        /// <summary>
        /// ضررٌ يتجاوز جزءاً من الدرع (§10: المسلّة السحرية). الاختراق يُطبَّق
        /// على **مجموع** الدرعين — العاديّ ودرع الظلام — فمسلّةٌ تخترق نصف
        /// الدرع تنفع على المدرَّع في الظلام كما تنفع عليه في النور.
        /// </summary>
        public bool TakeDamage(float amount, float armourPierce)
        {
            if (!Alive)
            {
                return false;
            }

            // درع الظلام يذوب في النور (§11): هو ما يجعل جرّ العدوّ إلى دائرة
            // منارة قراراً تكتيكياً. والمجموع مقصوص عند 0.9 فلا شيء يصير منيعاً.
            float armour = definition != null ? definition.Armour : 0f;
            if (definition != null && definition.DarkArmour > 0f && !DarkArmourPurged)
            {
                armour += definition.DarkArmour * (1f - Mathf.Clamp01(_light));
            }

            // مقاومة الراية تُضاف إلى الدرع لا تُضرب فيه: §8 تسمّيها «مقاومة»
            // بجانب الدرع، وضربُها فيه يجعلها بلا أثر على من لا درع له.
            if (Time.time < _rallyUntil)
            {
                armour += _rallyResistance;
            }

            // بركات §15 على المملكة وحدها، والتراصّ معها بالقاعدة نفسها
            if (definition != null && definition.Faction == Faction.Kingdom)
            {
                armour += Dawnkeep.Boons.BoonBook.Stat(Dawnkeep.Boons.BoonStat.ArmyResistance) - 1f;
                armour += PackResistance;
            }

            armour = Mathf.Clamp(armour, 0f, 0.9f) * (1f - Mathf.Clamp01(armourPierce));
            _health -= amount * (1f - armour) * Mathf.Max(0f, DamageTakenScale);

            if (_health > 0f)
            {
                if (_animator != null)
                {
                    _animator.Flinch();
                }

                return false;
            }

            _health = 0f;
            Alive = false;
            DeadFor = 0f;
            if (_animator != null)
            {
                _animator.Die();
            }

            return true;
        }

        /// <summary>الوجهة التالية على المسار، أو الموضع نفسه إن انتهى المسار.</summary>
        public Vector3 PathPoint(Vector3 fallback)
        {
            if (_path == null || _pathIndex >= _path.Length)
            {
                return fallback;
            }

            return _path[_pathIndex];
        }

        public void AdvancePath()
        {
            if (_path != null && _pathIndex < _path.Length)
            {
                _pathIndex++;
            }
        }

        public bool HasPath
        {
            get { return _path != null && _pathIndex < _path.Length; }
        }

        public void Despawn()
        {
            Alive = false;
            gameObject.SetActive(false);
        }

        /// <summary>
        /// لون الراية على مُصيِّر القماش وحده. الكتابة على الجذر تصبغ الجلد
        /// والفولاذ معه فيصير الجندي كتلة ملوّنة بلا ملامح.
        /// </summary>
        private void ApplyLivery(Color livery)
        {
            Transform cloth = _transform.Find("Cloth");
            if (cloth == null)
            {
                return;
            }

            MeshRenderer renderer = cloth.GetComponent<MeshRenderer>();
            if (renderer == null)
            {
                return;
            }

            if (_liveryBlock == null)
            {
                _liveryBlock = new MaterialPropertyBlock();
            }

            renderer.GetPropertyBlock(_liveryBlock);
            _liveryBlock.SetColor("_BaseColor", livery);
            renderer.SetPropertyBlock(_liveryBlock);
        }
    }
}
