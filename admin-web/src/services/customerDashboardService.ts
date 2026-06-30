import { supabase } from "../lib/supabase";

export async function getFeaturedWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Approved")
    .limit(6);

  if (error) throw error;

  return data;
}