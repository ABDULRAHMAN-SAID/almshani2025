# أنشطتي | قاعدة صلالة الجوية

تطبيق موبايل (Android / iOS) لتنظيم الأنشطة العامة، المسابقات، المحاضرات، الرياضة، التوعية، والتقويم السنوي.
تطبيق أنشطة وتثقيف وتنظيم فقط — **لا يحتوي على أي معلومة عسكرية سرية أو عملياتية أو رتب أو أرقام عسكرية**.

للاطلاع على المعمارية الكاملة، خريطة التنقل، قائمة الشاشات، Design Tokens، ومخطط قاعدة البيانات:
👉 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

للنسخة النهائية — دخول حقيقي برمز SMS، ورفع حقيقي للصور والمقاطع والملفات:
👉 [`docs/PRODUCTION.md`](./docs/PRODUCTION.md)

لشرح المراحل الأربع بالتفصيل (من التجربة على Expo Go إلى النشر في المتجر):
👉 [`docs/BUILD.md`](./docs/BUILD.md)

```bash
npm run connect     # اربط التطبيق بخادم Supabase (يسأل ويتحقق)
npm run make-app    # ابنِ ملف APK — نسخة حقيقية إن كان الخادم مربوطًا
```

## التشغيل محليًا

```bash
npm install
npm run start
```

- اضغط `a` لتشغيل على Android، أو `i` لـ iOS، أو `w` للويب.
- التطبيق يعمل افتراضيًا ببيانات تجريبية (`EXPO_PUBLIC_USE_MOCK_DATA=true`) و"Development Login" بدل OTP حقيقي — لا حاجة لأي إعداد خارجي للتجربة الأولى.

## ربط Supabase الفعلي

1. أنشئ مشروع Supabase وفعّل Phone Auth (OTP).
2. نفّذ `supabase/schema.sql` في SQL Editor.
3. شغّل `npm run connect` — يسأل عن الرابط والمفتاح العام، يكتب `.env`، ثم يتحقق من الخادم فورًا.
4. عيّن نفسك إداريًا بـ `supabase/make-me-admin.sql`.

للتشخيص: `npm run check:supabase` من الطرفية، أو «فحص الربط» من لوحة الإدارة داخل التطبيق.

## الشعار

ضع ملف الشعار الرسمي في `assets/images/logo/logo.png` (استبدال الملف الحالي فقط) — يظهر تلقائيًا في شاشة البداية وتسجيل الدخول والرئيسية دون أي تعديل كود.

## بنية المشروع

```
app/            المسارات (Expo Router)
src/
  components/   عناصر واجهة قابلة لإعادة الاستخدام
  services/     Supabase / Mock Data / Auth
  store/        Zustand
  hooks/        React Query hooks
  types/        الأنواع المشتركة (Models)
  utils/        دوال مساعدة
  constants/    Design Tokens والتصنيفات
supabase/       مخطط قاعدة البيانات واختبارات الصلاحيات
scripts/        أدوات الربط والبناء والاختبار
docs/           المعمارية، وطريق البناء، والنسخة النهائية
```

## حالة التنفيذ

المرحلة 1 (Architecture, Design System, Navigation, Login/OTP, Home) **منفّذة**.
باقي المراحل موثّقة في [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#7-خطة-التنفيذ-على-مراحل).
