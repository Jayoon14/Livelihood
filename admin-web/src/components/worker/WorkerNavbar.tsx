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

export default function WorkerNavbar() {
  const navigate = useNavigate();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { profile } = useProfile();

  useEffect(() => {
    let isCancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error(error);
        return;
      }

      if (!user || isCancelled) return;

      try {
        const count = await getUnreadCount(user.id);

        if (!isCancelled) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error(err);
      }

      if (isCancelled) return;

      channel = supabase
        .channel(`worker-navbar-${user.id}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            try {
              const count = await getUnreadCount(user.id);

              if (!isCancelled) {
                setUnreadCount(count);
              }
            } catch (err) {
              console.error(err);
            }
          },
        )
        .subscribe((status) => {
          console.log("Worker Navbar Channel:", status);
        });
    }

    initialize();

    return () => {
      isCancelled = true;

      if (channel) {
        supabase.removeChannel(channel);
      }
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
        {/* NOTIFICATION */}
        <button
          type="button"
          onClick={() => navigate("/worker/notifications")}
          className="relative"
          aria-label="Open notifications"
        >
          <Bell size={24} className="text-gray-700" />

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
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

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
