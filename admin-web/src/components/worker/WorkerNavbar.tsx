import { useEffect, useRef, useState } from "react";
import {
  UserCircle,
  ChevronDown,
  User,
  Pencil,
  LogOut,
  Menu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import NotificationDropdown from "../notifications/NotificationDropdown";
import ThemeDropdown from "../common/ThemeDropdown";

import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContext";
import { useWorkerLocation } from "../../context/WorkerLocationProvider";

interface WorkerNavbarProps {
  onMenuClick: () => void;
}

export default function WorkerNavbar({ onMenuClick }: WorkerNavbarProps) {
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const { profile } = useProfile();

  const { goOffline } = useWorkerLocation();

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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

async function handleLogout() {
  setOpen(false);

  try {
    await goOffline();
  } catch (error) {
    console.error("Unable to set worker offline before logout:", error);
  }

  try {
    await logout();
    navigate("/", { replace: true });
  } catch (error) {
    console.error("Unable to log out:", error);
  }
}
  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Worker";

  const email = profile?.email ?? "";

  const avatar = profile?.profile_picture || "";

  return (
    <header
      className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950 sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A1930] transition-colors hover:bg-slate-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1
            className="text-xl font-bold text-slate-900 sm:text-2xl"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Worker Dashboard
          </h1>

          <p className="hidden text-slate-500 sm:block">
            Welcome back, {fullName}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Theme */}
        <ThemeDropdown />

        {/* Notifications */}
        <NotificationDropdown role="worker" />

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-100 sm:px-3"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={`${fullName} profile`}
                className="h-11 w-11 rounded-full border-2 border-amber-500 object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 border border-slate-100">
                <UserCircle size={26} className="text-amber-600" />
              </div>
            )}

            <div className="hidden text-left md:block">
              <p className="font-semibold text-slate-900">{fullName}</p>

              <p className="text-sm text-slate-500">{email}</p>
            </div>

            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,.12)] dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/worker/profile");
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <User size={16} className="text-blue-600" />
                </div>
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/worker/profile/edit");
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Pencil size={16} className="text-amber-600" />
                </div>
                <span>Edit Profile</span>
              </button>

              <hr className="border-slate-100" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <LogOut size={16} className="text-rose-600" />
                </div>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}