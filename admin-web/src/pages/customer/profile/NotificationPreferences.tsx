import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

import {
  getNotificationPreference,
  saveNotificationPreference,
} from "../../../services/notificationPreferenceService";

export default function NotificationPreferences() {
  const [settings, setSettings] = useState({
    booking_updates: true,
    chat_notifications: true,
    payment_notifications: true,
    review_reminders: true,
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const data = await getNotificationPreference(user.id);

    if (data) setSettings(data);
  }

  async function save() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await saveNotificationPreference(user.id, settings);

    alert("Notification preferences updated.");
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-5">Notification Preferences</h2>

      <div className="space-y-4">
        <label className="flex justify-between">
          Booking Updates
          <input
            type="checkbox"
            checked={settings.booking_updates}
            onChange={(e) =>
              setSettings({
                ...settings,
                booking_updates: e.target.checked,
              })
            }
          />
        </label>

        <label className="flex justify-between">
          Chat Notifications
          <input
            type="checkbox"
            checked={settings.chat_notifications}
            onChange={(e) =>
              setSettings({
                ...settings,
                chat_notifications: e.target.checked,
              })
            }
          />
        </label>

        <label className="flex justify-between">
          Payment Notifications
          <input
            type="checkbox"
            checked={settings.payment_notifications}
            onChange={(e) =>
              setSettings({
                ...settings,
                payment_notifications: e.target.checked,
              })
            }
          />
        </label>

        <label className="flex justify-between">
          Review Reminder
          <input
            type="checkbox"
            checked={settings.review_reminders}
            onChange={(e) =>
              setSettings({
                ...settings,
                review_reminders: e.target.checked,
              })
            }
          />
        </label>

        <button
          onClick={save}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg"
        >
          Save
        </button>
      </div>
    </div>
  );
}
