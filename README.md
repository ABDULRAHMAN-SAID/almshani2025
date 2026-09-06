# أنشطتي | قاعدة صلالة الجوية

تطبيق موبايل (Android / iOS) لتنظيم الأنشطة العامة، المسابقات، المحاضرات، الرياضة، التوعية، والتقويم السنوي.
تطبيق أنشطة وتثقيف وتنظيم فقط — **لا يحتوي على أي معلومة عسكرية سرية أو عملياتية أو رتب أو أرقام عسكرية**.

للاطلاع على المعمارية الكاملة، خريطة التنقل، قائمة الشاشات، Design Tokens، ومخطط قاعدة البيانات:
👉 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## التشغيل محليًا

```bash
npm install
npm run start
```

- اضغط `a` لتشغيل على Android، أو `i` لـ iOS، أو `w` للويب.
- التطبيق يعمل افتراضيًا ببيانات تجريبية (`EXPO_PUBLIC_USE_MOCK_DATA=true`) و"Development Login" بدل OTP حقيقي — لا حاجة لأي إعداد خارجي للتجربة الأولى.

## ربط Supabase الفعلي لاحقًا

1. أنشئ مشروع Supabase وفعّل Phone Auth (OTP).
2. نفّذ `supabase/schema.sql` في SQL Editor.
3. انسخ `.env.example` إلى `.env` وعبّئ `EXPO_PUBLIC_SUPABASE_URL` و`EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. اجعل `EXPO_PUBLIC_USE_MOCK_DATA=false`.

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
supabase/       مخطط قاعدة البيانات
```

## حالة التنفيذ

المرحلة 1 (Architecture, Design System, Navigation, Login/OTP, Home) **منفّذة**.
باقي المراحل موثّقة في [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#7-خطة-التنفيذ-على-مراحل).
