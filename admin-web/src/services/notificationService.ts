import { supabase } from "../lib/supabase";

export async function getCustomerNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function createNotification(
  userId: string,
  bookingId: number,
  title: string,
  message: string
) {
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      booking_id: bookingId,
      title,
      message,
    });

  if (error) throw error;
}

export async function markNotificationAsRead(id: number) {
  await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", id);
}
// =====================
// GET NOTIFICATIONS
// =====================

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

// =====================
// MARK AS READ
// =====================

export async function markAsRead(id: number) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

// =====================
// GET UNREAD COUNT
// =====================

export async function getUnreadCount(
  userId: string
) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}