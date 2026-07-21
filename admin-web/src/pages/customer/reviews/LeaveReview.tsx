import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";

import { supabase } from "../../../lib/supabase";

import { getBooking } from "../../../services/bookingService";
import { createReview } from "../../../services/reviewService";

import { Star } from "lucide-react";

export default function LeaveReview() {
  const { bookingId } = useParams();

  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!bookingId) return;

    try {
      console.log("Submit clicked");

      setLoading(true);

      const booking = await getBooking(bookingId);

      console.log("Booking:", booking);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("User:", user);

      if (!user) {
        alert("Please login.");
        return;
      }

      console.log({
        bookingId,
        workerId: booking.worker_id,
        customerId: user.id,
        overallRating: rating,
        qualityRating: rating,
        professionalismRating: rating,
        communicationRating: rating,
        comment,
      });

      const result = await createReview(
        Number(bookingId),
        booking.worker_id,
        user.id,
        rating, // overallRating
        rating, // qualityRating
        rating, // professionalismRating
        rating, // communicationRating
        comment,
      );

      console.log("Review created:", result);

      alert("Review submitted successfully!");

      navigate(`/customer/bookings/${bookingId}`);
    } catch (error) {
      console.error("Review Error:", error);

      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert(JSON.stringify(error));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold mb-8">Leave a Review</h1>

        <div>
          <p className="font-semibold mb-3">Rating</p>

          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star
                  size={40}
                  className={
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              </button>
            ))}
          </div>

          <label className="font-semibold block mb-3">Comment</label>

          <textarea
            rows={6}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..."
            className="border rounded-xl w-full p-4"
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}
