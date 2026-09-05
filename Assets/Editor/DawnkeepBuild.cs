using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// بناء اللعبة إلى شيءٍ **يُلعَب** (§30 و§41).
    ///
    /// كل ما بُني حتى الآن يُجرَّب بضغط Play في المحرّر، وذاك لا يُرسَل إلى
    /// أحد. وهذه القوائم تُخرج بناءً حقيقيّاً: **WebGL** يُرفَع فيصير رابطاً،
    /// و**Android** ليُجرَّب على الجهاز الذي صُمِّمت له اللعبة أصلاً.
    ///
    /// و**تُنفَّذ من سطر الأوامر أيضاً** (`-executeMethod`) — وهو ما يجعل
    /// بناءً آليّاً ممكناً بلا فتح المحرّر بيد.
    ///
    /// ولا تُبنى إلّا بعد «بناء كل شيء»: البناء يحزم **المشاهد المسجَّلة**،
    /// ومشهدٌ لم يُبنَ محتواه يخرج فارغاً — ولذلك يقف الباني ويقول.
    /// </summary>
    public static class DawnkeepBuild
    {
        /// <summary>مجلّد المخرجات. خارج `Assets/` فلا يستوردها المحرّر.</summary>
        public const string OutputFolder = "Build";

        [MenuItem("مملكة الرماد/بناء اللعبة/WebGL (رابط يُلعب في المتصفّح)", false, 60)]
        public static void BuildWebGL()
        {
            Run(BuildTarget.WebGL, BuildTargetGroup.WebGL, OutputFolder + "/WebGL");
        }

        [MenuItem("مملكة الرماد/بناء اللعبة/Android (APK للجوّال)", false, 61)]
        public static void BuildAndroid()
        {
            Run(BuildTarget.Android, BuildTargetGroup.Android,
                OutputFolder + "/Android/Dawnkeep.apk");
        }

        [MenuItem("مملكة الرماد/بناء اللعبة/Windows", false, 62)]
        public static void BuildWindows()
        {
            Run(BuildTarget.StandaloneWindows64, BuildTargetGroup.Standalone,
                OutputFolder + "/Windows/Dawnkeep.exe");
        }

        // ── التنفيذ ────────────────────────────────────────────────────────

        private static void Run(BuildTarget target, BuildTargetGroup group, string path)
        {
            string[] scenes = Scenes();
            if (scenes.Length == 0)
            {
                Fail("لا مشهد مسجَّل في إعدادات البناء. نفّذ أوّلاً:\n"
                    + "مملكة الرماد ▸ بناء كل شيء (2 ← 21)");
                return;
            }

            // مشهد القائمة أوّلاً (§41: «من Main Menu حتى Result»). لو لم يكن
            // أوّلاً لبدأ البناءُ في مشهد المعركة بلا حملةٍ ولا تجهيز.
            if (!scenes[0].EndsWith("Dawnkeep_Menu.unity"))
            {
                Fail("مشهد القائمة ليس أوّل مشهدٍ في إعدادات البناء (§41).\n"
                    + "نفّذ: مملكة الرماد ▸ 17) القائمة الرئيسة ومشهد الإقلاع");
                return;
            }

            Prepare(target, group);

            string full = Path.GetFullPath(path);
            Directory.CreateDirectory(target == BuildTarget.WebGL
                ? full : Path.GetDirectoryName(full));

            BuildPlayerOptions options = new BuildPlayerOptions();
            options.scenes = scenes;
            options.locationPathName = full;
            options.target = target;
            options.options = BuildOptions.None;

            Debug.Log("مملكة الرماد: يبني " + target + " من " + scenes.Length
                + " مشهد إلى " + full);

            BuildReport report = BuildPipeline.BuildPlayer(options);
            BuildSummary summary = report.summary;

            if (summary.result == BuildResult.Succeeded)
            {
                Debug.Log("مملكة الرماد: تمّ البناء — " + full + "\n"
                    + (summary.totalSize / (1024 * 1024)) + " ميغابايت في "
                    + summary.totalTime.TotalSeconds.ToString("0") + " ثانية.");
            }
            else
            {
                Fail("فشل البناء: " + summary.result + " — "
                    + summary.totalErrors + " خطأ. اقرأ Console.");
            }
        }

        /// <summary>
        /// المشاهد المفعَّلة من إعدادات البناء، بترتيبها. **من الإعدادات لا
        /// من مسحٍ للمجلّد**: الترتيب هو ما يقرّر أيّ مشهدٍ يبدأ.
        /// </summary>
        private static string[] Scenes()
        {
            System.Collections.Generic.List<string> paths =
                new System.Collections.Generic.List<string>(4);

            EditorBuildSettingsScene[] all = EditorBuildSettings.scenes;
            for (int i = 0; i < all.Length; i++)
            {
                if (all[i].enabled && File.Exists(all[i].path))
                {
                    paths.Add(all[i].path);
                }
            }

            return paths.ToArray();
        }

        /// <summary>
        /// إعداداتُ ما قبل البناء. **الاتجاه أفقيّ** (§1) و**اللمس** مفعَّل،
        /// وWebGL بضغط Brotli — ثلاثةٌ لو نُسيت لخرج بناءٌ لا يُلعَب على
        /// الجوّال أو يُحمَّل في دقائق.
        /// </summary>
        private static void Prepare(BuildTarget target, BuildTargetGroup group)
        {
            PlayerSettings.companyName = "Dawnkeep";
            PlayerSettings.productName = "مملكة الرماد";

            // أفقيٌّ فقط (§1: Landscape)
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;

            if (target == BuildTarget.WebGL)
            {
                // Brotli أصغر من gzip بنحو الخُمس، وهو ما يُنزَّل عبر الشبكة
                PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
                PlayerSettings.WebGL.dataCaching = true;

                // بلا استثناءات: أصغر وأسرع. والتشخيص في المحرّر لا في البناء
                PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
            }

            if (target == BuildTarget.Android)
            {
                PlayerSettings.Android.targetArchitectures =
                    AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;

                // IL2CPP لازمٌ لـARM64، وARM64 لازمٌ لمتجر Play
                PlayerSettings.SetScriptingBackend(
                    NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            }

            EditorUserBuildSettings.SwitchActiveBuildTarget(group, target);
        }

        private static void Fail(string message)
        {
            Debug.LogError("مملكة الرماد: " + message);

            // في سطر الأوامر: خروجٌ بخطأ ليقف البناء الآليّ ولا يُظنّ ناجحاً
            if (Application.isBatchMode)
            {
                EditorApplication.Exit(1);
            }
        }
    }
}
