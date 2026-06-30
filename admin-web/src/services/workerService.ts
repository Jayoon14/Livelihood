import { supabase } from "../lib/supabase";

// ==================== WORKERS ====================

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

export async function getWorker(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

// Alias (used in WorkerDetails)
export async function getWorkerById(id: string) {
  return getWorker(id);
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

// ==================== EDUCATION ====================

export async function getEducation(profileId: string) {
  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  return data;
}

// ==================== WORK EXPERIENCE ====================

export async function getWorkExperience(profileId: string) {
  const { data, error } = await supabase
    .from("work_experience")
    .select("*")
    .eq("profile_id", profileId);

  if (error) throw error;

  return data;
}

// ==================== SKILLS ====================

export async function getSkills(profileId: string) {
  const { data, error } = await supabase
    .from("worker_skills")
    .select("*")
    .eq("profile_id", profileId);

  if (error) throw error;

  return data;
}

// ==================== DOCUMENTS ====================

export async function getDocuments(profileId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error && error.code !== "PGRST116") throw error;

  return data;
}

// ==================== SERVICES ====================

export async function getServices(profileId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", profileId);

  if (error) throw error;

  return data;
}
export async function getWorkerDetails(id: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}