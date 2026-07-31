function validDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBookingDate(value?: string | null): string {
  const date = validDate(value);
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatBookingTime(value?: string | null): string {
  if (!value) return "Not set";
  const normalized = value.trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return normalized;
  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  const date = validDate(value);
  if (!date) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
