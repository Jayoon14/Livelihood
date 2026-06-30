import { supabase } from "../lib/supabase";

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