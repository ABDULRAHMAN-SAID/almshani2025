using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>
    /// خامات المباني المخبوزة سلفاً، موصولة مرّة في المشهد.
    ///
    /// **لا `Resources.Load`**: مجلّد `Resources` يُحشر كلّه في البناء ولو لم
    /// يُستعمل منه شيء، ولا يخبرك المحرّر إن ضاع أصل منه. المراجع هنا مسلسلة
    /// في المشهد، فيكشفها المفتش ويتتبّعها Unity.
    /// </summary>
    [DisallowMultipleComponent]
    public class BuildingMaterials : MonoBehaviour
    {
        public static readonly int BaseColorId = Shader.PropertyToID("_BaseColor");

        private static BuildingMaterials _instance;

        [SerializeField] private Material stone;
        [SerializeField] private Material timber;
        [SerializeField] private Material thatch;
        [SerializeField] private Material plaster;

        private void Awake()
        {
            _instance = this;
        }

        private void OnDestroy()
        {
            if (_instance == this)
            {
                _instance = null;
            }
        }

        /// <summary>خامة باسمها المخبوز. تعيد null إن لم تُوصَل بعد.</summary>
        public static Material Find(string materialName)
        {
            if (_instance == null)
            {
                return null;
            }

            switch (materialName)
            {
                case "Dawnkeep_Stone": return _instance.stone;
                case "Dawnkeep_Timber": return _instance.timber;
                case "Dawnkeep_Thatch": return _instance.thatch;
                case "Dawnkeep_Plaster": return _instance.plaster;
                default: return null;
            }
        }
    }
}
