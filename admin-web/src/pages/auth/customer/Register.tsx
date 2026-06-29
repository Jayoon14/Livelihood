import { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export default function CustomerRegister() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">

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

        {/* Full Name */}

        <div className="mb-4">

          <label className="text-sm font-medium">
            Full Name
          </label>

          <div className="flex items-center border rounded-lg px-3 mt-2">

            <User className="w-5 h-5 text-gray-400"/>

            <input
              type="text"
              placeholder="Enter full name"
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

            <Mail className="w-5 h-5 text-gray-400"/>

            <input
              type="email"
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

            <Phone className="w-5 h-5 text-gray-400"/>

            <input
              type="text"
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

            <Lock className="w-5 h-5 text-gray-400"/>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className="w-full p-3 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-gray-500"/>
              ) : (
                <Eye className="w-5 h-5 text-gray-500"/>
              )}
            </button>

          </div>

        </div>

        {/* Register */}

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
        >
          Register
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