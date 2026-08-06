import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export const WORKER_ONLINE_TIMEOUT_MS = 15 * 60 * 1000;
export const WORKER_HEARTBEAT_INTERVAL_MS = 30 * 1000;

export interface WorkerPresenceRecord {
  id: string;
  role: string;
  status: string | null;
  last_seen: string | null;
}

export interface WorkerBookability {
  online: boolean;
  approved: boolean;
  canBook: boolean;
  reason: string | null;
  lastSeen: string | null;
}

export function isRecentLastSeen(
  lastSeen: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastSeen) return false;

  const timestamp = new Date(lastSeen).getTime();
  if (!Number.isFinite(timestamp)) return false;

  return now - timestamp <= WORKER_ONLINE_TIMEOUT_MS;
}

export function isPresenceOnline(
  presence: Pick<WorkerPresenceRecord, "role" | "status" | "last_seen">,
): boolean {
  return (
    presence.role.toLowerCase() === "worker" &&
    presence.status === "Approved" &&
    isRecentLastSeen(presence.last_seen)
  );
}

export async function updateCurrentWorkerHeartbeat(): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", user.id)
    .eq("role", "worker");

  if (error) throw error;
}


export async function markCurrentWorkerOffline(): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen: null })
    .eq("id", user.id)
    .eq("role", "worker");

  if (error) throw error;
}

export async function getWorkerPresence(
  workerId: string,
): Promise<WorkerPresenceRecord> {
  const id = workerId.trim();
  if (!id) throw new Error("Worker ID is required.");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, status, last_seen")
    .eq("id", id)
    .eq("role", "worker")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Worker account was not found.");

  return data as WorkerPresenceRecord;
}

export async function getWorkerOnlineStatus(workerId: string): Promise<boolean> {
  const presence = await getWorkerPresence(workerId);
  return isPresenceOnline(presence);
}

export async function getWorkersOnlineStatus(
  workerIds: string[],
): Promise<Record<string, boolean>> {
  const ids = [...new Set(workerIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, status, last_seen")
    .in("id", ids)
    .eq("role", "worker");

  if (error) throw error;

  const statuses: Record<string, boolean> = Object.fromEntries(
    ids.map((id) => [id, false]),
  );

  for (const row of (data ?? []) as WorkerPresenceRecord[]) {
    statuses[row.id] = isPresenceOnline(row);
  }

  return statuses;
}

export async function getWorkerBookability(
  workerId: string,
): Promise<WorkerBookability> {
  const presence = await getWorkerPresence(workerId);
  const approved = presence.status === "Approved";
  const online = approved && isRecentLastSeen(presence.last_seen);

  let reason: string | null = null;
  if (!approved) {
    reason = "This worker account is currently unavailable.";
  } else if (!online) {
    reason = "This worker is currently offline. Please choose another available worker or try again later.";
  }

  return {
    online,
    approved,
    canBook: approved && online,
    reason,
    lastSeen: presence.last_seen,
  };
}

export function subscribeToWorkerPresence(
  workerId: string,
  onChange: (online: boolean, presence: WorkerPresenceRecord) => void,
): RealtimeChannel {
  return supabase
    .channel(`worker-presence-${workerId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${workerId}`,
      },
      (payload) => {
        const presence = payload.new as WorkerPresenceRecord;
        onChange(isPresenceOnline(presence), presence);
      },
    )
    .subscribe();
}
