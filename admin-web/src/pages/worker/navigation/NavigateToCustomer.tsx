import { confirmAction } from "../../../components/ui/confirmAction";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Radio,
  User,
  WifiOff,
} from "lucide-react";

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


interface WorkerLocationPayload {
  worker_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  is_online: boolean;
  is_available: boolean;
  updated_at: string;
}

const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5_000,
  timeout: 15_000,
};

const MIN_LOCATION_SAVE_INTERVAL_MS = 4_000;

function getGeolocationErrorMessage(
  error: GeolocationPositionError,
): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Enable location access to share your live GPS.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your current GPS location is unavailable.";
  }

  if (error.code === error.TIMEOUT) {
    return "GPS request timed out. Move to an open area and try again.";
  }

  return "Unable to read your current GPS location.";
}

export default function NavigateToCustomer() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<BookingData | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [workerId, setWorkerId] = useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef(0);
  const mountedRef = useRef(true);

  const [sharingLocation, setSharingLocation] = useState(false);
  const [gpsStarting, setGpsStarting] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string | null>(null);

  const saveWorkerLocation = useCallback(
    async (
      position: GeolocationPosition,
      force = false,
    ): Promise<void> => {
      if (!workerId) return;

      const now = Date.now();

      if (
        !force &&
        now - lastSavedAtRef.current <
          MIN_LOCATION_SAVE_INTERVAL_MS
      ) {
        return;
      }

      lastSavedAtRef.current = now;

      const payload: WorkerLocationPayload = {
        worker_id: workerId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : null,
        heading:
          position.coords.heading !== null &&
          Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
        speed:
          position.coords.speed !== null &&
          Number.isFinite(position.coords.speed)
            ? position.coords.speed
            : null,
        is_online: true,
        is_available: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("worker_locations")
        .upsert(payload, {
          onConflict: "worker_id",
        });

      if (error) {
        throw new Error(
          `Unable to share live location: ${error.message}`,
        );
      }

      if (mountedRef.current) {
        setSharingLocation(true);
        setGpsMessage(null);
        setLastGpsUpdate(payload.updated_at);
      }
    },
    [workerId],
  );

  const markLocationOffline = useCallback(async (): Promise<void> => {
    if (!workerId) return;

    const { error } = await supabase
      .from("worker_locations")
      .update({
        is_online: false,
        is_available: false,
        updated_at: new Date().toISOString(),
      })
      .eq("worker_id", workerId);

    if (error) {
      console.error(
        "Unable to mark worker location offline:",
        error,
      );
    }
  }, [workerId]);

  const stopLocationSharing = useCallback(
    async (markOffline = true): Promise<void> => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );
        watchIdRef.current = null;
      }

      if (mountedRef.current) {
        setSharingLocation(false);
        setGpsStarting(false);
      }

      if (markOffline) {
        await markLocationOffline();
      }
    },
    [markLocationOffline],
  );

  const startLocationSharing = useCallback((): void => {
    if (watchIdRef.current !== null || gpsStarting) {
      return;
    }

    if (!("geolocation" in navigator)) {
      setGpsMessage(
        "This browser does not support GPS location.",
      );
      return;
    }

    setGpsStarting(true);
    setGpsMessage("Starting live GPS...");

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          void saveWorkerLocation(position, false).catch(
            (error: unknown) => {
              console.error(
                "Live worker location update failed:",
                error,
              );

              if (mountedRef.current) {
                setGpsMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to share live GPS.",
                );
              }
            },
          );

          if (mountedRef.current) {
            setGpsStarting(false);
          }
        },
        (error) => {
          console.error(
            "Worker geolocation error:",
            error,
          );

          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(
              watchIdRef.current,
            );
            watchIdRef.current = null;
          }

          if (mountedRef.current) {
            setGpsStarting(false);
            setSharingLocation(false);
            setGpsMessage(
              getGeolocationErrorMessage(error),
            );
          }
        },
        LOCATION_OPTIONS,
      );
  }, [gpsStarting, saveWorkerLocation]);

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

        const data = await getBooking(Number(bookingId), user.id);

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

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current,
        );
        watchIdRef.current = null;
      }

      void markLocationOffline();
    };
  }, [markLocationOffline]);

  useEffect(() => {
    if (!booking?.id) return;

    const channel = supabase
      .channel(`worker-navigation-booking-${booking.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${booking.id}`,
        },
        (payload) => {
          const updated =
            payload.new as Partial<BookingData>;

          setBooking((current) =>
            current
              ? {
                  ...current,
                  ...updated,
                }
              : current,
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [booking?.id]);

  useEffect(() => {
    const shouldShare =
      booking?.status === "Approved" ||
      booking?.status === "On Going";

    const trackingEnded =
      booking?.status === "Completed" ||
      booking?.status === "Cancelled" ||
      booking?.status ===
        "Waiting Customer Confirmation" ||
      booking?.trip_status === "Completed" ||
      booking?.trip_status === "Cancelled";

    if (shouldShare && !trackingEnded) {
      startLocationSharing();
      return;
    }

    if (trackingEnded) {
      void stopLocationSharing(true);
    }
  }, [
    booking?.status,
    booking?.trip_status,
    startLocationSharing,
    stopLocationSharing,
  ]);

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
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Live GPS Sharing
                  </p>

                  <p
                    className={`mt-2 inline-flex items-center gap-2 font-bold ${
                      sharingLocation
                        ? "text-emerald-700"
                        : "text-slate-600"
                    }`}
                  >
                    {gpsStarting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : sharingLocation ? (
                      <Radio className="h-4 w-4" />
                    ) : (
                      <WifiOff className="h-4 w-4" />
                    )}

                    {gpsStarting
                      ? "Starting GPS..."
                      : sharingLocation
                        ? "Sharing live location"
                        : "GPS sharing stopped"}
                  </p>
                </div>

                {!sharingLocation && !gpsStarting && (
                  <button
                    type="button"
                    onClick={startLocationSharing}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Start GPS
                  </button>
                )}
              </div>

              {gpsMessage && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                  {gpsMessage}
                </p>
              )}

              {lastGpsUpdate && (
                <p className="mt-3 text-xs text-slate-500">
                  Last update:{" "}
                  {new Date(
                    lastGpsUpdate,
                  ).toLocaleString()}
                </p>
              )}
            </section>

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
                {booking.status === "Waiting Customer Confirmation" &&
                  booking.trip_status === "Completed" && (
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-center">
                      <p className="font-bold text-cyan-700">
                        Waiting for Customer Confirmation
                      </p>

                      <p className="mt-1 text-sm text-cyan-600">
                        Your completion proof was submitted. The customer must review it before this booking is finalized.
                      </p>
                    </div>
                  )}

                {booking.status === "Completed" &&
                  booking.trip_status === "Completed" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="font-bold text-emerald-700">
                        Service Completed
                      </p>

                      <p className="mt-1 text-sm text-emerald-600">
                        The customer confirmed the completed work.
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