import { toast } from "sonner";
import { useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";

import { createBooking } from "../../../services/customerBookingService";

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
        toast.warning("Please login first.");
        navigate("/");
        return;
      }

      if (
        !state.address?.trim() ||
        !Number.isFinite(state.latitude) ||
        !Number.isFinite(state.longitude)
      ) {
        throw new Error(
          "Service location is missing. Please return and select the location again.",
        );
      }

      console.log("Booking confirmation state:", state);

      await createBooking({
        customer_id: user.id,
        worker_id: state.workerId,
        service_id: Number(state.serviceId),

        booking_date: state.date,
        booking_time: state.time,

        address: state.address,
        customer_address: state.address,
        customer_latitude: Number(state.latitude),
        customer_longitude: Number(state.longitude),

        notes: state.notes ?? "",
      });

      toast.success(
        "Booking submitted successfully. Please wait for the worker's approval.",
      );

      navigate("/customer/bookings", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "BOOKING SUBMISSION ERROR:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit booking.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-3xl font-bold">
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

          <div className="flex justify-between">
            <span className="font-semibold">
              Service Location
            </span>

            <span className="max-w-md text-right">
              {state.address}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">
              Coordinates
            </span>

            <span>
              {Number(state.latitude).toFixed(6)},{" "}
              {Number(state.longitude).toFixed(6)}
            </span>
          </div>

          <div className="flex justify-between border-t pt-6">
            <span className="text-xl font-bold">
              Total Amount
            </span>

            <span className="text-2xl font-bold text-blue-600">
              ₱{state.price}
            </span>
          </div>
        </div>

        <div className="mt-10 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="rounded-xl border px-6 py-3 disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleConfirmBooking}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-8 py-3 text-white disabled:bg-gray-400"
          >
            {loading
              ? "Submitting..."
              : "Confirm Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}