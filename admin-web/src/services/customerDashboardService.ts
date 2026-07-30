import { supabase } from "../lib/supabase";

export interface WorkerService {
  id: number;
  worker_id?: string;
  category: string | null;
  service_name: string | null;
  description?: string | null;
  price: number | null;
  status?: string | null;
}

export interface DashboardWorker {
  id: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_picture?: string | null;
  profile_image?: string | null;
  avatar_url?: string | null;
  municipality?: string | null;
  province?: string | null;
  role: string;
  status: string;
  services: WorkerService[];
  [key: string]: unknown;
}

export interface RecentBookingWorker {
  id?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  suffix?: string | null;
  email?: string | null;
  profile_picture?: string | null;
}

export interface RecentBookingService {
  id?: number | null;
  category?: string | null;
  service_name?: string | null;
  price?: number | string | null;
}

export interface RecentCustomerBooking {
  id: number;
  customer_id: string;
  worker_id: string;
  service_id?: number | null;
  status?: string | null;
  schedule_status?: string | null;
  trip_status?: string | null;
  completion_status?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  created_at?: string | null;
  worker: RecentBookingWorker | null;
  service: RecentBookingService | null;
  [key: string]: unknown;
}

const APPROVED_STATUS = "Approved";
const DEFAULT_FEATURED_LIMIT = 6;
const MAX_RESULT_LIMIT = 50;

const DASHBOARD_WORKER_WITH_APPROVED_SERVICES_SELECT = `
  id,
  first_name,
  middle_name,
  last_name,
  suffix,
  email,
  phone,
  profile_picture,
  municipality,
  province,
  role,
  status,
  services!inner(
    id,
    worker_id,
    category,
    service_name,
    description,
    price,
    status
  )
`;

function wrap(
  error: unknown,
  fallback: string,
): Error {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return new Error(error.message);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message ===
      "string"
  ) {
    const message = (
      error as { message: string }
    ).message.trim();

    if (message) {
      return new Error(message);
    }
  }

  return new Error(fallback);
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sanitizeSearchTerm(
  value: string,
): string {
  return clean(value).replace(
    /[%(),.*"'\\]/g,
    "",
  );
}

function normalizeLimit(
  value: number,
  fallback: number,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return Math.min(
    MAX_RESULT_LIMIT,
    Math.floor(value),
  );
}

function normalizeService(
  value: WorkerService,
): WorkerService {
  return {
    ...value,
    id: Number(value.id),
    category: value.category?.trim() || null,
    service_name:
      value.service_name?.trim() || null,
    description:
      value.description?.trim() || null,
    price:
      value.price === null
        ? null
        : Number(value.price) || 0,
    status: value.status?.trim() || null,
  };
}

function getWorkerFullName(
  worker: DashboardWorker,
): string {
  const name = [
    worker.first_name,
    worker.middle_name,
    worker.last_name,
    worker.suffix,
  ]
    .map((part) => part?.trim())
    .filter(
      (part): part is string =>
        Boolean(part),
    )
    .join(" ");

  return (
    name ||
    worker.email?.trim() ||
    "Worker"
  );
}

function normalizeWorker(
  value: DashboardWorker,
): DashboardWorker {
  const services = Array.isArray(
    value.services,
  )
    ? value.services
        .map(normalizeService)
        .filter(
          (service) =>
            service.status ===
              APPROVED_STATUS ||
            service.status === undefined ||
            service.status === null,
        )
    : [];

  const normalized: DashboardWorker = {
    ...value,
    id: String(value.id),
    role: value.role || "worker",
    status:
      value.status || APPROVED_STATUS,
    services,
  };

  return {
    ...normalized,
    full_name:
      value.full_name?.trim() ||
      getWorkerFullName(normalized),
  };
}

function normalizeWorkers(
  data: unknown,
): DashboardWorker[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return (data as DashboardWorker[])
    .map(normalizeWorker)
    .filter(
      (worker) =>
        worker.role.toLowerCase() ===
          "worker" &&
        worker.status.toLowerCase() ===
          "approved",
    );
}

async function getAuthenticatedUserId(
  expectedUserId?: string,
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw wrap(
      error,
      "Unable to verify your session.",
    );
  }

  if (!user) {
    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  if (
    expectedUserId &&
    clean(expectedUserId) !== user.id
  ) {
    throw new Error(
      "You cannot access another customer's bookings.",
    );
  }

  return user.id;
}

/**
 * Returns approved workers who have at least one approved service.
 */
export async function getFeaturedWorkers(
  limit = DEFAULT_FEATURED_LIMIT,
): Promise<DashboardWorker[]> {
  const validLimit = normalizeLimit(
    limit,
    DEFAULT_FEATURED_LIMIT,
  );

  const { data, error } = await supabase
    .from("profiles")
    .select(
      DASHBOARD_WORKER_WITH_APPROVED_SERVICES_SELECT,
    )
    .eq("role", "worker")
    .eq("status", APPROVED_STATUS)
    .eq(
      "services.status",
      APPROVED_STATUS,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(validLimit);

  if (error) {
    throw wrap(
      error,
      "Unable to load featured workers.",
    );
  }

  return normalizeWorkers(data);
}

/**
 * Searches approved workers by profile name/email.
 *
 * Service category and service-name matching are
 * also supported client-side after approved workers
 * and their approved services are loaded.
 */
export async function searchWorkers(
  keyword: string,
  limit = MAX_RESULT_LIMIT,
): Promise<DashboardWorker[]> {
  const term = sanitizeSearchTerm(keyword);
  const validLimit = normalizeLimit(
    limit,
    MAX_RESULT_LIMIT,
  );

  let query = supabase
    .from("profiles")
    .select(
      DASHBOARD_WORKER_WITH_APPROVED_SERVICES_SELECT,
    )
    .eq("role", "worker")
    .eq("status", APPROVED_STATUS)
    .eq(
      "services.status",
      APPROVED_STATUS,
    )
    .order("first_name", {
      ascending: true,
      nullsFirst: false,
    })
    .limit(validLimit);

  if (term) {
    query = query.or(
      [
        `first_name.ilike.%${term}%`,
        `middle_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `email.ilike.%${term}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw wrap(
      error,
      "Unable to search workers.",
    );
  }

  let workers = normalizeWorkers(data);

  if (!term) {
    return workers;
  }

  const normalizedTerm =
    term.toLowerCase();

  /*
   * Profile filters are handled by Supabase.
   * This second pass additionally allows matching
   * service names and categories in the returned set.
   */
  workers = workers.filter((worker) => {
    const profileMatches = [
      worker.full_name,
      worker.first_name,
      worker.middle_name,
      worker.last_name,
      worker.email,
      worker.municipality,
      worker.province,
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(normalizedTerm),
    );

    const serviceMatches =
      worker.services.some((service) =>
        [
          service.category,
          service.service_name,
          service.description,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedTerm),
        ),
      );

    return (
      profileMatches || serviceMatches
    );
  });

  return workers;
}

export async function getWorkersByCategory(
  category: string,
  limit = MAX_RESULT_LIMIT,
): Promise<DashboardWorker[]> {
  const normalizedCategory =
    clean(category);

  if (!normalizedCategory) {
    throw new Error(
      "Category is required.",
    );
  }

  const validLimit = normalizeLimit(
    limit,
    MAX_RESULT_LIMIT,
  );

  const { data, error } = await supabase
    .from("profiles")
    .select(
      DASHBOARD_WORKER_WITH_APPROVED_SERVICES_SELECT,
    )
    .eq("role", "worker")
    .eq("status", APPROVED_STATUS)
    .eq(
      "services.status",
      APPROVED_STATUS,
    )
    .ilike(
      "services.category",
      normalizedCategory,
    )
    .order("first_name", {
      ascending: true,
      nullsFirst: false,
    })
    .limit(validLimit);

  if (error) {
    throw wrap(
      error,
      "Unable to load workers by category.",
    );
  }

  return normalizeWorkers(data);
}

export async function getCategories(): Promise<
  string[]
> {
  const { data, error } = await supabase
    .from("services")
    .select("category")
    .eq("status", APPROVED_STATUS)
    .not("category", "is", null)
    .order("category", {
      ascending: true,
    });

  if (error) {
    throw wrap(
      error,
      "Unable to load categories.",
    );
  }

  const categories = (data ?? [])
    .map((row) =>
      typeof row.category === "string"
        ? clean(row.category)
        : "",
    )
    .filter(Boolean);

  return [
    ...new Map(
      categories.map((category) => [
        category.toLowerCase(),
        category,
      ]),
    ).values(),
  ].sort((first, second) =>
    first.localeCompare(second),
  );
}

export async function getMyRecentBookings(
  limit = 5,
): Promise<RecentCustomerBooking[]> {
  const customerId =
    await getAuthenticatedUserId();

  return getRecentBookings(
    customerId,
    limit,
  );
}

export async function getRecentBookings(
  customerId: string,
  limit = 5,
): Promise<RecentCustomerBooking[]> {
  const id = await getAuthenticatedUserId(
    customerId,
  );
  const validLimit = normalizeLimit(
    limit,
    5,
  );

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
        *,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          suffix,
          email,
          profile_picture
        ),
        service:services!service_id(
          id,
          category,
          service_name,
          price
        )
      `,
    )
    .eq("customer_id", id)
    .order("created_at", {
      ascending: false,
    })
    .limit(validLimit);

  if (error) {
    throw wrap(
      error,
      "Unable to load recent bookings.",
    );
  }

  return (data ??
    []) as RecentCustomerBooking[];
}