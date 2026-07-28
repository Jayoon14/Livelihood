import { supabase } from "../lib/supabase";

export interface WorkerService {
  id: number;
  category: string | null;
  service_name: string | null;
  price: number | null;
}
export interface DashboardWorker {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  role: string;
  status: string;
  services: WorkerService[];
  [key: string]: unknown;
}
const wrap = (e: unknown, m: string) => (e instanceof Error ? e : new Error(m));
const clean = (v: string) => v.trim();

export async function getFeaturedWorkers(
  limit = 6,
): Promise<DashboardWorker[]> {
  if (!Number.isInteger(limit) || limit <= 0) limit = 6;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
 *,services(id,category,service_name,price)
 `,
    )
    .eq("role", "worker")
    .eq("status", "Approved")
    .limit(limit);
  if (error) throw wrap(error, "Unable to load featured workers.");
  return (data ?? []) as DashboardWorker[];
}

export async function searchWorkers(
  keyword: string,
): Promise<DashboardWorker[]> {
  const term = clean(keyword);
  let q = supabase
    .from("profiles")
    .select(
      `
 *,services(id,category,service_name,price)
 `,
    )
    .eq("role", "worker")
    .eq("status", "Approved");
  if (term) {
    const s = term.replace(/,/g, "");
    q = q.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }
  const { data, error } = await q;
  if (error) throw wrap(error, "Unable to search workers.");
  return (data ?? []) as DashboardWorker[];
}

export async function getWorkersByCategory(
  category: string,
): Promise<DashboardWorker[]> {
  const c = clean(category);
  if (!c) throw new Error("Category is required.");
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
 *,services!inner(id,category,service_name,price)
 `,
    )
    .eq("role", "worker")
    .eq("status", "Approved")
    .eq("services.category", c);
  if (error) throw wrap(error, "Unable to load workers.");
  return (data ?? []) as DashboardWorker[];
}

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase.from("services").select("category");
  if (error) throw wrap(error, "Unable to load categories.");
  return [
    ...new Set(
      (data ?? [])
        .map((x: { category: string | null }) => x.category)
        .filter((x): x is string => Boolean(x)),
    ),
  ].sort();
}

export async function getRecentBookings(customerId: string) {
  const id = clean(customerId);
  if (!id) throw new Error("Customer ID is required.");
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
 *,worker:profiles!worker_id(first_name,last_name)
 `,
    )
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw wrap(error, "Unable to load recent bookings.");
  return data ?? [];
}
