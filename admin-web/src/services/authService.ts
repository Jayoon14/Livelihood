import type {
  AuthError,
  AuthResponse,
  Session,
  User,
} from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";
import { createNotification } from "./notificationService";

export type UserRole = "admin" | "worker" | "customer" | string;

export interface RegisterData {
  firstName: string;
  middleName?: string;
  lastName: string;

  email: string;
  phone: string;
  password: string;

  gender?: string;
  birthDate?: string;
  civilStatus?: string;
  religion?: string;

  houseNo?: string;
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;

  profilePicture?: File | null;
  role: UserRole;
}

export interface CurrentUserResult {
  user: User | null;
  error: AuthError | null;
}

export interface CurrentSessionResult {
  session: Session | null;
  error: AuthError | null;
}

const PROFILE_PICTURE_BUCKET = "profile-picture";
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;

const ALLOWED_PROFILE_PICTURE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_PROFILE_PICTURE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value?: string): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : null;
}

function normalizeEmail(email: string): string {
  const normalizedEmail = normalizeRequiredText(email, "Email").toLowerCase();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  return normalizedEmail;
}

function validatePassword(password: string): string {
  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }

  return password;
}

function normalizeRole(role: UserRole): string {
  return normalizeRequiredText(String(role), "Role").toLowerCase();
}

function getProfilePictureExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase().trim();

  if (!extension || !ALLOWED_PROFILE_PICTURE_EXTENSIONS.has(extension)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  return extension === "jpeg" ? "jpg" : extension;
}

function validateProfilePicture(file: File): string {
  if (!ALLOWED_PROFILE_PICTURE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  if (file.size <= 0) {
    throw new Error("The selected profile picture is empty.");
  }

  if (file.size > MAX_PROFILE_PICTURE_SIZE) {
    throw new Error("Profile picture must be 5 MB or smaller.");
  }

  return getProfilePictureExtension(file);
}

function buildFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.replace(/\s+/g, " ").trim();
}

async function uploadProfilePicture(
  userId: string,
  file: File,
): Promise<{ publicUrl: string; filePath: string }> {
  const extension = validateProfilePicture(file);
  const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PICTURE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(PROFILE_PICTURE_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = data.publicUrl?.trim();

  if (!publicUrl) {
    await supabase.storage.from(PROFILE_PICTURE_BUCKET).remove([filePath]);

    throw new Error("Unable to generate profile picture URL.");
  }

  return {
    publicUrl,
    filePath,
  };
}

async function removeUploadedProfilePicture(filePath: string | null) {
  if (!filePath) {
    return;
  }

  await supabase.storage.from(PROFILE_PICTURE_BUCKET).remove([filePath]);
}

async function notifyAdminsAboutWorkerRegistration(
  workerName: string,
): Promise<void> {
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (error || !admins?.length) {
    return;
  }

  await Promise.allSettled(
    admins.map((admin) =>
      createNotification(
        String(admin.id),
        0,
        "New Worker Registration",
        `${workerName} has submitted a worker registration.`,
      ),
    ),
  );
}

async function logActivitySafely(
  userId: string,
  action: string,
  module: string,
  description: string,
): Promise<void> {
  try {
    await logActivity(userId, action, module, description);
  } catch {
    // Authentication must remain successful even if activity logging fails.
  }
}

// =========================
// LOGIN
// =========================

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = validatePassword(password);

    return await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });
  } catch (error) {
    return {
      data: {
        user: null,
        session: null,
      },
      error:
        error instanceof Error
          ? ({
              name: "AuthValidationError",
              message: error.message,
              status: 400,
            } as AuthError)
          : ({
              name: "AuthValidationError",
              message: "Unable to sign in.",
              status: 400,
            } as AuthError),
    };
  }
}

// =========================
// REGISTER USER
// =========================

export async function registerUser(
  userData: RegisterData,
): Promise<AuthResponse> {
  let uploadedFilePath: string | null = null;

  try {
    const firstName = normalizeRequiredText(userData.firstName, "First name");
    const middleName = normalizeOptionalText(userData.middleName);
    const lastName = normalizeRequiredText(userData.lastName, "Last name");

    const email = normalizeEmail(userData.email);
    const phone = normalizeRequiredText(userData.phone, "Phone number");
    const password = validatePassword(userData.password);
    const role = normalizeRole(userData.role);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        data,
        error,
      };
    }

    const user = data.user;

    if (!user) {
      return {
        data: {
          user: null,
          session: null,
        },
        error: {
          name: "UserCreationError",
          message: "User creation failed.",
          status: 500,
        } as AuthError,
      };
    }

    let profilePictureUrl: string | null = null;

    if (userData.profilePicture) {
      const uploadResult = await uploadProfilePicture(
        user.id,
        userData.profilePicture,
      );

      profilePictureUrl = uploadResult.publicUrl;
      uploadedFilePath = uploadResult.filePath;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      email,
      phone,
      gender: normalizeOptionalText(userData.gender),
      birth_date: normalizeOptionalText(userData.birthDate),
      civil_status: normalizeOptionalText(userData.civilStatus),
      religion: normalizeOptionalText(userData.religion),
      house_no: normalizeOptionalText(userData.houseNo),
      street: normalizeOptionalText(userData.street),
      barangay: normalizeOptionalText(userData.barangay),
      municipality: normalizeOptionalText(userData.municipality),
      province: normalizeOptionalText(userData.province),
      profile_picture: profilePictureUrl,
      role,
      status: role === "customer" ? "Approved" : "Pending",
    });

    if (profileError) {
      await removeUploadedProfilePicture(uploadedFilePath);

      return {
        data: {
          user: null,
          session: null,
        },
        error: {
          name: "ProfileError",
          message: profileError.message,
          status: 500,
        } as AuthError,
      };
    }

    const fullName = buildFullName(firstName, lastName);

    if (role === "worker") {
      await notifyAdminsAboutWorkerRegistration(fullName);
    }

    await logActivitySafely(
      user.id,
      "REGISTER",
      "Authentication",
      `${fullName} registered as ${role}`,
    );

    return {
      data,
      error: null,
    };
  } catch (error) {
    await removeUploadedProfilePicture(uploadedFilePath);

    return {
      data: {
        user: null,
        session: null,
      },
      error:
        error instanceof Error
          ? ({
              name: "RegistrationError",
              message: error.message,
              status: 400,
            } as AuthError)
          : ({
              name: "RegistrationError",
              message: "Unable to register user.",
              status: 400,
            } as AuthError),
    };
  }
}

// =========================
// LOGOUT
// =========================

export async function logout() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await logActivitySafely(
      user.id,
      "LOGOUT",
      "Authentication",
      "User logged out",
    );
  }

  return supabase.auth.signOut();
}

// =========================
// GET CURRENT USER
// =========================

export async function getCurrentUser(): Promise<CurrentUserResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    user,
    error,
  };
}

// =========================
// GET CURRENT SESSION
// =========================

export async function getCurrentSession(): Promise<CurrentSessionResult> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  return {
    session,
    error,
  };
}
