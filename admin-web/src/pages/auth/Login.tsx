import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import AuthSplitLayout from "../../components/auth/AuthSplitLayout";
import CaptchaVerificationModal from "../../components/auth/CaptchaVerificationModal";
import EmailOtpModal from "../../components/auth/EmailOtpModal";
import { useLoading } from "../../context/LoadingContext";
import {
  getRememberedEmail,
  getRememberPreference,
  saveRememberedEmail,
  setRememberPreference,
} from "../../lib/authStorage";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../services/activityService";
import { login, logout } from "../../services/authService";
import { uploadPendingProfilePicture } from "../../utils/pendingProfilePicture";
import { uploadPendingWorkerFiles } from "../../utils/pendingWorkerFiles";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFriendlyLoginError(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }

  if (normalizedMessage.includes("too many requests")) {
    return "Too many login attempts. Please wait and try again.";
  }

  return message || "Unable to sign in.";
}

export default function Login() {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captchaPurpose, setCaptchaPurpose] = useState<
    "login" | "resend" | null
  >(null);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
    | string
    | undefined;

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  useEffect(() => {
    const remembered = getRememberPreference();

    setRememberMe(remembered);

    if (remembered) {
      setEmail(getRememberedEmail());
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCooldown]);

  function validateForm(): boolean {
    const nextErrors: {
      email?: string;
      password?: string;
    } = {};

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 6) {
      nextErrors.password = "Password must contain at least 6 characters.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handlePasswordKey(event: KeyboardEvent<HTMLInputElement>): void {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  async function completeLogin(token: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setPendingLogin(true);
      setLoading(true);
      showLoading(500);

      setRememberPreference(rememberMe);

      if (rememberMe) {
        saveRememberedEmail(normalizedEmail);
      }

      const { error } = await login(normalizedEmail, password, token);

      if (error) {
        const normalizedError = error.message.toLowerCase();

        if (normalizedError.includes("email not confirmed")) {
          setEmailNotVerified(true);
        }

        throw new Error(getFriendlyLoginError(error.message));
      }

      setEmailNotVerified(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Unable to retrieve your account.");
      }

      await logActivity(
        user.id,
        "LOGIN",
        "Authentication",
        "User logged in",
      ).catch(() => undefined);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Unable to load your profile: ${profileError.message}`);
      }

      if (!profile) {
        await logout();
        throw new Error("Your user profile was not found.");
      }

      const role = String(profile.role ?? "")
        .trim()
        .toLowerCase();

      const status = String(profile.status ?? "")
        .trim()
        .toLowerCase();

      if (role === "customer") {
        await uploadPendingProfilePicture(
          user.id,
          user.email ?? normalizedEmail,
        ).catch((profilePictureError: unknown) => {
          console.error(
            "Pending customer profile picture upload failed:",
            profilePictureError,
          );
        });
      }

      if (role === "worker") {
        await uploadPendingWorkerFiles(
          user.id,
          user.email ?? normalizedEmail,
        ).catch((workerFilesError: unknown) => {
          console.error(
            "Pending worker files upload failed:",
            workerFilesError,
          );
        });
      }

      setCaptchaOpen(false);
      setCaptchaPurpose(null);

      if (role === "admin") {
        toast.success("Welcome back!");
        navigate("/dashboard", { replace: true });
        return;
      }

      if (role === "worker") {
        if (status === "rejected") {
          await logout();

          toast.error(
            "Your worker registration was rejected by the administrator. Please register again and submit updated information.",
            {
              duration: 8000,
            },
          );

          navigate("/register-choice", {
            replace: true,
            state: {
              rejectedWorkerEmail:
                user.email ?? normalizedEmail,
              registrationRejected: true,
            },
          });

          return;
        }

        if (status === "disabled") {
          await logout();

          toast.error(
            "Your worker account has been disabled. Please contact the administrator for assistance.",
            {
              duration: 8000,
            },
          );

          return;
        }

        if (status === "blocked") {
          await logout();

          toast.error(
            "Your worker account has been blocked. Please contact the administrator for assistance.",
            {
              duration: 8000,
            },
          );

          return;
        }

        if (status !== "approved") {
          await logout();

          toast.warning(
            "Your worker account is still waiting for administrator approval.",
            {
              duration: 7000,
            },
          );

          return;
        }

        toast.success("Welcome back!");
        navigate("/worker/dashboard", { replace: true });
        return;
      }

      if (role === "customer") {
        toast.success("Welcome back!");
        navigate("/customer/dashboard", { replace: true });
        return;
      }

      await logout();
      throw new Error("Unknown account role.");
    } catch (error) {
      setCaptchaWidgetKey((current) => current + 1);
      setCaptchaOpen(false);
      setCaptchaPurpose(null);

      toast.error(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setPendingLogin(false);
      setLoading(false);
      hideLoading();
    }
  }

  function requestResendVerification(): void {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFieldErrors((current) => ({
        ...current,
        email: "Enter your email address first.",
      }));
      toast.warning("Enter your email address first.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFieldErrors((current) => ({
        ...current,
        email: "Enter a valid email address.",
      }));
      toast.warning("Enter a valid email address.");
      return;
    }

    if (sendingVerification || resendCooldown > 0 || pendingLogin) {
      return;
    }

    if (!turnstileSiteKey) {
      toast.error(
        "Turnstile is not configured. Add VITE_TURNSTILE_SITE_KEY to the environment variables.",
      );
      return;
    }

    setCaptchaPurpose("resend");
    setCaptchaWidgetKey((current) => current + 1);
    setCaptchaOpen(true);
  }

  async function completeResendVerification(token: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setSendingVerification(true);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: window.location.origin,
          captchaToken: token,
        },
      });

      if (error) {
        throw error;
      }

      setCaptchaOpen(false);
      setCaptchaPurpose(null);
      setResendCooldown(60);

      toast.success(
        "OTP code sent successfully. Enter the code to verify your email.",
      );

      setOtpModalOpen(true);
    } catch (error) {
      setCaptchaWidgetKey((current) => current + 1);
      setCaptchaOpen(false);
      setCaptchaPurpose(null);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email.";

      toast.error(
        message.toLowerCase().includes("rate limit")
          ? "Please wait before requesting another verification email."
          : message,
      );
    } finally {
      setSendingVerification(false);
    }
  }

  async function handleLogin(
    event?: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event?.preventDefault();

    if (loading || pendingLogin || !validateForm()) {
      return;
    }

    if (!turnstileSiteKey) {
      toast.error(
        "Turnstile is not configured. Add VITE_TURNSTILE_SITE_KEY to the environment variables.",
      );
      return;
    }
    setCaptchaPurpose("login");
    setCaptchaWidgetKey((current) => current + 1);
    setCaptchaOpen(true);
  }

  const emailField = (
    <div className="mb-5">
      <label
        htmlFor="login-email"
        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        Email address
      </label>

      <div
        className={`mt-1.5 flex items-center rounded-xl border bg-white px-3.5 transition focus-within:ring-4 dark:bg-slate-900 ${
          fieldErrors.email
            ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/10"
            : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-500/15 dark:border-slate-700"
        }`}
      >
        <Mail className="h-[18px] w-[18px] shrink-0 text-slate-400" />

        <input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          disabled={loading || pendingLogin}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailNotVerified(false);

            if (fieldErrors.email) {
              setFieldErrors((current) => ({
                ...current,
                email: undefined,
              }));
            }
          }}
          className="w-full bg-transparent p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
        />
      </div>

      {fieldErrors.email && (
        <p className="mt-2 text-xs font-semibold text-rose-500">
          {fieldErrors.email}
        </p>
      )}
    </div>
  );

  const passwordField = (
    <div>
      <label
        htmlFor="login-password"
        className="text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        Password
      </label>

      <div
        className={`mt-1.5 flex items-center rounded-xl border bg-white px-3.5 transition focus-within:ring-4 dark:bg-slate-900 ${
          fieldErrors.password
            ? "border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/10"
            : "border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-500/15 dark:border-slate-700"
        }`}
      >
        <Lock className="h-[18px] w-[18px] shrink-0 text-slate-400" />

        <input
          id="login-password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter password"
          value={password}
          disabled={loading || pendingLogin}
          onKeyDown={handlePasswordKey}
          onKeyUp={handlePasswordKey}
          onChange={(event) => {
            setPassword(event.target.value);

            if (fieldErrors.password) {
              setFieldErrors((current) => ({
                ...current,
                password: undefined,
              }));
            }
          }}
          className="w-full bg-transparent p-3.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
        />

        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-[18px] w-[18px]" />
          ) : (
            <Eye className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>

      {fieldErrors.password && (
        <p className="mt-2 text-xs font-semibold text-rose-500">
          {fieldErrors.password}
        </p>
      )}

      {capsLockOn && (
        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-500">
          <AlertTriangle className="h-4 w-4" />
          Caps Lock is on.
        </p>
      )}
    </div>
  );

  const rememberForgotRow = (
    <div className="mt-5 flex items-center justify-between gap-3 text-sm">
      <label className="flex cursor-pointer items-center gap-2.5 text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
        />
        Remember me
      </label>

      <Link
        to="/forgot-password"
        className="font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline dark:text-indigo-400"
      >
        Forgot password?
      </Link>
    </div>
  );

  const loginButton = (
    <button
      type="submit"
      disabled={loading || pendingLogin}
      className="mt-7 w-full rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-400/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:shadow-none dark:disabled:from-slate-700 dark:disabled:via-slate-700 dark:disabled:to-slate-700"
    >
      {loading ? "Signing in..." : "Sign in"}
    </button>
  );

  const registerRow = (
    <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">
      Don&apos;t have an account?{" "}
      <Link
        to="/register-choice"
        className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Create one
      </Link>
    </p>
  );

  const verificationNotice = emailNotVerified ? (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
          <Mail className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
            Email verification required
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200/80">
            Check the inbox or spam folder for{" "}
            <span className="font-semibold break-all">
              {email.trim().toLowerCase()}
            </span>
            .
          </p>

          <button
            type="button"
            onClick={requestResendVerification}
            disabled={
              sendingVerification ||
              resendCooldown > 0 ||
              loading ||
              pendingLogin
            }
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sendingVerification
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend Verification Email"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const loginForm = (
    <form onSubmit={handleLogin} noValidate>
      {emailField}
      {passwordField}
      {rememberForgotRow}
      {loginButton}
      {verificationNotice}
      {registerRow}
    </form>
  );

  return (
    <AuthSplitLayout
      heroIcon={ShieldCheck}
      heroTitle={
        <>
          Skilled hands,
          <br />
          trusted work.
        </>
      }
      heroDescription="Sign in to book verified local workers or manage your jobs — all in one place."
      features={[
        {
          icon: Wrench,
          text: "Book trusted and verified local professionals.",
        },
        {
          icon: ShieldCheck,
          text: "Secure access to bookings, messages, tracking, and payments.",
        },
      ]}
      desktopBackgroundImage="/auth/workshop-login-background.png"
      floatingCard
    >
      <div className="w-full">
        <h1
          className="text-3xl font-black text-slate-900 dark:text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Welcome back
        </h1>

        <p className="mb-8 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Log in to continue to your account.
        </p>

        {loginForm}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          10,000+ jobs completed by verified pros
        </div>
      </div>

      <EmailOtpModal
        open={otpModalOpen}
        email={email}
        onClose={() => {
          if (!sendingVerification) {
            setOtpModalOpen(false);
          }
        }}
        onVerified={() => {
          setOtpModalOpen(false);
          setEmailNotVerified(false);
          toast.success("Email verified. You may now sign in.");
        }}
      />

      <CaptchaVerificationModal
        open={captchaOpen}
        siteKey={turnstileSiteKey ?? ""}
        widgetKey={captchaWidgetKey}
        processing={pendingLogin || sendingVerification}
        title={
          captchaPurpose === "resend"
            ? "Verify before resending"
            : "Verify before signing in"
        }
        description={
          captchaPurpose === "resend"
            ? "Complete this quick security check to resend your verification email."
            : "Complete this quick security check to continue to your account."
        }
        onClose={() => {
          if (!pendingLogin && !sendingVerification) {
            setCaptchaOpen(false);
            setCaptchaPurpose(null);
          }
        }}
        onSuccess={(token) => {
          if (captchaPurpose === "resend") {
            void completeResendVerification(token);
            return;
          }

          void completeLogin(token);
        }}
        onExpire={() => undefined}
        onError={() => {
          setCaptchaWidgetKey((current) => current + 1);
          toast.error("Security verification failed. Please try again.");
        }}
      />
    </AuthSplitLayout>
  );
}