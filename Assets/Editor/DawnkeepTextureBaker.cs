using System.IO;
using Dawnkeep.Rendering;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// يخبز كل خامات اللعبة برمجياً إلى ملفّات PNG داخل المشروع، ويضبط استيرادها.
    /// كل بكسل هنا مولّد بالكود — لا صورة مأخوذة من لعبة أو مرجع خارجي.
    /// </summary>
    public static class DawnkeepTextureBaker
    {
        public const int GroundTextureSize = 512;
        public const int FoliageTextureSize = 256;

        [MenuItem("مملكة الرماد/3) خبز الخامات وطبقات الأرض", false, 3)]
        public static void BakeAll()
        {
            DawnkeepAssetPaths.EnsureFolders();

            try
            {
                EditorUtility.DisplayProgressBar("مملكة الرماد", "خبز خامات الأرض…", 0.05f);

                BakeSurface(SurfaceLibrary.Grass(), GroundTextureSize);
                EditorUtility.DisplayProgressBar("مملكة الرماد", "خبز خامات الأرض…", 0.20f);
                BakeSurface(SurfaceLibrary.Soil(), GroundTextureSize);
                EditorUtility.DisplayProgressBar("مملكة الرماد", "خبز خامات الأرض…", 0.35f);
                BakeSurface(SurfaceLibrary.Rock(), GroundTextureSize);
                EditorUtility.DisplayProgressBar("مملكة الرماد", "خبز خامات الأرض…", 0.50f);
                BakeSurface(SurfaceLibrary.Gravel(), GroundTextureSize);
                EditorUtility.DisplayProgressBar("مملكة الرماد", "خبز خامات الشجر…", 0.62f);
                BakeSurface(SurfaceLibrary.Bark(), GroundTextureSize);

                EditorUtility.DisplayProgressBar("مملكة الرماد", "خبز أوراق وعشب…", 0.75f);
                BakeCutout(
                    "grass_clump",
                    FoliageTextureBaker.GrassClump(
                        FoliageTextureSize,
                        20260606u,
                        new Color(0.204f, 0.259f, 0.145f),
                        new Color(0.545f, 0.573f, 0.322f)));

                BakeCutout(
                    "leaf_cluster",
                    FoliageTextureBaker.LeafCluster(
                        FoliageTextureSize,
                        20260707u,
                        new Color(0.129f, 0.208f, 0.114f),
                        new Color(0.400f, 0.502f, 0.235f),
                        false));

                BakeCutout(
                    "needle_cluster",
                    FoliageTextureBaker.LeafCluster(
                        FoliageTextureSize,
                        20260808u,
                        new Color(0.086f, 0.161f, 0.129f),
                        new Color(0.271f, 0.376f, 0.243f),
                        true));

                EditorUtility.DisplayProgressBar("مملكة الرماد", "بناء طبقات الأرض…", 0.90f);
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

        /// <summary>يخبز سطحاً واحداً: لون + نتوء، ويحفظهما PNG مستوردين بالإعداد الصحيح.</summary>
        public static void BakeSurface(SurfaceRecipe recipe, int size)
        {
            float[] field = SurfaceBaker.BakeHeight(recipe, size);

            Texture2D albedo = SurfaceBaker.BakeAlbedo(recipe, field, size);
            WritePng(albedo, AlbedoPath(recipe.Name));
            ConfigureAlbedo(AlbedoPath(recipe.Name));
            Object.DestroyImmediate(albedo);

            Texture2D normal = SurfaceBaker.BakeNormal(field, size, recipe.NormalStrength);
            WritePng(normal, NormalPath(recipe.Name));
            ConfigureNormal(NormalPath(recipe.Name));
            Object.DestroyImmediate(normal);
        }

        /// <summary>يخبز خامة شفّافة (عشب/أوراق).</summary>
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
            string[] names = { "grass", "soil", "rock", "gravel" };
            float[] tiles = { 14f, 18f, 26f, 10f };
            float[] smooth = { 0.10f, 0.14f, 0.22f, 0.28f };
            float[] normalScale = { 0.7f, 1.0f, 1.4f, 1.0f };

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

        /// <summary>خامات الشجر والصخر: لحاء بخريطة نتوء، وأوراق بشادر الريح.</summary>
        public static void BuildMaterials()
        {
            Shader lit = Shader.Find("Universal Render Pipeline/Lit");
            if (lit == null)
            {
                lit = Shader.Find("Standard");
            }

            Shader foliage = Shader.Find("Dawnkeep/Foliage");

            Material bark = EnsureMaterial("Dawnkeep_Bark", lit);
            if (bark != null)
            {
                bark.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(AlbedoPath("bark")));
                bark.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(NormalPath("bark")));
                bark.EnableKeyword("_NORMALMAP");
                bark.SetFloat("_Smoothness", 0.08f);
                bark.SetTextureScale("_BaseMap", new Vector2(1f, 2.5f));
                bark.enableInstancing = true;
                EditorUtility.SetDirty(bark);
            }

            Material rock = EnsureMaterial("Dawnkeep_Rock", lit);
            if (rock != null)
            {
                rock.SetTexture("_BaseMap", AssetDatabase.LoadAssetAtPath<Texture2D>(AlbedoPath("rock")));
                rock.SetTexture("_BumpMap", AssetDatabase.LoadAssetAtPath<Texture2D>(NormalPath("rock")));
                rock.EnableKeyword("_NORMALMAP");
                rock.SetFloat("_Smoothness", 0.14f);
                rock.SetTextureScale("_BaseMap", new Vector2(1.6f, 1.6f));
                rock.enableInstancing = true;
                EditorUtility.SetDirty(rock);
            }

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
