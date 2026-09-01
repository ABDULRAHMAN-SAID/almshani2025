using UnityEngine;

namespace Almshani.Game
{
    /// <summary>
    /// نقطة الإقلاع: إعدادات التشغيل العامة (معدل الإطارات، منع إطفاء الشاشة).
    /// ضعه على كائن واحد في المشهد الأول — يبقى حياً بين المشاهد.
    /// </summary>
    public class GameBootstrap : MonoBehaviour
    {
        [SerializeField] private int targetFrameRate = 60;

        public static GameBootstrap Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            QualitySettings.vSyncCount = 0;
            Application.targetFrameRate = targetFrameRate;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }
    }
}
