import { supabase } from "../lib/supabase";

export async function submitReview(
  bookingId: number,
  workerId: string,
  customerId: string,
  rating: number,
  review: string
) {
  const { error } = await supabase
    .from("reviews")
    .insert({
      booking_id: bookingId,
      worker_id: workerId,
      customer_id: customerId,
      rating,
      review,
    });

  if (error) {
    throw error;
  }
}

export async function getMyReviews(customerId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .eq("customer_id", customerId)
    .eq("status", "Completed")
    .order("booking_date", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export async function getWorkerReviews(workerId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      customer:profiles!customer_id(
        first_name,
        last_name
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export async function getAverageRating(workerId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("worker_id", workerId);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const total = data.reduce((sum, item) => sum + item.rating, 0);

  return Number((total / data.length).toFixed(1));
}

// ✅ Alias for backward compatibility
export const getWorkerAverageRating = getAverageRating;