import { supabase } from "../lib/supabase";
import { logActivity } from "./activityService";
import { createNotification } from "./notificationService";

export const WORKER_STATUS = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PENDING: "Pending",
} as const;

export type WorkerStatus =
  (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS];

export interface WorkerProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture: string | null;
  role: string;
  status: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface WorkerServiceRecord {
  id: string | number;
  worker_id?: string;
  category: string | null;
  service_name: string | null;
  description: string | null;
  price: number | string | null;
}

export interface WorkerWithServices extends WorkerProfile {
  services: WorkerServiceRecord[];
}

export interface WorkerSearchResult extends WorkerWithServices {
  average_rating: number;
  completed_jobs: number;
}

export interface EducationRecord {
  id?: string | number;
  profile_id: string;
  [key: string]: unknown;
}

export interface WorkExperienceRecord {
  id: string | number;
  profile_id: string;

  company_name: string | null;
  position: string | null;
  start_year: string | number | null;
  end_year: string | number | null;
}

export interface WorkerSkillRecord {
  id: string | number;
  profile_id: string;

  skill: string;
}

export interface WorkerDocumentRecord {
  id?: string | number;
  profile_id: string;
  [key: string]: unknown;
}

export interface CompleteWorkerProfile {
  profile: WorkerProfile;
  education: EducationRecord | null;
  workExperience: WorkExperienceRecord[];
  skills: WorkerSkillRecord[];
  documents: WorkerDocumentRecord | null;
  services: WorkerServiceRecord[];
}

interface ReviewRecord {
  rating: number | string | null;
}

interface ServiceCategoryRecord {
  category: string | null;
}

interface WorkerRelationRecord {
  worker: WorkerProfile | WorkerProfile[] | null;
}

interface CompletedBookingRecord {
  service_id: string | number | null;
}

const WORKER_WITH_SERVICES_SELECT = `
  *,
  services(
    id,
    category,
    service_name,
    price
  )
`;

function validateRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function validateWorkerId(workerId: string): string {
  return validateRequiredText(workerId, "Worker ID");
}

function validateLimit(limit: number, fallback: number): number {
  if (!Number.isFinite(limit) || limit <= 0) {
    return fallback;
  }

  return Math.floor(limit);
}

function validatePriceFilter(
  value: number | undefined,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a valid non-negative number.`);
  }

  return value;
}

function normalizeServices(
  services: unknown,
): WorkerServiceRecord[] {
  return Array.isArray(services)
    ? (services as WorkerServiceRecord[])
    : [];
}

function normalizeWorkerWithServices(
  value: unknown,
): WorkerWithServices {
  const worker = value as WorkerProfile & {
    services?: unknown;
  };

  return {
    ...worker,
    services: normalizeServices(worker.services),
  };
}

function normalizeWorkerRelation(
  relation: WorkerProfile | WorkerProfile[] | null,
): WorkerProfile | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function calculateAverageRating(
  reviews: ReviewRecord[] | null,
): number {
  if (!reviews?.length) {
    return 0;
  }

  const validRatings = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating));

  if (!validRatings.length) {
    return 0;
  }

  const total = validRatings.reduce(
    (sum, rating) => sum + rating,
    0,
  );

  return Number((total / validRatings.length).toFixed(1));
}

async function getWorkerMetrics(
  workerId: string,
): Promise<{
  average_rating: number;
  completed_jobs: number;
}> {
  const [reviewsResult, completedJobsResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("rating")
      .eq("worker_id", workerId),
    supabase
      .from("bookings")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("worker_id", workerId)
      .eq("status", "Completed"),
  ]);

  if (reviewsResult.error) {
    throw reviewsResult.error;
  }

  if (completedJobsResult.error) {
    throw completedJobsResult.error;
  }

  return {
    average_rating: calculateAverageRating(
      (reviewsResult.data ?? []) as ReviewRecord[],
    ),
    completed_jobs: completedJobsResult.count ?? 0,
  };
}

async function enrichWorkersWithMetrics(
  workers: WorkerWithServices[],
): Promise<WorkerSearchResult[]> {
  return Promise.all(
    workers.map(async (worker) => {
      const metrics = await getWorkerMetrics(worker.id);

      return {
        ...worker,
        ...metrics,
      };
    }),
  );
}

async function updateWorkerStatus(
  workerId: string,
  status: WorkerStatus,
  activityAction: string,
  activityDescription: string,
  notificationTitle: string,
  notificationMessage: string,
): Promise<WorkerProfile[]> {
  const id = validateWorkerId(workerId);

  const { data, error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", id)
    .eq("role", "worker")
    .select();

  if (error) {
    throw error;
  }

  const workers = (data ?? []) as WorkerProfile[];

  if (!workers.length) {
    throw new Error("Worker account was not found.");
  }

  const sideEffects = await Promise.allSettled([
    logActivity(
      id,
      activityAction,
      "Workers",
      activityDescription,
    ),
    createNotification(
      id,
      0,
      notificationTitle,
      notificationMessage,
    ),
  ]);

  sideEffects.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Worker status side effect failed:", result.reason);
    }
  });

  return workers;
}

// ====================
// GET ALL WORKERS
// ====================

export async function getWorkers(
  search = "",
): Promise<WorkerProfile[]> {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "worker")
    .order("created_at", {
      ascending: false,
    });

  const keyword = search.trim();

  if (keyword) {
    const escapedKeyword = keyword.replace(/[%(),]/g, "");

    query = query.or(
      `first_name.ilike.%${escapedKeyword}%,last_name.ilike.%${escapedKeyword}%,email.ilike.%${escapedKeyword}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkerProfile[];
}

// ====================
// GET SINGLE WORKER
// ====================

export async function getWorker(
  id: string,
): Promise<WorkerProfile> {
  const workerId = validateWorkerId(id);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", workerId)
    .eq("role", "worker")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Worker was not found.");
  }

  return data as WorkerProfile;
}

// ====================
// ALIASES
// ====================

export async function getWorkerById(
  id: string,
): Promise<WorkerProfile> {
  return getWorker(id);
}

export async function getWorkerDetails(
  id: string,
): Promise<WorkerWithServices> {
  const workerId = validateWorkerId(id);

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      services (
        id,
        category,
        service_name,
        description,
        price
      )
    `)
    .eq("id", workerId)
    .eq("role", "worker")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Worker was not found.");
  }

  return normalizeWorkerWithServices(data);
}

// ====================
// APPROVE WORKER
// ====================

export async function approveWorker(
  id: string,
): Promise<WorkerProfile[]> {
  return updateWorkerStatus(
    id,
    WORKER_STATUS.APPROVED,
    "APPROVED",
    "Worker account approved",
    "Registration Approved",
    "Congratulations! Your worker account has been approved. You can now start accepting bookings.",
  );
}

// ====================
// REJECT WORKER
// ====================

export async function rejectWorker(
  id: string,
): Promise<WorkerProfile[]> {
  return updateWorkerStatus(
    id,
    WORKER_STATUS.REJECTED,
    "REJECTED",
    "Worker account rejected",
    "Registration Rejected",
    "Your worker registration has been rejected. Please contact the administrator for more information.",
  );
}

// ====================
// EDUCATION
// ====================

export async function getEducation(
  profileId: string,
): Promise<EducationRecord | null> {
  const workerId = validateWorkerId(profileId);

  const { data, error } = await supabase
    .from("education")
    .select("*")
    .eq("profile_id", workerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as EducationRecord | null) ?? null;
}

// ====================
// WORK EXPERIENCE
// ====================

export async function getWorkExperience(
  profileId: string,
): Promise<WorkExperienceRecord[]> {
  const workerId = validateWorkerId(profileId);

  const { data, error } = await supabase
    .from("work_experience")
    .select("*")
    .eq("profile_id", workerId);

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkExperienceRecord[];
}

// ====================
// SKILLS
// ====================

export async function getSkills(
  profileId: string,
): Promise<WorkerSkillRecord[]> {
  const workerId = validateWorkerId(profileId);

  const { data, error } = await supabase
    .from("worker_skills")
    .select("*")
    .eq("profile_id", workerId);

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkerSkillRecord[];
}

// ====================
// DOCUMENTS
// ====================

export async function getDocuments(
  profileId: string,
): Promise<WorkerDocumentRecord | null> {
  const workerId = validateWorkerId(profileId);

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("profile_id", workerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WorkerDocumentRecord | null) ?? null;
}

// ====================
// SERVICES
// ====================

export async function getServices(
  profileId: string,
): Promise<WorkerServiceRecord[]> {
  const workerId = validateWorkerId(profileId);

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("worker_id", workerId);

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkerServiceRecord[];
}

// ====================
// COMPLETE WORKER PROFILE
// ====================

export async function getCompleteWorkerProfile(
  profileId: string,
): Promise<CompleteWorkerProfile> {
  const workerId = validateWorkerId(profileId);

  const [
    profile,
    education,
    workExperience,
    skills,
    documents,
    services,
  ] = await Promise.all([
    getWorker(workerId),
    getEducation(workerId),
    getWorkExperience(workerId),
    getSkills(workerId),
    getDocuments(workerId),
    getServices(workerId),
  ]);

  return {
    profile,
    education,
    workExperience,
    skills,
    documents,
    services,
  };
}

// =====================
// FEATURED WORKERS
// =====================

export async function getFeaturedWorkers(
  limit = 6,
): Promise<WorkerWithServices[]> {
  const validLimit = validateLimit(limit, 6);

  const { data, error } = await supabase
    .from("profiles")
    .select(WORKER_WITH_SERVICES_SELECT)
    .eq("role", "worker")
    .eq("status", WORKER_STATUS.APPROVED)
    .limit(validLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(normalizeWorkerWithServices);
}

// =====================
// GET CATEGORIES
// =====================

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("services")
    .select("category");

  if (error) {
    throw error;
  }

  const categories = (data ?? [])
    .map((item) => (item as ServiceCategoryRecord).category?.trim())
    .filter((category): category is string => Boolean(category));

  return [...new Set(categories)].sort((a, b) =>
    a.localeCompare(b),
  );
}

// =====================
// ADVANCED SEARCH
// =====================

export async function searchDashboard(
  keyword = "",
  category = "",
  minPrice?: number,
  maxPrice?: number,
): Promise<WorkerSearchResult[]> {
  const validMinPrice = validatePriceFilter(minPrice, "Minimum price");
  const validMaxPrice = validatePriceFilter(maxPrice, "Maximum price");

  if (
    validMinPrice !== undefined &&
    validMaxPrice !== undefined &&
    validMinPrice > validMaxPrice
  ) {
    throw new Error(
      "Minimum price cannot be greater than maximum price.",
    );
  }

  let query = supabase
    .from("profiles")
    .select(WORKER_WITH_SERVICES_SELECT)
    .eq("role", "worker")
    .eq("status", WORKER_STATUS.APPROVED);

  const normalizedKeyword = keyword.trim();

  if (normalizedKeyword) {
    const escapedKeyword = normalizedKeyword.replace(/[%(),]/g, "");

    query = query.or(
      `first_name.ilike.%${escapedKeyword}%,last_name.ilike.%${escapedKeyword}%,email.ilike.%${escapedKeyword}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  let workers = (data ?? []).map(normalizeWorkerWithServices);

  const normalizedCategory = category.trim();

  if (normalizedCategory) {
    workers = workers.filter((worker) =>
      worker.services.some(
        (service) => service.category === normalizedCategory,
      ),
    );
  }

  if (
    validMinPrice !== undefined ||
    validMaxPrice !== undefined
  ) {
    workers = workers.filter((worker) =>
      worker.services.some((service) => {
        const price = Number(service.price);

        if (!Number.isFinite(price)) {
          return false;
        }

        if (
          validMinPrice !== undefined &&
          price < validMinPrice
        ) {
          return false;
        }

        if (
          validMaxPrice !== undefined &&
          price > validMaxPrice
        ) {
          return false;
        }

        return true;
      }),
    );
  }

  return enrichWorkersWithMetrics(workers);
}

// =============================
// CUSTOMER WORKER PROFILE
// =============================

export async function getCustomerWorkerProfile(
  workerId: string,
): Promise<CompleteWorkerProfile> {
  return getCompleteWorkerProfile(workerId);
}

// =============================
// GET WORKERS BY CATEGORY
// =============================

export async function getWorkersByCategory(
  category: string,
): Promise<WorkerProfile[]> {
  const validCategory = validateRequiredText(category, "Category");

  const { data, error } = await supabase
    .from("services")
    .select(
      `
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone,
        profile_picture,
        role,
        status,
        created_at
      )
      `,
    )
    .eq("category", validCategory);

  if (error) {
    throw error;
  }

  const workers = (data ?? [])
    .map((item) =>
      normalizeWorkerRelation(
        (item as WorkerRelationRecord).worker,
      ),
    )
    .filter((worker): worker is WorkerProfile => Boolean(worker));

  return Array.from(
    new Map(workers.map((worker) => [worker.id, worker])).values(),
  );
}

// =====================
// CHECK AVAILABILITY
// =====================

export async function isWorkerAvailable(
  workerId: string,
): Promise<boolean> {
  const id = validateWorkerId(workerId);
  const today = new Date();

  const day = today.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const date = today.toISOString().split("T")[0];

  const [scheduleResult, unavailableResult] = await Promise.all([
    supabase
      .from("worker_schedules")
      .select("id")
      .eq("worker_id", id)
      .eq("day_of_week", day)
      .eq("is_available", true)
      .limit(1),
    supabase
      .from("unavailable_dates")
      .select("id")
      .eq("worker_id", id)
      .eq("unavailable_date", date)
      .limit(1),
  ]);

  if (scheduleResult.error) {
    throw scheduleResult.error;
  }

  if (unavailableResult.error) {
    throw unavailableResult.error;
  }

  return (
    (scheduleResult.data?.length ?? 0) > 0 &&
    (unavailableResult.data?.length ?? 0) === 0
  );
}

// =====================
// TOP RATED WORKERS
// =====================

export async function getTopRatedWorkers(
  limit = 5,
): Promise<WorkerSearchResult[]> {
  const validLimit = validateLimit(limit, 5);
  const workers = await getFeaturedWorkers(100);
  const rankedWorkers = await enrichWorkersWithMetrics(workers);

  return rankedWorkers
    .sort((a, b) => {
      if (b.average_rating !== a.average_rating) {
        return b.average_rating - a.average_rating;
      }

      return b.completed_jobs - a.completed_jobs;
    })
    .slice(0, validLimit);
}

// =====================
// RECOMMENDED WORKERS
// =====================

export async function getRecommendedWorkers(
  customerId: string,
): Promise<WorkerWithServices[]> {
  const id = validateRequiredText(customerId, "Customer ID");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("service_id")
    .eq("customer_id", id)
    .eq("status", "Completed")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (bookingError) {
    throw bookingError;
  }

  const latestBooking = booking as CompletedBookingRecord | null;

  if (!latestBooking?.service_id) {
    return getFeaturedWorkers(5);
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("category")
    .eq("id", latestBooking.service_id)
    .maybeSingle();

  if (serviceError) {
    throw serviceError;
  }

  const category = (service as ServiceCategoryRecord | null)?.category;

  if (!category) {
    return getFeaturedWorkers(5);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(WORKER_WITH_SERVICES_SELECT)
    .eq("role", "worker")
    .eq("status", WORKER_STATUS.APPROVED);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map(normalizeWorkerWithServices)
    .filter((worker) =>
      worker.services.some(
        (workerService) =>
          workerService.category === category,
      ),
    );
}