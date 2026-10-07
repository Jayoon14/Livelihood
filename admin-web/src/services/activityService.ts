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
  actor_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  source?: string;
  outcome?: string;
  process_name?: string | null;
  process_stage?: string | null;
  process_id?: string | null;
  record_id?: string | null;
  crud_operation?: string | null;
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
  role?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBefore?: string;
  crud?: string;
  outcome?: string;
  sourceType?: "actual" | "historical" | "errors" | "all";
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

export const ACTIVITY_ACTIONS = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  CREATE: "CREATE",
  READ: "READ",
  VIEW: "VIEW",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CANCEL: "CANCEL",
  REGISTER: "REGISTER",
  EXPORT: "EXPORT",
  ACCEPT: "ACCEPT",
  COMPLETE: "COMPLETE",
  RESCHEDULE: "RESCHEDULE",
  REBOOK: "REBOOK",
  UPLOAD: "UPLOAD",
  DOWNLOAD: "DOWNLOAD",
  SEND: "SEND",
  PAY: "PAY",
  SUSPEND: "SUSPEND",
  RESTORE: "RESTORE",
  SYSTEM_ERROR: "SYSTEM_ERROR",
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
  PROFILES: "Profiles",
  SCHEDULES: "Schedules",
  DOCUMENTS: "Documents",
  MESSAGES: "Messages",
  REVIEWS: "Reviews",
  APPEALS: "Appeals",
} as const;

const PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const USER_FIELDS =
  "id,first_name,middle_name,last_name,suffix,email,role";

function activitySelect(): string {
  return `
    id,user_id,action,module,description,created_at,actor_id,actor_name,actor_email,actor_role,source,outcome,process_name,process_stage,process_id,record_id,crud_operation,
    user:profiles!activity_logs_user_id_fkey(
      ${USER_FIELDS}
    )
  `;
}

function errorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function throwIfError(error: unknown, fallback: string): void {
  if (error) {
    throw new Error(errorMessage(error, fallback));
  }
}

function requiredText(
  value: string,
  field: string,
  maximum: number,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  const text = value.trim();

  if (text.length > maximum) {
    throw new Error(`${field} must not exceed ${maximum} characters.`);
  }

  return text;
}

export function normalizeActivityAction(value: string): string {
  return requiredText(value, "Action", 100)
    .replace(/\s+/g, "_")
    .toUpperCase();
}

export function normalizeActivityModule(value: string): string {
  return requiredText(value, "Module", 100).replace(/\s+/g, " ");
}

function normalizeRecord(record: unknown): ActivityLogWithUser {
  const row = record as ActivityLog & {
    user?: ActivityUser | ActivityUser[] | null;
  };

  return {
    id: Number(row.id),
    actor_id: row.actor_id,
    actor_name: row.actor_name,
    actor_email: row.actor_email,
    actor_role: row.actor_role,
    source: row.source,
    outcome: row.outcome,
    process_name: row.process_name,
    process_stage: row.process_stage,
    process_id: row.process_id,
    record_id: row.record_id,
    crud_operation: row.crud_operation,
    user_id: String(row.actor_id ?? row.user_id ?? ""),
    action: row.action?.trim() || "UNKNOWN",
    module: row.module?.trim() || "Unknown",
    description: row.description?.trim() || "",
    created_at: row.created_at,
    user: Array.isArray(row.user)
      ? row.user[0] ?? null
      : row.user ?? null,
  };
}

export function getActivityUserName(log: ActivityLogWithUser): string {
  return log.actor_name || getActivityProfileName(log.user);
}

export function isHistoricalActivity(log: ActivityLog): boolean {
  return log.source === "HISTORICAL_IMPORT";
}

export function getActivityDisplayAction(log: ActivityLog): string {
  return isHistoricalActivity(log) ? "HISTORICAL SNAPSHOT" : log.action;
}

export function getActivityDisplayCrud(log: ActivityLog): string {
  return isHistoricalActivity(log) ? "—" : (log.crud_operation || "OTHER");
}

export function getActivityProfileName(
  user: ActivityUser | null | undefined,
): string {
  if (!user) return "Unknown user";

  const name = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return name || user.email || user.id || "Unknown user";
}

async function requireAuthenticatedUser(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  throwIfError(error, "Unable to verify the authenticated user.");

  if (!user) {
    throw new Error("You must be signed in to continue.");
  }

  return user.id;
}

async function requireProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,role")
    .eq("id", userId)
    .maybeSingle();

  throwIfError(error, "Unable to verify the user profile.");

  if (!data) {
    throw new Error("The authenticated profile does not exist.");
  }

  return data as { id: string; role: string | null };
}

async function requireAdminUser(): Promise<string> {
  const userId = await requireAuthenticatedUser();
  const profile = await requireProfile(userId);

  if (profile.role?.trim().toLowerCase() !== "admin") {
    throw new Error("Only administrators can access activity logs.");
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
    userId: requiredText(userId, "User ID", 100),
    action: normalizeActivityAction(action),
    module: normalizeActivityModule(module),
    description: requiredText(description, "Description", 1000),
  };

  const currentUserId = await requireAuthenticatedUser();

  const { data, error } = await supabase.rpc("record_activity_event", {
    p_action: payload.action,
    p_module: payload.module,
    p_description: payload.userId === currentUserId
      ? payload.description
      : `${payload.description} Target user: ${payload.userId}.`,
    p_outcome: "SUCCESS",
  });

  throwIfError(error, "Unable to save the activity log.");

  if (!data) {
    throw new Error("The saved activity log was not returned.");
  }

  return data as ActivityLog;
}

export async function logCurrentUserActivity(
  action: string,
  module: string,
  description: string,
): Promise<ActivityLog> {
  const userId = await requireAuthenticatedUser();

  return logActivity(userId, action, module, description);
}

function cleanFilter(value?: string): string {
  const text = value?.trim() ?? "";
  return text.toLowerCase() === "all" ? "" : text;
}

function searchKeyword(value: string): string {
  return value.replace(/[\\%_,()."*]/g, " ").trim();
}

// Date filters consistently use Philippine time.
function dateBoundary(value: string, nextDay = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  const date = new Date(`${value}T00:00:00+08:00`);

  if (
    Number.isNaN(date.getTime()) ||
    new Date(date.getTime() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10) !== value
  ) {
    throw new Error("Invalid calendar date.");
  }

  if (nextDay) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString();
}

function philippineToday(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export async function getActivityLogPage(
  query: ActivityLogQuery = {},
): Promise<ActivityLogPage> {
  await requireAdminUser();

  const page =
    Number.isSafeInteger(query.page) && (query.page ?? 0) > 0
      ? Number(query.page)
      : 1;

  const pageSize =
    Number.isSafeInteger(query.pageSize) && (query.pageSize ?? 0) > 0
      ? Math.min(Number(query.pageSize), MAX_PAGE_SIZE)
      : PAGE_SIZE;

  const from = (page - 1) * pageSize;
  const module = cleanFilter(query.module);
  const action = cleanFilter(query.action);
  const role = cleanFilter(query.role).toLowerCase();
  const userId = cleanFilter(query.userId);
  const search = query.search?.trim() ?? "";
  const dateFrom = query.dateFrom?.trim() ?? "";
  const dateTo = query.dateTo?.trim() ?? "";

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("Start date must not be later than end date.");
  }

  let request = supabase
    .from("activity_logs")
    .select(activitySelect(), { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);

  if (cleanFilter(query.crud)) request = request.eq("crud_operation", cleanFilter(query.crud));
  if (cleanFilter(query.outcome)) request = request.eq("outcome", cleanFilter(query.outcome));
  if (query.sourceType === "actual") {
    request = request.or("source.neq.HISTORICAL_IMPORT,source.is.null").neq("action", "SYSTEM_ERROR");
  }
  if (query.sourceType === "historical") request = request.eq("source", "HISTORICAL_IMPORT");
  if (query.sourceType === "errors") request = request.eq("action", "SYSTEM_ERROR").eq("outcome", "FAILED");
  if (module) request = request.eq("module", module);
  if (action) request = request.eq("action", action);
  // Role filtering is based on the current profile role rather than only actor_role.
  // Older audit rows may not have actor_role populated even though user_id is valid.
  // This keeps Worker/Customer/Admin + All users complete without scanning activity_logs.
  if (role && ["admin", "worker", "customer"].includes(role)) {
    const { data: roleProfiles, error: roleError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("role", role)
      .limit(1000);

    throwIfError(roleError, "Unable to resolve accounts for the selected role.");

    const roleUserIds = (roleProfiles ?? [])
      .map((profile) => profile.id as string | null)
      .filter((id): id is string => Boolean(id));

    if (roleUserIds.length === 0) {
      return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
    }

    request = request.in("user_id", roleUserIds);
  } else if (role) {
    request = request.ilike("actor_role", role);
  }

  // user_id is the canonical linked account for both current audit rows and
  // imported historical rows. actor_id can be missing on older records.
  if (userId) request = request.eq("user_id", userId);

  if (dateFrom) {
    request = request.gte("created_at", dateBoundary(dateFrom));
  }

  if (dateTo) {
    request = request.lt("created_at", dateBoundary(dateTo, true));
  }

  if (query.createdBefore) {
    const cutoff = new Date(query.createdBefore);

    if (Number.isNaN(cutoff.getTime())) {
      throw new Error("Invalid export cutoff.");
    }

    request = request.lte("created_at", cutoff.toISOString());
  }

  const keyword = searchKeyword(search);

  if (keyword) {
    const conditions = [
      `action.ilike.%${keyword}%`,
      `module.ilike.%${keyword}%`,
      `description.ilike.%${keyword}%`,
    ];

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        search,
      )
    ) {
      conditions.push(`user_id.eq.${search}`);
      conditions.push(`actor_id.eq.${search}`);
    }

    request = request.or(conditions.join(","));
  }

  const { data, error, count } = await request;

  throwIfError(error, "Unable to load activity logs.");

  const total = count ?? 0;

  return {
    items: (data ?? []).map(normalizeRecord),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getActivityLogs(): Promise<ActivityLogWithUser[]> {
  const result = await getActivityLogPage({
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  });

  return result.items;
}

export async function getActivityLogUserOptions(): Promise<ActivityUser[]> {
  await requireAdminUser();

  // User filter options come from profiles only. Do not scan the entire audit table:
  // that previously produced offset=3500/5000 requests and gateway timeouts.
  const users: ActivityUser[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select(USER_FIELDS)
      .order("id", { ascending: true })
      .range(offset, offset + MAX_PAGE_SIZE - 1);

    throwIfError(error, "Unable to load user filters.");

    const batch = (data ?? []) as ActivityUser[];
    users.push(...batch);
    if (batch.length < MAX_PAGE_SIZE) break;
    offset += MAX_PAGE_SIZE;
  }

  return users.sort((a, b) =>
    getActivityProfileName(a).localeCompare(getActivityProfileName(b)),
  );
}

export const DEFAULT_ACTIVITY_MODULES: string[] = [
  "Authentication", "Accounts", "Bookings", "Payments", "Messages", "Notifications",
  "Workers", "Customers", "Services", "Schedules", "Reports", "Reviews", "Analytics",
  "Account Enforcement", "Appeals", "Locations", "Worker Selection", "Documents",
  "System", "Forms", "Database Functions", "Server Functions",
  "Profiles", "Activity Logs", "Favorites", "Trusted Workers", "Recently Viewed",
  "Education", "Work Experience", "Worker Skills", "Worker Locations",
  "Worker Payment Information", "Unavailable Dates", "Booking Completion Images",
  "Booking Completion Proofs", "Notification Preferences", "Payment Transactions",
  "Report Logs", "Report Evidence", "Enforcement Actions", "Enforcement Appeals",
  "worker_locations", "profiles", "bookings", "payments", "payment_transactions",
  "services", "messages", "notifications", "notification_preferences", "reviews",
  "reports", "report_logs", "report_evidence", "enforcement_actions",
  "enforcement_appeals", "favorites", "trusted_workers", "recently_viewed",
  "documents", "education", "work_experience", "worker_skills",
  "worker_schedules", "workers_locations", "worker_payment_information",
  "unavailable_dates", "booking_completion_images", "booking_completion_proofs",
].sort();

export const DEFAULT_ACTIVITY_ACTIONS: string[] = [
  "CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "LOGOUT_REQUEST",
  "REGISTER", "PASSWORD", "CHANGE_PASSWORD", "APPROVE", "REJECT", "CANCEL",
  "ACCEPT", "COMPLETE", "RESCHEDULE", "REBOOK", "START", "PAY", "UPLOAD",
  "DOWNLOAD", "EXPORT", "VIEW", "EXECUTE", "SEND", "SUSPEND", "RESTORE",
].sort();

export async function getActivityLogFilterOptions(): Promise<{
  modules: string[];
  actions: string[];
}> {
  await requireAdminUser();

  // Keep filter metadata deterministic and cheap. New application modules/actions
  // should be added to the constants above instead of scanning every audit row.
  return {
    modules: [...DEFAULT_ACTIVITY_MODULES],
    actions: [...DEFAULT_ACTIVITY_ACTIONS],
  };
}

function actualActivityQuery() {
  return supabase
    .from("activity_logs")
    .select("id", { head: true, count: "planned" })
    .or("source.neq.HISTORICAL_IMPORT,source.is.null")
    .neq("action", "SYSTEM_ERROR");
}

export async function getActivityLogSummary(): Promise<ActivityLogSummary> {
  await requireAdminUser();

  const today = philippineToday();

  // Four small HEAD/count queries only. Historical snapshots are excluded because
  // they are not verified user actions and should not inflate live audit statistics.
  const results = await Promise.all([
    actualActivityQuery(),
    actualActivityQuery()
      .gte("created_at", dateBoundary(today))
      .lt("created_at", dateBoundary(today, true)),
    actualActivityQuery().eq("action", "APPROVE"),
    actualActivityQuery().in("action", ["DELETE", "REJECT", "CANCEL"]),
  ]);

  for (const result of results) {
    throwIfError(result.error, "Unable to load activity log summary.");
  }

  return {
    total: results[0].count ?? 0,
    today: results[1].count ?? 0,
    approvals: results[2].count ?? 0,
    destructive: results[3].count ?? 0,
  };
}

// Retained for compatibility with existing imports.
// These functions never send a DELETE request.
export async function deleteActivityLog(id: number): Promise<void> {
  void id;
  throw new Error("Activity logs cannot be deleted.");
}

export async function deleteAllActivityLogs(): Promise<number> {
  throw new Error("Activity logs cannot be deleted.");
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  const safe = /^\s*[=+@-]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportActivityLogsCsv(logs: ActivityLogWithUser[]): void {
  if (!logs.length) {
    throw new Error("There are no activity logs to export.");
  }

  const rows = [
    [
      "ID",
      "User ID",
      "User",
      "Email",
      "Role at Event",
      "Module",
      "Activity Type",
      "Action",
      "CRUD",
      "Outcome",
      "Process",
      "Stage",
      "Process ID",
      "Record ID",
      "Description",
      "Created At ISO",
      "Created At Philippines",
    ],
    ...logs.map((log) => [
      log.id,
      log.user_id,
      getActivityUserName(log),
      log.actor_email ?? log.user?.email ?? "",
      log.actor_role ?? log.user?.role ?? "",
      log.module,
      isHistoricalActivity(log) ? "Historical snapshot" : "Recorded activity",
      getActivityDisplayAction(log),
      getActivityDisplayCrud(log),
      log.outcome,
      log.process_name,
      log.process_stage,
      log.process_id,
      log.record_id,
      log.description,
      log.created_at,
      new Date(log.created_at).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
      }),
    ]),
  ];

  const csv = rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `activity-logs-${philippineToday()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportFilteredActivityLogsCsv(
  query: Omit<ActivityLogQuery, "page" | "pageSize">,
): Promise<number> {
  const cutoff = query.createdBefore ?? new Date().toISOString();
  const logs: ActivityLogWithUser[] = [];
  const seen = new Set<number>();

  let page = 1;

  while (true) {
    const result = await getActivityLogPage({
      ...query,
      createdBefore: cutoff,
      page,
      pageSize: MAX_PAGE_SIZE,
    });

    for (const log of result.items) {
      if (!seen.has(log.id)) {
        seen.add(log.id);
        logs.push(log);
      }
    }

    if (!result.items.length || page >= result.totalPages) {
      break;
    }

    page += 1;
  }

  exportActivityLogsCsv(logs);
  return logs.length;
}