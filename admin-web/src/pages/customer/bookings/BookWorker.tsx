import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import AvailabilityCalendar from "../../../components/customer/AvailabilityCalendar";
import LocationPicker from "../../../components/maps/LocationPicker";
import { useAuth } from "../../../context/AuthContext";
import CustomerLayout from "../../../layouts/CustomerLayout";

import {
  createBooking,
  isWorkerAvailable,
} from "../../../services/customerBookingService";
import { getApprovedServices } from "../../../services/serviceService";
import { getCustomerWorkerProfile } from "../../../services/workerService";

type WorkerProfile = {
  id: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type WorkerService = {
  id: number;
  service_name: string;
  category?: string | null;
  price?: number | null;
};

type WorkerData = {
  profile: WorkerProfile;
  services: WorkerService[];
};

type BookingLocationState = {
  serviceId?: number | string;
};

function getTodayDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isPastSchedule(
  scheduleDate: string,
  scheduleTime: string,
): boolean {
  if (!scheduleDate || !scheduleTime) {
    return false;
  }

  const selectedSchedule = new Date(
    `${scheduleDate}T${scheduleTime}:00`,
  );

  return (
    Number.isNaN(selectedSchedule.getTime()) ||
    selectedSchedule.getTime() <= Date.now()
  );
}

export default function BookWorker() {
  const { workerId } = useParams<{ workerId: string }>();

  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading: authLoading } = useAuth();

  const locationState =
    location.state as BookingLocationState | null;

  const previousServiceId = locationState?.serviceId;

  const [worker, setWorker] = useState<WorkerData | null>(null);

  const [serviceId, setServiceId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = useMemo(() => {
    if (!worker || !serviceId) {
      return null;
    }

    return (
      worker.services.find(
        (service) => String(service.id) === serviceId,
      ) ?? null
    );
  }, [worker, serviceId]);

  useEffect(() => {
    let active = true;

    async function loadWorker() {
      if (!workerId) {
        setError("Worker ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [workerProfileData, servicesData] =
          await Promise.all([
            getCustomerWorkerProfile(workerId),
            getApprovedServices(workerId),
          ]);

        if (!active) {
          return;
        }

        if (!workerProfileData?.profile) {
          throw new Error(
            "The selected worker profile was not found.",
          );
        }

        const normalizedServices =
          (servicesData ?? []) as WorkerService[];

        const workerData: WorkerData = {
          profile: workerProfileData.profile as WorkerProfile,
          services: normalizedServices,
        };

        setWorker(workerData);

        if (previousServiceId !== undefined) {
          const matchingService = normalizedServices.find(
            (service) =>
              String(service.id) === String(previousServiceId),
          );

          if (matchingService) {
            setServiceId(String(matchingService.id));
          }
        }
      } catch (caughtError) {
        console.error("Unable to load worker:", caughtError);

        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load the selected worker.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWorker();

    return () => {
      active = false;
    };
  }, [workerId, previousServiceId]);

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setError(null);

    if (!user) {
      navigate("/", {
        replace: true,
        state: {
          message: "Please log in before creating a booking.",
        },
      });

      return;
    }

    if (!worker?.profile?.id) {
      setError("The worker profile could not be verified.");
      return;
    }

    if (worker.services.length === 0) {
      setError("This worker has no approved services.");
      return;
    }

    if (!selectedService) {
      setError("Please select a valid service.");
      return;
    }

    if (!scheduleDate) {
      setError("Please select a booking date.");
      return;
    }

    if (!scheduleTime) {
      setError("Please select a booking time.");
      return;
    }

    if (isPastSchedule(scheduleDate, scheduleTime)) {
      setError(
        "Please select a booking date and time in the future.",
      );
      return;
    }

    if (
      !address.trim() ||
      latitude === null ||
      longitude === null
    ) {
      setError(
        "Please select a valid service location from the map.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const available = await isWorkerAvailable(
        worker.profile.id,
        scheduleDate,
        scheduleTime,
      );

      if (!available) {
        setError(
          "The worker is unavailable on the selected date and time.",
        );
        return;
      }

      const bookingPayload = {
        customer_id: user.id,
        worker_id: worker.profile.id,
        service_id: selectedService.id,

        booking_date: scheduleDate,
        booking_time: scheduleTime,

        address: address.trim(),
        customer_address: address.trim(),

        customer_latitude: latitude,
        customer_longitude: longitude,

        notes: notes.trim() || null,
      };

      console.log("Creating booking:", bookingPayload);

      const createdBooking = await createBooking(
        bookingPayload,
      );

      navigate("/customer/booking-confirmation", {
        replace: true,
        state: {
          booking: createdBooking,
          bookingId:
            createdBooking &&
            typeof createdBooking === "object" &&
            "id" in createdBooking
              ? createdBooking.id
              : undefined,
        },
      });
    } catch (caughtError) {
      console.error("Booking creation failed:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit the booking.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div
              className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
              aria-hidden="true"
            />

            <p className="mt-4 font-semibold text-slate-700">
              Loading worker information...
            </p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (error && !worker) {
    return (
      <CustomerLayout>
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-red-800">
            Unable to open booking page
          </h1>

          <p className="mt-3 text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700"
          >
            Go back
          </button>
        </div>
      </CustomerLayout>
    );
  }

  if (!worker) {
    return (
      <CustomerLayout>
        <div className="p-10 text-center">
          Worker profile not found.
        </div>
      </CustomerLayout>
    );
  }

  const fullName = [
    worker.profile.first_name,
    worker.profile.middle_name,
    worker.profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Book Worker
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Select a service, schedule, and service location.
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-slate-100 p-5">
          <h2 className="text-xl font-bold text-slate-900">
            {fullName || "Worker"}
          </h2>

          {worker.profile.email && (
            <p className="mt-1 text-gray-600">
              {worker.profile.email}
            </p>
          )}

          {worker.profile.phone && (
            <p className="text-gray-600">
              {worker.profile.phone}
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label
              htmlFor="service"
              className="mb-2 block font-semibold text-slate-800"
            >
              Service
            </label>

            <select
              id="service"
              value={serviceId}
              disabled={
                submitting || worker.services.length === 0
              }
              onChange={(event) => {
                setServiceId(event.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select Service</option>

              {worker.services.length === 0 ? (
                <option disabled>
                  No approved services available
                </option>
              ) : (
                worker.services.map((service) => (
                  <option
                    key={service.id}
                    value={String(service.id)}
                  >
                    {service.service_name}
                    {typeof service.price === "number"
                      ? ` — ₱${service.price.toLocaleString()}`
                      : ""}
                  </option>
                ))
              )}
            </select>

            {selectedService && (
              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">
                  {selectedService.service_name}
                </p>

                {selectedService.category && (
                  <p className="mt-1 text-sm text-blue-700">
                    Category: {selectedService.category}
                  </p>
                )}

                {typeof selectedService.price === "number" && (
                  <p className="mt-1 text-sm font-semibold text-blue-800">
                    Price: ₱
                    {selectedService.price.toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <AvailabilityCalendar
              workerId={worker.profile.id}
              value={scheduleDate}
              onChange={(date) => {
                setScheduleDate(date);
                setError(null);
              }}
            />
          </div>

          <div>
            <label
              htmlFor="schedule-time"
              className="mb-2 block font-semibold text-slate-800"
            >
              Preferred Time
            </label>

            <input
              id="schedule-time"
              type="time"
              value={scheduleTime}
              min={
                scheduleDate === getTodayDate()
                  ? new Date().toTimeString().slice(0, 5)
                  : undefined
              }
              disabled={submitting}
              onChange={(event) => {
                setScheduleTime(event.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold text-slate-800">
              Service Location
            </label>

            <LocationPicker
              onLocationSelect={(
                selectedLatitude,
                selectedLongitude,
                selectedAddress,
              ) => {
                setLatitude(selectedLatitude);
                setLongitude(selectedLongitude);
                setAddress(selectedAddress);
                setError(null);
              }}
              showNearbyWorkers
              nearbyWorkerRadiusKilometers={20}
            />

            <textarea
              rows={3}
              value={address}
              readOnly
              placeholder="Selected address will appear here..."
              className="mt-4 w-full resize-none rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-700"
            />

            {latitude !== null && longitude !== null && (
              <p className="mt-2 text-xs text-slate-500">
                Coordinates: {latitude.toFixed(6)},{" "}
                {longitude.toFixed(6)}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block font-semibold text-slate-800"
            >
              Job Description
            </label>

            <textarea
              id="notes"
              rows={4}
              maxLength={1000}
              disabled={submitting}
              placeholder="Describe the work needed..."
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              className="w-full resize-none rounded-lg border border-slate-300 p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {notes.length}/1000
            </p>
          </div>

          <button
            type="button"
            disabled={
              submitting ||
              worker.services.length === 0
            }
            onClick={() => {
              void handleSubmit();
            }}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {submitting
              ? "Submitting booking..."
              : "Submit Booking"}
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}