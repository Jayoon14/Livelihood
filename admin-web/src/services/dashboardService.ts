import { supabase } from "../lib/supabase";

export interface DashboardStats {
  workers: number;
  customers: number;
  pending: number;
  bookings: number;
}

export interface BookingStatusCounts {
  Pending: number;
  Approved: number;
  Completed: number;
  Cancelled: number;
}

export interface MonthlyBookingData {
  month: string;
  bookings: number;
}

export interface TopWorker {
  worker: string;
  rating: number;
  reviews: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const wrap = (e: unknown, msg: string) =>
  e instanceof Error ? e : new Error(msg);

async function countRows(
  table: string,
  column: string,
  value: string,
  extra?: { column: string; value: string },
) {
  let q = supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);
  if (extra) q = q.eq(extra.column, extra.value);
  const { count, error } = await q;
  if (error) throw wrap(error, "Unable to count rows.");
  return count ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [workers, customers, pending, bookings] = await Promise.all([
    countRows("profiles", "role", "worker"),
    countRows("profiles", "role", "customer"),
    countRows("profiles", "role", "worker", {
      column: "status",
      value: "Pending",
    }),
    (async () => {
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });
      if (error) throw wrap(error, "Unable to count bookings.");
      return count ?? 0;
    })(),
  ]);
  return { workers, customers, pending, bookings };
}

export async function getRecentWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw wrap(error, "Unable to load workers.");
  return data ?? [];
}

export async function getPendingWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Pending")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw wrap(error, "Unable to load pending workers.");
  return data ?? [];
}

export async function getBookingStatusCounts(): Promise<BookingStatusCounts> {
  const { data, error } = await supabase.from("bookings").select("status");
  if (error) throw wrap(error, "Unable to load booking status.");
  const c = { Pending: 0, Approved: 0, Completed: 0, Cancelled: 0 };
  (data ?? []).forEach((b: { status: string }) => {
    if (b.status in c) (c as any)[b.status]++;
  });
  return c;
}

export async function getMonthlyBookings(): Promise<MonthlyBookingData[]> {
  const { data, error } = await supabase.from("bookings").select("created_at");
  if (error) throw wrap(error, "Unable to load monthly bookings.");
  const r = MONTHS.map((m) => ({ month: m, bookings: 0 }));
  (data ?? []).forEach(
    (b: { created_at: string }) =>
      r[new Date(b.created_at).getMonth()].bookings++,
  );
  return r;
}

export async function getRecentBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*,worker:profiles!worker_id(first_name,last_name),customer:profiles!customer_id(first_name,last_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw wrap(error, "Unable to load recent bookings.");
  return data ?? [];
}

export async function getRecentActivities() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return [];
  return data ?? [];
}

export async function getTopWorkers(): Promise<TopWorker[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `rating,worker:profiles!reviews_worker_id_fkey(first_name,last_name)`,
    );
  if (error) throw wrap(error, "Unable to load top workers.");
  const map = new Map<string, { total: number; reviews: number }>();
  (data ?? []).forEach((i: any) => {
    const n =
      `${i.worker?.first_name ?? ""} ${i.worker?.last_name ?? ""}`.trim() ||
      "Unknown";
    const e = map.get(n) ?? { total: 0, reviews: 0 };
    e.total += Number(i.rating ?? 0);
    e.reviews++;
    map.set(n, e);
  });
  return [...map.entries()]
    .map(([worker, v]) => ({
      worker,
      rating: Number((v.total / v.reviews).toFixed(1)),
      reviews: v.reviews,
    }))
    .sort((a, b) => b.rating - a.rating);
}
