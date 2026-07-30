import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface ActivityUser {
  id?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  email?: string | null;
  role?: string | null;
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

export interface ActivityLogQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  module?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ActivityLogPage {
  items: ActivityLogWithUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityLogSummary {
  total: number;
  today: number;
  approvals: number;
  destructive: number;
}

interface ProfileRecord {
  id: string;
  role: string | null;
}

const ACTIVITY_LIMITS = {
  action: 100,
  module: 100,
  description: 1_000,
} as const;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const ACTIVITY_SELECT = `
  id,
  user_id,
  action,
  module,
  description,
  created_at,
  user:profiles!activity_logs_user_id_fkey(
    id,
    first_name,
    middle_name,
    last_name,
    suffix,
    email,
    role
  )
`;

export const ACTIVITY_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CANCEL: "CANCEL",
  REGISTER: "REGISTER",
  EXPORT: "EXPORT",
} as const;

export const ACTIVITY_MODULES = {
  AUTH: "Authentication",
  DASHBOARD: "Dashboard",
  WORKERS: "Workers",
  CUSTOMERS: "Customers",
  BOOKINGS: "Bookings",
  PAYMENTS: "Payments",
  SERVICES: "Services",
  REPORTS: "Reports",
  SETTINGS: "Settings",
  NOTIFICATIONS: "Notifications",
  ACTIVITY_LOGS: "Activity Logs",
} as const;

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return new Error(error.message);
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return new Error(message);
    }
  }

  return new Error(fallbackMessage);
}

function throwIfError(
  error: PostgrestError | Error | null,
  fallbackMessage: string,
): void {
  if (error) {
    throw wrapError(error, fallbackMessage);
  }
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

function validateActivityLogId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid activity log ID.");
  }

  return id;
}

function normalizeRelatedUser(
  user: ActivityUser | ActivityUser[] | null | undefined,
): ActivityUser | null {
  if (Array.isArray(user)) {
    return user[0] ?? null;
  }

  return user ?? null;
}

function normalizeRecord(
  record: unknown,
): ActivityLogWithUser {
  const typedRecord = record as ActivityLog & {
    user?: ActivityUser | ActivityUser[] | null;
  };

  return {
    id: Number(typedRecord.id),
    user_id: String(typedRecord.user_id ?? ""),
    action: typedRecord.action?.trim() || "UNKNOWN",
    module: typedRecord.module?.trim() || "Unknown",
    description: typedRecord.description?.trim() || "",
    created_at: typedRecord.created_at,
    user: normalizeRelatedUser(typedRecord.user),
  };
}

function normalizePagination(query: ActivityLogQuery): {
  page: number;
  pageSize: number;
  from: number;
  to: number;
} {
  const page =
    Number.isInteger(query.page) && (query.page ?? 0) > 0
      ? Number(query.page)
      : 1;

  const requestedPageSize =
    Number.isInteger(query.pageSize) &&
    (query.pageSize ?? 0) > 0
      ? Number(query.pageSize)
      : DEFAULT_PAGE_SIZE;

  const pageSize = Math.min(
    requestedPageSize,
    MAX_PAGE_SIZE,
  );

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return {
    page,
    pageSize,
    from,
    to,
  };
}

function cleanFilter(value?: string): string {
  return value?.trim() ?? "";
}

function escapeIlike(value: string): string {
  return value.replace(/[%_,()]/g, " ");
}

export function normalizeActivityAction(
  value: string,
): string {
  return validateRequiredText(
    value,
    "Action",
    ACTIVITY_LIMITS.action,
  )
    .replace(/\s+/g, "_")
    .toUpperCase();
}

export function normalizeActivityModule(
  value: string,
): string {
  return validateRequiredText(
    value,
    "Module",
    ACTIVITY_LIMITS.module,
  ).replace(/\s+/g, " ");
}

async function requireAuthenticatedUser(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw wrapError(
      error,
      "Unable to verify the authenticated user.",
    );
  }

  if (!user) {
    throw new Error("You must be signed in to continue.");
  }

  return user.id;
}

async function requireProfile(
  userId: string,
): Promise<ProfileRecord> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw wrapError(
      error,
      "Unable to verify the user profile.",
    );
  }

  if (!data) {
    throw new Error(
      "The authenticated profile does not exist.",
    );
  }

  return data as ProfileRecord;
}

async function requireAdminUser(): Promise<string> {
  const userId = await requireAuthenticatedUser();
  const profile = await requireProfile(userId);

  if (profile.role?.trim().toLowerCase() !== "admin") {
    throw new Error(
      "Only administrator accounts can access activity logs.",
    );
  }

  return userId;
}

export async function logActivity(
  userId: string,
  action: string,
  module: string,
  description: string,
): Promise<ActivityLog> {
  const payload: LogActivityPayload = {
    userId: validateRequiredText(
      userId,
      "User ID",
      100,
    ),
    action: normalizeActivityAction(action),
    module: normalizeActivityModule(module),
    description: validateRequiredText(
      description,
      "Description",
      ACTIVITY_LIMITS.description,
    ),
  };

  const authenticatedUserId =
    await requireAuthenticatedUser();

  if (authenticatedUserId !== payload.userId) {
    throw new Error(
      "Activity logs can only be recorded for the authenticated account.",
    );
  }

  await requireProfile(payload.userId);

  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: payload.userId,
      action: payload.action,
      module: payload.module,
      description: payload.description,
    })
    .select(
      "id,user_id,action,module,description,created_at",
    )
    .single();

  if (error) {
    throw wrapError(
      error,
      "Unable to save the activity log.",
    );
  }

  if (!data) {
    throw new Error(
      "The activity log was not returned after saving.",
    );
  }

  return data as ActivityLog;
}

export async function logCurrentUserActivity(
  action: string,
  module: string,
  description: string,
): Promise<ActivityLog> {
  const userId = await requireAuthenticatedUser();

  return logActivity(
    userId,
    action,
    module,
    description,
  );
}

export async function getActivityLogPage(
  query: ActivityLogQuery = {},
): Promise<ActivityLogPage> {
  await requireAdminUser();

  const { page, pageSize, from, to } =
    normalizePagination(query);

  const search = cleanFilter(query.search);
  const module = cleanFilter(query.module);
  const action = cleanFilter(query.action);
  const dateFrom = cleanFilter(query.dateFrom);
  const dateTo = cleanFilter(query.dateTo);

  let request = supabase
    .from("activity_logs")
    .select(ACTIVITY_SELECT, {
      count: "exact",
    })
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (module && module !== "All") {
    request = request.eq("module", module);
  }

  if (action && action !== "All") {
    request = request.eq("action", action);
  }

  if (dateFrom) {
    request = request.gte(
      "created_at",
      new Date(`${dateFrom}T00:00:00`).toISOString(),
    );
  }

  if (dateTo) {
    request = request.lte(
      "created_at",
      new Date(`${dateTo}T23:59:59.999`).toISOString(),
    );
  }

  if (search) {
    const keyword = escapeIlike(search);

    request = request.or(
      [
        `action.ilike.%${keyword}%`,
        `module.ilike.%${keyword}%`,
        `description.ilike.%${keyword}%`,
        `user_id.ilike.%${keyword}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await request;

  throwIfError(
    error,
    "Unable to load activity logs.",
  );

  const total = count ?? 0;

  return {
    items: (data ?? []).map(normalizeRecord),
    total,
    page,
    pageSize,
    totalPages: Math.max(
      1,
      Math.ceil(total / pageSize),
    ),
  };
}

/**
 * Backward-compatible function.
 * Returns up to 100 latest records.
 */
export async function getActivityLogs(): Promise<
  ActivityLogWithUser[]
> {
  const result = await getActivityLogPage({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });

  return result.items;
}

export async function getActivityLogFilterOptions(): Promise<{
  modules: string[];
  actions: string[];
}> {
  await requireAdminUser();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("module,action")
    .order("created_at", {
      ascending: false,
    })
    .limit(1_000);

  throwIfError(
    error,
    "Unable to load activity log filters.",
  );

  const modules = [
    ...new Set(
      (data ?? [])
        .map((row) => row.module?.trim())
        .filter(
          (value): value is string => Boolean(value),
        ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const actions = [
    ...new Set(
      (data ?? [])
        .map((row) => row.action?.trim())
        .filter(
          (value): value is string => Boolean(value),
        ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    modules,
    actions,
  };
}

export async function getActivityLogSummary(): Promise<ActivityLogSummary> {
  await requireAdminUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalResult,
    todayResult,
    approvalResult,
    destructiveResult,
  ] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id", {
        head: true,
        count: "exact",
      }),
    supabase
      .from("activity_logs")
      .select("id", {
        head: true,
        count: "exact",
      })
      .gte("created_at", today.toISOString()),
    supabase
      .from("activity_logs")
      .select("id", {
        head: true,
        count: "exact",
      })
      .ilike("action", "%APPROV%"),
    supabase
      .from("activity_logs")
      .select("id", {
        head: true,
        count: "exact",
      })
      .or(
        "action.ilike.%DELETE%,action.ilike.%REJECT%,action.ilike.%CANCEL%",
      ),
  ]);

  throwIfError(
    totalResult.error,
    "Unable to count activity logs.",
  );
  throwIfError(
    todayResult.error,
    "Unable to count today's activity logs.",
  );
  throwIfError(
    approvalResult.error,
    "Unable to count approval activity logs.",
  );
  throwIfError(
    destructiveResult.error,
    "Unable to count destructive activity logs.",
  );

  return {
    total: totalResult.count ?? 0,
    today: todayResult.count ?? 0,
    approvals: approvalResult.count ?? 0,
    destructive: destructiveResult.count ?? 0,
  };
}

export async function deleteActivityLog(
  id: number,
): Promise<void> {
  await requireAdminUser();

  const activityLogId = validateActivityLogId(id);

  const { data, error } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", activityLogId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw wrapError(
      error,
      "Unable to delete the activity log.",
    );
  }

  if (!data) {
    throw new Error(
      "Activity log was not deleted. It may not exist or the admin account may not have DELETE permission.",
    );
  }
}

export async function deleteAllActivityLogs(): Promise<number> {
  await requireAdminUser();

  const { data, error } = await supabase
    .from("activity_logs")
    .delete()
    .not("id", "is", null)
    .select("id");

  if (error) {
    throw wrapError(
      error,
      "Unable to delete all activity logs.",
    );
  }

  return data?.length ?? 0;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function getActivityUserName(
  log: ActivityLogWithUser,
): string {
  const user = log.user;

  if (!user) {
    return "Unknown user";
  }

  const fullName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .map((part) => part?.trim())
    .filter(
      (part): part is string => Boolean(part),
    )
    .join(" ");

  return (
    fullName ||
    user.email ||
    "Unknown user"
  );
}

export function exportActivityLogsCsv(
  logs: ActivityLogWithUser[],
): void {
  if (logs.length === 0) {
    throw new Error(
      "There are no activity logs to export.",
    );
  }

  const rows = [
    [
      "ID",
      "User ID",
      "User",
      "Email",
      "Role",
      "Module",
      "Action",
      "Description",
      "Created At ISO",
      "Created At Local",
    ],
    ...logs.map((log) => [
      log.id,
      log.user_id,
      getActivityUserName(log),
      log.user?.email ?? "",
      log.user?.role ?? "",
      log.module,
      log.action,
      log.description,
      log.created_at,
      new Date(log.created_at).toLocaleString(
        "en-PH",
      ),
    ]),
  ];

  const csv = rows
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = new Date()
    .toISOString()
    .slice(0, 10);

  anchor.href = url;
  anchor.download = `activity-logs-${date}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export async function exportFilteredActivityLogsCsv(
  query: Omit<ActivityLogQuery, "page" | "pageSize">,
): Promise<number> {
  const result = await getActivityLogPage({
    ...query,
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });

  exportActivityLogsCsv(result.items);

  return result.items.length;
}