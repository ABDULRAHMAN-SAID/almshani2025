import type { Offer, Project, Template } from "./types";

/**
 * القوالب الستّة.
 *
 * والفرق بينها ليس لونًا فحسب: شكلُ الصدر، وانحناء الزوايا، وهل تُعرض
 * العروض شبكةً أم قائمة. فالمطعم يُرى بالصورة، والمكتب يُقرأ بالسطر — ولو
 * اختلف اللون وحده لبدت الستّة قالبًا واحدًا مصبوغًا ستّ مرّات، وذلك أوّل
 * ما يكشفه الزبون.
 */
export const TEMPLATES: Template[] = [
  {
    id: "nakha",
    name: "نكهة",
    pitch: "للمطاعم والمقاهي — صورةٌ تملأ الصدر، وقائمةٌ بأسعارها.",
    trade: "food",
    skin: {
      brand: "#8C3B1E", brandDeep: "#5C2412", paper: "#FBF6F0", card: "#FFFFFF",
      text: "#241512", muted: "#7A655C", radius: 18, hero: "photo", offerLayout: "list",
    },
  },
  {
    id: "maraya",
    name: "مرايا",
    pitch: "للصالونات — هدوءٌ ومساحةٌ بيضاء، والحجز في المقدّمة.",
    trade: "beauty",
    skin: {
      brand: "#6C4E8F", brandDeep: "#432F5C", paper: "#FAF7FB", card: "#FFFFFF",
      text: "#241C2B", muted: "#79707F", radius: 22, hero: "gradient", offerLayout: "list",
    },
  },
  {
    id: "shifa",
    name: "شفاء",
    pitch: "للعيادات — ثقةٌ وترتيب، والموعد بلمسة.",
    trade: "clinic",
    skin: {
      brand: "#186B77", brandDeep: "#0E464F", paper: "#F4FAFB", card: "#FFFFFF",
      text: "#122326", muted: "#5F7B7F", radius: 14, hero: "plain", offerLayout: "list",
    },
  },
  {
    id: "rufuf",
    name: "رفوف",
    pitch: "للمتاجر — شبكةُ منتجاتٍ تُتصفَّح بالإبهام.",
    trade: "shop",
    skin: {
      brand: "#1F5C42", brandDeep: "#123828", paper: "#F5F8F5", card: "#FFFFFF",
      text: "#15211B", muted: "#66786E", radius: 16, hero: "gradient", offerLayout: "grid",
    },
  },
  {
    id: "udda",
    name: "عدّة",
    pitch: "للورش والخدمات — صريحٌ وواضح، ورقم الهاتف كبير.",
    trade: "service",
    skin: {
      brand: "#B26A12", brandDeep: "#7A460A", paper: "#FBF7F1", card: "#FFFFFF",
      text: "#241B10", muted: "#7B6B55", radius: 10, hero: "photo", offerLayout: "list",
    },
  },
  {
    id: "mihbara",
    name: "مِحبرة",
    pitch: "للمكاتب والاستشارات — رسميٌّ ومختصر، بلا زخرفة.",
    trade: "office",
    skin: {
      brand: "#243B6B", brandDeep: "#152444", paper: "#F7F8FB", card: "#FFFFFF",
      text: "#121826", muted: "#6B7386", radius: 8, hero: "plain", offerLayout: "list",
    },
  },
];

export const TEMPLATE_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, template])
);

const offers = (rows: [string, number, string?][]): Offer[] =>
  rows.map(([name, price, note], index) => ({ id: `o${index}`, name, price, note }));

/**
 * مشروعٌ تجريبيّ لكل قالب.
 *
 * ولماذا محتوًى حقيقيّ لا «نصٌّ تجريبي»؟ لأن الزبون يقرّر بالنظرة الأولى،
 * وقالبٌ مملوءٌ بـ«لوريم إيبسوم» لا يُري كيف سيبدو مشروعه. وهذه أسماءٌ
 * وأسعارٌ عُمانية معقولة، يستبدلها باسمه فيرى مكانه فيها.
 */
export const DEMOS: Record<string, Project> = {
  nakha: {
    slug: "bait-alharees", name: "بيت الهريس", tagline: "مطبخٌ عُمانيّ بيتيّ — صلالة",
    about: "نطبخ كما يُطبخ في البيت: هريسٌ على نارٍ هادئة، ومشاكيك، وقهوةٌ بالهيل. نفتح من العصر إلى منتصف الليل.",
    trade: "food", templateId: "nakha", phone: "99112233", whatsapp: "96899112233",
    address: "صلالة · شارع ٢٣ يوليو", instagram: "bait_alharees",
    offers: offers([["هريس لحم", 2.5, "الطبق"], ["مشاكيك دجاج", 1.8, "عشر أسياخ"], ["مضروبة", 2.0], ["قهوة عُمانية", 0.5, "مع التمر"], ["شواء غنم", 4.5, "نصف كيلو"]]),
    hours: [{ days: "السبت – الخميس", hours: "٤ م – ١٢ ص" }, { days: "الجمعة", hours: "٢ م – ١٢ ص" }],
    gallery: [],
  },
  maraya: {
    slug: "maraya-salon", name: "صالون مرايا", tagline: "عنايةٌ هادئة — بالموعد",
    about: "صالونٌ نسائيّ بالمواعيد فقط، حتى لا تنتظري. شعرٌ وبشرةٌ وعناية، بأيدٍ خبيرة وأدواتٍ معقّمة لكل زبونة.",
    trade: "beauty", templateId: "maraya", phone: "92334455", whatsapp: "96892334455",
    address: "صلالة · الدهاريز", instagram: "maraya_salon_om",
    offers: offers([["قصّ وتصفيف", 8], ["صبغة كاملة", 25, "حسب الطول"], ["عناية بالبشرة", 15], ["مناسبات", 35, "شعر ومكياج"], ["أظافر", 10]]),
    hours: [{ days: "السبت – الخميس", hours: "١٠ ص – ٨ م" }, { days: "الجمعة", hours: "مغلق" }],
    gallery: [],
  },
  shifa: {
    slug: "shifa-clinic", name: "عيادة شفاء", tagline: "أسنانٌ وعنايةٌ عامة",
    about: "عيادةٌ مرخّصة من وزارة الصحة. نستقبل بالموعد وبلا موعد، ونقبل التأمين. أجهزةٌ حديثة وتعقيمٌ لكل حالة.",
    trade: "clinic", templateId: "shifa", phone: "91445566", whatsapp: "96891445566",
    address: "صلالة · الصادة",
    offers: offers([["كشف عام", 5], ["تنظيف أسنان", 15], ["حشوة تجميلية", 20], ["تبييض", 45, "جلسة واحدة"], ["تقويم", 0, "حسب الحالة"]]),
    hours: [{ days: "السبت – الأربعاء", hours: "٨ ص – ١ م · ٤ م – ٩ م" }, { days: "الخميس", hours: "٨ ص – ١ م" }],
    gallery: [],
  },
  rufuf: {
    slug: "rufuf-store", name: "رفوف", tagline: "عطورٌ وبخورٌ ظفاريّ",
    about: "لبانٌ ظفاريّ مُنتقى، وبخورٌ ودهنُ عود، وعطورٌ نُركّبها في المحل. نشحن إلى كل السلطنة خلال يومين.",
    trade: "shop", templateId: "rufuf", phone: "95667788", whatsapp: "96895667788",
    address: "صلالة · سوق الحافة", instagram: "rufuf_om",
    offers: offers([["لبان حوجري", 6, "مئة جرام"], ["بخور معمول", 12, "التولة"], ["دهن عود", 25], ["مبخرة فخار", 4], ["عطر مركّب", 18, "٥٠ مل"], ["علبة هدايا", 30]]),
    hours: [{ days: "السبت – الخميس", hours: "٩ ص – ١ م · ٤ م – ١٠ م" }, { days: "الجمعة", hours: "٤ م – ١٠ م" }],
    gallery: [],
  },
  udda: {
    slug: "udda-workshop", name: "ورشة عدّة", tagline: "صيانةُ سيارات — صلالة",
    about: "ميكانيكا وكهرباء وتكييف. فحصٌ بالكمبيوتر، وقطعٌ أصلية، وضمانٌ ثلاثة أشهر على كل عمل. خدمة على الطريق ٢٤ ساعة.",
    trade: "service", templateId: "udda", phone: "97889900", whatsapp: "96897889900",
    address: "صلالة · صناعية سعادة",
    offers: offers([["تغيير زيت وفلتر", 12], ["فحص كمبيوتر", 5], ["صيانة تكييف", 20], ["فرامل كاملة", 35], ["سحب على الطريق", 15, "داخل صلالة"]]),
    hours: [{ days: "السبت – الخميس", hours: "٧ ص – ٧ م" }, { days: "الطوارئ", hours: "٢٤ ساعة" }],
    gallery: [],
  },
  mihbara: {
    slug: "mihbara-office", name: "مكتب مِحبرة", tagline: "محاسبةٌ واستشاراتٌ للمنشآت",
    about: "نمسك دفاترك، ونقدّم إقرار ضريبة القيمة المضافة، ونسجّل شركتك في وزارة التجارة. للمؤسسات الصغيرة والمتوسطة.",
    trade: "office", templateId: "mihbara", phone: "93221144", whatsapp: "96893221144",
    address: "صلالة · الوادي التجاري",
    offers: offers([["تسجيل سجل تجاري", 40], ["مسك دفاتر شهري", 60, "حتى ٥٠ قيدًا"], ["إقرار ضريبي", 35, "لكل ربع"], ["دراسة جدوى", 150], ["استشارة", 0, "أوّل جلسة مجانًا"]]),
    hours: [{ days: "الأحد – الخميس", hours: "٨ ص – ٤ م" }],
    gallery: [],
  },
};

/** المشروع التجريبيّ لقالبٍ ما. */
export function demoOf(templateId: string): Project {
  return DEMOS[templateId] ?? DEMOS.nakha;
}
