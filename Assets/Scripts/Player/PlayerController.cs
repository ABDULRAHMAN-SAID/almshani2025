using UnityEngine;

#if DAWNKEEP_INPUT
using UnityEngine.InputSystem;
#endif

namespace Almshani.Player
{
    /// <summary>
    /// حركة لاعب على الأرض بنظام الإدخال الجديد (Input System) مع قفز وجاذبية.
    /// قبل تثبيت الحزمة تبقى الحركة معطّلة عمداً — ممنوع Input Manager القديم.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        [Header("الحركة")]
        [SerializeField] private float moveSpeed = 6f;
        [SerializeField] private float turnSpeedDegrees = 720f;

        [Header("القفز والجاذبية")]
        [SerializeField] private float gravity = -20f;
        [SerializeField] private float jumpHeight = 1.4f;

        private CharacterController _controller;
        private float _verticalVelocity;
#if !DAWNKEEP_INPUT
        private bool _warnedNoInput;
#endif

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
        }

        private void Update()
        {
            Vector3 input = ReadMoveInput();
            if (input.sqrMagnitude > 1f)
            {
                input.Normalize();
            }

            if (input.sqrMagnitude > 0.0001f)
            {
                Quaternion target = Quaternion.LookRotation(input, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(
                    transform.rotation, target, turnSpeedDegrees * Time.deltaTime);
            }

            if (_controller.isGrounded)
            {
                // قيمة سالبة صغيرة تُبقي الشخصية ملتصقة بالأرض بدل أن ترتد
                _verticalVelocity = -2f;
                if (ReadJumpPressed())
                {
                    _verticalVelocity = Mathf.Sqrt(-2f * gravity * jumpHeight);
                }
            }
            else
            {
                _verticalVelocity += gravity * Time.deltaTime;
            }

            Vector3 velocity = (input * moveSpeed) + (Vector3.up * _verticalVelocity);
            _controller.Move(velocity * Time.deltaTime);
        }

        private Vector3 ReadMoveInput()
        {
#if DAWNKEEP_INPUT
            Keyboard keyboard = Keyboard.current;
            if (keyboard == null)
            {
                return Vector3.zero;
            }

            float x = 0f;
            float z = 0f;

            if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed)
            {
                x -= 1f;
            }

            if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed)
            {
                x += 1f;
            }

            if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed)
            {
                z -= 1f;
            }

            if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed)
            {
                z += 1f;
            }

            return new Vector3(x, 0f, z);
#else
            if (!_warnedNoInput)
            {
                _warnedNoInput = true;
                Debug.LogWarning("مملكة الرماد: حزمة Input System غير مثبّتة — حركة اللاعب معطّلة. نفّذ الخطوة 1.");
            }

            return Vector3.zero;
#endif
        }

        private bool ReadJumpPressed()
        {
#if DAWNKEEP_INPUT
            Keyboard keyboard = Keyboard.current;
            return keyboard != null && keyboard.spaceKey.wasPressedThisFrame;
#else
            return false;
#endif
        }
    }
}
