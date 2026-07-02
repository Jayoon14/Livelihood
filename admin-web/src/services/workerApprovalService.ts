import { supabase } from "../lib/supabase";

export async function getPendingWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Pending")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function approveWorker(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "Approved",
    })
    .eq("id", id);

  if (error) throw error;
}

export async function rejectWorker(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "Rejected",
    })
    .eq("id", id);

  if (error) throw error;
}