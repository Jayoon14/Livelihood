/** Transport audit: never records bodies, passwords, tokens, or message contents. */
const originalFetch = globalThis.fetch.bind(globalThis);
let auditFailureShown = false;

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
  const auditScreen = window.location.pathname === "/activity-logs";

  let action = "";
  let module = "";
  let description = "";
  if (url.origin === base.origin && !internal && authorization) {
    const table = path.match(/^\/rest\/v1\/([^/]+)$/)?.[1];
    if (table && (method === "GET" || method === "HEAD") && !auditScreen) {
      action = "READ"; module = table; description = `Read ${table} records.`;
    } else if (table && !["GET", "HEAD"].includes(method)) {
      // Successful row mutations are captured transactionally by SQL triggers.
      action = method === "DELETE" ? "DELETE" : method === "PATCH" ? "UPDATE" : "CREATE";
      module = table; description = `${action} request for ${table}.`;
    } else if (path.startsWith("/rest/v1/rpc/")) {
      action = "EXECUTE"; module = "Database Functions";
      description = `Executed ${path.split("/").pop()}.`;
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
      try { await sendAudit(authorization, action, module, description + " Network request failed.", "FAILED"); }
      catch (auditError) { reportAuditFailure(auditError); }
    }
    throw error;
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
      await sendAudit(authorization, action, module, `${description} HTTP ${response.status}.`, response.ok ? "SUCCESS" : "FAILED");
    } catch (auditError) { reportAuditFailure(auditError); }
  }
  return response;
};
