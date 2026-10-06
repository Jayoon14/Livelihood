import { runAuditedProcess } from "../../lib/processAudit";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Pencil, Settings, User, UserCircle, Menu, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../../context/ProfileContextValue";
import { logout } from "../../services/authService";
import ThemeDropdown from "../common/ThemeDropdown";
import NotificationDropdown from "../notifications/NotificationDropdown";
interface AdminNavbarProps {
    onMenuClick: () => void;
}
export default function AdminNavbar({ onMenuClick, }: AdminNavbarProps) {
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const { profile } = useProfile();
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)) {
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
        return await runAuditedProcess({ module: "System", process: "handleLogout", action: "LOGOUT", parameters: {} }, async (__activityProcessScope) => {
            if (loggingOut) {
                {
                    __activityProcessScope.skipped();
                    return;
                }
            }
            setLoggingOut(true);
            try {
                await logout();
                navigate("/", { replace: true });
            }
            catch (error) {
                __activityProcessScope.caught(error);
                console.error("Admin logout failed:", error);
                setLoggingOut(false);
            }
        });
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
    return (<header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/95 sm:min-h-20 sm:px-5 sm:py-0 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open admin sidebar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden">
          <Menu size={21}/>
        </button>
        <div className="min-w-0">
        <h1 className="truncate text-base font-bold text-gray-800 dark:text-white sm:text-2xl">
          Administrator Dashboard
        </h1>

        <p className="hidden text-gray-500 dark:text-slate-400 sm:block">
          Welcome back, {fullName}
        </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
        <ThemeDropdown />

        <NotificationDropdown role="admin"/>

        <div className="relative" ref={dropdownRef}>
          <button type="button" onClick={() => {
            setOpen((currentOpen) => !currentOpen);
        }} className="flex items-center gap-1.5 rounded-xl px-1 py-1.5 transition hover:bg-gray-100 dark:hover:bg-slate-800 sm:gap-3 sm:px-2 sm:py-2" aria-expanded={open} aria-haspopup="menu">
            {avatar ? (<img src={avatar} alt={`${fullName} profile`} className="h-9 w-9 shrink-0 rounded-full border-2 border-red-600 object-cover sm:h-11 sm:w-11"/>) : (<UserCircle size={36} className="shrink-0 text-red-600 sm:h-[42px] sm:w-[42px]"/>)}

            <div className="hidden text-left sm:block">
              <p className="max-w-48 truncate font-semibold text-slate-900 dark:text-white">
                {fullName}
              </p>

              {email && (<p className="max-w-48 truncate text-sm text-gray-500 dark:text-slate-400">
                  {email}
                </p>)}
            </div>

            <ChevronDown size={18} className={`hidden transition-transform sm:block ${open ? "rotate-180" : ""}`}/>
          </button>

          {open && (<div role="menu" className="absolute right-0 z-50 mt-3 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {fullName}
                </p>

                {email && (<p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                    {email}
                  </p>)}
              </div>

              <div className="py-2">
                <button type="button" role="menuitem" onClick={() => goTo("/admin/profile")} className="flex w-full items-center gap-3 px-5 py-3 text-left text-slate-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <User size={20}/>
                  My Profile
                </button>

                <button type="button" role="menuitem" onClick={() => goTo("/admin/profile/edit")} className="flex w-full items-center gap-3 px-5 py-3 text-left text-slate-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Pencil size={20}/>
                  Edit Profile
                </button>

                <button type="button" role="menuitem" onClick={() => goTo("/settings")} className="flex w-full items-center gap-3 px-5 py-3 text-left text-slate-700 transition hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Settings size={20}/>
                  Settings
                </button>
              </div>

              <div className="border-t border-slate-100 py-2 dark:border-slate-800">
                <button type="button" role="menuitem" onClick={() => void handleLogout()} disabled={loggingOut} className="flex w-full items-center gap-3 px-5 py-3 text-left text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/30">
                  <LogOut size={20}/>
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>)}
        </div>
      </div>
    </header>);
}
