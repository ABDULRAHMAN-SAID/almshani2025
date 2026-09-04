using System.Collections.Generic;
using UnityEngine;

namespace Dawnkeep.Campaign
{
    /// <summary>
    /// خريطة الحملة (§19): أيّ مرحلةٍ مفتوحة، وأيّها التالية، وما أُنجز.
    ///
    /// **لا يملك بياناته**: هي في `SaveService` (§27). و‎−400‎ مع `Progress`
    /// و`Loadout` و`DoctrineBook` — الأربعة تعيش في المشهدين وتقرأ الملفّ
    /// نفسه.
    ///
    /// وهو أيضاً **من يحمل المرحلة الجارية** بين المشهدين: القائمة تختار،
    /// والمعركة تسأل «أيّ مرحلة؟». وحملُها في ساكنٍ يعيش بين المشهدين هو
    /// ما يجعل الاختيار يصل.
    /// </summary>
    [DefaultExecutionOrder(-400)]
    [DisallowMultipleComponent]
    public class CampaignDirector : MonoBehaviour
    {
        public static CampaignDirector Instance { get; private set; }

        [Tooltip("المناطق الأربع (§19) بترتيبها.")]
        [SerializeField] private ZoneDefinition[] zones = new ZoneDefinition[0];

        [Tooltip("المراحل كلّها. تُرتَّب بالمنطقة ثمّ بالترتيب.")]
        [SerializeField] private StageDefinition[] stages = new StageDefinition[0];

        public event System.Action Changed;

        /// <summary>
        /// المرحلة التي تُلعَب الآن. **ساكنة**: تُكتب في مشهد القائمة وتُقرأ
        /// في مشهد المعركة، ولا حاملَ بينهما غيرها. وتبقى بعد تدمير الكائن
        /// (تبديل المشهد يدمّره) — ولذلك هي ساكنةٌ لا حقلُ نسخة.
        /// </summary>
        public static StageDefinition Current { get; private set; }

        private Dawnkeep.Save.SaveService _save;
        private readonly Dawnkeep.Save.SaveData _fallback = new Dawnkeep.Save.SaveData();

        private Dawnkeep.Save.SaveData Store
        {
            get
            {
                if (_save == null)
                {
                    _save = Dawnkeep.Save.SaveService.Instance;
                }

                return _save != null ? _save.Data : _fallback;
            }
        }

        public IReadOnlyList<ZoneDefinition> Zones { get { return zones; } }

        public IReadOnlyList<StageDefinition> Stages { get { return stages; } }

        private void Awake()
        {
            Instance = this;

            // أوّل مرحلةٍ مفتوحةٍ هي الافتراضية: لاعبٌ يضغط «ابدأ» بلا اختيار
            // يجب أن يجد نفسه في مرحلةٍ ما، لا في مشهدٍ بلا هدف.
            if (Current == null)
            {
                Current = NextOpen();
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        // ── الحال ───────────────────────────────────────────────────────────

        public bool Cleared(StageDefinition stage)
        {
            return stage != null && Store.Campaign.StagesCleared.Contains(stage.Key);
        }

        /// <summary>
        /// هل المرحلة مفتوحة؟ الأولى دائماً، وما بعدها إن أُنجزت التي قبلها.
        /// وأوّلُ منطقةٍ تُفتح بعدد مراحلَ من التي قبلها (`UnlockAfter`).
        /// </summary>
        public bool Unlocked(StageDefinition stage)
        {
            if (stage == null || stage.Zone == null)
            {
                return false;
            }

            if (stage.Zone.Order <= 1 && stage.Index <= 1)
            {
                return true;
            }

            if (stage.Index > 1)
            {
                return Cleared(Find(stage.Zone, stage.Index - 1));
            }

            // أوّل مرحلةٍ في منطقة: تُفتح بعدد مراحلَ من السابقة
            ZoneDefinition previous = ZoneAt(stage.Zone.Order - 1);
            if (previous == null)
            {
                return true;
            }

            return ClearedIn(previous) >= stage.Zone.UnlockAfter;
        }

        public int ClearedIn(ZoneDefinition zone)
        {
            if (zone == null)
            {
                return 0;
            }

            int count = 0;
            for (int i = 0; i < stages.Length; i++)
            {
                if (stages[i] != null && stages[i].Zone == zone && Cleared(stages[i]))
                {
                    count++;
                }
            }

            return count;
        }

        public ZoneDefinition ZoneAt(int order)
        {
            for (int i = 0; i < zones.Length; i++)
            {
                if (zones[i] != null && zones[i].Order == order)
                {
                    return zones[i];
                }
            }

            return null;
        }

        public StageDefinition Find(ZoneDefinition zone, int index)
        {
            for (int i = 0; i < stages.Length; i++)
            {
                if (stages[i] != null && stages[i].Zone == zone && stages[i].Index == index)
                {
                    return stages[i];
                }
            }

            return null;
        }

        /// <summary>أوّل مرحلةٍ مفتوحةٍ لم تُنجَز — وهي التي يقترحها زرّ اللعب.</summary>
        public StageDefinition NextOpen()
        {
            StageDefinition best = null;
            for (int i = 0; i < stages.Length; i++)
            {
                StageDefinition stage = stages[i];
                if (stage == null || stage.Zone == null || !Unlocked(stage) || Cleared(stage))
                {
                    continue;
                }

                if (best == null || Before(stage, best))
                {
                    best = stage;
                }
            }

            // كلّها أُنجزت: تُعاد الأخيرة — الحملة تُلعَب ثانيةً ولا تُقفَل
            return best != null ? best : Last();
        }

        private static bool Before(StageDefinition a, StageDefinition b)
        {
            if (a.Zone.Order != b.Zone.Order)
            {
                return a.Zone.Order < b.Zone.Order;
            }

            return a.Index < b.Index;
        }

        private StageDefinition Last()
        {
            StageDefinition last = null;
            for (int i = 0; i < stages.Length; i++)
            {
                if (stages[i] != null && stages[i].Zone != null
                    && (last == null || Before(last, stages[i])))
                {
                    last = stages[i];
                }
            }

            return last;
        }

        // ── الاختيار والإنجاز ───────────────────────────────────────────────

        public bool Choose(StageDefinition stage)
        {
            if (stage == null || !Unlocked(stage))
            {
                return false;
            }

            Current = stage;
            Raise();
            return true;
        }

        /// <summary>
        /// يسجّل إنجاز المرحلة الجارية ويمنح مخطّطها (§17 و§19). **مرّةً
        /// واحدة**: `StagesCleared` قائمةٌ لا عدّاد، فإعادةُ مرحلةٍ منجَزة لا
        /// تمنح مخطّطها ثانيةً.
        ///
        /// يعيد المخطّط الممنوح، أو `null` — تعرضه شاشة النتيجة.
        /// </summary>
        public Dawnkeep.Equipment.EquipmentDefinition Complete()
        {
            StageDefinition stage = Current;
            if (stage == null)
            {
                return null;
            }

            bool fresh = !Cleared(stage);
            if (fresh)
            {
                Store.Campaign.StagesCleared.Add(stage.Key);
                Mark();
            }

            if (!fresh || stage.Blueprint == null)
            {
                Raise();
                return null;
            }

            Dawnkeep.Equipment.Loadout loadout = Dawnkeep.Equipment.Loadout.Instance;
            bool granted = loadout != null && loadout.Grant(stage.Blueprint);

            Raise();
            return granted ? stage.Blueprint : null;
        }

        private void Mark()
        {
            if (_save == null)
            {
                _save = Dawnkeep.Save.SaveService.Instance;
            }

            if (_save != null)
            {
                _save.Mark();
            }
        }

        private void Raise()
        {
            System.Action handler = Changed;
            if (handler != null)
            {
                handler();
            }
        }

        // ── البيئة، تُقرأ من المرحلة الجارية ────────────────────────────────

        /// <summary>مضاعف بيئةٍ من منطقة المرحلة الجارية، أو واحدٌ بلا حملة.</summary>
        public static float Ground()
        {
            return Current != null && Current.Zone != null ? Current.Zone.GroundSpeed : 1f;
        }

        public static float TowerRange()
        {
            return Current != null && Current.Zone != null ? Current.Zone.TowerRange : 1f;
        }

        public static float BeaconRadius()
        {
            return Current != null && Current.Zone != null ? Current.Zone.BeaconRadius : 1f;
        }

        public static float Threat()
        {
            return Current != null && Current.Zone != null ? Current.Zone.ThreatScale : 1f;
        }

        /// <summary>هدف المرحلة الجارية، أو «حماية القلب» بلا حملة.</summary>
        public static StageObjective Objective()
        {
            return Current != null ? Current.Objective : StageObjective.HoldTheKeep;
        }

        public static int Nights()
        {
            return Current != null ? Current.Nights : 10;
        }

#if UNITY_EDITOR
        public void SetContent(ZoneDefinition[] allZones, StageDefinition[] allStages)
        {
            zones = allZones;
            stages = allStages;
        }
#endif
    }
}
