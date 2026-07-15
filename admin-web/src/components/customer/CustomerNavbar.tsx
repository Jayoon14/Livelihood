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

export default function CustomerNavbar() {
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { profile } = useProfile();

  async function loadUnread() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      const count = await getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadUnread();

    const channel = supabase
      .channel("customer-navbar")
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

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Customer";

  const email = profile?.email ?? "";

  const avatar = profile?.profile_picture || "";

  return (
    <header className="bg-white shadow-sm border-b h-20 flex items-center justify-between px-8">

      {/* LEFT */}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Customer Dashboard
        </h1>

        <p className="text-gray-500">
          Welcome back, {fullName}
        </p>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-6">

        {/* Notification */}

        <button
          onClick={() =>
            navigate("/customer/notifications")
          }
          className="relative"
        >
          <Bell
            size={24}
            className="text-gray-700"
          />

          {unreadCount > 0 && (
            <span
              className="
                absolute
                -top-2
                -right-2
                bg-red-600
                text-white
                rounded-full
                min-w-[20px]
                h-5
                px-1
                flex
                items-center
                justify-center
                text-xs
              "
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* USER MENU */}

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
                size={42}
                className="text-blue-600"
              />
            )}

            <div className="text-left">

              <p className="font-semibold">
                {fullName}
              </p>

              <p className="text-sm text-gray-500">
                {email}
              </p>

            </div>

            <ChevronDown size={18} />

          </button>

          {open && (

            <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border overflow-hidden z-50">

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/profile");
                }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-100"
              >
                <User size={20} />
                My Profile
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/profile/edit");
                }}
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