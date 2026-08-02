import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "../../../lib/supabase";

const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

type Step = "request" | "verify";

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

export default function ChangePassword() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      length: password.length >= MIN_PASSWORD_LENGTH,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    }),
    [password],
  );

  const passwordIsStrong = Object.values(passwordChecks).every(Boolean);

  async function loadCurrentEmail(): Promise<string> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    const currentEmail = user?.email?.trim();

    if (!currentEmail) {
      throw new Error(
        "No verified email address is connected to this account.",
      );
    }

    setEmail(currentEmail);
    return currentEmail;
  }

  async function handleSendOtp() {
    if (sendingOtp) {
      return;
    }

    try {
      setSendingOtp(true);

      const currentEmail = await loadCurrentEmail();

      const { error } = await supabase.auth.reauthenticate();

      if (error) {
        throw error;
      }

      setStep("verify");
      setOtp("");

      toast.success(
        `A verification code was sent to ${currentEmail}.`,
        {
          duration: 6000,
        },
      );
    } catch (error) {
      console.error("Send password OTP error:", error);

      toast.error(
        getErrorMessage(
          error,
          "Unable to send the verification code.",
        ),
      );
    } finally {
      setSendingOtp(false);
    }
  }

  function validatePasswordForm(): boolean {
    if (otp.trim().length !== OTP_LENGTH) {
      toast.warning("Enter the 6-digit verification code.");
      return false;
    }

    if (!passwordIsStrong) {
      toast.warning(
        "Use at least 8 characters with uppercase, lowercase, and a number.",
      );
      return false;
    }

    if (password !== confirm) {
      toast.warning("Passwords do not match.");
      return false;
    }

    return true;
  }

  async function handleUpdatePassword() {
    if (updatingPassword || !validatePasswordForm()) {
      return;
    }

    try {
      setUpdatingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password,
        nonce: otp.trim(),
      });

      if (error) {
        throw error;
      }

      setOtp("");
      setPassword("");
      setConfirm("");
      setStep("request");

      toast.success("Password updated successfully.", {
        duration: 6000,
      });
    } catch (error) {
      console.error("Update password error:", error);

      const message = getErrorMessage(
        error,
        "Unable to update your password.",
      );

      toast.error(
        message.toLowerCase().includes("nonce") ||
          message.toLowerCase().includes("otp")
          ? "The verification code is invalid or has expired."
          : message,
        {
          duration: 6000,
        },
      );
    } finally {
      setUpdatingPassword(false);
    }
  }

  function handleResetVerification() {
    setStep("request");
    setOtp("");
    setPassword("");
    setConfirm("");
  }

  return (
    <div className="space-y-5">
      {step === "request" ? (
        <>
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Email verification required
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  A one-time verification code will be sent to your
                  verified email before you can create a new password.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={sendingOtp}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {sendingOtp ? (
              <>
                <LoaderCircle className="animate-spin" size={18} />
                Sending code...
              </>
            ) : (
              <>
                <Mail size={18} />
                Send verification code
              </>
            )}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Verification code sent
              </p>
              <p className="mt-1 break-all text-sm text-emerald-700 dark:text-emerald-400">
                Check {email || "your verified email address"}.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="password-otp"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Email verification code
            </label>

            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
              <KeyRound
                size={18}
                className="shrink-0 text-slate-400"
              />

              <input
                id="password-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                value={otp}
                disabled={updatingPassword}
                placeholder="Enter 6-digit code"
                onChange={(event) =>
                  setOtp(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, OTP_LENGTH),
                  )
                }
                className="w-full bg-transparent p-3.5 text-sm tracking-[0.35em] text-slate-900 outline-none placeholder:tracking-normal placeholder:text-slate-400 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              New password
            </label>

            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
              <KeyRound
                size={18}
                className="shrink-0 text-slate-400"
              />

              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                disabled={updatingPassword}
                placeholder="Create a strong password"
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Confirm new password
            </label>

            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950">
              <KeyRound
                size={18}
                className="shrink-0 text-slate-400"
              />

              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                disabled={updatingPassword}
                placeholder="Repeat your new password"
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full bg-transparent p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirm((current) => !current)
                }
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={
                  showConfirm
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
              >
                {showConfirm ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["8+ characters", passwordChecks.length],
              ["Uppercase letter", passwordChecks.uppercase],
              ["Lowercase letter", passwordChecks.lowercase],
              ["Number", passwordChecks.number],
            ].map(([label, passed]) => (
              <div
                key={String(label)}
                className={`rounded-xl border px-3 py-2 font-semibold ${
                  passed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {passed ? "✓" : "•"} {String(label)}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleUpdatePassword()}
              disabled={updatingPassword}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingPassword ? (
                <>
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                  Updating password...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Verify and update password
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetVerification}
              disabled={updatingPassword}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={18} />
              Start over
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={sendingOtp || updatingPassword}
            className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-blue-400"
          >
            {sendingOtp
              ? "Sending another code..."
              : "Resend verification code"}
          </button>
        </>
      )}
    </div>
  );
}