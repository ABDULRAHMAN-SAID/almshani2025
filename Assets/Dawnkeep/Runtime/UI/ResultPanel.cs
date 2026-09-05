using Dawnkeep.Flow;
using Dawnkeep.Localization;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace Dawnkeep.UI
{
    /// <summary>
    /// شاشة النتيجة (§5): فوزٌ أو خسارة، وسببها، وزرّ إعادة يعمل.
    ///
    /// **شفّافة لا معتمة**: §5 تُحسم على الساحة، واللاعب يريد أن يرى ما خسره —
    /// لوحةٌ سوداء فوق كل شيء تسلبه ذلك.
    ///
    /// الزرّ يعيد تحميل المشهد فعلاً. زرٌّ يقول «أعِد» ولا يعيد أسوأ من غيابه
    /// (§17: ممنوع أزرار شكلية).
    /// </summary>
    [DisallowMultipleComponent]
    public class ResultPanel : MonoBehaviour
    {
        [SerializeField] private TMP_FontAsset font;

        [SerializeField] private Color victoryColor = new Color(0.878f, 0.749f, 0.451f);
        [SerializeField] private Color defeatColor = new Color(0.851f, 0.294f, 0.267f);
        [SerializeField] private Color inkColor = new Color(0.918f, 0.898f, 0.851f);
        [SerializeField] private Color panelColor = new Color(0.055f, 0.063f, 0.075f, 0.88f);

        private StageOutcome _outcome;
        private GameObject _root;
        private TextMeshProUGUI _title;
        private TextMeshProUGUI _detail;

        private void Awake()
        {
            Build();
        }

        private void Start()
        {
            _outcome = StageOutcome.Instance;
            if (_outcome != null)
            {
                _outcome.Resolved += Show;
            }
        }

        private void OnDestroy()
        {
            if (_outcome != null)
            {
                _outcome.Resolved -= Show;
            }
        }

        private void Show(StageResult result)
        {
            bool won = result == StageResult.Victory;

            _title.text = Loc.Text(won ? LocKeys.ResultVictory : LocKeys.ResultDefeat);
            _title.color = won ? victoryColor : defeatColor;

            char[] buffer = new char[ArabicNumber.MaxLength];
            int length = ArabicNumber.Write(_outcome != null ? _outcome.WavesCleared : 0, buffer, 0);

            string detail = Loc.Format(
                won ? LocKeys.ResultVictoryDetail : LocKeys.ResultDefeatDetail,
                new string(buffer, 0, length));

            // حصاد §21 على الشاشة: نجومٌ ومخطّط. **يُقال ما نيل** — مكافأةٌ
            // تُضاف بلا خبرٍ ليست مكافأةً في نظر اللاعب.
            if (_outcome != null)
            {
                length = ArabicNumber.Write(_outcome.Stars, buffer, 0);
                detail += "   ·   " + ArabicShaper.Shape(
                    Loc.Format(LocKeys.HarvestStars, new string(buffer, 0, length)));

                if (_outcome.Blueprint != null)
                {
                    detail += "   ·   " + ArabicShaper.Shape(Loc.Format(
                        LocKeys.HarvestBlueprint, _outcome.Blueprint.DisplayName));
                }

                if (_outcome.NewRecord)
                {
                    detail += "   ·   " + ArabicShaper.Shape(Loc.Text(LocKeys.ModeNewRecord));
                }
            }

            _detail.text = detail;

            _root.SetActive(true);
        }

        /// <summary>يعيد المرحلة: يستأنف الزمن ثمّ يحمّل المشهد من جديد.</summary>
        public void Restart()
        {
            if (_outcome != null)
            {
                _outcome.Resume();
            }
            else
            {
                Time.timeScale = 1f;      // الزمن موقوف، وبلا استئنافه يجمد المشهد الجديد
            }

            Scene scene = SceneManager.GetActiveScene();
            SceneManager.LoadScene(scene.buildIndex);
        }

        /// <summary>
        /// يعود إلى القائمة الرئيسة. يكتب الحفظ أوّلاً: الانتقال قد يُتبع
        /// بإغلاق التطبيق، وجولةٌ كاملة أثمن من أن تُترك لفترةٍ لم تحن.
        /// </summary>
        public void ToMenu()
        {
            Dawnkeep.Save.SaveService save = Dawnkeep.Save.SaveService.Instance;
            if (save != null)
            {
                save.Flush();
            }

            Time.timeScale = 1f;
            SceneManager.LoadScene(MenuSceneName);
        }

        /// <summary>اسم مشهد القائمة — في مكان واحد لا في كل مستدعٍ.</summary>
        public const string MenuSceneName = "Dawnkeep_Menu";

        private void Build()
        {
            RectTransform parent = GetComponent<RectTransform>();
            if (parent == null)
            {
                Debug.LogError("مملكة الرماد: ResultPanel يجب أن يكون على كائن Canvas.");
                enabled = false;
                return;
            }

            RectTransform rect = MakeRect("ResultPanel", parent,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(760f, 300f));

            Image background = rect.gameObject.AddComponent<Image>();
            background.color = panelColor;
            background.raycastTarget = true;

            _title = MakeText("Title", rect, 64f, victoryColor,
                new Vector2(0.5f, 1f), new Vector2(0f, -22f), new Vector2(720f, 84f),
                TextAlignmentOptions.Midline);

            _detail = MakeText("Detail", rect, 28f, inkColor,
                new Vector2(0.5f, 0.5f), new Vector2(0f, 6f), new Vector2(700f, 90f),
                TextAlignmentOptions.Midline);

            RectTransform button = MakeRect("Restart", rect,
                new Vector2(0.5f, 0f), new Vector2(-140f, 26f), new Vector2(260f, 68f));

            Image face = button.gameObject.AddComponent<Image>();
            face.color = new Color(victoryColor.r * 0.34f, victoryColor.g * 0.30f,
                victoryColor.b * 0.20f, 0.94f);
            face.raycastTarget = true;

            Button action = button.gameObject.AddComponent<Button>();
            action.targetGraphic = face;
            action.onClick.AddListener(Restart);

            TextMeshProUGUI caption = MakeText("Caption", button, 30f, victoryColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(240f, 48f),
                TextAlignmentOptions.Midline);
            caption.gameObject.AddComponent<LocalizedLabel>().Bind(caption, LocKeys.ResultRestart);

            // العودة إلى القائمة: §41 تصف الحلقة «من Main Menu حتى Result»،
            // وحلقةٌ لا تعود ليست حلقة. والزرّان متجاوران لا متراكبان:
            // ‏±١٤٠ عن الوسط بعرض ٢٦٠ يترك بينهما عشرين بكسلاً.
            RectTransform menu = MakeRect("ToMenu", rect,
                new Vector2(0.5f, 0f), new Vector2(140f, 26f), new Vector2(260f, 68f));

            Image menuFace = menu.gameObject.AddComponent<Image>();
            menuFace.color = new Color(inkColor.r * 0.18f, inkColor.g * 0.18f,
                inkColor.b * 0.18f, 0.94f);
            menuFace.raycastTarget = true;

            Button menuAction = menu.gameObject.AddComponent<Button>();
            menuAction.targetGraphic = menuFace;
            menuAction.onClick.AddListener(ToMenu);

            TextMeshProUGUI menuCaption = MakeText("Caption", menu, 28f, inkColor,
                new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(240f, 48f),
                TextAlignmentOptions.Midline);
            menuCaption.gameObject.AddComponent<LocalizedLabel>()
                .Bind(menuCaption, LocKeys.ResultToMenu);

            _root = rect.gameObject;
            _root.SetActive(false);
        }

        private static RectTransform MakeRect(string name, Transform parent, Vector2 anchor,
            Vector2 offset, Vector2 size)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            RectTransform rect = go.GetComponent<RectTransform>();
            rect.SetParent(parent, false);
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = offset;
            rect.sizeDelta = size;
            return rect;
        }

        private TextMeshProUGUI MakeText(string name, Transform parent, float size, Color color,
            Vector2 anchor, Vector2 offset, Vector2 rectSize, TextAlignmentOptions align)
        {
            RectTransform rect = MakeRect(name, parent, anchor, offset, rectSize);
            TextMeshProUGUI text = rect.gameObject.AddComponent<TextMeshProUGUI>();

            if (font != null)
            {
                text.font = font;
            }

            text.fontSize = size;
            text.color = color;
            text.alignment = align;
            text.raycastTarget = false;
            text.isRightToLeftText = false;
            text.textWrappingMode = TextWrappingModes.Normal;
            return text;
        }
    }
}
