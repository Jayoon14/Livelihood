import { supabase } from "../lib/supabase";

export interface WorkerProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  profile_picture: string | null;
  role: string | null;
}

export interface UpdateProfileRequest {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  phone?: string | null;
  address?: string | null;
  profile_picture?: string | null;
}

export interface AdminProfileUpdateRequest {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

const PROFILE_COLUMNS = `
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  email,
  phone,
  address,
  profile_picture,
  role
`;

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ALLOWED_AVATAR_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return new Error(message);
    }
  }

  return new Error(fallback);
}

function cleanOptionalText(value: string | null | undefined): string | null {
  const cleaned = value?.trim() ?? "";
  return cleaned || null;
}

function cleanRequiredText(
  value: string | null | undefined,
  fieldName: string,
): string {
  const cleaned = value?.trim() ?? "";

  if (!cleaned) {
    throw new Error(`${fieldName} is required.`);
  }

  return cleaned;
}

function validateTextLength(
  value: string | null,
  fieldName: string,
  maximum: number,
): void {
  if (value && value.length > maximum) {
    throw new Error(
      `${fieldName} must contain ${maximum} characters or fewer.`,
    );
  }
}

export function normalizePhone(
  value: string | null | undefined,
): string | null {
  const phone = cleanOptionalText(value);

  if (!phone) {
    return null;
  }

  const compact = phone.replace(/[\s()-]/g, "");

  if (!/^\+?\d{7,15}$/.test(compact)) {
    throw new Error("Enter a valid phone number containing 7 to 15 digits.");
  }

  return phone;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Use at least 8 characters.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Include at least one lowercase letter.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Include at least one uppercase letter.");
  }

  if (!/\d/.test(password)) {
    errors.push("Include at least one number.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw toError(error, "Unable to verify the current session.");
  }

  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return user.id;
}

async function ensureOwnProfile(profileId: string): Promise<void> {
  const currentUserId = await getCurrentUserId();

  if (currentUserId !== profileId) {
    throw new Error("You cannot modify another user's profile.");
  }
}

export async function getProfile(id: string): Promise<WorkerProfile | null> {
  const profileId = id.trim();

  if (!profileId) {
    throw new Error("Profile ID is required.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw toError(error, "Unable to load profile.");
  }

  return (data ?? null) as WorkerProfile | null;
}

export async function getCurrentProfile(): Promise<WorkerProfile> {
  const userId = await getCurrentUserId();
  const profile = await getProfile(userId);

  if (!profile) {
    throw new Error("Profile record was not found.");
  }

  return profile;
}

export async function updateProfile(
  id: string,
  updates: UpdateProfileRequest,
): Promise<WorkerProfile> {
  const profileId = id.trim();

  if (!profileId) {
    throw new Error("Profile ID is required.");
  }

  await ensureOwnProfile(profileId);

  const payload: UpdateProfileRequest = {};

  if ("first_name" in updates) {
    payload.first_name = cleanOptionalText(updates.first_name);
  }

  if ("middle_name" in updates) {
    payload.middle_name = cleanOptionalText(updates.middle_name);
  }

  if ("last_name" in updates) {
    payload.last_name = cleanOptionalText(updates.last_name);
  }

  if ("suffix" in updates) {
    payload.suffix = cleanOptionalText(updates.suffix);
  }

  if ("phone" in updates) {
    payload.phone = normalizePhone(updates.phone);
  }

  if ("address" in updates) {
    payload.address = cleanOptionalText(updates.address);
  }

  if ("profile_picture" in updates) {
    payload.profile_picture = cleanOptionalText(updates.profile_picture);
  }

  if (Object.keys(payload).length === 0) {
    const existing = await getProfile(profileId);

    if (!existing) {
      throw new Error("Profile record was not found.");
    }

    return existing;
  }

  validateTextLength(payload.first_name ?? null, "First name", 80);
  validateTextLength(payload.middle_name ?? null, "Middle name", 80);
  validateTextLength(payload.last_name ?? null, "Last name", 80);
  validateTextLength(payload.suffix ?? null, "Suffix", 20);
  validateTextLength(payload.phone ?? null, "Phone number", 30);
  validateTextLength(payload.address ?? null, "Address", 300);

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", profileId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw toError(error, "Unable to update profile.");
  }

  return data as WorkerProfile;
}

export async function updateAdminProfile(
  updates: AdminProfileUpdateRequest,
): Promise<WorkerProfile> {
  const userId = await getCurrentUserId();

  const firstName = cleanRequiredText(updates.first_name, "First name");
  const lastName = cleanRequiredText(updates.last_name, "Last name");
  const middleName = cleanOptionalText(updates.middle_name);
  const suffix = cleanOptionalText(updates.suffix);
  const phone = normalizePhone(updates.phone);
  const address = cleanOptionalText(updates.address);

  validateTextLength(firstName, "First name", 80);
  validateTextLength(middleName, "Middle name", 80);
  validateTextLength(lastName, "Last name", 80);
  validateTextLength(suffix, "Suffix", 20);
  validateTextLength(phone, "Phone number", 30);
  validateTextLength(address, "Address", 300);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      suffix,
      phone,
      address,
    })
    .eq("id", userId)
    .ilike("role", "admin")
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    throw toError(error, "Unable to update the administrator profile.");
  }

  if (!data) {
    throw new Error(
      "Administrator profile was not updated. Check the profile role and UPDATE policy.",
    );
  }

  return data as WorkerProfile;
}

function getFileExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_AVATAR_EXTENSIONS.has(extension)) {
    throw new Error("The image filename must use JPG, JPEG, PNG, or WEBP.");
  }

  return extension === "jpeg" ? "jpg" : extension;
}

function validateAvatar(file: File): string {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  if (file.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  return getFileExtension(file);
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const profileId = userId.trim();

  if (!profileId) {
    throw new Error("User ID is required.");
  }

  await ensureOwnProfile(profileId);

  const extension = validateAvatar(file);
  const filePath = `${profileId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });

  if (uploadError) {
    throw toError(uploadError, "Unable to upload image.");
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("Unable to generate the profile image URL.");
  }

  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  await updateProfile(profileId, {
    profile_picture: publicUrl,
  });

  return publicUrl;
}

export async function removeAvatar(
  userId: string,
  currentUrl?: string | null,
): Promise<void> {
  const profileId = userId.trim();

  if (!profileId) {
    throw new Error("User ID is required.");
  }

  await ensureOwnProfile(profileId);

  const possiblePaths = [
    `${profileId}/avatar.jpg`,
    `${profileId}/avatar.png`,
    `${profileId}/avatar.webp`,
  ];

  const { error: removeError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove(possiblePaths);

  if (removeError && !removeError.message.toLowerCase().includes("not found")) {
    throw toError(removeError, "Unable to remove the image.");
  }

  await updateProfile(profileId, {
    profile_picture: null,
  });

  void currentUrl;
}

export async function changePassword(password: string): Promise<void> {
  const validation = validatePassword(password);

  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  await getCurrentUserId();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw toError(error, "Unable to update password.");
  }
}
