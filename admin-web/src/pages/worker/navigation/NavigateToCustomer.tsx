import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Phone,
  User,
} from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import LocationPicker from "../../../components/maps/LocationPicker";

import { getBooking } from "../../../services/workerBookingService";

interface BookingData {
  id: number;

  customer_address: string | null;
  customer_latitude: number | null;
  customer_longitude: number | null;

  status: string;
  trip_status: string;

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

  const [booking, setBooking] =
    useState<BookingData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) {
        setErrorMessage("Booking ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const data = await getBooking(
          Number(bookingId),
        );

        setBooking(data as BookingData);
      } catch (error) {
        console.error(
          "Unable to load navigation booking:",
          error,
        );

        setErrorMessage(
          "Unable to load booking location.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <WorkerLayout>
        <div className="p-10 text-center">
          Loading customer location...
        </div>
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
            {errorMessage ||
              "This booking has no saved customer coordinates."}
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
                  booking.customer_address ??
                  "Customer service location",
              }}
              navigationMode
            />
          </main>
        </div>
      </div>
    </WorkerLayout>
  );
}