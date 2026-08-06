import {
  AlertCircle,
  Camera,
  CheckCircle2,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import WorkerLayout from "../../../layouts/WorkerLayout";
import {
  getCurrentProfile,
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type WorkerProfile,
} from "../../../services/profileService";

interface ProfileForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  phone: string;
  address: string;
}

interface FieldErrors {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  suffix?: string;
  phone?: string;
  address?: string;
}

type ProfileMessage = {
  type: "success" | "error";
  text: string;
} | null;

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ADDRESS_LENGTH = 300;

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const EMPTY_FORM: ProfileForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  phone: "",
  address: "",
};

function profileToForm(profile: WorkerProfile): ProfileForm {
  return {
    first_name: profile.first_name ?? "",
    middle_name: profile.middle_name ?? "",
    last_name: profile.last_name ?? "",
    suffix: profile.suffix ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  };
}

function normalizeForm(form: ProfileForm): ProfileForm {
  return {
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    suffix: form.suffix.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
  };
}

function formsEqual(first: ProfileForm, second: ProfileForm): boolean {
  const normalizedFirst = normalizeForm(first);
  const normalizedSecond = normalizeForm(second);

  return (
    normalizedFirst.first_name === normalizedSecond.first_name &&
    normalizedFirst.middle_name === normalizedSecond.middle_name &&
    normalizedFirst.last_name === normalizedSecond.last_name &&
    normalizedFirst.suffix === normalizedSecond.suffix &&
    normalizedFirst.phone === normalizedSecond.phone &&
    normalizedFirst.address === normalizedSecond.address
  );
}

function validateProfile(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};

  const firstName = form.first_name.trim();
  const middleName = form.middle_name.trim();
  const lastName = form.last_name.trim();
  const suffix = form.suffix.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();

  if (!firstName) {
    errors.first_name = "First name is required.";
  } else if (firstName.length > 80) {
    errors.first_name = "First name must contain 80 characters or fewer.";
  }

  if (middleName.length > 80) {
    errors.middle_name = "Middle name must contain 80 characters or fewer.";
  }

  if (!lastName) {
    errors.last_name = "Last name is required.";
  } else if (lastName.length > 80) {
    errors.last_name = "Last name must contain 80 characters or fewer.";
  }

  if (suffix.length > 20) {
    errors.suffix = "Suffix must contain 20 characters or fewer.";
  }

  if (phone) {
    const compact = phone.replace(/[\s()-]/g, "");

    if (!/^\+?\d{7,15}$/.test(compact)) {
      errors.phone = "Enter a valid phone number containing 7 to 15 digits.";
    }
  }

  if (address.length > MAX_ADDRESS_LENGTH) {
    errors.address = `Address must contain ${MAX_ADDRESS_LENGTH} characters or fewer.`;
  }

  return errors;
}

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

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_FORM);

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<ProfileMessage>(null);

  const busy = saving || uploading || removingAvatar;

  const hasUnsavedChanges = useMemo(
    () => editing && !formsEqual(form, savedForm),
    [editing, form, savedForm],
  );

  const fullName = useMemo(() => {
    return [form.first_name, form.middle_name, form.last_name, form.suffix]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" ");
  }, [form.first_name, form.last_name, form.middle_name, form.suffix]);

  const initials = useMemo(() => {
    const first = form.first_name.trim().charAt(0);
    const last = form.last_name.trim().charAt(0);

    return `${first}${last}`.toUpperCase() || "W";
  }, [form.first_name, form.last_name]);

  const loadProfile = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setMessage(null);

      const data = await getCurrentProfile();
      const nextForm = profileToForm(data);

      setProfile(data);
      setForm(nextForm);
      setSavedForm(nextForm);
      setEditing(false);
      setFieldErrors({});
    } catch (error) {
      setProfile(null);
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to load your profile."),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!message || message.type !== "success") {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 4_000);

    return () => window.clearTimeout(timer);
  }, [message]);

  const updateFormField = useCallback(
    (field: keyof ProfileForm, value: string) => {
      setForm((current) => ({
        ...current,
        [field]: value,
      }));

      setFieldErrors((current) => ({
        ...current,
        [field]: undefined,
      }));

      setMessage(null);
    },
    [],
  );

  const cancelEditing = useCallback(async (): Promise<void> => {
    if (!profile || busy) {
      return;
    }

    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Discard your unsaved profile changes?");

      if (!confirmed) {
        return;
      }
    }

    setForm(savedForm);
    setFieldErrors({});
    setMessage(null);
    setEditing(false);
  }, [busy, hasUnsavedChanges, profile, savedForm]);

  const handleEditToggle = useCallback(async (): Promise<void> => {
    if (busy || !profile) {
      return;
    }

    if (editing) {
      await cancelEditing();
      return;
    }

    setMessage(null);
    setFieldErrors({});
    setEditing(true);
  }, [busy, cancelEditing, editing, profile]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!profile || saving || !hasUnsavedChanges) {
      return;
    }

    const errors = validateProfile(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage({
        type: "error",
        text: "Please correct the highlighted fields.",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const normalized = normalizeForm(form);

      const updated = await updateProfile(profile.id, normalized);

      const nextForm = profileToForm(updated);

      setProfile(updated);
      setForm(nextForm);
      setSavedForm(nextForm);
      setFieldErrors({});
      setEditing(false);
      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to update your profile."),
      });
    } finally {
      setSaving(false);
    }
  }, [form, hasUnsavedChanges, profile, saving]);

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file || !profile || busy) {
        return;
      }

      setMessage(null);

      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        setMessage({
          type: "error",
          text: "Please upload a JPG, PNG, or WEBP image.",
        });
        return;
      }

      if (file.size <= 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
        setMessage({
          type: "error",
          text: "Profile image must be a non-empty file no larger than 5 MB.",
        });
        return;
      }

      try {
        setUploading(true);

        const url = await uploadAvatar(profile.id, file);

        const updatedProfile = {
          ...profile,
          profile_picture: url,
        };

        setProfile(updatedProfile);
        setMessage({
          type: "success",
          text: "Profile picture updated successfully.",
        });
      } catch (error) {
        setMessage({
          type: "error",
          text: getErrorMessage(
            error,
            "Unable to upload your profile picture.",
          ),
        });
      } finally {
        setUploading(false);
      }
    },
    [busy, profile],
  );

  const handleRemoveAvatar = useCallback(async (): Promise<void> => {
    if (!profile?.profile_picture || busy) {
      return;
    }

    const confirmed = window.confirm("Remove your current profile picture?");

    if (!confirmed) {
      return;
    }

    try {
      setRemovingAvatar(true);
      setMessage(null);

      await removeAvatar(profile.id, profile.profile_picture);

      setProfile({
        ...profile,
        profile_picture: null,
      });

      setMessage({
        type: "success",
        text: "Profile picture removed successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Unable to remove your profile picture."),
      });
    } finally {
      setRemovingAvatar(false);
    }
  }, [busy, profile]);

  if (loading) {
    return (
      <WorkerLayout>
        <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="relative mx-auto max-w-5xl">
          <section className="animate-pulse overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 sm:h-56" />

            <div className="p-5 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="h-28 w-28 rounded-3xl bg-slate-200 dark:bg-slate-700 sm:h-32 sm:w-32" />

                <div className="space-y-3">
                  <div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 rounded-xl bg-slate-200 dark:bg-slate-700"
                  />
                ))}
              </div>

              <div className="mt-4 h-28 rounded-xl bg-slate-200 dark:bg-slate-700" />
            </div>
          </section>
          </div>
        </main>
      </WorkerLayout>
    );
  }

  if (!profile) {
    return (
      <WorkerLayout>
        <main className="relative min-h-screen overflow-hidden bg-slate-50 p-4 sm:p-6 lg:p-8 dark:bg-slate-950">
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
            style={{
              backgroundImage:
                "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div className="relative mx-auto max-w-3xl">
          <section className="rounded-[1.75rem] border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900 sm:p-8">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
              Unable to load profile
            </h1>

            <p className="mt-3 text-sm text-red-700 dark:text-red-300">
              {message?.text || "Your profile could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </section>
          </div>
        </main>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 pb-28 sm:p-5 sm:pb-10 lg:p-8 dark:bg-slate-950">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]"
          style={{
            backgroundImage:
              "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="relative mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <header className="relative overflow-hidden bg-linear-to-br from-blue-800 via-blue-700 to-cyan-500 px-5 py-7 text-white sm:px-8 sm:py-10 lg:px-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "38px 38px",
              }}
            />
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10">
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-blue-100 backdrop-blur">
                Worker Account
              </p>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                My Profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
                Keep your personal and contact information accurate so customers
                can identify and reach you.
              </p>
            </div>
          </header>

          <div className="p-4 sm:p-7 lg:p-8">
            {message && (
              <div
                role={message.type === "error" ? "alert" : "status"}
                className={`mb-6 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold shadow-sm ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                }`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  {message.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}

                  <span className="min-w-0 leading-6">{message.text}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setMessage(null)}
                  className="shrink-0 rounded-lg p-1.5 transition hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Dismiss message"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <section className="flex flex-col gap-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row">
                <div className="relative z-10">
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={`${fullName || "Worker"} profile`}
                      className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-xl ring-2 ring-blue-100 sm:h-32 sm:w-32 dark:border-slate-900 dark:ring-blue-500/30"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-blue-100 text-3xl font-black text-blue-700 shadow-xl ring-2 ring-blue-100 sm:h-32 sm:w-32 sm:text-4xl dark:border-slate-900 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30">
                      {initials}
                    </div>
                  )}

                  {busy && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-slate-900/65 px-2 text-center text-xs font-bold text-white backdrop-blur-sm">
                      {uploading
                        ? "Uploading..."
                        : removingAvatar
                          ? "Removing..."
                          : "Saving..."}
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-black text-slate-900 sm:text-2xl dark:text-white">
                    {fullName || "Worker Profile"}
                  </h2>

                  <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                    {profile.email || "No email available"}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => void handleUpload(event)}
                    disabled={busy}
                    className="sr-only"
                  />

                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                    >
                      <Camera className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Change Photo"}
                    </button>

                    {profile.profile_picture && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveAvatar()}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    JPG, PNG, or WEBP. Maximum: 5 MB.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleEditToggle()}
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 sm:w-auto"
              >
                {editing ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel Editing
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </button>
            </section>

            <section className="mt-7 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-black text-slate-900 dark:text-white">
                    Personal Information
                  </h3>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your basic identity and contact details.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 sm:gap-5">
                <ProfileField
                  label="First Name"
                  required
                  value={form.first_name}
                  disabled={!editing || saving}
                  error={fieldErrors.first_name}
                  placeholder="First Name"
                  onChange={(value) => updateFormField("first_name", value)}
                />

                <ProfileField
                  label="Middle Name"
                  value={form.middle_name}
                  disabled={!editing || saving}
                  error={fieldErrors.middle_name}
                  placeholder="Middle Name"
                  onChange={(value) => updateFormField("middle_name", value)}
                />

                <ProfileField
                  label="Last Name"
                  required
                  value={form.last_name}
                  disabled={!editing || saving}
                  error={fieldErrors.last_name}
                  placeholder="Last Name"
                  onChange={(value) => updateFormField("last_name", value)}
                />

                <ProfileField
                  label="Suffix"
                  value={form.suffix}
                  disabled={!editing || saving}
                  error={fieldErrors.suffix}
                  placeholder="Jr., Sr., III"
                  onChange={(value) => updateFormField("suffix", value)}
                />

                <ProfileField
                  label="Email Address"
                  type="email"
                  value={profile.email ?? ""}
                  disabled
                  placeholder="Email Address"
                  helper="Email changes are managed through account security."
                />

                <ProfileField
                  label="Phone Number"
                  type="tel"
                  value={form.phone}
                  disabled={!editing || saving}
                  error={fieldErrors.phone}
                  placeholder="+63 912 345 6789"
                  onChange={(value) => updateFormField("phone", value)}
                />
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Address
                </span>

                <textarea
                  disabled={!editing || saving}
                  value={form.address}
                  maxLength={MAX_ADDRESS_LENGTH}
                  onChange={(event) =>
                    updateFormField("address", event.target.value)
                  }
                  className={`min-h-28 w-full resize-y rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 ${
                    fieldErrors.address
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-950"
                      : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:ring-blue-500/10"
                  }`}
                  rows={4}
                  placeholder="Complete Address"
                  aria-invalid={Boolean(fieldErrors.address)}
                />

                <div className="mt-2 flex items-center justify-between gap-4">
                  {fieldErrors.address ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {fieldErrors.address}
                    </p>
                  ) : (
                    <span />
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {form.address.length}/{MAX_ADDRESS_LENGTH}
                  </p>
                </div>
              </label>
            </section>

            <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <LockKeyhole className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white">
                      Account Security
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Update your password from the worker settings page.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/worker/settings")}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Open Settings
                </button>
              </div>
            </section>

            {editing && (
              <div className="mt-8 hidden flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex sm:flex-row sm:justify-end dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => void cancelEditing()}
                  disabled={saving}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={
                    saving || uploading || removingAvatar || !hasUnsavedChanges
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </section>

        {editing && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:hidden dark:border-slate-700 dark:bg-slate-900/95">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void cancelEditing()}
                disabled={saving}
                className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={
                  saving || uploading || removingAvatar || !hasUnsavedChanges
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
        </div>
      </main>
    </WorkerLayout>
  );
}

function ProfileField({
  label,
  required = false,
  type = "text",
  value,
  disabled,
  error,
  helper,
  placeholder,
  onChange,
}: {
  label: string;
  required?: boolean;
  type?: "text" | "email" | "tel";
  value: string;
  disabled: boolean;
  error?: string;
  helper?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={`w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-950"
            : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:ring-blue-500/10"
        }`}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />

      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      ) : null}
    </label>
  );
}