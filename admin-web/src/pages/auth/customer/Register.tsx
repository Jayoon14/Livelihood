import { useState } from "react";

import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Camera,
  Wrench,
  CheckCircle2,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../../../services/authService";

const inputWrap =
  "flex items-center gap-3 border border-slate-200 rounded-2xl px-4 bg-white transition-colors focus-within:border-[#0A1930] focus-within:ring-2 focus-within:ring-[#0A1930]/10";

const inputBase = "w-full py-3.5 outline-none text-slate-900 placeholder:text-slate-400 bg-transparent";

const selectBase =
  "w-full border border-slate-200 rounded-2xl px-4 py-3.5 mt-2 outline-none text-slate-900 bg-white transition-colors focus:border-[#0A1930] focus:ring-2 focus:ring-[#0A1930]/10";

const label = "text-sm font-semibold text-slate-700";

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
      className="min-h-screen bg-slate-50 flex items-center justify-center p-6"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-slate-200 shadow-[0_20px_70px_rgba(15,23,42,.10)] overflow-hidden">
        {/* HEADER */}

        <div
          className="relative px-10 py-10 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg,#0A1930 0%,#12294D 35%,#1D4ED8 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "38px 38px",
            }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-[#0A1930]" />
            </div>

            <span
              className="text-lg font-bold text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Livelihood
            </span>
          </div>

          <div className="relative z-10 mt-8">
            <h1
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Customer Registration
            </h1>

            <p className="text-slate-300 mt-2">
              Create your customer account to start hiring trusted professionals.
            </p>
          </div>
        </div>

        <div className="p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-14 gap-y-10">
            {/* LEFT SIDE — PERSONAL INFO */}

            <div>
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-slate-100">
                  <User className="w-5 h-5 text-blue-600" strokeWidth={2} />
                </div>

                <h2
                  className="text-xl font-bold text-slate-900"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Personal Information
                </h2>
              </div>

              {/* First Name */}

              <div className="mb-5">
                <label className={label}>First Name</label>

                <div className={`${inputWrap} mt-2`}>
                  <User className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Middle Name */}

              <div className="mb-5">
                <label className={label}>Middle Name</label>

                <div className={`${inputWrap} mt-2`}>
                  <User className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Enter middle name"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Last Name */}

              <div className="mb-5">
                <label className={label}>Last Name</label>

                <div className={`${inputWrap} mt-2`}>
                  <User className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Gender + Civil Status */}

              <div className="grid grid-cols-2 gap-4">
                <div className="mb-5">
                  <label className={label}>Gender</label>

                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={selectBase}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="mb-5">
                  <label className={label}>Birth Date</label>

                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={selectBase}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="mb-5">
                  <label className={label}>Civil Status</label>

                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className={selectBase}
                  >
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div className="mb-5">
                  <label className={label}>Religion</label>

                  <input
                    type="text"
                    value={religion}
                    onChange={(e) => setReligion(e.target.value)}
                    placeholder="Optional"
                    className={selectBase}
                  />
                </div>
              </div>

              {/* Email */}

              <div className="mb-5">
                <label className={label}>Email</label>

                <div className={`${inputWrap} mt-2`}>
                  <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputBase}
                  />
                </div>
              </div>

              {/* Phone */}

              <div>
                <label className={label}>Phone Number</label>

                <div className={`${inputWrap} mt-2`}>
                  <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09XX XXX XXXX"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE — ADDRESS + PROFILE */}

            <div>
              <div className="flex items-center gap-3 mb-7">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-slate-100">
                  <MapPin className="w-5 h-5 text-amber-600" strokeWidth={2} />
                </div>

                <h2
                  className="text-xl font-bold text-slate-900"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Address Information
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className={label}>House No.</label>

                  <input
                    type="text"
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                    placeholder="House Number"
                    className={selectBase}
                  />
                </div>

                <div className="mb-4">
                  <label className={label}>Street</label>

                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Street"
                    className={selectBase}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className={label}>Barangay</label>

                <input
                  type="text"
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  placeholder="Barangay"
                  className={selectBase}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className={label}>Municipality</label>

                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="Municipality"
                    className={selectBase}
                  />
                </div>

                <div className="mb-4">
                  <label className={label}>Province</label>

                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Province"
                    className={selectBase}
                  />
                </div>
              </div>

              {/* PROFILE PICTURE */}

              <div className="mt-9">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-slate-100">
                    <Camera className="w-5 h-5 text-blue-600" strokeWidth={2} />
                  </div>

                  <h2
                    className="text-xl font-bold text-slate-900"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Profile Picture
                  </h2>
                </div>

                <div className="flex items-center gap-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  {profilePicture ? (
                    <img
                      src={URL.createObjectURL(profilePicture)}
                      alt="Profile Preview"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-2xl font-bold text-blue-600 border border-slate-100 shrink-0">
                      {firstName ? firstName.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}

                  <div className="flex-1">
                    <label
                      htmlFor="profile-upload"
                      className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#0A1930] bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:border-[#0A1930] transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Choose photo
                    </label>

                    <input
                      id="profile-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setProfilePicture(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />

                    <p className="text-xs text-slate-400 mt-2">
                      PNG or JPG, up to 5MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PASSWORD */}

          <div className="mt-10 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-slate-100">
                <Lock className="w-5 h-5 text-amber-600" strokeWidth={2} />
              </div>

              <h2
                className="text-xl font-bold text-slate-900"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Set Your Password
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={label}>Password</label>

                <div className={`${inputWrap} mt-2`}>
                  <Lock className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={inputBase}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="shrink-0 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className={label}>Confirm Password</label>

                <div className={`${inputWrap} mt-2`}>
                  <Lock className="w-4.5 h-4.5 text-slate-400 shrink-0" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-slate-400 mt-3">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Use at least 6 characters.
            </p>

            {/* REGISTER BUTTON */}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full mt-8 bg-[#0A1930] hover:bg-[#12294D] disabled:bg-slate-300 text-white py-4 rounded-2xl font-semibold text-base transition-all duration-300 hover:shadow-xl"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {/* LOGIN LINK */}

            <p className="text-center mt-6 text-slate-500">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-blue-600 font-semibold hover:underline"
              >
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}