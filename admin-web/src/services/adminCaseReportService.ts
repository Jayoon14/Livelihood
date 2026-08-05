import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";
import { logActivity } from "./activityService";
import type {
  ReportCase,
  ReportEvidence,
  ReportLog,
  ReportPriority,
  ReportStatus,
} from "../types/report";

export interface CasePerson {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  profile_picture: string | null;
}

export interface AdminCaseListItem extends ReportCase {
  reporter: CasePerson | null;
  reported_user: CasePerson | null;
}

export interface AdminCaseDetails {
  report: AdminCaseListItem;
  booking: {
    id: number;
    status: string | null;
    service_id: number | null;
    customer_id: string;
    worker_id: string;
    booking_date: string | null;
    booking_time: string | null;
    created_at: string | null;
  } | null;
  service_name: string | null;
  evidence: Array<ReportEvidence & { signed_url: string | null }>;
  logs: ReportLog[];
}

export interface AdminCaseFilters {
  search?: string;
  status?: string;
  priority?: string;
  caseType?: string;
}

function fullName(person: CasePerson | null): string {
  if (!person) return "Unknown user";
  return [person.first_name, person.middle_name, person.last_name]
    .filter(Boolean)
    .join(" ") || person.email || "Unknown user";
}

export function getCasePersonName(person: CasePerson | null): string {
  return fullName(person);
}

async function getCurrentAdminId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Administrator session expired.");
  return data.user.id;
}

async function attachPeople(reports: ReportCase[]): Promise<AdminCaseListItem[]> {
  const ids = [...new Set(reports.flatMap((item) => [item.reporter_id, item.reported_user_id]))];
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, middle_name, last_name, email, role, status, profile_picture")
    .in("id", ids);
  if (error) throw error;

  const people = new Map((data ?? []).map((item) => [String(item.id), item as CasePerson]));
  return reports.map((report) => ({
    ...report,
    reporter: people.get(report.reporter_id) ?? null,
    reported_user: people.get(report.reported_user_id) ?? null,
  }));
}

export async function getAdminCases(filters: AdminCaseFilters = {}): Promise<AdminCaseListItem[]> {
  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.caseType) query = query.eq("case_type", filters.caseType);

  const { data, error } = await query;
  if (error) throw error;
  let items = await attachPeople((data ?? []) as ReportCase[]);

  const search = filters.search?.trim().toLowerCase();
  if (search) {
    items = items.filter((item) =>
      [item.id, item.subject, item.category, String(item.booking_id), fullName(item.reporter), fullName(item.reported_user)]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }
  return items;
}

export async function getAdminCaseSummary(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("reports").select("status, priority");
  if (error) throw error;
  const rows = data ?? [];
  return {
    total: rows.length,
    submitted: rows.filter((r) => r.status === "submitted").length,
    under_review: rows.filter((r) => r.status === "under_review").length,
    needs_more_information: rows.filter((r) => r.status === "needs_more_information").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    high_priority: rows.filter((r) => r.priority === "high" || r.priority === "urgent").length,
  };
}

export async function getAdminCaseDetails(reportId: string): Promise<AdminCaseDetails> {
  const reportResult = await supabase.from("reports").select("*").eq("id", reportId).single();
  if (reportResult.error) throw reportResult.error;
  const [enriched] = await attachPeople([reportResult.data as ReportCase]);

  const [bookingResult, evidenceResult, logsResult] = await Promise.all([
    supabase.from("bookings").select("id, status, service_id, customer_id, worker_id, booking_date, booking_time, created_at").eq("id", enriched.booking_id).maybeSingle(),
    supabase.from("report_evidence").select("*").eq("report_id", reportId).order("created_at"),
    supabase.from("report_logs").select("*").eq("report_id", reportId).order("created_at"),
  ]);
  if (bookingResult.error) throw bookingResult.error;
  if (evidenceResult.error) throw evidenceResult.error;
  if (logsResult.error) throw logsResult.error;

  let serviceName: string | null = null;
  if (bookingResult.data?.service_id) {
    const serviceResult = await supabase.from("services").select("service_name").eq("id", bookingResult.data.service_id).maybeSingle();
    if (!serviceResult.error) serviceName = serviceResult.data?.service_name ?? null;
  }

  const evidence = await Promise.all(((evidenceResult.data ?? []) as ReportEvidence[]).map(async (item) => {
    const signed = await supabase.storage.from(item.storage_bucket).createSignedUrl(item.storage_path, 3600);
    return { ...item, signed_url: signed.data?.signedUrl ?? null };
  }));

  return {
    report: enriched,
    booking: bookingResult.data as AdminCaseDetails["booking"],
    service_name: serviceName,
    evidence,
    logs: (logsResult.data ?? []) as ReportLog[],
  };
}

export async function updateAdminCase(input: {
  reportId: string;
  status: ReportStatus;
  priority: ReportPriority;
  adminNotes?: string;
  resolution?: string;
}): Promise<void> {
  const adminId = await getCurrentAdminId();
  const before = await supabase.from("reports").select("reporter_id, reported_user_id, booking_id, status").eq("id", input.reportId).single();
  if (before.error) throw before.error;

  const { error } = await supabase.from("reports").update({
    status: input.status,
    priority: input.priority,
    admin_notes: input.adminNotes?.trim() || null,
    resolution: input.resolution?.trim() || null,
    assigned_admin_id: adminId,
  }).eq("id", input.reportId);
  if (error) throw error;

  await supabase.from("report_logs").insert({
    report_id: input.reportId,
    actor_id: adminId,
    action: "admin_review_updated",
    old_status: before.data.status,
    new_status: input.status,
    note: input.resolution?.trim() || input.adminNotes?.trim() || "Administrator updated the case.",
    is_public: true,
  });

  const title = input.status === "resolved" ? "Case Resolved" : input.status === "rejected" ? "Case Decision" : "Case Status Updated";
  const message = input.resolution?.trim() || `Your report is now ${input.status.replaceAll("_", " ")}.`;
  await Promise.allSettled([
    createNotification(before.data.reporter_id, before.data.booking_id, title, message),
    createNotification(before.data.reported_user_id, before.data.booking_id, "Report Review Update", `A case involving your account is now ${input.status.replaceAll("_", " ")}.`),
    logActivity(adminId, "UPDATED", "Reports & Complaints", `Updated case ${input.reportId} to ${input.status}.`),
  ]);
}

export async function issueCaseWarning(reportId: string, userId: string, bookingId: number, message: string): Promise<void> {
  const adminId = await getCurrentAdminId();
  const note = message.trim();
  if (note.length < 10) throw new Error("Warning message must contain at least 10 characters.");
  await createNotification(userId, bookingId, "Account Warning", note);
  const { error } = await supabase.from("report_logs").insert({
    report_id: reportId, actor_id: adminId, action: "warning_issued", note, is_public: false,
  });
  if (error) throw error;
  await logActivity(adminId, "WARNING", "Reports & Complaints", `Issued a warning for case ${reportId}.`);
}

export async function suspendReportedUser(reportId: string, userId: string, reason: string): Promise<void> {
  const adminId = await getCurrentAdminId();
  const note = reason.trim();
  if (note.length < 10) throw new Error("Suspension reason must contain at least 10 characters.");
  const { error } = await supabase.from("profiles").update({ status: "Disabled" }).eq("id", userId);
  if (error) throw error;
  await Promise.allSettled([
    createNotification(userId, null, "Account Suspended", note),
    supabase.from("report_logs").insert({ report_id: reportId, actor_id: adminId, action: "account_suspended", note, is_public: false }),
    logActivity(adminId, "SUSPENDED", "Reports & Complaints", `Suspended user ${userId} from case ${reportId}.`),
  ]);
}

export function subscribeToAdminCases(onChange: () => void): () => void {
  const channel = supabase.channel("admin-report-cases").on("postgres_changes", { event: "*", schema: "public", table: "reports" }, onChange).subscribe();
  return () => { void supabase.removeChannel(channel); };
}
