import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Pencil,
  Settings,
  User,
  UserCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useProfile } from "../../context/ProfileContext";
import { useRealtimeTableVersion } from "../../providers/RealtimeProvider";
import { supabase } from "../../lib/supabase";
import { logout } from "../../services/authService";
import { getUnreadCount } from "../../services/notificationService";
import ThemeDropdown from "../common/ThemeDropdown";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const { profile } = useProfile();

  const notificationsVersion =
    useRealtimeTableVersion("notifications");

  const loadUnread = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setUnreadCount(0);
        return;
      }

      const count = await getUnreadCount(user.id);

      setUnreadCount(count);
    } catch (error) {
      console.error(
        "Unable to load admin notification count:",
        error,
      );
    }
  }, []);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread, notificationsVersion]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Admin logout failed:", error);
      setLoggingOut(false);
    }
  }

  function goTo(path: string) {
    setOpen(false);
    navigate(path);
  }

  const fullName = profile
    ? [
        profile.first_name,
        profile.middle_name,
        profile.last_name,
        profile.suffix,
      ]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" ") || "Administrator"
    : "Administrator";

  const email = profile?.email ?? "";
  const avatar = profile?.profile_picture ?? "";

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Administrator Dashboard
        </h1>

        <p className="text-gray-500 dark:text-slate-400">
          Welcome back, {fullName}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <ThemeDropdown />

        <button
          type="button"
          onClick={() => navigate("/admin/notifications")}
          className="relative rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label={`Notifications${
            unreadCount > 0
              ? `, ${unreadCount} unread`
              : ""
          }`}
        >
          <Bell
            size={24}
            className="text-gray-700 dark:text-slate-200"
          />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setOpen((currentOpen) => !currentOpen);
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-slate-800"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={`${fullName} profile`}
                className="h-11 w-11 rounded-full border-2 border-red-600 object-cover"
              />
            ) : (
              <UserCircle
                size={42}
                className="text-red-600"
              />
            )}

            <div className="hidden text-left sm:block">
              <p className="max-w-48 truncate font-semibold text-slate-900 dark:text-white">
                {fullName}
              </p>

              {email && (
                <p className="max-w-48 truncate text-sm text-gray-500 dark:text-slate-400">
                  {email}
                </p>
              )}
            </div>

            <ChevronDown
              size={18}
              className={`hidden transition-transform sm:block ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {fullName}
                </p>

                {email && (
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {email}
                  </p>
                )}
              </div>

              <div className="py-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo("/admin/profile")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-slate-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <User size={20} />
                  My Profile
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo("/admin/profile/edit")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-slate-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Pencil size={20} />
                  Edit Profile
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo("/settings")}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-slate-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Settings size={20} />
                  Settings
                </button>
              </div>

              <div className="border-t border-slate-100 py-2 dark:border-slate-800">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30"
                >
                  <LogOut size={20} />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}