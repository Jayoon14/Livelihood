import { supabase } from "../lib/supabase";

export interface NotificationPreference {
  customer_id: string;
  booking_updates: boolean;
  chat_notifications: boolean;
  payment_notifications: boolean;
  review_reminders: boolean;
}

function wrapError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;

  if (
    typeof error == "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallback);
}

function requireUserId(userId: string): string {
  const id = userId.trim();

  if (!id) {
    throw new Error("User ID is required.");
  }

  return id;
}

export async function getNotificationPreference(
  userId: string,
): Promise<NotificationPreference | null> {
  const id = requireUserId(userId);

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("customer_id", id)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load notification preferences.");
  }

  return (data as NotificationPreference | null) ?? null;
}

export async function saveNotificationPreference(
  userId: string,
  values: Omit<NotificationPreference, "customer_id">,
): Promise<NotificationPreference> {
  const id = requireUserId(userId);

  const payload: NotificationPreference = {
    customer_id: id,
    booking_updates: values.booking_updates,
    chat_notifications: values.chat_notifications,
    payment_notifications: values.payment_notifications,
    review_reminders: values.review_reminders,
  };

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(payload, {
      onConflict: "customer_id",
    })
    .select()
    .single();

  if (error) {
    throw wrapError(error, "Unable to save notification preferences.");
  }

  return data as NotificationPreference;
}