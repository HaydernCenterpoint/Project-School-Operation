const timeZone = "Asia/Ho_Chi_Minh";

const dateTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dayMonth = new Intl.DateTimeFormat("vi-VN", { timeZone, day: "2-digit" });
const monthNumber = new Intl.DateTimeFormat("vi-VN", { timeZone, month: "numeric" });
const hourOnly = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" });

/** Deadlines are always shown in Vietnam time, labelled as such. */
export function formatDeadline(value: string | null) {
  if (!value) return "Không giới hạn";
  return `${dateTime.format(new Date(value))} (giờ Việt Nam)`;
}

export function formatDate(value: string) {
  return dateTime.format(new Date(value));
}

export function dateBadge(value: string) {
  const date = new Date(value);
  return { day: dayMonth.format(date), month: `Th ${monthNumber.format(date)}` };
}

export type DueState = "none" | "overdue" | "soon" | "later";

export function dueState(dueAt: string | null, now = Date.now()): DueState {
  if (!dueAt) return "none";
  const left = Date.parse(dueAt) - now;
  if (left < 0) return "overdue";
  return left < 3 * 24 * 3600 * 1000 ? "soon" : "later";
}

export function relativeDue(dueAt: string | null, now = Date.now()) {
  if (!dueAt) return "Không có hạn nộp";
  const minutes = Math.round((Date.parse(dueAt) - now) / 60_000);
  const size = Math.abs(minutes);
  const span =
    size < 60 ? `${size} phút` : size < 60 * 48 ? `${Math.round(size / 60)} giờ` : `${Math.round(size / 1440)} ngày`;
  return minutes < 0 ? `Đã quá hạn ${span}` : `Còn ${span}`;
}

export function greeting(now = new Date()) {
  const hour = Number(hourOnly.format(now));
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function classCode(id: string) {
  return `LỚP-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export function initials(name: string) {
  // Vietnamese given names come last; skip trailing numeric IDs like "Sinh viên 2200286".
  const words = name.trim().split(/\s+/);
  const alphaWord = [...words].reverse().find((w) => /^\p{L}/u.test(w)) ?? words.at(-1);
  return (alphaWord?.[0] ?? "S").toUpperCase();
}

export const classAccents = ["#0066cc", "#d60000", "#067647", "#b7791f", "#6b46c1"];
