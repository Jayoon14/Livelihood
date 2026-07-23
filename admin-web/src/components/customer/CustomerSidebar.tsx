import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Heart,
  Wallet,
  MessageCircle,
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface CustomerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerSidebar({
  isOpen,
  onClose,
}: CustomerSidebarProps) {
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
          flex min-h-screen w-64 flex-col
          bg-blue-700 text-white shadow-xl
          transform transition-transform duration-300
          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
          lg:static
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="border-b border-blue-600 p-8">
          <h1 className="text-3xl font-bold">LivelihoodGo</h1>

          <p className="mt-1 text-blue-200">
            Customer Portal
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-5">
          {menus.map((menu) => {
            const Icon = menu.icon;

            return (
              <NavLink
                key={menu.name}
                to={menu.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-xl px-5 py-4 transition ${
                    isActive
                      ? "bg-white text-blue-700 font-semibold shadow"
                      : "hover:bg-blue-600"
                  }`
                }
              >
                <Icon size={22} />

                <span>{menu.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}