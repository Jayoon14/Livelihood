import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Flag,
  Gavel,
  LogOut,
  Menu,
  Settings,
  User,
  UserCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContext";
import NotificationDropdown from "../notifications/NotificationDropdown";
import ThemeDropdown from "../common/ThemeDropdown";
import AccountActivityModal from "../account/AccountActivityModal";

interface CustomerNavbarProps {
  onMenuClick: () => void;
}

export default function CustomerNavbar({
  onMenuClick,
}: CustomerNavbarProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityView, setActivityView] = useState<"reports" | "appeals">("reports");
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

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "Customer";

  const email = profile?.email ?? "";
  const avatar = profile?.profile_picture || "";

  return (
    <header className="sticky top-0 z-30 border-b border-(--app-border) bg-(--app-surface)/95 shadow-sm backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex min-h-16 w-full max-w-[1800px] items-center justify-between gap-3 px-3 sm:min-h-20 sm:px-5 lg:px-7 xl:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open sidebar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--app-border) bg-(--app-surface-soft) text-(--app-text) transition hover:bg-(--app-hover) lg:hidden"
          >
            <Menu size={21} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-(--app-text) sm:text-xl">
              Customer Dashboard
            </h1>
            <p className="hidden truncate text-sm text-(--app-text-muted) sm:block">
              Welcome back, {fullName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeDropdown />
          <NotificationDropdown role="customer" />

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              aria-expanded={open}
              aria-haspopup="menu"
              className="flex max-w-48 items-center gap-2 rounded-2xl border border-transparent px-1.5 py-1.5 transition hover:border-(--app-border) hover:bg-(--app-hover) sm:px-2"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={fullName}
                  className="h-9 w-9 shrink-0 rounded-full border-2 border-blue-500 object-cover sm:h-10 sm:w-10"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--app-border) bg-(--app-surface-soft) sm:h-10 sm:w-10">
                  <UserCircle size={23} className="text-blue-500" />
                </div>
              )}

              <div className="hidden min-w-0 text-left md:block">
                <p className="truncate text-sm font-bold text-(--app-text)">
                  {fullName}
                </p>
                <p className="max-w-40 truncate text-xs text-(--app-text-muted)">
                  {email}
                </p>
              </div>

              <ChevronDown
                size={16}
                className={`hidden shrink-0 text-(--app-text-muted) transition-transform sm:block ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-(--app-border) bg-(--app-surface) p-2 shadow-2xl shadow-slate-950/15"
              >
                <div className="border-b border-(--app-border) px-3 py-3 md:hidden">
                  <p className="truncate text-sm font-bold text-(--app-text)">
                    {fullName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-(--app-text-muted)">
                    {email}
                  </p>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    navigate("/customer/profile");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-(--app-text) transition hover:bg-(--app-hover)"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                    <User size={17} className="text-blue-500" />
                  </span>
                  My Profile
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    navigate("/customer/settings");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-(--app-text) transition hover:bg-(--app-hover)"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                    <Settings size={17} className="text-amber-500" />
                  </span>
                  Settings
                </button>

                <div className="my-1 border-t border-(--app-border)" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setActivityView("reports");
                    setActivityModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-(--app-text) transition hover:bg-(--app-hover)"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                    <Flag size={17} className="text-rose-500" />
                  </span>
                  My Reports
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setActivityView("appeals");
                    setActivityModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-(--app-text) transition hover:bg-(--app-hover)"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                    <Gavel size={17} className="text-violet-500" />
                  </span>
                  My Appeals
                </button>

                <div className="my-1 border-t border-(--app-border)" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-500 transition hover:bg-rose-500/10"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
                    <LogOut size={17} />
                  </span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AccountActivityModal
        open={activityModalOpen}
        role="customer"
        activeView={activityView}
        onActiveViewChange={setActivityView}
        onClose={() => setActivityModalOpen(false)}
      />
    </header>
  );
}