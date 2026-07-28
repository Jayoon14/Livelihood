import { supabase } from "../lib/supabase";

export interface ActivityUser {
  id?: string;
  first_name: string | null;
  last_name: string | null;
}

export interface ActivityLog {
  id: number;
  user_id: string;
  action: string;
  module: string;
  description: string;
  created_at: string;
}

export interface ActivityLogWithUser extends ActivityLog {
  user: ActivityUser | null;
}

export interface LogActivityPayload {
  userId: string;
  action: string;
  module: string;
  description: string;
}

interface ProfileRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

const ACTIVITY_LIMITS = {
  action: 100,
  module: 100,
  description: 1_000,
} as const;

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

function validateRequiredText(
  value: string,
  fieldName: string,
  maximumLength?: number,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  if (maximumLength && normalized.length > maximumLength) {
    throw new Error(
      `${fieldName} must not exceed ${maximumLength} characters.`,
    );
  }

  return normalized;
}

function validateUserId(userId: string): string {
  return validateRequiredText(userId, "User ID", 100);
}

function normalizeRelatedUser(
  user: ActivityUser | ActivityUser[] | null | undefined,
): ActivityUser | null {
  if (Array.isArray(user)) {
    return user[0] ?? null;
  }

  return user ?? null;
}

async function requireAuthenticatedUser(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw wrapError(error, "Unable to verify the authenticated user.");
  }

  if (!user) {
    throw new Error("You must be signed in to record an activity.");
  }

  return user.id;
}

async function requireProfile(userId: string): Promise<ProfileRecord> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to verify the user profile.");
  }

  if (!data) {
    throw new Error("The selected user profile does not exist.");
  }

  return data as ProfileRecord;
}

/**
 * Records a system activity for an existing user.
 *
 * The function verifies that there is an authenticated session and that the
 * supplied user ID belongs to an existing profile before inserting the log.
 */
export async function logActivity(
  userId: string,
  action: string,
  module: string,
  description: string,
): Promise<ActivityLog> {
  const payload: LogActivityPayload = {
    userId: validateUserId(userId),
    action: validateRequiredText(action, "Action", ACTIVITY_LIMITS.action),
    module: validateRequiredText(module, "Module", ACTIVITY_LIMITS.module),
    description: validateRequiredText(
      description,
      "Description",
      ACTIVITY_LIMITS.description,
    ),
  };

  await Promise.all([
    requireAuthenticatedUser(),
    requireProfile(payload.userId),
  ]);

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: payload.userId,
      action: payload.action,
      module: payload.module,
      description: payload.description,
    })
    .select("*")
    .single();

  if (error) {
    throw wrapError(error, "Unable to save the activity log.");
  }

  if (!data) {
    throw new Error("The activity log was not returned after saving.");
  }

  return data as ActivityLog;
}

/**
 * Returns all activity logs ordered from newest to oldest.
 */
export async function getActivityLogs(): Promise<ActivityLogWithUser[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(
      `
      *,
      user:profiles(
        id,
        first_name,
        last_name
      )
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw wrapError(error, "Unable to load activity logs.");
  }

  return (data ?? []).map((record) => {
    const typedRecord = record as ActivityLog & {
      user?: ActivityUser | ActivityUser[] | null;
    };

    return {
      id: typedRecord.id,
      user_id: typedRecord.user_id,
      action: typedRecord.action,
      module: typedRecord.module,
      description: typedRecord.description,
      created_at: typedRecord.created_at,
      user: normalizeRelatedUser(typedRecord.user),
    };
  });
}
