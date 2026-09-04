using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Combat
{
    /// <summary>
    /// مولّد موجات §14 بميزانية تهديد.
    ///
    /// **ليس `MonoBehaviour`**: لا حالة في المشهد ولا `Update` — يُستدعى مرّة
    /// عند بدء كل موجة، فيُبنى مرّةً ويُعاد استعماله. وبذرته محفوظة، فنفس
    /// الرقم يعيد نفس الموجة حرفياً: هذا شرط §14 «Seed محفوظ كي يمكن إعادة
    /// التحدّي»، وهو أيضاً ما يجعل الموجة قابلة للفحص خارج المحرّر.
    ///
    /// **لا عشوائية بلا قيود** (§14 صراحةً). القيود أربعة:
    ///   ١. لا يظهر عدوّ قبل الليلة التي عُلِّم فيها (`TaughtOnWave`).
    ///   ٢. سقفٌ لكل صنف من الميزانية، فلا موجة كلّها رماة.
    ///   ٣. أقلّ عدد للسرب: واحدٌ من سربٍ ليس سرباً، فيُترك ولا يُنقَص.
    ///   ٤. مشاةٌ في كل موجة إن طُلب: بلا خطٍّ أماميّ لا تُقرأ الموجة.
    ///   ٥. لا نوعان من صنفٍ واحد مرّتين في الموجة: مجموعتان من المُغير
    ///      ليستا تنوّعاً، وقد ظهرتا في القياس ستَّ مرّات على عشرين ليلة.
    ///
    /// **والميزانية الفائضة تشتري مستوىً لا أجساداً**. قاس `wavecheck.py` أنّ
    /// الميزانية تبلغ 1155 في الليلة العشرين بينما لا يُنفَق منها إلا 146:
    /// حدود الأسراب تقصّها، فتتوقّف الصعوبة عند الليلة العاشرة وتبقى الأرقام
    /// تصعد على الورق. و§14 نفسها تُدرِج «مستوى العدو» في كل `WaveDefinition`،
    /// فهو الباب: بعد امتلاء الأسراب تُشترى به الدرجات، فيثقل العدوّ ولا يزيد
    /// عددُه — وهو أيضاً ما يحفظ الإطار على الجوّال.
    /// </summary>
    public class WaveGenerator
    {
        private readonly List<UnitDefinition> _eligible = new List<UnitDefinition>(24);
        private readonly List<WaveDefinition.Entry> _entries = new List<WaveDefinition.Entry>(8);
        private readonly Dictionary<ThreatClass, int> _spent = new Dictionary<ThreatClass, int>(8);
        private readonly List<UnitDefinition> _used = new List<UnitDefinition>(8);

        /// <summary>
        /// الأصناف التي تدخل القسمة: كلّ ما في `ThreatClass` عدا `Boss`، وهو
        /// آخرها. عددٌ مشتقّ لا مكتوب، فإضافة صنف لا تحتاج تعديل هذا السطر.
        /// </summary>
        private static readonly int PickableClasses = (int)ThreatClass.Boss;

        /// <summary>ما ولّدته آخر مرّة — يقرؤه المستدعي بلا تخصيص جديد.</summary>
        public List<WaveDefinition.Entry> Entries { get { return _entries; } }

        /// <summary>الميزانية التي وُزّعت فعلاً، والمرصودة — للفحص وللمعاينة.</summary>
        public int SpentThreat { get; private set; }

        public int Budget { get; private set; }

        /// <summary>أعلى مستوى بلغته مجموعة في هذه الموجة — للمعاينة وللفحص.</summary>
        public int TopTier { get; private set; }

        /// <summary>هل في هذه الموجة زعيم كامل؟ (§14: كل عشر موجات)</summary>
        public bool HasBoss { get; private set; }

        /// <summary>هل فيها زعيم صغير؟ (§14: كل خمس موجات)</summary>
        public bool HasMiniBoss { get; private set; }

        /// <summary>
        /// يولّد تركيبة الموجة. النتيجة في <see cref="Entries"/>.
        /// </summary>
        /// <param name="waveNumber">رقم الليلة بدءاً من واحد.</param>
        /// <param name="catalogue">كل تعريفات المهاجمين المتاحة.</param>
        /// <param name="settings">أرقام التوليد.</param>
        /// <param name="profile">درجة الصعوبة الجارية.</param>
        /// <param name="fronts">عدد جهات الدخول المتاحة في المشهد.</param>
        public void Generate(int waveNumber, IList<UnitDefinition> catalogue,
            WaveGenSettings settings, DifficultySettings.Profile profile, int fronts)
        {
            _entries.Clear();
            _spent.Clear();
            _used.Clear();
            TopTier = 0;
            SpentThreat = 0;
            HasBoss = false;
            HasMiniBoss = false;

            if (catalogue == null || settings == null)
            {
                Budget = 0;
                return;
            }

            Budget = settings.Budget(waveNumber, profile.ThreatScale);

            // بذرة الموجة تجمع بذرة الجولة برقم الليلة: فموجةٌ بعينها ثابتة
            // مهما أُعيدت، والموجات فيما بينها مختلفة.
            System.Random rng = new System.Random(settings.Seed + (waveNumber * 7919));

            // جهة ثانية في بعض الليالي (§14: «موجة من اتجاه إضافي في بعض الليالي»)
            int frontCount = Mathf.Max(1, fronts);
            bool secondFront = profile.SecondFrontEvery > 0
                && frontCount > 1
                && waveNumber % profile.SecondFrontEvery == 0;

            HasBoss = settings.BossEvery > 0 && waveNumber % settings.BossEvery == 0;
            HasMiniBoss = !HasBoss && settings.MiniBossEvery > 0
                && waveNumber % settings.MiniBossEvery == 0;

            int remaining = Budget;
            remaining -= PlaceBoss(waveNumber, catalogue, settings, rng, remaining);

            float ceilingShare = profile.ClassCeiling > 0.01f ? profile.ClassCeiling : 0.55f;
            int ceiling = Mathf.Max(1, Mathf.RoundToInt(Budget * ceilingShare));

            Collect(catalogue, waveNumber, false);
            if (_eligible.Count == 0)
            {
                Finish(settings, secondFront, frontCount, rng);
                return;
            }

            if (settings.RequireMelee)
            {
                remaining -= PlaceOne(ThreatClass.Melee, remaining, ceiling, rng, settings);
            }

            // جولة كاملة على الأصناف في كل دورة. التوقّف عند أوّل صنف يخيب
            // — وهو ما كان — يترك أصنافاً لم تُجرَّب، فقاس الفحص موجةً من
            // مجموعتين في الليلة العشرين ومن أربع في العاشرة: مجموعاتٌ تنقص
            // كلّما زادت الميزانية، عكس المقصود تماماً.
            int start = rng.Next(PickableClasses);
            int guard = 0;
            while (_entries.Count < settings.MaxGroups && remaining > 0 && guard++ < 16)
            {
                int before = remaining;

                for (int c = 0; c < PickableClasses && _entries.Count < settings.MaxGroups; c++)
                {
                    ThreatClass group = (ThreatClass)((start + c) % PickableClasses);
                    remaining -= PlaceOne(group, remaining, ceiling, rng, settings);
                }

                if (remaining == before)
                {
                    break;      // لا مزيد من الأجساد: ما بقي يُشترى مستوى
                }
            }

            remaining = BuyTiers(settings, remaining);
            Finish(settings, secondFront, frontCount, rng);
        }

        /// <summary>
        /// الزعيم أو الزعيم الصغير. يأخذ نصيبه من الميزانية ويترك الباقي
        /// لحاشيته: زعيمٌ وحده ليس موجة، وحاشيةٌ بلا زعيم تُخلف وعد الليلة.
        /// </summary>
        private int PlaceBoss(int waveNumber, IList<UnitDefinition> catalogue,
            WaveGenSettings settings, System.Random rng, int remaining)
        {
            if (!HasBoss && !HasMiniBoss)
            {
                return 0;
            }

            Collect(catalogue, waveNumber, true);
            if (_eligible.Count == 0)
            {
                // لا زعيم معرَّف بعد: الليلة تبقى موجةً عادية أثقل، ولا تُلغى
                HasBoss = false;
                HasMiniBoss = false;
                return 0;
            }

            int share = Mathf.Max(1, Mathf.RoundToInt(remaining * settings.BossShare));

            // الزعيم الكامل أغلى ما تحتمله الحصّة، والصغير أرخص ما يتجاوز نصفها
            UnitDefinition pick = null;
            for (int i = 0; i < _eligible.Count; i++)
            {
                UnitDefinition candidate = _eligible[i];
                if (candidate.ThreatCost > remaining)
                {
                    continue;
                }

                if (pick == null)
                {
                    pick = candidate;
                    continue;
                }

                bool better = HasBoss
                    ? candidate.ThreatCost > pick.ThreatCost
                    : Mathf.Abs(candidate.ThreatCost - share) < Mathf.Abs(pick.ThreatCost - share);

                if (better)
                {
                    pick = candidate;
                }
            }

            if (pick == null)
            {
                HasBoss = false;
                HasMiniBoss = false;
                return 0;
            }

            Add(pick, 1, settings, rng);
            return pick.ThreatCost;
        }

        /// <summary>يضع مجموعة من صنف بعينه. يعيد ما أُنفق.</summary>
        private int PlaceOne(ThreatClass wanted, int remaining, int ceiling,
            System.Random rng, WaveGenSettings settings)
        {
            if (remaining <= 0)
            {
                return 0;
            }

            int already;
            _spent.TryGetValue(wanted, out already);
            int room = Mathf.Min(remaining, ceiling - already);
            if (room <= 0)
            {
                return 0;
            }

            UnitDefinition pick = null;
            int picked = 0;

            // مرشّح واحد بالدور: الاختيار موزون بالثمن — الأغلى أندر —
            // لا موحَّد، فموجةٌ من أرخص الأنواع دائماً ليست تحدّياً.
            int total = 0;
            for (int i = 0; i < _eligible.Count; i++)
            {
                UnitDefinition candidate = _eligible[i];
                if (candidate.ThreatClass != wanted || candidate.ThreatCost <= 0)
                {
                    continue;
                }

                if (candidate.ThreatCost * candidate.MinPack > room)
                {
                    continue;      // لا يتّسع سربه الأدنى: يُترك ولا يُنقَص
                }

                if (_used.Contains(candidate))
                {
                    continue;      // نوعٌ مرّتين في الموجة ليس تنوّعاً
                }

                total++;
            }

            if (total == 0)
            {
                return 0;
            }

            int choice = rng.Next(total);
            int seen = 0;
            for (int i = 0; i < _eligible.Count; i++)
            {
                UnitDefinition candidate = _eligible[i];
                if (candidate.ThreatClass != wanted || candidate.ThreatCost <= 0)
                {
                    continue;
                }

                if (candidate.ThreatCost * candidate.MinPack > room)
                {
                    continue;
                }

                if (_used.Contains(candidate))
                {
                    continue;
                }

                if (seen++ == choice)
                {
                    pick = candidate;
                    break;
                }
            }

            if (pick == null)
            {
                return 0;
            }

            int affordable = room / pick.ThreatCost;
            picked = Mathf.Clamp(affordable, pick.MinPack, pick.MaxPack);
            if (picked > affordable)
            {
                return 0;
            }

            int cost = picked * pick.ThreatCost;
            _spent[wanted] = already + cost;
            Add(pick, picked, settings, rng);
            return cost;
        }

        /// <summary>
        /// ينفق ما بقي من الميزانية على **مستوى** المجموعات لا على عددها.
        /// يرفع الأرخص أوّلاً درجةً درجة، فتصعد الموجة كلّها بانتظام بدل أن
        /// تصير مجموعةٌ واحدة جبّارة وسطَ موجةٍ هزيلة. يعيد ما بقي بعده.
        /// </summary>
        private int BuyTiers(WaveGenSettings settings, int remaining)
        {
            if (settings.MaxTier <= 0 || _entries.Count == 0)
            {
                return remaining;
            }

            int guard = 0;
            while (remaining > 0 && guard++ < 256)
            {
                int cheapest = -1;
                int cheapestCost = int.MaxValue;

                for (int i = 0; i < _entries.Count; i++)
                {
                    WaveDefinition.Entry entry = _entries[i];
                    if (entry.Unit == null || entry.Tier >= settings.MaxTier)
                    {
                        continue;
                    }

                    int baseCost = entry.Count * entry.Unit.ThreatCost;
                    int cost = Mathf.Max(1, Mathf.RoundToInt(baseCost * settings.TierCost));
                    if (cost <= remaining && cost < cheapestCost)
                    {
                        cheapest = i;
                        cheapestCost = cost;
                    }
                }

                if (cheapest < 0)
                {
                    break;
                }

                WaveDefinition.Entry raised = _entries[cheapest];
                raised.Tier++;
                _entries[cheapest] = raised;
                remaining -= cheapestCost;
                SpentThreat += cheapestCost;

                if (raised.Tier > TopTier)
                {
                    TopTier = raised.Tier;
                }
            }

            return remaining;
        }

        private void Collect(IList<UnitDefinition> catalogue, int waveNumber, bool bosses)
        {
            _eligible.Clear();
            for (int i = 0; i < catalogue.Count; i++)
            {
                UnitDefinition def = catalogue[i];
                if (def == null || def.Faction != Faction.Horde || def.ThreatCost <= 0)
                {
                    continue;
                }

                if (def.TaughtOnWave > waveNumber)
                {
                    continue;      // §14: لا يظهر عدوّ قبل تعليمه
                }

                if ((def.ThreatClass == ThreatClass.Boss) != bosses)
                {
                    continue;
                }

                _eligible.Add(def);
            }
        }

        private void Add(UnitDefinition unit, int count, WaveGenSettings settings, System.Random rng)
        {
            WaveDefinition.Entry entry;
            entry.Unit = unit;
            entry.Count = count;
            entry.Spacing = Mathf.Clamp(settings.PackWindow / Mathf.Max(1, count),
                settings.PackSpacingMin, settings.PackSpacingMax);
            entry.Delay = _entries.Count * settings.GroupStagger;
            entry.Front = 0;
            entry.Tier = 0;
            _entries.Add(entry);
            _used.Add(unit);
            SpentThreat += count * unit.ThreatCost;
        }

        /// <summary>
        /// يوزّع الجهات بعد اكتمال المجموعات. **بعدُ لا أثناء**: توزيعها أثناء
        /// البناء يجعل الجهة الثانية تقع على أوّل مجموعة أحياناً وعلى آخرها
        /// أحياناً بحسب عدد المجموعات، فيختلف معنى الليلة بلا سبب.
        /// </summary>
        private void Finish(WaveGenSettings settings, bool secondFront, int fronts, System.Random rng)
        {
            if (!secondFront || _entries.Count < 2)
            {
                return;
            }

            int other = 1 + rng.Next(Mathf.Max(1, fronts - 1));

            // النصف الثاني من المجموعات يدخل من الجهة الأخرى: الزعيم في الأولى
            // دائماً — أن يظهر من حيث لا يُنتظر عقابٌ لا تحدٍّ.
            for (int i = _entries.Count / 2; i < _entries.Count; i++)
            {
                WaveDefinition.Entry entry = _entries[i];
                if (entry.Unit != null && entry.Unit.ThreatClass == ThreatClass.Boss)
                {
                    continue;
                }

                entry.Front = other;
                _entries[i] = entry;
            }
        }
    }
}
