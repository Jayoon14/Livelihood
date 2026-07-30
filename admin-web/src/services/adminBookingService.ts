import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export const ADMIN_BOOKING_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  ON_GOING: "On Going",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
} as const;

export type AdminBookingStatus =
  (typeof ADMIN_BOOKING_STATUS)[keyof typeof ADMIN_BOOKING_STATUS];

export interface AdminBookingProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture?: string | null;
}

export interface AdminBooking {
  id: number;
  customer_id: string;
  worker_id: string;
  service_id?: string | number | null;
  service_name: string | null;
  booking_date: string | null;
  booking_time: string | null;
  address: string | null;
  notes?: string | null;
  price?: number | string | null;
  status: string;
  payment_status?: string | null;
  schedule_status?: string | null;
  trip_status?: string | null;
  completion_status?: string | null;
  created_at?: string | null;
  customer?: AdminBookingProfile | null;
  worker?: AdminBookingProfile | null;
  [key: string]: unknown;
}

interface AdminProfileLookup {
  id: string;
}

interface BookingStatusLookup {
  id: number;
  customer_id: string;
  worker_id: string;
  status: string;
}

const ADMIN_BOOKING_SELECT = `
  *,
  customer:profiles!bookings_customer_id_fkey(
    id,
    first_name,
    middle_name,
    last_name,
    email,
    phone,
    profile_picture
  ),
  worker:profiles!bookings_worker_id_fkey(
    id,
    first_name,
    middle_name,
    last_name,
    email,
    phone,
    profile_picture
  )
`;

function validateBookingId(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Invalid booking ID.");
  }

  return value;
}

/**
 * Converts old/legacy aliases into one canonical status.
 * Stored canonical values:
 * Pending, Approved, On Going, Completed, Cancelled, Rejected
 */
export function normalizeAdminBookingStatus(
  value: string | null | undefined,
): AdminBookingStatus {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  switch (normalized) {
    case "approved":
    case "accepted":
      return ADMIN_BOOKING_STATUS.APPROVED;

    case "on going":
    case "ongoing":
    case "in progress":
    case "in-progress":
      return ADMIN_BOOKING_STATUS.ON_GOING;

    case "completed":
    case "complete":
      return ADMIN_BOOKING_STATUS.COMPLETED;

    case "cancelled":
    case "canceled":
      return ADMIN_BOOKING_STATUS.CANCELLED;

    case "rejected":
    case "reject":
      return ADMIN_BOOKING_STATUS.REJECTED;

    case "pending":
    default:
      return ADMIN_BOOKING_STATUS.PENDING;
  }
}

function validateAdminBookingStatus(
  value: string,
): AdminBookingStatus {
  const canonical = normalizeAdminBookingStatus(value);

  const validStatuses = Object.values(
    ADMIN_BOOKING_STATUS,
  ) as AdminBookingStatus[];

  if (!validStatuses.includes(canonical)) {
    throw new Error("Invalid booking status.");
  }

  return canonical;
}

function normalizeRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeBookingRow(
  row: Record<string, unknown>,
): AdminBooking {
  return {
    ...(row as unknown as AdminBooking),
    status: normalizeAdminBookingStatus(
      String(row.status ?? ""),
    ),
    customer: normalizeRelation(
      row.customer as
        | AdminBookingProfile
        | AdminBookingProfile[]
        | null
        | undefined,
    ),
    worker: normalizeRelation(
      row.worker as
        | AdminBookingProfile
        | AdminBookingProfile[]
        | null
        | undefined,
    ),
  };
}

async function getAdminIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (error) {
    console.error(
      "Unable to load administrator accounts:",
      error,
    );
    return [];
  }

  return ((data ?? []) as AdminProfileLookup[])
    .map((admin) => admin.id)
    .filter(Boolean);
}

async function notifySafely(
  userId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  if (!userId) {
    return;
  }

  try {
    await createNotification(
      userId,
      bookingId,
      title,
      message,
    );
  } catch (error) {
    console.error(
      "Unable to create booking notification:",
      error,
    );
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
      createNotification(
        adminId,
        bookingId,
        title,
        message,
      ),
    ),
  );
}

function assertAllowedTransition(
  currentValue: string,
  nextValue: AdminBookingStatus,
): void {
  const current =
    normalizeAdminBookingStatus(currentValue);

  const allowed: Record<
    AdminBookingStatus,
    AdminBookingStatus[]
  > = {
    [ADMIN_BOOKING_STATUS.PENDING]: [
      ADMIN_BOOKING_STATUS.APPROVED,
      ADMIN_BOOKING_STATUS.REJECTED,
      ADMIN_BOOKING_STATUS.CANCELLED,
    ],
    [ADMIN_BOOKING_STATUS.APPROVED]: [
      ADMIN_BOOKING_STATUS.ON_GOING,
      ADMIN_BOOKING_STATUS.CANCELLED,
    ],
    [ADMIN_BOOKING_STATUS.ON_GOING]: [
      ADMIN_BOOKING_STATUS.COMPLETED,
      ADMIN_BOOKING_STATUS.CANCELLED,
    ],
    [ADMIN_BOOKING_STATUS.COMPLETED]: [],
    [ADMIN_BOOKING_STATUS.CANCELLED]: [],
    [ADMIN_BOOKING_STATUS.REJECTED]: [],
  };

  if (!allowed[current].includes(nextValue)) {
    throw new Error(
      `Booking status cannot change from ${current} to ${nextValue}.`,
    );
  }
}

function buildStatusUpdate(
  status: AdminBookingStatus,
): Record<string, string> {
  const update: Record<string, string> = {
    status,
  };

  if (status === ADMIN_BOOKING_STATUS.APPROVED) {
    update.schedule_status = "Scheduled";
  }

  if (status === ADMIN_BOOKING_STATUS.ON_GOING) {
    update.schedule_status = "Scheduled";
    update.trip_status = "On Going";
    update.completion_status = "Not Started";
  }

  if (status === ADMIN_BOOKING_STATUS.COMPLETED) {
    update.trip_status = "Completed";
    update.completion_status = "Completed";
  }

  if (
    status === ADMIN_BOOKING_STATUS.CANCELLED ||
    status === ADMIN_BOOKING_STATUS.REJECTED
  ) {
    update.schedule_status = "Cancelled";
    update.trip_status = "Cancelled";
  }

  return update;
}

async function sendStatusNotifications(
  booking: AdminBooking,
  status: AdminBookingStatus,
): Promise<void> {
  const customerId = booking.customer_id;
  const workerId = booking.worker_id;

  const notificationByStatus: Record<
    AdminBookingStatus,
    {
      customerTitle: string;
      customerMessage: string;
      workerTitle: string;
      workerMessage: string;
      adminTitle: string;
      adminMessage: string;
    }
  > = {
    [ADMIN_BOOKING_STATUS.PENDING]: {
      customerTitle: "Booking Pending",
      customerMessage:
        "Your booking is awaiting approval.",
      workerTitle: "Booking Pending",
      workerMessage:
        "A booking is awaiting approval.",
      adminTitle: "Booking Pending",
      adminMessage:
        "A booking has been moved to pending.",
    },
    [ADMIN_BOOKING_STATUS.APPROVED]: {
      customerTitle: "Booking Approved",
      customerMessage:
        "Your booking has been approved.",
      workerTitle: "Booking Approved",
      workerMessage:
        "The booking is approved and scheduled.",
      adminTitle: "Booking Approved",
      adminMessage:
        "An administrator approved a booking.",
    },
    [ADMIN_BOOKING_STATUS.ON_GOING]: {
      customerTitle: "Service Started",
      customerMessage:
        "The worker has started your service.",
      workerTitle: "Service Started",
      workerMessage:
        "The booking is now in progress.",
      adminTitle: "Booking In Progress",
      adminMessage:
        "A booking has started.",
    },
    [ADMIN_BOOKING_STATUS.COMPLETED]: {
      customerTitle: "Job Completed",
      customerMessage:
        "Your booking has been completed. You may now leave a review.",
      workerTitle: "Job Completed",
      workerMessage:
        "The booking has been marked completed.",
      adminTitle: "Booking Completed",
      adminMessage:
        "A booking has been completed.",
    },
    [ADMIN_BOOKING_STATUS.CANCELLED]: {
      customerTitle: "Booking Cancelled",
      customerMessage:
        "Your booking has been cancelled.",
      workerTitle: "Booking Cancelled",
      workerMessage:
        "The booking has been cancelled.",
      adminTitle: "Booking Cancelled",
      adminMessage:
        "A booking has been cancelled.",
    },
    [ADMIN_BOOKING_STATUS.REJECTED]: {
      customerTitle: "Booking Rejected",
      customerMessage:
        "Your booking request has been rejected.",
      workerTitle: "Booking Rejected",
      workerMessage:
        "The booking request has been rejected.",
      adminTitle: "Booking Rejected",
      adminMessage:
        "A booking request has been rejected.",
    },
  };

  const notification = notificationByStatus[status];

  await Promise.allSettled([
    notifySafely(
      customerId,
      booking.id,
      notification.customerTitle,
      notification.customerMessage,
    ),
    notifySafely(
      workerId,
      booking.id,
      notification.workerTitle,
      notification.workerMessage,
    ),
    notifyAdminsSafely(
      booking.id,
      notification.adminTitle,
      notification.adminMessage,
    ),
  ]);
}

export async function getAllBookings(): Promise<
  AdminBooking[]
> {
  const { data, error } = await supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Record<string, unknown>[]).map(
    normalizeBookingRow,
  );
}

export async function getAdminBookingById(
  bookingId: number,
): Promise<AdminBooking> {
  const id = validateBookingId(bookingId);

  const { data, error } = await supabase
    .from("bookings")
    .select(ADMIN_BOOKING_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Booking not found.");
  }

  return normalizeBookingRow(
    data as Record<string, unknown>,
  );
}

export async function updateBookingStatus(
  bookingId: number,
  nextStatusValue: string,
): Promise<AdminBooking> {
  const id = validateBookingId(bookingId);
  const nextStatus =
    validateAdminBookingStatus(nextStatusValue);

  const { data: currentData, error: currentError } =
    await supabase
      .from("bookings")
      .select("id, customer_id, worker_id, status")
      .eq("id", id)
      .single();

  if (currentError) {
    throw currentError;
  }

  if (!currentData) {
    throw new Error("Booking not found.");
  }

  const current =
    currentData as BookingStatusLookup;

  assertAllowedTransition(current.status, nextStatus);

  const { data, error } = await supabase
    .from("bookings")
    .update(buildStatusUpdate(nextStatus))
    .eq("id", id)
    .eq("status", current.status)
    .select(ADMIN_BOOKING_SELECT)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Booking status update failed. The booking may have been changed by another user.",
    );
  }

  const updated = normalizeBookingRow(
    data as Record<string, unknown>,
  );

  await sendStatusNotifications(updated, nextStatus);

  return updated;
}