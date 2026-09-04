using UnityEditor;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// زرّ واحد ينفّذ الخطوات 2→12 بالترتيب.
    /// الخطوة 1 (تثبيت الحزم) تبقى منفصلة لأنها تُشغّل إعادة تجميع.
    /// </summary>
    public static class DawnkeepBuildAll
    {
        [MenuItem("مملكة الرماد/بناء كل شيء (2 ← 15)", false, 20)]
        public static void BuildEverything()
        {
            if (!DawnkeepAssetPaths.TypeExists("UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset"))
            {
                EditorUtility.DisplayDialog(
                    "مملكة الرماد",
                    "حزمة URP غير مثبّتة بعد.\nنفّذ أولاً: مملكة الرماد ▸ 1) تثبيت الحزم، وانتظر انتهاء إعادة التجميع، ثم أعد المحاولة.",
                    "حسناً");
                return;
            }

            DawnkeepRenderPipelineSetup.Setup();
            DawnkeepTextureBaker.BakeAll();
            DawnkeepPrefabBuilder.BuildAll();
            DawnkeepWorldSceneBuilder.BuildScene();
            DawnkeepLocalizationSetup.Setup();
            DawnkeepCombatSetup.Setup();
            DawnkeepUiSetup.Setup();
            DawnkeepLightSetup.Setup();
            DawnkeepBuildSetup.Setup();
            DawnkeepSquadSetup.Setup();
            DawnkeepHeroSetup.Setup();
            DawnkeepBossSetup.Setup();
            DawnkeepBoonSetup.Setup();
            DawnkeepMetaSetup.Setup();
        }

        [MenuItem("مملكة الرماد/فتح إعدادات توليد العالم", false, 40)]
        public static void SelectSettings()
        {
            Object settings = DawnkeepWorldSceneBuilder.EnsureSettings();
            Selection.activeObject = settings;
            EditorGUIUtility.PingObject(settings);
        }
    }
}
