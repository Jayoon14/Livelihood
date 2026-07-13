import { supabase } from "../lib/supabase";

export async function getWorkers() {
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      category,
      service_name,
      description,
      price,
      profiles!services_worker_id_fkey(
        id,
        first_name,
        middle_name,
        last_name,
        profile_image,
        address,
        role,
        status
      )
    `)
    .eq("status", "Approved");

  if (error) throw error;

  return (
    data?.filter(
      (worker: any) =>
        worker.profiles &&
        worker.profiles.role === "worker" &&
        worker.profiles.status === "Approved"
    ) || []
  );
}