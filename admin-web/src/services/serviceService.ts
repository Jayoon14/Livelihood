import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";
import { createNotification } from "./notificationService";

export const SERVICE_STATUS = {
  APPROVED: "Approved",
  PENDING: "Pending",
  REJECTED: "Rejected",
} as const;

export type ServiceStatus =
  (typeof SERVICE_STATUS)[keyof typeof SERVICE_STATUS];

export type SchedulingType = "hourly" | "project";
export type DurationUnit = "hour" | "day" | "week" | "month";
export type PricingType = "hourly" | "daily" | "fixed";

export interface WorkerService {
  id: number;
  worker_id: string;
  category: string;
  service_name: string;
  description: string | null;
  price: number;
  scheduling_type: SchedulingType;
  duration_value: number;
  duration_unit: DurationUnit;
  pricing_type: PricingType;
  status: ServiceStatus;
}

export interface ServicePayload {
  category: string;
  service_name: string;
  description: string;
  price: number;
  scheduling_type: SchedulingType;
  duration_value: number;
  duration_unit: DurationUnit;
  pricing_type: PricingType;
}

export interface WorkerName {
  id?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  email?: string | null;
}

export interface AdminService extends WorkerService {
  worker: WorkerName | null;
  worker_name: string;
}

export type PendingService = AdminService;

export interface CategoryWorkerCount {
  category: string;
  totalWorkers: number;
}

export interface CategoryPreview {
  category: string;
  workers: WorkerName[];
  totalWorkers: number;
}

interface ServiceStatusRow {
  id: number;
  worker_id: string;
  service_name: string | null;
  category: string | null;
  status: string | null;
}

function wrap(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return new Error(error.message);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallback);
}

function requireWorkerId(workerId: string): string {
  const id = workerId.trim();

  if (!id) {
    throw new Error("Worker ID is required.");
  }

  return id;
}

function requireServiceId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("A valid service ID is required.");
  }

  return id;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeServiceStatus(
  value?: string | null,
): ServiceStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  switch (normalized) {
    case "approved":
    case "active":
    case "accepted":
      return SERVICE_STATUS.APPROVED;

    case "rejected":
    case "declined":
      return SERVICE_STATUS.REJECTED;

    case "pending":
    case "for approval":
    case "for review":
    default:
      return SERVICE_STATUS.PENDING;
  }
}

function normalizeWorker(
  worker: WorkerName | WorkerName[] | null | undefined,
): WorkerName | null {
  if (Array.isArray(worker)) {
    return worker[0] ?? null;
  }

  return worker ?? null;
}

export function getWorkerName(worker: WorkerName | null): string {
  if (!worker) {
    return "Unknown worker";
  }

  const fullName = [
    worker.first_name,
    worker.middle_name,
    worker.last_name,
    worker.suffix,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return fullName || worker.email?.trim() || "Unknown worker";
}

function normalizeService(
  row: WorkerService & {
    worker?: WorkerName | WorkerName[] | null;
  },
): AdminService {
  const worker = normalizeWorker(row.worker);

  return {
    ...row,
    price: Number(row.price) || 0,
    scheduling_type:
      row.scheduling_type === "project" ? "project" : "hourly",
    duration_value: Math.max(Number(row.duration_value) || 1, 1),
    duration_unit: ["hour", "day", "week", "month"].includes(
      String(row.duration_unit),
    )
      ? row.duration_unit
      : "hour",
    pricing_type: ["hourly", "daily", "fixed"].includes(
      String(row.pricing_type),
    )
      ? row.pricing_type
      : "fixed",
    status: normalizeServiceStatus(row.status),
    worker,
    worker_name: getWorkerName(worker),
  };
}

function validatePayload(service: ServicePayload): ServicePayload {
  const category = normalizeText(service.category);
  const serviceName = normalizeText(service.service_name);
  const description = service.description.trim();
  const price = Number(service.price);
  const schedulingType = service.scheduling_type;
  const durationValue = Number(service.duration_value);
  const durationUnit = service.duration_unit;
  const pricingType = service.pricing_type;

  if (!category) {
    throw new Error("Service category is required.");
  }

  if (category.length > 100) {
    throw new Error("Service category must not exceed 100 characters.");
  }

  if (!serviceName) {
    throw new Error("Service name is required.");
  }

  if (serviceName.length > 150) {
    throw new Error("Service name must not exceed 150 characters.");
  }

  if (description.length > 2000) {
    throw new Error("Service description must not exceed 2,000 characters.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Service price must be greater than zero.");
  }

  if (price > 1_000_000) {
    throw new Error("Service price is too high.");
  }

  if (!['hourly', 'project'].includes(schedulingType)) {
    throw new Error("Select a valid scheduling type.");
  }

  if (!Number.isInteger(durationValue) || durationValue <= 0) {
    throw new Error("Duration must be a whole number greater than zero.");
  }

  if (durationValue > 365) {
    throw new Error("Duration is too long.");
  }

  if (!["hour", "day", "week", "month"].includes(durationUnit)) {
    throw new Error("Select a valid duration unit.");
  }

  if (!["hourly", "daily", "fixed"].includes(pricingType)) {
    throw new Error("Select a valid pricing type.");
  }

  return {
    category,
    service_name: serviceName,
    description,
    price: Number(price.toFixed(2)),
    scheduling_type: schedulingType,
    duration_value: durationValue,
    duration_unit: durationUnit,
    pricing_type: pricingType,
  };
}

async function ensureNoDuplicate(
  workerId: string,
  payload: ServicePayload,
  excludeId?: number,
): Promise<void> {
  let query = supabase
    .from("services")
    .select("id")
    .eq("worker_id", workerId)
    .ilike("category", payload.category)
    .ilike("service_name", payload.service_name)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw wrap(error, "Unable to check for duplicate services.");
  }

  if ((data?.length ?? 0) > 0) {
    throw new Error(
      "You already have a service with the same category and service name.",
    );
  }
}

async function getAdminIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (error) {
    console.error("Unable to load administrator accounts:", error);
    return [];
  }

  return (data ?? [])
    .map((row) => String(row.id ?? "").trim())
    .filter(Boolean);
}

async function notifySafely(
  userId: string,
  title: string,
  message: string,
): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    await createNotification(userId, 0, title, message);
  } catch (error) {
    console.error("Unable to create service notification:", error);
  }
}

async function notifyAdminsSafely(
  title: string,
  message: string,
): Promise<void> {
  const adminIds = await getAdminIds();

  await Promise.allSettled(
    adminIds.map((adminId) =>
      createNotification(adminId, 0, title, message),
    ),
  );
}

async function updateStatus(
  id: number,
  status: ServiceStatus,
): Promise<AdminService> {
  const serviceId = requireServiceId(id);

  const { data: existing, error: existingError } = await supabase
    .from("services")
    .select("id,worker_id,service_name,category,status")
    .eq("id", serviceId)
    .maybeSingle();

  if (existingError) {
    throw wrap(existingError, "Unable to load the service.");
  }

  if (!existing) {
    throw new Error("Service was not found.");
  }

  const current = existing as ServiceStatusRow;
  const previousStatus = normalizeServiceStatus(current.status);

  if (previousStatus === status) {
    return getAdminServiceById(serviceId);
  }

  const { data, error } = await supabase
    .from("services")
    .update({ status })
    .eq("id", serviceId)
    .eq("status", current.status)
    .select(
      `
        id,
        worker_id,
        category,
        service_name,
        description,
        price,
        scheduling_type,
        duration_value,
        duration_unit,
        pricing_type,
        status,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .maybeSingle();

  if (error) {
    throw wrap(error, `Unable to update service status to ${status}.`);
  }

  if (!data) {
    throw new Error(
      "Service status was not updated. It may have been changed by another administrator.",
    );
  }

  const updated = normalizeService(
    data as unknown as WorkerService & {
      worker?: WorkerName | WorkerName[] | null;
    },
  );

  const action = status === SERVICE_STATUS.APPROVED
    ? "APPROVED"
    : "REJECTED";

  const title = status === SERVICE_STATUS.APPROVED
    ? "Service Approved"
    : "Service Rejected";

  const message = status === SERVICE_STATUS.APPROVED
    ? `Your service "${updated.service_name}" has been approved and is now visible to customers.`
    : `Your service "${updated.service_name}" has been rejected. Please review and update the service details before resubmitting.`;

  await Promise.allSettled([
    logActivity(
      updated.worker_id,
      action,
      "Services",
      `${title}: ${updated.service_name}`,
    ),
    notifySafely(updated.worker_id, title, message),
    notifyAdminsSafely(
      title,
      `${updated.worker_name}'s service "${updated.service_name}" was ${status.toLowerCase()}.`,
    ),
  ]);

  return updated;
}

export async function getMyServices(
  workerId: string,
): Promise<WorkerService[]> {
  const id = requireWorkerId(workerId);

  const { data, error } = await supabase
    .from("services")
    .select(
      "id,worker_id,category,service_name,description,price,scheduling_type,duration_value,duration_unit,pricing_type,status",
    )
    .eq("worker_id", id)
    .order("id", { ascending: false });

  if (error) {
    throw wrap(error, "Unable to load services.");
  }

  return (data ?? []).map((row) => ({
    ...(row as WorkerService),
    price: Number(row.price) || 0,
    status: normalizeServiceStatus(row.status),
  }));
}

export async function createService(
  workerId: string,
  service: ServicePayload,
): Promise<WorkerService> {
  const id = requireWorkerId(workerId);
  const payload = validatePayload(service);

  await ensureNoDuplicate(id, payload);

  const { data, error } = await supabase
    .from("services")
    .insert({
      worker_id: id,
      ...payload,
      status: SERVICE_STATUS.PENDING,
    })
    .select(
      "id,worker_id,category,service_name,description,price,scheduling_type,duration_value,duration_unit,pricing_type,status",
    )
    .single();

  if (error) {
    throw wrap(error, "Unable to create service.");
  }

  const created = {
    ...(data as WorkerService),
    price: Number(data.price) || 0,
    status: normalizeServiceStatus(data.status),
  };

  await notifyAdminsSafely(
    "New Service Request",
    `A worker submitted "${created.service_name}" for approval.`,
  );

  return created;
}

export async function updateService(
  id: number,
  service: ServicePayload,
): Promise<WorkerService> {
  const serviceId = requireServiceId(id);
  const payload = validatePayload(service);

  const { data: current, error: currentError } = await supabase
    .from("services")
    .select("worker_id")
    .eq("id", serviceId)
    .maybeSingle();

  if (currentError) {
    throw wrap(currentError, "Unable to load the service.");
  }

  if (!current?.worker_id) {
    throw new Error("Service was not found.");
  }

  await ensureNoDuplicate(
    String(current.worker_id),
    payload,
    serviceId,
  );

  const { data, error } = await supabase
    .from("services")
    .update({
      ...payload,
      status: SERVICE_STATUS.PENDING,
    })
    .eq("id", serviceId)
    .select(
      "id,worker_id,category,service_name,description,price,scheduling_type,duration_value,duration_unit,pricing_type,status",
    )
    .single();

  if (error) {
    throw wrap(error, "Unable to update service.");
  }

  const updated = {
    ...(data as WorkerService),
    price: Number(data.price) || 0,
    status: normalizeServiceStatus(data.status),
  };

  await notifyAdminsSafely(
    "Service Resubmitted",
    `A worker updated "${updated.service_name}" and submitted it for review.`,
  );

  return updated;
}

export async function deleteService(id: number): Promise<void> {
  const serviceId = requireServiceId(id);

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId);

  if (error) {
    throw wrap(
      error,
      "Unable to delete service. It may be referenced by an existing booking.",
    );
  }
}

export async function deleteMyService(
  id: number,
  workerId: string,
): Promise<void> {
  const serviceId = requireServiceId(id);
  const ownerId = requireWorkerId(workerId);

  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("worker_id", ownerId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw wrap(
      error,
      "Unable to delete service. It may be referenced by an existing booking.",
    );
  }

  if (!data) {
    throw new Error(
      "Service was not found or does not belong to the current worker.",
    );
  }
}

export async function getAdminServices(
  status?: ServiceStatus,
): Promise<AdminService[]> {
  let query = supabase
    .from("services")
    .select(
      `
        id,
        worker_id,
        category,
        service_name,
        description,
        price,
        scheduling_type,
        duration_value,
        duration_unit,
        pricing_type,
        status,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .order("id", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw wrap(error, "Unable to load services.");
  }

  return (data ?? []).map((row) =>
    normalizeService(
      row as unknown as WorkerService & {
        worker?: WorkerName | WorkerName[] | null;
      },
    ),
  );
}

export async function getAdminServiceById(
  id: number,
): Promise<AdminService> {
  const serviceId = requireServiceId(id);

  const { data, error } = await supabase
    .from("services")
    .select(
      `
        id,
        worker_id,
        category,
        service_name,
        description,
        price,
        scheduling_type,
        duration_value,
        duration_unit,
        pricing_type,
        status,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    throw wrap(error, "Unable to load the service.");
  }

  if (!data) {
    throw new Error("Service was not found.");
  }

  return normalizeService(
    data as unknown as WorkerService & {
      worker?: WorkerName | WorkerName[] | null;
    },
  );
}

export async function getPendingServices(): Promise<PendingService[]> {
  return getAdminServices(SERVICE_STATUS.PENDING);
}

export const approveService = async (
  id: number,
): Promise<AdminService> =>
  updateStatus(id, SERVICE_STATUS.APPROVED);

export const rejectService = async (
  id: number,
): Promise<AdminService> =>
  updateStatus(id, SERVICE_STATUS.REJECTED);

export async function getApprovedServices(
  workerId: string,
): Promise<WorkerService[]> {
  const id = requireWorkerId(workerId);

  const { data, error } = await supabase
    .from("services")
    .select(
      "id,worker_id,category,service_name,description,price,scheduling_type,duration_value,duration_unit,pricing_type,status",
    )
    .eq("worker_id", id)
    .eq("status", SERVICE_STATUS.APPROVED)
    .order("service_name");

  if (error) {
    throw wrap(error, "Unable to load approved services.");
  }

  return (data ?? []).map((row) => ({
    ...(row as WorkerService),
    price: Number(row.price) || 0,
    status: normalizeServiceStatus(row.status),
  }));
}

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("services")
    .select("category")
    .eq("status", SERVICE_STATUS.APPROVED);

  if (error) {
    throw wrap(error, "Unable to load categories.");
  }

  return [
    ...new Set(
      (data ?? [])
        .map((item: { category: string | null }) =>
          item.category?.trim(),
        )
        .filter((category): category is string =>
          Boolean(category),
        ),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export async function getCategoriesWithCount(): Promise<
  CategoryWorkerCount[]
> {
  const { data, error } = await supabase
    .from("services")
    .select("category,worker_id")
    .eq("status", SERVICE_STATUS.APPROVED);

  if (error) {
    throw wrap(error, "Unable to load category counts.");
  }

  const grouped = new Map<string, Set<string>>();

  for (const item of data ?? []) {
    const category = item.category?.trim();

    if (!category || !item.worker_id) {
      continue;
    }

    if (!grouped.has(category)) {
      grouped.set(category, new Set());
    }

    grouped.get(category)?.add(item.worker_id);
  }

  return [...grouped.entries()]
    .map(([category, workers]) => ({
      category,
      totalWorkers: workers.size,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export async function getCategoryPreview(): Promise<CategoryPreview[]> {
  const { data, error } = await supabase
    .from("services")
    .select(
      `
        category,
        worker_id,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email
        )
      `,
    )
    .eq("status", SERVICE_STATUS.APPROVED);

  if (error) {
    throw wrap(error, "Unable to load category preview.");
  }

  const grouped = new Map<string, WorkerName[]>();

  for (const item of data ?? []) {
    const category = item.category?.trim();
    const worker = normalizeWorker(
      item.worker as WorkerName | WorkerName[],
    );

    if (!category || !worker?.id) {
      continue;
    }

    if (!grouped.has(category)) {
      grouped.set(category, []);
    }

    const workers = grouped.get(category);

    if (
      workers &&
      !workers.some((current) => current.id === worker.id)
    ) {
      workers.push(worker);
    }
  }

  return [...grouped.entries()]
    .map(([category, workers]) => ({
      category,
      workers,
      totalWorkers: workers.length,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}