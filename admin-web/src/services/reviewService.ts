import { supabase } from "../lib/supabase";
import { createNotification } from "./notificationService";

export interface Review {
  id: number;
  booking_id: number;
  worker_id: string;
  customer_id: string;
  overall_rating: number;
  quality_rating: number;
  professionalism_rating: number;
  communication_rating: number;
  review: string;
  rating: number;
  created_at?: string;
}
export interface ReviewProfile {
  id?: string;
  first_name: string | null;
  middle_name?: string | null;
  last_name: string | null;
  profile_picture?: string | null;
  phone?: string | null;
  email?: string | null;
}
export interface WorkerReview extends Review {
  customer: ReviewProfile | null;
}
export interface CustomerBookingReview {
  id: number;
  booking_date?: string;
  status: string;
  worker: ReviewProfile | null;
}
const wrap = (e: unknown, f: string) => (e instanceof Error ? e : new Error(f));
const text = (v: string, n: string) => {
  const s = v.trim();
  if (!s) throw new Error(`${n} is required.`);
  return s;
};
const rate = (v: number, n: string) => {
  if (v < 1 || v > 5) throw new Error(`${n} must be between 1 and 5.`);
  return v;
};
async function adminIds(): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("role", "admin");
  return (data ?? []).map((a: { id: string }) => a.id);
}
export async function hasReviewed(
  bookingId: number,
  customerId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error && error.code !== "PGRST116")
    throw wrap(error, "Unable to verify review.");
  return !!data;
}
export async function createReview(
  bookingId: number,
  workerId: string,
  customerId: string,
  overallRating: number,
  qualityRating: number,
  professionalismRating: number,
  communicationRating: number,
  comment: string,
): Promise<Review> {
  if (await hasReviewed(bookingId, customerId))
    throw new Error("This booking has already been reviewed.");
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("status,customer_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError) throw wrap(bookingError, "Unable to verify booking.");
  if (!booking) throw new Error("Booking not found.");
  if (booking.customer_id !== customerId)
    throw new Error("Only the booking customer can submit a review.");
  if (booking.status !== "Completed")
    throw new Error("Only completed bookings can be reviewed.");
  const payload = {
    booking_id: bookingId,
    worker_id: text(workerId, "Worker ID"),
    customer_id: text(customerId, "Customer ID"),
    overall_rating: rate(overallRating, "Overall rating"),
    quality_rating: rate(qualityRating, "Quality rating"),
    professionalism_rating: rate(
      professionalismRating,
      "Professionalism rating",
    ),
    communication_rating: rate(communicationRating, "Communication rating"),
    review: comment.trim(),
    rating: overallRating,
  };
  const { data, error } = await supabase
    .from("reviews")
    .insert(payload)
    .select()
    .single();
  if (error) throw wrap(error, "Unable to create review.");
  await createNotification(
    workerId,
    bookingId,
    "New Review",
    "A customer has submitted a review on your profile.",
  );
  const admins = await adminIds();
  await Promise.allSettled(
    admins.map((id) =>
      createNotification(
        id,
        bookingId,
        "New Customer Review",
        "A customer has submitted a review for a completed booking.",
      ),
    ),
  );
  return data as Review;
}
export async function getMyReviews(
  customerId: string,
): Promise<CustomerBookingReview[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*,worker:profiles!worker_id(id,first_name,middle_name,last_name,phone,email)`,
    )
    .eq("customer_id", text(customerId, "Customer ID"))
    .eq("status", "Completed")
    .order("booking_date", { ascending: false });
  if (error) throw wrap(error, "Unable to load reviews.");
  return (data ?? []).map((b: any) => ({
    ...b,
    worker: Array.isArray(b.worker) ? (b.worker[0] ?? null) : b.worker,
  }));
}
export async function getWorkerReviews(
  workerId: string,
): Promise<WorkerReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `*,customer:profiles!reviews_customer_id_fkey(id,first_name,middle_name,last_name,profile_picture)`,
    )
    .eq("worker_id", text(workerId, "Worker ID"))
    .order("created_at", { ascending: false });
  if (error) throw wrap(error, "Unable to load worker reviews.");
  return (data ?? []).map((r: any) => ({
    ...r,
    customer: Array.isArray(r.customer) ? (r.customer[0] ?? null) : r.customer,
  }));
}
export async function getAverageRating(workerId: string): Promise<number> {
  const { data, error } = await supabase
    .from("reviews")
    .select("overall_rating")
    .eq("worker_id", text(workerId, "Worker ID"));
  if (error) throw wrap(error, "Unable to compute average rating.");
  if (!data?.length) return 0;
  const total = data.reduce(
    (s: number, i: { overall_rating: number }) => s + Number(i.overall_rating),
    0,
  );
  return Number((total / data.length).toFixed(1));
}
export async function getWorkerAverageRating(
  workerId: string,
): Promise<number> {
  return getAverageRating(workerId);
}
