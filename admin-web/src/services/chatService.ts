import { supabase } from "../lib/supabase";


// =======================
// SEND MESSAGE
// =======================

export async function sendMessage(
  bookingId: number,
  senderId: string,
  message: string
) {
  const { error } = await supabase
    .from("messages")
    .insert({
      booking_id: bookingId,
      sender_id: senderId,
      message,
    });

  if (error) throw error;
}



// =======================
// UPLOAD CHAT IMAGE
// =======================

export async function uploadChatImage(
  file: File
) {
  const fileName =
    `${Date.now()}-${file.name}`;


  const { error } =
    await supabase.storage
      .from("chat-images")
      .upload(
        fileName,
        file
      );


  if (error) throw error;


  const { data } =
    supabase.storage
      .from("chat-images")
      .getPublicUrl(
        fileName
      );


  return data.publicUrl;
}



// =======================
// SEND IMAGE MESSAGE
// =======================

export async function sendImage(
  bookingId: number,
  senderId: string,
  imageUrl: string
) {
  const { error } =
    await supabase
      .from("messages")
      .insert({
        booking_id: bookingId,
        sender_id: senderId,
        image_url: imageUrl,
      });


  if (error) throw error;
}



// =======================
// GET MESSAGES
// =======================

export async function getMessages(
  bookingId: number
) {
  const { data, error } =
    await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles!sender_id(
          id,
          first_name,
          last_name,
          profile_picture
        )
      `)
      .eq(
        "booking_id",
        bookingId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );


  if (error) throw error;


  return data ?? [];
}



// =======================
// REALTIME SUBSCRIBE
// =======================

export function subscribeToMessages(
  bookingId: number,
  callback: () => void
) {
  return supabase
    .channel(
      `chat-${bookingId}`
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter:
          `booking_id=eq.${bookingId}`,
      },
      callback
    )
    .subscribe();
}



// =======================
// REMOVE CHANNEL
// =======================

export function unsubscribe(
  channel: any
) {
  supabase.removeChannel(
    channel
  );
}



// =======================
// GET CHAT LIST
// =======================

export async function getChatList(
  userId: string
) {
  const { data, error } =
    await supabase
      .from("bookings")
      .select(`
        id,
        status,
        customer_id,
        worker_id,

        customer:profiles!customer_id(
          id,
          first_name,
          last_name,
          profile_picture
        ),

        worker:profiles!worker_id(
          id,
          first_name,
          last_name,
          profile_picture
        )
      `)
      .or(
        `customer_id.eq.${userId},worker_id.eq.${userId}`
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );


  if (error) throw error;


  return data ?? [];
}



// =======================
// GET UNREAD COUNT
// =======================

export async function getUnreadCount(
  userId: string
) {
  const { count, error } =
    await supabase
      .from("messages")
      .select(
        "*",
        {
          count: "exact",
          head: true,
        }
      )
      .neq(
        "sender_id",
        userId
      )
      .eq(
        "is_read",
        false
      );


  if (error) throw error;


  return count ?? 0;
}



// =======================
// MARK CONVERSATION READ
// =======================

export async function markConversationAsRead(
  bookingId: number,
  userId: string
) {
  const { error } =
    await supabase
      .from("messages")
      .update({
        is_read: true,
      })
      .eq(
        "booking_id",
        bookingId
      )
      .neq(
        "sender_id",
        userId
      );


  if (error) throw error;
}



// =======================
// MARK MESSAGES SEEN
// =======================

export async function markMessagesSeen(
  bookingId: number,
  userId: string
) {
  const { error } =
    await supabase
      .from("messages")
      .update({
        seen_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "booking_id",
        bookingId
      )
      .neq(
        "sender_id",
        userId
      )
      .is(
        "seen_at",
        null
      );


  if (error) throw error;
}
export async function uploadChatFile(
  file: File
) {
  const filename =
    `${Date.now()}-${file.name}`;

  const { error } =
    await supabase.storage
      .from("chat-files")
      .upload(filename, file);

  if (error) throw error;

  const { data } =
    supabase.storage
      .from("chat-files")
      .getPublicUrl(filename);

  return {
    url: data.publicUrl,
    name: file.name,
  };
}
export async function sendFile(
  bookingId: number,
  senderId: string,
  fileUrl: string,
  fileName: string
) {
  const { error } =
    await supabase
      .from("messages")
      .insert({
        booking_id: bookingId,
        sender_id: senderId,
        file_url: fileUrl,
        file_name: fileName,
      });

  if (error) throw error;
}