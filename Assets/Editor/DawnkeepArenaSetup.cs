using System.Collections.Generic;
using System.Reflection;
using Dawnkeep.Building;
using Dawnkeep.Combat;
using Dawnkeep.Performance;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// ساحة قياس الأداء (§31): مئةٌ ثمّ مئتان وخمسون ثمّ خمسمئة عدوّ، وخمسون
    /// جنديّاً، وعشرون برجاً، ومقذوفاتٌ ومؤثّرات.
    ///
    /// **مشهدٌ مستقلّ لا وضعٌ في مشهد اللعب**: القياس يحتاج أعداداً ثابتة
    /// وبلا موجاتٍ تتغيّر ولا بناءٍ يتحرّك، وخلطُه باللعب يجعل كل قياسٍ يقيس
    /// شيئاً آخر.
    ///
    /// وثلاثة مشاهد لا واحد بمقبض: §31 تطلب الأرقام الثلاثة، ومقبضٌ يُبدَّل
    /// يدويّاً يجعل من ينسى تبديله يظنّ أنّه قاس الثلاثة.
    /// </summary>
    public static class DawnkeepArenaSetup
    {
        private static readonly int[] Populations = { 100, 250, 500 };

        private const int Soldiers = 50;
        private const int Towers = 20;

        [MenuItem("مملكة الرماد/18) بناء ساحات قياس الأداء", false, 18)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();
            string previous = SceneManager.GetActiveScene().path;

            PerformanceSettings settings = MakeSettings();
            UnitDefinition raider = Load<UnitDefinition>(
                DawnkeepCombatSetup.CombatFolder + "/Unit_Raider.asset");
            UnitDefinition brute = Load<UnitDefinition>(
                DawnkeepCombatSetup.CombatFolder + "/Unit_Brute.asset");
            UnitDefinition archer = Load<UnitDefinition>(
                DawnkeepCombatSetup.CombatFolder + "/Unit_Archer.asset");
            UnitDefinition swordsman = Load<UnitDefinition>(
                DawnkeepCombatSetup.CombatFolder + "/Unit_Swordsman.asset");
            BuildingDefinition tower = Load<BuildingDefinition>(
                DawnkeepBuildSetup.BuildFolder + "/Build_Watchtower.asset");

            if (raider == null || swordsman == null)
            {
                Debug.LogWarning("مملكة الرماد: لا تعريفات وحدات — نفّذ القائمة 6 أوّلاً.");
                return;
            }

            for (int i = 0; i < Populations.Length; i++)
            {
                Scene scene = EditorSceneManager.NewScene(
                    NewSceneSetup.EmptyScene, NewSceneMode.Single);

                Build(Populations[i], settings, raider, brute, archer, swordsman, tower);

                string path = DawnkeepAssetPaths.Scenes + "/Dawnkeep_Arena_"
                    + Populations[i] + ".unity";

                EditorSceneManager.SaveScene(scene, path);
            }

            if (!string.IsNullOrEmpty(previous) && System.IO.File.Exists(previous))
            {
                EditorSceneManager.OpenScene(previous, OpenSceneMode.Single);
            }

            Debug.Log("مملكة الرماد: ثلاث ساحات قياس في " + DawnkeepAssetPaths.Scenes
                + " — افتح إحداها واضغط Play، والتقرير في السجلّ بعد اثنتي عشرة ثانية.");
        }

        private static void Build(int enemies, PerformanceSettings settings,
            UnitDefinition raider, UnitDefinition brute, UnitDefinition archer,
            UnitDefinition swordsman, BuildingDefinition tower)
        {
            GameObject cameraObject = new GameObject("ArenaCamera", typeof(Camera));
            Camera camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.055f, 0.063f, 0.075f, 1f);
            camera.transform.position = new Vector3(0f, 120f, -120f);
            camera.transform.rotation = Quaternion.Euler(42f, 0f, 0f);
            camera.farClipPlane = 600f;

            GameObject systems = new GameObject("Arena");
            CombatDirector combat = systems.AddComponent<CombatDirector>();
            combat.UsePerformance(settings);

            systems.AddComponent<ProjectilePool>();
            systems.AddComponent<HazardField>();
            systems.AddComponent<PerformanceProbe>();

            // الحشد: حلقاتٌ متّحدة المركز فلا يتراكب أحدٌ على أحد عند البدء،
            // وكثافةٌ ثابتة مهما كان العدد — وإلّا قِيس التراكب لا الحشد.
            GameObject horde = new GameObject("Horde");
            UnitDefinition[] mix = { raider, brute, archer };
            for (int i = 0; i < enemies; i++)
            {
                UnitDefinition def = mix[i % mix.Length];
                if (def == null)
                {
                    def = raider;
                }

                Place(horde.transform, def, Ring(i, enemies, 40f, 150f));
            }

            GameObject folk = new GameObject("Folk");
            for (int i = 0; i < Soldiers; i++)
            {
                Place(folk.transform, swordsman, Ring(i, Soldiers, 8f, 30f));
            }

            // الأبراج: مبانٍ حقيقية ترمي مقذوفاتٍ حقيقية، لا مكعّبات ساكنة
            if (tower != null)
            {
                GameObject towers = new GameObject("Towers");
                BuildingDirector buildings = systems.AddComponent<BuildingDirector>();

                for (int i = 0; i < Towers; i++)
                {
                    GameObject go = new GameObject("Tower_" + i);
                    go.transform.SetParent(towers.transform, false);

                    float angle = (i / (float)Towers) * Mathf.PI * 2f;
                    go.transform.position = new Vector3(
                        Mathf.Cos(angle) * 34f, 0f, Mathf.Sin(angle) * 34f);

                    Dawnkeep.Building.Building building =
                        go.AddComponent<Dawnkeep.Building.Building>();

                    // بلا عقدة: `Raise` تقبلها فارغةً، والمبنى في الساحة
                    // لا يُباع ولا يُرقّى — إنّما يرمي.
                    building.Raise(tower, null, tower.Cost, (uint)(i * 37 + 11));
                    buildings.Adopt(building);
                }
            }
        }

        /// <summary>موضعٌ على حلقةٍ بين نصفَي قطر — توزيعٌ متساوي الكثافة.</summary>
        private static Vector3 Ring(int index, int count, float inner, float outer)
        {
            // الجذر التربيعي لا الخطّي: التوزيع الخطّي يكدّس المركز، فتقيس
            // الساحة تراكماً في نقطةٍ لا حشداً منتشراً.
            float t = count <= 1 ? 0f : index / (float)(count - 1);
            float radius = Mathf.Sqrt(Mathf.Lerp(inner * inner, outer * outer, t));
            float angle = index * 2.399963f;      // الزاوية الذهبية: لا صفوف
            return new Vector3(Mathf.Cos(angle) * radius, 0f, Mathf.Sin(angle) * radius);
        }

        private static void Place(Transform parent, UnitDefinition def, Vector3 position)
        {
            if (def == null || def.Prefab == null)
            {
                return;
            }

            GameObject go = (GameObject)PrefabUtility.InstantiatePrefab(def.Prefab, parent);
            go.transform.position = position;

            Unit unit = go.GetComponent<Unit>();
            if (unit == null)
            {
                unit = go.AddComponent<Unit>();
            }

            unit.SetDefinition(def);
        }

        private static PerformanceSettings MakeSettings()
        {
            string path = DawnkeepAssetPaths.Settings + "/PerformanceSettings.asset";
            PerformanceSettings settings = AssetDatabase.LoadAssetAtPath<PerformanceSettings>(path);
            if (settings == null)
            {
                settings = ScriptableObject.CreateInstance<PerformanceSettings>();
                AssetDatabase.CreateAsset(settings, path);
            }

            SetPrivate(settings, "lowBudget", 140);        // §31 حرفياً
            SetPrivate(settings, "mediumBudget", 280);     // §31 حرفياً
            SetPrivate(settings, "highBudget", 500);       // §31 حرفياً
            SetPrivate(settings, "simulationHz", 25f);     // §31: بين 20 و30
            SetPrivate(settings, "distantHz", 4f);         // §31 حرفياً
            SetPrivate(settings, "distantRange", 90f);
            SetPrivate(settings, "preWarmPools", true);
            SetPrivate(settings, "preWarmMargin", 1.25f);

            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();
            return settings;
        }

        private static T Load<T>(string path) where T : Object
        {
            return AssetDatabase.LoadAssetAtPath<T>(path);
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
                return;
            }

            info.SetValue(target, value);
        }
    }
}
