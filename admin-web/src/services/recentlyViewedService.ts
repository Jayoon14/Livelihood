import { supabase } from "../lib/supabase";

export interface RecentlyViewedWorker {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
  email: string | null;
  phone: string | null;
}

export interface RecentlyViewedRecord {
  viewed_at: string;
  worker: RecentlyViewedWorker | null;
}

interface ExistingRecentlyViewedRecord {
  id: number;
}

type RelatedWorker =
  | RecentlyViewedWorker
  | RecentlyViewedWorker[]
  | null
  | undefined;

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

function requireWorkerId(workerId: string): string {
  const normalizedWorkerId = workerId.trim();

  if (!normalizedWorkerId) {
    throw new Error("Worker ID is required.");
  }

  return normalizedWorkerId;
}

function validateLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    return 10;
  }

  return Math.min(limit, 50);
}

function normalizeWorker(value: RelatedWorker): RecentlyViewedWorker | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getAuthenticatedCustomerId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw wrapError(error, "Unable to verify the current account.");
  }

  return user?.id ?? null;
}

export async function saveRecentlyViewed(workerId: string): Promise<void> {
  const normalizedWorkerId = requireWorkerId(workerId);
  const customerId = await getAuthenticatedCustomerId();

  if (!customerId) {
    return;
  }

  if (customerId === normalizedWorkerId) {
    return;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("recently_viewed")
    .select("id")
    .eq("customer_id", customerId)
    .eq("worker_id", normalizedWorkerId)
    .maybeSingle();

  if (lookupError) {
    throw wrapError(lookupError, "Unable to check recently viewed workers.");
  }

  if (existing) {
    const record = existing as ExistingRecentlyViewedRecord;

    const { error: updateError } = await supabase
      .from("recently_viewed")
      .update({
        viewed_at: new Date().toISOString(),
      })
      .eq("id", record.id)
      .eq("customer_id", customerId);

    if (updateError) {
      throw wrapError(
        updateError,
        "Unable to update the recently viewed worker.",
      );
    }

    return;
  }

  const { error: insertError } = await supabase.from("recently_viewed").insert({
    customer_id: customerId,
    worker_id: normalizedWorkerId,
    viewed_at: new Date().toISOString(),
  });

  if (insertError) {
    throw wrapError(insertError, "Unable to save the recently viewed worker.");
  }
}

export async function getRecentlyViewed(
  limit = 10,
): Promise<RecentlyViewedRecord[]> {
  const customerId = await getAuthenticatedCustomerId();

  if (!customerId) {
    return [];
  }

  const normalizedLimit = validateLimit(limit);

  const { data, error } = await supabase
    .from("recently_viewed")
    .select(
      `
      viewed_at,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        profile_picture,
        email,
        phone
      )
    `,
    )
    .eq("customer_id", customerId)
    .order("viewed_at", { ascending: false })
    .limit(normalizedLimit);

  if (error) {
    throw wrapError(error, "Unable to load recently viewed workers.");
  }

  return (data ?? []).map((item) => {
    const record = item as unknown as {
      viewed_at: string;
      worker: RelatedWorker;
    };

    return {
      viewed_at: record.viewed_at,
      worker: normalizeWorker(record.worker),
    };
  });
}
