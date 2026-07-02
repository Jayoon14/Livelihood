import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { getWorkerDetails } from "../../../services/workerService";
import { createBooking } from "../../../services/bookingService";
import { supabase } from "../../../lib/supabase";
import {
  getWorkerReviews,
  getWorkerAverageRating,
} from "../../../services/reviewService";

export default function WorkerDetails() {
  const { id } = useParams();

  const [worker, setWorker] = useState<any>(null);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (id) {
      loadWorker();
    }
  }, [id]);

  async function loadWorker() {
    const data = await getWorkerDetails(id!);
    setWorker(data);

    const workerReviews = await getWorkerReviews(id!);
    const average = await getWorkerAverageRating(id!);

    setReviews(workerReviews);
    setAverageRating(average);
  }

  async function handleBooking() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login.");
      return;
    }

    await createBooking(
      user.id,
      worker.id,
      bookingDate,
      bookingTime,
      address,
      notes
    );

    alert("Booking submitted successfully!");

    setBookingDate("");
    setBookingTime("");
    setAddress("");
    setNotes("");
  }

  if (!worker) {
    return (
      <CustomerLayout>
        <div className="text-center py-20">
          Loading...
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-white rounded-2xl shadow p-8">

        <div className="flex gap-8">
          <div className="w-40 h-40 rounded-full bg-blue-100" />

          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {worker.full_name}
            </h1>

            <p className="text-gray-500 mt-2">
              {worker.email}
            </p>

            <p className="mt-2">
              Status:
              <span className="ml-2 font-semibold text-green-600">
                {worker.status}
              </span>
            </p>

            {/* ⭐ ADDED ONLY THIS BUTTON (NO REMOVAL) */}
            <div className="mt-4">
              <Link
                to={`/customer/book/${worker.id}`}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl inline-block"
              >
                Book Now
              </Link>
            </div>

            {/* BOOKING FORM */}
            <div className="mt-8 space-y-4">
              <input
                type="date"
                value={bookingDate}
                onChange={(e) =>
                  setBookingDate(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />

              <input
                type="time"
                value={bookingTime}
                onChange={(e) =>
                  setBookingTime(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />

              <input
                placeholder="Service Address"
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />

              <textarea
                placeholder="Additional Notes"
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                className="w-full border rounded-lg p-3"
              />

              <button
                onClick={handleBooking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>

        {/* REVIEWS SECTION */}
        <div className="bg-white rounded-xl shadow p-6 mt-8">
          <h2 className="text-2xl font-bold mb-4">
            Customer Reviews
          </h2>

          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl font-bold">
              {averageRating}
            </span>

            <span className="text-yellow-500 text-2xl">
              ⭐
            </span>
          </div>

          {reviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="border-b py-5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      review.customer.profile_image ||
                      "https://placehold.co/50"
                    }
                    className="w-12 h-12 rounded-full"
                  />

                  <div>
                    <p className="font-semibold">
                      {review.customer.first_name}{" "}
                      {review.customer.last_name}
                    </p>

                    <p>
                      {"⭐".repeat(review.rating)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-gray-600">
                  {review.review}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}