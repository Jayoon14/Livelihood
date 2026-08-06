import {
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import CaptchaVerificationModal from "./CaptchaVerificationModal";
import { supabase } from "../../lib/supabase";

export interface EmailOtpVerifiedContext {
  userId: string;
  email: string;
}

interface EmailOtpModalProps {
  open: boolean;
  email: string;
  accountType?: "customer" | "worker";
  onClose: () => void;
  onVerified:
    | ((context: EmailOtpVerifiedContext) => void)
    | ((context: EmailOtpVerifiedContext) => Promise<void>);
}

const OTP_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

export default function EmailOtpModal({
  open,
  email,
  accountType = "customer",
  onClose,
  onVerified,
}: EmailOtpModalProps) {
  const inputRefs =
    useRef<Array<HTMLInputElement | null>>([]);

  const [digits, setDigits] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(
    RESEND_COOLDOWN_SECONDS,
  );
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaWidgetKey, setCaptchaWidgetKey] =
    useState(0);

  const turnstileSiteKey = import.meta.env
    .VITE_TURNSTILE_SITE_KEY as string | undefined;

  const normalizedEmail = email.trim().toLowerCase();
  const otp = useMemo(() => digits.join(""), [digits]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDigits(
        Array.from({ length: OTP_LENGTH }, () => ""),
      );
    }, 0);

    return () => window.clearTimeout(timer);
    setCooldown(RESEND_COOLDOWN_SECONDS);

    window.setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, [open, normalizedEmail]);

  useEffect(() => {
    if (!open || cooldown <= 0) {
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
  }, [open, cooldown]);

  if (!open) {
    return null;
  }

  function updateDigit(
    index: number,
    value: string,
  ): void {
    const normalized = value
      .replace(/\D/g, "")
      .slice(-1);

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

    setDigits(
      Array.from(
        { length: OTP_LENGTH },
        (_, index) => pasted[index] ?? "",
      ),
    );

    inputRefs.current[
      Math.min(pasted.length, OTP_LENGTH - 1)
    ]?.focus();
  }

  async function verifyOtp(): Promise<void> {
    if (!normalizedEmail) {
      toast.warning("Email address is missing.");
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

      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otp,
        type: "email",
      });

      if (error) {
        throw error;
      }

      const verifiedUser = data.user;

      if (!verifiedUser) {
        throw new Error(
          "Email was verified, but the user account could not be loaded.",
        );
      }

      await onVerified({
        userId: verifiedUser.id,
        email: verifiedUser.email ?? normalizedEmail,
      });

      await supabase.auth.signOut({
        scope: "local",
      });

      toast.success(
        accountType === "worker"
          ? "Email verified. Your application is waiting for administrator approval."
          : "Email verified successfully. You may now sign in.",
      );

      // The caller has already completed its post-verification work.
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

  function requestResend(): void {
    if (
      resending ||
      verifying ||
      cooldown > 0
    ) {
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

  async function completeResend(
    captchaToken: string,
  ): Promise<void> {
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
        "A new OTP code was sent to your email.",
      );
    } catch (error) {
      setCaptchaOpen(false);
      setCaptchaWidgetKey((current) => current + 1);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to resend the OTP.";

      toast.error(
        message.toLowerCase().includes("rate limit") ||
          message
            .toLowerCase()
            .includes("security purposes")
          ? "Please wait before requesting another OTP code."
          : message,
      );
    } finally {
      setResending(false);
    }
  }

  const busy = verifying || resending;

  return (
    <>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-otp-modal-title"
      >
        <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/15 bg-white shadow-[0_35px_110px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900">
          <header className="relative bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-6 py-7 text-white sm:px-8">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close verification modal"
              className="absolute right-4 top-4 rounded-xl bg-white/10 p-2 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <h2
              id="email-otp-modal-title"
              className="mt-5 text-2xl font-black sm:text-3xl"
            >
              Verify your email
            </h2>

            <p className="mt-2 text-sm leading-6 text-blue-100">
              Enter the one-time code sent to:
            </p>

            <p className="mt-1 break-all text-sm font-bold">
              {normalizedEmail}
            </p>
          </header>

          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <Mail className="h-4 w-4 text-indigo-500" />
              Enter {OTP_LENGTH}-digit OTP
            </div>

            <div
              onPaste={handlePaste}
              className="mt-5 grid grid-cols-8 gap-2"
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
                    index === 0
                      ? "one-time-code"
                      : "off"
                  }
                  maxLength={1}
                  value={digit}
                  disabled={busy}
                  onChange={(event) =>
                    updateDigit(
                      index,
                      event.target.value,
                    )
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(index, event)
                  }
                  aria-label={`OTP digit ${index + 1}`}
                  className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white text-center text-lg font-black outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => void verifyOtp()}
              disabled={
                busy || otp.length !== OTP_LENGTH
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

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Did not receive the code?
              </p>

              <button
                type="button"
                onClick={requestResend}
                disabled={busy || cooldown > 0}
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
          void completeResend(token);
        }}
        onExpire={() => undefined}
        onError={() => {
          setCaptchaWidgetKey((current) => current + 1);
          toast.error(
            "Security verification failed. Please try again.",
          );
        }}
      />
    </>
  );
}