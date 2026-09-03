using UnityEngine;

namespace Dawnkeep.Rendering
{
    /// <summary>وصفة سطح إجرائي: منها تُخبز خريطة اللون وخريطة النتوء لخامة أرض واحدة.</summary>
    [System.Serializable]
    public sealed class SurfaceRecipe
    {
        public string Name = "surface";

        [Tooltip("تردّد الطبقة الأولى — أصغر يعني بقعاً أكبر.")]
        public int BaseFrequency = 6;

        [Tooltip("عدد الطبقات المضروبة التردّد.")]
        public int Octaves = 5;

        public uint Seed = 1u;

        [Tooltip("تشويه المجال: يلوي البقع فتفقد انتظام الشبكة.")]
        public float Warp;

        [Tooltip("طيّ القيمة حول المنتصف: يعطي شقوقاً وحوافّ حادّة كالصخر.")]
        public bool Ridged;

        [Tooltip("شدّ أفقي: يمطّ البنية في اتجاه واحد فتظهر الطبقات الصخرية.")]
        public float Stretch = 1f;

        [Range(0.1f, 4f)]
        public float Contrast = 1f;

        public Color Low = new Color(0.30f, 0.32f, 0.26f);
        public Color High = new Color(0.55f, 0.58f, 0.45f);

        [Tooltip("لون ثالث يُرشّ ببقع كبيرة: طحلب على الصخر، تربة عارية في العشب.")]
        public Color Patch = new Color(0.40f, 0.42f, 0.32f);

        [Range(0f, 1f)]
        public float PatchAmount = 0.25f;

        public int PatchFrequency = 3;

        [Tooltip("قوّة خريطة النتوء.")]
        public float NormalStrength = 1.6f;

        [Tooltip("حبيبات دقيقة تُضاف فوق كل شيء فلا يبدو السطح بلاستيكياً.")]
        [Range(0f, 1f)]
        public float Grain = 0.35f;

        public int GrainFrequency = 64;
    }
}
