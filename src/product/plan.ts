/**
 * شروط البيع — الباقات والمقارنة والإضافات، في ملفٍّ واحد.
 *
 * والأسعارُ تُكتب هنا وحدها: الصفحةُ والتطبيقُ يقرآن منها، فلا يختلف رقمٌ عن
 * رقمٍ في شاشتين.
 */

import { arabicDigits } from "./format";

export type TierId = "basic" | "plus" | "business";

export interface Tier {
  id: TierId;
  /** اسم الباقة كما تُنادى. */
  name: string;
  /** لمن هي — سطرٌ واحد يعرف به صاحب المشروع نفسه. */
  who: string;
  /** السعر بالريال العُماني للسنة. */
  price: number;
  /** شارةٌ صغيرة فوق البطاقة، إن كان لها شارة. */
  badge?: string;
  /** تُبرَز في الصفحة (الوسطى عادةً). */
  featured?: boolean;
  /** سطرُ «وما فوق» — ما تضيفه على الباقة التي قبلها. */
  over?: string;
  /** ما فيها، مرتّبًا من الأهمّ. */
  features: string[];
}

/** الباقات الثلاث. */
export const TIERS: Tier[] = [
  {
    id: "basic",
    name: "العادية",
    who: "لمن يبدأ: محلٌّ واحد، وقائمةٌ يريد أن يراها زبونه في هاتفه.",
    price: 79,
    features: [
      "تطبيقٌ واحد برابطٍ خاص — يفتحه زبونك بلا تحميل",
      "اختر أيّ نوعٍ من الستّة، وبدّله متى شئت",
      "محتواك بلا حدّ: أصناف، خدمات، أطبّاء، دورات",
      "الطلبات والحجوزات تصل واتسابك مكتوبة",
      "رمز QR جاهز للطباعة يُعلَّق في المحل",
      "تعديلٌ بلا حدّ — التغيير يظهر في الحال",
      "بلا إعلانات، وبلا عمولة على طلباتك",
      "دعمٌ على واتساب في أيّام العمل",
    ],
  },
  {
    id: "plus",
    name: "الممتازة",
    who: "لمن قام مشروعه: يريد اسمه على نطاقه، وصورًا تُقنِع، وأرقامًا يقرؤها.",
    price: 149,
    badge: "نوصي بها",
    featured: true,
    over: "كلّ ما في العادية، وفوقه:",
    features: [
      "نطاقٌ باسمك أنت (‎.com) — مسجَّلٌ ومُجدَّد معك",
      "ارفع شعارك وصور منتجاتك — ومعرضُ صورٍ في التطبيق",
      "إحصاءات: كم فتحوه، وماذا فتحوا، ومن أين جاؤوا",
      "واجهةٌ بالعربية والإنجليزية بضغطة",
      "ألوانٌ وخطوطٌ تُفصَّل على هويّتك لا قوالبُ جاهزة",
      "نجهّز أوّل محتواك نيابةً عنك — أرسل قائمتك ونحن نُدخلها",
      "أولويةٌ في الدعم — ردٌّ خلال ساعات العمل نفسها",
      "نسخةٌ احتياطية شهرية من محتواك",
    ],
  },
  {
    id: "business",
    name: "الأعمال",
    who: "للفروع والتوسّع: أكثر من محلّ، ودفعٌ داخل التطبيق، ومن يتابع عنك.",
    price: 249,
    over: "كلّ ما في الممتازة، وفوقه:",
    features: [
      "حتى ثلاثة تطبيقات أو فروع تحت اشتراكٍ واحد",
      "الدفع الإلكتروني داخل التطبيق (بطاقة وثواني)",
      "إشعاراتٌ تصل زبائنك: عرضٌ جديد أو تذكيرٌ بموعد",
      "لوحةُ طلباتٍ وحجوزات بدل الاكتفاء بواتساب",
      "تحديثُ محتوى شهري نقوم به عنك — أرسل التغيير ونفّذناه",
      "تقريرٌ شهري بأرقام مشروعك على واتسابك",
      "ربطٌ بأنظمتك عند الحاجة (كاشير أو مخزون)",
      "مسؤولُ حسابٍ ورقمٌ مباشر — بلا طابور",
    ],
  },
];

/** الباقة الافتراضية في الأزرار السريعة. */
export const DEFAULT_TIER: Tier = TIERS[1];

/** أرخصُ سعرٍ — يُكتب في الصدر والشريط السفلي. */
export const ENTRY_PRICE = TIERS[0].price;

export function tierOf(id: TierId): Tier {
  return TIERS.find((tier) => tier.id === id) ?? TIERS[0];
}

/** «١٤٩ ر.ع.» */
export function priceLabel(price: number): string {
  return `${arabicDigits(price)} ر.ع.`;
}

/** «نحو ١٢٫٤ ر.ع. في الشهر» — لأن السنويّ يُرهب والشهريّ يُقنع. */
export function monthlyLabel(price: number): string {
  return `${arabicDigits((price / 12).toFixed(1).replace(".", "٫"))} ر.ع. في الشهر`;
}

export const PERIOD_LABEL = "للسنة";

/** رقم واتساب المنصّة — إليه يُرسَل طلب الاشتراك حتى تُربط بوابة الدفع. */
export const SALES_WHATSAPP = "96899999999";

/** نصُّ طلب الاشتراك، باقةً باقة. */
export function subscribeText(tier: Tier, project?: string): string {
  const head = `السلام عليكم، أريد الاشتراك في واجهة — الباقة ${tier.name} (${tier.price} ر.ع. للسنة)`;
  return project ? `${head} لمشروع: ${project}` : head;
}

/* ——————————————— جدول المقارنة ——————————————— */

export type Cell = boolean | string;

export interface CompareRow {
  label: string;
  basic: Cell;
  plus: Cell;
  business: Cell;
}

export interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

/**
 * المقارنة — صفًّا صفًّا.
 *
 * وما لا يوجد في باقةٍ يُكتب «لا» صريحةً: من أخفى حدود باقته اشترى الزبونُ
 * ثمّ خاصم.
 */
export const COMPARE: CompareGroup[] = [
  {
    title: "الأساس",
    rows: [
      { label: "عدد التطبيقات أو الفروع", basic: "١", plus: "١", business: "٣" },
      { label: "أنواع التطبيقات الستّة", basic: true, plus: true, business: true },
      { label: "محتوى بلا حدّ (أصناف وخدمات ودورات)", basic: true, plus: true, business: true },
      { label: "تعديلٌ بلا حدّ يظهر في الحال", basic: true, plus: true, business: true },
      { label: "رمز QR للمحل", basic: true, plus: true, business: true },
      { label: "بلا إعلانات وبلا عمولة", basic: true, plus: true, business: true },
    ],
  },
  {
    title: "الاسم والمظهر",
    rows: [
      { label: "الرابط", basic: "wajha.om/اسمك", plus: "نطاقك أنت", business: "نطاقك أنت" },
      { label: "رفع الشعار وصور المنتجات", basic: false, plus: true, business: true },
      { label: "معرض صور داخل التطبيق", basic: false, plus: true, business: true },
      { label: "ألوان وخطوط على هويّتك", basic: "ستّة ألوان", plus: true, business: true },
      { label: "عربي وإنجليزي", basic: false, plus: true, business: true },
    ],
  },
  {
    title: "الطلبات والزبائن",
    rows: [
      { label: "الطلب والحجز على واتسابك", basic: true, plus: true, business: true },
      { label: "لوحة طلباتٍ وحجوزات", basic: false, plus: false, business: true },
      { label: "الدفع الإلكتروني داخل التطبيق", basic: false, plus: false, business: true },
      { label: "إشعارات للزبائن", basic: false, plus: false, business: true },
      { label: "إحصاءات الزيارات", basic: false, plus: true, business: true },
      { label: "تقرير شهري", basic: false, plus: false, business: true },
    ],
  },
  {
    title: "الخدمة والدعم",
    rows: [
      { label: "ندخل محتواك الأوّل عنك", basic: false, plus: true, business: true },
      { label: "تحديث محتوى شهري نقوم به", basic: false, plus: false, business: true },
      { label: "الدعم", basic: "واتساب — أيّام العمل", plus: "أولوية", business: "مسؤول حساب" },
      { label: "نسخة احتياطية شهرية", basic: false, plus: true, business: true },
      { label: "ربط بأنظمتك", basic: false, plus: false, business: true },
    ],
  },
];

/* ——————————————— إضافاتٌ تُطلب وحدها ——————————————— */

export interface Addon {
  icon: string;
  name: string;
  price: string;
  note: string;
}

export const ADDONS: Addon[] = [
  { icon: "globe-outline", name: "نطاق ‎.om عُماني", price: "٢٥ ر.ع. سنويًّا", note: "التسجيل باسمك في هيئة تقنية المعلومات، والتجديد علينا تذكيرُه." },
  { icon: "camera-outline", name: "تصوير منتجاتك", price: "من ٤٠ ر.ع.", note: "جلسةُ تصويرٍ في محلّك بصلالة، والصور تُدخَل في تطبيقك جاهزة." },
  { icon: "create-outline", name: "كتابة المحتوى", price: "٣٠ ر.ع.", note: "أوصافُ أصنافك وخدماتك تُكتب عربيةً سليمة بدل سطرٍ مقتضب." },
  { icon: "phone-portrait-outline", name: "تطبيقٌ إضافي", price: "٤٠ ر.ع. سنويًّا", note: "فرعٌ ثانٍ أو نشاطٌ آخر برابطٍ مستقلّ — على أيّ باقة." },
  { icon: "color-palette-outline", name: "تصميم شعار", price: "٣٥ ر.ع.", note: "شعارٌ بسيطٌ لمن لا شعار له، بثلاث محاولاتٍ يختار منها." },
  { icon: "print-outline", name: "طباعة لوحة QR", price: "١٢ ر.ع.", note: "لوحةٌ أكريليك للطاولة أو الواجهة، تُسلَّم في صلالة." },
];

/* ——————————————— بعد الطلب ——————————————— */

export interface DeliveryStep {
  title: string;
  body: string;
}

export const DELIVERY: DeliveryStep[] = [
  { title: "تُرسل طلبك", body: "ضغطةٌ على واتساب، تخبرنا بنوع مشروعك والباقة. بلا نماذج تُملأ ولا مكالمةِ مبيعات." },
  { title: "نجهّزه ونُريك إيّاه", body: "خلال ٤٨ ساعة عمل يصلك رابطُ تطبيقك باسمك ومحتواك — تفتحه وتقلّبه." },
  { title: "تطلب تعديلك", body: "غيّر ما شئت: لون، ترتيب، سعر، صورة. والتعديلُ في هذه المرحلة بلا حدٍّ ولا رسوم." },
  { title: "تدفع وينشر", body: "عند رضاك تسدّد، فيُفتح الرابط للناس ويصلك رمز QR جاهزًا للطباعة." },
];

/** الضماناتُ التي نلتزم بها، مكتوبةً لا مفهومةً ضمنًا. */
export const PROMISES = [
  { icon: "eye-outline", title: "ترى قبل أن تدفع", body: "لا يُطلب منك ريالٌ واحد حتى يكون تطبيقك أمامك باسمك ومحتواك." },
  { icon: "cash-outline", title: "استرجاعٌ خلال ١٤ يومًا", body: "إن لم يعجبك بعد النشر، تُعاد قيمة اشتراكك كاملةً بلا أسئلة." },
  { icon: "lock-open-outline", title: "محتواك ملكك", body: "تطلب نسخةً من محتواك متى شئت، وتأخذ نطاقك معك إن رحلت." },
  { icon: "pricetag-outline", title: "السعر لا يرتفع عليك", body: "ما دمت مشتركًا فسعرُ تجديدك هو سعرُ اشتراكك الأوّل." },
];

/** طرق الدفع المتاحة اليوم — لا وعودَ عن بوّاباتٍ لم تُربط. */
export const PAYMENT_NOTE =
  "الدفع بالتحويل البنكي أو عند المندوب في صلالة، وبوّابة الدفع الإلكتروني قيد الربط. والاشتراك سنويٌّ يُجدَّد باختيارك، لا يُخصم تلقائيًّا.";
