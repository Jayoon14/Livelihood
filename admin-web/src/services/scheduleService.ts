import { supabase } from "../lib/supabase";

// ==============================
// WEEKLY SCHEDULE
// ==============================

export async function getWorkerSchedule(workerId: string) {
  const { data, error } = await supabase
    .from("worker_schedules")
    .select("*")
    .eq("worker_id", workerId)
    .order("id");

  if (error) throw error;

  return data ?? [];
}

export async function saveWorkerSchedule(
  workerId: string,
  schedules: any[]
) {
  // delete old schedule
  await supabase
    .from("worker_schedules")
    .delete()
    .eq("worker_id", workerId);

  const payload = schedules.map((item) => ({
    worker_id: workerId,
    day_of_week: item.day_of_week,
    start_time: item.start_time,
    end_time: item.end_time,
    is_available: item.is_available,
  }));

  const { error } = await supabase
    .from("worker_schedules")
    .insert(payload);

  if (error) throw error;
}

// ==============================
// UNAVAILABLE DATES
// ==============================

export async function getUnavailableDates(workerId: string) {
  const { data, error } = await supabase
    .from("unavailable_dates")
    .select("*")
    .eq("worker_id", workerId)
    .order("unavailable_date");

  if (error) throw error;

  return data ?? [];
}

export async function addUnavailableDate(
  workerId: string,
  unavailable_date: string,
  reason: string
) {
  const { error } = await supabase
    .from("unavailable_dates")
    .insert({
      worker_id: workerId,
      unavailable_date,
      reason,
    });

  if (error) throw error;
}

export async function deleteUnavailableDate(id: number) {
  const { error } = await supabase
    .from("unavailable_dates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}