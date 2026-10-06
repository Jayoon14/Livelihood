import { runAuditedProcess } from "../lib/processAudit";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";
import { claimActiveSession, releaseActiveSession, } from "./activeSessionService";
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
    // =========================
    // CUSTOMER REGISTRATION MAP
    // =========================
    latitude?: number | null;
    longitude?: number | null;
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
// =========================
// VALIDATION HELPERS
// =========================
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
// =========================
// PASSWORD RECOVERY
// =========================
export async function requestPasswordReset(email: string, captchaToken: string): Promise<void> {
    return await runAuditedProcess({ module: "Authentication", process: "requestPasswordReset", action: "PASSWORD", parameters: { email, captchaToken } }, async (__activityProcessScope) => {
        try {
            const normalizedEmail = normalizeEmail(email);
            const normalizedCaptchaToken = normalizeOptionalText(captchaToken);
            if (!normalizedCaptchaToken) {
                throw new Error("Please complete the security verification.");
            }
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
                captchaToken: normalizedCaptchaToken,
            });
            if (error) {
                console.error("Password recovery request error:", error);
                throw new Error(error.message);
            }
        }
        catch (error) {
            __activityProcessScope.caught(error);
            console.error("requestPasswordReset failed:", error);
            throw error instanceof Error
                ? error
                : new Error("Unable to send the password recovery code.");
        }
    });
}
// =========================
// ACTIVITY LOGGING
// =========================
// =========================
// LOGIN
// =========================
export async function login(email: string, password: string, captchaToken?: string): Promise<AuthResult> {
    return await runAuditedProcess({ module: "Authentication", process: "login", action: "LOGIN", parameters: { email, password, captchaToken } }, async (__activityProcessScope) => {
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
            if (result.error || !result.data.session || !result.data.user) {
                return result;
            }
            // =========================
            // CHECK PROFILE
            // =========================
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role, status")
                .eq("id", result.data.user.id)
                .maybeSingle();
            if (profileError) {
                await supabase.auth.signOut({
                    scope: "local",
                });
                throw new Error(`Unable to verify your account status: ${profileError.message}`);
            }
            if (!profile) {
                await supabase.auth.signOut({
                    scope: "local",
                });
                throw new Error("Your account profile was not found.");
            }
            const role = String(profile.role ?? "")
                .trim()
                .toLowerCase();
            const status = String(profile.status ?? "")
                .trim()
                .toLowerCase();
            // =========================
            // ACCOUNT STATUS CHECK
            // =========================
            if (role !== "admin" && status !== "approved") {
                await supabase.auth.signOut({
                    scope: "local",
                });
                const message = status === "disabled"
                    ? "Your account has been disabled. Please contact the administrator for assistance."
                    : status === "blocked"
                        ? "Your account has been blocked. Please contact the administrator for assistance."
                        : status === "rejected"
                            ? "Your account has been rejected. Please contact the administrator for assistance."
                            : "Your account is not approved yet. Please wait for administrator approval.";
                return {
                    data: {
                        user: null,
                        session: null,
                    },
                    error: {
                        name: "AccountStatusError",
                        message,
                        status: 403,
                    } as AuthError,
                };
            }
            // =========================
            // CLAIM ACTIVE SESSION
            // =========================
            const allowed = await claimActiveSession();
            if (!allowed) {
                const activeSessionMessage = "This account is already logged in on another device.";
                const activeUserId = result.data.user?.id;
                if (activeUserId) {
                    try {
                        await createNotification(activeUserId, null, "Security Alert", "A sign-in attempt to your account was blocked because this account is already active on another device. If this was not you, change your password immediately.");
                    }
                    catch (notificationError) {
                        __activityProcessScope.caught(notificationError);
                        console.error("Unable to create blocked-login security notification:", notificationError);
                    }
                }
                sessionStorage.setItem("auth-message", activeSessionMessage);
                await supabase.auth.signOut({
                    scope: "local",
                });
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
            // =========================
            // ACTIVE SESSION CLAIMED
            // =========================
            /*
             * IMPORTANT:
             *
             * The login has successfully claimed
             * the active device session.
             *
             * ActiveSessionManager should start its
             * heartbeat/refresh logic only after this event.
             */
            window.dispatchEvent(new Event("active-session-claimed"));
            return result;
        }
        catch (error) {
            __activityProcessScope.caught(error);
            return {
                data: {
                    user: null,
                    session: null,
                },
                error: error instanceof Error
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
    });
}
// =========================
// REGISTER USER
// =========================
export async function registerUser(userData: RegisterData): Promise<AuthResult> {
    return await runAuditedProcess({ module: "Authentication", process: "registerUser", action: "REGISTER", parameters: { userData } }, async (__activityProcessScope) => {
        try {
            const firstName = normalizeRequiredText(userData.firstName, "First name");
            const middleName = normalizeOptionalText(userData.middleName);
            const lastName = normalizeRequiredText(userData.lastName, "Last name");
            const email = normalizeEmail(userData.email);
            const phone = normalizeRequiredText(userData.phone, "Phone number");
            const password = validatePassword(userData.password);
            const role = normalizeRole(userData.role);
            // =========================
            // CAPTCHA
            // =========================
            const captchaToken = normalizeOptionalText(userData.captchaToken);
            if (!captchaToken) {
                throw new Error("Please complete the security verification before creating your account.");
            }
            // =========================
            // MAP LOCATION VALIDATION
            // =========================
            let latitude: number | null = null;
            let longitude: number | null = null;
            if (role === "customer") {
                if (userData.latitude === null ||
                    userData.latitude === undefined ||
                    !Number.isFinite(userData.latitude)) {
                    throw new Error("Please select your exact address location on the map.");
                }
                if (userData.longitude === null ||
                    userData.longitude === undefined ||
                    !Number.isFinite(userData.longitude)) {
                    throw new Error("Please select your exact address location on the map.");
                }
                latitude = userData.latitude;
                longitude = userData.longitude;
                // Basic geographic range validation
                if (latitude < -90 || latitude > 90) {
                    throw new Error("Invalid latitude value.");
                }
                if (longitude < -180 || longitude > 180) {
                    throw new Error("Invalid longitude value.");
                }
            }
            else {
                // Workers/admins may register without
                // customer map coordinates.
                latitude = userData.latitude ?? null;
                longitude = userData.longitude ?? null;
            }
            /*
             * Kapag naka-enable ang Confirm Email,
             * walang authenticated session pagkatapos
             * ng signUp.
             *
             * Kaya ang profile data ay ipinapasa bilang
             * user metadata at ise-save ng database trigger.
             */
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    captchaToken,
                    emailRedirectTo: window.location.origin,
                    data: {
                        // =========================
                        // PERSONAL INFORMATION
                        // =========================
                        first_name: firstName,
                        middle_name: middleName,
                        last_name: lastName,
                        email,
                        phone,
                        gender: normalizeOptionalText(userData.gender),
                        birth_date: normalizeOptionalText(userData.birthDate),
                        civil_status: normalizeOptionalText(userData.civilStatus),
                        religion: normalizeOptionalText(userData.religion),
                        // =========================
                        // ADDRESS
                        // =========================
                        house_no: normalizeOptionalText(userData.houseNo),
                        street: normalizeOptionalText(userData.street),
                        barangay: normalizeOptionalText(userData.barangay),
                        municipality: normalizeOptionalText(userData.municipality),
                        province: normalizeOptionalText(userData.province),
                        // =========================
                        // MAP LOCATION
                        // =========================
                        latitude,
                        longitude,
                        // =========================
                        // ACCOUNT
                        // =========================
                        role,
                        status: role === "customer" ? "Approved" : "Pending",
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
             * Huwag mag-upload o mag-insert mula sa
             * frontend kapag session=null.
             *
             * Ang profile row ay gagawin ng database
             * trigger kahit hinihintay pa ang email verification.
             *
             * Ang optional profile picture ay maaaring
             * i-upload pagkatapos ma-verify at
             * makapag-login ang customer.
             */
            return {
                data,
                error: null,
            };
        }
        catch (error) {
            __activityProcessScope.caught(error);
            return {
                data: {
                    user: null,
                    session: null,
                },
                error: error instanceof Error
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
    });
}
// =========================
// LOGOUT
// =========================
export async function logout() {
    return await runAuditedProcess({ module: "Authentication", process: "logout", action: "LOGOUT", parameters: {} }, async () => {
        const { data: { user }, } = await supabase.auth.getUser();
        if (user) {
            await releaseActiveSession();
        }
        return supabase.auth.signOut({
            scope: "local",
        });
    });
}
// =========================
// GET CURRENT USER
// =========================
export async function getCurrentUser(): Promise<CurrentUserResult> {
    return await runAuditedProcess({ module: "Authentication", process: "getCurrentUser", action: "READ", parameters: {} }, async () => {
        const { data: { user }, error, } = await supabase.auth.getUser();
        return {
            user,
            error,
        };
    });
}
// =========================
// GET CURRENT SESSION
// =========================
export async function getCurrentSession(): Promise<CurrentSessionResult> {
    return await runAuditedProcess({ module: "Authentication", process: "getCurrentSession", action: "READ", parameters: {} }, async () => {
        const { data: { session }, error, } = await supabase.auth.getSession();
        return {
            session,
            error,
        };
    });
}
