import {
  ArrowLeft,
  CheckCheck,
  Circle,
  FileText,
  ImagePlus,
  LoaderCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Video,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  getChatContext,
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

function upsertMessage(
  list: ChatMessage[],
  incoming: ChatMessage,
) {
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === today.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Offline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Offline";
  }

  const now = new Date();
  const difference = Math.max(
    0,
    now.getTime() - date.getTime(),
  );

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) {
    return "Active recently";
  }

  if (minutes < 1) {
    return "Last seen just now";
  }

  if (minutes < 60) {
    return `Last seen ${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  if (hours < 24) {
    return `Last seen ${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  if (days === 1) {
    return `Last seen yesterday at ${formatTime(value)}`;
  }

  return `Last seen ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)} at ${formatTime(value)}`;
}

function getFileExtension(filename: string | null | undefined) {
  if (!filename) {
    return "FILE";
  }

  const extension = filename.split(".").pop();

  return extension?.toUpperCase() || "FILE";
}

export default function ChatRoom() {
  const { bookingId: bookingIdParam } = useParams();
  const navigate = useNavigate();

  const bookingId = Number(bookingIdParam);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<ChatContext | null>(null);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const typingChannel =
    useRef<ReturnType<typeof supabase.channel> | null>(null);

  const typingTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const heartbeatTimer =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const initializedRef = useRef(false);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior,
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (!Number.isFinite(bookingId)) {
      setError("Invalid booking conversation.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    let messageChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let presenceChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let profileChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        const {
          data,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!data.user) {
          throw new Error(
            "Please sign in to open this chat.",
          );
        }

        if (cancelled) {
          return;
        }

        const currentUserId = data.user.id;

        setUserId(currentUserId);

        const [chatContext, history] = await Promise.all([
          getChatContext(bookingId, currentUserId),
          getMessages(bookingId, currentUserId),
        ]);

        if (cancelled) {
          return;
        }

        setContext(chatContext);
        setMessages(history);

        const chatOtherUserId =
          chatContext.customer_id === currentUserId
            ? chatContext.worker_id
            : chatContext.customer_id;

        const {
          data: otherProfile,
          error: otherProfileError,
        } = await supabase
          .from("profiles")
          .select("last_seen")
          .eq("id", chatOtherUserId)
          .maybeSingle();

        if (otherProfileError) {
          console.error(
            "Unable to load last seen:",
            otherProfileError,
          );
        }

        if (!cancelled) {
          setOtherLastSeen(
            otherProfile?.last_seen ?? null,
          );
        }

        await markMessagesSeen(
          bookingId,
          currentUserId,
        );

        messageChannel = subscribeToMessages(
          bookingId,
          currentUserId,
          async (incoming) => {
            if (cancelled) {
              return;
            }

            setMessages((previous) =>
              upsertMessage(previous, incoming),
            );

            if (
              incoming.sender_id !== currentUserId
            ) {
              await markMessagesSeen(
                bookingId,
                currentUserId,
              ).catch(console.error);
            }

            scrollToBottom();
          },
        );

        presenceChannel = supabase.channel(
          `chat-presence-${bookingId}`,
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
          .on(
            "presence",
            {
              event: "sync",
            },
            () => {
              const presenceState =
                presenceChannel?.presenceState() ?? {};

              const otherPersonPresent =
                Object.entries(presenceState).some(
                  ([presenceUserId, presences]) =>
                    presenceUserId !== currentUserId &&
                    Array.isArray(presences) &&
                    presences.length > 0,
                );

              const someoneElseIsTyping =
                Object.entries(presenceState).some(
                  ([presenceUserId, presences]) =>
                    presenceUserId !== currentUserId &&
                    Array.isArray(presences) &&
                    presences.some((presence) =>
                      Boolean(
                        (
                          presence as {
                            typing?: boolean;
                          }
                        ).typing,
                      ),
                    ),
                );

              setOtherOnline(otherPersonPresent);
              setOtherTyping(
                someoneElseIsTyping,
              );
            },
          )
          .on(
            "presence",
            {
              event: "leave",
            },
            () => {
              setOtherOnline(false);
              setOtherTyping(false);

              setOtherLastSeen(
                new Date().toISOString(),
              );
            },
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await presenceChannel?.track({
                user_id: currentUserId,
                online: true,
                typing: false,
                joined_at: new Date().toISOString(),
              });

              const { error: lastSeenError } =
                await supabase.rpc(
                  "update_my_last_seen",
                );

              if (lastSeenError) {
                console.error(
                  "Unable to update last seen:",
                  lastSeenError,
                );
              }
            }
          });

        profileChannel = supabase
          .channel(
            `chat-profile-${chatOtherUserId}-${crypto.randomUUID()}`,
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${chatOtherUserId}`,
            },
            (payload) => {
              const updatedProfile =
                payload.new as {
                  id?: string;
                  last_seen?: string | null;
                };

              if (
                updatedProfile.id ===
                chatOtherUserId
              ) {
                setOtherLastSeen(
                  updatedProfile.last_seen ?? null,
                );
              }
            },
          )
          .subscribe();

        heartbeatTimer.current = setInterval(
          () => {
            void supabase
              .rpc("update_my_last_seen")
              .then(({ error: heartbeatError }) => {
                if (heartbeatError) {
                  console.error(
                    "Last seen heartbeat failed:",
                    heartbeatError,
                  );
                }
              });
          },
          30_000,
        );

        initializedRef.current = true;
        scrollToBottom("auto");
} catch (caught) {
  console.error("CHAT ERROR", caught);

  if (!cancelled) {
    setError(
      caught instanceof Error
        ? caught.message
        : "Unable to load chat.",
    );
  }
} finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      initializedRef.current = false;

      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }

      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }

      void supabase.rpc("update_my_last_seen");

      if (messageChannel) {
        void unsubscribe(messageChannel);
      }

      if (presenceChannel) {
        void supabase.removeChannel(
          presenceChannel,
        );
      }

      if (profileChannel) {
        void supabase.removeChannel(profileChannel);
      }

      typingChannel.current = null;
    };
  }, [bookingId, scrollToBottom]);

  useEffect(() => {
    if (initializedRef.current) {
      scrollToBottom("auto");
    }
  }, [messages.length, scrollToBottom]);

  function handleTyping(value: string) {
    setMessage(value);

    void typingChannel.current?.track({
      user_id: userId,
      online: true,
      typing: value.trim().length > 0,
      updated_at: new Date().toISOString(),
    });

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      void typingChannel.current?.track({
        user_id: userId,
        online: true,
        typing: false,
        updated_at: new Date().toISOString(),
      });
    }, 1200);
  }

  async function handleSend() {
    const trimmed = message.trim();

    if (!trimmed || !userId || sending || uploading) {
      return;
    }

    setSending(true);
    setError("");
    setMessage("");

    void typingChannel.current?.track({
      user_id: userId,
      online: true,
      typing: false,
      updated_at: new Date().toISOString(),
    });

    try {
      const saved = await sendMessage(
        bookingId,
        userId,
        trimmed,
      );

      setMessages((previous) =>
        upsertMessage(previous, saved),
      );

      scrollToBottom();

      textareaRef.current?.focus();
    } catch (caught) {
      setMessage(trimmed);

      setError(
        caught instanceof Error
          ? caught.message
          : "Message failed.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void handleSend();
    }
  }

  async function handleImage(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !userId || uploading) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const url = await uploadChatImage(file);

      const saved = await sendImage(
        bookingId,
        userId,
        url,
      );

      setMessages((previous) =>
        upsertMessage(previous, saved),
      );

      scrollToBottom();
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

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !userId || uploading) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadChatFile(file);

      const saved = await sendFile(
        bookingId,
        userId,
        uploaded.url,
        uploaded.name,
      );

      setMessages((previous) =>
        upsertMessage(previous, saved),
      );

      scrollToBottom();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "File upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  const otherUser = context
    ? context.customer_id === userId
      ? context.worker
      : context.customer
    : null;

  const otherName = otherUser
    ? `${otherUser.first_name ?? ""} ${
        otherUser.last_name ?? ""
      }`.trim()
    : "Conversation";

  const profilePicture =
    otherUser?.profile_picture ||
    "https://placehold.co/96x96?text=User";

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="relative flex w-full max-w-md flex-col items-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm dark:bg-blue-500/15 dark:text-blue-300">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
          </div>

          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Loading conversation...
          </p>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="relative w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
            <MessageCircleIcon />
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
            Chat unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {error ||
              "This conversation could not be opened."}
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 min-h-11 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 p-0 dark:bg-slate-950 sm:p-3">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden opacity-[0.03] dark:opacity-[0.018] sm:block"
        style={{
          backgroundImage:
            "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="relative mx-auto flex h-dvh w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-950 sm:h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] sm:border sm:border-slate-200/80 dark:sm:border-slate-800">
        {/* Chat Header */}
        <header className="relative z-20 flex min-h-[76px] items-center gap-3 border-b border-slate-200/80 bg-white/95 px-3 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-5 lg:px-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="relative shrink-0">
            <img
              src={profilePicture}
              alt={otherName}
              className="h-12 w-12 rounded-2xl border border-white object-cover shadow-sm ring-2 ring-slate-100 dark:border-slate-900 dark:ring-slate-700"
            />

            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[3px] border-white dark:border-slate-900 ${
                otherOnline
                  ? "bg-emerald-500"
                  : "bg-slate-400"
              }`}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-[15px] font-black text-slate-900 dark:text-white sm:text-base">
                {otherName}
              </h1>

              <ShieldCheck className="h-4 w-4 shrink-0 fill-blue-600 text-white" />
            </div>

            <div className="mt-0.5 flex items-center gap-1.5">
              {otherTyping ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>

                  <p className="truncate text-xs font-bold text-blue-600 dark:text-blue-300">
                    typing...
                  </p>
                </>
              ) : otherOnline ? (
                <>
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />

                  <p className="truncate text-xs font-bold text-emerald-600 dark:text-emerald-300">
                    Active now
                  </p>
                </>
              ) : (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {formatLastSeen(otherLastSeen)}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Search conversation"
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 sm:flex"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Start voice call"
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 md:flex"
            >
              <Phone className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Start video call"
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 md:flex"
            >
              <Video className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Conversation options"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Booking Information */}
        <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/70 px-4 py-2.5 dark:border-blue-500/20 dark:bg-blue-500/10 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Booking #{context.id}
            </p>
          </div>

          <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-black capitalize text-blue-700 shadow-sm dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-300">
            {context.status}
          </span>
        </div>

        {/* Messages */}
        <main
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] sm:px-6 sm:py-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, rgba(59,130,246,0.06), transparent 30%), radial-gradient(circle at bottom right, rgba(99,102,241,0.05), transparent 35%)",
            backgroundColor: "transparent",
          }}
        >
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-[55vh] max-w-sm flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-500/15 dark:text-blue-300">
                <Send className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
                Start your conversation
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Ask questions, send booking details, or
                share important files with {otherName}.
              </p>
            </div>
          ) : (
            messages.map((item, index) => {
              const mine =
                item.sender_id === userId;

              const previous =
                messages[index - 1];

              const next = messages[index + 1];

              const showDay =
                !previous ||
                new Date(
                  previous.created_at,
                ).toDateString() !==
                  new Date(
                    item.created_at,
                  ).toDateString();

              const sameSenderAsPrevious =
                previous?.sender_id ===
                  item.sender_id &&
                !showDay;

              const sameSenderAsNext =
                next?.sender_id === item.sender_id &&
                new Date(
                  next.created_at,
                ).toDateString() ===
                  new Date(
                    item.created_at,
                  ).toDateString();

              return (
                <div key={item.id}>
                  {showDay && (
                    <div className="my-6 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                        {formatDay(
                          item.created_at,
                        )}
                      </span>

                      <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    </div>
                  )}

                  <div
                    className={`flex ${
                      sameSenderAsNext
                        ? "mb-1"
                        : "mb-3"
                    } ${
                      mine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {!mine && (
                      <div className="mr-2 flex w-8 shrink-0 items-end">
                        {!sameSenderAsNext && (
                          <img
                            src={profilePicture}
                            alt={otherName}
                            className="h-8 w-8 rounded-xl border border-white object-cover shadow-sm dark:border-slate-900"
                          />
                        )}
                      </div>
                    )}

                    <div
                      className={`flex max-w-[84%] flex-col sm:max-w-[68%] ${
                        mine
                          ? "items-end"
                          : "items-start"
                      }`}
                    >
                      {!mine &&
                        !sameSenderAsPrevious && (
                          <p className="mb-1 ml-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {otherName}
                          </p>
                        )}

                      <div
                        className={`overflow-hidden shadow-sm ${
                          mine
                            ? `bg-linear-to-br from-blue-600 to-indigo-600 text-white ${
                                sameSenderAsNext
                                  ? "rounded-2xl rounded-br-md"
                                  : "rounded-2xl rounded-br-md"
                              }`
                            : `border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${
                                sameSenderAsNext
                                  ? "rounded-2xl rounded-bl-md"
                                  : "rounded-2xl rounded-bl-md"
                              }`
                        }`}
                      >
                        {item.image_url && (
                          <a
                            href={item.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden"
                          >
                            <img
                              src={item.image_url}
                              alt="Chat attachment"
                              className="max-h-107.5 w-full min-w-52.5 object-cover transition duration-300 hover:scale-[1.02]"
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
                            className={`m-2 flex min-w-57.5 items-center gap-3 rounded-xl p-3 transition ${
                              mine
                                ? "bg-white/15 hover:bg-white/20"
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                            }`}
                          >
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                mine
                                  ? "bg-white/15"
                                  : "bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"
                              }`}
                            >
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">
                                {item.file_name ||
                                  "Attachment"}
                              </p>

                              <p
                                className={`mt-0.5 text-[10px] font-medium ${
                                  mine
                                    ? "text-blue-100"
                                    : "text-slate-500"
                                }`}
                              >
                                {getFileExtension(
                                  item.file_name,
                                )}{" "}
                                document · Open file
                              </p>
                            </div>
                          </a>
                        )}

                        <div
                          className={`flex items-center justify-end gap-1.5 px-3 pb-2 pt-1 text-[10px] ${
                            mine
                              ? "text-blue-100"
                              : "text-slate-400"
                          }`}
                        >
                          <span>
                            {formatTime(
                              item.created_at,
                            )}
                          </span>

                          {mine && (
                            <span className="flex items-center gap-0.5">
                              <CheckCheck
                                className={`h-3.5 w-3.5 ${
                                  item.seen_at
                                    ? "text-cyan-200"
                                    : "text-blue-200"
                                }`}
                              />

                              <span>
                                {item.seen_at
                                  ? "Seen"
                                  : "Sent"}
                              </span>
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
            <div className="mb-3 flex items-end gap-2">
              <img
                src={profilePicture}
                alt=""
                className="h-8 w-8 rounded-xl border border-white object-cover shadow-sm dark:border-slate-900"
              />

              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* Message Composer */}
        <footer className="border-t border-slate-200/80 bg-white/95 px-3 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-5 sm:py-4">
          {error && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0 text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200"
              >
                Close
              </button>
            </div>
          )}

          {uploading && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Uploading attachment...
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex shrink-0 items-center">
              <label
                aria-label="Upload image"
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 ${
                  uploading
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                <ImagePlus className="h-5 w-5" />

                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={handleImage}
                />
              </label>

              <label
                aria-label="Upload file"
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 ${
                  uploading
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                <Paperclip className="h-5 w-5" />

                <input
                  hidden
                  type="file"
                  accept=".pdf,.doc,.docx"
                  disabled={uploading}
                  onChange={handleFile}
                />
              </label>
            </div>

            <div className="flex min-h-12 flex-1 items-end rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:bg-slate-900">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(event) =>
                  handleTyping(event.target.value)
                }
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder={`Message ${otherName}...`}
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              />

              {message.length > 0 && (
                <span className="mb-3 ml-2 shrink-0 text-[10px] text-slate-400">
                  {message.length}/2000
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={
                !message.trim() ||
                sending ||
                uploading
              }
              onClick={() => void handleSend()}
              aria-label="Send message"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-none disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
            >
              {sending ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5 translate-x-px" />
              )}
            </button>
          </div>

          <p className="mt-2 hidden pl-24 text-[10px] font-medium text-slate-400 dark:text-slate-500 sm:block">
            Enter to send · Shift + Enter for a new
            line
          </p>
        </footer>
      </div>
    </div>
  );
}

function MessageCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7 text-red-500"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      <path d="M9 9l6 6" />
      <path d="M15 9l-6 6" />
    </svg>
  );
}