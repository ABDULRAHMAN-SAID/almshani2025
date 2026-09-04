using UnityEngine;
using Dawnkeep.Combat;

namespace Dawnkeep.Doctrine
{
    /// <summary>
    /// يُنفّذ ما بقي من أفعال العقيدة الافتتاحية (§18) — تلك التي لا موضع
    /// طبيعيّ لها في نظامٍ قائم.
    ///
    /// الفضّة تُضاف في `Treasury`، والشحنة في `LightField`، وصحّة القلب في
    /// `Keep`، وخصمُ الجدران في `BuildingDirector` — كلٌّ في بيته. وما يبقى
    /// هو **الجند**: لا نظام يُخرج حاميةً من عدم، فهذا موضعُه.
    ///
    /// و`Start` لا `Awake`: الجند يُسجَّل في `CombatDirector`، وهو يلتقط
    /// الحامية الموضوعة في المشهد في `Start` نفسها — فالإخراج قبله يجعل
    /// الوحدة تُسجَّل مرّتين.
    /// </summary>
    [DefaultExecutionOrder(50)]
    [DisallowMultipleComponent]
    public class DoctrineOpener : MonoBehaviour
    {
        [Tooltip("الوحدة التي يُخرجها «الجيش القائم» (§18). حارسٌ مملكيّ.")]
        [SerializeField] private UnitDefinition guard;

        [Tooltip("نصف قطر الحلقة التي يقفون عليها حول قلب الحصن، بالمتر.")]
        [SerializeField] private float ring = 9f;

        private void Start()
        {
            int count = DoctrineBook.Opening(DoctrineOpening.StandingGuards);
            if (count <= 0 || guard == null || guard.Prefab == null)
            {
                return;
            }

            Dawnkeep.Building.Keep keep = Dawnkeep.Building.Keep.Instance;
            Vector3 centre = keep != null ? keep.transform.position : transform.position;

            CombatDirector combat = CombatDirector.Instance;
            Terrain terrain = Terrain.activeTerrain;

            for (int i = 0; i < count; i++)
            {
                float angle = ((float)i / count) * Mathf.PI * 2f;
                Vector3 at = centre
                    + new Vector3(Mathf.Cos(angle) * ring, 0f, Mathf.Sin(angle) * ring);

                if (terrain != null)
                {
                    at.y = terrain.SampleHeight(new Vector3(at.x, 0f, at.z))
                        + terrain.transform.position.y;
                }

                GameObject go = Instantiate(guard.Prefab, at,
                    Quaternion.Euler(0f, (angle * Mathf.Rad2Deg) + 180f, 0f), transform);

                Unit unit = go.GetComponent<Unit>();
                if (unit == null)
                {
                    unit = go.AddComponent<Unit>();
                }

                unit.SetDefinition(guard);
                unit.Awaken();

                // يرابطون حول القلب: حامية §18 تدافع عنه ولا تجول
                unit.SetPost(at, 14f);

                if (combat != null)
                {
                    combat.Register(unit);
                }
            }
        }

#if UNITY_EDITOR
        public void Configure(UnitDefinition value)
        {
            guard = value;
        }
#endif
    }
}
