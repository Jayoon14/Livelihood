import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { login } from "../../../services/authService";
import { useLoading } from "../../../context/LoadingContextValue";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = sessionStorage.getItem("auth-message");

    if (message) {
      sessionStorage.removeItem("auth-message");

      window.setTimeout(() => {
        toast.error(message, {
          duration: 6000,
        });
      }, 100);
    }
  }, []);

  async function handleLogin() {
    if (!email || !password) {
      toast.warning("Please fill all fields.");
      return;
    }

    setLoading(true);
    showLoading(700);

    try {
      const { data, error } = await login(email, password);

      if (error) {
        toast.error(error.message, {
          duration: 6000,
        });
        return;
      }

      if (!data.user || !data.session) {
        toast.error("Login failed.");
        return;
      }

      navigate("/customer/dashboard", {
        replace: true,
      });
    } finally {
      setLoading(false);
      hideLoading();
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold">
            L
          </div>

          <h1 className="text-3xl font-bold mt-5">Customer Login</h1>

          <p className="text-gray-500">Welcome Back</p>
        </div>

        <div className="space-y-5">
          <div>
            <label>Email</label>

            <div className="border rounded-lg mt-2 px-3 flex items-center">
              <Mail className="w-5 h-5 text-gray-400" />

              <input
                className="w-full p-3 outline-none"
                type="email"
                placeholder="Enter email"
                value={email}
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label>Password</label>

            <div className="border rounded-lg mt-2 px-3 flex items-center">
              <Lock className="w-5 h-5 text-gray-400" />

              <input
                className="w-full p-3 outline-none"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                disabled={loading}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLogin()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Login"}
          </button>

          <p className="text-center text-sm">
            No account?
            <Link to="/register/customer" className="text-blue-600 ml-1">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}