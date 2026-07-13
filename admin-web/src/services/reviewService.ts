import { supabase } from "../lib/supabase";


// =====================
// SUBMIT REVIEW
// =====================

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


// =====================
// CREATE REVIEW
// =====================

export async function createReview(
  bookingId: number,
  workerId: string,
  customerId: string,
  rating: number,
  review: string
) {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: bookingId,
      worker_id: workerId,
      customer_id: customerId,
      rating,
      review,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// =====================
// GET MY REVIEWS
// =====================

export async function getMyReviews(
  customerId: string
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      worker:profiles!worker_id(
        id,
        first_name,
        middle_name,
        last_name,
        phone,
        email
      )
    `)
    .eq(
      "customer_id",
      customerId
    )
    .eq(
      "status",
      "Completed"
    )
    .order("booking_date", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}


// =====================
// GET WORKER REVIEWS
// =====================

export async function getWorkerReviews(
  workerId: string
) {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      customer:profiles!reviews_customer_id_fkey(
        first_name,
        middle_name,
        last_name,
        profile_image
      )
    `)
    .eq(
      "worker_id",
      workerId
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}
// =====================
// GET AVERAGE RATING
// =====================

export async function getAverageRating(
  workerId: string
) {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq(
      "worker_id",
      workerId
    );

  if (error) {
    console.error(error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const total = data.reduce(
    (sum, item) =>
      sum + item.rating,
    0
  );

  return Number(
    (total / data.length).toFixed(1)
  );
}


// =====================
// GET WORKER AVERAGE RATING
// =====================

export async function getWorkerAverageRating(
  workerId: string
) {
  return getAverageRating(workerId);
}


// =====================
// CHECK IF REVIEWED
// =====================

export async function hasReviewed(
  bookingId: number,
  customerId: string
) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq(
      "booking_id",
      bookingId
    )
    .eq(
      "customer_id",
      customerId
    )
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return !!data;
}