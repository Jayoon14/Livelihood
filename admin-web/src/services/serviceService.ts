import { supabase } from "../lib/supabase";

// =============================
// GET MY SERVICES
// =============================
export async function getMyServices(workerId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", workerId)
    .order("id", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

// =============================
// ADD SERVICE
// =============================
export async function createService(
  workerId: string,
  service: {
    category: string;
    service_name: string;
    description: string;
    price: number;
  },
) {
  const { error } = await supabase.from("services").insert({
    worker_id: workerId,
    category: service.category,
    service_name: service.service_name,
    description: service.description,
    price: service.price,
    status: "Approved",
  });

  if (error) throw error;
}

// =============================
// UPDATE SERVICE
// =============================
export async function updateService(
  id: number,
  service: {
    category: string;
    service_name: string;
    description: string;
    price: number;
  },
) {
  const { error } = await supabase
    .from("services")
    .update({
      category: service.category,
      service_name: service.service_name,
      description: service.description,
      price: service.price,
    })
    .eq("id", id);

  if (error) throw error;
}

// =============================
// DELETE SERVICE
// =============================
export async function deleteService(id: number) {
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) throw error;
}
export async function getPendingServices() {
  const { data, error } = await supabase
    .from("services")
    .select(
      `
      *,
      worker:profiles!worker_id(
        first_name,
        last_name
      )
    `,
    )
    .eq("status", "Pending");

  if (error) throw error;

  return data ?? [];
}

export async function approveService(id: number) {
  const { error } = await supabase
    .from("services")
    .update({
      status: "Approved",
    })
    .eq("id", id);

  if (error) throw error;
}

export async function rejectService(id: number) {
  const { error } = await supabase
    .from("services")
    .update({
      status: "Rejected",
    })
    .eq("id", id);

  if (error) throw error;
}
export async function getApprovedServices(workerId: string) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "Approved")
    .order("service_name");

  console.log("WORKER ID:", workerId);
  console.log("SERVICES:", data);
  console.log("ERROR:", error);
  console.log(data);

  if (error) {
    throw error;
  }

  return data ?? [];
}
// =====================
// GET ALL CATEGORIES
// =====================

export async function getCategories() {
  const { data, error } = await supabase
    .from("services")
    .select("category")
    .eq("status", "Approved");

  if (error) throw error;

  const categories = Array.from(
    new Set((data ?? []).map((item) => item.category)),
  );

  return categories;
}
// =====================
// GET CATEGORIES WITH WORKER COUNT
// =====================

export async function getCategoriesWithCount() {
  const { data, error } = await supabase
    .from("services")
    .select(
      `
      category,
      worker_id
    `,
    )
    .eq("status", "Approved");

  if (error) throw error;

  const grouped = new Map<string, Set<string>>();

  data?.forEach((item) => {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, new Set());
    }

    grouped.get(item.category)?.add(item.worker_id);
  });

  return Array.from(grouped.entries()).map(([category, workers]) => ({
    category,
    totalWorkers: workers.size,
  }));
}
// =====================
// GET CATEGORY PREVIEW
// =====================

export async function getCategoryPreview() {
  const { data, error } = await supabase
    .from("services")
    .select(
      `
      category,
      worker_id,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name
      )
    `,
    )
    .eq("status", "Approved");

  if (error) throw error;

  const grouped = new Map();

  data?.forEach((item: any) => {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
    }

    const workers = grouped.get(item.category);

    if (!workers.find((w: any) => w.id === item.worker.id)) {
      workers.push(item.worker);
    }
  });

  return Array.from(grouped.entries()).map(([category, workers]) => ({
    category,
    workers,
    totalWorkers: workers.length,
  }));
}
