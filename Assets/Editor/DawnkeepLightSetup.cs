using System.Reflection;
using Dawnkeep.Combat;
using Dawnkeep.Light;
using Dawnkeep.World;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الثامنة: نظام نور الفجر (§11) — العنصر الفارق الأصلي للّعبة.
    ///
    /// يُنشئ أصل إعدادات النور بكل أرقامه، ويضع المنارات حول الحصن، ويركّب
    /// حقل النور وأمر اللاعب وعلامات الظلام على كائن المعركة.
    ///
    /// المنارات على حلقة السور لا في وسط الحصن: دائرةٌ في المركز تحمي ما لا
    /// يُهاجَم، وتترك الجدار — حيث يقع القتال فعلاً — في الظلام.
    ///
    /// يُنفَّذ بعد القائمة 7 (الخطّ والواجهة).
    /// </summary>
    public static class DawnkeepLightSetup
    {
        private const string SettingsPath = DawnkeepAssetPaths.Settings + "/LightSettings.asset";

        /// <summary>عدد المنارات حول الحصن.</summary>
        private const int BeaconCount = 4;

        [MenuItem("مملكة الرماد/8) نظام نور الفجر", false, 8)]
        public static void Setup()
        {
            DawnkeepAssetPaths.EnsureFolders();

            LightSettings settings = AssetDatabase.LoadAssetAtPath<LightSettings>(SettingsPath);
            if (settings == null)
            {
                settings = ScriptableObject.CreateInstance<LightSettings>();
                AssetDatabase.CreateAsset(settings, SettingsPath);
                EditorUtility.SetDirty(settings);
                AssetDatabase.SaveAssets();
                Debug.Log("مملكة الرماد: أُنشئ أصل إعدادات النور في " + SettingsPath);
            }

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

            LightField field = battle.GetComponent<LightField>();
            if (field == null)
            {
                field = battle.AddComponent<LightField>();
            }

            SetPrivate(field, "settings", settings);
            SetPrivate(field, "waves", battle.GetComponent<WaveDirector>());

            if (battle.GetComponent<LightCommander>() == null)
            {
                battle.AddComponent<LightCommander>();
            }

            if (battle.GetComponent<ShadowMarkPool>() == null)
            {
                battle.AddComponent<ShadowMarkPool>();
            }

            int placed = PlaceBeacons(settings);

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log("مملكة الرماد: نظام النور جاهز — " + placed + " منارات. "
                + "اضغط Play ثم انقر منارةً أثناء الاستعداد لتنقل إليها شحنة.");
        }

        /// <summary>
        /// يوزّع المنارات على حلقة حول الحصن، وأوّلها في وجه المهاجمين.
        /// الموجودة سلفاً تُعاد ضبطها ولا تُضاعَف.
        /// </summary>
        private static int PlaceBeacons(LightSettings settings)
        {
            GameObject root = GameObject.Find("Beacons");
            if (root == null)
            {
                root = new GameObject("Beacons");
            }

            // 0.74 من نصف قطر السور: داخل الساحة بوضوح — حلقة السور نفسها
            // تتموّج بين 0.88 و1.16 فوضعُها عليها يدفن العمود في الحجر.
            // ونورها يتجاوز السور (67 + 43 > 104) فيسقط على المهاجمين خارجه،
            // وهذه هي الصورة التكتيكية المقصودة.
            float radius = CastleRadius() * 0.74f;
            float firstAngle = ThreatAngle();

            for (int i = 0; i < BeaconCount; i++)
            {
                string name = "Beacon_" + i;
                Transform existing = root.transform.Find(name);
                GameObject go = existing != null ? existing.gameObject : new GameObject(name);
                go.transform.SetParent(root.transform, false);

                float angle = firstAngle + ((float)i / BeaconCount * Mathf.PI * 2f);
                float x = Mathf.Cos(angle) * radius;
                float z = Mathf.Sin(angle) * radius;
                go.transform.position = new Vector3(x, Height(x, z), z);
                go.transform.rotation = Quaternion.identity;

                Beacon beacon = go.GetComponent<Beacon>();
                if (beacon == null)
                {
                    beacon = go.AddComponent<Beacon>();
                }

                // الأولى وحدها مضاءة: الشحنتان الباقيتان في المخزون بيد اللاعب
                // فيتعلّم النقل في أوّل مهلة استعداد بدل أن يُشرَح له.
                beacon.Configure(settings, i == 0 ? 1 : 0);
                EditorUtility.SetDirty(beacon);      // المكوّن هو ما تغيّر لا الكائن
                EditorUtility.SetDirty(go);
            }

            EditorUtility.SetDirty(root);
            return BeaconCount;
        }

        /// <summary>الجهة التي يأتي منها المهاجمون — أوّل منارة تواجهها.</summary>
        private static float ThreatAngle()
        {
            GameObject spawn = GameObject.Find("HordeSpawn");
            if (spawn == null)
            {
                return 0f;
            }

            Vector3 from = spawn.transform.position;
            if ((from.x * from.x) + (from.z * from.z) < 1f)
            {
                return 0f;
            }

            return Mathf.Atan2(from.z, from.x);
        }

        /// <summary>
        /// نصف قطر السور بإحداثيات المشهد. يُقرأ من نفس الأصل الذي بُني منه
        /// الحصن، فلا يتخلّف عنه إن غُيّر مقياس العالم.
        /// </summary>
        private static float CastleRadius()
        {
            WorldGenSettings settings =
                AssetDatabase.LoadAssetAtPath<WorldGenSettings>(DawnkeepAssetPaths.WorldSettings);

            if (settings == null)
            {
                return 96f;
            }

            return settings.CastleRadius * settings.WorldScale;
        }

        private static float Height(float x, float z)
        {
            Terrain terrain = Terrain.activeTerrain;
            if (terrain == null)
            {
                return 0f;
            }

            return terrain.SampleHeight(new Vector3(x, 0f, z)) + terrain.transform.position.y;
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
