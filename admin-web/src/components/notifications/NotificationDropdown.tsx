import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import NotificationItem from "./NotificationItem";
import NotificationToast from "./NotificationToast";

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../../services/notificationService";

interface NotificationDropdownProps {
  role: "worker" | "customer";
}

export default function NotificationDropdown({
  role,
}: NotificationDropdownProps) {
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [userId, setUserId] = useState("");

  // NEW
  const [toastNotification, setToastNotification] =
    useState<any | null>(null);

  // ==========================
  // LOAD NOTIFICATIONS
  // ==========================

  async function loadNotifications(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id) return;

    try {
      const data = await getNotifications(id);

      setNotifications(data);

      const count = await getUnreadCount(id);

      setUnreadCount(count);
    } catch (error) {
      console.error(error);
    }
  }

  // ==========================
  // INITIALIZE
  // ==========================

  useEffect(() => {
    let channel: any;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);

      await loadNotifications(user.id);

      channel = supabase.channel(`${role}-notification-dropdown`);

      (channel as any)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            loadNotifications(user.id);

            if (payload.eventType === "INSERT") {
              setToastNotification(payload.new);
            }
          },
        )
        .subscribe();
    }

    initialize();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [role]);

  // ==========================
  // CLOSE DROPDOWN
  // ==========================

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
    // ==========================
  // READ NOTIFICATION
  // ==========================

  async function handleRead(id: number) {
    try {
      await markAsRead(id);

      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  }

  // ==========================
  // DELETE NOTIFICATION
  // ==========================

  async function handleDelete(id: number) {
    try {
      await deleteNotification(id);

      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  }

  // ==========================
  // MARK ALL AS READ
  // ==========================

  async function handleMarkAllRead() {
    try {
      if (!userId) return;

      await markAllNotificationsAsRead(userId);

      await loadNotifications();
    } catch (error) {
      console.error(error);
    }
  }

  // ==========================
  // OPEN NOTIFICATION
  // ==========================

  async function handleOpenNotification(notification: any) {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    await loadNotifications();

    if (role === "worker") {
      switch (notification.title) {
        case "New Booking Request":
          navigate("/worker/bookings");
          break;

        case "New Payment Request":
          navigate("/worker/payment-requests");
          break;

        default:
          navigate("/worker/bookings");
          break;
      }
    }

    if (role === "customer") {
      switch (notification.title) {
        case "Booking Accepted":
        case "Booking Rejected":
        case "Payment Verified":
        case "Booking Completed":
          navigate("/customer/bookings");
          break;

        default:
          navigate("/customer/bookings");
          break;
      }
    }

    setOpen(false);
  }
    return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setOpen(!open)}
        className="
          relative
          rounded-full
          p-2
          transition
          hover:bg-gray-100
        "
      >
        <Bell size={23} className="text-gray-700" />

        {unreadCount > 0 && (
          <span
            className="
              absolute
              -top-1
              -right-1
              min-w-[20px]
              h-5
              px-1
              rounded-full
              bg-red-600
              text-white
              text-[11px]
              font-semibold
              flex
              items-center
              justify-center
            "
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {open && (
        <div
          className="
            absolute
            right-0
            mt-3
            w-[390px]
            bg-white
            rounded-2xl
            shadow-2xl
            border
            overflow-hidden
            z-50
            animate-in
            fade-in
            slide-in-from-top-2
            duration-200
          "
        >
          {/* HEADER */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="text-lg font-bold">
                Notifications
              </h2>

              <p className="text-xs text-gray-500">
                {notifications.length} notification(s)
              </p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          {/* ACTION BAR */}
          <div className="flex items-center justify-between border-b bg-gray-50 px-5 py-3">
            <button
              onClick={handleMarkAllRead}
              className="
                flex
                items-center
                gap-2
                text-sm
                font-medium
                text-blue-600
                hover:text-blue-700
              "
            >
              <CheckCheck size={16} />
              Mark all as read
            </button>

            <span className="text-xs text-gray-500">
              Unread: {unreadCount}
            </span>
          </div>

          {/* NOTIFICATION LIST */}
          <div className="max-h-[450px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Bell
                  size={40}
                  className="mb-3 text-gray-300"
                />

                <p className="font-medium">
                  No notifications yet
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  You're all caught up.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                  onDelete={handleDelete}
                  onClick={handleOpenNotification}
                />
              ))
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t bg-gray-50">
            <button
              onClick={() => {
                setOpen(false);

                navigate(
                  role === "worker"
                    ? "/worker/notifications"
                    : "/customer/notifications",
                );
              }}
              className="
                w-full
                py-3
                text-center
                text-sm
                font-semibold
                text-blue-600
                transition
                hover:bg-blue-50
              "
            >
              View All Notifications →
            </button>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
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