import { supabase } from "../lib/supabase";


// =========================
// GET ALL PROFILES (DEBUG)
// =========================

export async function getPendingWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Pending")
    .order("created_at", { ascending: false });

  console.log("Pending Workers:", data);
  console.log("Supabase Error:", error);

  if (error) throw error;

  return data ?? [];
}


// =========================
// APPROVE WORKER
// =========================

export async function approveWorker(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "Approved",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}


// =========================
// REJECT WORKER
// =========================

export async function rejectWorker(id: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "Rejected",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}