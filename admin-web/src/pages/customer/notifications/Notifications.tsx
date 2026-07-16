import { useEffect, useState } from "react";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

import {
  getNotifications,
  markAsRead,
} from "../../../services/notificationService";

import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

export default function Notifications() {

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
        .channel("customer-notifications")
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
          }
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
          : item
      )
    );
  }

  return (
    <CustomerLayout>
      <div className="p-5">

        <h1 className="text-3xl font-bold mb-5">
          Notifications
        </h1>

        <div className="bg-white rounded-xl shadow overflow-hidden">

          {notifications.length === 0 ? (

            <div className="p-6 text-center text-gray-500">
              No notifications.
            </div>

          ) : (

            notifications.map((item) => (

              <div
                key={item.id}
                className={`border-b p-4 ${
                  item.is_read
                    ? "bg-white"
                    : "bg-blue-50 border-l-4 border-blue-600"
                }`}
              >

                <div className="flex justify-between items-start gap-3">

                  <div>

                    <h3 className="font-semibold">
                      {item.title}
                    </h3>

                    <p className="text-gray-600 text-sm mt-1">
                      {item.message}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </p>

                  </div>

                  {!item.is_read && (

                    <button
                      onClick={() => handleRead(item.id)}
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
    </CustomerLayout>
  );
}