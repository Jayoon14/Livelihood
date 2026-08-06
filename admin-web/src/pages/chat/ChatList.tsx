import {
  ArrowLeft,
  CheckCheck,
  FileText,
  ImagePlus,
  Inbox,
  LoaderCircle,
  MessageCircle,
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
import type { ChangeEvent, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";

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

type FilterType = "all" | "unread";

function upsertMessage(list: ChatMessage[], incoming: ChatMessage) {
  const index = list.findIndex(
    (item) => String(item.id) === String(incoming.id),
  );

  if (index === -1) {
    return [...list, incoming];
  }

  const copy = [...list];
  copy[index] = incoming;
  return copy;
}

function getName(user: BookingChat["user"] | null | undefined) {
  if (!user) return "User";

  return (
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "User"
  );
}

function getMessagePreview(chat: BookingChat) {
  if (!chat.lastMessage) return "Start a conversation";
  if (chat.lastMessage.image_url) return "Sent a photo";

  if (chat.lastMessage.file_name) {
    return `Sent a file: ${chat.lastMessage.file_name}`;
  }

  return chat.lastMessage.message?.trim() || "New message";
}

function getSortTime(chat: BookingChat) {
  const value = chat.lastMessage?.created_at;

  return value ? new Date(value).getTime() : 0;
}

function formatListTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMessageDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Approved":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
    case "On Going":
      return "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20";
    case "Completed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
    case "Pending":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
    case "Cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
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
      const sortedBookings = [...bookings].sort(
        (a, b) => getSortTime(b) - getSortTime(a),
      );

      return {
        user: sortedBookings[0].user,
        bookings: sortedBookings,
        latestBooking: sortedBookings[0],
        unreadCount: sortedBookings.reduce(
          (total, item) => total + item.unreadCount,
          0,
        ),
      };
    })
    .sort(
      (a, b) =>
        getSortTime(b.latestBooking) - getSortTime(a.latestBooking),
    );
}

function Avatar({
  user,
  size = "normal",
}: {
  user: BookingChat["user"];
  size?: "normal" | "small";
}) {
  const name = getName(user);
  const dimensions = size === "small" ? "h-10 w-10" : "h-14 w-14";

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
        className={`${dimensions} rounded-2xl object-cover ring-2 ring-white shadow-sm dark:ring-slate-900`}
      />

      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-emerald-500 dark:border-slate-900" />
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full items-center justify-center bg-linear-to-br from-slate-50 to-blue-50/60 p-8 text-center dark:from-slate-950 dark:to-blue-950/30">
      <div>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-600 text-white shadow-xl shadow-blue-600/25">
          <MessageCircle className="h-9 w-9" />
        </div>

        <h2 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">
          Select a conversation
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          Choose a person from the left side to view and send messages directly.
        </p>
      </div>
    </div>
  );
}

export default function ChatList() {
  const navigate = useNavigate();

  const [rawChats, setRawChats] = useState<BookingChat[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );

  const [currentUserId, setCurrentUserId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [message, setMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedChatRef = useRef(false);

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
    const keyword = query.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (filter === "unread" && conversation.unreadCount === 0) {
        return false;
      }

      if (!keyword) return true;

      const name = getName(conversation.user).toLowerCase();

      return (
        name.includes(keyword) ||
        conversation.bookings.some(
          (booking) =>
            String(booking.bookingId).includes(keyword) ||
            booking.status.toLowerCase().includes(keyword) ||
            getMessagePreview(booking).toLowerCase().includes(keyword),
        )
      );
    });
  }, [conversations, filter, query]);

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
      setListError("");

      const chats = await getChatList(userId);

      const items: BookingChat[] = chats.map((booking) => {
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

      setSelectedBookingId((current) => {
        if (
          current &&
          items.some((booking) => booking.bookingId === current)
        ) {
          return current;
        }

        return grouped[0]?.latestBooking.bookingId ?? null;
      });
    } catch (caught) {
      setListError(
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
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || cancelled) {
        setListLoading(false);
        setListError(error?.message || "Please sign in to view messages.");
        return;
      }

      setCurrentUserId(data.user.id);
      await loadChats(data.user.id);

      if (cancelled) return;

      listChannel = supabase
        .channel(`message-list-${data.user.id}-${crypto.randomUUID()}`)
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
    if (!currentUserId) {
      return;
    }

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void loadChats(currentUserId);
      }
    };

    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [currentUserId, loadChats]);

  useEffect(() => {
    if (!selectedConversation) {
      setSelectedBookingId(null);
      return;
    }

    const selectedStillBelongsToUser =
      selectedBookingId !== null &&
      selectedConversation.bookings.some(
        (booking) => booking.bookingId === selectedBookingId,
      );

    if (!selectedStillBelongsToUser) {
      setSelectedBookingId(selectedConversation.latestBooking.bookingId);
    }
  }, [selectedBookingId, selectedConversation]);

  useEffect(() => {
    if (!selectedBookingId || !currentUserId) {
      setMessages([]);
      setContext(null);
      return;
    }

    let cancelled = false;
    let messageChannel: ReturnType<typeof supabase.channel> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    async function initializeChat() {
      setChatLoading(true);
      setChatError("");
      setMessages([]);
      setContext(null);
      setOtherTyping(false);

      try {
        const [chatContext, history] = await Promise.all([
          getChatContext(selectedBookingId!, currentUserId),
          getMessages(selectedBookingId!, currentUserId),
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

              setRawChats((previous) =>
                previous.map((item) =>
                  item.bookingId === selectedBookingId
                    ? { ...item, unreadCount: 0 }
                    : item,
                ),
              );
            }

            scrollToBottom();
          },
        );

        presenceChannel = supabase.channel(
          `typing-${selectedBookingId}-${currentUserId}-${crypto.randomUUID()}`,
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

            const someoneElseIsTyping = Object.entries(state).some(
              ([id, presences]) =>
                id !== currentUserId &&
                Array.isArray(presences) &&
                presences.some((presence) =>
                  Boolean((presence as { typing?: boolean }).typing),
                ),
            );

            setOtherTyping(someoneElseIsTyping);
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel?.track({ typing: false });
            }
          });

        initializedChatRef.current = true;
        scrollToBottom("auto");
      } catch (caught) {
        if (!cancelled) {
          setChatError(
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
      initializedChatRef.current = false;

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
  }, [currentUserId, scrollToBottom, selectedBookingId]);

  useEffect(() => {
    if (initializedChatRef.current) {
      scrollToBottom("auto");
    }
  }, [messages.length, scrollToBottom]);

  function selectConversation(conversation: Conversation) {
    setSelectedUserId(conversation.user.id);
    setSelectedBookingId(conversation.latestBooking.bookingId);
    setShowMobileChat(true);
  }

  function handleTyping(value: string) {
    setMessage(value);

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
    const trimmed = message.trim();

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
    setChatError("");
    setMessage("");

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
      setMessage(trimmed);
      setChatError(
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

    if (
      !file ||
      !selectedBookingId ||
      !currentUserId ||
      uploading
    ) {
      return;
    }

    setUploading(true);
    setChatError("");

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
      setChatError(
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

    if (
      !file ||
      !selectedBookingId ||
      !currentUserId ||
      uploading
    ) {
      return;
    }

    setUploading(true);
    setChatError("");

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
      setChatError(
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

  const otherName = otherUser
    ? `${otherUser.first_name ?? ""} ${otherUser.last_name ?? ""}`.trim() ||
      "User"
    : "Conversation";

  return (
    <main className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <section className="mx-auto flex h-full w-full max-w-[1800px] overflow-hidden bg-white shadow-2xl dark:bg-slate-950">
        <aside
          className={`w-full shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-[390px] ${
            showMobileChat ? "hidden lg:flex" : "flex"
          } flex-col`}
        >
          <div className="border-b border-slate-200 bg-white/95 px-4 pb-4 pt-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-5 sm:pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Go back"
                  title="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Messages
                  </h1>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {conversations.length} conversation
                    {conversations.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {unreadTotal > 0 && (
                <div className="shrink-0 rounded-2xl bg-blue-600 px-3 py-2 text-center text-white shadow-lg shadow-blue-600/25">
                  <p className="text-[10px] font-black uppercase tracking-wide">
                    Unread
                  </p>
                  <p className="text-lg font-black">{unreadTotal}</p>
                </div>
              )}
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  filter === "all"
                    ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                All
              </button>

              <button
                type="button"
                onClick={() => setFilter("unread")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  filter === "unread"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
            {listLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                    <div className="flex-1">
                      <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="mt-3 h-3 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listError ? (
              <div className="p-8 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-red-300" />
                <p className="mt-3 text-sm font-bold text-red-600 dark:text-red-300">
                  {listError}
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-10 text-center">
                <Inbox className="mx-auto h-10 w-10 text-slate-300" />

                <h2 className="mt-3 font-black text-slate-800 dark:text-white">
                  No conversations found
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Try another search or wait for an active booking
                  conversation.
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const latest = conversation.latestBooking;
                const isMine =
                  latest.lastMessage?.sender_id === currentUserId;
                const selected =
                  selectedUserId === conversation.user.id;

                return (
                  <button
                    key={conversation.user.id}
                    type="button"
                    onClick={() => selectConversation(conversation)}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition-colors dark:border-slate-800 ${
                      selected
                        ? "bg-blue-50 dark:bg-blue-500/10"
                        : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <Avatar user={conversation.user} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`truncate text-sm text-slate-900 dark:text-white ${
                            conversation.unreadCount > 0
                              ? "font-black"
                              : "font-bold"
                          }`}
                        >
                          {getName(conversation.user)}
                        </h3>

                        <span
                          className={`shrink-0 text-[11px] ${
                            conversation.unreadCount > 0
                              ? "font-black text-blue-600 dark:text-blue-300"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {formatListTime(
                            latest.lastMessage?.created_at,
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ${getStatusClasses(
                            latest.status,
                          )}`}
                        >
                          {latest.status}
                        </span>

                        {conversation.bookings.length > 1 && (
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            {conversation.bookings.length} bookings
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <p
                          className={`min-w-0 flex-1 truncate text-sm ${
                            conversation.unreadCount > 0
                              ? "font-bold text-slate-900 dark:text-white"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isMine && latest.lastMessage ? "You: " : ""}
                          {getMessagePreview(latest)}
                        </p>

                        {conversation.unreadCount > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-black text-white">
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

        <section
          className={`min-h-0 min-w-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950 ${
            showMobileChat ? "flex" : "hidden lg:flex"
          }`}
        >
          {!selectedConversation || !selectedBookingId ? (
            <EmptyChat />
          ) : (
            <>
              <header className="flex min-h-[76px] items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
                <button
                  type="button"
                  onClick={() => setShowMobileChat(false)}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <Avatar user={selectedConversation.user} size="small" />

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-black text-slate-900 dark:text-white">
                    {getName(selectedConversation.user)}
                  </h2>

                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    ● Available
                  </p>
                </div>

                <div className="min-w-0 max-w-[45%] sm:max-w-xs">
                  <select
                    value={selectedBookingId}
                    onChange={(event) =>
                      setSelectedBookingId(Number(event.target.value))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                    aria-label="Select booking conversation"
                  >
                    {selectedConversation.bookings.map((booking) => (
                      <option
                        key={booking.bookingId}
                        value={booking.bookingId}
                      >
                        Booking #{booking.bookingId} · {booking.status}
                      </option>
                    ))}
                  </select>
                </div>
              </header>

              <div className="relative flex min-h-0 flex-1 flex-col">
                <main className="flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#eff6ff,#f8fafc_45%,#f8fafc)] px-3 py-5 dark:bg-[radial-gradient(circle_at_top,#172554,#020617_45%,#020617)] sm:px-6 [scrollbar-width:thin]">
                  {chatLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <LoaderCircle className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : chatError && !context ? (
                    <div className="flex h-full items-center justify-center p-6 text-center">
                      <div>
                        <MessageCircle className="mx-auto h-10 w-10 text-red-300" />
                        <p className="mt-3 font-bold text-red-600 dark:text-red-300">
                          {chatError}
                        </p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="mx-auto mt-24 max-w-sm text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        <Send className="h-7 w-7" />
                      </div>

                      <h3 className="mt-4 font-black text-slate-900 dark:text-white">
                        Start your conversation
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
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
                            <div className="my-5 text-center">
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                                {formatMessageDay(item.created_at)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`mb-2 flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[86%] sm:max-w-[68%] ${
                                mine ? "items-end" : "items-start"
                              }`}
                            >
                              <div
                                className={`overflow-hidden rounded-2xl shadow-sm ${
                                  mine
                                    ? "rounded-br-md bg-blue-600 text-white shadow-blue-600/10"
                                    : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                                      className="max-h-96 w-full object-cover"
                                    />
                                  </a>
                                )}

                                {item.message && (
                                  <p className="whitespace-pre-wrap break-words px-4 pt-3 text-sm leading-6">
                                    {item.message}
                                  </p>
                                )}

                                {item.file_url && (
                                  <a
                                    href={item.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`m-2 flex items-center gap-3 rounded-xl p-3 text-sm font-semibold ${
                                      mine
                                        ? "bg-blue-500"
                                        : "bg-slate-100 dark:bg-slate-800"
                                    }`}
                                  >
                                    <FileText className="h-5 w-5 shrink-0" />

                                    <span className="truncate">
                                      {item.file_name || "Attachment"}
                                    </span>
                                  </a>
                                )}

                                <div className="flex items-center justify-end gap-1 px-3 pb-2 pt-1 text-[10px] opacity-75">
                                  <span>
                                    {formatMessageTime(item.created_at)}
                                  </span>

                                  {mine && (
                                    <span className="inline-flex items-center gap-1">
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
                    <div className="mb-3 flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        {otherName} is typing...
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </main>

                <footer className="border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-4">
                  {chatError && context && (
                    <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                      {chatError}
                    </p>
                  )}

                  <div className="flex items-end gap-1.5 sm:gap-2">
                    <label className="cursor-pointer rounded-xl p-2.5 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10">
                      <ImagePlus className="h-5 w-5" />

                      <input
                        hidden
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploading}
                        onChange={handleImage}
                      />
                    </label>

                    <label className="cursor-pointer rounded-xl p-2.5 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10">
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
                      value={message}
                      onChange={(event) =>
                        handleTyping(event.target.value)
                      }
                      onKeyDown={handleKeyDown}
                      rows={1}
                      maxLength={2000}
                      placeholder={`Message ${getName(
                        selectedConversation.user,
                      )}...`}
                      className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                    />

                    <button
                      type="button"
                      disabled={
                        !message.trim() || sending || uploading
                      }
                      onClick={() => void handleSend()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                      aria-label="Send message"
                    >
                      {sending || uploading ? (
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </footer>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}