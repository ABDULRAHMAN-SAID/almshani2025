using System.Collections.Generic;
using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Squads
{
    /// <summary>أوامر اللاعب للفرقة (§9).</summary>
    public enum SquadOrder
    {
        /// <summary>ترابط عند ثكنتها — الحال الافتراضية.</summary>
        Garrison = 0,

        /// <summary>تتبع البطل بتشكيل: الحرّاس أمامه والرماة خلفه.</summary>
        Follow = 1,

        /// <summary>تثبت حيث هي، ولا تترك موضعها إلّا لعدوّ داخل مقودها.</summary>
        Hold = 2,

        /// <summary>تتوزّع حول مبنى وتقدّم من يهاجمه.</summary>
        Defend = 3,

        /// <summary>تتراجع إلى أقرب منارة أو ثكنة.</summary>
        Retreat = 4,
    }

    /// <summary>
    /// فرقة: مجموعة جنود يقودها **قرارٌ واحد** لا قرارٌ لكل فرد (§9).
    ///
    /// كل جندي في مسار اللعب يتّخذ قراراً عالي المستوى كل نصف ثانية؛ عشرون
    /// جنديّاً يعني عشرين قراراً منفصلاً قد تتناقض. الفرقة تحدّد **المرساة
    /// والمقود**، ويبقى للفرد التباعد وتجنّب الجيران — وهذا نصّ §9.
    ///
    /// المرساة تُكتب في `Unit.Home` والمقود في `Unit.Leash`، فلا يحتاج
    /// `CombatDirector` أن يعرف الفرق أصلاً: يقرأ حقلَين على الوحدة كما كان.
    /// </summary>
    [DisallowMultipleComponent]
    public class Squad : MonoBehaviour
    {
        [Tooltip("أبعد ما تبتعده الفرقة عن مرساتها لملاحقة عدوّ، بالمتر.")]
        [SerializeField] private float holdLeash = 16f;

        [Tooltip("مقود الاتّباع: §9 تقول خمس وحدات من القائد (٣٠ م).")]
        [SerializeField] private float followLeash = 30f;

        [Tooltip("مقود الدفاع حول الهدف.")]
        [SerializeField] private float defendLeash = 20f;

        [Tooltip("تحت هذه النسبة من الصحّة يُعرض التراجع (§9: 30%).")]
        [Range(0.05f, 0.8f)]
        [SerializeField] private float retreatThreshold = 0.30f;

        [Tooltip("نصف قطر التشكيل حول المرساة، بالمتر.")]
        [SerializeField] private float formationRadius = 4.6f;

        [Tooltip("عند الإقلاع تُضمّ كل وحدات المملكة تحت هذا الجذر إلى الفرقة.")]
        [SerializeField] private Transform recruitRoot;

        private readonly List<Unit> _members = new List<Unit>(8);

        /// <summary>
        /// موضع كل فرد الأصلي. حامية المشهد موضوعة بعناية حول السور، فأمرُ
        /// المرابطة يعيد كلّاً إلى **موضعه هو** لا إلى تشكيلٍ يكوّمهم في نقطة.
        /// </summary>
        private readonly List<Vector3> _posts = new List<Vector3>(8);

        private SquadOrder _order = SquadOrder.Garrison;
        private Vector3 _anchor;
        private Transform _follow;
        private Building.Building _defend;
        private Vector3 _post;
        private bool _hasPost;
        private float _nextApply;

        public SquadOrder Order { get { return _order; } }

        /// <summary>
        /// حان وقت تحديث هذه الفرقة؟ لكل فرقة ساعتها: تحديث **فرقة واحدة في
        /// كل دورة** يعطي اثنتي عشرة فرقة تحديثاً كل ثانيتين، وأمرُ «اتبعني»
        /// يلاحق بطلاً تحرّك عشرين متراً منذ آخر تحديث.
        /// </summary>
        public bool Due(float now)
        {
            return now >= _nextApply;
        }

        public void ScheduleNext(float now, float interval)
        {
            _nextApply = now + interval;
        }

        public IReadOnlyList<Unit> Members { get { return _members; } }

        /// <summary>المرساة الحالية — يرسم عندها العلامة.</summary>
        public Vector3 Anchor { get { return _anchor; } }

        /// <summary>أحياء الفرقة الآن.</summary>
        public int LiveCount
        {
            get
            {
                int live = 0;
                for (int i = 0; i < _members.Count; i++)
                {
                    if (_members[i] != null && _members[i].Alive)
                    {
                        live++;
                    }
                }

                return live;
            }
        }

        /// <summary>نسبة صحّة الفرقة من مجموع سقوفها. صفر إن فنيت.</summary>
        public float HealthFraction
        {
            get
            {
                float now = 0f;
                float max = 0f;

                for (int i = 0; i < _members.Count; i++)
                {
                    Unit unit = _members[i];
                    if (unit == null || unit.Definition == null)
                    {
                        continue;
                    }

                    max += unit.Definition.MaxHealth;
                    if (unit.Alive)
                    {
                        now += unit.Health;
                    }
                }

                return max > 0f ? now / max : 0f;
            }
        }

        /// <summary>الفرقة منهكة ويُعرض عليها التراجع (§9).</summary>
        public bool ShouldRetreat
        {
            get { return _order != SquadOrder.Retreat && LiveCount > 0 && HealthFraction < retreatThreshold; }
        }

        /// <summary>مركز الفرقة — لاختيارها بقربها من البطل.</summary>
        public Vector3 Centre
        {
            get
            {
                Vector3 sum = Vector3.zero;
                int live = 0;

                for (int i = 0; i < _members.Count; i++)
                {
                    Unit unit = _members[i];
                    if (unit != null && unit.Alive)
                    {
                        sum += unit.Body.position;
                        live++;
                    }
                }

                return live > 0 ? sum / live : _anchor;
            }
        }

        private void OnEnable()
        {
            SquadDirector director = SquadDirector.Instance;
            if (director != null)
            {
                director.Register(this);
            }
        }

        private void OnDisable()
        {
            SquadDirector director = SquadDirector.Instance;
            if (director != null)
            {
                director.Unregister(this);
            }
        }

        /// <summary>يضمّ جنديّاً إلى الفرقة ويسجّل موضع مرابطته الأوّل.</summary>
        public void Enlist(Unit unit)
        {
            if (unit == null || _members.Contains(unit))
            {
                return;
            }

            _members.Add(unit);
            _posts.Add(unit.Body.position);

            if (!_hasPost)
            {
                _post = unit.Body.position;
                _hasPost = true;
                _anchor = _post;
            }
        }

        /// <summary>يخلي الفرقة — عند هدم ثكنتها.</summary>
        public void Clear()
        {
            _members.Clear();
            _posts.Clear();
        }

        private void Start()
        {
            if (recruitRoot == null)
            {
                return;
            }

            Unit[] found = recruitRoot.GetComponentsInChildren<Unit>(true);
            for (int i = 0; i < found.Length; i++)
            {
                if (found[i].Definition != null && found[i].Faction == Faction.Kingdom)
                {
                    Enlist(found[i]);
                }
            }
        }

        /// <summary>يثبّت موضع المرابطة الأصلي (مكان الثكنة).</summary>
        public void SetPost(Vector3 post)
        {
            _post = post;
            _hasPost = true;
            if (_order == SquadOrder.Garrison)
            {
                _anchor = post;
            }
        }

        // ── الأوامر ─────────────────────────────────────────────────────────

        public void OrderFollow(Transform leader)
        {
            if (leader == null)
            {
                return;
            }

            _order = SquadOrder.Follow;
            _follow = leader;
            _defend = null;
        }

        public void OrderHold()
        {
            _order = SquadOrder.Hold;
            _follow = null;
            _defend = null;

            // تثبت حيث هي **الآن** لا حيث كانت: هذا هو معنى الأمر
            _anchor = Centre;
        }

        public void OrderDefend(Building.Building target)
        {
            if (target == null)
            {
                return;
            }

            _order = SquadOrder.Defend;
            _follow = null;
            _defend = target;
            _anchor = target.Body.position;
        }

        public void OrderRetreat(Vector3 refuge)
        {
            _order = SquadOrder.Retreat;
            _follow = null;
            _defend = null;
            _anchor = refuge;
        }

        public void OrderGarrison()
        {
            _order = SquadOrder.Garrison;
            _follow = null;
            _defend = null;
            _anchor = _hasPost ? _post : Centre;
        }

        // ── التنفيذ ─────────────────────────────────────────────────────────

        /// <summary>
        /// يوزّع المرساة والمقود على الأفراد. يُنادى من `SquadDirector` على
        /// فترته لا في كل إطار: التشكيل لا يحتاج ستّين تحديثاً في الثانية،
        /// و§9 نفسها تقول أربع إلى ثماني مرّات.
        /// </summary>
        public void Apply()
        {
            Vector3 anchor = _anchor;
            float leash = holdLeash;

            switch (_order)
            {
                case SquadOrder.Follow:
                    if (_follow == null)
                    {
                        OrderGarrison();
                        return;
                    }

                    anchor = _follow.position;
                    _anchor = anchor;
                    leash = followLeash;
                    break;

                case SquadOrder.Defend:
                    if (_defend == null || !_defend.Alive)
                    {
                        OrderGarrison();      // سقط ما تدافع عنه: تعود لمرابطتها
                        return;
                    }

                    anchor = _defend.Body.position;
                    _anchor = anchor;
                    leash = defendLeash;
                    break;

                case SquadOrder.Retreat:
                    // المتراجع لا يلاحق: مقودٌ ضيّق يكفي للدفاع عن نفسه
                    leash = 6f;
                    break;
            }

            // المرابطة تعيد كلّاً إلى موضعه لا إلى تشكيل: مواضع الحامية جزء
            // من تصميم المشهد، وجمعها في نقطة يفرّغ السور من حرّاسه.
            if (_order == SquadOrder.Garrison)
            {
                for (int i = 0; i < _members.Count; i++)
                {
                    Unit unit = _members[i];
                    if (unit != null && unit.Alive)
                    {
                        unit.SetPost(_posts[i], holdLeash);
                        unit.Guarded = null;
                    }
                }

                return;
            }

            int slot = 0;
            int live = LiveCount;

            for (int i = 0; i < _members.Count; i++)
            {
                Unit unit = _members[i];
                if (unit == null || !unit.Alive)
                {
                    continue;
                }

                unit.SetPost(anchor + FormationOffset(unit, slot, live), leash);
                unit.Guarded = _order == SquadOrder.Defend ? _defend : null;
                slot++;
            }
        }

        /// <summary>
        /// موضع الفرد في التشكيل. §9: **الرماة خلفه والحرّاس أمامه**.
        /// «أمام» تُقاس باتّجاه المرساة عن مركز الفرقة حين تتبع، وبالاتّجاه
        /// الثابت حين تثبت — فالتشكيل لا يدور مع كل خطوة.
        /// </summary>
        private Vector3 FormationOffset(Unit unit, int slot, int count)
        {
            if (count <= 1)
            {
                return Vector3.zero;
            }

            bool ranged = unit.Definition != null && unit.Definition.Ranged;

            Vector3 forward = Vector3.forward;
            if (_order == SquadOrder.Follow && _follow != null)
            {
                Vector3 heading = _follow.forward;
                heading.y = 0f;
                if (heading.sqrMagnitude > 0.0001f)
                {
                    forward = heading.normalized;
                }
            }

            Vector3 right = new Vector3(forward.z, 0f, -forward.x);

            // صفّان: الرماة صفّ الخلف والحرّاس صفّ الأمام
            float depth = ranged ? -formationRadius * 0.85f : formationRadius * 0.55f;
            float spread = ((slot % 4) - 1.5f) * (formationRadius * 0.62f);
            float rank = (slot / 4) * -formationRadius * 0.7f;

            return (forward * (depth + rank)) + (right * spread);
        }
    }
}
