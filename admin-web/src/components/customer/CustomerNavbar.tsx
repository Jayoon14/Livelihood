import { useEffect, useRef, useState } from "react";
import {
  UserCircle,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContext";
import NotificationDropdown from "../notifications/NotificationDropdown";

interface CustomerNavbarProps {
  onMenuClick: () => void;
}

export default function CustomerNavbar({ onMenuClick }: CustomerNavbarProps) {
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const { profile } = useProfile();

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
    await logout();
    navigate("/");
  }

  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Customer";

  const email = profile?.email ?? "";

  const avatar = profile?.profile_picture || "";

  return (
    <header
      className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm sm:px-6 lg:px-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* LEFT */}
      <div className="flex items-center">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="mr-3 rounded-xl p-2 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={22} className="text-[#0A1930]" />
        </button>

        <div>
          <h1
            className="text-xl font-bold text-slate-900"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Customer Dashboard
          </h1>

          <p className="hidden text-sm text-slate-500 sm:block">
            Welcome back, {fullName}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationDropdown role="customer" />

        {/* Profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100"
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="h-10 w-10 rounded-full border-2 border-[#0A1930] object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 border border-slate-100">
                <UserCircle size={24} className="text-blue-600" />
              </div>
            )}

            <div className="hidden text-left md:block">
              <p className="text-sm font-semibold text-slate-900">{fullName}</p>

              <p className="text-xs text-slate-500">{email}</p>
            </div>

            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,.12)]">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/profile");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <User size={16} className="text-blue-600" />
                </div>
                My Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/settings");
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Settings size={16} className="text-amber-600" />
                </div>
                Settings
              </button>

              <hr className="border-slate-100" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <LogOut size={16} className="text-rose-600" />
                </div>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}