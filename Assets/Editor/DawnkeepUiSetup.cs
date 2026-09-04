using System.Reflection;
using Dawnkeep.Combat;
using Dawnkeep.UI;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.TextCore.LowLevel;
using UnityEngine.UI;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة السابعة: الخطّ العربي وواجهة المعركة.
    ///
    /// يبني أصلَي خطّ TextMeshPro من ملفّي أميري المرفقين (SIL OFL)، ثم يركّب
    /// لوحة الواجهة وأشرطة الصحّة في المشهد.
    ///
    /// الأصل **ديناميكي** لا ثابت: العربية تحتاج أشكال العرض الأربعة لكل حرف
    /// (FE70–FEFF) وهي أكثر من مئة ومئتَي محرف؛ خبزها كلّها في أطلس مسبقاً
    /// يهدر ذاكرة الجوّال، والديناميكي يخبز ما يُطلَب حين يُطلَب.
    ///
    /// يُنفَّذ بعد القائمة 6 (إعداد القتال والموجات).
    /// </summary>
    public static class DawnkeepUiSetup
    {
        private const string RegularSource = DawnkeepAssetPaths.Fonts + "/Amiri-Regular.ttf";
        private const string BoldSource = DawnkeepAssetPaths.Fonts + "/Amiri-Bold.ttf";
        private const string RegularAsset = DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri.asset";
        private const string BoldAsset = DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri_Bold.asset";

        [MenuItem("مملكة الرماد/7) بناء الخطّ العربي وواجهة المعركة", false, 7)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            AssetDatabase.Refresh();

            TMP_FontAsset regular = BuildFontAsset(RegularSource, RegularAsset);
            TMP_FontAsset bold = BuildFontAsset(BoldSource, BoldAsset);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            if (regular == null)
            {
                Debug.LogError("مملكة الرماد: لم يُبنَ الخطّ — تأكّد من وجود " + RegularSource);
                return;
            }

            MarkChampion();
            WireScene(bold != null ? bold : regular);
        }

        // ── الخطّ ───────────────────────────────────────────────────────────

        /// <summary>يبني أصل خطّ TextMeshPro ديناميكيّاً من ملفّ TTF.</summary>
        private static TMP_FontAsset BuildFontAsset(string sourcePath, string assetPath)
        {
            Font source = AssetDatabase.LoadAssetAtPath<Font>(sourcePath);
            if (source == null)
            {
                Debug.LogWarning("مملكة الرماد: لا ملفّ خطّ في " + sourcePath);
                return null;
            }

            TMP_FontAsset existing = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(assetPath);
            if (existing != null)
            {
                return existing;      // لا يُعاد بناؤه: الأطلس المخبوز يضيع معه
            }

            // 90 نقطة عيّنة و9 حشو: العربية تحتاج مدىً أوسع من اللاتينية لأنّ
            // الكشيدة والحركات تخرج عن مربّع الحرف، والحشو الضيّق يقصّها.
            TMP_FontAsset asset = TMP_FontAsset.CreateFontAsset(
                source, 90, 9, GlyphRenderMode.SDFAA, 1024, 1024,
                AtlasPopulationMode.Dynamic, true);

            if (asset == null)
            {
                Debug.LogError("مملكة الرماد: تعذّر بناء أصل الخطّ من " + sourcePath);
                return null;
            }

            asset.name = System.IO.Path.GetFileNameWithoutExtension(assetPath);
            AssetDatabase.CreateAsset(asset, assetPath);

            // المادّة والأطلس أصول فرعية داخل الملفّ نفسه، وإلّا ضاعا عند النقل
            if (asset.material != null)
            {
                asset.material.name = asset.name + " Material";
                AssetDatabase.AddObjectToAsset(asset.material, asset);
            }

            if (asset.atlasTextures != null && asset.atlasTextures.Length > 0 && asset.atlasTextures[0] != null)
            {
                asset.atlasTextures[0].name = asset.name + " Atlas";
                AssetDatabase.AddObjectToAsset(asset.atlasTextures[0], asset);
            }

            EditorUtility.SetDirty(asset);
            Debug.Log("مملكة الرماد: بُني أصل الخطّ " + assetPath);
            return asset;
        }

        // ── المشهد ──────────────────────────────────────────────────────────

        private static void WireScene(TMP_FontAsset font)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            EnsureEventSystem();
            EnsureHealthBars();

            GameObject canvasObject = GameObject.Find("BattleHud");
            if (canvasObject == null)
            {
                canvasObject = new GameObject("BattleHud", typeof(RectTransform));
            }

            Canvas canvas = Require<Canvas>(canvasObject);
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;

            CanvasScaler scaler = Require<CanvasScaler>(canvasObject);
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;

            // 0.5 يوازن بين العرض والارتفاع: الجوّالات تختلف نسبها اختلافاً
            // كبيراً، والانحياز إلى أحد البعدين يقصّ الزوايا على بعضها.
            scaler.matchWidthOrHeight = 0.5f;

            Require<GraphicRaycaster>(canvasObject);

            BattleHud hud = Require<BattleHud>(canvasObject);
            SetPrivate(hud, "font", font);

            EditorUtility.SetDirty(canvasObject);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log("مملكة الرماد: واجهة المعركة جاهزة. اضغط Play — لوحة الموجة يمين الشاشة.");
        }

        /// <summary>أشرطة الصحّة تعيش مع بقيّة أنظمة المعركة على كائن Battle.</summary>
        private static void EnsureHealthBars()
        {
            GameObject battle = GameObject.Find("Battle");
            if (battle == null)
            {
                Debug.LogWarning("مملكة الرماد: لا كائن Battle — نفّذ القائمة 6 أوّلاً.");
                return;
            }

            if (battle.GetComponent<HealthBarPool>() == null)
            {
                battle.AddComponent<HealthBarPool>();
                EditorUtility.SetDirty(battle);
            }
        }

        /// <summary>
        /// نظام الأحداث بوحدة الإدخال الجديدة وحدها. القديمة ممنوعة (§1)،
        /// فإن لم تكن الحزمة مثبّتة لا نضع بديلاً بل نقول للمستخدم ما ينقصه.
        /// </summary>
        private static void EnsureEventSystem()
        {
            EventSystem existing = Object.FindAnyObjectByType<EventSystem>();
            GameObject holder = existing != null ? existing.gameObject : new GameObject("EventSystem");
            if (existing == null)
            {
                holder.AddComponent<EventSystem>();
            }

#if DAWNKEEP_INPUT
            if (holder.GetComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>() == null)
            {
                // الوحدة القديمة إن وُجدت تتصارع مع الجديدة على نفس الأحداث
                StandaloneInputModule legacy = holder.GetComponent<StandaloneInputModule>();
                if (legacy != null)
                {
                    Object.DestroyImmediate(legacy);
                }

                holder.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
            }
#else
            Debug.LogWarning("مملكة الرماد: حزمة Input System غير مثبّتة — نفّذ القائمة 1، "
                + "ثم أعد هذه الخطوة. الأزرار لن تستجيب قبلها.");
#endif

            EditorUtility.SetDirty(holder);
        }

        /// <summary>يرفع راية البطل على تعريفه: الواجهة تقرؤها لتعرض صحّته.</summary>
        private static void MarkChampion()
        {
            string path = DawnkeepCombatSetup.CombatFolder + "/Unit_Hero.asset";
            UnitDefinition hero = AssetDatabase.LoadAssetAtPath<UnitDefinition>(path);
            if (hero == null)
            {
                Debug.LogWarning("مملكة الرماد: لا تعريف للبطل — نفّذ القائمة 6 أوّلاً.");
                return;
            }

            SetPrivate(hero, "champion", true);
            EditorUtility.SetDirty(hero);
        }

        private static T Require<T>(GameObject target) where T : Component
        {
            T component = target.GetComponent<T>();
            if (component == null)
            {
                component = target.AddComponent<T>();
            }

            return component;
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
                Debug.LogWarning("مملكة الرماد: لا حقل باسم " + field + " في " + target.GetType().Name);
                return;
            }

            info.SetValue(target, value);
        }
    }
}
