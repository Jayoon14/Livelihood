import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export type BookingStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Completed";

export type PaymentStatus =
  | "Pending"
  | "Paid"
  | "Failed"
  | "Refunded";

export type TripStatus =
  | "Not Started"
  | "Accepted"
  | "On The Way"
  | "Arrived"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type CompletionStatus =
  | "Not Started"
  | "Worker Completed"
  | "Customer Confirmed"
  | "Disputed";

export interface CreateBookingInput {
  customer_id: string;
  worker_id: string;
  service_id: number;
  booking_date: string;
  booking_time: string;
  address: string;
  customer_address: string;
  customer_latitude: number;
  customer_longitude: number;
  notes?: string | null;
}

export interface CustomerBookingWorker {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface CustomerBooking {
  id: number;
  customer_id: string;
  worker_id: string;
  service_id: number | null;
  service_name: string | null;
  category: string | null;
  price: number | null;
  booking_date: string;
  booking_time: string;
  address: string | null;
  customer_address: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;
  notes: string | null;
  status: string;
  payment_status?: string | null;
  schedule_status?: string | null;
  completion_status?: string | null;
  trip_status?: string | null;
  cancel_reason?: string | null;
  created_at: string;
  completed_at?: string | null;
  worker: CustomerBookingWorker | null;
  [key: string]: unknown;
}

export interface CancelledBookingResult {
  id: number;
  worker_id: string;
  status: "Cancelled";
}

interface ServiceRecord {
  id: number;
  worker_id: string | null;
  service_name: string;
  category: string | null;
  price: number | null;
  status: string | null;
}

type RelatedWorker =
  | CustomerBookingWorker
  | CustomerBookingWorker[]
  | null
  | undefined;

const ACTIVE_BOOKING_STATUSES = [
  "Pending",
  "Approved",
  "On Going",
] as const;

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
}

function requireText(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function validateBookingId(value: number | string): number | string {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error("A valid booking ID is required.");
    }

    return value;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("A valid booking ID is required.");
  }

  return normalizedValue;
}

function normalizeDateForDatabase(date: string): string {
  const normalizedDate = date.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new Error("The selected booking date is invalid.");
  }

  const parsedDate = new Date(`${normalizedDate}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("The selected booking date is invalid.");
  }

  return `${normalizedDate}T00:00:00`;
}

function normalizeTime(time: string): string {
  const normalizedTime = time.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(normalizedTime);

  if (!match) {
    throw new Error("The selected booking time is invalid.");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("The selected booking time is invalid.");
  }

  return normalizedTime;
}

function validateBookingInput(data: CreateBookingInput): void {
  requireText(data.customer_id, "Customer account");
  requireText(data.worker_id, "Worker account");

  if (!Number.isInteger(data.service_id) || data.service_id <= 0) {
    throw new Error("Please select a valid service.");
  }

  requireText(data.address, "Service address");
  requireText(data.customer_address, "Customer address");

  if (
    !Number.isFinite(data.customer_latitude) ||
    data.customer_latitude < -90 ||
    data.customer_latitude > 90
  ) {
    throw new Error("Customer latitude is invalid.");
  }

  if (
    !Number.isFinite(data.customer_longitude) ||
    data.customer_longitude < -180 ||
    data.customer_longitude > 180
  ) {
    throw new Error("Customer longitude is invalid.");
  }

  if ((data.notes?.trim().length ?? 0) > 1000) {
    throw new Error(
      "Job description must not exceed 1,000 characters.",
    );
  }
}

function normalizeWorker(value: RelatedWorker): CustomerBookingWorker | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeBooking(value: Record<string, unknown>): CustomerBooking {
  return {
    ...value,
    id: Number(value.id),
    customer_id: String(value.customer_id ?? ""),
    worker_id: String(value.worker_id ?? ""),
    service_id:
      value.service_id === null || value.service_id === undefined
        ? null
        : Number(value.service_id),
    service_name:
      value.service_name === null || value.service_name === undefined
        ? null
        : String(value.service_name),
    category:
      value.category === null || value.category === undefined
        ? null
        : String(value.category),
    price:
      value.price === null || value.price === undefined
        ? null
        : Number(value.price),
    booking_date: String(value.booking_date ?? ""),
    booking_time: String(value.booking_time ?? ""),
    address:
      value.address === null || value.address === undefined
        ? null
        : String(value.address),
    customer_address:
      value.customer_address === null ||
      value.customer_address === undefined
        ? null
        : String(value.customer_address),
    customer_latitude:
      value.customer_latitude === null ||
      value.customer_latitude === undefined
        ? null
        : Number(value.customer_latitude),
    customer_longitude:
      value.customer_longitude === null ||
      value.customer_longitude === undefined
        ? null
        : Number(value.customer_longitude),
    notes:
      value.notes === null || value.notes === undefined
        ? null
        : String(value.notes),
    status: String(value.status ?? ""),
    created_at: String(value.created_at ?? ""),
    worker: normalizeWorker(value.worker as RelatedWorker),
  };
}

async function safelyNotifyWorker(
  workerId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(
      workerId,
      bookingId,
      title,
      message,
    );
  } catch (error) {
    console.error("Booking succeeded, but notification failed:", error);
  }
}

async function getVerifiedService(
  serviceId: number,
  workerId: string,
): Promise<ServiceRecord> {
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      worker_id,
      service_name,
      category,
      price,
      status
    `)
    .eq("id", serviceId)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to verify the selected service.");
  }

  if (!data) {
    throw new Error(
      "The selected service does not belong to this worker or is no longer available.",
    );
  }

  const service = data as ServiceRecord;

  if (
    service.status &&
    service.status.trim().toLowerCase() !== "approved"
  ) {
    throw new Error("The selected service has not been approved.");
  }

  return service;
}

/**
 * Get all visible bookings of a customer.
 */
export async function getCustomerBookings(
  customerId: string,
): Promise<CustomerBooking[]> {
  const normalizedCustomerId = requireText(
    customerId,
    "Customer account",
  );

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("customer_id", normalizedCustomerId)
    .eq("customer_deleted", false)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw wrapError(error, "Unable to load customer bookings.");
  }

  return (data ?? []).map((booking) =>
    normalizeBooking(booking as unknown as Record<string, unknown>),
  );
}

/**
 * Get one customer booking.
 *
 * Ownership should also be enforced through Supabase RLS.
 */
export async function getBookingDetails(
  bookingId: number | string,
): Promise<CustomerBooking> {
  const validatedBookingId = validateBookingId(bookingId);

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        email,
        phone
      )
    `)
    .eq("id", validatedBookingId)
    .eq("customer_deleted", false)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load booking details.");
  }

  if (!data) {
    throw new Error(
      "The booking was not found or is no longer available.",
    );
  }

  return normalizeBooking(
    data as unknown as Record<string, unknown>,
  );
}

/**
 * Cancel a Pending customer booking.
 */
export async function cancelBooking(
  bookingId: number,
  customerId: string,
  cancelReason?: string,
): Promise<CancelledBookingResult> {
  const validatedBookingId = validateBookingId(bookingId);

  if (typeof validatedBookingId !== "number") {
    throw new Error("A valid booking ID is required.");
  }

  const normalizedCustomerId = requireText(
    customerId,
    "Customer account",
  );
  const reason = cancelReason?.trim() || null;

  if ((reason?.length ?? 0) > 500) {
    throw new Error(
      "Cancellation reason must not exceed 500 characters.",
    );
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "Cancelled" satisfies BookingStatus,
      trip_status: "Cancelled" satisfies TripStatus,
      schedule_status: "Cancelled",
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validatedBookingId)
    .eq("customer_id", normalizedCustomerId)
    .eq("status", "Pending")
    .eq("is_deleted", false)
    .select("id, worker_id, status")
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to cancel the booking.");
  }

  if (!data) {
    throw new Error(
      "The booking could not be cancelled. It may have already been accepted, cancelled, or completed.",
    );
  }

  const result: CancelledBookingResult = {
    id: Number(data.id),
    worker_id: String(data.worker_id),
    status: "Cancelled",
  };

  await safelyNotifyWorker(
    result.worker_id,
    result.id,
    "Booking Cancelled",
    reason
      ? `The customer cancelled the booking. Reason: ${reason}`
      : "The customer cancelled the booking.",
  );

  return result;
}

/**
 * Count visible customer bookings.
 */
export async function getCustomerBookingCount(
  customerId: string,
): Promise<number> {
  const normalizedCustomerId = requireText(
    customerId,
    "Customer account",
  );

  const { count, error } = await supabase
    .from("bookings")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("customer_id", normalizedCustomerId)
    .eq("customer_deleted", false)
    .eq("is_deleted", false);

  if (error) {
    throw wrapError(error, "Unable to count customer bookings.");
  }

  return count ?? 0;
}

/**
 * Get Pending customer bookings.
 */
export async function getPendingBookings(
  customerId: string,
): Promise<CustomerBooking[]> {
  const normalizedCustomerId = requireText(
    customerId,
    "Customer account",
  );

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name
      )
    `)
    .eq("customer_id", normalizedCustomerId)
    .eq("status", "Pending")
    .eq("customer_deleted", false)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw wrapError(error, "Unable to load pending bookings.");
  }

  return (data ?? []).map((booking) =>
    normalizeBooking(booking as unknown as Record<string, unknown>),
  );
}

/**
 * Get Completed customer bookings.
 */
export async function getCompletedBookings(
  customerId: string,
): Promise<CustomerBooking[]> {
  const normalizedCustomerId = requireText(
    customerId,
    "Customer account",
  );

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name
      )
    `)
    .eq("customer_id", normalizedCustomerId)
    .eq("status", "Completed")
    .eq("customer_deleted", false)
    .eq("is_deleted", false)
    .order("completed_at", { ascending: false });

  if (error) {
    throw wrapError(error, "Unable to load completed bookings.");
  }

  return (data ?? []).map((booking) =>
    normalizeBooking(booking as unknown as Record<string, unknown>),
  );
}

/**
 * Check whether a worker already has an active booking
 * on the selected date and time.
 */
export async function isWorkerAvailable(
  workerId: string,
  bookingDate: string,
  bookingTime: string,
): Promise<boolean> {
  const normalizedWorkerId = requireText(
    workerId,
    "Worker account",
  );
  const normalizedDate = normalizeDateForDatabase(bookingDate);
  const normalizedTime = normalizeTime(bookingTime);

  const { count, error } = await supabase
    .from("bookings")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("worker_id", normalizedWorkerId)
    .eq("booking_date", normalizedDate)
    .eq("booking_time", normalizedTime)
    .eq("is_deleted", false)
    .in("status", [...ACTIVE_BOOKING_STATUSES]);

  if (error) {
    throw wrapError(error, "Unable to check worker availability.");
  }

  return (count ?? 0) === 0;
}

/**
 * Create a new customer booking.
 */
export async function createBooking(
  data: CreateBookingInput,
): Promise<CustomerBooking> {
  validateBookingInput(data);

  const customerId = requireText(
    data.customer_id,
    "Customer account",
  );
  const workerId = requireText(
    data.worker_id,
    "Worker account",
  );
  const normalizedBookingDate =
    normalizeDateForDatabase(data.booking_date);
  const normalizedBookingTime =
    normalizeTime(data.booking_time);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw wrapError(userError, "Unable to verify your account.");
  }

  if (!user) {
    throw new Error(
      "You must be logged in before creating a booking.",
    );
  }

  if (user.id !== customerId) {
    throw new Error(
      "The booking customer does not match the authenticated account.",
    );
  }

  const service = await getVerifiedService(
    data.service_id,
    workerId,
  );

  const available = await isWorkerAvailable(
    workerId,
    data.booking_date,
    data.booking_time,
  );

  if (!available) {
    throw new Error(
      "The worker is no longer available at the selected date and time. Please choose another schedule.",
    );
  }

  const bookingPayload = {
    customer_id: customerId,
    worker_id: workerId,
    service_id: data.service_id,
    service_name: service.service_name,
    category: service.category,
    price: service.price,
    booking_date: normalizedBookingDate,
    booking_time: normalizedBookingTime,
    address: data.address.trim(),
    customer_address: data.customer_address.trim(),
    customer_latitude: data.customer_latitude,
    customer_longitude: data.customer_longitude,
    notes: data.notes?.trim() || null,
    status: "Pending" satisfies BookingStatus,
    payment_status: "Pending" satisfies PaymentStatus,
    schedule_status: "Pending",
    completion_status:
      "Not Started" satisfies CompletionStatus,
    trip_status: "Not Started" satisfies TripStatus,
    is_deleted: false,
    customer_deleted: false,
    worker_deleted: false,
  };

  const { data: booking, error: bookingError } =
    await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select(`
        *,
        worker:profiles!worker_id(
          id,
          first_name,
          middle_name,
          last_name,
          email,
          phone
        )
      `)
      .single();

  if (bookingError) {
    throw wrapError(bookingError, "Unable to create the booking.");
  }

  const normalizedBooking = normalizeBooking(
    booking as unknown as Record<string, unknown>,
  );

  await safelyNotifyWorker(
    normalizedBooking.worker_id,
    normalizedBooking.id,
    "New Booking",
    `You received a new booking request for ${
      normalizedBooking.service_name ?? "a service"
    }.`,
  );

  return normalizedBooking;
}