import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

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
    icon: Briefcase,
    label: "Employers",
    path: "/employers",
  },
  {
    icon: ClipboardList,
    label: "Bookings",
    path: "/bookings",
  },
  {
    icon: BarChart3,
    label: "Reports",
    path: "/reports",
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <aside className="w-72 min-h-screen bg-blue-700 text-white flex flex-col">

      {/* Logo */}

      <div className="p-8 border-b border-blue-600">

        <h1 className="text-3xl font-bold">
          LivelihoodGo
        </h1>

        <p className="text-sm text-blue-200 mt-1">
          Admin Panel
        </p>

      </div>

      {/* Menu */}

      <nav className="flex-1 mt-6">

        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.label}
              to={menu.path}
              className={({ isActive }) =>
                `flex items-center gap-4 px-8 py-4 transition

                ${
                  isActive
                    ? "bg-white text-blue-700 font-semibold"
                    : "hover:bg-blue-800"
                }`
              }
            >
              <Icon size={20} />

              <span>{menu.label}</span>

            </NavLink>
          );
        })}

      </nav>

      {/* Footer */}

      <div className="border-t border-blue-600 p-6">

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full hover:text-red-200 transition"
        >
          <LogOut size={20} />

          Logout

        </button>

      </div>

    </aside>
  );
}