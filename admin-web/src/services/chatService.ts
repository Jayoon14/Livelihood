import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

const CHAT_ENABLED_STATUSES = ["Approved", "On Going", "Completed"] as const;

export type ChatProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
};

export type ChatMessage = {
  id: number | string;
  booking_id: number;
  sender_id: string;
  receiver_id?: string | null;
  message: string | null;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  seen_at: string | null;
  created_at: string;
  sender?: ChatProfile | null;
};

export type ChatContext = {
  id: number;
  status: string;
  customer_id: string;
  worker_id: string;
  created_at?: string;
  service?: {
    id?: number;
    service_name?: string | null;
  } | null;
  customer: ChatProfile;
  worker: ChatProfile;
};

export type ChatListItem = ChatContext & {
  last_message: ChatMessage | null;
  unread_count: number;
};

type BookingParticipantContext = {
  booking: ChatContext;
  receiverId: string;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeProfile(value: unknown): ChatProfile {
  const profile = normalizeRelation(value as ChatProfile | ChatProfile[] | null);

  return {
    id: profile?.id ?? "",
    first_name: profile?.first_name ?? null,
    last_name: profile?.last_name ?? null,
    profile_picture: profile?.profile_picture ?? null,
  };
}

function normalizeMessage(value: Record<string, unknown>): ChatMessage {
  return {
    id: String(value.id ?? crypto.randomUUID()),
    booking_id: Number(value.booking_id),
    sender_id: String(value.sender_id ?? ""),
    receiver_id:
      value.receiver_id === null || value.receiver_id === undefined
        ? null
        : String(value.receiver_id),
    message:
      value.message === null || value.message === undefined
        ? null
        : String(value.message),
    image_url:
      value.image_url === null || value.image_url === undefined
        ? null
        : String(value.image_url),
    file_url:
      value.file_url === null || value.file_url === undefined
        ? null
        : String(value.file_url),
    file_name:
      value.file_name === null || value.file_name === undefined
        ? null
        : String(value.file_name),
    is_read: Boolean(value.is_read),
    seen_at:
      value.seen_at === null || value.seen_at === undefined
        ? null
        : String(value.seen_at),
    created_at: String(value.created_at ?? new Date().toISOString()),
    sender: value.sender ? normalizeProfile(value.sender) : undefined,
  };
}

function getFullName(profile: Partial<ChatProfile> | null | undefined) {
  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Someone";
}

function validateImage(file: File) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const maximumSize = 8 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  if (file.size > maximumSize) {
    throw new Error("The image must not exceed 8 MB.");
  }
}

function validateDocument(file: File) {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = ["pdf", "doc", "docx"];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const maximumSize = 12 * 1024 * 1024;

  if (
    !allowedTypes.includes(file.type) &&
    !allowedExtensions.includes(extension)
  ) {
    throw new Error("Only PDF, DOC, and DOCX files are allowed.");
  }

  if (file.size > maximumSize) {
    throw new Error("The file must not exceed 12 MB.");
  }
}

async function getParticipantContext(
  bookingId: number,
  userId: string,
): Promise<BookingParticipantContext> {
  if (!Number.isFinite(bookingId)) {
    throw new Error("Invalid booking conversation.");
  }

  if (!userId) {
    throw new Error("You must sign in to access this conversation.");
  }

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      customer_id,
      worker_id,
      created_at,
      service:services!service_id(
        id,
        service_name
      ),
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
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Booking conversation was not found.");
  }

  const customerId = String(data.customer_id);
  const workerId = String(data.worker_id);

  const isCustomer = customerId === userId;
  const isWorker = workerId === userId;

  if (!isCustomer && !isWorker) {
    throw new Error("You are not a participant in this booking.");
  }

  if (!CHAT_ENABLED_STATUSES.includes(data.status as never)) {
    throw new Error(
      "Chat is available only for approved, ongoing, or completed bookings.",
    );
  }

  const service = normalizeRelation(
    data.service as
      | { id?: number; service_name?: string | null }
      | { id?: number; service_name?: string | null }[]
      | null,
  );

  const booking: ChatContext = {
    id: Number(data.id),
    status: String(data.status),
    customer_id: customerId,
    worker_id: workerId,
    created_at: data.created_at ? String(data.created_at) : undefined,
    service,
    customer: normalizeProfile(data.customer),
    worker: normalizeProfile(data.worker),
  };

  return {
    booking,
    receiverId: isCustomer ? workerId : customerId,
  };
}

async function safelyNotifyRecipient(
  booking: ChatContext,
  receiverId: string,
  senderId: string,
) {
  try {
    const sender =
      booking.customer_id === senderId ? booking.customer : booking.worker;

    await createNotification(
      receiverId,
      booking.id,
      "New Chat Message",
      `${getFullName(sender)} sent you a message.`,
    );
  } catch (error) {
    // The message should remain successful even when notification creation fails.
    console.error("Unable to create chat notification:", error);
  }
}

async function insertMessage(
  bookingId: number,
  senderId: string,
  values: {
    message?: string;
    image_url?: string;
    file_url?: string;
    file_name?: string;
  },
): Promise<ChatMessage> {
  const { booking, receiverId } = await getParticipantContext(
    bookingId,
    senderId,
  );

  const insertPayload = {
    booking_id: bookingId,
    sender_id: senderId,
    receiver_id: receiverId,
    message: values.message ?? null,
    image_url: values.image_url ?? null,
    file_url: values.file_url ?? null,
    file_name: values.file_name ?? null,
    is_read: false,
    seen_at: null,
  };

  let result = await supabase
    .from("messages")
    .insert(insertPayload)
    .select(`
      *,
      sender:profiles!sender_id(
        id,
        first_name,
        last_name,
        profile_picture
      )
    `)
    .single();

  /*
   * Compatibility fallback:
   * Some existing message tables may not yet contain receiver_id.
   */
  if (
    result.error &&
    String(result.error.message).toLowerCase().includes("receiver_id")
  ) {
    const {
      receiver_id: _receiverId,
      ...payloadWithoutReceiver
    } = insertPayload;

    result = await supabase
      .from("messages")
      .insert(payloadWithoutReceiver)
      .select(`
        *,
        sender:profiles!sender_id(
          id,
          first_name,
          last_name,
          profile_picture
        )
      `)
      .single();
  }

  if (result.error) {
    throw result.error;
  }

  const savedMessage = normalizeMessage(
    result.data as unknown as Record<string, unknown>,
  );

  await safelyNotifyRecipient(
    booking,
    receiverId,
    senderId,
  );

  return savedMessage;
}

export async function getChatContext(
  bookingId: number,
  userId: string,
): Promise<ChatContext> {
  const { booking } = await getParticipantContext(bookingId, userId);
  return booking;
}

export async function getMessages(
  bookingId: number,
  userId: string,
): Promise<ChatMessage[]> {
  await getParticipantContext(bookingId, userId);

  const { data, error } = await supabase
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
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) =>
    normalizeMessage(item as unknown as Record<string, unknown>),
  );
}

export async function sendMessage(
  bookingId: number,
  senderId: string,
  message: string,
): Promise<ChatMessage> {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Message cannot be empty.");
  }

  if (trimmedMessage.length > 2000) {
    throw new Error("Message must not exceed 2,000 characters.");
  }

  return insertMessage(bookingId, senderId, {
    message: trimmedMessage,
  });
}

export async function sendImage(
  bookingId: number,
  senderId: string,
  imageUrl: string,
): Promise<ChatMessage> {
  if (!imageUrl.trim()) {
    throw new Error("Image URL is missing.");
  }

  return insertMessage(bookingId, senderId, {
    image_url: imageUrl,
  });
}

export async function sendFile(
  bookingId: number,
  senderId: string,
  fileUrl: string,
  fileName: string,
): Promise<ChatMessage> {
  if (!fileUrl.trim()) {
    throw new Error("File URL is missing.");
  }

  if (!fileName.trim()) {
    throw new Error("File name is missing.");
  }

  return insertMessage(bookingId, senderId, {
    file_url: fileUrl,
    file_name: fileName,
  });
}

export async function uploadChatImage(file: File): Promise<string> {
  validateImage(file);

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Please sign in before uploading an image.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${authData.user.id}/images/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("chat-images")
    .getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Unable to generate image URL.");
  }

  return data.publicUrl;
}

export async function uploadChatFile(
  file: File,
): Promise<{ url: string; name: string }> {
  validateDocument(file);

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error(authError?.message || "Please sign in before uploading a file.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${authData.user.id}/documents/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from("chat-files")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("chat-files")
    .getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Unable to generate file URL.");
  }

  return {
    url: data.publicUrl,
    name: file.name,
  };
}

export function subscribeToMessages(
  bookingId: number,
  currentUserId: string,
  callback: (message: ChatMessage) => void,
): RealtimeChannel {
  const channel = supabase
    .channel(
      `chat-messages-${bookingId}-${currentUserId}-${crypto.randomUUID()}`,
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        callback(
          normalizeMessage(
            payload.new as unknown as Record<string, unknown>,
          ),
        );
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        callback(
          normalizeMessage(
            payload.new as unknown as Record<string, unknown>,
          ),
        );
      },
    )
    .subscribe();

  return channel;
}

export async function unsubscribe(
  channel: RealtimeChannel,
): Promise<void> {
  const result = await supabase.removeChannel(channel);

  if (result === "error") {
    throw new Error("Failed to unsubscribe from the realtime channel.");
  }
}
export async function markMessagesSeen(
  bookingId: number,
  userId: string,
): Promise<void> {
  if (!Number.isFinite(bookingId) || !userId) {
    return;
  }

  await getParticipantContext(bookingId, userId);

  const { error } = await supabase
    .from("messages")
    .update({
      is_read: true,
      seen_at: new Date().toISOString(),
    })
    .eq("booking_id", bookingId)
    .neq("sender_id", userId)
    .or("is_read.eq.false,seen_at.is.null");

  if (error) {
    throw error;
  }
}

export async function markConversationAsRead(
  bookingId: number,
  userId: string,
): Promise<void> {
  await markMessagesSeen(bookingId, userId);
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!userId) {
    return 0;
  }

  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .or(`customer_id.eq.${userId},worker_id.eq.${userId}`)
    .in("status", [...CHAT_ENABLED_STATUSES]);

  if (bookingError) {
    throw bookingError;
  }

  const bookingIds = (bookings ?? []).map((booking) => Number(booking.id));

  if (bookingIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("messages")
    .select("id", {
      count: "exact",
      head: true,
    })
    .in("booking_id", bookingIds)
    .neq("sender_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getChatList(
  userId: string,
): Promise<ChatListItem[]> {
  if (!userId) {
    return [];
  }

  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      customer_id,
      worker_id,
      created_at,
      service:services!service_id(
        id,
        service_name
      ),
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
    .or(`customer_id.eq.${userId},worker_id.eq.${userId}`)
    .in("status", [...CHAT_ENABLED_STATUSES])
    .order("created_at", { ascending: false });

  if (bookingError) {
    throw bookingError;
  }

  const normalizedBookings: ChatContext[] = (bookings ?? []).map(
    (booking) => {
      const service = normalizeRelation(
        booking.service as
          | { id?: number; service_name?: string | null }
          | { id?: number; service_name?: string | null }[]
          | null,
      );

      return {
        id: Number(booking.id),
        status: String(booking.status),
        customer_id: String(booking.customer_id),
        worker_id: String(booking.worker_id),
        created_at: booking.created_at
          ? String(booking.created_at)
          : undefined,
        service,
        customer: normalizeProfile(booking.customer),
        worker: normalizeProfile(booking.worker),
      };
    },
  );

  if (normalizedBookings.length === 0) {
    return [];
  }

  const bookingIds = normalizedBookings.map((booking) => booking.id);

  const { data: messageRows, error: messageError } = await supabase
    .from("messages")
    .select("*")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  if (messageError) {
    throw messageError;
  }

  const lastMessageByBooking = new Map<number, ChatMessage>();
  const unreadByBooking = new Map<number, number>();

  for (const row of messageRows ?? []) {
    const message = normalizeMessage(
      row as unknown as Record<string, unknown>,
    );

    if (!lastMessageByBooking.has(message.booking_id)) {
      lastMessageByBooking.set(message.booking_id, message);
    }

    if (message.sender_id !== userId && !message.is_read) {
      unreadByBooking.set(
        message.booking_id,
        (unreadByBooking.get(message.booking_id) ?? 0) + 1,
      );
    }
  }

  return normalizedBookings
    .map((booking) => ({
      ...booking,
      last_message: lastMessageByBooking.get(booking.id) ?? null,
      unread_count: unreadByBooking.get(booking.id) ?? 0,
    }))
    .sort((first, second) => {
      const firstDate =
        first.last_message?.created_at ??
        first.created_at ??
        "1970-01-01T00:00:00.000Z";

      const secondDate =
        second.last_message?.created_at ??
        second.created_at ??
        "1970-01-01T00:00:00.000Z";

      return (
        new Date(secondDate).getTime() -
        new Date(firstDate).getTime()
      );
    });
}
