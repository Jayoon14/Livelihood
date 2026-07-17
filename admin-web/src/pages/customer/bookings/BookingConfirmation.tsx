import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { createBooking } from "../../../services/bookingService";

export default function BookingConfirmation() {
  return (
    <CustomerLayout>
      <BookingConfirmationContent />
    </CustomerLayout>
  );
}

function BookingConfirmationContent() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [loading, setLoading] = useState(false);

  if (!state) {
    return (
      <div className="p-10 text-center">
        Booking information not found.
      </div>
    );
  }

  async function handleConfirmBooking() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please login first.");
        return;
      }

      await createBooking(
          user.id,
          state.workerId,
          state.date,
          state.time,
          state.address,
          ""
      );

      alert("Booking submitted successfully.");

      navigate("/customer/bookings");
    } catch (error) {
      console.error(error);
      alert("Failed to submit booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8">
          Confirm Booking
        </h1>

        <div className="space-y-5">
          <div className="flex justify-between">
            <span className="font-semibold">
              Worker
            </span>

            <span>{state.workerName}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">
              Service
            </span>

            <span>{state.service}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">
              Booking Date
            </span>

            <span>{state.date}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">
              Booking Time
            </span>

            <span>{state.time}</span>
          </div>

          <div className="border-t pt-6 flex justify-between">
            <span className="text-xl font-bold">
              Total Amount
            </span>

            <span className="text-2xl text-blue-600 font-bold">
              ₱{state.price}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-10">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl border"
          >
            Back
          </button>

          <button
            onClick={handleConfirmBooking}
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white disabled:bg-gray-400"
          >
            {loading ? "Submitting..." : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}