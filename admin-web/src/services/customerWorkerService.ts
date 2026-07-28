import { supabase } from "../lib/supabase";

export interface WorkerProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
  address: string | null;
  role: string | null;
  status: string | null;
}

export interface WorkerService {
  id: number;
  category: string | null;
  service_name: string | null;
  description: string | null;
  price: number | null;
  profiles: WorkerProfile | null;
}

type ProfileRelation = WorkerProfile | WorkerProfile[] | null;

function wrapError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }
  return new Error(fallback);
}

function normalizeProfile(profile: ProfileRelation): WorkerProfile | null {
  return Array.isArray(profile) ? (profile[0] ?? null) : (profile ?? null);
}

export async function getWorkers(): Promise<WorkerService[]> {
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
        profile_picture,
        address,
        role,
        status
      )
    `)
    .eq("status", "Approved");

  if (error) {
    throw wrapError(error, "Unable to load workers.");
  }

  return ((data ?? []) as Array<Omit<WorkerService, "profiles"> & { profiles: ProfileRelation }>)
    .map(item => ({
      ...item,
      profiles: normalizeProfile(item.profiles),
    }))
    .filter(item =>
      item.profiles !== null &&
      item.profiles.role === "worker" &&
      item.profiles.status === "Approved",
    );
}