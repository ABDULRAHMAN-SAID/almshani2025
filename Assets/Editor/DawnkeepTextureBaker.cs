using System.IO;
using Dawnkeep.Rendering;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// يخبز كل خامات اللعبة برمجياً إلى ملفّات PNG داخل المشروع، ويضبط استيرادها.
    /// الخامات **مرسومة** لا مولّدة بالضجيج: أعواد عشب وحصى وشقوق ومداميك حقيقية.
    /// كل بكسل هنا مولّد بالكود — لا صورة مأخوذة من لعبة أو مرجع خارجي.
    /// </summary>
    public static class DawnkeepTextureBaker
    {
        public const int GroundTextureSize = 512;
        public const int BuildTextureSize = 512;
        public const int FoliageTextureSize = 256;

        private struct GroundSurface
        {
            public string Name;
            public System.Func<int, uint, TextureCanvas> Draw;
            public uint Seed;
            public float NormalStrength;
        }

        private static GroundSurface[] Surfaces()
        {
            return new[]
            {
                new GroundSurface { Name = "grass", Draw = DrawnMaterials.GrassGround, Seed = 20260101u, NormalStrength = 1.5f },
                new GroundSurface { Name = "soil", Draw = DrawnMaterials.SoilGround, Seed = 20260202u, NormalStrength = 2.4f },
                new GroundSurface { Name = "rock", Draw = DrawnMaterials.RockGround, Seed = 20260303u, NormalStrength = 2.6f },
                new GroundSurface { Name = "gravel", Draw = DrawnMaterials.GravelGround, Seed = 20260404u, NormalStrength = 2.4f },
                new GroundSurface { Name = "cliff", Draw = DrawnMaterials.CliffRock, Seed = 20260909u, NormalStrength = 3.0f },
                new GroundSurface { Name = "scree", Draw = DrawnMaterials.Scree, Seed = 20261010u, NormalStrength = 2.4f },
                new GroundSurface { Name = "snow", Draw = DrawnMaterials.Snow, Seed = 20261111u, NormalStrength = 1.6f },
                new GroundSurface { Name = "bark", Draw = DrawnMaterials.Bark, Seed = 20260505u, NormalStrength = 2.2f },
            };
        }

        [MenuItem("مملكة الرماد/3) خبز الخامات وطبقات الأرض", false, 3)]
        public static void BakeAll()
        {
            DawnkeepAssetPaths.EnsureFolders();

            try
            {
                GroundSurface[] surfaces = Surfaces();
                for (int i = 0; i < surfaces.Length; i++)
                {
                    EditorUtility.DisplayProgressBar("مملكة الرماد",
                        "رسم خامة الأرض: " + surfaces[i].Name, 0.05f + (0.35f * i / surfaces.Length));
                    TextureCanvas c = surfaces[i].Draw(GroundTextureSize, surfaces[i].Seed);
                    WriteCanvas(surfaces[i].Name, c, surfaces[i].NormalStrength);
                }

                EditorUtility.DisplayProgressBar("مملكة الرماد", "رسم خامات البناء…", 0.45f);
                WriteCanvas("stone", BuildingMaterials.StoneWall(BuildTextureSize, 7001u), 2.4f);
                WriteCanvas("tile", BuildingMaterials.RoofTile(BuildTextureSize, 7002u, new Color(0.494f, 0.290f, 0.196f)), 2.2f);
                WriteCanvas("tile_blue", BuildingMaterials.RoofTile(BuildTextureSize, 7005u, new Color(0.235f, 0.318f, 0.408f)), 2.2f);
                WriteCanvas("plaster", BuildingMaterials.Plaster(BuildTextureSize, 7003u), 2.0f);
                WriteCanvas("timber", BuildingMaterials.Timber(BuildTextureSize, 7004u), 2.0f);
                WriteCanvas("thatch", BuildingMaterials.Thatch(BuildTextureSize, 7006u), 1.8f);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "رسم أوراق وعشب…", 0.75f);
                BakeCutout("grass_clump", FoliageTextureBaker.GrassClump(
                    FoliageTextureSize, 20260606u, new Color(0.204f, 0.259f, 0.145f), new Color(0.545f, 0.573f, 0.322f)));
                BakeCutout("leaf_cluster", FoliageTextureBaker.LeafCluster(
                    FoliageTextureSize, 20260707u, new Color(0.098f, 0.169f, 0.094f), new Color(0.286f, 0.400f, 0.192f), false));
                BakeCutout("needle_cluster", FoliageTextureBaker.LeafCluster(
                    FoliageTextureSize, 20260808u, new Color(0.071f, 0.133f, 0.110f), new Color(0.204f, 0.298f, 0.192f), true));

                EditorUtility.DisplayProgressBar("مملكة الرماد", "بناء طبقات الأرض…", 0.92f);
                BuildTerrainLayers();
                BuildMaterials();
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("مملكة الرماد: الخامات وطبقات الأرض جاهزة في " + DawnkeepAssetPaths.Generated);
        }

        private static void WriteCanvas(string name, TextureCanvas canvas, float normalStrength)
        {
            Texture2D albedo = canvas.ToAlbedo(name + "_albedo");
            WritePng(albedo, AlbedoPath(name));
            ConfigureAlbedo(AlbedoPath(name));
            Object.DestroyImmediate(albedo);

            Texture2D normal = canvas.ToNormal(normalStrength);
            WritePng(normal, NormalPath(name));
            ConfigureNormal(NormalPath(name));
            Object.DestroyImmediate(normal);
        }

        public static void BakeCutout(string name, Texture2D texture)
        {
            WritePng(texture, AlbedoPath(name));
            ConfigureCutout(AlbedoPath(name));
            Object.DestroyImmediate(texture);
        }

        public static string AlbedoPath(string name)
        {
            return DawnkeepAssetPaths.Textures + "/" + name + "_albedo.png";
        }

        public static string NormalPath(string name)
        {
            return DawnkeepAssetPaths.Textures + "/" + name + "_normal.png";
        }

        private static void WritePng(Texture2D texture, string path)
        {
            byte[] bytes = texture.EncodeToPNG();
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            File.WriteAllBytes(path, bytes);
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate);
        }

        private static void ConfigureAlbedo(string path)
        {
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null)
            {
                return;
            }

            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = true;
            importer.wrapMode = TextureWrapMode.Repeat;
            importer.filterMode = FilterMode.Trilinear;
            importer.anisoLevel = 8;
            importer.mipmapEnabled = true;
            importer.alphaSource = TextureImporterAlphaSource.None;
            importer.SaveAndReimport();
        }

        private static void ConfigureNormal(string path)
        {
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null)
            {
                return;
            }

            importer.textureType = TextureImporterType.NormalMap;
            importer.wrapMode = TextureWrapMode.Repeat;
            importer.filterMode = FilterMode.Trilinear;
            importer.anisoLevel = 8;
            importer.mipmapEnabled = true;
            importer.SaveAndReimport();
        }

        private static void ConfigureCutout(string path)
        {
            TextureImporter importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null)
            {
                return;
            }

            importer.textureType = TextureImporterType.Default;
            importer.sRGBTexture = true;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Trilinear;
            importer.anisoLevel = 4;
            importer.mipmapEnabled = true;
            importer.alphaSource = TextureImporterAlphaSource.FromInput;
            importer.alphaIsTransparency = true;
            importer.SaveAndReimport();
        }

        /// <summary>طبقات الأرض الأربع بترتيب ثابت: عشب، تربة، صخر، حصى نهر.</summary>
        public static TerrainLayer[] BuildTerrainLayers()
        {
            // سبع طبقات: عشب، تربة، صخر، حصى، جرف، حطام سفح، ثلج قمم.
            // الثلاث الأخيرة هي ما يجعل الجبل جبلاً لا كتلة طينية واحدة.
            string[] names = { "grass", "soil", "rock", "gravel", "cliff", "scree", "snow" };
            // مقياس البلاطة 34 متراً كان يجعل كل شقّ مرسوم أخدوداً بعرض مترين على
            // مسافة اللعب. التصغير إلى نحو الثلث يعيد كثافة النقاط الصحيحة، وتفاوت
            // المقاسات بين الطبقات السبع يكسر اصطفاف التكرار.
            float[] tiles = { 10f, 12f, 12.5f, 6.5f, 13f, 8f, 11f };
            float[] smooth = { 0.10f, 0.14f, 0.22f, 0.28f, 0.20f, 0.24f, 0.42f };
            float[] normalScale = { 0.7f, 1.0f, 1.4f, 1.0f, 1.6f, 1.2f, 0.6f };

            TerrainLayer[] layers = new TerrainLayer[names.Length];

            for (int i = 0; i < names.Length; i++)
            {
                string path = DawnkeepAssetPaths.TerrainLayers + "/Dawnkeep_" + names[i] + ".terrainlayer";
                TerrainLayer layer = AssetDatabase.LoadAssetAtPath<TerrainLayer>(path);

                if (layer == null)
                {
                    layer = new TerrainLayer();
                    AssetDatabase.CreateAsset(layer, path);
                }

                layer.diffuseTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(AlbedoPath(names[i]));
                layer.normalMapTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(NormalPath(names[i]));
                layer.tileSize = new Vector2(tiles[i], tiles[i]);
                layer.tileOffset = Vector2.zero;
                layer.smoothness = smooth[i];
                layer.metallic = 0f;
                layer.normalScale = normalScale[i];

                EditorUtility.SetDirty(layer);
                layers[i] = layer;
            }

            return layers;
        }

        /// <summary>خامات الشجر والصخر والبناء.</summary>
        public static void BuildMaterials()
        {
            Shader lit = Shader.Find("Universal Render Pipeline/Lit");
            if (lit == null)
            {
                lit = Shader.Find("Standard");
            }

            MakeLit("Dawnkeep_Bark", lit, "bark", 0.08f, new Vector2(1f, 2.5f));
            // النتوءات تُكبَّر حتى 13 مرّة في المشهد: بلاطة واحدة عليها تصير
            // شبكة شقوق عملاقة، فترتفع التكرارية حتى يُقرأ الحجم صحيحاً.
            MakeLit("Dawnkeep_Rock", lit, "rock", 0.14f, new Vector2(3.2f, 3.2f));
            MakeLit("Dawnkeep_Cliff", lit, "cliff", 0.12f, new Vector2(4.4f, 4.4f));
            MakeLit("Dawnkeep_Scree", lit, "scree", 0.16f, new Vector2(3.0f, 3.0f));
            MakeLit("Dawnkeep_Stone", lit, "stone", 0.10f, Vector2.one);
            MakeLit("Dawnkeep_Plaster", lit, "plaster", 0.12f, Vector2.one);
            MakeLit("Dawnkeep_Timber", lit, "timber", 0.16f, Vector2.one);
            MakeLit("Dawnkeep_Tile", lit, "tile", 0.24f, Vector2.one);
            MakeLit("Dawnkeep_TileBlue", lit, "tile_blue", 0.32f, Vector2.one);
            MakeLit("Dawnkeep_Thatch", lit, "thatch", 0.06f, Vector2.one);

            Shader foliage = Shader.Find("Dawnkeep/Foliage");
            if (foliage != null)
            {
                Material leaves = EnsureMaterial("Dawnkeep_Leaves", foliage);
                leaves.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(AlbedoPath("leaf_cluster")));
                leaves.SetColor("_BaseColor", Color.white);
                leaves.SetFloat("_Cutoff", 0.42f);
                leaves.SetFloat("_WindStrength", 0.55f);
                leaves.SetFloat("_WindSpeed", 1.05f);
                leaves.enableInstancing = true;
                EditorUtility.SetDirty(leaves);

                Material needles = EnsureMaterial("Dawnkeep_Needles", foliage);
                needles.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(AlbedoPath("needle_cluster")));
                needles.SetColor("_BaseColor", Color.white);
                needles.SetFloat("_Cutoff", 0.40f);
                needles.SetFloat("_WindStrength", 0.34f);
                needles.SetFloat("_WindSpeed", 0.9f);
                needles.enableInstancing = true;
                EditorUtility.SetDirty(needles);
            }
            else
            {
                Debug.LogWarning("مملكة الرماد: شادر Dawnkeep/Foliage غير مُصرَّف بعد — نفّذ الخطوة 1 (تثبيت URP) ثم أعد الخطوة 3.");
            }
        }

        private static void MakeLit(string name, Shader shader, string texture, float smoothness, Vector2 scale)
        {
            Material material = EnsureMaterial(name, shader);
            if (material == null)
            {
                return;
            }

            material.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(AlbedoPath(texture)));
            material.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(NormalPath(texture)));
            material.EnableKeyword("_NORMALMAP");
            material.SetFloat("_Smoothness", smoothness);
            material.SetTextureScale("_BaseMap", scale);
            material.enableInstancing = true;
            EditorUtility.SetDirty(material);
        }

        public static Material EnsureMaterial(string name, Shader shader)
        {
            if (shader == null)
            {
                return null;
            }

            string path = DawnkeepAssetPaths.Materials + "/" + name + ".mat";
            Material material = AssetDatabase.LoadAssetAtPath<Material>(path);

            if (material == null)
            {
                material = new Material(shader);
                material.name = name;
                AssetDatabase.CreateAsset(material, path);
            }
            else if (material.shader != shader)
            {
                material.shader = shader;
            }

            return material;
        }
    }
}
