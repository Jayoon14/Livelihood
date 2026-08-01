import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  CreditCard,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  deleteMyNotification,
  deleteMyReadNotifications,
  getCurrentNotificationUserId,
  getMyNotifications,
  getMyReadCount,
  getMyUnreadCount,
  markAllMyNotificationsAsRead,
  markMyNotificationAsRead,
  type Notification,
} from "../../../services/notificationService";
import { timeAgo } from "../../../utils/timeAgo";

type FilterType =
  | "all"
  | "unread"
  | "bookings"
  | "payments"
  | "reviews"
  | "messages";

type NotificationMessage = {
  type: "success" | "error";
  text: string;
} | null;

const PAGE_SIZE = 15;

const FILTER_OPTIONS: Array<{
  value: FilterType;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "bookings", label: "Bookings" },
  { value: "payments", label: "Payments" },
  { value: "reviews", label: "Reviews" },
  { value: "messages", label: "Messages" },
];

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

function matchesCategory(item: Notification, filter: FilterType): boolean {
  const text = `${item.title} ${item.message}`.toLowerCase();

  switch (filter) {
    case "unread":
      return !item.is_read;

    case "bookings":
      return [
        "booking",
        "job",
        "worker",
        "schedule",
        "service",
        "completed",
        "cancelled",
        "approved",
      ].some((keyword) => text.includes(keyword));

    case "payments":
      return [
        "payment",
        "receipt",
        "refund",
        "cash",
        "gcash",
        "maya",
        "bank",
      ].some((keyword) => text.includes(keyword));

    case "reviews":
      return ["review", "rating", "feedback"].some((keyword) =>
        text.includes(keyword),
      );

    case "messages":
      return ["message", "chat", "conversation"].some((keyword) =>
        text.includes(keyword),
      );

    case "all":
    default:
      return true;
  }
}

function getNotificationIcon(item: Notification): {
  icon: typeof Bell;
  wrapperClassName: string;
} {
  const text = `${item.title} ${item.message}`.toLowerCase();

  if (
    text.includes("payment") ||
    text.includes("receipt") ||
    text.includes("refund")
  ) {
    return {
      icon: CreditCard,
      wrapperClassName:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  }

  if (
    text.includes("review") ||
    text.includes("rating") ||
    text.includes("feedback")
  ) {
    return {
      icon: Star,
      wrapperClassName:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }

  if (text.includes("message") || text.includes("chat")) {
    return {
      icon: MessageCircle,
      wrapperClassName:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    };
  }

  if (
    text.includes("cancel") ||
    text.includes("reject") ||
    text.includes("decline")
  ) {
    return {
      icon: XCircle,
      wrapperClassName:
        "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    };
  }

  if (
    text.includes("approved") ||
    text.includes("completed") ||
    text.includes("success")
  ) {
    return {
      icon: CircleCheck,
      wrapperClassName:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  }

  if (
    text.includes("booking") ||
    text.includes("schedule") ||
    text.includes("job") ||
    item.booking_id
  ) {
    return {
      icon: CalendarDays,
      wrapperClassName:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  return {
    icon: Bell,
    wrapperClassName:
      "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  };
}

function getNotificationRoute(item: Notification): string | null {
  const text = `${item.title} ${item.message}`.toLowerCase();

  if (
    text.includes("payment") ||
    text.includes("receipt") ||
    text.includes("refund")
  ) {
    return "/worker/payments";
  }

  if (
    text.includes("review") ||
    text.includes("rating") ||
    text.includes("feedback")
  ) {
    return "/worker/reviews";
  }

  if (text.includes("message") || text.includes("chat")) {
    return item.booking_id ? `/chat/${item.booking_id}` : "/chat";
  }

  if (
    text.includes("booking") ||
    text.includes("schedule") ||
    text.includes("job") ||
    item.booking_id
  ) {
    return "/worker/bookings";
  }

  return null;
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mergeNotifications(
  existing: Notification[],
  incoming: Notification[],
): Notification[] {
  const records = new Map<number, Notification>();

  for (const item of existing) {
    records.set(item.id, item);
  }

  for (const item of incoming) {
    records.set(item.id, item);
  }

  return [...records.values()].sort(
    (first, second) =>
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime(),
  );
}

export default function Notifications() {
  const navigate = useNavigate();

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [globalUnreadCount, setGlobalUnreadCount] = useState(0);
  const [globalReadCount, setGlobalReadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const [message, setMessage] = useState<NotificationMessage>(null);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchText]);

  const loadCounts = useCallback(async (): Promise<void> => {
    const [unreadCount, readCount] = await Promise.all([
      getMyUnreadCount(),
      getMyReadCount(),
    ]);

    setGlobalUnreadCount(unreadCount);
    setGlobalReadCount(readCount);
  }, []);

  const loadNotifications = useCallback(
    async ({
      requestedPage = 1,
      append = false,
      showRefresh = false,
    }: {
      requestedPage?: number;
      append?: boolean;
      showRefresh?: boolean;
    } = {}): Promise<void> => {
      if (showRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const [result] = await Promise.all([
          getMyNotifications({
            page: requestedPage,
            pageSize: PAGE_SIZE,
            unreadOnly: selectedFilter === "unread",
            search: debouncedSearch,
          }),
          requestedPage === 1 ? loadCounts() : Promise.resolve(),
        ]);

        setNotifications((current) =>
          append ? mergeNotifications(current, result.items) : result.items,
        );
        setPage(requestedPage);
        setHasMore(result.hasMore);
        setTotal(result.total);
        setMessage(null);
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(error, "Unable to load notifications."),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, loadCounts, selectedFilter],
  );

  useEffect(() => {
    void loadNotifications({
      requestedPage: 1,
    });
  }, [loadNotifications]);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initializeRealtime(): Promise<void> {
      try {
        const userId = await getCurrentNotificationUserId();

        if (!isMounted) {
          return;
        }

        channel = supabase
          .channel(`worker-notifications-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload: RealtimePostgresChangesPayload<Notification>) => {
              if (!isMounted) {
                return;
              }

              if (payload.eventType === "INSERT") {
                const inserted = payload.new;

                setNotifications((current) =>
                  mergeNotifications([inserted], current),
                );
                setTotal((current) => current + 1);

                if (!inserted.is_read) {
                  setGlobalUnreadCount((current) => current + 1);
                } else {
                  setGlobalReadCount((current) => current + 1);
                }

                return;
              }

              if (payload.eventType === "UPDATE") {
                const updated = payload.new;
                const previous = payload.old as Partial<Notification>;

                setNotifications((current) =>
                  current.map((item) =>
                    item.id === updated.id ? updated : item,
                  ),
                );

                if (previous.is_read === false && updated.is_read === true) {
                  setGlobalUnreadCount((current) => Math.max(0, current - 1));
                  setGlobalReadCount((current) => current + 1);
                }

                if (previous.is_read === true && updated.is_read === false) {
                  setGlobalReadCount((current) => Math.max(0, current - 1));
                  setGlobalUnreadCount((current) => current + 1);
                }

                return;
              }

              if (payload.eventType === "DELETE") {
                const deleted = payload.old as Partial<Notification>;

                setNotifications((current) =>
                  current.filter((item) => item.id !== deleted.id),
                );
                setTotal((current) => Math.max(0, current - 1));

                if (deleted.is_read === false) {
                  setGlobalUnreadCount((current) => Math.max(0, current - 1));
                }

                if (deleted.is_read === true) {
                  setGlobalReadCount((current) => Math.max(0, current - 1));
                }
              }
            },
          )
          .subscribe();
      } catch (error) {
        console.error("Notification realtime initialization failed:", error);
      }
    }

    void initializeRealtime();

    return () => {
      isMounted = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    if (!message || message.type !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 4_000);

    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => matchesCategory(item, selectedFilter)),
    [notifications, selectedFilter],
  );

  const getFilterCount = useCallback(
    (filter: FilterType): number => {
      if (filter === "all") {
        return total;
      }

      if (filter === "unread") {
        return globalUnreadCount;
      }

      return notifications.filter((item) => matchesCategory(item, filter))
        .length;
    },
    [globalUnreadCount, notifications, total],
  );

  const setProcessing = useCallback((id: number, active: boolean): void => {
    setProcessingIds((current) => {
      const next = new Set(current);

      if (active) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  }, []);

  const handleRead = useCallback(
    async (id: number): Promise<void> => {
      if (processingIds.has(id)) {
        return;
      }

      const currentNotification = notifications.find((item) => item.id === id);

      try {
        setProcessing(id, true);

        await markMyNotificationAsRead(id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  is_read: true,
                }
              : item,
          ),
        );

        if (currentNotification && !currentNotification.is_read) {
          setGlobalUnreadCount((current) => Math.max(0, current - 1));
          setGlobalReadCount((current) => current + 1);
        }
      } catch (error) {
        const text = getErrorMessage(
          error,
          "Unable to mark the notification as read.",
        );

        setMessage({
          type: "error",
          text,
        });
        toast.error(text);
      } finally {
        setProcessing(id, false);
      }
    },
    [notifications, processingIds, setProcessing],
  );

  const handleDelete = useCallback(
    async (item: Notification): Promise<void> => {
      if (processingIds.has(item.id)) {
        return;
      }

      const confirmed = await confirmAction(`Delete "${item.title}"?`);

      if (!confirmed) {
        return;
      }

      try {
        setProcessing(item.id, true);

        await deleteMyNotification(item.id);

        setNotifications((current) =>
          current.filter((notification) => notification.id !== item.id),
        );
        setTotal((current) => Math.max(0, current - 1));

        if (item.is_read) {
          setGlobalReadCount((current) => Math.max(0, current - 1));
        } else {
          setGlobalUnreadCount((current) => Math.max(0, current - 1));
        }

        setMessage({
          type: "success",
          text: "Notification deleted.",
        });
      } catch (error) {
        const text = getErrorMessage(
          error,
          "Unable to delete the notification.",
        );

        setMessage({
          type: "error",
          text,
        });
        toast.error(text);
      } finally {
        setProcessing(item.id, false);
      }
    },
    [processingIds, setProcessing],
  );

  const handleMarkAllAsRead = useCallback(async (): Promise<void> => {
    if (globalUnreadCount === 0 || markingAll) {
      return;
    }

    try {
      setMarkingAll(true);

      await markAllMyNotificationsAsRead();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
      setGlobalReadCount((current) => current + globalUnreadCount);
      setGlobalUnreadCount(0);

      setMessage({
        type: "success",
        text: "All notifications marked as read.",
      });
    } catch (error) {
      const text = getErrorMessage(
        error,
        "Unable to mark all notifications as read.",
      );

      setMessage({
        type: "error",
        text,
      });
      toast.error(text);
    } finally {
      setMarkingAll(false);
    }
  }, [globalUnreadCount, markingAll]);

  const handleDeleteRead = useCallback(async (): Promise<void> => {
    if (globalReadCount === 0 || deletingRead) {
      return;
    }

    const confirmed = await confirmAction("Delete all read notifications?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingRead(true);

      await deleteMyReadNotifications();

      setMessage({
        type: "success",
        text: "Read notifications deleted.",
      });

      await loadNotifications({
        requestedPage: 1,
      });
    } catch (error) {
      const text = getErrorMessage(
        error,
        "Unable to delete read notifications.",
      );

      setMessage({
        type: "error",
        text,
      });
      toast.error(text);
    } finally {
      setDeletingRead(false);
    }
  }, [deletingRead, globalReadCount, loadNotifications]);

  const handleOpenNotification = useCallback(
    async (item: Notification): Promise<void> => {
      if (!item.is_read) {
        await handleRead(item.id);
      }

      const route = getNotificationRoute(item);

      if (route) {
        navigate(route);
      }
    },
    [handleRead, navigate],
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    if (refreshing) {
      return;
    }

    await loadNotifications({
      requestedPage: 1,
      showRefresh: true,
    });
  }, [loadNotifications, refreshing]);

  const handleLoadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loadingMore) {
      return;
    }

    await loadNotifications({
      requestedPage: page + 1,
      append: true,
    });
  }, [hasMore, loadNotifications, loadingMore, page]);

  return (
    <WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
          {message && (
            <div
              role={message.type === "error" ? "alert" : "status"}
              className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-red-200 bg-red-50/95 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              }`}
            >
              <span className="min-w-0 leading-6">{message.text}</span>

              <button
                type="button"
                onClick={() => setMessage(null)}
                className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-blue-700 to-cyan-500 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-7 lg:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />

            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                      Worker Center
                    </p>

                    {globalUnreadCount > 0 && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">
                        {globalUnreadCount} unread
                      </span>
                    )}
                  </div>

                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    Notifications
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                    Stay updated with bookings, payments, reviews, and customer
                    messages.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => void handleDeleteRead()}
                  disabled={deletingRead || globalReadCount === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 sm:px-4"
                >
                  {deletingRead ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Delete Read</span>
                  <span className="sm:hidden">Clear Read</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  disabled={markingAll || globalUnreadCount === 0}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 sm:px-4"
                >
                  {markingAll ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Mark All as Read</span>
                  <span className="sm:hidden">Mark All</span>
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search notifications..."
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                  />

                  {searchText && (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {FILTER_OPTIONS.map((filter) => {
                  const active = selectedFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedFilter(filter.value)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                      }`}
                    >
                      {filter.label}

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {getFilterCount(filter.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {loading ? (
              <div className="space-y-3 p-4 sm:p-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                  <ShieldCheck className="h-9 w-9" />
                </div>

                <h2 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                  No notifications found
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {debouncedSearch
                    ? "No notifications match your search."
                    : selectedFilter === "unread"
                      ? "You have no unread notifications."
                      : "You are all caught up for this category."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {visibleNotifications.map((item) => {
                  const iconData = getNotificationIcon(item);
                  const Icon = iconData.icon;
                  const processing = processingIds.has(item.id);

                  return (
                    <article
                      key={item.id}
                      className={`group relative transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-800/55 ${
                        item.is_read
                          ? "bg-white dark:bg-slate-900"
                          : "bg-blue-50/60 dark:bg-blue-950/20"
                      }`}
                    >
                      {!item.is_read && (
                        <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                      )}

                      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
                        <button
                          type="button"
                          onClick={() => void handleOpenNotification(item)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left sm:gap-4"
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${iconData.wrapperClassName}`}
                          >
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`break-words text-sm text-slate-900 sm:text-base dark:text-white ${
                                  item.is_read ? "font-semibold" : "font-black"
                                }`}
                              >
                                {item.title}
                              </h2>

                              {!item.is_read && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                  New
                                </span>
                              )}
                            </div>

                            <p className="mt-1 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {item.message}
                            </p>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span>{timeAgo(item.created_at)}</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              <span>
                                {formatNotificationDate(item.created_at)}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                          {!item.is_read && (
                            <button
                              type="button"
                              onClick={() => void handleRead(item.id)}
                              disabled={processing}
                              className="hidden rounded-lg border border-blue-200 bg-white p-2 text-blue-600 transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:translate-y-0 disabled:opacity-50 sm:block dark:border-blue-900/50 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
                              aria-label={`Mark ${item.title} as read`}
                            >
                              {processing ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCheck className="h-4 w-4" />
                              )}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleDelete(item)}
                            disabled={processing}
                            className="rounded-lg p-2 text-slate-400 transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 disabled:translate-y-0 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                            aria-label={`Delete ${item.title}`}
                          >
                            {processing ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={() => void handleRead(item.id)}
                          disabled={processing}
                          className="mx-4 mb-4 inline-flex min-h-10 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white py-2.5 text-xs font-bold text-blue-600 disabled:opacity-50 sm:hidden dark:border-blue-900/50 dark:bg-slate-900 dark:text-blue-300"
                        >
                          {processing ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCheck className="h-4 w-4" />
                          )}
                          Mark as Read
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {!loading && notifications.length > 0 && (
              <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                <span>
                  Showing{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {visibleNotifications.length}
                  </strong>{" "}
                  loaded notification
                  {visibleNotifications.length === 1 ? "" : "s"}
                  {total > 0 && (
                    <>
                      {" "}
                      of{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {total}
                      </strong>
                    </>
                  )}
                </span>

                {hasMore && (
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:translate-y-0 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {loadingMore && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}

                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                )}
              </footer>
            )}
          </section>
        </div>
      </main>
    </WorkerLayout>
  );
}
