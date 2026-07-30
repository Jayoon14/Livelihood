import { Bell, X } from "lucide-react";
import { useEffect } from "react";

import type { Notification } from "../../services/notificationService";

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
  onClick: () => Promise<void> | void;
}

export default function NotificationToast({
  notification,
  onClose,
  onClick,
}: NotificationToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5_000);

    return () => window.clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-3 right-3 top-3 z-9999 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300 sm:left-auto sm:right-6 sm:top-6 sm:w-96 dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        className="cursor-pointer p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        onClick={() => void onClick()}
      >
        <div className="flex gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
            <Bell className="h-6 w-6 text-blue-600 dark:text-blue-300" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="wrap-break-word font-bold text-slate-900 dark:text-white">
              {notification.title}
            </h3>

            <p className="mt-1 line-clamp-3 wrap-break-word text-sm leading-6 text-slate-600 dark:text-slate-300">
              {notification.message}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Just now
            </p>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="h-8 w-8 shrink-0 rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-700"
            aria-label="Close notification"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
