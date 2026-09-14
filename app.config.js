// إعدادات التطبيق من app.json كما هي، ولا يضيف هذا الملف إلا شيئًا واحدًا:
// بادئة المسار حين تُنشر نسخة الويب داخل مجلّد على نطاق — مثل صفحات GitHub
// التي تقدّم الموقع من /almshani2025 لا من الجذر. بدونها تُطلب الملفّات من
// الجذر فلا تُوجد، وتذهب الروابط الداخلية إلى مسارات لا وجود لها.
//
// لا أثر لهذا على بناء التطبيق نفسه: متى غاب المتغيّر عاد الإعداد كما هو.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...config.experiments, baseUrl } };
};
