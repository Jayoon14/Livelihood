import { confirmAction } from "../../../components/ui/confirmAction";
import { toast } from "sonner";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import CustomerLayout from "../../../layouts/CustomerLayout";
import BookingTimeline from "../../../components/customer/BookingTimeline";

import {
  cancelBooking,
  getBooking,
} from "../../../services/bookingService";

import { supabase } from "../../../lib/supabase";
import { hasReviewed } from "../../../services/reviewService";

type BookingStatus =
  | "Pending"
  | "Approved"
  | "On Going"
  | "Waiting Customer Confirmation"
  | "Completed"
  | "Cancelled";

type BookingWorker = {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
};

type BookingDetailsData = {
  id: number;
  customer_id?: string;
  worker_id?: string;
  status: BookingStatus;
  trip_status?: string | null;
  completion_status?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  address?: string | null;
  customer_address?: string | null;
  notes?: string | null;
  price?: number | string | null;
  worker?: BookingWorker | null;
  [key: string]: unknown;
};

type RealtimeBookingRecord = {
  id?: number;
  status?: string | null;
  trip_status?: string | null;
  completion_status?: string | null;
};

const BOOKING_PROGRESS_STEPS: BookingStatus[] = [
  "Pending",
  "Approved",
  "On Going",
  "Waiting Customer Confirmation",
  "Completed",
];

function isBookingStatus(value: unknown): value is BookingStatus {
  return (
    value === "Pending" ||
    value === "Approved" ||
    value === "On Going" ||
    value === "Waiting Customer Confirmation" ||
    value === "Completed" ||
    value === "Cancelled"
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-700";

    case "Approved":
      return "bg-blue-100 text-blue-700";

    case "On Going":
      return "bg-purple-100 text-purple-700";

    case "Waiting Customer Confirmation":
      return "bg-orange-100 text-orange-700";

    case "Completed":
      return "bg-green-100 text-green-700";

    case "Cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusToastMessage(status: BookingStatus): string {
  switch (status) {
    case "Pending":
      return "Your booking is waiting for the worker's response.";

    case "Approved":
      return "Your booking has been approved by the worker.";

    case "On Going":
      return "The worker has started your service.";

    case "Waiting Customer Confirmation":
      return "The worker submitted completion proof. Please review it.";

    case "Completed":
      return "Your booking has been completed.";

    case "Cancelled":
      return "Your booking has been cancelled.";

    default:
      return "Your booking status has been updated.";
  }
}

function showStatusToast(status: BookingStatus): void {
  const message = getStatusToastMessage(status);

  switch (status) {
    case "Approved":
    case "Completed":
      toast.success(message);
      break;

    case "Cancelled":
      toast.error(message);
      break;

    case "On Going":
    case "Waiting Customer Confirmation":
      toast.info(message);
      break;

    default:
      toast(message);
  }
}

function getWorkerName(worker?: BookingWorker | null): string {
  const fullName = [
    worker?.first_name,
    worker?.middle_name,
    worker?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Worker";
}

function normalizeBooking(value: unknown): BookingDetailsData | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const bookingId = Number(candidate.id);

  if (
    !Number.isFinite(bookingId) ||
    !isBookingStatus(candidate.status)
  ) {
    return null;
  }

  return {
    ...candidate,
    id: bookingId,
    status: candidate.status,
  } as BookingDetailsData;
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

  return "An unexpected error occurred.";
}

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();

  const bookingId = Number(id);

  const [booking, setBooking] =
    useState<BookingDetailsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const statusRef = useRef<BookingStatus | null>(null);
  const mountedRef = useRef(true);

  const loadBooking = useCallback(
    async (showFullLoading = false) => {
      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        setBooking(null);
        setPageError("Invalid booking ID.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showFullLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        setPageError(null);

        const result = await getBooking(String(bookingId));
        const normalizedBooking = normalizeBooking(result);

        if (!mountedRef.current) return;

        if (!normalizedBooking) {
          setBooking(null);
          setPageError("Booking record could not be loaded.");
          return;
        }

        setBooking(normalizedBooking);
        statusRef.current = normalizedBooking.status;

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "Unable to verify customer review status:",
            authError,
          );
        }

        if (user && normalizedBooking.status === "Completed") {
          try {
            const alreadyReviewed = await hasReviewed(
              normalizedBooking.id,
              user.id,
            );

            if (mountedRef.current) {
              setReviewed(alreadyReviewed);
            }
          } catch (reviewError) {
            console.error(
              "Unable to check booking review:",
              reviewError,
            );

            if (mountedRef.current) {
              setReviewed(false);
            }
          }
        } else if (mountedRef.current) {
          setReviewed(false);
        }
      } catch (error) {
        console.error("Load booking details error:", error);

        if (mountedRef.current) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [bookingId],
  );

  useEffect(() => {
    mountedRef.current = true;
    statusRef.current = null;

    void loadBooking(true);

    return () => {
      mountedRef.current = false;
    };
  }, [loadBooking]);

  useEffect(() => {
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return;
    }

    let isCancelled = false;

    const channel = supabase
      .channel(`customer-booking-details-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          if (isCancelled) return;

          const updatedRecord =
            payload.new as RealtimeBookingRecord;

          const incomingStatus = updatedRecord.status;

          if (
            isBookingStatus(incomingStatus) &&
            incomingStatus !== statusRef.current
          ) {
            statusRef.current = incomingStatus;
            showStatusToast(incomingStatus);
          }

          /*
           * Reload the complete booking so joined worker/service
           * information remains available.
           */
          void loadBooking(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        () => {
          if (isCancelled) return;

          setBooking(null);
          setPageError(
            "This booking is no longer available.",
          );

          toast.error("This booking has been removed.");
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.info(
            `Realtime connected for booking ${bookingId}.`,
          );
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            `Booking realtime connection failed: ${status}`,
          );
        }
      });

    return () => {
      isCancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [bookingId, loadBooking]);

  async function handleCancel() {
    if (cancelling || !booking) return;

    const confirmed = await confirmAction(
      "Cancel this booking?",
    );

    if (!confirmed) return;

    setCancelling(true);

    try {
      await cancelBooking(booking.id);

      /*
       * Realtime should also receive the change, but this direct
       * reload ensures the page updates even if the channel is slow.
       */
      await loadBooking(false);

      toast.success("Booking cancelled successfully.");
    } catch (error) {
      console.error("Cancel booking error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to cancel booking.",
      );
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-80 flex-col items-center justify-center gap-4 p-10 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />

          <p className="font-medium text-gray-600">
            Loading booking details...
          </p>
        </div>
      </CustomerLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-3xl p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
            <h1 className="text-2xl font-bold text-red-700">
              Booking not found
            </h1>

            <p className="mt-3 text-red-600">
              {pageError ??
                "This booking does not exist or is no longer available."}
            </p>

            <Link
              to="/customer/bookings"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Return to My Bookings
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const currentStep =
    booking.status === "Cancelled"
      ? -1
      : BOOKING_PROGRESS_STEPS.indexOf(booking.status);

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
              Booking #{booking.id}
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Booking Details
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void loadBooking(false)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                refreshing ? "animate-spin" : ""
              }`}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <BookingTimeline status={booking.status} />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Worker</p>

              <p className="mt-1 font-semibold">
                {getWorkerName(booking.worker)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Status</p>

              <span
                className={`mt-1 inline-block rounded-full px-4 py-2 text-sm font-semibold ${getStatusColor(
                  booking.status,
                )}`}
              >
                {booking.status}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Booking Date
              </p>

              <p className="mt-1 font-semibold">
                {booking.booking_date || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Booking Time
              </p>

              <p className="mt-1 font-semibold">
                {booking.booking_time || "-"}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">
                Service Address
              </p>

              <p className="mt-1 font-semibold">
                {booking.customer_address ||
                  booking.address ||
                  "-"}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Notes</p>

              <p className="mt-1 whitespace-pre-wrap font-semibold">
                {booking.notes || "-"}
              </p>
            </div>

            {booking.price !== null &&
              booking.price !== undefined && (
                <div className="md:col-span-2">
                  <div className="border-t pt-5">
                    <p className="text-sm text-gray-500">
                      Total Amount
                    </p>

                    <p className="mt-1 text-2xl font-bold text-blue-600">
                      ₱
                      {Number(
                        booking.price ?? 0,
                      ).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-6 text-2xl font-bold">
            Booking Progress
          </h2>

          {booking.status === "Cancelled" ? (
            <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="h-5 w-5 rounded-full bg-red-600" />

              <div>
                <p className="font-semibold text-red-700">
                  Booking Cancelled
                </p>

                <p className="mt-1 text-sm text-red-600">
                  This booking will no longer continue.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {BOOKING_PROGRESS_STEPS.map(
                (step, index) => {
                  const isFinished = index <= currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <div
                      key={step}
                      className="flex items-center gap-4"
                    >
                      <div
                        className={`h-5 w-5 rounded-full ${
                          isFinished
                            ? "bg-green-600"
                            : "bg-gray-300"
                        } ${
                          isCurrent
                            ? "ring-4 ring-green-100"
                            : ""
                        }`}
                      />

                      <p
                        className={`font-semibold ${
                          isFinished
                            ? "text-green-700"
                            : "text-gray-400"
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          {[
            "Approved",
            "On Going",
            "Waiting Customer Confirmation",
            "Completed",
          ].includes(booking.status) && (
            <Link
              to={`/chat/${booking.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              <MessageCircle className="h-5 w-5" />
              Chat with Worker
            </Link>
          )}

          {booking.status ===
            "Waiting Customer Confirmation" && (
            <Link
              to={`/customer/completion-proof/${booking.id}`}
              className="inline-flex items-center rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              View Completion Proof
            </Link>
          )}

          {booking.status === "Pending" && (
            <button
              type="button"
              onClick={() => void handleCancel()}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {cancelling && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}

              {cancelling
                ? "Cancelling..."
                : "Cancel Booking"}
            </button>
          )}

          {booking.status === "Completed" &&
            reviewed && (
              <div className="rounded-xl bg-green-100 px-6 py-3 font-semibold text-green-700">
                ✅ Review Submitted
              </div>
            )}

          <Link
            to="/customer/bookings"
            className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to My Bookings
          </Link>
        </div>
      </div>
    </CustomerLayout>
  );
}