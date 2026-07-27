import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  Expand,
  FileText,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Minus,
  Paperclip,
  Search,
  Send,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent, KeyboardEvent } from "react";

import { supabase } from "../../lib/supabase";
import {
  getChatContext,
  getChatList,
  getMessages,
  markMessagesSeen,
  sendFile,
  sendImage,
  sendMessage,
  subscribeToMessages,
  unsubscribe,
  uploadChatFile,
  uploadChatImage,
} from "../../services/chatService";
import type {
  ChatContext,
  ChatMessage,
} from "../../services/chatService";

type BookingChat = {
  bookingId: number;
  status: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profile_picture: string | null;
  };
  lastMessage: {
    sender_id: string;
    message: string | null;
    image_url: string | null;
    file_name: string | null;
    created_at: string;
  } | null;
  unreadCount: number;
};

type Conversation = {
  user: BookingChat["user"];
  bookings: BookingChat[];
  latestBooking: BookingChat;
  unreadCount: number;
};

function upsertMessage(list: ChatMessage[], incoming: ChatMessage) {
  const index = list.findIndex(
    (item) => String(item.id) === String(incoming.id),
  );

  if (index === -1) return [...list, incoming];

  const copy = [...list];
  copy[index] = incoming;
  return copy;
}

function fullName(user: BookingChat["user"] | null | undefined) {
  if (!user) return "User";

  return (
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "User"
  );
}

function preview(chat: BookingChat) {
  if (!chat.lastMessage) return "Start a conversation";
  if (chat.lastMessage.image_url) return "Sent a photo";

  if (chat.lastMessage.file_name) {
    return `Sent a file: ${chat.lastMessage.file_name}`;
  }

  return chat.lastMessage.message?.trim() || "New message";
}

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function listTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return messageTime(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function messageDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function sortTime(chat: BookingChat) {
  return chat.lastMessage?.created_at
    ? new Date(chat.lastMessage.created_at).getTime()
    : 0;
}

function groupConversations(items: BookingChat[]) {
  const groups = new Map<string, BookingChat[]>();

  items.forEach((item) => {
    const current = groups.get(item.user.id) ?? [];
    current.push(item);
    groups.set(item.user.id, current);
  });

  return Array.from(groups.values())
    .map((bookings): Conversation => {
      const sorted = [...bookings].sort(
        (a, b) => sortTime(b) - sortTime(a),
      );

      return {
        user: sorted[0].user,
        bookings: sorted,
        latestBooking: sorted[0],
        unreadCount: sorted.reduce(
          (total, booking) => total + booking.unreadCount,
          0,
        ),
      };
    })
    .sort(
      (a, b) => sortTime(b.latestBooking) - sortTime(a.latestBooking),
    );
}

function Avatar({
  user,
  small = false,
}: {
  user: BookingChat["user"];
  small?: boolean;
}) {
  const name = fullName(user);

  return (
    <div className="relative shrink-0">
      <img
        src={
          user.profile_picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=DBEAFE&color=1D4ED8&bold=true`
        }
        alt={name}
        className={`rounded-full object-cover ring-2 ring-white ${
          small ? "h-9 w-9" : "h-12 w-12"
        }`}
      />

      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
    </div>
  );
}

export default function FloatingChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [currentUserId, setCurrentUserId] = useState("");
  const [rawChats, setRawChats] = useState<BookingChat[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversations = useMemo(
    () => groupConversations(rawChats),
    [rawChats],
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.user.id === selectedUserId,
      ) ?? null,
    [conversations, selectedUserId],
  );

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return conversations;

    return conversations.filter((conversation) => {
      const name = fullName(conversation.user).toLowerCase();

      return (
        name.includes(keyword) ||
        conversation.bookings.some(
          (booking) =>
            preview(booking).toLowerCase().includes(keyword) ||
            booking.status.toLowerCase().includes(keyword) ||
            String(booking.bookingId).includes(keyword),
        )
      );
    });
  }, [conversations, search]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior });
      });
    },
    [],
  );

  const loadChats = useCallback(async (userId: string) => {
    try {
      setError("");

      const chats = await getChatList(userId);

      const items: BookingChat[] = chats.map((booking: any) => {
        const other =
          booking.customer_id === userId
            ? booking.worker
            : booking.customer;

        return {
          bookingId: booking.id,
          user: other,
          status: booking.status,
          lastMessage: booking.last_message,
          unreadCount: booking.unread_count,
        };
      });

      setRawChats(items);

      const grouped = groupConversations(items);

      setSelectedUserId((current) => {
        if (
          current &&
          grouped.some((conversation) => conversation.user.id === current)
        ) {
          return current;
        }

        return grouped[0]?.user.id ?? "";
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load conversations.",
      );
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let listChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data.user || cancelled) {
        setListLoading(false);
        return;
      }

      setCurrentUserId(data.user.id);
      await loadChats(data.user.id);

      if (cancelled) return;

      listChannel = supabase
        .channel(`floating-chat-list-${data.user.id}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => void loadChats(data.user.id),
        )
        .subscribe();
    }

    void initialize();

    return () => {
      cancelled = true;

      if (listChannel) {
        void supabase.removeChannel(listChannel);
      }
    };
  }, [loadChats]);

  useEffect(() => {
    if (!selectedConversation) {
      setSelectedBookingId(null);
      return;
    }

    const currentBookingStillValid =
      selectedBookingId !== null &&
      selectedConversation.bookings.some(
        (booking) => booking.bookingId === selectedBookingId,
      );

    if (!currentBookingStillValid) {
      setSelectedBookingId(selectedConversation.latestBooking.bookingId);
    }
  }, [selectedBookingId, selectedConversation]);

  useEffect(() => {
    if (!open || minimized || !selectedBookingId || !currentUserId) {
      return;
    }

    let cancelled = false;
    let messageChannel: ReturnType<typeof supabase.channel> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initializeChat() {
      setChatLoading(true);
      setError("");
      setMessages([]);
      setContext(null);
      setOtherTyping(false);

      try {
        const [chatContext, history] = await Promise.all([
          getChatContext(selectedBookingId!, currentUserId),
          getMessages(selectedBookingId!),
        ]);

        if (cancelled) return;

        setContext(chatContext);
        setMessages(history);

        await markMessagesSeen(selectedBookingId!, currentUserId);

        setRawChats((previous) =>
          previous.map((item) =>
            item.bookingId === selectedBookingId
              ? { ...item, unreadCount: 0 }
              : item,
          ),
        );

        messageChannel = subscribeToMessages(
          selectedBookingId!,
          currentUserId,
          async (incoming) => {
            if (cancelled) return;

            setMessages((previous) => upsertMessage(previous, incoming));

            if (incoming.sender_id !== currentUserId) {
              await markMessagesSeen(
                selectedBookingId!,
                currentUserId,
              ).catch(console.error);
            }

            scrollToBottom();
          },
        );

        presenceChannel = supabase.channel(
          `floating-typing-${selectedBookingId}-${currentUserId}-${crypto.randomUUID()}`,
          {
            config: {
              presence: {
                key: currentUserId,
              },
            },
          },
        );

        typingChannel.current = presenceChannel;

        presenceChannel
          .on("presence", { event: "sync" }, () => {
            const state = presenceChannel?.presenceState() ?? {};

            const typing = Object.entries(state).some(
              ([id, presences]) =>
                id !== currentUserId &&
                Array.isArray(presences) &&
                presences.some((presence) =>
                  Boolean((presence as { typing?: boolean }).typing),
                ),
            );

            setOtherTyping(typing);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel?.track({ typing: false });
            }
          });

        scrollToBottom("auto");
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load this conversation.",
          );
        }
      } finally {
        if (!cancelled) {
          setChatLoading(false);
        }
      }
    }

    void initializeChat();

    return () => {
      cancelled = true;

      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }

      if (messageChannel) {
        void unsubscribe(messageChannel);
      }

      if (presenceChannel) {
        void supabase.removeChannel(presenceChannel);
      }

      typingChannel.current = null;
    };
  }, [
    currentUserId,
    minimized,
    open,
    scrollToBottom,
    selectedBookingId,
  ]);

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length, scrollToBottom]);
  function openFullMessages() {
    setOpen(false);
    setMinimized(false);
    setMobileChatOpen(false);

    const currentPath = window.location.pathname;

    if (currentPath.startsWith("/worker")) {
      navigate("/worker/messages");
      return;
    }

    navigate("/customer/messages");
  }
  function selectConversation(conversation: Conversation) {
    setSelectedUserId(conversation.user.id);
    setSelectedBookingId(conversation.latestBooking.bookingId);
    setMobileChatOpen(true);
  }

  function handleTyping(value: string) {
    setDraft(value);

    void typingChannel.current?.track({
      typing: value.trim().length > 0,
    });

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      void typingChannel.current?.track({ typing: false });
    }, 1200);
  }

  async function handleSend() {
    const trimmed = draft.trim();

    if (
      !trimmed ||
      !selectedBookingId ||
      !currentUserId ||
      sending ||
      uploading
    ) {
      return;
    }

    setSending(true);
    setDraft("");
    setError("");

    void typingChannel.current?.track({ typing: false });

    try {
      const saved = await sendMessage(
        selectedBookingId,
        currentUserId,
        trimmed,
      );

      setMessages((previous) => upsertMessage(previous, saved));
      scrollToBottom();
      await loadChats(currentUserId);
    } catch (caught) {
      setDraft(trimmed);
      setError(
        caught instanceof Error ? caught.message : "Message failed.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedBookingId || !currentUserId || uploading) return;

    setUploading(true);
    setError("");

    try {
      const url = await uploadChatImage(file);
      const saved = await sendImage(
        selectedBookingId,
        currentUserId,
        url,
      );

      setMessages((previous) => upsertMessage(previous, saved));
      scrollToBottom();
      await loadChats(currentUserId);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedBookingId || !currentUserId || uploading) return;

    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadChatFile(file);
      const saved = await sendFile(
        selectedBookingId,
        currentUserId,
        uploaded.url,
        uploaded.name,
      );

      setMessages((previous) => upsertMessage(previous, saved));
      scrollToBottom();
      await loadChats(currentUserId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "File upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  const otherUser = context
    ? context.customer_id === currentUserId
      ? context.worker
      : context.customer
    : selectedConversation?.user ?? null;

  const otherName = fullName(otherUser);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMinimized(false);
          }}
          className="fixed bottom-5 right-4 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-600/35 transition hover:-translate-y-1 hover:bg-blue-700 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
          aria-label="Open messages"
        >
          <MessageCircle className="h-7 w-7" />

          {unreadTotal > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-xs font-black text-white">
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </button>
      )}

      {open && minimized && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="fixed bottom-5 right-4 z-[90] flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-4 shadow-2xl ring-1 ring-slate-200 transition hover:-translate-y-1 sm:bottom-6 sm:right-6"
        >
          {selectedConversation ? (
            <Avatar user={selectedConversation.user} small />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
              <MessageCircle className="h-5 w-5" />
            </span>
          )}

          <div className="text-left">
            <p className="max-w-36 truncate text-sm font-black text-slate-900">
              {selectedConversation
                ? fullName(selectedConversation.user)
                : "Messages"}
            </p>
            <p className="text-[11px] text-slate-500">
              Click to continue
            </p>
          </div>

          {unreadTotal > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-black text-white">
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </button>
      )}

      {open && !minimized && (
        <section className="fixed bottom-0 right-0 z-[90] flex h-[min(720px,calc(100vh-1rem))] w-full max-w-[760px] overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200 sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[calc(100vw-3rem)] sm:rounded-[26px] lg:w-[760px]">
          <aside
            className={`w-full shrink-0 border-r border-slate-200 bg-white sm:w-[310px] ${
              mobileChatOpen ? "hidden sm:flex" : "flex"
            } flex-col`}
          >
            <header className="border-b border-slate-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Messages
                  </h2>
                  <p className="text-xs text-slate-500">
                    {conversations.length} conversation
                    {conversations.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              {listLoading ? (
                <div className="flex h-full items-center justify-center">
                  <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">
                    No conversations found
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const latest = conversation.latestBooking;
                  const selected =
                    selectedUserId === conversation.user.id;

                  return (
                    <button
                      key={conversation.user.id}
                      type="button"
                      onClick={() => selectConversation(conversation)}
                      className={`flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left transition ${
                        selected
                          ? "bg-blue-50"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <Avatar user={conversation.user} />

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <h3 className="truncate text-sm font-black text-slate-900">
                            {fullName(conversation.user)}
                          </h3>

                          <span className="shrink-0 text-[10px] text-slate-400">
                            {listTime(latest.lastMessage?.created_at)}
                          </span>
                        </div>

                        <p
                          className={`mt-1 truncate text-xs ${
                            conversation.unreadCount
                              ? "font-bold text-slate-900"
                              : "text-slate-500"
                          }`}
                        >
                          {preview(latest)}
                        </p>

                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-blue-600">
                            {conversation.bookings.length > 1
                              ? `${conversation.bookings.length} bookings`
                              : `Booking #${latest.bookingId}`}
                          </span>

                          {conversation.unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
                              {conversation.unreadCount > 99
                                ? "99+"
                                : conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div
            className={`min-w-0 flex-1 flex-col bg-slate-50 ${
              mobileChatOpen ? "flex" : "hidden sm:flex"
            }`}
          >
            {!selectedConversation || !selectedBookingId ? (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <div>
                  <MessageCircle className="mx-auto h-12 w-12 text-blue-300" />
                  <h3 className="mt-4 font-black text-slate-900">
                    Select a conversation
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a person to start messaging.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <header className="flex min-h-[68px] items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    className="rounded-full p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <Avatar user={selectedConversation.user} small />

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-black text-slate-900">
                      {fullName(selectedConversation.user)}
                    </h3>
                    <p className="text-[11px] font-medium text-emerald-600">
                      ● Available
                    </p>
                  </div>

                  <div className="relative max-w-[160px]">
                    <select
                      value={selectedBookingId}
                      onChange={(event) =>
                        setSelectedBookingId(Number(event.target.value))
                      }
                      className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-1 pl-3 pr-8 text-[11px] font-bold text-slate-700 outline-none"
                    >
                      {selectedConversation.bookings.map((booking) => (
                        <option
                          key={booking.bookingId}
                          value={booking.bookingId}
                        >
                          #{booking.bookingId} · {booking.status}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>

                  <button
                    type="button"
                    onClick={openFullMessages}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Open full-screen messages"
                    title="Open full-screen messages"
                  >
                    <Expand className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMinimized(true)}
                    className="hidden rounded-full p-2 text-slate-500 transition hover:bg-slate-100 sm:block"
                    aria-label="Minimize chat"
                    title="Minimize chat"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setMinimized(false);
                      setMobileChatOpen(false);
                    }}
                    className="hidden rounded-full p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 sm:block"
                    aria-label="Close chat"
                    title="Close chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </header>

                <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_#eff6ff,_#f8fafc_45%)] px-3 py-4">
                  {chatLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mt-20 text-center">
                      <MessageCircle className="mx-auto h-10 w-10 text-blue-300" />
                      <h3 className="mt-3 font-black text-slate-800">
                        Start the conversation
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Send a message about Booking #{selectedBookingId}.
                      </p>
                    </div>
                  ) : (
                    messages.map((item, index) => {
                      const mine = item.sender_id === currentUserId;
                      const previous = messages[index - 1];
                      const showDay =
                        !previous ||
                        new Date(previous.created_at).toDateString() !==
                          new Date(item.created_at).toDateString();

                      return (
                        <div key={item.id}>
                          {showDay && (
                            <div className="my-4 text-center">
                              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                                {messageDay(item.created_at)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`mb-2 flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div className="max-w-[82%]">
                              <div
                                className={`overflow-hidden rounded-2xl shadow-sm ${
                                  mine
                                    ? "rounded-br-md bg-blue-600 text-white"
                                    : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                                }`}
                              >
                                {item.image_url && (
                                  <a
                                    href={item.image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <img
                                      src={item.image_url}
                                      alt="Chat attachment"
                                      className="max-h-64 w-full object-cover"
                                    />
                                  </a>
                                )}

                                {item.message && (
                                  <p className="whitespace-pre-wrap break-words px-3 pt-2.5 text-sm leading-5">
                                    {item.message}
                                  </p>
                                )}

                                {item.file_url && (
                                  <a
                                    href={item.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`m-2 flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold ${
                                      mine ? "bg-blue-500" : "bg-slate-100"
                                    }`}
                                  >
                                    <FileText className="h-4 w-4 shrink-0" />
                                    <span className="truncate">
                                      {item.file_name || "Attachment"}
                                    </span>
                                  </a>
                                )}

                                <div className="flex items-center justify-end gap-1 px-3 pb-2 pt-1 text-[9px] opacity-75">
                                  <span>{messageTime(item.created_at)}</span>

                                  {mine && (
                                    <span className="inline-flex items-center gap-0.5">
                                      <CheckCheck className="h-3 w-3" />
                                      {item.seen_at ? "Seen" : "Sent"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {otherTyping && (
                    <div className="mb-2 flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                        {otherName} is typing...
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </main>

                <footer className="border-t border-slate-200 bg-white p-2.5">
                  {error && (
                    <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {error}
                    </p>
                  )}

                  <div className="flex items-end gap-1">
                    <label className="cursor-pointer rounded-full p-2 text-blue-600 hover:bg-blue-50">
                      <ImagePlus className="h-5 w-5" />

                      <input
                        hidden
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        onChange={handleImage}
                      />
                    </label>

                    <label className="cursor-pointer rounded-full p-2 text-blue-600 hover:bg-blue-50">
                      <Paperclip className="h-5 w-5" />

                      <input
                        hidden
                        type="file"
                        accept=".pdf,.doc,.docx"
                        disabled={uploading}
                        onChange={handleFile}
                      />
                    </label>

                    <textarea
                      value={draft}
                      onChange={(event) => handleTyping(event.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      maxLength={2000}
                      placeholder="Type a message..."
                      className="max-h-24 min-h-10 flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />

                    <button
                      type="button"
                      disabled={!draft.trim() || sending || uploading}
                      onClick={() => void handleSend()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300"
                      aria-label="Send message"
                    >
                      {sending || uploading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}