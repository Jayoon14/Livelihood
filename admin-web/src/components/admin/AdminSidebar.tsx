import {
  BarChart3,
  ClipboardList,
  History,
  ShieldAlert,
  LayoutDashboard,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const menus = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: Users,
    label: "Workers",
    path: "/workers",
  },
  {
    icon: UserRound,
    label: "Customers",
    path: "/customers",
  },
  {
    icon: ClipboardList,
    label: "Bookings",
    path: "/bookings",
  },
  {
    icon: Wallet,
    label: "Payments",
    path: "/payments",
  },
  {
    icon: BarChart3,
    label: "Reports",
    path: "/admin/reports",
  },
  {
    icon: ShieldAlert,
    label: "Reports & Complaints",
    path: "/admin/cases",
  },
  {
    icon: Wrench,
    label: "Services",
    path: "/admin/services",
  },
  {
    icon: History,
    label: "Activity Logs",
    path: "/activity-logs",
  },
];

export default function AdminSidebar() {
  return (
    <aside className="flex min-h-screen w-72 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-700 p-8">
        <h1 className="text-3xl font-bold">
          LivelihoodGo
        </h1>

        <p className="mt-1 text-sm text-slate-300">
          Administrator Panel
        </p>
      </div>

      <nav className="mt-6 flex-1">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.label}
              to={menu.path}
              className={({ isActive }) =>
                [
                  "flex items-center gap-4 px-8 py-4 transition",
                  isActive
                    ? "bg-blue-600 font-semibold text-white"
                    : "text-slate-200 hover:bg-slate-800 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={20} />
              <span>{menu.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}