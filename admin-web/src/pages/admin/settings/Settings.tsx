import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import ThemeDropdown from "../../../components/common/ThemeDropdown";
import {
  changePassword,
  validatePassword,
} from "../../../services/profileService";

export default function AdminSettings() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);

  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password],
  );

  const hasChanges = password.length > 0 || confirmPassword.length > 0;

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  useEffect(() => {
    if (!hasChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!passwordValidation.valid) {
      toast.warning(
        passwordValidation.errors[0] ??
          "Password does not meet the requirements.",
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.warning("Password confirmation does not match.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Updating password...");

    try {
      await changePassword(password);

      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmation(false);

      toast.success("Password updated successfully.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update password.",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout>
      <section className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Administrator Settings
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage the administrator account appearance and security.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Appearance
          </h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Choose light, dark, or automatic theme mode.
          </p>
          <ThemeDropdown />
        </section>

        <form
          onSubmit={handlePasswordChange}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Change password
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use a strong password that you do not reuse on other accounts.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              New password
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  maxLength={128}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </label>

            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Password requirements
              </p>

              <div className="grid gap-2 text-sm">
                <Requirement
                  met={password.length >= 8}
                  text="At least 8 characters"
                />
                <Requirement
                  met={/[a-z]/.test(password)}
                  text="One lowercase letter"
                />
                <Requirement
                  met={/[A-Z]/.test(password)}
                  text="One uppercase letter"
                />
                <Requirement met={/\d/.test(password)} text="One number" />
              </div>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm new password
              <div className="relative">
                <input
                  type={showConfirmation ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  maxLength={128}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmation((current) => !current)}
                  aria-label={
                    showConfirmation
                      ? "Hide password confirmation"
                      : "Show password confirmation"
                  }
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {showConfirmation ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p
                  className={`text-xs ${
                    passwordsMatch ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {passwordsMatch
                    ? "Passwords match."
                    : "Passwords do not match."}
                </p>
              )}
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Your password is updated through Supabase Auth.
            </div>

            <button
              type="submit"
              disabled={saving || !passwordValidation.valid || !passwordsMatch}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

function Requirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div
      className={
        met
          ? "flex items-center gap-2 text-emerald-600"
          : "flex items-center gap-2 text-slate-500"
      }
    >
      <CheckCircle2 className="h-4 w-4" />
      <span>{text}</span>
    </div>
  );
}
