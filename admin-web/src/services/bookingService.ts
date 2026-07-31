import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";
import { createSchedule } from "./scheduleService";
import { getWorkerBookability } from "./presenceService";

export const BOOKING_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const PAYMENT_STATUS = {
  UNPAID: "Unpaid",
} as const;

export const SCHEDULE_STATUS = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
} as const;

export const COMPLETION_STATUS = {
  NOT_STARTED: "Not Started",
  COMPLETED: "Completed",
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export interface CreateBookingRequest {
  customer_id: string;
  worker_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  notes?: string;
}

export interface BookingProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture?: string | null;
}

export interface BookingRecord {
  id: number;
  customer_id: string;
  worker_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  address: string;
  notes: string | null;
  price: number;
  status: BookingStatus;
  payment_status: string;
  schedule_status: string;
  completion_status: string;
  created_at?: string;
  customer?: BookingProfile | BookingProfile[] | null;
  worker?: BookingProfile | BookingProfile[] | null;
  [key: string]: unknown;
}

export interface BookingTimelineItem {
  title: string;
  done: boolean;
}

interface AdminProfile {
  id: string;
}

interface ServicePrice {
  price: number | string | null;
}

const BOOKING_DETAILS_SELECT = `
  *,
  customer:profiles!customer_id(
    id,
    first_name,
    middle_name,
    last_name,
    email,
    phone
  ),
  worker:profiles!worker_id(
    id,
    first_name,
    middle_name,
    last_name,
    email,
    phone
  )
`;

const CUSTOMER_BOOKINGS_SELECT = `
  *,
  worker:profiles!bookings_worker_id_fkey(
    id,
    first_name,
    middle_name,
    last_name,
    profile_picture,
    phone,
    email
  )
`;

function validateRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function validateBookingId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid booking ID.");
  }

  return id;
}

function validateBookingLookupId(id: string | number): string | number {
  if (typeof id === "number") {
    return validateBookingId(id);
  }

  const normalized = id.trim();

  if (!normalized) {
    throw new Error("Booking ID is required.");
  }

  return normalized;
}

function validateBookingStatus(status: string): BookingStatus {
  const validStatuses = Object.values(BOOKING_STATUS) as string[];

  if (!validStatuses.includes(status)) {
    throw new Error("Invalid booking status.");
  }

  return status as BookingStatus;
}

function normalizeBookingInput(
  booking: CreateBookingRequest,
): CreateBookingRequest {
  return {
    customer_id: validateRequiredText(
      booking.customer_id,
      "Customer ID",
    ),
    worker_id: validateRequiredText(booking.worker_id, "Worker ID"),
    service_id: validateRequiredText(booking.service_id, "Service ID"),
    booking_date: validateRequiredText(
      booking.booking_date,
      "Booking date",
    ),
    booking_time: validateRequiredText(
      booking.booking_time,
      "Booking time",
    ),
    address: validateRequiredText(booking.address, "Address"),
    notes: booking.notes?.trim() ?? "",
  };
}

function normalizePrice(price: ServicePrice["price"]): number {
  const numericPrice =
    typeof price === "number" ? price : Number.parseFloat(price ?? "");

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error("The selected service has an invalid price.");
  }

  return numericPrice;
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

  return ((data ?? []) as AdminProfile[])
    .map((admin) => admin.id)
    .filter((id) => Boolean(id));
}

async function notifyUserSafely(
  userId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(
      userId,
      bookingId,
      title,
      message,
    );
  } catch (error) {
    console.error("Unable to create notification:", error);
  }
}

async function notifyAdminsSafely(
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  const adminIds = await getAdminIds();

  await Promise.allSettled(
    adminIds.map((adminId) =>
      createNotification(adminId, bookingId, title, message),
    ),
  );
}

async function rollbackAcceptedBooking(bookingId: number): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.PENDING,
      schedule_status: SCHEDULE_STATUS.PENDING,
    })
    .eq("id", bookingId);

  if (error) {
    console.error("Unable to roll back booking approval:", error);
  }
}

const ACTIVE_DUPLICATE_BOOKING_STATUSES = [
  "Pending",
  "Approved",
  "On Going",
  "Waiting Customer Confirmation",
] as const;

async function ensureNoActiveDuplicateBooking(
  customerId: string,
  workerId: string,
  serviceId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("customer_id", customerId)
    .eq("worker_id", workerId)
    .eq("service_id", serviceId)
    .in("status", [...ACTIVE_DUPLICATE_BOOKING_STATUSES])
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    throw new Error(
      "You already have an active booking for this worker and service. " +
        "Wait for it to finish or cancel it before booking again.",
    );
  }
}

// =========================
// CREATE BOOKING
// =========================

export async function createBooking(
  booking: CreateBookingRequest,
): Promise<BookingRecord> {
  const normalizedBooking = normalizeBookingInput(booking);

  // Fast user-facing check. The database unique index remains the final
  // protection against simultaneous or repeated booking requests.
  await ensureNoActiveDuplicateBooking(
    normalizedBooking.customer_id,
    normalizedBooking.worker_id,
    normalizedBooking.service_id,
  );

  // Final server-facing validation immediately before insertion.
  // A worker with last_seen = null or an expired heartbeat must not
  // receive a new booking even if the customer opened the page earlier.
  const bookability = await getWorkerBookability(
    normalizedBooking.worker_id,
  );

  if (!bookability.canBook) {
    throw new Error(
      bookability.reason ||
        "This worker is currently offline and cannot receive bookings.",
    );
  }

  const available = await isWorkerAvailable(
    normalizedBooking.worker_id,
    normalizedBooking.booking_date,
    normalizedBooking.booking_time,
  );

  if (!available) {
    throw new Error(
      "This time slot has already been booked. Please choose another schedule.",
    );
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("price")
    .eq("id", normalizedBooking.service_id)
    .eq("worker_id", normalizedBooking.worker_id)
    .single();

  if (serviceError) {
    throw serviceError;
  }

  if (!service) {
    throw new Error("The selected service was not found.");
  }

  const price = normalizePrice((service as ServicePrice).price);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      ...normalizedBooking,
      price,
      status: BOOKING_STATUS.PENDING,
      payment_status: PAYMENT_STATUS.UNPAID,
      schedule_status: SCHEDULE_STATUS.PENDING,
      completion_status: COMPLETION_STATUS.NOT_STARTED,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "You already have an active booking for this worker and service. " +
          "Wait for it to finish or cancel it before booking again.",
      );
    }

    throw error;
  }

  if (!data) {
    throw new Error("Booking creation failed.");
  }

  const createdBooking = data as BookingRecord;

  await Promise.all([
    notifyUserSafely(
      normalizedBooking.worker_id,
      createdBooking.id,
      "New Booking Request",
      "A customer has sent you a booking request.",
    ),
    notifyAdminsSafely(
      createdBooking.id,
      "New Booking Created",
      "A new booking has been created.",
    ),
  ]);

  return createdBooking;
}

// =========================
// GET BOOKINGS
// =========================

export async function getBookings(
  status: BookingStatus | "All" = "All",
): Promise<BookingRecord[]> {
  let query = supabase
    .from("bookings")
    .select(BOOKING_DETAILS_SELECT)
    .order("created_at", {
      ascending: false,
    });

  if (status !== "All") {
    query = query.eq("status", validateBookingStatus(status));
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as BookingRecord[];
}

// =========================
// GET SINGLE BOOKING
// =========================

export async function getBooking(
  id: string | number,
): Promise<BookingRecord> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_DETAILS_SELECT)
    .eq("id", validateBookingLookupId(id))
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Booking not found.");
  }

  return data as BookingRecord;
}

// =========================
// UPDATE BOOKING STATUS
// =========================

export async function updateBookingStatus(
  bookingId: number,
  status: BookingStatus,
): Promise<BookingRecord> {
  const validBookingId = validateBookingId(bookingId);
  const validStatus = validateBookingStatus(status);

  const updateData: {
    status: BookingStatus;
    completion_status?: typeof COMPLETION_STATUS.COMPLETED;
  } = {
    status: validStatus,
  };

  if (validStatus === BOOKING_STATUS.COMPLETED) {
    updateData.completion_status = COMPLETION_STATUS.COMPLETED;
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", validBookingId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Booking status update failed.");
  }

  const booking = data as BookingRecord;

  if (validStatus === BOOKING_STATUS.COMPLETED) {
    await Promise.all([
      notifyUserSafely(
        booking.customer_id,
        booking.id,
        "Job Completed",
        "Your booking has been completed. You may now leave a review.",
      ),
      notifyAdminsSafely(
        booking.id,
        "Booking Completed",
        "A booking has been completed.",
      ),
    ]);
  }

  return booking;
}

// =========================
// WORKER ACCEPT BOOKING
// =========================

export async function acceptBooking(
  id: number,
): Promise<BookingRecord> {
  const bookingId = validateBookingId(id);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.APPROVED,
      schedule_status: SCHEDULE_STATUS.PENDING,
    })
    .eq("id", bookingId)
    .eq("status", BOOKING_STATUS.PENDING)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Booking approval failed. The booking may no longer be pending.",
    );
  }

  const booking = data as BookingRecord;

  try {
    await createSchedule({
      booking_id: booking.id,
      worker_id: booking.worker_id,
      customer_id: booking.customer_id,
      schedule_date: booking.booking_date,
      schedule_time: booking.booking_time,
      address: booking.address,
      status: SCHEDULE_STATUS.SCHEDULED,
    });
  } catch (error) {
    await rollbackAcceptedBooking(booking.id);
    throw error;
  }

  await Promise.all([
    notifyUserSafely(
      booking.customer_id,
      booking.id,
      "Booking Approved",
      "Your booking has been approved by the worker.",
    ),
    notifyAdminsSafely(
      booking.id,
      "Booking Approved",
      "A worker approved a booking.",
    ),
  ]);

  return booking;
}

// =========================
// WORKER REJECT BOOKING
// =========================

export async function rejectBooking(
  id: number,
): Promise<BookingRecord> {
  const bookingId = validateBookingId(id);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.CANCELLED,
    })
    .eq("id", bookingId)
    .eq("status", BOOKING_STATUS.PENDING)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Booking rejection failed. The booking may no longer be pending.",
    );
  }

  const booking = data as BookingRecord;

  await Promise.all([
    notifyUserSafely(
      booking.customer_id,
      booking.id,
      "Booking Cancelled",
      "Unfortunately, the worker cancelled your booking.",
    ),
    notifyAdminsSafely(
      booking.id,
      "Booking Cancelled",
      "A worker rejected a booking.",
    ),
  ]);

  return booking;
}

// =========================
// GET BOOKING BY ID
// =========================

export async function getBookingById(
  id: number,
): Promise<BookingRecord> {
  return getBooking(validateBookingId(id));
}

// =========================
// CHECK WORKER AVAILABILITY
// =========================

export async function isWorkerAvailable(
  workerId: string,
  bookingDate: string,
  bookingTime: string,
): Promise<boolean> {
  const validWorkerId = validateRequiredText(workerId, "Worker ID");
  const validBookingDate = validateRequiredText(
    bookingDate,
    "Booking date",
  );
  const validBookingTime = validateRequiredText(
    bookingTime,
    "Booking time",
  );

  const { data: booked, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("worker_id", validWorkerId)
    .eq("booking_date", validBookingDate)
    .eq("booking_time", validBookingTime)
    .neq("status", BOOKING_STATUS.CANCELLED)
    .limit(1);

  if (bookingError) {
    throw bookingError;
  }

  if ((booked?.length ?? 0) > 0) {
    return false;
  }

  const { data: unavailable, error: unavailableError } = await supabase
    .from("unavailable_dates")
    .select("id")
    .eq("worker_id", validWorkerId)
    .eq("unavailable_date", validBookingDate)
    .limit(1);

  if (unavailableError) {
    throw unavailableError;
  }

  return (unavailable?.length ?? 0) === 0;
}

// ===========================
// CUSTOMER BOOKINGS
// ===========================

export async function getCustomerBookings(
  customerId: string,
): Promise<BookingRecord[]> {
  const validCustomerId = validateRequiredText(
    customerId,
    "Customer ID",
  );

  const { data, error } = await supabase
    .from("bookings")
    .select(CUSTOMER_BOOKINGS_SELECT)
    .eq("customer_id", validCustomerId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []) as BookingRecord[];
}

// ===========================
// CANCEL BOOKING
// ===========================

export async function cancelBooking(id: number): Promise<void> {
  const bookingId = validateBookingId(id);

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: BOOKING_STATUS.CANCELLED,
    })
    .eq("id", bookingId)
    .neq("status", BOOKING_STATUS.COMPLETED)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Booking cancellation failed. Completed or missing bookings cannot be cancelled.",
    );
  }
}

// ===========================
// BOOKING TIMELINE
// ===========================

export function getBookingTimeline(
  status: string,
): BookingTimelineItem[] {
  return [
    {
      title: "Booking Submitted",
      done: true,
    },
    {
      title: "Worker Approved",
      done: status !== BOOKING_STATUS.PENDING,
    },
    {
      title: "Work In Progress",
      done:
        status === BOOKING_STATUS.APPROVED ||
        status === BOOKING_STATUS.COMPLETED,
    },
    {
      title: "Completed",
      done: status === BOOKING_STATUS.COMPLETED,
    },
  ];
}