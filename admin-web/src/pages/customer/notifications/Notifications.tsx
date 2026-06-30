import { useEffect, useState } from "react";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { getCustomerNotifications } from "../../../services/notificationService";

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getCustomerNotifications(user.id);

    setNotifications(data);
  }

  return (
    <CustomerLayout>

      <h1 className="text-3xl font-bold mb-8">
        Notifications
      </h1>

      <div className="bg-white rounded-2xl shadow">

        {notifications.length === 0 ? (

          <div className="p-10 text-center text-gray-500">
            No notifications.
          </div>

        ) : (

          notifications.map((item) => (

            <div
              key={item.id}
              className="border-b p-5 hover:bg-gray-50"
            >
              <h3 className="font-semibold">
                {item.title}
              </h3>

              <p className="text-gray-600 mt-1">
                {item.message}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>

          ))

        )}

      </div>

    </CustomerLayout>
  );
}