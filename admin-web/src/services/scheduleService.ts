import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export const BOOKING_ACTIVE_STATUSES = [
  "Pending",
  "Approved",
  "On Going",
] as const;

export const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export interface WorkerSchedule {
  id: number;
  worker_id: string;
  day_of_week: WeekDay;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkerScheduleInput {
  day_of_week: WeekDay | string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface UnavailableDate {
  id: number;
  worker_id: string;
  unavailable_date: string;
  reason: string | null;
  created_at?: string;
}

export interface AvailabilityAvailable {
  available: true;
  schedule: WorkerSchedule;
}

export interface AvailabilityUnavailable {
  available: false;
  reason: string;
}

export type WorkerAvailability =
  | AvailabilityAvailable
  | AvailabilityUnavailable;

export interface BookingTimeRecord {
  booking_date?: string;
  booking_time: string;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
}

export type DurationUnit = "hour" | "day" | "week" | "month";

export interface ServiceDuration {
  scheduling_type: "hourly" | "project";
  duration_value: number;
  duration_unit: DurationUnit;
}

export interface CreateSchedulePayload {
  booking_id: number;
  worker_id: string;
  customer_id: string;
  schedule_date: string;
  schedule_time: string;
  address: string;
  status: string;
}

export interface CreatedScheduleRecord extends CreateSchedulePayload {
  id: number;
  created_at?: string;
  updated_at?: string;
}

interface AdminProfile {
  id: string;
}

const MANILA_TIME_ZONE = "Asia/Manila";
const SLOT_INTERVAL_MINUTES = 60;

function validateRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function validatePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return value;
}

function validateDateString(value: string, fieldName: string): string {
  const normalized = validateRequiredText(value, fieldName);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} must use the YYYY-MM-DD format.`);
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return normalized;
}

function validateTimeString(value: string, fieldName: string): string {
  const normalized = validateRequiredText(value, fieldName);
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(
    normalized,
  );

  if (!match) {
    throw new Error(`${fieldName} must use HH:mm or HH:mm:ss format.`);
  }

  return `${match[1]}:${match[2]}`;
}

function normalizeWeekDay(value: string): WeekDay {
  const normalized = validateRequiredText(value, "Day of week");
  const match = WEEK_DAYS.find(
    (day) => day.toLowerCase() === normalized.toLowerCase(),
  );

  if (!match) {
    throw new Error(`Invalid day of week: ${value}`);
  }

  return match;
}

function timeToMinutes(time: string): number {
  const normalized = validateTimeString(time, "Time");
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0",
  )}`;
}

export function calculateScheduledEnd(
  start: Date,
  durationValue: number,
  durationUnit: DurationUnit,
): Date {
  const end = new Date(start);

  if (durationUnit === "hour") end.setHours(end.getHours() + durationValue);
  if (durationUnit === "day") end.setDate(end.getDate() + durationValue);
  if (durationUnit === "week") end.setDate(end.getDate() + durationValue * 7);
  if (durationUnit === "month") end.setMonth(end.getMonth() + durationValue);

  return end;
}

export function createManilaScheduleRange(
  date: string,
  time: string,
  durationValue: number,
  durationUnit: DurationUnit,
): { start: Date; end: Date } {
  const validDate = validateDateString(date, "Booking date");
  const validTime = validateTimeString(time, "Booking time");
  const start = new Date(`${validDate}T${validTime}:00+08:00`);
  return { start, end: calculateScheduledEnd(start, durationValue, durationUnit) };
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function getDayName(dateString: string): WeekDay {
  const validDate = validateDateString(dateString, "Booking date");
  const date = new Date(`${validDate}T00:00:00+08:00`);
  const dayName = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: MANILA_TIME_ZONE,
  }).format(date);

  return normalizeWeekDay(dayName);
}

function validateScheduleRange(startTime: string, endTime: string): void {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (end <= start) {
    throw new Error("Schedule end time must be later than start time.");
  }
}

function buildTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes = SLOT_INTERVAL_MINUTES,
): string[] {
  validateScheduleRange(startTime, endTime);

  const slots: string[] = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  for (let current = start; current < end; current += intervalMinutes) {
    slots.push(minutesToTime(current));
  }

  return slots;
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
    .filter(Boolean);
}

async function notifySafely(
  userId: string,
  bookingId: number,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(userId, bookingId, title, message);
  } catch (error) {
    console.error("Unable to create schedule notification:", error);
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

// ==============================
// WEEKLY SCHEDULE
// ==============================

export async function getWorkerSchedule(
  workerId: string,
): Promise<WorkerSchedule[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("worker_schedules")
    .select("*")
    .eq("worker_id", id)
    .order("id");

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkerSchedule[];
}

export async function saveWorkerSchedule(
  workerId: string,
  schedules: WorkerScheduleInput[],
): Promise<WorkerSchedule[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  if (!Array.isArray(schedules) || schedules.length === 0) {
    throw new Error("At least one worker schedule is required.");
  }

  const seenDays = new Set<WeekDay>();

  const payload = schedules.map((item) => {
    const day = normalizeWeekDay(item.day_of_week);

    if (seenDays.has(day)) {
      throw new Error(`Duplicate schedule found for ${day}.`);
    }

    seenDays.add(day);

    const startTime = validateTimeString(item.start_time, "Start time");
    const endTime = validateTimeString(item.end_time, "End time");

    if (item.is_available) {
      validateScheduleRange(startTime, endTime);
    }

    return {
      worker_id: id,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      is_available: Boolean(item.is_available),
    };
  });

  const { data, error } = await supabase
    .from("worker_schedules")
    .upsert(payload, {
      onConflict: "worker_id,day_of_week",
    })
    .select();

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkerSchedule[];
}

// ==============================
// UNAVAILABLE DATES
// ==============================

export async function getUnavailableDates(
  workerId: string,
): Promise<UnavailableDate[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("unavailable_dates")
    .select("*")
    .eq("worker_id", id)
    .order("unavailable_date");

  if (error) {
    throw error;
  }

  return (data ?? []) as UnavailableDate[];
}

export async function addUnavailableDate(
  workerId: string,
  unavailableDate: string,
  reason: string,
): Promise<UnavailableDate> {
  const id = validateRequiredText(workerId, "Worker ID");
  const date = validateDateString(unavailableDate, "Unavailable date");
  const normalizedReason = reason.trim();

  const { data: existing, error: existingError } = await supabase
    .from("unavailable_dates")
    .select("id")
    .eq("worker_id", id)
    .eq("unavailable_date", date)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    throw new Error("This unavailable date has already been added.");
  }

  const { data, error } = await supabase
    .from("unavailable_dates")
    .insert({
      worker_id: id,
      unavailable_date: date,
      reason: normalizedReason || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Unable to add unavailable date.");
  }

  return data as UnavailableDate;
}

export async function deleteUnavailableDate(id: number): Promise<void> {
  const validId = validatePositiveInteger(id, "Unavailable date ID");

  const { error } = await supabase
    .from("unavailable_dates")
    .delete()
    .eq("id", validId);

  if (error) {
    throw error;
  }
}

// ===============================
// CHECK WORKER AVAILABILITY
// ===============================

export async function checkWorkerAvailability(
  workerId: string,
  bookingDate: string,
): Promise<WorkerAvailability> {
  const id = validateRequiredText(workerId, "Worker ID");
  const date = validateDateString(bookingDate, "Booking date");
  const dayName = getDayName(date);

  const [scheduleResult, unavailableResult] = await Promise.all([
    supabase
      .from("worker_schedules")
      .select("*")
      .eq("worker_id", id)
      .eq("day_of_week", dayName)
      .maybeSingle(),
    supabase
      .from("unavailable_dates")
      .select("*")
      .eq("worker_id", id)
      .eq("unavailable_date", date)
      .maybeSingle(),
  ]);

  if (scheduleResult.error) {
    throw scheduleResult.error;
  }

  if (unavailableResult.error) {
    throw unavailableResult.error;
  }

  const schedule = scheduleResult.data as WorkerSchedule | null;
  const unavailable =
    unavailableResult.data as UnavailableDate | null;

  if (!schedule || !schedule.is_available) {
    return {
      available: false,
      reason: "Worker is not available on this day.",
    };
  }

  if (unavailable) {
    return {
      available: false,
      reason:
        unavailable.reason?.trim() ||
        "Worker marked this date as unavailable.",
    };
  }

  return {
    available: true,
    schedule,
  };
}

// ===============================
// GET AVAILABLE TIME SLOTS
// ===============================

export async function getAvailableTimeSlots(
  workerId: string,
  bookingDate: string,
  durationValue = 1,
  durationUnit: DurationUnit = "hour",
): Promise<string[]> {
  const id = validateRequiredText(workerId, "Worker ID");
  const date = validateDateString(bookingDate, "Booking date");
  const availability = await checkWorkerAvailability(id, date);

  if (availability.available === false) return [];

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("booking_date,booking_time,scheduled_start_at,scheduled_end_at")
    .eq("worker_id", id)
    .in("status", [...BOOKING_ACTIVE_STATUSES]);

  if (error) throw error;

  const allSlots = buildTimeSlots(
    availability.schedule.start_time,
    availability.schedule.end_time,
  );
  const scheduleEndMinutes = timeToMinutes(availability.schedule.end_time);

  return allSlots.filter((slot) => {
    const candidate = createManilaScheduleRange(date, slot, durationValue, durationUnit);

    if (durationUnit === "hour") {
      const candidateEndMinutes = timeToMinutes(slot) + durationValue * 60;
      if (candidateEndMinutes > scheduleEndMinutes) return false;
    }

    return !((bookings ?? []) as BookingTimeRecord[]).some((booking) => {
      let existingStart: Date;
      let existingEnd: Date;

      if (booking.scheduled_start_at && booking.scheduled_end_at) {
        existingStart = new Date(booking.scheduled_start_at);
        existingEnd = new Date(booking.scheduled_end_at);
      } else if (booking.booking_date && booking.booking_time) {
        const legacy = createManilaScheduleRange(booking.booking_date, booking.booking_time, 1, "hour");
        existingStart = legacy.start;
        existingEnd = legacy.end;
      } else {
        return false;
      }

      return rangesOverlap(candidate.start, candidate.end, existingStart, existingEnd);
    });
  });
}

// ===============================
// GET FULLY BOOKED DATES
// ===============================

export async function getFullyBookedDates(
  workerId: string,
): Promise<string[]> {
  const id = validateRequiredText(workerId, "Worker ID");

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date, booking_time")
    .eq("worker_id", id)
    .in("status", [...BOOKING_ACTIVE_STATUSES]);

  if (error) {
    throw error;
  }

  const bookings = (data ?? []) as BookingTimeRecord[];
  const bookingDates = [
    ...new Set(
      bookings
        .map((booking) => booking.booking_date)
        .filter((date): date is string => Boolean(date)),
    ),
  ];

  const results = await Promise.all(
    bookingDates.map(async (date) => {
      const availableSlots = await getAvailableTimeSlots(id, date);
      return availableSlots.length === 0 ? date : null;
    }),
  );

  return results.filter((date): date is string => date !== null);
}

// ===============================
// CREATE SCHEDULE
// ===============================

export async function createSchedule(
  schedule: CreateSchedulePayload,
): Promise<CreatedScheduleRecord> {
  const payload: CreateSchedulePayload = {
    booking_id: validatePositiveInteger(
      schedule.booking_id,
      "Booking ID",
    ),
    worker_id: validateRequiredText(schedule.worker_id, "Worker ID"),
    customer_id: validateRequiredText(
      schedule.customer_id,
      "Customer ID",
    ),
    schedule_date: validateDateString(
      schedule.schedule_date,
      "Schedule date",
    ),
    schedule_time: validateTimeString(
      schedule.schedule_time,
      "Schedule time",
    ),
    address: validateRequiredText(schedule.address, "Address"),
    status: validateRequiredText(schedule.status, "Status"),
  };

  const availability = await checkWorkerAvailability(
    payload.worker_id,
    payload.schedule_date,
  );

  if (availability.available === false) {
    throw new Error(availability.reason);
  }

  const availableSlots = await getAvailableTimeSlots(
    payload.worker_id,
    payload.schedule_date,
  );

  if (!availableSlots.includes(payload.schedule_time)) {
    throw new Error(
      "The selected schedule time is no longer available.",
    );
  }

  const { data, error } = await supabase
    .from("worker_schedules")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Unable to create schedule.");
  }

  await Promise.all([
    notifySafely(
      payload.customer_id,
      payload.booking_id,
      "Schedule Created",
      `Your booking has been scheduled on ${payload.schedule_date} at ${payload.schedule_time}.`,
    ),
    notifySafely(
      payload.worker_id,
      payload.booking_id,
      "New Schedule",
      `A schedule has been created for your booking on ${payload.schedule_date} at ${payload.schedule_time}.`,
    ),
    notifyAdminsSafely(
      payload.booking_id,
      "New Schedule Created",
      "A booking schedule has been created.",
    ),
  ]);

  return data as CreatedScheduleRecord;
}