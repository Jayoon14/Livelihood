import { confirmAction } from "../../../components/ui/confirmAction";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, MessageCircle, Navigation, Phone, User } from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import LocationPicker from "../../../components/maps/LocationPicker";

import { supabase } from "../../../lib/supabase";

import {
  getBooking,
  markWorkerArrived,
  startTrip,
} from "../../../services/workerBookingService";
import type {
  WorkerBookingStatus,
  WorkerTripStatus,
} from "../../../services/workerBookingService";

interface BookingData {
  id: number;

  customer_address: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;

  status: WorkerBookingStatus;
  trip_status: WorkerTripStatus | null;

  accepted_at?: string | null;
  arrived_at?: string | null;
  trip_started_at?: string | null;
  completed_at?: string | null;

  customer?: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    phone?: string | null;
  } | null;
}

export default function NavigateToCustomer() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [workerId, setWorkerId] = useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) {
        setErrorMessage("Booking ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Worker account is not authenticated.");
        }

        setWorkerId(user.id);

        const data = await getBooking(Number(bookingId));

        setBooking(data as BookingData);
      } catch (error) {
        console.error("Unable to load navigation booking:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load booking location.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [bookingId]);

  async function handleArrived() {
    if (!booking || !workerId || updatingStatus) {
      return;
    }

    const confirmed = await confirmAction(
      "Confirm that you have arrived at the customer location?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingStatus(true);

      const updatedBooking = await markWorkerArrived(booking.id, workerId);

      setBooking((current) =>
        current
          ? {
              ...current,
              trip_status: updatedBooking.trip_status,
            }
          : current,
      );

      toast.success("Arrival confirmed.");
    } catch (error) {
      console.error("Unable to mark worker as arrived:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update trip status.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }
  async function handleStartService() {
    if (!booking || !workerId || updatingStatus) {
      return;
    }

    const confirmed = await confirmAction("Start the service now?");

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingStatus(true);

      const updatedBooking = await startTrip(booking.id, workerId);

      setBooking((current) =>
        current
          ? {
              ...current,
              status: updatedBooking.status,
              trip_status: updatedBooking.trip_status,
              trip_started_at: updatedBooking.trip_started_at,
            }
          : current,
      );

      toast.success("Service started.");
    } catch (error) {
      console.error("Unable to start service:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to start service.",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }
  function handleCompleteService() {
    if (!booking || updatingStatus) {
      return;
    }

    if (
      booking.status !== "On Going" ||
      booking.trip_status !== "On Trip"
    ) {
      toast.error(
        "Completion proof can only be submitted while the service is ongoing.",
      );
      return;
    }

    navigate(`/worker/bookings/${booking.id}/complete`);
  }

  if (loading) {
    return (
      <WorkerLayout>
        <div className="p-10 text-center">Loading customer location...</div>
      </WorkerLayout>
    );
  }

  if (
    errorMessage ||
    !booking ||
    booking.customer_latitude === null ||
    booking.customer_longitude === null
  ) {
    return (
      <WorkerLayout>
        <div className="mx-auto max-w-3xl p-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {errorMessage || "This booking has no saved customer coordinates."}
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </WorkerLayout>
    );
  }

  const customerName = [
    booking.customer?.first_name,
    booking.customer?.middle_name,
    booking.customer?.last_name,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <WorkerLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to bookings
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Navigation className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Navigate to Customer
                </h1>

                <p className="text-sm text-slate-500">
                  Follow the route to the service location.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-blue-50 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Trip Status
            </p>

            <p className="mt-1 font-bold text-blue-900">
              {booking.trip_status}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Customer Details
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-blue-600" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Customer
                    </p>

                    <p className="font-semibold text-slate-800">
                      {customerName || "Customer"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-blue-600" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Service Location
                    </p>

                    <p className="text-sm leading-6 text-slate-700">
                      {booking.customer_address}
                    </p>
                  </div>
                </div>

                {booking.customer?.phone && (
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
                  >
                    <Phone className="h-4 w-4" />
                    Call Customer
                  </a>
                )}

                {booking.customer?.id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/chat/${booking.id}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat Customer
                  </button>
                )}

                {booking.status === "Approved" &&
                  booking.trip_status === "Accepted" && (
                    <button
                      type="button"
                      onClick={() => void handleArrived()}
                      disabled={updatingStatus}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MapPin className="h-4 w-4" />

                      {updatingStatus ? "Updating..." : "I Have Arrived"}
                    </button>
                  )}

                {booking.status === "Approved" &&
                  booking.trip_status === "Arrived" && (
                    <button
                      type="button"
                      onClick={() => void handleStartService()}
                      disabled={updatingStatus}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Navigation className="h-4 w-4" />

                      {updatingStatus ? "Starting..." : "Start Service"}
                    </button>
                  )}
                {booking.status === "On Going" &&
                  booking.trip_status === "On Trip" && (
                    <button
                      type="button"
                      onClick={() => void handleCompleteService()}
                      disabled={updatingStatus}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MapPin className="h-4 w-4" />

                      {updatingStatus ? "Completing..." : "Complete Service"}
                    </button>
                  )}
                {booking.status === "Completed" &&
                  booking.trip_status === "Completed" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="font-bold text-emerald-700">
                        Service Completed
                      </p>

                      <p className="mt-1 text-sm text-emerald-600">
                        This booking has been completed successfully.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </aside>

          <main>
            <LocationPicker
              onLocationSelect={() => {
                // Navigation destination is fixed.
              }}
              initialLocation={{
                latitude: booking.customer_latitude,
                longitude: booking.customer_longitude,
                address:
                  booking.customer_address ?? "Customer service location",
              }}
              navigationMode
            />
          </main>
        </div>
      </div>
    </WorkerLayout>
  );
}