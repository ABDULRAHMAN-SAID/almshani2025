using Dawnkeep.Rendering;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الرابعة: توليد شبكات الأشجار والصخور وحفظها كأصول وجاهزات.
    /// عدّة نسخ بأشكال مختلفة لكل نوع فلا تتكرّر الشجرة نفسها في الغابة كلّها.
    /// </summary>
    public static class DawnkeepPrefabBuilder
    {
        public const int BroadleafVariants = 3;
        public const int ConiferVariants = 3;
        public const int RockVariants = 4;

        [MenuItem("مملكة الرماد/4) توليد الأشجار والصخور", false, 4)]
        public static void BuildAll()
        {
            DawnkeepAssetPaths.EnsureFolders();

            try
            {
                EditorUtility.DisplayProgressBar("مملكة الرماد", "توليد الأشجار…", 0.1f);
                for (int i = 0; i < BroadleafVariants; i++)
                {
                    BuildTree(true, i);
                }

                for (int i = 0; i < ConiferVariants; i++)
                {
                    BuildTree(false, i);
                }

                EditorUtility.DisplayProgressBar("مملكة الرماد", "توليد الصخور…", 0.7f);
                for (int i = 0; i < RockVariants; i++)
                {
                    BuildRock(i);
                }
            }
            finally
            {
                EditorUtility.ClearProgressBar();
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("مملكة الرماد: الأشجار والصخور جاهزة في " + DawnkeepAssetPaths.Prefabs);
        }

        public static string TreePrefabPath(bool broadleaf, int index)
        {
            return DawnkeepAssetPaths.Prefabs + "/" +
                (broadleaf ? "Dawnkeep_Broadleaf_" : "Dawnkeep_Conifer_") + index + ".prefab";
        }

        public static string RockPrefabPath(int index)
        {
            return DawnkeepAssetPaths.Prefabs + "/Dawnkeep_Rock_" + index + ".prefab";
        }

        private static void BuildTree(bool broadleaf, int index)
        {
            uint seed = (uint)((broadleaf ? 4110000 : 5220000) + (index * 977));
            float height = broadleaf
                ? 11f + (index * 2.6f)
                : 14f + (index * 3.1f);

            TreeMeshFactory.TreeMeshes meshes = broadleaf
                ? TreeMeshFactory.BuildBroadleaf(seed, height)
                : TreeMeshFactory.BuildConifer(seed, height);

            string prefix = (broadleaf ? "Broadleaf_" : "Conifer_") + index;
            Mesh trunk = SaveMesh(meshes.Trunk, prefix + "_Trunk");
            Mesh canopy = SaveMesh(meshes.Canopy, prefix + "_Canopy");

            Material bark = AssetDatabase.LoadAssetAtPath<Material>(
                DawnkeepAssetPaths.Materials + "/Dawnkeep_Bark.mat");
            Material leaf = AssetDatabase.LoadAssetAtPath<Material>(
                DawnkeepAssetPaths.Materials + "/" + (broadleaf ? "Dawnkeep_Leaves.mat" : "Dawnkeep_Needles.mat"));

            GameObject root = new GameObject((broadleaf ? "Dawnkeep_Broadleaf_" : "Dawnkeep_Conifer_") + index);
            root.isStatic = true;

            AddPiece(root, "Trunk", trunk, bark);
            AddPiece(root, "Canopy", canopy, leaf);

            CapsuleCollider collider = root.AddComponent<CapsuleCollider>();
            collider.radius = Mathf.Max(0.35f, meshes.Height * 0.05f);
            collider.height = meshes.Height;
            collider.center = new Vector3(0f, meshes.Height * 0.5f, 0f);

            PrefabUtility.SaveAsPrefabAsset(root, TreePrefabPath(broadleaf, index));
            Object.DestroyImmediate(root);
        }

        private static void BuildRock(int index)
        {
            uint seed = (uint)(6330000 + (index * 613));
            bool outcrop = index >= RockVariants / 2;
            float size = outcrop ? 4.5f + (index * 1.6f) : 1.4f + (index * 0.8f);

            Mesh mesh = outcrop
                ? RockMeshFactory.BuildOutcrop(seed, size)
                : RockMeshFactory.BuildBoulder(seed, size);

            Mesh saved = SaveMesh(mesh, "Rock_" + index);
            Material rockMaterial = AssetDatabase.LoadAssetAtPath<Material>(
                DawnkeepAssetPaths.Materials + "/Dawnkeep_Rock.mat");

            GameObject root = new GameObject("Dawnkeep_Rock_" + index);
            root.isStatic = true;
            AddPiece(root, "Mesh", saved, rockMaterial);

            MeshCollider collider = root.AddComponent<MeshCollider>();
            collider.sharedMesh = saved;

            PrefabUtility.SaveAsPrefabAsset(root, RockPrefabPath(index));
            Object.DestroyImmediate(root);
        }

        private static void AddPiece(GameObject parent, string name, Mesh mesh, Material material)
        {
            GameObject go = new GameObject(name);
            go.transform.SetParent(parent.transform, false);
            go.isStatic = true;

            MeshFilter filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;

            MeshRenderer renderer = go.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = material;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            renderer.receiveShadows = true;
        }

        private static Mesh SaveMesh(Mesh mesh, string name)
        {
            string path = DawnkeepAssetPaths.Meshes + "/Dawnkeep_" + name + ".asset";
            Mesh existing = AssetDatabase.LoadAssetAtPath<Mesh>(path);

            if (existing == null)
            {
                mesh.name = "Dawnkeep_" + name;
                AssetDatabase.CreateAsset(mesh, path);
                return mesh;
            }

            existing.Clear();
            existing.indexFormat = mesh.indexFormat;
            existing.vertices = mesh.vertices;
            existing.normals = mesh.normals;
            existing.uv = mesh.uv;
            existing.colors = mesh.colors;
            existing.triangles = mesh.triangles;
            existing.RecalculateTangents();
            existing.RecalculateBounds();
            EditorUtility.SetDirty(existing);
            Object.DestroyImmediate(mesh);
            return existing;
        }
    }
}
