import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import BookingTimeline from "../../../components/customer/BookingTimeline";

import { getBooking, cancelBooking } from "../../../services/bookingService";

import { supabase } from "../../../lib/supabase";
import { hasReviewed } from "../../../services/reviewService";

function getStatusColor(status: string) {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";

    case "Approved":
      return "bg-blue-100 text-blue-700";

    case "On Going":
      return "bg-purple-100 text-purple-700";

    case "Completed":
      return "bg-green-100 text-green-700";

    case "Cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function BookingDetails() {
  const { id } = useParams();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (id) {
      loadBooking();
    }
  }, [id]);

  async function loadBooking() {
    try {
      setLoading(true);

      const data = await getBooking(id!);

      setBooking(data);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const alreadyReviewed = await hasReviewed(Number(id), user.id);

        setReviewed(alreadyReviewed);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const confirmed = window.confirm("Cancel this booking?");

    if (!confirmed) return;

    try {
      await cancelBooking(Number(id));

      alert("Booking cancelled.");

      loadBooking();
    } catch (error) {
      console.error(error);

      alert("Unable to cancel booking.");
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">Loading...</div>
      </CustomerLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">Booking not found.</div>
      </CustomerLayout>
    );
  }

  const steps = ["Pending", "Approved", "Completed"];

  const currentStep = steps.indexOf(booking.status);

  return (
    <CustomerLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <BookingTimeline status={booking.status} />
        </div>
        {/* BOOKING DETAILS */}

        <div className="bg-white rounded-xl shadow p-6">
          <h1 className="text-3xl font-bold mb-5">Booking Details</h1>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-gray-500">Worker</p>

              <p className="font-semibold">
                {[
                  booking.worker?.first_name,
                  booking.worker?.middle_name,
                  booking.worker?.last_name,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Status</p>

              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  booking.status,
                )}`}
              >
                {booking.status}
              </span>
            </div>

            <div>
              <p className="text-gray-500">Date</p>

              <p className="font-semibold">{booking.booking_date}</p>
            </div>

            <div>
              <p className="text-gray-500">Time</p>

              <p className="font-semibold">{booking.booking_time}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-gray-500">Address</p>

              <p className="font-semibold">{booking.address}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-gray-500">Notes</p>

              <p className="font-semibold">{booking.notes || "-"}</p>
            </div>
          </div>
        </div>
        {/* BOOKING PROGRESS */}

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Booking Progress</h2>

          <div className="space-y-5">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4">
                <div
                  className={`w-5 h-5 rounded-full ${
                    index <= currentStep ? "bg-green-600" : "bg-gray-300"
                  }`}
                />

                <p
                  className={`font-semibold ${
                    index <= currentStep ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS */}

        <div className="flex flex-wrap gap-4">
          {booking.status === "Pending" && (
            <button
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
            >
              Cancel Booking
            </button>
          )}

          {booking.status === "Completed" && reviewed && (
            <div className="bg-green-100 text-green-700 px-6 py-3 rounded-lg font-semibold">
              ✅ Review Submitted
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
