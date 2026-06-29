import { supabase } from "../lib/supabase";

export async function getWorkers(status = "All") {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .order("created_at", { ascending: false });

  if (status !== "All") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

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

export async function getWorker(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}