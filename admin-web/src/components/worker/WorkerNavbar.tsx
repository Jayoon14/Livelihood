import { useEffect, useRef, useState } from "react";
import { UserCircle, ChevronDown, User, Pencil, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import NotificationDropdown from "../notifications/NotificationDropdown";

import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContext";

export default function WorkerNavbar() {
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
    <header className="bg-white shadow-sm border-b h-20 flex items-center justify-between px-8">
      {/* LEFT */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Worker Dashboard</h1>

        <p className="text-gray-500">Welcome back, {fullName}</p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">
        {/* NOTIFICATIONS */}
        <NotificationDropdown role="worker" />

        {/* USER MENU */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="
              flex
              items-center
              gap-3
              hover:bg-gray-100
              rounded-xl
              px-3
              py-2
              transition
            "
          >
            {avatar ? (
              <img
                src={avatar}
                alt={`${fullName} profile`}
                className="
                  w-11
                  h-11
                  rounded-full
                  object-cover
                  border-2
                  border-green-600
                "
              />
            ) : (
              <UserCircle size={42} className="text-green-600" />
            )}

            <div className="text-left">
              <p className="font-semibold text-gray-800">{fullName}</p>

              <p className="text-sm text-gray-500">{email}</p>
            </div>

            <ChevronDown
              size={18}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div
              className="
                absolute
                right-0
                mt-3
                w-64
                bg-white
                rounded-xl
                shadow-xl
                border
                overflow-hidden
                z-50
              "
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/worker/profile");
                }}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-5
                  py-3
                  text-left
                  hover:bg-gray-100
                "
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
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-5
                  py-3
                  text-left
                  hover:bg-gray-100
                "
              >
                <Pencil size={20} />
                <span>Edit Profile</span>
              </button>

              <hr />

              <button
                type="button"
                onClick={handleLogout}
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  px-5
                  py-3
                  text-left
                  text-red-600
                  hover:bg-red-50
                "
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
