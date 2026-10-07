import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export const DEFAULT_SERVICE_LIMIT = 5;
export type SlotRequestStatus = "Pending" | "Approved" | "Rejected";
export interface ServiceSlotRequest {
  id: number;
  worker_id: string;
  current_limit: number;
  requested_limit: number;
  reason: string;
  status: SlotRequestStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  worker_name?: string;
  worker_email?: string | null;
}

async function adminIds() {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");
  return (data ?? []).map((x) => String(x.id));
}
export async function getWorkerServiceLimit(workerId: string): Promise<number> {
  const { data, error } = await supabase
    .from("worker_service_limits")
    .select("service_limit")
    .eq("worker_id", workerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Math.max(
    DEFAULT_SERVICE_LIMIT,
    Number(data?.service_limit) || DEFAULT_SERVICE_LIMIT,
  );
}
export async function getPendingSlotRequest(
  workerId: string,
): Promise<ServiceSlotRequest | null> {
  const { data, error } = await supabase
    .from("service_slot_requests")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "Pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ServiceSlotRequest | null;
}
export async function requestAdditionalServiceSlot(
  workerId: string,
  reason: string,
): Promise<ServiceSlotRequest> {
  const clean = reason.trim();
  if (clean.length < 10)
    throw new Error(
      "Please explain why you need another service slot (at least 10 characters).",
    );
  const pending = await getPendingSlotRequest(workerId);
  if (pending)
    throw new Error(
      "You already have a pending additional service slot request.",
    );
  const currentLimit = await getWorkerServiceLimit(workerId);
  const { data, error } = await supabase
    .from("service_slot_requests")
    .insert({
      worker_id: workerId,
      current_limit: currentLimit,
      requested_limit: currentLimit + 1,
      reason: clean,
      status: "Pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const ids = await adminIds();
  await Promise.allSettled(
    ids.map((id) =>
      createNotification(
        id,
        0,
        "Additional Service Slot Request",
        `A worker requested an increase from ${currentLimit} to ${currentLimit + 1} service slots.`,
      ),
    ),
  );
  return data as ServiceSlotRequest;
}
export async function getAdminSlotRequests(): Promise<ServiceSlotRequest[]> {
  const { data, error } = await supabase
    .from("service_slot_requests")
    .select(
      `*, worker:profiles!worker_id(first_name,middle_name,last_name,email)`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const w = Array.isArray(r.worker) ? r.worker[0] : r.worker;
    return {
      ...r,
      worker_name:
        [w?.first_name, w?.middle_name, w?.last_name]
          .filter(Boolean)
          .join(" ") ||
        w?.email ||
        "Unknown worker",
      worker_email: w?.email ?? null,
    };
  });
}
export async function reviewServiceSlotRequest(
  request: ServiceSlotRequest,
  approve: boolean,
  adminNote: string,
): Promise<ServiceSlotRequest> {
  const status: SlotRequestStatus = approve ? "Approved" : "Rejected";
  if (!approve && adminNote.trim().length < 3)
    throw new Error("A rejection reason is required.");
  if (approve) {
    const { error: limitError } = await supabase
      .from("worker_service_limits")
      .upsert(
        {
          worker_id: request.worker_id,
          service_limit: request.requested_limit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "worker_id" },
      );
    if (limitError) throw new Error(limitError.message);
  }
  const { data, error } = await supabase
    .from("service_slot_requests")
    .update({
      status,
      admin_note: adminNote.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .eq("status", "Pending")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await createNotification(
    request.worker_id,
    0,
    approve ? "Service Slot Request Approved" : "Service Slot Request Rejected",
    approve
      ? `Your service limit is now ${request.requested_limit}. You can add another service.`
      : `Your request was rejected.${adminNote.trim() ? ` Reason: ${adminNote.trim()}` : ""}`,
  );
  return data as ServiceSlotRequest;
}
