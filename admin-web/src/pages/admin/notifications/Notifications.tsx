import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  CreditCard,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { getNotificationRoute } from "../../../components/notifications/notificationRouting";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  deleteMyNotification,
  deleteMyReadNotifications,
  getMyNotifications,
  markAllMyNotificationsAsRead,
  markMyNotificationAsRead,
  type Notification,
} from "../../../services/notificationService";

type FilterValue = "all" | "unread" | "read";

const PAGE_SIZE = 15;

function formatExactDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const difference = date.getTime() - Date.now();
  const absolute = Math.abs(difference);

  const divisions = [
    { amount: 1000 * 60 * 60 * 24 * 365, unit: "year" },
    { amount: 1000 * 60 * 60 * 24 * 30, unit: "month" },
    { amount: 1000 * 60 * 60 * 24, unit: "day" },
    { amount: 1000 * 60 * 60, unit: "hour" },
    { amount: 1000 * 60, unit: "minute" },
  ] as const;

  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  for (const division of divisions) {
    if (absolute >= division.amount) {
      return formatter.format(
        Math.round(difference / division.amount),
        division.unit,
      );
    }
  }

  return "just now";
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function iconForNotification(item: Notification) {
  const value = normalizeText(`${item.title} ${item.message}`);

  if (value.includes("worker")) {
    return UserPlus;
  }

  if (value.includes("payment")) {
    return CreditCard;
  }

  if (value.includes("booking")) {
    return CalendarDays;
  }

  return Bell;
}

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingRead, setClearingRead] = useState(false);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadNotifications = useCallback(
    async ({
      requestedPage = 1,
      append = false,
      background = false,
    }: {
      requestedPage?: number;
      append?: boolean;
      background?: boolean;
    } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!append) {
        setError("");
      }

      try {
        const result = await getMyNotifications({
          page: requestedPage,
          pageSize: PAGE_SIZE,
          unreadOnly: filter === "unread",
          search: debouncedSearch || undefined,
        });

        let items = result.items;

        if (filter === "read") {
          items = items.filter((item) => item.is_read);
        }

        setNotifications((current) =>
          append ? [...current, ...items] : items,
        );
        setTotal(result.total);
        setHasMore(result.hasMore);
        setPage(requestedPage);
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Unable to load notifications.";

        setError(message);

        if (!append) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, filter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadNotifications]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let active = true;
    let currentUserId = "";

    const scheduleRealtimeRefresh = () => {
      if (!active || !currentUserId) {
        return;
      }

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(() => {
        if (active) {
          void loadNotifications({
            requestedPage: 1,
            background: true,
          });
        }
      }, 300);
    };

    async function initializeRealtime() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user || !active) {
          return;
        }

        currentUserId = user.id;
        setUserId(user.id);

        channel = supabase
          .channel(`admin-notifications-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            scheduleRealtimeRefresh,
          )
          .subscribe((subscriptionStatus) => {
            if (!active) {
              return;
            }

            if (subscriptionStatus === "CHANNEL_ERROR") {
              console.error("Admin notifications realtime channel error.");
              scheduleRealtimeRefresh();
            }

            if (subscriptionStatus === "TIMED_OUT") {
              console.error(
                "Admin notifications realtime connection timed out.",
              );
              scheduleRealtimeRefresh();
            }
          });
      } catch (caught) {
        console.error("Admin notification realtime error:", caught);
      }
    }

    const handleOnline = () => {
      scheduleRealtimeRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleRealtimeRefresh();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void initializeRealtime();

    return () => {
      active = false;

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }

      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const readCount = useMemo(
    () => notifications.filter((item) => item.is_read).length,
    [notifications],
  );

  async function handleRead(id: number) {
    const existing = notifications.find((item) => item.id === id);

    if (!existing || existing.is_read) {
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      ),
    );

    try {
      await markMyNotificationAsRead(id);

      if (filter === "unread") {
        setNotifications((current) => current.filter((item) => item.id !== id));
      }
    } catch (caught) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: false } : item,
        ),
      );

      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to mark notification as read.",
      );
    }
  }

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    setMarkingAll(true);

    try {
      await markAllMyNotificationsAsRead();

      setNotifications((current) =>
        filter === "unread"
          ? []
          : current.map((item) => ({
              ...item,
              is_read: true,
            })),
      );

      toast.success("All notifications marked as read.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to mark all notifications as read.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleDelete(item: Notification) {
    const confirmed = window.confirm(`Delete "${item.title}"?`);

    if (!confirmed) {
      return;
    }

    setDeletingIds((current) => [...current, item.id]);

    try {
      await deleteMyNotification(item.id);

      setNotifications((current) =>
        current.filter((notification) => notification.id !== item.id),
      );
      setTotal((current) => Math.max(0, current - 1));

      toast.success("Notification deleted.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to delete notification.",
      );
    } finally {
      setDeletingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  async function handleClearRead() {
    if (readCount === 0 || clearingRead) {
      return;
    }

    const confirmed = window.confirm("Delete all read notifications?");

    if (!confirmed) {
      return;
    }

    setClearingRead(true);

    try {
      await deleteMyReadNotifications();

      setNotifications((current) => current.filter((item) => !item.is_read));
      setTotal((current) => Math.max(0, current - readCount));

      toast.success("Read notifications were cleared.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "Unable to clear read notifications.",
      );
    } finally {
      setClearingRead(false);
    }
  }

  async function handleOpenNotification(item: Notification) {
    if (!item.is_read) {
      await handleRead(item.id);
    }

    navigate(getNotificationRoute(item, "admin"));
  }

  async function handleLoadMore() {
    await loadNotifications({
      requestedPage: page + 1,
      append: true,
    });
  }

  return (
    <AdminLayout>
      <section className="space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    } currently shown`
                  : "All currently shown notifications are read"}
              </p>
              {userId && (
                <p className="mt-1 text-xs text-slate-400">
                  Realtime updates are active.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadNotifications({
                  background: true,
                })
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              onClick={() => void handleMarkAllAsRead()}
              disabled={markingAll || unreadCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              {markingAll ? "Marking..." : "Mark all read"}
            </button>

            <button
              type="button"
              onClick={() => void handleClearRead()}
              disabled={clearingRead || readCount === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
              {clearingRead ? "Clearing..." : "Clear read"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total results" value={total} icon={Bell} />
          <SummaryCard label="Unread shown" value={unreadCount} icon={Bell} />
          <SummaryCard label="Read shown" value={readCount} icon={CheckCheck} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-slate-200 bg-transparent py-2.5 pl-10 pr-10 text-sm outline-none focus:border-emerald-500 dark:border-slate-700"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                  ["read", "Read"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    filter === value
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && !loading && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center p-12 text-center">
              <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                <Bell className="h-8 w-8 text-slate-400" />
              </div>
              <h2 className="mt-4 font-bold text-slate-900 dark:text-white">
                No notifications found
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Try another filter or search term.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {notifications.map((item) => {
                const Icon = iconForNotification(item);
                const deleting = deletingIds.includes(item.id);

                return (
                  <article
                    key={item.id}
                    className={`group relative transition ${
                      item.is_read
                        ? "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                        : "bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleOpenNotification(item)}
                      className="w-full p-5 text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`rounded-xl p-2.5 ${
                            item.is_read
                              ? "bg-slate-100 text-slate-500 dark:bg-slate-800"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1 pr-24">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h2>

                            {!item.is_read && (
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                            )}
                          </div>

                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.message}
                          </p>

                          <p
                            className="mt-2 text-xs text-slate-400"
                            title={formatExactDate(item.created_at)}
                          >
                            {formatRelativeDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="absolute right-4 top-4 flex gap-2">
                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRead(item.id);
                          }}
                          className="rounded-lg border border-slate-200 bg-white p-2 text-emerald-600 shadow-sm transition hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-emerald-950/20"
                          aria-label="Mark as read"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(item);
                        }}
                        disabled={deleting}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-red-950/20"
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && notifications.length > 0 && hasMore && (
            <div className="border-t border-slate-200 p-4 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </section>
      </section>
    </AdminLayout>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Bell;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
        {value.toLocaleString()}
      </p>
    </article>
  );
}
