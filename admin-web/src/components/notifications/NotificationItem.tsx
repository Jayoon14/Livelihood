import {
  Bell,
  CalendarDays,
  CheckCheck,
  CircleCheck,
  CreditCard,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";

import type { Notification } from "../../services/notificationService";
import { timeAgo } from "../../utils/timeAgo";

interface NotificationItemProps {
  notification: Notification;
  processing?: boolean;
  compact?: boolean;
  onRead: (id: number) => Promise<void> | void;
  onDelete: (notification: Notification) => Promise<void> | void;
  onClick: (notification: Notification) => Promise<void> | void;
}

function getIconData(notification: Notification): {
  icon: typeof Bell;
  wrapperClassName: string;
} {
  const text =
    `${notification.title} ${notification.message}`.toLowerCase();

  if (
    text.includes("payment") ||
    text.includes("receipt") ||
    text.includes("refund")
  ) {
    return {
      icon: CreditCard,
      wrapperClassName:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  }

  if (
    text.includes("review") ||
    text.includes("rating") ||
    text.includes("feedback")
  ) {
    return {
      icon: Star,
      wrapperClassName:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    };
  }

  if (text.includes("message") || text.includes("chat")) {
    return {
      icon: MessageCircle,
      wrapperClassName:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    };
  }

  if (
    text.includes("cancel") ||
    text.includes("reject") ||
    text.includes("decline")
  ) {
    return {
      icon: XCircle,
      wrapperClassName:
        "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    };
  }

  if (
    text.includes("approved") ||
    text.includes("completed") ||
    text.includes("success")
  ) {
    return {
      icon: CircleCheck,
      wrapperClassName:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    };
  }

  if (
    text.includes("verified") ||
    text.includes("verification")
  ) {
    return {
      icon: ShieldCheck,
      wrapperClassName:
        "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    };
  }

  if (
    text.includes("booking") ||
    text.includes("schedule") ||
    text.includes("job") ||
    notification.booking_id
  ) {
    return {
      icon: CalendarDays,
      wrapperClassName:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    };
  }

  return {
    icon: Bell,
    wrapperClassName:
      "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  };
}

export default function NotificationItem({
  notification,
  processing = false,
  compact = false,
  onRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const iconData = getIconData(notification);
  const Icon = iconData.icon;

  return (
    <article
      className={`group relative border-b border-slate-200 transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
        notification.is_read
          ? "bg-white dark:bg-slate-900"
          : "bg-blue-50/60 dark:bg-blue-950/20"
      }`}
    >
      {!notification.is_read && (
        <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
      )}

      <div
        className={`flex items-start gap-3 ${
          compact ? "p-4" : "p-4 sm:gap-4 sm:p-6"
        }`}
      >
        <button
          type="button"
          onClick={() => void onClick(notification)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left sm:gap-4"
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl ${
              compact ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12"
            } ${iconData.wrapperClassName}`}
          >
            <Icon className={compact ? "h-5 w-5" : "h-5 w-5 sm:h-6 sm:w-6"} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`wrap-break-word text-slate-900 dark:text-white ${
                  compact ? "text-sm" : "text-sm sm:text-base"
                } ${
                  notification.is_read ? "font-semibold" : "font-bold"
                }`}
              >
                {notification.title}
              </h3>

              {!notification.is_read && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  New
                </span>
              )}
            </div>

            <p
              className={`mt-1 wrap-break-word text-slate-600 dark:text-slate-300 ${
                compact
                  ? "line-clamp-2 text-xs leading-5"
                  : "text-sm leading-6"
              }`}
            >
              {notification.message}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {timeAgo(notification.created_at)}
            </p>
          </div>
        </button>

        <div className="flex shrink-0 flex-col gap-2">
          {!notification.is_read && (
            <button
              type="button"
              onClick={() => void onRead(notification.id)}
              disabled={processing}
              className="rounded-lg border border-blue-200 bg-white p-2 text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/50 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
              aria-label={`Mark ${notification.title} as read`}
            >
              {processing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => void onDelete(notification)}
            disabled={processing}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-300"
            aria-label={`Delete ${notification.title}`}
          >
            {processing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
