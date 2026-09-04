using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// زرّ يميّز النقرة من الضغطة المطوّلة (§7 و§9).
    ///
    /// **لا `Button` معه**: `Button.onClick` يقع عند رفع الإصبع مهما طالت
    /// الضغطة، فيصدر الأمران معاً — تُفتح الدائرة ويُفتح المرشِّح في لمسة.
    /// هذا المكوّن يمسك الحدثين بنفسه ويطلق واحداً.
    /// </summary>
    [RequireComponent(typeof(Graphic))]
    [DisallowMultipleComponent]
    public class LongPressButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        [Tooltip("كم ثانية تُعدّ الضغطة بعدها مطوّلة (§7: نحو 0.7).")]
        [SerializeField] private float holdSeconds = 0.55f;

        [Tooltip("قتامة الزرّ أثناء الضغط — ردٌّ فوري يقول إنّ اللمسة وصلت.")]
        [Range(0.4f, 1f)]
        [SerializeField] private float pressedShade = 0.78f;

        private Graphic _graphic;
        private Color _restColor;
        private float _downAt;
        private bool _down;
        private bool _fired;

        public event System.Action Clicked;
        public event System.Action LongPressed;

        private void Awake()
        {
            _graphic = GetComponent<Graphic>();
            _restColor = _graphic.color;
        }

        private void Update()
        {
            if (!_down || _fired || Time.unscaledTime - _downAt < holdSeconds)
            {
                return;
            }

            // الضغطة المطوّلة تقع **قبل الرفع** لا بعده: انتظارُ الرفع يجعل
            // اللاعب لا يعرف متى بلغ الحدّ، فيرفع مبكّراً ويظنّ الزرّ معطّلاً.
            _fired = true;
            Release();

            System.Action handler = LongPressed;
            if (handler != null)
            {
                handler();
            }
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            _down = true;
            _fired = false;
            _downAt = Time.unscaledTime;

            _graphic.color = new Color(_restColor.r * pressedShade, _restColor.g * pressedShade,
                _restColor.b * pressedShade, _restColor.a);
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            bool wasDown = _down;
            bool fired = _fired;
            Release();

            if (!wasDown || fired)
            {
                return;
            }

            System.Action handler = Clicked;
            if (handler != null)
            {
                handler();
            }
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            Release();
        }

        /// <summary>يعيد لون الراحة ويُنهي الضغط. اللون يُقرأ من الحالة الحالية.</summary>
        public void Refresh(Color rest)
        {
            _restColor = rest;
            if (!_down && _graphic != null)
            {
                _graphic.color = rest;
            }
        }

        private void Release()
        {
            _down = false;
            if (_graphic != null)
            {
                _graphic.color = _restColor;
            }
        }
    }
}
