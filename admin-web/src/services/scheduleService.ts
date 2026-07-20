import { supabase } from "../lib/supabase";

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

export async function saveWorkerSchedule(
  workerId: string,
  schedules: any[]
) {
  // delete old schedule
  await supabase
    .from("worker_schedules")
    .delete()
    .eq("worker_id", workerId);

  const payload = schedules.map((item) => ({
    worker_id: workerId,
    day_of_week: item.day_of_week,
    start_time: item.start_time,
    end_time: item.end_time,
    is_available: item.is_available,
  }));

  const { error } = await supabase
    .from("worker_schedules")
    .insert(payload);

  if (error) throw error;
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
  reason: string
) {
  const { error } = await supabase
    .from("unavailable_dates")
    .insert({
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
  bookingDate: string
) {

  const dayName = new Date(bookingDate)
    .toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "Asia/Manila",
    });

  // Weekly Schedule
  const { data: schedule } = await supabase
    .from("worker_schedules")
    .select("*")
    .eq("worker_id", workerId)
    .eq("day_of_week", dayName)
    .single();

  if (!schedule || !schedule.is_available) {
    return {
      available: false,
      reason: "Worker is not available on this day.",
    };
  }

  // Vacation / Unavailable Date
  const { data: unavailable } = await supabase
    .from("unavailable_dates")
    .select("*")
    .eq("worker_id", workerId)
    .eq("unavailable_date", bookingDate)
    .maybeSingle();

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
  bookingDate: string
) {
  const availability = await checkWorkerAvailability(
    workerId,
    bookingDate
  );

  if (!availability.available) {
    return [];
  }

  const schedule = availability.schedule;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("booking_time")
    .eq("worker_id", workerId)
    .eq("booking_date", bookingDate)
    .in("status", [
      "Pending",
      "Approved",
      "On Going",
    ]);

  const bookedTimes =
    bookings?.map((b) => b.booking_time) ?? [];

  // Buffer settings
  const blockedTimes = new Set<string>();

  const BUFFER_HOURS = 1;

  // Block booked hour ± buffer
  bookedTimes.forEach((time) => {

    const hour =
      parseInt(time.split(":")[0]);

    for (
      let i = -BUFFER_HOURS;
      i <= BUFFER_HOURS;
      i++
    ) {

      const h = hour + i;

      if (h >= 0 && h <= 23) {

        blockedTimes.add(
          `${String(h).padStart(2, "0")}:00`
        );

      }

    }

  });

  const slots: string[] = [];

  let current =
    parseInt(schedule.start_time.split(":")[0]);

  const end =
    parseInt(schedule.end_time.split(":")[0]);

  while (current < end) {

    const slot =
      `${String(current).padStart(2, "0")}:00`;

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

export async function getFullyBookedDates(
  workerId: string
) {

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date, booking_time")
    .eq("worker_id", workerId)
    .in("status", [
      "Pending",
      "Approved",
      "On Going",
    ]);

  if (error) throw error;

  const grouped: Record<string, number> = {};

  data?.forEach((booking) => {

    grouped[booking.booking_date] =
      (grouped[booking.booking_date] ?? 0) + 1;

  });

  const fullyBooked: string[] = [];

  Object.keys(grouped).forEach((date) => {

    // Example:
    // worker works 8AM-5PM
    // 9 slots available

    if (grouped[date] >= 9) {

      fullyBooked.push(date);

    }

  });

  return fullyBooked;

}