using UnityEngine;
using Dawnkeep.CameraRig;
using Dawnkeep.UI;

namespace Dawnkeep.Bosses
{
    /// <summary>
    /// لقطة ظهور الزعيم (§6): **لا تتجاوز ١٫٢ ثانية ويمكن تخطّيها**.
    ///
    /// لا توقف اللعب ولا تسلب الإدخال: توجّه الكاميرا وتعرض الاسم لا غير.
    /// إيقافُ اللعبة لثانية عند ظهور زعيمٍ يوقف الموجة معه، فيصير الظهور
    /// راحةً لا تهديداً — وأوّل لمسةٍ تُنهيها، وهو شرط §6 نفسه.
    /// </summary>
    [DisallowMultipleComponent]
    public class BossIntro : MonoBehaviour
    {
        [Tooltip("طاقم الكاميرا. فارغاً يُبحث عنه مرّة عند أوّل ظهور.")]
        [SerializeField] private RtsCameraRig rig;

        [Tooltip("واجهة المعركة — تعرض اسم الزعيم على لافتتها.")]
        [SerializeField] private BattleHud hud;

        [Tooltip("كم ثانية يبقى الاسم بعد انتهاء اللقطة.")]
        [SerializeField] private float nameHold = 1.6f;

        public void Configure(RtsCameraRig cameraRig, BattleHud battleHud)
        {
            rig = cameraRig != null ? cameraRig : rig;
            hud = battleHud != null ? battleHud : hud;
        }

        /// <summary>يعرض لقطة زعيم. تُستدعى مرّة عند دخوله.</summary>
        public void Play(Boss boss)
        {
            if (boss == null || boss.Definition == null || boss.Body == null)
            {
                return;
            }

            if (rig == null)
            {
                rig = FindAnyObjectByType<RtsCameraRig>();
            }

            if (hud == null)
            {
                hud = FindAnyObjectByType<BattleHud>();
            }

            if (rig != null)
            {
                rig.BeginCinematic(boss.Body, boss.Definition.IntroSeconds);
            }

            if (hud != null)
            {
                // الاسم يبقى بعد اللقطة: اللقطة تقول «أين»، والاسم يقول «من»،
                // وثانيةٌ واحدة لا تكفي لقراءة الثاني.
                hud.Announce(boss.Definition.DisplayName,
                    boss.Definition.IntroSeconds + nameHold);
            }
        }
    }
}
