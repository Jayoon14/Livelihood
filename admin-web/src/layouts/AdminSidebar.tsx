import {
  LayoutDashboard,
  Users,
  UserRound,
  ClipboardList,
  BarChart3,
  Settings,
  Wallet,
  LogOut,
  History,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  logout,
} from "../services/authService";



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
    icon: History,
    label: "Activity Logs",
    path: "/activity-logs",
  },

  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
  },
];



export default function AdminSidebar() {

  const navigate = useNavigate();



  async function handleLogout() {

    await logout();

    navigate("/");

  }



  return (

    <aside
      className="
        w-72
        min-h-screen
        bg-slate-900
        text-white
        flex
        flex-col
      "
    >


      {/* LOGO */}

      <div
        className="
          p-8
          border-b
          border-slate-700
        "
      >

        <h1
          className="
            text-3xl
            font-bold
          "
        >
          LivelihoodGo
        </h1>


        <p
          className="
            text-sm
            text-slate-300
            mt-1
          "
        >
          Administrator Panel
        </p>


      </div>




      {/* MENU */}

      <nav
        className="
          flex-1
          mt-6
        "
      >

        {menus.map((menu) => {

          const Icon = menu.icon;


          return (

            <NavLink
              key={menu.label}
              to={menu.path}

              className={({ isActive }) =>
                `
                flex
                items-center
                gap-4
                px-8
                py-4
                transition
                ${
                  isActive
                    ? "bg-blue-600 text-white font-semibold"
                    : "hover:bg-slate-800"
                }
                `
              }
            >

              <Icon size={20} />


              <span>
                {menu.label}
              </span>


            </NavLink>

          );

        })}


      </nav>





      {/* LOGOUT */}

      <div
        className="
          border-t
          border-slate-700
          p-6
        "
      >

        <button
          onClick={handleLogout}

          className="
            flex
            items-center
            gap-3
            w-full
            hover:text-red-400
            transition
          "
        >

          <LogOut size={20} />

          Logout


        </button>


      </div>



    </aside>

  );

}