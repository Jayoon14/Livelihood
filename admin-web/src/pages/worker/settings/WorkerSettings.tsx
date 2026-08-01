import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
  Settings2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "../../../lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6,8}$/;
const RESEND_SECONDS = 60;

const SETTINGS_EMAIL_STAGE_KEY = "livelihoodgo.settings.emailStage";
const SETTINGS_PENDING_EMAIL_KEY = "livelihoodgo.settings.pendingEmail";
const SETTINGS_EMAIL_COOLDOWN_KEY = "livelihoodgo.settings.emailCooldownUntil";
const SETTINGS_PASSWORD_STAGE_KEY = "livelihoodgo.settings.passwordStage";
const SETTINGS_PASSWORD_COOLDOWN_KEY =
  "livelihoodgo.settings.passwordCooldownUntil";

function readStoredStage<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = sessionStorage.getItem(key) as T | null;
  return value && allowed.includes(value) ? value : fallback;
}

function readRemainingSeconds(key: string): number {
  const value = Number(sessionStorage.getItem(key) ?? 0);

  if (!Number.isFinite(value) || value <= Date.now()) {
    sessionStorage.removeItem(key);
    return 0;
  }

  return Math.max(0, Math.ceil((value - Date.now()) / 1000));
}

function saveCooldown(key: string, seconds: number): void {
  sessionStorage.setItem(key, String(Date.now() + seconds * 1000));
}

const passwordRules = [
  {
    label: "At least 8 characters",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "One uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "One number",
    test: (value: string) => /\d/.test(value),
  },
  {
    label: "One special character",
    test: (value: string) => /[@$!%*?&#^()_\-+=]/.test(value),
  },
];

type EmailStage = "form" | "otp";
type PasswordStage = "form" | "otp";

/**
 * Keeps sensitive form values only in JavaScript memory.
 * This survives a React component remount caused by auth re-checking,
 * but it is cleared by a real browser refresh or tab close.
 */
const workerSettingsMemory = {
  newEmail: "",
  emailOtp: "",
  emailStage: "form" as EmailStage,
  newPassword: "",
  confirmPassword: "",
  passwordOtp: "",
  passwordStage: "form" as PasswordStage,
};

export default function WorkerSettings() {
  const navigate = useNavigate();

  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState(
    () =>
      workerSettingsMemory.newEmail ||
      sessionStorage.getItem(SETTINGS_PENDING_EMAIL_KEY) ||
      "",
  );
  const [emailOtp, setEmailOtp] = useState(
    () => workerSettingsMemory.emailOtp,
  );
  const [emailStage, setEmailStage] = useState<EmailStage>(() =>
    workerSettingsMemory.emailStage !== "form"
      ? workerSettingsMemory.emailStage
      : readStoredStage(
          SETTINGS_EMAIL_STAGE_KEY,
          ["form", "otp"] as const,
          "form",
        ),
  );
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(() =>
    readRemainingSeconds(SETTINGS_EMAIL_COOLDOWN_KEY),
  );

  // Passwords and OTP codes are intentionally never stored.
  const [newPassword, setNewPassword] = useState(
    () => workerSettingsMemory.newPassword,
  );
  const [confirmPassword, setConfirmPassword] = useState(
    () => workerSettingsMemory.confirmPassword,
  );
  const [passwordOtp, setPasswordOtp] = useState(
    () => workerSettingsMemory.passwordOtp,
  );
  const [passwordStage, setPasswordStage] =
    useState<PasswordStage>(() =>
      workerSettingsMemory.passwordStage !== "form"
        ? workerSettingsMemory.passwordStage
        : readStoredStage(
            SETTINGS_PASSWORD_STAGE_KEY,
            ["form", "otp"] as const,
            "form",
          ),
    );
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(() =>
    readRemainingSeconds(SETTINGS_PASSWORD_COOLDOWN_KEY),
  );

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error) {
        toast.error("Unable to load your account.");
        return;
      }

      const email = data.user?.email ?? "";
      setCurrentEmail(email);

      setNewEmail((currentValue) => {
        if (emailStage === "otp" && currentValue) {
          return currentValue;
        }

        return email;
      });
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [emailStage]);

  useEffect(() => {
    const updateCooldown = () => {
      setEmailCooldown(
        readRemainingSeconds(SETTINGS_EMAIL_COOLDOWN_KEY),
      );
    };

    updateCooldown();

    const timer = window.setInterval(updateCooldown, 1000);
    document.addEventListener("visibilitychange", updateCooldown);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateCooldown);
    };
  }, []);

  useEffect(() => {
    const updateCooldown = () => {
      setPasswordCooldown(
        readRemainingSeconds(SETTINGS_PASSWORD_COOLDOWN_KEY),
      );
    };

    updateCooldown();

    const timer = window.setInterval(updateCooldown, 1000);
    document.addEventListener("visibilitychange", updateCooldown);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", updateCooldown);
    };
  }, []);

  useEffect(() => {
    workerSettingsMemory.newEmail = newEmail;
    workerSettingsMemory.emailOtp = emailOtp;
    workerSettingsMemory.emailStage = emailStage;
  }, [newEmail, emailOtp, emailStage]);

  useEffect(() => {
    workerSettingsMemory.newPassword = newPassword;
    workerSettingsMemory.confirmPassword = confirmPassword;
    workerSettingsMemory.passwordOtp = passwordOtp;
    workerSettingsMemory.passwordStage = passwordStage;
  }, [
    newPassword,
    confirmPassword,
    passwordOtp,
    passwordStage,
  ]);

  useEffect(() => {
    sessionStorage.setItem(SETTINGS_EMAIL_STAGE_KEY, emailStage);
  }, [emailStage]);

  useEffect(() => {
    sessionStorage.setItem(
      SETTINGS_PASSWORD_STAGE_KEY,
      passwordStage,
    );
  }, [passwordStage]);

  useEffect(() => {
    if (emailStage === "otp" && newEmail) {
      sessionStorage.setItem(
        SETTINGS_PENDING_EMAIL_KEY,
        newEmail,
      );
    } else {
      sessionStorage.removeItem(SETTINGS_PENDING_EMAIL_KEY);
    }
  }, [emailStage, newEmail]);

  const passwordChecks = useMemo(
    () =>
      passwordRules.map((rule) => ({
        label: rule.label,
        valid: rule.test(newPassword),
      })),
    [newPassword],
  );

  const validPassword =
    passwordChecks.length > 0 &&
    passwordChecks.every((rule) => rule.valid);

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  async function requestEmailChangeOtp(
    event?: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event?.preventDefault();

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.warning("Enter a valid email address.");
      return;
    }

    if (normalizedEmail === currentEmail.toLowerCase()) {
      toast.info("This is already your current email.");
      return;
    }

    if (emailLoading || emailCooldown > 0) return;

    try {
      setEmailLoading(true);

      const { error } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (error) throw error;

      setNewEmail(normalizedEmail);
      setEmailOtp("");
      setEmailStage("otp");
      setEmailCooldown(RESEND_SECONDS);

      sessionStorage.setItem(
        SETTINGS_PENDING_EMAIL_KEY,
        normalizedEmail,
      );
      sessionStorage.setItem(SETTINGS_EMAIL_STAGE_KEY, "otp");
      saveCooldown(
        SETTINGS_EMAIL_COOLDOWN_KEY,
        RESEND_SECONDS,
      );

      toast.success("Email-change verification code sent.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send the email verification code.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function verifyEmailChangeOtp(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const token = emailOtp.replace(/\D/g, "");

    if (!OTP_PATTERN.test(token)) {
      toast.warning("Enter the verification code from your email.");
      return;
    }

    try {
      setEmailLoading(true);

      const { data, error } = await supabase.auth.verifyOtp({
        email: newEmail,
        token,
        type: "email_change",
      });

      if (error) throw error;

      const updatedEmail = data.user?.email ?? newEmail;

      if (data.user?.id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ email: updatedEmail })
          .eq("id", data.user.id);

        if (profileError) {
          toast.warning(
            "Login email changed, but the profile email could not be synchronized.",
          );
        }
      }

      setCurrentEmail(updatedEmail);
      setNewEmail(updatedEmail);
      setEmailOtp("");
      setEmailStage("form");

      workerSettingsMemory.newEmail = updatedEmail;
      workerSettingsMemory.emailOtp = "";
      workerSettingsMemory.emailStage = "form";

      sessionStorage.removeItem(SETTINGS_PENDING_EMAIL_KEY);
      sessionStorage.removeItem(SETTINGS_EMAIL_COOLDOWN_KEY);
      sessionStorage.setItem(SETTINGS_EMAIL_STAGE_KEY, "form");

      toast.success("Email address updated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The email verification code is invalid or expired.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function requestPasswordOtp(
    event?: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event?.preventDefault();

    if (!validPassword) {
      toast.warning("Your new password does not meet all requirements.");
      return;
    }

    if (!passwordsMatch) {
      toast.warning("The new passwords do not match.");
      return;
    }

    if (passwordLoading || passwordCooldown > 0) return;

    try {
      setPasswordLoading(true);

      const { error } = await supabase.auth.reauthenticate();

      if (error) throw error;

      setPasswordOtp("");
      setPasswordStage("otp");
      setPasswordCooldown(RESEND_SECONDS);

      sessionStorage.setItem(SETTINGS_PASSWORD_STAGE_KEY, "otp");
      saveCooldown(
        SETTINGS_PASSWORD_COOLDOWN_KEY,
        RESEND_SECONDS,
      );

      toast.success("Password verification code sent.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send the password verification code.",
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  async function verifyPasswordOtpAndUpdate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const nonce = passwordOtp.replace(/\D/g, "");

    if (!validPassword || !passwordsMatch) {
      toast.warning(
        "Re-enter and confirm your new password before verifying the code.",
      );
      return;
    }

    if (!OTP_PATTERN.test(nonce)) {
      toast.warning("Enter the verification code from your email.");
      return;
    }

    try {
      setPasswordLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        nonce,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      setPasswordOtp("");
      setPasswordStage("form");

      workerSettingsMemory.newPassword = "";
      workerSettingsMemory.confirmPassword = "";
      workerSettingsMemory.passwordOtp = "";
      workerSettingsMemory.passwordStage = "form";

      sessionStorage.removeItem(SETTINGS_PASSWORD_COOLDOWN_KEY);
      sessionStorage.setItem(SETTINGS_PASSWORD_STAGE_KEY, "form");

      toast.success("Password updated successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The password verification code is invalid or expired.",
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-[linear-gradient(135deg,#f8faff_0%,#eef3ff_46%,#f8fbff_100%)] text-slate-900 dark:bg-[linear-gradient(135deg,#020617_0%,#07111f_46%,#020617_100%)] dark:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.05] dark:opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="pointer-events-none fixed -left-24 -top-24 h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl dark:bg-indigo-700/10" />
      <div className="pointer-events-none fixed -right-24 top-20 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-700/10" />

      <header className="relative z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/worker/dashboard")}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
              <Wrench className="h-5 w-5 text-slate-950" />
            </span>

            <span>
              <span
                className="block text-base font-black leading-none text-slate-950 dark:text-white sm:text-lg"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                LivelihoodGo
              </span>

              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                Worker account settings
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,#2937F0_0%,#5B3DF1_52%,#3292EC_100%)] px-5 py-7 text-white shadow-[0_24px_70px_rgba(41,55,240,0.24)] sm:px-8 lg:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
              <Settings2 className="h-4 w-4" />
              OTP account security
            </div>

            <h1
              className="mt-4 text-3xl font-black sm:text-4xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Manage your worker account.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Email and password changes require a one-time verification code.
            </p>
          </div>
        </section>

        <div className="relative -mt-4 grid gap-6 rounded-[2rem] border border-white/90 bg-white/95 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 sm:-mt-6 sm:p-6 lg:grid-cols-2 lg:p-8">
          <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <AtSign className="h-5 w-5" />
              </div>

              <div>
                <h2
                  className="text-lg font-black text-slate-950 dark:text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Change email
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Verify the code sent to your new email address.
                </p>
              </div>
            </div>

            {emailStage === "form" ? (
              <form onSubmit={requestEmailChangeOtp}>
                <EmailField
                  id="current-email"
                  label="Current email"
                  value={currentEmail}
                  readOnly
                  className="mt-6"
                />

                <EmailField
                  id="new-email"
                  label="New email"
                  value={newEmail}
                  onChange={setNewEmail}
                  className="mt-5"
                />

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {emailLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5" />
                  )}
                  {emailLoading ? "Sending code..." : "Send email code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyEmailChangeOtp} className="mt-6">
                <OtpField
                  id="email-change-otp"
                  label="Email verification code"
                  value={emailOtp}
                  onChange={setEmailOtp}
                  disabled={emailLoading}
                />

                <button
                  type="submit"
                  disabled={emailLoading || emailOtp.length < 6}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {emailLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {emailLoading ? "Verifying..." : "Verify and change email"}
                </button>

                <button
                  type="button"
                  onClick={() => void requestEmailChangeOtp()}
                  disabled={emailLoading || emailCooldown > 0}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  {emailCooldown > 0
                    ? `Resend in ${emailCooldown}s`
                    : "Resend code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailStage("form");
                    setEmailOtp("");
                    setNewEmail(currentEmail);
                    setEmailCooldown(0);

                    workerSettingsMemory.newEmail = currentEmail;
                    workerSettingsMemory.emailOtp = "";
                    workerSettingsMemory.emailStage = "form";
                    sessionStorage.removeItem(
                      SETTINGS_PENDING_EMAIL_KEY,
                    );
                    sessionStorage.removeItem(
                      SETTINGS_EMAIL_COOLDOWN_KEY,
                    );
                    sessionStorage.setItem(
                      SETTINGS_EMAIL_STAGE_KEY,
                      "form",
                    );
                  }}
                  className="mt-3 w-full text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Start email change again
                </button>
              </form>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.17),rgba(15,23,42,.9))] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <LockKeyhole className="h-5 w-5" />
              </div>

              <div>
                <h2
                  className="text-lg font-black text-slate-950 dark:text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Change password
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  A reauthentication code will be sent to your account email.
                </p>
              </div>
            </div>

            {passwordStage === "form" ? (
              <form onSubmit={requestPasswordOtp}>
                <PasswordField
                  id="new-password"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  className="mt-6"
                />

                <div className="mt-3 grid gap-2 rounded-xl border border-indigo-100 bg-white/70 p-3 text-xs dark:border-indigo-500/15 dark:bg-slate-900/50 sm:grid-cols-2">
                  {passwordChecks.map((rule) => (
                    <p
                      key={rule.label}
                      className={`flex items-center gap-2 ${
                        rule.valid
                          ? "font-semibold text-emerald-600 dark:text-emerald-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {rule.valid ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                      {rule.label}
                    </p>
                  ))}
                </div>

                <PasswordField
                  id="confirm-password"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  className="mt-5"
                  valid={passwordsMatch}
                  invalid={
                    confirmPassword.length > 0 && !passwordsMatch
                  }
                />

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {passwordLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}
                  {passwordLoading
                    ? "Sending code..."
                    : "Send password code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyPasswordOtpAndUpdate} className="mt-6">
                <div className="rounded-2xl border border-indigo-100 bg-white/70 p-4 text-xs leading-5 text-indigo-700 dark:border-indigo-500/15 dark:bg-slate-900/50 dark:text-indigo-300">
                  Your verification step was saved. For security, passwords and
                  OTP codes are never stored, so re-enter the new password if
                  this tab was reloaded.
                </div>

                <PasswordField
                  id="otp-new-password"
                  label="New password"
                  value={newPassword}
                  onChange={setNewPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((value) => !value)}
                  className="mt-5"
                />

                <PasswordField
                  id="otp-confirm-password"
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  visible={showConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  className="mt-5"
                  valid={passwordsMatch}
                  invalid={
                    confirmPassword.length > 0 && !passwordsMatch
                  }
                />

                <div className="mt-5">
                  <OtpField
                    id="password-change-otp"
                    label="Password verification code"
                    value={passwordOtp}
                    onChange={setPasswordOtp}
                    disabled={passwordLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    passwordLoading ||
                    passwordOtp.length < 6 ||
                    !validPassword ||
                    !passwordsMatch
                  }
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937F0] via-[#5B3DF1] to-[#3292EC] px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {passwordLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {passwordLoading
                    ? "Updating password..."
                    : "Verify and update password"}
                </button>

                <button
                  type="button"
                  onClick={() => void requestPasswordOtp()}
                  disabled={passwordLoading || passwordCooldown > 0}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  {passwordCooldown > 0
                    ? `Resend in ${passwordCooldown}s`
                    : "Resend code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordStage("form");
                    setPasswordOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordCooldown(0);

                    workerSettingsMemory.newPassword = "";
                    workerSettingsMemory.confirmPassword = "";
                    workerSettingsMemory.passwordOtp = "";
                    workerSettingsMemory.passwordStage = "form";
                    sessionStorage.removeItem(
                      SETTINGS_PASSWORD_COOLDOWN_KEY,
                    );
                    sessionStorage.setItem(
                      SETTINGS_PASSWORD_STAGE_KEY,
                      "form",
                    );
                  }}
                  className="mt-3 w-full text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Start password change again
                </button>
              </form>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:p-6 lg:col-span-2">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2
                  className="font-black text-emerald-800 dark:text-emerald-200"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Account safety reminder
                </h2>

                <p className="mt-2 text-sm leading-6 text-emerald-700/90 dark:text-emerald-300/90">
                  Never share OTP codes or passwords. LivelihoodGo
                  administrators should never ask for them.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function EmailField({
  id,
  label,
  value,
  onChange,
  readOnly = false,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div
        className={`flex h-12 items-center rounded-xl border px-3 ${
          readOnly
            ? "border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
            : "border-slate-200 bg-white transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900"
        }`}
      >
        <Mail className="h-4.5 w-4.5 shrink-0 text-slate-400" />

        <input
          id={id}
          type="email"
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange?.(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none dark:text-white"
        />
      </div>
    </div>
  );
}

function OtpField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        disabled={disabled}
        maxLength={8}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 8))
        }
        placeholder="000000"
        className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl font-black tracking-[0.45em] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  className = "",
  valid = false,
  invalid = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  className?: string;
  valid?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div
        className={`flex h-12 items-center rounded-xl border bg-white px-3 transition focus-within:ring-4 dark:bg-slate-900 ${
          valid
            ? "border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-500/10"
            : invalid
              ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/10"
              : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-500/10 dark:border-slate-700"
        }`}
      >
        <LockKeyhole
          className={`h-4.5 w-4.5 shrink-0 ${
            valid
              ? "text-emerald-500"
              : invalid
                ? "text-rose-500"
                : "text-slate-400"
          }`}
        />

        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none dark:text-white"
        />

        {valid && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          {visible ? (
            <EyeOff className="h-4.5 w-4.5" />
          ) : (
            <Eye className="h-4.5 w-4.5" />
          )}
        </button>
      </div>

      {invalid && (
        <p className="mt-1.5 text-xs font-semibold text-rose-500">
          Passwords do not match.
        </p>
      )}
    </div>
  );
}