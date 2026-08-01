import { useEffect, useMemo, useState } from "react";
import {
  AtSign,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Home,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useRegisterStore } from "../../../store/registerStore";

const MUNICIPALITIES = [
  "Alaminos",
  "Bay",
  "Biñan City",
  "Cabuyao City",
  "Calamba City",
  "Calauan",
  "Los Baños",
  "San Pablo City",
  "San Pedro City",
  "Santa Rosa City",
  "Santa Cruz",
  "Victoria",
];

const PROVINCES = ["Laguna", "Batangas", "Cavite", "Rizal"];

const RELIGIONS = [
  "Roman Catholic",
  "Christian",
  "Born Again Christian",
  "Iglesia ni Cristo",
  "Islam",
  "Seventh-day Adventist",
  "Jehovah's Witness",
  "Buddhist",
  "Others",
];

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

const inputWithIconClass =
  "h-12 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";

const inputShellClass =
  "flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-900";

const labelClass =
  "mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200";

interface SectionHeaderProps {
  icon: typeof UserRound;
  title: string;
  description: string;
  tone: "blue" | "emerald" | "amber" | "violet";
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  tone,
}: SectionHeaderProps) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  };

  return (
    <div className="mb-6 flex items-start gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <h3
          className="text-lg font-black text-slate-950 dark:text-white"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function PersonalInformation() {
  const { data, updateData } = useRegisterStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const profilePreview = useMemo(() => {
    if (!data.profilePicture) return "";

    return URL.createObjectURL(data.profilePicture);
  }, [data.profilePicture]);

  useEffect(() => {
    return () => {
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview);
      }
    };
  }, [profilePreview]);

  const initials =
    `${data.firstName?.charAt(0) ?? ""}${data.lastName?.charAt(0) ?? ""}`
      .toUpperCase()
      .trim() || "?";

  const passwordChecks = useMemo(
    () => [
      {
        label: "At least 8 characters",
        valid: data.password.length >= 8,
      },
      {
        label: "One uppercase letter",
        valid: /[A-Z]/.test(data.password),
      },
      {
        label: "One lowercase letter",
        valid: /[a-z]/.test(data.password),
      },
      {
        label: "One number",
        valid: /\d/.test(data.password),
      },
      {
        label: "One special character",
        valid: /[@$!%*?&#^()_\-+=]/.test(data.password),
      },
    ],
    [data.password],
  );

  const passedPasswordChecks = passwordChecks.filter(
    (rule) => rule.valid,
  ).length;

  const passwordIsValid =
    passwordChecks.length > 0 &&
    passedPasswordChecks === passwordChecks.length;

  const confirmPasswordStarted = data.confirmPassword.length > 0;

  const passwordsMatch =
    confirmPasswordStarted && data.password === data.confirmPassword;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
      {/* Static design background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#2937f0 1px,transparent 1px),linear-gradient(90deg,#2937f0 1px,transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-300/15 blur-3xl dark:bg-indigo-700/10"
      />

      {/* Header */}
      <div className="relative z-10 border-b border-slate-200 bg-[linear-gradient(135deg,#f8faff_0%,#eef3ff_100%)] px-5 py-6 dark:border-slate-700 dark:bg-[linear-gradient(135deg,#111827_0%,#172033_100%)] sm:px-7 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-600 shadow-sm dark:border-indigo-500/20 dark:bg-slate-800/80 dark:text-indigo-300">
              <Sparkles className="h-4 w-4" />
              Step 1 · Personal profile
            </div>

            <h2
              className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Personal Information
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add your identity, contact information, address, and account
              credentials. These details will be used for your worker profile
              and verification.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Secure information
          </div>
        </div>
      </div>

      <div className="relative z-10 grid gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        {/* PROFILE PHOTO */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6 lg:col-span-2">
          <SectionHeader
            icon={Camera}
            title="Profile picture"
            description="Add a clear photo so customers and administrators can recognize you."
            tone="violet"
          />

          <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center dark:border-slate-600 dark:bg-slate-900 sm:flex-row sm:text-left">
            {profilePreview ? (
              <img
                src={profilePreview}
                alt="Profile preview"
                className="h-24 w-24 shrink-0 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-800"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-3xl font-black text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
                {initials}
              </div>
            )}

            <div className="flex-1">
              <label
                htmlFor="worker-profile-picture"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
              >
                <Camera className="h-4 w-4" />
                Choose profile photo
              </label>

              <input
                id="worker-profile-picture"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  updateData({
                    profilePicture: event.target.files?.[0] ?? null,
                  })
                }
                className="hidden"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Optional. Use a clear JPG or PNG image, preferably square.
              </p>

              {data.profilePicture && (
                <p className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-300 sm:justify-start">
                  <CheckCircle2 className="h-4 w-4" />
                  {data.profilePicture.name}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* IDENTITY */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
          <SectionHeader
            icon={UserRound}
            title="Identity details"
            description="Enter your complete legal name and personal information."
            tone="blue"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="worker-first-name" className={labelClass}>
                First name
              </label>

              <div className={inputShellClass}>
                <UserRound className="h-4.5 w-4.5 shrink-0 text-slate-400" />
                <input
                  id="worker-first-name"
                  value={data.firstName}
                  onChange={(event) =>
                    updateData({ firstName: event.target.value })
                  }
                  placeholder="Enter first name"
                  autoComplete="given-name"
                  className={inputWithIconClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="worker-middle-name" className={labelClass}>
                Middle name{" "}
                <span className="font-medium text-slate-400">(optional)</span>
              </label>

              <input
                id="worker-middle-name"
                value={data.middleName}
                onChange={(event) =>
                  updateData({ middleName: event.target.value })
                }
                placeholder="Enter middle name"
                autoComplete="additional-name"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="worker-last-name" className={labelClass}>
                Last name
              </label>

              <input
                id="worker-last-name"
                value={data.lastName}
                onChange={(event) =>
                  updateData({ lastName: event.target.value })
                }
                placeholder="Enter last name"
                autoComplete="family-name"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="worker-suffix" className={labelClass}>
                Suffix{" "}
                <span className="font-medium text-slate-400">(optional)</span>
              </label>

              <div className="relative">
                <select
                  id="worker-suffix"
                  value={data.suffix}
                  onChange={(event) =>
                    updateData({ suffix: event.target.value })
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="">Select suffix</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="worker-birth-date" className={labelClass}>
                Birth date
              </label>

              <div className="relative">
                <DatePicker
                  id="worker-birth-date"
                  selected={data.birthDate ? new Date(data.birthDate) : null}
                  onChange={(date: Date | null) =>
                    updateData({
                      birthDate: date
                        ? date.toISOString().split("T")[0]
                        : "",
                    })
                  }
                  dateFormat="dd/MM/yyyy"
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={100}
                  maxDate={new Date()}
                  placeholderText="DD/MM/YYYY"
                  wrapperClassName="w-full"
                  className={`${inputClass} pr-11`}
                />

                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="worker-gender" className={labelClass}>
                Gender
              </label>

              <div className="relative">
                <select
                  id="worker-gender"
                  value={data.gender}
                  onChange={(event) =>
                    updateData({ gender: event.target.value })
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="worker-civil-status" className={labelClass}>
                Civil status
              </label>

              <div className="relative">
                <select
                  id="worker-civil-status"
                  value={data.civilStatus}
                  onChange={(event) =>
                    updateData({ civilStatus: event.target.value })
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="">Select civil status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="worker-religion" className={labelClass}>
                Religion
              </label>

              <div className="relative">
                <select
                  id="worker-religion"
                  value={data.religion}
                  onChange={(event) =>
                    updateData({ religion: event.target.value })
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="">Select religion</option>

                  {RELIGIONS.map((religion) => (
                    <option key={religion} value={religion}>
                      {religion}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6">
          <SectionHeader
            icon={AtSign}
            title="Contact details"
            description="Used for account access, application updates, and customer communication."
            tone="emerald"
          />

          <div className="grid gap-5">
            <div>
              <label htmlFor="worker-phone" className={labelClass}>
                Phone number
              </label>

              <div className={inputShellClass}>
                <Phone className="h-4.5 w-4.5 shrink-0 text-slate-400" />

                <input
                  id="worker-phone"
                  value={data.phone}
                  onChange={(event) =>
                    updateData({ phone: event.target.value })
                  }
                  placeholder="09XX XXX XXXX"
                  inputMode="tel"
                  autoComplete="tel"
                  className={inputWithIconClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="worker-email" className={labelClass}>
                Email address
              </label>

              <div className={inputShellClass}>
                <Mail className="h-4.5 w-4.5 shrink-0 text-slate-400" />

                <input
                  id="worker-email"
                  type="email"
                  value={data.email}
                  onChange={(event) =>
                    updateData({ email: event.target.value })
                  }
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className={inputWithIconClass}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

              <p>
                Make sure your phone number and email are active. Important
                updates about your application may be sent through these
                channels.
              </p>
            </div>
          </div>
        </section>

        {/* ADDRESS */}
        <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50/75 p-5 dark:border-slate-700 dark:bg-slate-800/45 sm:p-6 lg:col-span-2">
          <SectionHeader
            icon={MapPin}
            title="Residential address"
            description="Your location helps the platform connect you with nearby livelihood opportunities."
            tone="amber"
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="worker-house-no" className={labelClass}>
                House number
              </label>

              <div className={inputShellClass}>
                <Home className="h-4.5 w-4.5 shrink-0 text-slate-400" />

                <input
                  id="worker-house-no"
                  value={data.houseNo}
                  onChange={(event) =>
                    updateData({ houseNo: event.target.value })
                  }
                  placeholder="House no."
                  autoComplete="address-line1"
                  className={inputWithIconClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="worker-street" className={labelClass}>
                Street
              </label>

              <input
                id="worker-street"
                value={data.street}
                onChange={(event) =>
                  updateData({ street: event.target.value })
                }
                placeholder="Street name"
                autoComplete="address-line2"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="worker-barangay" className={labelClass}>
                Barangay
              </label>

              <input
                id="worker-barangay"
                value={data.barangay}
                onChange={(event) =>
                  updateData({ barangay: event.target.value })
                }
                placeholder="Barangay"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-1 lg:col-span-2">
              <label htmlFor="worker-municipality" className={labelClass}>
                Municipality / city
              </label>

              <div className="relative">
                <select
                  id="worker-municipality"
                  value={data.municipality}
                  onChange={(event) =>
                    updateData({ municipality: event.target.value })
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  <option value="">Select municipality / city</option>

                  {MUNICIPALITIES.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="worker-province" className={labelClass}>
                Province
              </label>

              <div className="relative">
                <select
                  id="worker-province"
                  value={data.province}
                  onChange={(event) =>
                    updateData({ province: event.target.value })
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </section>

        {/* PASSWORD */}
        <section className="rounded-[1.5rem] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#f8faff_100%)] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(135deg,rgba(49,46,129,.17),rgba(15,23,42,.9))] sm:p-6 lg:col-span-2">
          <SectionHeader
            icon={LockKeyhole}
            title="Account security"
            description="Create a strong password to protect your worker account."
            tone="violet"
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="worker-password" className={labelClass}>
                Password
              </label>

              <div
                className={`${inputShellClass} ${
                  passwordIsValid
                    ? "border-emerald-400 ring-4 ring-emerald-500/10 dark:border-emerald-500"
                    : ""
                }`}
              >
                <KeyRound
                  className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    passwordIsValid
                      ? "text-emerald-500"
                      : "text-slate-400"
                  }`}
                />

                <input
                  id="worker-password"
                  type={showPassword ? "text" : "password"}
                  value={data.password}
                  onChange={(event) =>
                    updateData({ password: event.target.value })
                  }
                  placeholder="Enter password"
                  autoComplete="new-password"
                  className={inputWithIconClass}
                />

                {passwordIsValid && (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-500"
                    aria-label="Password meets all requirements"
                  />
                )}

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>

              <div
                className={`mt-3 rounded-xl border p-3 transition-colors ${
                  passwordIsValid
                    ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                    : "border-indigo-100 bg-white/70 dark:border-indigo-500/15 dark:bg-slate-900/50"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p
                    className={`text-xs font-bold ${
                      passwordIsValid
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Password strength
                  </p>

                  <p
                    className={`text-xs font-black ${
                      passwordIsValid
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-indigo-600 dark:text-indigo-300"
                    }`}
                  >
                    {passedPasswordChecks}/{passwordChecks.length}
                  </p>
                </div>

                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {passwordChecks.map((rule) => (
                    <span
                      key={rule.label}
                      className={`h-1.5 rounded-full transition-colors duration-200 ${
                        rule.valid
                          ? "bg-emerald-500"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>

                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  {passwordChecks.map((rule) => (
                    <p
                      key={rule.label}
                      className={`flex items-center gap-2 transition-colors ${
                        rule.valid
                          ? "font-semibold text-emerald-600 dark:text-emerald-300"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {rule.valid ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}

                      {rule.label}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="worker-confirm-password" className={labelClass}>
                Confirm password
              </label>

              <div
                className={`${inputShellClass} ${
                  passwordsMatch
                    ? "border-emerald-400 ring-4 ring-emerald-500/10 dark:border-emerald-500"
                    : confirmPasswordStarted
                      ? "border-rose-400 ring-4 ring-rose-500/10 dark:border-rose-500"
                      : ""
                }`}
              >
                <LockKeyhole
                  className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    passwordsMatch
                      ? "text-emerald-500"
                      : confirmPasswordStarted
                        ? "text-rose-500"
                        : "text-slate-400"
                  }`}
                />

                <input
                  id="worker-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={data.confirmPassword}
                  onChange={(event) =>
                    updateData({ confirmPassword: event.target.value })
                  }
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className={inputWithIconClass}
                />

                {passwordsMatch && (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-500"
                    aria-label="Passwords match"
                  />
                )}

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>

              <div
                className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 transition-colors ${
                  passwordsMatch
                    ? "border-emerald-200 bg-emerald-50/80 font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : confirmPasswordStarted
                      ? "border-rose-200 bg-rose-50/80 font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                      : "border-transparent text-slate-500 dark:text-slate-400"
                }`}
              >
                {passwordsMatch ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <UsersRound
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      confirmPasswordStarted
                        ? "text-rose-500"
                        : "text-indigo-500"
                    }`}
                  />
                )}

                <p>
                  {passwordsMatch
                    ? "Passwords match. Your account credentials are ready."
                    : confirmPasswordStarted
                      ? "Passwords do not match yet."
                      : "Enter the exact same password to confirm your account credentials."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}