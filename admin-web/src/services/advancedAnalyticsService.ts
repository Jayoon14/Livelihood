import { supabase } from "../lib/supabase";

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

export interface ServiceDemandItem {
  service_id: string;
  service_name: string;
  category: string;
  bookings: number;
  completed: number;
}

export interface WorkerPerformanceItem {
  worker_id: string;
  worker_name: string;
  total_bookings: number;
  completed_jobs: number;
  cancelled_jobs: number;
  average_rating: number;
  review_count: number;
  complaint_count: number;
  completion_rate: number;
  cancellation_rate: number;
  complaint_rate: number;
  performance_score: number;
}

export interface AdvancedAnalyticsData {
  totalComplaints: number;
  activeComplaints: number;
  complaintRate: number;
  repeatCustomerRate: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  serviceDemand: ServiceDemandItem[];
  workerPerformance: WorkerPerformanceItem[];
}

interface BookingRow {
  worker_id: string | null;
  customer_id: string | null;
  service_id: string | number | null;
  status: string | null;
  created_at: string | null;
}

interface ServiceRow {
  id: string | number;
  service_name: string | null;
  category: string | null;
}

interface ReviewRow {
  worker_id: string | null;
  rating: number | string | null;
}

interface ReportRow {
  reported_user_id: string | null;
  reported_role: string | null;
  status: string | null;
  created_at: string | null;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
}

function normalizedStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isCompleted(value: unknown): boolean {
  return ["completed", "complete", "finished", "job completed"].includes(
    normalizedStatus(value),
  );
}

function isCancelled(value: unknown): boolean {
  return ["cancelled", "canceled", "cancel", "rejected", "declined"].includes(
    normalizedStatus(value),
  );
}

function isActiveCase(value: unknown): boolean {
  return !["resolved", "rejected", "withdrawn", "closed"].includes(
    normalizedStatus(value),
  );
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function percent(part: number, whole: number): number {
  return whole > 0 ? round((part / whole) * 100, 1) : 0;
}

function profileName(profile: ProfileRow | undefined): string {
  if (!profile) return "Unknown worker";
  return (
    [profile.first_name, profile.middle_name, profile.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") ||
    profile.email?.trim() ||
    "Unknown worker"
  );
}

function applyDateFilter<T extends { gte: Function; lte: Function }>(
  query: T,
  filters: AnalyticsFilters,
): T {
  let result = query;
  if (filters.startDate) {
    result = result.gte(
      "created_at",
      `${filters.startDate}T00:00:00.000Z`,
    ) as T;
  }
  if (filters.endDate) {
    result = result.lte(
      "created_at",
      `${filters.endDate}T23:59:59.999Z`,
    ) as T;
  }
  return result;
}

export async function getAdvancedAnalytics(
  filters: AnalyticsFilters = {},
): Promise<AdvancedAnalyticsData> {
  let bookingQuery = supabase
    .from("bookings")
    .select("worker_id,customer_id,service_id,status,created_at");
  bookingQuery = applyDateFilter(bookingQuery, filters);

  let reportQuery = supabase
    .from("reports")
    .select("reported_user_id,reported_role,status,created_at");
  reportQuery = applyDateFilter(reportQuery, filters);

  const [bookingsResult, servicesResult, reviewsResult, reportsResult, profilesResult] =
    await Promise.all([
      bookingQuery,
      supabase.from("services").select("id,service_name,category"),
      supabase.from("reviews").select("worker_id,rating"),
      reportQuery,
      supabase
        .from("profiles")
        .select("id,first_name,middle_name,last_name,email")
        .ilike("role", "worker"),
    ]);

  if (bookingsResult.error) throw bookingsResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (reportsResult.error) throw reportsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const bookings = (bookingsResult.data ?? []) as BookingRow[];
  const services = (servicesResult.data ?? []) as ServiceRow[];
  const reviews = (reviewsResult.data ?? []) as ReviewRow[];
  const reports = (reportsResult.data ?? []) as ReportRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];

  const serviceMap = new Map(
    services.map((service) => [String(service.id), service]),
  );
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const customerBookingCounts = new Map<string, number>();
  const serviceMetrics = new Map<
    string,
    { bookings: number; completed: number }
  >();
  const workerBookingMetrics = new Map<
    string,
    { total: number; completed: number; cancelled: number }
  >();

  for (const booking of bookings) {
    if (booking.customer_id) {
      customerBookingCounts.set(
        booking.customer_id,
        (customerBookingCounts.get(booking.customer_id) ?? 0) + 1,
      );
    }

    if (booking.service_id !== null && booking.service_id !== undefined) {
      const key = String(booking.service_id);
      const current = serviceMetrics.get(key) ?? { bookings: 0, completed: 0 };
      current.bookings += 1;
      if (isCompleted(booking.status)) current.completed += 1;
      serviceMetrics.set(key, current);
    }

    if (booking.worker_id) {
      const current = workerBookingMetrics.get(booking.worker_id) ?? {
        total: 0,
        completed: 0,
        cancelled: 0,
      };
      current.total += 1;
      if (isCompleted(booking.status)) current.completed += 1;
      if (isCancelled(booking.status)) current.cancelled += 1;
      workerBookingMetrics.set(booking.worker_id, current);
    }
  }

  const ratings = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    if (!review.worker_id) continue;
    const rating = Number(review.rating);
    if (!Number.isFinite(rating) || rating <= 0) continue;
    const current = ratings.get(review.worker_id) ?? { total: 0, count: 0 };
    current.total += rating;
    current.count += 1;
    ratings.set(review.worker_id, current);
  }

  const workerComplaints = new Map<string, number>();
  for (const report of reports) {
    if (
      report.reported_user_id &&
      normalizedStatus(report.reported_role) === "worker"
    ) {
      workerComplaints.set(
        report.reported_user_id,
        (workerComplaints.get(report.reported_user_id) ?? 0) + 1,
      );
    }
  }

  const workerIds = new Set([
    ...workerBookingMetrics.keys(),
    ...ratings.keys(),
    ...workerComplaints.keys(),
  ]);

  const workerPerformance = [...workerIds]
    .map((workerId): WorkerPerformanceItem => {
      const booking = workerBookingMetrics.get(workerId) ?? {
        total: 0,
        completed: 0,
        cancelled: 0,
      };
      const ratingData = ratings.get(workerId) ?? { total: 0, count: 0 };
      const averageRating =
        ratingData.count > 0 ? ratingData.total / ratingData.count : 0;
      const complaints = workerComplaints.get(workerId) ?? 0;
      const completionRate = percent(booking.completed, booking.total);
      const cancellationRate = percent(booking.cancelled, booking.total);
      const complaintRate = percent(complaints, Math.max(booking.completed, 1));

      // Transparent 100-point score:
      // 45% completion, 35% rating, 10% cancellation penalty,
      // 10% complaint penalty.
      const score = Math.max(
        0,
        Math.min(
          100,
          completionRate * 0.45 +
            (averageRating / 5) * 100 * 0.35 +
            Math.max(0, 100 - cancellationRate) * 0.1 +
            Math.max(0, 100 - complaintRate) * 0.1,
        ),
      );

      return {
        worker_id: workerId,
        worker_name: profileName(profileMap.get(workerId)),
        total_bookings: booking.total,
        completed_jobs: booking.completed,
        cancelled_jobs: booking.cancelled,
        average_rating: round(averageRating, 1),
        review_count: ratingData.count,
        complaint_count: complaints,
        completion_rate: completionRate,
        cancellation_rate: cancellationRate,
        complaint_rate: complaintRate,
        performance_score: round(score, 1),
      };
    })
    .sort(
      (a, b) =>
        b.performance_score - a.performance_score ||
        b.completed_jobs - a.completed_jobs,
    );

  const serviceDemand = [...serviceMetrics.entries()]
    .map(([serviceId, metrics]): ServiceDemandItem => {
      const service = serviceMap.get(serviceId);
      return {
        service_id: serviceId,
        service_name: service?.service_name?.trim() || "Unnamed service",
        category: service?.category?.trim() || "Uncategorized",
        bookings: metrics.bookings,
        completed: metrics.completed,
      };
    })
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 10);

  const repeatCustomers = [...customerBookingCounts.values()].filter(
    (count) => count > 1,
  ).length;
  const uniqueCustomers = customerBookingCounts.size;

  return {
    totalComplaints: reports.length,
    activeComplaints: reports.filter((report) => isActiveCase(report.status)).length,
    complaintRate: percent(reports.length, bookings.length),
    repeatCustomerRate: percent(repeatCustomers, uniqueCustomers),
    uniqueCustomers,
    repeatCustomers,
    serviceDemand,
    workerPerformance: workerPerformance.slice(0, 10),
  };
}

export interface WorkerPerformanceDetails {
  totalBookings: number;
  completedJobs: number;
  cancelledJobs: number;
  complaints: number;
  completionRate: number;
  cancellationRate: number;
  complaintRate: number;
  averageRating: number;
  performanceScore: number;
}

export async function getWorkerPerformanceDetails(
  workerId: string,
): Promise<WorkerPerformanceDetails> {
  const [bookingsResult, reviewsResult, reportsResult] = await Promise.all([
    supabase.from("bookings").select("status").eq("worker_id", workerId),
    supabase.from("reviews").select("rating").eq("worker_id", workerId),
    supabase
      .from("reports")
      .select("id")
      .eq("reported_user_id", workerId)
      .ilike("reported_role", "worker"),
  ]);

  if (bookingsResult.error) throw bookingsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (reportsResult.error) throw reportsResult.error;

  const statuses = bookingsResult.data ?? [];
  const completedJobs = statuses.filter((row) => isCompleted(row.status)).length;
  const cancelledJobs = statuses.filter((row) => isCancelled(row.status)).length;
  const totalBookings = statuses.length;
  const ratings = (reviewsResult.data ?? [])
    .map((row) => Number(row.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);
  const averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0;
  const complaints = reportsResult.data?.length ?? 0;
  const completionRate = percent(completedJobs, totalBookings);
  const cancellationRate = percent(cancelledJobs, totalBookings);
  const complaintRate = percent(complaints, Math.max(completedJobs, 1));
  const performanceScore = Math.max(
    0,
    Math.min(
      100,
      completionRate * 0.45 +
        (averageRating / 5) * 100 * 0.35 +
        Math.max(0, 100 - cancellationRate) * 0.1 +
        Math.max(0, 100 - complaintRate) * 0.1,
    ),
  );

  return {
    totalBookings,
    completedJobs,
    cancelledJobs,
    complaints,
    completionRate,
    cancellationRate,
    complaintRate,
    averageRating: round(averageRating, 1),
    performanceScore: round(performanceScore, 1),
  };
}
