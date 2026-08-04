import { supabase } from "../lib/supabase";

export type WorkerApprovalStatus =
  | "Pending"
  | "Approved"
  | "Rejected";

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

const wrap = (error: unknown, fallback: string): Error =>
  error instanceof Error
    ? error
    : new Error(fallback);

function requireId(id: string): string {
  const value = id.trim();

  if (!value) {
    throw new Error("Worker ID is required.");
  }

  return value;
}

export async function getPendingWorkers(): Promise<
  WorkerProfile[]
> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Pending")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw wrap(
      error,
      "Unable to load pending workers.",
    );
  }

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

  if (error) {
    throw wrap(
      error,
      `Unable to update worker status to ${status}.`,
    );
  }
}

export async function approveWorker(
  id: string,
): Promise<void> {
  await updateWorkerStatus(id, "Approved");
}

export async function rejectWorker(
  id: string,
  reason = "",
): Promise<void> {
  const workerId = requireId(id);

  const { data, error } =
    await supabase.functions.invoke(
      "reject-worker",
      {
        body: {
          workerId,
          reason: reason.trim() || null,
        },
      },
    );

  if (error) {
    throw new Error(
      `Unable to reject worker: ${error.message}`,
    );
  }

  const response = data as {
    success?: boolean;
    error?: string;
    message?: string;
  } | null;

  if (!response?.success) {
    throw new Error(
      response?.error ??
        "Worker rejection did not complete.",
    );
  }
}