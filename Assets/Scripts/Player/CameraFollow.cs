using UnityEngine;

namespace Almshani.Player
{
    /// <summary>كاميرا تتبع الهدف بنعومة من خلف/فوق — تُضبط في LateUpdate بعد حركة اللاعب.</summary>
    public class CameraFollow : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 offset = new Vector3(0f, 9f, -9f);
        [SerializeField] private float smoothTime = 0.15f;
        [SerializeField] private float lookAtHeight = 1f;

        private Vector3 _velocity;

        public void SetTarget(Transform value)
        {
            target = value;
        }

        private void LateUpdate()
        {
            if (target == null)
            {
                return;
            }

            Vector3 desired = target.position + offset;
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref _velocity, smoothTime);
            transform.LookAt(target.position + (Vector3.up * lookAtHeight));
        }
    }
}
