import { supabase } from "../lib/supabase";

export type ServiceStatus = "Approved" | "Pending" | "Rejected";

export interface WorkerService {
  id: number;
  worker_id: string;
  category: string;
  service_name: string;
  description: string;
  price: number;
  status: ServiceStatus;
}

export interface ServicePayload {
  category: string;
  service_name: string;
  description: string;
  price: number;
}

export interface WorkerName {
  id?: string;
  first_name: string;
  last_name: string;
}

export interface PendingService extends WorkerService {
  worker: WorkerName | null;
}

export interface CategoryWorkerCount {
  category: string;
  totalWorkers: number;
}

export interface CategoryPreview {
  category: string;
  workers: WorkerName[];
  totalWorkers: number;
}

function wrap(error: unknown, fallback: string): Error {
  return error instanceof Error && error.message
    ? new Error(error.message)
    : new Error(fallback);
}

async function updateStatus(id: number, status: ServiceStatus): Promise<void> {
  const { error } = await supabase
    .from("services")
    .update({ status })
    .eq("id", id);

  if (error) throw wrap(error, `Unable to update service status to ${status}.`);
}

export async function getMyServices(
  workerId: string,
): Promise<WorkerService[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", workerId)
    .order("id", { ascending: false });

  if (error) throw wrap(error, "Unable to load services.");
  return (data ?? []) as WorkerService[];
}

export async function createService(
  workerId: string,
  service: ServicePayload,
): Promise<WorkerService> {
  const { data, error } = await supabase
    .from("services")
    .insert({ worker_id: workerId, ...service, status: "Approved" })
    .select()
    .single();

  if (error) throw wrap(error, "Unable to create service.");
  return data as WorkerService;
}

export async function updateService(
  id: number,
  service: ServicePayload,
): Promise<WorkerService> {
  const { data, error } = await supabase
    .from("services")
    .update(service)
    .eq("id", id)
    .select()
    .single();

  if (error) throw wrap(error, "Unable to update service.");
  return data as WorkerService;
}

export async function deleteService(id: number): Promise<void> {
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw wrap(error, "Unable to delete service.");
}

export async function getPendingServices(): Promise<PendingService[]> {
  const { data, error } = await supabase
    .from("services")
    .select(`*,worker:profiles!worker_id(id,first_name,last_name)`)
    .eq("status", "Pending");

  if (error) throw wrap(error, "Unable to load pending services.");
  return (data ?? []) as PendingService[];
}

export const approveService = (id: number) => updateStatus(id, "Approved");
export const rejectService = (id: number) => updateStatus(id, "Rejected");

export async function getApprovedServices(
  workerId: string,
): Promise<WorkerService[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", workerId)
    .eq("status", "Approved")
    .order("service_name");

  if (error) throw wrap(error, "Unable to load approved services.");
  return (data ?? []) as WorkerService[];
}

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("services")
    .select("category")
    .eq("status", "Approved");

  if (error) throw wrap(error, "Unable to load categories.");

  return [
    ...new Set((data ?? []).map((i: { category: string }) => i.category)),
  ];
}

export async function getCategoriesWithCount(): Promise<CategoryWorkerCount[]> {
  const { data, error } = await supabase
    .from("services")
    .select("category,worker_id")
    .eq("status", "Approved");

  if (error) throw wrap(error, "Unable to load category counts.");

  const grouped = new Map<string, Set<string>>();

  (data ?? []).forEach((item: { category: string; worker_id: string }) => {
    if (!grouped.has(item.category)) grouped.set(item.category, new Set());
    grouped.get(item.category)!.add(item.worker_id);
  });

  return [...grouped.entries()].map(([category, workers]) => ({
    category,
    totalWorkers: workers.size,
  }));
}

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

  const grouped = new Map<
    string,
    {
      id: string;
      first_name: string;
      last_name: string;
    }[]
  >();

  data?.forEach((item) => {
    if (!grouped.has(item.category)) {
      grouped.set(item.category, []);
    }

    const workers = grouped.get(item.category)!;

    const worker = Array.isArray(item.worker) ? item.worker[0] : item.worker;

    if (!worker) return;

    if (!workers.some((w) => w.id === worker.id)) {
      workers.push(worker);
    }
  });

  return Array.from(grouped.entries()).map(([category, workers]) => ({
    category,
    workers,
    totalWorkers: workers.length,
  }));
}
