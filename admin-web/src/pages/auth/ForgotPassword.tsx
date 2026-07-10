import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  async function handleReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password reset email sent. Please check your inbox.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow w-96">

        <h1 className="text-2xl font-bold mb-6">
          Forgot Password
        </h1>

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-lg p-3 w-full mb-4"
        />

        <button
          onClick={handleReset}
          className="bg-blue-600 text-white w-full py-3 rounded-lg"
        >
          Send Reset Link
        </button>

        <Link
          to="/"
          className="block text-center mt-4 text-blue-600"
        >
          Back to Login
        </Link>

      </div>
    </div>
  );
}