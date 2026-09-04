using Dawnkeep.Localization;
using TMPro;
using UnityEngine;

namespace Dawnkeep.UI
{
    /// <summary>
    /// نصّ ثابت يعرف **مفتاحه** فيعيد جلب نفسه عند تبديل اللغة.
    ///
    /// بلا هذا يبقى `Loc.Changed` حدثاً لا يسمعه أحد: النصوص الثابتة تُبنى مرّة
    /// في `Awake`، فتبديل اللغة يغيّر الجدول ولا يغيّر ما على الشاشة — وهو
    /// عطلٌ صامت أسوأ من غياب التبديل أصلاً.
    /// </summary>
    [DisallowMultipleComponent]
    public class LocalizedLabel : MonoBehaviour
    {
        [SerializeField] private string key;

        private TMP_Text _text;

        public string Key { get { return key; } }

        /// <summary>يربط المكوّن بمفتاحه ويكتبه فوراً.</summary>
        public void Bind(TMP_Text target, string localeKey)
        {
            _text = target;
            key = localeKey;
            Apply();
        }

        private void OnEnable()
        {
            if (_text == null)
            {
                _text = GetComponent<TMP_Text>();
            }

            Loc.Changed += Apply;
            Apply();
        }

        private void OnDisable()
        {
            Loc.Changed -= Apply;
        }

        private void Apply()
        {
            if (_text != null && !string.IsNullOrEmpty(key))
            {
                _text.text = Loc.Text(key);
            }
        }
    }
}
