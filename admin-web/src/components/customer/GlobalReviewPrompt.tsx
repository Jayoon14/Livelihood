import { useCallback, useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { createReview } from "../../services/reviewService";
import { addTrustedWorker } from "../../services/trustedWorkerService";

type Relation<T> = T | T[] | null;

type EligibleBookingRow = {
  id: number;
  worker_id: string;
  worker: Relation<{
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
  }>;
  services: Relation<{ service_name: string | null }>;
  reviews: Array<{ id: number; customer_id: string }> | null;
};

type ReviewBooking = {
  id: number;
  worker_id: string;
  workerName: string;
  serviceName: string;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function GlobalReviewPrompt() {
  const [booking, setBooking] = useState<ReviewBooking | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkingRef = useRef(false);

  const checkForReview = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          worker_id,
          worker:profiles!bookings_worker_id_fkey(
            first_name,
            middle_name,
            last_name
          ),
          services!service_id(service_name),
          reviews!booking_id(id, customer_id)
        `)
        .eq("customer_id", user.id)
        .eq("status", "Completed")
        .eq("payment_status", "Paid")
        .eq("customer_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const eligible = ((data ?? []) as EligibleBookingRow[]).find((row) => {
        const alreadyReviewed = (row.reviews ?? []).some(
          (review) => review.customer_id === user.id,
        );
        return (
          !alreadyReviewed &&
          sessionStorage.getItem(`review-prompt-shown-${row.id}`) !== "1"
        );
      });

      if (!eligible) return;

      const worker = one(eligible.worker);
      const service = one(eligible.services);
      const workerName = [
        worker?.first_name,
        worker?.middle_name,
        worker?.last_name,
      ]
        .filter(Boolean)
        .join(" ");

      sessionStorage.setItem(`review-prompt-shown-${eligible.id}`, "1");
      setBooking({
        id: eligible.id,
        worker_id: eligible.worker_id,
        workerName: workerName || "Worker",
        serviceName: service?.service_name || "Service",
      });
      toast.success("Payment accepted by the worker. You can now leave a review.");
    } catch (error) {
      console.error("Global review eligibility check failed:", error);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkForReview();
    }, 0);

    const channel = supabase
      .channel(`customer-global-review-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        () => void checkForReview(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reviews" },
        () => void checkForReview(),
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [checkForReview]);

  function close() {
    if (submitting) return;
    setBooking(null);
  }

  async function submit() {
    if (!booking || submitting) return;
    if (
      overallRating < 1 ||
      qualityRating < 1 ||
      professionalismRating < 1 ||
      communicationRating < 1
    ) {
      toast.warning("Please select a rating for every category.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("You must be signed in to submit a review.");

      await createReview(
        booking.id,
        booking.worker_id,
        user.id,
        overallRating,
        qualityRating,
        professionalismRating,
        communicationRating,
        comment,
      );
      await addTrustedWorker(user.id, booking.worker_id, booking.id);

      toast.success("Review submitted successfully.");
      setBooking(null);
    } catch (error) {
      console.error("Global review submission failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!booking) return null;

  const categories = [
    ["Overall Rating", overallRating, setOverallRating],
    ["Quality of Work", qualityRating, setQualityRating],
    ["Professionalism", professionalismRating, setProfessionalismRating],
    ["Communication", communicationRating, setCommunicationRating],
  ] as const;

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between bg-amber-400 px-6 py-6 text-white sm:px-8">
          <div>
            <h2 className="text-3xl font-bold">Leave Review</h2>
            <p className="mt-1 text-base font-medium text-white/95">
              Your payment was accepted. Share your experience with this worker.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            aria-label="Close review modal"
            className="rounded-full p-2 transition hover:bg-white/20 disabled:opacity-60"
          >
            <X size={28} />
          </button>
        </div>

        <div className="space-y-7 p-6 sm:p-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Reviewing</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{booking.workerName}</p>
            <p className="text-sm text-slate-600">{booking.serviceName}</p>
          </div>

          {categories.map(([label, value, setter]) => (
            <div key={label}>
              <p className="mb-3 font-semibold text-slate-900">{label}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setter(star)}
                    disabled={submitting}
                    aria-label={`${label}: ${star} star${star === 1 ? "" : "s"}`}
                    className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                  >
                    <Star
                      size={34}
                      className={
                        star <= value
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-700"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label htmlFor="global-review-comment" className="mb-3 block font-semibold text-slate-900">
              Comment
            </label>
            <textarea
              id="global-review-comment"
              rows={6}
              maxLength={2000}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={submitting}
              placeholder="Tell us about your experience..."
              className="w-full resize-y rounded-2xl border border-slate-300 px-4 py-4 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100"
            />
            <p className="mt-2 text-right text-xs text-slate-500">{comment.length}/2000</p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-7 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="rounded-xl bg-amber-400 px-8 py-3 font-semibold text-white transition hover:bg-amber-500 disabled:bg-slate-400"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
