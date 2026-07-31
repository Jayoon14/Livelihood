import {
  Award,
  BriefcaseBusiness,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import {
  changePassword,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  validatePassword,
  type UpdateProfileRequest,
} from "../../../services/profileService";
import { useProfile } from "../../../context/ProfileContext";

interface CustomerProfileDraft {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  phone: string;
  address: string;
}

interface CustomerProfileStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  reviewsGiven: number;
  totalSpent: number;
}

const EMPTY_STATS: CustomerProfileStats = {
  totalBookings: 0,
  completedBookings: 0,
  cancelledBookings: 0,
  reviewsGiven: 0,
  totalSpent: 0,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function initials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";

  return `${first}${last}`.toUpperCase() || "CU";
}

function makeDraft(profile: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  phone?: string | null;
  address?: string | null;
}): CustomerProfileDraft {
  return {
    first_name: profile.first_name ?? "",
    middle_name: profile.middle_name ?? "",
    last_name: profile.last_name ?? "",
    suffix: profile.suffix ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  };
}

export default function Profile() {
  return (
    <CustomerLayout>
      <ProfileContent />
    </CustomerLayout>
  );
}

function ProfileContent() {
  const { profile, setProfile, refreshProfile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<CustomerProfileDraft | null>(null);
  const [stats, setStats] = useState<CustomerProfileStats>(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!profile) {
      void refreshProfile();
    }
  }, [profile, refreshProfile]);

  useEffect(() => {
    if (profile) {
      setDraft(makeDraft(profile));
      void loadProfileStats(profile.id);
    }
  }, [profile?.id]);

  const fullName = useMemo(() => {
    if (!profile) {
      return "Customer";
    }

    return [
      profile.first_name,
      profile.middle_name,
      profile.last_name,
      profile.suffix,
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(" ");
  }, [profile]);

  const profileCompletion = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const values = [
      profile.first_name,
      profile.last_name,
      profile.email,
      profile.phone,
      profile.address,
      profile.profile_picture,
    ];

    const completed = values.filter((value) => Boolean(value?.trim())).length;

    return Math.round((completed / values.length) * 100);
  }, [profile]);

  async function loadProfileStats(customerId: string): Promise<void> {
    setLoadingStats(true);

    try {
      const [bookingsResult, reviewsResult, paymentsResult] =
        await Promise.allSettled([
          supabase
            .from("bookings")
            .select("id,status,completion_status", { count: "exact" })
            .eq("customer_id", customerId),
          supabase
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", customerId),
          supabase
            .from("payments")
            .select("amount,payment_status,customer_id")
            .eq("customer_id", customerId),
        ]);

      let nextStats = { ...EMPTY_STATS };

      if (bookingsResult.status === "fulfilled") {
        const { data, count, error } = bookingsResult.value;

        if (!error) {
          const rows = data ?? [];

          nextStats.totalBookings = count ?? rows.length;
          nextStats.completedBookings = rows.filter((booking) => {
            const status = normalizeStatus(booking.status);
            const completionStatus = normalizeStatus(
              booking.completion_status,
            );

            return (
              status === "completed" ||
              completionStatus === "completed" ||
              completionStatus === "customer confirmed"
            );
          }).length;
          nextStats.cancelledBookings = rows.filter(
            (booking) =>
              normalizeStatus(booking.status) === "cancelled" ||
              normalizeStatus(booking.status) === "rejected",
          ).length;
        }
      }

      if (reviewsResult.status === "fulfilled") {
        const { count, error } = reviewsResult.value;

        if (!error) {
          nextStats.reviewsGiven = count ?? 0;
        }
      }

      if (paymentsResult.status === "fulfilled") {
        const { data, error } = paymentsResult.value;

        if (!error) {
          nextStats.totalSpent = (data ?? []).reduce((sum, payment) => {
            const status = normalizeStatus(payment.payment_status);

            if (status !== "paid" && status !== "completed") {
              return sum;
            }

            const amount = Number(payment.amount);

            return Number.isFinite(amount) ? sum + amount : sum;
          }, 0);
        }
      }

      setStats(nextStats);
    } catch (error) {
      console.error("Unable to load customer profile statistics:", error);
    } finally {
      setLoadingStats(false);
    }
  }

  function updateDraft(
    field: keyof CustomerProfileDraft,
    value: string,
  ): void {
    setDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  function handleCancelEdit(): void {
    if (profile) {
      setDraft(makeDraft(profile));
    }

    setEditing(false);
  }

  async function handleSave(event?: FormEvent): Promise<void> {
    event?.preventDefault();

    if (!profile || !draft || saving) {
      return;
    }

    const firstName = draft.first_name.trim();
    const lastName = draft.last_name.trim();

    if (!firstName || !lastName) {
      toast.error("First name and last name are required.");
      return;
    }

    const updates: UpdateProfileRequest = {
      first_name: firstName,
      middle_name: draft.middle_name.trim() || null,
      last_name: lastName,
      suffix: draft.suffix.trim() || null,
      phone: draft.phone.trim() || null,
      address: draft.address.trim() || null,
    };

    try {
      setSaving(true);

      const updatedProfile = await updateProfile(profile.id, updates);

      setProfile({
        ...profile,
        ...updatedProfile,
      });

      setDraft(makeDraft(updatedProfile));
      setEditing(false);
      toast.success("Profile updated successfully.");
    } catch (error) {
      console.error("Unable to update profile:", error);
      toast.error(getErrorMessage(error, "Unable to update profile."));
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !profile || uploading) {
      return;
    }

    try {
      setUploading(true);

      const url = await uploadAvatar(profile.id, file);

      setProfile({
        ...profile,
        profile_picture: url,
      });

      toast.success("Profile picture updated.");
    } catch (error) {
      console.error("Unable to upload profile picture:", error);
      toast.error(
        getErrorMessage(error, "Unable to upload profile picture."),
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar(): Promise<void> {
    if (
      !profile ||
      !profile.profile_picture ||
      removingAvatar
    ) {
      return;
    }

    try {
      setRemovingAvatar(true);

      await removeAvatar(profile.id, profile.profile_picture);

      setProfile({
        ...profile,
        profile_picture: null,
      });

      toast.success("Profile picture removed.");
    } catch (error) {
      console.error("Unable to remove profile picture:", error);
      toast.error(
        getErrorMessage(error, "Unable to remove profile picture."),
      );
    } finally {
      setRemovingAvatar(false);
    }
  }

  if (!profile || !draft) {
    return <ProfileSkeleton />;
  }

  const statCards = [
    {
      label: "Total Bookings",
      value: stats.totalBookings.toLocaleString(),
      icon: BriefcaseBusiness,
      iconClass: "bg-blue-100 text-blue-700",
    },
    {
      label: "Completed",
      value: stats.completedBookings.toLocaleString(),
      icon: CalendarCheck2,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      label: "Cancelled",
      value: stats.cancelledBookings.toLocaleString(),
      icon: XCircle,
      iconClass: "bg-rose-100 text-rose-700",
    },
    {
      label: "Reviews Given",
      value: stats.reviewsGiven.toLocaleString(),
      icon: Star,
      iconClass: "bg-amber-100 text-amber-700",
    },
    {
      label: "Total Spent",
      value: formatCurrency(stats.totalSpent),
      icon: CircleDollarSign,
      iconClass: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-375 space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-200/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              <div className="relative">
                {profile.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt={`${fullName} profile`}
                    className="h-28 w-28 rounded-3xl border-4 border-white/80 object-cover shadow-xl sm:h-32 sm:w-32"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white/80 bg-white/20 text-3xl font-black shadow-xl backdrop-blur sm:h-32 sm:w-32">
                    {initials(profile.first_name, profile.last_name)}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-blue-600 bg-white text-blue-700 shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Upload profile picture"
                >
                  {uploading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void handleUpload(event)}
                  className="hidden"
                />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                    Customer Profile
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-50 backdrop-blur">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified Customer
                  </span>
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {fullName}
                </h1>

                <p className="mt-2 flex items-center justify-center gap-2 text-sm text-blue-50 sm:justify-start">
                  <Mail className="h-4 w-4" />
                  {profile.email || "No email available"}
                </p>
              </div>
            </div>

            <div className="min-w-64 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-50">
                  Profile completion
                </span>
                <span className="font-bold">{profileCompletion}%</span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-blue-100">
                Complete your contact details and profile photo to help
                workers recognize you.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="flex min-h-32 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">
                    {item.label}
                  </p>

                  {loadingStats ? (
                    <div className="mt-2 h-7 w-20 animate-pulse rounded bg-slate-200" />
                  ) : (
                    <p className="mt-1 truncate text-2xl font-black text-slate-900">
                      {item.value}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
          <form
            onSubmit={(event) => void handleSave(event)}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <header className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <UserRound className="h-5 w-5 text-blue-600" />
                  Personal Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage the details used for your bookings and account.
                </p>
              </div>

              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </header>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-7">
              <ProfileField
                label="First Name"
                value={draft.first_name}
                disabled={!editing}
                required
                icon={UserRound}
                onChange={(value) => updateDraft("first_name", value)}
              />

              <ProfileField
                label="Middle Name"
                value={draft.middle_name}
                disabled={!editing}
                icon={UserRound}
                onChange={(value) => updateDraft("middle_name", value)}
              />

              <ProfileField
                label="Last Name"
                value={draft.last_name}
                disabled={!editing}
                required
                icon={UserRound}
                onChange={(value) => updateDraft("last_name", value)}
              />

              <ProfileField
                label="Suffix"
                value={draft.suffix}
                disabled={!editing}
                icon={Award}
                placeholder="Jr., Sr., III"
                onChange={(value) => updateDraft("suffix", value)}
              />

              <ProfileField
                label="Email Address"
                value={profile.email ?? ""}
                disabled
                icon={Mail}
                helperText="Email changes require account verification."
              />

              <ProfileField
                label="Phone Number"
                value={draft.phone}
                disabled={!editing}
                icon={Phone}
                placeholder="+63 9XX XXX XXXX"
                onChange={(value) => updateDraft("phone", value)}
              />

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />

                  <textarea
                    value={draft.address}
                    disabled={!editing}
                    onChange={(event) =>
                      updateDraft("address", event.target.value)
                    }
                    rows={4}
                    maxLength={300}
                    placeholder="Enter your complete address"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
                  />
                </div>

                {editing && (
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {draft.address.length}/300
                  </p>
                )}
              </div>
            </div>

            {editing && (
              <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </footer>
            )}
          </form>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Camera className="h-5 w-5 text-blue-600" />
                Profile Photo
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use a clear photo so service workers can identify you during
                appointments.
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload New Photo"}
                </button>

                {profile.profile_picture && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={removingAvatar}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    {removingAvatar ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {removingAvatar ? "Removing..." : "Remove Photo"}
                  </button>
                )}
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Accepted formats: JPG, PNG, and WEBP. Maximum size: 5 MB.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <LockKeyhole className="h-5 w-5 text-violet-600" />
                Account Security
              </h2>

              <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Account protected
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                      Your password is securely managed through Supabase
                      Authentication.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <KeyRound className="h-4 w-4" />
                Change Password
              </button>
            </section>
          </aside>
        </div>
      </div>

      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  disabled: boolean;
  icon: typeof UserRound;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  onChange?: (value: string) => void;
}

function ProfileField({
  label,
  value,
  disabled,
  icon: Icon,
  required = false,
  placeholder,
  helperText,
  onChange,
}: ProfileFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>

      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          type="text"
          value={value}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
        />
      </div>

      {helperText && (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}

interface PasswordModalProps {
  onClose: () => void;
}

function PasswordModal({ onClose }: PasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);

  const validation = useMemo(
    () => validatePassword(password),
    [password],
  );

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!validation.valid) {
      toast.error(validation.errors[0] ?? "Enter a stronger password.");
      return;
    }

    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      await changePassword(password);
      toast.success("Password updated successfully.");
      onClose();
    } catch (error) {
      console.error("Unable to change password:", error);
      toast.error(getErrorMessage(error, "Unable to change password."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Change Password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a strong password for your account.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close password dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 p-6">
          <PasswordField
            label="New Password"
            value={password}
            visible={showPassword}
            onChange={setPassword}
            onToggle={() => setShowPassword((current) => !current)}
          />

          <PasswordField
            label="Confirm New Password"
            value={confirmation}
            visible={showConfirmation}
            onChange={setConfirmation}
            onToggle={() =>
              setShowConfirmation((current) => !current)
            }
          />

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Password requirements
            </p>

            <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
              <li>• At least 8 characters</li>
              <li>• At least one uppercase letter</li>
              <li>• At least one lowercase letter</li>
              <li>• At least one number</li>
            </ul>
          </div>
        </div>

        <footer className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {saving ? "Updating..." : "Update Password"}
          </button>
        </footer>
      </form>
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}

function PasswordField({
  label,
  value,
  visible,
  onChange,
  onToggle,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-full bg-slate-50/80 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-375 space-y-6">
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
          <div className="h-155 animate-pulse rounded-3xl bg-slate-200" />
          <div className="space-y-6">
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}