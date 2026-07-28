import { supabase } from "../lib/supabase";

export interface FavoriteWorker {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
  phone: string | null;
  email: string | null;
}

type WorkerRelation = FavoriteWorker | FavoriteWorker[] | null;

function requireId(value: string, field: string): string {
  const id = value.trim();
  if (!id) throw new Error(`${field} is required.`);
  return id;
}

function wrapError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error && "message" in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(fallback);
}

function normalizeWorker(worker: WorkerRelation): FavoriteWorker | null {
  return Array.isArray(worker) ? (worker[0] ?? null) : (worker ?? null);
}

export async function addFavorite(
  customerId: string,
  workerId: string,
): Promise<void> {
  const customer = requireId(customerId, "Customer ID");
  const worker = requireId(workerId, "Worker ID");

  const { error } = await supabase
    .from("favorites")
    .upsert(
      { customer_id: customer, worker_id: worker },
      { onConflict: "customer_id,worker_id" },
    );

  if (error) throw wrapError(error, "Unable to add favorite worker.");
}

export async function removeFavorite(
  customerId: string,
  workerId: string,
): Promise<void> {
  const customer = requireId(customerId, "Customer ID");
  const worker = requireId(workerId, "Worker ID");

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("customer_id", customer)
    .eq("worker_id", worker);

  if (error) throw wrapError(error, "Unable to remove favorite worker.");
}

export async function isFavorite(
  customerId: string,
  workerId: string,
): Promise<boolean> {
  const customer = requireId(customerId, "Customer ID");
  const worker = requireId(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("customer_id", customer)
    .eq("worker_id", worker)
    .maybeSingle();

  if (error) throw wrapError(error, "Unable to check favorite worker.");

  return data !== null;
}

export async function getFavoriteWorkers(
  customerId: string,
): Promise<FavoriteWorker[]> {
  const customer = requireId(customerId, "Customer ID");

  const { data, error } = await supabase
    .from("favorites")
    .select(
      `
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        profile_picture,
        phone,
        email
      )
    `,
    )
    .eq("customer_id", customer);

  if (error) throw wrapError(error, "Unable to load favorite workers.");

  return (data ?? [])
    .map((item) => normalizeWorker((item as { worker: WorkerRelation }).worker))
    .filter((worker): worker is FavoriteWorker => worker !== null);
}
