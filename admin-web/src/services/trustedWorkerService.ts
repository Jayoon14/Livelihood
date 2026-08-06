import { supabase } from "../lib/supabase";

export interface TrustedWorkerRecord {
  id: number;
  customer_id: string;
  worker_id: string;
  first_booking_id: number | null;
  latest_booking_id: number | null;
  hire_count: number;
  created_at: string;
  updated_at: string;
}

export interface TrustedWorkerProfile {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profile_picture: string | null;
  last_seen?: string | null;
}

export interface TrustedWorkerWithProfile extends TrustedWorkerRecord {
  worker: TrustedWorkerProfile | null;
}

export interface TrustedWorkerStats {
  totalTrustedWorkers: number;
  totalHires: number;
}

interface TrustedWorkerQueryRow
  extends TrustedWorkerRecord {
  worker:
    | TrustedWorkerProfile
    | TrustedWorkerProfile[]
    | null;
}

/**
 * Check kung trusted na ang worker ng current customer.
 */
export async function isTrustedWorker(
  customerId: string,
  workerId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("trusted_workers")
    .select("id")
    .eq("customer_id", customerId)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

/**
 * Idagdag ang worker sa trusted list.
 *
 * Kapag existing na ang record, ia-update nito ang latest booking
 * at hire count sa halip na gumawa ng duplicate row.
 */
export async function addTrustedWorker(
  customerId: string,
  workerId: string,
  bookingId: number,
): Promise<TrustedWorkerRecord> {
  if (!customerId.trim()) {
    throw new Error("Customer ID is required.");
  }

  if (!workerId.trim()) {
    throw new Error("Worker ID is required.");
  }

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new Error("Invalid booking ID.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("trusted_workers")
    .select("*")
    .eq("customer_id", customerId)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const currentHireCount = Number(existing.hire_count ?? 0);

    const { data, error } = await supabase
      .from("trusted_workers")
      .update({
        latest_booking_id: bookingId,
        hire_count: currentHireCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as TrustedWorkerRecord;
  }

  const { data, error } = await supabase
    .from("trusted_workers")
    .insert({
      customer_id: customerId,
      worker_id: workerId,
      first_booking_id: bookingId,
      latest_booking_id: bookingId,
      hire_count: 1,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as TrustedWorkerRecord;
}

/**
 * Dagdagan ang hire count ng existing trusted worker.
 */
export async function incrementHireCount(
  customerId: string,
  workerId: string,
  latestBookingId: number,
): Promise<TrustedWorkerRecord> {
  const { data: existing, error: existingError } = await supabase
    .from("trusted_workers")
    .select("*")
    .eq("customer_id", customerId)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existing) {
    return addTrustedWorker(customerId, workerId, latestBookingId);
  }

  const { data, error } = await supabase
    .from("trusted_workers")
    .update({
      latest_booking_id: latestBookingId,
      hire_count: Number(existing.hire_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as TrustedWorkerRecord;
}

/**
 * Kunin lahat ng trusted workers ng customer kasama ang profile details.
 */
export async function getTrustedWorkers(
  customerId: string,
): Promise<TrustedWorkerWithProfile[]> {
  const { data, error } = await supabase
    .from("trusted_workers")
    .select(
      `
        id,
        customer_id,
        worker_id,
        first_booking_id,
        latest_booking_id,
        hire_count,
        created_at,
        updated_at,
        worker:profiles!trusted_workers_worker_id_fkey(
          id,
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          profile_picture,
          last_seen
        )
      `,
    )
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as TrustedWorkerQueryRow[]
  ).map(
    (item): TrustedWorkerWithProfile => ({
      ...item,
      worker: Array.isArray(item.worker)
        ? item.worker[0] ?? null
        : item.worker,
    }),
  );
}

/**
 * Alisin ang worker mula sa trusted list.
 */
export async function removeTrustedWorker(
  customerId: string,
  workerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("trusted_workers")
    .delete()
    .eq("customer_id", customerId)
    .eq("worker_id", workerId);

  if (error) {
    throw error;
  }
}

/**
 * Kunin ang summary statistics ng trusted workers.
 */
export async function getTrustedWorkerStats(
  customerId: string,
): Promise<TrustedWorkerStats> {
  const { data, error } = await supabase
    .from("trusted_workers")
    .select("hire_count")
    .eq("customer_id", customerId);

  if (error) {
    throw error;
  }

  const records = data ?? [];

  return {
    totalTrustedWorkers: records.length,
    totalHires: records.reduce(
      (total, record) => total + Number(record.hire_count ?? 0),
      0,
    ),
  };
}