/**
 * أماكن عُمان التي يُنسب إليها الطقس.
 *
 * ولماذا جدول مكتوب لا خدمة تسمية عكسية؟ لأن الأولى تحتاج مفتاحًا ومزوّدًا
 * وشبكةً ثالثة، وتُخطئ في الصحراء فتقول اسم ولاية بعيدة أو لا تقول شيئًا.
 * وهذا الجدول يعمل بلا شبكة ولا مفتاح، ويكفي لمن يتنقّل بين قواعد السلطنة
 * ومدنها: أقرب اسم إلى إحداثيّتك هو ما يُكتب.
 *
 * والمسافة تُحسب بالتقريب الكروي، وهو دقيق كفاية على هذه المسافات: خطأ
 * بضعة كيلومترات لا يغيّر «أقرب مدينة» ما لم تكن بين مدينتين متجاورتين —
 * وحينها أيّهما كُتب فهو صحيح.
 */
export interface Place {
  key: string;
  name: string;
  lat: number;
  lon: number;
  /** قاعدة جوية؟ تُعرض أولًا في الاختيار اليدوي — هي وجهات من يستعمل التطبيق. */
  base?: boolean;
}

export const PLACES: Place[] = [
  { key: "salalah", name: "صلالة", lat: 17.0387, lon: 54.0913, base: true },
  { key: "thumrait", name: "ثمريت", lat: 17.6660, lon: 54.0246, base: true },
  { key: "masirah", name: "مصيرة", lat: 20.6754, lon: 58.8903, base: true },
  { key: "khasab", name: "خصب", lat: 26.1799, lon: 56.2437, base: true },
  { key: "seeb", name: "السيب", lat: 23.6700, lon: 58.1891, base: true },
  { key: "musannah", name: "المصنعة", lat: 23.7601, lon: 57.6106, base: true },
  { key: "adam", name: "أدم", lat: 22.3794, lon: 57.5272 },
  { key: "muscat", name: "مسقط", lat: 23.5880, lon: 58.3829 },
  { key: "nizwa", name: "نزوى", lat: 22.9333, lon: 57.5333 },
  { key: "sohar", name: "صحار", lat: 24.3473, lon: 56.7089 },
  { key: "sur", name: "صور", lat: 22.5667, lon: 59.5289 },
  { key: "ibri", name: "عبري", lat: 23.2254, lon: 56.5158 },
  { key: "ibra", name: "إبراء", lat: 22.6906, lon: 58.5334 },
  { key: "duqm", name: "الدقم", lat: 19.6586, lon: 57.7060 },
  { key: "haima", name: "هيما", lat: 19.9597, lon: 56.2789 },
  { key: "taqah", name: "طاقة", lat: 17.0397, lon: 54.4014 },
  { key: "mirbat", name: "مرباط", lat: 16.9925, lon: 54.6944 },
  { key: "dhalkut", name: "ضلكوت", lat: 16.7042, lon: 53.2569 },
  { key: "muqshin", name: "مقشن", lat: 19.5333, lon: 54.8833 },
  { key: "sadah", name: "سدح", lat: 17.0500, lon: 55.0667 },
  { key: "rakhyut", name: "رخيوت", lat: 16.7333, lon: 53.4000 },
  { key: "mazyunah", name: "المزيونة", lat: 17.9000, lon: 52.7333 },
  { key: "shalim", name: "شليم", lat: 18.1667, lon: 55.8333 },
  { key: "buraimi", name: "البريمي", lat: 24.2500, lon: 55.7931 },
  { key: "rustaq", name: "الرستاق", lat: 23.3908, lon: 57.4244 },
  { key: "bahla", name: "بهلاء", lat: 22.9667, lon: 57.3000 },
  { key: "khasab-bukha", name: "بخاء", lat: 26.1500, lon: 56.1333 },
  { key: "dibba", name: "دبا", lat: 25.6167, lon: 56.2667 },
  { key: "shinas", name: "شناص", lat: 24.7442, lon: 56.4667 },
  { key: "liwa", name: "لوى", lat: 24.5306, lon: 56.5639 },
  { key: "saham", name: "صحم", lat: 24.1722, lon: 56.8886 },
  { key: "khaburah", name: "الخابورة", lat: 23.9739, lon: 57.0917 },
  { key: "suwaiq", name: "السويق", lat: 23.8492, lon: 57.4383 },
  { key: "barka", name: "بركاء", lat: 23.7081, lon: 57.8890 },
  { key: "nakhal", name: "نخل", lat: 23.3956, lon: 57.8244 },
  { key: "samail", name: "سمائل", lat: 23.3050, lon: 57.9750 },
  { key: "quriyat", name: "قريات", lat: 23.2586, lon: 58.9161 },
  { key: "hamra", name: "الحمراء", lat: 23.1167, lon: 57.2833 },
  { key: "yanqul", name: "ينقل", lat: 23.5833, lon: 56.5333 },
  { key: "dhank", name: "ضنك", lat: 23.5500, lon: 56.2500 },
  { key: "mahdah", name: "محضة", lat: 24.4167, lon: 55.9500 },
  { key: "izki", name: "إزكي", lat: 22.9333, lon: 57.7667 },
  { key: "mudhaibi", name: "المضيبي", lat: 22.5700, lon: 58.1200 },
  { key: "bidiyah", name: "بدية", lat: 22.4500, lon: 58.8000 },
  { key: "jalan", name: "جعلان بني بو علي", lat: 22.0167, lon: 59.3333 },
  { key: "mahout", name: "محوت", lat: 20.8667, lon: 58.1333 },
];

/** مسافة تقريبية بالكيلومترات بين نقطتين. */
export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** أقرب مكان معروف إلى إحداثيّة، ومسافته. */
export function nearestPlace(lat: number, lon: number): { place: Place; km: number } {
  let best = PLACES[0];
  let bestKm = Infinity;
  for (const place of PLACES) {
    const km = distanceKm(lat, lon, place.lat, place.lon);
    if (km < bestKm) {
      best = place;
      bestKm = km;
    }
  }
  return { place: best, km: bestKm };
}

/**
 * الاسم الذي يُكتب فوق الطقس.
 *
 * وإن كان أقرب مكانٍ بعيدًا — في البحر أو في الربع الخالي — فالصدق أن يقال
 * «قرب فلانة» لا أن يُنسب الطقس إلى مدينة على بعد مئتي كيلومتر.
 */
export function placeLabel(lat: number, lon: number): string {
  const { place, km } = nearestPlace(lat, lon);
  if (km <= 25) return place.name;
  if (km <= 120) return `قرب ${place.name}`;
  return `${Math.round(km)} كم من ${place.name}`;
}
