import type { Content } from "../../data";

export function getEventSchedule(event: Content) {
  const schedule = Array.isArray(event.eventSchedule)
    ? event.eventSchedule.filter((entry) => entry.date || entry.time)
    : [];
  if (schedule.length) return schedule;
  return event.eventDate || event.eventTime
    ? [{ date: event.eventDate || "", time: event.eventTime || "" }]
    : [];
}
export function formatEventDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(new Date(year, month - 1, day));
}
export function isHttpUrl(value?: string) {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
