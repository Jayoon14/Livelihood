import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import RatingStars from "../../../components/RatingStars";

import { supabase } from "../../../lib/supabase";

import {
  getBookingDetails,
  cancelBooking,
} from "../../../services/customerBookingService";

import {
  submitReview,
  hasReviewed,
} from "../../../services/reviewService";

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const [alreadyReviewed, setAlreadyReviewed] =
    useState(false);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  async function loadBooking() {
    setLoading(true);

    const data = await getBookingDetails(id!);

    setBooking(data);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && data) {
      const reviewed = await hasReviewed(
        data.id,
        user.id
      );

      setAlreadyReviewed(reviewed);
    }

    setLoading(false);
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    try {
      await cancelBooking(id!);

      alert("Booking cancelled successfully.");

      await loadBooking();
    } catch (error) {
      console.error(error);

      alert("Unable to cancel booking.");
    }
  }

  async function handleReview() {
    if (rating === 0) {
      alert("Please rate the worker.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    try {
      await submitReview(
        booking.id,
        booking.worker_id,
        user.id,
        rating,
        review
      );

      alert("Thank you for your review.");

      setRating(0);
      setReview("");
      setAlreadyReviewed(true);
    } catch (error) {
      console.error(error);

      alert("Unable to submit review.");
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">
          Loading...
        </div>
      </CustomerLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">
          Booking not found.
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">
          Booking Details
        </h1>

        {/* Worker Information */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-5">
            Worker Information
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-gray-500">
                Worker
              </p>

              <h3 className="font-semibold">
                {booking.worker?.first_name}{" "}
                {booking.worker?.last_name}
              </h3>
            </div>

            <div>
              <p className="text-gray-500">
                Phone
              </p>

              <h3 className="font-semibold">
                {booking.worker?.phone || "-"}
              </h3>
            </div>
          </div>
        </div>

        {/* Booking Information */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-5">
            Booking Information
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-500">
                Booking Date
              </p>

              <h3 className="font-semibold">
                {booking.booking_date}
              </h3>
            </div>

            <div>
              <p className="text-gray-500">
                Booking Time
              </p>

              <h3 className="font-semibold">
                {booking.booking_time}
              </h3>
            </div>

            <div className="md:col-span-2">
              <p className="text-gray-500">
                Address
              </p>

              <h3 className="font-semibold">
                {booking.address}
              </h3>
            </div>

            <div className="md:col-span-2">
              <p className="text-gray-500">
                Notes
              </p>

              <div className="border rounded-xl p-4 mt-2">
                {booking.notes || "No notes."}
              </div>
            </div>

            <div>
              <p className="text-gray-500 mb-2">
                Status
              </p>

              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  booking.status === "Pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : booking.status === "Approved"
                    ? "bg-blue-100 text-blue-700"
                    : booking.status === "Completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {booking.status}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 mt-10">
            <button
              onClick={() => navigate(-1)}
              className="border px-6 py-3 rounded-xl hover:bg-gray-100"
            >
              Back
            </button>

            {booking.status === "Pending" && (
              <button
                onClick={handleCancel}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl"
              >
                Cancel Booking
              </button>
            )}

            {booking.status === "Approved" && (
              <Link
                to={`/chat/${booking.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl"
              >
                Chat Worker
              </Link>
            )}

            {booking.status === "Completed" && (
              <button
                onClick={() =>
                  navigate(
                    `/customer/payment/${booking.id}`
                  )
                }
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
              >
                Pay Now
              </button>
            )}
          </div>

          {/* Review Section */}
          {booking.status === "Completed" && (
            <div className="bg-white rounded-xl shadow p-6 mt-8">
              <h2 className="text-2xl font-bold mb-5">
                Rate this Worker
              </h2>

              {alreadyReviewed ? (
                <div className="bg-green-100 text-green-700 p-5 rounded-xl">
                  ✅ You have already submitted a
                  review for this booking.
                </div>
              ) : (
                <>
                  <RatingStars
                    rating={rating}
                    setRating={setRating}
                  />

                  <textarea
                    rows={4}
                    value={review}
                    onChange={(e) =>
                      setReview(e.target.value)
                    }
                    placeholder="Write your experience..."
                    className="border rounded-lg w-full p-4 mt-5"
                  />

                  <button
                    onClick={handleReview}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl mt-5"
                  >
                    Submit Review
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}