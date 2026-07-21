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
  const [workers, customers, bookings, reviews] = await Promise.all([
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

    supabase.from("bookings").select("*", {
      count: "exact",
      head: true,
    }),

    supabase.from("reviews").select("*", {
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
// MONTHLY BOOKINGS (FOR CHART)
// =========================
export async function getMonthlyBookings() {
  const { data, error } = await supabase.from("bookings").select("created_at");

  if (error) throw error;

  const labels = [
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
  ];

  const counts = new Array(12).fill(0);

  data?.forEach((booking) => {
    const month = new Date(booking.created_at).getMonth();
    counts[month]++;
  });

  return {
    labels,
    data: counts,
  };
}

// =========================
// BOOKING STATUS SUMMARY
// =========================
export async function getBookingStatusSummary() {
  const { data, error } = await supabase.from("bookings").select("status");

  if (error) throw error;

  return data ?? [];
}

// =========================
// TOP WORKERS
// =========================
export async function getTopWorkers() {
  const { data, error } = await supabase.from("reviews").select(`
      rating,
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `);

  if (error) throw error;

  return data ?? [];
}

// =========================
// RECENT BOOKINGS
// =========================
export async function getRecentBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      ),
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) throw error;

  return data ?? [];
}

// =========================
// MONTHLY REVENUE
// =========================
export async function getMonthlyRevenue() {
  const { data, error } = await supabase
    .from("payments")
    .select("amount, created_at")
    .eq("payment_status", "Paid");

  if (error) throw error;

  const labels = [
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
  ];

  const revenue = new Array(12).fill(0);

  data?.forEach((payment) => {
    const month = new Date(payment.created_at).getMonth();
    revenue[month] += Number(payment.amount);
  });

  return {
    labels,
    data: revenue,
  };
}
