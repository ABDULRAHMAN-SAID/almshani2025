using TMPro;
using UnityEngine;

namespace Dawnkeep.UI
{
    /// <summary>
    /// نصّ عربي على مكوّن TextMeshPro: يحتفظ بالنصّ **المنطقي** كما يُكتب،
    /// ويسلّم المُصيِّر نصّاً **بصريّاً** مشكّلاً.
    ///
    /// افصل بينهما دائماً: النصّ المنطقي هو ما يُقارَن ويُترجَم ويُخزَّن،
    /// والبصري لا يصلح لشيء إلّا الرسم. وضع النصّ المشكّل في المفتش مباشرةً
    /// يجعل الملفّ غير قابل للترجمة ولا للبحث.
    ///
    /// التشكيل يجري عند تغيّر النصّ لا في كل إطار.
    /// </summary>
    [ExecuteAlways]
    [DisallowMultipleComponent]
    public class ArabicLabel : MonoBehaviour
    {
        [TextArea(1, 3)]
        [SerializeField] private string logicalText = string.Empty;

        private TMP_Text _text;
        private string _applied;
        private bool _hasApplied;

        /// <summary>النصّ المنطقي. ضبطه يعيد التشكيل إن تغيّر فعلاً.</summary>
        public string Text
        {
            get { return logicalText; }
            set { SetText(value); }
        }

        public TMP_Text Target
        {
            get
            {
                if (_text == null)
                {
                    _text = GetComponent<TMP_Text>();
                }

                return _text;
            }
        }

        private void Awake()
        {
            _text = GetComponent<TMP_Text>();
        }

        private void OnEnable()
        {
            Apply(true);
        }

        /// <summary>يضبط النصّ ويعيد تشكيله. لا يعمل شيئاً إن لم يتغيّر.</summary>
        public void SetText(string value)
        {
            if (value == null)
            {
                value = string.Empty;
            }

            if (_hasApplied && string.Equals(logicalText, value))
            {
                return;
            }

            logicalText = value;
            Apply(true);
        }

        private void Apply(bool force)
        {
            TMP_Text target = Target;
            if (target == null)
            {
                return;
            }

            if (!force && _hasApplied && string.Equals(_applied, logicalText))
            {
                return;
            }

            // العكس صار في `ArabicShaper`؛ لو تركنا TMP يعكس أيضاً لعاد النصّ
            // إلى ترتيبه الأوّل مفكّكاً.
            target.isRightToLeftText = false;
            target.text = ArabicShaper.Shape(logicalText);

            _applied = logicalText;
            _hasApplied = true;
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            // معاينة فورية في المحرّر: يُكتب العربي في المفتش فيُرى مشكّلاً
            UnityEditor.EditorApplication.delayCall += () =>
            {
                if (this != null)
                {
                    Apply(true);
                }
            };
        }
#endif
    }
}
