import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { toast } from "sonner";

import CaptchaVerificationModal from "../../components/auth/CaptchaVerificationModal";
import { supabase } from "../../lib/supabase";

interface VerifyEmailLocationState {
  email?: string;
  accountType?: "customer" | "worker";
}

const OTP_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const state =
    (location.state as VerifyEmailLocationState | null) ?? null;

  const [email, setEmail] = useState(
    state?.email?.trim().toLowerCase() ?? "",
  );
  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [cooldown, setCooldown] = useState(
    RESEND_COOLDOWN_SECONDS,
  );

  const turnstileSiteKey = import.meta.env
    .VITE_TURNSTILE_SITE_KEY as string | undefined;

  const accountType = state?.accountType ?? "customer";

  const otp = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) =>
        current > 0 ? current - 1 : 0,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldown]);

  function updateDigit(index: number, value: string): void {
    const normalized = value.replace(/\D/g, "").slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = normalized;
      return next;
    });

    if (normalized && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void {
    if (
      event.key === "Backspace" &&
      !digits[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (
      event.key === "ArrowRight" &&
      index < OTP_LENGTH - 1
    ) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    event: React.ClipboardEvent<HTMLDivElement>,
  ): void {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) {
      return;
    }

    event.preventDefault();

    const next = Array.from(
      { length: OTP_LENGTH },
      (_, index) => pasted[index] ?? "",
    );

    setDigits(next);

    const nextFocusIndex = Math.min(
      pasted.length,
      OTP_LENGTH - 1,
    );

    inputRefs.current[nextFocusIndex]?.focus();
  }

  async function verifyOtp(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.warning("Enter the email used during registration.");
      return;
    }

    if (otp.length !== OTP_LENGTH) {
      toast.warning(
        `Enter the complete ${OTP_LENGTH}-digit OTP code.`,
      );
      return;
    }

    try {
      setVerifying(true);

      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: "email",
      });

      if (error) {
        throw error;
      }

      /*
       * verifyOtp may create a session. The system still requires
       * the user to sign in normally, so clear this temporary session.
       */
      await supabase.auth.signOut({ scope: "local" });

      toast.success(
        accountType === "worker"
          ? "Email verified. Your worker application is now waiting for administrator approval."
          : "Email verified successfully. You may now sign in.",
      );

      navigate("/", {
        replace: true,
        state: {
          verifiedEmail: normalizedEmail,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to verify the OTP.";

      toast.error(
        message.toLowerCase().includes("expired")
          ? "The OTP is invalid or expired. Request a new code."
          : message,
      );
    } finally {
      setVerifying(false);
    }
  }

  function requestResendOtp(): void {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.warning("Enter your email address first.");
      return;
    }

    if (resending || cooldown > 0 || verifying) {
      return;
    }

    if (!turnstileSiteKey) {
      toast.error(
        "Turnstile is not configured. Add VITE_TURNSTILE_SITE_KEY to the environment variables.",
      );
      return;
    }

    setCaptchaWidgetKey((current) => current + 1);
    setCaptchaOpen(true);
  }

  async function completeResendOtp(
    captchaToken: string,
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setResending(true);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: window.location.origin,
          captchaToken,
        },
      });

      if (error) {
        throw error;
      }

      setCaptchaOpen(false);
      setDigits(
        Array.from({ length: OTP_LENGTH }, () => ""),
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();

      toast.success(
        "A new OTP code was sent. Check your inbox and spam folder.",
      );
    } catch (error) {
      setCaptchaWidgetKey((current) => current + 1);
      setCaptchaOpen(false);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to resend the OTP.";

      toast.error(
        message.toLowerCase().includes("rate limit") ||
          message.toLowerCase().includes("security purposes")
          ? "Please wait before requesting another OTP code."
          : message,
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-10 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
      <div className="mx-auto w-full max-w-lg">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900">
          <div className="bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-7 py-8 text-white">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-3xl font-black">
              Verify your email
            </h1>

            <p className="mt-2 text-sm leading-6 text-blue-100">
              Enter the one-time code sent to your email to
              activate your account.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Email address
            </label>

            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-800">
              <Mail className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                className="w-full bg-transparent py-3.5 text-sm outline-none"
              />
            </div>

            <div className="mt-7">
              <p className="text-center text-sm font-bold text-slate-700 dark:text-slate-200">
                Enter {OTP_LENGTH}-digit OTP
              </p>

              <div
                onPaste={handlePaste}
                className="mt-4 grid grid-cols-8 gap-2"
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={
                      index === 0 ? "one-time-code" : "off"
                    }
                    maxLength={1}
                    value={digit}
                    onChange={(event) =>
                      updateDigit(index, event.target.value)
                    }
                    onKeyDown={(event) =>
                      handleKeyDown(index, event)
                    }
                    aria-label={`OTP digit ${index + 1}`}
                    className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white text-center text-lg font-black outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800"
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={
                verifying ||
                resending ||
                otp.length !== OTP_LENGTH
              }
              className="mt-7 flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Verify Email
                </>
              )}
            </button>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Did not receive the code?
              </p>

              <button
                type="button"
                onClick={requestResendOtp}
                disabled={
                  resending ||
                  verifying ||
                  cooldown > 0
                }
                className="mt-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                {resending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Resend available in ${cooldown}s`
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resend OTP
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      <CaptchaVerificationModal
        open={captchaOpen}
        siteKey={turnstileSiteKey ?? ""}
        widgetKey={captchaWidgetKey}
        processing={resending}
        title="Verify before resending"
        description="Complete this quick security check to request a new email OTP."
        onClose={() => {
          if (!resending) {
            setCaptchaOpen(false);
          }
        }}
        onSuccess={(token) => {
          void completeResendOtp(token);
        }}
        onExpire={() => undefined}
        onError={() => {
          setCaptchaWidgetKey((current) => current + 1);
          toast.error(
            "Security verification failed. Please try again.",
          );
        }}
      />
    </main>
  );
}