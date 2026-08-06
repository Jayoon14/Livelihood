import NotificationDropdown from "../notifications/NotificationDropdown";
import type { NotificationRole } from "../notifications/notificationRouting";

interface NotificationBellProps {
  role: NotificationRole;
}

export default function NotificationBell({ role }: NotificationBellProps) {
  return <NotificationDropdown role={role} />;
}
