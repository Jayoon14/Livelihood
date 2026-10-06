import { supabase } from "./supabase";
import { auditResponseError, reportAuditFailure } from "./activityAudit";

export interface ProcessContext {
  module: string;
  process: string;
  action: string;
  parameters?: Record<string, unknown>;
  processId?: string;
}

const SAFE_FIELDS = new Set([
  "id", "bookingId", "booking_id", "paymentId", "payment_id",
  "transactionId", "transaction_id", "reportId", "report_id", "reviewId", "review_id",
  "serviceId", "service_id", "workerId", "worker_id", "customerId", "customer_id",
  "userId", "user_id", "amount", "amountPaid", "amount_paid", "paymentMethod",
  "payment_method", "status", "schedule_status", "completion_status", "trip_status",
]);

function safeDetails(values?: Record<string, unknown>): string {
  const details: string[] = [];
  const inspect = (object: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(object)) {
      if (!SAFE_FIELDS.has(key)) continue;
      if (typeof value === "number" && Number.isFinite(value)) details.push(`${key}=${value}`);
      if (typeof value === "string" && /^[a-zA-Z0-9 _:-]{1,80}$/.test(value)) details.push(`${key}=${value}`);
    }
  };
  if (values) {
    inspect(values);
    for (const value of Object.values(values)) {
      if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof File)) {
        inspect(value as Record<string, unknown>);
      }
    }
  }
  return details.slice(0, 16).join("; ");
}

export function safeAuditError(error: unknown): string {
  const message = typeof error === "string" ? error : error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "Operation failed.";
  return message
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/\b\d{6,}\b/g, "[number redacted]")
    .replace(/((?:password|otp|token|secret|api[_ -]?key)\s*[:=]\s*)\S+/gi, "$1[redacted]")
    .slice(0, 600);
}

async function authorization(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session ? `Bearer ${data.session.access_token}` : null;
  } catch { return null; }
}

function displayProcess(value: string): string {
  return value.replace(/^handle/, "").replace(/^get/, "View").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim().replace(/^./, character => character.toUpperCase());
}

function recordId(context: ProcessContext): string | null {
  const candidates = ["bookingId", "booking_id", "paymentId", "payment_id", "transactionId", "transaction_id", "reportId", "report_id", "serviceId", "service_id", "id"];
  const values = [context.parameters, ...Object.values(context.parameters ?? {}).filter(value => value && typeof value === "object" && !Array.isArray(value))] as (Record<string, unknown> | undefined)[];
  for (const object of values) {
    if (!object) continue;
    for (const key of candidates) {
      const value = object[key];
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
      if (typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) return value;
    }
  }
  return null;
}

async function event(context: ProcessContext, stage: string, outcome: string, details = "", token?: string | null) {
  const auth = token ?? await authorization();
  if (!auth && context.module !== "Authentication") return;
  const process = displayProcess(context.process);
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/${auth ? "record_process_event" : "record_anonymous_process_event"}`, {
      method: "POST",
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, authorization: auth ?? `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        p_action: context.action,
        p_module: context.module,
        p_process: process,
        p_stage: stage,
        p_process_id: context.processId ?? crypto.randomUUID(),
        p_record_id: auth ? recordId(context) : null,
        p_description: `${process}: ${stage.toLowerCase().replaceAll("_", " ")}. ${auth ? safeDetails(context.parameters) : "Anonymous event; identity unverified"}${details ? ". " + details : ""}`.slice(0, 1000),
        p_outcome: outcome,
      }),
      keepalive: true,
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw await auditResponseError(response);
    if (context.module === "Authentication" && !auth && await response.clone().json() === false) {
      throw new Error("Anonymous audit limit reached; this event was not saved. Try again after one minute.");
    }
  } catch (auditError) { reportAuditFailure(auditError); }
}

export interface ProcessAuditScope {
  caught(error: unknown): void;
  skipped(): void;
  failAndNotify<T, A extends unknown[]>(notify: (...args: A) => T, ...args: A): T;
}

export async function runAuditedProcess<T>(
  context: ProcessContext,
  run: (scope: ProcessAuditScope) => Promise<T>,
): Promise<T> {
  context = { ...context, processId: context.processId ?? crypto.randomUUID() };
  // Start telemetry without delaying the original handler's synchronous prefix.
  // React event.currentTarget must be read before the original handler yields.
  const tokenPromise = authorization();
  let hadError = false;
  let skipped = false;
  let queue = tokenPromise.then(token => event(context, "ATTEMPT", "PENDING", "Process started; final result is recorded separately.", token));
  const enqueue = (stage: string, details: string) => {
    queue = queue.then(async () => event(context, stage, "FAILED", details, await tokenPromise));
  };
  const scope: ProcessAuditScope = {
    skipped() { skipped = true; },
    caught(error) {
      hadError = true;
      enqueue("ERROR", safeAuditError(error));
    },
    failAndNotify(notify, ...args) {
      hadError = true;
      enqueue("VALIDATION_FAILED", safeAuditError(args[0]));
      return notify(...args);
    },
  };
  try {
    const result = await run(scope);
    if (result && typeof result === "object" && "error" in result && result.error) scope.caught(result.error);
    if (result && typeof result === "object" && !Array.isArray(result)) context = { ...context, parameters: { ...context.parameters, result } };
    const output = result && typeof result === "object" && !Array.isArray(result) ? safeDetails(result as Record<string, unknown>) : "";
    const stage = hadError ? "COMPLETED_WITH_ERRORS" : skipped ? "SKIPPED" : "SUCCESS";
    const outcome = hadError ? "FAILED" : skipped ? "SKIPPED" : "SUCCESS";
    // Audit completion must not delay the business result or hold auth callbacks open.
    void queue.then(async () => event(context, stage, outcome, output, await tokenPromise)).catch(reportAuditFailure);
    return result;
  } catch (error) {
    const details = safeAuditError(error);
    void queue.then(async () => event(context, "FAILED", "FAILED", details, await tokenPromise)).catch(reportAuditFailure);
    throw error;
  }
}

// UI validation which returns before calling a service still gets a failed event.
export function auditUiError<T, A extends unknown[]>(context: ProcessContext, notify: (...args: A) => T, ...args: A): T {
  void event(context, "VALIDATION_FAILED", "FAILED", safeAuditError(args[0]));
  return notify(...args);
}

export function auditCaughtError(context: ProcessContext, error: unknown): void {
  void event(context, "ERROR", "FAILED", safeAuditError(error));
}
