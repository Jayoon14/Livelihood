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

import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContext";

interface WorkerNavbarProps {
  onMenuClick: () => void;
}

export default function WorkerNavbar({ onMenuClick }: WorkerNavbarProps) {
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
    : "Worker";

  const email = profile?.email ?? "";

  const avatar = profile?.profile_picture || "";

  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      {/* LEFT */}
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden"
        >
          <Menu size={24} />
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
            Worker Dashboard
          </h1>

          <p className="hidden text-gray-500 sm:block">
            Welcome back, {fullName}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Notifications */}
        <NotificationDropdown role="worker" />

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-gray-100 sm:px-3"
          >
            {avatar ? (
              <img
                src={avatar}
                alt={`${fullName} profile`}
                className="h-11 w-11 rounded-full border-2 border-green-600 object-cover"
              />
            ) : (
              <UserCircle size={42} className="text-green-600" />
            )}

            <div className="hidden text-left md:block">
              <p className="font-semibold text-gray-800">{fullName}</p>

              <p className="text-sm text-gray-500">{email}</p>
            </div>

            <ChevronDown
              size={18}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-xl border bg-white shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/worker/profile");
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-100"
              >
                <User size={20} />
                <span>My Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/worker/profile/edit");
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-gray-100"
              >
                <Pencil size={20} />
                <span>Edit Profile</span>
              </button>

              <hr />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-red-600 hover:bg-red-50"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
