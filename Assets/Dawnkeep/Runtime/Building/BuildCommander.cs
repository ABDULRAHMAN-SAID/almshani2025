using Dawnkeep.Interaction;
using Dawnkeep.UI;
using UnityEngine;

namespace Dawnkeep.Building
{
    /// <summary>
    /// أمر اللاعب على البناء: نقرة على عقدة تفتح بطاقاتها الثلاث (§10).
    ///
    /// أثناء التخطيط وحده — §10 تنصّ: «أثناء Combat لا يمكن البيع أو البناء».
    /// والنقرة خارج أي عقدة تغلق اللوحة، فلا يحتاج اللاعب زرّ إغلاق.
    /// </summary>
    [DisallowMultipleComponent]
    public class BuildCommander : MonoBehaviour
    {
        [Tooltip("أبعد مسافة بالمتر بين نقطة النقر ومركز العقدة لتُحسب لها.")]
        [SerializeField] private float pickRadius = 7f;

        [Tooltip("نصف قطر نقر قلب الحصن — أوسع لأنّه أعرض من عقدة.")]
        [SerializeField] private float keepRadius = 22f;

        [SerializeField] private BuildPanel panel;

        private BuildingDirector _director;
        private Keep _keep;
        private Camera _camera;
        private TapDetector _tap;

        private void Awake()
        {
            _tap = TapDetector.Default();
        }

        private void Start()
        {
            _director = BuildingDirector.Instance;
            _keep = Keep.Instance;
            _camera = Camera.main;

            if (panel == null)
            {
                panel = FindAnyObjectByType<BuildPanel>();
            }
        }

        private void Update()
        {
            if (_camera == null)
            {
                _camera = Camera.main;
            }

            if (_director == null)
            {
                _director = BuildingDirector.Instance;
            }

            if (_director == null || _camera == null || panel == null)
            {
                return;
            }

            Vector2 screen;
            if (!_tap.Poll(out screen))
            {
                return;
            }

            if (!_director.CanBuildNow)
            {
                panel.Close();
                return;
            }

            BuildNode node = Pick(screen);
            if (node != null)
            {
                panel.Open(node);
                return;
            }

            // العقدة أولى بالنقرة من الحصن: العقد أصغر وأدقّ، والحصن واسع
            // فيبتلع نقرات جيرانه لو قُدِّم عليها.
            if (PickKeep(screen))
            {
                panel.OpenKeep(_keep);
                return;
            }

            panel.Close();      // نقرة في الفراغ = إلغاء
        }

        /// <summary>أقرب عقدة إلى نقطة النقر المسقطة على مستوى العقد.</summary>
        private BuildNode Pick(Vector2 screen)
        {
            System.Collections.Generic.IReadOnlyList<BuildNode> nodes = _director.Nodes;
            if (nodes.Count == 0)
            {
                return null;
            }

            BuildNode best = null;
            float bestSqr = pickRadius * pickRadius;

            for (int i = 0; i < nodes.Count; i++)
            {
                BuildNode node = nodes[i];
                if (node == null || !node.Unlocked)
                {
                    continue;
                }

                Vector3 hit;
                if (!TapDetector.GroundPoint(_camera, screen, node.Position.y, out hit))
                {
                    continue;
                }

                Vector3 delta = hit - node.Position;
                delta.y = 0f;

                float distSqr = delta.sqrMagnitude;
                if (distSqr < bestSqr)
                {
                    bestSqr = distSqr;
                    best = node;
                }
            }

            return best;
        }

        /// <summary>هل وقعت النقرة على قلب الحصن؟</summary>
        private bool PickKeep(Vector2 screen)
        {
            if (_keep == null)
            {
                _keep = Keep.Instance;
                if (_keep == null)
                {
                    return false;
                }
            }

            Vector3 centre = _keep.transform.position;
            Vector3 hit;
            if (!TapDetector.GroundPoint(_camera, screen, centre.y, out hit))
            {
                return false;
            }

            Vector3 delta = hit - centre;
            delta.y = 0f;
            return delta.sqrMagnitude <= keepRadius * keepRadius;
        }
    }
}
