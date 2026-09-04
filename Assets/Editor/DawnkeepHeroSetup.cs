using System.Reflection;
using Dawnkeep.CameraRig;
using Dawnkeep.Combat;
using Dawnkeep.Flow;
using Dawnkeep.Hero;
using Dawnkeep.Localization;
using Dawnkeep.UI;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الثانية عشرة: البطل وقدراته، والنتيجة، وقائمة الإيقاف
    /// (§5 و§7 و§8).
    ///
    /// يُنشئ تعريف البطل بأرقام §8 حرفياً، ويجعل بطل المشهد مقوداً باللاعب،
    /// ويركّب أزرار القدرات وشاشة النتيجة ولوحة الإيقاف.
    ///
    /// يُنفَّذ بعد القائمة 11 (جدول النصوص).
    /// </summary>
    public static class DawnkeepHeroSetup
    {
        private const string HeroPath = DawnkeepAssetPaths.Settings + "/HeroDefinition.asset";
        private const string HeroNameKey = "hero.aryn";

        [MenuItem("مملكة الرماد/12) البطل والنتيجة وقائمة الإيقاف", false, 12)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();

            HeroDefinition definition = AssetDatabase.LoadAssetAtPath<HeroDefinition>(HeroPath);
            if (definition == null)
            {
                definition = ScriptableObject.CreateInstance<HeroDefinition>();
                AssetDatabase.CreateAsset(definition, HeroPath);
            }

            SetPrivate(definition, "nameKey", HeroNameKey);
            EditorUtility.SetDirty(definition);

            DawnkeepLocale.Add(new[]
            {
                DawnkeepLocale.Row(HeroNameKey, "أَرْيَن، حارس الفجر", "Aryn, Warden of Dawn"),
            });

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            WireScene(definition);
        }

        private static void WireScene(HeroDefinition definition)
        {
            Scene scene = SceneManager.GetActiveScene();
            if (!scene.IsValid())
            {
                Debug.LogWarning("مملكة الرماد: لا مشهد مفتوح — نفّذ القائمة 5 أوّلاً.");
                return;
            }

            GameObject battle = GameObject.Find("Battle");
            if (battle == null)
            {
                Debug.LogWarning("مملكة الرماد: لا كائن Battle — نفّذ القائمة 6 أوّلاً.");
                return;
            }

            Require<StageOutcome>(battle);

            bool wired = WireHero(definition);
            WirePanels();

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log(wired
                ? "مملكة الرماد: البطل جاهز — حرّكه بـWASD، وقدراته Q و E و R، والإيقاف Esc."
                : "مملكة الرماد: لم يُعثر على بطل في المشهد (Folk/…Hero…) — نفّذ القائمتين 5 و6.");
        }

        /// <summary>
        /// يجعل بطل المشهد مقوداً باللاعب، وتتبعه الكاميرا.
        /// يُميَّز من اسم جاهزته كما في إسناد الحامية: هي المعلومة المتاحة.
        /// </summary>
        private static bool WireHero(HeroDefinition definition)
        {
            GameObject folk = GameObject.Find("Folk");
            if (folk == null)
            {
                return false;
            }

            Transform root = folk.transform;
            for (int i = 0; i < root.childCount; i++)
            {
                Transform child = root.GetChild(i);
                if (!child.name.Contains("Hero"))
                {
                    continue;
                }

                HeroController hero = child.GetComponent<HeroController>();
                if (hero == null)
                {
                    hero = child.gameObject.AddComponent<HeroController>();
                }

                SetPrivate(hero, "definition", definition);

                Unit unit = child.GetComponent<Unit>();
                if (unit != null)
                {
                    unit.PlayerControlled = true;
                }

                // الكاميرا تتبعه: بطلٌ يتحرّك خارج الإطار لا يُلعب به
                RtsCameraRig rig = Object.FindAnyObjectByType<RtsCameraRig>();
                if (rig != null)
                {
                    rig.SetFollowTarget(child);
                    EditorUtility.SetDirty(rig);
                }

                EditorUtility.SetDirty(child.gameObject);
                return true;
            }

            return false;
        }

        private static void WirePanels()
        {
            GameObject canvas = GameObject.Find("BattleHud");
            if (canvas == null)
            {
                Debug.LogWarning("مملكة الرماد: لا لوحة BattleHud — نفّذ القائمة 7 أوّلاً.");
                return;
            }

            TMP_FontAsset font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri_Bold.asset");

            if (font == null)
            {
                font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                    DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri.asset");
            }

            SetPrivate(Require<AbilityBar>(canvas), "font", font);
            SetPrivate(Require<ResultPanel>(canvas), "font", font);
            SetPrivate(Require<PauseMenu>(canvas), "font", font);

            EditorUtility.SetDirty(canvas);
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
