import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Pencil,
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

  const { profile } = useProfile();

  /*
   * Tumataas ang value na ito kapag may INSERT, UPDATE,
   * o DELETE sa notifications table.
   */
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

  /*
   * Initial load at automatic reload kapag may pagbabago
   * sa notifications table mula sa RealtimeProvider.
   */
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

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Admin logout failed:", error);
    }
  }

  const fullName = profile
    ? `${profile.first_name ?? ""} ${
        profile.last_name ?? ""
      }`.trim() || "Administrator"
    : "Administrator";

  const email = profile?.email ?? "";
  const avatar = profile?.profile_picture ?? "";

  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-8 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Administrator Dashboard
        </h1>

        <p className="text-gray-500">
          Welcome back, {fullName}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <ThemeDropdown />
        <button
          type="button"
          onClick={() => navigate("/admin/notifications")}
          className="relative rounded-lg p-2 transition hover:bg-gray-100"
          aria-label={`Notifications${
            unreadCount > 0
              ? `, ${unreadCount} unread`
              : ""
          }`}
        >
          <Bell size={24} className="text-gray-700" />

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
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-gray-100"
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

            <div className="text-left">
              <p className="font-semibold">{fullName}</p>

              {email && (
                <p className="text-sm text-gray-500">
                  {email}
                </p>
              )}
            </div>

            <ChevronDown
              size={18}
              className={`transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-xl border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate("/admin/profile");
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-100"
              >
                <User size={20} />
                My Profile
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate("/admin/profile/edit");
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-100"
              >
                <Pencil size={20} />
                Edit Profile
              </button>

              <hr />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  void handleLogout();
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-red-600 hover:bg-red-50"
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