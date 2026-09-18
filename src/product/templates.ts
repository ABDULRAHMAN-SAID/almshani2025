import type { Course, Offer, Person, Project, Template } from "./types";

/**
 * ستّة تطبيقاتٍ لا ستّة ألوان.
 *
 * ولكلٍّ منها شاشاتُه وسلوكُه **وهيئتُه**: صدرٌ يختلف شكلًا لا لونًا، وشريطُ
 * تبويبٍ يختلف موضعًا، وعرضٌ لما يُباع يختلف بنيةً — سطرًا أو مربّعًا أو
 * بطاقةً. فمن قلّب بينها رأى ستّةَ تطبيقات، لا واحدًا صُبغ ستّ مرّات.
 */
export const TEMPLATES: Template[] = [
  {
    id: "mawaid", name: "مواعيد", kind: "booking",
    pitch: "لمن يعمل بالموعد — يختار الزبون الخدمة واليوم والساعة ويؤكّد.",
    skin: {
      brand: "#186B77", brandDeep: "#0E464F", paper: "#F3FAFB", card: "#FFFFFF",
      text: "#112326", muted: "#5F7B7F", radius: 16,
      header: "cover", nav: "pill", list: "rows",
      facts: ["مفتوح اليوم", "ردٌّ خلال دقائق", "بالموعد"],
    },
  },
  {
    id: "nakha", name: "نكهة", kind: "restaurant",
    pitch: "للمطاعم والمقاهي — قائمةٌ وسلّةٌ وطلبٌ يصل واتسابك.",
    skin: {
      brand: "#8C3B1E", brandDeep: "#5C2412", paper: "#FBF6F0", card: "#FFFFFF",
      text: "#241512", muted: "#7A655C", radius: 18,
      header: "band", nav: "bar", list: "menu",
      strap: "التوصيل خلال ٤٠ دقيقة داخل صلالة",
    },
  },
  {
    id: "rufuf", name: "رفوف", kind: "store",
    pitch: "متجرٌ إلكتروني — منتجاتٌ وسلّةٌ وحسابُ التوصيل.",
    skin: {
      brand: "#1F5C42", brandDeep: "#123828", paper: "#F5F8F5", card: "#FFFFFF",
      text: "#15211B", muted: "#66786E", radius: 16,
      header: "shop", nav: "bar", list: "grid",
      strap: "شحنٌ مجّاني للطلبات فوق ٢٠ ر.ع.",
    },
  },
  {
    id: "shifa", name: "شفاء", kind: "clinic",
    pitch: "للعيادات — أطبّاءٌ بتخصّصاتهم، وحجزٌ بأقرب موعد.",
    skin: {
      brand: "#245C9E", brandDeep: "#153B69", paper: "#F5F8FC", card: "#FFFFFF",
      text: "#122130", muted: "#61758A", radius: 14,
      header: "split", nav: "bar", list: "cards",
      facts: ["يقبل التأمين", "بموعدٍ وبدونه", "٨ ص – ٩ م"],
    },
  },
  {
    id: "minassa", name: "منصّة", kind: "academy",
    pitch: "منصّةٌ تعليمية — دوراتٌ ودروسٌ وتقدّمٌ يُحفظ.",
    skin: {
      brand: "#6C4E8F", brandDeep: "#432F5C", paper: "#FAF7FB", card: "#FFFFFF",
      text: "#241C2B", muted: "#79707F", radius: 20,
      header: "dark", nav: "pill", list: "cards",
      strap: "أهلًا بك 👋",
    },
  },
  {
    id: "maraya", name: "مرايا", kind: "salon",
    pitch: "للصالونات — خدماتٌ بمدّتها، وفريقٌ يُختار منه، وحجز.",
    skin: {
      brand: "#A8456B", brandDeep: "#6E2844", paper: "#FDF6F9", card: "#FFFFFF",
      text: "#2B1720", muted: "#856874", radius: 22,
      header: "arch", nav: "soft", list: "rows",
      strap: "احجزي موعدكِ في دقيقة",
    },
  },
];

export const TEMPLATE_BY_ID: Record<string, Template> = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, template])
);

/** أصدرُ داكنٌ أم فاتح — وعليه يُلوَّن شريطُ حالة الهاتف فوقه. */
const DARK_HEADERS = new Set(["cover", "band", "dark", "arch"]);
export function statusTintOf(template: Template): string {
  return DARK_HEADERS.has(template.skin.header) ? "#FFFFFF" : template.skin.text;
}

const offers = (rows: [string, number, string?, string?, number?][]): Offer[] =>
  rows.map(([name, price, note, category, minutes], i) => ({ id: `o${i}`, name, price, note, category, minutes }));
const people = (rows: [string, string, string?][]): Person[] =>
  rows.map(([name, role, next], i) => ({ id: `p${i}`, name, role, next }));
const courses = (rows: [string, string, number, number, number][]): Course[] =>
  rows.map(([name, teacher, lessons, done, price], i) => ({ id: `c${i}`, name, teacher, lessons, done, price }));

/**
 * مشروعٌ تجريبيّ لكل نوع — بمحتوًى عُمانيّ حقيقي.
 *
 * ولا «لوريم إيبسوم»: الزبون يقرّر بالنظرة الأولى، وتطبيقٌ مملوءٌ بنصٍّ
 * تجريبيّ لا يُري كيف سيبدو مشروعه.
 */
export const DEMOS: Record<string, Project> = {
  mawaid: {
    slug: "mawaid", name: "استوديو ظفار", tagline: "تصويرٌ بالموعد — صلالة",
    about: "استوديو تصويرٍ للمناسبات وصور المستندات. الحجز بالموعد حتى لا تنتظر، والتسليم في اليوم نفسه.",
    kind: "booking", templateId: "mawaid", phone: "99112233", whatsapp: "96899112233",
    address: "صلالة · الدهاريز", instagram: "dhofar_studio",
    offers: offers([["جلسة عائلية", 25, "داخل الاستوديو", undefined, 45], ["صور مستندات", 3, "ست صور", undefined, 10], ["تغطية مناسبة", 90, "ثلاث ساعات", undefined, 180], ["تصوير منتجات", 40, "عشرة منتجات", undefined, 60]]),
    people: people([["سالم", "مصوّر", "اليوم ٤:٣٠ م"], ["منى", "مصوّرة", "غدًا ١٠:٠٠ ص"]]),
    courses: [],
    hours: [{ days: "السبت – الخميس", hours: "٩ ص – ٩ م" }, { days: "الجمعة", hours: "٤ م – ٩ م" }],
  },
  nakha: {
    slug: "bait-alharees", name: "بيت الهريس", tagline: "مطبخٌ عُمانيّ بيتيّ — صلالة",
    about: "نطبخ كما يُطبخ في البيت: هريسٌ على نارٍ هادئة، ومشاكيك، وقهوةٌ بالهيل. التوصيل داخل صلالة خلال أربعين دقيقة.",
    kind: "restaurant", templateId: "nakha", phone: "99112233", whatsapp: "96899112233",
    address: "صلالة · شارع ٢٣ يوليو", instagram: "bait_alharees",
    offers: offers([
      ["هريس لحم", 2.5, "الطبق", "الأطباق"], ["مضروبة", 2.0, undefined, "الأطباق"],
      ["مشاكيك دجاج", 1.8, "عشر أسياخ", "المشاوي"], ["شواء غنم", 4.5, "نصف كيلو", "المشاوي"],
      ["قهوة عُمانية", 0.5, "مع التمر", "المشروبات"], ["شاي كرك", 0.3, undefined, "المشروبات"],
    ]),
    people: [], courses: [],
    hours: [{ days: "السبت – الخميس", hours: "٤ م – ١٢ ص" }, { days: "الجمعة", hours: "٢ م – ١٢ ص" }],
  },
  rufuf: {
    slug: "rufuf", name: "رفوف", tagline: "عطورٌ وبخورٌ ظفاريّ",
    about: "لبانٌ ظفاريّ مُنتقى، وبخورٌ ودهنُ عود، وعطورٌ نُركّبها في المحل. نشحن إلى كل السلطنة خلال يومين.",
    kind: "store", templateId: "rufuf", phone: "95667788", whatsapp: "96895667788",
    address: "صلالة · سوق الحافة", instagram: "rufuf_om",
    offers: offers([
      ["لبان حوجري", 6, "مئة جرام", "لبان"], ["لبان شذري", 9, "مئة جرام", "لبان"],
      ["بخور معمول", 12, "التولة", "بخور"], ["دهن عود", 25, undefined, "بخور"],
      ["مبخرة فخار", 4, undefined, "أدوات"], ["علبة هدايا", 30, "لبان وبخور ومبخرة", "أدوات"],
    ]),
    people: [], courses: [],
    hours: [{ days: "السبت – الخميس", hours: "٩ ص – ١ م · ٤ م – ١٠ م" }, { days: "الجمعة", hours: "٤ م – ١٠ م" }],
  },
  shifa: {
    slug: "shifa", name: "عيادة شفاء", tagline: "أسنانٌ وعنايةٌ عامة",
    about: "عيادةٌ مرخّصة من وزارة الصحة. نستقبل بالموعد وبلا موعد، ونقبل التأمين. أجهزةٌ حديثة وتعقيمٌ لكل حالة.",
    kind: "clinic", templateId: "shifa", phone: "91445566", whatsapp: "96891445566",
    address: "صلالة · الصادة",
    offers: offers([["كشف عام", 5, undefined, undefined, 20], ["تنظيف أسنان", 15, undefined, undefined, 30], ["حشوة تجميلية", 20, undefined, undefined, 45], ["تبييض", 45, "جلسة واحدة", undefined, 60]]),
    people: people([
      ["د. خالد المعشني", "أسنان", "اليوم ٥:٠٠ م"],
      ["د. أميرة البلوشي", "جلدية", "غدًا ٩:٣٠ ص"],
      ["د. سعيد الشحري", "باطنية", "اليوم ٧:١٥ م"],
    ]),
    courses: [],
    hours: [{ days: "السبت – الأربعاء", hours: "٨ ص – ١ م · ٤ م – ٩ م" }, { days: "الخميس", hours: "٨ ص – ١ م" }],
  },
  minassa: {
    slug: "minassa", name: "منصّة ظفار", tagline: "دوراتٌ بالعربية — تعلّم بوقتك",
    about: "دوراتٌ قصيرة بالعربية في المحاسبة والتصوير واللغة. كل دورةٍ دروسٌ مسجّلة، وشهادةٌ عند الإتمام.",
    kind: "academy", templateId: "minassa", phone: "93221144", whatsapp: "96893221144",
    address: "صلالة · الوادي التجاري", instagram: "minassat_dhofar",
    offers: [], people: [],
    courses: courses([
      ["أساسيات المحاسبة", "أ. سالم الشنفري", 18, 11, 25],
      ["التصوير بالجوال", "أ. منى الكثيري", 12, 3, 15],
      ["الإنجليزية للأعمال", "أ. ليلى المعشنية", 24, 0, 35],
      ["إدارة المتاجر الصغيرة", "أ. خالد الشحري", 9, 9, 20],
    ]),
    hours: [{ days: "الدعم الفنّي", hours: "٩ ص – ٦ م" }],
  },
  maraya: {
    slug: "maraya", name: "صالون مرايا", tagline: "عنايةٌ هادئة — بالموعد",
    about: "صالونٌ نسائيّ بالمواعيد فقط، حتى لا تنتظري. شعرٌ وبشرةٌ وعناية، بأيدٍ خبيرة وأدواتٍ معقّمة لكل زبونة.",
    kind: "salon", templateId: "maraya", phone: "92334455", whatsapp: "96892334455",
    address: "صلالة · الدهاريز", instagram: "maraya_salon_om",
    offers: offers([["قصّ وتصفيف", 8, undefined, undefined, 40], ["صبغة كاملة", 25, "حسب الطول", undefined, 120], ["عناية بالبشرة", 15, undefined, undefined, 45], ["مناسبات", 35, "شعر ومكياج", undefined, 150], ["أظافر", 10, undefined, undefined, 35]]),
    people: people([["نورة", "تصفيف", "اليوم ٦:٠٠ م"], ["هدى", "بشرة", "اليوم ٧:٣٠ م"], ["ريم", "أظافر", "غدًا ١١:٠٠ ص"]]),
    courses: [],
    hours: [{ days: "السبت – الخميس", hours: "١٠ ص – ٨ م" }, { days: "الجمعة", hours: "مغلق" }],
  },
};

export function demoOf(templateId: string): Project {
  return DEMOS[templateId] ?? DEMOS.mawaid;
}
