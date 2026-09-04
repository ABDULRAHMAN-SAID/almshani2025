using System.Reflection;
using Dawnkeep.Squads;
using Dawnkeep.UI;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة العاشرة: الفرق وأوامرها (§7 و§9).
    ///
    /// يركّب قائد الفرق ومفاتيحها ودائرة الأوامر، ويجعل حامية القلعة الموضوعة
    /// في المشهد **فرقةً واحدة** تسمع الأمر.
    ///
    /// الحامية فرقة واحدة لا فرقاً بعدد الجنود: §9 تقول «لكل فرقة
    /// SquadController» وتضع سقفاً عمليّاً اثنتي عشرة فرقة — وحاميةٌ من عشرين
    /// جنديّاً موزّعين على عشرين فرقة تُغرق دائرة الأوامر بلا فائدة.
    ///
    /// يُنفَّذ بعد القائمة 9 (البناء والاقتصاد).
    /// </summary>
    public static class DawnkeepSquadSetup
    {
        [MenuItem("مملكة الرماد/10) الفرق وأوامرها", false, 10)]
        public static void Setup()
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

            Require<SquadDirector>(battle);

            OrderRing ring = WireRing();
            SquadCommander commander = Require<SquadCommander>(battle);
            SetPrivate(commander, "ring", ring);

            int enlisted = WireCastleGarrison(battle);

            EditorUtility.SetDirty(battle);
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log("مملكة الرماد: الفرق جاهزة. حامية القلعة فرقة واحدة"
                + (enlisted > 0 ? " من جذر Folk" : " (لا جذر Folk — ستُضمّ ثكناتك وحدها)")
                + ". اضغط Play ثم زرّ «الأوامر» أسفل اليمين، أو F و G و H.");
        }

        /// <summary>دائرة الأوامر تعيش على لوحة الواجهة نفسها، بخطّها نفسه.</summary>
        private static OrderRing WireRing()
        {
            GameObject canvas = GameObject.Find("BattleHud");
            if (canvas == null)
            {
                Debug.LogWarning("مملكة الرماد: لا لوحة BattleHud — نفّذ القائمة 7 أوّلاً.");
                return null;
            }

            OrderRing ring = Require<OrderRing>(canvas);

            TMP_FontAsset font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri_Bold.asset");

            if (font == null)
            {
                font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(
                    DawnkeepAssetPaths.FontAssets + "/Dawnkeep_Amiri.asset");
            }

            SetPrivate(ring, "font", font);
            EditorUtility.SetDirty(canvas);
            return ring;
        }

        /// <summary>
        /// يجعل حامية المشهد فرقةً واحدة. تُضمّ بجذرها لا بمراجع مسلسلة:
        /// قائمة الأفراد تُبنى عند الإقلاع، فلا يتخلّف المشهد عن باني الحامية
        /// إن غُيّر عددها.
        /// </summary>
        private static int WireCastleGarrison(GameObject battle)
        {
            GameObject folk = GameObject.Find("Folk");
            if (folk == null)
            {
                return 0;
            }

            GameObject holder = GameObject.Find("CastleGarrison");
            if (holder == null)
            {
                holder = new GameObject("CastleGarrison");
                holder.transform.SetParent(battle.transform, false);
            }

            Squad squad = Require<Squad>(holder);
            SetPrivate(squad, "recruitRoot", folk.transform);

            EditorUtility.SetDirty(holder);
            return 1;
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
