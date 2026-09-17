import type { Trade, TradeKey } from "./types";

/**
 * الأنشطة التي يُبنى لها.
 *
 * وستّة لا عشرون: القائمة الطويلة تُقرأ فتُرهق، والزبون يجد نفسه في واحدةٍ
 * من هذه ستًّا. ومن لم يجد نفسه اختار «خدمات» وكتب ما شاء.
 */
export const TRADES: Trade[] = [
  { key: "food", label: "مطعم ومقهى", icon: "restaurant-outline", offerLabel: "القائمة", actionLabel: "اطلب الآن" },
  { key: "beauty", label: "صالون وحلاقة", icon: "cut-outline", offerLabel: "الخدمات", actionLabel: "احجز موعدًا" },
  { key: "clinic", label: "عيادة وصحّة", icon: "medkit-outline", offerLabel: "الخدمات", actionLabel: "احجز موعدًا" },
  { key: "shop", label: "متجر وبوتيك", icon: "bag-handle-outline", offerLabel: "المنتجات", actionLabel: "اطلب الآن" },
  { key: "service", label: "ورشة وخدمات", icon: "construct-outline", offerLabel: "الخدمات", actionLabel: "اطلب الخدمة" },
  { key: "office", label: "مكتب واستشارات", icon: "briefcase-outline", offerLabel: "الخدمات", actionLabel: "احجز استشارة" },
];

export const TRADE: Record<TradeKey, Trade> = Object.fromEntries(
  TRADES.map((trade) => [trade.key, trade])
) as Record<TradeKey, Trade>;
