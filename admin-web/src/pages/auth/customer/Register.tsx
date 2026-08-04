import { toast } from "sonner";
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
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import CaptchaVerificationModal from "../../../components/auth/CaptchaVerificationModal";
import EmailOtpModal from "../../../components/auth/EmailOtpModal";
import { registerUser } from "../../../services/authService";
import { isDisposableEmail } from "../../../utils/disposableEmail";
import { savePendingProfilePicture } from "../../../utils/pendingProfilePicture";

const inputWrap =
  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-[#2937f0] focus-within:ring-4 focus-within:ring-[#2937f0]/10 dark:border-slate-700 dark:bg-slate-800";

const inputBase =
  "w-full bg-transparent py-3.5 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:text-white";

const selectBase =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 dark:text-white outline-none transition focus:border-[#2937f0] focus:ring-4 focus:ring-[#2937f0]/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

const label = "text-sm font-semibold text-slate-700 dark:text-slate-200";

const RELIGION_OPTIONS = [
  "Roman Catholic",
  "Iglesia ni Cristo",
  "Islam",
  "Born Again Christian",
  "Protestant",
  "Seventh-day Adventist",
  "Jehovah's Witness",
  "Buddhist",
  "Hindu",
  "Indigenous belief",
  "Other",
  "Prefer not to say",
] as const;

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
  const [captchaWidgetKey, setCaptchaWidgetKey] = useState(0);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
    | string
    | undefined;

  // =========================
  // REGISTER
  // =========================

  function validateRegistration(): boolean {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      toast.warning("Please complete required fields.");
      return false;
    }

    if (isDisposableEmail(email)) {
      toast.warning(
        "Temporary or disposable email addresses are not allowed. Please use your personal email.",
      );
      return false;
    }

    if (password !== confirmPassword) {
      toast.warning("Passwords do not match.");
      return false;
    }

    if (password.length < 6) {
      toast.warning("Password must be at least 6 characters.");
      return false;
    }

    if (!turnstileSiteKey) {
      toast.error(
        "Turnstile is not configured. Add VITE_TURNSTILE_SITE_KEY to the environment variables.",
      );
      return false;
    }

    return true;
  }

  function handleRegister() {
    if (loading || pendingRegistration || !validateRegistration()) {
      return;
    }
    setCaptchaWidgetKey((current) => current + 1);
    setCaptchaOpen(true);
  }

  async function completeRegistration(token: string) {
    try {
      setPendingRegistration(true);
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
        captchaToken: token,
      });

      if (error) {
        throw error;
      }

      await savePendingProfilePicture(email, profilePicture);

      setCaptchaOpen(false);

      toast.success(
        "Account created. Enter the OTP code sent to your email.",
      );

      setOtpModalOpen(true);
    } catch (error) {
      setCaptchaWidgetKey((current) => current + 1);
      setCaptchaOpen(false);

      toast.error(
        error instanceof Error ? error.message : "Registration failed.",
      );
    } finally {
      setPendingRegistration(false);
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-dvh bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_34%,#f8fafc_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,#111827_0%,#020617_40%,#020617_100%)] dark:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* BACKGROUND */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-x-0 top-0 h-[32rem] opacity-[0.06] dark:opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#5b3df1]/20 blur-3xl" />
        <div className="absolute -right-24 top-20 h-96 w-96 rounded-full bg-[#3292ec]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#2937f0]/10 blur-3xl" />
      </div>

      {/* TOP BAR */}
      <header className="relative z-20 border-b border-white/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 shadow-sm">
              <Wrench className="h-5 w-5 text-slate-950" />
            </div>

            <div>
              <p
                className="font-black leading-none text-slate-950 dark:text-white"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                LivelihoodGo
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Trusted local services
              </p>
            </div>
          </Link>

          <Link
            to="/register-choice"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:border-[#2937f0]/40 hover:bg-indigo-50 hover:text-[#2937f0] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Account type
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,#2937f0_0%,#5b3df1_55%,#3292ec_100%)] px-5 py-6 text-white shadow-[0_24px_70px_rgba(41,55,240,0.24)] sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
              backgroundSize: "38px 38px",
            }}
          />

          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-300 backdrop-blur sm:text-xs">
                Customer registration
              </div>

              <h1
                className="mt-3 max-w-3xl text-3xl font-black leading-[1.08] sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                Create your customer account.
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Complete your information once, then book trusted workers,
                manage services, and track every request from one account.
              </p>
            </div>

            {/* Compact on mobile, cards on larger screens */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[30rem]">
              {[
                {
                  icon: ShieldCheck,
                  title: "Secure",
                  text: "Protected registration",
                },
                {
                  icon: CheckCircle2,
                  title: "Verified",
                  text: "Trusted professionals",
                },
                {
                  icon: MapPin,
                  title: "Local",
                  text: "Nearby services",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex min-w-0 flex-col items-center rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center backdrop-blur-sm sm:items-start sm:rounded-2xl sm:p-4 sm:text-left"
                >
                  <Icon className="h-4 w-4 shrink-0 text-amber-300 sm:h-5 sm:w-5" />

                  <p className="mt-2 truncate text-[11px] font-black sm:mt-3 sm:text-sm">
                    {title}
                  </p>

                  <p className="mt-1 hidden text-xs text-blue-100/80 sm:block">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FORM SHELL */}
        <section className="relative -mt-5 overflow-hidden rounded-[2rem] border border-white/90 bg-white/96 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/96 sm:-mt-7">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-7 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#2937f0] dark:text-indigo-400">
                  Customer profile
                </p>

                <h2
                  className="mt-1 text-2xl font-black text-slate-950 dark:text-white"
                  style={{ fontFamily: "'Sora', sans-serif" }}
                >
                  Registration details
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Complete the required fields to create your account.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-[#2937f0] dark:bg-indigo-500/10 dark:text-indigo-300">
                <ShieldCheck className="h-4 w-4" />
                Secure form
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-2 xl:p-8">
            {/* PERSONAL INFORMATION */}
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <User className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Personal information
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Basic details used for your customer profile.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={label}>First Name</label>
                  <div className={`${inputWrap} mt-2`}>
                    <User className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="Enter first name"
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label className={label}>Middle Name</label>
                  <div className={`${inputWrap} mt-2`}>
                    <User className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={middleName}
                      onChange={(event) => setMiddleName(event.target.value)}
                      placeholder="Optional"
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className={label}>Last Name</label>
                  <div className={`${inputWrap} mt-2`}>
                    <User className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      placeholder="Enter last name"
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label className={label}>Gender</label>
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className={selectBase}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className={label}>Birth Date</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className={selectBase}
                  />
                </div>

                <div>
                  <label className={label}>Civil Status</label>
                  <select
                    value={civilStatus}
                    onChange={(event) => setCivilStatus(event.target.value)}
                    className={selectBase}
                  >
                    <option value="">Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div>
                  <label className={label}>Religion</label>
                  <select
                    value={religion}
                    onChange={(event) => setReligion(event.target.value)}
                    className={selectBase}
                  >
                    <option value="">Select religion</option>

                    {RELIGION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* ADDRESS INFORMATION */}
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <MapPin className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Address information
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Helps us show relevant services near you.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={label}>House No.</label>
                  <input
                    type="text"
                    value={houseNo}
                    onChange={(event) => setHouseNo(event.target.value)}
                    placeholder="House number"
                    className={selectBase}
                  />
                </div>

                <div>
                  <label className={label}>Street</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(event) => setStreet(event.target.value)}
                    placeholder="Street"
                    className={selectBase}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={label}>Barangay</label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(event) => setBarangay(event.target.value)}
                    placeholder="Barangay"
                    className={selectBase}
                  />
                </div>

                <div>
                  <label className={label}>Municipality</label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(event) => setMunicipality(event.target.value)}
                    placeholder="Municipality"
                    className={selectBase}
                  />
                </div>

                <div>
                  <label className={label}>Province</label>
                  <input
                    type="text"
                    value={province}
                    onChange={(event) => setProvince(event.target.value)}
                    placeholder="Province"
                    className={selectBase}
                  />
                </div>
              </div>
            </section>

            {/* CONTACT DETAILS */}
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <Mail className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Contact details
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Used for sign-in, updates, and booking communication.
                  </p>
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className={label}>Email Address</label>
                  <div className={`${inputWrap} mt-2`}>
                    <Mail className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label className={label}>Phone Number</label>
                  <div className={`${inputWrap} mt-2`}>
                    <Phone className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="09XX XXX XXXX"
                      className={inputBase}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* PROFILE PICTURE */}
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Camera className="h-5 w-5" />
                </div>

                <div>
                  <h3
                    className="text-lg font-black text-slate-950 dark:text-white"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                  >
                    Profile picture
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Optional, but recommended for easy recognition.
                  </p>
                </div>
              </div>

              <div className="flex min-h-44 flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-600 dark:bg-slate-900 sm:flex-row sm:justify-start sm:text-left">
                {profilePicture ? (
                  <img
                    src={URL.createObjectURL(profilePicture)}
                    alt="Profile preview"
                    className="h-24 w-24 shrink-0 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-800"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-3xl font-black text-[#2937f0] ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
                    {firstName ? firstName.charAt(0).toUpperCase() : "?"}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="profile-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#2937f0] shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
                  >
                    <Camera className="h-4 w-4" />
                    Choose photo
                  </label>

                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;

                      if (
                        file &&
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          file.type,
                        )
                      ) {
                        toast.warning(
                          "Please select a JPG, PNG, or WEBP image.",
                        );
                        event.target.value = "";
                        setProfilePicture(null);
                        return;
                      }

                      if (file && file.size > 5 * 1024 * 1024) {
                        toast.warning(
                          "Profile picture must be 5 MB or smaller.",
                        );
                        event.target.value = "";
                        setProfilePicture(null);
                        return;
                      }

                      setProfilePicture(file);
                    }}
                    className="hidden"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    PNG or JPG, up to 5MB.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ACCOUNT SECURITY */}
          <section className="border-t border-slate-200 bg-[linear-gradient(135deg,#eef2ff_0%,#f8fafc_100%)] px-5 py-6 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.18),rgba(15,23,42,.85))] sm:px-7 sm:py-7 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-end">
              <div>
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-[#2937f0] dark:text-indigo-300">
                    <Lock className="h-5 w-5" />
                  </div>

                  <div>
                    <h3
                      className="text-lg font-black text-slate-950 dark:text-white"
                      style={{ fontFamily: "'Sora', sans-serif" }}
                    >
                      Account security
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Create a password with at least 6 characters.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className={label}>Password</label>
                    <div className={`${inputWrap} mt-2`}>
                      <Lock className="h-4.5 w-4.5 shrink-0 text-slate-400" />

                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter password"
                        className={inputBase}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={label}>Confirm Password</label>
                    <div className={`${inputWrap} mt-2`}>
                      <Lock className="h-4.5 w-4.5 shrink-0 text-slate-400" />

                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Confirm password"
                        className={inputBase}
                      />
                    </div>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Use at least 6 characters.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading || pendingRegistration}
                  className="flex min-h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#2937f0] via-[#523cf0] to-[#3784ed] px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading || pendingRegistration
                    ? "Creating Account..."
                    : "Create Customer Account"}
                </button>

                <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
                  Already registered?{" "}
                  <Link
                    to="/"
                    className="font-bold text-[#2937f0] hover:underline dark:text-indigo-400"
                  >
                    Back to login
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>

      <EmailOtpModal
        open={otpModalOpen}
        email={email}
        accountType="customer"
        onClose={() => {
          if (!pendingRegistration) {
            setOtpModalOpen(false);
          }
        }}
        onVerified={() => {
          setOtpModalOpen(false);
          navigate("/", {
            replace: true,
            state: {
              verifiedEmail: email.trim().toLowerCase(),
            },
          });
        }}
      />

      <CaptchaVerificationModal
        open={captchaOpen}
        siteKey={turnstileSiteKey ?? ""}
        widgetKey={captchaWidgetKey}
        processing={pendingRegistration}
        title="Verify before creating your account"
        description="Complete this quick security check to continue with customer registration."
        onClose={() => {
          if (!pendingRegistration) {
            setCaptchaOpen(false);
          }
        }}
        onSuccess={(token) => {
          void completeRegistration(token);
        }}
        onExpire={() => undefined}
        onError={() => {
          setCaptchaWidgetKey((current) => current + 1);
          toast.error("Security verification failed. Please try again.");
        }}
      />
    </main>
  );
}