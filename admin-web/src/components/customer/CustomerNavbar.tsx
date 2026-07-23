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
    <header className="flex h-20 items-center justify-between border-b bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      {/* LEFT */}
      <div className="flex items-center">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="mr-3 rounded-lg p-2 transition hover:bg-gray-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-800">
            Customer Dashboard
          </h1>

          <p className="hidden text-sm text-gray-500 sm:block">
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
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100"
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="h-10 w-10 rounded-full border-2 border-blue-600 object-cover"
              />
            ) : (
              <UserCircle size={40} className="text-blue-600" />
            )}

            <div className="hidden text-left md:block">
              <p className="text-sm font-semibold">{fullName}</p>

              <p className="text-xs text-gray-500">{email}</p>
            </div>

            <ChevronDown
              size={16}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/profile");
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100"
              >
                <User size={17} />
                My Profile
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/settings");
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100"
              >
                <Settings size={17} />
                Settings
              </button>

              <hr />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
