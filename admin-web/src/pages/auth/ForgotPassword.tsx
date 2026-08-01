import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import AuthSplitLayout from "../../components/auth/AuthSplitLayout";
import { supabase } from "../../lib/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldown]);

  async function sendResetLink(
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

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) throw error;

      setEmail(normalizedEmail);
      setEmailSent(true);
      setCooldown(RESEND_SECONDS);
      toast.success("Password reset link sent.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send the reset link.",
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
      heroDescription="Enter the email connected to your account and we will send a secure link to create a new password."
      features={[
        {
          icon: Mail,
          text: "Reset instructions are sent to your registered email.",
        },
        {
          icon: ShieldCheck,
          text: "Your password remains private and protected.",
        },
      ]}
      desktopBackgroundImage="/auth/workshop-login-background.png"
      floatingCard
    >
      <div className="w-full">
        {emailSent ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              Email sent
            </p>

            <h1
              className="mt-3 text-3xl font-black text-slate-900 dark:text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Check your inbox
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              We sent a password reset link to:
            </p>

            <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <p className="break-all text-sm font-bold text-slate-800 dark:text-slate-100">
                {email}
              </p>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Check your spam or junk folder if the email does not arrive.
            </p>

            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={loading || cooldown > 0}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}

              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend reset link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEmailSent(false);
                setCooldown(0);
              }}
              className="mt-3 text-sm font-bold text-indigo-600 transition hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Use another email
            </button>
          </div>
        ) : (
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
                Enter the email connected to your account and we will send you
                a secure reset link.
              </p>
            </div>

            <form onSubmit={sendResetLink} className="mt-8">
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

                <span>
                  We will send a secure password reset link to your registered
                  email address.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    Send reset link
                  </>
                )}
              </button>
            </form>
          </>
        )}

        <div className="mt-7 border-t border-slate-200 pt-6 text-center dark:border-slate-700">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition-all duration-200 hover:-translate-x-0.5 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  );
}