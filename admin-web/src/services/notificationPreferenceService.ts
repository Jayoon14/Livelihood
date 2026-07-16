import { supabase } from "../lib/supabase";

export async function getNotificationPreference(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("customer_id", userId)
    .maybeSingle();

  if (error) {
    console.error("GET Notification Preference:", error);
    throw error;
  }

  return data;
}

export async function saveNotificationPreference(
  userId: string,
  values: {
    booking_updates: boolean;
    chat_notifications: boolean;
    payment_notifications: boolean;
    review_reminders: boolean;
  }
) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        customer_id: userId,
        booking_updates: values.booking_updates,
        chat_notifications: values.chat_notifications,
        payment_notifications: values.payment_notifications,
        review_reminders: values.review_reminders,
      },
      {
        onConflict: "customer_id",
      }
    )
    .select();

  if (error) {
    console.error("SAVE Notification Preference:", error);
    throw error;
  }

  return data;
}