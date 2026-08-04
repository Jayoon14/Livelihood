import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";
import { createNotification } from "./notificationService";
import {
  claimActiveSession,
  releaseActiveSession,
} from "./activeSessionService";

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
  captchaToken?: string;
}

export interface AuthResult {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
}

export interface CurrentUserResult {
  user: User | null;
  error: AuthError | null;
}

export interface CurrentSessionResult {
  session: Session | null;
  error: AuthError | null;
}


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
  captchaToken?: string,
): Promise<AuthResult> {
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = validatePassword(password);

    if (typeof captchaToken !== "string" || !captchaToken.trim()) {
      throw new Error("Please complete the security verification.");
    }

    const result = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        captchaToken: captchaToken.trim(),
      },
    });

    if (result.error || !result.data.session) {
      return result;
    }

    const allowed = await claimActiveSession();

    if (!allowed) {
      const activeSessionMessage =
        "This account is already logged in on another device.";

      const activeUserId = result.data.user?.id;

      if (activeUserId) {
        try {
          await createNotification(
            activeUserId,
            null,
            "Security Alert",
            "A sign-in attempt to your account was blocked because this account is already active on another device. If this was not you, change your password immediately.",
          );
        } catch (notificationError) {
          /*
           * The login attempt must still be blocked even if the security
           * notification cannot be inserted.
           */
          console.error(
            "Unable to create blocked-login security notification:",
            notificationError,
          );
        }
      }

      sessionStorage.setItem("auth-message", activeSessionMessage);

      await supabase.auth.signOut({ scope: "local" });

      return {
        data: {
          user: null,
          session: null,
        },
        error: {
          name: "ActiveSessionError",
          message: activeSessionMessage,
          status: 403,
        } as AuthError,
      };
    }

    return result;
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
): Promise<AuthResult> {
  try {
    const firstName = normalizeRequiredText(
      userData.firstName,
      "First name",
    );
    const middleName = normalizeOptionalText(
      userData.middleName,
    );
    const lastName = normalizeRequiredText(
      userData.lastName,
      "Last name",
    );

    const email = normalizeEmail(userData.email);
    const phone = normalizeRequiredText(
      userData.phone,
      "Phone number",
    );
    const password = validatePassword(
      userData.password,
    );
    const role = normalizeRole(userData.role);
    const captchaToken =
      normalizeOptionalText(userData.captchaToken) ??
      undefined;

    /*
     * Kapag naka-enable ang Confirm Email, walang authenticated
     * session pagkatapos ng signUp. Kaya ang profile data ay
     * ipinapasa bilang user metadata at ise-save ng database
     * trigger na on_auth_user_created.
     */
    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          emailRedirectTo: window.location.origin,
          data: {
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            email,
            phone,
            gender: normalizeOptionalText(
              userData.gender,
            ),
            birth_date: normalizeOptionalText(
              userData.birthDate,
            ),
            civil_status: normalizeOptionalText(
              userData.civilStatus,
            ),
            religion: normalizeOptionalText(
              userData.religion,
            ),
            house_no: normalizeOptionalText(
              userData.houseNo,
            ),
            street: normalizeOptionalText(
              userData.street,
            ),
            barangay: normalizeOptionalText(
              userData.barangay,
            ),
            municipality: normalizeOptionalText(
              userData.municipality,
            ),
            province: normalizeOptionalText(
              userData.province,
            ),
            role,
            status:
              role === "customer"
                ? "Approved"
                : "Pending",
          },
        },
      });

    if (error) {
      return {
        data,
        error,
      };
    }

    if (!data.user) {
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

    /*
     * Huwag mag-upload o mag-insert mula sa frontend kapag
     * session=null. Ang profile row ay gagawin ng database
     * trigger kahit hinihintay pa ang email verification.
     *
     * Ang optional profile picture ay maaaring i-upload
     * pagkatapos ma-verify at makapag-login ang customer.
     */
    return {
      data,
      error: null,
    };
  } catch (error) {
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

    await releaseActiveSession();
  }

  return supabase.auth.signOut({ scope: "local" });
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