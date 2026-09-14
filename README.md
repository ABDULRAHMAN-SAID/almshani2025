# أنشطتي | قاعدة صلالة الجوية

تطبيق موبايل (Android / iOS) لتنظيم الأنشطة العامة، المسابقات، المحاضرات، الرياضة، التوعية، والتقويم السنوي.
تطبيق أنشطة وتثقيف وتنظيم فقط — **لا يحتوي على أي معلومة عسكرية سرية أو عملياتية أو رتب أو أرقام عسكرية**.

للاطلاع على المعمارية الكاملة، خريطة التنقل، قائمة الشاشات، Design Tokens، ومخطط قاعدة البيانات:
👉 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

للنسخة النهائية — حسابات بكلمة مرور، ورفع حقيقي للصور والمقاطع والملفات:
👉 [`docs/PRODUCTION.md`](./docs/PRODUCTION.md)

لشرح المراحل الأربع بالتفصيل (من التجربة على Expo Go إلى النشر في المتجر):
👉 [`docs/BUILD.md`](./docs/BUILD.md)

```bash
npm run setup       # ابنِ الخادم كاملًا: مشروع Supabase، المخطط، المحتوى، الدخول بالهاتف
npm run make-app    # ابنِ ملف APK حقيقيًا يقرأ ويكتب عليه
npm run admin       # اجعل نفسك إداريًا بعد أول تسجيل دخول
```

## التشغيل محليًا

```bash
npm install
npm run start
```

- اضغط `a` لتشغيل على Android، أو `i` لـ iOS، أو `w` للويب.
- التطبيق يعمل افتراضيًا ببيانات تجريبية (`EXPO_PUBLIC_USE_MOCK_DATA=true`): أي رقم أو بريد وأي كلمة مرور يدخل — لا حاجة لأي إعداد خارجي للتجربة الأولى.

## ربط Supabase الفعلي

`npm run setup` يفعل هذا كله بأمر واحد: ينشئ المشروع، ينفّذ `supabase/schema.sql`،
يملأ القاعدة بمحتوى البداية، يفعّل الدخول بالهاتف مع رمز تجربة ثابت، ويكتب `.env`.
يطلب منك رمز وصول واحدًا من [حسابك في Supabase](https://supabase.com/dashboard/account/tokens).

ويدويًا إن فضّلت:

1. أنشئ مشروع Supabase وفعّل Email و Phone مع إطفاء التأكيد.
2. نفّذ `supabase/schema.sql` ثم `supabase/starter-content.sql` في SQL Editor.
3. شغّل `npm run connect` — يسأل عن الرابط والمفتاح العام، يكتب `.env`، ثم يتحقق من الخادم فورًا.
4. عيّن نفسك إداريًا بـ `npm run admin` أو `supabase/make-me-admin.sql`.

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

المرحلة 1 (Architecture, Design System, Navigation, Auth, Home) **منفّذة**.
باقي المراحل موثّقة في [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#7-خطة-التنفيذ-على-مراحل).
