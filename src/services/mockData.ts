import type {
  Activity,
  Announcement,
  AppNotification,
  AwarenessArticle,
  LeaderboardEntry,
  PointsTransaction,
  WeeklyQuiz,
} from "@/types/models";

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

/** تاريخ ثابت داخل السنة الحالية (للمناسبات السنوية في التقويم). */
const isoInYear = (month: number, day: number) =>
  `${today.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

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
    checkInCode: "CYBER26",
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

  /* ===== المناسبات السنوية الثابتة — تغذّي التقويم الشهري والسنوي ===== */
  {
    id: "yr-01",
    title: "مسابقة الثقافة العامة",
    description: "مسابقة معرفية في بداية العام تشمل الثقافة العامة وتاريخ عمان والعلوم.",
    category: "Cultural",
    date: isoInYear(1, 14),
    startTime: "10:00",
    endTime: "12:00",
    location: "قاعة الأنشطة",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(1, 2),
  },
  {
    id: "yr-02",
    title: "محاضرة التوعية بأمن المعلومات",
    description: "محاضرة توعوية عامة حول حماية الحسابات والبيانات الشخصية.",
    category: "Lecture",
    date: isoInYear(1, 27),
    startTime: "11:00",
    endTime: "12:00",
    location: "قاعة المحاضرات",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(1, 10),
  },
  {
    id: "yr-03",
    title: "بطولة كرة الطائرة",
    description: "بطولة كرة الطائرة السنوية بمشاركة فرق من مختلف الأقسام.",
    category: "Sports",
    date: isoInYear(2, 11),
    startTime: "16:00",
    endTime: "18:00",
    location: "الصالة الرياضية",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(1, 25),
  },
  {
    id: "yr-04",
    title: "فعالية السلامة العامة",
    description: "يوم توعوي حول السلامة العامة والإسعافات الأولية والتصرف في الحالات الطارئة.",
    category: "GeneralSafety",
    date: isoInYear(3, 9),
    startTime: "09:00",
    endTime: "13:00",
    location: "الساحة الخارجية",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(2, 20),
  },
  {
    id: "yr-05",
    title: "أسبوع مكافحة المخدرات",
    description: "حملة توعوية أسبوعية حول أضرار المخدرات وعلامات الخطر وطرق الوقاية وطلب المساعدة.",
    category: "AntiDrugs",
    date: isoInYear(4, 6),
    startTime: "09:00",
    endTime: "12:00",
    location: "قاعة الأنشطة",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(3, 20),
  },
  {
    id: "yr-06",
    title: "محاضرة السلامة الجوية",
    description: "محاضرة توعوية عامة في مبادئ السلامة، دون أي محتوى تشغيلي أو فني.",
    category: "AviationSafety",
    date: isoInYear(5, 19),
    startTime: "10:00",
    endTime: "11:30",
    location: "قاعة المحاضرات",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(5, 1),
  },
  {
    id: "yr-07",
    title: "سباق الجري السنوي",
    description: "سباق جري مفتوح لجميع المشاركين على مسار محدد داخل مرافق الأنشطة.",
    category: "Sports",
    date: isoInYear(6, 15),
    startTime: "06:30",
    endTime: "08:00",
    location: "مسار الجري",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(6, 1),
  },
  {
    id: "yr-08",
    title: "مسابقة قوانين المرور",
    description: "مسابقة توعوية في قوانين المرور والتصرف الصحيح أثناء القيادة.",
    category: "TrafficSafety",
    date: isoInYear(7, 21),
    startTime: "09:30",
    endTime: "11:00",
    location: "قاعة الأنشطة",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(7, 5),
  },
  {
    id: "yr-09",
    title: "بطولة تنس الطاولة",
    description: "بطولة تنس الطاولة بنظام المجموعات ثم الأدوار الإقصائية.",
    category: "Sports",
    date: isoInYear(8, 12),
    startTime: "17:00",
    endTime: "19:00",
    location: "الصالة الرياضية",
    registrationStatus: "ended",
    isAnnual: true,
    createdAt: isoInYear(8, 1),
  },
  {
    id: "yr-10",
    title: "ملتقى التثقيف الأمني",
    description: "ملتقى توعوي عام حول حماية المعلومات والحذر من الحسابات الوهمية والهندسة الاجتماعية.",
    category: "SecurityAwareness",
    date: isoInYear(10, 8),
    startTime: "10:00",
    endTime: "12:00",
    location: "قاعة المحاضرات",
    capacity: 90,
    registeredCount: 12,
    registrationStatus: "upcoming",
    isAnnual: true,
    createdAt: iso(-4),
  },
  {
    id: "yr-11",
    title: "مسابقة الإسعافات الأولية",
    description: "مسابقة عملية في مبادئ الإسعافات الأولية العامة والتصرف في الحالات الطارئة.",
    category: "GeneralSafety",
    date: isoInYear(11, 24),
    startTime: "09:00",
    endTime: "12:00",
    location: "قاعة الأنشطة",
    registrationStatus: "upcoming",
    isAnnual: true,
    createdAt: iso(-2),
  },
  {
    id: "yr-12",
    title: "الحفل الختامي للأنشطة السنوية",
    description: "حفل ختامي لتكريم الفائزين في المسابقات والبطولات وإعلان أبرز إنجازات العام.",
    category: "Cultural",
    date: isoInYear(12, 17),
    startTime: "18:00",
    endTime: "20:00",
    location: "قاعة الأنشطة",
    registrationStatus: "upcoming",
    isAnnual: true,
    createdAt: iso(-2),
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

/** رمز الحضور التجريبي — أدخله في شاشة "تسجيل الحضور" لمحاكاة مسح QR فعلي. */
export const DEMO_CHECK_IN_ACTIVITY_ID = "act-3";
export const DEMO_CHECK_IN_CODE = "CYBER26";

export const MOCK_WEEKLY_QUIZ: WeeklyQuiz = {
  id: "quiz-2026-w37",
  weekLabel: "الأسبوع 37 — سبتمبر 2026",
  startDate: iso(-2),
  endDate: iso(4),
  status: "open",
  questions: [
    {
      id: "q1",
      quizId: "quiz-2026-w37",
      text: "ما هي عاصمة سلطنة عمان؟",
      options: ["صلالة", "مسقط", "نزوى", "صحار"],
      category: "جغرافيا",
      correctOptionIndex: 1,
    },
    {
      id: "q2",
      quizId: "quiz-2026-w37",
      text: "في أي عام تولى السلطان هيثم بن طارق مقاليد الحكم؟",
      options: ["2018", "2019", "2020", "2021"],
      category: "تاريخ عمان",
      correctOptionIndex: 2,
    },
    {
      id: "q3",
      quizId: "quiz-2026-w37",
      text: "ما اسم أعلى قمة جبلية في عمان؟",
      options: ["جبل شمس", "جبل الأخضر", "جبل سمحان", "جبل قارة"],
      category: "جغرافيا",
      correctOptionIndex: 0,
    },
  ],
};

export const MOCK_POINTS_TRANSACTIONS: PointsTransaction[] = [
  {
    id: "pt-1",
    userId: "me",
    reason: "lecture_attendance",
    points: 10,
    activityTitle: "محاضرة حماية المعلومات",
    createdAt: iso(-6),
  },
  {
    id: "pt-2",
    userId: "me",
    reason: "quiz_correct",
    points: 10,
    createdAt: iso(-2),
  },
  {
    id: "pt-3",
    userId: "me",
    reason: "activity_participation",
    points: 10,
    activityTitle: "بطولة كرة القدم",
    createdAt: iso(-1),
  },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { userId: "u1", name: "سالم البلوشي", totalPoints: 180, rank: 1 },
  { userId: "u2", name: "خالد الشيدي", totalPoints: 150, rank: 2 },
  { userId: "u3", name: "أحمد الرواحي", totalPoints: 120, rank: 3 },
  { userId: "u4", name: "ياسر الهنائي", totalPoints: 90, rank: 4 },
  { userId: "u5", name: "بدر الكندي", totalPoints: 60, rank: 5 },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    userId: "me",
    title: "تم فتح التسجيل في مسابقة السلامة المرورية",
    body: "التسجيل متاح الآن حتى امتلاء المقاعد. سارع بالتسجيل من قسم المسابقات.",
    read: false,
    createdAt: iso(0),
  },
  {
    id: "n-2",
    userId: "me",
    title: "تذكير: محاضرتك غدًا الساعة 11:00",
    body: "محاضرة حماية المعلومات — قاعة المحاضرات. لا تنسَ تسجيل حضورك برمز القاعة.",
    read: false,
    createdAt: iso(-1),
  },
  {
    id: "n-3",
    userId: "me",
    title: "تبقى يومان على إغلاق التسجيل",
    body: "بطولة كرة القدم — أغلق التسجيل بعد يومين من الآن.",
    read: true,
    createdAt: iso(-2),
  },
  {
    id: "n-4",
    userId: "me",
    title: "أسئلة الأسبوع الثقافية متاحة",
    body: "ثلاثة أسئلة جديدة بانتظارك، 10 نقاط لكل إجابة صحيحة.",
    read: true,
    createdAt: iso(-3),
  },
];

/** تصنيفات المحتوى التوعوي كما تظهر في تبويب التوعية. */
export const AWARENESS_CATEGORIES = ["أمني", "مكافحة المخدرات", "السلامة"] as const;

export const MOCK_AWARENESS_LIBRARY: AwarenessArticle[] = [
  ...MOCK_AWARENESS,
  {
    id: "aw-4",
    title: "الهندسة الاجتماعية",
    summary: "قد يحاول شخص انتحال صفة زميل أو جهة رسمية لانتزاع معلومات منك.",
    content:
      "الهندسة الاجتماعية أسلوب يعتمد على خداع الشخص بدل اختراق الأجهزة. قد تصلك مكالمة أو رسالة من شخص يدّعي أنه من جهة رسمية أو زميل عمل ويطلب معلومات أو رمز تحقق. لا تشارك أي معلومة أو رمز مهما بدا الطلب مقنعًا، وتحقق من هوية المتصل عبر قناة تعرفها مسبقًا.",
    category: "أمني",
    publishedAt: iso(-4),
  },
  {
    id: "aw-5",
    title: "لا ترسل مستندات العمل عبر تطبيقات غير مصرح بها",
    summary: "مشاركة الوثائق عبر تطبيقات شخصية تُخرجها من نطاق الحماية.",
    content:
      "إرسال المستندات عبر تطبيقات المحادثة الشخصية يعني أن نسخة منها صارت خارج القنوات المصرح بها، وقد تبقى على أجهزة أو خوادم لا تخضع لأي حماية. استخدم القنوات الرسمية المعتمدة فقط لتبادل أي مستند يخص العمل.",
    category: "أمني",
    publishedAt: iso(-5),
  },
  {
    id: "aw-6",
    title: "شبكات Wi-Fi العامة",
    summary: "تجنّب إدخال بياناتك الحساسة أثناء الاتصال بشبكة عامة.",
    content:
      "الشبكات العامة في المقاهي والمطارات قد تكون غير محمية أو يديرها طرف غير موثوق. تجنّب تسجيل الدخول إلى حساباتك المهمة أثناء استخدامها، واستخدم بيانات الهاتف عند الحاجة لعملية حساسة.",
    category: "أمني",
    publishedAt: iso(-6),
  },
  {
    id: "aw-7",
    title: "فقدان الهاتف",
    summary: "أبلغ فورًا وغيّر كلمات المرور، وفعّل قفل الشاشة مسبقًا.",
    content:
      "الهاتف يحمل حساباتك ورسائلك وصورك. فعّل قفل الشاشة والتتبع عن بُعد مسبقًا، وعند الفقدان بادر بتغيير كلمات مرور حساباتك المهمة وأبلغ الجهة المختصة فورًا.",
    category: "أمني",
    publishedAt: iso(-7),
  },
  {
    id: "ad-1",
    title: "أضرار المخدرات على الصحة",
    summary: "أثر مباشر على الدماغ والقلب والكبد، وتدهور يصعب علاجه لاحقًا.",
    content:
      "تؤثر المواد المخدرة على الجهاز العصبي فتضعف التركيز والذاكرة واتخاذ القرار، وتُرهق القلب والكبد والكلى. كثير من الأضرار تتراكم بصمت ولا تظهر إلا بعد فوات فرصة العلاج المبكر.",
    category: "مكافحة المخدرات",
    publishedAt: iso(-2),
  },
  {
    id: "ad-2",
    title: "علامات الخطر المبكرة",
    summary: "تغيّر مفاجئ في السلوك والنوم والأصدقاء والاهتمامات.",
    content:
      "من العلامات التي تستدعي الانتباه: انسحاب مفاجئ من الأسرة والأصدقاء، تغيّر في مواعيد النوم والشهية، إهمال المظهر والواجبات، تقلب حاد في المزاج، وظهور أصدقاء جدد مع كتمان شديد. ملاحظة هذه العلامات مبكرًا تصنع فرقًا كبيرًا.",
    category: "مكافحة المخدرات",
    publishedAt: iso(-3),
  },
  {
    id: "ad-3",
    title: "طرق الوقاية",
    summary: "الوعي، والصحبة الصالحة، وشغل الوقت بما ينفع.",
    content:
      "الوقاية تبدأ بالمعرفة الصحيحة عن الأضرار، وباختيار الصحبة، وبملء وقت الفراغ بالرياضة والأنشطة والهوايات، وبعلاقة أسرية مفتوحة يستطيع فيها الشخص أن يتحدث عن ضغوطه قبل أن تكبر.",
    category: "مكافحة المخدرات",
    publishedAt: iso(-4),
  },
  {
    id: "ad-4",
    title: "طلب المساعدة ليس ضعفًا",
    summary: "التعافي ممكن، والمبادرة بطلب العلاج هي أقصر الطرق إليه.",
    content:
      "من وقع في التعاطي يحتاج علاجًا ودعمًا لا لومًا. طلب المساعدة من الجهات الصحية المختصة مبكرًا يرفع فرص التعافي كثيرًا، ودعم الأسرة والزملاء عنصر أساسي في استمرار العلاج.",
    category: "مكافحة المخدرات",
    publishedAt: iso(-5),
  },
  {
    id: "sf-1",
    title: "السلامة المرورية: قبل أن تنطلق",
    summary: "حزام الأمان، وفحص سريع للمركبة، وهاتف بعيد عن يدك.",
    content:
      "ثبّت حزام الأمان قبل تشغيل المركبة، وتأكد من الإطارات والأضواء بنظرة سريعة، واضبط المرايا. ضع الهاتف بعيدًا عن متناول يدك أثناء القيادة — نظرة واحدة تكفي لوقوع حادث.",
    category: "السلامة",
    publishedAt: iso(-1),
  },
  {
    id: "sf-2",
    title: "التصرف في الحالات الطارئة",
    summary: "أمّن المكان، اطلب المساعدة، ثم قدّم ما تُحسنه فقط.",
    content:
      "في أي حالة طارئة: تأكد أولًا من أن المكان آمن لك وللمصاب، اتصل بالجهات المختصة وحدد الموقع بدقة، ثم قدّم المساعدة في حدود ما تدربت عليه فقط. تحريك المصاب دون حاجة قد يزيد الإصابة سوءًا.",
    category: "السلامة",
    publishedAt: iso(-2),
  },
  {
    id: "sf-3",
    title: "الإسعافات الأولية العامة",
    summary: "مبادئ بسيطة تُحدث فرقًا في الدقائق الأولى.",
    content:
      "اضغط مباشرة على مكان النزيف بقطعة نظيفة لإيقافه، وبرّد الحروق البسيطة بالماء الجاري دون ثلج، وأبقِ المصاب هادئًا ودافئًا حتى وصول المختصين. لا تعطِ المصاب طعامًا أو شرابًا إذا كان غائبًا عن الوعي.",
    category: "السلامة",
    publishedAt: iso(-3),
  },
  {
    id: "sf-4",
    title: "السلامة أثناء الأنشطة الرياضية",
    summary: "إحماء قبل، وترطيب أثناء، وتوقف عند أي ألم.",
    content:
      "خصّص وقتًا للإحماء قبل أي نشاط رياضي، واشرب الماء بانتظام خصوصًا في الأجواء الحارة، وارتدِ الحذاء المناسب. عند الشعور بألم حاد أو دوخة توقف فورًا ولا تكمل.",
    category: "السلامة",
    publishedAt: iso(-4),
  },
];
