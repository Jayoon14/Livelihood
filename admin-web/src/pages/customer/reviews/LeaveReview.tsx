import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { getBooking } from "../../../services/bookingService";
import { createReview, hasReviewed } from "../../../services/reviewService";

type RatingField =
  | "overall"
  | "quality"
  | "professionalism"
  | "communication";

type ReviewBooking = {
  id: number;
  customer_id: string;
  worker_id: string;
  status: string;
  payment_status?: string | null;
  reviewed?: boolean | null;
  worker?: {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
  } | null;
  services?: { service_name?: string | null } | null;
};

const ratingLabels: Array<{ key: RatingField; label: string }> = [
  { key: "overall", label: "Overall Rating" },
  { key: "quality", label: "Quality of Work" },
  { key: "professionalism", label: "Professionalism" },
  { key: "communication", label: "Communication" },
];

export default function LeaveReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<ReviewBooking | null>(null);
  const [ratings, setRatings] = useState<Record<RatingField, number>>({
    overall: 0,
    quality: 0,
    professionalism: 0,
    communication: 0,
  });
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const parsedBookingId = useMemo(() => {
    const value = Number(bookingId);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [bookingId]);

  useEffect(() => {
    let cancelled = false;

    async function loadReviewBooking(): Promise<void> {
      if (!parsedBookingId) {
        setErrorMessage("Invalid booking ID.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Please sign in to leave a review.");

        const bookingData = (await getBooking(String(parsedBookingId))) as ReviewBooking;

        if (bookingData.customer_id !== user.id) {
          throw new Error("You are not allowed to review this booking.");
        }

        if (bookingData.status !== "Completed") {
          throw new Error("The service must be completed before a review can be submitted.");
        }

        if (bookingData.payment_status !== "Paid") {
          navigate(`/customer/payment/${parsedBookingId}`, { replace: true });
          toast.info("Complete the payment before leaving a review.");
          return;
        }

        const alreadyReviewed = await hasReviewed(parsedBookingId, user.id);
        if (alreadyReviewed) {
          toast.info("You already reviewed this booking.");
          navigate("/customer/bookings", { replace: true });
          return;
        }

        if (!cancelled) setBooking(bookingData);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load the review page.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReviewBooking();
    return () => {
      cancelled = true;
    };
  }, [navigate, parsedBookingId]);

  function setRating(field: RatingField, value: number): void {
    setRatings((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!booking || !parsedBookingId || submitting) return;

    if (Object.values(ratings).some((rating) => rating < 1 || rating > 5)) {
      toast.warning("Please select all four ratings.");
      return;
    }

    if (comment.trim().length < 5) {
      toast.warning("Please write a comment with at least 5 characters.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const alreadyReviewed = await hasReviewed(parsedBookingId, user.id);
      if (alreadyReviewed) {
        toast.info("You already reviewed this booking.");
        navigate("/customer/bookings", { replace: true });
        return;
      }

      await createReview(
        parsedBookingId,
        booking.worker_id,
        user.id,
        ratings.overall,
        ratings.quality,
        ratings.professionalism,
        ratings.communication,
        comment.trim(),
      );

      toast.success("Review submitted successfully!");
      navigate("/customer/bookings", { replace: true });
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error(error instanceof Error ? error.message : "Unable to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-500" />
            <p className="mt-3 font-semibold text-slate-600">Loading review form...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (errorMessage || !booking) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-slate-950">Review unavailable</h1>
            <p className="mt-3 text-slate-600">{errorMessage || "Booking not found."}</p>
            <button
              type="button"
              onClick={() => navigate("/customer/bookings")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              <ArrowLeft size={18} /> Back to Bookings
            </button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="min-h-[calc(100vh-5rem)] bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
          <header className="bg-amber-500 px-7 py-7 text-white sm:px-9">
            <button
              type="button"
              onClick={() => navigate("/customer/bookings")}
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
            >
              <ArrowLeft size={17} /> Back to Bookings
            </button>
            <h1 className="text-3xl font-black">Leave Review</h1>
            <p className="mt-1 text-white/95">Share your experience with this worker.</p>
          </header>

          <main className="space-y-7 p-7 sm:p-9">
            {ratingLabels.map(({ key, label }) => (
              <RatingRow
                key={key}
                label={label}
                value={ratings[key]}
                onChange={(value) => setRating(key, value)}
              />
            ))}

            <div>
              <label htmlFor="review-comment" className="font-bold text-slate-900">
                Comment
              </label>
              <textarea
                id="review-comment"
                rows={6}
                maxLength={1000}
                value={comment}
                disabled={submitting}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tell us about your experience..."
                className="mt-3 w-full resize-y rounded-2xl border border-slate-300 p-4 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:opacity-60"
              />
              <p className="mt-2 text-right text-xs text-slate-400">{comment.length}/1000</p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/customer/bookings")}
                disabled={submitting}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-8 py-3 font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={18} className="animate-spin" />}
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </main>
        </div>
      </div>
    </CustomerLayout>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset>
      <legend className="font-bold text-slate-900">{label}</legend>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange(star)}
            className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Star
              size={34}
              strokeWidth={1.7}
              className={
                star <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-800"
              }
            />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
