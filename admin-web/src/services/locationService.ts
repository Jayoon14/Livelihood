import { supabase } from "../lib/supabase";

export async function updateWorkerLocation(
  workerId: string,
  latitude: number,
  longitude: number,
  heading?: number | null,
  speed?: number | null,
  accuracy?: number | null,
) {
  return supabase
    .from("workers_locations")
    .upsert({
      worker_id: workerId,

      latitude,
      longitude,

      heading,
      speed,
      accuracy,

      is_online: true,

      updated_at: new Date().toISOString(),
    });
}