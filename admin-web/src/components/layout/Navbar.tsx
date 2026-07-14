import { useEffect, useRef, useState } from "react";
import {
  Bell,
  UserCircle,
  ChevronDown,
  User,
  Pencil,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { logout } from "../../services/authService";
import { getUnreadCount } from "../../services/notificationService";
import { useProfile } from "../../context/ProfileContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { profile } = useProfile();

  async function loadUnread() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const count = await getUnreadCount(user.id);

    setUnreadCount(count);
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  useEffect(() => {
    loadUnread();

    const channel = supabase
      .channel("navbar-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const name = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Customer";

  const email = profile?.email || "";
  const avatar = profile?.profile_image || "";

  return (
    <header className="bg-white shadow px-8 py-5 flex justify-between items-center">

      <div>
        <h1 className="text-2xl font-bold">
          Customer Dashboard
        </h1>

        <p className="text-gray-500">
          Welcome back, {name}
        </p>
      </div>

      <div className="flex items-center gap-6">

        <button
          onClick={() =>
            navigate("/customer/notifications")
          }
          className="relative"
        >
          <Bell
            size={24}
            className="text-gray-600"
          />

          {unreadCount > 0 && (
            <span
              className="
                absolute
                -top-2
                -right-2
                bg-red-600
                text-white
                text-xs
                rounded-full
                min-w-[20px]
                h-5
                px-1
                flex
                items-center
                justify-center
              "
            >
              {unreadCount}
            </span>
          )}
        </button>

        <div
          className="relative"
          ref={dropdownRef}
        >
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 hover:bg-gray-100 rounded-xl px-3 py-2 transition"
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="w-11 h-11 rounded-full object-cover border-2 border-blue-600"
              />
            ) : (
              <UserCircle
                size={44}
                className="text-blue-600"
              />
            )}

            <div className="text-left">
              <p className="font-semibold">
                {name || "Customer"}
              </p>

              <p className="text-sm text-gray-500">
                {email}
              </p>
            </div>

            <ChevronDown size={18} />
          </button>

          {open && (
            <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-xl border overflow-hidden z-50">

              <button
                onClick={() =>
                  navigate("/customer/profile")
                }
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100"
              >
                <User size={20} />
                My Profile
              </button>

              <button
                onClick={() =>
                  navigate("/customer/profile")
                }
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100"
              >
                <Pencil size={20} />
                Edit Profile
              </button>

              <hr />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3 text-red-600 hover:bg-red-50"
              >
                <LogOut size={20} />
                Logout
              </button>

            </div>
          )}

        </div>

      </div>

    </header>
  );
}