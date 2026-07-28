import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
} from "../../../services/profileService";

interface WorkerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  profile_picture: string | null;
}

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
}

interface FieldErrors {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function normalizeProfile(value: unknown): WorkerProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const profile = value as Record<string, unknown>;

  if (typeof profile.id !== "string") {
    return null;
  }

  const stringOrNull = (field: unknown): string | null =>
    typeof field === "string" ? field : null;

  return {
    id: profile.id,
    first_name: stringOrNull(profile.first_name),
    last_name: stringOrNull(profile.last_name),
    email: stringOrNull(profile.email),
    phone: stringOrNull(profile.phone),
    address: stringOrNull(profile.address),
    profile_picture: stringOrNull(profile.profile_picture),
  };
}

function profileToForm(profile: WorkerProfile): ProfileForm {
  return {
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  };
}

function validateProfile(form: ProfileForm): FieldErrors {
  const errors: FieldErrors = {};

  const firstName = form.first_name.trim();
  const lastName = form.last_name.trim();
  const phone = form.phone.trim();
  const address = form.address.trim();

  if (!firstName) {
    errors.first_name = "First name is required.";
  } else if (firstName.length > 80) {
    errors.first_name = "First name must not exceed 80 characters.";
  }

  if (!lastName) {
    errors.last_name = "Last name is required.";
  } else if (lastName.length > 80) {
    errors.last_name = "Last name must not exceed 80 characters.";
  }

  if (phone) {
    const phonePattern = /^[0-9+\-()\s]{7,20}$/;

    if (!phonePattern.test(phone)) {
      errors.phone =
        "Enter a valid phone number using digits and common phone symbols.";
    }
  }

  if (address.length > 300) {
    errors.address = "Address must not exceed 300 characters.";
  }

  return errors;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

export default function Profile() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const clearMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const data = await getProfile(user.id);
      const normalizedProfile = normalizeProfile(data);

      if (!normalizedProfile) {
        throw new Error("The profile data returned by the server is invalid.");
      }

      setProfile(normalizedProfile);
      setForm(profileToForm(normalizedProfile));
    } catch (error) {
      setProfile(null);
      setErrorMessage(
        getErrorMessage(error, "Unable to load your profile right now."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const initials = useMemo(() => {
    const firstInitial = form.first_name.trim().charAt(0);
    const lastInitial = form.last_name.trim().charAt(0);
    const value = `${firstInitial}${lastInitial}`.toUpperCase();

    return value || "W";
  }, [form.first_name, form.last_name]);

  const fullName = useMemo(() => {
    return [form.first_name.trim(), form.last_name.trim()]
      .filter(Boolean)
      .join(" ");
  }, [form.first_name, form.last_name]);

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

      clearMessages();
    },
    [clearMessages],
  );

  const handleEditToggle = useCallback(() => {
    if (saving || uploading || !profile) {
      return;
    }

    clearMessages();
    setFieldErrors({});

    if (editing) {
      setForm(profileToForm(profile));
      setEditing(false);
      return;
    }

    setEditing(true);
  }, [clearMessages, editing, profile, saving, uploading]);

  const handleSave = useCallback(async () => {
    if (!profile || saving) {
      return;
    }

    const errors = validateProfile(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please correct the highlighted fields.");
      setSuccessMessage("");
      return;
    }

    try {
      setSaving(true);
      clearMessages();

      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      };

      await updateProfile(profile.id, payload);

      const updatedProfile: WorkerProfile = {
        ...profile,
        ...payload,
      };

      setProfile(updatedProfile);
      setForm(profileToForm(updatedProfile));
      setEditing(false);
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to update your profile."),
      );
    } finally {
      setSaving(false);
    }
  }, [clearMessages, form, profile, saving]);

  const handleUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file || !profile || uploading) {
        return;
      }

      clearMessages();

      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        setErrorMessage("Please upload a JPG, PNG, or WEBP image.");
        return;
      }

      if (file.size > MAX_AVATAR_SIZE_BYTES) {
        setErrorMessage("Profile image must be 5 MB or smaller.");
        return;
      }

      try {
        setUploading(true);

        const url = await uploadAvatar(profile.id, file);

        if (!url || typeof url !== "string") {
          throw new Error("The uploaded image URL is invalid.");
        }

        const updatedProfile: WorkerProfile = {
          ...profile,
          profile_picture: url,
        };

        setProfile(updatedProfile);
        setSuccessMessage("Profile picture updated successfully.");
      } catch (error) {
        setErrorMessage(
          getErrorMessage(error, "Unable to upload your profile picture."),
        );
      } finally {
        setUploading(false);
      }
    },
    [clearMessages, profile, uploading],
  );

  if (loading) {
    return (
      <WorkerLayout>
        <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mx-auto h-32 w-32 rounded-full bg-slate-200" />
            <div className="mx-auto mt-5 h-7 w-48 rounded bg-slate-200" />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 rounded-xl bg-slate-200"
                />
              ))}
            </div>
            <div className="mt-4 h-28 rounded-xl bg-slate-200" />
          </div>
        </div>
      </WorkerLayout>
    );
  }

  if (!profile) {
    return (
      <WorkerLayout>
        <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Unable to load profile
            </h1>
            <p className="mt-3 text-sm text-red-700">
              {errorMessage || "Your profile could not be loaded."}
            </p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
              Worker Account
            </p>
            <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Keep your personal and contact information accurate so customers
              can reach you easily.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
              >
                {successMessage}
              </div>
            )}

            <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative">
                  {profile.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={`${fullName || "Worker"} profile`}
                      className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg ring-2 ring-blue-100"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-4xl font-bold text-blue-700 shadow-lg ring-2 ring-blue-100">
                      {initials}
                    </div>
                  )}

                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/55 text-sm font-semibold text-white">
                      Uploading...
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {fullName || "Worker Profile"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile.email || "No email available"}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleUpload}
                    disabled={uploading || saving}
                    className="sr-only"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || saving}
                    className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Change Profile Picture"}
                  </button>

                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, or WEBP. Maximum file size: 5 MB.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEditToggle}
                disabled={saving || uploading}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editing ? "Cancel Editing" : "Edit Profile"}
              </button>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  First Name
                </span>
                <input
                  type="text"
                  disabled={!editing || saving}
                  value={form.first_name}
                  onChange={(event) =>
                    updateFormField("first_name", event.target.value)
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    fieldErrors.first_name
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
                  placeholder="First Name"
                  aria-invalid={Boolean(fieldErrors.first_name)}
                />
                {fieldErrors.first_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.first_name}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Last Name
                </span>
                <input
                  type="text"
                  disabled={!editing || saving}
                  value={form.last_name}
                  onChange={(event) =>
                    updateFormField("last_name", event.target.value)
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    fieldErrors.last_name
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
                  placeholder="Last Name"
                  aria-invalid={Boolean(fieldErrors.last_name)}
                />
                {fieldErrors.last_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.last_name}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </span>
                <input
                  type="email"
                  disabled
                  value={profile.email ?? ""}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-600"
                  placeholder="Email Address"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number
                </span>
                <input
                  type="tel"
                  disabled={!editing || saving}
                  value={form.phone}
                  onChange={(event) =>
                    updateFormField("phone", event.target.value)
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                    fieldErrors.phone
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  }`}
                  placeholder="Phone Number"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone && (
                  <p className="mt-2 text-sm text-red-600">
                    {fieldErrors.phone}
                  </p>
                )}
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Address
              </span>
              <textarea
                disabled={!editing || saving}
                value={form.address}
                onChange={(event) =>
                  updateFormField("address", event.target.value)
                }
                className={`min-h-28 w-full resize-y rounded-xl border px-4 py-3 text-slate-900 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  fieldErrors.address
                    ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                    : "border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                }`}
                rows={4}
                placeholder="Complete Address"
                aria-invalid={Boolean(fieldErrors.address)}
              />
              <div className="mt-2 flex items-center justify-between gap-4">
                {fieldErrors.address ? (
                  <p className="text-sm text-red-600">{fieldErrors.address}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-slate-500">
                  {form.address.length}/300
                </p>
              </div>
            </label>

            {editing && (
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleEditToggle}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || uploading}
                  className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkerLayout>
  );
}