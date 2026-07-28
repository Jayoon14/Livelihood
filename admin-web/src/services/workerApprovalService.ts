import { supabase } from "../lib/supabase";

export type WorkerApprovalStatus = "Pending" | "Approved" | "Rejected";

export interface WorkerProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  status: WorkerApprovalStatus;
  role: string;
  created_at?: string;
  [key: string]: unknown;
}

const wrap = (e: unknown, m: string) => (e instanceof Error ? e : new Error(m));

function requireId(id: string) {
  const v = id.trim();
  if (!v) throw new Error("Worker ID is required.");
  return v;
}

export async function getPendingWorkers(): Promise<WorkerProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Pending")
    .order("created_at", { ascending: false });
  if (error) throw wrap(error, "Unable to load pending workers.");
  return (data ?? []) as WorkerProfile[];
}

async function updateWorkerStatus(
  id: string,
  status: WorkerApprovalStatus,
): Promise<void> {
  const workerId = requireId(id);
  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workerId)
    .eq("role", "worker");
  if (error) throw wrap(error, `Unable to update worker status to ${status}.`);
}

export async function approveWorker(id: string): Promise<void> {
  await updateWorkerStatus(id, "Approved");
}

export async function rejectWorker(id: string): Promise<void> {
  await updateWorkerStatus(id, "Rejected");
}
