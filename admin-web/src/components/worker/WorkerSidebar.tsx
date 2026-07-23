import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Star,
  Briefcase,
  CreditCard,
  Wallet,
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface WorkerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkerSidebar({ isOpen, onClose }: WorkerSidebarProps) {
  const menus = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/worker/dashboard",
    },
    {
      name: "Bookings",
      icon: CalendarCheck,
      path: "/worker/bookings",
    },
    {
      name: "Schedule",
      icon: CalendarDays,
      path: "/worker/schedule",
    },
    {
      name: "Reviews",
      icon: Star,
      path: "/worker/reviews",
    },
    {
      name: "Services",
      icon: Briefcase,
      path: "/worker/services",
    },
    {
      name: "Payment Information",
      icon: CreditCard,
      path: "/worker/payment-information",
    },
    {
      name: "Payment Requests",
      icon: Wallet,
      path: "/worker/payments",
    },
  ];

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 min-h-screen bg-blue-700 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:static lg:z-auto lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* LOGO */}
      <div className="border-b border-blue-600 p-6">
        <h1 className="text-2xl font-bold">LivelihoodGo</h1>
        <p className="text-sm text-blue-200">Worker Portal</p>
      </div>

      {/* MENU */}
      <nav className="flex-1 space-y-2 p-4">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.name}
              to={menu.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-white font-semibold text-blue-700"
                    : "hover:bg-blue-600"
                }`
              }
            >
              <Icon size={20} />
              <span>{menu.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
