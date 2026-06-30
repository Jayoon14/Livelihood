import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  User,
  LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

interface Props {
  children: ReactNode;
}

export default function CustomerLayout({ children }: Props) {
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
      name: "Workers",
      icon: Users,
      path: "/customer/workers",
    },
    {
      name: "Bookings",
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
    <div className="flex min-h-screen bg-slate-100">

      {/* Sidebar */}

      <aside className="w-64 bg-blue-700 text-white flex flex-col">

        <div className="p-6 border-b border-blue-600">

          <h1 className="text-2xl font-bold">
            Livelihood
          </h1>

          <p className="text-blue-200 text-sm">
            Customer Portal
          </p>

        </div>

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
                {menu.name}
              </NavLink>
            );
          })}

        </nav>

        <div className="p-4">

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-600 transition"
          >
            <LogOut size={20} />
            Logout
          </button>

        </div>

      </aside>

      {/* Content */}

      <div className="flex-1">

        {/* Navbar */}

        <header className="bg-white shadow px-8 py-5 flex justify-between items-center">

          <h2 className="text-2xl font-bold">
            Customer Dashboard
          </h2>

          <div className="font-semibold">
            Welcome 👋
          </div>

        </header>

        <main className="p-8">
          {children}
        </main>

      </div>

    </div>
  );
}