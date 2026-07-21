import { useEffect, useState } from "react";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../../../services/notificationService";

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

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

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
          .channel(`admin-notifications-${user.id}-${Date.now()}`)
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
            console.log("Admin notifications realtime status:", status);
          });
      } catch (error) {
        console.error("Initialize admin notifications error:", error);

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
      console.error("Load admin notifications error:", error);
    } finally {
      setLoading(false);
    }
  }

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

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) return;

    try {
      setMarkingAll(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) return;

      await markAllAsRead(user.id);

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      alert("Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleOpenNotification(item: NotificationItem) {
    try {
      if (!item.is_read) {
        await handleRead(item.id);
      }

      switch (item.title) {
        case "New Worker Registration":
          navigate("/admin/workers");
          break;

        case "New Booking":
          navigate("/admin/bookings");
          break;

        case "New Booking Request":
          navigate("/admin/bookings");
          break;

        case "New Payment Request":
          navigate("/admin/payments");
          break;

        case "Booking Cancelled":
          navigate("/admin/bookings");
          break;

        default:
          navigate("/admin/dashboard");
          break;
      }
    } catch (error) {
      console.error("Open admin notification error:", error);
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <AdminLayout>
      <div className="p-5 md:p-6">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-gray-200
                bg-white
                text-gray-700
                transition
                hover:bg-gray-100
              "
              aria-label="Go back"
            >
              <ArrowLeft size={21} />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notifications
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    }`
                  : "All notifications are read"}
              </p>
            </div>
          </div>

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
              rounded-lg
              bg-red-600
              px-4
              py-2.5
              font-medium
              text-white
              transition
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:bg-gray-300
            "
          >
            <CheckCheck size={19} />

            {markingAll ? "Marking..." : "Mark All as Read"}
          </button>
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="overflow-hidden rounded-xl bg-white shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No notifications.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  void handleOpenNotification(item);
                }}
                className={`
                  cursor-pointer
                  border-b
                  p-5
                  transition
                  last:border-b-0
                  hover:bg-gray-50
                  ${
                    item.is_read
                      ? "bg-white"
                      : "border-l-4 border-l-red-600 bg-red-50"
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {item.title}
                      </h2>

                      {!item.is_read && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" />
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600">{item.message}</p>

                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRead(item.id);
                      }}
                      className="
                        shrink-0
                        rounded-lg
                        bg-red-600
                        px-3
                        py-2
                        text-sm
                        font-medium
                        text-white
                        transition
                        hover:bg-red-700
                      "
                    >
                      Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
