import { supabase } from "../lib/supabase";

export async function sendMessage(
  bookingId: number,
  senderId: string,
  receiverId: string,
  message: string
) {
  const { error } = await supabase
    .from("chats")
    .insert({
      booking_id: bookingId,
      sender_id: senderId,
      receiver_id: receiverId,
      message,
    });

  if (error) throw error;
}

export async function getMessages(
  bookingId: number
) {
  const { data, error } = await supabase
    .from("chats")
    .select(`
      *,
      sender:profiles!sender_id(
        first_name,
        last_name
      )
    `)
    .eq("booking_id", bookingId)
    .order("created_at");

  if (error) throw error;

  return data ?? [];
}