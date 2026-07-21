import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

// ==============================
// WEEKLY SCHEDULE
// ==============================

export async function getWorkerSchedule(workerId: string) {
  const { data, error } = await supabase
    .from("worker_schedules")
    .select("*")
    .eq("worker_id", workerId)
    .order("id");

  if (error) throw error;

  return data ?? [];
}

export async function saveWorkerSchedule(workerId: string, schedules: any[]) {
  if (!workerId) {
    throw new Error("Worker ID is missing.");
  }

  const payload = schedules.map((item) => ({
    worker_id: workerId,
    day_of_week: String(item.day_of_week).trim(),
    start_time: item.start_time,
    end_time: item.end_time,
    is_available: Boolean(item.is_available),
  }));

  const { data, error } = await supabase
    .from("worker_schedules")
    .upsert(payload, {
      onConflict: "worker_id,day_of_week",
    })
    .select();

  if (error) {
    console.error("SAVE WORKER SCHEDULE ERROR:", error);
    throw error;
  }

  return data ?? [];
}

// ==============================
// UNAVAILABLE DATES
// ==============================

export async function getUnavailableDates(workerId: string) {
  const { data, error } = await supabase
    .from("unavailable_dates")
    .select("*")
    .eq("worker_id", workerId)
    .order("unavailable_date");

  if (error) throw error;

  return data ?? [];
}

export async function addUnavailableDate(
  workerId: string,
  unavailable_date: string,
  reason: string,
) {
  const { error } = await supabase.from("unavailable_dates").insert({
    worker_id: workerId,
    unavailable_date,
    reason,
  });

  if (error) throw error;
}

export async function deleteUnavailableDate(id: number) {
  const { error } = await supabase
    .from("unavailable_dates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ===============================
// CHECK WORKER AVAILABILITY
// ===============================

export async function checkWorkerAvailability(
  workerId: string,
  bookingDate: string,
) {
  const dayName = new Date(bookingDate).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Manila",
  });

  console.log("Booking Date:", bookingDate);
  console.log("Day Name:", dayName);

  // ===============================
  // WEEKLY SCHEDULE
  // ===============================

  const { data: schedule, error: scheduleError } = await supabase
    .from("worker_schedules")
    .select("*")
    .eq("worker_id", workerId)
    .eq("day_of_week", dayName)
    .maybeSingle();

  if (scheduleError) {
    console.error("GET SCHEDULE ERROR:", scheduleError);

    throw scheduleError;
  }

  console.log("MATCHED SCHEDULE:", schedule);

  if (!schedule || !schedule.is_available) {
    return {
      available: false,
      reason: "Worker is not available on this day.",
    };
  }

  // ===============================
  // UNAVAILABLE DATE
  // ===============================

  const { data: unavailable, error: unavailableError } = await supabase
    .from("unavailable_dates")
    .select("*")
    .eq("worker_id", workerId)
    .eq("unavailable_date", bookingDate)
    .maybeSingle();

  if (unavailableError) {
    throw unavailableError;
  }

  if (unavailable) {
    return {
      available: false,
      reason: unavailable.reason,
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
) {
  const availability = await checkWorkerAvailability(workerId, bookingDate);

  if (!availability.available) {
    return [];
  }

  const schedule = availability.schedule;

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("booking_time")
    .eq("worker_id", workerId)
    .eq("booking_date", bookingDate)
    .in("status", ["Pending", "Approved", "On Going"]);

  if (error) {
    throw error;
  }

  const bookedTimes = bookings?.map((b) => b.booking_time) ?? [];

  const blockedTimes = new Set<string>();

  const BUFFER_HOURS = 1;

  bookedTimes.forEach((time) => {
    const hour = parseInt(time.split(":")[0]);

    for (let i = -BUFFER_HOURS; i <= BUFFER_HOURS; i++) {
      const h = hour + i;

      if (h >= 0 && h <= 23) {
        blockedTimes.add(`${String(h).padStart(2, "0")}:00`);
      }
    }
  });

  const slots: string[] = [];

  let current = parseInt(schedule.start_time.split(":")[0]);

  const end = parseInt(schedule.end_time.split(":")[0]);

  while (current < end) {
    const slot = `${String(current).padStart(2, "0")}:00`;

    if (!blockedTimes.has(slot)) {
      slots.push(slot);
    }

    current++;
  }

  return slots;
}

// ===============================
// GET FULLY BOOKED DATES
// ===============================

export async function getFullyBookedDates(workerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date, booking_time")
    .eq("worker_id", workerId)
    .in("status", ["Pending", "Approved", "On Going"]);

  if (error) {
    throw error;
  }

  const grouped: Record<string, number> = {};

  data?.forEach((booking) => {
    grouped[booking.booking_date] = (grouped[booking.booking_date] ?? 0) + 1;
  });

  const fullyBooked: string[] = [];

  for (const date of Object.keys(grouped)) {
    const availability = await checkWorkerAvailability(workerId, date);

    if (!availability.available) {
      continue;
    }

    const schedule = availability.schedule;

    const start = parseInt(schedule.start_time.split(":")[0]);

    const end = parseInt(schedule.end_time.split(":")[0]);

    const totalSlots = end - start;

    if (grouped[date] >= totalSlots) {
      fullyBooked.push(date);
    }
  }

  return fullyBooked;
}

// ===============================
// CREATE SCHEDULE
// ===============================

export async function createSchedule(schedule: {
  booking_id: number;
  worker_id: string;
  customer_id: string;
  schedule_date: string;
  schedule_time: string;
  address: string;
  status: string;
}) {
  const { data, error } = await supabase
    .from("schedules")
    .insert(schedule)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // ===============================
  // NOTIFY CUSTOMER
  // ===============================

  await createNotification(
    schedule.customer_id,
    schedule.booking_id,
    "Schedule Created",
    `Your booking has been scheduled on ${schedule.schedule_date} at ${schedule.schedule_time}.`,
  );

  // ===============================
  // NOTIFY WORKER
  // ===============================

  await createNotification(
    schedule.worker_id,
    schedule.booking_id,
    "New Schedule",
    `A schedule has been created for your booking on ${schedule.schedule_date} at ${schedule.schedule_time}.`,
  );

  // ===============================
  // NOTIFY ADMINS
  // ===============================

  const { data: admins, error: adminError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");

  if (adminError) {
    console.error("ADMIN NOTIFICATION ERROR:", adminError);
  }

  if (admins) {
    for (const admin of admins) {
      await createNotification(
        admin.id,
        schedule.booking_id,
        "New Schedule Created",
        "A booking schedule has been created.",
      );
    }
  }

  return data;
}
