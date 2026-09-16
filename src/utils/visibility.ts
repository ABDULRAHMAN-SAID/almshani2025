/**
 * نافذة الظهور: متى يُرى المنشور ومتى يختفي.
 *
 * والإعلان في القاعدة موقوت بطبعه: «التسجيل مفتوح حتى الخميس» يبقى معلّقًا
 * شهرًا بعد أن أُغلق التسجيل، فيقرؤه من يظنّه قائمًا. وحذفُه بعد انتهائه
 * عملٌ يُنسى، فالوقت يُكتب مرّة عند النشر ويتكفّل الباقي.
 */

export interface Scheduled {
  startsAt?: string;
  endsAt?: string;
}

/** هل هذا المنشور ظاهرٌ الآن؟ */
export function isVisible(item: Scheduled, now: Date = new Date()): boolean {
  const at = now.getTime();
  if (item.startsAt && new Date(item.startsAt).getTime() > at) return false;
  if (item.endsAt && new Date(item.endsAt).getTime() <= at) return false;
  return true;
}

/** حالته للإدارة: ظاهر، أو ينتظر وقته، أو انقضى. */
export function scheduleState(item: Scheduled, now: Date = new Date()): "live" | "waiting" | "ended" {
  const at = now.getTime();
  if (item.startsAt && new Date(item.startsAt).getTime() > at) return "waiting";
  if (item.endsAt && new Date(item.endsAt).getTime() <= at) return "ended";
  return "live";
}

export const SCHEDULE_LABEL: Record<"live" | "waiting" | "ended", string> = {
  live: "ظاهر الآن",
  waiting: "ينتظر وقته",
  ended: "انتهى وقته",
};
