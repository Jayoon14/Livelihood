import {
  BellRing,
  ChevronRight,
  Languages,
  LogOut,
  Palette,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { logout } from "../../../services/authService";

import ChangePassword from "./ChangePassword";
import LanguageSettings from "./LanguageSettings";
import NotificationPreferences from "./NotificationPreferences";
import ThemeSettings from "./ThemeSettings";

interface SettingsSectionProps {
  icon: typeof Settings2;
  title: string;
  description: string;
  children: React.ReactNode;
  accentClassName?: string;
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  accentClassName = "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
}: SettingsSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-800">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accentClassName}`}
        >
          <Icon size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold text-slate-900 sm:text-lg dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function Settings() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Unable to log out. Please try again.");
    }
  }

  return (
    <CustomerLayout>
      <main className="min-h-full bg-slate-50 px-3 py-5 sm:px-6 sm:py-7 lg:px-8 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-5xl">
          <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                    <Settings2 size={27} />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
                      Account control
                    </p>
                    <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
                      Settings
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Manage your account security, notification preferences,
                      language, and appearance.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <ShieldCheck size={18} />
                  Account protected
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
            <div className="space-y-6">
              <SettingsSection
                icon={UserRoundCog}
                title="Account security"
                description="Update your password and keep your account protected."
                accentClassName="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <ChangePassword />
              </SettingsSection>

              <SettingsSection
                icon={BellRing}
                title="Notification preferences"
                description="Choose which alerts and updates you want to receive."
                accentClassName="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <NotificationPreferences />
              </SettingsSection>
            </div>

            <aside className="space-y-6">
              <SettingsSection
                icon={Languages}
                title="Language"
                description="Select your preferred display language."
                accentClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <LanguageSettings />
              </SettingsSection>

              <SettingsSection
                icon={Palette}
                title="Appearance"
                description="Customize the visual theme of your account."
                accentClassName="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
              >
                <ThemeSettings />
              </SettingsSection>

              <section className="rounded-3xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6 dark:border-rose-500/30 dark:bg-slate-900">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                    <Trash2 size={21} />
                  </div>

                  <div>
                    <h2 className="text-base font-extrabold text-rose-700 sm:text-lg dark:text-rose-300">
                      Danger zone
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Permanently remove your account and associated data.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 flex w-full items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-left text-sm font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-500/10 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15"
                >
                  <span className="flex items-center gap-3">
                    <Trash2 size={18} />
                    Delete account
                  </span>
                  <ChevronRight size={18} />
                </button>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center justify-between rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-500/20 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <LogOut size={18} />
                    Log out
                  </span>
                  <ChevronRight size={18} />
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  You will need to sign in again to access your account.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </CustomerLayout>
  );
}