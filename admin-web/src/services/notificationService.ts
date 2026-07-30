import type { PostgrestError } from "@supabase/supabase-js";
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

export interface NotificationPage {
  items: Notification[];
  hasMore: boolean;
  total: number;
}

export interface NotificationQueryOptions {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  search?: string;
}

const NOTIFICATION_COLUMNS = `
  id,
  user_id,
  booking_id,
  title,
  message,
  is_read,
  created_at
`;

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const value = (error as { message: string }).message.trim();

    if (value) {
      return new Error(value);
    }
  }

  return new Error(fallback);
}

function throwIfError(
  error: PostgrestError | Error | null,
  fallback: string,
): void {
  if (error) {
    throw toError(error, fallback);
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

function validateText(
  value: string,
  field: string,
  maximum: number,
): string {
  const text = value.trim();

  if (!text) {
    throw new Error(`${field} is required.`);
  }

  if (text.length > maximum) {
    throw new Error(
      `${field} must contain ${maximum} characters or fewer.`,
    );
  }

  return text;
}

function normalizePagination(
  options: NotificationQueryOptions,
): {
  page: number;
  pageSize: number;
  from: number;
  to: number;
} {
  const page =
    Number.isInteger(options.page) && (options.page ?? 0) > 0
      ? Number(options.page)
      : 1;

  const requestedSize =
    Number.isInteger(options.pageSize) &&
    (options.pageSize ?? 0) > 0
      ? Number(options.pageSize)
      : DEFAULT_PAGE_SIZE;

  const pageSize = Math.min(requestedSize, MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, from, to };
}

export async function getCurrentNotificationUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw toError(error, "Unable to verify your session.");
  }

  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return user.id;
}

async function ensureCurrentUser(
  expectedUserId?: string,
): Promise<string> {
  const currentUserId = await getCurrentNotificationUserId();

  if (
    expectedUserId &&
    validateUserId(expectedUserId) !== currentUserId
  ) {
    throw new Error(
      "You cannot access another user's notifications.",
    );
  }

  return currentUserId;
}

export async function getMyNotifications(
  options: NotificationQueryOptions = {},
): Promise<NotificationPage> {
  const userId = await getCurrentNotificationUserId();
  const { pageSize, from, to } = normalizePagination(options);
  const search = options.search?.trim() ?? "";

  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS, {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (options.unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (search) {
    const escaped = search
      .replace(/[%_]/g, "")
      .replace(/[(),]/g, " ")
      .trim();

    if (escaped) {
      query = query.or(
        `title.ilike.%${escaped}%,message.ilike.%${escaped}%`,
      );
    }
  }

  const { data, error, count } = await query;

  throwIfError(error, "Unable to load notifications.");

  const total = count ?? 0;

  return {
    items: (data ?? []) as Notification[],
    hasMore: from + pageSize < total,
    total,
  };
}

export async function getNotifications(
  userId: string,
): Promise<Notification[]> {
  await ensureCurrentUser(userId);

  const result = await getMyNotifications({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });

  return result.items;
}

export async function getMyUnreadCount(): Promise<number> {
  const userId = await getCurrentNotificationUserId();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      head: true,
      count: "exact",
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  throwIfError(error, "Unable to count unread notifications.");

  return count ?? 0;
}

export async function getMyReadCount(): Promise<number> {
  const userId = await getCurrentNotificationUserId();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      head: true,
      count: "exact",
    })
    .eq("user_id", userId)
    .eq("is_read", true);

  throwIfError(error, "Unable to count read notifications.");

  return count ?? 0;
}

export async function getUnreadCount(
  userId: string,
): Promise<number> {
  await ensureCurrentUser(userId);
  return getMyUnreadCount();
}

export async function createNotification(
  userId: string,
  bookingId: number | null,
  title: string,
  message: string,
): Promise<void> {
  const validatedUserId = validateUserId(userId);

  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: validatedUserId,
      booking_id: validateBookingId(bookingId),
      title: validateText(title, "Title", 150),
      message: validateText(message, "Message", 500),
      is_read: false,
    });

  throwIfError(error, "Unable to create notification.");
}

export async function markMyNotificationAsRead(
  id: number,
): Promise<void> {
  const notificationId = validateNotificationId(id);
  const userId = await getCurrentNotificationUserId();

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  throwIfError(
    error,
    "Unable to mark the notification as read.",
  );

  if (!data) {
    throw new Error(
      "Notification was not found or does not belong to your account.",
    );
  }
}

export async function markAsRead(id: number): Promise<void> {
  await markMyNotificationAsRead(id);
}

export async function markAllMyNotificationsAsRead(): Promise<void> {
  const userId = await getCurrentNotificationUserId();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  throwIfError(
    error,
    "Unable to mark all notifications as read.",
  );
}

export async function markAllAsRead(
  userId: string,
): Promise<void> {
  await ensureCurrentUser(userId);
  await markAllMyNotificationsAsRead();
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<void> {
  await markAllAsRead(userId);
}

export async function deleteMyNotification(
  id: number,
): Promise<void> {
  const notificationId = validateNotificationId(id);
  const userId = await getCurrentNotificationUserId();

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  throwIfError(error, "Unable to delete the notification.");

  if (!data) {
    throw new Error(
      "Notification was not found or does not belong to your account.",
    );
  }
}

export async function deleteNotification(
  id: number,
): Promise<void> {
  await deleteMyNotification(id);
}

export async function deleteMyReadNotifications(): Promise<void> {
  const userId = await getCurrentNotificationUserId();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("is_read", true);

  throwIfError(error, "Unable to clear read notifications.");
}

export async function deleteReadNotifications(
  userId: string,
): Promise<void> {
  await ensureCurrentUser(userId);
  await deleteMyReadNotifications();
}
