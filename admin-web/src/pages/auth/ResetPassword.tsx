import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AuthSplitLayout from "../../components/auth/AuthSplitLayout";
import { supabase } from "../../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [validRecoverySession, setValidRecoverySession] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      setValidRecoverySession(Boolean(session));
      setCheckingSession(false);
    }

    void checkRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  const checks = useMemo(
    () => ({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password.length > 0 && password === confirmPassword,
    }),
    [password, confirmPassword],
  );

  const score = Object.values(checks).filter(Boolean).length;
  const strength = score <= 2 ? "Weak" : score <= 4 ? "Medium" : "Strong";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!Object.values(checks).every(Boolean)) {
      toast.warning("Complete all password requirements.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccess(true);
      toast.success("Password updated successfully.");

      await supabase.auth.signOut();

      window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 1800);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update your password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      heroIcon={KeyRound}
      heroTitle={
        <>
          Create a strong,
          <br />
          secure password.
        </>
      }
      heroDescription="Your recovery code was verified. Create a new password for your LivelihoodGo account."
      features={[
        {
          icon: ShieldCheck,
          text: "Your new password is encrypted and protected.",
        },
        {
          icon: LockKeyhole,
          text: "Use a password you do not use on another account.",
        },
      ]}
      desktopBackgroundImage="/auth/workshop-login-background.png"
      floatingCard
    >
      {checkingSession ? (
        <div className="py-14 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Verifying your recovery session...
          </p>
        </div>
      ) : !validRecoverySession ? (
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500 text-white">
            <X className="h-8 w-8" />
          </div>

          <h1
            className="mt-5 text-3xl font-black text-slate-900 dark:text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Verification required
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Verify the recovery code first before creating a new password.
          </p>

          <Link
            to="/forgot-password"
            className="mt-7 flex h-12 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Request recovery code
          </Link>
        </div>
      ) : success ? (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />

          <h1
            className="mt-5 text-3xl font-black text-slate-900 dark:text-white"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Password updated
          </h1>

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Redirecting you to the login page...
          </p>
        </div>
      ) : (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2937f0] via-[#523cf0] to-[#3784ed] text-white shadow-lg shadow-indigo-500/25">
              <LockKeyhole className="h-8 w-8" />
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
              Recovery verified
            </p>

            <h1
              className="mt-3 text-3xl font-black text-slate-900 dark:text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Reset your password
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Create a new secure password for your account.
            </p>
          </div>

          <form onSubmit={handleSave} className="mt-8 space-y-5">
            <PasswordInput
              id="new-password"
              label="New password"
              value={password}
              show={showPassword}
              loading={loading}
              onChange={setPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />

            <PasswordInput
              id="confirm-password"
              label="Confirm password"
              value={confirmPassword}
              show={showConfirmPassword}
              loading={loading}
              onChange={setConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
            />

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Password strength
                </span>

                <span
                  className={`font-bold ${
                    strength === "Strong"
                      ? "text-emerald-500"
                      : strength === "Medium"
                        ? "text-amber-500"
                        : "text-rose-500"
                  }`}
                >
                  {strength}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    strength === "Strong"
                      ? "bg-emerald-500"
                      : strength === "Medium"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.max(12, (score / 6) * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-2">
              <Requirement ok={checks.length} text="At least 8 characters" />
              <Requirement ok={checks.upper} text="Uppercase letter" />
              <Requirement ok={checks.lower} text="Lowercase letter" />
              <Requirement ok={checks.number} text="Number" />
              <Requirement ok={checks.special} text="Special character" />
              <Requirement ok={checks.match} text="Passwords match" />
            </div>

            <button
              type="submit"
              disabled={loading || !Object.values(checks).every(Boolean)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  <LockKeyhole className="h-5 w-5" />
                  Save password
                </>
              )}
            </button>
          </form>
        </>
      )}

      <div className="mt-7 border-t border-slate-200 pt-6 text-center dark:border-slate-700">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </AuthSplitLayout>
  );
}

function PasswordInput({
  id,
  label,
  value,
  show,
  loading,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  loading: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div className="mt-2 flex h-13 items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800">
        <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400" />

        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          disabled={loading}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none dark:text-white"
        />

        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );
}

function Requirement({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs font-semibold ${
        ok ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          ok ? "bg-emerald-500/15" : "bg-slate-500/10"
        }`}
      >
        {ok ? (
          <Check size={13} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      {text}
    </div>
  );
}
