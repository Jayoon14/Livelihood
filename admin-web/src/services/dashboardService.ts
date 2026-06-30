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