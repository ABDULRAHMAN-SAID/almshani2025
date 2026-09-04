using System.Collections.Generic;
using Dawnkeep.Buildings;
using Dawnkeep.CameraRig;
using Dawnkeep.Rendering;
using Dawnkeep.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الخامسة: توليد العالم وبناء المشهد كاملاً —
    /// تضاريس، ماء، إضاءة فجر، ضباب هوائي، صخور، وكاميرا مملكة.
    /// المشهد كلّه يُولَّد من سكربت: لا ملفّ .unity مكتوب باليد.
    /// </summary>
    public static class DawnkeepWorldSceneBuilder
    {
        private const string TerrainDataPath = DawnkeepAssetPaths.Generated + "/Dawnkeep_TerrainData.asset";
        private const string LakeMeshPath = DawnkeepAssetPaths.Meshes + "/Dawnkeep_LakeSurface.asset";
        private const string RiverMeshPath = DawnkeepAssetPaths.Meshes + "/Dawnkeep_RiverSurface.asset";
        private const string SkyboxPath = DawnkeepAssetPaths.Settings + "/Dawnkeep_Sky.mat";

        [MenuItem("مملكة الرماد/5) بناء مشهد العالم", false, 5)]
        public static void BuildScene()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
            {
                return;
            }

            DawnkeepAssetPaths.EnsureFolders();
            WorldGenSettings settings = EnsureSettings();

            WorldData world = null;
            try
            {
                world = WorldGenerator.Generate(settings, delegate (string stage, float progress)
                {
                    EditorUtility.DisplayProgressBar("مملكة الرماد — توليد العالم", stage, progress);
                });
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }

            if (world == null)
            {
                return;
            }

            UnityEngine.SceneManagement.Scene scene =
                EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            try
            {
                TerrainData data = DawnkeepTerrainPainter.BuildTerrainData(settings, world, TerrainDataPath);
                GameObject terrainObject = CreateTerrain(settings, world, data);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "بناء أسطح الماء…", 0.88f);
                CreateWater(settings, world);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "بناء القلعة والقرية…", 0.90f);
                BuildKingdom(settings, world);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "نثر الصخور…", 0.93f);
                ScatterRocks(settings, world);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "إنزال أهل المملكة…", 0.94f);
                PlaceFolk(settings, world);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "إضاءة الفجر…", 0.96f);
                CreateLighting();
                CreateCamera(settings, world);

                GameObject volume = DawnkeepRenderPipelineSetup.CreateGlobalVolume();
                if (volume == null)
                {
                    Debug.LogWarning("مملكة الرماد: لم تُضَف المعالجة اللاحقة — URP غير مثبّتة بعد.");
                }

                GameObject bootstrap = new GameObject("GameBootstrap");
                bootstrap.AddComponent<Almshani.Game.GameBootstrap>();
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }

            EditorSceneManager.SaveScene(scene, DawnkeepAssetPaths.WorldScene);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene(DawnkeepAssetPaths.WorldScene, true),
            };

            Debug.Log("مملكة الرماد: المشهد جاهز — " + DawnkeepAssetPaths.WorldScene +
                "\nأشجار: " + (world.Roads.Count > 0 ? "طرق " + world.Roads.Count : "بلا طرق") +
                "، نهر: " + (world.River.Length > 0 ? world.River.Length + " نقطة" : "لا يوجد") +
                "، بحيرة: " + (world.HasLake ? "نعم" : "لا") +
                "\nاضغط Play ثم اسحب بالفأرة للتحريك وعجلة الفأرة للتقريب.");
        }

        /// <summary>ينشئ أصل الإعدادات إن لم يكن موجوداً.</summary>
        public static WorldGenSettings EnsureSettings()
        {
            WorldGenSettings settings =
                AssetDatabase.LoadAssetAtPath<WorldGenSettings>(DawnkeepAssetPaths.WorldSettings);

            if (settings == null)
            {
                settings = ScriptableObject.CreateInstance<WorldGenSettings>();
                settings.name = "WorldGenSettings";
                AssetDatabase.CreateAsset(settings, DawnkeepAssetPaths.WorldSettings);
                AssetDatabase.SaveAssets();
            }

            return settings;
        }

        private static GameObject CreateTerrain(WorldGenSettings settings, WorldData world, TerrainData data)
        {
            float scale = settings.WorldScale;
            GameObject go = Terrain.CreateTerrainGameObject(data);
            go.name = "Dawnkeep Terrain";
            go.isStatic = true;
            go.transform.position = new Vector3(
                -world.WorldSize * 0.5f * scale,
                world.MinHeight * scale,
                -world.WorldSize * 0.5f * scale);

            Terrain terrain = go.GetComponent<Terrain>();
            terrain.heightmapPixelError = 3f;
            terrain.basemapDistance = 600f;
            terrain.detailObjectDistance = 150f;
            terrain.detailObjectDensity = 1f;
            terrain.treeDistance = 1200f;
            terrain.treeBillboardDistance = 260f;
            terrain.treeCrossFadeLength = 40f;
            terrain.treeMaximumFullLODCount = 90;
            terrain.shadowCastingMode = ShadowCastingMode.On;

            Shader terrainShader = Shader.Find("Universal Render Pipeline/Terrain/Lit");
            if (terrainShader != null)
            {
                Material material = DawnkeepTextureBaker.EnsureMaterial("Dawnkeep_Terrain", terrainShader);
                if (material != null)
                {
                    terrain.materialTemplate = material;
                }
            }

            return go;
        }

        /// <summary>سطح البحيرة يتبع خطّ الكنتور، وشريط النهر يتبع المجرى المنحوت.</summary>
        private static void CreateWater(WorldGenSettings settings, WorldData world)
        {
            Shader waterShader = Shader.Find("Dawnkeep/Water");
            if (waterShader == null)
            {
                Debug.LogWarning("مملكة الرماد: شادر الماء غير مُصرَّف — تأكّد من تثبيت URP.");
                return;
            }

            Material waterMaterial = DawnkeepTextureBaker.EnsureMaterial("Dawnkeep_Water", waterShader);
            GameObject parent = new GameObject("Water");

            if (world.HasLake)
            {
                Mesh lake = BuildLakeMesh(settings, world);
                if (lake != null)
                {
                    AddWaterPiece(parent, "Lake Surface", SaveMesh(lake, LakeMeshPath), waterMaterial);
                }
            }

            if (world.River.Length > 1)
            {
                Mesh river = BuildRiverMesh(settings, world);
                if (river != null)
                {
                    AddWaterPiece(parent, "River Surface", SaveMesh(river, RiverMeshPath), waterMaterial);
                }
            }
        }

        private static void AddWaterPiece(GameObject parent, string name, Mesh mesh, Material material)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent.transform, false);
            go.isStatic = true;

            MeshFilter filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = ShadowCastingMode.Off;
            renderer.receiveShadows = false;
        }

        private static Mesh BuildLakeMesh(WorldGenSettings settings, WorldData world)
        {
            float scale = settings.WorldScale;
            int n = world.Resolution;
            byte[] lake = world.Lake;
            float level = world.LakeLevel;

            Dictionary<int, int> map = new Dictionary<int, int>();
            List<Vector3> vertices = new List<Vector3>();
            List<Vector3> normals = new List<Vector3>();
            List<Vector2> uvs = new List<Vector2>();
            List<Vector2> depths = new List<Vector2>();
            List<int> triangles = new List<int>();

            for (int j = 0; j < n - 1; j++)
            {
                for (int i = 0; i < n - 1; i++)
                {
                    int a = (j * n) + i;
                    int b = a + 1;
                    int c = a + n + 1;
                    int d = a + n;

                    // يكفي أن يكون ركن واحد بحيرةً: بذلك يمتدّ السطح قليلاً تحت الشاطئ،
                    // فتخفي الأرضُ حرفَ الشبكة ويصير خطّ الماء هو خطّ الكنتور الحقيقي
                    // بدل حافّة مدرّجة بمقاس الخلية.
                    if (lake[a] == 0 && lake[b] == 0 && lake[c] == 0 && lake[d] == 0)
                    {
                        continue;
                    }

                    int va = GetVertex(map, vertices, normals, uvs, depths, world, a, level, scale);
                    int vb = GetVertex(map, vertices, normals, uvs, depths, world, b, level, scale);
                    int vc = GetVertex(map, vertices, normals, uvs, depths, world, c, level, scale);
                    int vd = GetVertex(map, vertices, normals, uvs, depths, world, d, level, scale);

                    triangles.Add(va);
                    triangles.Add(vd);
                    triangles.Add(vc);
                    triangles.Add(va);
                    triangles.Add(vc);
                    triangles.Add(vb);
                }
            }

            if (triangles.Count == 0)
            {
                return null;
            }

            Mesh mesh = new Mesh();
            mesh.name = "Dawnkeep_LakeSurface";
            mesh.indexFormat = vertices.Count > 65000 ? IndexFormat.UInt32 : IndexFormat.UInt16;
            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.SetUVs(0, uvs);
            mesh.SetUVs(1, depths);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
            return mesh;
        }

        private static int GetVertex(Dictionary<int, int> map, List<Vector3> vertices, List<Vector3> normals,
            List<Vector2> uvs, List<Vector2> depths, WorldData world, int key, float level, float scale)
        {
            int index;
            if (map.TryGetValue(key, out index))
            {
                return index;
            }

            int n = world.Resolution;
            float x = world.NodeToWorld(key % n);
            float z = world.NodeToWorld(key / n);

            index = vertices.Count;
            float depth = Mathf.Max(0f, (level - world.SampleSmooth(world.Height, x, z)) * scale);
            vertices.Add(new Vector3(x * scale, level * scale, z * scale));
            normals.Add(Vector3.up);
            uvs.Add(new Vector2(x * scale / 22f, z * scale / 22f));
            depths.Add(new Vector2(depth, 0f));
            map[key] = index;
            return index;
        }

        private static Mesh BuildRiverMesh(WorldGenSettings settings, WorldData world)
        {
            Vector2[] pts = world.River;
            int count = pts.Length;
            if (count < 2)
            {
                return null;
            }

            float scale = settings.WorldScale;
            float halfWidth = world.RiverWidth * 0.94f;
            float fill = settings.RiverCarveDepth * 0.52f;

            // سطح النهر لا يعلو ضفّتيه أبداً — وإلا ظهر شريط ماء معلّقاً فوق الأرض
            float[] ys = new float[count];
            for (int i = 0; i < count; i++)
            {
                Vector2 prev = pts[Mathf.Max(i - 1, 0)];
                Vector2 next = pts[Mathf.Min(i + 1, count - 1)];
                Vector2 dir = next - prev;
                if (dir.sqrMagnitude < 1e-6f)
                {
                    dir = new Vector2(1f, 0f);
                }

                dir.Normalize();
                Vector2 side = new Vector2(-dir.y, dir.x) * halfWidth;

                float center = world.SampleSmooth(world.Height, pts[i].x, pts[i].y);
                float bankA = world.SampleSmooth(world.Height, pts[i].x - side.x, pts[i].y - side.y);
                float bankB = world.SampleSmooth(world.Height, pts[i].x + side.x, pts[i].y + side.y);
                ys[i] = Mathf.Min(center + fill, Mathf.Min(bankA, bankB) - 0.6f);
            }

            for (int pass = 0; pass < 3; pass++)
            {
                for (int i = 1; i < count - 1; i++)
                {
                    ys[i] = (ys[i - 1] + (ys[i] * 2f) + ys[i + 1]) * 0.25f;
                }
            }

            List<Vector3> vertices = new List<Vector3>(count * 3);
            List<Vector3> normals = new List<Vector3>(count * 3);
            List<Vector2> uvs = new List<Vector2>(count * 3);
            List<Vector2> depths = new List<Vector2>(count * 3);
            List<int> triangles = new List<int>((count - 1) * 12);
            float travelled = 0f;

            for (int i = 0; i < count; i++)
            {
                Vector2 prev = pts[Mathf.Max(i - 1, 0)];
                Vector2 next = pts[Mathf.Min(i + 1, count - 1)];
                Vector2 dir = next - prev;

                if (dir.sqrMagnitude < 1e-6f)
                {
                    dir = new Vector2(1f, 0f);
                }

                dir.Normalize();
                Vector2 side = new Vector2(-dir.y, dir.x) * halfWidth;

                if (i > 0)
                {
                    travelled += Vector2.Distance(pts[i], pts[i - 1]);
                }

                float centreDepth = Mathf.Max(0f, (ys[i] - world.SampleSmooth(world.Height, pts[i].x, pts[i].y)) * scale);

                vertices.Add(new Vector3((pts[i].x - side.x) * scale, ys[i] * scale, (pts[i].y - side.y) * scale));
                vertices.Add(new Vector3(pts[i].x * scale, ys[i] * scale, pts[i].y * scale));
                vertices.Add(new Vector3((pts[i].x + side.x) * scale, ys[i] * scale, (pts[i].y + side.y) * scale));

                for (int k = 0; k < 3; k++)
                {
                    normals.Add(Vector3.up);
                }

                uvs.Add(new Vector2(0f, travelled * scale / 22f));
                uvs.Add(new Vector2(0.5f, travelled * scale / 22f));
                uvs.Add(new Vector2(1f, travelled * scale / 22f));

                depths.Add(new Vector2(0.05f, 0f));
                depths.Add(new Vector2(centreDepth, 0f));
                depths.Add(new Vector2(0.05f, 0f));
            }

            for (int i = 0; i < count - 1; i++)
            {
                int a = i * 3;
                triangles.Add(a); triangles.Add(a + 3); triangles.Add(a + 4);
                triangles.Add(a); triangles.Add(a + 4); triangles.Add(a + 1);
                triangles.Add(a + 1); triangles.Add(a + 4); triangles.Add(a + 5);
                triangles.Add(a + 1); triangles.Add(a + 5); triangles.Add(a + 2);
            }

            Mesh mesh = new Mesh();
            mesh.name = "Dawnkeep_RiverSurface";
            mesh.SetVertices(vertices);
            mesh.SetNormals(normals);
            mesh.SetUVs(0, uvs);
            mesh.SetUVs(1, depths);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateBounds();
            return mesh;
        }

        private static Mesh SaveMesh(Mesh mesh, string path)
        {
            Mesh existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);
            if (existing == null)
            {
                AssetDatabase.CreateAsset(mesh, path);
                return mesh;
            }

            existing.Clear();
            existing.indexFormat = mesh.indexFormat;
            existing.vertices = mesh.vertices;
            existing.normals = mesh.normals;
            existing.uv = mesh.uv;
            existing.triangles = mesh.triangles;
            existing.RecalculateBounds();
            EditorUtility.SetDirty(existing);
            Object.DestroyImmediate(mesh);
            return existing;
        }

        /// <summary>الصخور تُنثر حيث ينكشف الصخر فعلاً: الميول الحادّة وضفاف النهر.</summary>
        private static void ScatterRocks(WorldGenSettings settings, WorldData world)
        {
            float scale = settings.WorldScale;
            List<GameObject> prefabs = new List<GameObject>();
            for (int i = 0; i < DawnkeepPrefabBuilder.RockVariants; i++)
            {
                GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                    DawnkeepPrefabBuilder.RockPrefabPath(i));

                if (prefab != null)
                {
                    prefabs.Add(prefab);
                }
            }

            if (prefabs.Count == 0)
            {
                return;
            }

            GameObject parent = new GameObject("Rocks");
            System.Random rng = new System.Random((settings.Seed * 977) + 5);
            int n = world.Resolution;
            float half = world.WorldSize * 0.5f;
            float riverWidth = world.River.Length > 0 ? world.RiverWidth : 0f;
            int placed = 0;
            const int Limit = 520;

            int grid = 90;
            float cell = world.WorldSize / grid;

            for (int gy = 0; gy < grid && placed < Limit; gy++)
            {
                for (int gx = 0; gx < grid && placed < Limit; gx++)
                {
                    float wx = ((gx + (float)rng.NextDouble()) * cell) - half;
                    float wz = ((gy + (float)rng.NextDouble()) * cell) - half;

                    int i = Mathf.Clamp(Mathf.RoundToInt((wx + half) / world.Step), 0, n - 1);
                    int j = Mathf.Clamp(Mathf.RoundToInt((wz + half) / world.Step), 0, n - 1);
                    int k = (j * n) + i;

                    if (world.Lake[k] != 0)
                    {
                        continue;
                    }

                    float slope = world.SlopeAt(i, j);
                    bool bank = riverWidth > 0f && world.RiverDistance[k] < riverWidth * 2.2f;
                    float chance = bank ? 0.22f : Mathf.Clamp01((slope - 0.42f) * 1.7f);

                    if (rng.NextDouble() > chance)
                    {
                        continue;
                    }

                    GameObject prefab = prefabs[rng.Next(0, prefabs.Count)];
                    GameObject instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab, parent.transform);
                    if (instance == null)
                    {
                        continue;
                    }

                    float y = (world.SampleSmooth(world.Height, wx, wz) * scale)
                            - (0.35f + ((float)rng.NextDouble() * 0.5f));
                    instance.transform.position = new Vector3(wx * scale, y, wz * scale);
                    instance.transform.rotation = Quaternion.Euler(
                        ((float)rng.NextDouble() - 0.5f) * 18f,
                        (float)rng.NextDouble() * 360f,
                        ((float)rng.NextDouble() - 0.5f) * 18f);

                    float rockScale = 0.7f + ((float)rng.NextDouble() * 1.1f);
                    instance.transform.localScale = new Vector3(
                        rockScale, rockScale * (0.8f + ((float)rng.NextDouble() * 0.5f)), rockScale);
                    instance.isStatic = true;
                    placed++;
                }
            }

            ScatterCliffOutcrops(settings, world, prefabs, parent.transform);
        }

        /// <summary>
        /// أهل المملكة: حرس البوّابة، وتشكيل البطل ورماحه ورماته، وفارسان،
        /// وحرس على الطوق، وقرويّون وخيل ترعى حول القرية.
        ///
        /// لون الراية يُوضع على **مُصيِّر القماش وحده** عبر MaterialPropertyBlock:
        /// وضعه على الجذر يصبغ الجلد والفولاذ معه فيصير الجندي كتلة قرمزية.
        /// </summary>
        private static void PlaceFolk(WorldGenSettings settings, WorldData world)
        {
            float scale = settings.WorldScale;
            GameObject parent = new GameObject("Folk");
            System.Random rng = new System.Random((settings.Seed * 7717) + 31);

            GameObject[] folk = new GameObject[DawnkeepPrefabBuilder.FolkKinds.Length];
            for (int i = 0; i < folk.Length; i++)
            {
                folk[i] = AssetDatabase.LoadAssetAtPath<GameObject>(
                    DawnkeepPrefabBuilder.FolkPrefabPath(DawnkeepPrefabBuilder.FolkKinds[i]));
            }

            GameObject bardedHorse = AssetDatabase.LoadAssetAtPath<GameObject>(
                DawnkeepPrefabBuilder.HorsePrefabPath(true));
            GameObject freeHorse = AssetDatabase.LoadAssetAtPath<GameObject>(
                DawnkeepPrefabBuilder.HorsePrefabPath(false));

            if (folk[0] == null)
            {
                Debug.LogWarning("مملكة الرماد: جاهزات أهل المملكة غير موجودة — نفّذ الخطوة 4 أولاً.");
                return;
            }

            Color guard = new Color(0.647f, 0.180f, 0.180f);
            Color archerLivery = new Color(0.220f, 0.353f, 0.541f);
            Color heroLivery = new Color(0.741f, 0.153f, 0.169f);
            Color[] folkLivery =
            {
                new Color(0.643f, 0.573f, 0.451f), new Color(0.514f, 0.455f, 0.353f),
                new Color(0.427f, 0.482f, 0.400f), new Color(0.596f, 0.514f, 0.404f),
            };

            float ringR = settings.CastleRadius * scale;
            float gateAngle = world.Roads.Count > 0 ? RoadEntryAngle(world.Roads[0]) : 0f;
            float ux = Mathf.Cos(gateAngle);
            float uz = Mathf.Sin(gateAngle);
            float px = -uz;
            float pz = ux;

            // ١) حرس البوّابة: زوج على كل جانب
            for (int s = -1; s <= 1; s += 2)
            {
                float a = gateAngle + (s * 0.085f);
                Spawn(parent, folk[1], settings, world, Mathf.Cos(a) * (ringR + 9f), Mathf.Sin(a) * (ringR + 9f), a, guard, 1f);
                Spawn(parent, folk[1], settings, world, Mathf.Cos(a) * (ringR + 21f), Mathf.Sin(a) * (ringR + 21f), a, guard, 1f);
            }

            // ٢) البطل أمام البوّابة ووراءه صفوف الرماح والرماة — تشكيل استعراض
            float hx = ux * (ringR + 46f);
            float hz = uz * (ringR + 46f);
            Spawn(parent, folk[0], settings, world, hx, hz, gateAngle, heroLivery, 1.10f);

            for (int row = 0; row < 3; row++)
            {
                for (int col = -3; col <= 3; col++)
                {
                    if (row == 0 && Mathf.Abs(col) < 1)
                    {
                        continue;
                    }

                    float jitter = ((float)rng.NextDouble() - 0.5f) * 1.4f;
                    float x = hx + (ux * ((row * 11f) + 9f)) + (px * ((col * 9.5f) + jitter));
                    float z = hz + (uz * ((row * 11f) + 9f)) + (pz * ((col * 9.5f) + jitter));
                    GameObject prefab = row == 2 ? folk[3] : folk[1];
                    Color livery = row == 2 ? archerLivery : guard;
                    Spawn(parent, prefab, settings, world, x, z,
                        gateAngle + (((float)rng.NextDouble() - 0.5f) * 0.10f), livery, 1f);
                }
            }

            // ٣) فارسان على جانبَي الطريق
            if (bardedHorse != null)
            {
                for (int s = -1; s <= 1; s += 2)
                {
                    float x = hx + (ux * 44f) + (px * s * 30f);
                    float z = hz + (uz * 44f) + (pz * s * 30f);
                    Spawn(parent, bardedHorse, settings, world, x, z, gateAngle, heroLivery, 1f);
                    // الفارس يجلس على السرج: 0.82 من وحدة البناء مضروبةً في مقياس الحصان
                    Spawn(parent, folk[2], settings, world, x, z, gateAngle, heroLivery, 1f,
                        0.82f * DawnkeepPrefabBuilder.HorseScale);
                }
            }

            // ٤) حرس على الطوق
            for (int i = 0; i < 4; i++)
            {
                float a = gateAngle + (Mathf.PI * 0.5f) + (i * Mathf.PI * 0.42f);
                Spawn(parent, folk[2], settings, world, Mathf.Cos(a) * (ringR + 6f), Mathf.Sin(a) * (ringR + 6f), a, guard, 1f);
            }

            // ٥) قرويّون وخيل ترعى حول القرية
            Vector2 village = VillagePoint(settings, world, scale);
            if (village.sqrMagnitude > 1f)
            {
                for (int i = 0; i < 14; i++)
                {
                    float a = (float)rng.NextDouble() * Mathf.PI * 2f;
                    float r = 12f + ((float)rng.NextDouble() * 46f);
                    Color livery = folkLivery[rng.Next(0, folkLivery.Length)];
                    Spawn(parent, folk[4], settings, world,
                        village.x + (Mathf.Cos(a) * r), village.y + (Mathf.Sin(a) * r),
                        (float)rng.NextDouble() * Mathf.PI * 2f, livery,
                        0.95f + ((float)rng.NextDouble() * 0.06f));
                }

                if (freeHorse != null)
                {
                    for (int i = 0; i < 3; i++)
                    {
                        float a = (float)rng.NextDouble() * Mathf.PI * 2f;
                        float r = 26f + ((float)rng.NextDouble() * 30f);
                        Spawn(parent, freeHorse, settings, world,
                            village.x + (Mathf.Cos(a) * r), village.y + (Mathf.Sin(a) * r),
                            (float)rng.NextDouble() * Mathf.PI * 2f, Color.white,
                            0.95f + ((float)rng.NextDouble() * 0.08f));
                    }
                }
            }
        }

        private static Vector2 VillagePoint(WorldGenSettings settings, WorldData world, float scale)
        {
            if (world.Roads.Count == 0)
            {
                return Vector2.zero;
            }

            Vector2[] road = world.Roads[0];
            for (int i = 0; i < road.Length; i++)
            {
                float r = road[i].magnitude;
                if (r > settings.CastleRadius * 2.5f && r < settings.CastleRadius * 3.5f)
                {
                    return road[i] * scale;
                }
            }

            return Vector2.zero;
        }

        /// <summary>
        /// إنزال نسخة على الأرض وصبغ قماشها وحده بلون الراية.
        /// الزاوية تُمرَّر بالراديان في إحداثيات العالم (كما يخرج زاوية البوّابة)،
        /// وتُحوَّل إلى دوران Y: الشخصية تنظر إلى الخارج على امتداد نصف القطر.
        /// </summary>
        private static void Spawn(GameObject parent, GameObject prefab, WorldGenSettings settings,
            WorldData world, float x, float z, float angle, Color livery, float scaleMul, float lift = 0f)
        {
            if (prefab == null)
            {
                return;
            }

            GameObject instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab, parent.transform);
            if (instance == null)
            {
                return;
            }

            float scale = settings.WorldScale;
            float y = world.SampleSmooth(world.Height, x / scale, z / scale) * scale;
            instance.transform.position = new Vector3(x, y + lift, z);
            instance.transform.rotation = Quaternion.Euler(0f, 90f - (angle * Mathf.Rad2Deg), 0f);
            instance.transform.localScale = prefab.transform.localScale * scaleMul;

            // اللون على مُصيِّر القماش وحده — وضعه على الجذر يصبغ الجلد والفولاذ معه
            Transform cloth = instance.transform.Find("Cloth");
            if (cloth != null)
            {
                MeshRenderer renderer = cloth.GetComponent<MeshRenderer>();
                if (renderer != null)
                {
                    MaterialPropertyBlock block = new MaterialPropertyBlock();
                    renderer.GetPropertyBlock(block);
                    block.SetColor("_BaseColor", livery);
                    renderer.SetPropertyBlock(block);
                }
            }
        }

        /// <summary>
        /// نتوءات الجرف: كتل صخرية ضخمة كثيفة حيث ينكشف الصخر على وجه الجبل.
        /// بدونها يبقى الجدار سطحاً أملس بلا شكل مهما جوّدنا خامته.
        /// </summary>
        private static void ScatterCliffOutcrops(WorldGenSettings settings, WorldData world,
            List<GameObject> prefabs, Transform parent)
        {
            float scale = settings.WorldScale;
            System.Random rng = new System.Random((settings.Seed * 613) + 91);
            int n = world.Resolution;
            float half = world.WorldSize * 0.5f;
            float range = Mathf.Max(1f, world.MaxHeight - world.MinHeight);
            int placed = 0;
            const int Limit = 3600;

            int grid = 210;
            float cell = world.WorldSize / grid;

            for (int gy = 0; gy < grid && placed < Limit; gy++)
            {
                for (int gx = 0; gx < grid && placed < Limit; gx++)
                {
                    float wx = ((gx + (float)rng.NextDouble()) * cell) - half;
                    float wz = ((gy + (float)rng.NextDouble()) * cell) - half;

                    int i = Mathf.Clamp(Mathf.RoundToInt((wx + half) / world.Step), 0, n - 1);
                    int j = Mathf.Clamp(Mathf.RoundToInt((wz + half) / world.Step), 0, n - 1);
                    int k = (j * n) + i;

                    float slope = world.SlopeAt(i, j);
                    float altitude = (world.Height[k] - world.MinHeight) / range;
                    float chance = Mathf.Clamp01((slope - 0.46f) * 1.6f)
                                 * Mathf.Clamp01((altitude - 0.16f) / 0.32f);

                    if (rng.NextDouble() > chance * 0.85f)
                    {
                        continue;
                    }

                    bool big = rng.NextDouble() < 0.5;
                    // النصف الأعلى من القوالب نتوءات لا جلاميد
                    int pick = big
                        ? Mathf.Min(prefabs.Count - 1, (prefabs.Count / 2) + rng.Next(0, Mathf.Max(1, prefabs.Count / 2)))
                        : rng.Next(0, Mathf.Max(1, prefabs.Count / 2));

                    GameObject instance = (GameObject)PrefabUtility.InstantiatePrefab(prefabs[pick], parent);
                    if (instance == null)
                    {
                        continue;
                    }

                    float y = (world.SampleSmooth(world.Height, wx, wz) * scale)
                            - (0.4f + ((float)rng.NextDouble() * 1.1f));
                    instance.transform.position = new Vector3(wx * scale, y, wz * scale);
                    instance.transform.rotation = Quaternion.Euler(
                        ((float)rng.NextDouble() - 0.5f) * 28f,
                        (float)rng.NextDouble() * 360f,
                        ((float)rng.NextDouble() - 0.5f) * 28f);

                    // كتلة مكبَّرة 13 مرّة تجعل كل شقّ في البلاطة أخدوداً بعرض مترين.
                    // نتوءات أصغر وأكثر تُقرأ صخراً؛ الكبيرة جداً تُقرأ عجيناً.
                    float outcropScale = big
                        ? 2.9f + ((float)rng.NextDouble() * 4.3f)
                        : 1.3f + ((float)rng.NextDouble() * 2.1f);
                    instance.transform.localScale = new Vector3(
                        outcropScale, outcropScale * (0.7f + ((float)rng.NextDouble() * 0.9f)), outcropScale);
                    instance.isStatic = true;
                    placed++;
                }
            }
        }

        /// <summary>
        /// القلعة على المصطبة والقرية على الطريق. كل قطعة تُبنى بخامتها فتصير
        /// خمس شبكات فقط — لا مئات الكائنات.
        /// </summary>
        private static void BuildKingdom(WorldGenSettings settings, WorldData world)
        {
            float scale = settings.WorldScale;
            float half = world.WorldSize * 0.5f;

            // ارتفاع الأرض بإحداثيات المشهد
            KingdomBuilder.GroundSampler ground = delegate (float x, float z)
            {
                return world.SampleSmooth(world.Height, x / scale, z / scale) * scale;
            };

            float gateAngle = world.Roads.Count > 0 ? RoadEntryAngle(world.Roads[0]) : 0f;
            KingdomBuilder.Layout layout =
                KingdomBuilder.DefaultLayout(settings.CastleRadius * scale, gateAngle);

            KingdomBuilder.Parts parts = KingdomBuilder.BuildCastle(ground, layout, (uint)((settings.Seed * 7919) + 90210));

            // القرية على أوّل الطريق خارج السور
            TexRandom rng = new TexRandom((uint)((settings.Seed * 104729) + 17));
            int placed = 0;
            int target = Mathf.Max(0, settings.VillageHouses);

            if (world.Roads.Count > 0)
            {
                Vector2[] road = world.Roads[0];
                for (int i = 0; i < road.Length && placed < target; i++)
                {
                    if (i % 3 != 0)
                    {
                        continue;
                    }

                    float r = road[i].magnitude;
                    if (r < settings.CastleRadius * 1.6f || r > settings.CastleRadius * 4.1f)
                    {
                        continue;
                    }

                    Vector2 next = road[Mathf.Min(i + 2, road.Length - 1)];
                    Vector2 dir = next - road[i];
                    if (dir.sqrMagnitude < 1e-5f)
                    {
                        continue;
                    }

                    dir.Normalize();

                    for (int side = -1; side <= 1 && placed < target; side += 2)
                    {
                        float off = (26f + (rng.Next() * 16f)) * side;
                        float hx = (road[i].x - (dir.y * off)) * scale;
                        float hz = (road[i].y + (dir.x * off)) * scale;

                        if (Mathf.Abs(hx) > (half * scale) - 40f || Mathf.Abs(hz) > (half * scale) - 40f)
                        {
                            continue;
                        }

                        float rot = Mathf.Atan2(dir.x, dir.y) + (side < 0 ? Mathf.PI : 0f);
                        KingdomBuilder.BuildHouse(parts, hx, hz, ground(hx, hz), rot, ref rng, 8.5f, 6.5f, true);
                        placed++;
                    }
                }
            }

            GameObject root = new GameObject("Kingdom");
            AddKingdomPart(root, "Stone", parts.Stone, "Dawnkeep_Stone");
            AddKingdomPart(root, "Plaster", parts.Plaster, "Dawnkeep_Plaster");
            AddKingdomPart(root, "Timber", parts.Timber, "Dawnkeep_Timber");
            AddKingdomPart(root, "Tile", parts.Tile, "Dawnkeep_Tile");
            AddKingdomPart(root, "Thatch", parts.Thatch, "Dawnkeep_Thatch");
        }

        /// <summary>اتجاه دخول الطريق إلى القلعة — عنده تُبنى البوّابة.</summary>
        private static float RoadEntryAngle(Vector2[] road)
        {
            for (int i = 0; i < road.Length; i++)
            {
                if (road[i].magnitude > 260f)
                {
                    return Mathf.Atan2(road[i].y, road[i].x);
                }
            }

            return road.Length > 0 ? Mathf.Atan2(road[0].y, road[0].x) : 0f;
        }

        private static void AddKingdomPart(GameObject parent, string name, MeshBuilder builder, string materialName)
        {
            if (builder.VertexCount == 0)
            {
                return;
            }

            Mesh mesh = builder.ToMesh("Dawnkeep_" + name, false);
            string path = DawnkeepAssetPaths.Meshes + "/Dawnkeep_Kingdom_" + name + ".asset";
            Mesh saved = SaveMesh(mesh, path);

            GameObject go = new GameObject(name);
            go.transform.SetParent(parent.transform, false);
            go.isStatic = true;

            MeshFilter filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = saved;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = AssetDatabase.LoadAssetAtPath<Material>(
                DawnkeepAssetPaths.Materials + "/" + materialName + ".mat");
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.receiveShadows = true;

            MeshCollider collider = go.AddComponent<MeshCollider>();
            collider.sharedMesh = saved;
        }

        private static void CreateLighting()
        {
            GameObject sunObject = new GameObject("Sun");
            Light sun = sunObject.AddComponent<Light>();
            sun.type = LightType.Directional;
            // ضوء فجر: شمس ذهبية منخفضة قويّة. الضوء الزاحف هو ما ينمذج أضلاع
            // الجبل بالظلّ، والشمس العالية البيضاء تُسطّحه فيصير جداراً بلا شكل.
            sun.color = new Color(1f, 0.788f, 0.541f);
            sun.intensity = 2.15f;
            sun.shadows = LightShadows.Soft;
            sun.shadowStrength = 1f;
            sun.shadowBias = 0.06f;
            sun.shadowNormalBias = 0.40f;

            // سمت الشمس اختير بالقياس لا بالتخمين: مُسحت ستّ زوايا عالمية على
            // لقطتَي الجبال والقلعة، وسمت 149° وحده يخدم الاثنين — جدار الجبل
            // مضاء وأضلاعه تُقرأ، والقلعة تُلقي ظلالاً طويلة عبر العشب.
            // الشمس عند سمت 149° تعني ضوءاً يسير نحو 329°، وهو دوران الضوء هنا.
            // وهي **شمس عالمية ثابتة لا تدور مع الكاميرا**: العالم فيه شمس واحدة
            // واللاعب يدير كاميرته حولها.
            sunObject.transform.rotation = Quaternion.Euler(24f, 329f, 0f);

            Material sky = AssetDatabase.LoadAssetAtPath<Material>(SkyboxPath);
            if (sky == null)
            {
                Shader skyShader = Shader.Find("Skybox/Procedural");
                if (skyShader != null)
                {
                    sky = new Material(skyShader);
                    sky.name = "Dawnkeep_Sky";
                    AssetDatabase.CreateAsset(sky, SkyboxPath);
                }
            }

            if (sky != null)
            {
                sky.SetFloat("_SunSize", 0.045f);
                sky.SetFloat("_SunSizeConvergence", 4f);
                sky.SetFloat("_AtmosphereThickness", 1.42f);
                sky.SetColor("_SkyTint", new Color(0.36f, 0.51f, 0.78f));
                sky.SetColor("_GroundColor", new Color(0.31f, 0.27f, 0.22f));
                sky.SetFloat("_Exposure", 1.05f);
                EditorUtility.SetDirty(sky);
                RenderSettings.skybox = sky;
            }

            RenderSettings.sun = sun;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            // الفرق بين ضوء الشمس الدافئ وضوء السماء البارد هو ما يعطي الظلال
            // لوناً. إضاءة محيطية بيضاء قويّة تُلغي هذا الفرق فتصير الظلال رمادية ميّتة.
            RenderSettings.ambientSkyColor = new Color(0.337f, 0.482f, 0.749f);
            RenderSettings.ambientEquatorColor = new Color(0.376f, 0.392f, 0.404f);
            RenderSettings.ambientGroundColor = new Color(0.196f, 0.176f, 0.145f);
            RenderSettings.ambientIntensity = 0.68f;

            // ضباب هوائي: البعيد يزرقّ ويبهت — منه يأتي إحساس المسافة
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = 0.00040f;
            RenderSettings.fogColor = new Color(0.804f, 0.718f, 0.612f);

            RenderSettings.reflectionIntensity = 0.85f;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox;
            RenderSettings.defaultReflectionResolution = 256;
        }

        private static void CreateCamera(WorldGenSettings settings, WorldData world)
        {
            float scale = settings.WorldScale;
            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";

            Camera camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.fieldOfView = 42f;
            camera.nearClipPlane = 1.2f;
            camera.farClipPlane = 3000f;
            camera.allowHDR = true;
            camera.allowMSAA = true;

            cameraObject.AddComponent<AudioListener>();
            DawnkeepRenderPipelineSetup.ConfigureCamera(camera);

            // الضباب يتبع بُعد الكاميرا: بكثافة ثابتة يبيضّ الميدان كلّما أبعدتَ،
            // وهنا يتراجع تلقائياً فيبقى ما تلعب عليه صافياً عند أي تقريب أو إبعاد.
            cameraObject.AddComponent<Dawnkeep.CameraRig.DistanceFog>();

            RtsCameraRig rig = cameraObject.AddComponent<RtsCameraRig>();
            rig.Configure(Vector3.zero, 240f, 35f, 42f, world.WorldSize * scale * 0.42f);

            Quaternion rotation = Quaternion.Euler(42f, 35f, 0f);
            cameraObject.transform.SetPositionAndRotation(
                (Vector3.up * 30f) - (rotation * Vector3.forward * 240f),
                rotation);
        }
    }
}
