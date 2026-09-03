using System.IO;
using Almshani.Game;
using Almshani.Player;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Almshani.EditorTools
{
    /// <summary>
    /// يبني مشهد البداية برمجياً (أرض + لاعب + كاميرا متابعة + إضاءة) ويحفظه في Assets/Scenes/Main.unity.
    /// السبب: ملفات المشاهد (.unity) بصيغة YAML بمعرّفات داخلية — تُولَّد من المحرر ولا تُكتب باليد.
    /// القائمة: Almshani ▸ Create Starter Scene
    /// </summary>
    public static class StarterSceneBuilder
    {
        private const string SceneFolder = "Assets/Scenes";
        private const string ScenePath = SceneFolder + "/Main.unity";

        [MenuItem("Almshani/Create Starter Scene", false, 10)]
        public static void CreateStarterScene()
        {
            if (File.Exists(ScenePath) &&
                !EditorUtility.DisplayDialog(
                    "مشهد البداية موجود",
                    "الملف Assets/Scenes/Main.unity موجود مسبقاً. هل تستبدله؟",
                    "استبدل", "إلغاء"))
            {
                return;
            }

            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
            {
                return;
            }

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // الأرض
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(4f, 1f, 4f);

            // اللاعب
            var player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            player.name = "Player";
            player.transform.position = new Vector3(0f, 1.1f, 0f);
            Object.DestroyImmediate(player.GetComponent<CapsuleCollider>());
            player.AddComponent<CharacterController>();
            player.AddComponent<PlayerController>();

            // كتلة مرجعية تُظهر الحركة والاصطدام
            var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = "Obstacle";
            block.transform.position = new Vector3(4f, 0.5f, 5f);

            // الإضاءة
            var lightObject = new GameObject("Directional Light");
            var light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.shadows = LightShadows.Soft;
            light.intensity = 1.1f;
            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            // الكاميرا
            var cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            var camera = cameraObject.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.Skybox;
            cameraObject.AddComponent<AudioListener>();
            // الضباب يتبع بُعد الكاميرا فلا يبيضّ المشهد كلّما ابتعدت
            cameraObject.AddComponent<Dawnkeep.CameraRig.DistanceFog>();
            var follow = cameraObject.AddComponent<CameraFollow>();
            follow.SetTarget(player.transform);
            cameraObject.transform.position = player.transform.position + new Vector3(0f, 9f, -9f);
            cameraObject.transform.LookAt(player.transform.position + Vector3.up);

            // الإقلاع
            var bootstrap = new GameObject("GameBootstrap");
            bootstrap.AddComponent<GameBootstrap>();

            Directory.CreateDirectory(SceneFolder);
            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.Refresh();

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            Debug.Log("تم إنشاء مشهد البداية: " + ScenePath + " — اضغط Play للتجربة (WASD للحركة، Space للقفز).");
        }
    }
}
