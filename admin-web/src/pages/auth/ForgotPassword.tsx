import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "../../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.warning("Please enter your email address.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (error) {
        throw error;
      }

      setEmail(normalizedEmail);
      setEmailSent(true);
      toast.success("Password reset link sent.");
    } catch (error) {
      console.error("Forgot password error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to send the password reset link.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-slate-100"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">
        {/* LEFT PANEL */}
        <section
          className="relative hidden flex-col justify-between bg-gradient-to-b from-[#2937f0] via-[#5b3df1] to-[#3292ec] px-10 py-10 lg:flex xl:px-14"
          style={{
            clipPath: "polygon(0 0, 100% 0, 88% 100%, 0% 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />

          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-400/30">
                <Wrench
                  className="h-6 w-6 text-slate-900"
                  strokeWidth={2.6}
                />
              </div>

              <div>
                <p className="text-xl font-black tracking-tight text-white">
                  LivelihoodGo
                </p>
                <p className="text-xs text-blue-100">
                  Livelihood Services Platform
                </p>
              </div>
            </Link>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/15 shadow-xl backdrop-blur">
              <LockKeyhole className="h-10 w-10 text-amber-300" />
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white xl:text-5xl">
              Recover your account securely.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-blue-50 xl:text-lg xl:leading-8">
              Enter the email connected to your account and we will send you a
              secure link to create a new password.
            </p>

            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3 text-sm text-white/90">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Mail className="h-5 w-5 text-amber-300" />
                </div>

                Reset instructions are sent to your registered email.
              </div>

              <div className="flex items-center gap-3 text-sm text-white/90">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <ShieldCheck className="h-5 w-5 text-amber-300" />
                </div>

                Your password remains private and protected.
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-blue-100/80">
            © 2026 LivelihoodGo. All rights reserved.
          </p>
        </section>

        {/* RIGHT PANEL */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9fc] px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative z-10 w-full max-w-md">
            {/* MOBILE LOGO */}
            <Link
              to="/"
              className="mb-6 flex items-center justify-center gap-3 sm:mb-8 lg:hidden"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 shadow-lg sm:h-12 sm:w-12">
                <Wrench
                  className="h-5 w-5 text-slate-900 sm:h-6 sm:w-6"
                  strokeWidth={2.6}
                />
              </div>

              <div>
                <p className="text-lg font-black text-slate-900 sm:text-xl">
                  LivelihoodGo
                </p>
                <p className="text-xs text-slate-500">
                  Livelihood Services Platform
                </p>
              </div>
            </Link>

            <section className="rounded-[24px] border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_rgba(59,63,246,0.15)] backdrop-blur-xl sm:rounded-[32px] sm:p-8">
              {emailSent ? (
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-400/30 sm:h-20 sm:w-20">
                    <CheckCircle2 className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                  </div>

                  <span className="mt-5 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 sm:mt-6">
                    Email sent
                  </span>

                  <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Check your inbox
                  </h1>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    We sent a password reset link to:
                  </p>

                  <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 sm:mt-6">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Mail className="h-5 w-5 text-indigo-600" />
                      </div>

                      <p className="break-all text-sm font-bold text-slate-800">
                        {email}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-500">
                    Open the email and click the reset link. Check your spam
                    or junk folder if you cannot find it.
                  </p>

                  <button
                    type="button"
                    onClick={() => setEmailSent(false)}
                    className="mt-6 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 sm:mt-7"
                  >
                    Use another email
                  </button>

                  <Link
                    to="/"
                    className="mt-5 inline-flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 transition hover:text-indigo-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2937f0] via-[#523cf0] to-[#3784ed] shadow-xl shadow-indigo-400/30 sm:h-20 sm:w-20">
                    <LockKeyhole className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                  </div>

                  <div className="mt-5 text-center sm:mt-6">
                    <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                      Account recovery
                    </span>

                    <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      Forgot your password?
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Enter the email connected to your account and we will
                      send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handleReset} className="mt-7 sm:mt-8">
                    <label
                      htmlFor="forgot-password-email"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Email address
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                      <input
                        id="forgot-password-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="example@email.com"
                        autoComplete="email"
                        autoFocus
                        disabled={loading}
                        className="h-[52px] w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>

                    <div className="mt-5 flex gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />

                      <p className="text-xs leading-5 text-indigo-800">
                        We will send a secure password reset link to your
                        registered email address.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="mt-6 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-4 text-sm font-bold text-white shadow-lg shadow-indigo-400/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:shadow-none"
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

                  <div className="mt-6 border-t border-slate-200 pt-6 sm:mt-7">
                    <Link
                      to="/"
                      className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600 transition hover:text-indigo-600"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to login
                    </Link>
                  </div>
                </>
              )}
            </section>

            <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
              © 2026 LivelihoodGo
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}