import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Star,
  User,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";


export default function WorkerSidebar() {

  const navigate = useNavigate();


  async function handleLogout() {
    await logout();
    navigate("/worker/login");
  }



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
      name: "Profile",
      icon: User,
      path: "/worker/profile",
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

              {menu.name}

            </NavLink>
          );

        })}

      </nav>




      {/* LOGOUT */}

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
  );
}