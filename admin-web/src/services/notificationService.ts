import { supabase } from "../lib/supabase";

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
// CREATE NOTIFICATION
// =====================

export async function createNotification(
  userId: string,
  bookingId: number,
  title: string,
  message: string,
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    booking_id: bookingId,
    title,
    message,
  });

  if (error) {
    throw error;
  }
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

export async function getUnreadCount(userId: string) {
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

// =====================
// MARK ALL AS READ
// =====================

export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }
}

// =====================
// DELETE NOTIFICATION
// =====================

export async function deleteNotification(id: number) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

// =====================
// DELETE ALL READ NOTIFICATIONS
// =====================

export async function deleteReadNotifications(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .eq("is_read", true);

  if (error) {
    throw error;
  }
}
export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}
