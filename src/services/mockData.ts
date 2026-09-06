import type { Activity, Announcement, AwarenessArticle } from "@/types/models";

/**
 * بيانات تجريبية عربية واقعية (بدون Lorem Ipsum) لاختبار التصميم قبل ربط Supabase.
 * التواريخ نسبية إلى تاريخ اليوم بحيث تبقى العروض التجريبية (اليوم / هذا الأسبوع) منطقية دائمًا.
 */
const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    title: "المسابقة الثقافية السنوية",
    description:
      "مسابقة معرفية شاملة تغطي تاريخ عمان، الجغرافيا، العلوم العامة، والثقافة العامة، بمشاركة فرق من مختلف الأقسام. أسئلة متنوعة وجوائز للفرق الثلاثة الأولى.",
    category: "Cultural",
    date: iso(9),
    startTime: "10:00",
    endTime: "12:00",
    location: "قاعة الأنشطة",
    capacity: 60,
    registeredCount: 34,
    registrationStatus: "open",
    registrationDeadline: iso(7),
    createdAt: iso(-20),
  },
  {
    id: "act-2",
    title: "مسابقة السلامة المرورية",
    description:
      "مسابقة توعوية حول قوانين المرور والتصرف الصحيح أثناء القيادة، تتضمن أسئلة مصورة ومواقف عملية.",
    category: "TrafficSafety",
    date: iso(14),
    startTime: "09:30",
    endTime: "11:00",
    location: "الساحة الخارجية",
    capacity: 40,
    registeredCount: 40,
    registrationStatus: "full",
    registrationDeadline: iso(12),
    createdAt: iso(-15),
  },
  {
    id: "act-3",
    title: "محاضرة الأمن السيبراني",
    description:
      "محاضرة توعوية عامة حول حماية الحسابات، كلمات المرور القوية، والتعرف على الروابط المشبوهة والهندسة الاجتماعية.",
    category: "Lecture",
    date: iso(0),
    startTime: "13:00",
    endTime: "14:00",
    location: "قاعة المحاضرات",
    capacity: 80,
    registeredCount: 51,
    registrationStatus: "open",
    registrationDeadline: iso(0),
    createdAt: iso(-10),
  },
  {
    id: "act-4",
    title: "بطولة كرة القدم",
    description: "بطولة كرة القدم السنوية بمشاركة عدة فرق، بنظام خروج المغلوب، على مدار ثلاثة أسابيع.",
    category: "Sports",
    date: iso(3),
    startTime: "16:30",
    endTime: "18:30",
    location: "الملعب الرئيسي",
    capacity: 120,
    registeredCount: 88,
    registrationStatus: "open",
    registrationDeadline: iso(2),
    createdAt: iso(-25),
  },
  {
    id: "act-5",
    title: "نشاط الرماية السنوي",
    description: "نشاط الرماية السنوي المخصص للتسجيل والتنظيم العام فقط، مع ملاحظات عامة حول موعد التجمع.",
    category: "Shooting",
    date: iso(67),
    startTime: "08:00",
    endTime: "11:00",
    location: "الموقع المخصص (يُعلن لاحقًا للمسجلين)",
    capacity: 30,
    registeredCount: 5,
    registrationStatus: "open",
    registrationDeadline: iso(60),
    createdAt: iso(-5),
    isAnnual: true,
  },
  {
    id: "act-6",
    title: "حملة التوعية بأضرار المخدرات",
    description: "حملة أسبوعية تتضمن محاضرات ومواد توعوية حول أضرار المخدرات وطرق الوقاية وطلب المساعدة.",
    category: "AntiDrugs",
    date: iso(20),
    startTime: "10:00",
    endTime: "12:00",
    location: "قاعة الأنشطة",
    registrationStatus: "upcoming",
    createdAt: iso(-3),
  },
  {
    id: "act-7",
    title: "محاضرة حماية المعلومات",
    description: "محاضرة توعوية حول أهمية عدم مشاركة معلومات العمل ومستنداته عبر تطبيقات غير مصرح بها.",
    category: "SecurityAwareness",
    date: iso(2),
    startTime: "11:00",
    endTime: "12:00",
    location: "قاعة المحاضرات",
    capacity: 70,
    registeredCount: 22,
    registrationStatus: "open",
    registrationDeadline: iso(1),
    createdAt: iso(-8),
  },
  {
    id: "act-8",
    title: "مسابقة السلامة الجوية للتوعية العامة",
    description: "مسابقة توعوية عامة في مبادئ السلامة، دون أي معلومات تشغيلية أو فنية.",
    category: "AviationSafety",
    date: iso(30),
    startTime: "09:00",
    location: "قاعة الأنشطة",
    registrationStatus: "upcoming",
    createdAt: iso(-1),
  },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "فتح باب التسجيل في المسابقة الثقافية السنوية",
    description: "تم فتح التسجيل رسميًا في المسابقة الثقافية السنوية. عدد المقاعد محدود.",
    type: "تسجيل",
    publishedAt: iso(-1),
  },
  {
    id: "ann-2",
    title: "اكتمل عدد المسجلين في مسابقة السلامة المرورية",
    description: "وصلت مسابقة السلامة المرورية إلى العدد الكامل من المشاركين.",
    type: "تنبيه",
    publishedAt: iso(-2),
  },
  {
    id: "ann-3",
    title: "بدء بطولة كرة القدم قريبًا",
    description: "تنطلق بطولة كرة القدم السنوية خلال أيام. تابع جدول المباريات من قسم الأنشطة الرياضية.",
    type: "عام",
    publishedAt: iso(-3),
  },
];

export const MOCK_AWARENESS: AwarenessArticle[] = [
  {
    id: "aw-1",
    title: "لا تصوّر كل شيء",
    summary:
      "بعض الصور التي تبدو عادية قد تحتوي على معلومات لا يجب مشاركتها. قبل التصوير أو النشر تأكد دائمًا أن المكان والمحتوى مسموحان.",
    content:
      "قبل التقاط أي صورة أو نشرها على وسائل التواصل الاجتماعي، تحقق من عدم ظهور أي تفاصيل أو خلفيات غير مسموح بمشاركتها. الحذر البسيط يحمي الجميع.",
    category: "أمني",
    publishedAt: iso(0),
  },
  {
    id: "aw-2",
    title: "احذر الروابط المشبوهة",
    summary: "لا تضغط على أي رابط غير معروف المصدر، حتى لو بدا مألوفًا.",
    content:
      "الروابط المشبوهة قد تصل عبر الرسائل النصية أو البريد الإلكتروني أو وسائل التواصل. تحقق دائمًا من مصدر الرابط قبل فتحه، ولا تُدخل بياناتك في أي صفحة غير موثوقة.",
    category: "أمني",
    publishedAt: iso(-1),
  },
  {
    id: "aw-3",
    title: "كلمات المرور القوية",
    summary: "استخدم كلمة مرور مختلفة لكل حساب، وفعّل التحقق بخطوتين متى أمكن.",
    content:
      "تجنب استخدام نفس كلمة المرور في أكثر من حساب، واحرص على أن تكون طويلة وتحتوي على أرقام ورموز، وفعّل خاصية التحقق بخطوتين لحماية إضافية.",
    category: "أمني",
    publishedAt: iso(-2),
  },
];
