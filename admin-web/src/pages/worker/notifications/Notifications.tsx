import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  CreditCard,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  deleteNotification,
  deleteReadNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../../../services/notificationService";

import { timeAgo } from "../../../utils/timeAgo";

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

type NotificationItem = {
  id: number;
  user_id: string;
  booking_id: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type FilterType = "all" | "unread" | "bookings" | "payments" | "reviews";

const filterOptions = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "unread",
    label: "Unread",
  },
  {
    value: "bookings",
    label: "Bookings",
  },
  {
    value: "payments",
    label: "Payments",
  },
  {
    value: "reviews",
    label: "Reviews",
  },
] as const;

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [markingAll, setMarkingAll] = useState(false);

  const [deletingRead, setDeletingRead] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");

  const [searchText, setSearchText] = useState("");

  // ==========================
  // REALTIME INITIALIZE
  // ==========================

  useEffect(() => {
    let isCancelled = false;

    let channel: RealtimeChannel | null = null;

    async function initialize() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!user || isCancelled) {
          setLoading(false);
          return;
        }

        await loadNotifications();

        if (isCancelled) return;

        channel = supabase
          .channel(`worker-notifications-${user.id}-${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (_payload: RealtimePostgresChangesPayload<NotificationItem>) => {
              void loadNotifications();
            },
          )
          .subscribe((status) => {
            console.log("Worker notifications realtime status:", status);
          });
      } catch (error) {
        console.error("Initialize notifications error:", error);

        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      isCancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);

        channel = null;
      }
    };
  }, []);

  // ==========================
  // LOAD NOTIFICATIONS
  // ==========================

  async function loadNotifications() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        setNotifications([]);

        return;
      }

      const data = await getNotifications(user.id);

      setNotifications(data as NotificationItem[]);
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // COUNTS
  // ==========================

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  const readCount = useMemo(() => {
    return notifications.filter((item) => item.is_read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const search = searchText.toLowerCase();

    return notifications.filter((item) => {
      const title = item.title.toLowerCase();

      const message = item.message.toLowerCase();

      const matchesSearch =
        search === "" || title.includes(search) || message.includes(search);

      if (!matchesSearch) {
        return false;
      }

      switch (selectedFilter) {
        case "unread":
          return !item.is_read;

        case "bookings":
          return title.includes("booking");

        case "payments":
          return title.includes("payment");

        case "reviews":
          return title.includes("review") || title.includes("rating");

        case "all":
        default:
          return true;
      }
    });
  }, [notifications, searchText, selectedFilter]);
  // ==========================
  // FILTER COUNTS
  // ==========================

  function getFilterCount(filter: FilterType) {
    switch (filter) {
      case "unread":
        return unreadCount;

      case "bookings":
        return notifications.filter((item) => {
          const title = item.title.toLowerCase();

          return (
            title.includes("booking") ||
            title.includes("worker") ||
            title.includes("job") ||
            title.includes("completed")
          );
        }).length;

      case "payments":
        return notifications.filter((item) => {
          const title = item.title.toLowerCase();

          return (
            title.includes("payment") ||
            title.includes("receipt") ||
            title.includes("refund")
          );
        }).length;

      case "reviews":
        return notifications.filter((item) => {
          const title = item.title.toLowerCase();

          return (
            title.includes("review") ||
            title.includes("rating") ||
            title.includes("feedback")
          );
        }).length;

      case "all":
      default:
        return notifications.length;
    }
  }

  // ==========================
  // NOTIFICATION ICON
  // ==========================

  function getNotificationIcon(title: string) {
    const value = title.toLowerCase();

    if (value.includes("booking")) {
      return {
        icon: CalendarDays,
        bg: "bg-blue-100",
        color: "text-blue-600",
      };
    }

    if (value.includes("payment")) {
      return {
        icon: CreditCard,
        bg: "bg-green-100",
        color: "text-green-600",
      };
    }

    if (value.includes("review") || value.includes("rating")) {
      return {
        icon: Star,
        bg: "bg-yellow-100",
        color: "text-yellow-600",
      };
    }

    if (value.includes("approved")) {
      return {
        icon: CircleCheck,
        bg: "bg-emerald-100",
        color: "text-emerald-600",
      };
    }

    if (value.includes("cancel")) {
      return {
        icon: XCircle,
        bg: "bg-red-100",
        color: "text-red-600",
      };
    }

    if (value.includes("message")) {
      return {
        icon: MessageCircle,
        bg: "bg-purple-100",
        color: "text-purple-600",
      };
    }

    return {
      icon: Bell,
      bg: "bg-gray-100",
      color: "text-gray-600",
    };
  }

  // ==========================
  // MARK SINGLE READ
  // ==========================

  async function handleRead(id: number) {
    try {
      await markAsRead(id);

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Mark notification as read error:", error);

      alert("Unable to mark the notification as read.");
    }
  }

  // ==========================
  // DELETE SINGLE
  // ==========================

  async function handleDelete(id: number) {
    try {
      await deleteNotification(id);

      setNotifications((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Delete notification error:", error);

      alert("Unable to delete the notification.");
    }
  }

  // ==========================
  // MARK ALL READ
  // ==========================

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    try {
      setMarkingAll(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        return;
      }

      await markAllAsRead(user.id);

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
    } catch (error) {
      console.error("Mark all notifications error:", error);

      alert("Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  // ==========================
  // DELETE READ
  // ==========================

  async function handleDeleteRead() {
    if (readCount === 0 || deletingRead) {
      return;
    }

    const confirmed = window.confirm("Delete all read notifications?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingRead(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        return;
      }

      await deleteReadNotifications(user.id);

      setNotifications((previous) => previous.filter((item) => !item.is_read));
    } catch (error) {
      console.error("Delete read notifications error:", error);

      alert("Unable to delete read notifications.");
    } finally {
      setDeletingRead(false);
    }
  }

  // ==========================
  // OPEN NOTIFICATION
  // ==========================

  async function handleOpenNotification(item: NotificationItem) {
    try {
      if (!item.is_read) {
        await handleRead(item.id);
      }

      switch (item.title) {
        case "New Booking Request":
          navigate("/worker/bookings");
          break;

        case "New Payment Request":
          navigate("/worker/payment-requests");
          break;

        case "Booking Cancelled":
          navigate("/worker/bookings");
          break;

        case "Booking Approved":
          navigate("/worker/bookings");
          break;

        case "Payment Approved":
          navigate("/worker/bookings");
          break;

        default:
          navigate("/worker/bookings");
          break;
      }
    } catch (error) {
      console.error("Open notification error:", error);
    }
  }
  return (
    <WorkerLayout>
      <div className="min-h-full bg-gray-50/80 px-4 py-5 sm:px-6 lg:px-8">
        <div className="w-full">
          {/* HEADER */}

          <div className="mb-6 flex w-full flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-gray-200
                  bg-white
                  text-gray-600
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-x-0.5
                  hover:border-gray-300
                  hover:bg-gray-50
                  hover:text-gray-900
                  hover:shadow
                "
                aria-label="Go back"
              >
                <ArrowLeft size={21} />
              </button>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                    Notifications
                  </h1>

                  {unreadCount > 0 && (
                    <span
                      className="
                        rounded-full
                        bg-blue-600
                        px-2.5
                        py-1
                        text-xs
                        font-semibold
                        text-white
                        shadow-sm
                      "
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Stay updated with your bookings, payments, and activities.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void handleDeleteRead();
                }}
                disabled={deletingRead || readCount === 0}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-red-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-red-600
                  shadow-sm
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-red-50
                  hover:shadow
                  disabled:cursor-not-allowed
                  disabled:border-gray-200
                  disabled:text-gray-400
                  disabled:shadow-none
                "
              >
                <Trash2 size={18} />

                {deletingRead ? "Deleting..." : "Delete Read"}
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleMarkAllAsRead();
                }}
                disabled={markingAll || unreadCount === 0}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-white
                  shadow-sm
                  transition-all
                  hover:-translate-y-0.5
                  hover:bg-blue-700
                  hover:shadow-md
                  disabled:cursor-not-allowed
                  disabled:bg-gray-300
                  disabled:shadow-none
                "
              >
                <CheckCheck size={18} />

                {markingAll ? "Marking..." : "Mark All as Read"}
              </button>
            </div>
          </div>

          {/* SEARCH + FILTER */}

         <div className="mb-5 w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search
                  size={19}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                  "
                />

                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search notifications..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-gray-50
                    py-3
                    pl-10
                    pr-4
                    text-sm
                    text-gray-800
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {filterOptions.map((filter) => {
                  const active = selectedFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setSelectedFilter(filter.value)}
                      className={`
                        flex
                        shrink-0
                        items-center
                        gap-2
                        rounded-full
                        border
                        px-4
                        py-2
                        text-sm
                        font-medium
                        transition
                        ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        }
                      `}
                    >
                      {filter.label}

                      <span
                        className={`
                          rounded-full
                          px-2
                          py-0.5
                          text-xs
                          ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-500"
                          }
                        `}
                      >
                        {getFilterCount(filter.value)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* NOTIFICATION LIST */}

          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-gray-200
              bg-white
              shadow-sm
              transition-shadow
              hover:shadow-md
            "
          >
            {loading ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12">
                <div
                  className="
                    mb-4
                    h-10
                    w-10
                    animate-spin
                    rounded-full
                    border-4
                    border-blue-100
                    border-t-blue-600
                  "
                />

                <p className="font-medium text-gray-700">
                  Loading notifications...
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <div
                  className="
                    mb-4
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-full
                    bg-blue-50
                  "
                >
                  <ShieldCheck size={34} className="text-blue-600" />
                </div>

                <h2 className="text-lg font-semibold text-gray-800">
                  No notifications yet
                </h2>

                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  {searchText
                    ? "No notifications match your search."
                    : selectedFilter === "unread"
                      ? "You have no unread notifications."
                      : "You're all caught up for this category."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const iconData = getNotificationIcon(item.title);

                const Icon = iconData.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      void handleOpenNotification(item);
                    }}
                    className={`
                      group
                      relative
                      cursor-pointer
                      border-b
                      border-gray-100
                      px-4
                      py-5
                      transition-all
                      duration-200
                      last:border-b-0
                      hover:z-10
                      hover:-translate-y-0.5
                      hover:bg-gray-50
                      hover:shadow-md
                      sm:px-6
                      ${item.is_read ? "bg-white" : "bg-blue-50/60"}
                    `}
                  >
                    {!item.is_read && (
                      <div
                        className="
                          absolute
                          bottom-0
                          left-0
                          top-0
                          w-1
                          rounded-r-full
                          bg-blue-600
                        "
                      />
                    )}

                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          transition-transform
                          duration-200
                          group-hover:scale-105
                          sm:h-12
                          sm:w-12
                          ${iconData.bg}
                        `}
                      >
                        <Icon size={22} className={iconData.color} />
                      </div>
                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            className={`
                              break-words
                              text-sm
                              text-gray-900
                              sm:text-base
                              ${item.is_read ? "font-medium" : "font-semibold"}
                            `}
                          >
                            {item.title}
                          </h2>

                          {!item.is_read && (
                            <span
                              className="
                                inline-flex
                                items-center
                                rounded-full
                                bg-blue-100
                                px-2
                                py-0.5
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-wide
                                text-blue-700
                              "
                            >
                              New
                            </span>
                          )}
                        </div>

                        <p
                          className="
                            mt-1
                            break-words
                            text-sm
                            leading-6
                            text-gray-600
                          "
                        >
                          {item.message}
                        </p>

                        <div
                          className="
                            mt-3
                            flex
                            flex-wrap
                            items-center
                            gap-2
                            text-xs
                            text-gray-400
                          "
                        >
                          <span>{timeAgo(item.created_at)}</span>

                          <span
                            className="
                              h-1
                              w-1
                              rounded-full
                              bg-gray-300
                            "
                          />

                          <span>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}

                      <div
                        className="
                          flex
                          shrink-0
                          items-center
                          gap-1
                        "
                      >
                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();

                              void handleRead(item.id);
                            }}
                            className="
                              hidden
                              items-center
                              gap-1.5
                              rounded-lg
                              border
                              border-blue-200
                              bg-white
                              px-3
                              py-2
                              text-xs
                              font-medium
                              text-blue-600
                              shadow-sm
                              transition
                              hover:border-blue-300
                              hover:bg-blue-50
                              sm:flex
                            "
                          >
                            <CheckCheck size={15} />
                            Read
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            void handleDelete(item.id);
                          }}
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            text-gray-400
                            opacity-100
                            transition
                            hover:bg-red-50
                            hover:text-red-600
                            sm:opacity-0
                            sm:group-hover:opacity-100
                          "
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* MOBILE READ BUTTON */}

                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          void handleRead(item.id);
                        }}
                        className="
                          mt-4
                          flex
                          w-full
                          items-center
                          justify-center
                          gap-2
                          rounded-lg
                          border
                          border-blue-200
                          bg-white
                          py-2
                          text-xs
                          font-medium
                          text-blue-600
                          transition
                          hover:bg-blue-50
                          sm:hidden
                        "
                      >
                        <CheckCheck size={15} />
                        Mark as Read
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {/* FOOTER */}

            {notifications.length > 0 && (
              <div
                className="
                  flex
                  flex-col
                  gap-2
                  border-t
                  border-gray-200
                  bg-gray-50/80
                  px-5
                  py-3
                  text-sm
                  text-gray-500
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <span>
                  Showing{" "}
                  <strong className="font-semibold text-gray-700">
                    {filteredNotifications.length}
                  </strong>{" "}
                  of{" "}
                  <strong className="font-semibold text-gray-700">
                    {notifications.length}
                  </strong>{" "}
                  notifications
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className="
                      h-2
                      w-2
                      rounded-full
                      bg-blue-600
                    "
                  />

                  <span>
                    <strong className="font-semibold text-gray-700">
                      {unreadCount}
                    </strong>{" "}
                    unread
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
