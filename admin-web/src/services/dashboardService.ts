import { supabase } from "../lib/supabase";

export interface DashboardStats {
  workers: number;
  customers: number;
  pending: number;
  bookings: number;
  revenue: number;
}

export interface BookingStatusCounts {
  Pending: number;
  Approved: number;
  Ongoing: number;
  Completed: number;
  Cancelled: number;
}

export interface DashboardWorker {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  created_at: string | null;
}

export interface DashboardBooking {
  id: number | string;
  booking_date: string | null;
  status: string | null;
  created_at: string | null;
  worker: { first_name: string | null; last_name: string | null } | null;
  customer: { first_name: string | null; last_name: string | null } | null;
}

export interface DashboardActivity {
  id: number | string;
  action: string | null;
  module: string | null;
  description: string | null;
  created_at: string | null;
  user: { first_name: string | null; last_name: string | null } | null;
}

const normalize = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function countProfiles(role: "worker" | "customer", status?: string) {
  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", role);

  if (status) query = query.ilike("status", status);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [workers, customers, pending, bookingsResult, revenueResult] =
    await Promise.all([
      countProfiles("worker"),
      countProfiles("customer"),
      countProfiles("worker", "Pending"),
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase
        .from("payments")
        .select("amount, amount_paid, payment_status")
        .ilike("payment_status", "Paid"),
    ]);

  if (bookingsResult.error) throw bookingsResult.error;
  if (revenueResult.error) throw revenueResult.error;

  const revenue = (revenueResult.data ?? []).reduce((sum, payment) => {
    const paid = toNumber(payment.amount_paid);
    return sum + (paid > 0 ? paid : toNumber(payment.amount));
  }, 0);

  return {
    workers,
    customers,
    pending,
    bookings: bookingsResult.count ?? 0,
    revenue,
  };
}

export async function getRecentWorkers(): Promise<DashboardWorker[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status, created_at")
    .eq("role", "worker")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as DashboardWorker[];
}

export async function getPendingWorkers(): Promise<DashboardWorker[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status, created_at")
    .eq("role", "worker")
    .ilike("status", "Pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data ?? []) as DashboardWorker[];
}

export async function getBookingStatusCounts(): Promise<BookingStatusCounts> {
  const { data, error } = await supabase.from("bookings").select("status");
  if (error) throw error;

  const counts: BookingStatusCounts = {
    Pending: 0,
    Approved: 0,
    Ongoing: 0,
    Completed: 0,
    Cancelled: 0,
  };

  for (const booking of data ?? []) {
    const status = normalize(booking.status);
    if (["pending", "requested"].includes(status)) counts.Pending += 1;
    else if (["approved", "accepted", "confirmed"].includes(status))
      counts.Approved += 1;
    else if (["ongoing", "in progress", "in_progress"].includes(status))
      counts.Ongoing += 1;
    else if (["completed", "complete", "finished"].includes(status))
      counts.Completed += 1;
    else if (["cancelled", "canceled", "rejected"].includes(status))
      counts.Cancelled += 1;
  }

  return counts;
}

export async function getRecentBookings(): Promise<DashboardBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, status, created_at, worker:profiles!worker_id(first_name,last_name), customer:profiles!customer_id(first_name,last_name)",
    )
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as unknown as DashboardBooking[];
}

export async function getRecentActivities(): Promise<DashboardActivity[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(
      "id, action, module, description, created_at, user:profiles!user_id(first_name,last_name)",
    )
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return (data ?? []) as unknown as DashboardActivity[];
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

export async function getMonthlyBookings(): Promise<MonthlyBookingData[]> {
  const year = new Date().getFullYear();
  const start = `${year}-01-01T00:00:00.000Z`;
  const end = `${year + 1}-01-01T00:00:00.000Z`;
  const { data, error } = await supabase
    .from("bookings")
    .select("created_at")
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) throw error;
  const formatter = new Intl.DateTimeFormat("en", { month: "short" });
  const result = Array.from({ length: 12 }, (_, month) => ({
    month: formatter.format(new Date(year, month, 1)),
    bookings: 0,
  }));
  for (const booking of data ?? []) {
    const date = new Date(booking.created_at);
    if (!Number.isNaN(date.getTime())) result[date.getMonth()].bookings += 1;
  }
  return result;
}

export async function getTopWorkers(): Promise<TopWorker[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "rating, worker:profiles!reviews_worker_id_fkey(first_name,last_name)",
    );
  if (error) throw error;
  const map = new Map<string, { total: number; reviews: number }>();
  for (const review of data ?? []) {
    const worker = Array.isArray(review.worker)
      ? review.worker[0]
      : review.worker;
    const name = fullWorkerName(worker);
    const current = map.get(name) ?? { total: 0, reviews: 0 };
    current.total += toNumber(review.rating);
    current.reviews += 1;
    map.set(name, current);
  }
  return [...map.entries()]
    .map(([worker, value]) => ({
      worker,
      rating: value.reviews
        ? Number((value.total / value.reviews).toFixed(1))
        : 0,
      reviews: value.reviews,
    }))
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, 10);
}

function fullWorkerName(
  worker:
    | { first_name?: string | null; last_name?: string | null }
    | null
    | undefined,
) {
  return (
    `${worker?.first_name ?? ""} ${worker?.last_name ?? ""}`.trim() || "Unknown"
  );
}
