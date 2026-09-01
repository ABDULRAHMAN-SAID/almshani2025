using UnityEngine;

namespace Almshani.Player
{
    /// <summary>
    /// حركة لاعب بسيطة بالكيبورد (WASD/الأسهم) مع قفز وجاذبية.
    /// تعتمد Input Manager القديم كي تعمل فور فتح المشروع بلا حزم إضافية.
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

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
        }

        private void Update()
        {
            Vector3 input = new Vector3(Input.GetAxisRaw("Horizontal"), 0f, Input.GetAxisRaw("Vertical"));
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
                if (Input.GetButtonDown("Jump"))
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
    }
}
