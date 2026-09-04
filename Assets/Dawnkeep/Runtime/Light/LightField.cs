using System.Collections.Generic;
using Dawnkeep.Combat;
using UnityEngine;

namespace Dawnkeep.Light
{
    /// <summary>
    /// حقل النور: سجلّ المنارات، والمرجع الذي يسأله القتال «كم من النور هنا؟».
    ///
    /// الاستعلام **بلا تخصيص ذاكرة**: مرور على مصفوفة قصيرة (منارات معدودة لا
    /// عشرات) بمسافات مربّعة. يُنادى لكل وحدة في كل إطار، فأي قائمة تُبنى هنا
    /// تصير قمامة مئتَي مرّة في الإطار.
    ///
    /// المخزون هنا لا في المنارة: الشحنة تُنقل بين المنارات، فلا بدّ من مكان
    /// واحد تُحسب فيه — وهو قلب الحصن (§11).
    /// </summary>
    [DisallowMultipleComponent]
    public class LightField : MonoBehaviour
    {
        public static LightField Instance { get; private set; }

        [SerializeField] private LightSettings settings;

        [Tooltip("مصدر طور الموجة — تُقرأ منه حدّة حواف الدوائر (§11).")]
        [SerializeField] private WaveDirector waves;

        private readonly List<Beacon> _beacons = new List<Beacon>(16);
        private int _stock;
        private bool _stockReady;
        private float _shownSharp = -1f;

        public LightSettings Settings { get { return settings; } }

        /// <summary>شحنات في المخزون لم تُوضع بعد على منارة.</summary>
        public int Stock { get { return _stock; } }

        /// <summary>عدد المنارات المضيئة الآن — تعرضه الواجهة.</summary>
        public int LitCount
        {
            get
            {
                int lit = 0;
                for (int i = 0; i < _beacons.Count; i++)
                {
                    if (_beacons[i] != null && _beacons[i].IsLit)
                    {
                        lit++;
                    }
                }

                return lit;
            }
        }

        public IReadOnlyList<Beacon> Beacons { get { return _beacons; } }

        /// <summary>
        /// مضاعفٌ عامّ على أنصاف أقطار المنارات كلّها. يسحبه آكل الفجر في
        /// طوره الأخير (§13)، فتضيق الدوائر أمام عين اللاعب.
        ///
        /// هنا لا في `LightSettings`: ذاك أصلٌ في المشروع يبقى بعد الجولة،
        /// فسحبٌ يُكتب فيه يظلّ ساري المفعول في المرحلة التالية.
        /// </summary>
        public float RadiusMultiplier { get; set; }

        private void Awake()
        {
            Instance = this;
            RadiusMultiplier = 1f;
            if (!_stockReady)
            {
                _stock = settings != null ? settings.StartingCharges : 2;
                _stockReady = true;
            }
        }

        private void Start()
        {
            // المنارات الموضوعة في المشهد قد تكون سبقت هذا الكائن في الإيقاظ،
            // فتسجيلها في OnEnable وقع على Instance فارغ. مرّة واحدة هنا تُكمل.
            if (waves == null)
            {
                waves = FindAnyObjectByType<WaveDirector>();
            }

            Beacon[] placed = FindObjectsByType<Beacon>(FindObjectsInactive.Exclude, FindObjectsSortMode.None);
            for (int i = 0; i < placed.Length; i++)
            {
                Register(placed[i]);
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        private void Update()
        {
            // حدّة الحواف: واضحة أثناء التخطيط، ناعمة في القتال (§11)
            bool planning = waves == null || waves.CanHasten || waves.Phase == WavePhase.Idle;
            float sharp = planning ? 1f : 0f;
            if (!Mathf.Approximately(sharp, _shownSharp))
            {
                _shownSharp = sharp;
                for (int i = 0; i < _beacons.Count; i++)
                {
                    if (_beacons[i] != null)
                    {
                        _beacons[i].SetEdgeSharpness(sharp);
                    }
                }
            }
        }

        public void Register(Beacon beacon)
        {
            if (beacon == null || _beacons.Contains(beacon))
            {
                return;
            }

            if (beacon.Settings == null && settings != null)
            {
                beacon.Configure(settings, beacon.Charges);
            }

            _beacons.Add(beacon);
        }

        public void Unregister(Beacon beacon)
        {
            _beacons.Remove(beacon);
        }

        /// <summary>
        /// عيّنة نقطة: أقوى منارة تغطّيها، بشحناتها وبمقدار التلاشي عند حافّتها.
        ///
        /// تُؤخذ **أقوى** منارة لا مجموعها: منارتان متجاورتان لا تصنعان نوراً
        /// مضاعفاً بل منطقة واحدة أوسع. ومرورٌ واحد يخدم كل الاستعلامات، فلا
        /// تُمشَّط المنارات أربع مرّات لكل وحدة في كل إطار.
        /// </summary>
        /// <summary>المضاعف مقصوصاً — صفرٌ أو سالبٌ يعني قسمة على صفر أدناه.</summary>
        private float Multiplier
        {
            get { return Mathf.Clamp(RadiusMultiplier <= 0f ? 1f : RadiusMultiplier, 0.05f, 4f); }
        }

        private void Sample(Vector3 point, out int charges, out float falloff)
        {
            charges = 0;
            falloff = 0f;

            float softness = settings != null ? Mathf.Max(0.02f, settings.EdgeSoftness) : 0.16f;
            float bestDepth = 0f;

            for (int i = 0; i < _beacons.Count; i++)
            {
                Beacon beacon = _beacons[i];
                if (beacon == null || !beacon.IsLit)
                {
                    continue;
                }

                float radius = beacon.Radius * Multiplier;
                Vector3 delta = point - beacon.Position;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr >= radius * radius)
                {
                    continue;
                }

                // العمق نسبةً إلى نصف القطر: يرجّح المنارة التي النقطةُ في
                // قلبها على أخرى تلامسها بحافّتها، مهما اختلف اتّساعهما.
                float distance = Mathf.Sqrt(distSqr);
                float depth = 1f - (distance / radius);
                if (depth <= bestDepth)
                {
                    continue;
                }

                bestDepth = depth;
                charges = beacon.Charges;

                float edge = radius * softness;
                falloff = edge > 0.001f ? Mathf.Clamp01((radius - distance) / edge) : 1f;
            }
        }

        /// <summary>شدّة النور عند نقطة: صفر خارج كل دائرة، وواحد في قلب أقواها.</summary>
        public float LightAt(Vector3 point)
        {
            int charges;
            float falloff;
            Sample(point, out charges, out falloff);
            return falloff;
        }

        /// <summary>شحنات أقوى منارة تغطّي النقطة.</summary>
        public int ChargesAt(Vector3 point)
        {
            int charges;
            float falloff;
            Sample(point, out charges, out falloff);
            return charges;
        }

        /// <summary>
        /// ما تقضمه المنطقة من درع الظلام عند نقطة، من صفر إلى واحد.
        /// انظر `LightSettings.ZoneArmourCut` لتوفيق §3 مع §11.
        /// </summary>
        public float ArmourCutAt(Vector3 point)
        {
            if (settings == null)
            {
                return 0f;
            }

            int charges;
            float falloff;
            Sample(point, out charges, out falloff);
            if (charges <= 0)
            {
                return 0f;
            }

            float cut = settings.ZoneArmourCut + (charges * settings.ArmourCutPerCharge);
            return Mathf.Clamp01(cut) * falloff;
        }

        /// <summary>زيادة المدى الممنوحة داخل المنطقة عند نقطة (§11: +5% لكل شحنة).</summary>
        public float RangeBonusAt(Vector3 point)
        {
            if (settings == null)
            {
                return 0f;
            }

            int charges;
            float falloff;
            Sample(point, out charges, out falloff);
            return charges * settings.RangeBonusPerCharge * falloff;
        }

        /// <summary>أقرب منارة مضيئة — يقصدها آكل القناديل.</summary>
        public Beacon NearestLit(Vector3 point)
        {
            Beacon best = null;
            float bestSqr = float.MaxValue;

            for (int i = 0; i < _beacons.Count; i++)
            {
                Beacon beacon = _beacons[i];
                if (beacon == null || !beacon.IsLit)
                {
                    continue;
                }

                Vector3 delta = point - beacon.Position;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr < bestSqr)
                {
                    bestSqr = distSqr;
                    best = beacon;
                }
            }

            return best;
        }

        /// <summary>أقرب منارة إلى نقطة بأيّ حال — لأمر اللاعب باللمس.</summary>
        public Beacon NearestAny(Vector3 point, float maxDistance)
        {
            Beacon best = null;
            float bestSqr = maxDistance * maxDistance;

            for (int i = 0; i < _beacons.Count; i++)
            {
                Beacon beacon = _beacons[i];
                if (beacon == null)
                {
                    continue;
                }

                Vector3 delta = point - beacon.Position;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr < bestSqr)
                {
                    bestSqr = distSqr;
                    best = beacon;
                }
            }

            return best;
        }

        /// <summary>
        /// ينقل شحنة من المخزون إلى منارة، أو يعيدها إلى المخزون إن لم يبقَ
        /// فيه شيء أو امتلأت المنارة. لمسة واحدة تفعل الصواب في الحالتين،
        /// وهي قابلة للتراجع دائماً. يعيد true إن تغيّر شيء.
        /// </summary>
        public bool ToggleCharge(Beacon beacon)
        {
            if (beacon == null)
            {
                return false;
            }

            if (_stock > 0 && beacon.AddCharge())
            {
                _stock--;
                return true;
            }

            if (beacon.RemoveCharge())
            {
                _stock++;
                return true;
            }

            return false;
        }

        /// <summary>يضيف شحنات إلى المخزون — من ترقية أو مكافأة موجة.</summary>
        public void GrantCharges(int count)
        {
            if (count > 0)
            {
                _stock += count;
            }
        }
    }
}
