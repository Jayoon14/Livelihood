import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface Notification {
  id: number;
  user_id: string;
  booking_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function throwIfError(error: PostgrestError | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

function validateUserId(userId: string): string {
  const value = userId.trim();

  if (!value) {
    throw new Error("User ID is required.");
  }

  return value;
}

function validateNotificationId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid notification ID.");
  }

  return id;
}

function validateBookingId(bookingId: number | null): number | null {
  if (bookingId === null) {
    return null;
  }

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new Error("Invalid booking ID.");
  }

  return bookingId;
}

function validateText(value: string, field: string): string {
  const text = value.trim();

  if (!text) {
    throw new Error(`${field} is required.`);
  }

  return text;
}

// =====================
// GET NOTIFICATIONS
// =====================

export async function getNotifications(
  userId: string,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      user_id,
      booking_id,
      title,
      message,
      is_read,
      created_at
      `,
    )
    .eq("user_id", validateUserId(userId))
    .order("created_at", {
      ascending: false,
    });

  throwIfError(error);

  return (data ?? []) as Notification[];
}

// =====================
// CREATE NOTIFICATION
// =====================

export async function createNotification(
  userId: string,
  bookingId: number | null,
  title: string,
  message: string,
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: validateUserId(userId),
    booking_id: validateBookingId(bookingId),
    title: validateText(title, "Title"),
    message: validateText(message, "Message"),
    is_read: false,
  });

  throwIfError(error);
}

// =====================
// MARK ONE AS READ
// =====================

export async function markAsRead(id: number): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", validateNotificationId(id));

  throwIfError(error);
}

// =====================
// GET UNREAD COUNT
// =====================

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      head: true,
      count: "exact",
    })
    .eq("user_id", validateUserId(userId))
    .eq("is_read", false);

  throwIfError(error);

  return count ?? 0;
}

// =====================
// MARK ALL AS READ
// =====================

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", validateUserId(userId))
    .eq("is_read", false);

  throwIfError(error);
}

/**
 * Backward-compatible export used by NotificationDropdown.tsx.
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  await markAllAsRead(userId);
}

// =====================
// DELETE NOTIFICATION
// =====================

export async function deleteNotification(id: number): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", validateNotificationId(id));

  throwIfError(error);
}

// =====================
// DELETE READ NOTIFICATIONS
// =====================

export async function deleteReadNotifications(
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", validateUserId(userId))
    .eq("is_read", true);

  throwIfError(error);
}