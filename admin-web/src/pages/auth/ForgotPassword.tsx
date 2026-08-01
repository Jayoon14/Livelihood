import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AuthSplitLayout from "../../components/auth/AuthSplitLayout";
import { supabase } from "../../lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;
const RESEND_SECONDS = 60;

type Stage = "email" | "otp";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendRecoveryOtp(
    event?: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event?.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    if (loading || cooldown > 0) return;

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.resetPasswordForEmail(normalizedEmail);

      if (error) throw error;

      setEmail(normalizedEmail);
      setOtp("");
      setStage("otp");
      setCooldown(RESEND_SECONDS);

      toast.success("Password recovery code sent.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send the recovery code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyRecoveryOtp(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const normalizedOtp = otp.replace(/\D/g, "").slice(0, 6);

    if (!OTP_PATTERN.test(normalizedOtp)) {
      toast.warning("Enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: normalizedOtp,
        type: "recovery",
      });

      if (error) throw error;

      toast.success("Code verified.");

      navigate("/reset-password", {
        replace: true,
        state: { recoveryEmail: email },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The code is invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      heroIcon={LockKeyhole}
      heroTitle={
        <>
          Recover your account
          <br />
          securely.
        </>
      }
      heroDescription="Enter your registered email and verify the one-time code sent to your inbox."
      features={[
        {
          icon: Mail,
          text: "A one-time recovery code is sent to your registered email.",
        },
        {
          icon: ShieldCheck,
          text: "The code can only be used for a limited time.",
        },
      ]}
      desktopBackgroundImage="/auth/workshop-login-background.png"
      floatingCard
    >
      <div className="w-full">
        {stage === "email" ? (
          <>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2937f0] via-[#523cf0] to-[#3784ed] text-white shadow-lg shadow-indigo-500/25">
                <LockKeyhole className="h-8 w-8" />
              </div>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                Account recovery
              </p>

              <h1
                className="mt-3 text-3xl font-black text-slate-900 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Forgot your password?
              </h1>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enter the email connected to your account. We will send a
                6-digit recovery code.
              </p>
            </div>

            <form onSubmit={sendRecoveryOtp} className="mt-8">
              <label
                htmlFor="forgot-email"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Email address
              </label>

              <div className="mt-2 flex h-13 items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800">
                <Mail className="h-5 w-5 shrink-0 text-slate-400" />

                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  disabled={loading}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>

              <div className="mt-4 flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-5 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                The recovery code will be sent only to the registered email.
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}
                {loading ? "Sending code..." : "Send recovery code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
                <KeyRound className="h-8 w-8" />
              </div>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                Verification code sent
              </p>

              <h1
                className="mt-3 text-3xl font-black text-slate-900 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Enter your code
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Enter the 6-digit code sent to:
              </p>

              <p className="mt-2 break-all text-sm font-black text-slate-800 dark:text-slate-100">
                {email}
              </p>
            </div>

            <form onSubmit={verifyRecoveryOtp} className="mt-8">
              <label
                htmlFor="recovery-otp"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Verification code
              </label>

              <input
                id="recovery-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                disabled={loading}
                maxLength={6}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="mt-2 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl font-black tracking-[0.5em] text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {loading ? "Verifying code..." : "Verify code"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => void sendRecoveryOtp()}
              disabled={loading || cooldown > 0}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <RotateCcw className="h-4 w-4" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStage("email");
                setOtp("");
                setCooldown(0);
              }}
              className="mt-3 w-full text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Use another email
            </button>
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
      </div>
    </AuthSplitLayout>
  );
}
