import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import AdminLayout from "../../../layouts/AdminLayout";
import {
  getAdminBookingById,
  type AdminBooking,
} from "../../../services/adminBookingService";
import { supabase } from "../../../lib/supabase";

function profileName(profile: AdminBooking["customer"]): string {
  if (!profile) {
    return "Unknown user";
  }

  const fullName = [profile.first_name, profile.middle_name, profile.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return fullName || profile.email?.trim() || "Unknown user";
}

function displayValue(value: unknown, fallback = "Not available"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function BookingHistory() {
  const { id } = useParams();
  const bookingId = Number(id);
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooking = useCallback(async () => {
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      setError("Invalid booking ID.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      setBooking(await getAdminBookingById(bookingId));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load booking details.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      void loadBooking();
      return;
    }

    let mounted = true;

    void loadBooking();

    const channel = supabase
      .channel(`admin-booking-history-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        () => {
          if (mounted) {
            void loadBooking();
          }
        },
      )
      .subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error("Admin booking history realtime channel error.");
        }

        if (subscriptionStatus === "TIMED_OUT") {
          console.error("Admin booking history realtime connection timed out.");
        }
      });

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [bookingId, loadBooking]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to bookings
          </Link>
          <button
            type="button"
            onClick={() => void loadBooking()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            Loading booking details...
          </div>
        ) : error || !booking ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
            <p className="font-semibold text-red-700 dark:text-red-300">
              {error || "Booking not found."}
            </p>
            <button
              type="button"
              onClick={() => void loadBooking()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Booking #{booking.id}
                </p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                  Booking Details
                </h1>
              </div>
              <span className="w-fit rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                {booking.status}
              </span>
            </div>

            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <Detail
                label="Customer"
                value={profileName(booking.customer)}
                subvalue={booking.customer?.email ?? undefined}
              />
              <Detail
                label="Worker"
                value={profileName(booking.worker)}
                subvalue={booking.worker?.email ?? undefined}
              />
              <Detail
                label="Booking date"
                value={displayValue(booking.booking_date)}
              />
              <Detail
                label="Booking time"
                value={displayValue(booking.booking_time)}
              />
              <Detail
                label="Service"
                value={displayValue(booking.service_name, "Service booking")}
              />
              <Detail
                label="Price"
                value={
                  booking.price == null
                    ? "Not set"
                    : `₱${booking.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                }
              />
              <Detail
                label="Payment status"
                value={displayValue(booking.payment_status)}
              />
              <Detail
                label="Schedule status"
                value={displayValue(booking.schedule_status)}
              />
              <Detail
                label="Completion status"
                value={displayValue(booking.completion_status)}
              />
              <Detail
                label="Created"
                value={
                  booking.created_at
                    ? new Date(booking.created_at).toLocaleString("en-PH")
                    : "Not available"
                }
              />
              <div className="md:col-span-2">
                <Detail label="Address" value={displayValue(booking.address)} />
              </div>
              <div className="md:col-span-2">
                <Detail
                  label="Notes"
                  value={displayValue(booking.notes, "No notes provided")}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Detail({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
      {subvalue && <p className="mt-0.5 text-sm text-slate-500">{subvalue}</p>}
    </div>
  );
}
