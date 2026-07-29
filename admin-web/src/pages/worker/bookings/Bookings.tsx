import { confirmAction } from "../../../components/ui/confirmAction";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  CircleCheckBig,
  CircleX,
  Clock3,
  Loader2,
  MessageCircle,
  Navigation,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import WorkerLayout from "../../../layouts/WorkerLayout";
import { supabase } from "../../../lib/supabase";
import {
  acceptBooking,
  completeBooking,
  getWorkerBookings,
  rejectBooking,
} from "../../../services/workerBookingService";
import BookingTimeline from "../../../components/worker/Timeline/BookingTimeline";
import BookingActivity from "../../../components/worker/Timeline/BookingActivity";

type BookingStatus =
  | "Pending"
  | "Approved"
  | "On Going"
  | "Completed"
  | "Cancelled";

type StatusFilter = "All" | BookingStatus;
type BookingAction = "accept" | "reject" | "complete" | "delete";

interface CustomerProfile {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_picture?: string | null;
}

interface BookingService {
  id?: number;
  service_name?: string | null;
}

interface WorkerBooking {
  id: number;
  status: BookingStatus;
  trip_status?: string | null;
  booking_date?: string | null;
  booking_time?: string | null;
  address?: string | null;
  customer_address?: string | null;
  notes?: string | null;
  price?: number | string | null;
  category?: string | null;
  cancel_reason?: string | null;
  created_at?: string | null;
  customer_latitude?: number | null;
  customer_longitude?: number | null;
  customer?: CustomerProfile | null;
  service?: BookingService | null;
  [key: string]: unknown;
}

interface ActionState {
  bookingId: number;
  action: BookingAction;
}

const STATUS_ORDER: BookingStatus[] = [
  "Pending",
  "Approved",
  "On Going",
  "Completed",
  "Cancelled",
];

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function isBookingStatus(value: unknown): value is BookingStatus {
  return STATUS_ORDER.includes(value as BookingStatus);
}

function normalizeBooking(value: unknown): WorkerBooking | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const id = Number(candidate.id);
  const status = candidate.status;

  if (!Number.isFinite(id) || !isBookingStatus(status)) return null;

  return candidate as unknown as WorkerBooking;
}

function getCustomerName(customer?: CustomerProfile | null): string {
  const name = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Customer";
}

function getCustomerInitials(customer?: CustomerProfile | null): string {
  const first = customer?.first_name?.trim().charAt(0) ?? "";
  const last = customer?.last_name?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "C";
}

function getServiceName(booking: WorkerBooking): string {
  return booking.service?.service_name?.trim() || "General Service";
}

function getBookingPrice(booking: WorkerBooking): number {
  const value = Number(booking.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatBookingDate(value?: string | null): string {
  const date = parseLocalDate(value);
  return date ? dateFormatter.format(date) : "Not specified";
}

function formatBookingTime(value?: string | null): string {
  if (!value) return "Not specified";

  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText ?? 0);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function getStatusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-800";
    case "Approved":
      return "bg-emerald-100 text-emerald-800";
    case "On Going":
      return "bg-violet-100 text-violet-800";
    case "Completed":
      return "bg-blue-100 text-blue-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
  }
}

function getStatusBorderClass(status: BookingStatus): string {
  switch (status) {
    case "Pending":
      return "border-amber-500";
    case "Approved":
      return "border-emerald-500";
    case "On Going":
      return "border-violet-500";
    case "Completed":
      return "border-blue-500";
    case "Cancelled":
      return "border-red-500";
  }
}

function hasCustomerCoordinates(booking: WorkerBooking): boolean {
  return (
    typeof booking.customer_latitude === "number" &&
    typeof booking.customer_longitude === "number"
  );
}

export default function Bookings() {
  const [bookings, setBookings] = useState<WorkerBooking[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedBooking, setSelectedBooking] = useState<WorkerBooking | null>(
    null,
  );
  const [chatBookingId, setChatBookingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBookings = useCallback(async (refresh = false) => {
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    setPageError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Worker not authenticated.");

      setWorkerId(user.id);

      const result = await getWorkerBookings(user.id);
      const normalized = Array.isArray(result)
        ? result
            .map(normalizeBooking)
            .filter((booking): booking is WorkerBooking => booking !== null)
        : [];

      setBookings(normalized);
      setSelectedBooking((current) =>
        current
          ? (normalized.find((booking) => booking.id === current.id) ?? null)
          : null,
      );
    } catch (error) {
      console.error("Load bookings error:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load your bookings.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();

    const channel = supabase
      .channel("worker-bookings-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          void loadBookings(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadBookings]);

  useEffect(() => {
    if (!selectedBooking && chatBookingId === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (chatBookingId !== null) setChatBookingId(null);
        else setSelectedBooking(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedBooking, chatBookingId]);

  useEffect(() => {
    if (!successMessage && !pageError) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
      setPageError(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [successMessage, pageError]);

  const counts = useMemo(() => {
    const result: Record<BookingStatus, number> = {
      Pending: 0,
      Approved: 0,
      "On Going": 0,
      Completed: 0,
      Cancelled: 0,
    };

    for (const booking of bookings) result[booking.status] += 1;
    return result;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const searchableText = [
        booking.id,
        getCustomerName(booking.customer),
        getServiceName(booking),
        booking.address,
        booking.customer_address,
        booking.category,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesStatus =
        statusFilter === "All" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const visibleBookingGroups = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        bookings: filteredBookings.filter(
          (booking) => booking.status === status,
        ),
      })).filter((group) => group.bookings.length > 0),
    [filteredBookings],
  );

  const runAction = useCallback(
    async (
      bookingId: number,
      action: BookingAction,
      operation: () => Promise<unknown>,
      success: string,
      optimisticStatus?: BookingStatus,
    ) => {
      if (!workerId && action !== "delete") {
        setPageError("Worker not authenticated.");
        return;
      }

      setActionState({ bookingId, action });
      setPageError(null);

      const previousBookings = bookings;

      if (optimisticStatus) {
        setBookings((current) =>
          current.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: optimisticStatus }
              : booking,
          ),
        );
      }

      try {
        await operation();
        setSuccessMessage(success);
        await loadBookings(true);
      } catch (error) {
        setBookings(previousBookings);
        console.error(`${action} booking error:`, error);
        setPageError(
          error instanceof Error
            ? error.message
            : `Unable to ${action} booking.`,
        );
      } finally {
        setActionState(null);
      }
    },
    [bookings, loadBookings, workerId],
  );

  const handleApprove = useCallback(
    async (id: number) => {
      if (!workerId) {
        setPageError("Worker not authenticated.");
        return;
      }

      await runAction(
        id,
        "accept",
        () => acceptBooking(id, workerId),
        "Booking approved successfully.",
        "Approved",
      );
    },
    [runAction, workerId],
  );

  const handleReject = useCallback(
    async (id: number) => {
      if (!workerId) {
        setPageError("Worker not authenticated.");
        return;
      }

      if (!await confirmAction("Reject this booking request?")) return;

      await runAction(
        id,
        "reject",
        () => rejectBooking(id, workerId),
        "Booking rejected.",
        "Cancelled",
      );
    },
    [runAction, workerId],
  );

  const handleComplete = useCallback(
    async (id: number) => {
      if (!workerId) {
        setPageError("Worker not authenticated.");
        return;
      }

      if (!await confirmAction("Mark this service as completed?")) return;

      await runAction(
        id,
        "complete",
        () => completeBooking(id, workerId),
        "Booking completed successfully.",
        "Completed",
      );
    },
    [runAction, workerId],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!await confirmAction("Delete this booking from your list?")) return;

      await runAction(
        id,
        "delete",
        async () => {
          const { error } = await supabase
            .from("bookings")
            .update({ worker_deleted: true })
            .eq("id", id);

          if (error) throw error;
          setBookings((current) =>
            current.filter((booking) => booking.id !== id),
          );
          setSelectedBooking((current) =>
            current?.id === id ? null : current,
          );
        },
        "Booking removed from your list.",
      );
    },
    [runAction],
  );

  const isActionRunning = (
    bookingId: number,
    action?: BookingAction,
  ): boolean =>
    actionState?.bookingId === bookingId &&
    (!action || actionState.action === action);

  const openChat = (bookingId: number) => {
    setSelectedBooking(null);
    setChatBookingId(bookingId);
  };

  const totalBookings = bookings.length;

  return (
    <WorkerLayout>
      <div className="space-y-5 p-3 sm:space-y-6 sm:p-5 lg:p-8">
        {successMessage && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="font-medium">{successMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              aria-label="Dismiss success message"
              className="rounded-lg p-1 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {pageError && (
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <div className="flex gap-3">
              <CircleX className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Booking error</p>
                <p className="mt-1 text-sm">{pageError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPageError(null)}
              aria-label="Dismiss error message"
              className="rounded-lg p-1 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-5 text-white shadow-xl sm:rounded-3xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[3px] text-blue-100 sm:text-sm sm:tracking-[5px]">
                Worker Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
                My Bookings
              </h1>
              <p className="mt-3 max-w-2xl text-blue-100">
                View customer requests, manage approved bookings, communicate
                with clients, and complete active services.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void loadBookings(true)}
                disabled={isRefreshing || isLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <div className="hidden h-24 w-24 items-center justify-center rounded-full bg-white/10 lg:flex">
                <CalendarDays className="h-12 w-12" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:rounded-3xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, booking ID, service, or address..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:w-auto lg:min-w-[220px]"
            >
              <option value="All">All Bookings</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            label="Total Bookings"
            value={totalBookings}
            icon={<CalendarDays className="h-8 w-8" />}
            accent="blue"
            total={totalBookings}
          />
          <StatCard
            label="Pending"
            value={counts.Pending}
            icon={<Clock3 className="h-8 w-8" />}
            accent="amber"
            total={totalBookings}
          />
          <StatCard
            label="Approved"
            value={counts.Approved}
            icon={<CircleCheckBig className="h-8 w-8" />}
            accent="emerald"
            total={totalBookings}
          />
          <StatCard
            label="On Going"
            value={counts["On Going"]}
            icon={<Navigation className="h-8 w-8" />}
            accent="violet"
            total={totalBookings}
          />
          <StatCard
            label="Completed"
            value={counts.Completed}
            icon={<WalletCards className="h-8 w-8" />}
            accent="sky"
            total={totalBookings}
          />
          <StatCard
            label="Cancelled"
            value={counts.Cancelled}
            icon={<CircleX className="h-8 w-8" />}
            accent="red"
            total={totalBookings}
          />
        </section>

        {isLoading ? (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border bg-white p-10 text-center shadow-lg">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h2 className="mt-5 text-xl font-bold">Loading bookings</h2>
            <p className="mt-2 text-slate-500">
              Please wait while we retrieve your records.
            </p>
          </section>
        ) : visibleBookingGroups.length === 0 ? (
          <section className="rounded-3xl border bg-white p-10 text-center shadow-lg">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
              <CalendarDays className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">No bookings found</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-500">
              {bookings.length === 0
                ? "Customer booking requests will appear here."
                : "No booking matches your current search and filter."}
            </p>
          </section>
        ) : (
          <section className="space-y-8">
            {visibleBookingGroups.map(({ status, bookings: group }) => (
              <div key={status} className="space-y-5">
                <div
                  className={`flex items-center justify-between border-l-4 pl-4 ${getStatusBorderClass(status)}`}
                >
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                      {status}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {group.length}{" "}
                      {group.length === 1 ? "booking" : "bookings"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-bold ${getStatusBadgeClass(status)}`}
                  >
                    {group.length}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.map((booking) => {
                    const busy = isActionRunning(booking.id);
                    const customerName = getCustomerName(booking.customer);
                    const address =
                      booking.address?.trim() ||
                      booking.customer_address?.trim() ||
                      "No address provided";

                    return (
                      <article
                        key={booking.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl sm:rounded-3xl"
                      >
                        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white sm:p-6">
                          <span
                            className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ${getStatusBadgeClass(booking.status)}`}
                          >
                            {booking.status}
                          </span>

                          <div className="flex items-center gap-4 pr-24">
                            {booking.customer?.profile_picture ? (
                              <img
                                src={booking.customer.profile_picture}
                                alt={customerName}
                                className="h-16 w-16 rounded-2xl border-4 border-white object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-white font-bold text-blue-700">
                                {getCustomerInitials(booking.customer)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="truncate text-xl font-bold">
                                {customerName}
                              </h3>
                              <p className="text-sm text-blue-100">Customer</p>
                              <p className="mt-1 text-xs text-blue-100">
                                Booking #{booking.id}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 sm:p-6">
                          <div className="rounded-2xl bg-blue-50 p-5">
                            <p className="text-sm text-slate-500">Service</p>
                            <h3 className="mt-1 text-2xl font-bold text-blue-700">
                              {getServiceName(booking)}
                            </h3>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <InfoBox
                              label="Booking Date"
                              value={formatBookingDate(booking.booking_date)}
                            />
                            <InfoBox
                              label="Time"
                              value={formatBookingTime(booking.booking_time)}
                            />
                            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                              <p className="text-xs uppercase tracking-wide text-slate-400">
                                Address
                              </p>
                              <p className="mt-2 line-clamp-2 font-semibold text-slate-800">
                                {address}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 border-t pt-5">
                            <p className="text-sm text-slate-400">
                              Total Payment
                            </p>
                            <p className="mt-1 text-3xl font-bold text-blue-700">
                              {formatCurrency(getBookingPrice(booking))}
                            </p>
                          </div>

                          <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setSelectedBooking(booking)}
                              disabled={busy}
                              className="rounded-xl bg-slate-800 py-3 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              onClick={() => void handleDelete(booking.id)}
                              disabled={busy}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              {isActionRunning(booking.id, "delete") ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Remove
                            </button>

                            {booking.status === "Pending" && (
                              <>
                                <ActionButton
                                  label="Accept"
                                  loading={isActionRunning(
                                    booking.id,
                                    "accept",
                                  )}
                                  onClick={() => void handleApprove(booking.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                />
                                <ActionButton
                                  label="Reject"
                                  loading={isActionRunning(
                                    booking.id,
                                    "reject",
                                  )}
                                  onClick={() => void handleReject(booking.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                />
                              </>
                            )}

                            {booking.status === "Approved" &&
                              hasCustomerCoordinates(booking) && (
                                <Link
                                  to={`/worker/navigation/${booking.id}`}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 py-3 font-semibold text-white hover:bg-cyan-700"
                                >
                                  <Navigation className="h-4 w-4" />
                                  Update Trip
                                </Link>
                              )}

                            {["Approved", "On Going", "Completed"].includes(
                              booking.status,
                            ) && (
                              <button
                                type="button"
                                onClick={() => openChat(booking.id)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700"
                              >
                                <MessageCircle className="h-4 w-4" />
                                Chat
                              </button>
                            )}

                            {booking.status === "On Going" &&
                              booking.trip_status === "On Trip" && (
                                <ActionButton
                                  label="Complete Service"
                                  loading={isActionRunning(
                                    booking.id,
                                    "complete",
                                  )}
                                  onClick={() =>
                                    void handleComplete(booking.id)
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 sm:col-span-2"
                                />
                              )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {selectedBooking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-details-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedBooking(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm sm:p-6"
        >
          <div className="h-full w-full max-w-5xl overflow-y-auto bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[30px]">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="booking-details-title" className="text-3xl font-bold">
                    Booking Details
                  </h2>
                  <p className="mt-2 text-blue-100">
                    Booking #{selectedBooking.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  aria-label="Close booking details"
                  className="rounded-xl p-2 transition hover:bg-white/10"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:space-y-8 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {selectedBooking.customer?.profile_picture ? (
                  <img
                    src={selectedBooking.customer.profile_picture}
                    alt={getCustomerName(selectedBooking.customer)}
                    className="h-24 w-24 rounded-3xl border-4 border-white object-cover shadow-xl sm:h-28 sm:w-28"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-100 text-3xl font-bold text-blue-700 shadow-xl sm:h-28 sm:w-28">
                    {getCustomerInitials(selectedBooking.customer)}
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold sm:text-3xl">
                    {getCustomerName(selectedBooking.customer)}
                  </h3>
                  <p className="mt-2 text-slate-500">Verified Customer</p>
                  <p className="text-slate-500">
                    {selectedBooking.customer?.phone || "No phone provided"}
                  </p>
                  <p className="text-slate-500">
                    {selectedBooking.customer?.email || "No email provided"}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                <p className="text-slate-500">Booked Service</p>
                <h3 className="mt-2 text-2xl font-bold text-blue-700 sm:text-4xl">
                  {getServiceName(selectedBooking)}
                </h3>
                <p className="mt-4 text-3xl font-bold">
                  {formatCurrency(getBookingPrice(selectedBooking))}
                </p>
              </div>

              <section>
                <h3 className="mb-5 text-2xl font-bold">Booking Information</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <InfoBox
                    label="Booking Date"
                    value={formatBookingDate(selectedBooking.booking_date)}
                  />
                  <InfoBox
                    label="Time"
                    value={formatBookingTime(selectedBooking.booking_time)}
                  />
                  <div className="rounded-2xl bg-slate-50 p-5 md:col-span-2">
                    <p className="text-sm text-slate-400">Address</p>
                    <p className="mt-2 font-semibold">
                      {selectedBooking.address ||
                        selectedBooking.customer_address ||
                        "No address provided"}
                    </p>
                  </div>
                </div>
              </section>

              {selectedBooking.notes && (
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-400">Customer Notes</p>
                  <p className="mt-2 font-medium">{selectedBooking.notes}</p>
                </div>
              )}

              <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg sm:p-8">
                <h3 className="mb-6 text-2xl font-bold">Booking Progress</h3>
                <BookingProgress status={selectedBooking.status} />
              </div>

              <BookingTimeline status={selectedBooking.status} />
              <BookingActivity booking={selectedBooking} />

              <div className="grid grid-cols-1 gap-4 border-t pt-6 sm:grid-cols-2 md:grid-cols-4">
                {selectedBooking.status === "Pending" && (
                  <>
                    <ActionButton
                      label="Accept"
                      loading={isActionRunning(selectedBooking.id, "accept")}
                      onClick={async () => {
                        await handleApprove(selectedBooking.id);
                        setSelectedBooking(null);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    />
                    <ActionButton
                      label="Reject"
                      loading={isActionRunning(selectedBooking.id, "reject")}
                      onClick={async () => {
                        await handleReject(selectedBooking.id);
                        setSelectedBooking(null);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                    />
                  </>
                )}

                {selectedBooking.status === "Approved" &&
                  hasCustomerCoordinates(selectedBooking) && (
                    <Link
                      to={`/worker/navigation/${selectedBooking.id}`}
                      onClick={() => setSelectedBooking(null)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white hover:bg-cyan-700"
                    >
                      <Navigation className="h-4 w-4" />
                      Update Trip
                    </Link>
                  )}

                {["Approved", "On Going", "Completed"].includes(
                  selectedBooking.status,
                ) && (
                  <button
                    type="button"
                    onClick={() => openChat(selectedBooking.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 font-semibold text-white hover:bg-purple-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open Chat
                  </button>
                )}

                {selectedBooking.status === "On Going" &&
                  selectedBooking.trip_status === "On Trip" && (
                    <ActionButton
                      label="Complete Service"
                      loading={isActionRunning(selectedBooking.id, "complete")}
                      onClick={async () => {
                        await handleComplete(selectedBooking.id);
                        setSelectedBooking(null);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    />
                  )}

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white hover:bg-slate-900"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {chatBookingId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Booking chat"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setChatBookingId(null);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-4 lg:p-6"
        >
          <div className="relative h-[100dvh] w-full overflow-hidden bg-white shadow-2xl sm:h-[92dvh] sm:max-w-6xl sm:rounded-3xl">
            <button
              type="button"
              onClick={() => setChatBookingId(null)}
              aria-label="Close chat"
              className="absolute right-3 top-3 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/80 text-white shadow-lg hover:bg-red-600"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              key={chatBookingId}
              title={`Chat for booking ${chatBookingId}`}
              src={`/chat/${chatBookingId}`}
              className="h-full w-full border-0"
              allow="camera; microphone; clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  accent: "blue" | "amber" | "emerald" | "violet" | "sky" | "red";
  total: number;
}

function StatCard({ label, value, icon, accent, total }: StatCardProps) {
  const styles = {
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
    red: "bg-red-100 text-red-700",
  }[accent];

  const progress = total ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-slate-500">{label}</p>
          <h2 className="mt-2 text-4xl font-bold text-slate-900">{value}</h2>
        </div>
        <div className={`rounded-2xl p-4 ${styles}`}>{icon}</div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-current text-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface InfoBoxProps {
  label: string;
  value: string;
}

function InfoBox({ label, value }: InfoBoxProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-bold text-slate-800">{value}</p>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  loading: boolean;
  onClick: () => void | Promise<void>;
  className: string;
}

function ActionButton({
  label,
  loading,
  onClick,
  className,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

function BookingProgress({ status }: { status: BookingStatus }) {
  const step =
    status === "Completed"
      ? 4
      : status === "On Going"
        ? 3
        : status === "Approved"
          ? 2
          : 1;

  const steps = ["Submitted", "Approved", "In Progress", "Completed"];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-[640px]">
        <div className="absolute left-12 right-12 top-7 h-1 bg-slate-200" />
        <div className="relative z-10 grid grid-cols-4 gap-4">
          {steps.map((label, index) => {
            const active = index + 1 <= step && status !== "Cancelled";
            return (
              <div key={label} className="text-center">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold shadow-lg ${
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {active ? "✓" : index + 1}
                </div>
                <h4 className="mt-4 font-bold">{label}</h4>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
