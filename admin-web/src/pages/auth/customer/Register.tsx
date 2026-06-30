import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../../services/authService";

export default function CustomerRegister() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      alert("Please complete all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await registerUser(
      firstName,
      middleName,
      lastName,
      email,
      phone,
      password,
      "customer"
    );

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Registration successful!");

    navigate("/");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">

      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8">

        {/* Logo */}

        <div className="flex flex-col items-center mb-8">

          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
            L
          </div>

          <h1 className="text-2xl font-bold mt-4">
            Customer Registration
          </h1>

          <p className="text-gray-500">
            Create your customer account
          </p>

        </div>

        {/* First Name */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            First Name
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <User className="w-5 h-5 text-gray-400" />

            <input
              type="text"
              value={firstName}
              onChange={(e) =>
                setFirstName(e.target.value)
              }
              placeholder="Enter first name"
              className="w-full p-3 outline-none"
            />

          </div>

        </div>

        {/* Middle Name */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Middle Name (Optional)
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <User className="w-5 h-5 text-gray-400" />

            <input
              type="text"
              value={middleName}
              onChange={(e) =>
                setMiddleName(e.target.value)
              }
              placeholder="Enter middle name"
              className="w-full p-3 outline-none"
            />

          </div>

        </div>

        {/* Last Name */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Last Name
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <User className="w-5 h-5 text-gray-400" />

            <input
              type="text"
              value={lastName}
              onChange={(e) =>
                setLastName(e.target.value)
              }
              placeholder="Enter last name"
              className="w-full p-3 outline-none"
            />

          </div>

        </div>

        {/* Email */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Email
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <Mail className="w-5 h-5 text-gray-400" />

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter email"
              className="w-full p-3 outline-none"
            />

          </div>

        </div>
                {/* Phone */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Phone Number
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <Phone className="w-5 h-5 text-gray-400" />

            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XXXXXXXXX"
              className="w-full p-3 outline-none"
            />

          </div>

        </div>

        {/* Password */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Password
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <Lock className="w-5 h-5 text-gray-400" />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-500" />
              ) : (
                <Eye className="w-5 h-5 text-gray-500" />
              )}
            </button>

          </div>

        </div>

        {/* Confirm Password */}

        <div className="mb-6">

          <label className="text-sm font-medium">
            Confirm Password
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <Lock className="w-5 h-5 text-gray-400" />

            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full p-3 outline-none"
            />

          </div>

        </div>

        {/* Register */}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition"
        >
          {loading ? "Creating Account..." : "Register"}
        </button>

        <p className="text-center mt-6 text-sm">

          Already have an account?

          <Link
            to="/"
            className="text-blue-600 font-semibold ml-1"
          >
            Login
          </Link>

        </p>

      </div>

    </div>
  );
}