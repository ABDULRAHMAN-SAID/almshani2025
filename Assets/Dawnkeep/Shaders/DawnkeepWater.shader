// ماء مملكة الرماد لخطّ URP: موجات تحليلية (بلا خامة)، انعكاس فرينل،
// وبريق شمس. شفافية تزداد عند النظر المائل كما يفعل الماء الحقيقي.
Shader "Dawnkeep/Water"
{
    Properties
    {
        _ShallowColor ("لون الضحل", Color) = (0.30, 0.52, 0.50, 0.62)
        _DeepColor ("لون العميق", Color) = (0.06, 0.16, 0.22, 0.94)
        _SpecColor ("لون البريق", Color) = (1, 0.97, 0.90, 1)
        _Smoothness ("نعومة السطح", Range(0.5, 1)) = 0.94
        _FresnelPower ("قوّة فرينل", Range(0.5, 8)) = 4.0
        _WaveAmplitude ("ارتفاع الموجة", Float) = 0.28
        _WaveLength ("طول الموجة", Float) = 14.0
        _WaveSpeed ("سرعة الموجة", Float) = 0.8
        _RippleScale ("تفصيل التموّج", Float) = 0.35
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
            "RenderPipeline" = "UniversalPipeline"
            "IgnoreProjector" = "True"
        }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Back

            HLSLPROGRAM
            #pragma vertex WaterVertex
            #pragma fragment WaterFragment
            #pragma target 3.0
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _SHADOWS_SOFT
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float4 _ShallowColor;
                float4 _DeepColor;
                float4 _SpecColor;
                float _Smoothness;
                float _FresnelPower;
                float _WaveAmplitude;
                float _WaveLength;
                float _WaveSpeed;
                float _RippleScale;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float2 uv : TEXCOORD1;
                float fogFactor : TEXCOORD2;
            };

            // ارتفاع السطح: موجتان متقاطعتان + تموّج دقيق
            float WaterHeight(float2 p, float t)
            {
                float k = 6.2831853 / max(_WaveLength, 0.001);
                float h = sin((p.x * k) + (t * _WaveSpeed * 1.1)) * 0.55;
                h += sin(((p.x * 0.6 + p.y * 0.8) * k * 0.73) - (t * _WaveSpeed * 0.83)) * 0.45;
                h += sin(((p.y * 0.9 - p.x * 0.4) * k * 2.7) + (t * _WaveSpeed * 1.9)) * 0.18 * _RippleScale;
                return h * _WaveAmplitude;
            }

            float3 WaterNormal(float2 p, float t)
            {
                float e = max(_WaveLength * 0.08, 0.05);
                float hL = WaterHeight(p - float2(e, 0), t);
                float hR = WaterHeight(p + float2(e, 0), t);
                float hD = WaterHeight(p - float2(0, e), t);
                float hU = WaterHeight(p + float2(0, e), t);
                return normalize(float3(hL - hR, 2.0 * e, hD - hU));
            }

            Varyings WaterVertex(Attributes input)
            {
                Varyings output = (Varyings)0;
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                positionWS.y += WaterHeight(positionWS.xz, _Time.y);

                output.positionWS = positionWS;
                output.positionCS = TransformWorldToHClip(positionWS);
                output.uv = input.uv;
                output.fogFactor = ComputeFogFactor(output.positionCS.z);
                return output;
            }

            half4 WaterFragment(Varyings input) : SV_Target
            {
                float3 normalWS = WaterNormal(input.positionWS.xz, _Time.y);
                float3 viewDir = normalize(GetWorldSpaceViewDir(input.positionWS));

                float fresnel = pow(saturate(1.0 - saturate(dot(normalWS, viewDir))), _FresnelPower);

                float4 shadowCoord = TransformWorldToShadowCoord(input.positionWS);
                Light mainLight = GetMainLight(shadowCoord);

                float3 halfDir = normalize(mainLight.direction + viewDir);
                float spec = pow(saturate(dot(normalWS, halfDir)), lerp(16.0, 512.0, _Smoothness));
                float ndl = saturate(dot(normalWS, mainLight.direction));

                half3 body = lerp(_DeepColor.rgb, _ShallowColor.rgb, saturate(0.35 + (fresnel * 0.65)));
                half3 color = body * ((0.42 * SampleSH(normalWS)) + (mainLight.color * (0.35 + (0.65 * ndl))));
                color += _SpecColor.rgb * spec * mainLight.color * mainLight.shadowAttenuation * 1.6;

                half alpha = lerp(_DeepColor.a, _ShallowColor.a, saturate(fresnel * 1.2));
                color = MixFog(color, input.fogFactor);
                return half4(color, alpha);
            }
            ENDHLSL
        }
    }

    FallBack "Universal Render Pipeline/Lit"
}
