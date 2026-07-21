import { supabase } from "../lib/supabase";

export async function getUnavailableDates(workerId: string) {
  const { data, error } = await supabase
    .from("unavailable_dates")
    .select("unavailable_date")
    .eq("worker_id", workerId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item: any) => item.unavailable_date);
}
