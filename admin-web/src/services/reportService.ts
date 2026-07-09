import { supabase } from "../lib/supabase";

// =========================
// REPORT SUMMARY
// =========================
export async function getReportSummary() {
  const workers = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "worker");

  const customers = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  const bookings = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true });

  const completed = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("status", "Completed");

  return {
    workers: workers.count ?? 0,
    customers: customers.count ?? 0,
    bookings: bookings.count ?? 0,
    completed: completed.count ?? 0,
  };
}

// =========================
// DASHBOARD STATS
// =========================
export async function getDashboardStats() {
  const [
    workers,
    customers,
    bookings,
    reviews,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("role", "worker"),

    supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("role", "customer"),

    supabase
      .from("bookings")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("reviews")
      .select("*", {
        count: "exact",
        head: true,
      }),
  ]);

  return {
    workers: workers.count ?? 0,
    customers: customers.count ?? 0,
    bookings: bookings.count ?? 0,
    reviews: reviews.count ?? 0,
  };
}

// =========================
// MONTHLY BOOKINGS
// =========================
export async function getMonthlyBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("created_at");

  if (error) {
    throw error;
  }

  return data ?? [];
}

// =========================
// BOOKING STATUS SUMMARY
// =========================
export async function getBookingStatusSummary() {
  const { data, error } = await supabase
    .from("bookings")
    .select("status");

  if (error) {
    throw error;
  }

  return data ?? [];
}

// =========================
// TOP WORKERS
// =========================
export async function getTopWorkers() {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      rating,
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `);

  if (error) {
    throw error;
  }

  return data ?? [];
}

// =========================
// RECENT BOOKINGS
// =========================
export async function getRecentBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) {
    throw error;
  }

  return data ?? [];
}