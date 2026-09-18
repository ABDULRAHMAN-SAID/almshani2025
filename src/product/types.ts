/**
 * أنواع «واجهة».
 *
 * والمعروض ليس «قالبَ صفحة» بل **تطبيقًا يعمل**: حجزٌ يُختار موعده، وسلّةٌ
 * تُملأ، ودرسٌ يُفتح. فصاحب المشروع يرى ما سيفعله زبونه لا كيف ستبدو صفحته.
 *
 * والفصل بين النوع والمحتوى مقصود: النوع سلوكٌ وشاشات، والمحتوى اسمٌ وأسعار.
 * فيكتب صاحبُ المحل قائمته مرّةً ويراها في أيّ نوعٍ جرّبه.
 */

/** نوع التطبيق — وعليه تُبنى شاشاته وسلوكه، لا ألوانه فقط. */
export type AppKind =
  | "booking"    // حجز مواعيد
  | "restaurant" // مطعم: قائمة وسلّة وطلب
  | "store"      // متجر إلكتروني
  | "clinic"     // عيادة: أطباء ومواعيد
  | "academy"    // منصّة تعليمية
  | "salon";     // صالون: خدمات وفنّيّات وحجز

export interface KindMeta {
  key: AppKind;
  label: string;
  icon: string;
  /** ما يُسمّى به ما يُباع: «القائمة» للمطعم، «الدورات» للمنصّة. */
  offerLabel: string;
  /** ثلاثة تبويبات لكل نوع — أكثرها يربك في شاشةٍ صغيرة. */
  tabs: { key: string; label: string; icon: string }[];
}

/**
 * شكلُ الصدر.
 *
 * وستّة أشكالٍ لا لونان: لأن اللونَ وحده لا يفرّق تطبيقًا عن تطبيق. ومن رأى
 * ستّةَ نماذجَ هيئتُها واحدةٌ وألوانُها ستّة، قال «قالبٌ واحد مصبوغ» — وصدق.
 * فلكلّ نوعٍ صدرُه: المطعمُ لافتةٌ عريضةٌ تحتها أقسام، والمتجرُ شريطُ بحث،
 * والعيادةُ بياضٌ رسميّ تحته شريطُ حقائق، والمنصّةُ ليلٌ فوقه تحيّة، والصالونُ
 * قوسٌ، والموعدُ غلافٌ يتوسّطه الاسم.
 */
export type HeaderShape =
  | "cover"  // غلافٌ طويل، الاسم في وسطه، وتحته شارات
  | "band"   // لافتةٌ عريضة وتحتها صفحةٌ بيضاء تعلوها
  | "shop"   // بياضٌ مضغوط، وشريطُ بحثٍ تحته
  | "split"  // بياضٌ رسميّ، وتحته شريطُ حقائق ملوّن
  | "dark"   // ليلٌ صافٍ، وتحيّةٌ وبطاقةُ متابعة
  | "arch";  // قوسٌ مستديرُ الطرفين، والاسم في وسطه

/** شكلُ شريط التبويب أسفل الشاشة. */
export type NavShape =
  | "bar"   // شريطٌ مسطّح على عرض الشاشة
  | "pill"  // قرصٌ عائمٌ فوق المحتوى
  | "soft"; // شريطٌ مستديرُ الأعلى، والمختارُ في حبّة

/** شكلُ عرض ما يُباع. */
export type ListShape =
  | "rows"  // أسطرٌ في بطاقةٍ واحدة
  | "menu"  // قائمةُ مطعم: لكل صنفٍ مربّعُه
  | "grid"  // رفوفٌ: مربّعان في السطر
  | "cards"; // بطاقاتٌ منفصلة، لكلٍّ رأسُها

/** هيئة الواجهة — ما يفرّق نوعًا عن نوع في اللون والشكل. */
export interface TemplateSkin {
  brand: string;
  brandDeep: string;
  paper: string;
  card: string;
  text: string;
  muted: string;
  /** انحناء الزوايا — الحادّ رسميّ، والدائري وديّ. */
  radius: number;
  header: HeaderShape;
  nav: NavShape;
  list: ListShape;
  /** سطرٌ قصير يُكتب في صدر التطبيق — يختلف باختلاف النشاط. */
  strap?: string;
  /** ثلاثُ شاراتٍ في الصدر — حقائقُ تُطمئن قبل أن يُقرأ شيء. */
  facts?: string[];
}

export interface Template {
  id: string;
  name: string;
  /** سطرٌ يقول لمن هذا التطبيق وما يفعله. */
  pitch: string;
  kind: AppKind;
  skin: TemplateSkin;
}

/** ما يُباع أو يُحجز: صنفٌ في قائمة، خدمةٌ بمدّتها، منتجٌ بسعره. */
export interface Offer {
  id: string;
  name: string;
  note?: string;
  /** بالريال العُماني. الصفر يعني «حسب الطلب». */
  price: number;
  /** قسمٌ داخل القائمة: «مشاوي»، «حلويات». */
  category?: string;
  /** دقائق — للخدمات المحجوزة. */
  minutes?: number;
}

/** شخصٌ يُحجز عنده: طبيبٌ أو فنّيّة أو مدرّب. */
export interface Person {
  id: string;
  name: string;
  role: string;
  /** «اليوم ٤:٣٠ م» — أقرب موعدٍ متاح. */
  next?: string;
}

/** دورةٌ في المنصّة التعليمية. */
export interface Course {
  id: string;
  name: string;
  teacher: string;
  lessons: number;
  done: number;
  price: number;
}

export interface OpeningHours {
  days: string;
  hours: string;
}

/** مشروع الزبون — كل ما يكتبه ويُعرض في تطبيقه. */
export interface Project {
  slug: string;
  name: string;
  tagline: string;
  about: string;
  kind: AppKind;
  templateId: string;
  brand?: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram?: string;
  offers: Offer[];
  people: Person[];
  courses: Course[];
  hours: OpeningHours[];
  publishedAt?: string;
}
