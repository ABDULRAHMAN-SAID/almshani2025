using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// شبكة تجزئة مكانية بلا تخصيص ذاكرة إطلاقاً بعد الإنشاء.
    ///
    /// المواصفات (§12) تمنع أن يفحص كل عدو كل الأهداف في كل إطار: مئة عدو ومئة
    /// مدافع تعني عشرة آلاف فحص. الشبكة تقصر الفحص على الخلايا المجاورة وحدها.
    ///
    /// البناء بمرورين على طريقة عدّ التكرار: مرور يعدّ ما في كل خليّة، ثم مسح
    /// تراكمي يعطي بداية كل خليّة، ثم مرور يملأ. لا قوائم ولا قواميس ولا `new`.
    /// </summary>
    public sealed class SpatialHash
    {
        private readonly float _cellSize;
        private readonly float _invCell;
        private readonly int _columns;
        private readonly int _rows;
        private readonly float _originX;
        private readonly float _originZ;

        private readonly int[] _cellStart;      // بداية كل خليّة في _items
        private readonly int[] _cellCount;      // كم فيها الآن
        private readonly int[] _items;          // فهارس الوحدات مرتّبة بالخلايا
        private readonly int[] _itemCell;       // خليّة كل عنصر — لتفادي إعادة الحساب

        private int _capacity;

        public SpatialHash(float worldSize, float cellSize, int capacity)
        {
            _cellSize = Mathf.Max(0.5f, cellSize);
            _invCell = 1f / _cellSize;
            _columns = Mathf.Max(1, Mathf.CeilToInt(worldSize / _cellSize));
            _rows = _columns;
            _originX = -worldSize * 0.5f;
            _originZ = -worldSize * 0.5f;

            _capacity = Mathf.Max(16, capacity);
            _cellStart = new int[(_columns * _rows) + 1];
            _cellCount = new int[_columns * _rows];
            _items = new int[_capacity];
            _itemCell = new int[_capacity];
        }

        public int CellIndex(float x, float z)
        {
            int cx = Mathf.Clamp((int)((x - _originX) * _invCell), 0, _columns - 1);
            int cz = Mathf.Clamp((int)((z - _originZ) * _invCell), 0, _rows - 1);
            return (cz * _columns) + cx;
        }

        /// <summary>
        /// يعيد بناء الشبكة من مواضع الوحدات. يُستدعى مرّة كل إطار قبل الاستعلام.
        /// </summary>
        public void Rebuild(Vector3[] positions, int count)
        {
            if (count > _capacity)
            {
                count = _capacity;    // تجاوز السعة يُقصّ ولا يخصّص: التخصيص في الإطار ممنوع
            }

            System.Array.Clear(_cellCount, 0, _cellCount.Length);

            for (int i = 0; i < count; i++)
            {
                int cell = CellIndex(positions[i].x, positions[i].z);
                _itemCell[i] = cell;
                _cellCount[cell]++;
            }

            int running = 0;
            for (int c = 0; c < _cellCount.Length; c++)
            {
                _cellStart[c] = running;
                running += _cellCount[c];
                _cellCount[c] = 0;      // يُعاد استعماله كمؤشّر ملء
            }

            _cellStart[_cellCount.Length] = running;

            for (int i = 0; i < count; i++)
            {
                int cell = _itemCell[i];
                _items[_cellStart[cell] + _cellCount[cell]] = i;
                _cellCount[cell]++;
            }
        }

        /// <summary>
        /// يملأ <paramref name="results"/> بفهارس الوحدات في الخلايا التي يلمسها
        /// نصف القطر. يعيد العدد. لا يخصّص شيئاً — المصفوفة يملكها المستدعي.
        /// </summary>
        public int Query(Vector3 center, float radius, int[] results)
        {
            int found = 0;
            int span = Mathf.Max(1, Mathf.CeilToInt(radius * _invCell));

            int cx = Mathf.Clamp((int)((center.x - _originX) * _invCell), 0, _columns - 1);
            int cz = Mathf.Clamp((int)((center.z - _originZ) * _invCell), 0, _rows - 1);

            int x0 = Mathf.Max(0, cx - span);
            int x1 = Mathf.Min(_columns - 1, cx + span);
            int z0 = Mathf.Max(0, cz - span);
            int z1 = Mathf.Min(_rows - 1, cz + span);

            for (int z = z0; z <= z1; z++)
            {
                int rowBase = z * _columns;
                for (int x = x0; x <= x1; x++)
                {
                    int cell = rowBase + x;
                    int start = _cellStart[cell];
                    int end = start + _cellCount[cell];
                    for (int k = start; k < end; k++)
                    {
                        if (found >= results.Length)
                        {
                            return found;
                        }

                        results[found++] = _items[k];
                    }
                }
            }

            return found;
        }
    }
}
