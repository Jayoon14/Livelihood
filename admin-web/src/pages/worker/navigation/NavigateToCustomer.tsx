import { runAuditedProcess, auditUiError, auditCaughtError } from "../../../lib/processAudit";
import { confirmAction } from "../../../components/ui/confirmAction";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Loader2, MapPin, MessageCircle, Navigation, Radio, User, WifiOff, } from "lucide-react";
import WorkerLayout from "../../../layouts/WorkerLayout";
import LocationPicker from "../../../components/maps/LocationPicker";
import { useWorkerLocation } from "../../../context/WorkerLocationContext";
import { supabase } from "../../../lib/supabase";
import { getBooking, markWorkerArrived, startTrip, } from "../../../services/workerBookingService";
import type { WorkerBookingStatus, WorkerTripStatus, } from "../../../services/workerBookingService";
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
    booking_date?: string | null;
    booking_time?: string | null;
    customer?: {
        id: string;
        first_name: string;
        middle_name?: string | null;
        last_name: string;
        phone?: string | null;
    } | null;
}
function calculateDistanceMeters(firstLatitude: number, firstLongitude: number, secondLatitude: number, secondLongitude: number): number {
    const earthRadiusMeters = 6371000;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDifference = toRadians(secondLatitude - firstLatitude);
    const longitudeDifference = toRadians(secondLongitude - firstLongitude);
    const firstLatitudeRadians = toRadians(firstLatitude);
    const secondLatitudeRadians = toRadians(secondLatitude);
    const a = Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(firstLatitudeRadians) *
            Math.cos(secondLatitudeRadians) *
            Math.sin(longitudeDifference / 2) ** 2;
    return (earthRadiusMeters *
        2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function formatRemainingDistance(distanceMeters: number | null): string {
    if (distanceMeters === null) {
        return "Calculating...";
    }
    if (distanceMeters < 1000) {
        return `${Math.round(distanceMeters)} m`;
    }
    return `${(distanceMeters / 1000).toFixed(1)} km`;
}
function formatWorkerEta(durationSeconds: number | null): string {
    if (durationSeconds === null || !Number.isFinite(durationSeconds)) {
        return "Calculating...";
    }
    const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}
function formatDateTime(value?: string | null): string {
    if (!value)
        return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Not recorded";
    }
    return new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
    }).format(date);
}
function formatDuration(start?: string | null, end?: string | null, liveNowMs?: number): string {
    if (!start)
        return "Not started";
    const startMs = new Date(start).getTime();
    const endMs = end
        ? new Date(end).getTime()
        : (liveNowMs ?? Date.now());
    if (!Number.isFinite(startMs) ||
        !Number.isFinite(endMs) ||
        endMs < startMs) {
        return "Not available";
    }
    const totalMinutes = Math.floor((endMs - startMs) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) {
        return `${minutes} min`;
    }
    if (minutes === 0) {
        return `${hours} hr`;
    }
    return `${hours} hr ${minutes} min`;
}
const AUTO_ARRIVAL_DISTANCE_METERS = 20;
const MAX_AUTO_ARRIVAL_ACCURACY_METERS = 100;
const MAX_AUTO_ARRIVAL_LOCATION_AGE_MS = 30000;
export default function NavigateToCustomer() {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const mountedRef = useRef(true);
    const bookingRef = useRef<BookingData | null>(null);
    const autoArrivalRunningRef = useRef(false);
    const { workerLocation, isOnline, isTracking, locating: gpsStarting, message: workerLocationMessage, goOnline, } = useWorkerLocation();
    const sharingLocation = isOnline && isTracking;
    const gpsMessage = workerLocationMessage || null;
    const lastGpsUpdate = workerLocation?.updatedAt ?? null;
    const [remainingDistance, setRemainingDistance] = useState<number | null>(null);
    const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
    const [serviceClock, setServiceClock] = useState(() => Date.now());
    const startLocationSharing = useCallback((): void => {
        void goOnline();
    }, [goOnline]);
    useEffect(() => {
        bookingRef.current = booking;
    }, [booking]);
    /*
     * Keep the service duration timer running while the service
     * is active.
     *
     * Important:
     * There is intentionally no synchronous setState() call
     * directly inside the effect body. This avoids the
     * react-hooks/set-state-in-effect lint error.
     */
    useEffect(() => {
        if (!booking?.trip_started_at || booking.completed_at) {
            return;
        }
        const intervalId = window.setInterval(() => {
            setServiceClock(Date.now());
        }, 30000);
        return () => window.clearInterval(intervalId);
    }, [booking?.trip_started_at, booking?.completed_at]);
    const loadBooking = useCallback(async (background = false) => {
        if (!bookingId) {
            setErrorMessage("Booking ID is missing.");
            setLoading(false);
            return;
        }
        if (!background) {
            setLoading(true);
        }
        try {
            const { data: { user }, error: authError, } = await supabase.auth.getUser();
            if (authError) {
                throw authError;
            }
            if (!user) {
                throw new Error("Worker account is not authenticated.");
            }
            const data = await getBooking(Number(bookingId), user.id);
            if (!mountedRef.current) {
                return;
            }
            setWorkerId(user.id);
            setBooking(data as BookingData);
            setErrorMessage("");
        }
        catch (error) {
            auditCaughtError({ module: "Workers", process: "background operation", action: "EXECUTE" }, error);
            console.error("Unable to load navigation booking:", error);
            if (mountedRef.current && !background) {
                setErrorMessage(error instanceof Error
                    ? error.message
                    : "Unable to load booking location.");
            }
        }
        finally {
            if (mountedRef.current && !background) {
                setLoading(false);
            }
        }
    }, [bookingId]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadBooking();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadBooking]);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    useEffect(() => {
        if (!booking?.id) {
            return;
        }
        let active = true;
        const refreshBooking = () => {
            if (active && mountedRef.current) {
                void loadBooking(true);
            }
        };
        const channel = supabase
            .channel(`worker-navigation-booking-${booking.id}`)
            .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "bookings",
            filter: `id=eq.${booking.id}`,
        }, (payload) => {
            if (!active || !mountedRef.current) {
                return;
            }
            const updated = payload.new as Partial<BookingData>;
            setBooking((current) => current
                ? {
                    ...current,
                    ...updated,
                }
                : current);
        })
            .subscribe((subscriptionStatus) => {
            if (!active || !mountedRef.current) {
                return;
            }
            if (subscriptionStatus === "CHANNEL_ERROR") {
                console.error("Worker navigation booking realtime channel error.");
                refreshBooking();
            }
            if (subscriptionStatus === "TIMED_OUT") {
                console.error("Worker navigation booking realtime connection timed out.");
                refreshBooking();
            }
        });
        const handleOnline = () => {
            refreshBooking();
        };
        window.addEventListener("online", handleOnline);
        return () => {
            active = false;
            window.removeEventListener("online", handleOnline);
            void supabase.removeChannel(channel);
        };
    }, [booking?.id, loadBooking]);
    useEffect(() => {
        const shouldShare = booking?.status === "Approved" ||
            booking?.status === "On Going";
        const trackingEnded = booking?.status === "Completed" ||
            booking?.status === "Cancelled" ||
            booking?.status === "Waiting Customer Confirmation" ||
            booking?.trip_status === "Completed" ||
            booking?.trip_status === "Cancelled";
        if (shouldShare &&
            !trackingEnded &&
            !isOnline &&
            !gpsStarting) {
            void goOnline();
        }
    }, [
        booking?.status,
        booking?.trip_status,
        goOnline,
        gpsStarting,
        isOnline,
    ]);
    useEffect(() => {
        const currentBooking = bookingRef.current;
        if (!workerLocation ||
            !currentBooking ||
            currentBooking.customer_latitude == null ||
            currentBooking.customer_longitude == null) {
            setRemainingDistance(null);
            return;
        }
        const distanceMeters = calculateDistanceMeters(workerLocation.latitude, workerLocation.longitude, currentBooking.customer_latitude, currentBooking.customer_longitude);
        const locationUpdatedAt = new Date(workerLocation.updatedAt).getTime();
        const hasFreshArrivalLocation = Number.isFinite(locationUpdatedAt) &&
            Date.now() - locationUpdatedAt >= 0 &&
            Date.now() - locationUpdatedAt <=
                MAX_AUTO_ARRIVAL_LOCATION_AGE_MS;
        /*
         * Automatic arrival must only use a recent GPS reading
         * with known, acceptable accuracy.
         */
        const hasPreciseArrivalLocation = typeof workerLocation.accuracy === "number" &&
            Number.isFinite(workerLocation.accuracy) &&
            workerLocation.accuracy >= 0 &&
            workerLocation.accuracy <=
                MAX_AUTO_ARRIVAL_ACCURACY_METERS;
        const canAutoArrive = hasFreshArrivalLocation &&
            hasPreciseArrivalLocation &&
            distanceMeters <= AUTO_ARRIVAL_DISTANCE_METERS &&
            currentBooking.status === "Approved" &&
            currentBooking.trip_status === "Accepted" &&
            !autoArrivalRunningRef.current &&
            Boolean(workerId);
        if (!canAutoArrive || !workerId) {
            return;
        }
        autoArrivalRunningRef.current = true;
        void markWorkerArrived(currentBooking.id, workerId)
            .then((updatedBooking) => {
            if (!mountedRef.current) {
                return;
            }
            setBooking((current) => current
                ? {
                    ...current,
                    trip_status: updatedBooking.trip_status,
                    arrived_at: updatedBooking.arrived_at ??
                        new Date().toISOString(),
                }
                : current);
            toast.success("You are within 20 meters. Arrival was detected automatically.");
        })
            .catch((arrivalError) => {
            console.error("Automatic arrival detection failed:", arrivalError);
        })
            .finally(() => {
            autoArrivalRunningRef.current = false;
        });
    }, [
        booking?.customer_latitude,
        booking?.customer_longitude,
        booking?.status,
        booking?.trip_status,
        booking?.id,
        workerId,
        workerLocation,
    ]);
    async function handleArrived() {
        return await runAuditedProcess({ module: "Workers", process: "handleArrived", action: "START", parameters: { booking, workerId } }, async (__activityProcessScope) => {
            if (!booking || !workerId || updatingStatus) {
                {
                    __activityProcessScope.skipped();
                    return;
                }
            }
            /*
             * Defense/demo fallback: manual arrival is intentionally allowed even
             * when the devices are physically far apart. Automatic arrival below
             * still keeps the real GPS proximity checks for the normal workflow.
             */
            const confirmed = await confirmAction("Confirm that you have arrived at the customer location?");
            if (!confirmed) {
                return;
            }
            try {
                setUpdatingStatus(true);
                const updatedBooking = await markWorkerArrived(booking.id, workerId);
                setBooking((current) => current
                    ? {
                        ...current,
                        trip_status: updatedBooking.trip_status,
                    }
                    : current);
                toast.success("Arrival confirmed.");
            }
            catch (error) {
                __activityProcessScope.caught(error);
                console.error("Unable to mark worker as arrived:", error);
                __activityProcessScope.failAndNotify(toast.error, error instanceof Error
                    ? error.message
                    : "Unable to update trip status.");
            }
            finally {
                setUpdatingStatus(false);
            }
        });
    }
    async function handleStartService() {
        return await runAuditedProcess({ module: "Workers", process: "handleStartService", action: "START", parameters: { booking, workerId } }, async (__activityProcessScope) => {
            if (!booking || !workerId || updatingStatus) {
                {
                    __activityProcessScope.skipped();
                    return;
                }
            }
            const confirmed = await confirmAction("Start the service now?");
            if (!confirmed) {
                return;
            }
            try {
                setUpdatingStatus(true);
                const updatedBooking = await startTrip(booking.id, workerId);
                setBooking((current) => current
                    ? {
                        ...current,
                        status: updatedBooking.status,
                        trip_status: updatedBooking.trip_status,
                        trip_started_at: updatedBooking.trip_started_at,
                    }
                    : current);
                toast.success("Service started.");
            }
            catch (error) {
                __activityProcessScope.caught(error);
                console.error("Unable to start service:", error);
                __activityProcessScope.failAndNotify(toast.error, error instanceof Error
                    ? error.message
                    : "Unable to start service.");
            }
            finally {
                setUpdatingStatus(false);
            }
        });
    }
    function handleCompleteService() {
        if (!booking || updatingStatus) {
            return;
        }
        if (booking.status !== "On Going" ||
            booking.trip_status !== "On Trip") {
            auditUiError({ module: "Workers", process: "handleCompleteService", action: "COMPLETE" }, toast.error, "Completion proof can only be submitted while the service is ongoing.");
            return;
        }
        navigate(`/worker/bookings/${booking.id}/complete`);
    }
    const navigationDestination = useMemo(() => {
        if (!booking || booking.customer_latitude == null || booking.customer_longitude == null) return null;
        return {
            latitude: booking.customer_latitude,
            longitude: booking.customer_longitude,
            address: booking.customer_address ?? "Customer service location",
        };
    }, [booking]);
    const handleRouteMetricsChange = useCallback((distanceMeters: number | null, durationSeconds: number | null) => {
        setRemainingDistance(distanceMeters);
        setRouteDurationSeconds(durationSeconds);
    }, []);

    if (loading) {
        return (<WorkerLayout>
        <main className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
          <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-6 lg:p-8 dark:border-slate-700 dark:bg-slate-900">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600"/>

            <h1 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              Loading customer location
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Please wait while we prepare your route and live GPS.
            </p>
          </section>
        </main>
      </WorkerLayout>);
    }
    if (errorMessage ||
        !booking ||
        booking.customer_latitude === null ||
        booking.customer_longitude === null) {
        return (<WorkerLayout>
        <main className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm sm:p-6 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {errorMessage ||
                "This booking has no saved customer coordinates."}
            </div>

            <button type="button" onClick={() => navigate(-1)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600">
              Go Back
            </button>
          </div>
        </main>
      </WorkerLayout>);
    }
    const customerName = [
        booking.customer?.first_name,
        booking.customer?.middle_name,
        booking.customer?.last_name,
    ]
        .filter(Boolean)
        .join(" ");
    return (<WorkerLayout>
      <main className="relative min-h-screen overflow-hidden bg-slate-50 p-3 sm:p-5 lg:p-8 dark:bg-slate-950">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-[0.035] dark:opacity-[0.018]" style={{
            backgroundImage: "linear-gradient(#2563eb 1px,transparent 1px),linear-gradient(90deg,#2563eb 1px,transparent 1px)",
            backgroundSize: "42px 42px",
        }}/>

        <div className="relative mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-linear-to-br from-blue-800 via-blue-700 to-cyan-500 p-5 text-white shadow-[0_24px_70px_rgba(37,99,235,0.24)] sm:p-7 lg:p-8">
            <div className="relative z-10">
              <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20">
                <ArrowLeft className="h-4 w-4"/>
                Back to bookings
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
                  <Navigation className="h-6 w-6"/>
                </div>

                <div className="relative z-10">
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    Navigate to Customer
                  </h1>

                  <p className="mt-1 text-sm text-blue-100">
                    Follow the route to the service location.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-5 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur lg:absolute lg:right-7 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
                Trip Status
              </p>

              <p className="mt-1 font-black text-white">
                {booking.trip_status}
              </p>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
                  <div className="relative z-10">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Live GPS Sharing
                    </p>

                    <p className={`mt-2 inline-flex items-center gap-2 font-black ${sharingLocation
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-slate-600 dark:text-slate-300"}`}>
                      {gpsStarting ? (<Loader2 className="h-4 w-4 animate-spin"/>) : sharingLocation ? (<Radio className="h-4 w-4"/>) : (<WifiOff className="h-4 w-4"/>)}

                      {gpsStarting
            ? "Starting GPS..."
            : sharingLocation
                ? "Sharing live location"
                : "GPS sharing stopped"}
                    </p>
                  </div>

                  {!sharingLocation && !gpsStarting && (<button type="button" onClick={startLocationSharing} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700">
                      Start GPS
                    </button>)}
                </div>

                {gpsMessage && (<p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {gpsMessage}
                  </p>)}

                {lastGpsUpdate && (<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Last update:{" "}
                    {new Date(lastGpsUpdate).toLocaleString()}
                  </p>)}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      Distance
                    </p>

                    <p className="mt-1 text-lg font-black text-blue-900 dark:text-blue-200">
                      {formatRemainingDistance(remainingDistance)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 dark:border-violet-500/20 dark:bg-violet-500/10">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                      ETA
                    </p>

                    <p className="mt-1 text-lg font-black text-violet-900 dark:text-violet-200">
                      {formatWorkerEta(routeDurationSeconds)}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-blue-700 dark:text-blue-300">
                  Arrival is detected automatically within{" "}
                  {AUTO_ARRIVAL_DISTANCE_METERS} meters.
                </p>
              </section>

              <section className="rounded-[1.5rem] border border-blue-200 bg-blue-50/70 p-5 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-blue-600"/>

                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Service Time
                  </h2>
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  The customer only requests an arrival time. There is no fixed
                  1-hour service limit. Record the actual arrival, start, and
                  finish time as the work happens.
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Requested arrival
                    </span>

                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {booking.booking_date &&
            booking.booking_time
            ? `${booking.booking_date} • ${booking.booking_time}`
            : "Not specified"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Actual arrival
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatDateTime(booking.arrived_at)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Service started
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatDateTime(booking.trip_started_at)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Service finished
                      </p>

                      {booking.trip_started_at &&
            !booking.completed_at && (<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"/>
                            In progress
                          </span>)}
                    </div>

                    <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                      {formatDateTime(booking.completed_at)}
                    </p>

                    <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2.5 dark:bg-blue-500/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                        Actual service duration
                      </p>

                      <p className="mt-1 text-lg font-black text-blue-900 dark:text-blue-100">
                        {formatDuration(booking.trip_started_at, booking.completed_at, serviceClock)}
                      </p>

                      {!booking.completed_at &&
            booking.trip_started_at && (<p className="mt-1 text-[11px] font-semibold leading-4 text-blue-700 dark:text-blue-300">
                            This timer follows the worker's actual Start Service
                            time and keeps running until the service is completed.
                          </p>)}
                    </div>

                    {!booking.trip_started_at &&
            booking.trip_status === "Arrived" && (<p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                          Ready to start the actual service.
                        </p>)}

                    {booking.trip_started_at &&
            !booking.completed_at && (<p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          Service is currently in progress. Finish when the work
                          is actually complete.
                        </p>)}
                  </div>
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Customer Details
                </h2>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-blue-600"/>

                    <div className="relative z-10">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Customer
                      </p>

                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {customerName || "Customer"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-blue-600"/>

                    <div className="relative z-10">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Service Location
                      </p>

                      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {booking.customer_address}
                      </p>
                    </div>
                  </div>



                  {booking.customer?.id && (<button type="button" onClick={() => navigate(`/chat/${booking.id}`)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-sky-700">
                      <MessageCircle className="h-4 w-4"/>
                      Chat Customer
                    </button>)}

                  {booking.status === "Approved" &&
            booking.trip_status === "Accepted" && (<button type="button" onClick={() => void handleArrived()} disabled={updatingStatus} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50">
                        <MapPin className="h-4 w-4"/>

                        {updatingStatus
                ? "Updating..."
                : "Confirm Arrival Manually"}
                      </button>)}

                  {booking.status === "Approved" &&
            booking.trip_status === "Arrived" && (<button type="button" onClick={() => void handleStartService()} disabled={updatingStatus} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50">
                        <Navigation className="h-4 w-4"/>

                        {updatingStatus
                ? "Starting..."
                : "Start Service"}
                      </button>)}

                  {booking.status === "On Going" &&
            booking.trip_status === "On Trip" && (<button type="button" onClick={handleCompleteService} disabled={updatingStatus} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50">
                        <MapPin className="h-4 w-4"/>

                        {updatingStatus
                ? "Completing..."
                : "Complete Service"}
                      </button>)}

                  {booking.status ===
            "Waiting Customer Confirmation" &&
            booking.trip_status === "Completed" && (<div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-center dark:border-cyan-500/20 dark:bg-cyan-500/10">
                        <p className="font-black text-cyan-700 dark:text-cyan-300">
                          Waiting for Customer Confirmation
                        </p>

                        <p className="mt-1 text-sm text-cyan-600 dark:text-cyan-300">
                          Your completion proof was submitted. The customer must
                          review it before this booking is finalized.
                        </p>
                      </div>)}

                  {booking.status === "Completed" &&
            booking.trip_status === "Completed" && (<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <p className="font-black text-emerald-700 dark:text-emerald-300">
                          Service Completed
                        </p>

                        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-300">
                          The customer confirmed the completed work.
                        </p>
                      </div>)}
                </div>
              </section>
            </aside>

            {booking.trip_status === "Accepted" && (
              <section className="min-h-[560px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <LocationPicker onLocationSelect={() => {
              // Navigation destination is fixed.
          }} initialLocation={navigationDestination ?? undefined} navigationMode onRouteMetricsChange={handleRouteMetricsChange}/>
              </section>
            )}
          </div>
        </div>
      </main>
    </WorkerLayout>);
}
