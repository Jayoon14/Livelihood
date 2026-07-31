import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarCheck,
  Clock3,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import AvailabilityCalendar from "../../../components/customer/AvailabilityCalendar";
import LocationPicker from "../../../components/maps/LocationPicker";
import CustomerLayout from "../../../layouts/CustomerLayout";
import { supabase } from "../../../lib/supabase";
import {
  getTrustedWorkers,
  removeTrustedWorker,
  type TrustedWorkerWithProfile,
} from "../../../services/trustedWorkerService";
import { getWorkerAverageRating } from "../../../services/reviewService";
import {
  createBooking,
  isWorkerAvailable,
} from "../../../services/customerBookingService";
import { getApprovedServices } from "../../../services/serviceService";
import { getWorkerBookability } from "../../../services/presenceService";

type WorkerService = {
  id: number;
  service_name: string;
  category?: string | null;
  price?: number | null;
};

function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastSchedule(date: string, time: string): boolean {
  if (!date || !time) return false;
  const schedule = new Date(`${date}T${time}:00`);
  return Number.isNaN(schedule.getTime()) || schedule.getTime() <= Date.now();
}

export default function TrustedWorkers() {
  const navigate = useNavigate();

  const [records, setRecords] = useState<TrustedWorkerWithProfile[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [bookingRecord, setBookingRecord] =
    useState<TrustedWorkerWithProfile | null>(null);
  const [bookingServices, setBookingServices] = useState<WorkerService[]>([]);
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [bookingLatitude, setBookingLatitude] = useState<number | null>(null);
  const [bookingLongitude, setBookingLongitude] = useState<number | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingMode, setBookingMode] =
    useState<"Immediate" | "Scheduled">("Scheduled");
  const [workerCanBookNow, setWorkerCanBookNow] = useState(false);
  const [workerStatusReason, setWorkerStatusReason] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void loadTrustedWorkers();
  }, []);

  async function loadTrustedWorkers() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setRecords([]);
        return;
      }

      const data = await getTrustedWorkers(user.id);
      setRecords(data);

      const ratingEntries = await Promise.all(
        data.map(async (record) => {
          const rating = await getWorkerAverageRating(record.worker_id);
          return [record.worker_id, rating] as const;
        }),
      );

      setRatings(Object.fromEntries(ratingEntries));
    } catch (error) {
      console.error("Failed to load trusted workers:", error);
      setRecords([]);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load trusted workers.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTrustedWorker(workerId: string) {
    if (removingId) return;

    try {
      setRemovingId(workerId);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("Please sign in again.");
      }

      await removeTrustedWorker(user.id, workerId);

      setRecords((currentRecords) =>
        currentRecords.filter((record) => record.worker_id !== workerId),
      );

      toast.success("Worker removed from your trusted list.");
    } catch (error) {
      console.error("Failed to remove trusted worker:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove trusted worker.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  function closeBookingModal() {
    if (bookingSubmitting) return;

    setBookingRecord(null);
    setBookingServices([]);
    setBookingServiceId("");
    setBookingDate("");
    setBookingTime("");
    setBookingAddress("");
    setBookingLatitude(null);
    setBookingLongitude(null);
    setBookingNotes("");
    setBookingError(null);
    setBookingLoading(false);
    setBookingMode("Scheduled");
    setWorkerCanBookNow(false);
    setWorkerStatusReason(null);
  }

  async function openBookAgainModal(record: TrustedWorkerWithProfile) {
    setBookingRecord(record);
    setBookingLoading(true);
    setBookingError(null);
    setBookingDate("");
    setBookingTime("");

    try {
      const [services, latestBookingResult, bookability] = await Promise.all([
        getApprovedServices(record.worker_id),
        record.latest_booking_id
          ? supabase
              .from("bookings")
              .select(
                "service_id, address, customer_address, customer_latitude, customer_longitude, notes",
              )
              .eq("id", record.latest_booking_id)
              .eq("customer_id", record.customer_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        getWorkerBookability(record.worker_id),
      ]);

      if (latestBookingResult.error) {
        throw latestBookingResult.error;
      }

      const normalizedServices = (services ?? []) as WorkerService[];
      setBookingServices(normalizedServices);

      setWorkerCanBookNow(bookability.canBook);
      setWorkerStatusReason(bookability.reason ?? null);
      setBookingMode(bookability.canBook ? "Immediate" : "Scheduled");

      const previous = latestBookingResult.data;

      if (previous?.service_id != null) {
        const matching = normalizedServices.find(
          (service) => String(service.id) === String(previous.service_id),
        );

        if (matching) {
          setBookingServiceId(String(matching.id));
        }
      }

      setBookingAddress(
        previous?.customer_address?.trim() ||
          previous?.address?.trim() ||
          "",
      );
      setBookingLatitude(
        previous?.customer_latitude == null
          ? null
          : Number(previous.customer_latitude),
      );
      setBookingLongitude(
        previous?.customer_longitude == null
          ? null
          : Number(previous.customer_longitude),
      );
      setBookingNotes(previous?.notes?.trim() ?? "");
    } catch (error) {
      console.error("Unable to prepare rebooking:", error);
      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to prepare the booking form.",
      );
    } finally {
      setBookingLoading(false);
    }
  }

  function getImmediateSchedule(): {
    date: string;
    time: string;
  } {
    const schedule = new Date(Date.now() + 5 * 60 * 1000);
    const year = schedule.getFullYear();
    const month = String(schedule.getMonth() + 1).padStart(2, "0");
    const day = String(schedule.getDate()).padStart(2, "0");
    const hours = String(schedule.getHours()).padStart(2, "0");
    const minutes = String(schedule.getMinutes()).padStart(2, "0");

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  }

  async function submitBooking() {
    if (!bookingRecord || bookingSubmitting) return;

    const selectedService = bookingServices.find(
      (service) => String(service.id) === bookingServiceId,
    );

    setBookingError(null);

    if (!selectedService) {
      setBookingError("Please select a valid service.");
      return;
    }

    if (bookingMode === "Immediate" && !workerCanBookNow) {
      setBookingError(
        workerStatusReason ||
          "The worker is offline. Please choose Schedule for Later.",
      );
      return;
    }

    if (
      bookingMode === "Scheduled" &&
      (!bookingDate || !bookingTime)
    ) {
      setBookingError("Please select a booking date and time.");
      return;
    }

    if (
      bookingMode === "Scheduled" &&
      isPastSchedule(bookingDate, bookingTime)
    ) {
      setBookingError("Please select a future date and time.");
      return;
    }

    if (
      !bookingAddress.trim() ||
      bookingLatitude === null ||
      bookingLongitude === null
    ) {
      setBookingError("Please confirm a valid service location.");
      return;
    }

    try {
      setBookingSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again.");

      const schedule =
        bookingMode === "Immediate"
          ? getImmediateSchedule()
          : {
              date: bookingDate,
              time: bookingTime,
            };

      const available = await isWorkerAvailable(
        bookingRecord.worker_id,
        schedule.date,
        schedule.time,
      );

      if (!available) {
        throw new Error(
          "The worker is unavailable at the selected date and time.",
        );
      }

      await createBooking({
        customer_id: user.id,
        worker_id: bookingRecord.worker_id,
        service_id: selectedService.id,
        booking_type: bookingMode,
        booking_date: schedule.date,
        booking_time: schedule.time,
        address: bookingAddress.trim(),
        customer_address: bookingAddress.trim(),
        customer_latitude: bookingLatitude,
        customer_longitude: bookingLongitude,
        notes: bookingNotes.trim() || null,
      });

      toast.success(
        bookingMode === "Immediate"
          ? "Booking sent to the online worker."
          : "Scheduled booking submitted successfully.",
      );
      setBookingRecord(null);
      navigate("/customer/bookings");
    } catch (error) {
      console.error("Book Again error:", error);
      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to submit the booking.",
      );
    } finally {
      setBookingSubmitting(false);
    }
  }

  function getWorkerName(record: TrustedWorkerWithProfile): string {
    const worker = record.worker;

    if (!worker) {
      return "Worker profile unavailable";
    }

    return [worker.first_name, worker.middle_name, worker.last_name]
      .filter(Boolean)
      .join(" ");
  }

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return records;
    }

    return records.filter((record) => {
      const worker = record.worker;
      const workerName = getWorkerName(record).toLowerCase();
      const email = worker?.email?.toLowerCase() ?? "";

      return (
        workerName.includes(normalizedSearch) ||
        email.includes(normalizedSearch)
      );
    });
  }, [records, search]);

  const totalHires = useMemo(
    () =>
      records.reduce(
        (total, record) => total + Number(record.hire_count ?? 0),
        0,
      ),
    [records],
  );


  const selectedBookingService = useMemo(
    () =>
      bookingServices.find(
        (service) => String(service.id) === bookingServiceId,
      ) ?? null,
    [bookingServiceId, bookingServices],
  );

  useEffect(() => {
    if (!bookingRecord) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [bookingRecord]);

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1800px] space-y-6 px-6 py-6">
        <section className="relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-700 via-teal-600 to-cyan-500 px-5 py-7 text-white shadow-lg sm:rounded-3xl sm:px-8 sm:py-9 lg:px-10">
          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/10 sm:h-56 sm:w-56" />
          <div className="absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-200/10" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm sm:text-sm">
                <ShieldCheck size={16} />
                Proven professionals
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                My Trusted Workers
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
                View workers you have successfully hired and reviewed.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Users size={21} />
                </div>
                <div>
                  <p className="text-xs text-emerald-50">Trusted workers</p>
                  <p className="text-xl font-bold">{records.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <CalendarCheck size={21} />
                </div>
                <div>
                  <p className="text-xs text-emerald-50">Total hires</p>
                  <p className="text-xl font-bold">{totalHires}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
          <div className="relative max-w-xl">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search trusted worker..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        {loading && (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-100 bg-white p-8 shadow-sm sm:rounded-3xl">
            <div className="text-center">
              <Loader2
                size={38}
                className="mx-auto animate-spin text-emerald-600"
              />
              <p className="mt-4 text-sm font-medium text-gray-500">
                Loading trusted workers...
              </p>
            </div>
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center shadow-sm sm:rounded-3xl sm:px-10 sm:py-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck size={38} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-gray-900 sm:text-2xl">
              No Trusted Workers Yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
              Workers will appear here after you complete payment and submit a
              review for their service.
            </p>

            <button
              type="button"
              onClick={() => navigate("/customer/workers")}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              Browse Workers
            </button>
          </div>
        )}

        {!loading && records.length > 0 && filteredRecords.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:rounded-3xl">
            <Search size={36} className="mx-auto text-slate-400" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              No matching worker
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try another name or email address.
            </p>
          </div>
        )}

        {!loading && filteredRecords.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {filteredRecords.map((record) => {
              const worker = record.worker;
              const workerName = getWorkerName(record);
              const workerRating = ratings[record.worker_id] ?? 0;
              const isRemoving = removingId === record.worker_id;

              return (
                <article
                  key={record.id}
                  className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl"
                >
                  <div className="relative h-52 overflow-hidden sm:h-56">
                    <img
                      src={
                        worker?.profile_picture ??
                        "https://placehold.co/600x400?text=Worker"
                      }
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      alt={workerName}
                    />

                    <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/10 to-transparent" />

                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-gray-800 shadow-md backdrop-blur-sm sm:right-4 sm:top-4">
                      <Star
                        size={15}
                        className="fill-yellow-400 text-yellow-400"
                      />
                      {Number(workerRating).toFixed(1)}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="line-clamp-2 text-xl font-bold text-white sm:text-2xl">
                        {workerName}
                      </h2>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
                      <Mail size={16} className="shrink-0" />
                      <span className="truncate">
                        {worker?.email || "No email provided"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:text-sm">
                        <ShieldCheck size={15} className="shrink-0" />
                        <span className="truncate">Trusted Worker</span>
                      </span>

                      <span className="shrink-0 text-xs font-semibold text-slate-500">
                        Hired {record.hire_count}{" "}
                        {record.hire_count === 1 ? "time" : "times"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/customer/workers/${record.worker_id}`)
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                      >
                        <Eye size={17} />
                        View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => void openBookAgainModal(record)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <CalendarCheck size={17} />
                        Book Again
                      </button>

                      <button
                        type="button"
                        disabled={isRemoving || Boolean(removingId)}
                        onClick={() =>
                          void handleRemoveTrustedWorker(record.worker_id)
                        }
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                      >
                        {isRemoving ? (
                          <>
                            <Loader2 size={17} className="animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 size={17} />
                            Remove from Trusted Workers
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {bookingRecord && (
          <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeBookingModal();
              }
            }}
          >
            <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <header className="flex items-start justify-between gap-4 bg-linear-to-r from-indigo-700 via-blue-700 to-cyan-600 px-5 py-5 text-white sm:px-7">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                    <ShieldCheck size={14} />
                    Trusted worker rebooking
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                    Book {getWorkerName(bookingRecord)} Again
                  </h2>
                  <p className="mt-1 text-sm text-blue-100">
                    Choose a new schedule and confirm the service location.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close modal"
                  disabled={bookingSubmitting}
                  onClick={closeBookingModal}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                {bookingLoading ? (
                  <div className="flex min-h-96 items-center justify-center">
                    <div className="text-center">
                      <Loader2
                        size={40}
                        className="mx-auto animate-spin text-indigo-600"
                      />
                      <p className="mt-4 font-semibold text-slate-700">
                        Preparing booking details...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <img
                          src={
                            bookingRecord.worker?.profile_picture ??
                            "https://placehold.co/600x400?text=Worker"
                          }
                          alt={getWorkerName(bookingRecord)}
                          className="h-48 w-full object-cover"
                        />

                        <div className="p-4">
                          <h3 className="text-xl font-extrabold text-slate-900">
                            {getWorkerName(bookingRecord)}
                          </h3>
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {bookingRecord.worker?.email ||
                              "Trusted service professional"}
                          </p>

                          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                            <span className="inline-flex items-center gap-2">
                              <ShieldCheck size={16} />
                              Trusted
                            </span>
                            <span>{bookingRecord.hire_count} hires</span>
                          </div>

                          {selectedBookingService && (
                            <div className="mt-3 rounded-xl bg-indigo-50 p-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                                Service
                              </p>
                              <p className="mt-1 font-bold text-slate-900">
                                {selectedBookingService.service_name}
                              </p>
                              {typeof selectedBookingService.price ===
                                "number" && (
                                <p className="mt-1 text-sm font-extrabold text-indigo-700">
                                  ₱
                                  {selectedBookingService.price.toLocaleString(
                                    "en-PH",
                                  )}
                                </p>
                              )}
                            </div>
                          )}

                          <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700">
                            Scheduled requests are allowed even while the worker
                            is offline.
                          </p>
                        </div>
                      </div>
                    </aside>

                    <div className="space-y-5">
                      {bookingError && (
                        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                          <AlertCircle size={19} className="mt-0.5 shrink-0" />
                          <span>{bookingError}</span>
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <label className="mb-2 block text-sm font-bold text-slate-800">
                          Service
                        </label>
                        <select
                          value={bookingServiceId}
                          disabled={bookingSubmitting}
                          onChange={(event) => {
                            setBookingServiceId(event.target.value);
                            setBookingError(null);
                          }}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">Select service</option>
                          {bookingServices.map((service) => (
                            <option
                              key={service.id}
                              value={String(service.id)}
                            >
                              {service.service_name}
                              {typeof service.price === "number"
                                ? ` — ₱${service.price.toLocaleString("en-PH")}`
                                : ""}
                            </option>
                          ))}
                        </select>
                      </div>


                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm font-bold text-slate-800">
                          Booking type
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            disabled={!workerCanBookNow || bookingSubmitting}
                            onClick={() => {
                              setBookingMode("Immediate");
                              setBookingError(null);
                            }}
                            className={`rounded-xl border p-4 text-left transition ${
                              bookingMode === "Immediate"
                                ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-100"
                                : "border-slate-200 bg-white hover:border-emerald-300"
                            } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60`}
                          >
                            <p className="font-extrabold text-slate-900">
                              Book Now
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Available only while the worker is online.
                            </p>
                          </button>

                          <button
                            type="button"
                            disabled={bookingSubmitting}
                            onClick={() => {
                              setBookingMode("Scheduled");
                              setBookingError(null);
                            }}
                            className={`rounded-xl border p-4 text-left transition ${
                              bookingMode === "Scheduled"
                                ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100"
                                : "border-slate-200 bg-white hover:border-indigo-300"
                            }`}
                          >
                            <p className="font-extrabold text-slate-900">
                              Schedule for Later
                            </p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Allowed even when the worker is offline.
                            </p>
                          </button>
                        </div>

                        <p
                          className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
                            workerCanBookNow
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {workerCanBookNow
                            ? "Worker is online. You may book now or schedule for later."
                            : workerStatusReason ||
                              "Worker is offline. Scheduling is still available."}
                        </p>
                      </div>

                      {bookingMode === "Scheduled" && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="flex items-center gap-2 font-extrabold text-slate-900">
                          <CalendarCheck size={19} className="text-indigo-600" />
                          New schedule
                        </h3>

                        <div className="mt-4">
                          <AvailabilityCalendar
                            workerId={bookingRecord.worker_id}
                            value={bookingDate}
                            onChange={(date) => {
                              setBookingDate(date);
                              setBookingError(null);
                            }}
                          />
                        </div>

                        <label className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold text-slate-800">
                          <Clock3 size={17} className="text-indigo-600" />
                          Preferred time
                        </label>
                        <input
                          type="time"
                          value={bookingTime}
                          min={
                            bookingDate === getTodayDate()
                              ? new Date().toTimeString().slice(0, 5)
                              : undefined
                          }
                          disabled={bookingSubmitting}
                          onChange={(event) => {
                            setBookingTime(event.target.value);
                            setBookingError(null);
                          }}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                      </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 font-extrabold text-slate-900">
                          <MapPin size={19} className="text-emerald-600" />
                          Service location
                        </h3>

                        <LocationPicker
                          onLocationSelect={(latitude, longitude, address) => {
                            setBookingLatitude(latitude);
                            setBookingLongitude(longitude);
                            setBookingAddress(address);
                            setBookingError(null);
                          }}
                          showNearbyWorkers
                          nearbyWorkerRadiusKilometers={20}
                        />

                        <textarea
                          rows={2}
                          readOnly
                          value={bookingAddress}
                          placeholder="Selected address will appear here..."
                          className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700"
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <label className="mb-2 block text-sm font-bold text-slate-800">
                          Job description
                        </label>
                        <textarea
                          rows={4}
                          maxLength={1000}
                          value={bookingNotes}
                          disabled={bookingSubmitting}
                          onChange={(event) =>
                            setBookingNotes(event.target.value)
                          }
                          placeholder="Add instructions for the worker..."
                          className="w-full resize-none rounded-xl border border-slate-300 p-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                        <p className="mt-2 text-right text-xs text-slate-400">
                          {bookingNotes.length}/1000
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  disabled={bookingSubmitting}
                  onClick={closeBookingModal}
                  className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    bookingLoading ||
                    bookingSubmitting ||
                    bookingServices.length === 0
                  }
                  onClick={() => void submitBooking()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {bookingSubmitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CalendarCheck size={17} />
                      Submit Scheduled Booking
                    </>
                  )}
                </button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}