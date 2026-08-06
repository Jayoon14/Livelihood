import {
  Camera,
  Save,
  Trash2,
  UserCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import { useProfile } from "../../../context/ProfileContextValue";
import {
  removeAvatar,
  updateAdminProfile,
  uploadAvatar,
} from "../../../services/profileService";

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  phone: string;
  address: string;
}

const EMPTY_FORM: FormState = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  phone: "",
  address: "",
};

function normalizeForm(form: FormState): FormState {
  return {
    first_name: form.first_name.trim(),
    middle_name: form.middle_name.trim(),
    last_name: form.last_name.trim(),
    suffix: form.suffix.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
  };
}

export default function AdminProfile() {
  const { profile, refreshProfile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] =
    useState<FormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] =
    useState<FormState>(EMPTY_FORM);
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] =
    useState(false);
  const [removing, setRemoving] =
    useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextForm: FormState = {
        first_name: profile?.first_name ?? "",
        middle_name: profile?.middle_name ?? "",
        last_name: profile?.last_name ?? "",
        suffix: profile?.suffix ?? "",
        phone: profile?.phone ?? "",
        address: profile?.address ?? "",
      };

      setForm(nextForm);
      setInitialForm(nextForm);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const hasProfileChanges = useMemo(
    () =>
      JSON.stringify(normalizeForm(form)) !==
      JSON.stringify(normalizeForm(initialForm)),
    [form, initialForm],
  );

  const hasUnsavedChanges =
    hasProfileChanges || Boolean(previewUrl);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [hasUnsavedChanges]);

  function updateField(
    field: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleaned = normalizeForm(form);

    if (!cleaned.first_name || !cleaned.last_name) {
      toast.warning(
        "First name and last name are required.",
      );
      return;
    }

    if (!hasProfileChanges) {
      toast.info("No profile changes to save.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(
      "Saving administrator profile...",
    );

    try {
      await updateAdminProfile({
        first_name: cleaned.first_name,
        middle_name: cleaned.middle_name || null,
        last_name: cleaned.last_name,
        suffix: cleaned.suffix || null,
        phone: cleaned.phone || null,
        address: cleaned.address || null,
      });

      await refreshProfile();
      setInitialForm(cleaned);
      setForm(cleaned);

      toast.success(
        "Administrator profile updated.",
        { id: toastId },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update profile.",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleImageSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!profile?.id) {
      toast.error("Administrator profile is unavailable.");
      event.target.value = "";
      return;
    }

    const localPreview = URL.createObjectURL(file);

    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(localPreview);
    setUploading(true);

    const toastId = toast.loading(
      "Uploading profile image...",
    );

    try {
      const imageUrl = await uploadAvatar(
        profile.id,
        file,
      );

      setPreviewUrl(imageUrl);
      await refreshProfile();

      toast.success("Profile image updated.", {
        id: toastId,
      });
    } catch (error) {
      setPreviewUrl(null);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to upload profile image.",
        { id: toastId },
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleRemoveAvatar() {
    if (!profile?.id) {
      toast.error("Administrator profile is unavailable.");
      return;
    }

    const confirmed = window.confirm(
      "Remove the current administrator profile image?",
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    const toastId = toast.loading(
      "Removing profile image...",
    );

    try {
      await removeAvatar(
        profile.id,
        profile.profile_picture,
      );

      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      await refreshProfile();

      toast.success("Profile image removed.", {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove profile image.",
        { id: toastId },
      );
    } finally {
      setRemoving(false);
    }
  }

  const displayedImage =
    previewUrl || profile?.profile_picture || null;

  return (
    <AdminLayout>
      <section className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Administrator Profile
          </h1>

          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Update the account information displayed in
            the administrator panel.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <section className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-center dark:border-slate-800">
            <div className="relative shrink-0">
              {displayedImage ? (
                <img
                  src={displayedImage}
                  alt="Administrator profile"
                  className="h-24 w-24 rounded-full border-4 border-white object-cover shadow dark:border-slate-800"
                />
              ) : (
                <UserCircle className="h-24 w-24 text-slate-400" />
              )}

              {(uploading || removing) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/60 text-xs font-bold text-white">
                  Please wait
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                {profile?.email ?? "Administrator"}
              </p>

              <p className="text-sm capitalize text-slate-500">
                {profile?.role ?? "admin"}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                JPG, PNG, or WEBP. Maximum file size:
                5 MB.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={
                    uploading ||
                    removing ||
                    !profile?.id
                  }
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                  {uploading
                    ? "Uploading..."
                    : "Change photo"}
                </button>

                {displayedImage && (
                  <button
                    type="button"
                    disabled={uploading || removing}
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                    {removing
                      ? "Removing..."
                      : "Remove photo"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="First name"
              value={form.first_name}
              autoComplete="given-name"
              required
              maxLength={80}
              onChange={(value) =>
                updateField("first_name", value)
              }
            />

            <Field
              label="Middle name"
              value={form.middle_name}
              autoComplete="additional-name"
              maxLength={80}
              onChange={(value) =>
                updateField("middle_name", value)
              }
            />

            <Field
              label="Last name"
              value={form.last_name}
              autoComplete="family-name"
              required
              maxLength={80}
              onChange={(value) =>
                updateField("last_name", value)
              }
            />

            <Field
              label="Suffix"
              value={form.suffix}
              autoComplete="honorific-suffix"
              maxLength={20}
              placeholder="Jr., Sr., III"
              onChange={(value) =>
                updateField("suffix", value)
              }
            />

            <Field
              label="Phone number"
              value={form.phone}
              type="tel"
              autoComplete="tel"
              maxLength={30}
              placeholder="+63 912 345 6789"
              onChange={(value) =>
                updateField("phone", value)
              }
            />

            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2 dark:text-slate-300">
              Address

              <textarea
                value={form.address}
                maxLength={300}
                rows={4}
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value,
                  )
                }
                className="resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />

              <span className="text-right text-xs font-normal text-slate-400">
                {form.address.length}/300
              </span>
            </label>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {hasProfileChanges
                ? "You have unsaved profile changes."
                : "Your profile information is saved."}
            </p>

            <button
              type="submit"
              disabled={
                saving ||
                uploading ||
                removing ||
                !hasProfileChanges
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving
                ? "Saving..."
                : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel";
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}

      <input
        type={type}
        autoComplete={autoComplete}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
      />
    </label>
  );
}