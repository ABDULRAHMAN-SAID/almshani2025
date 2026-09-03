using System.Collections.Generic;
using Dawnkeep.World;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// يحوّل حقول التوليد إلى تضاريس Unity: ارتفاعات، خرائط طبقات، عشب، وأشجار.
    /// كل قرار هنا مشتقّ من الفيزياء: الصخر حيث الميل حادّ، الحصى على ضفاف النهر
    /// وممرّات الطرق، العشب حيث الرطوبة، والغابة حيث تجتمع الرطوبة مع الميل اللطيف.
    /// </summary>
    public static class DawnkeepTerrainPainter
    {
        public const int AlphamapResolution = 1024;
        public const int DetailResolution = 1024;
        public const int DetailPatch = 16;

        /// <summary>Unity يشترط دقّة خريطة ارتفاع 2^n+1 — نأخذ أقرب قيمة صالحة.</summary>
        private static int NearestPowerPlusOne(int wanted)
        {
            int p = 128;
            while ((p * 2) + 1 <= wanted)
            {
                p *= 2;
            }

            return p + 1;
        }

        public static TerrainData BuildTerrainData(WorldGenSettings settings, WorldData world, string assetPath)
        {
            TerrainData data = AssetDatabase.LoadAssetAtPath<TerrainData>(assetPath);
            if (data == null)
            {
                data = new TerrainData();
                AssetDatabase.CreateAsset(data, assetPath);
            }

            // شبكة التضاريس أدقّ من شبكة المحاكاة: تُرفَع بمنحنى Catmull-Rom ناعم
            // ثم يُضاف نتوء دقيق — وإلا ظهرت الأرض عن قرب مضلّعات مسطّحة.
            int res = NearestPowerPlusOne(settings.TerrainResolution);
            float range = Mathf.Max(40f, (world.MaxHeight - world.MinHeight) + (settings.MicroRelief * 2f));

            data.heightmapResolution = res;
            float scale = settings.WorldScale;
            data.size = new Vector3(world.WorldSize * scale, range * scale, world.WorldSize * scale);

            EditorUtility.DisplayProgressBar("مملكة الرماد", "كتابة الارتفاعات…", 0.05f);
            float[,] heights = new float[res, res];
            float half = world.WorldSize * 0.5f;
            float micro = settings.MicroRelief;

            for (int j = 0; j < res; j++)
            {
                float wz = ((float)j / (res - 1) * world.WorldSize) - half;

                for (int i = 0; i < res; i++)
                {
                    float wx = ((float)i / (res - 1) * world.WorldSize) - half;
                    float y = world.SampleSmooth(world.Height, wx, wz);

                    if (micro > 0f)
                    {
                        y += (Dawnkeep.World.ValueNoise.Fbm(wx * 0.042, wz * 0.042, 3) - 0.5f) * 2f * micro;
                        y += (Dawnkeep.World.ValueNoise.Fbm((wx * 0.105) + 7.0, (wz * 0.105) - 3.0, 2) - 0.5f) * 2f * micro * 0.55f;
                    }

                    heights[j, i] = Mathf.Clamp01((y - world.MinHeight) / range);
                }
            }

            data.SetHeights(0, 0, heights);

            EditorUtility.DisplayProgressBar("مملكة الرماد", "رسم طبقات الأرض…", 0.35f);
            PaintSplat(settings, world, data);

            EditorUtility.DisplayProgressBar("مملكة الرماد", "زرع العشب…", 0.62f);
            PaintDetails(settings, world, data);

            EditorUtility.DisplayProgressBar("مملكة الرماد", "زرع الغابات…", 0.80f);
            PlantTrees(settings, world, data);

            data.wavingGrassStrength = 0.42f;
            data.wavingGrassAmount = 0.32f;
            data.wavingGrassSpeed = 0.38f;
            data.wavingGrassTint = new Color(0.72f, 0.76f, 0.55f, 1f);

            EditorUtility.SetDirty(data);
            return data;
        }

        /// <summary>
        /// أوزان الطبقات السبع لكل خلية: عشب، تربة، صخر، حصى، جرف، حطام سفح، ثلج.
        /// القاعدتان اللتان تصنعان جبلاً بدل كتلة طينية:
        /// (أ) التربة لا تثبت على وجه شديد الميل فتقلّ معه لا تزداد،
        /// (ب) خطّ الثلج يتموّج مع ضجيج كبير فلا يقطع الجبل بخطّ مسطرة أفقي.
        /// </summary>
        private static void PaintSplat(WorldGenSettings settings, WorldData world, TerrainData data)
        {
            TerrainLayer[] layers = DawnkeepTextureBaker.BuildTerrainLayers();
            data.terrainLayers = layers;
            data.alphamapResolution = AlphamapResolution;

            int res = AlphamapResolution;
            int n = world.Resolution;
            float[,,] map = new float[res, res, layers.Length];
            float half = world.WorldSize * 0.5f;
            float riverWidth = world.River.Length > 0 ? world.RiverWidth : 0f;
            float range = Mathf.Max(1f, world.MaxHeight - world.MinHeight);

            for (int y = 0; y < res; y++)
            {
                float wz = (((y + 0.5f) / res) * world.WorldSize) - half;

                for (int x = 0; x < res; x++)
                {
                    float wx = (((x + 0.5f) / res) * world.WorldSize) - half;

                    int i = Mathf.Clamp(Mathf.RoundToInt((wx + half) / world.Step), 0, n - 1);
                    int j = Mathf.Clamp(Mathf.RoundToInt((wz + half) / world.Step), 0, n - 1);
                    int k = (j * n) + i;

                    float slope = world.SlopeAt(i, j);
                    float moisture = world.Moisture[k];
                    float altitude = (world.Height[k] - world.MinHeight) / range;
                    float riverDist = world.RiverDistance[k];
                    float roadDist = world.RoadDistance[k];
                    float flowN = Mathf.Clamp01(Mathf.Log(1f + world.Flow[k]) / 7f);

                    // ثلاثة مقاييس من التبقيع: كبير يلوّن الجبل، ودقيق يكسر التدرّج
                    float macro = ValueNoise.Fbm((wx * 0.0034) + 53.0, (wz * 0.0034) - 29.0, 4) - 0.5f;
                    float spotA = ValueNoise.Fbm((wx * 0.026) + 11.0, (wz * 0.026) - 7.0, 3) - 0.5f;
                    float spotB = ValueNoise.Fbm((wx * 0.085) - 3.0, (wz * 0.085) + 19.0, 2) - 0.5f;

                    // جرف: الوجه المكشوف الحادّ العالي
                    float cliff = Smooth(0.44f, 0.92f, slope) * Smooth(0.15f, 0.42f, altitude);
                    cliff *= 0.55f + (0.9f * Mathf.Clamp01((macro * 2.2f) + 0.5f));

                    // حطام السفح: ميل متوسّط تحت الجروف، وفي الأخاديد حيث يتجمّع الانهيار
                    float scree = Smooth(0.22f, 0.50f, slope) * (1f - Smooth(0.72f, 1.10f, slope))
                                * Smooth(0.22f, 0.52f, altitude);
                    scree *= 0.45f + (1.0f * Mathf.Clamp01((-macro * 2.2f) + 0.5f));
                    scree += flowN * Smooth(0.30f, 0.70f, slope) * Smooth(0.28f, 0.60f, altitude) * 0.55f;

                    // صخر عام على المنحدرات الأدنى
                    float rock = Smooth(0.36f, 0.80f, slope) * (1f - (Smooth(0.30f, 0.62f, altitude) * 0.75f));
                    rock += Smooth(0.62f, 0.95f, altitude) * 0.30f;
                    rock += Mathf.Clamp01(spotB * 0.5f) * Mathf.Clamp01((slope - 0.30f) * 2.2f);

                    // حصى: ضفاف النهر، قاع البحيرة، وممرّ الطريق المدكوك
                    float gravel = 0f;
                    if (riverWidth > 0f)
                    {
                        gravel += Mathf.Clamp01(1f - (riverDist / (riverWidth * 1.9f)));
                    }

                    if (roadDist < settings.RoadFeatherWidth)
                    {
                        gravel += Mathf.Clamp01(1f - (roadDist / settings.RoadFeatherWidth)) * 1.35f;
                    }

                    if (world.Lake[k] != 0)
                    {
                        gravel += 0.9f;
                    }

                    // العشب هو الغطاء الافتراضي على الأرض اللطيفة غير القاحلة
                    float grass = Mathf.Clamp01((moisture + 0.22f + (spotA * 0.30f)) * 1.9f)
                                * Mathf.Clamp01(1f - (slope * 1.7f))
                                * (1f - (Smooth(0.42f, 0.70f, altitude) * 0.85f));

                    // التربة تقلّ مع الميل: لا تثبت على وجه جبلي حادّ
                    float soil = ((Mathf.Clamp01((0.42f - moisture - (spotA * 0.34f) + (spotB * 0.16f)) * 1.8f) * 0.9f) + 0.14f)
                               * Mathf.Clamp01(1f - ((slope - 0.26f) * 2.4f));
                    soil *= 1f - (Smooth(0.38f, 0.66f, altitude) * 0.9f);

                    // ثلج القمم: لا يثبت على الوجوه شبه العمودية لأنّه ينزلق عنها
                    float snowLine = 0.635f + (macro * 0.26f) + (spotA * 0.10f);
                    float snow = Smooth(snowLine, snowLine + 0.115f, altitude) * (1f - Smooth(0.74f, 1.18f, slope));
                    snow = Mathf.Max(snow, 0f);
                    float keep = 1f - (snow * 0.93f);

                    grass = Mathf.Max(grass, 0f) * keep;
                    soil = Mathf.Max(soil, 0.03f) * keep;
                    rock = Mathf.Max(rock, 0f) * keep;
                    gravel = Mathf.Max(gravel, 0f) * keep;
                    cliff = Mathf.Max(cliff, 0f) * keep;
                    scree = Mathf.Max(scree, 0f) * keep;
                    snow *= 1.6f;

                    float sum = grass + soil + rock + gravel + cliff + scree + snow;
                    if (sum <= 1e-4f)
                    {
                        grass = 1f;
                        sum = 1f;
                    }

                    map[y, x, 0] = grass / sum;
                    map[y, x, 1] = soil / sum;
                    map[y, x, 2] = rock / sum;
                    map[y, x, 3] = gravel / sum;
                    map[y, x, 4] = cliff / sum;
                    map[y, x, 5] = scree / sum;
                    map[y, x, 6] = snow / sum;
                }
            }

            data.SetAlphamaps(0, 0, map);
        }

        /// <summary>تنعيم smoothstep بين حدّين — يوافق sm() في نموذج المعاينة.</summary>
        private static float Smooth(float a, float b, float v)
        {
            float t = Mathf.Clamp01((v - a) / Mathf.Max(1e-5f, b - a));
            return t * t * (3f - (2f * t));
        }

        /// <summary>العشب: كثافة مشتقّة من وزن طبقة العشب، ممنوع في الماء والطريق والجرف.</summary>
        private static void PaintDetails(WorldGenSettings settings, WorldData world, TerrainData data)
        {
            Texture2D clump = AssetDatabase.LoadAssetAtPath<Texture2D>(
                DawnkeepTextureBaker.AlbedoPath("grass_clump"));

            if (clump == null)
            {
                Debug.LogWarning("مملكة الرماد: خامة العشب غير موجودة — نفّذ الخطوة 3 أولاً.");
                return;
            }

            DetailPrototype tall = new DetailPrototype();
            tall.prototypeTexture = clump;
            tall.renderMode = DetailRenderMode.Grass;
            tall.usePrototypeMesh = false;
            Vector2 gw = settings.GrassWidth;
            Vector2 gh = settings.GrassHeight;
            tall.minWidth = gw.x;
            tall.maxWidth = gw.y;
            tall.minHeight = gh.x;
            tall.maxHeight = gh.y;
            tall.noiseSpread = 0.4f;
            tall.healthyColor = new Color(0.72f, 0.78f, 0.48f);
            tall.dryColor = new Color(0.70f, 0.62f, 0.33f);

            DetailPrototype low = new DetailPrototype();
            low.prototypeTexture = clump;
            low.renderMode = DetailRenderMode.Grass;
            low.usePrototypeMesh = false;
            low.minWidth = gw.x * 0.7f;
            low.maxWidth = gw.y * 0.7f;
            low.minHeight = gh.x * 0.62f;
            low.maxHeight = gh.y * 0.62f;
            low.noiseSpread = 0.8f;
            low.healthyColor = new Color(0.62f, 0.66f, 0.40f);
            low.dryColor = new Color(0.66f, 0.57f, 0.31f);

            data.detailPrototypes = new DetailPrototype[] { tall, low };
            data.SetDetailResolution(DetailResolution, DetailPatch);

            int res = DetailResolution;
            int n = world.Resolution;
            float half = world.WorldSize * 0.5f;
            float riverWidth = world.River.Length > 0 ? world.RiverWidth : 0f;
            int[,] dense = new int[res, res];
            int[,] sparse = new int[res, res];
            int maxDensity = Mathf.Clamp(settings.GrassDensity, 1, 16);

            for (int y = 0; y < res; y++)
            {
                float wz = (((y + 0.5f) / res) * world.WorldSize) - half;

                for (int x = 0; x < res; x++)
                {
                    float wx = (((x + 0.5f) / res) * world.WorldSize) - half;

                    int i = Mathf.Clamp(Mathf.RoundToInt((wx + half) / world.Step), 0, n - 1);
                    int j = Mathf.Clamp(Mathf.RoundToInt((wz + half) / world.Step), 0, n - 1);
                    int k = (j * n) + i;

                    if (world.Lake[k] != 0)
                    {
                        continue;
                    }

                    if (riverWidth > 0f && world.RiverDistance[k] < riverWidth * 1.1f)
                    {
                        continue;
                    }

                    if (world.RoadDistance[k] < settings.RoadCoreWidth * 1.2f)
                    {
                        continue;
                    }

                    float slope = world.SlopeAt(i, j);
                    if (slope > settings.GrassMaxSlope)
                    {
                        continue;
                    }

                    float moisture = world.Moisture[k];
                    float fertility = Mathf.Clamp01(moisture * 1.5f) * Mathf.Clamp01(1f - (slope / settings.GrassMaxSlope));

                    // بقع كثيفة تتخللها فجوات — لا سجّادة عشب واحدة
                    float patch = ValueNoise.Fbm(wx * 0.0075, wz * 0.0075, 3);
                    fertility *= Mathf.Clamp01((patch - 0.28f) * 2.4f);

                    if (fertility <= 0.02f)
                    {
                        continue;
                    }

                    dense[y, x] = Mathf.RoundToInt(fertility * maxDensity);
                    sparse[y, x] = Mathf.RoundToInt(fertility * maxDensity * 0.55f);
                }
            }

            data.SetDetailLayer(0, 0, 0, dense);
            data.SetDetailLayer(0, 0, 1, sparse);
        }

        /// <summary>الغابات: نقاط مرشّحة على شبكة مزحزحة، تُقبل بالرطوبة والميل وتُرفض عند الماء والطريق.</summary>
        private static void PlantTrees(WorldGenSettings settings, WorldData world, TerrainData data)
        {
            List<TreePrototype> prototypes = new List<TreePrototype>();
            List<bool> isConifer = new List<bool>();

            for (int i = 0; i < DawnkeepPrefabBuilder.BroadleafVariants; i++)
            {
                GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                    DawnkeepPrefabBuilder.TreePrefabPath(true, i));

                if (prefab == null)
                {
                    continue;
                }

                TreePrototype proto = new TreePrototype();
                proto.prefab = prefab;
                proto.bendFactor = 0.4f;
                prototypes.Add(proto);
                isConifer.Add(false);
            }

            for (int i = 0; i < DawnkeepPrefabBuilder.ConiferVariants; i++)
            {
                GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                    DawnkeepPrefabBuilder.TreePrefabPath(false, i));

                if (prefab == null)
                {
                    continue;
                }

                TreePrototype proto = new TreePrototype();
                proto.prefab = prefab;
                proto.bendFactor = 0.25f;
                prototypes.Add(proto);
                isConifer.Add(true);
            }

            if (prototypes.Count == 0)
            {
                Debug.LogWarning("مملكة الرماد: لا توجد جاهزات أشجار — نفّذ الخطوة 4 أولاً.");
                return;
            }

            data.treePrototypes = prototypes.ToArray();

            int n = world.Resolution;
            float half = world.WorldSize * 0.5f;
            float range = Mathf.Max(1f, world.MaxHeight - world.MinHeight);
            float riverWidth = world.River.Length > 0 ? world.RiverWidth : 0f;
            System.Random rng = new System.Random(settings.Seed * 31 + 17);

            int target = Mathf.Max(200, settings.TreeTarget);

            // شبكة مرشّحين أوسع من الهدف بكثير: أكثر من نصف الخريطة طوق جبال يُرفض على الميل،
            // ولو ساوينا الشبكة بالهدف لتوقّف الزرع قبل أن يعمّ الخريطة.
            int grid = Mathf.CeilToInt(Mathf.Sqrt(target * 18f));
            float cell = world.WorldSize / grid;

            List<TreeInstance> pool = new List<TreeInstance>(target * 2);

            for (int gy = 0; gy < grid; gy++)
            {
                for (int gx = 0; gx < grid; gx++)
                {
                    float wx = (gx + 0.15f + ((float)rng.NextDouble() * 0.7f)) * cell - half;
                    float wz = (gy + 0.15f + ((float)rng.NextDouble() * 0.7f)) * cell - half;

                    int i = Mathf.Clamp(Mathf.RoundToInt((wx + half) / world.Step), 0, n - 1);
                    int j = Mathf.Clamp(Mathf.RoundToInt((wz + half) / world.Step), 0, n - 1);
                    int k = (j * n) + i;

                    if (world.Lake[k] != 0)
                    {
                        continue;
                    }

                    if (riverWidth > 0f && world.RiverDistance[k] < riverWidth * 1.35f)
                    {
                        continue;
                    }

                    if (world.RoadDistance[k] < settings.RoadFeatherWidth * 0.8f)
                    {
                        continue;
                    }

                    // ساحة القلعة تبقى مفتوحة
                    if ((wx * wx) + (wz * wz) < 210f * 210f)
                    {
                        continue;
                    }

                    float altitude = (world.Height[k] - world.MinHeight) / range;

                    // خطّ الشجر: الغابة تتسلّق سفح الجبل وتخفّ مع الارتفاع حتى
                    // تنقطع دون حدّ الثلج. قطعُها عند قاع الوادي يترك جداراً أجرد.
                    float slopeLimit = settings.TreeMaxSlope + Mathf.Clamp(((0.45f - altitude) * 0.5f), 0f, 0.14f);
                    float slope = world.SlopeAt(i, j);
                    if (slope > slopeLimit)
                    {
                        continue;
                    }

                    float moisture = world.Moisture[k];
                    if (moisture < settings.TreeMinMoisture)
                    {
                        continue;
                    }

                    // تجمّع الغابة في بقع بدل توزّع متساوٍ ممل
                    float clump = ValueNoise.Fbm((wx * 0.0016) + 41.0, (wz * 0.0016) - 17.0, 4);
                    float chance = Mathf.Clamp01((moisture - settings.TreeMinMoisture) * 2.6f)
                                 * Mathf.Clamp01((clump - 0.24f) * 3.2f)
                                 * Mathf.Clamp01(1f - ((slope / slopeLimit) * 0.85f))
                                 * Mathf.Clamp01(1f - ((altitude - 0.42f) / 0.24f));

                    if (rng.NextDouble() > chance)
                    {
                        continue;
                    }

                    bool wantConifer = altitude > 0.30f || moisture < 0.42f;

                    int prototype = PickPrototype(isConifer, wantConifer, rng);
                    if (prototype < 0)
                    {
                        continue;
                    }

                    TreeInstance instance = new TreeInstance();
                    instance.position = new Vector3(
                        (wx + half) / world.WorldSize,
                        0f,
                        (wz + half) / world.WorldSize);
                    instance.prototypeIndex = prototype;

                    float scale = (0.78f + ((float)rng.NextDouble() * 0.55f))
                                * (1f - (Mathf.Clamp01((altitude - 0.32f) / 0.42f) * 0.34f));
                    instance.widthScale = scale * (0.92f + ((float)rng.NextDouble() * 0.18f));
                    instance.heightScale = scale;
                    instance.rotation = (float)rng.NextDouble() * Mathf.PI * 2f;
                    instance.color = Color.white;
                    instance.lightmapColor = Color.white;

                    pool.Add(instance);
                }
            }

            // القصّ عشوائي على كامل الشبكة، لا توقّف عند بلوغ الهدف —
            // وإلا امتلأ نصف الخريطة الأول بالغابة وبقي النصف الآخر أجرد.
            if (pool.Count > target)
            {
                for (int i = pool.Count - 1; i > 0; i--)
                {
                    int j = rng.Next(0, i + 1);
                    TreeInstance tmp = pool[i];
                    pool[i] = pool[j];
                    pool[j] = tmp;
                }

                pool.RemoveRange(target, pool.Count - target);
            }

            data.SetTreeInstances(pool.ToArray(), true);
        }

        private static int PickPrototype(List<bool> isConifer, bool wantConifer, System.Random rng)
        {
            List<int> pool = new List<int>();
            for (int i = 0; i < isConifer.Count; i++)
            {
                if (isConifer[i] == wantConifer)
                {
                    pool.Add(i);
                }
            }

            if (pool.Count == 0)
            {
                return isConifer.Count > 0 ? rng.Next(0, isConifer.Count) : -1;
            }

            return pool[rng.Next(0, pool.Count)];
        }
    }
}
