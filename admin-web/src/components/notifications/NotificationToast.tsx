import { Bell, X } from "lucide-react";
import { useEffect } from "react";

interface Props {
  notification: any;
  onClose: () => void;
  onClick: () => void;
}

export default function NotificationToast({
  notification,
  onClose,
  onClick,
}: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="
        fixed
        top-6
        right-6
        w-[360px]
        bg-white
        rounded-2xl
        shadow-2xl
        border
        z-[9999]
        animate-[slideIn_.35s_ease]
        overflow-hidden
      "
    >
      <div
        onClick={onClick}
        className="cursor-pointer p-4 hover:bg-gray-50 transition"
      >
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Bell className="text-blue-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-gray-800">
              {notification.title}
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>

            <p className="mt-2 text-xs text-gray-400">
              Just now
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <X
              size={18}
              className="text-gray-500 hover:text-red-500"
            />
          </button>
        </div>
      </div>
    </div>
  );
}