// ماء مملكة الرماد لخطّ URP.
// العمق مخزّن في كل رأس (TEXCOORD1.x) لا مقروء من خريطة عمق الكاميرا:
// أسرع، ويعمل على كل جهاز، ويعطي تدرّج لون وزبد شاطئ دقيقين.
Shader "Dawnkeep/Water"
{
    Properties
    {
        _ShallowColor ("لون الضحل", Color) = (0.36, 0.60, 0.58, 1)
        _DeepColor ("لون العميق", Color) = (0.045, 0.145, 0.185, 1)
        _FoamColor ("لون الزبد", Color) = (0.92, 0.96, 0.97, 1)
        _SkyColor ("لون انعكاس السماء", Color) = (0.58, 0.72, 0.88, 1)
        _DepthRange ("مدى تدرّج العمق (متر)", Float) = 5.0
        _FoamDepth ("عمق شريط الزبد (متر)", Float) = 0.85
        _FresnelPower ("قوّة فرينل", Range(1, 8)) = 4.0
        _WaveAmplitude ("ارتفاع الموجة", Float) = 0.55
        _WaveSpeed ("سرعة الموجة", Float) = 1.0
        _Glitter ("بريق الشمس", Float) = 1.9
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
            ZWrite On
            Cull Off

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
                float4 _FoamColor;
                float4 _SkyColor;
                float _DepthRange;
                float _FoamDepth;
                float _FresnelPower;
                float _WaveAmplitude;
                float _WaveSpeed;
                float _Glitter;
            CBUFFER_END

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
                float2 depthUv : TEXCOORD1;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float depth : TEXCOORD1;
                float fogFactor : TEXCOORD2;
            };

            // موجة مركّبة من ثلاثة ترددات فلا تبدو الحركة آلية
            float DawnkeepWave(float2 p, float t)
            {
                return (sin((p.x * 0.085) + (t * 0.9)) * 0.55)
                     + (sin((((p.x * 0.6) + (p.y * 0.8)) * 0.062) - (t * 0.71)) * 0.45)
                     + (sin((((p.y * 0.9) - (p.x * 0.4)) * 0.23) + (t * 1.6)) * 0.14);
            }

            float3 DawnkeepWaveNormal(float2 p, float t, float amp)
            {
                float e = 0.55;
                float hL = DawnkeepWave(p - float2(e, 0), t);
                float hR = DawnkeepWave(p + float2(e, 0), t);
                float hD = DawnkeepWave(p - float2(0, e), t);
                float hU = DawnkeepWave(p + float2(0, e), t);
                return normalize(float3((hL - hR) * amp, 2.0 * e, (hD - hU) * amp));
            }

            Varyings WaterVertex(Attributes input)
            {
                Varyings output = (Varyings)0;
                output.depth = input.depthUv.x;

                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float amp = clamp(output.depth * 0.55, 0.05, 0.42) * _WaveAmplitude;
                positionWS.y += DawnkeepWave(positionWS.xz, _Time.y * _WaveSpeed) * amp;

                output.positionWS = positionWS;
                output.positionCS = TransformWorldToHClip(positionWS);
                output.fogFactor = ComputeFogFactor(output.positionCS.z);
                return output;
            }

            half4 WaterFragment(Varyings input) : SV_Target
            {
                float t = _Time.y * _WaveSpeed;
                float amp = clamp(input.depth * 0.55, 0.05, 0.42);

                float3 n = DawnkeepWaveNormal(input.positionWS.xz, t, amp * 2.2);
                float3 n2 = DawnkeepWaveNormal((input.positionWS.xz * 3.7) + float2(31, 17), t * 1.7, amp * 0.8);
                n = normalize(n + ((n2 - float3(0, 1, 0)) * 0.55));

                float3 view = normalize(GetWorldSpaceViewDir(input.positionWS));
                float fresnel = pow(saturate(1.0 - saturate(dot(n, view))), _FresnelPower);

                float dt = saturate(input.depth / max(_DepthRange, 0.01));
                dt = dt * dt * (3.0 - (2.0 * dt));

                float4 shadowCoord = TransformWorldToShadowCoord(input.positionWS);
                Light mainLight = GetMainLight(shadowCoord);
                float ndl = saturate(dot(n, mainLight.direction));

                half3 body = lerp(_ShallowColor.rgb, _DeepColor.rgb, dt);
                body *= 0.55 + (0.55 * ndl);

                half3 color = lerp(body, _SkyColor.rgb, fresnel * 0.72);

                float3 h = normalize(mainLight.direction + view);
                color += mainLight.color * pow(saturate(dot(n, h)), 300.0) * _Glitter * mainLight.shadowAttenuation;

                // زبد الشاطئ: شريط يتموّج مع الموج على الحافّة الضحلة
                float edge = 1.0 - smoothstep(0.0, max(_FoamDepth, 0.01), input.depth);
                float ripple = 0.55 + (0.45 * sin((input.positionWS.x * 0.55) + (input.positionWS.z * 0.42)
                                     + (t * 1.5) + (DawnkeepWave(input.positionWS.xz, t) * 3.0)));
                float foam = saturate(edge * ripple * 1.05);
                color = lerp(color, _FoamColor.rgb, foam * 0.72);

                float alpha = lerp(0.42, 0.97, dt);
                alpha = max(alpha, foam * 0.9);

                color = MixFog(color, input.fogFactor);
                return half4(color, alpha);
            }
            ENDHLSL
        }
    }

    FallBack "Universal Render Pipeline/Lit"
}
