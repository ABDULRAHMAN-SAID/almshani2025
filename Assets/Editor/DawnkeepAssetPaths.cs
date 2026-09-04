using System.IO;
using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>مسارات الأصول المولّدة — مكان واحد يعرفه كل بنّاء.</summary>
    public static class DawnkeepAssetPaths
    {
        public const string Root = "Assets/Dawnkeep";
        public const string Generated = Root + "/Generated";
        public const string Textures = Generated + "/Textures";
        public const string Materials = Generated + "/Materials";
        public const string TerrainLayers = Generated + "/TerrainLayers";
        public const string Meshes = Generated + "/Meshes";
        public const string Prefabs = Generated + "/Prefabs";
        public const string Art = Root + "/Art";
        public const string Fonts = Art + "/Fonts";
        public const string FontAssets = Generated + "/Fonts";
        public const string Settings = Root + "/Settings";
        public const string Scenes = "Assets/Scenes";
        public const string WorldScene = Scenes + "/Dawnkeep_World.unity";
        public const string WorldSettings = Settings + "/WorldGenSettings.asset";

        /// <summary>ينشئ كل المجلّدات المطلوبة إن لم تكن موجودة.</summary>
        public static void EnsureFolders()
        {
            string[] folders =
            {
                Root, Generated, Textures, Materials, TerrainLayers, Meshes, Prefabs,
                Art, Fonts, FontAssets, Settings, Scenes,
            };

            for (int i = 0; i < folders.Length; i++)
            {
                Directory.CreateDirectory(folders[i]);
            }

            AssetDatabase.Refresh();
        }

        /// <summary>يحمّل أصلاً موجوداً أو ينشئه بالمصنع المعطى.</summary>
        public static T LoadOrCreate<T>(string path, System.Func<T> factory) where T : Object
        {
            T existing = AssetDatabase.LoadAssetAtPath<T>(path);
            if (existing != null)
            {
                return existing;
            }

            T created = factory();
            if (created == null)
            {
                return null;
            }

            AssetDatabase.CreateAsset(created, path);
            return created;
        }

        /// <summary>يفحص وجود صنف بالاسم الكامل في أي تجميعة محمّلة — للكشف عن الحزم دون الارتباط بها.</summary>
        public static bool TypeExists(string fullName)
        {
            System.Reflection.Assembly[] assemblies = System.AppDomain.CurrentDomain.GetAssemblies();
            for (int i = 0; i < assemblies.Length; i++)
            {
                if (assemblies[i].GetType(fullName, false) != null)
                {
                    return true;
                }
            }

            return false;
        }
    }
}
