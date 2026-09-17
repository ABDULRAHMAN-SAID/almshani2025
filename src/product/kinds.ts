import type { AppKind, KindMeta } from "./types";

/**
 * أنواع التطبيقات الستّة.
 *
 * وثلاثة تبويبات لكل نوع لا خمسة: الشاشة في الإطار صغيرة، والتبويب الرابع
 * يُقرأ زحامًا. والثلاثة تكفي لتُرى الفكرة: ما يُشترى، وما اختاره، ومن هم.
 */
export const KINDS: KindMeta[] = [
  {
    key: "booking",
    label: "حجز مواعيد",
    icon: "calendar-outline",
    offerLabel: "الخدمات",
    tabs: [
      { key: "book", label: "احجز", icon: "calendar-outline" },
      { key: "mine", label: "حجوزاتي", icon: "bookmark-outline" },
      { key: "about", label: "عنّا", icon: "information-circle-outline" },
    ],
  },
  {
    key: "restaurant",
    label: "مطعم",
    icon: "restaurant-outline",
    offerLabel: "القائمة",
    tabs: [
      { key: "menu", label: "القائمة", icon: "restaurant-outline" },
      { key: "cart", label: "السلّة", icon: "bag-outline" },
      { key: "about", label: "عنّا", icon: "information-circle-outline" },
    ],
  },
  {
    key: "store",
    label: "متجر إلكتروني",
    icon: "bag-handle-outline",
    offerLabel: "المنتجات",
    tabs: [
      { key: "shop", label: "المتجر", icon: "grid-outline" },
      { key: "cart", label: "السلّة", icon: "bag-outline" },
      { key: "about", label: "عنّا", icon: "information-circle-outline" },
    ],
  },
  {
    key: "clinic",
    label: "عيادة",
    icon: "medkit-outline",
    offerLabel: "الخدمات",
    tabs: [
      { key: "doctors", label: "الأطباء", icon: "people-outline" },
      { key: "book", label: "حجز", icon: "calendar-outline" },
      { key: "about", label: "العيادة", icon: "information-circle-outline" },
    ],
  },
  {
    key: "academy",
    label: "منصّة تعليمية",
    icon: "school-outline",
    offerLabel: "الدورات",
    tabs: [
      { key: "courses", label: "الدورات", icon: "school-outline" },
      { key: "mine", label: "دوراتي", icon: "play-circle-outline" },
      { key: "about", label: "عنّا", icon: "information-circle-outline" },
    ],
  },
  {
    key: "salon",
    label: "صالون",
    icon: "cut-outline",
    offerLabel: "الخدمات",
    tabs: [
      { key: "services", label: "الخدمات", icon: "cut-outline" },
      { key: "book", label: "الحجز", icon: "calendar-outline" },
      { key: "team", label: "الفريق", icon: "people-outline" },
    ],
  },
];

export const KIND: Record<AppKind, KindMeta> = Object.fromEntries(
  KINDS.map((kind) => [kind.key, kind])
) as Record<AppKind, KindMeta>;
