import { toast } from "sonner";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import { createBooking } from "../../../services/customerBookingService";

type BookingConfirmationState = {
  workerId: string;
  workerName: string;
  service: string;
  serviceId: number | string;
  date: string;
  time: string;
  price: number | string;
  pricingType?: "hourly" | "daily" | "fixed";
  pricingLabel?: string;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
  schedulingType?: "hourly" | "project";
  durationValue?: number;
  durationUnit?: "hour" | "day" | "week" | "month";
  scheduledStartAt?: string;
  scheduledEndAt?: string;
};

/**
 * Scheduled bookings do not require the worker to be online.
 * This check only verifies that the worker exists and is approved.
 */
async function assertWorkerCanReceiveScheduledBooking(
  workerId: string,
): Promise<void> {
  const normalizedWorkerId = workerId.trim();

  if (!normalizedWorkerId) {
    throw new Error("Worker information is missing.");
  }

  const { data: worker, error } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", normalizedWorkerId)
    .eq("role", "worker")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to verify worker status: ${error.message}`,
    );
  }

  if (!worker) {
    throw new Error("Worker account was not found.");
  }

  if (
    String(worker.status ?? "")
      .trim()
      .toLowerCase() !== "approved"
  ) {
    throw new Error(
      "This worker account is currently unavailable.",
    );
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Failed to submit booking.";
}

function isExpectedBookingBlock(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes(
      "already have an active booking",
    ) ||
    normalizedMessage.includes(
      "worker account is currently unavailable",
    ) ||
    normalizedMessage.includes(
      "worker is no longer available",
    ) ||
    normalizedMessage.includes(
      "time slot has already been booked",
    ) ||
    normalizedMessage.includes(
      "selected date and time",
    )
  );
}

export default function BookingConfirmation() {
  return (
    <CustomerLayout>
      <BookingConfirmationContent />
    </CustomerLayout>
  );
}

function BookingConfirmationContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState =
    location.state as BookingConfirmationState | null;

  const [loading, setLoading] = useState(false);

  if (!routeState) {
    return (
      <div className="p-10 text-center">
        Booking information not found.
      </div>
    );
  }

  const state: BookingConfirmationState = routeState;

  async function handleConfirmBooking() {
    if (loading) return;

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(
          `Unable to verify your account: ${authError.message}`,
        );
      }

      if (!user) {
        toast.warning("Please login first.");

        navigate("/", {
          replace: true,
        });

        return;
      }

      const normalizedServiceId = Number(state.serviceId);
      const normalizedLatitude = Number(state.latitude);
      const normalizedLongitude = Number(state.longitude);

      if (
        !Number.isInteger(normalizedServiceId) ||
        normalizedServiceId <= 0
      ) {
        throw new Error(
          "The selected service is invalid. Please return and select the service again.",
        );
      }

      if (
        !state.workerId?.trim() ||
        !state.date?.trim() ||
        !state.time?.trim()
      ) {
        throw new Error(
          "Some booking details are missing. Please return and complete the booking form.",
        );
      }

      if (
        !state.address?.trim() ||
        !Number.isFinite(normalizedLatitude) ||
        !Number.isFinite(normalizedLongitude)
      ) {
        throw new Error(
          "Service location is missing. Please return and select the location again.",
        );
      }

      await assertWorkerCanReceiveScheduledBooking(state.workerId);

      await createBooking({
        customer_id: user.id,
        worker_id: state.workerId.trim(),
        service_id: normalizedServiceId,
        booking_type: "Scheduled",
        booking_date: state.date.trim(),
        booking_time: state.time.trim(),
        address: state.address.trim(),
        customer_address: state.address.trim(),
        customer_latitude: normalizedLatitude,
        customer_longitude: normalizedLongitude,
        notes: state.notes?.trim() || null,
        scheduled_start_at: state.scheduledStartAt ?? null,
        scheduled_end_at: state.scheduledEndAt ?? null,
      });

      toast.success(
        "Scheduled booking submitted successfully. Please wait for the worker's approval.",
      );

      navigate("/customer/bookings", {
        replace: true,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      if (isExpectedBookingBlock(message)) {
        console.info("Booking prevented:", message);
      } else {
        console.error("BOOKING SUBMISSION ERROR:", error);
      }

      toast.error(message, {
        duration: 6000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold">
          Confirm Scheduled Booking
        </h1>

        <p className="mb-8 text-sm text-slate-500">
          Review the selected start schedule and estimated service completion before submitting.
        </p>

        {routeState.scheduledEndAt && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-bold">
              {routeState.schedulingType === "project" ? "Project schedule" : "Service schedule"}
            </p>
            <p className="mt-1">
              Estimated completion: {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: routeState.durationUnit === "hour" ? "short" : undefined, timeZone: "Asia/Manila" }).format(new Date(routeState.scheduledEndAt))}
            </p>
          </div>
        )}

        <div className="space-y-5">
          <div className="flex justify-between gap-6">
            <span className="font-semibold">Worker</span>

            <span className="text-right">
              {state.workerName}
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="font-semibold">Service</span>

            <span className="text-right">
              {state.service}
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="font-semibold">
              Booking Date
            </span>

            <span className="text-right">
              {state.date}
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="font-semibold">
              Booking Time
            </span>

            <span className="text-right">
              {state.time}
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="font-semibold">
              Service Location
            </span>

            <span className="max-w-md text-right">
              {state.address}
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="font-semibold">
              Coordinates
            </span>

            <span className="text-right">
              {Number(state.latitude).toFixed(6)},{" "}
              {Number(state.longitude).toFixed(6)}
            </span>
          </div>

          <div className="flex justify-between gap-6 border-t pt-6">
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
            className="rounded-xl border px-6 py-3 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => void handleConfirmBooking()}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-8 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading
              ? "Submitting schedule..."
              : "Confirm Scheduled Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}