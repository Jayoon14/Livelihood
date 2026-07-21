import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getNotifications,
  markAsRead,
  markAllNotificationsAsRead,
} from "../../../services/notificationService";

import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    let channel: any;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await loadNotifications();

      channel = supabase
        .channel("worker-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (_payload: RealtimePostgresInsertPayload<any>) => {
            loadNotifications();
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
  }, []);

  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getNotifications(user.id);

    setNotifications(data);
  }

  async function handleRead(id: number) {
    await markAsRead(id);

    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              is_read: true,
            }
          : item,
      ),
    );
  }

  // =========================
  // MARK ALL AS READ
  // =========================

  async function handleMarkAllAsRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      await markAllNotificationsAsRead(user.id);

      await loadNotifications();
    } catch (err) {
      console.error(err);
      alert("Failed to mark notifications as read.");
    }
  }

  // =========================
  // OPEN NOTIFICATION
  // =========================

  async function handleOpenNotification(item: any) {
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

      default:
        navigate("/worker/bookings");
        break;
    }
  }

  return (
    <WorkerLayout>
      <div className="p-5">
        <h1 className="text-3xl font-bold mb-5">Notifications</h1>

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-black"
          >
            ← Back
          </button>

          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Mark All as Read
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No notifications.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenNotification(item)}
                className={`border-b p-4 cursor-pointer hover:bg-gray-50 transition ${
                  item.is_read
                    ? "bg-white"
                    : "bg-blue-50 border-l-4 border-blue-600"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>

                    <p className="text-gray-600 text-sm mt-1">{item.message}</p>

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!item.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRead(item.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm"
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
    </WorkerLayout>
  );
}
