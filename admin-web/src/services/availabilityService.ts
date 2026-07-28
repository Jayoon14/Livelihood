import { supabase } from "../lib/supabase";

export interface UnavailableDateRecord {
  unavailable_date: string;
}

function wrapError(error: unknown, fallback: string): Error {
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

  return new Error(fallback);
}

function requireWorkerId(workerId: string): string {
  const value = workerId.trim();

  if (!value) {
    throw new Error("Worker ID is required.");
  }

  return value;
}

export async function getUnavailableDates(
  workerId: string,
): Promise<string[]> {
  const id = requireWorkerId(workerId);

  const { data, error } = await supabase
    .from("unavailable_dates")
    .select("unavailable_date")
    .eq("worker_id", id)
    .order("unavailable_date", { ascending: true });

  if (error) {
    throw wrapError(error, "Unable to load unavailable dates.");
  }

  return ((data ?? []) as UnavailableDateRecord[]).map(
    ({ unavailable_date }) => unavailable_date,
  );
}