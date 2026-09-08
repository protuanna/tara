const VN_OFFSET_MINUTES = 7 * 60; // Asia/Ho_Chi_Minh, fixed UTC+7, no DST

/**
 * Start-of-day (00:00) in Asia/Ho_Chi_Minh as an ISO instant, for filtering
 * timestamptz columns by "today" from the shop's perspective rather than
 * the server's/DB's UTC day.
 */
export function vnTodayStartIso(now = new Date()): string {
  const shifted = new Date(now.getTime() + VN_OFFSET_MINUTES * 60_000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const vnMidnightUtcMs = Date.UTC(y, m, d) - VN_OFFSET_MINUTES * 60_000;
  return new Date(vnMidnightUtcMs).toISOString();
}

/** ISO instant `days` * 24h before `now` — used for "last N days" filters. */
export function daysAgoIso(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const VN_TZ = "Asia/Ho_Chi_Minh";

/** yyyy-mm-dd for `date` in Asia/Ho_Chi_Minh — for grouping rows by VN calendar day. */
export function vnDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ }).format(date);
}

/**
 * "Hôm nay, 08:40" / "Hôm qua, 17:20" / "03/09, 15:40" — matches the order
 * timestamp format from the design prototype, in shop-local (VN) time.
 */
export function formatOrderTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  const todayKey = vnDateKey(now);
  const dateKey = vnDateKey(date);
  if (dateKey === todayKey) return `Hôm nay, ${time}`;

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dateKey === vnDateKey(yesterday)) return `Hôm qua, ${time}`;

  const dayMonth = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  return `${dayMonth}, ${time}`;
}

/** "01/08/26 13:19" — full absolute date/time in shop-local (VN) time, for receipts. */
export function formatReceiptDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} ${timePart}`;
}
