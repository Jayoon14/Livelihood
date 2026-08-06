import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { confirmAction } from "../../../components/ui/confirmAction";
import AdminLayout from "../../../layouts/AdminLayout";
import { supabase } from "../../../lib/supabase";
import {
  ADMIN_BOOKING_STATUS,
  getAllBookings,
  normalizeAdminBookingStatus,
  updateBookingStatus,
  type AdminBooking,
  type AdminBookingStatus,
} from "../../../services/adminBookingService";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  "All",
  ADMIN_BOOKING_STATUS.PENDING,
  ADMIN_BOOKING_STATUS.APPROVED,
  ADMIN_BOOKING_STATUS.ON_GOING,
  ADMIN_BOOKING_STATUS.COMPLETED,
  ADMIN_BOOKING_STATUS.CANCELLED,
  ADMIN_BOOKING_STATUS.REJECTED,
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];

type DateFilter = "All" | "Today" | "This Week" | "This Month" | "Custom";

type SortOption =
  | "Newest"
  | "Oldest"
  | "Schedule Soonest"
  | "Schedule Latest"
  | "Customer A-Z"
  | "Worker A-Z"
  | "Service A-Z"
  | "Status A-Z";

function profileName(
  profile: AdminBooking["customer"] | AdminBooking["worker"],
): string {
  if (!profile) {
    return "Unknown user";
  }

  const composed = [profile.first_name, profile.middle_name, profile.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return composed || profile.email || "Unknown user";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function bookingScheduleTimestamp(booking: AdminBooking): number {
  const date = booking.booking_date?.trim();
  const time = booking.booking_time?.trim() || "00:00";

  if (!date) {
    return 0;
  }

  const parsed = new Date(`${date}T${time}`);

  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function statusClass(status: string): string {
  const normalized = normalizeAdminBookingStatus(status);

  switch (normalized) {
    case ADMIN_BOOKING_STATUS.COMPLETED:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";

    case ADMIN_BOOKING_STATUS.APPROVED:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";

    case ADMIN_BOOKING_STATUS.ON_GOING:
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";

    case ADMIN_BOOKING_STATUS.CANCELLED:
    case ADMIN_BOOKING_STATUS.REJECTED:
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    case ADMIN_BOOKING_STATUS.PENDING:
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }
}

function secondaryStatusClass(status?: string | null): string {
  const normalized = String(status ?? "").toLowerCase();

  if (
    normalized.includes("complete") ||
    normalized.includes("paid") ||
    normalized.includes("scheduled") ||
    normalized.includes("arrived")
  ) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("failed")
  ) {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (
    normalized.includes("progress") ||
    normalized.includes("ongoing") ||
    normalized.includes("on going") ||
    normalized.includes("travel")
  ) {
    return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + difference);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isWithinDateRange(
  bookingDate: string | null | undefined,
  dateFilter: DateFilter,
  customStart: string,
  customEnd: string,
): boolean {
  if (dateFilter === "All") {
    return true;
  }

  if (!bookingDate) {
    return false;
  }

  const date = new Date(`${bookingDate}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (dateFilter === "Today") {
    return date >= startOfDay(now) && date <= endOfDay(now);
  }

  if (dateFilter === "This Week") {
    return date >= startOfWeek(now) && date <= endOfDay(now);
  }

  if (dateFilter === "This Month") {
    return date >= startOfMonth(now) && date <= endOfDay(now);
  }

  if (dateFilter === "Custom") {
    const start = customStart
      ? startOfDay(new Date(`${customStart}T00:00:00`))
      : null;
    const end = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : null;

    if (start && date < start) {
      return false;
    }

    if (end && date > end) {
      return false;
    }
  }

  return true;
}

function csvEscape(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function Bookings() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("Newest");
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBookings = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const records = await getAllBookings();
      setBookings(records);
      setLastUpdated(new Date());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load bookings.";

      setError(message);

      if (!background) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBookings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadBookings]);

  useEffect(() => {
    let mounted = true;

    const scheduleRealtimeRefresh = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
      }

      realtimeTimerRef.current = setTimeout(() => {
        if (mounted) {
          void loadBookings(true);
        }
      }, 300);
    };

    const channel = supabase
      .channel("admin-bookings-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        scheduleRealtimeRefresh,
      )
      .subscribe((subscriptionStatus) => {
        if (!mounted) {
          return;
        }

        if (subscriptionStatus === "CHANNEL_ERROR") {
          console.error("Admin bookings realtime channel error.");
        }

        if (subscriptionStatus === "TIMED_OUT") {
          console.error("Admin bookings realtime connection timed out.");
        }
      });

    return () => {
      mounted = false;

      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [loadBookings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [search, statusFilter, dateFilter, customStart, customEnd, sortOption]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = bookings.filter((booking) => {
      const canonicalStatus = normalizeAdminBookingStatus(booking.status);

      const matchesStatus =
        statusFilter === "All" || canonicalStatus === statusFilter;

      const matchesDate = isWithinDateRange(
        booking.booking_date,
        dateFilter,
        customStart,
        customEnd,
      );

      const matchesSearch =
        !query ||
        [
          booking.id,
          profileName(booking.customer),
          booking.customer?.email,
          booking.customer?.phone,
          profileName(booking.worker),
          booking.worker?.email,
          booking.worker?.phone,
          booking.service_name,
          booking.address,
          booking.status,
          booking.schedule_status,
          booking.trip_status,
          booking.completion_status,
          booking.payment_status,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        );

      return matchesStatus && matchesDate && matchesSearch;
    });

    return [...filtered].sort((first, second) => {
      switch (sortOption) {
        case "Oldest":
          return (
            new Date(first.created_at ?? 0).getTime() -
            new Date(second.created_at ?? 0).getTime()
          );

        case "Schedule Soonest":
          return (
            bookingScheduleTimestamp(first) - bookingScheduleTimestamp(second)
          );

        case "Schedule Latest":
          return (
            bookingScheduleTimestamp(second) - bookingScheduleTimestamp(first)
          );

        case "Customer A-Z":
          return profileName(first.customer).localeCompare(
            profileName(second.customer),
          );

        case "Worker A-Z":
          return profileName(first.worker).localeCompare(
            profileName(second.worker),
          );

        case "Service A-Z":
          return String(first.service_name ?? "").localeCompare(
            String(second.service_name ?? ""),
          );

        case "Status A-Z":
          return normalizeAdminBookingStatus(first.status).localeCompare(
            normalizeAdminBookingStatus(second.status),
          );

        case "Newest":
        default:
          return (
            new Date(second.created_at ?? 0).getTime() -
            new Date(first.created_at ?? 0).getTime()
          );
      }
    });
  }, [
    bookings,
    customEnd,
    customStart,
    dateFilter,
    search,
    sortOption,
    statusFilter,
  ]);

  const summary = useMemo(() => {
    return filteredBookings.reduce(
      (result, booking) => {
        result.total += 1;

        const status = normalizeAdminBookingStatus(booking.status);

        if (status === ADMIN_BOOKING_STATUS.PENDING) {
          result.pending += 1;
        }

        if (status === ADMIN_BOOKING_STATUS.APPROVED) {
          result.approved += 1;
        }

        if (status === ADMIN_BOOKING_STATUS.ON_GOING) {
          result.onGoing += 1;
        }

        if (status === ADMIN_BOOKING_STATUS.COMPLETED) {
          result.completed += 1;
        }

        if (
          status === ADMIN_BOOKING_STATUS.CANCELLED ||
          status === ADMIN_BOOKING_STATUS.REJECTED
        ) {
          result.cancelled += 1;
        }

        return result;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        onGoing: 0,
        completed: 0,
        cancelled: 0,
      },
    );
  }, [filteredBookings]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleBookings = filteredBookings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  async function changeStatus(
    booking: AdminBooking,
    nextStatus: AdminBookingStatus,
  ) {
    const currentStatus = normalizeAdminBookingStatus(booking.status);

    const confirmed = await confirmAction(
      `Change booking #${booking.id} from ${currentStatus} to ${nextStatus}?`,
      {
        title:
          nextStatus === ADMIN_BOOKING_STATUS.COMPLETED
            ? "Complete booking"
            : nextStatus === ADMIN_BOOKING_STATUS.REJECTED
              ? "Reject booking"
              : "Update booking status",
        confirmText:
          nextStatus === ADMIN_BOOKING_STATUS.COMPLETED
            ? "Complete"
            : nextStatus === ADMIN_BOOKING_STATUS.REJECTED
              ? "Reject"
              : nextStatus,
      },
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(booking.id);

    const toastId = toast.loading("Updating booking status...");

    try {
      const updated = await updateBookingStatus(booking.id, nextStatus);

      setBookings((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      toast.success(`Booking #${booking.id} is now ${nextStatus}.`, {
        id: toastId,
      });
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update booking status.",
        { id: toastId },
      );
    } finally {
      setProcessingId(null);
    }
  }

  function exportCsv() {
    if (filteredBookings.length === 0) {
      toast.warning("There are no bookings to export.");
      return;
    }

    const headers = [
      "Booking ID",
      "Customer",
      "Customer Email",
      "Worker",
      "Worker Email",
      "Service",
      "Booking Date",
      "Booking Time",
      "Address",
      "Status",
      "Schedule Status",
      "Trip Status",
      "Completion Status",
      "Payment Status",
      "Created At",
    ];

    const rows = filteredBookings.map((booking) => [
      booking.id,
      profileName(booking.customer),
      booking.customer?.email ?? "",
      profileName(booking.worker),
      booking.worker?.email ?? "",
      booking.service_name ?? "",
      booking.booking_date ?? "",
      booking.booking_time ?? "",
      booking.address ?? "",
      normalizeAdminBookingStatus(booking.status),
      booking.schedule_status ?? "",
      booking.trip_status ?? "",
      booking.completion_status ?? "",
      booking.payment_status ?? "",
      booking.created_at ?? "",
    ]);

    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    toast.success("Bookings CSV exported.");
  }

  function printBookings() {
    if (filteredBookings.length === 0) {
      toast.warning("There are no bookings to print.");
      return;
    }

    window.print();
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("All");
    setCustomStart("");
    setCustomEnd("");
    setSortOption("Newest");
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              All Bookings
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review bookings and manage their current workflow status.
            </p>

            {lastUpdated && (
              <p className="mt-1 text-xs text-slate-400">
                Last updated: {formatDateTime(lastUpdated.toISOString())}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={printBookings}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={() => void loadBookings(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || refreshing ? "animate-spin" : ""
                }`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            title="Total Bookings"
            value={summary.total}
            icon={<FileText className="h-5 w-5" />}
          />
          <SummaryCard
            title="Pending"
            value={summary.pending}
            icon={<Clock3 className="h-5 w-5" />}
          />
          <SummaryCard
            title="Approved"
            value={summary.approved}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <SummaryCard
            title="On Going"
            value={summary.onGoing}
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <SummaryCard
            title="Completed"
            value={summary.completed}
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <SummaryCard
            title="Cancelled"
            value={summary.cancelled}
            icon={<XCircle className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2 xl:grid-cols-[1.5fr_190px_180px_190px_auto] dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, customer, worker, service, address, or status"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All statuses" : status}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(event) =>
              setDateFilter(event.target.value as DateFilter)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option>All</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Custom</option>
          </select>

          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as SortOption)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option>Newest</option>
            <option>Oldest</option>
            <option>Schedule Soonest</option>
            <option>Schedule Latest</option>
            <option>Customer A-Z</option>
            <option>Worker A-Z</option>
            <option>Service A-Z</option>
            <option>Status A-Z</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Reset
          </button>

          {dateFilter === "Custom" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 xl:col-span-5">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  Start date
                </span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  max={customEnd || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">
                  End date
                </span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  min={customStart || undefined}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading bookings...
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void loadBookings()}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
            </div>
          ) : visibleBookings.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No bookings match the current search and filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-7xl">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Booking</th>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Worker</th>
                    <th className="px-5 py-4">Schedule</th>
                    <th className="px-5 py-4">Workflow</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 print:hidden">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleBookings.map((booking) => {
                    const isProcessing = processingId === booking.id;
                    const canonicalStatus = normalizeAdminBookingStatus(
                      booking.status,
                    );

                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            #{booking.id}
                          </p>

                          <p className="text-xs text-slate-500">
                            {booking.service_name || "Service booking"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Created {formatDateTime(booking.created_at)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            to={`/customers/${booking.customer_id}`}
                            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline dark:text-slate-100"
                          >
                            {profileName(booking.customer)}
                          </Link>

                          <p className="text-xs text-slate-500">
                            {booking.customer?.email || "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            to={`/workers/${booking.worker_id}`}
                            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline dark:text-slate-100"
                          >
                            {profileName(booking.worker)}
                          </Link>

                          <p className="text-xs text-slate-500">
                            {booking.worker?.email || "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                          <p>{formatDate(booking.booking_date)}</p>

                          <p className="text-xs text-slate-500">
                            {booking.booking_time || "Time not set"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex max-w-65 flex-wrap gap-1.5">
                            <StatusPill
                              label="Schedule"
                              value={booking.schedule_status}
                            />
                            <StatusPill
                              label="Trip"
                              value={booking.trip_status}
                            />
                            <StatusPill
                              label="Completion"
                              value={booking.completion_status}
                            />
                            <StatusPill
                              label="Payment"
                              value={booking.payment_status}
                            />
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              canonicalStatus,
                            )}`}
                          >
                            {canonicalStatus}
                          </span>
                        </td>

                        <td className="px-5 py-4 print:hidden">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/bookings/${booking.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>

                            {canonicalStatus ===
                              ADMIN_BOOKING_STATUS.PENDING && (
                              <>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    void changeStatus(
                                      booking,
                                      ADMIN_BOOKING_STATUS.APPROVED,
                                    )
                                  }
                                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    void changeStatus(
                                      booking,
                                      ADMIN_BOOKING_STATUS.REJECTED,
                                    )
                                  }
                                  className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {canonicalStatus ===
                              ADMIN_BOOKING_STATUS.APPROVED && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  void changeStatus(
                                    booking,
                                    ADMIN_BOOKING_STATUS.ON_GOING,
                                  )
                                }
                                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                              >
                                Start
                              </button>
                            )}

                            {canonicalStatus ===
                              ADMIN_BOOKING_STATUS.ON_GOING && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() =>
                                  void changeStatus(
                                    booking,
                                    ADMIN_BOOKING_STATUS.COMPLETED,
                                  )
                                }
                                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Complete
                              </button>
                            )}

                            {isProcessing && (
                              <span className="inline-flex items-center px-2 text-xs font-semibold text-slate-500">
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && filteredBookings.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 print:hidden">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)} of{" "}
                {filteredBookings.length}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
                >
                  Previous
                </button>

                <span className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
        {icon}
      </span>

      <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
        {value.toLocaleString()}
      </p>
    </article>
  );
}

function StatusPill({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const displayed = value?.trim() || "Not set";

  return (
    <span
      title={`${label}: ${displayed}`}
      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${secondaryStatusClass(
        displayed,
      )}`}
    >
      {label}: {displayed}
    </span>
  );
}
