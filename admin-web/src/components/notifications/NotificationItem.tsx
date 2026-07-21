import {
  CalendarDays,
  CreditCard,
  CircleCheck,
  XCircle,
  MessageCircle,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { timeAgo } from "../../utils/timeAgo";

interface NotificationItemProps {
  notification: any;
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClick: (notification: any) => void;
}

export default function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  function getIcon(title: string) {
    const text = title.toLowerCase();

    if (text.includes("booking")) {
      return (
        <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
          <CalendarDays className="text-blue-600" size={22} />
        </div>
      );
    }

    if (text.includes("payment")) {
      return (
        <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
          <CreditCard className="text-green-600" size={22} />
        </div>
      );
    }

    if (text.includes("verified")) {
      return (
        <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center">
          <ShieldCheck className="text-emerald-600" size={22} />
        </div>
      );
    }

    if (text.includes("completed")) {
      return (
        <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
          <CircleCheck className="text-green-600" size={22} />
        </div>
      );
    }

    if (text.includes("cancel")) {
      return (
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="text-red-600" size={22} />
        </div>
      );
    }

    if (text.includes("chat")) {
      return (
        <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center">
          <MessageCircle className="text-indigo-600" size={22} />
        </div>
      );
    }

    if (text.includes("rating")) {
      return (
        <div className="w-11 h-11 rounded-full bg-yellow-100 flex items-center justify-center">
          <Star className="text-yellow-500" size={22} />
        </div>
      );
    }

    return (
      <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
        <CalendarDays className="text-blue-600" size={22} />
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick(notification)}
      className={`group cursor-pointer transition-all duration-200 px-5 py-4 border-b hover:bg-gray-50 ${
        notification.is_read
          ? "bg-white"
          : "bg-blue-50 border-l-4 border-blue-600"
      }`}
    >
      <div className="flex gap-4">
        {/* ICON */}
        {getIcon(notification.title)}

        {/* CONTENT */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800">
              {notification.title}
            </h3>

            {!notification.is_read && (
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            )}
          </div>

          <p className="text-gray-600 text-sm mt-1 leading-6">
            {notification.message}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            {timeAgo(notification.created_at)}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col items-end gap-2">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRead(notification.id);
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg"
            >
              Read
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition"
          >
            <Trash2 size={18} className="text-red-500 hover:text-red-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
