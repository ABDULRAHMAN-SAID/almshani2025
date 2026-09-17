/**
 * أنواع «واجهة»: ما يملكه صاحب المشروع، وما يُعرض له.
 *
 * والفصل بين القالب والمشروع مقصود: القالب شكلٌ بلا محتوى، والمشروع محتوًى
 * بلا شكل. فيغيّر صاحبُ المشروع قالبه في لمسةٍ واحدة ولا يفقد كلمةً كتبها —
 * وهذا أوّل ما يجرّبه الزبون، وعليه يُقرّر.
 */

/** نوع النشاط — يُختار أوّلًا، وعليه تُرشَّح القوالب. */
export type TradeKey =
  | "food"      // مطاعم ومقاهٍ
  | "beauty"    // صالونات وحلاقة
  | "clinic"    // عيادات وخدمات صحية
  | "shop"      // متاجر وبوتيكات
  | "service"   // ورش وخدمات
  | "office";   // مكاتب واستشارات

export interface Trade {
  key: TradeKey;
  label: string;
  icon: string;
  /** ما يُسمّى به قسمُ «الخدمات» عند هذا النشاط: «القائمة» للمطعم، «الخدمات» للورشة. */
  offerLabel: string;
  /** ما يُسمّى به الزرّ الأوّل: «احجز طاولة»، «احجز موعدًا»، «اطلب الآن». */
  actionLabel: string;
}

/** هيئة الواجهة — ما يفرّق قالبًا عن قالب. */
export interface TemplateSkin {
  /** لون الهوية الأساسي. */
  brand: string;
  /** لونٌ ثانٍ للتدرّج والخلفيات. */
  brandDeep: string;
  /** لون الصفحة. */
  paper: string;
  /** لون البطاقة. */
  card: string;
  /** لون النصّ الأساسي. */
  text: string;
  /** لون النصّ الثانوي. */
  muted: string;
  /** انحناء الزوايا — الحادّ رسميّ، والدائري وديّ. */
  radius: number;
  /** شكل الصدر: صورةٌ ملء الشاشة، أو تدرّج لوني، أو بياضٌ مرتّب. */
  hero: "photo" | "gradient" | "plain";
  /** هل تُعرض العروض شبكةً أم قائمة؟ */
  offerLayout: "grid" | "list";
}

export interface Template {
  id: string;
  name: string;
  /** سطرٌ يقول لمن هذا القالب. */
  pitch: string;
  trade: TradeKey;
  skin: TemplateSkin;
}

/** عرضٌ واحد: صنفٌ في قائمة، أو خدمةٌ بسعرها. */
export interface Offer {
  id: string;
  name: string;
  note?: string;
  /** بالريال العُماني. الصفر يعني «حسب الطلب». */
  price: number;
}

export interface OpeningHours {
  /** «السبت – الخميس» */
  days: string;
  /** «٩ ص – ١٠ م» */
  hours: string;
}

/** مشروع الزبون — كل ما يكتبه ويُعرض في واجهته. */
export interface Project {
  /** يُشتقّ منه الرابط: wajha.om/<slug> */
  slug: string;
  name: string;
  tagline: string;
  about: string;
  trade: TradeKey;
  templateId: string;
  /** لون الهوية إن غيّره عن لون القالب. */
  brand?: string;
  phone: string;
  whatsapp: string;
  /** «صلالة · الحافة» */
  address: string;
  instagram?: string;
  offers: Offer[];
  hours: OpeningHours[];
  /** روابط صور — أو أسماء أصول مبدئية. */
  gallery: string[];
  publishedAt?: string;
}

/** حالة الاشتراك على الجهاز. */
export interface Plan {
  /** متى بدأت التجربة (ISO). */
  trialStartedAt?: string;
  /** هل دُفع الاشتراك؟ */
  subscribed: boolean;
  /** متى ينتهي الاشتراك المدفوع (ISO). */
  paidUntil?: string;
}
