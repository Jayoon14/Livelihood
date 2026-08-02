import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  Bell,
  CheckCheck,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "../../lib/supabase";
import {
  deleteMyNotification,
  getCurrentNotificationUserId,
  getMyNotifications,
  getMyUnreadCount,
  markAllMyNotificationsAsRead,
  markMyNotificationAsRead,
  type Notification,
} from "../../services/notificationService";
import NotificationItem from "./NotificationItem";
import NotificationToast from "./NotificationToast";

interface NotificationDropdownProps {
  role: "worker" | "customer";
}

const DROPDOWN_PAGE_SIZE = 10;

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

function getNotificationRoute(
  notification: Notification,
  role: "worker" | "customer",
): string {
  const text =
    `${notification.title} ${notification.message}`.toLowerCase();

  if (text.includes("message") || text.includes("chat")) {
    return notification.booking_id
      ? `/chat/${notification.booking_id}`
      : "/chat";
  }

  if (role === "worker") {
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

    return "/worker/bookings";
  }

  return "/customer/bookings";
}

function sortNotifications(items: Notification[]): Notification[] {
  return [...items].sort(
    (first, second) =>
      new Date(second.created_at).getTime() -
      new Date(first.created_at).getTime(),
  );
}

async function requestBrowserNotificationPermission(): Promise<void> {
  if (
    "Notification" in window &&
    window.Notification.permission === "default"
  ) {
    try {
      await window.Notification.requestPermission();
    } catch (error) {
      console.warn("Unable to request browser notification permission:", error);
    }
  }
}

function playNotificationSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const startedAt = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startedAt);
    oscillator.frequency.exponentialRampToValueAtTime(660, startedAt + 0.18);

    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(0.16, startedAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + 0.24);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startedAt);
    oscillator.stop(startedAt + 0.25);

    oscillator.addEventListener("ended", () => {
      void audioContext.close();
    });
  } catch (error) {
    console.warn("Unable to play notification sound:", error);
  }
}

function showBrowserNotification(notification: Notification): void {
  if (
    document.visibilityState === "visible" ||
    !("Notification" in window) ||
    window.Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    new window.Notification(notification.title, {
      body: notification.message,
      tag: `livelihoodgo-notification-${notification.id}`,
    });
  } catch (error) {
    console.warn("Unable to show browser notification:", error);
  }
}

export default function NotificationDropdown({
  role,
}: NotificationDropdownProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const alertedNotificationIdsRef = useRef<Set<number>>(new Set());

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(
    new Set(),
  );
  const [toastNotification, setToastNotification] =
    useState<Notification | null>(null);

  const setProcessing = useCallback(
    (id: number, active: boolean): void => {
      setProcessingIds((current) => {
        const next = new Set(current);

        if (active) {
          next.add(id);
        } else {
          next.delete(id);
        }

        return next;
      });
    },
    [],
  );

  const loadNotifications = useCallback(
    async (showRefresh = false): Promise<void> => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [page, count] = await Promise.all([
          getMyNotifications({
            page: 1,
            pageSize: DROPDOWN_PAGE_SIZE,
          }),
          getMyUnreadCount(),
        ]);

        setNotifications(page.items);
        setUnreadCount(count);
      } catch (error) {
        const message = getErrorMessage(
          error,
          "Unable to load notifications.",
        );

        console.error(message, error);

        if (showRefresh) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isCancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize(): Promise<void> {
      try {
        const currentUserId =
          await getCurrentNotificationUserId();

        if (isCancelled) {
          return;
        }

        setUserId(currentUserId);
        await loadNotifications();

        if (isCancelled) {
          return;
        }

        channel = supabase
          .channel(
            `${role}-notification-dropdown-${currentUserId}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${currentUserId}`,
            },
            (
              payload: RealtimePostgresChangesPayload<Notification>,
            ) => {
              if (isCancelled) {
                return;
              }

              if (payload.eventType === "INSERT") {
                const newNotification = payload.new;

                setNotifications((current) =>
                  sortNotifications([
                    newNotification,
                    ...current.filter(
                      (item) => item.id !== newNotification.id,
                    ),
                  ]).slice(0, DROPDOWN_PAGE_SIZE),
                );

                if (!newNotification.is_read) {
                  setUnreadCount((current) => current + 1);
                }

                if (
                  !alertedNotificationIdsRef.current.has(newNotification.id)
                ) {
                  alertedNotificationIdsRef.current.add(newNotification.id);
                  setToastNotification(newNotification);
                  playNotificationSound();
                  showBrowserNotification(newNotification);
                }

                return;
              }

              if (payload.eventType === "UPDATE") {
                const updatedNotification = payload.new;

                setNotifications((current) =>
                  sortNotifications(
                    current.map((item) =>
                      item.id === updatedNotification.id
                        ? updatedNotification
                        : item,
                    ),
                  ),
                );

                setUnreadCount((current) => {
                  const previous = payload.old as Partial<Notification>;
                  const wasUnread = previous.is_read === false;
                  const isUnread = updatedNotification.is_read === false;

                  if (wasUnread && !isUnread) {
                    return Math.max(0, current - 1);
                  }

                  if (!wasUnread && isUnread) {
                    return current + 1;
                  }

                  return current;
                });

                return;
              }

              if (payload.eventType === "DELETE") {
                const deleted = payload.old as Partial<Notification>;

                setNotifications((current) =>
                  current.filter((item) => item.id !== deleted.id),
                );

                if (deleted.is_read === false) {
                  setUnreadCount((current) =>
                    Math.max(0, current - 1),
                  );
                }
              }
            },
          )
          .subscribe();
      } catch (error) {
        if (!isCancelled) {
          console.error(
            "Initialize notification dropdown error:",
            error,
          );
        }
      }
    }

    void initialize();

    return () => {
      isCancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications, role]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  async function handleRead(id: number): Promise<void> {
    if (processingIds.has(id)) {
      return;
    }

    try {
      setProcessing(id, true);

      const current = notifications.find(
        (notification) => notification.id === id,
      );

      await markMyNotificationAsRead(id);

      setNotifications((items) =>
        items.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
              }
            : notification,
        ),
      );

      if (current && !current.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to mark the notification as read.",
        ),
      );
    } finally {
      setProcessing(id, false);
    }
  }

  async function handleDelete(
    notification: Notification,
  ): Promise<void> {
    if (processingIds.has(notification.id)) {
      return;
    }

    try {
      setProcessing(notification.id, true);

      await deleteMyNotification(notification.id);

      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id),
      );

      if (!notification.is_read) {
        setUnreadCount((current) =>
          Math.max(0, current - 1),
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to delete the notification.",
        ),
      );
    } finally {
      setProcessing(notification.id, false);
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    if (!userId || unreadCount === 0 || markingAll) {
      return;
    }

    try {
      setMarkingAll(true);

      await markAllMyNotificationsAsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Unable to mark all notifications as read.",
        ),
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpenNotification(
    notification: Notification,
  ): Promise<void> {
    if (!notification.is_read) {
      await handleRead(notification.id);
    }

    setOpen(false);
    navigate(getNotificationRoute(notification, role));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          void requestBrowserNotificationPermission();
        }}
        className="relative rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Open notifications"
        aria-expanded={open}
      >
        <Bell className="h-6 w-6 text-slate-700 dark:text-slate-200" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-100 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Notifications
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount} unread notification
                {unreadCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadNotifications(true)}
                disabled={refreshing}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                aria-label="Refresh notifications"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={
                markingAll || unreadCount === 0 || !userId
              }
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-300"
            >
              {markingAll ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}

              Mark all as read
            </button>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              Latest {notifications.length}
            </span>
          </div>

          <div className="max-h-[65vh] overflow-y-auto sm:max-h-112">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Bell className="h-10 w-10 text-slate-300 dark:text-slate-600" />

                <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                  No notifications yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  You are all caught up.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  processing={processingIds.has(notification.id)}
                  compact
                  onRead={handleRead}
                  onDelete={handleDelete}
                  onClick={handleOpenNotification}
                />
              ))
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <button
              type="button"
              onClick={() => {
                setOpen(false);

                navigate(
                  role === "worker"
                    ? "/worker/notifications"
                    : "/customer/notifications",
                );
              }}
              className="w-full py-3 text-center text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}

      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
          onClick={async () => {
            await handleOpenNotification(toastNotification);
            setToastNotification(null);
          }}
        />
      )}
    </div>
  );
}
