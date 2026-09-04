using UnityEngine;

namespace Dawnkeep.UI
{
    /// <summary>
    /// نمط اللاعب الأعسر (§7: «دعم نمط اللاعب الأعسر بعكس مجموعات التحكم»).
    ///
    /// **العكس بالمرايا لا ببناءٍ ثانٍ**: كل عنصر يُبنى مرّةً على الجانب
    /// الأيمن، ثمّ تُعكَس مرساتُه وإزاحتُه أفقيّاً عند التبديل. بناءُ تخطيطين
    /// يعني تعديلَين لكل تغيير، وسهواً في أحدهما لا يظهر إلّا لمن يلعب به.
    ///
    /// ويُحفظ الاختيار في ملفّ الحفظ (§27) لا في `PlayerPrefs`: من يقلب
    /// التحكّم يقلبه مرّةً لا كل جولة، وإعداداتُه تنتقل مع بقيّة تقدّمه.
    /// </summary>
    public static class Handedness
    {
        /// <summary>يُرفع عند التبديل — تعكس العناصر نفسها عنده.</summary>
        public static event System.Action Changed;

        public static bool LeftHanded
        {
            get
            {
                Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
                return save != null && save.Data.Settings.LeftHanded;
            }

            set
            {
                Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
                if (save == null || save.Data.Settings.LeftHanded == value)
                {
                    return;
                }

                save.Data.Settings.LeftHanded = value;
                save.Mark();

                System.Action handler = Changed;
                if (handler != null)
                {
                    handler();
                }
            }
        }

        /// <summary>
        /// يعكس مستطيلاً أفقيّاً: المرساة والمحور والإزاحة. يُستدعى مرّةً عند
        /// التبديل لا في كل إطار.
        ///
        /// المرساة **والمحور** معاً: عكس المرساة وحدها يترك عنصراً عرضُه
        /// أربعمئة يتدلّى من حافّة الشاشة بثلاثة أرباعه.
        /// </summary>
        public static void Mirror(RectTransform rect)
        {
            if (rect == null)
            {
                return;
            }

            Vector2 min = rect.anchorMin;
            Vector2 max = rect.anchorMax;
            Vector2 pivot = rect.pivot;
            Vector2 offset = rect.anchoredPosition;

            rect.anchorMin = new Vector2(1f - max.x, min.y);
            rect.anchorMax = new Vector2(1f - min.x, max.y);
            rect.pivot = new Vector2(1f - pivot.x, pivot.y);
            rect.anchoredPosition = new Vector2(-offset.x, offset.y);
        }

        /// <summary>يعكس مستطيلاً وكل أبنائه المباشرين.</summary>
        public static void MirrorTree(RectTransform rect)
        {
            if (rect == null)
            {
                return;
            }

            Mirror(rect);
            for (int i = 0; i < rect.childCount; i++)
            {
                RectTransform child = rect.GetChild(i) as RectTransform;
                if (child != null)
                {
                    MirrorTree(child);
                }
            }
        }
    }
}
