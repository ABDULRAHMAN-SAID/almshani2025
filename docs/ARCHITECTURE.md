# أنشطتي | قاعة صلالة الجوية — المعمارية التقنية

> تطبيق داخلي غير سري لتنظيم الأنشطة العامة، المسابقات، المحاضرات، الرياضة، التوعية، والتقويم السنوي.
> **لا يحتوي على أي معلومة عسكرية سرية أو تشغيلية أو رتب أو أرقام عسكرية.**

---

## 1. نظرة معمارية عامة

| الطبقة | التقنية |
|---|---|
| التطبيق | React Native + Expo (SDK 51) |
| اللغة | TypeScript |
| التنقل | Expo Router (ملفات = مسارات) |
| الحالة الخادمية | TanStack Query (React Query) |
| الحالة المحلية | Zustand |
| الخلفية (Backend) | Supabase (Postgres + Auth + Storage) |
| الإشعارات | Firebase Cloud Messaging (مرحلة لاحقة) |
| الخطوط | Tajawal (عربي احترافي، عبر Expo Google Fonts) |
| الأيقونات | @expo/vector-icons (بدون إيموجي) |

### مبدأ Clean Architecture

```
app/                  → المسارات فقط (Expo Router) — لا منطق أعمال هنا
src/
  components/         → عناصر واجهة قابلة لإعادة الاستخدام (بلا منطق أعمال)
  features/           → منطق كل ميزة (مسابقات، محاضرات، تقويم...) لاحقًا
  services/           → الاتصال بـ Supabase / Mock Data / Auth
  store/              → Zustand stores (auth, ui)
  hooks/              → React Query hooks + hooks عامة
  types/              → Models & Types مشتركة
  utils/              → دوال مساعدة (تواريخ، تنسيق نص عربي...)
  constants/          → Design Tokens (ألوان، مسافات، خطوط، تصنيفات)
assets/
  images/logo/        → مكان شعار سلاح الجو (قابل للاستبدال بسهولة)
supabase/
  schema.sql          → مخطط قاعدة البيانات الكامل
```

كل شاشة في `app/` هي "غلاف" رفيع يستدعي مكونات من `src/components` وبيانات من `src/hooks` — لا تُكتب استعلامات Supabase أو تنسيقات ثابتة داخل ملفات `app/` مباشرة.

### مصدر البيانات القابل للتبديل

كل الشاشات تقرأ البيانات عبر `src/services/*` و`src/hooks/*` فقط. حاليًا `services` تُرجع **Mock Data عربي واقعي** (بدون Lorem Ipsum)، وهي مبنية بنفس شكل استجابة Supabase تمامًا، بحيث يكون التبديل لاحقًا إلى Supabase الحقيقي بتغيير سطر واحد (`USE_MOCK` في `src/services/config.ts`) دون تعديل أي شاشة.

---

## 2. خريطة التنقل (Navigation Map)

```
Root Stack
├─ Splash (app/index.tsx)                         → توجيه تلقائي خلال ثوانٍ
├─ (auth) Stack — غير مسجل دخول
│   ├─ login              رقم الهاتف
│   ├─ otp                رمز التحقق
│   └─ profile-setup       الاسم الكامل (أول مرة فقط)
└─ (tabs) Bottom Navigation — بعد تسجيل الدخول
    ├─ الرئيسية (index)
    │   └─ activity/[id]                 تفاصيل نشاط (مشترك لكل الأنواع)
    │   └─ competition/[id]              تفاصيل مسابقة
    │   └─ lecture/[id]                  تفاصيل محاضرة
    │   └─ announcements                 كل الإعلانات
    │   └─ search                        البحث العام
    │   └─ sections/competitions         قائمة المسابقات + Filters
    │   └─ sections/lectures             قائمة المحاضرات + Filters
    │   └─ sections/sports               الأنشطة الرياضية
    │   └─ sections/shooting             الرماية
    │   └─ sections/safety               السلامة (فرعي: مرورية/عامة/جوية/إسعافات)
    ├─ التقويم (calendar)
    │   └─ عرض شهري (Grid) + عرض سنوي (قائمة 12 شهر) + Filters
    ├─ نشاطاتي (my-activities)
    │   └─ تبويبات: القادمة / السابقة / المسابقات / المحاضرات / الرياضة
    ├─ التوعية (awareness)
    │   └─ التثقيف الأمني
    │   └─ مكافحة المخدرات
    │   └─ مقال توعوي [id]
    └─ حسابي (profile)
        └─ notifications                 مركز الإشعارات
        └─ settings                      الإعدادات
        └─ edit-name                     تعديل الاسم

نظام النقاط (متاح من الرئيسية والحساب)
├─ quiz                    السؤال الثقافي الأسبوعي
├─ check-in                تسجيل الحضور (QR أو رمز يدوي)
├─ points-history          سجل النقاط
└─ leaderboard             قائمة المتصدرين

Admin (منفصل تمامًا، دخول برمز إداري — غير مرئي للمستخدم العادي)
└─ (admin)
    ├─ dashboard          إحصائيات سريعة
    ├─ activities/manage  إضافة/تعديل/حذف
    ├─ announcements/manage
    └─ notifications/send
```

---

## 3. قائمة الشاشات الكاملة

| # | الشاشة | الحالة في هذه النسخة |
|---|---|---|
| 1 | Splash | ✅ مرحلة 1 |
| 2 | تسجيل الدخول (رقم الهاتف) | ✅ مرحلة 1 (Dev Login + OTP جاهز للتفعيل) |
| 3 | التحقق OTP | ✅ مرحلة 1 |
| 4 | إعداد الملف الشخصي (أول مرة) | ✅ مرحلة 1 |
| 5 | الرئيسية | ✅ مرحلة 1 |
| 6 | تفاصيل نشاط (موحدة) | 🔜 مرحلة 2 |
| 7 | التسجيل في نشاط (Modal تأكيد) | 🔜 مرحلة 2 |
| 8 | نشاطاتي | 🔜 مرحلة 2 |
| 9 | التقويم (شهري + سنوي) | 🔜 مرحلة 3 |
| 10 | الإعلانات | 🔜 مرحلة 3 |
| 11 | مركز الإشعارات | 🔜 مرحلة 3 |
| 12 | التثقيف الأمني | 🔜 مرحلة 4 |
| 13 | مكافحة المخدرات | 🔜 مرحلة 4 |
| 14 | السلامة (مروري/عام/جوي/إسعافات) | 🔜 مرحلة 4 |
| 15 | المسابقات (قائمة + فلاتر) | 🔜 مرحلة 5 |
| 16 | المحاضرات (قائمة + فلاتر) | 🔜 مرحلة 5 |
| 17 | الأنشطة الرياضية | 🔜 مرحلة 5 |
| 18 | الرماية | 🔜 مرحلة 5 |
| 19 | البحث | 🔜 مرحلة 5 |
| 20 | الإعدادات / تعديل الاسم | 🔜 مرحلة 2 |
| 21 | لوحة إدارة (Dashboard + CRUD) | 🔜 مرحلة 6 |
| 22 | السؤال الثقافي الأسبوعي | ✅ (بيانات تجريبية) |
| 23 | تسجيل الحضور (QR / رمز يدوي) | ✅ (بيانات تجريبية) |
| 24 | سجل النقاط | ✅ (بيانات تجريبية) |
| 25 | قائمة المتصدرين | ✅ (بيانات تجريبية) |

الشاشات الفعلية المبنية في هذه النسخة (Phase 1) موجودة في `app/(auth)` و`app/(tabs)`، والباقي مُخطط له في هذا المستند حتى لا تُبنى الشاشات عشوائيًا.

---

## 4. Design Tokens

المصدر الموحّد: `src/constants/`.

```ts
// الألوان
Primary        #0B2545   (كحلي داكن)
PrimaryDark    #071A33
Accent         #A11D2C   (أحمر عماني)
Gold           #C7A252   (لمسات ذهبية للجوائز/الأحداث المهمة فقط)
Background     #F5F6F8
Surface(Card)  #FFFFFF
Border         #E4E7EC
TextPrimary    #18202A
TextMuted      #75808F
Success        #1E8E5A
Warning        #B7791F
Danger         #B3261E

// المسافات (spacing scale, 4px base)
xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32

// نصف القطر
sm 8 · md 12 · lg 16 · pill 999

// الظلال
card: خفيفة جدًا (opacity 0.06، radius 12، لا تأثيرات مبالغ فيها)

// الطباعة (Tajawal)
h1 24/bold · h2 20/bold · h3 17/semibold
body 15/regular · caption 13/regular · button 15/semibold
```

كل الشاشات تلتزم بتدرّج واضح: **عنوان → معلومة مهمة (تاريخ/حالة) → وصف → زر**، بدون تكديس بصري.

---

## 5. مخطط قاعدة البيانات (Supabase / Postgres)

انظر `supabase/schema.sql` للنص الكامل القابل للتنفيذ. ملخص الجداول:

- **users** — id, phone, full_name, created_at *(بدون رتبة/رقم عسكري/جهة عمل)*
- **activities** — id, title, description, category, cover_image, date, start_time, end_time, location, capacity, registration_status, registration_deadline, is_annual, created_at
- **registrations** — id, user_id, activity_id, status, registered_at (unique: user_id+activity_id)
- **announcements** — id, title, description, type, published_at
- **awareness_articles** — id, title, summary, content, category, image, published_at
- **notifications** — id, user_id, title, body, read, created_at
- **activity_results** *(اختياري، بعد انتهاء المسابقة)* — activity_id, rank, winner_name, note
- **points_transactions** — user_id, reason (حضور/مشاركة/سؤال ثقافي)، points، activity_id?، created_at
- **activity_checkins** — user_id, activity_id, code, checked_in_at (فريد لكل مستخدم+نشاط)
- **weekly_quizzes / quiz_questions / quiz_answers** — الأسئلة الثقافية الأسبوعية والإجابات — راجع القسم 10

جميع الجداول محمية بـ Row Level Security: المستخدم يقرأ بياناته فقط في `registrations`/`notifications`، والجميع يقرأ `activities`/`announcements`/`awareness_articles` (قراءة عامة، كتابة للإدارة فقط عبر Service Role).

---

## 6. نظام التصنيفات (Categories)

```
Cultural | SecurityAwareness | TrafficSafety | AviationSafety
Sports | Shooting | Lecture | AntiDrugs | GeneralSafety | Announcement
```

مُعرّفة مركزيًا في `src/constants/categories.ts` مع: الاسم العربي، الأيقونة، اللون المرتبط (مستخدم بدرجة منخفضة جدًا فوق الحياد اللوني الأساسي).

---

## 7. خطة التنفيذ على مراحل

| المرحلة | المحتوى | الحالة |
|---|---|---|
| 1 | Architecture, Design System, Navigation, Login/OTP, Home | ✅ **منفّذة في هذا الـ commit** |
| 2 | Activities, Activity Details, Registration Flow, My Activities | 🔜 التالية |
| 3 | Annual Calendar, Announcements, Notifications | 🔜 |
| 4 | Awareness, Security Awareness, Safety, Anti-Drugs | 🔜 |
| 5 | Sports, Shooting, Competitions, Lectures (شاشات القوائم الكاملة) | 🔜 |
| 6 | Admin Dashboard | 🔜 |
| 7 | ربط Supabase الفعلي + Auth OTP حقيقي + FCM | 🔜 |

بعد كل مرحلة: تشغيل `npm run typecheck`، اختبار التنقل، اختبار RTL، اختبار الاستجابة، ثم الانتقال للمرحلة التالية — كما هو مطلوب.

---

## 8. الخصوصية والأمان (مطبّقة منذ البداية)

- لا رتب، لا أرقام عسكرية، لا جهة عمل — الحقل غير موجود أصلاً في `types/models.ts`.
- لا Chat، لا رسائل خاصة، لا مشاركة أرقام هواتف بين المستخدمين.
- لا Location Tracking ولا خرائط مستخدمين.
- قسم الرماية لا يحتوي حقولًا لأي معلومة تقنية/تشغيلية — فقط تاريخ، وقت، تسجيل، ملاحظات عامة.
- المحتوى التوعوي (أمني/سلامة/مخدرات) عام بالكامل، لا تفاصيل تشغيلية.

## 9. الشعار

مكانه: `assets/images/logo/logo.png` (يوجد حاليًا Placeholder + `README.md` يشرح كيفية الاستبدال). يُستخدم عبر المكوّن `src/components/Logo.tsx` في: Splash، تسجيل الدخول، رأس الرئيسية — بحجم صغير دائمًا، وبتغيير الملف فقط يتحدّث في كل هذه الأماكن تلقائيًا.

---

## 10. نظام النقاط والمسابقة الثقافية الأسبوعية

ميزة إضافية طُلبت بعد المرحلة 1: تحفيز الحضور والمشاركة بنقاط، مع أسئلة ثقافية أسبوعية.

### قواعد منح النقاط
قيمة موحّدة وبسيطة لكل الأسباب — **10 نقاط**، بلا تفاوت، لتبسيط الفهم للمستخدم ولسهولة تعديلها لاحقًا من الإدارة:

| السبب | النقاط | آلية التحقق |
|---|---|---|
| حضور محاضرة | 10 | رمز حضور (QR أو كود يُدخل يدويًا) يُعرض في القاعة وقت الفعالية |
| المشاركة في نشاط عام | 10 | نفس آلية رمز الحضور |
| إجابة صحيحة على سؤال ثقافي أسبوعي | 10 لكل سؤال | تحقّق فوري داخل التطبيق |

**لماذا رمز حضور وليس تسجيلًا تلقائيًا؟** حتى لا تُمنح النقاط لمجرد "التسجيل" في نشاط دون حضوره فعليًا — هذا قرار تصميمي لضمان نزاهة النظام. الإدارة تعرض الرمز (QR) على شاشة/لوحة في مكان الفعالية، والمستخدم يمسحه من داخل التطبيق؛ يوجد دائمًا خيار **إدخال الرمز يدويًا** كبديل عند تعذّر المسح أو عدم توفر كاميرا.

### الشاشات
- **السؤال الثقافي الأسبوعي**: بطاقة تعريفية في الرئيسية (نفس مستوى بروز "توعية اليوم") + شاشة `app/quiz.tsx` لعرض أسئلة الأسبوع (3 أسئلة، تصنيفات: تاريخ عمان/جغرافيا/علوم/ثقافة عامة كما في المواصفة الأصلية)، مع نتيجة فورية لكل سؤال (صح/خطأ + النقاط المكتسبة) وملخص ختامي.
- **تسجيل الحضور**: `app/check-in.tsx` — ماسح QR (`expo-camera`) + إدخال يدوي كبديل دائم.
- **رصيد النقاط والسجل**: بطاقة صغيرة في الرئيسية وصف الملف الشخصي، وشاشة `app/points-history.tsx` بكل حركة (السبب، النقاط، التاريخ).
- **قائمة المتصدرين**: `app/leaderboard.tsx` — الاسم والمجموع فقط (بدون رقم الهاتف، التزامًا ببند الخصوصية).

### قاعدة البيانات
جداول جديدة في `supabase/schema.sql`: `points_transactions`، `activity_checkins` (+ عمود `check_in_code` على `activities`)، `weekly_quizzes`، `quiz_questions`، `quiz_answers`. **قرار أمني مهم**: العميل لا يقرأ أبدًا `correct_option_index` مباشرة (يقرأ عبر `quiz_questions_public` التي تخفيه)، والتحقق من الإجابة ومنح النقاط يتمّان فقط داخل دالتين موثوقتين على الخادم (`submit_quiz_answer`, `submit_check_in`) — لا يمكن لأي عميل (حتى لو عدّل الطلبات يدويًا) منح نفسه نقاطًا مباشرة. قائمة المتصدرين تُقرأ عبر `leaderboard_view` العلني (اسم + مجموع فقط).

### الحالة الحالية
في وضع البيانات التجريبية (`USE_MOCK_DATA=true`) يعمل كل ما سبق فعليًا بمحاكاة صادقة لهذا المنطق (بيانات وهمية + رمز حضور تجريبي معروف)، بحيث يمكن تجربة التدفق الكامل قبل ربط Supabase الحقيقي.
