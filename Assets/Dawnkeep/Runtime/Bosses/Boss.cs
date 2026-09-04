using UnityEngine;
using Dawnkeep.Combat;

namespace Dawnkeep.Bosses
{
    /// <summary>
    /// حالة زعيمٍ في الساحة. **لا `Update` فيه**: `BossDirector` يحرّك الجميع
    /// في حلقة واحدة (§1). هذا وعاء الحالة والمراجع لا غير.
    /// </summary>
    [RequireComponent(typeof(Unit))]
    [DisallowMultipleComponent]
    public class Boss : MonoBehaviour
    {
        [Tooltip("تعريف الزعيم. يُملأ عند الاستدعاء أو من باني المشهد.")]
        [SerializeField] private BossDefinition definition;

        private Unit _unit;
        private Transform _transform;

        public BossDefinition Definition { get { return definition; } }

        public Unit Unit { get { return _unit; } }

        public Transform Body { get { return _transform; } }

        /// <summary>الطور الجاري بدءاً من واحد.</summary>
        public int Phase { get; set; }

        /// <summary>لحظة الحدث التالي لهذا الزعيم (اندفاع، بركة، بيض، إطفاء).</summary>
        public float NextAbility { get; set; }

        /// <summary>لحظة الحدث الثاني — لكلّ زعيمٍ ساعتان لا واحدة.</summary>
        public float NextSecond { get; set; }

        /// <summary>لحظة انتهاء الإنذار الجاري. صفر يعني لا إنذار.</summary>
        public float TelegraphUntil { get; set; }

        /// <summary>لحظة انتهاء الاندفاع الجاري.</summary>
        public float ChargeUntil { get; set; }

        /// <summary>اتّجاه الاندفاع، مثبَّت لحظةَ الإنذار لا لحظةَ الانطلاق.</summary>
        public Vector3 ChargeDirection { get; set; }

        /// <summary>ما بقي من مدى الاندفاع بالمتر.</summary>
        public float ChargeLeft { get; set; }

        /// <summary>هل بدأ استدعاء الحاشية؟ (عتبة نصف الصحّة في §13)</summary>
        public bool SummoningBegun { get; set; }

        /// <summary>هل هو في طور الظلّ الآن؟ (تاج الرماد)</summary>
        public bool InShadow { get; set; }

        /// <summary>المنارة المستهدَفة بالإطفاء، ومسارُها مرئيّ قبله (§13).</summary>
        public Dawnkeep.Light.Beacon SnuffTarget { get; set; }

        /// <summary>هل عُرضت لقطة ظهوره؟ تُعرض مرّة لا كلّما دخل الإطار.</summary>
        public bool IntroShown { get; set; }

        /// <summary>الجهة التي يهاجم منها الآن (آكل الفجر يبدّلها).</summary>
        public int Side { get; set; }

        public void SetDefinition(BossDefinition value)
        {
            definition = value;
        }

        private void Awake()
        {
            _unit = GetComponent<Unit>();
            _transform = transform;
            Phase = 1;
        }

        /// <summary>تهيئة عند دخوله الساحة. تُستدعى مرّة.</summary>
        public void Enter()
        {
            if (_unit == null)
            {
                Awake();
            }

            Phase = 1;
            NextAbility = 0f;
            NextSecond = 0f;
            TelegraphUntil = 0f;
            ChargeUntil = 0f;
            ChargeLeft = 0f;
            SummoningBegun = false;
            InShadow = false;
            SnuffTarget = null;
            IntroShown = false;
            Side = 0;

            if (_unit != null)
            {
                _unit.DamageTakenScale = 1f;
            }
        }

        /// <summary>نسبة صحّته الباقية — عليها تُبنى عتبات الأطوار.</summary>
        public float HealthFraction
        {
            get
            {
                if (_unit == null || !_unit.Alive)
                {
                    return 0f;
                }

                return Mathf.Clamp01(_unit.Health / Mathf.Max(1f, _unit.MaxHealth));
            }
        }
    }
}
