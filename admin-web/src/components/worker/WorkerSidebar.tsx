import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Star,
  Briefcase,
  CreditCard,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { Wallet } from "lucide-react";

export default function WorkerSidebar() {
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
    <aside className="w-64 min-h-screen bg-blue-700 text-white flex flex-col">

      {/* LOGO */}
      <div className="p-6 border-b border-blue-600">
        <h1 className="text-2xl font-bold">
          LivelihoodGo
        </h1>

        <p className="text-blue-200 text-sm">
          Worker Portal
        </p>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-4 space-y-2">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.name}
              to={menu.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  isActive
                    ? "bg-white text-blue-700 font-semibold"
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