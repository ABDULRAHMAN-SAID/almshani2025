namespace Dawnkeep.World
{
    /// <summary>
    /// كومة صغرى على مفاتيح صحيحة — تستعملها خوارزميتا ملء المنخفضات وأقصر الطرق.
    /// مصفوفات مسطّحة بلا تخصيص داخل الحلقة.
    /// </summary>
    public sealed class IndexHeap
    {
        private int[] _keys;
        private float[] _values;
        private int _count;

        public IndexHeap(int capacity)
        {
            if (capacity < 16)
            {
                capacity = 16;
            }

            _keys = new int[capacity];
            _values = new float[capacity];
            _count = 0;
        }

        public int Count
        {
            get { return _count; }
        }

        public void Clear()
        {
            _count = 0;
        }

        public void Push(int key, float value)
        {
            if (_count >= _keys.Length)
            {
                int[] nk = new int[_keys.Length * 2];
                float[] nv = new float[_values.Length * 2];
                System.Array.Copy(_keys, nk, _count);
                System.Array.Copy(_values, nv, _count);
                _keys = nk;
                _values = nv;
            }

            int i = _count++;
            _keys[i] = key;
            _values[i] = value;

            while (i > 0)
            {
                int p = (i - 1) >> 1;
                if (_values[p] <= _values[i])
                {
                    break;
                }

                Swap(p, i);
                i = p;
            }
        }

        public int Pop()
        {
            int top = _keys[0];
            _count--;

            if (_count > 0)
            {
                _keys[0] = _keys[_count];
                _values[0] = _values[_count];

                int i = 0;
                while (true)
                {
                    int l = (i * 2) + 1;
                    int r = l + 1;
                    int m = i;

                    if (l < _count && _values[l] < _values[m])
                    {
                        m = l;
                    }

                    if (r < _count && _values[r] < _values[m])
                    {
                        m = r;
                    }

                    if (m == i)
                    {
                        break;
                    }

                    Swap(m, i);
                    i = m;
                }
            }

            return top;
        }

        private void Swap(int a, int b)
        {
            int tk = _keys[a];
            float tv = _values[a];
            _keys[a] = _keys[b];
            _values[a] = _values[b];
            _keys[b] = tk;
            _values[b] = tv;
        }
    }
}
