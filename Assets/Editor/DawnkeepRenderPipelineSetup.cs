using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

#if DAWNKEEP_URP
using UnityEngine.Rendering.Universal;
#endif

namespace Dawnkeep.EditorTools
{
    /// <summary>
    /// الخطوة الثانية: بناء خطّ العرض URP وضبطه لمظهر ثلاثي الأبعاد قويّ —
    /// مدى HDR، ظلال متتالية ناعمة، ومعالجة لاحقة (ACES + توهّج + تدرّج لوني).
    /// كل شيء يُولَّد بسكربت محرّر: لا ملفّ .asset مكتوب باليد.
    /// </summary>
    public static class DawnkeepRenderPipelineSetup
    {
        public const string PipelineAssetPath = DawnkeepAssetPaths.Settings + "/Dawnkeep_URP.asset";
        public const string RendererDataPath = DawnkeepAssetPaths.Settings + "/Dawnkeep_Renderer.asset";
        public const string VolumeProfilePath = DawnkeepAssetPaths.Settings + "/Dawnkeep_PostProcess.asset";

        [MenuItem("مملكة الرماد/2) بناء خطّ العرض URP", false, 2)]
        public static void Setup()
        {
#if DAWNKEEP_URP
            DawnkeepAssetPaths.EnsureFolders();
            RenderPipelineAsset pipeline = EnsurePipeline();
            EnsureVolumeProfile();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            if (pipeline != null)
            {
                Debug.Log("مملكة الرماد: خطّ العرض جاهز — " + PipelineAssetPath +
                    "\nإن بدت الخامات وردية، اختر Edit ▸ Rendering ▸ Materials ▸ Convert All Built-in Materials to URP.");
            }
#else
            Debug.LogWarning("مملكة الرماد: حزمة URP غير مثبّتة بعد. نفّذ الخطوة 1 أولاً وانتظر إعادة التجميع.");
#endif
        }

        /// <summary>يبني أصل خطّ العرض ويجعله الافتراضي للمشروع. يعيد null إن كانت URP غائبة.</summary>
        public static RenderPipelineAsset EnsurePipeline()
        {
#if DAWNKEEP_URP
            DawnkeepAssetPaths.EnsureFolders();

            UniversalRendererData rendererData =
                AssetDatabase.LoadAssetAtPath<UniversalRendererData>(RendererDataPath);

            if (rendererData == null)
            {
                rendererData = ScriptableObject.CreateInstance<UniversalRendererData>();
                rendererData.name = "Dawnkeep_Renderer";
                AssetDatabase.CreateAsset(rendererData, RendererDataPath);
            }

            UniversalRenderPipelineAsset pipeline =
                AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);

            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(rendererData);
                pipeline.name = "Dawnkeep_URP";
                AssetDatabase.CreateAsset(pipeline, PipelineAssetPath);
            }

            // مدى واسع للضوء: بدونه تنطفئ الشمس على الحوافّ المعدنية ويضيع التوهّج
            pipeline.supportsHDR = true;
            pipeline.msaaSampleCount = 4;
            pipeline.renderScale = 1f;

            // ظلال بعيدة متتالية: الجبال تُظلّل الوادي لا الأشجار القريبة وحدها
            pipeline.shadowDistance = 420f;
            pipeline.shadowCascadeCount = 4;
            pipeline.cascade2Split = 0.25f;
            pipeline.cascade3Split = new Vector2(0.1f, 0.3f);
            pipeline.cascade4Split = new Vector3(0.06f, 0.16f, 0.38f);

            pipeline.supportsCameraDepthTexture = true;
            pipeline.supportsCameraOpaqueTexture = true;
            pipeline.useSRPBatcher = true;
            pipeline.colorGradingMode = ColorGradingMode.HighDynamicRange;
            pipeline.colorGradingLutSize = 32;

            EditorUtility.SetDirty(rendererData);
            EditorUtility.SetDirty(pipeline);

            GraphicsSettings.defaultRenderPipeline = pipeline;
            QualitySettings.renderPipeline = pipeline;
            return pipeline;
#else
            return null;
#endif
        }

        /// <summary>ملفّ المعالجة اللاحقة: منه يأتي الفرق الأكبر في «الإحساس» بالصورة.</summary>
        public static ScriptableObject EnsureVolumeProfile()
        {
#if DAWNKEEP_URP
            // المجلّد يُحدَّث في كل مرّة لا يُتخطّى إن وُجد — وإلا بقيت المشاريع
            // القائمة على تدرّج لوني قديم مهما عدّلنا الأرقام هنا.
            VolumeProfile profile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(VolumeProfilePath);
            if (profile == null)
            {
                profile = ScriptableObject.CreateInstance<VolumeProfile>();
                profile.name = "Dawnkeep_PostProcess";
                AssetDatabase.CreateAsset(profile, VolumeProfilePath);
            }
            else
            {
                for (int i = profile.components.Count - 1; i >= 0; i--)
                {
                    VolumeComponent stale = profile.components[i];
                    profile.components.RemoveAt(i);
                    Object.DestroyImmediate(stale, true);
                }
            }

            Tonemapping tonemapping = profile.Add<Tonemapping>(true);
            tonemapping.mode.overrideState = true;
            tonemapping.mode.value = TonemappingMode.ACES;

            // الخامات المرسومة رمادية بطبعها، والتعيين النغمي يغسل السطوع إلى الأبيض.
            // رفع التباين والإشباع هنا هو ما يعيد للمشهد لونه وهويّته.
            ColorAdjustments color = profile.Add<ColorAdjustments>(true);
            color.postExposure.overrideState = true;
            color.postExposure.value = 0.18f;
            color.contrast.overrideState = true;
            color.contrast.value = 20f;
            color.saturation.overrideState = true;
            color.saturation.value = 28f;

            WhiteBalance balance = profile.Add<WhiteBalance>(true);
            balance.temperature.overrideState = true;
            balance.temperature.value = 15f;
            balance.tint.overrideState = true;
            balance.tint.value = -5f;

            Bloom bloom = profile.Add<Bloom>(true);
            bloom.threshold.overrideState = true;
            bloom.threshold.value = 1.15f;
            bloom.intensity.overrideState = true;
            bloom.intensity.value = 0.42f;
            bloom.scatter.overrideState = true;
            bloom.scatter.value = 0.66f;

            Vignette vignette = profile.Add<Vignette>(true);
            vignette.intensity.overrideState = true;
            vignette.intensity.value = 0.26f;
            vignette.smoothness.overrideState = true;
            vignette.smoothness.value = 0.45f;

            // فصل دافئ/بارد: الظلّ يأخذ لون السماء والإضاءة تأخذ لون الشمس.
            // بدون هذا الفصل تصير الظلال رمادية ميّتة مهما جوّدنا الخامات.
            ShadowsMidtonesHighlights smh = profile.Add<ShadowsMidtonesHighlights>(true);
            smh.shadows.overrideState = true;
            smh.shadows.value = new Vector4(0.855f, 0.910f, 1.115f, 0f);
            smh.highlights.overrideState = true;
            smh.highlights.value = new Vector4(1.085f, 1.020f, 0.900f, 0f);

            // كل مكوّن يُحفظ كأصل فرعي داخل الملفّ وإلا ضاع عند إعادة التحميل
            for (int i = 0; i < profile.components.Count; i++)
            {
                VolumeComponent component = profile.components[i];
                component.hideFlags = HideFlags.HideInHierarchy;
                AssetDatabase.AddObjectToAsset(component, profile);
            }

            EditorUtility.SetDirty(profile);
            return profile;
#else
            return null;
#endif
        }

        /// <summary>يضبط الكاميرا للمعالجة اللاحقة ومقاومة التسنّن.</summary>
        public static void ConfigureCamera(Camera camera)
        {
#if DAWNKEEP_URP
            if (camera == null)
            {
                return;
            }

            UniversalAdditionalCameraData data = camera.GetUniversalAdditionalCameraData();
            if (data == null)
            {
                return;
            }

            data.renderPostProcessing = true;
            data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            data.antialiasingQuality = AntialiasingQuality.High;
            data.renderShadows = true;
            data.requiresDepthOption = CameraOverrideOption.On;
#endif
        }

        /// <summary>يضيف مجلّد معالجة لاحقة عامّاً إلى المشهد.</summary>
        public static GameObject CreateGlobalVolume()
        {
#if DAWNKEEP_URP
            ScriptableObject profileAsset = EnsureVolumeProfile();
            VolumeProfile profile = profileAsset as VolumeProfile;
            if (profile == null)
            {
                return null;
            }

            GameObject go = new GameObject("PostProcess Volume");
            Volume volume = go.AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 0f;
            volume.sharedProfile = profile;
            return go;
#else
            return null;
#endif
        }
    }
}
