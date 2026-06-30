import { supabase } from "../lib/supabase";

export async function getWorkerBookings(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}