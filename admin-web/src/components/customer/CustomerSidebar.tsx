import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Heart,
  Wallet,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useChatUnreadCount } from "../../hooks/useChatUnreadCount";

interface CustomerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerSidebar({
  isOpen,
  onClose,
}: CustomerSidebarProps) {
  const { count: unreadMessages } = useChatUnreadCount();

  const menus = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/customer/dashboard",
    },
    {
      name: "Find Workers",
      icon: Users,
      path: "/customer/workers",
    },
    {
      name: "My Bookings",
      icon: CalendarDays,
      path: "/customer/bookings",
    },
    {
      name: "Favorites",
      icon: Heart,
      path: "/customer/favorites",
    },
    {
      name: "Payments",
      icon: Wallet,
      path: "/customer/payments",
    },
    {
      name: "Messages",
      icon: MessageCircle,
      path: "/chat",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
    fixed inset-y-0 left-0 z-50
    flex h-screen w-64 flex-col
    overflow-hidden text-white shadow-xl
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    lg:static lg:h-auto lg:min-h-screen
    lg:translate-x-0 lg:shrink-0
  `}
        style={{
          background:
            "linear-gradient(160deg,#2B3BF5 0%,#5B3DF0 35%,#3B7EF0 70%,#17BFE0 100%)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-16 top-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 border-b border-white/10 px-7 py-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500">
            <Wrench className="h-5 w-5 text-[#0A1930]" />
          </div>

          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Livelihood
            </h1>

            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Customer Portal
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 space-y-1.5 p-5">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <NavLink
                key={menu.name}
                to={menu.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition-colors ${
                    isActive
                      ? "bg-white text-[#0A1930] font-semibold shadow-sm"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <Icon size={20} strokeWidth={2} />

                <span className="text-sm">{menu.name}</span>
                {menu.name === "Messages" && unreadMessages > 0 && (
                  <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
