import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  History,
  ShieldAlert,
  Gavel,
  LayoutDashboard,
  UserRound,
  Users,
  Wallet,
  Wrench,
  X,
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
    icon: BriefcaseBusiness,
    label: "Projects",
    path: "/admin/projects",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    path: "/admin/reports",
  },
  {
    icon: ShieldAlert,
    label: "Reports & Complaints",
    path: "/admin/cases",
  },
  {
    icon: Gavel,
    label: "Risk & Appeals",
    path: "/admin/risk-management",
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

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({
  isOpen,
  onClose,
}: AdminSidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col overflow-y-auto bg-slate-900 text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:w-72 lg:shrink-0 lg:translate-x-0 lg:shadow-none ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="border-b border-slate-700 p-6">
        <div className="flex items-center gap-3">
          <img
            src="/serbisyogo-logo.png"
            alt="SerbisyoGo logo"
            className="h-14 w-16 rounded-xl object-cover object-center"
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">SerbisyoGo</h1>
            <p className="mt-1 text-sm text-slate-300">Administrator Panel</p>
          </div>
          <button
            type="button"
            aria-label="Close admin sidebar"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="mt-6 flex-1">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.label}
              to={menu.path}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center gap-4 px-6 py-3.5 transition sm:px-8 sm:py-4",
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