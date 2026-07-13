import {
  LayoutDashboard,
  Users,
  CalendarDays,
  User,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

export default function CustomerSidebar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
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
      name: "Profile",
      icon: User,
      path: "/customer/profile",
    },
  ];

  return (
    <aside className="w-72 min-h-screen bg-blue-700 text-white flex flex-col shadow-xl">
      <div className="p-8 border-b border-blue-600">
        <h1 className="text-3xl font-bold">
          LivelihoodGo
        </h1>

        <p className="text-blue-200 mt-1">
          Customer Portal
        </p>
      </div>

      <nav className="flex-1 p-5 space-y-2">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.name}
              to={menu.path}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-4 rounded-xl transition ${
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

      <div className="p-5 border-t border-blue-600">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 w-full px-5 py-4 rounded-xl hover:bg-red-600 transition"
        >
          <LogOut size={22} />
          Logout
        </button>
      </div>
    </aside>
  );
}