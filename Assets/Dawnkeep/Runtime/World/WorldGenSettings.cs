using UnityEngine;

namespace Dawnkeep.World
{
    /// <summary>
    /// كل أرقام توليد العالم في أصل بيانات واحد — لا رقم توازن مدفون داخل الكود.
    /// إنشاء: Assets ▸ Create ▸ مملكة الرماد ▸ إعدادات توليد العالم
    /// </summary>
    [CreateAssetMenu(
        fileName = "WorldGenSettings",
        menuName = "مملكة الرماد/إعدادات توليد العالم",
        order = 10)]
    public class WorldGenSettings : ScriptableObject
    {
        [Header("الشبكة")]
        [Tooltip("بذرة التوليد — نفس البذرة تعطي نفس الخريطة تماماً.")]
        [SerializeField] private int seed = 3;

        [Tooltip("دقّة شبكة المحاكاة (يُفضّل 2^n+1). 513 توازن جيد بين التفصيل وزمن التوليد.")]
        [SerializeField] private int resolution = 513;

        [Tooltip("طول ضلع العالم بالوحدات (متر).")]
        [SerializeField] private float worldSize = 3600f;

        [Tooltip("دقّة شبكة تضاريس Unity (يجب أن تكون 2^n+1). أعلى من دقّة المحاكاة: تُرفَع بمنحنى ناعم فتختفي الوجوه المسطّحة.")]
        [SerializeField] private int terrainResolution = 1025;

        [Tooltip("نتوء دقيق يُضاف فوق السطح الناعم (متر) — يمنع مظهر البلاستيك الأملس عن قرب.")]
        [SerializeField] private float microRelief = 0.55f;

        [Tooltip("مقياس العالم: إحداثيات التوليد تُضرب فيه قبل بنائها في المشهد. 0.6 تعني خريطة 2160 متراً — عندها تبدو الشجرة شجرةً لا نقطة.")]
        [Range(0.2f, 1.5f)]
        [SerializeField] private float worldScale = 0.6f;

        [Tooltip("بعد هذا النصف قطر يبدأ طوق الجبال بالارتفاع.")]
        [SerializeField] private float edgeRadius = 1300f;

        [Tooltip("ارتفاع ربوة القلعة في قلب الحوض.")]
        [SerializeField] private float knollHeight = 52f;

        [Header("التضاريس المبدئية")]
        [SerializeField] private float broadHills = 78f;
        [SerializeField] private float midHills = 38f;
        [SerializeField] private float roughness = 10f;
        [SerializeField] private float basinTilt = 0.019f;
        [SerializeField] private float rimBase = 150f;
        [SerializeField] private float rimRidges = 440f;
        [SerializeField] private float rimWarp = 820f;
        [Tooltip("عمق فجوة المصبّ في طوق الجبال (0 = بلا فجوة، 1 = فجوة كاملة).")]
        [Range(0f, 1f)]
        [SerializeField] private float gorgeDepth = 0.86f;

        [Header("التعرية المائية")]
        [SerializeField] private int droplets = 190000;
        [SerializeField] private int dropletLifetime = 42;
        [Range(0f, 1f)]
        [SerializeField] private float inertia = 0.055f;
        [SerializeField] private float sedimentCapacity = 5.4f;
        [SerializeField] private float minSlope = 0.011f;
        [Range(0f, 1f)]
        [SerializeField] private float erodeSpeed = 0.36f;
        [Range(0f, 1f)]
        [SerializeField] private float depositSpeed = 0.16f;
        [Range(0f, 1f)]
        [SerializeField] private float evaporation = 0.016f;
        [SerializeField] private float gravity = 6f;

        [Header("التعرية الحرارية (انهيار المنحدرات)")]
        [Tooltip("عدد المرّات التي يُعاد فيها ترتيب المنحدرات فوق زاوية الاستقرار.")]
        [SerializeField] private int thermalIterations = 32;

        [Tooltip("زاوية استقرار الحطام كميل (0.82 ≈ 39 درجة). أعلى = جبال أحدّ.")]
        [SerializeField] private float talusAngle = 0.82f;

        [Range(0.05f, 1f)]
        [SerializeField] private float thermalRate = 0.45f;

        [Header("تفصيل الصخر (أضلاع وأخاديد الجبل)")]
        [Tooltip("سعة الأعراف الثانوية على الميول الحادّة. التعرية الحرارية تُنعّم الجبل حتى يصير كتلة صمّاء — هذا يعيد له حدّته.")]
        [SerializeField] private float rockDetailAmplitude = 104f;

        [Tooltip("تشويه المجال قبل الضجيج المطويّ. بدونه تخرج الأضلاع متوازية منتظمة كتضليع صناعي.")]
        [SerializeField] private float rockDetailWarp = 760f;

        [Header("البحيرة")]
        [Tooltip("أقل عمق غمر يُعدّ خلية بحيرة.")]
        [SerializeField] private float lakeMinDepth = 1.2f;
        [SerializeField] private int lakeMinCells = 180;
        [SerializeField] private int lakeMaxCells = 52000;

        [Header("النهر")]
        [SerializeField] private float riverSearchInner = 260f;
        [SerializeField] private float riverSearchOuter = 900f;
        [SerializeField] private float riverWidthScale = 0.62f;
        [SerializeField] private float riverWidthMin = 26f;
        [SerializeField] private float riverWidthMax = 52f;
        [SerializeField] private float riverCarveDepth = 22f;
        [SerializeField] private float riverBankHeight = 4.5f;

        [Header("الطرق")]
        [Tooltip("عدد المداخل من طوق الجبال إلى ربوة القلعة.")]
        [SerializeField] private int roadCount = 3;
        [SerializeField] private float roadGradePenalty = 40f;
        [SerializeField] private float roadCliffGrade = 0.34f;
        [SerializeField] private float roadCliffPenalty = 26f;
        [SerializeField] private float roadRiverCrossCost = 1400f;
        [SerializeField] private float roadLakeCost = 9000f;
        [SerializeField] private float roadCoreWidth = 9f;
        [SerializeField] private float roadFeatherWidth = 26f;

        [Header("موقع القلعة")]
        [Tooltip("نصف قطر المصطبة المسوّاة تماماً (وحدات توليد).")]
        [SerializeField] private float terraceInner = 190f;

        [Tooltip("نصف قطر التلاشي إلى الأرض الطبيعية.")]
        [SerializeField] private float terraceOuter = 330f;

        [Tooltip("نصف قطر سور القلعة (وحدات توليد قبل ضربها في مقياس العالم).")]
        [SerializeField] private float castleRadius = 150f;

        [Tooltip("عدد بيوت القرية على الطريق خارج البوّابة.")]
        [SerializeField] private int villageHouses = 16;

        [Header("الغطاء النباتي")]
        [Tooltip("أعلى ميل (0..1) تنبت عليه الأشجار.")]
        [Range(0f, 1f)]
        [SerializeField] private float treeMaxSlope = 0.60f;
        [Tooltip("أقلّ رطوبة (0..1) مطلوبة للغابة.")]
        [Range(0f, 1f)]
        [SerializeField] private float treeMinMoisture = 0.13f;
        [SerializeField] private int treeTarget = 4200;
        [Range(0f, 1f)]
        [SerializeField] private float grassMaxSlope = 0.5f;
        [SerializeField] private int grassDensity = 9;
        [Tooltip("ارتفاع خصلة العشب بالمتر (أدنى/أعلى).")]
        [SerializeField] private Vector2 grassHeight = new Vector2(0.45f, 1.05f);
        [Tooltip("عرض خصلة العشب بالمتر (أدنى/أعلى).")]
        [SerializeField] private Vector2 grassWidth = new Vector2(0.85f, 1.75f);

        public int Seed { get { return seed; } }
        public int Resolution { get { return Mathf.Clamp(resolution, 129, 1025); } }
        public float WorldSize { get { return worldSize; } }
        public int TerrainResolution { get { return Mathf.Clamp(terrainResolution, 129, 2049); } }
        public float MicroRelief { get { return microRelief; } }
        public float WorldScale { get { return worldScale; } }
        public float EdgeRadius { get { return edgeRadius; } }
        public float KnollHeight { get { return knollHeight; } }

        public float BroadHills { get { return broadHills; } }
        public float MidHills { get { return midHills; } }
        public float Roughness { get { return roughness; } }
        public float BasinTilt { get { return basinTilt; } }
        public float RimBase { get { return rimBase; } }
        public float RimRidges { get { return rimRidges; } }
        public float RimWarp { get { return rimWarp; } }
        public float GorgeDepth { get { return gorgeDepth; } }

        public int Droplets { get { return droplets; } }
        public int DropletLifetime { get { return dropletLifetime; } }
        public float Inertia { get { return inertia; } }
        public float SedimentCapacity { get { return sedimentCapacity; } }
        public float MinSlope { get { return minSlope; } }
        public float ErodeSpeed { get { return erodeSpeed; } }
        public float DepositSpeed { get { return depositSpeed; } }
        public float Evaporation { get { return evaporation; } }
        public float Gravity { get { return gravity; } }

        public int ThermalIterations { get { return thermalIterations; } }
        public float TalusAngle { get { return talusAngle; } }
        public float ThermalRate { get { return thermalRate; } }

        public float RockDetailAmplitude { get { return rockDetailAmplitude; } }

        public float RockDetailWarp { get { return rockDetailWarp; } }

        public float LakeMinDepth { get { return lakeMinDepth; } }
        public int LakeMinCells { get { return lakeMinCells; } }
        public int LakeMaxCells { get { return lakeMaxCells; } }

        public float RiverSearchInner { get { return riverSearchInner; } }
        public float RiverSearchOuter { get { return riverSearchOuter; } }
        public float RiverWidthScale { get { return riverWidthScale; } }
        public float RiverWidthMin { get { return riverWidthMin; } }
        public float RiverWidthMax { get { return riverWidthMax; } }
        public float RiverCarveDepth { get { return riverCarveDepth; } }
        public float RiverBankHeight { get { return riverBankHeight; } }

        public int RoadCount { get { return Mathf.Clamp(roadCount, 1, 8); } }
        public float RoadGradePenalty { get { return roadGradePenalty; } }
        public float RoadCliffGrade { get { return roadCliffGrade; } }
        public float RoadCliffPenalty { get { return roadCliffPenalty; } }
        public float RoadRiverCrossCost { get { return roadRiverCrossCost; } }
        public float RoadLakeCost { get { return roadLakeCost; } }
        public float RoadCoreWidth { get { return roadCoreWidth; } }
        public float RoadFeatherWidth { get { return roadFeatherWidth; } }

        public float TerraceInner { get { return terraceInner; } }
        public float TerraceOuter { get { return terraceOuter; } }
        public float CastleRadius { get { return castleRadius; } }
        public int VillageHouses { get { return villageHouses; } }

        public float TreeMaxSlope { get { return treeMaxSlope; } }
        public float TreeMinMoisture { get { return treeMinMoisture; } }
        public int TreeTarget { get { return treeTarget; } }
        public float GrassMaxSlope { get { return grassMaxSlope; } }
        public int GrassDensity { get { return grassDensity; } }
        public Vector2 GrassHeight { get { return grassHeight; } }
        public Vector2 GrassWidth { get { return grassWidth; } }
    }
}
