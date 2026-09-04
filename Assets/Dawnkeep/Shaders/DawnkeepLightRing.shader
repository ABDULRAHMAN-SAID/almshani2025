// دائرة أمان المنارة: قرص واحد كبير يقصّه المُظلِّل عند نصف القطر.
//
// لماذا لا تُكبَّر الشبكة بدل تمرير نصف القطر: تكبير الشبكة يمطّ حافّتها
// الناعمة معها، فتصير حافّة المنارة الممتلئة أعرض من حافّة الفارغة — وهو
// خطأ يقرأه اللاعب حدوداً غير دقيقة.
Shader "Dawnkeep/LightRing"
{
    Properties
    {
        _BaseColor ("لون النور", Color) = (1, 0.796, 0.451, 1)
        _Radius ("نصف القطر بالمتر", Float) = 26
        _Softness ("سماكة التلاشي كنسبة", Range(0.02, 0.5)) = 0.16
        _Sharp ("حدّة الحافّة: 1 تخطيط، 0 قتال", Range(0, 1)) = 0
        _Fill ("شدّة الملء داخل الدائرة", Range(0, 1)) = 0.10
        _Rim ("شدّة الحلقة عند الحافّة", Range(0, 3)) = 1.35
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
            "RenderPipeline" = "UniversalPipeline"
        }

        Pass
        {
            Name "LightRing"
            Tags { "LightMode" = "UniversalForward" }

            // جمعي بلا كتابة عمق: النور يُضاف إلى المشهد ولا يحجب ما تحته
            Blend One One
            ZWrite Off
            Cull Back

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 planeOS : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float _Radius;
                float _Softness;
                float _Sharp;
                float _Fill;
                float _Rim;
            CBUFFER_END

            Varyings vert (Attributes input)
            {
                Varyings o = (Varyings)0;
                UNITY_SETUP_INSTANCE_ID(input);
                UNITY_TRANSFER_INSTANCE_ID(input, o);

                o.positionCS = TransformObjectToHClip(input.positionOS.xyz);

                // المسافة تُقاس في فضاء الكائن: مركزه هو مركز المنارة، فلا
                // نحتاج تمرير موضعها في العالم ولا مطابقته عند كل تحريك.
                o.planeOS = input.positionOS.xz;
                return o;
            }

            half4 frag (Varyings input) : SV_Target
            {
                UNITY_SETUP_INSTANCE_ID(input);

                float radius = max(0.01, _Radius);
                float d = length(input.planeOS) / radius;

                // التخطيط يشدّ التلاشي إلى الثلث فتبدو الحافّة خطّاً، والقتال
                // يفرده كاملاً فتذوب — وهذا نصّ §11 لا اجتهاد.
                float soft = _Softness * lerp(1.0, 0.28, _Sharp);

                float inside = 1.0 - smoothstep(1.0 - soft, 1.0, d);
                float rim = exp(-pow((d - (1.0 - soft * 0.5)) / max(0.004, soft * 0.62), 2.0));

                // نبضة بطيئة تحيي الدائرة بلا أن تسحب العين عن المعركة
                float pulse = 0.90 + (0.10 * sin(_Time.y * 1.7));

                float a = (inside * _Fill) + (rim * _Rim * lerp(0.55, 1.0, _Sharp));
                a *= pulse;

                return half4(_BaseColor.rgb * a, a);
            }
            ENDHLSL
        }
    }

    Fallback Off
}
