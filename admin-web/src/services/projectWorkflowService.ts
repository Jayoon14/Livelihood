import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export type ProjectSession = {
  id: number;
  booking_id: number;
  work_date: string;
  started_at: string;
  ended_at: string | null;
  progress_note: string | null;
  proof_url: string | null;
  status: string;
};
export type ProjectRequest = {
  id: number;
  booking_id: number;
  request_type: "reschedule" | "extension" | "additional_work" | "cash_advance";
  amount: number | null;
  additional_days: number | null;
  proposed_date: string | null;
  reason: string;
  status: "Pending" | "Approved" | "Declined";
  created_at: string;
};

async function authId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("You must be signed in.");
  return user.id;
}
async function bookingParties(bookingId: number) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,customer_id,worker_id,status,agreed_pricing_type,agreed_rate,service:services!service_id(scheduling_type,pricing_type,price)",
    )
    .eq("id", bookingId)
    .single();
  if (error || !data) throw new Error(error?.message || "Booking not found.");
  return data;
}
export async function getProjectWorkflow(bookingId: number) {
  const [sessions, requests] = await Promise.all([
    supabase
      .from("project_work_sessions")
      .select("*")
      .eq("booking_id", bookingId)
      .order("started_at", { ascending: false }),
    supabase
      .from("project_requests")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
  ]);
  if (sessions.error) throw sessions.error;
  if (requests.error) throw requests.error;
  return {
    sessions: (sessions.data || []) as ProjectSession[],
    requests: (requests.data || []) as ProjectRequest[],
  };
}
export async function startProjectWork(bookingId: number) {
  const uid = await authId();
  const b = await bookingParties(bookingId);
  if (b.worker_id !== uid)
    throw new Error("Only the assigned worker can start work.");
  if (b.service?.scheduling_type !== "project")
    throw new Error("Daily work sessions are only for projects.");
  const { data: open } = await supabase
    .from("project_work_sessions")
    .select("id")
    .eq("booking_id", bookingId)
    .is("ended_at", null)
    .maybeSingle();
  if (open) throw new Error("End the current work session first.");
  const now = new Date();
  const { error } = await supabase
    .from("project_work_sessions")
    .insert({
      booking_id: bookingId,
      worker_id: uid,
      work_date: now.toISOString().slice(0, 10),
      started_at: now.toISOString(),
      status: "Working",
    });
  if (error) throw error;
  await supabase
    .from("bookings")
    .update({ status: "On Going" })
    .eq("id", bookingId)
    .eq("worker_id", uid);
  await createNotification(
    b.customer_id,
    bookingId,
    "Project work started",
    "The worker started today's project work session.",
  );
}
export async function endProjectWork(bookingId: number, note: string) {
  const uid = await authId();
  const b = await bookingParties(bookingId);
  if (b.worker_id !== uid)
    throw new Error("Only the assigned worker can end work.");
  const { data: open, error: q } = await supabase
    .from("project_work_sessions")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("worker_id", uid)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (q) throw q;
  if (!open) throw new Error("There is no active work session.");
  const { error } = await supabase
    .from("project_work_sessions")
    .update({
      ended_at: new Date().toISOString(),
      progress_note: note.trim() || "Work day completed.",
      status: "Completed",
    })
    .eq("id", open.id);
  if (error) throw error;
  await createNotification(
    b.customer_id,
    bookingId,
    "Project work day ended",
    note.trim() || "The worker ended today's work session.",
  );
}
export async function createProjectRequest(
  bookingId: number,
  input: {
    request_type: ProjectRequest["request_type"];
    reason: string;
    amount?: number;
    additional_days?: number;
    proposed_date?: string;
  },
) {
  const uid = await authId();
  const b = await bookingParties(bookingId);
  if (b.worker_id !== uid)
    throw new Error("Only the assigned worker can submit this request.");
  if (
    input.request_type === "cash_advance" &&
    (b.agreed_pricing_type ?? b.service?.pricing_type) !== "fixed"
  )
    throw new Error("Cash advance is only available for Fixed Price projects.");
  const row = {
    booking_id: bookingId,
    worker_id: uid,
    customer_id: b.customer_id,
    request_type: input.request_type,
    reason: input.reason.trim(),
    amount: input.amount || null,
    additional_days: input.additional_days || null,
    proposed_date: input.proposed_date || null,
    status: "Pending",
  };
  if (!row.reason) throw new Error("Please enter a reason.");
  const { error } = await supabase.from("project_requests").insert(row);
  if (error) throw error;
  await createNotification(
    b.customer_id,
    bookingId,
    "Project request",
    "The worker submitted a project request for your review.",
  );
}
export async function decideProjectRequest(
  requestId: number,
  decision: "Approved" | "Declined",
) {
  const uid = await authId();
  const { data: r, error: q } = await supabase
    .from("project_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (q || !r) throw new Error(q?.message || "Request not found.");
  if (r.customer_id !== uid)
    throw new Error("Only the customer can decide this request.");
  const { error } = await supabase
    .from("project_requests")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "Pending");
  if (error) throw error;
  if (
    decision === "Approved" &&
    r.request_type === "reschedule" &&
    r.proposed_date
  ) {
    const { error: be } = await supabase
      .from("bookings")
      .update({ booking_date: r.proposed_date, schedule_status: "Scheduled" })
      .eq("id", r.booking_id)
      .eq("customer_id", uid);
    if (be) throw be;
  }
  if (
    decision === "Approved" &&
    r.request_type === "additional_work" &&
    Number(r.amount || 0) > 0
  ) {
    const { data: b, error: bq } = await supabase
      .from("bookings")
      .select("price")
      .eq("id", r.booking_id)
      .single();
    if (bq) throw bq;
    const { error: be } = await supabase
      .from("bookings")
      .update({ price: Number(b?.price || 0) + Number(r.amount) })
      .eq("id", r.booking_id)
      .eq("customer_id", uid);
    if (be) throw be;
  }
  await createNotification(
    r.worker_id,
    r.booking_id,
    `Project request ${decision.toLowerCase()}`,
    `The customer ${decision.toLowerCase()} your ${String(r.request_type).replaceAll("_", " ")} request.`,
  );
}
