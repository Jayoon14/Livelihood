import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "../../lib/supabase";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    match: password !== "" && password === confirmPassword,
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;

  function strength() {
    if (passedChecks <= 2) return "Weak";
    if (passedChecks <= 4) return "Medium";
    return "Strong";
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!checks.length) {
      toast.warning("Password must be at least 8 characters.");
      return;
    }

    if (!checks.upper) {
      toast.warning("Password must contain an uppercase letter.");
      return;
    }

    if (!checks.lower) {
      toast.warning("Password must contain a lowercase letter.");
      return;
    }

    if (!checks.number) {
      toast.warning("Password must contain a number.");
      return;
    }

    if (!checks.match) {
      toast.warning("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast.success("Password updated successfully.");

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update password.",
      );
    } finally {
      setLoading(false);
    }
  }

  const Check = ({
    ok,
    text,
  }: {
    ok: boolean;
    text: string;
  }) => (
    <div
      className={`flex items-center gap-2 text-sm ${
        ok ? "text-green-600" : "text-slate-500"
      }`}
    >
      <CheckCircle2 size={16} />
      {text}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 p-8">

        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
          <LockKeyhole className="text-blue-600 w-8 h-8" />
        </div>

        <h1 className="text-center text-3xl font-black mt-6 text-slate-900">
          Reset Password
        </h1>

        <p className="text-center text-slate-500 mt-3 text-sm leading-6">
          Create a new secure password for your account.
        </p>

        <form onSubmit={handleSave} className="mt-8 space-y-5">

          <div>
            <label className="block text-sm font-semibold mb-2">
              New Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-300 px-4 pr-12 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                placeholder="Enter new password"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-slate-500"
              >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                disabled={loading}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-300 px-4 pr-12 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none"
                placeholder="Confirm password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-4 top-3 text-slate-500"
              >
                {showConfirmPassword ? (
                  <EyeOff size={20}/>
                ) : (
                  <Eye size={20}/>
                )}
              </button>
            </div>
          </div>

          <div>

            <div className="flex justify-between mb-2 text-sm">
              <span>Password Strength</span>

              <span
                className={`font-semibold ${
                  strength() === "Strong"
                    ? "text-green-600"
                    : strength() === "Medium"
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {strength()}
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">

              <div
                style={{
                  width: `${passedChecks * 20}%`,
                }}
                className={`h-full transition-all ${
                  strength() === "Strong"
                    ? "bg-green-500"
                    : strength() === "Medium"
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
              />

            </div>

          </div>

          <div className="space-y-2 pt-2">

            <Check
              ok={checks.length}
              text="At least 8 characters"
            />

            <Check
              ok={checks.upper}
              text="Contains uppercase letter"
            />

            <Check
              ok={checks.lower}
              text="Contains lowercase letter"
            />

            <Check
              ok={checks.number}
              text="Contains a number"
            />

            <Check
              ok={checks.match}
              text="Passwords match"
            />

          </div>

          <button
            disabled={loading}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5"/>
                Updating Password...
              </>
            ) : (
              "Save Password"
            )}
          </button>

        </form>

        <Link
          to="/"
          className="flex justify-center items-center gap-2 mt-6 text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft size={18}/>
          Back to Login
        </Link>

      </section>
    </main>
  );
}