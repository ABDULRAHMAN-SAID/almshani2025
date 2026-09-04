// شادر أهل المملكة لخطّ URP: تحريك في مُظلِّل الرؤوس بلا هيكل عظمي.
//
// لماذا لا هيكل عظمي؟ الهيكل يعني SkinnedMeshRenderer لكل جندي، ومئة جندي
// تعني مئة عملية تحريك على المعالج في كل إطار — وهذا لا يحتمله جوّال.
// هنا يحمل كل رأس **رقم مفصله** في TEXCOORD1.x، وتُحسب الوضعية **تحليلياً**
// من الزمن في بطاقة الرسم: دورة المشي جيبيّة أصلاً فتُكتب بدالّة. الكلفة على
// المعالج صفر مهما كثر الجند.
//
// لكل نسخة طورٌ خاصّ (_AnimPhase) فلا يمشي الجيش كلّه بخطوة واحدة، ووزن مشي
// (_AnimWalk) يمزج بين الوقوف والمشي بلا انتقال مفاجئ.
//
// اللون كلّه من ألوان الرؤوس: لا خامة صورية. على بُعد كاميرا الاستراتيجية
// تُقرأ الصورة الظلّية والإضاءة لا نقش القماش.
Shader "Dawnkeep/Character"
{
    Properties
    {
        _BaseColor ("لون الراية (يضرب في لون الرأس)", Color) = (1, 1, 1, 1)
        _Smoothness ("النعومة", Range(0, 1)) = 0.18
        _Metallic ("المعدنية", Range(0, 1)) = 0.10

        _AnimPhase ("طور الحركة", Float) = 0
        _AnimWalk ("وزن المشي (0 وقوف، 1 مشي)", Range(0, 1)) = 0
        _AnimIdleRate ("سرعة نبض الوقوف", Float) = 1.35
        _AnimWalkRate ("سرعة دورة المشي", Float) = 5.6
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
            "RenderPipeline" = "UniversalPipeline"
        }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

        CBUFFER_START(UnityPerMaterial)
            float4 _BaseColor;
            float _Smoothness;
            float _Metallic;
            float _AnimPhase;
            float _AnimWalk;
            float _AnimIdleRate;
            float _AnimWalkRate;
        CBUFFER_END

        // محاور المفاصل بوحدات البناء (ارتفاع الشخصية 1.0). واحدة لكل الأصناف
        // لأنّها تُبنى بنفس النِّسَب، فيكفي جدولٌ ثابت هنا.
        static const float3 DK_PIVOT[12] = {
            float3( 0.000, 0.000, 0.000),   // 0  الجذر
            float3( 0.000, 0.520, 0.000),   // 1  الصدر
            float3( 0.000, 0.830, 0.000),   // 2  الرأس
            float3(-0.112, 0.780, 0.000),   // 3  العضد الأيسر
            float3(-0.123, 0.640, 0.100),   // 4  الساعد الأيسر
            float3( 0.112, 0.780, 0.000),   // 5  العضد الأيمن
            float3( 0.114, 0.640, 0.045),   // 6  الساعد الأيمن
            float3(-0.055, 0.500, 0.000),   // 7  الفخذ الأيسر
            float3(-0.055, 0.265, 0.012),   // 8  الساق اليسرى
            float3( 0.055, 0.500, 0.000),   // 9  الفخذ الأيمن
            float3( 0.055, 0.265, 0.012),   // 10 الساق اليمنى
            float3( 0.000, 0.830,-0.058)    // 11 العباءة
        };

        // الأب لكل مفصل: الساعد يتبع العضد، والعضد يتبع الصدر. -1 = لا أب.
        static const int DK_PARENT[12] = { -1, -1, 1, 1, 3, 1, 5, -1, 7, -1, 9, 1 };

        float3 DawnkeepLimbEuler(int limb, float t, float walk)
        {
            float sn = sin(t);
            // الركبة تنثني إلى الخلف فقط: نصف موجة موجبة لا موجة كاملة
            float kneeL = max(0.0, sin(t + 2.30));
            float kneeR = max(0.0, sin(t + 2.30 + 3.14159265));
            float breathe = (sin(_Time.y * 1.25) * 0.5) + 0.5;

            if (limb == 1)  return float3((0.045 * walk) + (0.012 * breathe), 0.11 * sn * walk, 0.0);
            if (limb == 2)  return float3(-0.02 * walk, -0.07 * sn * walk, 0.0);
            if (limb == 3)  return float3(-0.62 * sn * walk, 0.0,  0.06 * walk);
            if (limb == 4)  return float3((-0.34 * max(0.0, -sn) * walk) - (0.18 * walk), 0.0, 0.0);
            if (limb == 5)  return float3( 0.62 * sn * walk, 0.0, -0.06 * walk);
            if (limb == 6)  return float3((-0.34 * max(0.0,  sn) * walk) - (0.18 * walk), 0.0, 0.0);
            if (limb == 7)  return float3( 0.78 * sn * walk, 0.0, 0.0);
            if (limb == 8)  return float3(-0.95 * kneeL * walk, 0.0, 0.0);
            if (limb == 9)  return float3(-0.78 * sn * walk, 0.0, 0.0);
            if (limb == 10) return float3(-0.95 * kneeR * walk, 0.0, 0.0);
            if (limb == 11) return float3((0.22 * walk) + (0.05 * sn * walk), 0.0, 0.0);
            return float3(0.0, 0.0, 0.0);
        }

        float3 DawnkeepRotEuler(float3 p, float3 e)
        {
            float sx = sin(e.x); float cx = cos(e.x);
            p = float3(p.x, (p.y * cx) - (p.z * sx), (p.y * sx) + (p.z * cx));
            float sy = sin(e.y); float cy = cos(e.y);
            p = float3((p.x * cy) + (p.z * sy), p.y, (-p.x * sy) + (p.z * cy));
            float sz = sin(e.z); float cz = cos(e.z);
            return float3((p.x * cz) - (p.y * sz), (p.x * sz) + (p.y * cz), p.z);
        }

        // السلسلة عمقها ثلاثة: ساعد ← عضد ← صدر. أعمق من ذلك لا يوجد في الهيكل.
        float3 DawnkeepPose(float3 pos, float limbF)
        {
            int limb = (int)(limbF + 0.5);
            float walk = saturate(_AnimWalk);
            float t = (_Time.y * lerp(_AnimIdleRate, _AnimWalkRate, walk)) + _AnimPhase;

            int cur = limb;
            [unroll]
            for (int step = 0; step < 3; step++)
            {
                if (cur >= 0)
                {
                    float3 pv = DK_PIVOT[cur];
                    pos = DawnkeepRotEuler(pos - pv, DawnkeepLimbEuler(cur, t, walk)) + pv;
                    cur = DK_PARENT[cur];
                }
            }

            // ارتداد الجسم: خطوتان في الدورة الواحدة. وعند الوقوف ميل بطيء.
            pos.y += walk * 0.022 * abs(cos(t));
            pos = DawnkeepRotEuler(pos, float3(0.0, (1.0 - walk) * 0.035 * sin((_Time.y * 0.42) + _AnimPhase), 0.0));
            return pos;
        }

        struct Attributes
        {
            float4 positionOS : POSITION;
            float3 normalOS : NORMAL;
            float2 uv : TEXCOORD0;
            float2 limbUv : TEXCOORD1;
            float4 color : COLOR;
            UNITY_VERTEX_INPUT_INSTANCE_ID
        };

        // المُسوّي يُدار بنفس الوضعية: يُشتقّ من فرق موضعين مُوضَّعين، فلا يبقى
        // مُسوّي الذراع مشيراً إلى حيث كان قبل الدوران فتنقلب الإضاءة.
        void DawnkeepPoseVertex(Attributes input, out float3 positionOS, out float3 normalOS)
        {
            float limb = input.limbUv.x;
            positionOS = DawnkeepPose(input.positionOS.xyz, limb);
            float3 tip = DawnkeepPose(input.positionOS.xyz + (input.normalOS * 0.02), limb);
            normalOS = normalize(tip - positionOS);
        }
        ENDHLSL

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            Cull Off
            ZWrite On

            HLSLPROGRAM
            #pragma vertex ForwardVertex
            #pragma fragment ForwardFragment
            #pragma target 3.0
            #pragma multi_compile_instancing
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _SHADOWS_SOFT
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 normalWS : TEXCOORD1;
                float3 positionWS : TEXCOORD2;
                float fogFactor : TEXCOORD3;
                half4 vertexColor : TEXCOORD4;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            Varyings ForwardVertex(Attributes input)
            {
                Varyings output = (Varyings)0;
                UNITY_SETUP_INSTANCE_ID(input);
                UNITY_TRANSFER_INSTANCE_ID(input, output);

                float3 posOS;
                float3 nrmOS;
                DawnkeepPoseVertex(input, posOS, nrmOS);

                output.positionWS = TransformObjectToWorld(posOS);
                output.positionCS = TransformWorldToHClip(output.positionWS);
                output.normalWS = TransformObjectToWorldNormal(nrmOS);
                output.fogFactor = ComputeFogFactor(output.positionCS.z);
                output.vertexColor = input.color;
                return output;
            }

            half4 ForwardFragment(Varyings input) : SV_Target
            {
                UNITY_SETUP_INSTANCE_ID(input);

                half3 albedo = input.vertexColor.rgb * _BaseColor.rgb;

                InputData inputData = (InputData)0;
                inputData.positionWS = input.positionWS;
                inputData.normalWS = normalize(input.normalWS);
                inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(input.positionWS);
                inputData.shadowCoord = TransformWorldToShadowCoord(input.positionWS);
                inputData.fogCoord = input.fogFactor;
                inputData.bakedGI = SampleSH(inputData.normalWS);

                SurfaceData surfaceData = (SurfaceData)0;
                surfaceData.albedo = albedo;
                surfaceData.metallic = _Metallic;
                surfaceData.smoothness = _Smoothness;
                surfaceData.occlusion = 1.0;
                surfaceData.alpha = 1.0;

                half4 color = UniversalFragmentPBR(inputData, surfaceData);
                color.rgb = MixFog(color.rgb, inputData.fogCoord);
                return color;
            }
            ENDHLSL
        }

        // الظلّ يُصيَّر بنفس الوضعية: بدونه ينفصل ظلّ الجندي عن حركته
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }

            ZWrite On
            ZTest LEqual
            Cull Off

            HLSLPROGRAM
            #pragma vertex ShadowVertex
            #pragma fragment ShadowFragment
            #pragma target 3.0
            #pragma multi_compile_instancing
            #pragma multi_compile_vertex _ _CASTING_PUNCTUAL_LIGHT_SHADOW

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            float3 _LightDirection;
            float3 _LightPosition;

            struct ShadowVaryings
            {
                float4 positionCS : SV_POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            ShadowVaryings ShadowVertex(Attributes input)
            {
                ShadowVaryings output = (ShadowVaryings)0;
                UNITY_SETUP_INSTANCE_ID(input);

                float3 posOS;
                float3 nrmOS;
                DawnkeepPoseVertex(input, posOS, nrmOS);

                float3 positionWS = TransformObjectToWorld(posOS);
                float3 normalWS = TransformObjectToWorldNormal(nrmOS);

                #if _CASTING_PUNCTUAL_LIGHT_SHADOW
                    float3 lightDirectionWS = normalize(_LightPosition - positionWS);
                #else
                    float3 lightDirectionWS = _LightDirection;
                #endif

                output.positionCS = TransformWorldToHClip(
                    ApplyShadowBias(positionWS, normalWS, lightDirectionWS));

                #if UNITY_REVERSED_Z
                    output.positionCS.z = min(output.positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #else
                    output.positionCS.z = max(output.positionCS.z, UNITY_NEAR_CLIP_VALUE);
                #endif

                return output;
            }

            half4 ShadowFragment(ShadowVaryings input) : SV_Target
            {
                return 0;
            }
            ENDHLSL
        }

        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }

            ZWrite On
            ColorMask 0
            Cull Off

            HLSLPROGRAM
            #pragma vertex DepthVertex
            #pragma fragment DepthFragment
            #pragma target 3.0
            #pragma multi_compile_instancing

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct DepthVaryings
            {
                float4 positionCS : SV_POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            DepthVaryings DepthVertex(Attributes input)
            {
                DepthVaryings output = (DepthVaryings)0;
                UNITY_SETUP_INSTANCE_ID(input);

                float3 posOS;
                float3 nrmOS;
                DawnkeepPoseVertex(input, posOS, nrmOS);
                output.positionCS = TransformWorldToHClip(TransformObjectToWorld(posOS));
                return output;
            }

            half4 DepthFragment(DepthVaryings input) : SV_Target
            {
                return 0;
            }
            ENDHLSL
        }
    }

    FallBack "Universal Render Pipeline/Lit"
}
