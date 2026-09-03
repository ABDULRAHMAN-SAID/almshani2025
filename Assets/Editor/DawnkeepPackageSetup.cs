using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الأولى: تثبيت الحزم التي يحتاجها الشكل الثلاثي الأبعاد.
    /// لا نكتب أرقام إصدارات في manifest.json — نطلب الحزمة بلا إصدار
    /// فيختار Unity النسخة المتوافقة مع نسخة المحرّر الحالية.
    /// </summary>
    [InitializeOnLoad]
    public static class DawnkeepPackageSetup
    {
        private const string UrpType = "UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset";
        private const string InputType = "UnityEngine.InputSystem.InputAction";
        private const string CinemachineType = "Unity.Cinemachine.CinemachineCamera";
        private const string CinemachineLegacyType = "Cinemachine.CinemachineVirtualCamera";

        private const string UrpDefine = "DAWNKEEP_URP";
        private const string InputDefine = "DAWNKEEP_INPUT";
        private const string CinemachineDefine = "DAWNKEEP_CINEMACHINE";

        private static AddAndRemoveRequest _request;

        static DawnkeepPackageSetup()
        {
            // يُشغَّل عند كل إعادة تجميع: يبقي رموز التعريف مطابقة للحزم المثبّتة فعلاً
            EditorApplication.delayCall += SyncDefines;
        }

        [MenuItem("مملكة الرماد/1) تثبيت الحزم (URP + Input System + Cinemachine)", false, 1)]
        public static void InstallPackages()
        {
            if (_request != null && !_request.IsCompleted)
            {
                Debug.Log("مملكة الرماد: تثبيت الحزم جارٍ بالفعل…");
                return;
            }

            List<string> add = new List<string>();
            if (!DawnkeepAssetPaths.TypeExists(UrpType))
            {
                add.Add("com.unity.render-pipelines.universal");
            }

            if (!DawnkeepAssetPaths.TypeExists(InputType))
            {
                add.Add("com.unity.inputsystem");
            }

            if (!DawnkeepAssetPaths.TypeExists(CinemachineType) && !DawnkeepAssetPaths.TypeExists(CinemachineLegacyType))
            {
                add.Add("com.unity.cinemachine");
            }

            if (add.Count == 0)
            {
                Debug.Log("مملكة الرماد: كل الحزم المطلوبة مثبّتة — انتقل إلى الخطوة 2.");
                SyncDefines();
                return;
            }

            Debug.Log("مملكة الرماد: تثبيت " + string.Join("، ", add.ToArray()) + " … قد يستغرق دقيقة.");
            _request = Client.AddAndRemove(add.ToArray(), null);
            EditorApplication.update += PollRequest;
        }

        private static void PollRequest()
        {
            if (_request == null || !_request.IsCompleted)
            {
                return;
            }

            EditorApplication.update -= PollRequest;

            if (_request.Status == StatusCode.Success)
            {
                Debug.Log("مملكة الرماد: تمّ تثبيت الحزم. انتظر إعادة التجميع ثم نفّذ الخطوة 2.");
            }
            else
            {
                Debug.LogError("مملكة الرماد: فشل تثبيت الحزم — " +
                    (_request.Error != null ? _request.Error.message : "سبب غير معروف") +
                    "\nيمكنك تثبيتها يدوياً من Window ▸ Package Manager.");
            }

            _request = null;
            EditorApplication.delayCall += SyncDefines;
        }

        /// <summary>يضيف/يزيل رموز التعريف حسب الحزم الموجودة فعلاً — فلا يفشل التجميع قبل التثبيت.</summary>
        public static void SyncDefines()
        {
            bool urp = DawnkeepAssetPaths.TypeExists(UrpType);
            bool input = DawnkeepAssetPaths.TypeExists(InputType);
            bool cinemachine = DawnkeepAssetPaths.TypeExists(CinemachineType)
                || DawnkeepAssetPaths.TypeExists(CinemachineLegacyType);

            NamedBuildTarget[] targets =
            {
                NamedBuildTarget.Standalone,
                NamedBuildTarget.Android,
                NamedBuildTarget.iOS,
            };

            for (int t = 0; t < targets.Length; t++)
            {
                string current;
                try
                {
                    current = PlayerSettings.GetScriptingDefineSymbols(targets[t]);
                }
                catch (System.Exception)
                {
                    continue;
                }

                List<string> symbols = new List<string>(
                    current.Split(new char[] { ';' }, System.StringSplitOptions.RemoveEmptyEntries));

                bool changed = false;
                changed |= Apply(symbols, UrpDefine, urp);
                changed |= Apply(symbols, InputDefine, input);
                changed |= Apply(symbols, CinemachineDefine, cinemachine);

                if (changed)
                {
                    PlayerSettings.SetScriptingDefineSymbols(targets[t], string.Join(";", symbols.ToArray()));
                }
            }
        }

        private static bool Apply(List<string> symbols, string symbol, bool wanted)
        {
            bool has = symbols.Contains(symbol);
            if (wanted && !has)
            {
                symbols.Add(symbol);
                return true;
            }

            if (!wanted && has)
            {
                symbols.Remove(symbol);
                return true;
            }

            return false;
        }
    }
}
