import { useState } from "react";

import { User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../../../services/authService";

export default function CustomerRegister() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  // =========================
  // PERSONAL INFORMATION
  // =========================

  const [firstName, setFirstName] = useState("");

  const [middleName, setMiddleName] = useState("");

  const [lastName, setLastName] = useState("");

  const [gender, setGender] = useState("");

  const [birthDate, setBirthDate] = useState("");

  const [civilStatus, setCivilStatus] = useState("");

  const [religion, setReligion] = useState("");

  // =========================
  // CONTACT
  // =========================

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  // =========================
  // ADDRESS
  // =========================

  const [houseNo, setHouseNo] = useState("");

  const [street, setStreet] = useState("");

  const [barangay, setBarangay] = useState("");

  const [municipality, setMunicipality] = useState("");

  const [province, setProvince] = useState("");

  // =========================
  // PROFILE
  // =========================

  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  // =========================
  // PASSWORD
  // =========================

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // =========================
  // REGISTER
  // =========================

  async function handleRegister() {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      alert("Please complete required fields.");

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

    const { error } = await registerUser({
      firstName,

      middleName,

      lastName,

      email,

      phone,

      password,

      gender,

      birthDate,

      civilStatus,

      religion,

      houseNo,

      street,

      barangay,

      municipality,

      province,

      profilePicture,

      role: "customer",
    });

    setLoading(false);

    if (error) {
      alert(error.message);

      return;
    }

    alert("Registration successful!");

    navigate("/");
  }
  return (
    <div
      className="
        min-h-screen
        bg-slate-100
        flex
        items-center
        justify-center
        p-6
      "
    >
      <div
        className="
            w-full
            max-w-7xl
            bg-white
            rounded-3xl
            shadow-2xl
            p-10
          "
      >
        {/* LOGO */}

        <div
          className="
            flex
            flex-col
            items-center
            mb-6
          "
        >
          <div
            className="
              w-20
              h-20
              rounded-full
              bg-blue-600
              flex
              items-center
              justify-center
              text-white
              text-3xl
              font-bold
            "
          >
            L
          </div>

          <h1
            className="
              text-2xl
              font-bold
              mt-4
            "
          >
            Customer Registration
          </h1>

          <p
            className="
              text-gray-500
              mt-1
            "
          >
            Create your customer account
          </p>
        </div>

        <div className="grid grid-cols-2 gap-12">
          {/* LEFT SIDE */}

          <div>
            <h2 className="text-2xl font-bold mb-8">Personal Information</h2>

            {/* First Name */}

            <div className="mb-5">
              <label className="text-sm font-medium">First Name</label>

              <div className="flex items-center border rounded-xl px-3 mt-2">
                <User className="w-5 h-5 text-gray-400" />

                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="w-full p-3 outline-none"
                />
              </div>
            </div>

            {/* Middle Name */}

            <div className="mb-5">
              <label className="text-sm font-medium">Middle Name</label>

              <div className="flex items-center border rounded-xl px-3 mt-2">
                <User className="w-5 h-5 text-gray-400" />

                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Enter middle name"
                  className="w-full p-3 outline-none"
                />
              </div>
            </div>

            {/* Last Name */}

            <div className="mb-5">
              <label className="text-sm font-medium">Last Name</label>

              <div className="flex items-center border rounded-xl px-3 mt-2">
                <User className="w-5 h-5 text-gray-400" />

                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="w-full p-3 outline-none"
                />
              </div>
            </div>

            {/* Gender */}

            <div className="mb-5">
              <label className="text-sm font-medium">Gender</label>

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full border rounded-xl p-3 mt-2"
              >
                <option value="">Select Gender</option>

                <option value="Male">Male</option>

                <option value="Female">Female</option>
              </select>
            </div>

            {/* Birth Date */}

            <div className="mb-5">
              <label className="text-sm font-medium">Birth Date</label>

              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full border rounded-xl p-3 mt-2"
              />
            </div>

            {/* Civil Status */}

            <div className="mb-5">
              <label className="text-sm font-medium">Civil Status</label>

              <select
                value={civilStatus}
                onChange={(e) => setCivilStatus(e.target.value)}
                className="w-full border rounded-xl p-3 mt-2"
              >
                <option value="">Select Civil Status</option>

                <option value="Single">Single</option>

                <option value="Married">Married</option>

                <option value="Widowed">Widowed</option>

                <option value="Separated">Separated</option>
              </select>
            </div>

            {/* Religion */}

            <div className="mb-5">
              <label className="text-sm font-medium">Religion</label>

              <input
                type="text"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="w-full border rounded-xl p-3 mt-2"
              />
            </div>

            {/* Email */}

            <div className="mb-5">
              <label className="text-sm font-medium">Email</label>

              <div className="flex items-center border rounded-xl px-3 mt-2">
                <Mail className="w-5 h-5 text-gray-400" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 outline-none"
                />
              </div>
            </div>

            {/* Phone */}

            <div>
              <label className="text-sm font-medium">Phone Number</label>

              <div className="flex items-center border rounded-xl px-3 mt-2">
                <Phone className="w-5 h-5 text-gray-400" />

                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 outline-none"
                />
              </div>
            </div>
          </div>

          {/* =========================
    RIGHT SIDE
    ADDRESS INFORMATION
========================= */}

          <div>
            <h2 className="text-xl font-bold mb-6">Address Information</h2>

            {/* HOUSE NO */}

            <div className="mb-4">
              <label className="text-sm font-medium">House No.</label>

              <input
                type="text"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                placeholder="House Number"
                className="
        w-full
        border
        rounded-lg
        p-3
        mt-2
        outline-none
        focus:ring-2
        focus:ring-blue-500
      "
              />
            </div>

            {/* STREET */}

            <div className="mb-4">
              <label className="text-sm font-medium">Street</label>

              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street"
                className="
        w-full
        border
        rounded-lg
        p-3
        mt-2
        outline-none
        focus:ring-2
        focus:ring-blue-500
      "
              />
            </div>

            {/* BARANGAY */}

            <div className="mb-4">
              <label className="text-sm font-medium">Barangay</label>

              <input
                type="text"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                placeholder="Barangay"
                className="
        w-full
        border
        rounded-lg
        p-3
        mt-2
        outline-none
        focus:ring-2
        focus:ring-blue-500
      "
              />
            </div>

            {/* MUNICIPALITY */}

            <div className="mb-4">
              <label className="text-sm font-medium">Municipality</label>

              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Municipality"
                className="
        w-full
        border
        rounded-lg
        p-3
        mt-2
        outline-none
        focus:ring-2
        focus:ring-blue-500
      "
              />
            </div>

            {/* PROVINCE */}

            <div className="mb-4">
              <label className="text-sm font-medium">Province</label>

              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder="Province"
                className="
        w-full
        border
        rounded-lg
        p-3
        mt-2
        outline-none
        focus:ring-2
        focus:ring-blue-500
      "
              />
            </div>
          </div>

          {/* END GRID */}
        </div>

        {/* ==========================================
    PROFILE PICTURE
========================================== */}

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-6 text-center">
            Profile Picture
          </h2>

          <div className="flex flex-col items-center">
            {profilePicture ? (
              <img
                src={URL.createObjectURL(profilePicture)}
                alt="Profile Preview"
                className="
          w-36
          h-36
          rounded-full
          object-cover
          border-4
          border-blue-600
          shadow-lg
          mb-4
        "
              />
            ) : (
              <div
                className="
          w-36
          h-36
          rounded-full
          bg-gray-200
          flex
          items-center
          justify-center
          text-5xl
          font-bold
          text-gray-500
          mb-4
        "
              >
                {firstName ? firstName.charAt(0).toUpperCase() : "?"}
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
              className="
        w-full
        border
        rounded-lg
        p-3
      "
            />
          </div>
        </div>

        {/* ==========================================
    PASSWORD
========================================== */}

        <div className="mt-10">
          <div className="mb-5">
            <label className="text-sm font-medium">Password</label>

            <div
              className="
        flex
        items-center
        border
        rounded-lg
        px-3
        mt-2
      "
            >
              <Lock
                className="
          w-5
          h-5
          text-gray-400
        "
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="
          w-full
          p-3
          outline-none
        "
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

          {/* CONFIRM PASSWORD */}

          <div className="mb-8">
            <label className="text-sm font-medium">Confirm Password</label>

            <div
              className="
        flex
        items-center
        border
        rounded-lg
        px-3
        mt-2
      "
            >
              <Lock
                className="
          w-5
          h-5
          text-gray-400
        "
              />

              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="
          w-full
          p-3
          outline-none
        "
              />
            </div>
          </div>

          {/* REGISTER BUTTON */}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="
      w-full
      bg-blue-600
      hover:bg-blue-700
      disabled:bg-gray-400
      text-white
      py-4
      rounded-xl
      font-bold
      text-lg
      transition
    "
          >
            {loading ? "Creating Account..." : "Register"}
          </button>

          {/* LOGIN LINK */}

          <p className="text-center mt-6">
            Already have an account?
            <Link
              to="/"
              className="
        ml-2
        text-blue-600
        hover:underline
        font-semibold
      "
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
