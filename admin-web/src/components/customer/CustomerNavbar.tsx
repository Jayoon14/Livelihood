import { useEffect, useRef, useState } from "react";
import { UserCircle, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContext";
import NotificationDropdown from "../notifications/NotificationDropdown";

export default function CustomerNavbar() {
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
      className="
        bg-white
        shadow-sm
        border-b
        h-20
        flex
        items-center
        justify-between
        px-6
      "
    >
      {/* LEFT */}

      <div>
        <h1 className="text-xl font-bold text-gray-800">Customer Dashboard</h1>

        <p className="text-sm text-gray-500">Welcome back, {fullName}</p>
      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-3">
        {/* NOTIFICATION */}

        <NotificationDropdown role="customer" />

        {/* PROFILE */}

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="
              flex
              items-center
              gap-2
              px-2
              py-1.5
              rounded-xl
              hover:bg-gray-100
            "
          >
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="
                  w-10
                  h-10
                  rounded-full
                  object-cover
                  border-2
                  border-blue-600
                "
              />
            ) : (
              <UserCircle size={40} className="text-blue-600" />
            )}

            <div className="text-left">
              <p className="font-semibold text-sm">{fullName}</p>

              <p className="text-xs text-gray-500">{email}</p>
            </div>

            <ChevronDown size={16} />
          </button>

          {open && (
            <div
              className="
                absolute
                right-0
                mt-2
                w-56
                bg-white
                rounded-xl
                shadow-lg
                border
                overflow-hidden
                z-50
              "
            >
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/profile");
                }}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-2.5
                  hover:bg-gray-100
                "
              >
                <User size={17} />
                My Profile
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/customer/settings");
                }}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-2.5
                  hover:bg-gray-100
                "
              >
                <Settings size={17} />
                Settings
              </button>

              <hr />

              <button
                onClick={handleLogout}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-4
                  py-2.5
                  text-red-600
                  hover:bg-red-50
                "
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
