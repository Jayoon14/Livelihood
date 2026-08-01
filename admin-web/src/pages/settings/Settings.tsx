import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Code2,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ServerCog,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import AdminLayout from "../../layouts/AdminLayout";

type SettingsForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Settings() {
  const [form, setForm] = useState<SettingsForm>({
    name: "Administrator",
    email: "admin@livelihoodgo.com",
    password: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch = useMemo(
    () =>
      form.confirmPassword.length > 0 &&
      form.password === form.confirmPassword,
    [form.confirmPassword, form.password],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSave(): Promise<void> {
    if (savingProfile) return;

    const normalizedName = form.name.trim();
    const normalizedEmail = form.email.trim().toLowerCase();

    if (!normalizedName) {
      toast.warning("Please enter the administrator name.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    try {
      setSavingProfile(true);

      setForm((current) => ({
        ...current,
        name: normalizedName,
        email: normalizedEmail,
      }));

      toast.success("Settings saved successfully.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(): Promise<void> {
    if (updatingPassword) return;

    if (!form.password.trim()) {
      toast.warning("Please enter a new password.");
      return;
    }

    if (form.password.length < 8) {
      toast.warning("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.warning("Passwords do not match.");
      return;
    }

    try {
      setUpdatingPassword(true);

      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));

      toast.success("Password updated.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  return (
    <AdminLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-blue-700 to-indigo-600 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-7 lg:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />

            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl">
                  <ServerCog className="h-7 w-7" />
                </div>

                <div className="min-w-0">
                  <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                    Administration
                  </p>

                  <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    Settings
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                    Manage administrator profile details, account security, and
                    system information.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
                  Account Status
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <span className="font-black">Active Administrator</span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
            <div className="space-y-5">
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:p-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    <UserRound className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      Admin Profile
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Update the administrator name and email shown in the
                      system.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="admin-name"
                      className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      Name
                    </label>

                    <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:bg-slate-900">
                      <UserRound className="h-5 w-5 shrink-0 text-slate-400" />

                      <input
                        id="admin-name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        autoComplete="name"
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-email"
                      className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      Email
                    </label>

                    <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:bg-slate-900">
                      <Mail className="h-5 w-5 shrink-0 text-slate-400" />

                      <input
                        id="admin-email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                        inputMode="email"
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={savingProfile}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
                >
                  {savingProfile ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}

                  {savingProfile ? "Saving Profile..." : "Save Profile"}
                </button>
              </section>

              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:p-7">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <KeyRound className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      Change Password
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Use a strong password with at least eight characters.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      New Password
                    </label>

                    <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:bg-slate-900">
                      <KeyRound className="h-5 w-5 shrink-0 text-slate-400" />

                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter new password"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      Confirm Password
                    </label>

                    <div
                      className={`flex h-12 items-center rounded-2xl border bg-slate-50 px-4 transition focus-within:bg-white focus-within:ring-4 dark:bg-slate-800 dark:focus-within:bg-slate-900 ${
                        form.confirmPassword.length > 0
                          ? passwordsMatch
                            ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-500/10"
                            : "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/10"
                          : "border-slate-200 focus-within:border-emerald-500 focus-within:ring-emerald-500/10 dark:border-slate-700"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5 shrink-0 text-slate-400" />

                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm new password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {form.confirmPassword.length > 0 && (
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          passwordsMatch
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-red-600 dark:text-red-300"
                        }`}
                      >
                        {passwordsMatch
                          ? "Passwords match."
                          : "Passwords do not match."}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handlePassword()}
                  disabled={updatingPassword}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
                >
                  {updatingPassword ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}

                  {updatingPassword
                    ? "Updating Password..."
                    : "Update Password"}
                </button>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <Database className="h-6 w-6" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      System Information
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Current platform and technology details.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <SystemInfoItem
                    icon={ServerCog}
                    label="System"
                    value="LivelihoodGo"
                  />

                  <SystemInfoItem
                    icon={ShieldCheck}
                    label="Version"
                    value="1.0"
                  />

                  <SystemInfoItem
                    icon={Database}
                    label="Database"
                    value="Supabase"
                  />

                  <SystemInfoItem
                    icon={Code2}
                    label="Framework"
                    value="React + TypeScript"
                  />

                  <SystemInfoItem
                    icon={Code2}
                    label="CSS"
                    value="Tailwind CSS"
                  />
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50/95 p-5 dark:border-blue-900/40 dark:bg-blue-950/30">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />

                  <div>
                    <h2 className="font-black text-blue-900 dark:text-blue-100">
                      Security reminder
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-300">
                      Keep administrator credentials private and use a unique
                      password for this account.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}

function SystemInfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ServerCog;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate font-black text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}