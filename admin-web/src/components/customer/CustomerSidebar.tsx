import {
  CalendarDays,
  Heart,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Flag,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import { useChatUnreadCount } from "../../hooks/useChatUnreadCount";

interface CustomerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    name: "Trusted Workers",
    icon: ShieldCheck,
    path: "/customer/trusted-workers",
  },
  {
    name: "My Reports",
    icon: Flag,
    path: "/customer/reports",
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

export default function CustomerSidebar({
  isOpen,
  onClose,
}: CustomerSidebarProps) {
  const { count: unreadMessages } = useChatUnreadCount();

  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close sidebar backdrop"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] transition-all duration-300 lg:hidden ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        aria-label="Customer navigation"
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-dvh w-[min(86vw,18rem)] flex-col
          overflow-hidden border-r border-white/10
          text-white shadow-2xl
          transition-transform duration-300 ease-out

          bg-[linear-gradient(160deg,#3146F5_0%,#5B3DF0_35%,#3B82F6_72%,#22C1DC_100%)]
          dark:bg-[linear-gradient(160deg,#0B1220_0%,#111827_35%,#172554_68%,#0B1220_100%)]

          lg:sticky lg:top-0 lg:z-30
          lg:h-dvh lg:w-64 lg:shrink-0 lg:translate-x-0
          xl:w-72

          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Background overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/10 dark:from-white/[0.02] dark:to-black/30" />

        {/* Decorative glows */}
        <div className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="pointer-events-none absolute -left-16 bottom-10 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex min-h-24 items-center gap-3 border-b border-white/10 px-6 dark:border-white/[0.06]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 shadow-xl shadow-amber-900/30">
            <Wrench className="h-5 w-5 text-slate-900" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-white">
              Livelihood
            </h1>

            <p className="mt-0.5 text-xs font-medium text-white/65">
              Customer Portal
            </p>
          </div>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 space-y-2 overflow-y-auto px-4 py-5">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <NavLink
                key={menu.name}
                to={menu.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `
                    group flex min-h-12 items-center gap-3
                    rounded-2xl px-5 py-3.5
                    text-sm font-semibold
                    transition-all duration-300

                    ${
                      isActive
                        ? "bg-white text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,.25)] ring-1 ring-white/70"
                        : "text-white/75 hover:translate-x-1 hover:bg-white/10 hover:text-white"
                    }
                  `
                }
              >
                <Icon
                  size={20}
                  strokeWidth={2.2}
                  className="shrink-0 transition-all duration-300 group-hover:scale-110"
                />

                <span className="min-w-0 flex-1 truncate">
                  {menu.name}
                </span>

                {menu.name === "Messages" && unreadMessages > 0 && (
                  <span className="ml-auto flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold text-white shadow-lg shadow-red-500/30">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="relative z-10 border-t border-white/10 px-6 py-5 dark:border-white/[0.06]">
          <p className="text-center text-xs text-white/55">
            © 2026 LivelihoodGo
          </p>
        </div>
      </aside>
    </>
  );
}