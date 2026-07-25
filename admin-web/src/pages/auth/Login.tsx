import { useState, useEffect } from "react";
import { Eye, EyeOff, Mail, Lock, Wrench, Zap, Hammer, PaintRoller, ShieldCheck } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { login, logout } from "../../services/authService";

import { logActivity } from "../../services/activityService";

import { supabase } from "../../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // trigger the slide-up transition on mount
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  async function handleLogin() {
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await login(email, password);

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);

      alert("Unable to retrieve user.");

      return;
    }

    // =========================
    // LOG LOGIN ACTIVITY
    // =========================

    await logActivity(user.id, "LOGIN", "Authentication", "User logged in");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .maybeSingle();

    setLoading(false);

    // ADMIN

    if (!profile) {
      navigate("/dashboard");
      return;
    }

    if (profile.role === "admin") {
      navigate("/dashboard");
      return;
    }

    // WORKER

    if (profile.role === "worker") {
      if (profile.status !== "Approved") {
        alert("Your account is waiting for admin approval.");

        await logout();

        return;
      }

      navigate("/worker/dashboard");

      return;
    }

    // CUSTOMER

    if (profile.role === "customer") {
      navigate("/customer/dashboard");

      return;
    }

    alert("Unknown account role.");

    await logout();
  }

  const emailField = (
    <div className="mb-5">
      <label className="text-sm font-medium text-slate-700">Email address</label>
      <div className="mt-1.5 flex items-center border border-slate-200 rounded-xl px-3.5 bg-white focus-within:ring-2 focus-within:ring-blue-600/30 focus-within:border-blue-600 transition">
        <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full p-3.5 outline-none text-sm bg-transparent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
    </div>
  );

  const passwordField = (
    <div>
      <label className="text-sm font-medium text-slate-700">Password</label>
      <div className="mt-1.5 flex items-center border border-slate-200 rounded-xl px-3.5 bg-white focus-within:ring-2 focus-within:ring-blue-600/30 focus-within:border-blue-600 transition">
        <Lock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
          className="w-full p-3.5 outline-none text-sm bg-transparent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-slate-400 hover:text-slate-600 transition shrink-0"
        >
          {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
        </button>
      </div>
    </div>
  );

  const rememberForgotRow = (
    <div className="flex justify-between items-center mt-5 text-sm">
      <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
        <input type="checkbox" className="rounded border-slate-300" />
        Remember me
      </label>
      <Link to="/forgot-password" className="text-blue-600 font-medium hover:underline">
        Forgot password?
      </Link>
    </div>
  );

  const loginButton = (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="mt-7 w-full bg-[#0A1930] hover:bg-[#12294D] disabled:bg-slate-300 text-white py-3.5 rounded-xl font-semibold text-sm transition shadow-lg shadow-navy-900/10"
    >
      {loading ? "Logging in..." : "Log in"}
    </button>
  );

  const registerRow = (
    <p className="text-center mt-7 text-sm text-slate-500">
      Don't have an account?{" "}
      <Link to="/register-choice" className="text-blue-600 font-semibold hover:underline">
        Register
      </Link>
    </p>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* ============ MOBILE / TABLET (< lg) ============ */}
      <div className="lg:hidden min-h-screen flex flex-col overflow-hidden">
        {/* HERO */}
        <div
          className="relative flex flex-col px-6 pt-10 pb-24 shrink-0"
          style={{
            background: "linear-gradient(160deg, #12294D 0%, #0A1930 100%)",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.6s ease-out",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-[#0A1930]" strokeWidth={2.5} />
            </div>
            <span className="text-white text-lg font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
              Livelihood
            </span>
          </div>

          <div className="relative z-10 mt-10">
            <h1
              className="text-white text-3xl font-bold leading-tight mb-3"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Skilled hands,
              <br />
              trusted work.
            </h1>
            <p className="text-slate-300 text-sm">
              Sign in to book verified local workers or manage your jobs.
            </p>

            <div className="flex flex-wrap gap-2 mt-5">
              {[
                { icon: Wrench, label: "Plumbing" },
                { icon: Zap, label: "Electrical" },
                { icon: Hammer, label: "Carpentry" },
                { icon: PaintRoller, label: "Painting" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1.5"
                >
                  <Icon className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] text-slate-200 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SLIDE-UP SHEET */}
        <div
          className="relative flex-1 bg-white rounded-t-3xl -mt-10 px-6 pt-8 pb-10 z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
          style={{
            transform: mounted ? "translateY(0)" : "translateY(24px)",
            opacity: mounted ? 1 : 0,
            transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease-out",
          }}
        >
          {/* drag handle affordance */}
          <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

          <h2 className="text-2xl font-bold text-slate-900 mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
            Welcome back
          </h2>
          <p className="text-slate-500 text-sm mb-7">Log in to continue to your account.</p>

          {emailField}
          {passwordField}
          {rememberForgotRow}
          {loginButton}
          {registerRow}

          <div className="flex items-center gap-2 mt-8 justify-center text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            10,000+ jobs completed by verified pros
          </div>
        </div>
      </div>

      {/* ============ DESKTOP (>= lg) ============ */}
      <div className="hidden lg:flex min-h-screen w-full bg-slate-50">
        <div
          className="lg:w-[46%] relative flex flex-col justify-between p-12 xl:p-16 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #12294D 0%, #0A1930 100%)",
            clipPath: "polygon(0 0, 100% 0, 88% 100%, 0% 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-[#0A1930]" strokeWidth={2.5} />
            </div>
            <span className="text-white text-lg font-semibold tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
              Livelihood
            </span>
          </div>

          <div className="relative z-10">
            <h1
              className="text-white text-4xl xl:text-6xl font-bold leading-tight mb-5"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Skilled hands,
              <br />
              trusted work.
            </h1>
            <p className="text-slate-300 text-base xl:text-lg max-w-md">
              Sign in to book verified local workers or manage your jobs — all in one place.
            </p>

            <div className="flex flex-wrap gap-2 mt-8">
              {[
                { icon: Wrench, label: "Plumbing" },
                { icon: Zap, label: "Electrical" },
                { icon: Hammer, label: "Carpentry" },
                { icon: PaintRoller, label: "Painting" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-3.5 py-2"
                >
                  <Icon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-slate-200 font-medium">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-10 pt-8 border-t border-white/10">
              <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0" />
              <p className="text-slate-300 text-sm">
                <span className="text-white font-semibold">10,000+ jobs completed</span> by
                background-checked professionals near you.
              </p>
            </div>
          </div>

          <p className="relative z-10 text-slate-400 text-xs">
            © {new Date().getFullYear()} Livelihood Services Platform
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div
            className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 p-8 sm:p-10"
            style={{
              transform: mounted ? "translateY(0)" : "translateY(16px)",
              opacity: mounted ? 1 : 0,
              transition:
                "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease-out",
            }}
          >
                      <h2 className="text-3xl font-bold text-slate-900 mb-1.5" style={{ fontFamily: "'Sora', sans-serif" }}>
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm mb-8">Log in to continue to your account.</p>

            {emailField}
            {passwordField}
            {rememberForgotRow}
            {loginButton}
            {registerRow}
          </div>
        </div>
      </div>
    </div>
  );
}