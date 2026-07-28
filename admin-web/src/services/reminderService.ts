import { supabase } from "../lib/supabase";

export interface ReminderWorker {
  first_name: string | null;
  last_name: string | null;
}

export interface ReminderServiceDetails {
  service_name: string | null;
}

export interface UpcomingBookingReminder {
  id: number;
  customer_id: string;
  worker_id: string | null;
  service_id: number | null;
  booking_date: string;
  booking_time: string | null;
  status: string;
  worker: ReminderWorker | null;
  service: ReminderServiceDetails | null;
}

type WorkerRelation = ReminderWorker | ReminderWorker[] | null;
type ServiceRelation =
  | ReminderServiceDetails
  | ReminderServiceDetails[]
  | null;

interface RawUpcomingBookingReminder {
  id: number;
  customer_id: string;
  worker_id: string | null;
  service_id: number | null;
  booking_date: string;
  booking_time: string | null;
  status: string;
  worker: WorkerRelation;
  service: ServiceRelation;
}

function wrapError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallbackMessage);
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function getUpcomingBooking(): Promise<UpcomingBookingReminder | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw wrapError(authError, "Unable to verify the current account.");
  }

  if (!user) {
    return null;
  }

  const today = getLocalDateString();

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      worker_id,
      service_id,
      booking_date,
      booking_time,
      status,
      worker:profiles!bookings_worker_id_fkey(
        first_name,
        last_name
      ),
      service:services!service_id(
        service_name
      )
    `)
    .eq("customer_id", user.id)
    .in("status", ["Pending", "Approved"])
    .gte("booking_date", today)
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw wrapError(error, "Unable to load the upcoming booking reminder.");
  }

  if (!data) {
    return null;
  }

  const booking = data as unknown as RawUpcomingBookingReminder;

  return {
    id: booking.id,
    customer_id: booking.customer_id,
    worker_id: booking.worker_id,
    service_id: booking.service_id,
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    status: booking.status,
    worker: normalizeRelation(booking.worker),
    service: normalizeRelation(booking.service),
  };
}