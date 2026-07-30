import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export interface Review {
  id: number;
  booking_id: number;
  worker_id: string;
  customer_id: string;
  overall_rating: number;
  quality_rating: number;
  professionalism_rating: number;
  communication_rating: number;
  review: string;
  rating: number;
  created_at: string;
}

export interface ReviewProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix?: string | null;
  profile_picture: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ReviewServiceInfo {
  id: number;
  service_name: string | null;
}

export interface ReviewBookingInfo {
  id: number;
  booking_date: string | null;
  status: string;
  service: ReviewServiceInfo | null;
}

export interface WorkerReview extends Review {
  customer: ReviewProfile | null;
  booking: ReviewBookingInfo | null;
}

export interface CustomerBookingReview {
  id: number;
  booking_date: string | null;
  status: string;
  worker: ReviewProfile | null;
  service: ReviewServiceInfo | null;
  review: Review | null;
}

export interface WorkerReviewQueryOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  rating?: 0 | 1 | 2 | 3 | 4 | 5;
  sort?: "newest" | "oldest" | "highest" | "lowest";
}

export interface WorkerReviewPage {
  items: WorkerReview[];
  total: number;
  hasMore: boolean;
}

const REVIEW_COLUMNS = `
  id,
  booking_id,
  worker_id,
  customer_id,
  overall_rating,
  quality_rating,
  professionalism_rating,
  communication_rating,
  review,
  rating,
  created_at,
  customer:profiles!reviews_customer_id_fkey(
    id,
    first_name,
    middle_name,
    last_name,
    suffix,
    profile_picture,
    email
  ),
  booking:bookings!booking_id(
    id,
    booking_date,
    status,
    service:services!service_id(
      id,
      service_name
    )
  )
`;

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

type Relation<T> = T | T[] | null | undefined;

type ReviewRow = {
  id: number;
  booking_id: number;
  worker_id: string;
  customer_id: string;
  overall_rating: number;
  quality_rating: number;
  professionalism_rating: number;
  communication_rating: number;
  review: string | null;
  rating: number;
  created_at: string;
  customer: Relation<ReviewProfile>;
  booking: Relation<{
    id: number;
    booking_date: string | null;
    status: string;
    service: Relation<ReviewServiceInfo>;
  }>;
};

type CustomerBookingRow = {
  id: number;
  booking_date: string | null;
  status: string;
  worker: Relation<ReviewProfile>;
  service: Relation<ReviewServiceInfo>;
  review: Relation<Review>;
};

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message.trim();

    if (message) {
      return new Error(message);
    }
  }

  return new Error(fallback);
}

function throwIfError(
  error: PostgrestError | Error | null,
  fallback: string,
): void {
  if (error) {
    throw toError(error, fallback);
  }
}

function normalizeRelation<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function validateId(value: string, field: string): string {
  const id = value.trim();

  if (!id) {
    throw new Error(`${field} is required.`);
  }

  return id;
}

function validateBookingId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Invalid booking ID.");
  }

  return value;
}

function validateRating(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`${field} must be a whole number between 1 and 5.`);
  }

  return value;
}

function validateComment(value: string): string {
  const comment = value.trim();

  if (comment.length > 2_000) {
    throw new Error("Review must not exceed 2,000 characters.");
  }

  return comment;
}

function normalizeProfile(
  value: Relation<ReviewProfile>,
): ReviewProfile | null {
  const profile = normalizeRelation(value);

  if (!profile) {
    return null;
  }

  return {
    id: String(profile.id ?? ""),
    first_name: profile.first_name ?? null,
    middle_name: profile.middle_name ?? null,
    last_name: profile.last_name ?? null,
    suffix: profile.suffix ?? null,
    profile_picture: profile.profile_picture ?? null,
    phone: profile.phone ?? null,
    email: profile.email ?? null,
  };
}

function normalizeService(
  value: Relation<ReviewServiceInfo>,
): ReviewServiceInfo | null {
  const service = normalizeRelation(value);

  if (!service) {
    return null;
  }

  return {
    id: Number(service.id),
    service_name: service.service_name ?? null,
  };
}

function normalizeWorkerReview(row: ReviewRow): WorkerReview {
  const booking = normalizeRelation(row.booking);

  return {
    id: Number(row.id),
    booking_id: Number(row.booking_id),
    worker_id: String(row.worker_id),
    customer_id: String(row.customer_id),
    overall_rating: Number(row.overall_rating),
    quality_rating: Number(row.quality_rating),
    professionalism_rating: Number(row.professionalism_rating),
    communication_rating: Number(row.communication_rating),
    review: row.review?.trim() ?? "",
    rating: Number(row.rating),
    created_at: String(row.created_at),
    customer: normalizeProfile(row.customer),
    booking: booking
      ? {
          id: Number(booking.id),
          booking_date: booking.booking_date ?? null,
          status: String(booking.status),
          service: normalizeService(booking.service),
        }
      : null,
  };
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw toError(error, "Unable to verify your session.");
  }

  if (!user) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return user.id;
}

async function ensureCurrentUser(expectedUserId: string): Promise<string> {
  const currentUserId = await getCurrentUserId();
  const expected = validateId(expectedUserId, "User ID");

  if (currentUserId !== expected) {
    throw new Error("You cannot perform this action for another user.");
  }

  return currentUserId;
}

async function getAdminIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (error) {
    console.error("Unable to load administrator IDs:", error);
    return [];
  }

  return (data ?? [])
    .map((row: { id?: string | null }) => row.id?.trim() ?? "")
    .filter(Boolean);
}

async function notifyReviewCreated(
  workerId: string,
  bookingId: number,
): Promise<void> {
  const adminIds = await getAdminIds();

  const tasks = [
    createNotification(
      workerId,
      bookingId,
      "New Review",
      "A customer submitted a review on your profile.",
    ),
    ...adminIds.map((adminId) =>
      createNotification(
        adminId,
        bookingId,
        "New Customer Review",
        "A customer submitted a review for a completed booking.",
      ),
    ),
  ];

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Unable to send review notification:", result.reason);
    }
  }
}

export async function hasReviewed(
  bookingId: number,
  customerId: string,
): Promise<boolean> {
  const validatedBookingId = validateBookingId(bookingId);
  const validatedCustomerId = await ensureCurrentUser(customerId);

  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", validatedBookingId)
    .eq("customer_id", validatedCustomerId)
    .maybeSingle();

  throwIfError(error, "Unable to verify review.");

  return Boolean(data);
}

export async function createReview(
  bookingId: number,
  workerId: string,
  customerId: string,
  overallRating: number,
  qualityRating: number,
  professionalismRating: number,
  communicationRating: number,
  comment: string,
): Promise<Review> {
  const validatedBookingId = validateBookingId(bookingId);
  const validatedCustomerId = await ensureCurrentUser(customerId);
  const validatedWorkerId = validateId(workerId, "Worker ID");

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      customer_id,
      worker_id
    `,
    )
    .eq("id", validatedBookingId)
    .maybeSingle();

  throwIfError(bookingError, "Unable to verify booking.");

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (String(booking.customer_id) !== validatedCustomerId) {
    throw new Error("Only the booking customer can submit a review.");
  }

  if (String(booking.worker_id) !== validatedWorkerId) {
    throw new Error("The selected worker does not belong to this booking.");
  }

  if (String(booking.status) !== "Completed") {
    throw new Error("Only completed bookings can be reviewed.");
  }

  const payload = {
    booking_id: validatedBookingId,
    worker_id: validatedWorkerId,
    customer_id: validatedCustomerId,
    overall_rating: validateRating(overallRating, "Overall rating"),
    quality_rating: validateRating(qualityRating, "Quality rating"),
    professionalism_rating: validateRating(
      professionalismRating,
      "Professionalism rating",
    ),
    communication_rating: validateRating(
      communicationRating,
      "Communication rating",
    ),
    review: validateComment(comment),
    rating: validateRating(overallRating, "Overall rating"),
  };

  const { data, error } = await supabase
    .from("reviews")
    .insert(payload)
    .select(
      `
      id,
      booking_id,
      worker_id,
      customer_id,
      overall_rating,
      quality_rating,
      professionalism_rating,
      communication_rating,
      review,
      rating,
      created_at
    `,
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("This booking has already been reviewed.");
    }

    throw toError(error, "Unable to create review.");
  }

  void notifyReviewCreated(validatedWorkerId, validatedBookingId);

  return {
    id: Number(data.id),
    booking_id: Number(data.booking_id),
    worker_id: String(data.worker_id),
    customer_id: String(data.customer_id),
    overall_rating: Number(data.overall_rating),
    quality_rating: Number(data.quality_rating),
    professionalism_rating: Number(data.professionalism_rating),
    communication_rating: Number(data.communication_rating),
    review: String(data.review ?? ""),
    rating: Number(data.rating),
    created_at: String(data.created_at),
  };
}

export async function getCustomerReviewableBookings(
  customerId: string,
): Promise<CustomerBookingReview[]> {
  const validatedCustomerId = await ensureCurrentUser(customerId);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      booking_date,
      status,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        suffix,
        profile_picture,
        phone,
        email
      ),
      service:services!service_id(
        id,
        service_name
      ),
      review:reviews!booking_id(
        id,
        booking_id,
        worker_id,
        customer_id,
        overall_rating,
        quality_rating,
        professionalism_rating,
        communication_rating,
        review,
        rating,
        created_at
      )
    `,
    )
    .eq("customer_id", validatedCustomerId)
    .eq("status", "Completed")
    .order("booking_date", { ascending: false });

  throwIfError(error, "Unable to load completed bookings.");

  return ((data ?? []) as unknown as CustomerBookingRow[]).map((row) => ({
    id: Number(row.id),
    booking_date: row.booking_date ?? null,
    status: String(row.status),
    worker: normalizeProfile(row.worker),
    service: normalizeService(row.service),
    review: normalizeRelation(row.review),
  }));
}

/**
 * Backward-compatible alias. This returns completed customer bookings
 * together with their existing review, when available.
 */
export async function getMyReviews(
  customerId: string,
): Promise<CustomerBookingReview[]> {
  return getCustomerReviewableBookings(customerId);
}

export async function getWorkerReviewsPage(
  workerId: string,
  options: WorkerReviewQueryOptions = {},
): Promise<WorkerReviewPage> {
  const validatedWorkerId = validateId(workerId, "Worker ID");

  const page =
    Number.isInteger(options.page) && (options.page ?? 0) > 0
      ? Number(options.page)
      : 1;

  const requestedPageSize =
    Number.isInteger(options.pageSize) && (options.pageSize ?? 0) > 0
      ? Number(options.pageSize)
      : DEFAULT_PAGE_SIZE;

  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("reviews")
    .select(REVIEW_COLUMNS, {
      count: "exact",
    })
    .eq("worker_id", validatedWorkerId);

  if (options.rating && options.rating >= 1 && options.rating <= 5) {
    query = query.eq("overall_rating", options.rating);
  }

  const search = options.search?.trim().replace(/[(),%_]/g, " ") ?? "";

  if (search) {
    query = query.ilike("review", `%${search}%`);
  }

  switch (options.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;

    case "highest":
      query = query
        .order("overall_rating", { ascending: false })
        .order("created_at", { ascending: false });
      break;

    case "lowest":
      query = query
        .order("overall_rating", { ascending: true })
        .order("created_at", { ascending: false });
      break;

    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error, count } = await query.range(from, to);

  throwIfError(error, "Unable to load worker reviews.");

  const total = count ?? 0;

  return {
    items: ((data ?? []) as unknown as ReviewRow[]).map(normalizeWorkerReview),
    total,
    hasMore: from + pageSize < total,
  };
}

export async function getWorkerReviews(
  workerId: string,
): Promise<WorkerReview[]> {
 const validatedWorkerId = validateId(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("worker_id", validatedWorkerId)
    .order("created_at", { ascending: false });

  throwIfError(error, "Unable to load worker reviews.");

  return ((data ?? []) as unknown as ReviewRow[]).map(normalizeWorkerReview);
}

export async function getAverageRating(
  workerId: string,
): Promise<number> {
  const validatedWorkerId = validateId(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("reviews")
    .select("overall_rating")
    .eq("worker_id", validatedWorkerId);

  throwIfError(error, "Unable to compute average rating.");

  if (!data?.length) return 0;

  const total = data.reduce(
    (sum, item) => sum + Number(item.overall_rating ?? 0),
    0,
  );

  return Number((total / data.length).toFixed(1));
}

export async function getWorkerAverageRating(
  workerId: string,
): Promise<number> {
  return getAverageRating(workerId);
}