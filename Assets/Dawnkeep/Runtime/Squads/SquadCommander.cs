using Dawnkeep.UI;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Dawnkeep.Squads
{
    /// <summary>
    /// مفاتيح الأوامر على لوحة المفاتيح (§7): F اتبعني، G اثبت، H دافع.
    ///
    /// المفاتيح تنادي **نفس دوالّ الدائرة** لا `SquadDirector` مباشرةً: وإلّا
    /// صدر الأمر بلا سطر تأكيد، فيظنّ لاعب الحاسوب أنّ ضغطته ضاعت.
    ///
    /// بالنظام الجديد وحده (§1). ولا مفتاح ثابت للتراجع: §9 تجعله خياراً
    /// **يظهر عند الحاجة**، ومفتاحٌ دائم يخالف ذلك.
    /// </summary>
    [DisallowMultipleComponent]
    public class SquadCommander : MonoBehaviour
    {
        [SerializeField] private OrderRing ring;

        private void Start()
        {
            if (ring == null)
            {
                ring = FindAnyObjectByType<OrderRing>();
            }
        }

        private void Update()
        {
            if (ring == null)
            {
                return;
            }

            Keyboard keyboard = Keyboard.current;
            if (keyboard == null)
            {
                return;      // جوّال بلا لوحة مفاتيح: الدائرة وحدها
            }

            if (keyboard.fKey.wasPressedThisFrame)
            {
                ring.Follow();
            }
            else if (keyboard.gKey.wasPressedThisFrame)
            {
                ring.Hold();
            }
            else if (keyboard.hKey.wasPressedThisFrame)
            {
                ring.Defend();
            }
        }
    }
}
