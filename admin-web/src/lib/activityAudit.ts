/** Transport audit: never records bodies, passwords, tokens, or message contents. */
const originalFetch = globalThis.fetch.bind(globalThis);
let auditFailureShown = false;
const recentSystemErrors = new Map<string, number>();
const SYSTEM_ERROR_DEDUPE_MS = 15_000;

const MODULE_BY_RESOURCE: Record<string, string> = {
  profiles: "Accounts", workers: "Workers", customers: "Customers",
  bookings: "Bookings", services: "Services", schedules: "Schedules",
  worker_schedules: "Schedules", unavailable_dates: "Schedules",
  payments: "Payments", payment_transactions: "Payments", worker_payment_information: "Payments",
  messages: "Messages", notifications: "Notifications", notification_preferences: "Notifications",
  reviews: "Reviews", reports: "Reports", report_logs: "Reports", report_evidence: "Reports",
  enforcement_actions: "Account Enforcement", enforcement_appeals: "Appeals",
  documents: "Documents", education: "Documents", work_experience: "Documents", worker_skills: "Workers",
  favorites: "Worker Selection", trusted_workers: "Worker Selection", recently_viewed: "Worker Selection",
  worker_locations: "Locations", workers_locations: "Locations",
  booking_completion_images: "Bookings", booking_completion_proofs: "Bookings",
};

function moduleForResource(resource: string): string {
  return MODULE_BY_RESOURCE[resource] ?? resource.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function shouldRecordSystemError(key: string): boolean {
  const now = Date.now();
  const previous = recentSystemErrors.get(key) ?? 0;
  if (now - previous < SYSTEM_ERROR_DEDUPE_MS) return false;
  recentSystemErrors.set(key, now);
  if (recentSystemErrors.size > 100) {
    for (const [entry, time] of recentSystemErrors) if (now - time > SYSTEM_ERROR_DEDUPE_MS) recentSystemErrors.delete(entry);
  }
  return true;
}

function bearer(headers: Headers): string | null {
  const value = headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  try {
    const part = value.slice(7).split(".")[1];
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.sub === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function sendAudit(
  authorization: string,
  action: string,
  module: string,
  description: string,
  outcome = "SUCCESS",
): Promise<void> {
  const response = await originalFetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/record_activity_event`,
    {
      method: "POST",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        authorization,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_action: action,
        p_module: module,
        p_description: description.slice(0, 1000),
        p_outcome: outcome,
      }),
      keepalive: true,
      signal: AbortSignal.timeout(4000),
    },
  );
  if (!response.ok) throw await auditResponseError(response);
}

export async function auditResponseError(response: Response): Promise<Error> {
  let code = "";
  let message = "";
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === "object") {
      if ("code" in body && typeof body.code === "string") code = body.code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30);
      if ("message" in body && typeof body.message === "string") message = body.message
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]")
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
        .replace(/((?:password|otp|token|secret|api[_ -]?key)\s*[:=]\s*)\S+/gi, "$1[redacted]")
        .slice(0, 300);
    }
  } catch { /* Non-JSON proxy/network response: HTTP status is still useful. */ }
  const hint = code === "PGRST202" || code === "42883" ? "Run the audit setup SQL, then reload the schema."
    : code === "42501" ? "Audit function permissions are missing. Run the audit setup SQL."
    : response.status === 401 ? "Your session may have expired. Log in again."
    : code === "23514" ? "An activity_logs constraint rejected the event. Check the audit diagnostic SQL."
    : code === "42703" || code === "PGRST204" ? "Audit columns are missing. Run the audit setup SQL."
    : "Check the audit diagnostic SQL and this error code.";
  return new Error(`Audit save failed: HTTP ${response.status}${code ? " / " + code : ""}. ${hint}${message ? " Server: " + message : ""}`);
}

export function reportAuditFailure(error?: unknown): void {
  if (auditFailureShown) return;
  auditFailureShown = true;
  const message = error instanceof Error ? error.message : "Activity auditing is unavailable. Run the audit setup SQL and check access permissions.";
  console.error(message);
  window.dispatchEvent(new CustomEvent("activity-audit-unavailable", { detail: message }));
}

export const auditedFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const base = new URL(import.meta.env.VITE_SUPABASE_URL);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  const authorization = bearer(headers);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const path = url.pathname;
  const internal = path.includes("activity_logs") || path.includes("record_activity_event") || path.includes("record_process_event") || path.includes("record_anonymous_process_event");
  let action = "";
  let module = "";
  let description = "";
  if (url.origin === base.origin && !internal && authorization) {
    const table = path.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
    // Do not audit generic GET/HEAD requests. Reading a page can issue many database
    // requests, and auditing every read creates an INSERT -> realtime refresh -> GET
    // feedback loop on the Activity Logs screen. Meaningful VIEW/READ events should
    // be recorded explicitly by the feature that owns them.
    if (table && !["GET", "HEAD"].includes(method)) {
      // Successful row mutations are captured transactionally by SQL triggers.
      action = method === "DELETE" ? "DELETE" : method === "PATCH" ? "UPDATE" : "CREATE";
      module = moduleForResource(table); description = `${action} request for ${table}.`;
    } else if (path.startsWith("/rest/v1/rpc/")) {
      const rpc = path.split("/").pop() ?? "database function";
      action = "EXECUTE"; module = "Database Functions";
      description = `Executed ${rpc}.`;
    } else if (path.startsWith("/storage/v1/")) {
      action = method === "GET" ? "DOWNLOAD" : method === "DELETE" ? "DELETE" : method === "PUT" ? "UPDATE" : "UPLOAD";
      if (path.includes("/object/list/")) action = "READ";
      module = "Documents"; description = `${action} storage request.`;
    } else if (path.startsWith("/functions/v1/")) {
      action = "EXECUTE"; module = "Server Functions";
      description = `Invoked ${path.split("/").pop()}.`;
    } else if (path === "/auth/v1/logout") {
      // Record before token revocation; distinguish request from confirmed success.
      try { await sendAudit(authorization, "LOGOUT_REQUEST", "Authentication", "Requested logout."); }
      catch (auditError) { reportAuditFailure(auditError); }
    } else if (path === "/auth/v1/user" && method === "PUT") {
      action = "UPDATE"; module = "Authentication";
      description = "Updated authentication account details (values redacted).";
      try {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;
        if (body && Object.hasOwn(body, "password")) {
          action = "CHANGE_PASSWORD";
          description = "Changed account password (password redacted).";
        }
      } catch { /* Never log request bodies. */ }
    }
  }

  let response: Response;
  try {
    response = await originalFetch(input, init);
  } catch (error) {
    if (authorization && action) {
      try { await sendAudit(authorization, "SYSTEM_ERROR", module, `${method} ${module}: network request failed.`, "FAILED"); }
      catch (auditError) { reportAuditFailure(auditError); }
    }
    throw error;
  }

  // Failed reads are operationally important, but successful reads are intentionally not
  // transport-audited. Deduplication prevents an outage/re-render loop from creating
  // thousands of identical SYSTEM_ERROR rows.
  if (url.origin === base.origin && authorization && !internal && !response.ok && ["GET", "HEAD"].includes(method)) {
    const table = path.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
    const failedModule = table ? moduleForResource(table)
      : path.startsWith("/storage/v1/") ? "Documents"
      : path.startsWith("/functions/v1/") ? "Server Functions"
      : path.startsWith("/auth/v1/") ? "Authentication" : "System";
    const key = `${method}:${path}:${response.status}`;
    if (shouldRecordSystemError(key)) {
      try { await sendAudit(authorization, "SYSTEM_ERROR", failedModule, `${method} ${failedModule} failed with HTTP ${response.status}.`, "FAILED"); }
      catch (auditError) { reportAuditFailure(auditError); }
    }
  }

  if (url.origin === base.origin && (path === "/auth/v1/token" || path === "/auth/v1/verify") && response.ok && url.searchParams.get("grant_type") !== "refresh_token") {
    try {
      const result = await response.clone().json();
      if (result.access_token) {
        await sendAudit(`Bearer ${result.access_token}`, "LOGIN", "Authentication", "Authenticated successfully.");
      }
    } catch (auditError) { reportAuditFailure(auditError); }
  }

  const rowMutation = /^\/rest\/v1\/[^/]+$/.test(path) && !["GET", "HEAD"].includes(method);
  if (authorization && action && (!rowMutation || !response.ok)) {
    try {
      if (!response.ok) {
        // Technical failures are stored as a dedicated system-error event so Admin
        // can review them separately from normal user/business activities.
        const key = `${method}:${path}:${response.status}`;
        if (shouldRecordSystemError(key)) await sendAudit(authorization, "SYSTEM_ERROR", module, `${method} ${module} failed with HTTP ${response.status}.`, "FAILED");
      } else {
        await sendAudit(authorization, action, module, `${description} HTTP ${response.status}.`, "SUCCESS");
      }
    } catch (auditError) { reportAuditFailure(auditError); }
  }
  return response;
};
