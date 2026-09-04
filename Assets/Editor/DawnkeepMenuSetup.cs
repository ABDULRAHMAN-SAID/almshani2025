using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Flow;
using Dawnkeep.Localization;
using Dawnkeep.Meta;
using Dawnkeep.Save;
using Dawnkeep.UI;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// مشهد الإقلاع والقائمة الرئيسة (§24)، وتسجيل المشهدين في إعدادات البناء.
    ///
    /// **يُبنى آخراً** ويُعيد فتح مشهد العالم بعده: بناؤه يفتح مشهداً آخر،
    /// وتركُ المحرّر على مشهد القائمة يجعل من ينفّذ «بناء كل شيء» يجد نفسه
    /// في مشهدٍ غير الذي بناه.
    /// </summary>
    public static class DawnkeepMenuSetup
    {
        public const string MenuScene = DawnkeepAssetPaths.Scenes + "/Dawnkeep_Menu.unity";

        [MenuItem("مملكة الرماد/17) القائمة الرئيسة ومشهد الإقلاع", false, 17)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();

            string previous = SceneManager.GetActiveScene().path;

            Scene scene = EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene, NewSceneMode.Single);

            Build(scene);

            EditorSceneManager.SaveScene(scene, MenuScene);
            Register();

            // العودة إلى ما كان مفتوحاً: البناء لا يسرق مشهد من يشغّله
            if (!string.IsNullOrEmpty(previous) && System.IO.File.Exists(previous))
            {
                EditorSceneManager.OpenScene(previous, OpenSceneMode.Single);
            }

            Debug.Log("مملكة الرماد: القائمة الرئيسة جاهزة في " + MenuScene
                + " — وهي أوّل مشهدٍ في إعدادات البناء.");
        }

        private static void Build(Scene scene)
        {
            // كاميرا: مشهدٌ بلا كاميرا يعرض تحذيراً ولا يرسم الخلفية
            GameObject cameraObject = new GameObject("MenuCamera", typeof(Camera));
            Camera camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.043f, 0.047f, 0.055f, 1f);
            camera.orthographic = true;

            GameObject events = new GameObject("EventSystem",
                typeof(UnityEngine.EventSystems.EventSystem));
#if ENABLE_INPUT_SYSTEM
            events.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
#else
            events.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
#endif

            // الأنظمة التي تحتاجها القائمة: الحفظ والتقدّم والنصوص
            GameObject systems = new GameObject("MenuSystems");
            systems.AddComponent<SaveService>();

            LocaleRuntime locale = systems.AddComponent<LocaleRuntime>();
            SetPrivate(locale, "table", AssetDatabase.LoadAssetAtPath<LocaleTable>(
                DawnkeepLocale.TablePath));

            Progress progress = systems.AddComponent<Progress>();
            progress.Configure(
                AssetDatabase.LoadAssetAtPath<ProgressSettings>(
                    DawnkeepMetaSetup.MetaFolder + "/ProgressSettings.asset"),
                LoadNodes());

            // اللوحة
            GameObject canvasObject = new GameObject("MenuCanvas", typeof(RectTransform));
            Canvas canvas = canvasObject.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;

            CanvasScaler scaler = canvasObject.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;

            canvasObject.AddComponent<GraphicRaycaster>();

            TMP_FontAsset font = Font();

            MainMenu menu = canvasObject.AddComponent<MainMenu>();
            menu.Configure(font, System.IO.Path.GetFileNameWithoutExtension(
                DawnkeepAssetPaths.WorldScene));

            MetaPanel meta = canvasObject.AddComponent<MetaPanel>();
            meta.Configure(font);

            PauseMenu pause = canvasObject.AddComponent<PauseMenu>();
            SetPrivate(pause, "font", font);

            // شاشة التجهيز في القائمة أيضاً (§17: «يجهّز قبل المرحلة»).
            // نسخةٌ في كل مشهد لا كائنٌ باقٍ بين المشهدين: `Loadout` وحده هو
            // ما يحمل الحال، وهو على `Meta`؛ واللوحة رسمٌ يُبنى حيث يُعرض.
            Dawnkeep.UI.LoadoutPanel loadout = canvasObject.AddComponent<Dawnkeep.UI.LoadoutPanel>();
            loadout.Configure(font);

            // والعقائد معها (§18: «قبل المرحلة»)
            Dawnkeep.UI.DoctrinePanel doctrine =
                canvasObject.AddComponent<Dawnkeep.UI.DoctrinePanel>();
            doctrine.Configure(font);

            // وخريطة الحملة (§19): من هنا تُختار المرحلة قبل زرّ اللعب
            Dawnkeep.UI.CampaignPanel campaign =
                canvasObject.AddComponent<Dawnkeep.UI.CampaignPanel>();
            campaign.Configure(font);

            // وأنماط §20
            Dawnkeep.UI.ModePanel modes = canvasObject.AddComponent<Dawnkeep.UI.ModePanel>();
            modes.Configure(font);

            // ومُخرِج الأنماط نفسه على كائن `Meta` مع بقيّة قرّاء الحفظ
            GameObject meta = GameObject.Find("Meta");
            if (meta == null)
            {
                meta = new GameObject("Meta");
            }

            if (meta.GetComponent<Dawnkeep.Modes.ModeDirector>() == null)
            {
                meta.AddComponent<Dawnkeep.Modes.ModeDirector>();
            }
        }

        /// <summary>
        /// يسجّل المشهدين في إعدادات البناء: القائمة أوّلاً ثمّ العالم. §41
        /// تضع «لعبة قابلة للعب من Main Menu حتى Result» في رأس الأولويات،
        /// وترتيبُ المشاهد هو ما يجعلها تبدأ من هناك.
        /// </summary>
        private static void Register()
        {
            List<EditorBuildSettingsScene> scenes = new List<EditorBuildSettingsScene>();
            scenes.Add(new EditorBuildSettingsScene(MenuScene, true));

            if (System.IO.File.Exists(DawnkeepAssetPaths.WorldScene))
            {
                scenes.Add(new EditorBuildSettingsScene(DawnkeepAssetPaths.WorldScene, true));
            }
            else
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد عالم بعد — نفّذ القائمة 5.");
            }

            // ما كان مسجَّلاً غيرهما يبقى بعدهما لا يُمحى: قد يكون للمستخدم
            // مشاهدُ تجريب، ومحوُها بلا استئذان أذى.
            EditorBuildSettingsScene[] existing = EditorBuildSettings.scenes;
            for (int i = 0; i < existing.Length; i++)
            {
                string path = existing[i].path;
                if (path != MenuScene && path != DawnkeepAssetPaths.WorldScene)
                {
                    scenes.Add(existing[i]);
                }
            }

            EditorBuildSettings.scenes = scenes.ToArray();
        }

        private static ResearchNode[] LoadNodes()
        {
            string[] guids = AssetDatabase.FindAssets("t:ResearchNode",
                new[] { DawnkeepMetaSetup.MetaFolder });

            List<ResearchNode> nodes = new List<ResearchNode>(guids.Length);
            for (int i = 0; i < guids.Length; i++)
            {
                ResearchNode node = AssetDatabase.LoadAssetAtPath<ResearchNode>(
                    AssetDatabase.GUIDToAssetPath(guids[i]));

                if (node != null)
                {
                    nodes.Add(node);
                }
            }

            return nodes.ToArray();
        }

        private static TMP_FontAsset Font()
        {
            TMP_FontAsset font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri_Bold.asset");

            if (font == null)
            {
                font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                    DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri.asset");
            }

            return font;
        }

        private static void SetPrivate(object target, string field, object value)
        {
            if (target == null)
            {
                return;
            }

            FieldInfo info = target.GetType().GetField(field,
                BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public);

            if (info == null)
            {
                Debug.LogWarning("مملكة الرماد: لا حقل باسم " + field
                    + " في " + target.GetType().Name);
                return;
            }

            info.SetValue(target, value);
        }
    }
}
