import { supabase } from "../lib/supabase";

// ================================
// FEATURED WORKERS
// ================================

export async function getFeaturedWorkers(limit = 6) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      services(
        id,
        category,
        service_name,
        price
      )
    `,
    )
    .eq("role", "worker")
    .eq("status", "Approved")
    .limit(limit);

  if (error) throw error;

  return data ?? [];
}

// ================================
// SEARCH WORKERS
// ================================

export async function searchWorkers(keyword: string) {
  let query = supabase
    .from("profiles")
    .select(
      `
      *,
      services(
        id,
        category,
        service_name,
        price
      )
    `,
    )
    .eq("role", "worker")
    .eq("status", "Approved");

  if (keyword.trim()) {
    query = query.or(
      `first_name.ilike.%${keyword}%,
       last_name.ilike.%${keyword}%,
       email.ilike.%${keyword}%`,
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}

// ================================
// FILTER BY CATEGORY
// ================================

export async function getWorkersByCategory(category: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      *,
      services!inner(
        category,
        service_name,
        price
      )
    `,
    )
    .eq("role", "worker")
    .eq("status", "Approved")
    .eq("services.category", category);

  if (error) throw error;

  return data ?? [];
}

// ================================
// GET CATEGORIES
// ================================

export async function getCategories() {
  const { data, error } = await supabase.from("services").select("category");

  if (error) throw error;

  return [
    ...new Set((data ?? []).map((item) => item.category).filter(Boolean)),
  ];
}

// ================================
// RECENT BOOKINGS
// ================================

export async function getRecentBookings(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `,
    )
    .eq("customer_id", customerId)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  if (error) throw error;

  return data ?? [];
}
