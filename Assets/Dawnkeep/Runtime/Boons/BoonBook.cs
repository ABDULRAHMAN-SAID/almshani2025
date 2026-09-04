using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Boons
{
    /// <summary>
    /// ما اختاره اللاعب هذه الجولة، مجموعاً في جدولٍ يُقرأ بضربةٍ واحدة.
    ///
    /// **المضاعفات تُضرب لا تُجمع**: بركتان بـ+18% تعطيان 1.39 لا 1.36؛ الفرق
    /// صغير على اثنتين وكبير على ستّ، والضرب هو ما يجعل التكديس يتناقص من
    /// نفسه بلا سقفٍ مكتوب.
    ///
    /// **لا `Update` فيه**: هو مخزنٌ يُقرأ، والقراءة `Dictionary` واحدة —
    /// أرخص من تمرير مرجعٍ إلى كل نظام.
    /// </summary>
    [DisallowMultipleComponent]
    public class BoonBook : MonoBehaviour
    {
        public static BoonBook Instance { get; private set; }

        private readonly Dictionary<BoonStat, float> _stats = new Dictionary<BoonStat, float>(24);
        private readonly HashSet<BoonFlag> _flags = new HashSet<BoonFlag>();
        private readonly List<BoonDefinition> _taken = new List<BoonDefinition>(8);

        /// <summary>يُرفع كلّما أُخذت بركة — تُعيد الواجهة رسم ما تعرضه.</summary>
        public event System.Action Changed;

        /// <summary>ما أُخذ هذه الجولة، بترتيب أخذه.</summary>
        public IReadOnlyList<BoonDefinition> Taken { get { return _taken; } }

        private void Awake()
        {
            Instance = this;
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        /// <summary>
        /// مضاعف رقمٍ بعينه: **بركةُ الجولة × بحثُ الحساب (§16) × التجهيز
        /// (§17)**.
        ///
        /// نقطةُ قراءةٍ واحدة للثلاثة: لو قرأ كل نظامٍ كلاًّ على حدة لَاحتاج
        /// ثلاثة أسطر، ولَنُسي أحدها في موضعٍ أو موضعين — وذاك بحثٌ يشتريه
        /// اللاعب أو سيفٌ يلبسه فلا يعمل. والثلاثة **تُضرب**: قطعتان بـ+10%
        /// تعطيان 1.21 لا 1.20، والضربُ يجعل التكديس يتناقص من نفسه.
        ///
        /// وواحدٌ إن لم يمسّه شيء، فالمستدعي يضرب دائماً ولا يفحص.
        /// </summary>
        public float Of(BoonStat stat)
        {
            float value;
            if (!_stats.TryGetValue(stat, out value))
            {
                value = 1f;
            }

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            if (progress != null)
            {
                value *= progress.Permanent(stat);
            }

            return value * Dawnkeep.Equipment.Loadout.Stat(stat);
        }

        /// <summary>
        /// مضاعفٌ ساكن يعمل ولو لم يكن ثمّة كتاب في المشهد — والأبحاث تعمل
        /// حينها أيضاً: مشهدُ تجريبٍ بلا كتاب بركات لا يجوز أن يُلغي ما
        /// اشتراه اللاعب.
        /// </summary>
        public static float Stat(BoonStat stat)
        {
            BoonBook book = Instance;
            if (book != null)
            {
                return book.Of(stat);
            }

            Dawnkeep.Meta.Progress progress = Dawnkeep.Meta.Progress.Instance;
            float permanent = progress != null ? progress.Permanent(stat) : 1f;
            return permanent * Dawnkeep.Equipment.Loadout.Stat(stat);
        }

        public bool Has(BoonFlag flag)
        {
            return _flags.Contains(flag);
        }

        public static bool Flagged(BoonFlag flag)
        {
            BoonBook book = Instance;
            return book != null && book.Has(flag);
        }

        /// <summary>كم بركةً من فئةٍ أُخذت — يقرؤه المُوزِّع ليوازن العرض.</summary>
        public int CountOf(BoonCategory category)
        {
            int count = 0;
            for (int i = 0; i < _taken.Count; i++)
            {
                if (_taken[i] != null && _taken[i].Category == category)
                {
                    count++;
                }
            }

            return count;
        }

        public bool Contains(BoonDefinition boon)
        {
            return boon != null && _taken.Contains(boon);
        }

        public void Take(BoonDefinition boon)
        {
            if (boon == null || _taken.Contains(boon))
            {
                return;
            }

            _taken.Add(boon);

            BoonDefinition.Change[] changes = boon.Changes;
            for (int i = 0; i < changes.Length; i++)
            {
                if (changes[i].Stat == BoonStat.None)
                {
                    continue;
                }

                float current;
                if (!_stats.TryGetValue(changes[i].Stat, out current))
                {
                    current = 1f;
                }

                _stats[changes[i].Stat] = current * changes[i].Multiplier;
            }

            if (boon.Flag != BoonFlag.None)
            {
                _flags.Add(boon.Flag);
            }

            Raise();
        }

        /// <summary>يمحو الجولة. تُستدعى عند إعادة المرحلة (§5).</summary>
        public void Clear()
        {
            _stats.Clear();
            _flags.Clear();
            _taken.Clear();
            Raise();
        }

        private void Raise()
        {
            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }
    }
}
