import type { Notification } from "../../services/notificationService";

export type NotificationRole = "customer" | "worker" | "admin";

export type NotificationCategory =
  | "security"
  | "report"
  | "message"
  | "payment"
  | "review"
  | "verification"
  | "booking"
  | "account"
  | "system";

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function getNotificationText(
  notification: Pick<Notification, "title" | "message">,
): string {
  return normalize(`${notification.title} ${notification.message}`);
}

export function getNotificationCategory(
  notification: Pick<Notification, "title" | "message" | "booking_id">,
): NotificationCategory {
  const text = getNotificationText(notification);

  if (
    ["security", "sign in attempt", "another device", "password", "session"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "security";
  }

  if (
    [
      "report",
      "complaint",
      "case status",
      "case review",
      "under review",
      "needs more information",
      "evidence requested",
      "warning issued",
      "account suspended",
    ].some((keyword) => text.includes(keyword))
  ) {
    return "report";
  }

  if (["message", "chat", "conversation"].some((keyword) => text.includes(keyword))) {
    return "message";
  }

  if (
    ["payment", "receipt", "refund", "gcash", "maya", "bank transfer"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "payment";
  }

  if (["review", "rating", "feedback"].some((keyword) => text.includes(keyword))) {
    return "review";
  }

  if (
    ["verification", "approved account", "registration approved", "registration rejected"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "verification";
  }

  if (
    notification.booking_id ||
    ["booking", "schedule", "job", "service", "on the way", "arrived", "completed"].some(
      (keyword) => text.includes(keyword),
    )
  ) {
    return "booking";
  }

  if (["account", "worker", "customer", "profile"].some((keyword) => text.includes(keyword))) {
    return "account";
  }

  return "system";
}

export function getNotificationRoute(
  notification: Notification,
  role: NotificationRole,
): string {
  const category = getNotificationCategory(notification);

  if (category === "security") {
    return role === "admin" ? "/admin/profile" : `/${role}/settings`;
  }

  if (category === "report") {
    if (role === "admin") return "/admin/cases";
    return `/${role}/reports`;
  }

  if (category === "message") {
    if (notification.booking_id) return `/chat/${notification.booking_id}`;
    if (role === "admin") return "/admin/notifications";
    return `/${role}/messages`;
  }

  if (category === "payment") {
    return `/${role}/payments`;
  }

  if (category === "review") {
    if (role === "worker") return "/worker/reviews";
    if (role === "customer" && notification.booking_id) {
      return `/customer/review/${notification.booking_id}`;
    }
    return role === "admin" ? "/admin/reviews" : "/customer/bookings";
  }

  if (category === "verification") {
    return role === "admin" ? "/admin/workers" : `/${role}/settings`;
  }

  if (category === "booking") {
    if (role === "customer" && notification.booking_id) {
      return `/customer/bookings/${notification.booking_id}`;
    }
    return `/${role}/bookings`;
  }

  if (category === "account") {
    if (role === "admin") {
      const text = getNotificationText(notification);
      return text.includes("customer") ? "/admin/customers" : "/admin/workers";
    }
    return `/${role}/settings`;
  }

  return `/${role}/notifications`;
}
