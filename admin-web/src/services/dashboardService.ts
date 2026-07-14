import { supabase } from "../lib/supabase";

export async function getDashboardStats() {
  // Total Workers
  const workers = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "worker");

  // Total Customers (UPDATED)
  const customers = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "customer");

  // Pending Workers
  const pending = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "worker")
    .eq("status", "Pending");

  // Total Bookings
  const bookings = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true });

  return {
    workers: workers.count ?? 0,
    customers: customers.count ?? 0,
    pending: pending.count ?? 0,
    bookings: bookings.count ?? 0,
  };
}

export async function getRecentWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;

  return data;
}

export async function getPendingWorkers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .eq("status", "Pending")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  return data;
}
// ======================================
// BOOKINGS PER STATUS
// ======================================

export async function getBookingStatusCounts() {
  const { data, error } = await supabase
    .from("bookings")
    .select("status");

  if (error) throw error;

  const counts = {
    Pending: 0,
    Approved: 0,
    Completed: 0,
    Cancelled: 0,
  };

  data?.forEach((item) => {
    if (item.status === "Pending") counts.Pending++;
    if (item.status === "Approved") counts.Approved++;
    if (item.status === "Completed") counts.Completed++;
    if (item.status === "Cancelled") counts.Cancelled++;
  });

  return counts;
}

// ======================================
// MONTHLY BOOKINGS
// ======================================

export async function getMonthlyBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("created_at");

  if (error) throw error;

  const months = [
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

  const result = months.map((month) => ({
    month,
    bookings: 0,
  }));

  data?.forEach((item) => {
    const date = new Date(item.created_at);
    const index = date.getMonth();

    result[index].bookings++;
  });

  return result;
}

// ======================================
// RECENT BOOKINGS
// ======================================

export async function getRecentBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        first_name,
        last_name
      ),
      customer:profiles!customer_id(
        first_name,
        last_name
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) throw error;

  return data;
}

// ======================================
// RECENT ACTIVITIES
// ======================================

export async function getRecentActivities() {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(10);

  if (error) return [];

  return data;
}
// ======================================
// TOP RATED WORKERS
// ======================================

export async function getTopWorkers() {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      rating,
      worker:profiles!reviews_worker_id_fkey(
        first_name,
        last_name
      )
    `);

  if (error) throw error;

  const workers: Record<
    string,
    {
      worker: string;
      totalRating: number;
      totalReviews: number;
    }
  > = {};

  data?.forEach((item: any) => {
    const workerName = `${item.worker?.first_name ?? ""} ${item.worker?.last_name ?? ""}`.trim();

    if (!workers[workerName]) {
      workers[workerName] = {
        worker: workerName,
        totalRating: 0,
        totalReviews: 0,
      };
    }

    workers[workerName].totalRating += item.rating;
    workers[workerName].totalReviews++;
  });

  return Object.values(workers)
    .map((worker) => ({
      worker: worker.worker,
      rating: Number(
        (worker.totalRating / worker.totalReviews).toFixed(1)
      ),
      reviews: worker.totalReviews,
    }))
    .sort((a, b) => b.rating - a.rating);
}