import { runAuditedProcess } from "../../lib/processAudit";
import { useEffect, useRef, useState } from "react";
import { UserCircle, ChevronDown, User, Pencil, LogOut, Menu, Flag, Gavel, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationDropdown from "../notifications/NotificationDropdown";
import ThemeDropdown from "../common/ThemeDropdown";
import AccountActivityModal from "../account/AccountActivityModal";
import { logout } from "../../services/authService";
import { useProfile } from "../../context/ProfileContextValue";
import { useWorkerLocation } from "../../context/WorkerLocationContext";
interface WorkerNavbarProps {
    onMenuClick: () => void;
}
export default function WorkerNavbar({ onMenuClick }: WorkerNavbarProps) {
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [activityModalOpen, setActivityModalOpen] = useState(false);
    const [activityView, setActivityView] = useState<"reports" | "appeals">("reports");
    const { profile } = useProfile();
    const { goOffline } = useWorkerLocation();
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    async function handleLogout() {
        return await runAuditedProcess({ module: "Workers", process: "handleLogout", action: "LOGOUT", parameters: {} }, async (__activityProcessScope) => {
            setOpen(false);
            try {
                await goOffline();
            }
            catch (error) {
                __activityProcessScope.caught(error);
                console.error("Unable to set worker offline before logout:", error);
            }
            try {
                await logout();
                navigate("/", { replace: true });
            }
            catch (error) {
                __activityProcessScope.caught(error);
                console.error("Unable to log out:", error);
            }
        });
    }
    const fullName = profile
        ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
        : "Worker";
    const email = profile?.email ?? "";
    const avatar = profile?.profile_picture || "";
    return (<header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-slate-100 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-xl transition-colors dark:border-slate-800 dark:bg-slate-950/95 sm:min-h-20 sm:px-5 sm:py-0 lg:px-7 xl:px-8" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* LEFT */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger */}
        <button type="button" onClick={onMenuClick} aria-label="Open sidebar" className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#0A1930] transition-colors hover:bg-slate-100 lg:hidden">
          <Menu size={22}/>
        </button>

        <div>
          <h1 className="truncate text-base font-bold text-slate-900 dark:text-white sm:text-2xl" style={{ fontFamily: "'Sora', sans-serif" }}>
            Worker Dashboard
          </h1>

          <p className="hidden text-slate-500 sm:block">
            Welcome back, {fullName}
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-4">
        {/* Theme */}
        <ThemeDropdown />

        {/* Notifications */}
        <NotificationDropdown role="worker"/>

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
          <button type="button" onClick={() => setOpen((current) => !current)} className="flex items-center gap-1.5 rounded-xl px-1 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 sm:gap-3 sm:px-2 sm:py-2">
            {avatar ? (<img src={avatar} alt={`${fullName} profile`} className="h-9 w-9 shrink-0 rounded-full border-2 border-amber-500 object-cover sm:h-11 sm:w-11"/>) : (<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-amber-50 sm:h-11 sm:w-11">
                <UserCircle size={26} className="text-amber-600"/>
              </div>)}

            <div className="hidden text-left md:block">
              <p className="font-semibold text-slate-900">{fullName}</p>

              <p className="text-sm text-slate-500">{email}</p>
            </div>

            <ChevronDown size={18} className={`hidden text-slate-400 transition-transform sm:block ${open ? "rotate-180" : ""}`}/>
          </button>

          {open && (<div className="absolute right-0 z-50 mt-3 w-[min(16rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_50px_rgba(15,23,42,.12)] dark:border-slate-700 dark:bg-slate-900">
              <button type="button" onClick={() => {
                setOpen(false);
                navigate("/worker/profile");
            }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                  <User size={16} className="text-blue-600"/>
                </div>
                <span>My Profile</span>
              </button>

              <button type="button" onClick={() => {
                setOpen(false);
                navigate("/worker/profile/edit");
            }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                  <Pencil size={16} className="text-amber-600"/>
                </div>
                <span>Edit Profile</span>
              </button>

              <hr className="border-slate-100 dark:border-slate-700"/>

              <button type="button" onClick={() => {
                setOpen(false);
                setActivityView("reports");
                setActivityModalOpen(true);
            }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10">
                  <Flag size={16} className="text-rose-600 dark:text-rose-400"/>
                </div>
                <span>My Reports</span>
              </button>

              <button type="button" onClick={() => {
                setOpen(false);
                setActivityView("appeals");
                setActivityModalOpen(true);
            }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-500/10">
                  <Gavel size={16} className="text-violet-600 dark:text-violet-400"/>
                </div>
                <span>My Appeals</span>
              </button>

              <hr className="border-slate-100 dark:border-slate-700"/>

              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                  <LogOut size={16} className="text-rose-600"/>
                </div>
                <span>Logout</span>
              </button>
            </div>)}
        </div>
      </div>

      <AccountActivityModal open={activityModalOpen} role="worker" activeView={activityView} onActiveViewChange={setActivityView} onClose={() => setActivityModalOpen(false)}/>
    </header>);
}
